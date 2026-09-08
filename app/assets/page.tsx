"use client";

import { Eye, ArrowDown, ArrowUp, Repeat, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

interface FundActivity {
  id: string;
  type: "充值" | "反佣" | "提现" | "激活";
  amount: number;
  currency: string;
  time: string;
  status: "完成" | "处理中" | "失败";
}

export default function AssetsPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);

  const activities: FundActivity[] = [
    {
      id: "1",
      type: "充值",
      amount: 5000,
      currency: "CNY",
      time: "2024-01-15 14:23",
      status: "完成",
    },
    {
      id: "2",
      type: "反佣",
      amount: 156.78,
      currency: "CNY",
      time: "2024-01-15 10:15",
      status: "完成",
    },
    {
      id: "3",
      type: "激活",
      amount: 100,
      currency: "CNY",
      time: "2024-01-14 23:59",
      status: "完成",
    },
    {
      id: "4",
      type: "充值",
      amount: 3000,
      currency: "CNY",
      time: "2024-01-14 16:42",
      status: "完成",
    },
    {
      id: "5",
      type: "反佣",
      amount: 89.45,
      currency: "CNY",
      time: "2024-01-14 09:30",
      status: "完成",
    },
    {
      id: "6",
      type: "提现",
      amount: 1000,
      currency: "CNY",
      time: "2024-01-13 18:20",
      status: "处理中",
    },
    {
      id: "7",
      type: "激活",
      amount: 200,
      currency: "CNY",
      time: "2024-01-13 11:30",
      status: "完成",
    },
    {
      id: "8",
      type: "反佣",
      amount: 234.56,
      currency: "CNY",
      time: "2024-01-12 23:59",
      status: "完成",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "充值":
        return <ArrowDown className="w-4 h-4" />;
      case "提现":
        return <ArrowUp className="w-4 h-4" />;
      case "反佣":
        return <TrendingUp className="w-4 h-4" />;
      case "激活":
        return <Repeat className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "充值":
      case "反佣":
        return "text-emerald-400 bg-emerald-500/20";
      case "提现":
      case "激活":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-slate-400 bg-slate-700/50";
    }
  };

  const isPositive = (type: string) => {
    return ["充值", "反佣"].includes(type);
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
      {/* Top Section */}
      <div className="glass-card mx-4 mt-4 mb-3 rounded-xl p-4">
        {/* Total Assets Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm text-slate-400">预估总资产</h3>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-slate-500 hover:text-slate-300"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Balance Display with Points */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-3xl font-bold text-slate-100 mono-num">
                {hideBalance ? "****" : "¥12,345.67"}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">可用积分</p>
              <p className="text-lg font-bold text-cyan-400 mono-num">
                {hideBalance ? "****" : "2,580"}
              </p>
            </div>
          </div>

          {/* Today's Profit */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">今日盈亏</span>
            <span className="font-medium text-red-400 mono-num">
              -¥45.23 (-0.67%)
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/50">
          <button
            onClick={() => router.push("/assets/deposit")}
            className="flex flex-col items-center gap-2 py-2 rounded-lg hover:bg-slate-700/30 transition-colors"
          >
            <div className="w-11 h-11 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-xs text-slate-300">充值</span>
          </button>
          <button
            onClick={() => router.push("/assets/withdraw")}
            className="flex flex-col items-center gap-2 py-2 rounded-lg hover:bg-slate-700/30 transition-colors"
          >
            <div className="w-11 h-11 bg-blue-500/20 rounded-full flex items-center justify-center">
              <ArrowUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-slate-300">提现</span>
          </button>
          <button
            onClick={() => router.push("/assets/transfer")}
            className="flex flex-col items-center gap-2 py-2 rounded-lg hover:bg-slate-700/30 transition-colors"
          >
            <div className="w-11 h-11 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Repeat className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-slate-300">划转</span>
          </button>
        </div>
      </div>

      {/* Account Activity Section */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-100">
            账户资金动态
          </h3>
          <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <span>全部</span>
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m19 9-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Activity List */}
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="glass-card rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(
                    activity.type
                  )}`}
                >
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-200">
                      {activity.type}
                    </span>
                    <span
                      className={`font-semibold mono-num ${
                        isPositive(activity.type)
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {isPositive(activity.type) ? "+" : "-"}¥
                      {activity.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {activity.time}
                    </span>
                    <span
                      className={`text-xs ${
                        activity.status === "完成"
                          ? "text-slate-500"
                          : activity.status === "处理中"
                          ? "text-cyan-400"
                          : "text-red-400"
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
