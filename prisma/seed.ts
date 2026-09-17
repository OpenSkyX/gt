import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * 本地数据库的交易所类型字典
 * 注意：这里的 id 是本地数据库的主键，与 XMX 平台的交易所 ID 不同
 *
 * XMX 平台的交易所 ID（在 lib/xmx/client.ts 中定义）：
 * - Gate.io 永续合约 = 2
 * - 币安永续合约 = 4
 */
const exchangeTypes = [
  { id: 1, code: "gate", name: "Gate.io 永续合约" },
  { id: 2, code: "binance", name: "币安永续合约" },
];

async function main() {
  for (const type of exchangeTypes) {
    await prisma.exchangeType.upsert({
      where: { id: type.id },
      update: { code: type.code, name: type.name },
      create: type,
    });
  }
  console.log(`已同步 ${exchangeTypes.length} 条交易所类型数据`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
