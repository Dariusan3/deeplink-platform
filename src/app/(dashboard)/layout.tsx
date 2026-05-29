import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UserProvider } from "@/providers/user-provider";
import { TeamProvider } from "@/providers/team-provider";
import { LinksProvider } from "@/providers/links-provider";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <TeamProvider>
        <LinksProvider>
          <DashboardShell>{children}</DashboardShell>
        </LinksProvider>
      </TeamProvider>
    </UserProvider>
  );
}
