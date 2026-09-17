"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { encryptSecret, decryptSecret, md5Hash } from "@/lib/crypto";
import { Wallet as EthersWallet } from "ethers";
import { getAddressCache } from "@/lib/deposit-monitor/AddressCache";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WalletInfo = {
  address: string;
  createdAt: string;
};

/**
 * 获取当前用户的钱包信息
 */
export async function getMyWalletAction(): Promise<ActionResult<WalletInfo | null>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      address: wallet.address,
      createdAt: wallet.createdAt.toISOString(),
    },
  };
}

/**
 * 为当前用户创建钱包（需要设置资金密码）
 */
export async function createWalletAction(fundPassword: string): Promise<ActionResult<WalletInfo>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  // 验证资金密码
  if (!fundPassword || fundPassword.length < 6) {
    return { success: false, error: "资金密码至少需要 6 位" };
  }

  // 检查用户是否已经有钱包
  const existingWallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (existingWallet) {
    return { success: false, error: "您已经有钱包了" };
  }

  try {
    // 生成新的以太坊钱包
    const ethersWallet = EthersWallet.createRandom();
    const address = ethersWallet.address;
    const privateKey = ethersWallet.privateKey;

    // 加密私钥
    const encryptedPrivateKey = encryptSecret(privateKey);

    // MD5 加密资金密码
    const hashedFundPassword = md5Hash(fundPassword);

    // 使用事务同时创建钱包和更新资金密码
    const wallet = await prisma.$transaction(async (tx) => {
      // 更新用户的资金密码
      await tx.user.update({
        where: { id: user.id },
        data: { fundPassword: hashedFundPassword },
      });

      // 创建钱包
      return tx.wallet.create({
        data: {
          userId: user.id,
          address,
          privateKey: encryptedPrivateKey,
        },
      });
    });

    // 🔥 动态订阅：将新地址添加到充值监听列表
    try {
      const addressCache = getAddressCache();
      addressCache.addAddress(address, user.id);
    } catch (error) {
      // 如果监听服务未启动，忽略错误（不影响钱包创建）
      console.warn("[Wallet] 动态订阅失败（监听服务可能未启动）:", error);
    }

    return {
      success: true,
      data: {
        address: wallet.address,
        createdAt: wallet.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("创建钱包失败:", error);
    return { success: false, error: "创建钱包失败" };
  }
}

/**
 * 获取当前用户的私钥（需要资金密码验证）
 * 注意：这个函数应该只在必要时调用，并且需要额外的安全验证
 */
export async function getPrivateKeyAction(
  fundPassword: string
): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }

  // 验证资金密码
  if (!user.fundPassword || user.fundPassword !== fundPassword) {
    return { success: false, error: "资金密码错误" };
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet) {
    return { success: false, error: "您还没有创建钱包" };
  }

  try {
    // 解密私钥
    const privateKey = decryptSecret(wallet.privateKey);
    return { success: true, data: privateKey };
  } catch (error) {
    console.error("解密私钥失败:", error);
    return { success: false, error: "解密私钥失败" };
  }
}
