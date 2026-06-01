import { createHmac, createHash, timingSafeEqual } from "node:crypto";
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
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^"|"$/g, "");
  }
}

const PORT = Number(process.env.AUTH_PORT || 3001);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://knwqhjutzlzckzjmbtto.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || TELEGRAM_BOT_TOKEN || "telegram-auth";

if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.APP_URL || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
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

function parseTelegramPayload(payload) {
  if (payload.initData) {
    const params = new URLSearchParams(payload.initData);
    const hash = params.get("hash");
    params.delete("hash");
    const pairs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const checkString = pairs.map(([key, value]) => `${key}=${value}`).join("\n");
    const secret = createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
    const expected = createHmac("sha256", secret).update(checkString).digest("hex");
    if (!safeEqual(hash || "", expected)) throw new Error("Invalid Telegram signature");
    const user = JSON.parse(params.get("user") || "{}");
    return { ...user, auth_date: params.get("auth_date") };
  }

  const { hash, ...user } = payload.user || payload;
  const checkString = Object.entries(user)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(TELEGRAM_BOT_TOKEN).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");
  if (!safeEqual(hash || "", expected)) throw new Error("Invalid Telegram signature");
  return user;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a), "hex");
  const right = Buffer.from(String(b), "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function telegramPassword(telegramId) {
  return createHmac("sha256", PASSWORD_SECRET)
    .update(`telegram:${telegramId}`)
    .digest("base64url")
    .slice(0, 48);
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

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((user) => user.email === email);
  if (found) {
    await supabaseAdmin.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });
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

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/api/auth/telegram") {
    return json(res, 404, { error: "Not found" });
  }

  try {
    const payload = await parseBody(req);
    const telegramUser = parseTelegramPayload(payload);
    const credentials = await getOrCreateSupabaseUser(telegramUser);
    return json(res, 200, { ok: true, ...credentials });
  } catch (error) {
    console.error(error);
    return json(res, 401, { ok: false, error: error.message || "Telegram auth failed" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Telegram auth server listening on http://127.0.0.1:${PORT}`);
});
