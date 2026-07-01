"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Input } from "@actiondesk/ui";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { DashboardFrame } from "@/modules/dashboard/dashboard-frame";

export function CalendarPage() {
  const utils = trpc.useContext();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [message, setMessage] = useState<string | null>(null);
  const events = trpc.calendar.listEvents.useQuery(
    {
      pageSize: 50,
      ...(startAt ? { startAt: toIso(startAt) } : {}),
      ...(endAt ? { endAt: toIso(endAt) } : {})
    },
    { retry: false }
  );
  const sync = trpc.calendar.sync.useMutation();
  const availability = trpc.calendar.availability.useMutation();

  async function handleSync() {
    setMessage(null);
    try {
      await sync.mutateAsync({});
      await utils.calendar.listEvents.invalidate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Live provider sync is not configured yet.");
    }
  }

  async function handleAvailability() {
    setMessage(null);
    if (!availabilityStart || !availabilityEnd) {
      setMessage("Choose a start and end time before checking availability.");
      return;
    }

    await availability.mutateAsync({
      startAt: toIso(availabilityStart),
      endAt: toIso(availabilityEnd),
      durationMinutes
    });
  }

  return (
    <DashboardFrame active={routes.calendar} title="Calendar">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Cached events</h2>
              <Button disabled={sync.isLoading} onClick={() => void handleSync()} size="sm">
                Sync Calendar
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input onChange={(event) => setStartAt(event.target.value)} type="datetime-local" value={startAt} />
              <Input onChange={(event) => setEndAt(event.target.value)} type="datetime-local" value={endAt} />
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {message ? <Notice>{message}</Notice> : null}
            {events.error ? <ErrorText>{events.error.message}</ErrorText> : null}
            {events.isLoading ? <p className="text-sm text-slate-500">Loading events...</p> : null}
            {!events.isLoading && events.data?.events.length === 0 ? (
              <EmptyState copy="No cached Calendar events yet. Connect Google Calendar, then run sync. No fake events are shown here." />
            ) : null}
            {events.data?.events.map((event) => (
              <article className="rounded-md border border-slate-200 p-4" key={event.id}>
                <h3 className="font-medium text-slate-950">{event.title ?? "(untitled event)"}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {event.startAt ? formatDate(event.startAt) : "No start"} - {event.endAt ? formatDate(event.endAt) : "No end"}
                </p>
                {event.location ? <p className="mt-2 text-sm text-slate-600">{event.location}</p> : null}
              </article>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-950">Availability</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              onChange={(event) => setAvailabilityStart(event.target.value)}
              type="datetime-local"
              value={availabilityStart}
            />
            <Input
              onChange={(event) => setAvailabilityEnd(event.target.value)}
              type="datetime-local"
              value={availabilityEnd}
            />
            <Input
              min={15}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              type="number"
              value={durationMinutes}
            />
            <Button disabled={availability.isLoading} onClick={() => void handleAvailability()}>
              Check availability
            </Button>
            {availability.error ? <ErrorText>{availability.error.message}</ErrorText> : null}
            {availability.data?.message ? <Notice>{availability.data.message}</Notice> : null}
            {availability.data?.slots.length === 0 ? <EmptyState copy="No free slots found from cached events." /> : null}
            {availability.data?.slots.map((slot) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-700" key={slot.startAt}>
                {formatDate(slot.startAt)} - {formatDate(slot.endAt)}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </DashboardFrame>
  );
}

function toIso(value: string): string {
  return new Date(value).toISOString();
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
  return <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{children}</p>;
}
