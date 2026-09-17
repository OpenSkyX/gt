import "server-only";

/**
 * XMX RSA 公钥（用于加密敏感信息）
 * 本地存储，避免每次请求
 */
export const XMX_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhHV02UyqVy6TyriQcStq
w+LifAgoxbfutTw/wx/rDH5kaoeTvdJYw8+JvK2zw7QVvHUIqlwiXa8HQy4NGqUN
v5hbc5wRGbQvEJnM6980jJC1uoSvI4TC8MKQeGMt6ur6Fbe4sEXB7Boszq0IjIPS
UWBNZROcTqU+kGYwQ5G6F8DLMX59m4GpDf22oCNmF600Z7I8h0i4dNodnbZWKnHQ
SWx7F+BGGlU1109vXsLW80T3DdyGKzCnrcvOYOmPY67Hzy2x6cdBUtZK0l6sjdEv
Vr5KZOthyE1akhaDziMTnqaq4jKgiWk/A1Ocdh+/m2WdRy59UZD3uabTtA1Gt5By
CQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * XMX 第三方量化平台配置
 * 用于添加交易所、创建实盘、结束实盘等操作
 */
export const XMX_CONFIG = {
  // 访问密钥
  ACCESS_KEY: process.env.XMX_ACCESS_KEY || "",
  SECRET_KEY: process.env.XMX_SECRET_KEY || "",

  // API 基础地址
  BASE_URL: process.env.XMX_BASE_URL || "https://api.xmx.finance",
} as const;

/**
 * 验证配置是否完整
 */
export function validateXmxConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!XMX_CONFIG.ACCESS_KEY) {
    errors.push("XMX_ACCESS_KEY 未配置");
  }

  if (!XMX_CONFIG.SECRET_KEY) {
    errors.push("XMX_SECRET_KEY 未配置");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
