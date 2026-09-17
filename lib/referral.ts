import "server-only";

import { prisma } from "@/lib/prisma";

export type ReferralStats = {
  directTotal: number;
  directActive: number;
  communityTotal: number;
  communityActive: number;
};

type CommunityRow = { total: number; active: number };

// 社区 = 通过邀请关系递归展开的所有下级（不限层级），需要用递归 CTE 遍历 Invitation 表
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [directTotal, directActive, communityRows] = await Promise.all([
    prisma.invitation.count({ where: { inviterId: userId } }),
    prisma.invitation.count({
      where: { inviterId: userId, invitee: { is: { isActivated: true } } },
    }),
    prisma.$queryRaw<CommunityRow[]>`
      WITH RECURSIVE downline AS (
        SELECT "inviteeId" AS id
        FROM "Invitation"
        WHERE "inviterId" = ${userId}
        UNION ALL
        SELECT i."inviteeId"
        FROM "Invitation" i
        JOIN downline d ON i."inviterId" = d.id
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE u."isActivated")::int AS active
      FROM downline d
      JOIN "User" u ON u.id = d.id
    `,
  ]);

  const community = communityRows[0];

  return {
    directTotal,
    directActive,
    communityTotal: community?.total ?? 0,
    communityActive: community?.active ?? 0,
  };
}
