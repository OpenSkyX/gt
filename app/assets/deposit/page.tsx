"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, AlertTriangle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function DepositPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [copied, setCopied] = useState(false);

  // ETH 钱包地址（示例）
  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-lg font-semibold text-slate-100">充值</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Warning */}
          <div className="glass-card rounded-xl p-3 border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-amber-400 mb-1.5">
                  重要提示
                </h3>
                <div className="text-xs text-slate-300 leading-relaxed space-y-0.5">
                  <p>• 只接受 <span className="text-amber-400 font-semibold">ETH 主网 USDT</span>，其他资产 <span className="text-red-400 font-semibold">永久丢失</span></p>
                  <p>• 最小充值 10 USDT，12 个区块确认后到账</p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code & Address Combined */}
          <div className="glass-card rounded-xl p-4">
            {/* QR Code */}
            <div className="flex justify-center mb-3">
              <div className="bg-white p-3 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${walletAddress}`}
                  alt="Wallet QR Code"
                  className="w-44 h-44"
                />
              </div>
            </div>

            {/* Address */}
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-2">ETH 主网充值地址 (ERC20)</p>
              <div className="flex items-center gap-2 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <p className="flex-1 text-xs text-slate-200 mono-num break-all">
                  {walletAddress}
                </p>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-slate-700/50 rounded transition-colors shrink-0"
                  title={copied ? "已复制" : "复制地址"}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="glass-card rounded-xl p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              充值步骤
            </h3>

            <div className="space-y-2">
              {[
                { step: "1", text: "复制地址或扫描二维码" },
                { step: "2", text: "打开 ETH 钱包，选择 USDT (ERC20)" },
                { step: "3", text: "粘贴地址转账，等待确认到账" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-cyan-400">
                      {item.step}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-0.5">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
