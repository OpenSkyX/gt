import "server-only";

/**
 * 充值监听服务配置
 */
export const MONITOR_CONFIG = {
  // 网络配置
  NETWORK: "arbitrum-sepolia" as const,
  RPC_URL: process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
  // ✅ Alchemy WebSocket URL: 只需将 https:// 替换为 wss://
  WSS_URL: process.env.ARBITRUM_SEPOLIA_RPC_URL?.replace("https://", "wss://") || "",
  CHAIN_ID: 421614,

  // 代币合约地址
  USDT_ADDRESS: (process.env.USDT_CONTRACT_ADDRESS || "").toLowerCase(),

  // 代币精度
  USDT_DECIMALS: parseInt(process.env.USDT_DECIMALS || "6", 10), // USDT 标准为 6 位小数

  // 监听配置
  POLL_INTERVAL: parseInt(process.env.MONITOR_POLL_INTERVAL || "5000", 10), // 5秒（仅在追赶时使用）
  BATCH_SIZE: parseInt(process.env.MONITOR_BATCH_SIZE || "10", 10), // 每次10个区块（减少以避免速率限制）
  REQUIRED_CONFIRMATIONS: parseInt(process.env.MONITOR_REQUIRED_CONFIRMATIONS || "6", 10),
  REORG_SAFETY_DEPTH: parseInt(process.env.MONITOR_REORG_SAFETY_DEPTH || "12", 10),

  // WebSocket 配置
  CATCHUP_THRESHOLD: 5, // 落后超过5个区块时使用轮询追赶
  WS_RECONNECT_DELAY: 5000, // WebSocket 重连延迟（毫秒）
  WS_MAX_RECONNECT_ATTEMPTS: 10, // 最大重连次数

  // 性能配置
  MAX_CONCURRENT_REQUESTS: 3, // 最大并发请求数（降低以避免速率限制）
  RETRY_ATTEMPTS: 3, // 重试次数
  RETRY_DELAY: 1000, // 重试延迟（毫秒）

  // 缓存配置
  ADDRESS_CACHE_TTL: 300, // 地址缓存 5 分钟（秒）

  // 监控配置
  HEARTBEAT_INTERVAL: 30000, // 30秒心跳
  HEALTH_CHECK_INTERVAL: 60000, // 60秒健康检查
} as const;

/**
 * 验证配置是否完整
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!MONITOR_CONFIG.RPC_URL) {
    errors.push("ARBITRUM_SEPOLIA_RPC_URL 未配置");
  }

  if (!MONITOR_CONFIG.USDT_ADDRESS || MONITOR_CONFIG.USDT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    errors.push("USDT_CONTRACT_ADDRESS 未配置或无效");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ERC20 Transfer 事件签名
 */
export const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
