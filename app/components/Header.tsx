"use client";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#1a1f2e]/95 backdrop-blur-md border-b border-slate-700/50 z-50">
      <div className="h-full max-w-md mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">GT</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-100">
            量化交易
          </h1>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
      </div>
    </header>
  );
}
