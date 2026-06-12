CREATE TYPE "public"."punch_item_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."punch_item_status" AS ENUM('open', 'in_progress', 'ready_for_review', 'closed');--> statement-breakpoint
CREATE TABLE "punch_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"phase_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" "punch_item_severity" DEFAULT 'medium' NOT NULL,
	"location" text NOT NULL,
	"assignee_id" text,
	"due_date" timestamp NOT NULL,
	"status" "punch_item_status" DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "punch_items" ADD CONSTRAINT "punch_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_items" ADD CONSTRAINT "punch_items_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_items" ADD CONSTRAINT "punch_items_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_items" ADD CONSTRAINT "punch_items_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "punch_items_project_id_idx" ON "punch_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "punch_items_phase_id_idx" ON "punch_items" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "punch_items_assignee_id_idx" ON "punch_items" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "punch_items_status_idx" ON "punch_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "punch_items_severity_idx" ON "punch_items" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "punch_items_due_date_idx" ON "punch_items" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "punch_items_project_status_idx" ON "punch_items" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "punch_items_created_at_idx" ON "punch_items" USING btree ("created_at");