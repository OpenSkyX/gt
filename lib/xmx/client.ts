import "server-only";
import { XMX_CONFIG, XMX_RSA_PUBLIC_KEY } from "./config";
import crypto from "crypto";

/**
 * XMX 平台 API 响应格式
 */
export interface XmxApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 交易所配置参数
 */
export interface ExchangeConfig {
  exchangeId: number; // 第三方量化平台的交易所 ID（2=Gate.io永续, 4=币安永续）
  accessKey: string; // 交易所 API Access Key
  secretKey: string; // 交易所 API Secret Key
  passphrase?: string; // API 密钥口令（某些交易所需要）
  remark?: string; // 标签/备注（格式：手机号_随机数，如：13800138000_123456）
}

/**
 * 策略详情
 */
export interface StrategyDetail {
  id: number;
  strategyName: string;
  userId: number;
  type: number;
  language: number;
  params: string; // JSON字符串格式的策略参数
  isPublic: number;
}

/**
 * 托管者信息
 */
export interface Custodian {
  id: number;
  custodianId: string;
  hostname: string;
  ipAddress: string;
  status: string;
  totalRealTrades: number;
  runningRealTrades: number;
}

/**
 * 在线托管者列表
 */
export interface OnlineCustodians {
  total: number;
  online: number;
  custodians: Custodian[];
}

/**
 * 创建实盘参数
 */
export interface CreateRealTradeParams {
  name: string; // 实盘名称
  strategyId: number; // 策略ID（第三方平台的策略ID）
  custodianId: number; // 托管者ID
  groupId?: number; // 分组ID，默认1
  klinePeriod?: string; // K线周期，默认"1m"
  userExchangeIdList: number[]; // 交易所ID列表
  tradingPairList: string[]; // 交易对列表
  params?: string; // 策略参数（JSON字符串）
  status?: string; // 初始状态
  isPublic?: number; // 是否公开
}

/**
 * 实盘信息
 */
export interface RealTradeInfo {
  id: number;
  name: string;
  status: string;
}

/**
 * XMX 平台 API 客户端
 */
export class XmxClient {
  private baseUrl: string;
  private accessKey: string;
  private secretKey: string;
  private rsaPublicKey: string;

  constructor() {
    this.baseUrl = XMX_CONFIG.BASE_URL;
    this.accessKey = XMX_CONFIG.ACCESS_KEY;
    this.secretKey = XMX_CONFIG.SECRET_KEY;
    this.rsaPublicKey = XMX_RSA_PUBLIC_KEY; // ✅ 使用本地公钥
  }

  /**
   * 通用 API 调用方法
   */
  private async callApi<T = any>(
    method: string,
    args: any[] = [],
    body?: any
  ): Promise<XmxApiResponse<T>> {
    try {
      // 构造 URL 参数
      const params = new URLSearchParams({
        access_key: this.accessKey,
        secret_key: this.secretKey,
        method,
        args: JSON.stringify(args),
      });

      const url = `${this.baseUrl}/api/v1?${params.toString()}`;

      // 根据是否有 body 决定使用 GET 还是 POST
      const httpMethod = body ? "POST" : "GET";

      // 发送请求
      const response = await fetch(url, {
        method: httpMethod,
        headers: body ? {
          "Content-Type": "application/json",
        } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result: XmxApiResponse<T> = await response.json();

      if (result.code !== 200) {
        throw new Error(result.message || "API 调用失败");
      }

      return result;
    } catch (error) {
      console.error("[XMX] API 调用失败:", error);
      throw error;
    }
  }

  /**
   * 获取 RSA 公钥（使用本地存储的公钥）
   */
  getRsaPublicKey(): string {
    return this.rsaPublicKey;
  }

  /**
   * RSA 加密（使用 Node.js crypto）
   */
  rsaEncrypt(text: string, publicKey: string): string {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(text, "utf8")
      );

      return encrypted.toString("base64");
    } catch (error) {
      console.error("[XMX] RSA 加密失败:", error);
      throw error;
    }
  }

  /**
   * 添加交易所
   */
  async addExchange(config: ExchangeConfig): Promise<XmxApiResponse<{ id: number }>> {
    console.log("[XMX] 添加交易所:", {
      exchangeId: config.exchangeId,
      label: config.remark,
    });

    // 使用本地 RSA 公钥
    const publicKey = this.getRsaPublicKey();

    // 加密敏感信息
    const encryptedAccessKey = this.rsaEncrypt(config.accessKey, publicKey);
    const encryptedSecretKey = this.rsaEncrypt(config.secretKey, publicKey);
    const encryptedPassphrase = config.passphrase
      ? this.rsaEncrypt(config.passphrase, publicKey)
      : undefined;

    // 构造请求体
    const body = {
      exchangeId: config.exchangeId,
      accessKey: encryptedAccessKey,
      secretKey: encryptedSecretKey,
      passphrase: encryptedPassphrase,
      encrypted: true, // 标记为已加密
      label: config.remark || "", // XMX API 使用 label 字段
    };

    // 调用 API
    return this.callApi<{ id: number }>("ManageExchange", ["add"], body);
  }

  /**
   * 删除交易所
   */
  async deleteExchange(exchangeConfigId: number): Promise<XmxApiResponse<string>> {
    console.log("[XMX] 删除交易所:", exchangeConfigId);

    return this.callApi<string>("ManageExchange", ["delete", exchangeConfigId]);
  }

  /**
   * 查询策略详情
   */
  async getStrategyDetail(strategyId: number): Promise<XmxApiResponse<StrategyDetail>> {
    console.log("[XMX] 查询策略详情:", strategyId);

    return this.callApi<StrategyDetail>("ManageStrategy", ["query", strategyId]);
  }

  /**
   * 查询在线托管者
   */
  async getOnlineCustodians(): Promise<XmxApiResponse<OnlineCustodians>> {
    console.log("[XMX] 查询在线托管者");

    return this.callApi<OnlineCustodians>("ManageCustodian", ["list_online"]);
  }

  /**
   * 选择合适的托管者
   *
   * 规则：
   * 1. 遍历所有在线托管者
   * 2. 每个托管者最多允许10个在线实盘
   * 3. 如果当前托管者在线实盘数 >= 10，跳过，检查下一个
   * 4. 优先选择负载最低的可用托管者
   * 5. 如果所有托管者都满载（>= 10个），返回 null
   */
  async selectCustodian(): Promise<number | null> {
    const result = await this.getOnlineCustodians();

    if (result.code !== 200 || !result.data) {
      console.error("[XMX] 获取托管者列表失败:", result.message);
      return null;
    }

    const MAX_RUNNING_TRADES_PER_CUSTODIAN = 10;
    const allCustodians = result.data.custodians;

    console.log(`[XMX] 检查 ${allCustodians.length} 个托管者...`);

    // 筛选可用托管者：在线 且 运行实盘数 < 10
    const availableCustodians = allCustodians.filter((c) => {
      const isOnline = c.status === "online";
      const hasCapacity = c.runningRealTrades < MAX_RUNNING_TRADES_PER_CUSTODIAN;

      console.log(`[XMX] 托管者 ${c.hostname}: ${isOnline ? "在线" : "离线"}, 实盘数: ${c.runningRealTrades}/${MAX_RUNNING_TRADES_PER_CUSTODIAN}, ${hasCapacity ? "可用" : "已满"}`);

      return isOnline && hasCapacity;
    });

    // 如果没有可用的托管者
    if (availableCustodians.length === 0) {
      console.error(`[XMX] ❌ 所有 ${allCustodians.length} 个托管者都已满载（每个最多10个实盘），无可用服务器`);
      return null;
    }

    // 选择运行实盘数量最少的托管者（负载均衡）
    const selected = availableCustodians.reduce((min, current) =>
      current.runningRealTrades < min.runningRealTrades ? current : min
    );

    console.log(`[XMX] ✅ 选择托管者 ${selected.hostname} (ID: ${selected.id}), 当前负载: ${selected.runningRealTrades}/${MAX_RUNNING_TRADES_PER_CUSTODIAN}`);

    return selected.id;
  }

  /**
   * 检查是否有可用的托管者
   *
   * 检查逻辑：
   * 1. 获取所有在线托管者列表
   * 2. 遍历每个托管者，检查其在线实盘数是否 < 10
   * 3. 如果所有托管者的在线实盘数都 >= 10，返回无可用服务器
   * 4. 否则返回可用托管者数量和负载信息
   */
  async checkCustodianAvailability(): Promise<{
    hasAvailable: boolean;
    availableCount: number;
    totalCount: number;
    message: string;
  }> {
    const result = await this.getOnlineCustodians();

    if (result.code !== 200 || !result.data) {
      return {
        hasAvailable: false,
        availableCount: 0,
        totalCount: 0,
        message: "无法获取服务器信息",
      };
    }

    const MAX_RUNNING_TRADES_PER_CUSTODIAN = 10;
    const allCustodians = result.data.custodians;

    // 筛选在线的托管者
    const onlineCustodians = allCustodians.filter((c) => c.status === "online");

    // 遍历在线托管者，找出未满载的（实盘数 < 10）
    const availableCustodians = onlineCustodians.filter((c) => {
      const hasCapacity = c.runningRealTrades < MAX_RUNNING_TRADES_PER_CUSTODIAN;
      return hasCapacity;
    });

    // 如果没有可用的托管者（所有在线托管者的实盘数都 >= 10）
    if (availableCustodians.length === 0) {
      const details = onlineCustodians
        .map((c) => `${c.hostname}: ${c.runningRealTrades}/10`)
        .join(", ");

      console.error(`[XMX] 所有托管者已满载: ${details}`);

      return {
        hasAvailable: false,
        availableCount: 0,
        totalCount: onlineCustodians.length,
        message: `当前所有服务器已满载（${onlineCustodians.length}个服务器，每个最多10个实盘），请联系客服`,
      };
    }

    // 找出负载最低的托管者
    const leastLoaded = availableCustodians.reduce((min, current) =>
      current.runningRealTrades < min.runningRealTrades ? current : min
    );

    return {
      hasAvailable: true,
      availableCount: availableCustodians.length,
      totalCount: onlineCustodians.length,
      message: `可用服务器: ${availableCustodians.length}/${onlineCustodians.length}，最低负载: ${leastLoaded.runningRealTrades}/${MAX_RUNNING_TRADES_PER_CUSTODIAN}`,
    };
  }

  /**
   * 创建实盘
   */
  async createRealTrade(params: CreateRealTradeParams): Promise<XmxApiResponse<RealTradeInfo>> {
    console.log("[XMX] 创建实盘:", {
      name: params.name,
      strategyId: params.strategyId,
      custodianId: params.custodianId,
    });

    const body = {
      name: params.name,
      strategyId: params.strategyId,
      custodianId: params.custodianId,
      groupId: params.groupId || 1, // 默认分组ID为1
      klinePeriod: params.klinePeriod || "1m", // 默认K线周期为1分钟
      userExchangeIdList: params.userExchangeIdList,
      tradingPairList: params.tradingPairList,
      params: params.params || "{}",
      // status: params.status || "INIT",
      isPublic: params.isPublic || 0,
    };

    return this.callApi<RealTradeInfo>("ManageRealTrade", ["create"], body);
  }

  /**
   * 重启实盘
   */
  async restartRealTrade(realTradeId: number): Promise<XmxApiResponse<string>> {
    console.log("[XMX] 重启实盘:", realTradeId);

    return this.callApi<string>("ManageRealTrade", ["restart", realTradeId]);
  }

  /**
   * 暂停实盘
   */
  async pauseRealTrade(realTradeId: number): Promise<XmxApiResponse<string>> {
    console.log("[XMX] 暂停实盘:", realTradeId);

    return this.callApi<string>("ManageRealTrade", ["pause", realTradeId]);
  }

  /**
   * 停止实盘
   */
  async stopRealTrade(realTradeId: number): Promise<XmxApiResponse<string>> {
    console.log("[XMX] 停止实盘:", realTradeId);

    return this.callApi<string>("ManageRealTrade", ["stop", realTradeId]);
  }

  /**
   * 查询实盘详情
   */
  async getRealTradeDetail(realTradeId: number): Promise<XmxApiResponse<RealTradeDetail>> {
    return this.callApi<RealTradeDetail>("ManageRealTrade", ["query", realTradeId]);
  }
}

/**
 * 实盘详情
 */
export interface RealTradeDetail {
  id: number;
  name: string;
  status: "INIT" | "RUNNING" | "PAUSED" | "STOPPED";
  strategyId: number;
  custodianId: number;
  groupId: number;
  klinePeriod: string;
  params: string;
  isPublic: number;
  profit: number;
  totalScore: number;
  sharpeScore: number;
  runtimeScore: number;
  drawdownScore: number;
  profitScore: number;
  capitalScore: number;
  maxDrawdown: number;
  currentDrawdown: number;
  dailyVolatility: number;
  totalVolatility: number;
  createTime: string;
  updateTime: string;
}

/**
 * 创建 XMX 客户端实例（单例）
 */
let xmxClientInstance: XmxClient | null = null;

export function getXmxClient(): XmxClient {
  if (!xmxClientInstance) {
    xmxClientInstance = new XmxClient();
  }
  return xmxClientInstance;
}

/**
 * 交易所 ID 映射（第三方量化平台系统中的交易所ID）
 * 注意：这些 ID 由第三方平台定义，不可修改
 */
export const EXCHANGE_ID_MAP = {
  GATE_PERPETUAL: 2,    // Gate.io 永续合约
  BINANCE_PERPETUAL: 4, // 币安永续合约
} as const;

/**
 * 交易所类型
 */
export type ExchangeType = typeof EXCHANGE_ID_MAP[keyof typeof EXCHANGE_ID_MAP];
