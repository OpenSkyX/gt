import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.API_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("API_ENCRYPTION_KEY 未配置或长度不正确（需要 64 位十六进制字符串），请检查 .env");
  }
  return Buffer.from(key, "hex");
}

// 密文格式：iv:authTag:ciphertext，均为 hex 编码，用于加密交易所 API Secret/Passphrase 等敏感字段
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(cipherText: string): string {
  const [ivHex, authTagHex, dataHex] = cipherText.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("密文格式不正确");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

// MD5 加密，用于资金密码
export function md5Hash(text: string): string {
  return createHash("md5").update(text).digest("hex");
}
