"use client";

import { Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { logoutAction } from "../actions/auth";
import { getMyReferralStatsAction, getMyProfileAction } from "../actions/profile";
import { readCachedProfile, writeCachedProfile } from "../hooks/useProfileCache";
import type { ReferralStats } from "@/lib/referral";

const emptyStats: ReferralStats = {
  directTotal: 0,
  directActive: 0,
  communityTotal: 0,
  communityActive: 0,
};

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState(() => readCachedProfile().userName);
  const [avatarType, setAvatarType] = useState<"auto" | "upload">(() => readCachedProfile().avatarType);
  const [avatarImage, setAvatarImage] = useState(() => readCachedProfile().avatarImage);
  const [avatarText, setAvatarText] = useState(() => readCachedProfile().avatarText);
  const [avatarColor, setAvatarColor] = useState(() => readCachedProfile().avatarColor);
  const [inviteCode, setInviteCode] = useState(() => readCachedProfile().inviteCode);
  const [stats, setStats] = useState<ReferralStats>(emptyStats);

  useEffect(() => {
    // 先用本地缓存立即展示，再从数据库校准最新数据
    if (!isLoggedIn) return;
    getMyProfileAction().then((result) => {
      if (!result.success) return;
      const profile = result.data;
      setUserName(profile.userName);
      setAvatarType(profile.avatarType);
      setAvatarImage(profile.avatarImage);
      setAvatarText(profile.avatarText);
      setAvatarColor(profile.avatarColor);
      setInviteCode(profile.inviteCode);
      writeCachedProfile(profile);
    });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    getMyReferralStatsAction().then((result) => {
      if (result.success) {
        setStats(result.data);
      }
    });
  }, [isLoggedIn]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    // 清除服务端 session
    await logoutAction();

    // 清除本地登录状态
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userName");
    localStorage.removeItem("inviteCode");

    // 跳转到登录页
    router.push("/login");
  };

  if (isChecking) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        {/* User Profile with Invite Code */}
        <div className="glass-card rounded-xl mb-3">
          {/* User Info & Invite Code */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              {avatarType === "upload" && avatarImage ? (
                <img
                  src={avatarImage}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${avatarColor} rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0`}
                >
                  {avatarText}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-slate-100 truncate mb-1">
                  {userName}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">邀请码：</span>
                  <span className="text-xs font-semibold text-cyan-400 tracking-wider mono-num">
                    {inviteCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                    title={copied ? "已复制" : "复制邀请码"}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-300" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => router.push("/profile/edit")}
                className="text-xs text-cyan-400 shrink-0 hover:text-cyan-300"
              >
                编辑
              </button>
            </div>
          </div>

          {/* Stats Grid - Compact */}
          <div className="grid grid-cols-4 border-t border-slate-700/50">
            <div className="p-3 text-center">
              <p className="text-xl font-bold text-slate-200 mb-0.5 mono-num">
                {stats.directTotal}
              </p>
              <p className="text-xs text-slate-500">直推</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-xl font-bold text-emerald-400 mb-0.5 mono-num">
                {stats.directActive}
              </p>
              <p className="text-xs text-slate-500">有效直推</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-xl font-bold text-slate-200 mb-0.5 mono-num">
                {stats.communityTotal}
              </p>
              <p className="text-xs text-slate-500">社区</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-xl font-bold text-emerald-400 mb-0.5 mono-num">
                {stats.communityActive}
              </p>
              <p className="text-xs text-slate-500">有效社区</p>
            </div>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="glass-card rounded-xl overflow-hidden mb-3">
          {[
            { icon: "🔑", label: "授权API", path: "/profile/api" },
            { icon: "🎁", label: "邀请奖励", path: "/profile/rewards" },
            { icon: "❓", label: "帮助中心", path: null },
            { icon: "📱", label: "关于我们", path: null },
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => item.path && router.push(item.path)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/20 transition-colors border-b border-slate-700/30 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <span className="text-slate-500 text-sm">›</span>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full glass-card rounded-xl py-3 text-sm text-red-400 font-medium hover:bg-red-500/10 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
