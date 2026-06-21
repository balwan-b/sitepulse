CREATE TYPE "public"."daily_log_status" AS ENUM('draft', 'submitted', 'locked');--> statement-breakpoint
CREATE TYPE "public"."project_event_type" AS ENUM('project_created', 'project_status_changed', 'phase_created', 'phase_status_changed', 'assignment_created', 'assignment_updated', 'daily_log_submitted', 'punch_item_created', 'punch_item_status_changed', 'change_order_created', 'change_order_submitted', 'change_order_approved', 'change_order_rejected');--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"phase_id" text,
	"supervisor_id" text NOT NULL,
	"log_date" timestamp NOT NULL,
	"workforce_count" integer NOT NULL,
	"weather" text NOT NULL,
	"completed_work" text NOT NULL,
	"blockers" text,
	"safety_notes" text,
	"status" "daily_log_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_events" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"event_type" "project_event_type" NOT NULL,
	"summary" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_supervisor_id_user_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_logs_project_id_idx" ON "daily_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "daily_logs_phase_id_idx" ON "daily_logs" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "daily_logs_supervisor_id_idx" ON "daily_logs" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "daily_logs_status_idx" ON "daily_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "daily_logs_project_status_idx" ON "daily_logs" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "daily_logs_project_supervisor_date_idx" ON "daily_logs" USING btree ("project_id","supervisor_id","log_date");--> statement-breakpoint
CREATE INDEX "daily_logs_created_at_idx" ON "daily_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_events_project_id_idx" ON "project_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_events_entity_type_idx" ON "project_events" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "project_events_entity_id_idx" ON "project_events" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "project_events_event_type_idx" ON "project_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "project_events_created_by_idx" ON "project_events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "project_events_created_at_idx" ON "project_events" USING btree ("created_at");