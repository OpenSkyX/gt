"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type StrategyInfo = {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  description: string;
  features: string[];
  expectedReturn: string;
  riskLevel: "低" | "中" | "高";
  minInvestment: string;
  badge: string | null;
  thirdPartyStrategyId: string | null;
  // 用户的实盘运行状态
  userQuantRun?: {
    id: string;
    status: "运行中" | "已停止";
    startedAt: string;
  } | null;
};

export type QuantRunInfo = {
  id: string;
  strategyName: string;
  startTime: string;
  endTime: string | null;
  initialFunds: number;
  finalFunds: number | null;
  currentFunds: number;
  profit: number;
  profitRate: string;
  runningTime: string;
  status: "运行中" | "已停止";
};

// 风险等级映射
function mapRiskLevel(level: string): "低" | "中" | "高" {
  if (level === "LOW") return "低";
  if (level === "MEDIUM") return "中";
  if (level === "HIGH") return "高";
  return "中";
}

// 格式化金额
function formatAmount(amount: number): string {
  return `${amount.toFixed(2)} USDT`;
}

// 格式化日期时间
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 计算运行时长
function calculateRunningTime(startTime: Date, endTime: Date | null): string {
  const end = endTime || new Date();
  const diff = end.getTime() - startTime.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}天${hours}小时${minutes}分`;
  } else if (hours > 0) {
    return `${hours}小时${minutes}分`;
  } else {
    return `${minutes}分钟`;
  }
}

/**
 * 获取所有量化策略（包含当前用户的运行状态）
 */
export async function getStrategiesAction(): Promise<ActionResult<StrategyInfo[]>> {
  try {
    const user = await getCurrentUser();

    const strategies = await prisma.quantStrategy.findMany({
      orderBy: { createdAt: "asc" },
    });

    // 如果用户已登录，查询用户的实盘运行状态
    let userQuantRuns: Map<string, any> = new Map();

    if (user) {
      const runs = await prisma.quantRun.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc", // 最新的在前
        },
      });

      // 对每个策略，保存最新的实盘记录
      runs.forEach((run) => {
        if (!userQuantRuns.has(run.strategyId)) {
          userQuantRuns.set(run.strategyId, run);
        }
      });
    }

    const strategyInfos: StrategyInfo[] = strategies.map((s) => {
      const latestRun = userQuantRuns.get(s.id);

      return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        iconBg: s.iconBg,
        description: s.description,
        features: s.features,
        expectedReturn: s.expectedReturn,
        riskLevel: mapRiskLevel(s.riskLevel),
        minInvestment: formatAmount(Number(s.minInvestment)),
        badge: s.badge,
        thirdPartyStrategyId: s.thirdPartyStrategyId,
        // 添加用户的实盘运行状态
        userQuantRun: latestRun
          ? {
              id: latestRun.id,
              status: latestRun.status === "RUNNING" ? "运行中" : "已停止",
              startedAt: formatDateTime(latestRun.startedAt),
            }
          : null,
      };
    });

    return { success: true, data: strategyInfos };
  } catch (error) {
    console.error("获取策略列表失败:", error);
    return { success: false, error: "获取策略列表失败" };
  }
}

/**
 * 根据ID获取单个策略
 */
export async function getStrategyByIdAction(id: string): Promise<ActionResult<StrategyInfo | null>> {
  try {
    const strategy = await prisma.quantStrategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      return { success: true, data: null };
    }

    const strategyInfo: StrategyInfo = {
      id: strategy.id,
      name: strategy.name,
      icon: strategy.icon,
      iconBg: strategy.iconBg,
      description: strategy.description,
      features: strategy.features,
      expectedReturn: strategy.expectedReturn,
      riskLevel: mapRiskLevel(strategy.riskLevel),
      minInvestment: formatAmount(Number(strategy.minInvestment)),
      badge: strategy.badge,
      thirdPartyStrategyId: strategy.thirdPartyStrategyId,
    };

    return { success: true, data: strategyInfo };
  } catch (error) {
    console.error("获取策略详情失败:", error);
    return { success: false, error: "获取策略详情失败" };
  }
}

/**
 * 获取用户的实盘历史
 */
export async function getQuantRunsAction(): Promise<ActionResult<QuantRunInfo[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "未登录" };
    }

    const quantRuns = await prisma.quantRun.findMany({
      where: { userId: user.id },
      include: {
        strategy: true,
      },
      orderBy: { startedAt: "desc" },
    });

    const quantRunInfos: QuantRunInfo[] = quantRuns.map((run) => {
      const initialFunds = Number(run.initialBalance);
      const finalFunds = run.finalBalance ? Number(run.finalBalance) : null;
      const currentFunds = Number(run.currentBalance);
      const profit = Number(run.realizedProfit);
      const profitRate = ((profit / initialFunds) * 100).toFixed(2);

      return {
        id: run.id,
        strategyName: run.strategy.name,
        startTime: formatDateTime(run.startedAt),
        endTime: run.endedAt ? formatDateTime(run.endedAt) : null,
        initialFunds,
        finalFunds,
        currentFunds,
        profit,
        profitRate,
        runningTime: calculateRunningTime(run.startedAt, run.endedAt),
        status: run.status === "RUNNING" ? "运行中" : "已停止",
      };
    });

    return { success: true, data: quantRunInfos };
  } catch (error) {
    console.error("获取实盘历史失败:", error);
    return { success: false, error: "获取实盘历史失败" };
  }
}
