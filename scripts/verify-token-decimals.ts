#!/usr/bin/env tsx

import "dotenv/config";
import { ethers } from "ethers";

/**
 * 验证代币精度配置
 * 对比链上精度和配置文件中的精度
 */

// 直接从环境变量读取配置（避免 server-only 问题）
const CONFIG = {
  RPC_URL: process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
  USDT_ADDRESS: (process.env.USDT_CONTRACT_ADDRESS || "").toLowerCase(),
  USDT_DECIMALS: parseInt(process.env.USDT_DECIMALS || "6", 10),
};

async function main() {
  console.log("🔍 验证代币精度配置...\n");

  // 1. 显示当前配置
  console.log("📋 当前配置:");
  console.log(`   RPC URL: ${CONFIG.RPC_URL}`);
  console.log(`   合约地址: ${CONFIG.USDT_ADDRESS}`);
  console.log(`   配置精度: ${CONFIG.USDT_DECIMALS} 位小数`);
  console.log();

  // 2. 验证配置
  if (!CONFIG.RPC_URL) {
    console.error("❌ ARBITRUM_SEPOLIA_RPC_URL 未配置");
    process.exit(1);
  }

  if (!CONFIG.USDT_ADDRESS || CONFIG.USDT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ USDT_CONTRACT_ADDRESS 未配置或无效");
    process.exit(1);
  }

  // 3. 连接到区块链
  console.log("🔗 正在连接区块链...");
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log(`✅ 已连接到网络: ${network.name} (ChainID: ${network.chainId})`);
    console.log();
  } catch (error: any) {
    console.error("❌ 连接失败:", error.message);
    process.exit(1);
  }

  // 4. 查询链上精度
  console.log("🔍 查询链上代币精度...");

  try {
    // 创建合约实例（只需要 decimals 方法）
    const contract = new ethers.Contract(
      CONFIG.USDT_ADDRESS,
      [
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
      ],
      provider
    );

    // 查询代币信息
    const [decimals, symbol, name] = await Promise.all([
      contract.decimals(),
      contract.symbol().catch(() => "Unknown"),
      contract.name().catch(() => "Unknown"),
    ]);

    console.log("✅ 代币信息:");
    console.log(`   名称: ${name}`);
    console.log(`   符号: ${symbol}`);
    console.log(`   链上精度: ${decimals} 位小数`);
    console.log();

    // 5. 对比验证
    console.log("🔍 验证结果:");
    const onChainDecimals = Number(decimals);
    const configDecimals = CONFIG.USDT_DECIMALS;

    if (onChainDecimals === configDecimals) {
      console.log("   ✅ 配置正确！链上精度与配置精度一致");

      // 显示示例
      console.log();
      console.log("💡 金额解析示例:");
      const exampleValue = BigInt("1000000000000000000"); // 1 * 10^18
      const parsed = ethers.formatUnits(exampleValue, configDecimals);
      console.log(`   原始值: ${exampleValue}`);
      console.log(`   解析后: ${parsed} ${symbol}`);
    } else {
      console.log("   ❌ 配置错误！精度不匹配");
      console.log();
      console.log("⚠️  请更新 .env 文件:");
      console.log(`   USDT_DECIMALS="${onChainDecimals}"`);
      console.log();
      console.log("💡 常见代币精度:");
      console.log("   USDT/USDC: 6 位");
      console.log("   DAI/WETH:  18 位");
      console.log("   WBTC:      8 位");

      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ 查询失败:", error.message);
    console.log();
    console.log("可能的原因:");
    console.log("  1. 合约地址错误");
    console.log("  2. 该合约不是 ERC20 代币");
    console.log("  3. RPC 节点问题");
    process.exit(1);
  }

  console.log();
  console.log("🎉 验证完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
