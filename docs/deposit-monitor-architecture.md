# 区块链充值监听服务架构设计

## 📋 概述

为 Arbitrum Sepolia 测试网设计的高性能、高可靠性充值监听服务。

---

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     应用层 (Next.js)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ 充值页面  │  │ 资产页面  │  │ 交易记录  │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                     API 层                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GET  /api/deposit/address      获取充值地址          │   │
│  │  GET  /api/deposit/status/:txid  查询充值状态         │   │
│  │  GET  /api/deposit/history      查询充值历史          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   监听服务层 (核心)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │            区块监听器 (Block Monitor)               │    │
│  │  • 实时监听新区块                                   │    │
│  │  • 断点续传机制                                     │    │
│  │  • 区块重组检测                                     │    │
│  └───────┬────────────────────────────────────────────┘    │
│          │                                                   │
│          ▼                                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │         交易过滤器 (Transaction Filter)             │    │
│  │  • 地址匹配（用户钱包地址）                         │    │
│  │  • USDT 代币转账识别                                │    │
│  │  • 原生 ETH 转账识别                                │    │
│  └───────┬────────────────────────────────────────────┘    │
│          │                                                   │
│          ▼                                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │         充值处理器 (Deposit Processor)              │    │
│  │  • 确认数检查 (6 confirmations)                     │    │
│  │  • 余额更新                                         │    │
│  │  • 交易记录创建                                     │    │
│  │  • 幂等性保证                                       │    │
│  └───────┬────────────────────────────────────────────┘    │
│          │                                                   │
│          ▼                                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │          通知服务 (Notification)                    │    │
│  │  • 实时推送（WebSocket）                            │    │
│  │  • 邮件通知（可选）                                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (PostgreSQL)                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MonitorState │  │ PendingDeposit│ │ Transaction  │     │
│  │ (监听状态)    │  │ (待确认充值)   │  │ (交易记录)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              区块链层 (Arbitrum Sepolia)                     │
│                                                              │
│         RPC: arb-sepolia.g.alchemy.com                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 数据库设计

### 1. MonitorState (监听状态表)
```prisma
model MonitorState {
  id                String   @id @default(cuid())
  network           String   @default("arbitrum-sepolia")
  lastProcessedBlock BigInt  // 最后处理的区块高度
  lastProcessedHash String   // 最后处理的区块哈希（用于检测重组）
  isRunning         Boolean  @default(false)
  lastHeartbeat     DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([network])
}
```

### 2. PendingDeposit (待确认充值表)
```prisma
model PendingDeposit {
  id              String   @id @default(cuid())
  txHash          String   @unique
  blockNumber     BigInt
  blockHash       String
  
  fromAddress     String
  toAddress       String   // 用户钱包地址
  amount          Decimal  @db.Decimal(20, 8)
  tokenAddress    String?  // null = ETH, 否则为 USDT 地址
  
  confirmations   Int      @default(0)
  status          DepositStatus @default(PENDING)
  
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([toAddress])
  @@index([status])
  @@index([blockNumber])
}

enum DepositStatus {
  PENDING      // 待确认
  CONFIRMED    // 已确认（6个确认）
  CREDITED     // 已入账
  FAILED       // 失败
  REORGED      // 被重组
}
```

---

## 🔧 核心组件设计

### 1. Block Monitor (区块监听器)

```typescript
// lib/deposit-monitor/BlockMonitor.ts

export class BlockMonitor {
  private provider: ethers.JsonRpcProvider;
  private isRunning: boolean = false;
  private currentBlock: number = 0;
  
  // 配置
  private readonly POLL_INTERVAL = 3000;      // 3秒轮询一次
  private readonly BATCH_SIZE = 10;           // 每次处理10个区块
  private readonly REORG_SAFETY = 6;          // 重组安全深度
  
  async start() {
    // 1. 恢复上次的区块高度
    // 2. 启动轮询监听
    // 3. 处理新区块
    // 4. 更新状态
  }
  
  async processNewBlocks() {
    // 1. 获取最新区块
    // 2. 批量获取区块详情
    // 3. 并发处理交易
    // 4. 保存检查点
  }
  
  async handleReorg() {
    // 1. 检测区块重组
    // 2. 回滚到安全深度
    // 3. 重新处理
  }
}
```

**优势**：
- ✅ 断点续传：服务重启不丢失进度
- ✅ 批量处理：提高吞吐量
- ✅ 重组检测：保证数据一致性

---

### 2. Transaction Filter (交易过滤器)

```typescript
// lib/deposit-monitor/TransactionFilter.ts

export class TransactionFilter {
  // USDT 在 Arbitrum Sepolia 的合约地址
  private readonly USDT_ADDRESS = "0x...";
  
  // Transfer(address,address,uint256) 事件签名
  private readonly TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
  
  async filterDeposits(block: Block): Promise<DepositEvent[]> {
    const deposits: DepositEvent[] = [];
    
    // 1. 获取所有用户钱包地址（缓存）
    const userAddresses = await this.getUserAddresses();
    
    // 2. 过滤原生 ETH 转账
    for (const tx of block.transactions) {
      if (userAddresses.has(tx.to.toLowerCase())) {
        deposits.push({
          type: 'ETH',
          txHash: tx.hash,
          to: tx.to,
          amount: tx.value,
        });
      }
    }
    
    // 3. 过滤 USDT 转账（通过 logs）
    const receipt = await this.provider.getTransactionReceipt(tx.hash);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === this.USDT_ADDRESS.toLowerCase()) {
        const decoded = this.decodeTransferLog(log);
        if (userAddresses.has(decoded.to.toLowerCase())) {
          deposits.push({
            type: 'USDT',
            txHash: log.transactionHash,
            to: decoded.to,
            amount: decoded.amount,
          });
        }
      }
    }
    
    return deposits;
  }
  
  // 地址缓存（每5分钟刷新）
  private addressCache = new Map<string, boolean>();
  private async getUserAddresses(): Promise<Set<string>> {
    // 从数据库获取所有用户钱包地址并缓存
  }
}
```

**优势**：
- ✅ 精准匹配：只处理用户地址
- ✅ 支持多币种：ETH + USDT
- ✅ 地址缓存：减少数据库查询

---

### 3. Deposit Processor (充值处理器)

```typescript
// lib/deposit-monitor/DepositProcessor.ts

export class DepositProcessor {
  private readonly REQUIRED_CONFIRMATIONS = 6;
  
  async processDeposit(deposit: DepositEvent) {
    // 1. 幂等性检查
    const existing = await prisma.pendingDeposit.findUnique({
      where: { txHash: deposit.txHash }
    });
    if (existing) return; // 已处理过
    
    // 2. 创建待确认记录
    await prisma.pendingDeposit.create({
      data: {
        txHash: deposit.txHash,
        blockNumber: deposit.blockNumber,
        blockHash: deposit.blockHash,
        toAddress: deposit.to,
        amount: deposit.amount,
        tokenAddress: deposit.tokenAddress,
        confirmations: 0,
        status: 'PENDING',
        userId: deposit.userId,
      }
    });
  }
  
  async updateConfirmations() {
    // 定时任务：每分钟更新一次确认数
    const pending = await prisma.pendingDeposit.findMany({
      where: { status: 'PENDING' }
    });
    
    const currentBlock = await provider.getBlockNumber();
    
    for (const deposit of pending) {
      const confirmations = currentBlock - Number(deposit.blockNumber) + 1;
      
      if (confirmations >= this.REQUIRED_CONFIRMATIONS) {
        // 达到确认数，入账
        await this.creditDeposit(deposit);
      } else {
        // 更新确认数
        await prisma.pendingDeposit.update({
          where: { id: deposit.id },
          data: { confirmations }
        });
      }
    }
  }
  
  async creditDeposit(deposit: PendingDeposit) {
    await prisma.$transaction(async (tx) => {
      // 1. 更新用户余额
      await tx.user.update({
        where: { id: deposit.userId },
        data: {
          fundingBalance: { increment: deposit.amount }
        }
      });
      
      // 2. 创建交易记录
      await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: deposit.amount,
          currency: deposit.tokenAddress ? 'USDT' : 'ETH',
          address: deposit.txHash,
          userId: deposit.userId,
        }
      });
      
      // 3. 更新充值状态
      await tx.pendingDeposit.update({
        where: { id: deposit.id },
        data: { status: 'CREDITED' }
      });
    });
    
    // 4. 发送通知
    await this.notifyUser(deposit.userId, deposit.amount);
  }
}
```

**优势**：
- ✅ 幂等性：防止重复入账
- ✅ 事务安全：余额更新原子性
- ✅ 确认机制：6个确认后入账

---

## ⚡ 性能优化策略

### 1. 批量处理
```typescript
// 批量获取区块
const blocks = await Promise.all(
  Array.from({ length: BATCH_SIZE }, (_, i) => 
    provider.getBlock(startBlock + i, true)
  )
);

// 批量获取交易回执
const receipts = await Promise.all(
  txHashes.map(hash => provider.getTransactionReceipt(hash))
);
```

### 2. 并发控制
```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // 最多5个并发请求
const results = await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

### 3. 地址缓存
```typescript
// Redis 缓存用户地址（5分钟TTL）
const CACHE_KEY = 'deposit:user-addresses';
const CACHE_TTL = 300;

async getUserAddresses() {
  const cached = await redis.get(CACHE_KEY);
  if (cached) return new Set(JSON.parse(cached));
  
  const addresses = await prisma.wallet.findMany({
    select: { address: true }
  });
  
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(addresses));
  return new Set(addresses.map(w => w.address.toLowerCase()));
}
```

### 4. WebSocket 优化（可选）
```typescript
// 使用 WebSocket 代替轮询
const wsProvider = new ethers.WebSocketProvider(
  "wss://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
);

wsProvider.on('block', async (blockNumber) => {
  await processBlock(blockNumber);
});
```

---

## 🛡️ 可靠性保障

### 1. 错误重试
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. 区块重组处理
```typescript
async detectReorg(currentBlock: Block) {
  const saved = await prisma.monitorState.findUnique({
    where: { network: 'arbitrum-sepolia' }
  });
  
  if (saved && currentBlock.parentHash !== saved.lastProcessedHash) {
    // 检测到重组！
    await this.handleReorg(saved.lastProcessedBlock);
  }
}

async handleReorg(lastSafeBlock: bigint) {
  // 1. 标记受影响的充值为 REORGED
  await prisma.pendingDeposit.updateMany({
    where: {
      blockNumber: { gt: lastSafeBlock },
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    data: { status: 'REORGED' }
  });
  
  // 2. 回滚到安全区块
  await prisma.monitorState.update({
    where: { network: 'arbitrum-sepolia' },
    data: { lastProcessedBlock: lastSafeBlock }
  });
}
```

### 3. 心跳监控
```typescript
async updateHeartbeat() {
  await prisma.monitorState.update({
    where: { network: 'arbitrum-sepolia' },
    data: { 
      lastHeartbeat: new Date(),
      isRunning: true
    }
  });
}

// 监控脚本检查心跳（每分钟）
async checkHealth() {
  const state = await prisma.monitorState.findUnique({
    where: { network: 'arbitrum-sepolia' }
  });
  
  const timeSinceHeartbeat = Date.now() - state.lastHeartbeat.getTime();
  if (timeSinceHeartbeat > 60000) {
    // 超过1分钟无心跳，发送告警
    await sendAlert('Deposit monitor service is down!');
  }
}
```

---

## 📊 监控指标

### 关键指标
1. **区块处理延迟**: 当前区块 - 最后处理区块
2. **待确认充值数量**: `PendingDeposit.status = PENDING`
3. **每小时充值笔数**: `Transaction.type = DEPOSIT` (1小时内)
4. **平均确认时间**: 从 `PENDING` 到 `CREDITED` 的平均时长
5. **错误率**: RPC 调用失败次数 / 总调用次数

### 告警阈值
- ⚠️ 区块延迟 > 100 blocks
- ⚠️ 服务无心跳 > 1 分钟
- ⚠️ RPC 错误率 > 10%
- ⚠️ 待确认充值滞留 > 1 小时

---

## 🚀 部署方案

### 方案 A: 单进程（适合测试/小规模）
```bash
# 在 Next.js 项目中启动后台任务
npm run deposit-monitor
```

### 方案 B: 独立服务（推荐生产）
```bash
# 使用 PM2 守护进程
pm2 start ecosystem.config.js

# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'deposit-monitor',
    script: './scripts/deposit-monitor.ts',
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

### 方案 C: Docker 容器
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["npm", "run", "deposit-monitor"]
```

---

## 📈 扩展性考虑

### 1. 多链支持
```typescript
const NETWORKS = {
  'arbitrum-sepolia': { rpc: '...', chainId: 421614 },
  'ethereum-mainnet': { rpc: '...', chainId: 1 },
  'polygon': { rpc: '...', chainId: 137 },
};

// 每个网络独立的监听器实例
for (const [network, config] of Object.entries(NETWORKS)) {
  new BlockMonitor(network, config).start();
}
```

### 2. 负载均衡
```typescript
// 多个 RPC 节点轮询
const RPC_ENDPOINTS = [
  'https://arb-sepolia.g.alchemy.com/v2/KEY1',
  'https://arb-sepolia.g.alchemy.com/v2/KEY2',
  'https://arbitrum-sepolia.infura.io/v3/KEY3',
];

let currentIndex = 0;
function getProvider() {
  const endpoint = RPC_ENDPOINTS[currentIndex];
  currentIndex = (currentIndex + 1) % RPC_ENDPOINTS.length;
  return new ethers.JsonRpcProvider(endpoint);
}
```

---

## 🎯 总结

### 核心优势
✅ **高性能**: 批量处理 + 并发控制 + 地址缓存  
✅ **高可靠**: 断点续传 + 幂等性 + 重组检测  
✅ **可扩展**: 多链支持 + 负载均衡 + 模块化设计  
✅ **易维护**: 清晰架构 + 完善监控 + 详细日志  

### 下一步
1. ✏️ 实现数据库 Schema
2. 🔧 开发核心监听服务
3. 🧪 编写单元测试
4. 📊 搭建监控面板
5. 🚀 部署到生产环境
