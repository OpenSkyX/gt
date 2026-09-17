# XMX 平台 API 集成

## 📋 概述

XMX 是第三方量化交易平台，本模块封装了与 XMX 平台交互的所有 API。

**Host**: `https://api.xmx.finance`

---

## 🚀 快速开始

### 1. 配置环境变量

在 `.env` 文件中添加：

```bash
XMX_ACCESS_KEY="xmx_Vv9n8D7dL35Owd8M"
XMX_SECRET_KEY="b2BxAWkSqAx9yS4ti4sG1TdjETweJpv9"
```

### 2. 使用 XMX 客户端

```typescript
import { getXmxClient, EXCHANGE_ID_MAP } from "@/lib/xmx/client";

const xmx = getXmxClient();
```

---

## 📖 API 列表

### 1. 添加交易所

将用户的交易所 API 添加到 XMX 平台：

```typescript
const result = await xmx.addExchange({
  exchangeId: EXCHANGE_ID_MAP.GATE, // Gate.io
  accessKey: "user_gate_api_key",
  secretKey: "user_gate_api_secret",
  passphrase: "user_passphrase", // OKX 需要
  remark: "用户的 Gate.io 永续合约账户",
});

console.log("交易所配置 ID:", result.data.id);
```

**参数说明**:
- `exchangeId`: 交易所 ID（见下方映射表）
- `accessKey`: 用户的交易所 API Key
- `secretKey`: 用户的交易所 API Secret
- `passphrase`: API 密钥口令（OKX 必需，其他可选）
- `remark`: 备注说明

**返回值**:
```json
{
  "code": 200,
  "message": "交易所配置添加成功",
  "data": {
    "id": 123
  }
}
```

---

### 2. 删除交易所

从 XMX 平台删除交易所配置：

```typescript
await xmx.deleteExchange(123); // 交易所配置 ID
```

**返回值**:
```json
{
  "code": 200,
  "message": "成功",
  "data": "交易所配置删除成功"
}
```

---

> **注**: 其他 API（创建实盘、停止实盘、查询状态等）待后续集成

---

## 🔑 交易所 ID 映射

| 交易所   | ID  | 常量                    |
|---------|-----|------------------------|
| Binance | 1   | `EXCHANGE_ID_MAP.BINANCE` |
| OKX     | 2   | `EXCHANGE_ID_MAP.OKX`     |
| Bybit   | 3   | `EXCHANGE_ID_MAP.BYBIT`   |
| Gate.io | 4   | `EXCHANGE_ID_MAP.GATE`    |
| Bitget  | 5   | `EXCHANGE_ID_MAP.BITGET`  |

---

## 💡 完整示例

### 用户授权交易所 API 的流程

```typescript
import { getXmxClient, EXCHANGE_ID_MAP } from "@/lib/xmx/client";
import { prisma } from "@/lib/prisma";

async function authorizeExchangeApi(userId: string) {
  const xmx = getXmxClient();

  // 1. 获取用户的交易所 API（从本地数据库）
  const userApi = await prisma.exchangeApiKey.findUnique({
    where: { userId },
  });

  if (!userApi) {
    throw new Error("用户未绑定交易所 API");
  }

  // 2. 将用户 API 添加到 XMX 平台（RSA 加密传输）
  const result = await xmx.addExchange({
    exchangeId: EXCHANGE_ID_MAP.GATE,
    accessKey: userApi.apiKey,
    secretKey: userApi.apiSecret,
    passphrase: userApi.passphrase || "",
    remark: `用户 ${userId} 的 Gate.io 永续合约账户`,
  });

  const xmxExchangeId = result.data.id;

  // 3. 在本地数据库保存 XMX 交易所配置 ID（用于后续创建实盘）
  await prisma.exchangeApiKey.update({
    where: { userId },
    data: {
      xmxAssociationId: String(xmxExchangeId),
    },
  });

  return {
    xmxExchangeId,
    message: "交易所授权成功",
  };
}
```

---

## 🔐 安全说明

### RSA 加密

所有敏感信息（API Key、Secret、Passphrase）在传输前会自动使用 RSA 加密：

1. 客户端从 XMX 获取 RSA 公钥
2. 使用公钥加密敏感字段
3. 传输加密后的数据
4. XMX 服务端使用私钥解密

```typescript
// 自动加密，无需手动处理
const publicKey = await xmx.getRsaPublicKey();
const encrypted = xmx.rsaEncrypt("sensitive_data", publicKey);
```

### 存储安全

- ✅ XMX 使用 AES-256-GCM 加密存储
- ✅ 本地只存储 XMX 返回的配置 ID
- ✅ 不在本地存储原始的交易所 API

---

## 🛠️ 错误处理

```typescript
try {
  const result = await xmx.addExchange(config);
} catch (error) {
  if (error.message.includes("认证失败")) {
    // XMX AccessKey/SecretKey 错误
  } else if (error.message.includes("IP地址未在白名单")) {
    // IP 白名单问题
  } else if (error.message.includes("权限不足")) {
    // 缺少 ManageExchange 权限
  }
}
```

---

## 📚 相关文档

- [配置文件](./config.ts) - XMX 平台配置
- [客户端](./client.ts) - API 调用工具类
- [数据模型](../../prisma/schema.prisma) - QuantRun 数据表

---

## 🔗 XMX 官方文档

- API 文档: `https://api.xmx.finance/docs`
- 管理后台: `https://console.xmx.finance`
