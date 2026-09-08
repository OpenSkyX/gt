"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = () => {
    if (!phone || phone.length !== 11) {
      alert("请输入正确的手机号");
      return;
    }
    // 模拟发送验证码
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

  const handleLogin = () => {
    if (!phone || phone.length !== 11) {
      alert("请输入正确的手机号");
      return;
    }
    if (!code) {
      alert("请输入验证码");
      return;
    }

    // 模拟登录成功，保存登录状态
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userPhone", phone);
    localStorage.setItem("userName", `用户${phone.slice(-4)}`);

    // 跳转到首页
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl mb-6 shadow-2xl shadow-cyan-500/30">
            <span className="text-white text-3xl font-bold">GT</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-3">欢迎回来</h1>
          <p className="text-sm text-slate-400">登录以继续使用量化交易</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl p-7 shadow-xl">
          <div className="space-y-5">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                手机号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="请输入11位手机号"
                className="w-full px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                maxLength={11}
              />
            </div>

            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                验证码
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="请输入6位验证码"
                  className="flex-1 px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  maxLength={6}
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className={`px-5 py-3.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    countdown > 0
                      ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
                  }`}
                >
                  {countdown > 0 ? `${countdown}s` : "获取"}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all mt-2"
            >
              登录
            </button>

            {/* Register Link */}
            <div className="text-center text-sm pt-2">
              <span className="text-slate-400">还没有账号？</span>
              <Link
                href="/register"
                className="text-cyan-400 hover:text-cyan-300 font-medium ml-1 transition-colors"
              >
                立即注册
              </Link>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 text-center text-xs text-slate-500">
          登录即表示同意《用户协议》和《隐私政策》
        </div>
      </div>
    </div>
  );
}
