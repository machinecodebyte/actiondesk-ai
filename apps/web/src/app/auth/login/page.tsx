"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, CardBody, Input } from "@actiondesk/ui";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const isPending = login.isLoading || register.isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      if (mode === "login") {
        await login.mutateAsync({ email, password });
      } else {
        await register.mutateAsync({
          email,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(workspaceName.trim() ? { workspaceName: workspaceName.trim() } : {})
        });
      }

      router.push(routes.onboarding);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to continue");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 py-10">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-ink">ActionDesk AI</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to your workspace or create a new command center.
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
            <button
              className={`rounded px-3 py-2 text-sm font-medium ${
                mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
              }`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`rounded px-3 py-2 text-sm font-medium ${
                mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
              }`}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Name</span>
                  <Input
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex Morgan"
                    value={name}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Workspace</span>
                  <Input
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder="Acme Operations"
                    value={workspaceName}
                  />
                </label>
              </>
            ) : null}
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <Input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <Input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 8 : 1}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {formError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </p>
            ) : null}
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Working..." : mode === "login" ? "Login" : "Create workspace"}
            </Button>
          </form>
          <Link className="block text-sm font-medium text-action" href={routes.home}>
            Back to home
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
