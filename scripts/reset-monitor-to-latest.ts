#!/usr/bin/env tsx

import "dotenv/config";
import { ethers } from "ethers";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * 将监听服务重置到最新区块
 * 放弃追赶历史区块，从当前开始监听
 */

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "";

async function main() {
  console.log("🔄 重置监听服务到最新区块...\n");

  if (!RPC_URL) {
    console.error("❌ ARBITRUM_SEPOLIA_RPC_URL 未配置");
    process.exit(1);
  }

  // 连接区块链
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const latestBlock = await provider.getBlockNumber();
  const block = await provider.getBlock(latestBlock);

  console.log(`📊 当前最新区块: ${latestBlock}`);
  console.log(`   区块哈希: ${block?.hash || "N/A"}`);
  console.log();

  // 连接数据库
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 查询当前状态
    const currentState = await prisma.monitorState.findUnique({
      where: { network: "arbitrum-sepolia" },
    });

    if (currentState) {
      const behind = latestBlock - Number(currentState.lastProcessedBlock);
      console.log(`📊 当前监听状态:`);
      console.log(`   最后处理区块: ${currentState.lastProcessedBlock}`);
      console.log(`   落后: ${behind} 个区块`);
      console.log();
    }

    // 确认操作
    console.log(`⚠️  即将执行:`);
    console.log(`   将 lastProcessedBlock 更新为: ${latestBlock}`);
    console.log(`   将 lastProcessedHash 更新为: ${block?.hash || ""}`);
    console.log(`   放弃追赶历史区块，从最新区块开始监听`);
    console.log();

    // 更新状态
    await prisma.monitorState.upsert({
      where: { network: "arbitrum-sepolia" },
      create: {
        network: "arbitrum-sepolia",
        lastProcessedBlock: BigInt(latestBlock),
        lastProcessedHash: block?.hash || "",
        isRunning: false,
      },
      update: {
        lastProcessedBlock: BigInt(latestBlock),
        lastProcessedHash: block?.hash || "",
      },
    });

    console.log(`✅ 已重置到最新区块: ${latestBlock}`);
    console.log();
    console.log(`💡 提示:`);
    console.log(`   1. 重启监听服务: npm run dev`);
    console.log(`   2. 服务将从最新区块开始监听新充值`);
    console.log(`   3. 历史充值将不会被处理`);
  } catch (error) {
    console.error("❌ 错误:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
