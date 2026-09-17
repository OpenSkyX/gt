# 充值监听服务 - 技术方案对比

## 🔄 监听模式对比

### 方案 1: 轮询模式 (Polling) ⭐ 推荐

**原理**: 每隔 N 秒主动查询最新区块

```typescript
setInterval(async () => {
  const latestBlock = await provider.getBlockNumber();
  if (latestBlock > lastProcessed) {
    await processBlocks(lastProcessed + 1, latestBlock);
  }
}, 3000); // 3秒轮询
```

**优势**:
- ✅ 稳定可靠，不会断线
- ✅ 容易实现断点续传
- ✅ 支持批量处理多个区块
- ✅ 更好的错误处理

**劣势**:
- ⚠️ 有轻微延迟（最多 3 秒）
- ⚠️ RPC 调用次数较多

**适用场景**: 
- 生产环境首选
- 需要高可靠性
- Arbitrum Sepolia (区块时间 ~0.25s)

---

### 方案 2: WebSocket 订阅模式

**原理**: 通过 WebSocket 实时推送新区块

```typescript
const wsProvider = new ethers.WebSocketProvider(WS_URL);
wsProvider.on('block', async (blockNumber) => {
  await processBlock(blockNumber);
});
```

**优势**:
- ✅ 实时性最高（零延迟）
- ✅ 减少 RPC 调用

**劣势**:
- ❌ 连接不稳定，容易断线
- ❌ 断点续传复杂
- ❌ 需要额外的重连逻辑
- ❌ Alchemy 免费版限制 WS 连接

**适用场景**:
- 对实时性要求极高（< 1秒）
- 有稳定的 WS 支持

---

### 方案 3: 事件过滤器 (Event Filters)

**原理**: 只监听特定事件（如 USDT Transfer）

```typescript
const filter = {
  address: USDT_ADDRESS,
  topics: [
    ethers.id("Transfer(address,address,uint256)"),
    null, // from
    ethers.zeroPadValue(userAddress, 32) // to
  ]
};

const logs = await provider.getLogs({
  ...filter,
  fromBlock: startBlock,
  toBlock: endBlock
});
```

**优势**:
- ✅ 只获取相关交易，节省资源
- ✅ 适合代币转账监听

**劣势**:
- ❌ 无法监听原生 ETH 转账
- ❌ 需要知道所有用户地址
- ❌ fromBlock/toBlock 范围有限制（通常 10000 blocks）

**适用场景**:
- 纯代币充值（不支持 ETH）
- 用户数量少且固定

---

## 📊 性能对比

| 指标 | 轮询模式 | WebSocket | Event Filter |
|------|---------|-----------|--------------|
| **实时性** | ~3秒 | <1秒 | ~3秒 |
| **稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **资源消耗** | 中 | 低 | 低 |
| **复杂度** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **断点续传** | 简单 | 复杂 | 中等 |
| **错误恢复** | 容易 | 困难 | 容易 |
| **RPC 调用** | 多 | 少 | 少 |

---

## 🏆 推荐架构（混合模式）

**核心策略**: 轮询模式 + Event Filter 结合

```typescript
class DepositMonitor {
  async processBlock(blockNumber: number) {
    // 1. 获取区块
    const block = await provider.getBlock(blockNumber, true);
    
    // 2. 过滤原生 ETH 转账（遍历交易）
    const ethDeposits = await this.filterETHDeposits(block);
    
    // 3. 过滤 USDT 转账（使用 Event Filter）
    const usdtDeposits = await this.filterUSDTDeposits(block);
    
    // 4. 处理所有充值
    await this.processDeposits([...ethDeposits, ...usdtDeposits]);
  }
  
  async filterUSDTDeposits(block: Block) {
    // 使用 Event Filter 只获取 USDT Transfer 事件
    const logs = await provider.getLogs({
      address: USDT_ADDRESS,
      topics: [TRANSFER_TOPIC],
      fromBlock: block.number,
      toBlock: block.number,
    });
    
    // 解析并过滤用户地址
    return logs.filter(log => {
      const to = '0x' + log.topics[2].slice(26);
      return userAddresses.has(to.toLowerCase());
    });
  }
}
```

**优势总结**:
- ✅ 稳定的轮询保证不丢数据
- ✅ Event Filter 减少 ETH 转账遍历
- ✅ 支持 ETH + USDT 双币种
- ✅ 容易扩展到多币种

---

## 🔧 RPC 提供商对比

### Alchemy (推荐)
```
HTTP:  https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
WSS:   wss://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**优势**:
- ✅ 免费版：3M 请求/月
- ✅ 稳定性高
- ✅ 支持 Archive Node（查询历史状态）
- ✅ 提供监控面板

**限制**:
- WebSocket 连接数限制

---

### Infura
```
HTTP:  https://arbitrum-sepolia.infura.io/v3/YOUR_KEY
WSS:   wss://arbitrum-sepolia.infura.io/ws/v3/YOUR_KEY
```

**优势**:
- ✅ 老牌稳定
- ✅ 免费版：100K 请求/天

**限制**:
- 请求数较少

---

### 自建节点 (Geth/Arbitrum Node)

**优势**:
- ✅ 无请求限制
- ✅ 完全控制

**劣势**:
- ❌ 硬件成本高
- ❌ 运维复杂
- ❌ 同步时间长

**建议**: 测试用 Alchemy，生产看规模决定

---

## 💰 成本估算

### 场景：1000 活跃用户，每天 500 笔充值

**Arbitrum Sepolia 参数**:
- 区块时间: ~0.25 秒
- 每天区块数: 86400 / 0.25 = 345,600 blocks

**RPC 调用估算（轮询模式）**:
```
每次轮询:
  - getBlockNumber: 1 次
  - getBlock: 10 次 (批量)
  - getTransactionReceipt: 平均 5 次/区块 (过滤后)
  
每分钟轮询次数: 60 / 3 = 20 次
每天调用次数: 20 * 60 * 24 * (1 + 10 + 5) = 460,800 次

月调用: 460,800 * 30 = 13,824,000 次
```

**结论**: Alchemy 免费版 (3M/月) **不够用**，需要：
1. 升级付费计划（Growth: $49/月，1B 请求）
2. 或优化策略：增加轮询间隔（5秒）+ Event Filter

**优化后**:
```
轮询间隔改为 5 秒:
月调用: 13,824,000 * (3/5) = 8,294,400 次

加上 Event Filter 减少 getTransactionReceipt:
月调用: ~5,000,000 次 (在免费范围内)
```

---

## 🎯 最终推荐方案

### 配置参数

```typescript
export const MONITOR_CONFIG = {
  // 网络配置
  NETWORK: 'arbitrum-sepolia',
  RPC_URL: 'https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY',
  CHAIN_ID: 421614,
  
  // 代币地址
  USDT_ADDRESS: '0x...',  // Arbitrum Sepolia USDT
  
  // 监听配置
  POLL_INTERVAL: 5000,           // 5秒轮询
  BATCH_SIZE: 20,                // 每次处理20个区块
  REQUIRED_CONFIRMATIONS: 6,     // 6个确认
  REORG_SAFETY_DEPTH: 12,        // 重组安全深度
  
  // 性能配置
  MAX_CONCURRENT_REQUESTS: 5,    // 最大并发
  RETRY_ATTEMPTS: 3,             // 重试次数
  RETRY_DELAY: 1000,             // 重试延迟（毫秒）
  
  // 缓存配置
  ADDRESS_CACHE_TTL: 300,        // 地址缓存5分钟
  
  // 监控配置
  HEARTBEAT_INTERVAL: 30000,     // 30秒心跳
  HEALTH_CHECK_INTERVAL: 60000,  // 60秒健康检查
};
```

### 部署建议

**测试环境**:
- 单进程 Node.js
- Alchemy 免费版
- 轮询间隔 5 秒

**生产环境**:
- PM2 守护进程 + 自动重启
- Alchemy Growth 版 或 自建节点
- 轮询间隔 3 秒
- Redis 缓存
- 监控告警（Prometheus + Grafana）

---

## 📝 实现清单

- [ ] 数据库 Schema（PendingDeposit, MonitorState）
- [ ] 核心监听服务
  - [ ] BlockMonitor 类
  - [ ] TransactionFilter 类
  - [ ] DepositProcessor 类
- [ ] 幂等性保证
- [ ] 区块重组处理
- [ ] 错误重试机制
- [ ] 地址缓存
- [ ] 心跳监控
- [ ] 通知服务
- [ ] 单元测试
- [ ] 部署脚本
- [ ] 监控面板

**预计开发时间**: 3-5 天
