import "server-only";

import { prisma } from "@/lib/prisma";
import { MONITOR_CONFIG } from "./config";

/**
 * 用户钱包地址缓存
 * 支持动态订阅新注册的用户
 */
export class AddressCache {
  private addressSet: Set<string> = new Set();
  private addressToUserId: Map<string, string> = new Map();
  private lastRefreshTime: number = 0;

  constructor() {
    this.refresh();
  }

  /**
   * 刷新地址缓存（从数据库）
   */
  async refresh(): Promise<void> {
    try {
      const wallets = await prisma.wallet.findMany({
        select: {
          address: true,
          userId: true,
        },
      });

      // 清空旧缓存
      this.addressSet.clear();
      this.addressToUserId.clear();

      // 填充新缓存
      for (const wallet of wallets) {
        const addr = wallet.address.toLowerCase();
        this.addressSet.add(addr);
        this.addressToUserId.set(addr, wallet.userId);
      }

      this.lastRefreshTime = Date.now();

      console.log(`[AddressCache] 刷新完成，监听 ${this.addressSet.size} 个地址`);
    } catch (error) {
      console.error("[AddressCache] 刷新失败:", error);
      throw error;
    }
  }

  /**
   * 添加新地址（动态订阅）
   * 当新用户注册并创建钱包时调用
   */
  addAddress(address: string, userId: string): void {
    const addr = address.toLowerCase();
    this.addressSet.add(addr);
    this.addressToUserId.set(addr, userId);
    console.log(`[AddressCache] 动态添加地址: ${addr} (用户: ${userId})`);
  }

  /**
   * 检查地址是否在监听列表中
   */
  has(address: string): boolean {
    return this.addressSet.has(address.toLowerCase());
  }

  /**
   * 获取地址对应的用户 ID
   */
  getUserId(address: string): string | undefined {
    return this.addressToUserId.get(address.toLowerCase());
  }

  /**
   * 获取所有地址
   */
  getAll(): Set<string> {
    return new Set(this.addressSet);
  }

  /**
   * 获取监听的地址列表（用于调试）
   */
  getWatchedAddresses(): string[] {
    return Array.from(this.addressSet);
  }

  /**
   * 获取地址数量
   */
  size(): number {
    return this.addressSet.size;
  }

  /**
   * 检查是否需要刷新（超过 TTL）
   */
  shouldRefresh(): boolean {
    const elapsed = Date.now() - this.lastRefreshTime;
    return elapsed > MONITOR_CONFIG.ADDRESS_CACHE_TTL * 1000;
  }

  /**
   * 自动刷新（如果需要）
   */
  async autoRefresh(): Promise<void> {
    if (this.shouldRefresh()) {
      await this.refresh();
    }
  }
}

// 单例模式
let cacheInstance: AddressCache | null = null;

export function getAddressCache(): AddressCache {
  if (!cacheInstance) {
    cacheInstance = new AddressCache();
  }
  return cacheInstance;
}
