import type {Metadata} from "next";
import {JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import {ThemeProvider} from "@/components/theme-provider";
import {NotificationBanner} from "@/components/notification-banner";
import {SiteConfigHydrator} from "@/components/site-config-hydrator";
const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const DEFAULT_TITLE = "Check CX - AI 模型健康监控";
const DEFAULT_DESCRIPTION = "实时检测 OpenAI / Gemini / Anthropic 对话接口的可用性与延迟";

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  icons: { icon: "/favicon.png" },
  openGraph: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
};

const themeBootScript = `(()=>{
  const hour = new Date().getHours();
  const isDark = hour >= 19 || hour < 7;
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={jetbrainsMono.variable}>
      <head>
        <script
          id="theme-boot"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body className="antialiased">
        <NextTopLoader color="var(--foreground)" showSpinner={false} />
        <SiteConfigHydrator />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
