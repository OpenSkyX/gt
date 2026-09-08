"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface ApiConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  createdAt: string;
}

export default function ApiAuthPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [existingApi, setExistingApi] = useState<ApiConfig | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      // 检查是否已有授权的API
      const savedApi = localStorage.getItem("gateApiConfig");
      if (savedApi) {
        setExistingApi(JSON.parse(savedApi));
      }
    }
  }, [isLoggedIn]);

  // 测试API
  const handleTest = async () => {
    if (!apiKey || !apiSecret || !passphrase) {
      alert("请填写完整的API信息");
      return;
    }

    setTestStatus("testing");
    setTestMessage("正在测试连接...");

    // 模拟API测试
    setTimeout(() => {
      // 简单的格式验证
      const isValid =
        apiKey.length > 10 &&
        apiSecret.length > 10 &&
        passphrase.length > 0;

      if (isValid) {
        setTestStatus("success");
        setTestMessage("API测试通过，可以添加");
      } else {
        setTestStatus("failed");
        setTestMessage("API验证失败，请检查信息是否正确");
      }
    }, 2000);
  };

  // 添加API
  const handleAdd = () => {
    if (testStatus !== "success") {
      alert("请先通过API测试");
      return;
    }

    const apiConfig: ApiConfig = {
      apiKey,
      apiSecret,
      passphrase,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("gateApiConfig", JSON.stringify(apiConfig));
    alert("API授权成功");
    router.back();
  };

  // 删除API
  const handleDelete = () => {
    if (confirm("确定要删除已授权的API吗？")) {
      localStorage.removeItem("gateApiConfig");
      setExistingApi(null);
      alert("API已删除");
    }
  };

  // 隐藏密钥中间部分
  const maskSecret = (str: string) => {
    if (str.length <= 8) return str;
    return str.slice(0, 4) + "****" + str.slice(-4);
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
          <h1 className="text-lg font-semibold text-slate-100">授权API</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Existing API */}
          {existingApi && (
            <div className="glass-card rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-emerald-400">
                    已授权
                  </h3>
                </div>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  删除
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">API Key</span>
                  <span className="text-slate-300 mono-num">{maskSecret(existingApi.apiKey)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">添加时间</span>
                  <span className="text-slate-300 mono-num">
                    {new Date(existingApi.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Exchange Info */}
          <div className="glass-card rounded-xl p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              交易所
            </h3>
            <div className="flex items-center gap-2 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                GT
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Gate.io</p>
                <p className="text-xs text-slate-500">全球领先交易所</p>
              </div>
            </div>
          </div>

          {/* API Form */}
          <div className="glass-card rounded-xl p-3 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">
              API 配置
            </h3>

            {/* API Key */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus("idle");
                }}
                placeholder="请输入 API Key"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 mono-num"
              />
            </div>

            {/* API Secret */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                API Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={apiSecret}
                  onChange={(e) => {
                    setApiSecret(e.target.value);
                    setTestStatus("idle");
                  }}
                  placeholder="请输入 API Secret"
                  className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 mono-num"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showSecret ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Passphrase */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassphrase ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    setTestStatus("idle");
                  }}
                  placeholder="请输入 Passphrase"
                  className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassphrase ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Test Status */}
            {testStatus !== "idle" && (
              <div
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                  testStatus === "testing"
                    ? "bg-cyan-500/10 text-cyan-400"
                    : testStatus === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {testStatus === "testing" ? (
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                ) : testStatus === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{testMessage}</span>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={handleTest}
              disabled={testStatus === "testing"}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                testStatus === "testing"
                  ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              {testStatus === "testing" ? "测试中..." : "测试连接"}
            </button>
          </div>

          {/* Warning */}
          <div className="glass-card rounded-xl p-3 border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-bold text-amber-400 mb-1">
                  安全提示
                </h3>
                <div className="text-xs text-slate-400 leading-relaxed space-y-0.5">
                  <p>• 请确保API具有交易权限</p>
                  <p>• 不要将API密钥泄露给他人</p>
                  <p>• 建议设置IP白名单限制</p>
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
            onClick={handleAdd}
            disabled={testStatus !== "success"}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              testStatus === "success"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            {testStatus === "success" ? "添加" : "请先测试连接"}
          </button>
        </div>
      </div>
    </div>
  );
}
