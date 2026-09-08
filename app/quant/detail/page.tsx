"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function StrategyDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isChecking } = useAuth();

  const strategyName = searchParams.get("name") || "策略详情";

  // 模拟数据
  const [currentTime, setCurrentTime] = useState(new Date());
  const initialFunds = 10000;
  const currentFunds = 12345.67;
  const profit = currentFunds - initialFunds;
  const profitRate = ((profit / initialFunds) * 100).toFixed(2);
  const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7天前

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

  const handleStop = () => {
    if (confirm("确定要停止该策略吗？")) {
      alert("策略已停止");
      router.push("/quant");
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
          <h1 className="text-lg font-semibold text-slate-100">策略详情</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* Strategy Name */}
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-xl font-bold text-slate-100">{strategyName}</h2>
            <div className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium mt-2">
              运行中
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
                  ¥{initialFunds.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">当前资金</span>
                <span className="text-base font-semibold text-slate-200 mono-num">
                  ¥{currentFunds.toLocaleString()}
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
                    {profit >= 0 ? "+" : ""}¥{profit.toFixed(2)}
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
          <button
            onClick={handleStop}
            className="w-full py-3.5 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 border border-red-500/30 transition-colors"
          >
            停止策略
          </button>
        </div>
      </div>
    </div>
  );
}
