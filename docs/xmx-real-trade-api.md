# XMX 实盘管理 API 使用文档

## 已封装的接口

### 1. 查询策略详情
```typescript
async getStrategyDetail(strategyId: number): Promise<XmxApiResponse<StrategyDetail>>
```

**用途**：获取策略的详细信息，包括策略参数

**返回**：
```typescript
{
  code: 200,
  message: "查询成功",
  data: {
    id: 198,
    strategyName: "高频策略",
    userId: 100,
    type: 0,
    language: 0,
    params: "{\"riskLevel\":\"medium\"}",  // JSON字符串格式
    isPublic: 0
  }
}
```

---

### 2. 查询在线托管者
```typescript
async getOnlineCustodians(): Promise<XmxApiResponse<OnlineCustodians>>
```

**用途**：获取所有在线托管者列表

**返回**：
```typescript
{
  code: 200,
  message: "查询成功",
  data: {
    total: 3,
    online: 2,
    custodians: [
      {
        id: 1,
        custodianId: "custodian_abc",
        hostname: "server-01",
        ipAddress: "192.168.1.100",
        status: "online",
        totalRealTrades: 10,
        runningRealTrades: 3  // ✅ 运行中的实盘数量
      }
    ]
  }
}
```

---

### 3. 自动选择托管者
```typescript
async selectCustodian(): Promise<number | null>
```

**用途**：自动选择合适的托管者

**规则**：
- ✅ 只选择在线状态的托管者
- ✅ 只选择运行实盘数量 ≤ 5 个的托管者
- ✅ 优先选择运行实盘数量最少的托管者

**返回**：托管者ID，如果没有可用托管者则返回 null

---

### 4. 创建实盘
```typescript
async createRealTrade(params: CreateRealTradeParams): Promise<XmxApiResponse<RealTradeInfo>>
```

**参数**：
```typescript
{
  name: string;              // 实盘名称（建议格式：策略名称 + 用户名称）
  strategyId: number;        // 策略ID（本地策略的 thirdPartyStrategyId）
  custodianId: number;       // 托管者ID（从 selectCustodian() 获取）
  groupId?: number;          // 分组ID，默认 1
  klinePeriod?: string;      // K线周期，默认 "1m"
  userExchangeIdList: number[];  // 交易所ID列表（本地交易所的 xmxAssociationId）
  tradingPairList: string[]; // 交易对列表，默认 ["BTC_USDT"]
  params?: string;           // 策略参数（从 getStrategyDetail 获取）
  status?: string;           // 初始状态，默认 "INIT"
  isPublic?: number;         // 是否公开，默认 0
}
```

**返回**：
```typescript
{
  code: 200,
  message: "创建成功",
  data: {
    id: 789,
    name: "高频策略-张三",
    status: "INIT"
  }
}
```

---

### 5. 重启/暂停/停止实盘
```typescript
async restartRealTrade(realTradeId: number): Promise<XmxApiResponse<string>>
async pauseRealTrade(realTradeId: number): Promise<XmxApiResponse<string>>
async stopRealTrade(realTradeId: number): Promise<XmxApiResponse<string>>
```

**用途**：控制实盘运行状态

---

## 完整使用示例

### 场景：用户启动高频策略实盘

```typescript
import { getXmxClient } from "@/lib/xmx/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function startQuantRun(strategyId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("未登录");

  const xmx = getXmxClient();

  // 1. 获取本地策略信息
  const strategy = await prisma.quantStrategy.findUnique({
    where: { id: strategyId },
  });
  
  if (!strategy || !strategy.thirdPartyStrategyId) {
    throw new Error("策略不存在或未配置第三方策略ID");
  }

  // 2. 查询策略详情（获取策略参数）
  const strategyDetail = await xmx.getStrategyDetail(
    Number(strategy.thirdPartyStrategyId)
  );

  if (strategyDetail.code !== 200) {
    throw new Error("查询策略详情失败: " + strategyDetail.message);
  }

  // 3. 自动选择托管者
  const custodianId = await xmx.selectCustodian();
  if (!custodianId) {
    throw new Error("没有可用的托管者");
  }

  // 4. 获取用户的交易所配置
  const userExchange = await prisma.exchangeApiKey.findUnique({
    where: { userId: user.id },
  });

  if (!userExchange || !userExchange.xmxAssociationId) {
    throw new Error("请先配置交易所API");
  }

  // 5. 创建实盘
  const realTradeResult = await xmx.createRealTrade({
    name: `${strategy.name}-${user.userName}`,  // 实盘名称
    strategyId: Number(strategy.thirdPartyStrategyId),  // 第三方策略ID
    custodianId: custodianId,  // 托管者ID
    groupId: 1,  // 默认分组
    klinePeriod: "1m",  // K线周期
    userExchangeIdList: [Number(userExchange.xmxAssociationId)],  // 交易所ID
    tradingPairList: ["BTC_USDT"],  // 默认交易对
    params: strategyDetail.data?.params || "{}",  // 策略参数
  });

  if (realTradeResult.code !== 200) {
    throw new Error("创建实盘失败: " + realTradeResult.message);
  }

  // 6. 保存实盘信息到本地数据库
  const quantRun = await prisma.quantRun.create({
    data: {
      userId: user.id,
      strategyId: strategyId,
      thirdPartyRunId: String(realTradeResult.data!.id),
      thirdPartyStrategyId: strategy.thirdPartyStrategyId,
      status: "RUNNING",
      initialBalance: 10000,  // 根据实际情况设置
      currentBalance: 10000,
      maxDrawdown: 10,
    },
  });

  return {
    success: true,
    data: {
      localRunId: quantRun.id,
      xmxRunId: realTradeResult.data!.id,
      name: realTradeResult.data!.name,
    },
  };
}
```

---

## 数据流程图

```
用户启动策略
    ↓
查询本地策略 (QuantStrategy)
    ↓ (获取 thirdPartyStrategyId)
查询XMX策略详情 (ManageStrategy)
    ↓ (获取策略参数 params)
查询在线托管者 (ManageCustodian)
    ↓ (选择 runningRealTrades ≤ 5 的托管者)
查询用户交易所配置 (ExchangeApiKey)
    ↓ (获取 xmxAssociationId)
创建XMX实盘 (ManageRealTrade)
    ↓ (获取 realTradeId)
保存到本地数据库 (QuantRun)
    ↓
返回结果给用户
```

---

## 字段映射关系

| 本地字段 | XMX字段 | 说明 |
|---------|---------|------|
| `QuantStrategy.thirdPartyStrategyId` | `strategyId` | 策略ID（如：198） |
| `ExchangeApiKey.xmxAssociationId` | `userExchangeIdList[0]` | 交易所配置ID |
| `QuantStrategy.name + User.userName` | `name` | 实盘名称 |
| 默认值: 1 | `groupId` | 分组ID |
| 默认值: ["BTC_USDT"] | `tradingPairList` | 交易对列表 |
| 从策略详情获取 | `params` | 策略参数（JSON字符串） |

---

## 注意事项

1. **策略ID**：必须使用本地策略的 `thirdPartyStrategyId` 字段（如：198）
2. **交易所ID**：必须使用本地交易所配置的 `xmxAssociationId` 字段
3. **托管者选择**：自动选择运行实盘数量 ≤ 5 的在线托管者
4. **策略参数**：从 `getStrategyDetail` 接口获取，而不是硬编码
5. **实盘名称**：建议格式为"策略名称-用户名称"
6. **K线周期**：支持 1m, 15s, 1H, 1D 等
7. **交易对**：默认使用 ["BTC_USDT"]，可根据需要调整

---

## 错误处理

```typescript
try {
  const result = await xmx.createRealTrade(params);
  
  if (result.code !== 200) {
    console.error("创建失败:", result.message);
    // 处理错误
  } else {
    console.log("创建成功:", result.data);
    // 处理成功
  }
} catch (error) {
  console.error("网络错误:", error);
  // 处理网络异常
}
```

---

## 相关文件

- `lib/xmx/client.ts` - XMX API 客户端
- `app/actions/quant.ts` - 量化策略相关 Server Action
- `prisma/schema.prisma` - 数据库模型定义
- `docs/xmx-exchange-ids.md` - 交易所ID映射文档
