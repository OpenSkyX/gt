/**
 * Next.js Instrumentation
 * 在服务端应用启动时自动执行
 *
 * 用于启动充值监听服务、实盘数据同步等后台任务
 */

export async function register() {
  // 只在服务端运行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 1. 启动充值监听服务
    const { startDepositMonitor } = await import('./lib/deposit-monitor/service');
    startDepositMonitor().catch((error) => {
      console.error('[Instrumentation] 充值监听服务启动失败:', error);
    });
    console.log('[Instrumentation] 充值监听服务正在后台启动...');

    // 2. 启动实盘数据同步定时任务（每5分钟）
    const { syncQuantRuns } = await import('./scripts/sync-quant-runs');

    // 立即执行一次同步
    syncQuantRuns().catch((error) => {
      console.error('[Instrumentation] 实盘数据同步失败:', error);
    });

    // 设置定时任务（5分钟间隔）
    setInterval(() => {
      syncQuantRuns().catch((error) => {
        console.error('[Instrumentation] 实盘数据同步失败:', error);
      });
    }, 5 * 60 * 1000); // 5分钟

    console.log('[Instrumentation] 实盘数据同步定时任务已启动 (间隔: 5分钟)');
  }
}
