"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@actiondesk/ui";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { DashboardFrame } from "@/modules/dashboard/dashboard-frame";

const providerSetupMessage =
  "Live provider sync is not configured yet. Add Corsair SDK credentials to enable Gmail/Calendar sync.";

export function InboxPage() {
  const utils = trpc.useContext();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const threads = trpc.mail.listThreads.useQuery(
    { pageSize: 25, ...(search ? { search } : {}) },
    { retry: false }
  );
  const thread = trpc.mail.getThread.useQuery(
    { id: selectedThreadId ?? "" },
    { enabled: Boolean(selectedThreadId), retry: false }
  );
  const sync = trpc.mail.sync.useMutation();
  const createCommand = trpc.commands.create.useMutation();
  const createApproval = trpc.approvals.create.useMutation();
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setMessage(null);
    try {
      await sync.mutateAsync({});
      await utils.mail.listThreads.invalidate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : providerSetupMessage);
    }
  }

  async function handleCreateCommand() {
    if (!thread.data?.thread) {
      return;
    }

    const created = await createCommand.mutateAsync({
      sourceType: "email",
      sourceId: thread.data.thread.id,
      sourceProviderId: thread.data.thread.providerThreadId,
      title: thread.data.thread.subject ?? "Follow up on email",
      summary: thread.data.thread.snippet ?? undefined
    });

    setMessage(`Created command item: ${created.item.title}`);
    await utils.commands.list.invalidate();
  }

  async function handleDraftApproval() {
    if (!thread.data?.thread || !replyBody.trim()) {
      return;
    }

    await createApproval.mutateAsync({
      actionType: "create_email_draft",
      commandItemId: undefined,
      payload: {
        threadId: thread.data.thread.id,
        body: replyBody.trim()
      }
    });
    setReplyBody("");
    setMessage("Draft reply approval was created.");
    await utils.approvals.list.invalidate();
  }

  return (
    <DashboardFrame active={routes.inbox} title="Inbox">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Gmail threads</h2>
              <Button disabled={sync.isLoading} onClick={() => void handleSync()} size="sm">
                Sync Gmail
              </Button>
            </div>
            <Input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cached threads"
              value={search}
            />
          </CardHeader>
          <CardBody className="space-y-3">
            {message ? <Notice>{message}</Notice> : null}
            {threads.error ? <ErrorText>{threads.error.message}</ErrorText> : null}
            {threads.isLoading ? <p className="text-sm text-slate-500">Loading threads...</p> : null}
            {!threads.isLoading && threads.data?.threads.length === 0 ? (
              <EmptyState copy="No cached Gmail threads yet. Connect Gmail, then run sync. No fake emails are shown here." />
            ) : null}
            {threads.data?.threads.map((item) => (
              <button
                className="block w-full rounded-md border border-slate-200 bg-white p-3 text-left hover:border-slate-300"
                key={item.id}
                onClick={() => setSelectedThreadId(item.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-slate-950">{item.subject ?? "(no subject)"}</p>
                  {item.unread ? <Badge tone="blue">Unread</Badge> : null}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{item.fromEmail ?? "Unknown sender"}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.snippet ?? "No snippet cached."}</p>
              </button>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-950">Thread detail</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {!selectedThreadId ? <EmptyState copy="Select a cached Gmail thread to view messages." /> : null}
            {thread.error ? <ErrorText>{thread.error.message}</ErrorText> : null}
            {thread.isLoading ? <p className="text-sm text-slate-500">Loading thread...</p> : null}
            {thread.data ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {thread.data.thread.subject ?? "(no subject)"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{thread.data.thread.fromEmail ?? "Unknown sender"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button disabled={createCommand.isLoading} onClick={() => void handleCreateCommand()}>
                    Create Command Item
                  </Button>
                </div>
                <div className="space-y-3">
                  <textarea
                    className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder="Draft reply text for approval"
                    value={replyBody}
                  />
                  <Button
                    disabled={!replyBody.trim() || createApproval.isLoading}
                    onClick={() => void handleDraftApproval()}
                    variant="secondary"
                  >
                    Request Draft Approval
                  </Button>
                </div>
                <div className="space-y-3">
                  {thread.data.messages.length === 0 ? (
                    <EmptyState copy="No cached messages are available for this thread yet." />
                  ) : null}
                  {thread.data.messages.map((messageItem) => (
                    <article className="rounded-md border border-slate-200 p-3" key={messageItem.id}>
                      <p className="text-sm font-medium text-slate-950">
                        {messageItem.subject ?? thread.data.thread.subject ?? "(no subject)"}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {messageItem.bodyText ?? messageItem.snippet ?? "No message body cached."}
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
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
  return <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{children}</p>;
}
