"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Upload, Sparkles } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function ProfileEditPage() {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarType, setAvatarType] = useState<"auto" | "upload">("auto");
  const [avatarImage, setAvatarImage] = useState("");
  const [avatarText, setAvatarText] = useState("GT");
  const [avatarColor, setAvatarColor] = useState("from-cyan-500 to-blue-600");

  // 预设渐变色
  const gradientColors = [
    "from-cyan-500 to-blue-600",
    "from-purple-500 to-pink-600",
    "from-orange-500 to-red-600",
    "from-green-500 to-teal-600",
    "from-indigo-500 to-purple-600",
    "from-yellow-500 to-orange-600",
  ];

  useEffect(() => {
    if (isLoggedIn) {
      // 从 localStorage 获取用户信息
      const savedPhone = localStorage.getItem("userPhone") || "";
      const savedUserName = localStorage.getItem("userName") || "用户名";
      const savedAvatarType = (localStorage.getItem("avatarType") as "auto" | "upload") || "auto";
      const savedAvatarImage = localStorage.getItem("avatarImage") || "";
      const savedAvatarText = localStorage.getItem("avatarText") || "GT";
      const savedAvatarColor = localStorage.getItem("avatarColor") || "from-cyan-500 to-blue-600";

      setPhone(savedPhone);
      setUserName(savedUserName);
      setAvatarType(savedAvatarType);
      setAvatarImage(savedAvatarImage);
      setAvatarText(savedAvatarText);
      setAvatarColor(savedAvatarColor);
    }
  }, [isLoggedIn]);

  // 自动生成头像
  const handleGenerateAvatar = () => {
    const firstChar = userName.trim().charAt(0).toUpperCase() || "U";
    const randomColor = gradientColors[Math.floor(Math.random() * gradientColors.length)];

    setAvatarType("auto");
    setAvatarText(firstChar);
    setAvatarColor(randomColor);
  };

  // 上传头像
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    // 检查文件大小（限制2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不能超过2MB");
      return;
    }

    // 转换为 base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarType("upload");
      setAvatarImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!userName.trim()) {
      alert("请输入用户名");
      return;
    }

    // 保存到 localStorage
    localStorage.setItem("userName", userName);
    localStorage.setItem("avatarType", avatarType);
    localStorage.setItem("avatarImage", avatarImage);
    localStorage.setItem("avatarText", avatarText);
    localStorage.setItem("avatarColor", avatarColor);

    alert("保存成功");
    router.back();
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
          <h1 className="text-lg font-semibold text-slate-100">编辑资料</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Avatar */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-300 mb-3">
              头像设置
            </h3>

            {/* Avatar Preview */}
            <div className="flex flex-col items-center mb-4">
              {avatarType === "upload" && avatarImage ? (
                <img
                  src={avatarImage}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-20 h-20 bg-gradient-to-br ${avatarColor} rounded-full flex items-center justify-center text-white text-2xl font-bold`}
                >
                  {avatarText}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleUploadClick}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors"
              >
                <Upload className="w-4 h-4" />
                上传图片
              </button>
              <button
                onClick={handleGenerateAvatar}
                className="flex items-center justify-center gap-2 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                自动生成
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 text-center">
              支持 JPG、PNG 格式，大小不超过 2MB
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* User Info */}
          <div className="glass-card rounded-xl p-3 space-y-3">
            {/* Phone (Read-only) */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                手机号
              </label>
              <input
                type="text"
                value={phone}
                disabled
                className="w-full px-3 py-2.5 bg-slate-800/30 border border-slate-700/50 rounded-lg text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1.5">手机号不可修改</p>
            </div>

            {/* User Name */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                用户名
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="请输入用户名"
                maxLength={20}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {userName.length}/20
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="glass-card border-t border-slate-700/50">
        <div className="max-w-md mx-auto p-3">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
