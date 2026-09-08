"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ArrowDownUp } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function TransferPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();

  // 账户余额
  const fundsBalance = 12345.67; // 资金账户
  const pointsBalance = 2580; // 积分账户

  // 划转方向：true = 资金→积分，false = 积分→资金
  const [direction, setDirection] = useState(true);
  const [amount, setAmount] = useState("");

  // 获取当前账户信息
  const fromAccount = direction
    ? { name: "资金账户", balance: fundsBalance, unit: "USDT" }
    : { name: "积分账户", balance: pointsBalance, unit: "积分" };

  const toAccount = direction
    ? { name: "积分账户", balance: pointsBalance, unit: "积分" }
    : { name: "资金账户", balance: fundsBalance, unit: "USDT" };

  // 切换方向
  const handleToggleDirection = () => {
    setDirection(!direction);
    setAmount("");
  };

  // 全部划转
  const handleTransferAll = () => {
    setAmount(fromAccount.balance.toString());
  };

  // 确认划转
  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("请输入划转金额");
      return;
    }
    if (parseFloat(amount) > fromAccount.balance) {
      alert("划转金额超过可用余额");
      return;
    }

    const fromName = fromAccount.name;
    const toName = toAccount.name;
    alert(`划转成功\n从：${fromName}\n到：${toName}\n金额：${amount}`);
    router.push("/assets");
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
          <h1 className="text-lg font-semibold text-slate-100">划转</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Transfer Direction */}
          <div className="glass-card rounded-xl p-4">
            {/* From Account */}
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">从</p>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-sm font-medium text-slate-200">
                  {fromAccount.name}
                </span>
                <span className="text-sm text-slate-400 mono-num">
                  {fromAccount.balance.toLocaleString()} {fromAccount.unit}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <div className="flex justify-center my-2">
              <button
                onClick={handleToggleDirection}
                className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-full transition-colors group"
              >
                <ArrowDownUp className="w-5 h-5 text-cyan-400 group-hover:rotate-180 transition-transform duration-300" />
              </button>
            </div>

            {/* To Account */}
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-1.5">到</p>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-sm font-medium text-slate-200">
                  {toAccount.name}
                </span>
                <span className="text-sm text-slate-400 mono-num">
                  {toAccount.balance.toLocaleString()} {toAccount.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="glass-card rounded-xl p-3">
            <label className="text-xs text-slate-400 mb-2 block">
              划转金额
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="请输入金额"
                className="flex-1 px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 mono-num"
              />
              <button
                onClick={handleTransferAll}
                className="px-4 py-2.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                全部
              </button>
            </div>

            {/* Exchange Info */}
            {amount && parseFloat(amount) > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">兑换比例</span>
                  <span className="text-slate-300">1:1</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-slate-500">将获得</span>
                  <span className="text-cyan-400 font-bold mono-num">
                    {parseFloat(amount).toLocaleString()} {toAccount.unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="glass-card rounded-xl p-3 bg-slate-800/30">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              划转说明
            </h3>
            <div className="text-xs text-slate-400 leading-relaxed space-y-1">
              <p>• 资金账户与积分账户可互相划转</p>
              <p>• 兑换比例为 1:1，无手续费</p>
              <p>• 划转实时到账</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="glass-card border-t border-slate-700/50">
        <div className="max-w-md mx-auto p-3">
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
          >
            确认划转
          </button>
        </div>
      </div>
    </div>
  );
}
