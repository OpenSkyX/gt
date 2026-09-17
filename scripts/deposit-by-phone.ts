import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 从命令行参数获取手机号和金额
  const phone = process.argv[2] || "11111111111"; // 默认第一个用户
  const amount = parseFloat(process.argv[3] || "1000");

  console.log(`\n查找手机号为 ${phone} 的用户...\n`);

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    console.log(`❌ 未找到手机号为 ${phone} 的用户`);
    console.log("\n可用用户列表:");
    const allUsers = await prisma.user.findMany({
      select: { phone: true, userName: true },
    });
    allUsers.forEach((u) => {
      console.log(`  - ${u.phone} (${u.userName})`);
    });
    return;
  }

  console.log(`📝 用户信息:`);
  console.log(`  - ID: ${user.id}`);
  console.log(`  - 用户名: ${user.userName}`);
  console.log(`  - 手机号: ${user.phone}`);
  console.log(`  - 当前余额: ${Number(user.fundingBalance).toFixed(2)} USDT\n`);

  console.log(`💰 充值金额: ${amount} USDT\n`);

  // 使用事务
  const result = await prisma.$transaction(async (tx) => {
    // 创建充值记录
    const transaction = await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount,
        currency: "USDT",
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
    });

    // 更新用户余额
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        fundingBalance: {
          increment: amount,
        },
      },
    });

    return { transaction, updatedUser };
  });

  console.log(`✅ 充值成功！\n`);
  console.log(`📋 交易记录:`);
  console.log(`  - 交易ID: ${result.transaction.id}`);
  console.log(`  - 金额: ${Number(result.transaction.amount).toFixed(2)} USDT`);
  console.log(`  - 时间: ${result.transaction.createdAt.toLocaleString("zh-CN")}\n`);

  console.log(`💼 更新后的用户资产:`);
  console.log(`  - 可用资产: ${Number(result.updatedUser.fundingBalance).toFixed(2)} USDT`);
  console.log(`  - 积分资产: ${Number(result.updatedUser.pointsBalance).toFixed(0)}`);
  console.log(`  - 今日盈亏: ${Number(result.updatedUser.todayProfitLoss).toFixed(2)} USDT\n`);
}

main()
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
