"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getXmxClient } from "@/lib/xmx/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * 创建实盘运行
 *
 * 流程：
 * 1. 检查所有启动条件
 * 2. 获取可用的托管者
 * 3. 准备创建实盘的数据
 * 4. 调用 XMX API 创建实盘
 * 5. 保存到本地数据库
 */
export async function createQuantRunAction(input: {
  strategyId: string; // 本地策略ID
  maxDrawdown: number; // 最大回撤百分比
}): Promise<ActionResult<{ quantRunId: string; thirdPartyRunId: number }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "未登录" };
    }

    // 1. 获取策略信息（包含第三方策略ID）
    const strategy = await prisma.quantStrategy.findUnique({
      where: { id: input.strategyId },
    });

    if (!strategy) {
      return { success: false, error: "策略不存在" };
    }

    if (!strategy.thirdPartyStrategyId) {
      return { success: false, error: "策略未关联第三方平台" };
    }

    // 2. 获取用户信息（用于生成实盘名称）
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { userName: true, pointsBalance: true },
    });

    if (!user) {
      return { success: false, error: "用户不存在" };
    }

    // 3. 检查积分余额（最低 500）
    const minimumPoints = 500;
    const userPoints = Number(user.pointsBalance);

    if (userPoints < minimumPoints) {
      return {
        success: false,
        error: `积分不足，当前 ${userPoints.toFixed(2)}，需要至少 ${minimumPoints}`,
      };
    }

    // 3.5. 检查该策略是否已有运行中的实盘
    const existingRunningTrade = await prisma.quantRun.findFirst({
      where: {
        userId: currentUser.id,
        strategyId: input.strategyId,
        status: "RUNNING",
      },
    });

    if (existingRunningTrade) {
      return {
        success: false,
        error: "该策略已有实盘正在运行，一个策略只能同时运行一个实盘",
      };
    }

    // 4. 获取用户的交易所 API（需要 xmxAssociationId）
    const apiKey = await prisma.exchangeApiKey.findUnique({
      where: { userId: currentUser.id },
    });

    if (!apiKey) {
      return { success: false, error: "未配置交易所 API" };
    }

    if (!apiKey.xmxAssociationId) {
      return { success: false, error: "交易所未同步到第三方平台" };
    }

    // 4.5. 获取交易所实时余额作为初始资金
    const { checkExchangeBalance } = await import("./strategy-checks");
    const balanceCheck = await checkExchangeBalance(1000); // 最低1000 USDT

    if (!balanceCheck.passed) {
      return {
        success: false,
        error: balanceCheck.message || "交易所余额不足",
      };
    }

    const exchangeBalance = balanceCheck.balance || 0;
    console.log(`[CreateQuantRun] 交易所实时余额: ${exchangeBalance.toFixed(2)} USDT`);

    // 5. 获取可用的托管者
    const xmx = getXmxClient();
    const custodianId = await xmx.selectCustodian();

    if (!custodianId) {
      return {
        success: false,
        error: "当前所有服务器已满载，请联系客服",
      };
    }

    // 6. 查询第三方平台的策略详情（获取策略参数）
    const strategyDetailResult = await xmx.getStrategyDetail(
      Number(strategy.thirdPartyStrategyId)
    );

    if (strategyDetailResult.code !== 200 || !strategyDetailResult.data) {
      return {
        success: false,
        error: "无法获取策略详情",
      };
    }

    const strategyParams = strategyDetailResult.data.params || "{}";

    // 7. 生成实盘名称：用户名 + 时间戳
    const timestamp = Date.now();
    const realTradeName = `${user.userName}_${timestamp}`;

    // 8. 调用 XMX API 创建实盘
    const createResult = await xmx.createRealTrade({
      name: realTradeName,
      strategyId: Number(strategy.thirdPartyStrategyId),
      custodianId: custodianId,
      groupId: 1, // 默认分组ID
      klinePeriod: "15m", // 默认K线周期
      userExchangeIdList: [Number(apiKey.xmxAssociationId)],
      tradingPairList: ["BTC_USDT"], // 默认交易对
      params: strategyParams, // 策略参数
    });

    if (createResult.code !== 200 || !createResult.data) {
      return {
        success: false,
        error: createResult.message || "创建实盘失败",
      };
    }

    const thirdPartyRunId = createResult.data.id;

    // 9. 保存到本地数据库
    // 使用交易所的实时余额作为初始资金
    const quantRun = await prisma.quantRun.create({
      data: {
        userId: currentUser.id,
        strategyId: input.strategyId,
        thirdPartyRunId: String(thirdPartyRunId),
        thirdPartyStrategyId: strategy.thirdPartyStrategyId,
        status: "RUNNING",
        initialBalance: exchangeBalance, // 使用交易所实时余额
        currentBalance: exchangeBalance, // 初始时当前余额等于初始余额
        maxDrawdown: input.maxDrawdown,
      },
    });

    console.log(`[QuantRun] 创建成功:`, {
      quantRunId: quantRun.id,
      thirdPartyRunId,
      name: realTradeName,
      custodianId,
    });

    return {
      success: true,
      data: {
        quantRunId: quantRun.id,
        thirdPartyRunId,
      },
    };
  } catch (error) {
    console.error("[CreateQuantRun] 错误:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建实盘失败",
    };
  }
}

/**
 * 获取实盘详情
 */
export async function getQuantRunDetailAction(
  quantRunId: string
): Promise<ActionResult<any>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "未登录" };
    }

    const quantRun = await prisma.quantRun.findUnique({
      where: { id: quantRunId },
      include: {
        strategy: true,
      },
    });

    if (!quantRun) {
      return { success: false, error: "实盘不存在" };
    }

    if (quantRun.userId !== currentUser.id) {
      return { success: false, error: "无权访问" };
    }

    // TODO: 可以从第三方平台获取实时数据
    // if (quantRun.thirdPartyRunId) {
    //   const xmx = getXmxClient();
    //   const liveData = await xmx.getQuantRunDetail(Number(quantRun.thirdPartyRunId));
    // }

    // 转换 Decimal 类型为普通数字，以便传递给客户端组件
    return {
      success: true,
      data: {
        ...quantRun,
        initialBalance: Number(quantRun.initialBalance),
        currentBalance: Number(quantRun.currentBalance),
        finalBalance: quantRun.finalBalance ? Number(quantRun.finalBalance) : null,
        realizedProfit: Number(quantRun.realizedProfit),
        strategy: {
          ...quantRun.strategy,
          minInvestment: Number(quantRun.strategy.minInvestment),
        },
      },
    };
  } catch (error) {
    console.error("[GetQuantRunDetail] 错误:", error);
    return {
      success: false,
      error: "获取实盘详情失败",
    };
  }
}

/**
 * 停止实盘
 */
export async function stopQuantRunAction(
  quantRunId: string
): Promise<ActionResult<null>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "未登录" };
    }

    const quantRun = await prisma.quantRun.findUnique({
      where: { id: quantRunId },
    });

    if (!quantRun) {
      return { success: false, error: "实盘不存在" };
    }

    if (quantRun.userId !== currentUser.id) {
      return { success: false, error: "无权操作" };
    }

    if (quantRun.status === "STOPPED") {
      return { success: false, error: "实盘已停止" };
    }

    // 调用第三方平台停止实盘
    if (quantRun.thirdPartyRunId) {
      const xmx = getXmxClient();
      const stopResult = await xmx.stopRealTrade(Number(quantRun.thirdPartyRunId));

      if (stopResult.code !== 200) {
        return {
          success: false,
          error: stopResult.message || "停止实盘失败",
        };
      }
    }

    // 更新本地数据库
    await prisma.quantRun.update({
      where: { id: quantRunId },
      data: {
        status: "STOPPED",
        endedAt: new Date(),
        finalBalance: quantRun.currentBalance,
      },
    });

    console.log(`[QuantRun] 停止成功: ${quantRunId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error("[StopQuantRun] 错误:", error);
    return {
      success: false,
      error: "停止实盘失败",
    };
  }
}
