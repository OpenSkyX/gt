# 充值监听服务 - 使用指南

## 🚀 快速开始

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# Arbitrum Sepolia RPC 地址（Alchemy）
ARBITRUM_SEPOLIA_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"

# USDT 合约地址（Arbitrum Sepolia 测试网）
# 你需要部署一个 ERC20 测试合约，或使用现有的测试 USDT
USDT_CONTRACT_ADDRESS="0xYourUSDTContractAddress"

# API 加密密钥（64位十六进制）
API_ENCRYPTION_KEY="$(openssl rand -hex 32)"

# 监听服务配置（可选，使用默认值）
MONITOR_POLL_INTERVAL="5000"
MONITOR_BATCH_SIZE="20"
MONITOR_REQUIRED_CONFIRMATIONS="6"
```

### 2. 运行数据库迁移

```bash
# 生成迁移文件
npm run db:migrate

# 查看数据库（可选）
npm run db:studio
```

### 3. 启动监听服务

#### 方式 A: 直接运行（适合测试）

```bash
npm run deposit-monitor
```

输出示例：
```
============================================================
📡 充值监听服务启动
============================================================
网络: arbitrum-sepolia
RPC: https://arb-sepolia.g.alchemy.com/v2/...
USDT 地址: 0x...
轮询间隔: 5000ms
确认数: 6
============================================================
[AddressCache] 刷新完成，监听 10 个地址
[Monitor] 恢复上次处理的区块: 98765432
✅ 监听服务已启动

💡 提示: 按 Ctrl+C 停止服务

[Monitor] 发现 5 个新区块 (98765433 -> 98765437)
[Filter] 区块 98765435 发现 1 笔充值
[Processor] 新充值: 100.0 USDT -> 0x1234abcd... (0x789def...)
[Stats] 待确认: 1, 已确认: 0, 已入账: 2
```

#### 方式 B: 使用 PM2（生产环境推荐）

安装 PM2:
```bash
npm install -g pm2
```

启动服务:
```bash
pm2 start npm --name "deposit-monitor" -- run deposit-monitor
```

PM2 常用命令:
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs deposit-monitor

# 停止服务
pm2 stop deposit-monitor

# 重启服务
pm2 restart deposit-monitor

# 删除服务
pm2 delete deposit-monitor

# 设置开机自启
pm2 startup
pm2 save
```

---

## 📊 监控和调试

### 查看运行状态

使用 Prisma Studio 查看数据库：

```bash
npm run db:studio
```

打开浏览器访问 `http://localhost:5555`，查看：

1. **MonitorState** - 监听服务状态
   - `lastProcessedBlock`: 最后处理的区块
   - `isRunning`: 是否运行中
   - `lastHeartbeat`: 最后心跳时间

2. **PendingDeposit** - 待确认充值
   - `status`: PENDING（待确认）/ CONFIRMED（已确认）/ CREDITED（已入账）
   - `confirmations`: 当前确认数

3. **Transaction** - 已完成的充值记录

### 健康检查脚本

创建 `scripts/health-check.ts`：

```typescript
import { prisma } from "@/lib/prisma";

async function checkHealth() {
  const state = await prisma.monitorState.findUnique({
    where: { network: "arbitrum-sepolia" }
  });

  if (!state) {
    console.log("❌ 监听服务未初始化");
    return;
  }

  const timeSinceHeartbeat = Date.now() - state.lastHeartbeat.getTime();
  const isHealthy = timeSinceHeartbeat < 60000; // 1分钟内有心跳

  console.log("监听服务状态:");
  console.log(`  运行中: ${state.isRunning ? "✅" : "❌"}`);
  console.log(`  最后处理区块: ${state.lastProcessedBlock}`);
  console.log(`  最后心跳: ${Math.floor(timeSinceHeartbeat / 1000)}秒前`);
  console.log(`  健康状态: ${isHealthy ? "✅ 正常" : "❌ 异常"}`);

  const stats = await prisma.pendingDeposit.groupBy({
    by: ["status"],
    _count: true,
  });

  console.log("\n充值统计:");
  for (const stat of stats) {
    console.log(`  ${stat.status}: ${stat._count}`);
  }
}

checkHealth().then(() => process.exit(0));
```

运行:
```bash
tsx scripts/health-check.ts
```

---

## 🧪 测试充值功能

### 1. 获取 Arbitrum Sepolia 测试币

访问水龙头获取测试 ETH：
- https://faucet.quicknode.com/arbitrum/sepolia
- https://arbitrum.faucet.dev/

### 2. 部署 USDT 测试合约（可选）

如果还没有 USDT 合约，可以部署一个简单的 ERC20：

```solidity
// SimpleUSDT.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleUSDT is ERC20 {
    constructor() ERC20("Test USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**6); // 100万 USDT
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDT 使用 6 位小数
    }
}
```

使用 Remix 或 Hardhat 部署到 Arbitrum Sepolia。

### 3. 创建测试用户和钱包

1. 访问你的应用 `http://localhost:3000`
2. 注册一个测试账号
3. 进入"资产"页面，创建钱包
4. 复制钱包地址

### 4. 发送测试充值

使用 MetaMask 或其他钱包：

**ETH 充值**:
```
发送地址: 你的用户钱包地址
金额: 0.01 ETH
网络: Arbitrum Sepolia
```

**USDT 充值**:
```
合约地址: 你的 USDT 合约地址
发送给: 你的用户钱包地址
金额: 100 USDT
```

### 5. 观察监听服务日志

充值后，监听服务应该显示：

```
[Monitor] 发现 1 个新区块 (...)
[Filter] 区块 ... 发现 1 笔充值
[Processor] 新充值: 0.01 ETH -> 0x1234... (0x789d...)
[Stats] 待确认: 1, 已确认: 0, 已入账: 0
```

等待 6 个确认（约 1.5 秒）后：

```
[Processor] ✅ 充值入账: 0.01 ETH -> 用户 cm...
```

### 6. 检查用户余额

在应用中查看用户余额是否增加。

---

## 🔧 常见问题

### Q1: 服务启动失败 "配置错误"

**原因**: 环境变量未配置或无效

**解决**:
1. 检查 `.env` 文件是否存在
2. 确认 `ARBITRUM_SEPOLIA_RPC_URL` 和 `USDT_CONTRACT_ADDRESS` 已填写
3. 运行 `tsx -e "import { validateConfig } from './lib/deposit-monitor/config'; console.log(validateConfig())"`

### Q2: 监听服务无反应

**原因**: 可能没有新区块或用户地址不在监听列表

**解决**:
1. 查看日志中的"监听 X 个地址"
2. 确认用户已创建钱包
3. 手动刷新地址缓存（重启服务）

### Q3: 充值未被检测到

**原因**:
1. 地址不在监听列表
2. RPC 延迟
3. 网络错误

**解决**:
1. 在 Prisma Studio 检查 `Wallet` 表，确认地址存在
2. 检查 RPC 连接是否正常
3. 查看监听服务日志中的错误

### Q4: 充值一直是 PENDING 状态

**原因**: 确认数未达到 6

**解决**: 等待更多区块确认（Arbitrum Sepolia 约 1.5 秒）

### Q5: 新注册的用户充值未被监听

**原因**: 地址缓存未更新

**解决**:
- 默认每 5 分钟自动刷新
- 或重启监听服务
- 或代码已实现动态订阅（创建钱包时自动添加）

---

## 📈 性能优化建议

### 1. 使用 Redis 缓存地址

修改 `AddressCache.ts` 使用 Redis 而不是内存缓存，支持多实例部署。

### 2. 增加 RPC 节点

配置多个 RPC 节点轮询，提高可用性：

```typescript
const RPC_ENDPOINTS = [
  process.env.ARBITRUM_SEPOLIA_RPC_URL_1,
  process.env.ARBITRUM_SEPOLIA_RPC_URL_2,
  process.env.ARBITRUM_SEPOLIA_RPC_URL_3,
];
```

### 3. 监控告警

使用 Prometheus + Grafana 监控：
- 区块处理延迟
- 待确认充值数量
- RPC 调用错误率
- 服务心跳

---

## 🚀 部署到生产环境

### 使用 Docker

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run postinstall

CMD ["npm", "run", "deposit-monitor"]
```

构建和运行:

```bash
docker build -t deposit-monitor .
docker run -d --name deposit-monitor --env-file .env deposit-monitor
```

### 使用 PM2 Ecosystem

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'deposit-monitor',
    script: 'npm',
    args: 'run deposit-monitor',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

启动:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📝 下一步扩展

- [ ] WebSocket 实时推送给前端
- [ ] 邮件/短信通知
- [ ] 支持更多代币（DAI、USDC）
- [ ] 多链支持（Ethereum、Polygon）
- [ ] Grafana 监控面板
- [ ] 自动化测试
