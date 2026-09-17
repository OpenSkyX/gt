# XMX 平台交易所 ID 映射

## 重要说明

本系统使用两套独立的交易所ID体系：

### 1. 本地数据库 ID（ExchangeType.id）
用于本地数据库的主键标识，定义在 `prisma/seed.ts`

| 交易所类型 | 本地数据库 ID | 交易所代码 |
|-----------|--------------|-----------|
| Gate.io 永续合约 | 1 | `gate` |
| 币安永续合约 | 2 | `binance` |

### 2. XMX 平台 ID
由第三方量化平台（XMX）系统定义，**不可修改**，用于与XMX平台API交互

| 交易所类型 | XMX 平台 ID | 代码常量 |
|-----------|------------|----------|
| Gate.io 永续合约 | 2 | `EXCHANGE_ID_MAP.GATE_PERPETUAL` |
| 币安永续合约 | 4 | `EXCHANGE_ID_MAP.BINANCE_PERPETUAL` |

## ID 映射流程

当用户绑定交易所API时：

1. 用户在前端选择交易所类型（通过 `exchangeCode`：`gate` 或 `binance`）
2. 本地数据库根据 `exchangeCode` 查找对应的 `ExchangeType`（本地ID）
3. 调用 XMX API 时，通过 `exchangeIdMap` 将 `exchangeCode` 映射到 XMX 平台 ID
4. XMX 平台返回交易所配置ID，存储到 `ExchangeApiKey.xmxAssociationId`

## 使用示例

```typescript
import { EXCHANGE_ID_MAP } from "@/lib/xmx/client";

// 生成 label（格式：手机号_随机数）
const randomSuffix = Math.floor(100000 + Math.random() * 900000);
const label = `${userPhone}_${randomSuffix}`; // 例如: 13800138000_123456

// 添加 Gate.io 永续合约交易所
const result = await xmxClient.addExchange({
  exchangeId: EXCHANGE_ID_MAP.GATE_PERPETUAL, // 2
  accessKey: "your-api-key",
  secretKey: "your-api-secret",
  remark: label, // 传入 remark 参数，内部会作为 label 发送给 XMX API
});

// 添加币安永续合约交易所
const result = await xmxClient.addExchange({
  exchangeId: EXCHANGE_ID_MAP.BINANCE_PERPETUAL, // 4
  accessKey: "your-api-key",
  secretKey: "your-api-secret",
  remark: label, // 传入 remark 参数，内部会作为 label 发送给 XMX API
});
```

## 重要说明

**参数映射**: 
- 在调用 `addExchange()` 时，使用 `remark` 参数传入标签值
- 内部实现会自动将 `remark` 映射为 `label` 字段发送给 XMX API
- 这样设计是为了保持接口语义的清晰性

## Label 格式说明

系统自动生成的 `remark`（label）格式为：**`手机号_随机数`**

- **手机号**：用户的注册手机号
- **随机数**：6位随机数字（100000-999999）
- **示例**：`13800138000_567890`

这种格式便于：
- 在 XMX 平台识别用户
- 避免重复（通过随机数）
- 快速关联用户账户

## 相关文件

- `lib/xmx/client.ts` - XMX 客户端和交易所 ID 常量定义
- `app/actions/exchange.ts` - 交易所 API 操作，包含本地交易所代码到 XMX ID 的映射

## 未来扩展

如果需要支持更多交易所类型，请：

1. 先从第三方平台获取对应的交易所 ID
2. 在 `lib/xmx/client.ts` 中的 `EXCHANGE_ID_MAP` 添加新的常量
3. 在 `app/actions/exchange.ts` 中的 `exchangeIdMap` 添加映射关系
4. 更新本文档
