"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import {
  getStrategiesAction,
  getQuantRunsAction,
  type StrategyInfo,
  type QuantRunInfo
} from "../actions/strategy";

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

export default function QuantPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [activeTab, setActiveTab] = useState<"strategies" | "history">("strategies");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [quantRuns, setQuantRuns] = useState<QuantRunInfo[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取策略数据 - 每次进入页面都重新加载
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchStrategies = async () => {
      setIsLoadingStrategies(true);
      const result = await getStrategiesAction();
      if (result.success) {
        // 根据用户的实盘运行状态设置策略状态
        const strategiesWithStatus: Strategy[] = result.data.map((s) => ({
          ...s,
          status: s.userQuantRun?.status === "运行中" ? "运行中" : "可启用",
          badge: s.badge || undefined,
        }));
        setStrategies(strategiesWithStatus);
      }
      setIsLoadingStrategies(false);
    };

    fetchStrategies();
  }, [isLoggedIn, refreshKey]);

  // 获取实盘历史数据 - 每次进入页面都重新加载
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchQuantRuns = async () => {
      setIsLoadingRuns(true);
      const result = await getQuantRunsAction();
      if (result.success) {
        setQuantRuns(result.data);
      }
      setIsLoadingRuns(false);
    };

    fetchQuantRuns();
  }, [isLoggedIn, refreshKey]);

  // 监听页面可见性变化，页面显示时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLoggedIn) {
        // 页面变为可见时，强制刷新数据
        setRefreshKey(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn]);

  const handleStrategyClick = (strategy: Strategy) => {
    if (strategy.status === "可启用") {
      // 跳转到配置页面 - 启动新实盘
      router.push(`/quant/config?id=${strategy.id}`);
    } else {
      // 跳转到详情页面 - 查看运行中的实盘
      // 需要传递实盘ID而不是策略ID
      const quantRunId = (strategy as any).userQuantRun?.id;
      if (quantRunId) {
        router.push(`/quant/detail?runId=${quantRunId}`);
      } else {
        // 如果没有实盘ID，仍然跳转到配置页
        router.push(`/quant/config?id=${strategy.id}`);
      }
    }
  };

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
              {isLoadingStrategies ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400">加载策略中...</div>
                </div>
              ) : strategies.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400">暂无策略</div>
                </div>
              ) : (
                <>
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
                    <p className="text-xs text-slate-500 mb-0.5">预期月化</p>
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
                </>
              )}
            </div>
          )}

          {/* Trade History */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {isLoadingRuns ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400">加载实盘历史中...</div>
                </div>
              ) : quantRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-slate-400 mb-2">暂无实盘历史</div>
                  <p className="text-xs text-slate-500">启用策略后，实盘记录将显示在这里</p>
                </div>
              ) : (
                <>
                  {quantRuns.map((run) => (
                    <div
                      key={run.id}
                      className="glass-card rounded-xl p-4"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50">
                        <div>
                          <h3 className="text-base font-semibold text-slate-100">
                            {run.strategyName}
                          </h3>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                              run.status === "运行中"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-700/50 text-slate-400"
                            }`}
                          >
                            {run.status}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-bold mono-num ${
                            run.profit >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {run.profit >= 0 ? "+" : ""}{run.profit.toFixed(2)} USDT
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">启动时间</p>
                          <p className="text-sm text-slate-300 mono-num">
                            {run.startTime}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">
                            {run.status === "运行中" ? "当前状态" : "结束时间"}
                          </p>
                          <p className="text-sm text-slate-300 mono-num">
                            {run.endTime || "运行中"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">初始资金</p>
                          <p className="text-sm font-medium text-slate-200 mono-num">
                            {run.initialFunds.toFixed(2)} USDT
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">
                            {run.status === "运行中" ? "当前资金" : "结束资金"}
                          </p>
                          <p className="text-sm font-medium text-slate-200 mono-num">
                            {(run.status === "运行中" ? run.currentFunds : run.finalFunds || 0).toFixed(2)} USDT
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">运行时间</p>
                          <p className="text-sm text-slate-300">
                            {run.runningTime}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">收益率</p>
                          <p
                            className={`text-sm font-bold mono-num ${
                              run.profit >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {run.profit >= 0 ? "+" : ""}
                            {run.profitRate}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
