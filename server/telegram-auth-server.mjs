import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);
if (existsSync(envPath)) {
  const envText = readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^"|"$/g, "");
  }
}

const PORT = Number(process.env.AUTH_PORT || 3001);
const APP_URL = process.env.APP_URL || "https://kartakontenta.ru";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = (process.env.VITE_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://knwqhjutzlzckzjmbtto.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || TELEGRAM_BOT_TOKEN || "telegram-auth";
const TOKEN_TTL_MINUTES = 10;

if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!TELEGRAM_BOT_USERNAME) throw new Error("VITE_TELEGRAM_BOT_USERNAME is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": APP_URL,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type,x-telegram-bot-api-secret-token",
  });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function tokenExpiresAt() {
  return new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();
}

function telegramPassword(telegramId) {
  return createHmac("sha256", PASSWORD_SECRET)
    .update(`telegram:${telegramId}`)
    .digest("base64url")
    .slice(0, 48);
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a), "hex");
  const right = Buffer.from(String(b), "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyMiniAppInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");
  if (!safeEqual(hash || "", expected)) throw new Error("Invalid Telegram mini app signature");
  return JSON.parse(params.get("user") || "{}");
}

async function getOrCreateSupabaseUser(telegramUser) {
  const telegramId = String(telegramUser.id || "");
  if (!telegramId) throw new Error("Telegram user id is missing");

  const email = `telegram_${telegramId}@kartakontenta.local`;
  const password = telegramPassword(telegramId);
  const name = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") || telegramUser.username || "Telegram user";
  const userMetadata = {
    full_name: name,
    name,
    avatar_url: telegramUser.photo_url || "",
    auth_provider: "telegram",
    telegram_id: telegramId,
    telegram_username: telegramUser.username || "",
  };

  const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const found = existing?.users?.find((user) => user.email === email);
  if (found) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (error) throw error;
    return { email, password };
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error) throw error;
  return { email, password };
}

async function createLoginToken() {
  const token = randomBytes(24).toString("base64url");
  const { error } = await supabaseAdmin.from("telegram_login_tokens").insert({
    token,
    status: "pending",
    expires_at: tokenExpiresAt(),
  });
  if (error) throw error;
  return token;
}

async function completeLoginToken(token, telegramUser) {
  const { data, error } = await supabaseAdmin
    .from("telegram_login_tokens")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const { error: updateError } = await supabaseAdmin
    .from("telegram_login_tokens")
    .update({
      status: "confirmed",
      telegram_user: telegramUser,
      confirmed_at: new Date().toISOString(),
    })
    .eq("token", token);
  if (updateError) throw updateError;
  return true;
}

async function consumeLoginToken(token) {
  const { data, error } = await supabaseAdmin
    .from("telegram_login_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: "missing" };
  if (data.status === "consumed") return { status: "consumed" };
  if (new Date(data.expires_at).getTime() < Date.now()) return { status: "expired" };
  if (data.status !== "confirmed" || !data.telegram_user) return { status: "pending" };

  const credentials = await getOrCreateSupabaseUser(data.telegram_user);
  await supabaseAdmin
    .from("telegram_login_tokens")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("token", token);
  return { status: "confirmed", ...credentials };
}

async function sendTelegramMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function handleTelegramWebhook(req, res) {
  const update = await parseBody(req);
  const message = update.message || update.edited_message;
  const text = message?.text || "";
  const from = message?.from;
  const chatId = message?.chat?.id;

  if (!text.startsWith("/start login_") || !from || !chatId) {
    if (chatId) await sendTelegramMessage(chatId, "Откройте вход с сайта kartakontenta.ru, чтобы авторизоваться.");
    return json(res, 200, { ok: true });
  }

  const token = text.replace(/^\/start\s+login_/, "").trim();
  const confirmed = await completeLoginToken(token, from);
  await sendTelegramMessage(
    chatId,
    confirmed
      ? "Готово, Telegram подтвержден. Вернитесь на сайт, вход завершится автоматически."
      : "Токен входа не найден или устарел. Откройте вход через Telegram на сайте ещё раз.",
  );
  return json(res, 200, { ok: true });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });

    if (req.method === "POST" && url.pathname === "/api/auth/telegram/start") {
      const token = await createLoginToken();
      return json(res, 200, {
        ok: true,
        token,
        botUrl: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=login_${token}`,
      });
    }

    if (req.method === "GET" && url.pathname === "/api/auth/telegram/status") {
      const token = url.searchParams.get("token") || "";
      if (!token) return json(res, 400, { ok: false, error: "Token is required" });
      const result = await consumeLoginToken(token);
      return json(res, 200, { ok: true, ...result });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/telegram/miniapp") {
      const body = await parseBody(req);
      const telegramUser = verifyMiniAppInitData(body.initData || "");
      const credentials = await getOrCreateSupabaseUser(telegramUser);
      return json(res, 200, { ok: true, ...credentials });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/telegram/webhook") {
      return await handleTelegramWebhook(req, res);
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: error.message || "Telegram auth failed" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Telegram auth server listening on http://127.0.0.1:${PORT}`);
});
