import type {Metadata} from "next";
import {JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import {ThemeProvider} from "@/components/theme-provider";
import {NotificationBanner} from "@/components/notification-banner";
import {SiteConfigHydrator} from "@/components/site-config-hydrator";
const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const DEFAULT_TITLE = "Nbility Status";
const DEFAULT_DESCRIPTION = "Nbility AI 模型服务状态与可用性监控";
const DEFAULT_KEYWORDS = ["Nbility", "Nbility Status", "AI API Status", "AI Model Status"];
const SITE_URL = "https://status.nbility.ai";
const BRAND_URL = "https://nbility.ai";
const LOGO_URL = `${BRAND_URL}/logo.svg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${DEFAULT_TITLE}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: DEFAULT_TITLE,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: "Nbility", url: BRAND_URL }],
  creator: "Nbility",
  publisher: "Nbility",
  alternates: { canonical: "/" },
  icons: { icon: LOGO_URL, shortcut: LOGO_URL, apple: LOGO_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: DEFAULT_TITLE,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: LOGO_URL, width: 1024, height: 1024, alt: "Nbility" }],
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [LOGO_URL],
  },
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
