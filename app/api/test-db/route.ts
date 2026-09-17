import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 测试各个表
    const [userCount, walletCount, monitorCount, depositCount] = await Promise.all([
      prisma.user.count(),
      prisma.wallet.count(),
      prisma.monitorState.count(),
      prisma.pendingDeposit.count(),
    ]);

    // 初始化 MonitorState
    const state = await prisma.monitorState.upsert({
      where: { network: "arbitrum-sepolia" },
      create: {
        network: "arbitrum-sepolia",
        lastProcessedBlock: 0n,
        lastProcessedHash: "",
        isRunning: false,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      message: "数据库连接成功！",
      tables: {
        User: userCount,
        Wallet: walletCount,
        MonitorState: monitorCount,
        PendingDeposit: depositCount,
      },
      monitorState: {
        network: state.network,
        lastProcessedBlock: state.lastProcessedBlock.toString(),
        isRunning: state.isRunning,
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
