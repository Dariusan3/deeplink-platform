import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UserProvider } from "@/providers/user-provider";
import { TeamProvider } from "@/providers/team-provider";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <TeamProvider>
        <DashboardShell>{children}</DashboardShell>
      </TeamProvider>
    </UserProvider>
  );
}
