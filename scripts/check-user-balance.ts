import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("查询所有用户资产信息...\n");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      userName: true,
      phone: true,
      fundingBalance: true,
      pointsBalance: true,
      todayProfitLoss: true,
    },
  });

  console.log(`找到 ${users.length} 个用户：\n`);

  users.forEach((user, index) => {
    console.log(`用户 ${index + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  用户名: ${user.userName}`);
    console.log(`  手机号: ${user.phone}`);
    console.log(`  可用资产: ${Number(user.fundingBalance).toFixed(2)} USDT`);
    console.log(`  积分资产: ${Number(user.pointsBalance).toFixed(0)}`);
    console.log(`  今日盈亏: ${Number(user.todayProfitLoss).toFixed(2)} USDT\n`);
  });

  // 查询充值记录
  console.log("查询充值记录...\n");
  const transactions = await prisma.transaction.findMany({
    where: { type: "DEPOSIT" },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`找到 ${transactions.length} 条充值记录：\n`);

  transactions.forEach((tx, index) => {
    console.log(`充值记录 ${index + 1}:`);
    console.log(`  交易ID: ${tx.id}`);
    console.log(`  用户ID: ${tx.userId}`);
    console.log(`  金额: ${Number(tx.amount).toFixed(2)} ${tx.currency}`);
    console.log(`  状态: ${tx.status}`);
    console.log(`  时间: ${tx.createdAt.toLocaleString("zh-CN")}\n`);
  });
}

main()
  .catch((error) => {
    console.error("错误:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
