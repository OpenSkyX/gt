import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RiskLevel } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// 量化策略数据 - 来自 /quant 页面
const quantStrategies = [
  {
    id: "high-frequency",
    name: "高频策略",
    icon: "⚡",
    iconBg: "from-cyan-500 to-blue-600",
    description:
      "利用算法快速捕捉市场微小价格波动，通过高频率交易累积收益。适合追求短期高收益的投资者。",
    features: [
      "毫秒级交易执行",
      "智能价差捕捉",
      "自动风险控制",
      "实时市场监控",
    ],
    expectedReturn: "20-100%", // 预期月化收益
    riskLevel: RiskLevel.HIGH,
    minInvestment: 1000, // 起投金额 1000 USDT
    badge: "热门",
    thirdPartyStrategyId: "198", // XMX 平台高频策略ID
  },
  {
    id: "stable-fund",
    name: "稳健基金",
    icon: "🛡️",
    iconBg: "from-blue-400 to-cyan-500",
    description:
      "专注于低风险、稳定回报的投资组合，通过分散配置降低波动。适合风险厌恶型和长期投资者。",
    features: [
      "分散投资组合",
      "严格风控体系",
      "定期再平衡",
      "专业资产配置",
    ],
    expectedReturn: "2%", // 预期月化收益
    riskLevel: RiskLevel.LOW,
    minInvestment: 500, // 起投金额 500 USDT
    badge: "推荐",
    thirdPartyStrategyId: "198", // XMX 平台策略ID（与高频策略相同）
  },
];

async function main() {
  console.log("开始填充量化策略数据...");

  for (const strategy of quantStrategies) {
    const result = await prisma.quantStrategy.upsert({
      where: { id: strategy.id },
      update: {
        name: strategy.name,
        icon: strategy.icon,
        iconBg: strategy.iconBg,
        description: strategy.description,
        features: strategy.features,
        expectedReturn: strategy.expectedReturn,
        riskLevel: strategy.riskLevel,
        minInvestment: strategy.minInvestment,
        badge: strategy.badge,
        thirdPartyStrategyId: strategy.thirdPartyStrategyId,
      },
      create: strategy,
    });
    console.log(`✓ ${result.name} (${result.thirdPartyStrategyId})`);
  }

  console.log(`\n已成功同步 ${quantStrategies.length} 条量化策略数据！`);
}

main()
  .catch((error) => {
    console.error("错误:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
