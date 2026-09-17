#!/usr/bin/env tsx
import "dotenv/config";
import { ethers } from "ethers";

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL!;
const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS!;

async function main() {
  const txHash = process.argv[2];
  if (!txHash) {
    console.error("❌ 请提供交易哈希");
    console.error("用法: npx tsx scripts/debug-transaction.ts 0x...");
    process.exit(1);
  }

  console.log("🔍 调试交易信息\n");
  console.log(`交易哈希: ${txHash}\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    // 获取交易详情
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      console.error("❌ 交易不存在");
      process.exit(1);
    }

    // 获取交易回执
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      console.error("❌ 交易未确认");
      process.exit(1);
    }

    console.log("📋 交易基本信息:");
    console.log(`  From: ${tx.from}`);
    console.log(`  To: ${tx.to || "合约创建"}`);
    console.log(`  Value: ${ethers.formatEther(tx.value)} ETH`);
    console.log(`  区块号: ${receipt.blockNumber}`);
    console.log(`  状态: ${receipt.status === 1 ? "✅ 成功" : "❌ 失败"}`);
    console.log();

    // 检查是否是 ETH 转账
    if (tx.value > 0n) {
      console.log("💰 这是一笔 ETH 转账:");
      console.log(`  金额: ${ethers.formatEther(tx.value)} ETH`);
      console.log(`  接收地址: ${tx.to}`);
      console.log();
    }

    // 检查日志（ERC20 转账事件）
    console.log(`📝 事件日志 (共 ${receipt.logs.length} 条):\n`);

    if (receipt.logs.length === 0) {
      console.log("  ⚠️  没有事件日志（可能是纯 ETH 转账）");
    } else {
      const transferEventSignature =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

      receipt.logs.forEach((log, idx) => {
        console.log(`  日志 ${idx + 1}:`);
        console.log(`    合约地址: ${log.address}`);
        console.log(`    Topics[0]: ${log.topics[0]}`);

        // 检查是否是 Transfer 事件
        if (log.topics[0] === transferEventSignature) {
          console.log(`    类型: Transfer 事件 ✅`);

          // 解析 from 和 to
          if (log.topics.length >= 3) {
            const from = "0x" + log.topics[1].slice(26);
            const to = "0x" + log.topics[2].slice(26);
            const value = BigInt(log.data);

            console.log(`    From: ${from}`);
            console.log(`    To: ${to}`);
            console.log(`    原始值: ${value.toString()}`);

            // 尝试不同的精度
            console.log(`    如果是 6 位精度: ${ethers.formatUnits(value, 6)}`);
            console.log(`    如果是 18 位精度: ${ethers.formatUnits(value, 18)}`);

            // 检查是否是监听的合约
            if (log.address.toLowerCase() === USDT_CONTRACT.toLowerCase()) {
              console.log(`    ✅ 这是我们监听的 USDT 合约！`);
            } else {
              console.log(
                `    ⚠️  这不是我们监听的合约 (监听: ${USDT_CONTRACT})`
              );
            }
          }
        }
        console.log();
      });
    }

    // 获取当前区块
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    console.log(`📊 确认状态:`);
    console.log(`  当前区块: ${currentBlock}`);
    console.log(`  交易区块: ${receipt.blockNumber}`);
    console.log(`  确认数: ${confirmations}`);
    console.log(
      `  是否满足 6 个确认: ${confirmations >= 6 ? "✅ 是" : "❌ 否"}`
    );
  } catch (error) {
    console.error("❌ 查询失败:", error);
    process.exit(1);
  }
}

main();
