"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { encryptSecret } from "@/lib/crypto";
import { ApiClient, FuturesApi } from "gate-api";
import { getXmxClient, EXCHANGE_ID_MAP } from "@/lib/xmx/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ExchangeApiInfo = {
  exchangeCode: string;
  exchangeName: string;
  apiKey: string; // 掩码后的展示值，不返回明文
  isValid: boolean;
  createdAt: string;
};

export type ExchangeTypeOption = {
  code: string;
  name: string;
};

// 隐藏密钥中间部分，仅用于展示
function maskSecret(str: string): string {
  if (str.length <= 8) return str;
  return str.slice(0, 4) + "****" + str.slice(-4);
}

export async function getExchangeTypesAction(): Promise<ActionResult<ExchangeTypeOption[]>> {
  const types = await prisma.exchangeType.findMany({
    orderBy: { id: "asc" },
    select: { code: true, name: true },
  });
  return { success: true, data: types };
}

export async function getMyExchangeApiAction(): Promise<ActionResult<ExchangeApiInfo | null>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const record = await prisma.exchangeApiKey.findUnique({
    where: { userId: user.id },
    include: { exchangeType: true },
  });

  if (!record) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      exchangeCode: record.exchangeType.code,
      exchangeName: record.exchangeType.name,
      apiKey: maskSecret(record.apiKey),
      isValid: record.isValid,
      createdAt: record.createdAt.toISOString(),
    },
  };
}

export async function saveMyExchangeApiAction(input: {
  exchangeCode: string;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}): Promise<ActionResult<ExchangeApiInfo>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const apiKey = input.apiKey.trim();
  const apiSecret = input.apiSecret.trim();
  const passphrase = input.passphrase.trim();
  if (!apiKey || !apiSecret) {
    return { success: false, error: "请填写完整的 API 信息" };
  }

  const exchangeType = await prisma.exchangeType.findUnique({ where: { code: input.exchangeCode } });
  if (!exchangeType) {
    return { success: false, error: "请选择一个有效的交易所" };
  }

  // API Secret / Passphrase 属于敏感凭证，加密后再落库（passphrase 可选，没填就不存）
  const encryptedSecret = encryptSecret(apiSecret);
  const encryptedPassphrase = passphrase ? encryptSecret(passphrase) : null;

  // userId 全局唯一：新提交的 API 会直接替换掉该用户已有的那一条（包括换交易所）
  const saved = await prisma.exchangeApiKey.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      exchangeTypeId: exchangeType.id,
      apiKey,
      apiSecret: encryptedSecret,
      passphrase: encryptedPassphrase,
      isValid: true,
    },
    update: {
      exchangeTypeId: exchangeType.id,
      apiKey,
      apiSecret: encryptedSecret,
      passphrase: encryptedPassphrase,
      isValid: true,
    },
    include: { exchangeType: true },
  });

  // 🔥 同步到 XMX 平台（添加交易所配置）
  try {
    const xmx = getXmxClient();

    // 将交易所代码映射到 XMX 的交易所 ID（第三方平台定义的ID）
    const exchangeIdMap: Record<string, number> = {
      gate: EXCHANGE_ID_MAP.GATE_PERPETUAL,    // Gate.io 永续合约 = 2
      binance: EXCHANGE_ID_MAP.BINANCE_PERPETUAL, // 币安永续合约 = 4
      // 可根据需要添加其他交易所...
    };

    const xmxExchangeId = exchangeIdMap[input.exchangeCode];
    if (xmxExchangeId) {
      // 生成随机数标识（6位数字）
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const label = `${user.phone}_${randomSuffix}`;

      const xmxResult = await xmx.addExchange({
        exchangeId: xmxExchangeId,
        accessKey: apiKey,
        secretKey: apiSecret,
        passphrase: passphrase || undefined,
        remark: label,
      });

      // ✅ 回写 XMX 返回的交易所配置 ID 到本地数据库
      if (xmxResult.data?.id) {
        await prisma.exchangeApiKey.update({
          where: { userId: user.id },
          data: {
            xmxAssociationId: String(xmxResult.data.id),
          },
        });

        console.log(`[Exchange] 已同步到 XMX 平台，配置 ID: ${xmxResult.data.id}, Label: ${label}`);
      }
    }
  } catch (error) {
    // XMX 同步失败不影响本地保存
    console.error("[Exchange] XMX 同步失败:", error);
    // 可选：记录到日志或通知用户
  }

  return {
    success: true,
    data: {
      exchangeCode: saved.exchangeType.code,
      exchangeName: saved.exchangeType.name,
      apiKey: maskSecret(saved.apiKey),
      isValid: saved.isValid,
      createdAt: saved.createdAt.toISOString(),
    },
  };
}

export async function deleteMyExchangeApiAction(): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  // 🔥 先从 XMX 平台删除交易所配置
  try {
    const existing = await prisma.exchangeApiKey.findUnique({
      where: { userId: user.id },
    });

    if (existing && existing.xmxAssociationId) {
      const xmx = getXmxClient();
      await xmx.deleteExchange(Number(existing.xmxAssociationId));
      console.log(`[Exchange] 已从 XMX 平台删除配置 ID: ${existing.xmxAssociationId}`);
    }
  } catch (error) {
    // XMX 删除失败不阻止本地删除（可能 XMX 上已不存在）
    console.error("[Exchange] XMX 删除失败:", error);
  }

  // 删除本地记录
  await prisma.exchangeApiKey.deleteMany({ where: { userId: user.id } });
  return { success: true, data: null };
}

/**
 * 测试 Gate.io API 连接并验证合约权限
 */
export async function testGateApiAction(input: {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}): Promise<ActionResult<{ hasContractPermission: boolean }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const { apiKey, apiSecret } = input;
  if (!apiKey || !apiSecret) {
    return { success: false, error: "请填写 API Key 和 Secret" };
  }

  try {
    // 创建 Gate.io API 客户端
    const client = new ApiClient();
    client.setApiKeySecret(apiKey, apiSecret);

    // 设置 API 基础 URL (默认是 https://api.gateio.ws/api/v4)
    client.basePath = "https://api.gateio.ws/api/v4";

    // 创建 Futures API 实例
    const futuresApi = new FuturesApi(client);

    // 设置 Settle 参数 (USDT 永续合约使用 'usdt')
    const settle = "usdt";

    // 尝试获取合约账户信息来验证权限
    // 这个接口需要合约账户权限
    const accountResponse = await futuresApi.listFuturesAccounts(settle);

    // 如果能成功获取到账户信息，说明有合约权限
    if (accountResponse && accountResponse.body) {
      return {
        success: true,
        data: { hasContractPermission: true },
      };
    } else {
      return {
        success: false,
        error: "无法获取合约账户信息，请检查 API 权限",
      };
    }
  } catch (error: any) {
    console.error("Gate.io API 测试失败:", error);

    // 解析错误信息
    let errorMessage = "API 测试失败";

    if (error.response) {
      // API 返回了错误响应
      const statusCode = error.response.statusCode || error.response.status;

      if (statusCode === 401) {
        errorMessage = "API Key 或 Secret 错误，请检查凭证";
      } else if (statusCode === 403) {
        errorMessage = "API 密钥没有合约交易权限，请在 Gate.io 重新创建具有合约权限的 API";
      } else if (error.response.body && error.response.body.message) {
        errorMessage = `API 错误: ${error.response.body.message}`;
      } else {
        errorMessage = `API 错误 (${statusCode})`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
