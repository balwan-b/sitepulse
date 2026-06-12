import crypto from "node:crypto";

import { db } from "../db/index.js";
import { projectEvents } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import type { ProjectEventType } from "../lib/status-rules.js";

export const createProjectEvent = async ({
  actor,
  projectId,
  entityType,
  entityId,
  eventType,
  summary,
}: {
  actor: AuthenticatedActor;
  projectId: string;
  entityType: string;
  entityId: string;
  eventType: ProjectEventType;
  summary: string;
}) => {
  await db.insert(projectEvents).values({
    id: crypto.randomUUID(),
    projectId,
    entityType,
    entityId,
    eventType,
    summary,
    createdBy: actor.id,
  });
};
