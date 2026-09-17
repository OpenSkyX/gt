"use client";

import { useEffect } from "react";

/**
 * 抑制 MetaMask 等浏览器扩展产生的错误
 * 这些错误不影响应用功能，但会在控制台产生噪音
 */
export default function ErrorSuppressor() {
  useEffect(() => {
    // 保存原始的 console.error
    const originalConsoleError = console.error;

    // 覆盖 console.error 来过滤特定错误
    console.error = (...args: any[]) => {
      const errorStr = args.join(" ");
      const shouldSuppress =
        errorStr.includes("startTime") ||
        errorStr.includes("reportAllChanges") ||
        errorStr.includes("Cannot read properties of undefined");

      if (!shouldSuppress) {
        originalConsoleError.apply(console, args);
      } else if (process.env.NODE_ENV === "development") {
        console.debug("[Suppressed Console Error]:", errorStr);
      }
    };

    // 捕获未处理的 Promise rejection（如 MetaMask 连接失败）
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // 检查是否是 MetaMask 相关错误
      const errorMessage = event.reason?.message || String(event.reason);
      if (
        errorMessage.includes("MetaMask") ||
        errorMessage.includes("ethereum") ||
        errorMessage.includes("startTime") ||
        errorMessage.includes("reportAllChanges") ||
        event.reason?.stack?.includes("chrome-extension://")
      ) {
        // 阻止错误显示在控制台
        event.preventDefault();
        // 可选：在开发环境中静默记录
        if (process.env.NODE_ENV === "development") {
          console.debug("[Suppressed Extension Error]:", errorMessage);
        }
      }
    };

    // 捕获全局错误
    const handleError = (event: ErrorEvent) => {
      const shouldSuppress =
        event.filename?.includes("chrome-extension://") ||
        event.message?.includes("MetaMask") ||
        event.message?.includes("startTime") || // Web Vitals 错误
        event.message?.includes("reportAllChanges") || // Web Vitals 错误
        event.message?.includes("Cannot read properties of undefined"); // Web Vitals 相关

      if (shouldSuppress) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (process.env.NODE_ENV === "development") {
          console.debug("[Suppressed Error]:", event.message);
        }
        return false;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      // 恢复原始的 console.error
      console.error = originalConsoleError;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
