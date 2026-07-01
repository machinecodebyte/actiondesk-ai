import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    timezone: text("timezone").notNull().default("UTC"),
    status: text("status").notNull().default("active"),
    ...timestamps
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email)
  })
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    corsairTenantId: text("corsair_tenant_id").unique(),
    ...timestamps
  },
  (table) => ({
    slugIdx: index("workspaces_slug_idx").on(table.slug)
  })
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniqueMember: uniqueIndex("workspace_members_workspace_user_uidx").on(
      table.workspaceId,
      table.userId
    )
  })
);

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountEmail: text("provider_account_email"),
    corsairAccountId: text("corsair_account_id"),
    corsairIntegrationId: text("corsair_integration_id"),
    status: text("status").notNull().default("disconnected"),
    scopes: jsonb("scopes").$type<string[] | null>(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    ...timestamps
  },
  (table) => ({
    workspaceIdx: index("connected_accounts_workspace_idx").on(table.workspaceId),
    providerIdx: index("connected_accounts_provider_idx").on(table.provider),
    uniqueWorkspaceProvider: uniqueIndex("connected_accounts_workspace_provider_uidx").on(
      table.workspaceId,
      table.provider
    )
  })
);

export const integrationOauthStates = pgTable(
  "integration_oauth_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    state: text("state").notNull().unique(),
    redirectUrl: text("redirect_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    stateIdx: index("integration_oauth_states_state_idx").on(table.state)
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workspaceIdx: index("audit_logs_workspace_idx").on(table.workspaceId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt)
  })
);

export const mailThreads = pgTable(
  "mail_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("gmail"),
    providerThreadId: text("provider_thread_id").notNull(),
    subject: text("subject"),
    snippet: text("snippet"),
    fromEmail: text("from_email"),
    fromName: text("from_name"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    unread: boolean("unread").notNull().default(false),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown> | null>(),
    ...timestamps
  },
  (table) => ({
    workspaceIdx: index("mail_threads_workspace_idx").on(table.workspaceId),
    unreadIdx: index("mail_threads_unread_idx").on(table.unread),
    lastMessageAtIdx: index("mail_threads_last_message_at_idx").on(table.lastMessageAt),
    uniqueProviderThread: uniqueIndex("mail_threads_workspace_provider_thread_uidx").on(
      table.workspaceId,
      table.provider,
      table.providerThreadId
    )
  })
);

export const mailMessages = pgTable(
  "mail_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => mailThreads.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("gmail"),
    providerMessageId: text("provider_message_id").notNull(),
    subject: text("subject"),
    snippet: text("snippet"),
    bodyText: text("body_text"),
    fromEmail: text("from_email"),
    fromName: text("from_name"),
    toEmails: jsonb("to_emails").$type<string[] | null>(),
    ccEmails: jsonb("cc_emails").$type<string[] | null>(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    unread: boolean("unread").notNull().default(false),
    hasAttachments: boolean("has_attachments").notNull().default(false),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown> | null>(),
    ...timestamps
  },
  (table) => ({
    workspaceIdx: index("mail_messages_workspace_idx").on(table.workspaceId),
    threadIdx: index("mail_messages_thread_idx").on(table.threadId),
    receivedAtIdx: index("mail_messages_received_at_idx").on(table.receivedAt),
    uniqueProviderMessage: uniqueIndex("mail_messages_workspace_provider_message_uidx").on(
      table.workspaceId,
      table.provider,
      table.providerMessageId
    )
  })
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("google_calendar"),
    providerEventId: text("provider_event_id").notNull(),
    title: text("title"),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    timezone: text("timezone"),
    attendees: jsonb("attendees").$type<string[] | null>(),
    status: text("status"),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown> | null>(),
    ...timestamps
  },
  (table) => ({
    workspaceIdx: index("calendar_events_workspace_idx").on(table.workspaceId),
    startAtIdx: index("calendar_events_start_at_idx").on(table.startAt),
    uniqueProviderEvent: uniqueIndex("calendar_events_workspace_provider_event_uidx").on(
      table.workspaceId,
      table.provider,
      table.providerEventId
    )
  })
);

export const commandItems = pgTable(
  "command_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id"),
    sourceProviderId: text("source_provider_id"),
    title: text("title").notNull(),
    summary: text("summary"),
    intent: text("intent").notNull().default("manual"),
    priority: text("priority").notNull().default("normal"),
    status: text("status").notNull().default("open"),
    suggestedAction: text("suggested_action"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    workspaceIdx: index("command_items_workspace_idx").on(table.workspaceId),
    userIdx: index("command_items_user_idx").on(table.userId),
    statusIdx: index("command_items_status_idx").on(table.status),
    priorityIdx: index("command_items_priority_idx").on(table.priority),
    dueAtIdx: index("command_items_due_at_idx").on(table.dueAt)
  })
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    commandItemId: uuid("command_item_id").references(() => commandItems.id, { onDelete: "set null" }),
    actionType: text("action_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    ...timestamps
  },
  (table) => ({
    workspaceIdx: index("approval_requests_workspace_idx").on(table.workspaceId),
    userIdx: index("approval_requests_user_idx").on(table.userId),
    statusIdx: index("approval_requests_status_idx").on(table.status),
    actionTypeIdx: index("approval_requests_action_type_idx").on(table.actionType)
  })
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    syncType: text("sync_type").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>()
  },
  (table) => ({
    workspaceIdx: index("sync_runs_workspace_idx").on(table.workspaceId),
    providerIdx: index("sync_runs_provider_idx").on(table.provider),
    statusIdx: index("sync_runs_status_idx").on(table.status),
    startedAtIdx: index("sync_runs_started_at_idx").on(table.startedAt)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaceMembers: many(workspaceMembers),
  sessions: many(userSessions),
  connectedAccounts: many(connectedAccounts),
  commandItems: many(commandItems),
  approvalRequests: many(approvalRequests)
}));

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id]
  }),
  members: many(workspaceMembers),
  connectedAccounts: many(connectedAccounts),
  mailThreads: many(mailThreads),
  mailMessages: many(mailMessages),
  calendarEvents: many(calendarEvents),
  commandItems: many(commandItems),
  approvalRequests: many(approvalRequests),
  syncRuns: many(syncRuns)
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id]
  }),
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id]
  })
}));

export const mailThreadsRelations = relations(mailThreads, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [mailThreads.workspaceId],
    references: [workspaces.id]
  }),
  messages: many(mailMessages)
}));

export const mailMessagesRelations = relations(mailMessages, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [mailMessages.workspaceId],
    references: [workspaces.id]
  }),
  thread: one(mailThreads, {
    fields: [mailMessages.threadId],
    references: [mailThreads.id]
  })
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [calendarEvents.workspaceId],
    references: [workspaces.id]
  })
}));

export const commandItemsRelations = relations(commandItems, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [commandItems.workspaceId],
    references: [workspaces.id]
  }),
  user: one(users, {
    fields: [commandItems.userId],
    references: [users.id]
  }),
  approvalRequests: many(approvalRequests)
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [approvalRequests.workspaceId],
    references: [workspaces.id]
  }),
  user: one(users, {
    fields: [approvalRequests.userId],
    references: [users.id]
  }),
  commandItem: one(commandItems, {
    fields: [approvalRequests.commandItemId],
    references: [commandItems.id]
  })
}));

export const syncRunsRelations = relations(syncRuns, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [syncRuns.workspaceId],
    references: [workspaces.id]
  })
}));
