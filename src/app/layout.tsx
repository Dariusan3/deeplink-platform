import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeepLink — Smart Link Management Platform",
  description:
    "Create intelligent deeplinks that route users dynamically based on geo, device, and time. Built for teams who need precision control over every click.",
};

import { UserProvider } from "@/providers/user-provider";
import { TeamProvider } from "@/providers/team-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <TeamProvider>
            {children}
            <Toaster theme="dark" position="bottom-right" closeButton />
          </TeamProvider>
        </UserProvider>
      </body>
    </html>
  );
}
