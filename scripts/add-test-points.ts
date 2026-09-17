import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const phone = process.argv[2] || "11111111111";
  const points = parseFloat(process.argv[3] || "500");

  console.log(`\n查找手机号为 ${phone} 的用户...\n`);

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    console.log(`❌ 未找到手机号为 ${phone} 的用户`);
    return;
  }

  console.log(`📝 用户信息:`);
  console.log(`  - ID: ${user.id}`);
  console.log(`  - 用户名: ${user.userName}`);
  console.log(`  - 手机号: ${user.phone}`);
  console.log(`  - 当前积分: ${Number(user.pointsBalance).toFixed(0)}\n`);

  console.log(`💰 增加积分: ${points}\n`);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      pointsBalance: {
        increment: points,
      },
    },
  });

  console.log(`✅ 积分增加成功！\n`);
  console.log(`💼 更新后的用户资产:`);
  console.log(`  - 可用资产: ${Number(updatedUser.fundingBalance).toFixed(2)} USDT`);
  console.log(`  - 积分资产: ${Number(updatedUser.pointsBalance).toFixed(0)}`);
  console.log(`  - 今日盈亏: ${Number(updatedUser.todayProfitLoss).toFixed(2)} USDT\n`);
}

main()
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
