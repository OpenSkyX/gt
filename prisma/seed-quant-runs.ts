import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, QuantRunStatus } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("开始创建模拟实盘数据...");

  // 1. 查找手机号为 11111111111 的用户
  const user = await prisma.user.findUnique({
    where: { phone: "11111111111" },
  });

  if (!user) {
    console.error("❌ 用户 11111111111 不存在");
    return;
  }

  console.log("✓ 找到用户:", user.userName, `(${user.id})`);

  // 2. 查找高频策略
  const strategy = await prisma.quantStrategy.findUnique({
    where: { id: "high-frequency" },
  });

  if (!strategy) {
    console.error("❌ 高频策略不存在");
    return;
  }

  console.log("✓ 找到策略:", strategy.name, `(${strategy.id})`);

  // 3. 创建两条模拟实盘记录
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // 实盘1：已停止，盈利
  const run1 = await prisma.quantRun.upsert({
    where: { id: "test-run-1" },
    update: {
      userId: user.id,
      strategyId: strategy.id,
      thirdPartyRunId: "XMX_RUN_001",
      thirdPartyStrategyId: strategy.thirdPartyStrategyId || "198",
      status: QuantRunStatus.STOPPED,
      initialBalance: 10000,
      currentBalance: 0, // 已停止，当前余额为0
      finalBalance: 11500, // 结束时盈利15%
      realizedProfit: 1500,
      maxDrawdown: 8,
      startedAt: twoDaysAgo,
      endedAt: yesterday,
    },
    create: {
      id: "test-run-1",
      userId: user.id,
      strategyId: strategy.id,
      thirdPartyRunId: "XMX_RUN_001",
      thirdPartyStrategyId: strategy.thirdPartyStrategyId || "198",
      status: QuantRunStatus.STOPPED,
      initialBalance: 10000,
      currentBalance: 0,
      finalBalance: 11500,
      realizedProfit: 1500,
      maxDrawdown: 8,
      startedAt: twoDaysAgo,
      endedAt: yesterday,
    },
  });

  console.log("✓ 创建实盘1:", run1.id, `(已停止，盈利 +${run1.realizedProfit} USDT)`);

  // 实盘2：运行中，当前盈利
  const run2 = await prisma.quantRun.upsert({
    where: { id: "test-run-2" },
    update: {
      userId: user.id,
      strategyId: strategy.id,
      thirdPartyRunId: "XMX_RUN_002",
      thirdPartyStrategyId: strategy.thirdPartyStrategyId || "198",
      status: QuantRunStatus.RUNNING,
      initialBalance: 20000,
      currentBalance: 22400, // 当前盈利12%
      finalBalance: null, // 运行中，无结束余额
      realizedProfit: 2400,
      maxDrawdown: 5,
      startedAt: yesterday,
      endedAt: null, // 运行中
    },
    create: {
      id: "test-run-2",
      userId: user.id,
      strategyId: strategy.id,
      thirdPartyRunId: "XMX_RUN_002",
      thirdPartyStrategyId: strategy.thirdPartyStrategyId || "198",
      status: QuantRunStatus.RUNNING,
      initialBalance: 20000,
      currentBalance: 22400,
      finalBalance: null,
      realizedProfit: 2400,
      maxDrawdown: 5,
      startedAt: yesterday,
      endedAt: null,
    },
  });

  console.log("✓ 创建实盘2:", run2.id, `(运行中，盈利 +${run2.realizedProfit} USDT)`);

  console.log("\n✅ 成功创建 2 条模拟实盘数据！");
  console.log("\n📊 数据摘要:");
  console.log(`  用户: ${user.userName} (${user.phone})`);
  console.log(`  策略: ${strategy.name}`);
  console.log(`  实盘1: ${run1.startedAt.toLocaleDateString()} - ${run1.endedAt?.toLocaleDateString()} (已停止，盈利 +15%)`);
  console.log(`  实盘2: ${run2.startedAt.toLocaleDateString()} - 运行中 (盈利 +12%)`);
}

main()
  .catch((error) => {
    console.error("错误:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
