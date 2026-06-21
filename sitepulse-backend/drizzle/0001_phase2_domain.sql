CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'at_risk', 'on_hold', 'completed');
CREATE TYPE "public"."phase_status" AS ENUM('not_started', 'active', 'blocked', 'completed');
CREATE TYPE "public"."crew_assignment_role" AS ENUM('project_manager', 'site_supervisor', 'client');

CREATE TABLE "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "client_name" text NOT NULL,
  "location" text NOT NULL,
  "contract_value" integer NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp,
  "status" "project_status" DEFAULT 'planning' NOT NULL,
  "project_manager_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "projects_code_unique" UNIQUE("code")
);

CREATE TABLE "project_phases" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL,
  "name" text NOT NULL,
  "sequence" integer NOT NULL,
  "status" "phase_status" DEFAULT 'not_started' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_phases_project_sequence_unique" UNIQUE("project_id", "sequence"),
  CONSTRAINT "project_phases_project_name_unique" UNIQUE("project_id", "name")
);

CREATE TABLE "crew_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL,
  "phase_id" text,
  "user_id" text NOT NULL,
  "assigned_role" "crew_assignment_role" NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_project_manager_id_user_id_fk"
  FOREIGN KEY ("project_manager_id") REFERENCES "public"."user"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "project_phases"
  ADD CONSTRAINT "project_phases_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crew_assignments"
  ADD CONSTRAINT "crew_assignments_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crew_assignments"
  ADD CONSTRAINT "crew_assignments_phase_id_project_phases_id_fk"
  FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crew_assignments"
  ADD CONSTRAINT "crew_assignments_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
CREATE INDEX "projects_project_manager_id_idx" ON "projects" USING btree ("project_manager_id");
CREATE INDEX "project_phases_project_id_idx" ON "project_phases" USING btree ("project_id");
CREATE INDEX "project_phases_status_idx" ON "project_phases" USING btree ("status");
CREATE INDEX "project_phases_project_status_idx" ON "project_phases" USING btree ("project_id", "status");
CREATE INDEX "project_phases_created_at_idx" ON "project_phases" USING btree ("created_at");
CREATE INDEX "crew_assignments_project_id_idx" ON "crew_assignments" USING btree ("project_id");
CREATE INDEX "crew_assignments_phase_id_idx" ON "crew_assignments" USING btree ("phase_id");
CREATE INDEX "crew_assignments_user_id_idx" ON "crew_assignments" USING btree ("user_id");
CREATE INDEX "crew_assignments_assigned_role_idx" ON "crew_assignments" USING btree ("assigned_role");
CREATE INDEX "crew_assignments_project_role_idx" ON "crew_assignments" USING btree ("project_id", "assigned_role");
CREATE INDEX "crew_assignments_created_at_idx" ON "crew_assignments" USING btree ("created_at");
