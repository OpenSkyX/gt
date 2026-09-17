#!/usr/bin/env tsx

import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🔍 验证数据库表结构...\n");

  try {
    // 测试各个表
    const userCount = await prisma.user.count();
    const walletCount = await prisma.wallet.count();
    const monitorCount = await prisma.monitorState.count();
    const depositCount = await prisma.pendingDeposit.count();

    console.log("✅ 数据库表验证成功！\n");
    console.log("📊 当前数据统计:");
    console.log(`   User:            ${userCount} 条记录`);
    console.log(`   Wallet:          ${walletCount} 条记录`);
    console.log(`   MonitorState:    ${monitorCount} 条记录`);
    console.log(`   PendingDeposit:  ${depositCount} 条记录`);

    // 初始化 MonitorState（如果不存在）
    const state = await prisma.monitorState.upsert({
      where: { network: "arbitrum-sepolia" },
      create: {
        network: "arbitrum-sepolia",
        lastProcessedBlock: 0n,
        lastProcessedHash: "",
        isRunning: false,
      },
      update: {},
    });

    console.log("\n✅ MonitorState 已初始化:");
    console.log(`   网络: ${state.network}`);
    console.log(`   最后处理区块: ${state.lastProcessedBlock}`);
    console.log(`   运行状态: ${state.isRunning ? "运行中" : "已停止"}`);

    console.log("\n🎉 数据库准备就绪！可以启动监听服务了。");
  } catch (error) {
    console.error("\n❌ 验证失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
