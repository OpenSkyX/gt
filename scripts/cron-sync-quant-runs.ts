/**
 * 定时任务调度器 - 每5分钟同步实盘数据
 *
 * 运行方式:
 *   npm run cron:sync-quant-runs
 *
 * 或在生产环境使用 PM2:
 *   pm2 start scripts/cron-sync-quant-runs.ts --name quant-sync
 */

import { syncQuantRuns } from "./sync-quant-runs";

const INTERVAL_MS = 5 * 60 * 1000; // 5分钟

async function runScheduler() {
  console.log("🚀 启动实盘数据同步定时任务");
  console.log(`⏰ 同步间隔: ${INTERVAL_MS / 1000 / 60} 分钟\n`);

  // 立即执行一次
  await syncQuantRuns();

  // 设置定时任务
  setInterval(async () => {
    await syncQuantRuns();
  }, INTERVAL_MS);
}

// 优雅退出
process.on("SIGINT", () => {
  console.log("\n\n👋 收到退出信号，停止定时任务...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 收到退出信号，停止定时任务...");
  process.exit(0);
});

// 启动调度器
runScheduler().catch((error) => {
  console.error("定时任务启动失败:", error);
  process.exit(1);
});
