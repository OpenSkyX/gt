"use server";

import { prisma } from "@/lib/prisma";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RankingUser = {
  rank: number;
  username: string;
  assets: number; // 当前总资产
  profit: number; // 总收益
  profitRate: number; // 收益率
};

/**
 * 获取用户收益排行榜
 * 基于所有用户的实盘历史计算总收益
 */
export async function getRankingAction(): Promise<ActionResult<RankingUser[]>> {
  try {
    // 1. 获取所有用户及其实盘数据
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userName: true,
        phone: true,
        quantRuns: {
          select: {
            initialBalance: true,
            currentBalance: true,
            realizedProfit: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc', // 按创建时间降序排列，最新的在前
          },
        },
      },
    });

    // 2. 计算每个用户的总收益和资产
    const rankings: RankingUser[] = users
      .map((user) => {
        // 计算用户所有实盘的总收益
        const totalProfit = user.quantRuns.reduce((sum, run) => {
          return sum + Number(run.realizedProfit);
        }, 0);

        // 获取最后一个实盘（已按 createdAt 降序排序，第一个就是最新的）
        const lastRun = user.quantRuns[0];

        // 资产 = 最后一个实盘的初始资金 + 盈利
        const totalAssets = lastRun
          ? Number(lastRun.initialBalance) + Number(lastRun.realizedProfit)
          : 0;

        // 计算总投入（所有实盘的初始余额之和）
        const totalInitial = user.quantRuns.reduce((sum, run) => {
          return sum + Number(run.initialBalance);
        }, 0);

        // 收益率 = 总收益 / 总投入 * 100
        const profitRate = totalInitial > 0 ? (totalProfit / totalInitial) * 100 : 0;

        // 如果没有实盘数据或总收益为0，则不显示在排行榜
        if (user.quantRuns.length === 0 || totalProfit <= 0) {
          return null;
        }

        return {
          rank: 0, // 稍后排序后分配
          username: user.userName || user.phone || "匿名用户",
          assets: totalAssets,
          profit: totalProfit,
          profitRate: Number(profitRate.toFixed(2)),
        };
      })
      .filter((user): user is RankingUser => user !== null);

    // 3. 按总收益降序排序
    rankings.sort((a, b) => b.profit - a.profit);

    // 4. 分配排名
    rankings.forEach((user, index) => {
      user.rank = index + 1;
    });

    // 5. 只返回前15名
    const top15 = rankings.slice(0, 15);

    return { success: true, data: top15 };
  } catch (error) {
    console.error("获取排行榜失败:", error);
    return { success: false, error: "获取排行榜失败" };
  }
}
