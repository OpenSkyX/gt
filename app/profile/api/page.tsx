"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  getMyExchangeApiAction,
  saveMyExchangeApiAction,
  deleteMyExchangeApiAction,
  getExchangeTypesAction,
  testGateApiAction,
  type ExchangeApiInfo,
  type ExchangeTypeOption,
} from "../../actions/exchange";

export default function ApiAuthPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();

  const [exchangeTypes, setExchangeTypes] = useState<ExchangeTypeOption[]>([]);
  const [exchangeCode, setExchangeCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [existingApi, setExistingApi] = useState<ExchangeApiInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Gate.io 的 Passphrase 是可选的
  const showPassphraseField = exchangeCode === "gate";

  useEffect(() => {
    if (!isLoggedIn) return;

    getExchangeTypesAction().then((result) => {
      if (result.success) {
        setExchangeTypes(result.data);
        // 默认选择第一个可用的交易所（跳过 binance）
        const firstAvailable = result.data.find(type => type.code !== 'binance');
        setExchangeCode((prev) => prev || firstAvailable?.code || "");
      }
    });

    // 从数据库检查是否已有授权的 API
    getMyExchangeApiAction().then((result) => {
      if (result.success) {
        setExistingApi(result.data);
        if (result.data) {
          setExchangeCode(result.data.exchangeCode);
        }
      }
    });
  }, [isLoggedIn]);

  // 测试API
  const handleTest = async () => {
    if (!apiKey || !apiSecret) {
      alert("请填写 API Key 和 Secret");
      return;
    }

    setTestStatus("testing");
    setTestMessage("正在测试连接和权限...");

    try {
      // 目前只支持 Gate.io 的测试
      if (exchangeCode === "gate") {
        const result = await testGateApiAction({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          passphrase: passphrase.trim(),
        });

        if (result.success) {
          if (result.data.hasContractPermission) {
            setTestStatus("success");
            setTestMessage("✓ API 测试通过，具有合约权限");
          } else {
            setTestStatus("failed");
            setTestMessage("API 没有合约权限");
          }
        } else {
          setTestStatus("failed");
          setTestMessage(result.error);
        }
      } else {
        // 其他交易所暂未实现
        setTestStatus("failed");
        setTestMessage("该交易所暂不支持测试");
      }
    } catch (error: any) {
      setTestStatus("failed");
      setTestMessage(error.message || "测试过程发生错误");
    }
  };

  // 添加API
  const handleAdd = async () => {
    if (testStatus !== "success") {
      alert("请先通过API测试");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveMyExchangeApiAction({ exchangeCode, apiKey, apiSecret, passphrase });
      if (!result.success) {
        alert(result.error);
        return;
      }

      setExistingApi(result.data);
      setApiKey("");
      setApiSecret("");
      setPassphrase("");
      setTestStatus("idle");
      alert("API授权成功");
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  // 删除API
  const handleDelete = async () => {
    if (!confirm("确定要删除已授权的API吗？")) return;

    setIsDeleting(true);
    try {
      const result = await deleteMyExchangeApiAction();
      if (!result.success) {
        alert(result.error);
        return;
      }
      setExistingApi(null);
      alert("API已删除");
    } finally {
      setIsDeleting(false);
    }
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
          <div>
            <h1 className="text-lg font-semibold text-slate-100">授权API</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gate.io 永续合约</p>
          </div>
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
                  disabled={isDeleting}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "删除中..." : "删除"}
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">交易所</span>
                  <span className="text-slate-300">{existingApi.exchangeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">API Key</span>
                  <span className="text-slate-300 mono-num">{existingApi.apiKey}</span>
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-300">
                交易所
              </h3>
              <span className="text-xs text-cyan-400 font-medium">永续合约</span>
            </div>
            <select
              value={exchangeCode}
              onChange={(e) => {
                setExchangeCode(e.target.value);
                setTestStatus("idle");
              }}
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              {exchangeTypes.length === 0 && <option value="">加载中...</option>}
              {exchangeTypes.map((type) => (
                <option
                  key={type.code}
                  value={type.code}
                  disabled={type.code === 'binance'}
                >
                  {type.code === 'binance' ? `${type.name} (待开放)` : type.name}
                </option>
              ))}
            </select>
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
            {showPassphraseField && (
              <div>
                <label className="text-xs text-slate-400 mb-2 block">
                  Passphrase <span className="text-slate-500">(可选)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={passphrase}
                    onChange={(e) => {
                      setPassphrase(e.target.value);
                      setTestStatus("idle");
                    }}
                  placeholder="请输入 Passphrase（可选，如未设置可留空）"
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
            )}

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
                  <p>• 仅用于 Gate.io 永续合约交易</p>
                  <p>• 请确保API具有合约交易权限</p>
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
            disabled={testStatus !== "success" || isSaving}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              testStatus === "success" && !isSaving
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? "保存中..." : testStatus === "success" ? "添加" : "请先测试连接"}
          </button>
        </div>
      </div>
    </div>
  );
}
