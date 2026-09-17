import "server-only";

import { ethers } from "ethers";
import pLimit from "p-limit";
import { prisma } from "@/lib/prisma";
import { MONITOR_CONFIG, validateConfig } from "./config";
import { AddressCache, getAddressCache } from "./AddressCache";
import { TransactionFilter } from "./TransactionFilter";
import { DepositProcessor } from "./DepositProcessor";

/**
 * 混合模式区块监听器
 * - 落后时使用轮询快速追赶
 * - 追赶到最新后切换到 WebSocket 订阅
 * - WebSocket 断线时自动降级到轮询
 */
export class BlockMonitor {
  private httpProvider: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private addressCache: AddressCache;
  private filter: TransactionFilter;
  private processor: DepositProcessor;

  private isRunning: boolean = false;
  private currentBlock: number = 0;
  private mode: "polling" | "websocket" = "polling";

  // 轮询模式
  private pollTimer: NodeJS.Timeout | null = null;

  // WebSocket 模式
  private wsReconnectAttempts: number = 0;
  private wsReconnectTimer: NodeJS.Timeout | null = null;

  // 通用
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 验证配置
    const validation = validateConfig();
    if (!validation.valid) {
      throw new Error(`配置错误: ${validation.errors.join(", ")}`);
    }

    // 初始化 HTTP provider（用于轮询和查询）
    this.httpProvider = new ethers.JsonRpcProvider(MONITOR_CONFIG.RPC_URL);

    // 初始化组件
    this.addressCache = getAddressCache();
    this.filter = new TransactionFilter(this.httpProvider, this.addressCache);
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
    console.log("📡 充值监听服务启动（混合模式）");
    console.log("=".repeat(60));
    console.log(`网络: ${MONITOR_CONFIG.NETWORK}`);
    console.log(`RPC: ${MONITOR_CONFIG.RPC_URL}`);
    console.log(`WSS: ${MONITOR_CONFIG.WSS_URL}`);
    console.log(`USDT 地址: ${MONITOR_CONFIG.USDT_ADDRESS || "未配置"}`);
    console.log(`确认数: ${MONITOR_CONFIG.REQUIRED_CONFIRMATIONS}`);
    console.log(`模式: 落后时轮询，最新时 WebSocket`);
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

      // 5. 决定使用哪种模式
      await this.selectMode();

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

    // 停止轮询
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // 停止 WebSocket
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    // 停止重连定时器
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    // 停止心跳
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
      // 首次启动，从最新区块开始
      this.currentBlock = await this.httpProvider.getBlockNumber();
      console.log(`[Monitor] 🎯 首次启动，从当前区块开始: ${this.currentBlock}`);
      await this.saveCheckpoint(this.currentBlock);
    }
  }

  /**
   * 选择监听模式（轮询 or WebSocket）
   */
  private async selectMode(): Promise<void> {
    const latestBlock = await this.httpProvider.getBlockNumber();
    const blocksBehind = latestBlock - this.currentBlock;

    console.log(`[Monitor] 当前区块: ${this.currentBlock}, 最新区块: ${latestBlock}, 落后: ${blocksBehind}`);

    if (blocksBehind > MONITOR_CONFIG.CATCHUP_THRESHOLD) {
      // 落后较多，使用轮询追赶
      console.log(`[Monitor] 🏃 落后 ${blocksBehind} 个区块，使用轮询模式追赶`);
      this.startPolling();
    } else {
      // 已经是最新，切换到 WebSocket
      console.log(`[Monitor] ⚡ 已追赶到最新，切换到 WebSocket 模式`);
      await this.startWebSocket();
    }
  }

  /**
   * 启动轮询模式
   */
  private startPolling(): void {
    this.mode = "polling";

    // 清除旧的定时器
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = setInterval(() => {
      this.pollOnce().catch((error) => {
        console.error("[Monitor] 轮询错误:", error);
      });
    }, MONITOR_CONFIG.POLL_INTERVAL);

    // 立即执行一次
    this.pollOnce().catch((error) => {
      console.error("[Monitor] 轮询错误:", error);
    });
  }

  /**
   * 执行一次轮询
   */
  private async pollOnce(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // 1. 自动刷新地址缓存
      await this.addressCache.autoRefresh();

      // 2. 获取最新区块
      const latestBlock = await this.retryWithBackoff(() =>
        this.httpProvider.getBlockNumber()
      );

      if (latestBlock <= this.currentBlock) {
        return;
      }

      const blocksBehind = latestBlock - this.currentBlock;

      // 3. 限制每次处理的区块数（避免速率限制）
      const endBlock = Math.min(
        latestBlock,
        this.currentBlock + MONITOR_CONFIG.BATCH_SIZE
      );

      console.log(
        `\n[Monitor] 📦 轮询: ${this.currentBlock + 1} -> ${endBlock} (落后 ${blocksBehind})`
      );

      // 4. 处理区块
      await this.processBlocks(this.currentBlock + 1, endBlock);

      // 5. 更新确认数
      await this.processor.updateConfirmations(latestBlock);

      // 6. 检查是否追赶完成，切换到 WebSocket
      if (latestBlock - this.currentBlock <= MONITOR_CONFIG.CATCHUP_THRESHOLD) {
        console.log(`[Monitor] ✅ 追赶完成，切换到 WebSocket 模式`);

        // 停止轮询
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }

        // 启动 WebSocket
        await this.startWebSocket();
      }
    } catch (error) {
      console.error("[Monitor] 轮询失败:", error);
    }
  }

  /**
   * 启动 WebSocket 模式
   */
  private async startWebSocket(): Promise<void> {
    try {
      this.mode = "websocket";

      // 创建 WebSocket provider
      this.wsProvider = new ethers.WebSocketProvider(MONITOR_CONFIG.WSS_URL);

      // 监听新区块
      this.wsProvider.on("block", async (blockNumber: number) => {
        if (!this.isRunning) return;

        try {
          await this.handleNewBlock(blockNumber);
        } catch (error) {
          console.error("[Monitor] 处理新区块失败:", error);
        }
      });

      // 监听错误
      this.wsProvider.on("error", (error) => {
        console.error("[Monitor] WebSocket 错误:", error);
        this.handleWebSocketDisconnect();
      });

      // 重置重连次数
      this.wsReconnectAttempts = 0;

      console.log("[Monitor] ⚡ WebSocket 已连接，实时监听中...");
    } catch (error) {
      console.error("[Monitor] WebSocket 连接失败:", error);
      this.handleWebSocketDisconnect();
    }
  }

  /**
   * 处理 WebSocket 断线
   */
  private handleWebSocketDisconnect(): void {
    console.warn("[Monitor] ⚠️  WebSocket 断线，降级到轮询模式");

    // 清理 WebSocket
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      this.wsProvider.destroy().catch(() => {});
      this.wsProvider = null;
    }

    // 切换到轮询模式
    this.startPolling();

    // 尝试重连 WebSocket
    this.scheduleWebSocketReconnect();
  }

  /**
   * 定时重连 WebSocket
   */
  private scheduleWebSocketReconnect(): void {
    if (this.wsReconnectAttempts >= MONITOR_CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
      console.warn("[Monitor] WebSocket 重连次数超限，继续使用轮询模式");
      return;
    }

    this.wsReconnectAttempts++;
    const delay = MONITOR_CONFIG.WS_RECONNECT_DELAY * this.wsReconnectAttempts;

    console.log(
      `[Monitor] 将在 ${delay / 1000} 秒后尝试重连 WebSocket (${this.wsReconnectAttempts}/${MONITOR_CONFIG.WS_MAX_RECONNECT_ATTEMPTS})`
    );

    this.wsReconnectTimer = setTimeout(async () => {
      if (!this.isRunning) return;

      // 检查是否已追赶到最新
      const latestBlock = await this.httpProvider.getBlockNumber();
      const blocksBehind = latestBlock - this.currentBlock;

      if (blocksBehind <= MONITOR_CONFIG.CATCHUP_THRESHOLD) {
        // 停止轮询
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }

        // 尝试重连 WebSocket
        await this.startWebSocket();
      } else {
        // 还在追赶中，稍后再试
        this.scheduleWebSocketReconnect();
      }
    }, delay);
  }

  /**
   * 处理新区块（WebSocket 模式）
   */
  private async handleNewBlock(blockNumber: number): Promise<void> {
    if (blockNumber <= this.currentBlock) {
      return;
    }

    console.log(`\n[Monitor] ⚡ 新区块: ${blockNumber}`);

    // 刷新地址缓存
    await this.addressCache.autoRefresh();

    // 处理区块
    await this.processBlock(blockNumber);

    // 更新确认数
    await this.processor.updateConfirmations(blockNumber);

    // 打印统计
    const stats = await this.processor.getPendingStats();
    if (stats.pending > 0 || stats.confirmed > 0) {
      console.log(
        `[Stats] 待确认: ${stats.pending}, 已确认: ${stats.confirmed}, 已入账: ${stats.credited}`
      );
    }
  }

  /**
   * 批量处理区块
   */
  private async processBlocks(startBlock: number, endBlock: number): Promise<void> {
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

    // 保存检查点
    await this.saveCheckpoint(endBlock);
  }

  /**
   * 处理单个区块
   */
  private async processBlock(blockNumber: number): Promise<void> {
    try {
      // 过滤充值交易
      const deposits = await this.filter.filterDeposits(blockNumber);

      // 处理每笔充值
      for (const deposit of deposits) {
        await this.processor.processNewDeposit(deposit);
      }

      // 更新当前区块
      this.currentBlock = blockNumber;
    } catch (error) {
      console.error(`[Monitor] 处理区块 ${blockNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 保存检查点
   */
  private async saveCheckpoint(blockNumber: number): Promise<void> {
    try {
      const block = await this.httpProvider.getBlock(blockNumber);
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
   * 带重试的请求
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= MONITOR_CONFIG.RETRY_ATTEMPTS) {
        throw error;
      }

      // 检查是否是速率限制错误
      if (error.code === "UNKNOWN_ERROR" && error.error?.code === 429) {
        const delay = MONITOR_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
        console.warn(
          `[Monitor] 速率限制，${delay / 1000} 秒后重试 (${attempt}/${MONITOR_CONFIG.RETRY_ATTEMPTS})`
        );
        await this.sleep(delay);
        return this.retryWithBackoff(fn, attempt + 1);
      }

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
   * Sleep 工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
