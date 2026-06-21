CREATE TYPE "public"."change_order_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"phase_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reason" text NOT NULL,
	"requested_amount" integer NOT NULL,
	"requested_days" integer NOT NULL,
	"approved_amount" integer,
	"approved_days" integer,
	"status" "change_order_status" DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"submitted_by" text,
	"reviewed_by" text,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "change_orders_project_id_idx" ON "change_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "change_orders_phase_id_idx" ON "change_orders" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "change_orders_status_idx" ON "change_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "change_orders_created_by_idx" ON "change_orders" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "change_orders_submitted_by_idx" ON "change_orders" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "change_orders_reviewed_by_idx" ON "change_orders" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "change_orders_project_status_idx" ON "change_orders" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "change_orders_created_at_idx" ON "change_orders" USING btree ("created_at");
