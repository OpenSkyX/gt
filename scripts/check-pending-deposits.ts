#!/usr/bin/env tsx
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const phone = process.argv[2] || "11111111111";

  const pending = await prisma.pendingDeposit.findMany({
    where: {
      user: { phone },
    },
    orderBy: { blockNumber: "desc" },
    select: {
      txHash: true,
      blockNumber: true,
      status: true,
      amount: true,
      confirmations: true,
    },
  });

  console.log(`用户 ${phone} 的待处理充值:\n`);
  if (pending.length === 0) {
    console.log("  无待处理充值");
  } else {
    console.log(`  共 ${pending.length} 笔\n`);
    pending.forEach((d, idx) => {
      console.log(`  ${idx + 1}. ${d.txHash.slice(0, 16)}...`);
      console.log(`     区块: ${d.blockNumber}`);
      console.log(`     状态: ${d.status}`);
      console.log(`     金额: ${d.amount} USDT`);
      console.log(`     确认数: ${d.confirmations}`);
      console.log();
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
