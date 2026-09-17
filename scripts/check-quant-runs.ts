// 使用项目配置的 Prisma Client 路径
const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  // 查询所有运行中的实盘
  const runningTrades = await prisma.quantRun.findMany({
    where: {
      status: "RUNNING",
    },
    include: {
      user: {
        select: {
          userName: true,
          phone: true,
        },
      },
      strategy: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`\n总共有 ${runningTrades.length} 个运行中的实盘：\n`);

  let totalLocked = 0;

  runningTrades.forEach((trade, index) => {
    const locked = Number(trade.initialBalance);
    totalLocked += locked;

    console.log(`${index + 1}. ${trade.user.userName} - ${trade.strategy.name}`);
    console.log(`   ID: ${trade.id}`);
    console.log(`   保证金: ${locked}`);
    console.log(`   启动时间: ${trade.startedAt.toLocaleString()}`);
    console.log("");
  });

  console.log(`总锁定保证金: ${totalLocked}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
