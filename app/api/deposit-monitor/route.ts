import { NextResponse } from "next/server";
import { getMonitorStatus, startDepositMonitor, stopDepositMonitor } from "@/lib/deposit-monitor/service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/deposit-monitor
 * 获取监听服务状态
 */
export async function GET() {
  try {
    const status = getMonitorStatus();

    // 获取数据库中的状态
    const dbState = await prisma.monitorState.findUnique({
      where: { network: "arbitrum-sepolia" },
    });

    // 获取待确认充值统计
    const [pending, confirmed, credited] = await Promise.all([
      prisma.pendingDeposit.count({ where: { status: "PENDING" } }),
      prisma.pendingDeposit.count({ where: { status: "CONFIRMED" } }),
      prisma.pendingDeposit.count({ where: { status: "CREDITED" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        running: status.running,
        state: dbState ? {
          network: dbState.network,
          lastProcessedBlock: dbState.lastProcessedBlock.toString(),
          lastProcessedHash: dbState.lastProcessedHash,
          isRunning: dbState.isRunning,
          lastHeartbeat: dbState.lastHeartbeat.toISOString(),
          heartbeatAge: Date.now() - dbState.lastHeartbeat.getTime(),
        } : null,
        statistics: {
          pending,
          confirmed,
          credited,
          total: pending + confirmed + credited,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deposit-monitor
 * 管理监听服务（启动/停止）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      await startDepositMonitor();
      return NextResponse.json({
        success: true,
        message: "监听服务已启动",
      });
    } else if (action === "stop") {
      await stopDepositMonitor();
      return NextResponse.json({
        success: true,
        message: "监听服务已停止",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "无效的操作，支持: start, stop",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
