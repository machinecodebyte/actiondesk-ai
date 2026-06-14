import { AppShell, Badge, Card, CardBody, CardHeader } from "@actiondesk/ui";
import { FoundationHealthBanner } from "@/modules/foundation/foundation.health-banner";
import { routes } from "@/lib/routes";

const navItems = [
  { label: "Dashboard", href: routes.dashboard, active: true },
  { label: "Action Inbox", href: routes.dashboard },
  { label: "Calendar", href: routes.dashboard },
  { label: "Agent Command", href: routes.dashboard },
  { label: "Settings", href: routes.dashboard }
];

const panels = [
  {
    title: "Action Inbox",
    tone: "green" as const,
    copy: "Future email-derived command items will appear here after integrations are built."
  },
  {
    title: "Calendar Panel",
    tone: "blue" as const,
    copy: "Availability, conflicts, and calendar actions are reserved for a later module."
  },
  {
    title: "Agent Command",
    tone: "amber" as const,
    copy: "The agent command surface is present without tool execution or AI orchestration."
  }
];

export function DashboardShell() {
  return (
    <AppShell
      title="ActionDesk AI"
      navItems={navItems}
      topbar={
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Workspace</p>
            <h1 className="text-lg font-semibold text-ink">Foundation dashboard</h1>
          </div>
          <FoundationHealthBanner />
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="grid gap-5 lg:grid-cols-3">
          {panels.map((panel) => (
            <Card key={panel.title}>
              <CardHeader className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-950">{panel.title}</h2>
                <Badge tone={panel.tone}>Placeholder</Badge>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-6 text-slate-600">{panel.copy}</p>
                <div className="mt-5 h-24 rounded-md border border-dashed border-slate-300 bg-slate-50" />
              </CardBody>
            </Card>
          ))}
        </section>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-950">Service Health</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {["api-gateway", "auth-service", "mail-service", "calendar-service"].map((service) => (
              <div key={service} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{service}</span>
                <Badge tone={service === "api-gateway" ? "green" : "neutral"}>
                  {service === "api-gateway" ? "wired" : "pending"}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
