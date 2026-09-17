# 充值监听服务 - 集成模式

## 📋 概述

充值监听服务已集成到 Next.js 应用中，**随应用自动启动**，无需单独运行。

---

## 🚀 启动方式

### 开发环境

```bash
npm run dev
```

监听服务会自动启动，你会看到类似这样的日志：

```
[DepositMonitor] 正在启动充值监听服务...
============================================================
📡 充值监听服务启动
============================================================
网络: arbitrum-sepolia
RPC: https://arb-sepolia.g.alchemy.com/v2/...
USDT 地址: 0x...
轮询间隔: 5000ms
确认数: 6
============================================================
[AddressCache] 刷新完成，监听 2 个地址
[Monitor] 恢复上次处理的区块: 0
✅ 监听服务已启动
[DepositMonitor] ✅ 充值监听服务已启动
```

### 生产环境

```bash
npm run build
npm start
```

监听服务同样会自动随应用启动。

---

## 📊 监控和管理

### 1. 查看服务状态（API）

```bash
curl http://localhost:3000/api/deposit-monitor
```

响应示例：
```json
{
  "success": true,
  "data": {
    "running": true,
    "state": {
      "network": "arbitrum-sepolia",
      "lastProcessedBlock": "98765432",
      "lastProcessedHash": "0x...",
      "isRunning": true,
      "lastHeartbeat": "2024-09-15T05:27:00.000Z",
      "heartbeatAge": 15234
    },
    "statistics": {
      "pending": 2,
      "confirmed": 0,
      "credited": 15,
      "total": 17
    }
  }
}
```

### 2. 手动控制服务

**停止服务**：
```bash
curl -X POST http://localhost:3000/api/deposit-monitor \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

**启动服务**：
```bash
curl -X POST http://localhost:3000/api/deposit-monitor \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### 3. 查看数据库状态

使用 Prisma Studio：
```bash
npm run db:studio
```

查看表：
- **MonitorState** - 监听状态
- **PendingDeposit** - 待确认充值

---

## 🔧 工作原理

### 启动流程

```
Next.js 应用启动
       │
       ▼
instrumentation.ts (register 函数)
       │
       ▼
lib/deposit-monitor/service.ts (startDepositMonitor)
       │
       ├─> 验证配置（RPC、USDT地址）
       ├─> 创建 BlockMonitor 实例
       └─> 启动监听服务
              │
              ├─> 恢复上次区块高度
              ├─> 刷新地址缓存
              ├─> 启动轮询（每5秒）
              └─> 启动心跳（每30秒）
```

### 单例保证

服务使用单例模式，即使多次调用 `startDepositMonitor()`，也只会启动一次。

### 优雅退出

当 Next.js 应用收到 `SIGTERM` 或 `SIGINT` 信号时：
1. 监听服务自动停止
2. 保存最后处理的区块高度
3. 更新数据库状态

---

## 🧪 测试充值功能

### 1. 创建测试用户

```bash
# 访问应用
open http://localhost:3000

# 注册账号 -> 创建钱包 -> 复制钱包地址
```

### 2. 发送测试充值

使用 MetaMask 或其他钱包向用户地址发送：
- **ETH**: 0.01 ETH
- **USDT**: 100 USDT（需要先有 USDT 合约）

### 3. 观察日志

在 Next.js 控制台中，你会看到：

```
[Monitor] 发现 1 个新区块 (98765433 -> 98765433)
[Filter] 区块 98765433 发现 1 笔充值
[Processor] 新充值: 0.01 ETH -> 0x1234abcd... (0x789def...)
[Stats] 待确认: 1, 已确认: 0, 已入账: 0
```

等待 6 个确认后（约 1.5 秒）：

```
[Processor] ✅ 充值入账: 0.01 ETH -> 用户 cm...
```

### 4. 检查用户余额

刷新应用，查看用户余额是否增加。

---

## ⚙️ 配置管理

### 环境变量

所有配置都在 `.env` 文件中：

```bash
# 必需配置
ARBITRUM_SEPOLIA_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
USDT_CONTRACT_ADDRESS="0xYourUSDTAddress"

# 可选配置（使用默认值）
MONITOR_POLL_INTERVAL="5000"           # 轮询间隔（毫秒）
MONITOR_BATCH_SIZE="20"                # 每批处理的区块数
MONITOR_REQUIRED_CONFIRMATIONS="6"     # 需要的确认数
MONITOR_REORG_SAFETY_DEPTH="12"        # 重组安全深度
```

### 配置不完整时

如果配置不完整，服务**不会启动**，但不会影响应用本身：

```
[DepositMonitor] 配置不完整，服务未启动:
  - ARBITRUM_SEPOLIA_RPC_URL 未配置
  - USDT_CONTRACT_ADDRESS 未配置或无效
[DepositMonitor] 请检查 .env 文件中的配置
```

应用仍然可以正常运行，只是充值监听功能不可用。

---

## 🔍 故障排查

### 服务未启动

**检查日志**：
```bash
# 开发环境日志会直接显示在终端
npm run dev
```

**常见原因**：
1. 配置不完整（检查 `.env`）
2. 数据库连接失败
3. RPC 地址无效

### 充值未被检测

**检查步骤**：

1. **确认服务运行中**：
   ```bash
   curl http://localhost:3000/api/deposit-monitor
   ```

2. **查看地址缓存**：
   - 检查 `Wallet` 表中是否有该用户的钱包
   - 服务每 5 分钟自动刷新地址缓存

3. **查看监听日志**：
   - 是否有 "发现 X 个新区块" 的日志
   - 是否有过滤到充值的日志

4. **检查交易**：
   - 在区块浏览器确认交易已上链
   - 确认转账到了正确的地址

### 服务频繁重启

**可能原因**：
1. RPC 节点不稳定（更换 RPC）
2. 网络问题（检查网络连接）
3. 代码错误（查看错误日志）

---

## 📈 性能监控

### 关键指标

1. **区块处理延迟**
   ```sql
   SELECT 
     (SELECT MAX(number) FROM pg_stat_activity) - "lastProcessedBlock" as delay
   FROM "MonitorState" 
   WHERE network = 'arbitrum-sepolia';
   ```

2. **待确认充值数量**
   ```sql
   SELECT COUNT(*) FROM "PendingDeposit" WHERE status = 'PENDING';
   ```

3. **心跳健康**
   ```sql
   SELECT 
     "lastHeartbeat",
     NOW() - "lastHeartbeat" as age
   FROM "MonitorState" 
   WHERE network = 'arbitrum-sepolia';
   ```

### 告警阈值

- ⚠️ 心跳超过 1 分钟 → 服务可能挂了
- ⚠️ 区块延迟 > 100 → 处理速度跟不上
- ⚠️ 待确认充值 > 50 → 可能有问题

---

## 🚀 生产部署建议

### 1. 使用专用 RPC

```bash
# 不要使用免费的公共 RPC
# 建议使用 Alchemy Growth 版或自建节点
ARBITRUM_SEPOLIA_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/PRODUCTION_KEY"
```

### 2. 监控和告警

使用 Prometheus + Grafana 监控：
- 区块处理速度
- 待确认充值数量
- RPC 调用错误率
- 服务心跳

### 3. 日志管理

使用 Winston 或 Pino 替换 `console.log`：

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'deposit-monitor.log' }),
  ],
});
```

### 4. 错误通知

集成 Sentry 或其他错误追踪服务：

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await processBlock(blockNumber);
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

---

## 📝 与独立运行的对比

| 特性 | 集成模式（当前） | 独立运行 |
|------|----------------|---------|
| **启动方式** | 随 Next.js 自动启动 | 需要单独运行 `npm run deposit-monitor` |
| **进程管理** | Next.js 管理 | 需要 PM2 等工具 |
| **资源共享** | 共享数据库连接池 | 独立连接 |
| **部署复杂度** | 简单（一个应用） | 需要管理多个进程 |
| **隔离性** | 低（共享内存） | 高（独立进程） |
| **适用场景** | 中小规模 | 大规模/高负载 |

**建议**：
- **开发/测试**: 使用集成模式
- **中小规模生产**: 使用集成模式
- **大规模生产**: 考虑独立运行（更好的隔离和扩展性）

---

## 🎯 下一步

- [ ] 测试充值功能
- [ ] 部署 USDT 测试合约
- [ ] 配置生产环境 RPC
- [ ] 添加 WebSocket 实时推送
- [ ] 集成邮件/短信通知
- [ ] 搭建监控面板
