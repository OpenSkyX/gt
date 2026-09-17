import "server-only";

import { ethers } from "ethers";
import { MONITOR_CONFIG, TRANSFER_EVENT_SIGNATURE } from "./config";
import { AddressCache } from "./AddressCache";

export interface DepositEvent {
  txHash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: Date; // 区块时间戳
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress: string | null; // null = ETH
  userId: string;
}

/**
 * 交易过滤器
 * 从区块中提取用户的充值交易（ETH + USDT）
 */
export class TransactionFilter {
  private provider: ethers.JsonRpcProvider;
  private addressCache: AddressCache;

  constructor(provider: ethers.JsonRpcProvider, addressCache: AddressCache) {
    this.provider = provider;
    this.addressCache = addressCache;
  }

  /**
   * 过滤区块中的充值交易
   */
  async filterDeposits(blockNumber: number): Promise<DepositEvent[]> {
    const deposits: DepositEvent[] = [];

    try {
      // 1. 获取区块（包含交易）
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) {
        console.warn(`[Filter] 区块 ${blockNumber} 不存在`);
        return [];
      }

      // 2. 过滤 ETH 充值（原生转账）
      const ethDeposits = await this.filterETHDeposits(block);
      deposits.push(...ethDeposits);

      // 3. 过滤 USDT 充值（ERC20 转账）
      if (MONITOR_CONFIG.USDT_ADDRESS && MONITOR_CONFIG.USDT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
        const usdtDeposits = await this.filterUSDTDeposits(block);
        deposits.push(...usdtDeposits);
      }

      if (deposits.length > 0) {
        console.log(`[Filter] 区块 ${blockNumber} 发现 ${deposits.length} 笔充值`);
      }
    } catch (error) {
      console.error(`[Filter] 过滤区块 ${blockNumber} 失败:`, error);
      throw error;
    }

    return deposits;
  }

  /**
   * 过滤原生 ETH 充值
   */
  private async filterETHDeposits(block: ethers.Block): Promise<DepositEvent[]> {
    const deposits: DepositEvent[] = [];

    if (!block.transactions || block.transactions.length === 0) {
      return deposits;
    }

    // 区块时间戳（秒 -> 毫秒）
    const blockTimestamp = new Date(block.timestamp * 1000);

    for (const txHash of block.transactions) {
      try {
        // 获取交易详情
        const tx = await this.provider.getTransaction(txHash as string);
        if (!tx || !tx.to) continue;

        const toAddress = tx.to.toLowerCase();

        // 检查是否是用户地址
        if (this.addressCache.has(toAddress)) {
          // 检查是否有 ETH 转账
          if (tx.value > 0n) {
            const userId = this.addressCache.getUserId(toAddress);
            if (userId) {
              deposits.push({
                txHash: tx.hash,
                blockNumber: block.number,
                blockHash: block.hash || "",
                timestamp: blockTimestamp,
                fromAddress: tx.from.toLowerCase(),
                toAddress,
                amount: ethers.formatEther(tx.value),
                tokenAddress: null, // ETH
                userId,
              });
            }
          }
        }
      } catch (error) {
        console.error(`[Filter] 处理交易 ${txHash} 失败:`, error);
        // 继续处理其他交易
      }
    }

    return deposits;
  }

  /**
   * 过滤 USDT 充值（ERC20 Transfer 事件）
   */
  private async filterUSDTDeposits(block: ethers.Block): Promise<DepositEvent[]> {
    const deposits: DepositEvent[] = [];

    try {
      // 区块时间戳（秒 -> 毫秒）
      const blockTimestamp = new Date(block.timestamp * 1000);

      // 使用 Event Filter 获取 USDT Transfer 事件
      const logs = await this.provider.getLogs({
        address: MONITOR_CONFIG.USDT_ADDRESS,
        topics: [TRANSFER_EVENT_SIGNATURE],
        fromBlock: block.number,
        toBlock: block.number,
      });

      for (const log of logs) {
        try {
          // 解析 Transfer 事件
          // topics[0] = event signature
          // topics[1] = from (indexed)
          // topics[2] = to (indexed)
          // data = amount
          const toAddress = ethers.getAddress("0x" + log.topics[2].slice(26)).toLowerCase();

          // 检查是否是用户地址
          if (this.addressCache.has(toAddress)) {
            const userId = this.addressCache.getUserId(toAddress);
            if (userId) {
              const fromAddress = ethers.getAddress("0x" + log.topics[1].slice(26)).toLowerCase();

              // 解析金额（使用配置的精度）
              const amount = ethers.formatUnits(log.data, MONITOR_CONFIG.USDT_DECIMALS);

              deposits.push({
                txHash: log.transactionHash,
                blockNumber: block.number,
                blockHash: block.hash || "",
                timestamp: blockTimestamp,
                fromAddress,
                toAddress,
                amount,
                tokenAddress: MONITOR_CONFIG.USDT_ADDRESS,
                userId,
              });
            }
          }
        } catch (error) {
          console.error(`[Filter] 解析 USDT Transfer 事件失败:`, error);
          // 继续处理其他事件
        }
      }
    } catch (error) {
      console.error(`[Filter] 获取 USDT 事件失败:`, error);
      throw error;
    }

    return deposits;
  }
}
