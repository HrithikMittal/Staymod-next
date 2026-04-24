import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/components/global";
import { ThemeProvider } from "next-themes";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Staymod",
  description: "Staymod application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        className={`${inter.variable} ${mono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="h-[100dvh] min-h-full overflow-hidden flex flex-col bg-background text-foreground">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <ClerkProvider
              ui={ui}
              taskUrls={{
                "choose-organization": "/session-tasks/choose-organization",
              }}
            >
              <AppProviders>
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
              </AppProviders>
            </ClerkProvider>
          </ThemeProvider>
        </body>
      </html>
  );
}
