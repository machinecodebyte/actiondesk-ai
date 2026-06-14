import Link from "next/link";
import { Button, Card, CardBody, Input } from "@actiondesk/ui";
import { routes } from "@/lib/routes";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-ink">ActionDesk AI</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Authentication is a placeholder in this foundation build.
            </p>
          </div>
          <Input placeholder="name@company.com" disabled />
          <Button className="w-full" disabled>
            Continue
          </Button>
          <Link className="block text-sm font-medium text-action" href={routes.dashboard}>
            View dashboard shell
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
