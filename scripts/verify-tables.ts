#!/usr/bin/env tsx

import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🔍 验证数据库表...\n");

  try {
    // 检查 MonitorState 表
    const monitorCount = await prisma.monitorState.count();
    console.log("✅ MonitorState 表存在");
    console.log(`   记录数: ${monitorCount}`);

    // 检查 PendingDeposit 表
    const depositCount = await prisma.pendingDeposit.count();
    console.log("✅ PendingDeposit 表存在");
    console.log(`   记录数: ${depositCount}`);

    // 检查其他关键表
    const userCount = await prisma.user.count();
    const walletCount = await prisma.wallet.count();

    console.log("\n📊 数据统计:");
    console.log(`   用户数: ${userCount}`);
    console.log(`   钱包数: ${walletCount}`);

    console.log("\n✅ 所有表结构验证通过！");
  } catch (error) {
    console.error("❌ 验证失败:", error);
    process.exit(1);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
