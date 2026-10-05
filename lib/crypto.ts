import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns a 32-byte encryption key from environment or default fallback for development
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // Pad or hash to 32 bytes
    return crypto.createHash("sha256").update(envKey).digest();
  }
  // Safe development fallback key (Never use in production without ENCRYPTION_KEY env)
  return crypto.createHash("sha256").update("parth_plasto_pack_flipkart_secret_key_2026").digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: iv:authTag:encryptedHex
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt sensitive data");
  }
}

/**
 * Recursively redacts sensitive credentials (tokens, secrets, passwords)
 * so they are never exposed in UI responses, console logs, or audit records.
 */
export function redactSensitiveData<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const SENSITIVE_KEYS = [
    "client_secret",
    "clientsecret",
    "accesstoken",
    "access_token",
    "refreshtoken",
    "refresh_token",
    "authorization",
    "password",
    "secret",
    "encryptedaccesstoken",
    "encryptedrefreshtoken",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
