#!/usr/bin/env tsx

import { BlockMonitor } from "@/lib/deposit-monitor/BlockMonitor";

/**
 * 充值监听服务入口
 *
 * 使用方法:
 * npm run deposit-monitor
 *
 * 或使用 PM2:
 * pm2 start scripts/deposit-monitor.ts --name deposit-monitor --interpreter tsx
 */

let monitor: BlockMonitor | null = null;

async function main() {
  try {
    // 创建监听器实例
    monitor = new BlockMonitor();

    // 启动服务
    await monitor.start();

    console.log("\n💡 提示: 按 Ctrl+C 停止服务\n");
  } catch (error) {
    console.error("启动失败:", error);
    process.exit(1);
  }
}

// 优雅退出
async function gracefulShutdown(signal: string) {
  console.log(`\n收到 ${signal} 信号，正在优雅退出...`);

  if (monitor) {
    await monitor.stop();
  }

  process.exit(0);
}

// 监听退出信号
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// 监听未捕获的错误
process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("未捕获的异常:", error);
  process.exit(1);
});

// 启动
main();
