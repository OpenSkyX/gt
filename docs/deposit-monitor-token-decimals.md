# 代币精度配置说明

## 📋 概述

不同的代币使用不同的小数位数（decimals）。为了正确解析充值金额，需要在配置文件中设置代币精度。

---

## 🔢 常见代币精度

| 代币 | 精度（小数位） | 示例 |
|------|--------------|------|
| **USDT** | 6 | 1000000 = 1 USDT |
| **USDC** | 6 | 1000000 = 1 USDC |
| **DAI** | 18 | 1000000000000000000 = 1 DAI |
| **ETH** | 18 | 1000000000000000000 = 1 ETH |
| **WBTC** | 8 | 100000000 = 1 WBTC |

---

## ⚙️ 配置方法

### 1. 在 .env 文件中设置

```bash
# USDT 代币精度（小数位数）
USDT_DECIMALS="6"
```

### 2. 不同代币的配置示例

**USDT / USDC**:
```bash
USDT_CONTRACT_ADDRESS="0xYourUSDTAddress"
USDT_DECIMALS="6"
```

**DAI**:
```bash
USDT_CONTRACT_ADDRESS="0xYourDAIAddress"
USDT_DECIMALS="18"
```

**WBTC**:
```bash
USDT_CONTRACT_ADDRESS="0xYourWBTCAddress"
USDT_DECIMALS="8"
```

---

## 🔍 如何查询代币精度

### 方法 1: 查看合约代码

在区块浏览器（如 Arbiscan）上查看合约的 `decimals()` 方法返回值。

### 方法 2: 使用 ethers.js 查询

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const contract = new ethers.Contract(
  "TOKEN_ADDRESS",
  ["function decimals() view returns (uint8)"],
  provider
);

const decimals = await contract.decimals();
console.log(`代币精度: ${decimals}`);
```

### 方法 3: 查看 ERC20 标准

大多数 ERC20 代币遵循以下标准：
- **稳定币**（USDT, USDC, BUSD）: 6 位
- **原生代币包装版**（WETH, WBTC）: 与原生代币相同
- **DeFi 代币**（DAI, AAVE, UNI）: 通常 18 位

---

## 🧪 验证配置

### 测试脚本

创建 `scripts/test-token-decimals.ts`:

```typescript
import "dotenv/config";
import { ethers } from "ethers";
import { MONITOR_CONFIG } from "@/lib/deposit-monitor/config";

async function testDecimals() {
  const provider = new ethers.JsonRpcProvider(MONITOR_CONFIG.RPC_URL);
  
  // 创建合约实例
  const contract = new ethers.Contract(
    MONITOR_CONFIG.USDT_ADDRESS,
    ["function decimals() view returns (uint8)"],
    provider
  );
  
  // 查询链上精度
  const onChainDecimals = await contract.decimals();
  const configDecimals = MONITOR_CONFIG.USDT_DECIMALS;
  
  console.log("代币精度验证:");
  console.log(`  合约地址: ${MONITOR_CONFIG.USDT_ADDRESS}`);
  console.log(`  链上精度: ${onChainDecimals}`);
  console.log(`  配置精度: ${configDecimals}`);
  
  if (Number(onChainDecimals) === configDecimals) {
    console.log("  ✅ 配置正确");
  } else {
    console.log("  ❌ 配置错误！请更新 USDT_DECIMALS");
  }
}

testDecimals();
```

运行:
```bash
npx tsx scripts/test-token-decimals.ts
```

---

## 💡 示例：解析充值金额

### 配置精度前（错误）

```typescript
// 错误：硬编码精度
const amount = ethers.formatUnits(log.data, 6);
// 如果代币是 DAI (18 位)，金额会错误！
```

### 配置精度后（正确）

```typescript
// 正确：使用配置的精度
const amount = ethers.formatUnits(log.data, MONITOR_CONFIG.USDT_DECIMALS);
// 自动适配不同代币
```

### 实际案例

**链上数据**: `0x000000000000000000000000000000000000000000000000000000000098968`

**USDT (6 位精度)**:
```typescript
ethers.formatUnits("0x98968", 6)  // "0.000001"
// 错误！
```

**正确解析**:
```typescript
// 先转换为十进制
const value = BigInt("0x98968");  // 625000
ethers.formatUnits(value, 6)      // "0.625"
// 正确！0.625 USDT
```

---

## ⚠️ 常见错误

### 错误 1: 精度配置错误

**症状**:
```
充值 100 USDT，系统显示 0.0001 USDT
```

**原因**:
```bash
# 配置了错误的精度
USDT_DECIMALS="18"  # 错误！USDT 是 6 位
```

**解决**:
```bash
USDT_DECIMALS="6"   # 正确
```

### 错误 2: 未配置精度

**症状**:
```
代码中硬编码 6，切换到 DAI 后金额错误
```

**解决**:
- 始终使用 `MONITOR_CONFIG.USDT_DECIMALS`
- 不要硬编码精度值

### 错误 3: 配置文件未更新

**症状**:
```
修改了 .env，但系统仍使用旧精度
```

**解决**:
1. 重启应用 (`npm run dev`)
2. 验证配置: `console.log(MONITOR_CONFIG.USDT_DECIMALS)`

---

## 🔄 多代币支持（未来扩展）

如果需要支持多个代币，可以扩展配置：

```typescript
// config.ts (未来版本)
export const TOKENS = {
  USDT: {
    address: process.env.USDT_ADDRESS || "",
    decimals: parseInt(process.env.USDT_DECIMALS || "6", 10),
    symbol: "USDT",
  },
  USDC: {
    address: process.env.USDC_ADDRESS || "",
    decimals: parseInt(process.env.USDC_DECIMALS || "6", 10),
    symbol: "USDC",
  },
  DAI: {
    address: process.env.DAI_ADDRESS || "",
    decimals: parseInt(process.env.DAI_DECIMALS || "18", 10),
    symbol: "DAI",
  },
};
```

---

## 📚 参考资料

- [ERC20 标准](https://eips.ethereum.org/EIPS/eip-20)
- [Ethers.js 文档 - formatUnits](https://docs.ethers.org/v6/api/utils/#formatUnits)
- [USDT 合约](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) (Ethereum 主网)
- [Arbitrum 区块浏览器](https://arbiscan.io/)

---

## ✅ 检查清单

配置新代币前，请确认：

- [ ] 已查询链上代币精度
- [ ] 已在 `.env` 中设置 `USDT_DECIMALS`
- [ ] 已重启应用
- [ ] 已验证配置正确（运行测试脚本）
- [ ] 已测试充值功能
