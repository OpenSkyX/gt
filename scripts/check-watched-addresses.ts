#!/usr/bin/env tsx
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("📋 检查监听地址列表\n");

  const wallets = await prisma.wallet.findMany({
    select: {
      address: true,
      userId: true,
      user: {
        select: {
          phone: true,
        },
      },
    },
  });

  console.log(`✅ 共有 ${wallets.length} 个钱包地址\n`);

  if (wallets.length === 0) {
    console.log("⚠️  没有任何钱包地址！");
    console.log("请先创建钱包：访问 /profile 页面");
  } else {
    console.log("监听地址列表:");
    wallets.forEach((wallet, idx) => {
      console.log(
        `  ${idx + 1}. ${wallet.address} (用户: ${wallet.user.phone})`
      );
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
