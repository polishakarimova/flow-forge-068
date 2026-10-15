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
import { approvePublicationDay } from './publications-approval.mjs';
import { contentWorkspaceApi } from './content-workspace-api.mjs';
import { updateWorkspace } from './content-workspace.mjs';
import { agentApi, ensureAgentSchema } from './agent-api.mjs';
import {assertProductionConfig,requestProtection,readJsonBody,telegramAuthDateValid} from './request-security.mjs';
import {ensureSessionSchema,issueSession,readSession,revokeSession,authorizeAdmin} from './session-store.mjs';
import {readContext,saveContext} from './context-state.mjs';
import {ensureBaseSchema} from './schema.mjs';
import {prismaDatabaseUrl} from './database-urls.mjs';
import {ensureReferralSchema, referralCode, referralStart, rememberReferralEntry, completeReferralAuthorization, referralSummary} from './referrals.mjs';

const root = new URL("../", import.meta.url);
const distDir = fileURLToPath(new URL("../dist", import.meta.url));

function loadEnvFile() {
  const envPaths=process.env.KARTA_ENV_FILE?[process.env.KARTA_ENV_FILE]:[new URL('.env.local',root),new URL('.env',root)];
  for (const envPath of envPaths) {
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
const ADMIN_TELEGRAM_IDS = new Set(String(process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((id) => id.trim()).filter(Boolean));
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const THREADS_APP_ID = process.env.THREADS_APP_ID || "";
const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET || "";
const THREADS_TOKEN_SECRET = process.env.THREADS_TOKEN_SECRET || SESSION_SECRET;
const cookieName = APP_URL.startsWith('https:')?'__Host-contentmap_session':'contentmap_session';
const browserCookieName=APP_URL.startsWith('https:')?'__Host-contentmap_login_browser':'contentmap_login_browser';
let telegramBotInfo = null;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!TELEGRAM_BOT_TOKEN) console.warn("TELEGRAM_BOT_TOKEN is empty: Telegram auth will be unavailable");
assertProductionConfig(process.env);

process.env.DATABASE_URL = prismaDatabaseUrl(DATABASE_URL,PGSSLROOTCERT);

function createPgPool() {
  const parsed = new URL(DATABASE_URL);
  const sslMode = parsed.searchParams.get("sslmode");
  parsed.searchParams.delete("sslmode");
  let ssl = false;
  if (sslMode && sslMode !== "disable") {
    ssl = { rejectUnauthorized: true };
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

async function readUsers() {
  const { rows } = await pgPool.query("select data from cm_users");
  return rows.map((row) => row.data);
}

function isAdminUser(user) {
  if (!user) return false;
  if (ADMIN_TELEGRAM_IDS.size === 0) return false;
  return ADMIN_TELEGRAM_IDS.has(String(user.telegramId || ""));
}

async function requireAdmin(req, res, url) {
  const session = await readSession(pgPool,parseCookies(req)[cookieName],SESSION_SECRET);
  const user = session ? await getUserById(session.user_id) : null;
  if (!user) {
    send(res, 401, { error: "unauthorized" });
    return null;
  }
  if (!isAdminUser(user)) {
    send(res, 403, { error: "forbidden" });
    return null;
  }
  if(!await authorizeAdmin(pgPool,session)){send(res,401,{error:'admin_reauthentication_required'});return null;}
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


async function getUserBySession(token) {
  const session=await readSession(pgPool,token,SESSION_SECRET);
  return session?getUserById(session.user_id):null;
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        try{return [item.slice(0,index),decodeURIComponent(item.slice(index+1))];}catch{return [item.slice(0,index),''];}
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
function appendCookie(res,value){const old=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...(Array.isArray(old)?old:old?[old]:[]),value]);}
function setBrowserCookie(res,value){appendCookie(res,`${browserCookieName}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${value?600:0}${APP_URL.startsWith('https:')?'; Secure':''}`);}

async function body(req) {
  return readJsonBody(req);
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
  if (!telegramAuthDateValid(authDate)) throw new Error("telegram_auth_expired");
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

async function createTelegramLoginToken(returnTo = "/",browserKey,sourceCode) {
  const bot = TELEGRAM_BOT_TOKEN ? await getTelegramBotInfo() : null;
  if (!bot?.username) throw new Error("telegram_bot_not_configured");
  const token = uid(20);
  const loginRequest = await prisma.telegramLoginRequest.create({
    data: {
      tokenHash: tokenHash(token),
      browserHash: tokenHash(browserKey),
      referralCode: referralCode(sourceCode) || null,
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
  if (!TELEGRAM_WEBHOOK_SECRET || !safeCompare(req.headers["x-telegram-bot-api-secret-token"], TELEGRAM_WEBHOOK_SECRET)) {
    return send(res, 401, { error: "invalid_telegram_secret" });
  }
  const update = await body(req);
  await handleTelegramUpdate(update);
  return send(res, 200, { ok: true });
}

async function handleTelegramUpdate(update) {
  const callback=update.callback_query,callbackMatch=String(callback?.data||'').match(/^cm_auth_(yes|no)_([a-f0-9]{40})$/);
  if(callback?.message?.chat?.type&&callback.message.chat.type!=='private')return;
  if(callbackMatch){
    const login=await readLoginToken(callbackMatch[2]);
    if(!login||login.status!=='PENDING'||login.usedAt||login.expiresAt.getTime()<=Date.now()||login.telegramId!==String(callback.from?.id)){
      await telegramApi('answerCallbackQuery',{callback_query_id:callback.id,text:'Этот запрос уже завершён или устарел.'}).catch(()=>{});return;
    }
    if(callbackMatch[1]==='no'){
      await prisma.telegramLoginRequest.updateMany({where:{id:login.id,status:'PENDING',telegramId:String(callback.from.id)},data:{status:'EXPIRED',usedAt:new Date()}});
      await telegramApi('answerCallbackQuery',{callback_query_id:callback.id,text:'Вход отменён.'}).catch(()=>{});return;
    }
    const user=await upsertTelegramUser(callback.from);
    const saved=await prisma.telegramLoginRequest.updateMany({where:{id:login.id,status:'PENDING',telegramId:String(callback.from.id),expiresAt:{gt:new Date()}},data:{status:'CONFIRMED',userId:user.id,confirmedAt:new Date()}});
    if(saved.count===1){await telegramApi('answerCallbackQuery',{callback_query_id:callback.id,text:'Вход подтверждён.'}).catch(()=>{});await sendTelegramLoginConfirmed(login.chatId,callbackMatch[2]).catch(()=>{});}
    return;
  }
  const message = update.message || update.edited_message;
  if(message?.chat?.type&&message.chat.type!=='private')return;
  const chatId = message?.chat?.id;
  const text = String(message?.text || "");
  if (chatId && text.startsWith("/start")) {
    const source = referralStart(text.match(/^\/start\s+(\S+)$/)?.[1]);
    if (source) {
      await rememberReferralEntry(pgPool, message.from?.id, source);
      await telegramApi('sendMessage',{chat_id:chatId,text:'Вас пригласили в «Карту контента». Откройте приложение и войдите через Telegram. После первого входа нового пользователя пригласивший получит 50 лайков.',reply_markup:{inline_keyboard:[[{text:'Открыть карту',web_app:{url:APP_URL+'/?ref='+source}}]]}}).catch(()=>{});
      return;
    }
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
      if(loginToken.status!=='PENDING')return;
      Object.assign(loginToken, {
        status: "PENDING",
        userId: null,
        telegramId: String(message.from.id),
        chatId: String(chatId),
        confirmedAt: null,
      });
      await saveLoginToken(loginToken);
      await telegramApi('sendMessage',{chat_id:chatId,text:'Подтвердить вход в «Карту контента»?\n\nЕсли вы не начинали вход на сайте, нажмите «Отменить».',reply_markup:{inline_keyboard:[[{text:'Подтвердить вход',callback_data:'cm_auth_yes_'+token},{text:'Отменить',callback_data:'cm_auth_no_'+token}]]}}).catch(()=>{});
      return;
    }
    await sendTelegramStart(chatId).catch(console.error);
  }
}

async function api(req, res, url) {
  if (url.pathname.startsWith('/api/agent/')) return agentApi(req,res,{path:url.pathname,pool:pgPool,send,requireUser,appUrl:APP_URL});
  if (url.pathname.startsWith('/api/internal/threads/')) {
    return handleRemoteRequest({ req, res, path: url.pathname, pool: pgPool, body, send, env: process.env });
  }
  const path = url.pathname;
  if(path==='/api/health'){
    if(req.method!=='GET')return methodNotAllowed(res);
    try{await pgPool.query('select 1 from cm_user_state limit 0');return send(res,200,{ok:true});}catch{return send(res,503,{ok:false});}
  }

  if (path === "/api/auth/me") {
    if (req.method !== "GET") return methodNotAllowed(res);
    return send(res, 200, { user: publicUser(await getUserBySession(parseCookies(req)[cookieName])) });
  }

  if (path === '/api/account/referral') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    const user = await getUserBySession(parseCookies(req)[cookieName]);
    if (!user) return send(res, 401, { error: 'unauthorized' });
    return send(res, 200, await referralSummary(pgPool, user.id, APP_URL));
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
    await revokeSession(pgPool,parseCookies(req)[cookieName]);
    clearSessionCookie(res);
    setBrowserCookie(res,'');
    return send(res, 200, { ok: true });
  }

  if (path === "/api/auth/telegram-mini-app" || path === "/api/auth/telegram/miniapp") {
    if (req.method !== "POST") return methodNotAllowed(res);
    try {
      const input = await body(req);
      const telegramUser = validateTelegramInitData(String(input.initData || ""));
      const user = await upsertTelegramUser(telegramUser);
      const signedStart = new URLSearchParams(String(input.initData || '')).get('start_param');
      const { session: token } = await completeReferralAuthorization(pgPool, user.id, referralStart(signedStart) || input.referralCode, client => issueSession(client,user.id,SESSION_SECRET));
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
      const browserKey=uid(32);
      const login = await createTelegramLoginToken(input.returnTo || url.searchParams.get("returnTo") || "/",browserKey,input.referralCode);
      setBrowserCookie(res,browserKey);
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
    const browserKey=parseCookies(req)[browserCookieName];
    if(!browserKey||!loginToken.browserHash||!safeCompare(tokenHash(browserKey),loginToken.browserHash))return send(res,403,{error:'telegram_browser_mismatch'});
    if (!loginToken.userId) return send(res, 202, { status: "pending" });
    const user = await getUserById(loginToken.userId);
    if (!user) return send(res, 404, { error: "telegram_user_not_found" });
    // Token consumption, reward and session creation commit together.
    let sessionToken;
    try {
      const result = await completeReferralAuthorization(pgPool, user.id, loginToken.referralCode, async client => {
        const consumed = await client.query(`update telegram_login_requests set status='USED',"usedAt"=now() where id=$1 and status='CONFIRMED' and "usedAt" is null and "expiresAt">now() returning id`,[loginToken.id]);
        if(consumed.rowCount!==1)throw Object.assign(new Error('login_token_not_found'),{status:404});
        return issueSession(client,user.id,SESSION_SECRET);
      });
      sessionToken = result.session;
    } catch(error) { if(error.status===404)return send(res,404,{error:'login_token_not_found',status:'missing'});throw error; }
    setSessionCookie(res, sessionToken);
    setBrowserCookie(res,'');
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

  if (path === '/api/publications/approval') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      return send(res, 200, await approvePublicationDay(pgPool, user.id, await body(req), req.headers['if-match']));
    } catch (error) {
      if (error.status) return send(res, error.status, { message: error.message });
      console.error('Publication approval failed', { name: error.name, code: error.code });
      return send(res, 503, { message: 'Не удалось сохранить утверждение. Проверьте связь и попробуйте снова.' });
    }
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

  if (path === '/api/content-workspace') {
    const user = await requireUser(req, res);
    if (!user) return;
    return contentWorkspaceApi(req, res, {user, pool:pgPool, body, send});
  }

  const stateMatch = path.match(/^\/api\/state\/([a-z0-9_-]+)$/i);
  if (stateMatch) {
    const user = await requireUser(req, res);
    if (!user) return;
    const key = stateMatch[1];
    if(!['main','publications','context'].includes(key))return send(res,404,{error:'not_found'});
    if(key==='context'){
      if(req.method==='GET')return send(res,200,await readContext(pgPool,user.id));
      if(req.method==='PUT'){
        try{const input=await body(req);return send(res,200,{ok:true,...await saveContext(pgPool,user.id,input.data,req.headers['if-match'])});}
        catch(error){return send(res,error.status||500,{error:error.status?error.message:'context_save_failed'});}
      }
      return methodNotAllowed(res);
    }
    if (req.method === "GET") {
      const { rows } = await pgPool.query("select data, md5(data::text) as revision from cm_user_state where user_id = $1 and key = $2", [user.id, key]);
      return send(res, 200, { data: rows[0]?.data || null, revision: rows[0]?.revision || 'new' });
    }
    if (req.method === "PUT") {
      const input = await body(req);
      if (key === 'main' || key === 'publications') {
        const revision = req.headers['if-match'];
        if (typeof revision !== 'string' || !/^(new|[a-f0-9]{32})$/.test(revision)) return send(res, 428, {error:'revision_required',message:'Обновите приложение перед сохранением.'});
        try {
          const saved = await updateWorkspace(pgPool,user.id,{type:key+'.replace',input:{data:input.data},revisions:{[key]:revision}});
          return send(res,200,{ok:true,revision:saved.revisions[key]});
        } catch(error) { return send(res,error.status||500,{error:error.status===409?'revision_conflict':'state_save_failed',message:error.status?error.message:'Не удалось сохранить материалы.'}); }
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
    allowed_updates: ["message", "edited_message", "callback_query"],
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
if(process.env.KARTA_SCHEMA_MODE==='runtime'){
  const {rows}=await pgPool.query("select to_regclass(name) as present from unnest($1::text[]) as name",[['cm_user_state','cm_auth_sessions','cm_agent_connections','cm_agent_actions','cm_threads_queue','telegram_accounts','cm_referral_accounts','cm_referral_entries','cm_like_transactions']]);
  if(rows.some(row=>!row.present))throw Error('database_migration_required');
}else{
  await ensureBaseSchema(pgPool);await ensureThreadsSchema(pgPool);await ensureRemoteSchema(pgPool);await ensureAgentSchema(pgPool);await ensureSessionSchema(pgPool);await ensureReferralSchema(pgPool);
}
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

const protect=requestProtection({appUrl:APP_URL,trustProxy:true});
createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const rejection=protect(req,res,url);if(rejection)return send(res,rejection.status,{error:rejection.error});
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error('Request failed',{name:error.name,code:error.code||'request_error'});
    return send(res,error.status||500,{error:error.status?error.message:'server_error'});
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Content Map server listening on http://127.0.0.1:${PORT}`);
});
