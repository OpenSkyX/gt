"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, AlertTriangle } from "lucide-react";
import QRCode from "react-qr-code";
import { useAuth } from "../../hooks/useAuth";
import { getMyWalletAction, type WalletInfo } from "../../actions/wallet";

export default function DepositPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchWallet = async () => {
      setIsLoading(true);
      const result = await getMyWalletAction();
      if (result.success && result.data) {
        setWallet(result.data);
      }
      setIsLoading(false);
    };

    fetchWallet();
  }, [isLoggedIn]);

  const handleCopyAddress = async () => {
    if (!wallet) return;

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  if (isChecking || isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (!wallet) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
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

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-card rounded-xl p-6 text-center max-w-sm">
            <div className="text-slate-400 mb-4">您还没有创建钱包</div>
            <button
              onClick={() => router.push("/assets")}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700"
            >
              去创建钱包
            </button>
          </div>
        </div>
      </div>
    );
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
                  <p>• 只接受 <span className="text-amber-400 font-semibold">Arbitrum 网络 USDT (ERC20)</span>，其他资产 <span className="text-red-400 font-semibold">永久丢失</span></p>
                  <p>• 最小充值 10 USDT，确认后即可到账</p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code & Address Combined */}
          <div className="glass-card rounded-xl p-4">
            {/* QR Code */}
            <div className="flex justify-center mb-3">
              <div className="bg-white p-3 rounded-lg">
                <QRCode
                  value={wallet.address}
                  size={176}
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>

            {/* Address */}
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-2">Arbitrum 充值地址 (ERC20)</p>
              <div className="flex items-center gap-2 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <p className="flex-1 text-xs text-slate-200 mono-num break-all">
                  {wallet.address}
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
                { step: "2", text: "打开支持 Arbitrum 的钱包，选择 USDT (ERC20)" },
                { step: "3", text: "粘贴地址并选择 Arbitrum 网络转账" },
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

          {/* Network Info */}
          <div className="glass-card rounded-xl p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              网络信息
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-slate-800/30 rounded-lg">
                <div className="text-slate-500 mb-1">网络</div>
                <div className="text-slate-200 font-medium">Arbitrum One</div>
              </div>
              <div className="p-2 bg-slate-800/30 rounded-lg">
                <div className="text-slate-500 mb-1">代币标准</div>
                <div className="text-slate-200 font-medium">ERC20</div>
              </div>
              <div className="p-2 bg-slate-800/30 rounded-lg">
                <div className="text-slate-500 mb-1">最小充值</div>
                <div className="text-slate-200 font-medium">10 USDT</div>
              </div>
              <div className="p-2 bg-slate-800/30 rounded-lg">
                <div className="text-slate-500 mb-1">到账时间</div>
                <div className="text-slate-200 font-medium">1-3 分钟</div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="glass-card rounded-xl p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              注意事项
            </h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                <p>请确保从支持 Arbitrum 网络的钱包或交易所转账</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                <p>请勿向该地址充值其他币种或使用其他网络</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                <p>充值金额小于最小充值额度将无法到账</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                <p>如有疑问，请联系在线客服获取帮助</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
