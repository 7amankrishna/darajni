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
  "PAYU_SALT",
  "PAYU_MERCHANT_SALT",
  "SHIPROCKET_API_PASSWORD",
  "SHIPROCKET_WEBHOOK_TOKEN",
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

export function getPayUEnvironment() {
  // Support both variable naming conventions so a valid existing deployment
  // does not silently disable online payments during the PayU migration.
  const key = clean("PAYU_KEY") || clean("PAYU_MERCHANT_KEY");
  const salt =
    dedicatedSecret("PAYU_SALT", 6) ||
    dedicatedSecret("PAYU_MERCHANT_SALT", 6);
  const configuredMode = (
    clean("PAYU_ENVIRONMENT") || clean("PAYU_ENV") || "test"
  ).toLowerCase();
  const payuEnv = configuredMode === "production" ? "production" : "test";
  const actionUrl =
    payuEnv === "production"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment";
  return key && salt ? { key, salt, payuEnv, actionUrl } : null;
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

export function getShiprocketWebhookToken() {
  return dedicatedSecret("SHIPROCKET_WEBHOOK_TOKEN", 16);
}

function positiveNumber(name: string, minimum: number) {
  const value = Number(clean(name));
  return Number.isFinite(value) && value > minimum ? value : null;
}

export function getShiprocketEnvironment() {
  const email = clean("SHIPROCKET_API_EMAIL");
  const password = dedicatedSecret("SHIPROCKET_API_PASSWORD", 8);
  const pickupLocation = clean("SHIPROCKET_PICKUP_LOCATION");
  const weightKg = positiveNumber("SHIPROCKET_DEFAULT_WEIGHT_KG", 0);
  const lengthCm = positiveNumber("SHIPROCKET_DEFAULT_LENGTH_CM", 0.5);
  const breadthCm = positiveNumber("SHIPROCKET_DEFAULT_BREADTH_CM", 0.5);
  const heightCm = positiveNumber("SHIPROCKET_DEFAULT_HEIGHT_CM", 0.5);

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    !pickupLocation ||
    pickupLocation.length > 100 ||
    !weightKg ||
    !lengthCm ||
    !breadthCm ||
    !heightCm
  ) {
    return null;
  }

  return {
    email,
    password,
    pickupLocation,
    parcel: { weightKg, lengthCm, breadthCm, heightCm },
  };
}

export function getUpstashEnvironment() {
  const url = validUrl(clean("UPSTASH_REDIS_REST_URL"), ["https:"]);
  const token = dedicatedSecret("UPSTASH_REDIS_REST_TOKEN", 16);
  return url && token ? { url, token } : null;
}
