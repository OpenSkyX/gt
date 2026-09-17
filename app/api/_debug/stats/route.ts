import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getReferralStats } from "@/lib/referral";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ loggedIn: false });
  }
  const stats = await getReferralStats(user.id);
  return NextResponse.json({ loggedIn: true, phone: user.phone, inviteCode: user.inviteCode, stats });
}
