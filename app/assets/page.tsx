"use client";

import { Eye, ArrowDown, ArrowUp, Repeat, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { getMyWalletAction, createWalletAction, type WalletInfo } from "../actions/wallet";
import { getMyAssetsAction, getMyTransactionsAction, type AssetInfo, type TransactionInfo } from "../actions/profile";

export default function AssetsPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [fundPassword, setFundPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [assets, setAssets] = useState<AssetInfo | null>(null);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 获取钱包信息、资产信息和交易记录
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      setIsLoadingWallet(true);

      // 获取钱包信息
      const walletResult = await getMyWalletAction();
      if (walletResult.success) {
        if (walletResult.data) {
          setWallet(walletResult.data);
        } else {
          // 用户没有钱包，显示创建提示
          setShowWalletPrompt(true);
        }
      }

      // 获取资产信息
      const assetsResult = await getMyAssetsAction();
      if (assetsResult.success) {
        setAssets(assetsResult.data);
      }

      // 获取第一页交易记录
      const transactionsResult = await getMyTransactionsAction({ page: 1, limit: 10 });
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data.transactions);
        setHasMore(transactionsResult.data.hasMore);
      }

      setIsLoadingWallet(false);
    };

    fetchData();
  }, [isLoggedIn]);

  // 加载更多交易记录
  const loadMoreTransactions = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      console.log('[Pagination] 跳过加载:', { hasMore, isLoadingMore });
      return;
    }

    console.log('[Pagination] 开始加载第', page + 1, '页');
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const result = await getMyTransactionsAction({ page: nextPage, limit: 10 });

    if (result.success) {
      console.log('[Pagination] 加载成功:', result.data.transactions.length, '条记录, hasMore:', result.data.hasMore);
      setTransactions((prev) => [...prev, ...result.data.transactions]);
      setHasMore(result.data.hasMore);
      setPage(nextPage);
    } else {
      console.error('[Pagination] 加载失败:', result.error);
    }

    setIsLoadingMore(false);
  }, [page, hasMore, isLoadingMore]);

  // 使用 Intersection Observer 监听滚动到底部
  useEffect(() => {
    // 只有在正确的渲染状态下才初始化 Observer
    if (isChecking || !isLoggedIn || showWalletPrompt) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const target = observerTarget.current;

    if (!scrollContainer || !target) {
      return;
    }

    console.log('[Pagination] Observer 已设置');

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          console.log('[Pagination] 🚀 触发加载！');
          loadMoreTransactions();
        }
      },
      {
        root: scrollContainer,
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [hasMore, isLoadingMore, loadMoreTransactions, isChecking, isLoggedIn, showWalletPrompt]);

  // 创建钱包
  const handleCreateWallet = async () => {
    // 验证资金密码
    if (!fundPassword || fundPassword.length < 6) {
      alert("资金密码至少需要 6 位");
      return;
    }

    if (fundPassword !== confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }

    setIsCreatingWallet(true);
    const result = await createWalletAction(fundPassword);
    if (result.success) {
      setWallet(result.data);
      setShowWalletPrompt(false);
      setFundPassword("");
      setConfirmPassword("");
      alert("钱包创建成功！");
    } else {
      alert(result.error || "创建钱包失败");
    }
    setIsCreatingWallet(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "充值":
      case "划转入":
        return <ArrowDown className="w-4 h-4" />;
      case "提现":
      case "划转出":
        return <ArrowUp className="w-4 h-4" />;
      case "反佣":
        return <TrendingUp className="w-4 h-4" />;
      case "激活":
      case "划转 资产->积分":
      case "划转 积分->资产":
        return <Repeat className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "充值":
      case "反佣":
      case "划转入":
        return "text-emerald-400 bg-emerald-500/20";
      case "提现":
      case "激活":
      case "划转出":
        return "text-red-400 bg-red-500/20";
      case "划转 资产->积分":
      case "划转 积分->资产":
        return "text-cyan-400 bg-cyan-500/20";
      default:
        return "text-slate-400 bg-slate-700/50";
    }
  };

  const isPositive = (type: string) => {
    // 划转显示为中性，不加正负号
    return ["充值", "反佣", "划转入"].includes(type);
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

  // 如果没有钱包，显示全屏创建钱包界面
  if (showWalletPrompt && !isLoadingWallet) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-cyan-500/20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <WalletIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">创建钱包</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              创建您的专属数字钱包，开启资产管理之旅
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-cyan-400 text-sm">1</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-1">自动生成</h4>
                <p className="text-xs text-slate-500">系统将为您自动生成安全的钱包地址和私钥</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-cyan-400 text-sm">2</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-1">开始使用</h4>
                <p className="text-xs text-slate-500">创建后即可进行充值、提现、划转等操作</p>
              </div>
            </div>
          </div>

          {/* 资金密码设置 */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                设置资金密码 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={fundPassword}
                onChange={(e) => setFundPassword(e.target.value)}
                placeholder="请输入资金密码（至少6位）"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                确认资金密码 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入资金密码"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <p className="text-xs text-amber-400 flex items-start gap-1">
              <span>⚠️</span>
              <span>资金密码用于提现等重要操作，请妥善保管</span>
            </p>
          </div>

          <button
            onClick={handleCreateWallet}
            disabled={isCreatingWallet}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
              isCreatingWallet
                ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20"
            }`}
          >
            {isCreatingWallet ? "正在创建钱包..." : "立即创建钱包"}
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            创建钱包即表示您同意我们的服务条款
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-auto">
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
                {hideBalance ? "****" : `${assets?.totalAssets || "0.00"} U`}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">可用积分</p>
              <p className="text-lg font-bold text-cyan-400 mono-num">
                {hideBalance ? "****" : assets?.pointsBalance || "0"}
              </p>
            </div>
          </div>

          {/* Today's Profit */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">今日盈亏</span>
            <span className={`font-medium mono-num ${
              Number(assets?.todayProfitLoss || 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}>
              {Number(assets?.todayProfitLoss || 0) >= 0 ? "+" : ""}{assets?.todayProfitLoss || "0.00"} U ({Number(assets?.todayProfitLossPercent || 0) >= 0 ? "+" : ""}{assets?.todayProfitLossPercent || "0.00"}%)
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
        <div className="space-y-2 pb-4">
          {transactions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              暂无资金动态
            </div>
          )}

          {transactions.length > 0 && (
            <>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="glass-card rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(
                        transaction.type
                      )}`}
                    >
                      {getActivityIcon(transaction.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-200">
                          {transaction.type}
                        </span>
                        <span
                          className={`font-semibold mono-num ${
                            transaction.type === "划转 资产->积分" || transaction.type === "划转 积分->资产"
                              ? "text-cyan-400"
                              : isPositive(transaction.type)
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {transaction.type === "划转 资产->积分" || transaction.type === "划转 积分->资产"
                            ? ""
                            : isPositive(transaction.type)
                            ? "+"
                            : "-"}
                          {transaction.amount} {transaction.currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {transaction.time}
                        </span>
                        <span
                          className={`text-xs ${
                            transaction.status === "完成"
                              ? "text-slate-500"
                              : transaction.status === "处理中"
                              ? "text-cyan-400"
                              : "text-red-400"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 加载更多指示器 */}
              {isLoadingMore && (
                <div className="text-center py-4">
                  <div className="text-sm text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400 mr-2"></div>
                    加载中...
                  </div>
                </div>
              )}

              {/* 没有更多数据 */}
              {!hasMore && transactions.length > 0 && (
                <div className="text-center py-4 text-xs text-slate-500">
                  - 没有更多记录了 -
                </div>
              )}
            </>
          )}

          {/* 观察目标 - 放在外面确保始终存在 */}
          <div
            ref={observerTarget}
            className={`text-center py-4 ${transactions.length === 0 || !hasMore ? 'hidden' : ''}`}
            style={{ minHeight: '1px' }}
          />
        </div>
      </div>
    </div>
  );
}
