import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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
const cookieName = "contentmap_session";
let telegramBotInfo = null;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!TELEGRAM_BOT_TOKEN) console.warn("TELEGRAM_BOT_TOKEN is empty: Telegram auth will be unavailable");

function createPgPool() {
  const parsed = new URL(DATABASE_URL);
  const sslMode = parsed.searchParams.get("sslmode");
  let ssl = false;
  if (sslMode && sslMode !== "disable") {
    ssl = { rejectUnauthorized: false };
    if (PGSSLROOTCERT && existsSync(PGSSLROOTCERT)) {
      ssl = { ca: readFileSync(PGSSLROOTCERT, "utf8"), rejectUnauthorized: true };
    }
  }
  return new pg.Pool({ connectionString: DATABASE_URL, ssl, max: 5 });
}

const pgPool = createPgPool();

function uid(bytes = 16) {
  return randomBytes(bytes).toString("hex");
}

function now() {
  return new Date().toISOString();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, expected] = String(passwordHash || "").split(":");
  if (!salt || !expected) return false;
  return hashPassword(password, salt) === passwordHash;
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function ensureSchema() {
  await pgPool.query(`
    create table if not exists cm_users (
      id text primary key,
      data jsonb not null
    );
    create table if not exists cm_sessions (
      token text primary key,
      user_id text not null,
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
    create index if not exists cm_sessions_user_id_idx on cm_sessions (user_id);
  `);
}

async function readUsers() {
  const { rows } = await pgPool.query("select data from cm_users");
  return rows.map((row) => row.data);
}

async function saveUser(user) {
  await pgPool.query(
    "insert into cm_users (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data",
    [user.id, JSON.stringify(user)],
  );
}

async function getUserById(id) {
  const { rows } = await pgPool.query("select data from cm_users where id = $1", [id]);
  return rows[0]?.data || null;
}

async function createSession(userId) {
  const token = uid(24);
  const data = { token, userId, createdAt: now() };
  await pgPool.query("insert into cm_sessions (token, user_id, data) values ($1, $2, $3::jsonb)", [
    token,
    userId,
    JSON.stringify(data),
  ]);
  return token;
}

async function removeSession(token) {
  await pgPool.query("delete from cm_sessions where token = $1", [token]);
}

async function getUserBySession(token) {
  if (!token) return null;
  const { rows } = await pgPool.query("select user_id from cm_sessions where token = $1", [token]);
  if (!rows[0]?.user_id) return null;
  return await getUserById(rows[0].user_id);
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
  res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
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
  const telegramId = String(telegramUser.id);
  const users = await readUsers();
  const email = `telegram:${telegramId}`;
  const name = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ").trim() || telegramUser.username || `Telegram ${telegramId}`;
  let user = users.find((item) => item.email === email || String(item.telegramId || "") === telegramId);
  if (!user) {
    user = {
      id: uid(),
      email,
      name,
      authProvider: "telegram",
      telegramId,
      telegramUsername: telegramUser.username ? `@${telegramUser.username}` : "",
      createdAt: now(),
    };
  } else {
    Object.assign(user, {
      email,
      name,
      authProvider: "telegram",
      telegramId,
      telegramUsername: telegramUser.username ? `@${telegramUser.username}` : user.telegramUsername || "",
      updatedAt: now(),
    });
  }
  await saveUser(user);
  return user;
}

async function createTelegramLoginToken() {
  const bot = TELEGRAM_BOT_TOKEN ? await getTelegramBotInfo() : null;
  if (!bot?.username) throw new Error("telegram_bot_not_configured");
  const token = uid(20);
  const data = {
    token,
    userId: "",
    createdAt: now(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    confirmedAt: "",
    usedAt: "",
  };
  await pgPool.query("insert into cm_login_tokens (token, data) values ($1, $2::jsonb)", [token, JSON.stringify(data)]);
  return { token, expiresAt: data.expiresAt, botLink: `https://t.me/${bot.username}?start=login_${token}` };
}

async function readLoginToken(token) {
  const { rows } = await pgPool.query("select data from cm_login_tokens where token = $1", [token]);
  return rows[0]?.data || null;
}

async function saveLoginToken(loginToken) {
  await pgPool.query(
    "insert into cm_login_tokens (token, data) values ($1, $2::jsonb) on conflict (token) do update set data = excluded.data",
    [loginToken.token, JSON.stringify(loginToken)],
  );
}

async function deleteLoginToken(token) {
  await pgPool.query("delete from cm_login_tokens where token = $1", [token]);
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
  if (TELEGRAM_WEBHOOK_SECRET && !safeCompare(req.headers["x-telegram-bot-api-secret-token"], TELEGRAM_WEBHOOK_SECRET)) {
    return send(res, 401, { error: "invalid_telegram_secret" });
  }
  const update = await body(req);
  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  const text = String(message?.text || "");
  if (chatId && text.startsWith("/start")) {
    const loginMatch = text.match(/^\/start\s+login_([a-f0-9]{40})/i);
    if (loginMatch) {
      const token = loginMatch[1];
      const loginToken = await readLoginToken(token);
      if (!loginToken || loginToken.usedAt || new Date(loginToken.expiresAt).getTime() <= Date.now()) {
        await deleteLoginToken(token);
        await telegramApi("sendMessage", {
          chat_id: chatId,
          text: "Ссылка для входа устарела. Вернитесь на сайт и нажмите «Войти через Telegram» ещё раз.",
        }).catch(console.error);
        return send(res, 200, { ok: true });
      }
      const user = await upsertTelegramUser(message.from);
      Object.assign(loginToken, {
        userId: user.id,
        telegramChatId: String(chatId),
        confirmedAt: now(),
      });
      await saveLoginToken(loginToken);
      await sendTelegramLoginConfirmed(chatId, token).catch(console.error);
      return send(res, 200, { ok: true });
    }
    await sendTelegramStart(chatId).catch(console.error);
  }
  return send(res, 200, { ok: true });
}

async function api(req, res, url) {
  const path = url.pathname;

  if (path === "/api/auth/me") {
    if (req.method !== "GET") return methodNotAllowed(res);
    return send(res, 200, { user: publicUser(await getUserBySession(parseCookies(req)[cookieName])) });
  }

  if (path === "/api/auth/register") {
    if (req.method !== "POST") return methodNotAllowed(res);
    const input = await body(req);
    const email = String(input.email || "").trim().toLowerCase();
    const password = String(input.password || "");
    if (!email || password.length < 6) return send(res, 400, { error: "invalid_credentials" });
    const users = await readUsers();
    if (users.some((user) => user.email === email)) return send(res, 409, { error: "email_exists" });
    const user = {
      id: uid(),
      email,
      passwordHash: hashPassword(password),
      name: String(input.name || "").trim() || email.split("@")[0],
      authProvider: "email",
      createdAt: now(),
    };
    await saveUser(user);
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return send(res, 201, { user: publicUser(user) });
  }

  if (path === "/api/auth/login") {
    if (req.method !== "POST") return methodNotAllowed(res);
    const input = await body(req);
    const email = String(input.email || "").trim().toLowerCase();
    const users = await readUsers();
    const user = users.find((item) => item.email === email);
    if (!user || !verifyPassword(String(input.password || ""), user.passwordHash)) return send(res, 401, { error: "invalid_credentials" });
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return send(res, 200, { user: publicUser(user) });
  }

  if (path === "/api/auth/logout") {
    if (req.method !== "POST") return methodNotAllowed(res);
    await removeSession(parseCookies(req)[cookieName]);
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
      return send(res, 401, { error: error.message || "telegram_auth_failed" });
    }
  }

  if (path === "/api/auth/telegram-login-token" || path === "/api/auth/telegram/start") {
    if (req.method !== "POST") return methodNotAllowed(res);
    try {
      const login = await createTelegramLoginToken();
      return send(res, 201, { ok: true, token: login.token, expiresAt: login.expiresAt, botLink: login.botLink, botUrl: login.botLink });
    } catch (error) {
      return send(res, 500, { error: error.message || "telegram_login_token_failed" });
    }
  }

  const tokenMatch = path.match(/^\/api\/auth\/telegram-login-token\/([^/]+)$/);
  if (tokenMatch || path === "/api/auth/telegram/status") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const token = tokenMatch?.[1] || url.searchParams.get("token") || "";
    const loginToken = await readLoginToken(token);
    if (!loginToken || loginToken.usedAt) return send(res, 404, { error: "login_token_not_found", status: "missing" });
    if (new Date(loginToken.expiresAt).getTime() <= Date.now()) {
      await deleteLoginToken(token);
      return send(res, 410, { error: "login_token_expired", status: "expired" });
    }
    if (!loginToken.userId) return send(res, 202, { status: "pending" });
    const user = await getUserById(loginToken.userId);
    if (!user) return send(res, 404, { error: "telegram_user_not_found" });
    const sessionToken = await createSession(user.id);
    loginToken.usedAt = now();
    await saveLoginToken(loginToken);
    setSessionCookie(res, sessionToken);
    return send(res, 200, { ok: true, status: "confirmed", user: publicUser(user) });
  }

  if (path === "/api/telegram/webhook" || path === "/api/auth/telegram/webhook") {
    if (req.method !== "POST") return methodNotAllowed(res);
    return await handleTelegramWebhook(req, res);
  }

  if (path === "/api/telegram/setup-webhook") {
    if (req.method !== "POST") return methodNotAllowed(res);
    const input = await body(req).catch(() => ({}));
    if (TELEGRAM_WEBHOOK_SECRET && input.secret && !safeCompare(input.secret, TELEGRAM_WEBHOOK_SECRET)) {
      return send(res, 401, { error: "invalid_secret" });
    }
    await setupTelegramBot();
    const webhook = await telegramApi("getWebhookInfo");
    return send(res, 200, { ok: true, webhook });
  }

  const stateMatch = path.match(/^\/api\/state\/([a-z0-9_-]+)$/i);
  if (stateMatch) {
    const user = await requireUser(req, res);
    if (!user) return;
    const key = stateMatch[1];
    if (req.method === "GET") {
      const { rows } = await pgPool.query("select data from cm_user_state where user_id = $1 and key = $2", [user.id, key]);
      return send(res, 200, { data: rows[0]?.data || null });
    }
    if (req.method === "PUT") {
      const input = await body(req);
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
  await telegramApi("setWebhook", {
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

await ensureSchema();
setupTelegramBot().catch((error) => console.error("Telegram setup failed:", error));

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error.message || "server_error" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Content Map server listening on http://127.0.0.1:${PORT}`);
});
