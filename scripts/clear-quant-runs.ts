/**
 * 清空实盘历史表
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";

async function clearQuantRuns() {
  console.log("🗑️  准备清空实盘历史表...\n");

  // 先查询有多少条记录
  const count = await prisma.quantRun.count();
  console.log(`当前有 ${count} 条实盘记录\n`);

  if (count === 0) {
    console.log("✅ 表已经是空的，无需清空");
    await prisma.$disconnect();
    return;
  }

  // 确认删除
  console.log("⚠️  即将删除所有实盘记录，按 Ctrl+C 取消，或等待 3 秒自动继续...\n");

  await new Promise(resolve => setTimeout(resolve, 3000));

  // 删除所有记录
  const result = await prisma.quantRun.deleteMany({});

  console.log(`✅ 成功删除 ${result.count} 条实盘记录\n`);

  await prisma.$disconnect();
}

clearQuantRuns().catch(console.error);
