import { Badge, Card, CardBody } from "@actiondesk/ui";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-mist px-6 py-10">
      <section className="mx-auto max-w-4xl">
        <Badge tone="blue">Onboarding placeholder</Badge>
        <h1 className="mt-4 text-3xl font-semibold text-ink">Workspace setup will live here</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Workspace", "Connected accounts", "Command rules"].map((label) => (
            <Card key={label}>
              <CardBody>
                <h2 className="font-semibold text-slate-900">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Reserved for the next product module.
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
