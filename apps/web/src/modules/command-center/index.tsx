"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@actiondesk/ui";
import type { CommandPriority, CommandStatus } from "@actiondesk/contracts";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { DashboardFrame } from "@/modules/dashboard/dashboard-frame";

const statuses: Array<CommandStatus | "all"> = ["all", "open", "snoozed", "waiting", "done", "dismissed", "failed"];
const priorities: Array<CommandPriority | "all"> = ["all", "low", "normal", "high", "urgent"];

export function CommandCenterPage() {
  const utils = trpc.useContext();
  const [status, setStatus] = useState<CommandStatus | "all">("open");
  const [priority, setPriority] = useState<CommandPriority | "all">("all");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const commands = trpc.commands.list.useQuery(
    {
      pageSize: 50,
      ...(status === "all" ? {} : { status }),
      ...(priority === "all" ? {} : { priority })
    },
    { retry: false }
  );
  const create = trpc.commands.create.useMutation();
  const markDone = trpc.commands.markDone.useMutation();
  const dismiss = trpc.commands.dismiss.useMutation();
  const snooze = trpc.commands.snooze.useMutation();

  async function createManualCommand() {
    setMessage(null);
    if (!title.trim()) {
      setMessage("Command title is required.");
      return;
    }

    const response = await create.mutateAsync({
      sourceType: "manual",
      title: title.trim(),
      summary: summary.trim() || undefined,
      priority: "normal",
      intent: "manual"
    });
    setTitle("");
    setSummary("");
    setMessage(`Created command item: ${response.item.title}`);
    await utils.commands.list.invalidate();
  }

  async function updateItem(action: "done" | "dismiss" | "snooze", id: string) {
    if (action === "done") {
      await markDone.mutateAsync({ id });
    } else if (action === "dismiss") {
      await dismiss.mutateAsync({ id });
    } else {
      await snooze.mutateAsync({ id, snoozedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    }
    await utils.commands.list.invalidate();
  }

  return (
    <DashboardFrame active={routes.commands} title="Commands">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-950">Create manual command</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {message ? <Notice>{message}</Notice> : null}
            <Input onChange={(event) => setTitle(event.target.value)} placeholder="Title" value={title} />
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Summary"
              value={summary}
            />
            <Button disabled={create.isLoading} onClick={() => void createManualCommand()}>
              Create Command
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="space-y-4">
            <h2 className="font-semibold text-slate-950">Command items</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                onChange={(event) => setStatus(event.target.value as CommandStatus | "all")}
                value={status}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                onChange={(event) => setPriority(event.target.value as CommandPriority | "all")}
                value={priority}
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {commands.error ? <ErrorText>{commands.error.message}</ErrorText> : null}
            {commands.isLoading ? <p className="text-sm text-slate-500">Loading commands...</p> : null}
            {!commands.isLoading && commands.data?.items.length === 0 ? (
              <EmptyState copy="No command items match these filters yet." />
            ) : null}
            {commands.data?.items.map((item) => (
              <article className="rounded-md border border-slate-200 p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.summary ?? "No summary."}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="blue">{item.priority}</Badge>
                    <Badge tone={item.status === "failed" ? "red" : "neutral"}>{item.status}</Badge>
                  </div>
                </div>
                {item.suggestedAction ? (
                  <p className="mt-3 text-sm text-slate-500">Suggested action: {item.suggestedAction}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void updateItem("done", item.id)} variant="secondary">
                    Mark done
                  </Button>
                  <Button size="sm" onClick={() => void updateItem("snooze", item.id)} variant="secondary">
                    Snooze 1 day
                  </Button>
                  <Button size="sm" onClick={() => void updateItem("dismiss", item.id)} variant="ghost">
                    Dismiss
                  </Button>
                </div>
              </article>
            ))}
          </CardBody>
        </Card>
      </div>
    </DashboardFrame>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
      {copy}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{children}</p>;
}
