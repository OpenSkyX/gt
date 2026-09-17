#!/usr/bin/env tsx

/**
 * 测试数据库连接和表结构
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

async function main() {
  console.log("🔍 测试数据库连接...\n");

  // 使用与应用相同的方式初始化
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // 测试基本连接
    await prisma.$connect();
    console.log("✅ 数据库连接成功");

    // 测试各个表
    const tables = [
      { name: "User", model: prisma.user },
      { name: "Wallet", model: prisma.wallet },
      { name: "MonitorState", model: prisma.monitorState },
      { name: "PendingDeposit", model: prisma.pendingDeposit },
    ];

    console.log("\n📊 表验证:");
    for (const table of tables) {
      try {
        const count = await table.model.count();
        console.log(`✅ ${table.name.padEnd(15)} 存在 (${count} 条记录)`);
      } catch (error: any) {
        console.log(`❌ ${table.name.padEnd(15)} 错误: ${error.message}`);
      }
    }

    // 测试创建 MonitorState
    console.log("\n🧪 测试创建监听状态记录...");
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
    console.log("✅ MonitorState 记录:", {
      network: state.network,
      lastProcessedBlock: state.lastProcessedBlock.toString(),
      isRunning: state.isRunning,
    });

    console.log("\n✅ 所有测试通过！数据库已准备就绪。");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
