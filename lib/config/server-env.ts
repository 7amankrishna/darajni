import "server-only";

const PLACEHOLDER_PATTERN =
  /(?:^your_|your-domain|your_project|replace_|generate-|generate_|example\.com|changeme|x{8,})/i;

function clean(name: string) {
  const value = process.env[name]?.trim();
  return value && !PLACEHOLDER_PATTERN.test(value) ? value : null;
}

function validUrl(value: string | null, protocols: string[]) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (!protocols.includes(url.protocol)) return null;
    if (url.protocol === "http:" && !local) return null;
    return value.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function secret(name: string, minimumLength = 32) {
  const value = clean(name);
  return value && value.length >= minimumLength ? value : null;
}

const SERVER_SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ORDER_ACCESS_SECRET",
  "CRON_SECRET",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
];

function dedicatedSecret(name: string, minimumLength: number) {
  const value = secret(name, minimumLength);
  if (!value) return null;
  return SERVER_SECRET_NAMES.some(
    (otherName) => otherName !== name && clean(otherName) === value,
  )
    ? null
    : value;
}

export function getSupabaseServiceEnvironment() {
  const url = validUrl(clean("NEXT_PUBLIC_SUPABASE_URL"), ["https:", "http:"]);
  const serviceRoleKey = dedicatedSecret("SUPABASE_SERVICE_ROLE_KEY", 32);
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

export function getOrderAccessSecret() {
  return dedicatedSecret("ORDER_ACCESS_SECRET", 32);
}

export function getCronSecret() {
  return dedicatedSecret("CRON_SECRET", 32);
}

export function getRazorpayOrderEnvironment() {
  const keyId = clean("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  const keySecret = dedicatedSecret("RAZORPAY_KEY_SECRET", 16);
  return keyId && /^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(keyId) && keySecret
    ? { keyId, keySecret }
    : null;
}

export function getRazorpayKeySecret() {
  return dedicatedSecret("RAZORPAY_KEY_SECRET", 16);
}

export function getRazorpayWebhookSecret() {
  return dedicatedSecret("RAZORPAY_WEBHOOK_SECRET", 16);
}

export function getUpstashEnvironment() {
  const url = validUrl(clean("UPSTASH_REDIS_REST_URL"), ["https:"]);
  const token = dedicatedSecret("UPSTASH_REDIS_REST_TOKEN", 16);
  return url && token ? { url, token } : null;
}
