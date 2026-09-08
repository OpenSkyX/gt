"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

interface Strategy {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  description: string;
  features: string[];
  expectedReturn: string;
  riskLevel: "低" | "中" | "高";
  minInvestment: string;
  status: "可启用" | "运行中";
  badge?: string;
}

interface TradeHistory {
  id: string;
  strategyName: string;
  startTime: string;
  endTime: string;
  initialFunds: number;
  finalFunds: number;
  profit: number;
  runningTime: string;
}

export default function QuantPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [activeTab, setActiveTab] = useState<"strategies" | "history">("strategies");

  const handleStrategyClick = (strategy: Strategy) => {
    if (strategy.status === "可启用") {
      // 跳转到配置页面
      const params = new URLSearchParams({
        id: strategy.id,
        name: strategy.name,
        desc: strategy.description,
      });
      router.push(`/quant/config?${params.toString()}`);
    } else {
      // 跳转到详情页面
      const params = new URLSearchParams({
        id: strategy.id,
        name: strategy.name,
      });
      router.push(`/quant/detail?${params.toString()}`);
    }
  };

  const strategies: Strategy[] = [
    {
      id: "high-frequency",
      name: "高频策略",
      icon: "⚡",
      iconBg: "from-cyan-500 to-blue-600",
      description:
        "利用算法快速捕捉市场微小价格波动，通过高频率交易累积收益。适合追求短期高收益的投资者。",
      features: [
        "毫秒级交易执行",
        "智能价差捕捉",
        "自动风险控制",
        "实时市场监控",
      ],
      expectedReturn: "15-25%",
      riskLevel: "高",
      minInvestment: "¥50,000",
      status: "可启用",
      badge: "热门",
    },
    {
      id: "stable-fund",
      name: "稳健基金",
      icon: "🛡️",
      iconBg: "from-blue-400 to-cyan-500",
      description:
        "专注于低风险、稳定回报的投资组合，通过分散配置降低波动。适合风险厌恶型和长期投资者。",
      features: [
        "分散投资组合",
        "严格风控体系",
        "定期再平衡",
        "专业资产配置",
      ],
      expectedReturn: "8-12%",
      riskLevel: "低",
      minInvestment: "¥10,000",
      status: "运行中",
      badge: "推荐",
    },
  ];

  const tradeHistory: TradeHistory[] = [
    {
      id: "1",
      strategyName: "高频策略",
      startTime: "2024-12-15 09:30",
      endTime: "2024-12-22 18:45",
      initialFunds: 50000,
      finalFunds: 58230.5,
      profit: 8230.5,
      runningTime: "7天9小时15分",
    },
    {
      id: "2",
      strategyName: "稳健基金",
      startTime: "2024-11-28 14:20",
      endTime: "2024-12-14 10:30",
      initialFunds: 30000,
      finalFunds: 31245.8,
      profit: 1245.8,
      runningTime: "15天20小时10分",
    },
    {
      id: "3",
      strategyName: "高频策略",
      startTime: "2024-11-10 11:00",
      endTime: "2024-11-27 16:20",
      initialFunds: 50000,
      finalFunds: 47850.3,
      profit: -2149.7,
      runningTime: "17天5小时20分",
    },
    {
      id: "4",
      strategyName: "稳健基金",
      startTime: "2024-10-22 09:15",
      endTime: "2024-11-08 14:45",
      initialFunds: 20000,
      finalFunds: 21560.2,
      profit: 1560.2,
      runningTime: "17天5小时30分",
    },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case "低":
        return "text-emerald-400 bg-emerald-500/20";
      case "中":
        return "text-amber-400 bg-amber-500/20";
      case "高":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-slate-400 bg-slate-700/50";
    }
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
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="glass-card border-b border-slate-700/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("strategies")}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
              activeTab === "strategies"
                ? "text-cyan-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            策略
            {activeTab === "strategies" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-cyan-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            实盘历史
            {activeTab === "history" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-3">
          {/* Strategy Cards */}
          {activeTab === "strategies" && (
            <div className="space-y-3">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="glass-card rounded-xl overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${strategy.iconBg} rounded-lg flex items-center justify-center text-xl shadow-lg`}>
                      {strategy.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        {strategy.name}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          strategy.status === "运行中"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700/50 text-slate-400"
                        }`}
                      >
                        {strategy.status}
                      </span>
                    </div>
                  </div>
                  {strategy.badge && (
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
                      {strategy.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {strategy.description}
                </p>

                {/* Features */}
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {strategy.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 text-xs text-slate-300"
                      >
                        <span className="text-emerald-400 text-xs">✓</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-0.5">预期年化</p>
                    <p className="text-sm font-semibold text-slate-200 mono-num">
                      {strategy.expectedReturn}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-0.5">风险等级</p>
                    <p
                      className={`text-xs font-semibold px-2 py-0.5 rounded inline-block ${getRiskColor(
                        strategy.riskLevel
                      )}`}
                    >
                      {strategy.riskLevel}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-0.5">起投金额</p>
                    <p className="text-sm font-semibold text-slate-200 mono-num">
                      {strategy.minInvestment}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleStrategyClick(strategy)}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    strategy.status === "运行中"
                      ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                  }`}
                >
                  {strategy.status === "运行中" ? "查看详情" : "立即启用"}
                </button>
              </div>
            </div>
          ))}

              {/* Bottom Tip */}
              <div className="glass-card rounded-lg p-3 border border-cyan-500/20">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 text-base">💡</div>
                  <div>
                    <p className="text-xs font-medium text-slate-300 mb-0.5">
                      投资提示
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      请根据自身风险承受能力选择合适的策略。建议分散投资，不要将所有资金投入单一策略。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trade History */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {tradeHistory.map((history) => {
                const profitRate = ((history.profit / history.initialFunds) * 100).toFixed(2);
                return (
                  <div
                    key={history.id}
                    className="glass-card rounded-xl p-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50">
                      <h3 className="text-base font-semibold text-slate-100">
                        {history.strategyName}
                      </h3>
                      <span
                        className={`text-sm font-bold mono-num ${
                          history.profit >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {history.profit >= 0 ? "+" : ""}¥{history.profit.toLocaleString()}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">启动时间</p>
                        <p className="text-sm text-slate-300 mono-num">
                          {history.startTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">结束时间</p>
                        <p className="text-sm text-slate-300 mono-num">
                          {history.endTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">初始资金</p>
                        <p className="text-sm font-medium text-slate-200 mono-num">
                          ¥{history.initialFunds.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">结束资金</p>
                        <p className="text-sm font-medium text-slate-200 mono-num">
                          ¥{history.finalFunds.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">运行时间</p>
                        <p className="text-sm text-slate-300">
                          {history.runningTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">收益率</p>
                        <p
                          className={`text-sm font-bold mono-num ${
                            history.profit >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {history.profit >= 0 ? "+" : ""}
                          {profitRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
