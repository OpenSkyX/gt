import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("开始创建模拟充值记录...\n");

  // 获取第一个用户（测试用）
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log("❌ 没有找到用户，请先创建用户");
    return;
  }

  console.log(`📝 用户信息:`);
  console.log(`  - ID: ${user.id}`);
  console.log(`  - 用户名: ${user.userName}`);
  console.log(`  - 手机号: ${user.phone}`);
  console.log(`  - 当前余额: ${Number(user.fundingBalance).toFixed(2)} USDT\n`);

  // 充值金额
  const depositAmount = 1000.00;

  console.log(`💰 充值金额: ${depositAmount} USDT\n`);

  // 使用事务确保数据一致性
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建充值记录
    const transaction = await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: depositAmount,
        currency: "USDT",
        address: "0x1234567890abcdef1234567890abcdef12345678", // 模拟地址
      },
    });

    // 2. 更新用户余额
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        fundingBalance: {
          increment: depositAmount,
        },
      },
    });

    return { transaction, updatedUser };
  });

  console.log(`✅ 充值成功！\n`);
  console.log(`📋 交易记录:`);
  console.log(`  - 交易ID: ${result.transaction.id}`);
  console.log(`  - 类型: ${result.transaction.type}`);
  console.log(`  - 状态: ${result.transaction.status}`);
  console.log(`  - 金额: ${Number(result.transaction.amount).toFixed(2)} ${result.transaction.currency}`);
  console.log(`  - 时间: ${result.transaction.createdAt.toLocaleString("zh-CN")}\n`);

  console.log(`💼 更新后的用户资产:`);
  console.log(`  - 可用资产: ${Number(result.updatedUser.fundingBalance).toFixed(2)} USDT`);
  console.log(`  - 积分资产: ${Number(result.updatedUser.pointsBalance).toFixed(0)}`);
  console.log(`  - 今日盈亏: ${Number(result.updatedUser.todayProfitLoss).toFixed(2)} USDT`);
}

main()
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
