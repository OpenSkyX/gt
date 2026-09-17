"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getStrategyByIdAction, type StrategyInfo } from "../../actions/strategy";

export default function StrategyDetailPage() {
  return (
    <Suspense fallback={null}>
      <StrategyDetailContent />
    </Suspense>
  );
}

function StrategyDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isChecking } = useAuth();

  const runId = searchParams.get("runId");
  const [quantRun, setQuantRun] = useState<any>(null);
  const [isLoadingRun, setIsLoadingRun] = useState(true);
  const [isStopping, setIsStopping] = useState(false);

  // 根据实盘ID获取实盘详情
  useEffect(() => {
    if (!runId || !isLoggedIn) return;

    const fetchQuantRun = async () => {
      setIsLoadingRun(true);
      const { getQuantRunDetailAction } = await import("../../actions/quant-run");
      const result = await getQuantRunDetailAction(runId);
      if (result.success && result.data) {
        setQuantRun(result.data);
      } else {
        alert("无法获取实盘详情");
        router.back();
      }
      setIsLoadingRun(false);
    };

    fetchQuantRun();
  }, [runId, isLoggedIn, router]);

  // 计算实盘数据
  const [currentTime, setCurrentTime] = useState(new Date());

  const initialFunds = quantRun ? Number(quantRun.initialBalance) : 0;
  const profit = quantRun ? Number(quantRun.realizedProfit) : 0; // 使用已实现盈利
  const currentFunds = initialFunds + profit; // 当前资金 = 初始资金 + 盈利
  const profitRate = initialFunds > 0 ? ((profit / initialFunds) * 100).toFixed(2) : "0.00";
  const startTime = quantRun ? new Date(quantRun.startedAt) : new Date();

  // 计算已运行时间
  const runningTime = currentTime.getTime() - startTime.getTime();
  const runningDays = Math.floor(runningTime / (1000 * 60 * 60 * 24));
  const runningHours = Math.floor(
    (runningTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const runningMinutes = Math.floor((runningTime % (1000 * 60 * 60)) / (1000 * 60));

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStop = async () => {
    if (!quantRun || !runId) return;

    const confirmed = confirm(
      `⚠️ 确定要停止该策略吗？\n\n` +
      `策略名称：${quantRun.strategy.name}\n` +
      `当前余额：${currentFunds.toFixed(2)}\n` +
      `盈亏：${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${profitRate}%)\n\n` +
      `停止后将无法重新启动，但可以创建新的实盘。`
    );

    if (!confirmed) return;

    setIsStopping(true);

    try {
      const { stopQuantRunAction } = await import("../../actions/quant-run");
      const result = await stopQuantRunAction(runId);

      setIsStopping(false);

      if (result.success) {
        alert(`✅ 策略已停止\n\n最终余额：${currentFunds.toFixed(2)}\n盈亏：${profit >= 0 ? '+' : ''}${profit.toFixed(2)}`);
        router.push("/quant");
      } else {
        alert(`❌ 停止失败\n${result.error}`);
      }
    } catch (error) {
      setIsStopping(false);
      console.error("停止策略失败:", error);
      alert(`❌ 停止失败\n${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  if (isChecking || isLoadingRun) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!isLoggedIn || !quantRun) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Loading Overlay */}
      {isStopping && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-red-400 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-200 mb-1">正在停止策略</p>
              <p className="text-sm text-slate-400">请稍候，正在处理...</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-card border-b border-slate-700/50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-700/30 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-lg font-semibold text-slate-100">策略详情</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* Strategy Name */}
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-xl font-bold text-slate-100">{quantRun.strategy.name}</h2>
            <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-2 ${
              quantRun.status === "RUNNING"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-700/50 text-slate-400"
            }`}>
              {quantRun.status === "RUNNING" ? "运行中" : "已停止"}
            </div>
          </div>

          {/* Funds Info */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              资金信息
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">账户初始</span>
                <span className="text-base font-semibold text-slate-200 mono-num">
                  {initialFunds.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">当前资金</span>
                <span className="text-base font-semibold text-slate-200 mono-num">
                  {currentFunds.toFixed(2)} USDT
                </span>
              </div>
              <div className="h-px bg-slate-700/50"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">盈利</span>
                <div className="text-right">
                  <p
                    className={`text-base font-bold mono-num ${
                      profit >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {profit >= 0 ? "+" : ""}{profit.toFixed(2)} USDT
                  </p>
                  <p
                    className={`text-xs mono-num ${
                      profit >= 0
                        ? "text-emerald-400/70"
                        : "text-red-400/70"
                    }`}
                  >
                    {profit >= 0 ? "+" : ""}
                    {profitRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Info */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              运行信息
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">启动时间</span>
                <span className="text-sm text-slate-200 mono-num">
                  {startTime.toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">当前时间</span>
                <span className="text-sm text-slate-200 mono-num">
                  {currentTime.toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="h-px bg-slate-700/50"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">已运行时间</span>
                <span className="text-base font-semibold text-cyan-400 mono-num">
                  {runningDays}天 {runningHours}小时 {runningMinutes}分钟
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="glass-card border-t border-slate-700/50">
        <div className="max-w-md mx-auto p-4">
          {quantRun.status === "RUNNING" ? (
            <button
              onClick={handleStop}
              disabled={isStopping}
              className={`w-full py-3.5 rounded-xl font-semibold border transition-colors ${
                isStopping
                  ? "bg-slate-700/20 text-slate-500 border-slate-700/30 cursor-not-allowed"
                  : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              }`}
            >
              {isStopping ? "停止中..." : "停止策略"}
            </button>
          ) : (
            <div className="w-full py-3.5 bg-slate-700/20 text-slate-500 rounded-xl font-semibold border border-slate-700/30 text-center">
              策略已停止
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
