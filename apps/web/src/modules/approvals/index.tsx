"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader } from "@actiondesk/ui";
import type { ApprovalStatus } from "@actiondesk/contracts";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { DashboardFrame } from "@/modules/dashboard/dashboard-frame";

const statuses: Array<ApprovalStatus | "all"> = ["pending", "all", "approved", "executed", "failed", "rejected"];

export function ApprovalsPage() {
  const utils = trpc.useContext();
  const [status, setStatus] = useState<ApprovalStatus | "all">("pending");
  const approvals = trpc.approvals.list.useQuery(
    { pageSize: 50, ...(status === "all" ? {} : { status }) },
    { retry: false }
  );
  const approve = trpc.approvals.approve.useMutation();
  const reject = trpc.approvals.reject.useMutation();

  async function resolveApproval(action: "approve" | "reject", id: string) {
    if (action === "approve") {
      await approve.mutateAsync({ id });
    } else {
      await reject.mutateAsync({ id });
    }
    await utils.approvals.list.invalidate();
  }

  return (
    <DashboardFrame active={routes.approvals} title="Approvals">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="font-semibold text-slate-950">Approval requests</h2>
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            onChange={(event) => setStatus(event.target.value as ApprovalStatus | "all")}
            value={status}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardBody className="space-y-3">
          {approvals.error ? <ErrorText>{approvals.error.message}</ErrorText> : null}
          {approvals.isLoading ? <p className="text-sm text-slate-500">Loading approvals...</p> : null}
          {!approvals.isLoading && approvals.data?.approvals.length === 0 ? (
            <EmptyState copy="No approval requests match this filter." />
          ) : null}
          {approvals.data?.approvals.map((approval) => (
            <article className="rounded-md border border-slate-200 p-4" key={approval.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-slate-950">{approval.actionType}</h3>
                  <p className="mt-1 text-sm text-slate-500">Created {formatDate(approval.createdAt)}</p>
                </div>
                <Badge tone={statusTone(approval.status)}>{approval.status}</Badge>
              </div>
              <pre className="mt-4 max-h-56 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                {JSON.stringify(approval.payload, null, 2)}
              </pre>
              {approval.errorMessage ? <ErrorText>{approval.errorMessage}</ErrorText> : null}
              {approval.status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={approve.isLoading}
                    onClick={() => void resolveApproval("approve", approval.id)}
                    size="sm"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={reject.isLoading}
                    onClick={() => void resolveApproval("reject", approval.id)}
                    size="sm"
                    variant="secondary"
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </CardBody>
      </Card>
    </DashboardFrame>
  );
}

function statusTone(status: ApprovalStatus) {
  if (status === "executed") {
    return "green";
  }
  if (status === "failed") {
    return "red";
  }
  if (status === "rejected") {
    return "amber";
  }

  return "blue";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
      {copy}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>;
}
