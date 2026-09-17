/**
 * 定时同步实盘数据
 * 每5分钟查询所有运行中的实盘，更新收益数据
 */

import { prisma } from "../lib/prisma";
import { getXmxClient } from "../lib/xmx/client";

async function syncQuantRuns() {
  console.log(`\n[${new Date().toLocaleString()}] 开始同步实盘数据...`);

  try {
    // 1. 查询所有运行中的实盘
    const runningTrades = await prisma.quantRun.findMany({
      where: {
        status: "RUNNING",
        thirdPartyRunId: { not: null },
      },
      select: {
        id: true,
        thirdPartyRunId: true,
        userId: true,
        initialBalance: true, // 需要初始余额来计算当前余额
        strategy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (runningTrades.length === 0) {
      console.log("没有运行中的实盘，跳过同步");
      return;
    }

    console.log(`发现 ${runningTrades.length} 个运行中的实盘`);

    const xmx = getXmxClient();
    let successCount = 0;
    let failCount = 0;

    // 2. 逐个查询并更新
    for (const trade of runningTrades) {
      try {
        if (!trade.thirdPartyRunId) continue;

        // 查询第三方平台的实盘详情
        const result = await xmx.getRealTradeDetail(Number(trade.thirdPartyRunId));

        if (result.code !== 200 || !result.data) {
          console.error(
            `  ❌ 查询失败 [${trade.strategy.name}] (ID: ${trade.id}): ${result.message}`
          );
          failCount++;
          continue;
        }

        const detail = result.data;

        // 计算当前余额 = 初始余额 + 已实现盈利
        const currentBalance = Number(trade.initialBalance) + detail.profit;

        // 更新本地数据库
        await prisma.quantRun.update({
          where: { id: trade.id },
          data: {
            // 更新当前余额（初始余额 + 盈利）
            currentBalance: currentBalance,
            // 更新已实现盈利
            realizedProfit: detail.profit,
            // 更新时间
            updatedAt: new Date(),
          },
        });

        console.log(
          `  ✅ 更新成功 [${trade.strategy.name}] (ID: ${trade.id}) - 盈利: ${detail.profit.toFixed(2)}, 状态: ${detail.status}`
        );

        // 检查状态变化
        if (detail.status !== "RUNNING") {
          console.log(`  ⚠️  实盘状态已变更为: ${detail.status}，需要同步状态`);

          await prisma.quantRun.update({
            where: { id: trade.id },
            data: {
              status: detail.status === "STOPPED" ? "STOPPED" : "RUNNING",
              endedAt: detail.status === "STOPPED" ? new Date() : null,
              finalBalance: detail.status === "STOPPED" ? {
                set: await prisma.quantRun
                  .findUnique({ where: { id: trade.id } })
                  .then(r => r?.currentBalance || 0)
              } : undefined,
            },
          });
        }

        successCount++;

        // 避免请求过快，稍微延迟
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(
          `  ❌ 处理实盘失败 [${trade.strategy.name}] (ID: ${trade.id}):`,
          error
        );
        failCount++;
      }
    }

    console.log(
      `\n同步完成: 成功 ${successCount} 个, 失败 ${failCount} 个\n`
    );
  } catch (error) {
    console.error("同步实盘数据失败:", error);
  }
}

// 如果直接运行脚本，执行一次同步
if (require.main === module) {
  syncQuantRuns()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { syncQuantRuns };
