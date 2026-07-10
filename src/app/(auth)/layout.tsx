import type { Metadata } from "next";
import { UserProvider } from "@/providers/user-provider";

// Private surface — never index, never follow. Defense in depth on top of the
// Disallow rules in src/app/robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};


export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}
