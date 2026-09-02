import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { SessionProvider } from "@/components/session-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getMessages } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Publish your work, grow an audience, and connect with other creators.";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "CreatorHub",
    template: "%s · CreatorHub",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "CreatorHub",
    description: DESCRIPTION,
    siteName: "CreatorHub",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "CreatorHub", description: DESCRIPTION },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, { locale, messages, fallback }] = await Promise.all([
    getCurrentUser(),
    getMessages(),
  ]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <I18nProvider locale={locale} messages={messages} fallback={fallback}>
          <SessionProvider initialUser={user}>{children}</SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
