"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type CheckResult = {
  passed: boolean;
  message?: string;
  balance?: number; // 实际余额（用于创建实盘时获取初始资金）
};

/**
 * 检查 1: 最低 500 积分
 *
 * 只要用户积分余额 >= 500 即可启动实盘
 * 不需要扣除或锁定积分
 */
export async function checkMinimumPoints(): Promise<CheckResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { passed: false, message: "未登录" };
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { pointsBalance: true },
    });

    if (!user) {
      return { passed: false, message: "用户不存在" };
    }

    const points = Number(user.pointsBalance);
    const minimumRequired = 500;

    if (points >= minimumRequired) {
      return {
        passed: true,
        message: `当前积分: ${points.toFixed(2)}`,
      };
    } else {
      return {
        passed: false,
        message: `积分不足，当前 ${points.toFixed(2)}，需要至少 ${minimumRequired}`,
      };
    }
  } catch (error) {
    console.error("[CheckMinimumPoints] 错误:", error);
    return { passed: false, message: "检查失败" };
  }
}

/**
 * 检查 2: 已配置交易所 API
 */
export async function checkExchangeApiConfigured(): Promise<CheckResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { passed: false, message: "未登录" };
    }

    const apiKey = await prisma.exchangeApiKey.findUnique({
      where: { userId: currentUser.id },
      include: { exchangeType: true },
    });

    if (!apiKey) {
      return { passed: false, message: "未配置交易所 API" };
    }

    return {
      passed: true,
      message: `已配置 ${apiKey.exchangeType.name}`,
    };
  } catch (error) {
    console.error("[CheckExchangeApiConfigured] 错误:", error);
    return { passed: false, message: "检查失败" };
  }
}

/**
 * 检查 3: 测试 API 是否正确
 * 通过调用交易所 API 验证密钥是否有效
 */
export async function checkExchangeApiValid(): Promise<CheckResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { passed: false, message: "未登录" };
    }

    const apiKey = await prisma.exchangeApiKey.findUnique({
      where: { userId: currentUser.id },
    });

    if (!apiKey) {
      return { passed: false, message: "未配置交易所 API" };
    }

    // 检查数据库中的 isValid 标记
    if (!apiKey.isValid) {
      return { passed: false, message: "API 密钥未验证或验证失败" };
    }

    return { passed: true };
  } catch (error) {
    console.error("[CheckExchangeApiValid] 错误:", error);
    return { passed: false, message: "检查失败" };
  }
}

/**
 * 检查 4: 检查交易所余额
 * 检查合约账户是否有超过指定的余额（默认 1000 USDT）
 */
export async function checkExchangeBalance(
  minimumBalance: number = 1000
): Promise<CheckResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { passed: false, message: "未登录" };
    }

    const apiKeyRecord = await prisma.exchangeApiKey.findUnique({
      where: { userId: currentUser.id },
      include: { exchangeType: true },
    });

    if (!apiKeyRecord) {
      return { passed: false, message: "未配置交易所 API" };
    }

    if (!apiKeyRecord.isValid) {
      return { passed: false, message: "API 密钥未验证" };
    }

    // 根据交易所类型调用相应的余额查询
    const exchangeCode = apiKeyRecord.exchangeType.code;

    if (exchangeCode === "gate") {
      // 查询 Gate.io 合约账户余额
      return await checkGateBalance(apiKeyRecord, minimumBalance);
    } else if (exchangeCode === "binance") {
      // TODO: 实现 Binance 余额查询
      return {
        passed: false,
        message: "Binance 余额查询功能开发中",
      };
    } else {
      return {
        passed: false,
        message: "不支持的交易所类型",
      };
    }
  } catch (error) {
    console.error("[CheckExchangeBalance] 错误:", error);
    return { passed: false, message: "检查失败" };
  }
}

/**
 * 查询 Gate.io 合约账户余额
 */
async function checkGateBalance(
  apiKeyRecord: {
    apiKey: string;
    apiSecret: string;
  },
  minimumBalance: number
): Promise<CheckResult> {
  try {
    // 需要解密 apiSecret
    const { decryptSecret } = await import("@/lib/crypto");
    const { ApiClient, FuturesApi } = await import("gate-api");

    const apiSecret = decryptSecret(apiKeyRecord.apiSecret);

    // 创建 Gate.io API 客户端
    const client = new ApiClient();
    client.setApiKeySecret(apiKeyRecord.apiKey, apiSecret);
    client.basePath = "https://api.gateio.ws/api/v4";

    // 创建 Futures API 实例
    const futuresApi = new FuturesApi(client);

    // 查询 USDT 永续合约账户
    const settle = "usdt";
    const accountResponse = await futuresApi.listFuturesAccounts(settle);

    if (!accountResponse || !accountResponse.body) {
      return {
        passed: false,
        message: "无法获取账户信息",
      };
    }

    // accountResponse.body 应该是一个账户信息对象
    // available 字段表示可用余额
    const account = accountResponse.body as any;
    const availableBalance = parseFloat(account.available || "0");

    if (availableBalance >= minimumBalance) {
      return {
        passed: true,
        message: `可用余额: ${availableBalance.toFixed(2)} USDT`,
        balance: availableBalance, // 返回实际余额
      };
    } else {
      return {
        passed: false,
        message: `余额不足，当前 ${availableBalance.toFixed(2)} USDT，需要至少 ${minimumBalance} USDT`,
        balance: availableBalance, // 即使不足也返回余额
      };
    }
  } catch (error: any) {
    console.error("[CheckGateBalance] 错误:", error);

    let errorMessage = "余额查询失败";
    if (error.response) {
      const statusCode = error.response.statusCode || error.response.status;
      if (statusCode === 401) {
        errorMessage = "API 认证失败";
      } else if (statusCode === 403) {
        errorMessage = "API 无合约权限";
      } else if (error.response.body?.message) {
        errorMessage = `API 错误: ${error.response.body.message}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      passed: false,
      message: errorMessage,
    };
  }
}

/**
 * 检查 5: 检查是否有可用的托管者服务器
 * 每个托管者最多允许10个在线实盘
 */
export async function checkCustodianAvailable(): Promise<CheckResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { passed: false, message: "未登录" };
    }

    // 调用 XMX 平台检查托管者可用性
    const { getXmxClient } = await import("@/lib/xmx/client");
    const xmx = getXmxClient();

    const availability = await xmx.checkCustodianAvailability();

    if (!availability.hasAvailable) {
      return {
        passed: false,
        message: availability.message || "当前无可用服务器，请联系客服",
      };
    }

    return {
      passed: true,
      message: availability.message,
    };
  } catch (error) {
    console.error("[CheckCustodianAvailable] 错误:", error);
    return {
      passed: false,
      message: "服务器检查失败，请稍后重试",
    };
  }
}

/**
 * 一次性执行所有检查
 */
export async function checkAllConditions(): Promise<{
  minimumPoints: CheckResult;
  apiConfigured: CheckResult;
  apiValid: CheckResult;
  exchangeBalance: CheckResult;
  custodianAvailable: CheckResult;
  allPassed: boolean;
}> {
  const [minimumPoints, apiConfigured, apiValid, exchangeBalance, custodianAvailable] =
    await Promise.all([
      checkMinimumPoints(),
      checkExchangeApiConfigured(),
      checkExchangeApiValid(),
      checkExchangeBalance(),
      checkCustodianAvailable(),
    ]);

  const allPassed =
    minimumPoints.passed &&
    apiConfigured.passed &&
    apiValid.passed &&
    exchangeBalance.passed &&
    custodianAvailable.passed;

  return {
    minimumPoints,
    apiConfigured,
    apiValid,
    exchangeBalance,
    custodianAvailable,
    allPassed,
  };
}
