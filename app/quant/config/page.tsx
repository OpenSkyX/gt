"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Check, X, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function StrategyConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isChecking } = useAuth();

  const strategyId = searchParams.get("id");
  const strategyName = searchParams.get("name") || "策略配置";
  const description = searchParams.get("desc") || "";

  const [maxDrawdown, setMaxDrawdown] = useState(30);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiValid, setApiValid] = useState(false);

  // 模拟检查条件
  const conditions = [
    {
      label: "最低500保证金",
      checked: true,
      status: "success" as const,
    },
    {
      label: "已配置交易所API",
      checked: hasApiKey,
      status: hasApiKey ? ("success" as const) : ("error" as const),
    },
    {
      label: "交易所API正确",
      checked: apiValid,
      status: apiValid ? ("success" as const) : ("warning" as const),
    },
    {
      label: "交易所最低余额1000",
      checked: true,
      status: "success" as const,
    },
  ];

  const allConditionsMet = conditions.every((c) => c.checked);

  const handleStart = () => {
    if (!allConditionsMet) {
      alert("请先满足所有启动条件");
      return;
    }

    // 显示风险提示
    const confirmed = confirm(
      "⚠️ 重要风险提示\n\n" +
      "策略运行期间，严禁进行以下手动操作：\n" +
      "• 划转资金\n" +
      "• 提现操作\n" +
      "• 手动开仓\n" +
      "• 手动平仓\n\n" +
      "如因手动干预操作导致亏损，由您自行承担，且不退还保证金。\n\n" +
      "是否确认启动策略？"
    );

    if (confirmed) {
      alert(`策略启动成功\n策略名称：${strategyName}\n最大回撤：${maxDrawdown}%`);
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
          <h1 className="text-lg font-semibold text-slate-100">策略配置</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* Config Section */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-100 mb-4">
              策略配置
            </h3>

            {/* Max Drawdown Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-slate-300">最大回撤</label>
                <span className="text-lg font-bold text-cyan-400 mono-num">
                  {maxDrawdown}%
                </span>
              </div>

              {/* Slider */}
              <div className="relative">
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                      ((maxDrawdown - 30) / 70) * 100
                    }%, #334155 ${((maxDrawdown - 30) / 70) * 100}%, #334155 100%)`,
                  }}
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-3">
                最大回撤是指策略允许的最大亏损比例，建议设置在30%-50%之间
              </p>
            </div>
          </div>

          {/* Conditions Check */}
          <div className="glass-card rounded-xl p-3">
            <h3 className="text-xs font-semibold text-slate-100 mb-2">
              启动条件检查
            </h3>

            <div className="space-y-1.5">
              {conditions.map((condition, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-xs text-slate-400">
                    {condition.label}
                  </span>
                  {condition.status === "success" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : condition.status === "error" ? (
                    <X className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
              ))}
            </div>

            {!allConditionsMet && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400">
                  请配置交易所API并验证
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom Action */}
      <div className="glass-card border-t border-slate-700/50">
        <div className="max-w-md mx-auto p-4 space-y-3">
          {/* Risk Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-400 text-xs font-bold">!</span>
              </div>
              <h3 className="text-xs font-bold text-red-400">重要风险提示</h3>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed space-y-1">
              <p>策略运行期间，严禁手动操作（划转、提现、开仓、平仓）</p>
              <p className="text-red-400/80 font-medium">
                如因手动干预导致亏损，由您自行承担，且不退还保证金
              </p>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!allConditionsMet}
            className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
              allConditionsMet
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/30"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            {allConditionsMet ? "启动策略" : "请先满足启动条件"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #06b6d4;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #06b6d4;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
}
