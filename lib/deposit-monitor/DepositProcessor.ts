import "server-only";

import { prisma } from "@/lib/prisma";
import { MONITOR_CONFIG } from "./config";
import type { DepositEvent } from "./TransactionFilter";
import type { PendingDeposit } from "@/app/generated/prisma/client";

/**
 * 充值处理器
 * 处理充值的确认和入账逻辑
 */
export class DepositProcessor {
  private isUpdatingConfirmations: boolean = false; // 更新确认数的锁
  /**
   * 处理新发现的充值（创建待确认记录）
   */
  async processNewDeposit(deposit: DepositEvent): Promise<void> {
    try {
      // 幂等性检查：txHash 唯一约束
      const existing = await prisma.pendingDeposit.findUnique({
        where: { txHash: deposit.txHash },
      });

      if (existing) {
        // 已处理过，跳过
        return;
      }

      // 创建待确认记录
      await prisma.pendingDeposit.create({
        data: {
          txHash: deposit.txHash,
          blockNumber: BigInt(deposit.blockNumber),
          blockHash: deposit.blockHash,
          timestamp: deposit.timestamp, // 区块时间戳
          fromAddress: deposit.fromAddress,
          toAddress: deposit.toAddress,
          amount: deposit.amount,
          tokenAddress: deposit.tokenAddress,
          confirmations: 0,
          status: "PENDING",
          userId: deposit.userId,
        },
      });

      const currency = deposit.tokenAddress ? "USDT" : "ETH";
      console.log(
        `[Processor] 新充值: ${deposit.amount} ${currency} -> ${deposit.toAddress.slice(0, 8)}... (${deposit.txHash.slice(0, 10)}...)`
      );
    } catch (error) {
      // 如果是唯一约束冲突，忽略（幂等性保证）
      if ((error as any).code === "P2002") {
        return;
      }
      console.error("[Processor] 处理新充值失败:", error);
      throw error;
    }
  }

  /**
   * 更新待确认充值的确认数
   * 并在达到确认数时入账
   */
  async updateConfirmations(currentBlock: number): Promise<void> {
    // ✅ 简单锁机制：同一时间只允许一个线程执行
    if (this.isUpdatingConfirmations) {
      return; // 如果正在更新，跳过本次调用
    }

    this.isUpdatingConfirmations = true;

    try {
      // 获取所有待确认的充值
      const pending = await prisma.pendingDeposit.findMany({
        where: {
          status: "PENDING",
        },
      });

      if (pending.length === 0) {
        return;
      }

      console.log(`[Processor] 更新 ${pending.length} 笔待确认充值的确认数`);

      for (const deposit of pending) {
        const confirmations = currentBlock - Number(deposit.blockNumber) + 1;

        if (confirmations >= MONITOR_CONFIG.REQUIRED_CONFIRMATIONS) {
          // 达到确认数，入账
          await this.creditDeposit(deposit);
        } else {
          // 更新确认数
          await prisma.pendingDeposit.update({
            where: { id: deposit.id },
            data: { confirmations },
          });
        }
      }
    } catch (error) {
      console.error("[Processor] 更新确认数失败:", error);
      throw error;
    } finally {
      // ✅ 释放锁
      this.isUpdatingConfirmations = false;
    }
  }

  /**
   * 充值入账（事务）
   */
  private async creditDeposit(deposit: PendingDeposit): Promise<void> {
    try {
      // ✅ 幂等性检查：如果已经入账，跳过
      if (deposit.status === "CREDITED") {
        return;
      }

      await prisma.$transaction(async (tx) => {
        // ✅ 在事务内部检查交易记录是否已存在（防止竞态条件）
        const existingTx = await tx.transaction.findUnique({
          where: { txHash: deposit.txHash },
        });

        if (existingTx) {
          // 交易已存在，只更新充值状态
          await tx.pendingDeposit.update({
            where: { id: deposit.id },
            data: { status: "CREDITED" },
          });
          return;
        }

        // 1. 更新用户余额
        await tx.user.update({
          where: { id: deposit.userId },
          data: {
            fundingBalance: {
              increment: deposit.amount,
            },
          },
        });

        // 2. 创建交易记录（包含完整的区块链信息）
        const currency = deposit.tokenAddress ? "USDT" : "ETH";
        await tx.transaction.create({
          data: {
            type: "DEPOSIT",
            status: "COMPLETED",
            amount: deposit.amount,
            currency,
            address: deposit.toAddress, // 用户钱包地址
            // 区块链交易信息（用于追溯和去重）
            txHash: deposit.txHash, // 交易哈希（唯一）
            blockNumber: deposit.blockNumber, // 区块号
            timestamp: deposit.timestamp, // 交易时间戳
            userId: deposit.userId,
          },
        });

        // 3. 更新充值状态
        await tx.pendingDeposit.update({
          where: { id: deposit.id },
          data: {
            status: "CREDITED",
            confirmations: MONITOR_CONFIG.REQUIRED_CONFIRMATIONS,
          },
        });
      });

      const currency = deposit.tokenAddress ? "USDT" : "ETH";
      console.log(
        `[Processor] ✅ 充值入账: ${deposit.amount} ${currency} -> 用户 ${deposit.userId}`
      );

      // TODO: 发送通知给用户
      // await this.notifyUser(deposit.userId, deposit.amount, currency);
    } catch (error) {
      // ✅ 捕获唯一约束冲突错误（P2002），说明交易已处理，忽略即可
      if ((error as any).code === "P2002") {
        console.log(`[Processor] ⚠️  交易 ${deposit.txHash.slice(0, 10)}... 已存在，跳过重复处理`);
        // 确保充值状态更新为已入账
        await prisma.pendingDeposit.update({
          where: { id: deposit.id },
          data: { status: "CREDITED" },
        });
        return;
      }

      console.error("[Processor] 充值入账失败:", error);
      throw error;
    }
  }

  /**
   * 处理区块重组
   * 标记受影响的充值为 REORGED
   */
  async handleReorg(lastSafeBlock: bigint): Promise<void> {
    try {
      const result = await prisma.pendingDeposit.updateMany({
        where: {
          blockNumber: { gt: lastSafeBlock },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: {
          status: "REORGED",
        },
      });

      if (result.count > 0) {
        console.warn(`[Processor] ⚠️  区块重组: ${result.count} 笔充值被标记为 REORGED`);
      }
    } catch (error) {
      console.error("[Processor] 处理重组失败:", error);
      throw error;
    }
  }

  /**
   * 获取待确认充值统计
   */
  async getPendingStats(): Promise<{
    pending: number;
    confirmed: number;
    credited: number;
  }> {
    const [pending, confirmed, credited] = await Promise.all([
      prisma.pendingDeposit.count({ where: { status: "PENDING" } }),
      prisma.pendingDeposit.count({ where: { status: "CONFIRMED" } }),
      prisma.pendingDeposit.count({ where: { status: "CREDITED" } }),
    ]);

    return { pending, confirmed, credited };
  }
}
