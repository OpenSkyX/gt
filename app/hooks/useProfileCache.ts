// 本地缓存的用户资料，用于页面挂载时立即展示，避免每次都要等服务端请求返回才出现头像/用户名
export type CachedProfile = {
  phone: string;
  userName: string;
  avatarType: "auto" | "upload";
  avatarImage: string;
  avatarText: string;
  avatarColor: string;
  inviteCode: string;
};

const DEFAULT_PROFILE: CachedProfile = {
  phone: "",
  userName: "用户名",
  avatarType: "auto",
  avatarImage: "",
  avatarText: "GT",
  avatarColor: "from-cyan-500 to-blue-600",
  inviteCode: "",
};

export function readCachedProfile(): CachedProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;

  return {
    phone: localStorage.getItem("userPhone") || DEFAULT_PROFILE.phone,
    userName: localStorage.getItem("userName") || DEFAULT_PROFILE.userName,
    avatarType:
      (localStorage.getItem("avatarType") as "auto" | "upload") || DEFAULT_PROFILE.avatarType,
    avatarImage: localStorage.getItem("avatarImage") || DEFAULT_PROFILE.avatarImage,
    avatarText: localStorage.getItem("avatarText") || DEFAULT_PROFILE.avatarText,
    avatarColor: localStorage.getItem("avatarColor") || DEFAULT_PROFILE.avatarColor,
    inviteCode: localStorage.getItem("inviteCode") || DEFAULT_PROFILE.inviteCode,
  };
}

export function writeCachedProfile(profile: Omit<CachedProfile, "phone"> & { phone?: string }): void {
  if (typeof window === "undefined") return;

  if (profile.phone) localStorage.setItem("userPhone", profile.phone);
  localStorage.setItem("userName", profile.userName);
  localStorage.setItem("avatarType", profile.avatarType);
  localStorage.setItem("avatarImage", profile.avatarImage);
  localStorage.setItem("avatarText", profile.avatarText);
  localStorage.setItem("avatarColor", profile.avatarColor);
  localStorage.setItem("inviteCode", profile.inviteCode);
}
