"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, TrendingUp, Wallet, User } from "lucide-react";

const navItems = [
  { name: "首页", path: "/", icon: Home },
  { name: "量化", path: "/quant", icon: TrendingUp },
  { name: "资产", path: "/assets", icon: Wallet },
  { name: "我的", path: "/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#1a1f2e]/95 backdrop-blur-md border-t border-slate-700/50 z-50">
      <div className="h-full max-w-md mx-auto px-2 grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-cyan-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
