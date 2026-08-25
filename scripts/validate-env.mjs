const errors = [];
const warnings = [];

const placeholder = /(?:^your_|your-domain|your_project|replace_|generate-|generate_|example\.com|changeme|x{8,})/i;
const value = (name) => process.env[name]?.trim() || "";

function requireValue(name, minimumLength = 1) {
  const current = value(name);
  if (!current || placeholder.test(current) || current.length < minimumLength) {
    errors.push(`${name} is missing, still a placeholder, or shorter than ${minimumLength} characters.`);
  }
  return current;
}

function requireUrl(name, { allowLocalHttp = false } = {}) {
  const current = requireValue(name);
  if (!current) return;
  try {
    const parsed = new URL(current);
    const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(allowLocalHttp && local)) {
      errors.push(`${name} must use HTTPS${allowLocalHttp ? " outside local development" : ""}.`);
    }
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      errors.push(`${name} must be an origin URL without a path, query, or fragment.`);
    }
  } catch {
    errors.push(`${name} must be a valid absolute URL.`);
  }
}

requireUrl("NEXT_PUBLIC_SITE_URL", { allowLocalHttp: true });
requireUrl("NEXT_PUBLIC_SUPABASE_URL", { allowLocalHttp: true });
requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", 20);
requireValue("SUPABASE_SERVICE_ROLE_KEY", 32);
requireValue("ORDER_ACCESS_SECRET", 32);
requireValue("CRON_SECRET", 32);

const razorpayNames = [
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];
const razorpayValues = razorpayNames.map(value);
if (razorpayValues.some(Boolean) && !razorpayValues.every(Boolean)) {
  errors.push(`Configure all Razorpay variables together: ${razorpayNames.join(", ")}.`);
}
if (razorpayValues.every(Boolean)) {
  if (!/^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(razorpayValues[0])) {
    errors.push("NEXT_PUBLIC_RAZORPAY_KEY_ID does not have a valid Razorpay key ID format.");
  }
  if (razorpayValues[1].length < 16 || razorpayValues[2].length < 16) {
    errors.push("Razorpay server secrets must be at least 16 characters.");
  }
}

const payuKey = value("PAYU_KEY") || value("PAYU_MERCHANT_KEY");
const payuSalt = value("PAYU_SALT") || value("PAYU_MERCHANT_SALT");
if (Boolean(payuKey) !== Boolean(payuSalt)) {
  errors.push("Configure both PAYU_KEY and PAYU_SALT (or both PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT).");
}
if (payuSalt && payuSalt.length < 6) {
  errors.push("PAYU_SALT must be at least 6 characters.");
}
const payuMode = value("PAYU_ENVIRONMENT") || value("PAYU_ENV");
if (payuMode && !["test", "production"].includes(payuMode.toLowerCase())) {
  errors.push("PAYU_ENVIRONMENT must be either test or production.");
}

const shiprocketNames = [
  "SHIPROCKET_API_EMAIL",
  "SHIPROCKET_API_PASSWORD",
  "SHIPROCKET_PICKUP_LOCATION",
  "SHIPROCKET_DEFAULT_WEIGHT_KG",
  "SHIPROCKET_DEFAULT_LENGTH_CM",
  "SHIPROCKET_DEFAULT_BREADTH_CM",
  "SHIPROCKET_DEFAULT_HEIGHT_CM",
];
const shiprocketValues = shiprocketNames.map(value);
if (shiprocketValues.some(Boolean) && !shiprocketValues.every(Boolean)) {
  errors.push(`Configure all Shiprocket variables together: ${shiprocketNames.join(", ")}.`);
}
if (shiprocketValues.every(Boolean)) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shiprocketValues[0])) {
    errors.push("SHIPROCKET_API_EMAIL must be a valid API-user email address.");
  }
  if (shiprocketValues[1].length < 8) {
    errors.push("SHIPROCKET_API_PASSWORD must be at least 8 characters.");
  }
  if (shiprocketValues[2].length > 100) {
    errors.push("SHIPROCKET_PICKUP_LOCATION must be 100 characters or fewer.");
  }
  for (const [name, minimum] of [
    ["SHIPROCKET_DEFAULT_WEIGHT_KG", 0],
    ["SHIPROCKET_DEFAULT_LENGTH_CM", 0.5],
    ["SHIPROCKET_DEFAULT_BREADTH_CM", 0.5],
    ["SHIPROCKET_DEFAULT_HEIGHT_CM", 0.5],
  ]) {
    const numeric = Number(value(name));
    if (!Number.isFinite(numeric) || numeric <= minimum) {
      errors.push(`${name} must be a number greater than ${minimum}.`);
    }
  }
}

const shiprocketWebhookToken = value("SHIPROCKET_WEBHOOK_TOKEN");
if (shiprocketWebhookToken && shiprocketWebhookToken.length < 16) {
  errors.push("SHIPROCKET_WEBHOOK_TOKEN must be at least 16 characters.");
}

const shiprocketCheckoutNames = [
  "SHIPROCKET_API_KEY",
  "SHIPROCKET_SECRET_KEY",
];
const shiprocketCheckoutValues = shiprocketCheckoutNames.map(value);
if (
  shiprocketCheckoutValues.some(Boolean) &&
  !shiprocketCheckoutValues.every(Boolean)
) {
  errors.push(
    `Configure both Shiprocket Checkout variables: ${shiprocketCheckoutNames.join(", ")}.`,
  );
}
if (shiprocketCheckoutValues[1] && shiprocketCheckoutValues[1].length < 16) {
  errors.push("SHIPROCKET_SECRET_KEY must be at least 16 characters.");
}

const upstashUrl = value("UPSTASH_REDIS_REST_URL");
const upstashToken = value("UPSTASH_REDIS_REST_TOKEN");
if (Boolean(upstashUrl) !== Boolean(upstashToken)) {
  errors.push("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.");
} else if (upstashUrl) {
  try {
    if (new URL(upstashUrl).protocol !== "https:") {
      errors.push("UPSTASH_REDIS_REST_URL must use HTTPS.");
    }
  } catch {
    errors.push("UPSTASH_REDIS_REST_URL must be a valid absolute URL.");
  }
  if (upstashToken.length < 16) errors.push("UPSTASH_REDIS_REST_TOKEN is too short.");
} else {
  warnings.push("Upstash is not configured; rate limiting will use a per-instance memory fallback.");
}

const secrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ORDER_ACCESS_SECRET",
  "CRON_SECRET",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "PAYU_SALT",
  "PAYU_MERCHANT_SALT",
  "SHIPROCKET_API_PASSWORD",
  "SHIPROCKET_SECRET_KEY",
  "SHIPROCKET_WEBHOOK_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
  "BACKUP_ENCRYPTION_KEY",
  "SUPABASE_DB_URL",
].filter((name) => value(name));
for (let index = 0; index < secrets.length; index += 1) {
  for (let compare = index + 1; compare < secrets.length; compare += 1) {
    if (value(secrets[index]) === value(secrets[compare])) {
      errors.push(`${secrets[index]} and ${secrets[compare]} must use different secrets.`);
    }
  }
}

for (const name of Object.keys(process.env)) {
  if (/^NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|PRIVATE|TOKEN)/i.test(name)) {
    errors.push(`${name} appears to expose a server secret to browser code.`);
  }
}

const email = value("NEXT_PUBLIC_CONTACT_EMAIL");
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  errors.push("NEXT_PUBLIC_CONTACT_EMAIL must be a valid email address.");
}
for (const name of [
  "NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP",
  "NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP",
]) {
  if (value(name) && !/^\d{10,15}$/.test(value(name))) {
    errors.push(`${name} must contain 10–15 digits only, including country code.`);
  }
}

// ---------------------------------------------------------------------------
// Backups & disaster recovery: missing values are warnings (so local dev keeps
// working without backups); values that are present but malformed are errors.
// ---------------------------------------------------------------------------
const backupKey = value("BACKUP_ENCRYPTION_KEY");
if (backupKey) {
  const cleaned = backupKey.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    errors.push("BACKUP_ENCRYPTION_KEY is not valid base64. Generate a 32-byte key with: openssl rand -base64 32");
  } else if (Buffer.from(cleaned, "base64").length !== 32) {
    errors.push("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes. Generate with: openssl rand -base64 32");
  }
}

const supabaseDbUrl = value("SUPABASE_DB_URL");
if (supabaseDbUrl) {
  try {
    const parsed = new URL(supabaseDbUrl);
    if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
      errors.push("SUPABASE_DB_URL must use the postgresql:// (or postgres://) scheme.");
    } else if (/pooler\.supabase\.(com|co)/i.test(parsed.hostname) && parsed.port === "6543") {
      errors.push("SUPABASE_DB_URL points to the transaction pooler (port 6543); use port 5432 (session pooler or direct).");
    } else if (!parsed.hostname || !parsed.username || !parsed.password || !parsed.pathname.replace(/^\//, "")) {
      errors.push("SUPABASE_DB_URL must include host, user, password, and a database name.");
    }
  } catch {
    errors.push("SUPABASE_DB_URL must be a valid PostgreSQL connection URL.");
  }
}

const retentionDays = value("BACKUP_RETENTION_DAYS");
if (retentionDays) {
  const n = Number(retentionDays);
  if (!Number.isInteger(n) || n < 1) {
    errors.push("BACKUP_RETENTION_DAYS must be a positive integer.");
  } else if (n > 30) {
    warnings.push("BACKUP_RETENTION_DAYS above 30 is clamped to 30 by the backup worker (maximum retention is 30 days).");
  }
}

const dumpTimeoutMs = value("BACKUP_DUMP_TIMEOUT_MS");
if (dumpTimeoutMs) {
  const n = Number(dumpTimeoutMs);
  if (!Number.isInteger(n) || n < 1000) {
    errors.push("BACKUP_DUMP_TIMEOUT_MS must be a positive integer number of milliseconds.");
  }
}

const dbSchemas = value("BACKUP_DB_SCHEMAS");
if (dbSchemas) {
  for (const schema of dbSchemas.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      errors.push(`BACKUP_DB_SCHEMAS contains an invalid schema name: "${schema}".`);
    }
  }
}

const storageEnabled = value("BACKUP_STORAGE_ENABLED");
if (storageEnabled) {
  if (!["1", "true", "yes", "on", "0", "false", "no", "off"].includes(storageEnabled.toLowerCase())) {
    errors.push("BACKUP_STORAGE_ENABLED must be a boolean flag (1/0, true/false, yes/no, on/off).");
  }
}

if (!backupKey && !supabaseDbUrl) {
  warnings.push("Backups are not configured. Set SUPABASE_DB_URL and BACKUP_ENCRYPTION_KEY to enable encrypted PostgreSQL backups (stored in Supabase Storage). See docs/BACKUP_DISASTER_RECOVERY.md.");
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Environment validation passed.");
}
