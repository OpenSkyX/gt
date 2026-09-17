import { prisma } from "../lib/prisma";

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

  runningTrades.forEach((trade: any, index: number) => {
    const locked = Number(trade.initialBalance);
    totalLocked += locked;

    console.log(`${index + 1}. ${trade.user.userName} - ${trade.strategy.name}`);
    console.log(`   ID: ${trade.id}`);
    console.log(`   保证金: ${locked}`);
    console.log(`   启动时间: ${trade.startedAt.toLocaleString()}`);
    console.log("");
  });

  console.log(`总锁定保证金: ${totalLocked}\n`);
}

main().catch(console.error);
