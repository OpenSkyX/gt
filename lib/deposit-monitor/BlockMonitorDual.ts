import "server-only";

import { ethers } from "ethers";
import pLimit from "p-limit";
import { prisma } from "@/lib/prisma";
import { MONITOR_CONFIG, validateConfig } from "./config";
import { AddressCache, getAddressCache } from "./AddressCache";
import { TransactionFilter } from "./TransactionFilter";
import { DepositProcessor } from "./DepositProcessor";

/**
 * 双轨并行模式区块监听器
 *
 * 架构:
 * 1. WebSocket 订阅线程 - 立即启动，实时监听最新区块
 * 2. 轮询追赶线程 - 同时启动，处理历史区块
 * 3. 轮询完成后自动停止，WebSocket 继续运行
 */
export class BlockMonitor {
  private httpProvider: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private addressCache: AddressCache;
  private filter: TransactionFilter;
  private processor: DepositProcessor;

  private isRunning: boolean = false;

  // 轮询追赶线程
  private catchupBlock: number = 0;  // 当前追赶到的区块
  private catchupTarget: number = 0; // 追赶目标区块
  private catchupTimer: NodeJS.Timeout | null = null;
  private isCatchupComplete: boolean = false;

  // WebSocket 订阅线程
  private wsStartBlock: number = 0;  // WebSocket 开始监听的区块

  // 通用
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private processedBlocks: Set<number> = new Set(); // 防止区块重复处理
  private processedTxHashes: Set<string> = new Set(); // 防止交易重复处理（关键去重）

  constructor() {
    const validation = validateConfig();
    if (!validation.valid) {
      throw new Error(`配置错误: ${validation.errors.join(", ")}`);
    }

    this.httpProvider = new ethers.JsonRpcProvider(MONITOR_CONFIG.RPC_URL);
    this.addressCache = getAddressCache();
    this.filter = new TransactionFilter(this.httpProvider, this.addressCache);
    this.processor = new DepositProcessor();
  }

  /**
   * 启动监听服务（双轨并行）
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[Monitor] 服务已在运行中");
      return;
    }

    console.log("=".repeat(60));
    console.log("📡 充值监听服务启动（双轨并行模式）");
    console.log("=".repeat(60));
    console.log(`网络: ${MONITOR_CONFIG.NETWORK}`);
    console.log(`RPC: ${MONITOR_CONFIG.RPC_URL}`);
    console.log(`WSS: ${MONITOR_CONFIG.WSS_URL}`);
    console.log(`确认数: ${MONITOR_CONFIG.REQUIRED_CONFIRMATIONS}`);
    console.log("=".repeat(60));

    try {
      // 1. 获取最新区块
      const latestBlock = await this.httpProvider.getBlockNumber();

      // 2. 恢复上次处理的区块
      const lastProcessed = await this.getLastProcessedBlock();

      // 3. 计算落后情况
      const blocksBehind = latestBlock - lastProcessed;

      console.log(`\n📊 区块状态:`);
      console.log(`   最后处理: ${lastProcessed}`);
      console.log(`   最新区块: ${latestBlock}`);
      console.log(`   落后: ${blocksBehind} 个区块`);
      console.log();

      // 4. 刷新地址缓存
      await this.addressCache.refresh();

      // 5. 标记服务运行中
      this.isRunning = true;
      await this.updateMonitorState(true);

      // 6. 启动心跳
      this.startHeartbeat();

      // 7. 启动双轨并行
      if (blocksBehind > MONITOR_CONFIG.CATCHUP_THRESHOLD) {
        // 有落后，启动双轨模式
        console.log(`🚀 启动双轨并行模式:\n`);

        // ✅ 正确的逻辑：
        // - WebSocket 从当前最新区块开始（实时监听新充值）
        // - 轮询从 lastProcessed 追赶到 latestBlock - 1（处理历史充值）
        // - 这样确保无缝衔接，没有空隙
        this.catchupBlock = lastProcessed;
        this.catchupTarget = latestBlock - 1;
        this.wsStartBlock = latestBlock;

        console.log(`📦 轮询线程: 追赶区块 ${this.catchupBlock} -> ${this.catchupTarget} (${this.catchupTarget - this.catchupBlock} 个区块)`);
        console.log(`⚡ WebSocket 线程: 监听最新区块 ${this.wsStartBlock} -> 实时\n`);

        // 同时启动两个线程
        await this.startWebSocket();  // 先启动 WebSocket
        this.startCatchup();          // 再启动追赶
      } else {
        // 没有落后，直接 WebSocket
        console.log(`⚡ 无需追赶，直接启动 WebSocket 模式\n`);
        this.wsStartBlock = latestBlock;
        await this.startWebSocket();
      }

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
    if (!this.isRunning) return;

    console.log("\n[Monitor] 正在停止服务...");
    this.isRunning = false;

    // 停止追赶线程
    if (this.catchupTimer) {
      clearInterval(this.catchupTimer);
      this.catchupTimer = null;
    }

    // 停止 WebSocket
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    // 停止心跳
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    await this.updateMonitorState(false);
    console.log("✅ 服务已停止");
  }

  /**
   * 获取最后处理的区块
   */
  private async getLastProcessedBlock(): Promise<number> {
    const state = await prisma.monitorState.findUnique({
      where: { network: MONITOR_CONFIG.NETWORK },
    });

    if (state && state.lastProcessedBlock > 0n) {
      return Number(state.lastProcessedBlock);
    }

    // 首次启动，从最新区块开始
    const latest = await this.httpProvider.getBlockNumber();
    await this.saveCheckpoint(latest);
    return latest;
  }

  /**
   * 启动 WebSocket 订阅（实时监听新区块）
   */
  private async startWebSocket(): Promise<void> {
    try {
      this.wsProvider = new ethers.WebSocketProvider(MONITOR_CONFIG.WSS_URL);

      // 监听新区块
      this.wsProvider.on("block", async (blockNumber: number) => {
        if (!this.isRunning) return;

        // 只处理新区块（避免与追赶线程冲突）
        if (blockNumber >= this.wsStartBlock && !this.processedBlocks.has(blockNumber)) {
          await this.handleNewBlock(blockNumber, "WebSocket");
        }
      });

      // 监听错误
      this.wsProvider.on("error", (error) => {
        console.error("[Monitor] WebSocket 错误:", error);
        // 不自动重连，保持轮询线程继续工作
      });

      console.log(`[WebSocket] ⚡ 已连接，监听区块 ${this.wsStartBlock} -> 实时`);
    } catch (error) {
      console.error("[Monitor] WebSocket 启动失败:", error);
      // 不抛出错误，让轮询线程继续
    }
  }

  /**
   * 启动轮询追赶线程
   */
  private startCatchup(): void {
    // ✅ 防止重复启动
    if (this.catchupTimer) {
      console.warn("[Catchup] ⚠️  追赶线程已在运行，跳过");
      return;
    }

    this.isCatchupComplete = false;

    this.catchupTimer = setInterval(() => {
      this.catchupOnce().catch((error) => {
        console.error("[Catchup] 追赶错误:", error);
      });
    }, MONITOR_CONFIG.POLL_INTERVAL);

    // 立即执行一次
    this.catchupOnce().catch((error) => {
      console.error("[Catchup] 追赶错误:", error);
    });
  }

  /**
   * 执行一次追赶
   */
  private async catchupOnce(): Promise<void> {
    if (!this.isRunning || this.isCatchupComplete) return;

    // 检查是否完成
    if (this.catchupBlock >= this.catchupTarget) {
      console.log(`\n[Catchup] ✅ 追赶完成！已处理到区块 ${this.catchupBlock}`);
      this.isCatchupComplete = true;

      if (this.catchupTimer) {
        clearInterval(this.catchupTimer);
        this.catchupTimer = null;
      }

      console.log(`[Catchup] 🛑 轮询线程已停止`);
      console.log(`[WebSocket] ⚡ 继续实时监听\n`);
      return;
    }

    try {
      // ✅ 移除：新地址通过 addAddress 动态添加，无需定期刷新
      // 只在启动时刷新一次即可

      // 计算本次处理的区块范围
      const endBlock = Math.min(
        this.catchupBlock + MONITOR_CONFIG.BATCH_SIZE,
        this.catchupTarget
      );

      const remaining = this.catchupTarget - this.catchupBlock;
      console.log(`\n[Catchup] 📦 追赶: ${this.catchupBlock + 1} -> ${endBlock} (剩余 ${remaining})`);

      // 批量处理
      await this.processCatchupBatch(this.catchupBlock + 1, endBlock);

      // 更新检查点
      await this.saveCheckpoint(endBlock);
      this.catchupBlock = endBlock;

      // 更新确认数
      const latestBlock = await this.httpProvider.getBlockNumber();
      await this.processor.updateConfirmations(latestBlock);
    } catch (error) {
      console.error("[Catchup] 追赶失败:", error);
    }
  }

  /**
   * 处理追赶批次
   */
  private async processCatchupBatch(startBlock: number, endBlock: number): Promise<void> {
    const blocks: number[] = [];
    for (let i = startBlock; i <= endBlock; i++) {
      blocks.push(i);
    }

    // 并发处理
    const limit = pLimit(MONITOR_CONFIG.MAX_CONCURRENT_REQUESTS);
    const tasks = blocks.map((blockNumber) =>
      limit(() => this.processBlock(blockNumber, "Catchup"))
    );

    await Promise.all(tasks);
  }

  /**
   * 处理新区块（WebSocket）
   */
  private async handleNewBlock(blockNumber: number, source: string): Promise<void> {
    // 静默处理新区块，只在有充值时才输出日志
    // ✅ 移除：新地址通过 addAddress 动态添加，无需刷新缓存
    await this.processBlock(blockNumber, source);

    // 更新确认数
    await this.processor.updateConfirmations(blockNumber);

    // ✅ 保存检查点（每 10 个区块保存一次，避免频繁写数据库）
    if (blockNumber % 10 === 0) {
      await this.saveCheckpoint(blockNumber);
    }
  }

  /**
   * 处理单个区块
   */
  private async processBlock(blockNumber: number, source: string): Promise<void> {
    // 防止重复处理
    if (this.processedBlocks.has(blockNumber)) {
      return;
    }

    try {
      // 过滤充值交易
      const deposits = await this.filter.filterDeposits(blockNumber);

      // 处理每笔充值（交易哈希去重）
      for (const deposit of deposits) {
        // ✅ 关键去重：检查交易哈希是否已处理
        if (this.processedTxHashes.has(deposit.txHash)) {
          console.log(`[${source}] ⚠️  交易 ${deposit.txHash.slice(0, 10)}... 已处理，跳过`);
          continue;
        }

        // 处理充值
        await this.processor.processNewDeposit(deposit);

        // 标记交易哈希已处理
        this.processedTxHashes.add(deposit.txHash);
      }

      // 标记区块已处理
      this.processedBlocks.add(blockNumber);

      // 只保留最近 1000 个区块和 10000 个交易的记录（防止内存泄漏）
      if (this.processedBlocks.size > 1000) {
        const toDelete = Array.from(this.processedBlocks)
          .sort((a, b) => a - b)
          .slice(0, 100);
        toDelete.forEach(b => this.processedBlocks.delete(b));
      }

      if (this.processedTxHashes.size > 10000) {
        const toDelete = Array.from(this.processedTxHashes).slice(0, 1000);
        toDelete.forEach(h => this.processedTxHashes.delete(h));
      }
    } catch (error) {
      console.error(`[${source}] 处理区块 ${blockNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 保存检查点
   */
  private async saveCheckpoint(blockNumber: number): Promise<void> {
    try {
      const block = await this.httpProvider.getBlock(blockNumber);
      if (!block) return;

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
    } catch (error) {
      console.error("[Monitor] 保存检查点失败:", error);
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
    await prisma.monitorState.update({
      where: { network: MONITOR_CONFIG.NETWORK },
      data: { lastHeartbeat: new Date() },
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
        lastProcessedBlock: 0n,
        lastProcessedHash: "",
        isRunning,
      },
      update: { isRunning },
    });
  }
}
