CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"command_item_id" uuid,
	"action_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text DEFAULT 'google_calendar' NOT NULL,
	"provider_event_id" text NOT NULL,
	"title" text,
	"description" text,
	"location" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"timezone" text,
	"attendees" jsonb,
	"status" text,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"source_provider_id" text,
	"title" text NOT NULL,
	"summary" text,
	"intent" text DEFAULT 'manual' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"suggested_action" text,
	"due_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"thread_id" uuid,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"provider_message_id" text NOT NULL,
	"subject" text,
	"snippet" text,
	"body_text" text,
	"from_email" text,
	"from_name" text,
	"to_emails" jsonb,
	"cc_emails" jsonb,
	"received_at" timestamp with time zone,
	"unread" boolean DEFAULT false NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"provider_thread_id" text NOT NULL,
	"subject" text,
	"snippet" text,
	"from_email" text,
	"from_name" text,
	"last_message_at" timestamp with time zone,
	"unread" boolean DEFAULT false NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"sync_type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_command_item_id_command_items_id_fk" FOREIGN KEY ("command_item_id") REFERENCES "public"."command_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_items" ADD CONSTRAINT "command_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_items" ADD CONSTRAINT "command_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_thread_id_mail_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."mail_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_threads" ADD CONSTRAINT "mail_threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_requests_workspace_idx" ON "approval_requests" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "approval_requests_user_idx" ON "approval_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_requests_action_type_idx" ON "approval_requests" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "calendar_events_workspace_idx" ON "calendar_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "calendar_events_start_at_idx" ON "calendar_events" USING btree ("start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_workspace_provider_event_uidx" ON "calendar_events" USING btree ("workspace_id","provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "command_items_workspace_idx" ON "command_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "command_items_user_idx" ON "command_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "command_items_status_idx" ON "command_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "command_items_priority_idx" ON "command_items" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "command_items_due_at_idx" ON "command_items" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "mail_messages_workspace_idx" ON "mail_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "mail_messages_thread_idx" ON "mail_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "mail_messages_received_at_idx" ON "mail_messages" USING btree ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_messages_workspace_provider_message_uidx" ON "mail_messages" USING btree ("workspace_id","provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "mail_threads_workspace_idx" ON "mail_threads" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "mail_threads_unread_idx" ON "mail_threads" USING btree ("unread");--> statement-breakpoint
CREATE INDEX "mail_threads_last_message_at_idx" ON "mail_threads" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_threads_workspace_provider_thread_uidx" ON "mail_threads" USING btree ("workspace_id","provider","provider_thread_id");--> statement-breakpoint
CREATE INDEX "sync_runs_workspace_idx" ON "sync_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sync_runs_provider_idx" ON "sync_runs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "sync_runs_status_idx" ON "sync_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs" USING btree ("started_at");