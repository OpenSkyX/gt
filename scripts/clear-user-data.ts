#!/usr/bin/env tsx

import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * 清空指定用户的余额和记录
 */

const PHONE_NUMBER = "11111111111";

async function main() {
  console.log(`🔍 查找手机号为 ${PHONE_NUMBER} 的用户...\n`);

  // 1. 查找用户
  const user = await prisma.user.findUnique({
    where: { phone: PHONE_NUMBER },
    include: {
      transactions: true,
      pendingDeposits: true,
    },
  });

  if (!user) {
    console.log(`❌ 未找到手机号为 ${PHONE_NUMBER} 的用户`);
    process.exit(1);
  }

  console.log(`✅ 找到用户:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   用户名: ${user.userName}`);
  console.log(`   资金余额: ${user.fundingBalance} USDT`);
  console.log(`   积分余额: ${user.pointsBalance}`);
  console.log(`   交易记录: ${user.transactions.length} 条`);
  console.log(`   待确认充值: ${user.pendingDeposits.length} 条`);
  console.log();

  // 2. 确认操作
  console.log(`⚠️  即将执行以下操作:`);
  console.log(`   1. 清空资金余额（设为 0）`);
  console.log(`   2. 清空积分余额（设为 0）`);
  console.log(`   3. 删除所有交易记录 (${user.transactions.length} 条)`);
  console.log(`   4. 删除所有待确认充值 (${user.pendingDeposits.length} 条)`);
  console.log();

  // 3. 执行清空操作
  console.log(`🚀 开始清空操作...\n`);

  await prisma.$transaction(async (tx) => {
    // 3.1 删除交易记录
    const deletedTransactions = await tx.transaction.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ 已删除 ${deletedTransactions.count} 条交易记录`);

    // 3.2 删除待确认充值
    const deletedDeposits = await tx.pendingDeposit.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ 已删除 ${deletedDeposits.count} 条待确认充值记录`);

    // 3.3 清空余额
    await tx.user.update({
      where: { id: user.id },
      data: {
        fundingBalance: 0,
        pointsBalance: 0,
        todayProfitLoss: 0,
      },
    });
    console.log(`✅ 已清空资金余额和积分余额`);
  });

  console.log();
  console.log(`🎉 清空完成！`);
  console.log();

  // 4. 验证结果
  const updatedUser = await prisma.user.findUnique({
    where: { phone: PHONE_NUMBER },
    include: {
      transactions: true,
      pendingDeposits: true,
    },
  });

  if (updatedUser) {
    console.log(`📊 验证结果:`);
    console.log(`   资金余额: ${updatedUser.fundingBalance} USDT`);
    console.log(`   积分余额: ${updatedUser.pointsBalance}`);
    console.log(`   今日盈亏: ${updatedUser.todayProfitLoss}`);
    console.log(`   交易记录: ${updatedUser.transactions.length} 条`);
    console.log(`   待确认充值: ${updatedUser.pendingDeposits.length} 条`);
  }
}

main()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 错误:", error);
    prisma.$disconnect();
    process.exit(1);
  });
