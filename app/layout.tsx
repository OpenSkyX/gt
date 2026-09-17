"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import ErrorSuppressor from "./components/ErrorSuppressor";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});




const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        {/* 在所有脚本之前设置错误处理，抑制 Web Vitals 错误 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 保存原始的 console.error
                const originalError = console.error;

                // 拦截 console.error
                console.error = function(...args) {
                  const msg = args.join(' ');
                  if (msg.includes('startTime') ||
                      msg.includes('reportAllChanges') ||
                      msg.includes('Cannot read properties of undefined')) {
                    return; // 抑制错误
                  }
                  originalError.apply(console, args);
                };

                // 拦截全局错误
                window.addEventListener('error', function(e) {
                  if (e.message && (
                    e.message.includes('startTime') ||
                    e.message.includes('reportAllChanges') ||
                    e.message.includes('Cannot read properties of undefined')
                  )) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }, true);

                // 拦截未处理的 Promise rejection
                window.addEventListener('unhandledrejection', function(e) {
                  const msg = String(e.reason);
                  if (msg.includes('startTime') ||
                      msg.includes('reportAllChanges') ||
                      msg.includes('Cannot read properties of undefined')) {
                    e.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ErrorSuppressor />
        {!isAuthPage && <Header />}
        <main className={`flex-1 overflow-auto ${!isAuthPage ? "pt-14 pb-16" : ""}`}>
          <div className={!isAuthPage ? "max-w-md mx-auto h-full" : "h-full"}>
            {children}
          </div>
        </main>
        {!isAuthPage && <BottomNav />}
      </body>
    </html>
  );
}
