"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getReferralStats, type ReferralStats } from "@/lib/referral";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ProfileData = {
  phone: string;
  userName: string;
  avatarType: "auto" | "upload";
  avatarImage: string;
  avatarText: string;
  avatarColor: string;
  inviteCode: string;
};

export type AssetInfo = {
  fundingBalance: string;      // 可用资产（USDT）
  pointsBalance: string;        // 积分资产
  todayProfitLoss: string;      // 今日盈亏
  todayProfitLossPercent: string; // 今日盈亏百分比
  totalAssets: string;          // 预估总资产
};

export type TransactionInfo = {
  id: string;
  type: "充值" | "提现" | "划转入" | "划转出" | "反佣" | "激活" | "划转 资产->积分" | "划转 积分->资产";
  amount: string;
  currency: string;
  time: string;
  status: "完成" | "处理中" | "失败";
};

export type TransactionListResult = {
  transactions: TransactionInfo[];
  total: number;
  hasMore: boolean;
};

type UserRecord = {
  phone: string;
  userName: string;
  avatarType: "AUTO" | "UPLOAD";
  avatarImage: string | null;
  avatarText: string;
  avatarColor: string;
  inviteCode: string;
};

function toProfileData(user: UserRecord): ProfileData {
  return {
    phone: user.phone,
    userName: user.userName,
    avatarType: user.avatarType === "UPLOAD" ? "upload" : "auto",
    avatarImage: user.avatarImage ?? "",
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    inviteCode: user.inviteCode,
  };
}

export async function getMyReferralStatsAction(): Promise<ActionResult<ReferralStats>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const stats = await getReferralStats(user.id);
  return { success: true, data: stats };
}

export async function getMyProfileAction(): Promise<ActionResult<ProfileData>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  return { success: true, data: toProfileData(user) };
}

export async function updateMyProfileAction(input: {
  userName: string;
  avatarType: "auto" | "upload";
  avatarImage: string;
  avatarText: string;
  avatarColor: string;
}): Promise<ActionResult<ProfileData>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const trimmedName = input.userName.trim();
  if (!trimmedName) {
    return { success: false, error: "请输入用户名" };
  }
  if (trimmedName.length > 20) {
    return { success: false, error: "用户名最多 20 个字符" };
  }

  const isUpload = input.avatarType === "upload" && Boolean(input.avatarImage);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      userName: trimmedName,
      avatarType: isUpload ? "UPLOAD" : "AUTO",
      avatarImage: isUpload ? input.avatarImage : null,
      avatarText: input.avatarText || "GT",
      avatarColor: input.avatarColor,
    },
  });

  return { success: true, data: toProfileData(updated) };
}

/**
 * 获取当前用户的资产信息
 */
export async function getMyAssetsAction(): Promise<ActionResult<AssetInfo>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const userWithAssets = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fundingBalance: true,
      pointsBalance: true,
      todayProfitLoss: true,
    },
  });

  if (!userWithAssets) {
    return { success: false, error: "用户不存在" };
  }

  // 计算总资产（可用资产 + 积分资产）
  const totalAssets = Number(userWithAssets.fundingBalance) + Number(userWithAssets.pointsBalance);

  // 计算今日盈亏百分比
  const profitLoss = Number(userWithAssets.todayProfitLoss);
  let profitLossPercent = "0.00";
  if (totalAssets > 0 && profitLoss !== 0) {
    profitLossPercent = ((profitLoss / totalAssets) * 100).toFixed(2);
  }

  return {
    success: true,
    data: {
      fundingBalance: Number(userWithAssets.fundingBalance).toFixed(2),
      pointsBalance: Number(userWithAssets.pointsBalance).toFixed(0),
      todayProfitLoss: Number(userWithAssets.todayProfitLoss).toFixed(2),
      todayProfitLossPercent: profitLossPercent,
      totalAssets: totalAssets.toFixed(2),
    },
  };
}

/**
 * 获取当前用户的交易记录（支持分页）
 */
export async function getMyTransactionsAction(options?: {
  page?: number;
  limit?: number;
}): Promise<ActionResult<TransactionListResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;

  // 获取总数
  const total = await prisma.transaction.count({
    where: { userId: user.id },
  });

  // 获取分页数据
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const typeMap = {
    DEPOSIT: "充值" as const,
    WITHDRAW: "提现" as const,
    TRANSFER_IN: "划转入" as const,
    TRANSFER_OUT: "划转出" as const,
    REBATE: "反佣" as const,
    ACTIVATION: "激活" as const,
  };

  const statusMap = {
    COMPLETED: "完成" as const,
    PROCESSING: "处理中" as const,
    FAILED: "失败" as const,
  };

  const transactionInfos: TransactionInfo[] = transactions.map((tx) => {
    let displayType: TransactionInfo["type"] = typeMap[tx.type];
    let displayCurrency = tx.currency;

    // 特殊处理划转记录
    if (tx.type === "TRANSFER_IN") {
      if (tx.currency === "FUNDING_TO_POINTS") {
        displayType = "划转 资产->积分";
        displayCurrency = "USDT";
      } else if (tx.currency === "POINTS_TO_FUNDING") {
        displayType = "划转 积分->资产";
        displayCurrency = "USDT";
      }
    }

    return {
      id: tx.id,
      type: displayType,
      amount: Number(tx.amount).toFixed(2),
      currency: displayCurrency,
      time: tx.createdAt.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: statusMap[tx.status],
    };
  });

  const hasMore = skip + transactions.length < total;

  return {
    success: true,
    data: {
      transactions: transactionInfos,
      total,
      hasMore,
    },
  };
}

