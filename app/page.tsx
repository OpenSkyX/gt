"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "./hooks/useAuth";

interface RankingUser {
  rank: number;
  username: string;
  assets: number;
  profit: number;
  profitRate: number;
}

function generateRandomData(): RankingUser[] {
  const names = [
    "交易高手",
    "量化大师",
    "投资达人",
    "收益王者",
    "策略专家",
    "稳健投资",
    "波段之王",
    "趋势猎人",
    "套利专家",
    "价值发现",
    "技术分析师",
    "基本面研究",
    "短线高手",
    "长线投资",
    "风险控制",
  ];

  // 先生成数据，不分配排名
  const users = Array.from({ length: 15 }, (_, i) => {
    const assets = Math.floor(Math.random() * 900000) + 100000;
    const profitRate = (Math.random() * 30 + 5).toFixed(2);
    const profit = Math.floor(assets * (parseFloat(profitRate) / 100));

    return {
      rank: 0, // 临时值
      username: `${names[i % names.length]}${Math.floor(Math.random() * 999)}`,
      assets,
      profit,
      profitRate: parseFloat(profitRate),
    };
  });

  // 按收益金额降序排序
  users.sort((a, b) => b.profit - a.profit);

  // 排序后分配正确的排名
  users.forEach((user, index) => {
    user.rank = index + 1;
  });

  return users;
}

export default function Home() {
  const { isLoggedIn, isChecking } = useAuth();
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoggedIn) {
      setRankings(generateRandomData());
    }
  }, [isLoggedIn]);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRankings(generateRandomData());
    setIsRefreshing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      containerRef.current &&
      containerRef.current.scrollTop === 0 &&
      touchStartY.current > 0
    ) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-zinc-400";
    if (rank === 3) return "text-amber-600";
    return "text-zinc-600 dark:text-zinc-400";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: pullDistance }}
      >
        <RefreshCw
          className={`w-5 h-5 text-cyan-400 ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: `rotate(${pullDistance * 3.6}deg)`,
            filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.8))'
          }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-slate-100">
              收益排行榜
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-cyan-400 text-sm flex items-center gap-1 hover:text-cyan-300 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              刷新
            </button>
          </div>
          <p className="text-xs text-slate-500">
            实时更新 · 下拉刷新
          </p>
        </div>

        {/* Ranking Table Header */}
        <div className="glass-card rounded-t-xl px-4 py-3 border-b border-slate-700/50">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-400">
            <div className="col-span-2 text-center">排行</div>
            <div className="col-span-3">用户</div>
            <div className="col-span-3 text-right">资产</div>
            <div className="col-span-4 text-right">收益</div>
          </div>
        </div>

        {/* Ranking List */}
        <div className="glass-card rounded-b-xl divide-y divide-slate-700/30">
          {rankings.map((user) => (
            <div
              key={user.rank}
              className="px-4 py-3 hover:bg-slate-700/20 transition-colors"
            >
              <div className="grid grid-cols-12 gap-2 items-center">
                {/* Rank */}
                <div className="col-span-2 text-center">
                  <span
                    className={`text-lg font-bold ${getRankColor(user.rank)}`}
                  >
                    {getRankIcon(user.rank)}
                  </span>
                </div>

                {/* Username */}
                <div className="col-span-3">
                  <p className="text-sm text-slate-300 truncate">
                    {user.username}
                  </p>
                </div>

                {/* Assets */}
                <div className="col-span-3 text-right">
                  <p className="text-sm text-slate-300 mono-num">
                    ¥{(user.assets / 10000).toFixed(1)}万
                  </p>
                </div>

                {/* Profit */}
                <div className="col-span-4 text-right">
                  <p className="text-sm font-medium text-emerald-400 mono-num">
                    +¥{(user.profit / 10000).toFixed(2)}万
                  </p>
                  <p className="text-xs text-emerald-400/70 mono-num">
                    +{user.profitRate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Refresh Tip */}
        <div className="mt-4 text-center text-xs text-slate-500">
          下拉刷新获取最新数据
        </div>
      </div>
    </div>
  );
}
