import "server-only";

import { ethers } from "ethers";
import pLimit from "p-limit";
import { prisma } from "@/lib/prisma";
import { MONITOR_CONFIG, validateConfig } from "./config";
import { AddressCache, getAddressCache } from "./AddressCache";
import { TransactionFilter } from "./TransactionFilter";
import { DepositProcessor } from "./DepositProcessor";

/**
 * 区块监听器（主服务）
 * 负责监听区块链上的充值交易
 */
export class BlockMonitor {
  private provider: ethers.JsonRpcProvider;
  private addressCache: AddressCache;
  private filter: TransactionFilter;
  private processor: DepositProcessor;

  private isRunning: boolean = false;
  private currentBlock: number = 0;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 验证配置
    const validation = validateConfig();
    if (!validation.valid) {
      throw new Error(`配置错误: ${validation.errors.join(", ")}`);
    }

    // 初始化组件
    this.provider = new ethers.JsonRpcProvider(MONITOR_CONFIG.RPC_URL);
    this.addressCache = getAddressCache();
    this.filter = new TransactionFilter(this.provider, this.addressCache);
    this.processor = new DepositProcessor();
  }

  /**
   * 启动监听服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[Monitor] 服务已在运行中");
      return;
    }

    console.log("=".repeat(60));
    console.log("📡 充值监听服务启动");
    console.log("=".repeat(60));
    console.log(`网络: ${MONITOR_CONFIG.NETWORK}`);
    console.log(`RPC: ${MONITOR_CONFIG.RPC_URL}`);
    console.log(`USDT 地址: ${MONITOR_CONFIG.USDT_ADDRESS || "未配置"}`);
    console.log(`轮询间隔: ${MONITOR_CONFIG.POLL_INTERVAL}ms`);
    console.log(`确认数: ${MONITOR_CONFIG.REQUIRED_CONFIRMATIONS}`);
    console.log("=".repeat(60));

    try {
      // 1. 恢复上次的区块高度
      await this.restoreLastBlock();

      // 2. 刷新地址缓存
      await this.addressCache.refresh();

      // 3. 标记服务运行中
      this.isRunning = true;
      await this.updateMonitorState(true);

      // 4. 启动心跳
      this.startHeartbeat();

      // 5. 启动轮询
      this.startPolling();

      console.log("✅ 监听服务已启动");
    } catch (error) {
      console.error("❌ 启动失败:", error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 停止监听服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("\n[Monitor] 正在停止服务...");

    this.isRunning = false;

    // 停止定时器
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // 更新状态
    await this.updateMonitorState(false);

    console.log("✅ 服务已停止");
  }

  /**
   * 恢复上次处理的区块高度
   */
  private async restoreLastBlock(): Promise<void> {
    const state = await prisma.monitorState.findUnique({
      where: { network: MONITOR_CONFIG.NETWORK },
    });

    if (state && state.lastProcessedBlock > 0n) {
      this.currentBlock = Number(state.lastProcessedBlock);
      console.log(`[Monitor] 恢复上次处理的区块: ${this.currentBlock}`);
    } else {
      // 首次启动，从当前区块开始（不处理历史区块，避免速率限制）
      this.currentBlock = await this.provider.getBlockNumber();
      console.log(`[Monitor] 🎯 首次启动，从当前区块开始: ${this.currentBlock}`);
      console.log(`[Monitor] ℹ️  不处理历史区块，只监听新充值`);

      // 保存初始状态
      await this.saveCheckpoint(this.currentBlock);
    }
  }

  /**
   * 启动轮询
   */
  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        console.error("[Monitor] 轮询错误:", error);
      });
    }, MONITOR_CONFIG.POLL_INTERVAL);

    // 立即执行一次
    this.poll().catch((error) => {
      console.error("[Monitor] 轮询错误:", error);
    });
  }

  /**
   * 轮询逻辑
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // 1. 自动刷新地址缓存（如果需要）
      await this.addressCache.autoRefresh();

      // 2. 获取最新区块
      const latestBlock = await this.provider.getBlockNumber();

      if (latestBlock <= this.currentBlock) {
        // 没有新区块
        return;
      }

      const blocksToProcess = latestBlock - this.currentBlock;
      console.log(`\n[Monitor] 发现 ${blocksToProcess} 个新区块 (${this.currentBlock + 1} -> ${latestBlock})`);

      // 3. 批量处理区块
      await this.processBlocks(this.currentBlock + 1, latestBlock);

      // 4. 更新确认数
      await this.processor.updateConfirmations(latestBlock);

      // 5. 打印统计
      const stats = await this.processor.getPendingStats();
      if (stats.pending > 0 || stats.confirmed > 0) {
        console.log(
          `[Stats] 待确认: ${stats.pending}, 已确认: ${stats.confirmed}, 已入账: ${stats.credited}`
        );
      }
    } catch (error) {
      console.error("[Monitor] 轮询失败:", error);
      // 不抛出错误，继续下次轮询
    }
  }

  /**
   * 批量处理区块
   */
  private async processBlocks(startBlock: number, endBlock: number): Promise<void> {
    const totalBlocks = endBlock - startBlock + 1;

    // 分批处理（每批 BATCH_SIZE 个区块）
    for (let i = 0; i < totalBlocks; i += MONITOR_CONFIG.BATCH_SIZE) {
      const batchStart = startBlock + i;
      const batchEnd = Math.min(startBlock + i + MONITOR_CONFIG.BATCH_SIZE - 1, endBlock);

      await this.processBatch(batchStart, batchEnd);
    }
  }

  /**
   * 处理一批区块
   */
  private async processBatch(startBlock: number, endBlock: number): Promise<void> {
    const blocks: number[] = [];
    for (let i = startBlock; i <= endBlock; i++) {
      blocks.push(i);
    }

    // 并发处理（限制并发数）
    const limit = pLimit(MONITOR_CONFIG.MAX_CONCURRENT_REQUESTS);
    const tasks = blocks.map((blockNumber) =>
      limit(() => this.processBlock(blockNumber))
    );

    await Promise.all(tasks);

    // 更新最后处理的区块
    await this.saveCheckpoint(endBlock);
  }

  /**
   * 处理单个区块
   */
  private async processBlock(blockNumber: number): Promise<void> {
    try {
      // 1. 过滤充值交易
      const deposits = await this.filter.filterDeposits(blockNumber);

      // 2. 处理每笔充值
      for (const deposit of deposits) {
        await this.processor.processNewDeposit(deposit);
      }

      // 3. 检测重组（可选）
      // await this.detectReorg(blockNumber);
    } catch (error) {
      console.error(`[Monitor] 处理区块 ${blockNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 保存检查点（最后处理的区块）
   */
  private async saveCheckpoint(blockNumber: number): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      if (!block) {
        throw new Error(`区块 ${blockNumber} 不存在`);
      }

      await prisma.monitorState.upsert({
        where: { network: MONITOR_CONFIG.NETWORK },
        create: {
          network: MONITOR_CONFIG.NETWORK,
          lastProcessedBlock: BigInt(blockNumber),
          lastProcessedHash: block.hash || "",
          isRunning: true,
        },
        update: {
          lastProcessedBlock: BigInt(blockNumber),
          lastProcessedHash: block.hash || "",
        },
      });

      this.currentBlock = blockNumber;
    } catch (error) {
      console.error("[Monitor] 保存检查点失败:", error);
      throw error;
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.updateHeartbeat().catch((error) => {
        console.error("[Monitor] 更新心跳失败:", error);
      });
    }, MONITOR_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * 更新心跳
   */
  private async updateHeartbeat(): Promise<void> {
    await prisma.monitorState.upsert({
      where: { network: MONITOR_CONFIG.NETWORK },
      create: {
        network: MONITOR_CONFIG.NETWORK,
        lastProcessedBlock: BigInt(this.currentBlock),
        lastProcessedHash: "",
        isRunning: true,
        lastHeartbeat: new Date(),
      },
      update: {
        lastHeartbeat: new Date(),
      },
    });
  }

  /**
   * 更新监听状态
   */
  private async updateMonitorState(isRunning: boolean): Promise<void> {
    await prisma.monitorState.upsert({
      where: { network: MONITOR_CONFIG.NETWORK },
      create: {
        network: MONITOR_CONFIG.NETWORK,
        lastProcessedBlock: BigInt(this.currentBlock),
        lastProcessedHash: "",
        isRunning,
      },
      update: {
        isRunning,
      },
    });
  }

  /**
   * 检测区块重组（可选）
   */
  private async detectReorg(blockNumber: number): Promise<void> {
    // TODO: 实现重组检测逻辑
    // 1. 获取当前区块的父哈希
    // 2. 与数据库中保存的上一个区块哈希对比
    // 3. 如果不匹配，说明发生了重组
    // 4. 调用 processor.handleReorg() 回滚
  }
}
