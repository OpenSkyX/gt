/**
 * 通用加载组件
 * 在页面或内容加载时显示加载动画
 */
export default function Loading({
  size = "default",
  fullScreen = false
}: {
  size?: "small" | "default" | "large";
  fullScreen?: boolean;
}) {
  const sizeClasses = {
    small: "w-8 h-8",
    default: "w-16 h-16",
    large: "w-24 h-24",
  };

  const spinner = (
    <div className="relative" style={{ width: sizeClasses[size].split(' ')[0].replace('w-', '') + 'px', height: sizeClasses[size].split(' ')[1].replace('h-', '') + 'px' }}>
      <div className={`absolute inset-0 border-4 border-slate-700/30 rounded-full ${sizeClasses[size]}`}></div>
      <div className={`absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin ${sizeClasses[size]}`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-4">
          {spinner}
          <p className="text-sm text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      {spinner}
    </div>
  );
}

/**
 * 页面级加载组件
 */
export function PageLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-slate-400">加载中...</p>
      </div>
    </div>
  );
}

/**
 * 内容区域加载组件（适合在卡片内使用）
 */
export function ContentLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-3 border-slate-700/30 rounded-full"></div>
          <div className="absolute inset-0 border-3 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
        <p className="text-xs text-slate-500">加载中...</p>
      </div>
    </div>
  );
}
