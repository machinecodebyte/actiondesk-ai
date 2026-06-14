import Link from "next/link";
import { Badge, Card, CardBody } from "@actiondesk/ui";
import { routes } from "@/lib/routes";

const foundations = [
  "API gateway boundary",
  "Shared contracts",
  "Health checks",
  "Service skeletons"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-mist px-6 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <Badge tone="green" className="w-fit">
            Foundation ready
          </Badge>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-ink md:text-6xl">
            ActionDesk AI
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            A clean command-center foundation for Gmail, Calendar, agents, and internal services.
            The product workflows are intentionally left blank until the platform contracts are ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              href={routes.dashboard}
            >
              Open dashboard
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-50"
              href={routes.login}
            >
              Sign in placeholder
            </Link>
          </div>
        </div>
        <Card className="self-center">
          <CardBody className="space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Current module</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">Production foundation</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {foundations.map((item) => (
                <div key={item} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
