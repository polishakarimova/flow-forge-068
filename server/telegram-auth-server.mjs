import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { pollTelegramUpdates } from "./telegram-polling.mjs";
import { saveTelegramAccount } from "./telegram-account.mjs";
import { ensureThreadsSchema, beginThreadsConnect, finishThreadsConnect, threadsStatus, runThreadsScheduler } from "./threads-autopost.mjs";
import { ensureRemoteSchema, handleRemoteRequest, remoteStatus } from './threads-remote.mjs';

const root = new URL("../", import.meta.url);
const distDir = fileURLToPath(new URL("../dist", import.meta.url));

function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const envPath = new URL(name, root);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [rawKey, ...rest] = trimmed.split("=");
      const key = rawKey.trim().replace(/^\uFEFF/, "");
      let value = rest.join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.AUTH_PORT || process.env.PORT || 3001);
const APP_URL = (process.env.APP_URL || "https://kartakontenta.ru").replace(/\/$/, "");
const DATABASE_URL = process.env.DATABASE_URL || "";
const PGSSLROOTCERT = process.env.PGSSLROOTCERT || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const TELEGRAM_UPDATES_MODE = process.env.TELEGRAM_UPDATES_MODE || "webhook";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ADMIN_TELEGRAM_IDS = new Set(String(process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((id) => id.trim()).filter(Boolean));
const SESSION_SECRET = process.env.SESSION_SECRET || TELEGRAM_WEBHOOK_SECRET || ADMIN_TOKEN || TELEGRAM_BOT_TOKEN || "";
const THREADS_APP_ID = process.env.THREADS_APP_ID || "";
const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET || "";
const THREADS_TOKEN_SECRET = process.env.THREADS_TOKEN_SECRET || SESSION_SECRET;
const cookieName = "contentmap_session";
let telegramBotInfo = null;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!TELEGRAM_BOT_TOKEN) console.warn("TELEGRAM_BOT_TOKEN is empty: Telegram auth will be unavailable");
if (!SESSION_SECRET) console.warn("SESSION_SECRET is empty: set it in production for stable HMAC sessions");

function createPrismaDatabaseUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (parsed.searchParams.get("sslmode") && !parsed.searchParams.get("sslnegotiation")) {
    parsed.searchParams.set("sslnegotiation", "direct");
  }
  return parsed.toString();
}

process.env.DATABASE_URL = process.env.PRISMA_DATABASE_URL || createPrismaDatabaseUrl(DATABASE_URL);

function createPgPool() {
  const parsed = new URL(DATABASE_URL);
  const sslMode = parsed.searchParams.get("sslmode");
  parsed.searchParams.delete("sslmode");
  let ssl = false;
  if (sslMode && sslMode !== "disable") {
    ssl = { rejectUnauthorized: false };
    if (PGSSLROOTCERT && existsSync(PGSSLROOTCERT)) {
      ssl = { ca: readFileSync(PGSSLROOTCERT, "utf8"), rejectUnauthorized: true };
    }
  }
  return new pg.Pool({ connectionString: parsed.toString(), ssl, max: 5 });
}

const pgPool = createPgPool();
const prisma = new PrismaClient();

function uid(bytes = 16) {
  return randomBytes(bytes).toString("hex");
}

function now() {
  return new Date().toISOString();
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name || user.displayName || user.telegramUsername || "Пользователь",
    email: user.email || "",
    avatar: user.avatar || user.avatarUrl || "",
    authProvider: user.authProvider || "telegram",
    telegramId: user.telegramId || user.telegramAccount?.telegramId || "",
    telegramUsername: user.telegramUsername || user.telegramAccount?.username || "",
  };
}

async function ensureSchema() {
  await pgPool.query(`
    create extension if not exists pgcrypto;
    do $$ begin
      create type "AuthProvider" as enum ('telegram');
    exception when duplicate_object then null; end $$;
    do $$ begin
      create type "TelegramLoginStatus" as enum ('PENDING', 'CONFIRMED', 'USED', 'EXPIRED');
    exception when duplicate_object then null; end $$;
    create table if not exists users (
      id text primary key,
      "displayName" text,
      "avatarUrl" text,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now()
    );
    create table if not exists auth_identities (
      id text primary key default gen_random_uuid()::text,
      "userId" text not null references users(id) on delete cascade,
      provider "AuthProvider" not null,
      "providerUserId" text not null,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now(),
      unique(provider, "providerUserId")
    );
    create table if not exists telegram_accounts (
      id text primary key default gen_random_uuid()::text,
      "userId" text not null references users(id) on delete cascade,
      "telegramId" text not null unique,
      username text,
      "firstName" text,
      "lastName" text,
      "photoUrl" text,
      "languageCode" text,
      "chatId" text,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now()
    );
    create table if not exists telegram_login_requests (
      id text primary key default gen_random_uuid()::text,
      "tokenHash" text not null unique,
      "returnTo" text,
      status "TelegramLoginStatus" not null default 'PENDING',
      "userId" text references users(id) on delete set null,
      "telegramId" text,
      "chatId" text,
      "createdAt" timestamptz not null default now(),
      "expiresAt" timestamptz not null,
      "confirmedAt" timestamptz,
      "usedAt" timestamptz
    );
    create table if not exists cm_users (
      id text primary key,
      data jsonb not null
    );
    create table if not exists cm_login_tokens (
      token text primary key,
      data jsonb not null
    );
    create table if not exists cm_user_state (
      user_id text not null,
      key text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (user_id, key)
    );
    create table if not exists cm_admin_actions (
      id text primary key,
      admin_user_id text,
      action text not null,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create index if not exists auth_identities_user_id_idx on auth_identities ("userId");
    create index if not exists telegram_accounts_user_id_idx on telegram_accounts ("userId");
    create index if not exists telegram_login_requests_user_id_idx on telegram_login_requests ("userId");
    create index if not exists telegram_login_requests_telegram_id_idx on telegram_login_requests ("telegramId");
  `);
}

async function readUsers() {
  const { rows } = await pgPool.query("select data from cm_users");
  return rows.map((row) => row.data);
}

function isAdminUser(user) {
  if (!user) return false;
  if (ADMIN_TELEGRAM_IDS.size === 0) return false;
  return ADMIN_TELEGRAM_IDS.has(String(user.telegramId || ""));
}

function getAdminToken(req, url) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(req.headers["x-admin-token"] || url.searchParams.get("token") || "").trim();
}

async function requireAdmin(req, res, url) {
  const token = getAdminToken(req, url);
  if (ADMIN_TOKEN && token && safeCompare(token, ADMIN_TOKEN)) return { id: "admin-token", authProvider: "admin-token" };

  const user = await getUserBySession(parseCookies(req)[cookieName]);
  if (!user) {
    send(res, 401, { error: "unauthorized" });
    return null;
  }
  if (!isAdminUser(user)) {
    send(res, 403, { error: "forbidden" });
    return null;
  }
  return user;
}

function countUserState(data) {
  const products = Array.isArray(data?.products) ? data.products.length : 0;
  const topics = Array.isArray(data?.topics) ? data.topics : [];
  const funnels = Array.isArray(data?.funnels) ? data.funnels.length : 0;
  const keywords = Array.isArray(data?.keywords) ? data.keywords.length : 0;
  const contentItems = topics.reduce((sum, topic) => sum + (Array.isArray(topic?.contentItems) ? topic.contentItems.length : 0), 0);
  const activeTopics = topics.filter((topic) => !topic?.isIdeaBank).length;
  const ideas = topics.filter((topic) => topic?.isIdeaBank).length;
  return { products, topics: activeTopics, ideas, contentItems, funnels, keywords };
}

async function readAdminOverview() {
  const prismaUsers = await prisma.user.findMany({
    include: { telegramAccounts: { take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  const ids = prismaUsers.map((user) => user.id);
  const { rows } = ids.length
    ? await pgPool.query("select user_id, data, updated_at from cm_user_state where key = 'main' and user_id = any($1)", [ids])
    : { rows: [] };
  const states = new Map(rows.map((row) => [row.user_id, row]));
  const users = prismaUsers.map((user) => {
    const state = states.get(user.id);
    const telegramAccount = user.telegramAccounts[0] || null;
    const stats = countUserState(state?.data || {});
    return {
      id: user.id,
      name: user.displayName || telegramAccount?.username || "Пользователь",
      email: telegramAccount ? `telegram:${telegramAccount.telegramId}` : "",
      telegramId: telegramAccount?.telegramId || "",
      telegramUsername: telegramAccount?.username ? `@${telegramAccount.username}` : "",
      provider: "telegram",
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      stateUpdatedAt: state?.updated_at || "",
      stats,
    };
  });
  const totals = users.reduce((acc, user) => {
    acc.products += user.stats.products;
    acc.topics += user.stats.topics;
    acc.ideas += user.stats.ideas;
    acc.contentItems += user.stats.contentItems;
    acc.funnels += user.stats.funnels;
    acc.keywords += user.stats.keywords;
    return acc;
  }, { users: users.length, products: 0, topics: 0, ideas: 0, contentItems: 0, funnels: 0, keywords: 0 });
  return { totals, users };
}

async function saveUser(user) {
  await pgPool.query(
    "insert into cm_users (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data",
    [user.id, JSON.stringify(user)],
  );
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { telegramAccounts: { take: 1 } },
  });
  if (!user) return null;
  const telegramAccount = user.telegramAccounts[0] || null;
  return {
    id: user.id,
    name: user.displayName || [telegramAccount?.firstName, telegramAccount?.lastName].filter(Boolean).join(" ").trim() || telegramAccount?.username || "Пользователь",
    email: telegramAccount ? `telegram:${telegramAccount.telegramId}` : "",
    authProvider: "telegram",
    telegramId: telegramAccount?.telegramId || "",
    telegramUsername: telegramAccount?.username ? `@${telegramAccount.username}` : "",
    avatar: user.avatarUrl || telegramAccount?.photoUrl || "",
    createdAt: user.createdAt?.toISOString?.() || "",
    updatedAt: user.updatedAt?.toISOString?.() || "",
  };
}

function signSessionPayload(payload) {
  return createHmac("sha256", SESSION_SECRET || "dev-session-secret").update(payload).digest("base64url");
}

function createSession(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }), "utf8").toString("base64url");
  return `${payload}.${signSessionPayload(payload)}`;
}

async function getUserBySession(token) {
  if (!token) return null;
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature || !safeCompare(signature, signSessionPayload(payload))) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data.userId || !data.exp || Number(data.exp) <= Date.now()) return null;
  return await getUserById(String(data.userId));
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      }),
  );
}

function setSessionCookie(res, token) {
  const secure = APP_URL.startsWith("https://") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`);
}

function clearSessionCookie(res) {
  const secure = APP_URL.startsWith("https://") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(data));
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function staticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const cleaned = normalize(decoded).replace(/^[/\\]+/, "");
  const target = join(distDir, cleaned || "index.html");
  if (target !== distDir && !target.startsWith(distDir + sep)) return null;
  return target;
}

async function sendStaticFile(req, res, filePath) {
  try {
    const file = await stat(filePath);
    if (!file.isFile()) return false;
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": file.size,
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res);
  if (!existsSync(distDir)) return send(res, 503, { error: "frontend_not_built" });

  const target = staticPath(url.pathname);
  if (target && (await sendStaticFile(req, res, target))) return;

  const indexPath = join(distDir, "index.html");
  if (await sendStaticFile(req, res, indexPath)) return;
  return send(res, 404, { error: "not_found" });
}

function methodNotAllowed(res) {
  send(res, 405, { error: "method_not_allowed" });
}

async function requireUser(req, res) {
  const user = await getUserBySession(parseCookies(req)[cookieName]);
  if (!user) send(res, 401, { error: "unauthorized" });
  return user;
}

async function telegramApi(method, payload = {}) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error("telegram_bot_token_missing");
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(method === "getUpdates" ? 40000 : 15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.description || `telegram_${method}_failed`);
  return data.result;
}

async function getTelegramBotInfo() {
  if (telegramBotInfo) return telegramBotInfo;
  telegramBotInfo = await telegramApi("getMe");
  return telegramBotInfo;
}

function validateTelegramInitData(initData) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error("telegram_bot_token_missing");
  const params = new URLSearchParams(initData || "");
  const receivedHash = params.get("hash");
  if (!receivedHash) throw new Error("telegram_hash_missing");
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (!safeCompare(calculatedHash, receivedHash)) throw new Error("telegram_hash_invalid");
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400 * 14) throw new Error("telegram_auth_expired");
  const user = JSON.parse(params.get("user") || "{}");
  if (!user.id) throw new Error("telegram_user_missing");
  return user;
}

async function upsertTelegramUser(telegramUser) {
  const legacyUsers = await readUsers().catch(() => []);
  const telegramId = String(telegramUser.id);
  const legacy = legacyUsers.find((item) => String(item.telegramId || "") === telegramId || item.email === `telegram:${telegramId}`);
  const user = await prisma.$transaction(tx => saveTelegramAccount(tx, telegramUser, legacy?.id), { timeout: 15000 });
  return publicUser(user);
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function safeReturnTo(returnTo = "") {
  const value = String(returnTo || "").trim();
  if (!value || value.startsWith("//")) return "/";
  if (value.startsWith("/")) return value;
  try {
    const parsed = new URL(value);
    const app = new URL(APP_URL);
    if (parsed.origin === app.origin) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
  return "/";
}

async function createTelegramLoginToken(returnTo = "/") {
  const bot = TELEGRAM_BOT_TOKEN ? await getTelegramBotInfo() : null;
  if (!bot?.username) throw new Error("telegram_bot_not_configured");
  const token = uid(20);
  const loginRequest = await prisma.telegramLoginRequest.create({
    data: {
      tokenHash: tokenHash(token),
      returnTo: safeReturnTo(returnTo),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return { token, expiresAt: loginRequest.expiresAt.toISOString(), returnTo: loginRequest.returnTo || "/", botLink: `https://t.me/${bot.username}?start=login_${token}` };
}

async function readLoginToken(token) {
  return await prisma.telegramLoginRequest.findUnique({ where: { tokenHash: tokenHash(token) } });
}

async function saveLoginToken(loginToken) {
  return await prisma.telegramLoginRequest.update({
    where: { id: loginToken.id },
    data: {
      status: loginToken.status,
      userId: loginToken.userId,
      telegramId: loginToken.telegramId,
      chatId: loginToken.chatId,
      confirmedAt: loginToken.confirmedAt,
      usedAt: loginToken.usedAt,
    },
  });
}

async function deleteLoginToken(token) {
  await prisma.telegramLoginRequest.delete({ where: { tokenHash: tokenHash(token) } }).catch(() => null);
}

async function sendTelegramStart(chatId) {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: "Карта контента поможет собрать контекст, продукты, контент и воронки в одной системе.",
    reply_markup: {
      inline_keyboard: [[{ text: "Открыть карту контента", web_app: { url: APP_URL } }]],
    },
  });
}

async function sendTelegramLoginConfirmed(chatId, token = "") {
  const returnUrl = token ? `${APP_URL}/login?telegramLoginToken=${encodeURIComponent(token)}` : `${APP_URL}/login`;
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: "Готово, вы авторизованы. Вернитесь на сайт — вход завершится автоматически.",
    reply_markup: {
      inline_keyboard: [[{ text: "Вернуться в приложение", web_app: { url: returnUrl } }]],
    },
  });
}

async function handleTelegramWebhook(req, res) {
  if (TELEGRAM_UPDATES_MODE === "polling") return send(res, 503, { error: "webhook_disabled" });
  if (TELEGRAM_WEBHOOK_SECRET && !safeCompare(req.headers["x-telegram-bot-api-secret-token"], TELEGRAM_WEBHOOK_SECRET)) {
    return send(res, 401, { error: "invalid_telegram_secret" });
  }
  const update = await body(req);
  await handleTelegramUpdate(update);
  return send(res, 200, { ok: true });
}

async function handleTelegramUpdate(update) {
  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  const text = String(message?.text || "");
  if (chatId && text.startsWith("/start")) {
    const loginMatch = text.match(/^\/start\s+login_([a-f0-9]{40})/i);
    if (loginMatch) {
      const token = loginMatch[1];
      const loginToken = await readLoginToken(token);
      if (!loginToken || loginToken.usedAt || loginToken.status === "USED" || loginToken.expiresAt.getTime() <= Date.now()) {
        await deleteLoginToken(token);
        await telegramApi("sendMessage", {
          chat_id: chatId,
          text: "Ссылка для входа устарела. Вернитесь на сайт и нажмите «Войти через Telegram» ещё раз.",
        }).catch(console.error);
        return;
      }
      const user = await upsertTelegramUser(message.from);
      Object.assign(loginToken, {
        status: "CONFIRMED",
        userId: user.id,
        telegramId: String(message.from.id),
        chatId: String(chatId),
        confirmedAt: new Date(),
      });
      await saveLoginToken(loginToken);
      await sendTelegramLoginConfirmed(chatId, token).catch(console.error);
      return;
    }
    await sendTelegramStart(chatId).catch(console.error);
  }
}

async function api(req, res, url) {
  if (url.pathname.startsWith('/api/internal/threads/')) {
    return handleRemoteRequest({ req, res, path: url.pathname, pool: pgPool, body, send, env: process.env });
  }
  const path = url.pathname;

  if (path === "/api/auth/me") {
    if (req.method !== "GET") return methodNotAllowed(res);
    return send(res, 200, { user: publicUser(await getUserBySession(parseCookies(req)[cookieName])) });
  }

  if (path === "/api/auth/register") {
    if (req.method !== "POST") return methodNotAllowed(res);
    return send(res, 410, { error: "password_auth_disabled", message: "Use Telegram auth" });
  }

  if (path === "/api/auth/login") {
    if (req.method !== "POST") return methodNotAllowed(res);
    return send(res, 410, { error: "password_auth_disabled", message: "Use Telegram auth" });
  }

  if (path === "/api/auth/logout") {
    if (req.method !== "POST") return methodNotAllowed(res);
    clearSessionCookie(res);
    return send(res, 200, { ok: true });
  }

  if (path === "/api/auth/telegram-mini-app" || path === "/api/auth/telegram/miniapp") {
    if (req.method !== "POST") return methodNotAllowed(res);
    try {
      const input = await body(req);
      const telegramUser = validateTelegramInitData(String(input.initData || ""));
      const user = await upsertTelegramUser(telegramUser);
      const token = await createSession(user.id);
      setSessionCookie(res, token);
      return send(res, 200, { user: publicUser(user) });
    } catch (error) {
      const invalid = /^telegram_(auth_|user_|hash_|init_)/.test(error.message || "");
      console.error("Telegram sign-in failed", { name: error.name, code: error.code || (invalid ? error.message : "database_or_server") });
      return send(res, invalid ? 401 : 503, { error: invalid ? "telegram_auth_expired" : "auth_temporarily_unavailable" });
    }
  }

  if (path === "/api/auth/telegram-login-token" || path === "/api/auth/telegram/start") {
    if (req.method !== "POST") return methodNotAllowed(res);
    try {
      const input = await body(req).catch(() => ({}));
      const login = await createTelegramLoginToken(input.returnTo || url.searchParams.get("returnTo") || "/");
      return send(res, 201, { ok: true, token: login.token, expiresAt: login.expiresAt, returnTo: login.returnTo, botLink: login.botLink, botUrl: login.botLink });
    } catch (error) {
      console.error("Telegram login start failed", { name: error.name, code: error.code });
      return send(res, 503, { error: "auth_temporarily_unavailable" });
    }
  }

  const tokenMatch = path.match(/^\/api\/auth\/telegram-login-token\/([^/]+)$/);
  if (tokenMatch || path === "/api/auth/telegram/status") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const token = tokenMatch?.[1] || url.searchParams.get("token") || "";
    const loginToken = await readLoginToken(token);
    if (!loginToken || loginToken.usedAt || loginToken.status === "USED") return send(res, 404, { error: "login_token_not_found", status: "missing" });
    if (loginToken.expiresAt.getTime() <= Date.now()) {
      await prisma.telegramLoginRequest.update({ where: { id: loginToken.id }, data: { status: "EXPIRED" } }).catch(() => null);
      return send(res, 410, { error: "login_token_expired", status: "expired" });
    }
    if (!loginToken.userId) return send(res, 202, { status: "pending" });
    const user = await getUserById(loginToken.userId);
    if (!user) return send(res, 404, { error: "telegram_user_not_found" });
    const sessionToken = createSession(user.id);
    await prisma.telegramLoginRequest.update({ where: { id: loginToken.id }, data: { status: "USED", usedAt: new Date() } });
    setSessionCookie(res, sessionToken);
    return send(res, 200, { ok: true, status: "confirmed", returnTo: loginToken.returnTo || "/", user: publicUser(user) });
  }

  if (path === "/api/telegram/webhook" || path === "/api/auth/telegram/webhook") {
    if (req.method !== "POST") return methodNotAllowed(res);
    return await handleTelegramWebhook(req, res);
  }

  if (path === "/api/telegram/setup-webhook") {
    if (req.method !== "POST") return methodNotAllowed(res);
    const input = await body(req).catch(() => ({}));
    if (!TELEGRAM_WEBHOOK_SECRET || !input.secret || !safeCompare(input.secret, TELEGRAM_WEBHOOK_SECRET)) {
      return send(res, 401, { error: "invalid_secret" });
    }
    await setupTelegramBot();
    const webhook = await telegramApi("getWebhookInfo");
    return send(res, 200, { ok: true, webhook });
  }

  if (path === "/api/admin/overview") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const admin = await requireAdmin(req, res, url);
    if (!admin) return;
    return send(res, 200, await readAdminOverview());
  }

  if (path === '/api/threads/status') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    const user = await requireUser(req, res);
    if (!user) return;
    const status = await threadsStatus(pgPool, user.id, Boolean(THREADS_APP_ID && THREADS_APP_SECRET));
    if (process.env.THREADS_WORKER_USER_ID === user.id && process.env.THREADS_WORKER_SECRET) Object.assign(status, await remoteStatus(pgPool, user.id));
    return send(res, 200, status);
  }

  if (path === '/api/threads/connect') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    const user = await requireUser(req, res);
    if (!user) return;
    if (!THREADS_APP_ID || !THREADS_APP_SECRET) return send(res, 503, { error: 'threads_app_not_configured' });
    const destination = await beginThreadsConnect(pgPool, user.id, THREADS_APP_ID, APP_URL);
    res.writeHead(302, { Location: destination });
    return res.end();
  }

  if (path === '/api/threads/callback') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return send(res, 400, { error: 'threads_authorization_missing' });
    try {
      await finishThreadsConnect(pgPool, state, code, { appId: THREADS_APP_ID, appSecret: THREADS_APP_SECRET, appUrl: APP_URL, tokenSecret: THREADS_TOKEN_SECRET });
      res.writeHead(302, { Location: `${APP_URL}/calendar?threads=connected` });
      return res.end();
    } catch (error) {
      console.error('Threads connection failed', { message: error.message });
      res.writeHead(302, { Location: `${APP_URL}/calendar?threads=error` });
      return res.end();
    }
  }

  if (path === "/api/admin/users") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const admin = await requireAdmin(req, res, url);
    if (!admin) return;
    const overview = await readAdminOverview();
    return send(res, 200, { users: overview.users, totals: overview.totals });
  }

  const stateMatch = path.match(/^\/api\/state\/([a-z0-9_-]+)$/i);
  if (stateMatch) {
    const user = await requireUser(req, res);
    if (!user) return;
    const key = stateMatch[1];
    if (req.method === "GET") {
      const { rows } = await pgPool.query("select data, md5(data::text) as revision from cm_user_state where user_id = $1 and key = $2", [user.id, key]);
      return send(res, 200, { data: rows[0]?.data || null, revision: rows[0]?.revision || 'new' });
    }
    if (req.method === "PUT") {
      const input = await body(req);
      if (key === 'publications') {
        const revision = req.headers['if-match'];
        if (typeof revision !== 'string' || !/^(new|[a-f0-9]{32})$/.test(revision)) return send(res, 428, { error: 'revision_required' });
        if (input.data?.schema !== 1 || !Array.isArray(input.data.items) || input.data.items.length > 1000) return send(res, 400, { error: 'invalid_publications' });
        const values = [user.id, key, JSON.stringify(input.data)];
        const result = revision === 'new'
          ? await pgPool.query('insert into cm_user_state (user_id, key, data) values ($1, $2, $3::jsonb) on conflict (user_id, key) do nothing returning md5(data::text) as revision', values)
          : await pgPool.query('update cm_user_state set data = $3::jsonb, updated_at = now() where user_id = $1 and key = $2 and md5(data::text) = $4 returning md5(data::text) as revision', [...values, revision]);
        if (!result.rowCount) return send(res, 409, { error: 'revision_conflict' });
        return send(res, 200, { ok: true, revision: result.rows[0].revision });
      }
      await pgPool.query(
        "insert into cm_user_state (user_id, key, data, updated_at) values ($1, $2, $3::jsonb, now()) on conflict (user_id, key) do update set data = excluded.data, updated_at = now()",
        [user.id, key, JSON.stringify(input.data ?? {})],
      );
      return send(res, 200, { ok: true });
    }
    return methodNotAllowed(res);
  }

  return send(res, 404, { error: "not_found" });
}

async function setupTelegramBot() {
  if (!TELEGRAM_BOT_TOKEN) return;
  if (TELEGRAM_UPDATES_MODE === "polling") {
    await telegramApi("deleteWebhook", { drop_pending_updates: false });
    if (!telegramPollingStarted) {
      telegramPollingStarted = true;
      console.log("Telegram update delivery: polling");
      void pollTelegramUpdates({ api: telegramApi, handleUpdate: handleTelegramUpdate });
    }
  } else await telegramApi("setWebhook", {
    url: `${APP_URL}/api/telegram/webhook`,
    secret_token: TELEGRAM_WEBHOOK_SECRET || undefined,
    allowed_updates: ["message", "edited_message"],
  });
  await telegramApi("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Открыть карту",
      web_app: { url: APP_URL },
    },
  }).catch(() => null);
}

let telegramPollingStarted = false;
await ensureSchema();
await ensureThreadsSchema(pgPool);
await ensureRemoteSchema(pgPool);
setupTelegramBot().catch((error) => console.error("Telegram setup failed:", error));
if (process.env.THREADS_AUTOPUBLISH_ENABLED === '1' && process.env.THREADS_REMOTE_ENABLED !== '1') {
  let threadsTickRunning = false;
  const tick = async () => {
    if (threadsTickRunning) return;
    threadsTickRunning = true;
    try { const result = await runThreadsScheduler(pgPool, THREADS_TOKEN_SECRET); if (result) console.log('Threads scheduler', result); }
    catch (error) { console.error('Threads scheduler failed', { message: error.message }); }
    finally { threadsTickRunning = false; }
  };
  setInterval(() => void tick(), 20_000).unref();
  void tick();
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "server_error" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Content Map server listening on http://127.0.0.1:${PORT}`);
});
