import "server-only";

import { BlockMonitor } from "./BlockMonitorDual";
import { validateConfig } from "./config";

/**
 * 充值监听服务管理器
 * 确保服务只启动一次（单例模式）
 */

let monitorInstance: BlockMonitor | null = null;
let isStarting = false;

/**
 * 启动充值监听服务
 * 自动随 Next.js 应用启动
 */
export async function startDepositMonitor(): Promise<void> {
  // 防止重复启动
  if (monitorInstance || isStarting) {
    console.log("[DepositMonitor] 服务已在运行或正在启动中，跳过");
    return;
  }

  isStarting = true;

  try {
    // 验证配置
    const validation = validateConfig();
    if (!validation.valid) {
      console.warn("[DepositMonitor] 配置不完整，服务未启动:");
      validation.errors.forEach((error) => {
        console.warn(`  - ${error}`);
      });
      console.warn("[DepositMonitor] 请检查 .env 文件中的配置");
      isStarting = false;
      return;
    }

    // 创建并启动监听器
    console.log("[DepositMonitor] 正在启动充值监听服务...");
    monitorInstance = new BlockMonitor();
    await monitorInstance.start();

    console.log("[DepositMonitor] ✅ 充值监听服务已启动");
  } catch (error) {
    console.error("[DepositMonitor] ❌ 启动失败:", error);
    monitorInstance = null;
  } finally {
    isStarting = false;
  }
}

/**
 * 停止充值监听服务
 */
export async function stopDepositMonitor(): Promise<void> {
  if (monitorInstance) {
    console.log("[DepositMonitor] 正在停止服务...");
    await monitorInstance.stop();
    monitorInstance = null;
    console.log("[DepositMonitor] ✅ 服务已停止");
  }
}

/**
 * 获取服务状态
 */
export function getMonitorStatus(): {
  running: boolean;
  instance: BlockMonitor | null;
} {
  return {
    running: monitorInstance !== null,
    instance: monitorInstance,
  };
}

/**
 * 优雅退出处理
 */
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    console.log("[DepositMonitor] 收到 SIGTERM 信号");
    await stopDepositMonitor();
  });

  process.on("SIGINT", async () => {
    console.log("[DepositMonitor] 收到 SIGINT 信号");
    await stopDepositMonitor();
  });
}
