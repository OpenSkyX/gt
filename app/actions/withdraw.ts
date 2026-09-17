"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { md5Hash } from "@/lib/crypto";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WithdrawInput = {
  amount: number;
  address: string;
  fundPassword: string;
};

/**
 * 申请提现
 * - 验证资金密码
 * - 验证可用资产余额
 * - 扣除可用资产
 * - 创建提现记录（状态：处理中）
 */
export async function withdrawAction(input: WithdrawInput): Promise<ActionResult<{ transactionId: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const { amount, address, fundPassword } = input;

  // 验证金额
  if (!amount || amount <= 0) {
    return { success: false, error: "提现金额必须大于 0" };
  }

  // 最小提现金额
  const MIN_WITHDRAW = 10;
  if (amount < MIN_WITHDRAW) {
    return { success: false, error: `最小提现金额为 ${MIN_WITHDRAW} USDT` };
  }

  // 验证提现地址
  if (!address || address.trim().length === 0) {
    return { success: false, error: "请输入提现地址" };
  }

  // 验证资金密码
  if (!user.fundPassword) {
    return { success: false, error: "您还未设置资金密码" };
  }

  const hashedPassword = md5Hash(fundPassword);
  if (hashedPassword !== user.fundPassword) {
    return { success: false, error: "资金密码错误" };
  }

  // 获取用户当前资产
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fundingBalance: true,
    },
  });

  if (!currentUser) {
    return { success: false, error: "用户不存在" };
  }

  const currentBalance = Number(currentUser.fundingBalance);
  if (currentBalance < amount) {
    return { success: false, error: `可用资产不足，当前余额：${currentBalance.toFixed(2)} USDT` };
  }

  try {
    // 使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 扣除可用资产
      await tx.user.update({
        where: { id: user.id },
        data: {
          fundingBalance: { decrement: amount },
        },
      });

      // 2. 创建提现记录（状态：处理中）
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "WITHDRAW",
          status: "PROCESSING",
          amount,
          currency: "USDT",
          address: address.trim(),
        },
      });

      return { transactionId: transaction.id };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("提现失败:", error);
    return { success: false, error: "提现失败，请稍后重试" };
  }
}
