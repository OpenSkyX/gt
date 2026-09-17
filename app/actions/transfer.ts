"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type TransferType = "funding_to_points" | "points_to_funding";

export type TransferInput = {
  type: TransferType;
  amount: number;
};

/**
 * 资产划转
 * - funding_to_points: 可用资产 -> 积分资产
 * - points_to_funding: 积分资产 -> 可用资产
 */
export async function transferAssetAction(input: TransferInput): Promise<ActionResult<{ success: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const { type, amount } = input;

  // 验证金额
  if (!amount || amount <= 0) {
    return { success: false, error: "划转金额必须大于 0" };
  }

  // 获取用户当前资产
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fundingBalance: true,
      pointsBalance: true,
    },
  });

  if (!currentUser) {
    return { success: false, error: "用户不存在" };
  }

  // 验证余额是否足够
  if (type === "funding_to_points") {
    const currentBalance = Number(currentUser.fundingBalance);
    if (currentBalance < amount) {
      return { success: false, error: `可用资产不足，当前余额：${currentBalance.toFixed(2)} USDT` };
    }
  } else {
    // 积分 -> 资金账户时，需要检查是否有运行中的实盘
    const runningQuantRuns = await prisma.quantRun.count({
      where: {
        userId: user.id,
        status: "RUNNING",
      },
    });

    if (runningQuantRuns > 0) {
      return {
        success: false,
        error: `当前有 ${runningQuantRuns} 个实盘正在运行，资金处于冻结状态，无法划转。请先停止所有实盘后再操作。`,
      };
    }

    const currentPoints = Number(currentUser.pointsBalance);
    if (currentPoints < amount) {
      return { success: false, error: `积分资产不足，当前积分：${currentPoints.toFixed(0)}` };
    }
  }

  try {
    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      if (type === "funding_to_points") {
        // 可用资产 -> 积分资产
        // 1. 更新用户余额
        await tx.user.update({
          where: { id: user.id },
          data: {
            fundingBalance: { decrement: amount },
            pointsBalance: { increment: amount },
          },
        });

        // 2. 创建划转记录（使用 currency 字段标记方向）
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "TRANSFER_IN",
            status: "COMPLETED",
            amount,
            currency: "FUNDING_TO_POINTS", // 资产->积分
          },
        });
      } else {
        // 积分资产 -> 可用资产
        // 1. 更新用户余额
        await tx.user.update({
          where: { id: user.id },
          data: {
            pointsBalance: { decrement: amount },
            fundingBalance: { increment: amount },
          },
        });

        // 2. 创建划转记录（使用 currency 字段标记方向）
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "TRANSFER_IN",
            status: "COMPLETED",
            amount,
            currency: "POINTS_TO_FUNDING", // 积分->资产
          },
        });
      }
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("划转失败:", error);
    return { success: false, error: "划转失败，请稍后重试" };
  }
}
