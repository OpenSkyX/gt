"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function WithdrawPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();

  // 可提现余额
  const availableBalance = 12345.67;

  // 表单状态
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [fundPassword, setFundPassword] = useState("");

  // 地址验证
  const isValidAddress = (addr: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  // 发送验证码
  const handleSendCode = () => {
    if (countdown > 0) return;
    // 模拟发送验证码
    alert("验证码已发送");
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 全部提现
  const handleWithdrawAll = () => {
    setAmount(availableBalance.toString());
  };

  // 提交提现
  const handleSubmit = () => {
    // 验证
    if (!amount || parseFloat(amount) <= 0) {
      alert("请输入提现金额");
      return;
    }
    if (parseFloat(amount) > availableBalance) {
      alert("提现金额超过可用余额");
      return;
    }
    if (parseFloat(amount) < 10) {
      alert("最小提现金额为 10 USDT");
      return;
    }
    if (!address) {
      alert("请输入提现地址");
      return;
    }
    if (!isValidAddress(address)) {
      alert("请输入正确的 ETH 地址");
      return;
    }
    if (!verifyCode || verifyCode.length !== 6) {
      alert("请输入 6 位验证码");
      return;
    }

    // 显示资金密码弹窗
    setShowPasswordModal(true);
  };

  // 确认提现
  const handleConfirmWithdraw = () => {
    if (!fundPassword || fundPassword.length !== 6) {
      alert("请输入 6 位资金密码");
      return;
    }

    // 模拟提现成功
    alert(`提现成功\n金额：${amount} USDT\n地址：${address}`);
    setShowPasswordModal(false);
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
          <h1 className="text-lg font-semibold text-slate-100">提现</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Balance */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">可提现余额</p>
            <p className="text-2xl font-bold text-slate-100 mono-num">
              {availableBalance.toLocaleString()} <span className="text-base text-slate-400">USDT</span>
            </p>
          </div>

          {/* Form */}
          <div className="glass-card rounded-xl p-3 space-y-3">
            {/* Amount */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                提现金额
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="最小 10 USDT"
                  className="flex-1 px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 mono-num"
                />
                <button
                  onClick={handleWithdrawAll}
                  className="px-4 py-2.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
                >
                  全部
                </button>
              </div>
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  手续费：{(parseFloat(amount) * 0.005).toFixed(2)} USDT (0.5%)
                  <span className="ml-2">
                    实际到账：{(parseFloat(amount) * 0.995).toFixed(2)} USDT
                  </span>
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                提现地址 (ETH 主网)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 mono-num"
              />
              {address && !isValidAddress(address) && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  请输入正确的 ETH 地址
                </p>
              )}
            </div>

            {/* Verify Code */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                手机验证码
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 位验证码"
                  maxLength={6}
                  className="flex-1 px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 mono-num"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    countdown > 0
                      ? "bg-slate-700/50 text-slate-500"
                      : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  }`}
                >
                  {countdown > 0 ? `${countdown}s` : "发送"}
                </button>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="glass-card rounded-xl p-3 border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-bold text-amber-400 mb-1">
                  提现须知
                </h3>
                <div className="text-xs text-slate-400 leading-relaxed space-y-0.5">
                  <p>• 仅支持 ETH 主网 USDT 提现</p>
                  <p>• 最小提现 10 USDT，手续费 0.5%</p>
                  <p>• 预计 30 分钟内到账</p>
                </div>
              </div>
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
            确认提现
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-sm w-full p-4 border border-slate-700/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">
                输入资金密码
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setFundPassword("");
                }}
                className="p-1 hover:bg-slate-700/30 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300 mb-3">
                  提现金额：<span className="text-cyan-400 font-bold mono-num">{amount} USDT</span>
                </p>
                <input
                  type="password"
                  value={fundPassword}
                  onChange={(e) => setFundPassword(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="请输入 6 位资金密码"
                  maxLength={6}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-center tracking-widest mono-num"
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setFundPassword("");
                  }}
                  className="flex-1 py-2.5 bg-slate-700/50 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmWithdraw}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
