"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Gift, TrendingUp } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface ActivationReward {
  id: string;
  userName: string;
  userId: string;
  amount: number;
  activatedAt: string;
}

interface CommissionRecord {
  id: string;
  userName: string;
  userId: string;
  tradingVolume: number;
  commission: number;
  commissionRate: number;
  tradedAt: string;
}

export default function RewardsPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [activeTab, setActiveTab] = useState<"activation" | "commission">("activation");

  // 激活奖励记录
  const activationRewards: ActivationReward[] = [
    {
      id: "1",
      userName: "用户A***123",
      userId: "U123456",
      amount: 50,
      activatedAt: "2024-01-15 14:23",
    },
    {
      id: "2",
      userName: "用户B***456",
      userId: "U123457",
      amount: 50,
      activatedAt: "2024-01-14 10:15",
    },
    {
      id: "3",
      userName: "用户C***789",
      userId: "U123458",
      amount: 50,
      activatedAt: "2024-01-13 16:42",
    },
    {
      id: "4",
      userName: "用户D***321",
      userId: "U123459",
      amount: 50,
      activatedAt: "2024-01-12 09:30",
    },
    {
      id: "5",
      userName: "用户E***654",
      userId: "U123460",
      amount: 50,
      activatedAt: "2024-01-11 18:20",
    },
  ];

  // 反佣记录
  const commissionRecords: CommissionRecord[] = [
    {
      id: "1",
      userName: "用户A***123",
      userId: "U123456",
      tradingVolume: 10000,
      commission: 15.5,
      commissionRate: 0.155,
      tradedAt: "2024-01-15 14:23",
    },
    {
      id: "2",
      userName: "用户B***456",
      userId: "U123457",
      tradingVolume: 8500,
      commission: 12.75,
      commissionRate: 0.15,
      tradedAt: "2024-01-15 10:15",
    },
    {
      id: "3",
      userName: "用户C***789",
      userId: "U123458",
      tradingVolume: 15000,
      commission: 22.5,
      commissionRate: 0.15,
      tradedAt: "2024-01-14 23:59",
    },
    {
      id: "4",
      userName: "用户A***123",
      userId: "U123456",
      tradingVolume: 12000,
      commission: 18.6,
      commissionRate: 0.155,
      tradedAt: "2024-01-14 16:42",
    },
    {
      id: "5",
      userName: "用户D***321",
      userId: "U123459",
      tradingVolume: 9000,
      commission: 13.5,
      commissionRate: 0.15,
      tradedAt: "2024-01-13 09:30",
    },
  ];

  // 统计数据
  const totalActivationReward = activationRewards.reduce((sum, r) => sum + r.amount, 0);
  const totalCommission = commissionRecords.reduce((sum, r) => sum + r.commission, 0);
  const totalReward = totalActivationReward + totalCommission;

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
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="glass-card border-b border-slate-700/50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-700/30 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-lg font-semibold text-slate-100">邀请奖励</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Stats */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs text-slate-500 mb-3">累计奖励</h3>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-cyan-400 mono-num">
                {totalReward.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">USDT</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">激活奖励</p>
                <p className="text-lg font-bold text-emerald-400 mono-num">
                  {totalActivationReward.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">反佣奖励</p>
                <p className="text-lg font-bold text-purple-400 mono-num">
                  {totalCommission.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex border-b border-slate-700/50">
              <button
                onClick={() => setActiveTab("activation")}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === "activation"
                    ? "text-cyan-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                激活奖励
                {activeTab === "activation" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("commission")}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === "commission"
                    ? "text-cyan-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                反佣记录
                {activeTab === "commission" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                )}
              </button>
            </div>

            {/* Activation Rewards */}
            {activeTab === "activation" && (
              <div className="divide-y divide-slate-700/30">
                {activationRewards.map((reward) => (
                  <div key={reward.id} className="p-3 hover:bg-slate-700/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <Gift className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {reward.userName}
                          </p>
                          <p className="text-xs text-slate-500">激活策略</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400 mono-num">
                          +{reward.amount} USDT
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>ID: {reward.userId}</span>
                      <span className="mono-num">{reward.activatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Commission Records */}
            {activeTab === "commission" && (
              <div className="divide-y divide-slate-700/30">
                {commissionRecords.map((record) => (
                  <div key={record.id} className="p-3 hover:bg-slate-700/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {record.userName}
                          </p>
                          <p className="text-xs text-slate-500">
                            交易量: {record.tradingVolume.toLocaleString()} USDT
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-purple-400 mono-num">
                          +{record.commission.toFixed(2)} USDT
                        </p>
                        <p className="text-xs text-slate-500">
                          {(record.commissionRate * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>ID: {record.userId}</span>
                      <span className="mono-num">{record.tradedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="glass-card rounded-xl p-3 bg-slate-800/30">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              奖励说明
            </h3>
            <div className="text-xs text-slate-400 leading-relaxed space-y-1">
              <p>• 邀请用户激活策略，获得 50 USDT 奖励</p>
              <p>• 用户实盘交易，享受 15% 反佣奖励</p>
              <p>• 奖励实时到账，可随时提现</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
