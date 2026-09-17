# 充值监听服务 - 混合模式

## 🚀 混合模式架构

**最佳实践**：轮询追赶 + WebSocket 实时，既省 RPC 又低延迟！

```
启动服务
   │
   ▼
检查区块落后情况
   │
   ├─> 落后 > 5 个区块 ────> 轮询模式
   │                        │
   │                        ├─> 批量处理区块
   │                        ├─> 每批最多 10 个（避免速率限制）
   │                        ├─> 最多 3 个并发请求
   │                        │
   │                        └─> 追赶到最新
   │                            ↓
   │                        切换到 WebSocket ───┐
   │                                           │
   └─> 落后 ≤ 5 个区块 ────> WebSocket 模式  ←─┘
                              │
                              ├─> 实时监听新区块
                              ├─> 零延迟处理充值
                              │
                              └─> 断线? ──> 自动降级到轮询
                                            └─> 定时尝试重连
```

---

## ⚡ 核心优势

### 1. 省 RPC 积分

| 场景 | 纯轮询 | 纯 WebSocket | 混合模式 |
|------|--------|-------------|---------|
| **追赶历史** | ❌ 大量请求 | ❌ 无法回溯 | ✅ 批量处理 |
| **实时监听** | ❌ 持续轮询 | ✅ 零请求 | ✅ 零请求 |
| **断线恢复** | ✅ 自动恢复 | ❌ 需要重连 | ✅ 自动降级 |
| **RPC 消耗** | 🔴 高 | 🟢 低 | 🟢 低 |

### 2. 低延迟

- **WebSocket 模式**: 新区块通知延迟 <0.5 秒
- **轮询模式**: 仅在追赶时使用，完成后立即切换

### 3. 高可靠

- **自动降级**: WebSocket 断线自动切换到轮询
- **自动重连**: 每 5 秒尝试重连，最多 10 次
- **速率保护**: 批量大小限制 + 并发控制 + 重试机制

---

## 🔧 配置参数

### 环境变量 (.env)

```bash
# RPC 地址（自动转换为 WSS）
ARBITRUM_SEPOLIA_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
# WSS 自动生成: wss://arb-sepolia.g.alchemy.com/v2/ws/YOUR_KEY

# USDT 合约地址
USDT_CONTRACT_ADDRESS="0xYourUSDTAddress"

# 性能调优（可选）
MONITOR_POLL_INTERVAL="5000"           # 轮询间隔（毫秒），仅在追赶时使用
MONITOR_BATCH_SIZE="10"                # 每批处理的区块数
MONITOR_REQUIRED_CONFIRMATIONS="6"     # 需要的确认数
```

### 代码配置 (config.ts)

```typescript
// WebSocket 配置
CATCHUP_THRESHOLD: 5,          // 落后超过 5 个区块时用轮询追赶
WS_RECONNECT_DELAY: 5000,      // 重连延迟 5 秒
WS_MAX_RECONNECT_ATTEMPTS: 10, // 最多重连 10 次

// 性能配置
MAX_CONCURRENT_REQUESTS: 3,    // 最多 3 个并发请求（避免速率限制）
RETRY_ATTEMPTS: 3,             // 遇到 429 错误重试 3 次
RETRY_DELAY: 1000,             // 重试延迟 1 秒，指数退避
```

---

## 📊 工作流程详解

### 场景 1: 首次启动（追赶模式）

```
[Monitor] 当前区块: 0, 最新区块: 100000, 落后: 100000
[Monitor] 🏃 落后 100000 个区块，使用轮询模式追赶

[Monitor] 📦 轮询: 1 -> 10 (落后 99990)
[Monitor] 📦 轮询: 11 -> 20 (落后 99980)
...
[Monitor] 📦 轮询: 99991 -> 100000 (落后 0)
[Monitor] ✅ 追赶完成，切换到 WebSocket 模式
[Monitor] ⚡ WebSocket 已连接，实时监听中...
```

**说明**: 每批最多 10 个区块，最多 3 个并发，避免速率限制

### 场景 2: 实时监听（WebSocket 模式）

```
[Monitor] ⚡ 新区块: 100001
[Filter] 区块 100001 发现 1 笔充值
[Processor] 新充值: 100.0 USDT -> 0x1234...

[Monitor] ⚡ 新区块: 100002
(无充值)

[Monitor] ⚡ 新区块: 100007
[Processor] ✅ 充值入账: 100.0 USDT (6 个确认)
```

**说明**: 实时处理，零 RPC 消耗（除了查询交易详情）

### 场景 3: WebSocket 断线（自动降级）

```
[Monitor] ⚠️  WebSocket 断线，降级到轮询模式
[Monitor] 📦 轮询: 100002 -> 100005 (落后 3)
[Monitor] 将在 5 秒后尝试重连 WebSocket (1/10)

(5 秒后)
[Monitor] ✅ 追赶完成，切换到 WebSocket 模式
[Monitor] ⚡ WebSocket 已连接，实时监听中...
```

**说明**: 断线期间用轮询保证不丢数据，重连后恢复实时监听

### 场景 4: 速率限制（自动重试）

```
[Monitor] 轮询: 100 -> 110
[Monitor] 速率限制，2 秒后重试 (1/3)
(等待 2 秒)
[Monitor] 速率限制，4 秒后重试 (2/3)
(等待 4 秒)
✅ 请求成功
```

**说明**: 遇到 429 错误自动重试，指数退避

---

## 🧪 测试验证

### 1. 启动服务

```bash
npm run dev
```

### 2. 观察日志

**首次启动（追赶）**:
```
[Monitor] 🎯 首次启动，从当前区块开始: 310458652
[Monitor] 当前区块: 310458652, 最新区块: 310458652, 落后: 0
[Monitor] ⚡ 已追赶到最新，切换到 WebSocket 模式
[Monitor] ⚡ WebSocket 已连接，实时监听中...
```

**实时监听**:
```
[Monitor] ⚡ 新区块: 310458653
[Monitor] ⚡ 新区块: 310458654
[Filter] 区块 310458654 发现 1 笔充值
[Processor] 新充值: 0.01 ETH -> 0x1234abcd...
```

### 3. 查看状态

```bash
curl http://localhost:3000/api/deposit-monitor | jq
```

响应：
```json
{
  "success": true,
  "data": {
    "running": true,
    "state": {
      "network": "arbitrum-sepolia",
      "lastProcessedBlock": "310458654",
      "isRunning": true,
      "lastHeartbeat": "2024-09-15T05:45:00.000Z",
      "heartbeatAge": 1234
    },
    "statistics": {
      "pending": 1,
      "confirmed": 0,
      "credited": 0
    }
  }
}
```

---

## 🔍 性能对比

### RPC 调用次数（1 小时）

假设：
- 区块时间: 0.25 秒
- 每小时新区块: 14400 个
- 每个区块平均 5 笔交易

| 模式 | getBlockNumber | getBlock | 总调用 |
|------|---------------|----------|-------|
| **纯轮询（每 5 秒）** | 720 | 14400 | ~15000 |
| **纯 WebSocket** | 0 | 0 | ~0 |
| **混合模式** | 0 | 0 | ~0 |

**结论**: 追赶完成后，混合模式 = WebSocket 性能！

### 延迟对比

| 模式 | 检测延迟 | 入账延迟 |
|------|---------|---------|
| **纯轮询（5秒）** | 0-5 秒 | 6 确认 + 0-5 秒 |
| **WebSocket** | <0.5 秒 | 6 确认 + <0.5 秒 |
| **混合模式** | <0.5 秒 | 6 确认 + <0.5 秒 |

**结论**: 混合模式延迟 = WebSocket 延迟！

---

## ⚙️ 故障排查

### 问题 1: 一直处于轮询模式

**症状**:
```
[Monitor] 📦 轮询: 100 -> 110 (落后 90)
[Monitor] 📦 轮询: 111 -> 120 (落后 80)
(一直轮询，不切换到 WebSocket)
```

**原因**:
- 速率限制导致追赶速度慢于新区块产生速度
- WebSocket 连接失败

**解决**:
1. 检查 RPC 配额是否充足
2. 降低 `BATCH_SIZE` (如 5)
3. 降低 `MAX_CONCURRENT_REQUESTS` (如 2)
4. 检查 WSS URL 是否正确

### 问题 2: WebSocket 频繁断线

**症状**:
```
[Monitor] ⚠️  WebSocket 断线，降级到轮询模式
[Monitor] 将在 5 秒后尝试重连 WebSocket (1/10)
(反复重连)
```

**原因**:
- 网络不稳定
- Alchemy WebSocket 连接限制

**解决**:
1. 检查网络连接
2. 升级 Alchemy 计划（Growth 版有更多 WS 连接）
3. 增加 `WS_RECONNECT_DELAY` (如 10 秒)

### 问题 3: 速率限制错误

**症状**:
```
[Monitor] 速率限制，2 秒后重试 (1/3)
[Monitor] 速率限制，4 秒后重试 (2/3)
[Monitor] 速率限制，8 秒后重试 (3/3)
❌ 轮询失败: Error: 429
```

**原因**:
- 并发请求过多
- 批量大小过大

**解决**:
1. 降低 `MAX_CONCURRENT_REQUESTS` 为 2
2. 降低 `BATCH_SIZE` 为 5
3. 增加 `POLL_INTERVAL` 为 10000 (10 秒)

---

## 📈 监控指标

### 关键指标

```sql
-- 当前模式（从日志推断）
-- 如果 lastProcessedBlock 每次轮询都更新 10 个 = 轮询模式
-- 如果 lastProcessedBlock 每次只更新 1 个 = WebSocket 模式

-- 心跳健康
SELECT 
  NOW() - "lastHeartbeat" as age,
  "isRunning",
  "lastProcessedBlock"
FROM "MonitorState" 
WHERE network = 'arbitrum-sepolia';

-- 待确认充值
SELECT status, COUNT(*) 
FROM "PendingDeposit" 
GROUP BY status;
```

---

## 🎯 总结

### 混合模式特点

✅ **省 RPC**: 追赶后零轮询，只靠 WebSocket  
✅ **低延迟**: <0.5 秒检测新充值  
✅ **高可靠**: 断线自动降级，不丢数据  
✅ **自适应**: 根据落后情况自动切换模式  

### 适用场景

- ✅ **开发/测试**: 完美
- ✅ **中小规模生产**: 推荐
- ✅ **大规模生产**: 需要配合 Growth/Enterprise 计划

### 与纯轮询/纯 WebSocket 对比

| 特性 | 纯轮询 | 纯 WebSocket | 混合模式 ⭐ |
|------|--------|-------------|-----------|
| RPC 消耗 | 🔴 高 | 🟢 低 | 🟢 低 |
| 延迟 | 🟡 5秒 | 🟢 <0.5秒 | 🟢 <0.5秒 |
| 可靠性 | 🟢 高 | 🟡 中 | 🟢 高 |
| 断点续传 | 🟢 简单 | 🔴 复杂 | 🟢 简单 |
| 速率限制 | 🔴 容易触发 | 🟢 不会 | 🟡 追赶时可能 |

---

**推荐**: 生产环境使用混合模式 + Alchemy Growth 计划！
