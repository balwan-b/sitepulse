import crypto from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { PoolClient } from "pg";

import { db } from "../db/index.js";
import { pgPool } from "../db/pg.js";
import { changeOrders, projectPhases, projects, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError, asAppError } from "../lib/http.js";
import {
  CHANGE_ORDER_STATUSES,
  assertChangeOrderTransition,
  type ChangeOrderStatus,
  type ProjectEventType,
} from "../lib/status-rules.js";
import {
  assertEnumValue,
  parsePositiveInt,
  sanitizeOptionalText,
  sanitizeText,
} from "../lib/validation.js";
import {
  assertProjectManageable,
  assertProjectReadable,
  listManagedProjectIds,
  listReadableProjectIds,
} from "./project-scope.js";
import { createProjectEvent } from "./project-events.js";
import { assertRecord, parsePagination, toIsoString } from "./shared.js";

const changeOrderPayload = (payload: Record<string, unknown>) => ({
  projectId: sanitizeText(payload.projectId, {
    field: "projectId",
    min: 3,
    max: 128,
  }),
  phaseId:
    typeof payload.phaseId === "string" && payload.phaseId ? payload.phaseId : null,
  title: sanitizeText(payload.title, {
    field: "title",
    min: 3,
    max: 160,
  }),
  description: sanitizeText(payload.description, {
    field: "description",
    min: 5,
    max: 4_000,
  }),
  reason: sanitizeText(payload.reason, {
    field: "reason",
    min: 5,
    max: 2_000,
  }),
  requestedAmount: parsePositiveInt(payload.requestedAmount, "requestedAmount", {
    minimum: 0,
    maximum: 1_000_000_000,
  }),
  requestedDays: parsePositiveInt(payload.requestedDays, "requestedDays", {
    minimum: 0,
    maximum: 3_650,
  }),
  status: assertEnumValue(payload.status ?? "draft", CHANGE_ORDER_STATUSES, "status"),
});

const approvalPayload = (payload: Record<string, unknown>) => ({
  approvedAmount:
    payload.approvedAmount == null || payload.approvedAmount === ""
      ? null
      : parsePositiveInt(payload.approvedAmount, "approvedAmount", {
          minimum: 0,
          maximum: 1_000_000_000,
        }),
  approvedDays:
    payload.approvedDays == null || payload.approvedDays === ""
      ? null
      : parsePositiveInt(payload.approvedDays, "approvedDays", {
          minimum: 0,
          maximum: 3_650,
        }),
  reviewNotes: sanitizeOptionalText(payload.reviewNotes, {
    field: "reviewNotes",
    max: 2_000,
  }),
});

const rejectionPayload = (payload: Record<string, unknown>) => ({
  reviewNotes: sanitizeText(payload.reviewNotes, {
    field: "reviewNotes",
    min: 5,
    max: 2_000,
  }),
});

const assertCanWriteChangeOrders = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  if (actor.role === "client") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not allowed to create or update change orders.",
    );
  }

  await assertProjectReadable(actor, projectId);
};

const assertCanReviewChangeOrders = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  if (actor.role !== "admin" && actor.role !== "project_manager") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "Only project managers or admins can review change orders.",
    );
  }

  await assertProjectManageable(actor, projectId);
};

const assertCanSubmitChangeOrders = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  if (actor.role !== "admin" && actor.role !== "project_manager") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "Only project managers or admins can submit change orders.",
    );
  }

  await assertProjectManageable(actor, projectId);
};

const assertReferencedEntities = async (
  values: ReturnType<typeof changeOrderPayload>,
) => {
  const [projectRecord, phaseRecord] = await Promise.all([
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, values.projectId))
      .limit(1)
      .then((rows) => rows[0]),
    values.phaseId
      ? db
          .select({ id: projectPhases.id, projectId: projectPhases.projectId })
          .from(projectPhases)
          .where(eq(projectPhases.id, values.phaseId))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
  ]);

  assertRecord(projectRecord, "Project not found.");

  if (values.phaseId) {
    const phase = assertRecord(phaseRecord, "Project phase not found.");

    if (phase.projectId !== values.projectId) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "phaseId must belong to the selected project.",
      );
    }
  }
};

type ChangeOrderRow = {
  id: string;
  projectId: string;
  projectCode?: string | null;
  projectName?: string | null;
  phaseId: string | null;
  phaseName?: string | null;
  title: string;
  description: string;
  reason: string;
  requestedAmount: number;
  requestedDays: number;
  approvedAmount: number | null;
  approvedDays: number | null;
  status: ChangeOrderStatus;
  createdBy: string;
  submittedBy: string | null;
  reviewedBy: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const hydrateUserNames = async (rows: ChangeOrderRow[]) => {
  const ids = [...new Set(rows.flatMap((row) => [row.createdBy, row.submittedBy, row.reviewedBy]).filter(Boolean))];

  if (!ids.length) {
    return new Map<string, string>();
  }

  const records = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, ids as string[]));

  return new Map(records.map((record) => [record.id, record.name]));
};

const serializeChangeOrder = (
  actor: AuthenticatedActor,
  record: ChangeOrderRow,
  userNames: Map<string, string>,
) => {
  const base = {
    id: record.id,
    projectId: record.projectId,
    projectCode: record.projectCode ?? null,
    projectName: record.projectName ?? null,
    phaseId: record.phaseId,
    phaseName: record.phaseName ?? null,
    title: record.title,
    description: record.description,
    requestedAmount: record.requestedAmount,
    requestedDays: record.requestedDays,
    approvedAmount: record.approvedAmount,
    approvedDays: record.approvedDays,
    status: record.status,
    submittedAt: toIsoString(record.submittedAt),
    reviewedAt: toIsoString(record.reviewedAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };

  if (actor.role === "client") {
    return {
      ...base,
      reason: null,
      createdBy: null,
      createdByName: null,
      submittedBy: null,
      submittedByName: null,
      reviewedBy: null,
      reviewedByName: null,
      reviewNotes: record.status === "approved" ? record.reviewNotes : null,
    };
  }

  return {
    ...base,
    reason: record.reason,
    createdBy: record.createdBy,
    createdByName: userNames.get(record.createdBy) ?? null,
    submittedBy: record.submittedBy,
    submittedByName: record.submittedBy
      ? (userNames.get(record.submittedBy) ?? null)
      : null,
    reviewedBy: record.reviewedBy,
    reviewedByName: record.reviewedBy
      ? (userNames.get(record.reviewedBy) ?? null)
      : null,
    reviewNotes: record.reviewNotes,
  };
};

const getChangeOrderBaseQuery = () =>
  db
    .select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      phaseId: changeOrders.phaseId,
      phaseName: projectPhases.name,
      title: changeOrders.title,
      description: changeOrders.description,
      reason: changeOrders.reason,
      requestedAmount: changeOrders.requestedAmount,
      requestedDays: changeOrders.requestedDays,
      approvedAmount: changeOrders.approvedAmount,
      approvedDays: changeOrders.approvedDays,
      status: changeOrders.status,
      createdBy: changeOrders.createdBy,
      submittedBy: changeOrders.submittedBy,
      reviewedBy: changeOrders.reviewedBy,
      submittedAt: changeOrders.submittedAt,
      reviewedAt: changeOrders.reviewedAt,
      reviewNotes: changeOrders.reviewNotes,
      createdAt: changeOrders.createdAt,
      updatedAt: changeOrders.updatedAt,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(changeOrders.projectId, projects.id))
    .leftJoin(projectPhases, eq(changeOrders.phaseId, projectPhases.id));

const getChangeOrderRecord = async (id: string) =>
  getChangeOrderBaseQuery()
    .where(eq(changeOrders.id, id))
    .limit(1)
    .then((rows) => rows[0]);

const assertClientVisible = (actor: AuthenticatedActor, status: ChangeOrderStatus) => {
  if (actor.role === "client" && status !== "approved") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "Clients can only view approved change orders.",
    );
  }
};

export const listChangeOrders = async (
  actor: AuthenticatedActor,
  query: Record<string, unknown>,
) => {
  const { page, limit, offset } = parsePagination(query);
  const readableIds = await listReadableProjectIds(actor);
  const manageableIds = actor.role === "project_manager" ? await listManagedProjectIds(actor) : null;
  const projectId =
    typeof query.projectId === "string" && query.projectId ? query.projectId : null;
  const status =
    typeof query.status === "string" && query.status
      ? assertEnumValue(query.status, CHANGE_ORDER_STATUSES, "status")
      : null;

  if (projectId) {
    await assertProjectReadable(actor, projectId);
  }

  const baseScope =
    readableIds == null
      ? undefined
      : readableIds.length > 0
        ? inArray(changeOrders.projectId, readableIds)
        : eq(changeOrders.projectId, "__no_access__");

  const filters = [
    baseScope,
    projectId ? eq(changeOrders.projectId, projectId) : undefined,
    actor.role === "client" ? eq(changeOrders.status, "approved") : undefined,
    status ? eq(changeOrders.status, status) : undefined,
  ].filter(Boolean);

  const where = filters.length ? and(...filters) : undefined;
  const rows = await getChangeOrderBaseQuery()
    .where(where)
    .orderBy(desc(changeOrders.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ total: count() })
    .from(changeOrders)
    .where(where)
    .then((records) => records[0]?.total ?? 0);

  const userNames = await hydrateUserNames(rows);

  return {
    data: rows.map((row) => serializeChangeOrder(actor, row, userNames)).map((row) => ({
      ...row,
      canReview:
        actor.role === "admin" ||
        (actor.role === "project_manager" &&
          (manageableIds == null || manageableIds.includes(row.projectId))),
    })),
    page,
    limit,
    total,
  };
};

export const getChangeOrder = async (actor: AuthenticatedActor, id: string) => {
  const record = assertRecord(await getChangeOrderRecord(id), "Change order not found.");
  await assertProjectReadable(actor, record.projectId);
  assertClientVisible(actor, record.status);
  const userNames = await hydrateUserNames([record]);
  return serializeChangeOrder(actor, record, userNames);
};

export const createChangeOrder = async (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  const values = changeOrderPayload(payload);
  await assertCanWriteChangeOrders(actor, values.projectId);
  await assertReferencedEntities(values);

  if (values.status !== "draft") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Change orders must be created in draft status.",
    );
  }

  const id = crypto.randomUUID();

  try {
    await db.insert(changeOrders).values({
      id,
      projectId: values.projectId,
      phaseId: values.phaseId,
      title: values.title,
      description: values.description,
      reason: values.reason,
      requestedAmount: values.requestedAmount,
      requestedDays: values.requestedDays,
      status: values.status,
      createdBy: actor.id,
    });

    await createProjectEvent({
      actor,
      projectId: values.projectId,
      entityType: "change_order",
      entityId: id,
      eventType: "change_order_created",
      summary: `Change order ${values.title} created.`,
    });

    return await getChangeOrder(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const updateChangeOrder = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  const existing = assertRecord(await getChangeOrderRecord(id), "Change order not found.");
  await assertCanWriteChangeOrders(actor, existing.projectId);

  if (existing.status !== "draft") {
    throw new AppError(
      409,
      "CHANGE_ORDER_LOCKED",
      "Only draft change orders can be updated.",
    );
  }

  const values = changeOrderPayload({
    ...payload,
    projectId: payload.projectId ?? existing.projectId,
    status: payload.status ?? existing.status,
  });

  if (values.status !== "draft") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Draft updates cannot change the workflow status directly.",
    );
  }

  await assertCanWriteChangeOrders(actor, values.projectId);
  await assertReferencedEntities(values);

  try {
    await db
      .update(changeOrders)
      .set({
        projectId: values.projectId,
        phaseId: values.phaseId,
        title: values.title,
        description: values.description,
        reason: values.reason,
        requestedAmount: values.requestedAmount,
        requestedDays: values.requestedDays,
        status: "draft",
      })
      .where(eq(changeOrders.id, id));

    return await getChangeOrder(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

const isRetryableSerializationFailure = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "40001";

const readLockedChangeOrder = async (client: PoolClient, id: string) => {
  const result = await client.query<{
    id: string;
    project_id: string;
    title: string;
    requested_amount: number;
    requested_days: number;
    status: ChangeOrderStatus;
  }>(
    `
      select id, project_id, title, requested_amount, requested_days, status
      from change_orders
      where id = $1
      for update
    `,
    [id],
  );

  return result.rows[0];
};

const insertEvent = async ({
  client,
  actor,
  projectId,
  changeOrderId,
  eventType,
  summary,
}: {
  client: PoolClient;
  actor: AuthenticatedActor;
  projectId: string;
  changeOrderId: string;
  eventType: ProjectEventType;
  summary: string;
}) => {
  await client.query(
    `
      insert into project_events (id, project_id, entity_type, entity_id, event_type, summary, created_by)
      values ($1, $2, 'change_order', $3, $4, $5, $6)
    `,
    [crypto.randomUUID(), projectId, changeOrderId, eventType, summary, actor.id],
  );
};

const runWorkflowTransaction = async <T>(
  work: (client: PoolClient) => Promise<T>,
  maxAttempts = 3,
) => {
  const client = await pgPool.connect();

  try {
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        await client.query("begin isolation level serializable");
        const result = await work(client);
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");

        if (!isRetryableSerializationFailure(error) || attempt >= maxAttempts) {
          throw error;
        }
      }
    }

    throw new AppError(
      409,
      "TRANSACTION_RETRY_EXHAUSTED",
      "This change order was updated concurrently. Please try again.",
    );
  } finally {
    client.release();
  }
};

export const submitChangeOrder = async (
  actor: AuthenticatedActor,
  id: string,
) => {
  const existing = assertRecord(await getChangeOrderRecord(id), "Change order not found.");
  await assertCanSubmitChangeOrders(actor, existing.projectId);

  try {
    await runWorkflowTransaction(async (client) => {
      const locked = assertRecord(
        await readLockedChangeOrder(client, id),
        "Change order not found.",
      );

      try {
        assertChangeOrderTransition(locked.status, "submitted");
      } catch {
        throw new AppError(
          409,
          "INVALID_CHANGE_ORDER_TRANSITION",
          "Only draft change orders can be submitted.",
        );
      }

      const submittedAt = new Date();

      await client.query(
        `
          update change_orders
          set status = 'submitted',
              submitted_by = $2,
              submitted_at = $3,
              updated_at = $3
          where id = $1
        `,
        [id, actor.id, submittedAt],
      );

      await insertEvent({
        client,
        actor,
        projectId: locked.project_id,
        changeOrderId: id,
        eventType: "change_order_submitted",
        summary: `Change order ${locked.title} submitted for review.`,
      });
    });

    return await getChangeOrder(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const approveChangeOrder = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  const existing = assertRecord(await getChangeOrderRecord(id), "Change order not found.");
  await assertCanReviewChangeOrders(actor, existing.projectId);
  const values = approvalPayload(payload);

  try {
    await runWorkflowTransaction(async (client) => {
      const locked = assertRecord(
        await readLockedChangeOrder(client, id),
        "Change order not found.",
      );

      try {
        assertChangeOrderTransition(locked.status, "approved");
      } catch {
        throw new AppError(
          409,
          "INVALID_CHANGE_ORDER_TRANSITION",
          "Only submitted change orders can be approved.",
        );
      }

      const reviewedAt = new Date();

      await client.query(
        `
          update change_orders
          set status = 'approved',
              approved_amount = $2,
              approved_days = $3,
              reviewed_by = $4,
              reviewed_at = $5,
              review_notes = $6,
              updated_at = $5
          where id = $1
        `,
        [
          id,
          values.approvedAmount ?? locked.requested_amount,
          values.approvedDays ?? locked.requested_days,
          actor.id,
          reviewedAt,
          values.reviewNotes,
        ],
      );

      await insertEvent({
        client,
        actor,
        projectId: locked.project_id,
        changeOrderId: id,
        eventType: "change_order_approved",
        summary: `Change order ${locked.title} approved.`,
      });
    });

    return await getChangeOrder(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const rejectChangeOrder = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  const existing = assertRecord(await getChangeOrderRecord(id), "Change order not found.");
  await assertCanReviewChangeOrders(actor, existing.projectId);
  const values = rejectionPayload(payload);

  try {
    await runWorkflowTransaction(async (client) => {
      const locked = assertRecord(
        await readLockedChangeOrder(client, id),
        "Change order not found.",
      );

      try {
        assertChangeOrderTransition(locked.status, "rejected");
      } catch {
        throw new AppError(
          409,
          "INVALID_CHANGE_ORDER_TRANSITION",
          "Only submitted change orders can be rejected.",
        );
      }

      const reviewedAt = new Date();

      await client.query(
        `
          update change_orders
          set status = 'rejected',
              reviewed_by = $2,
              reviewed_at = $3,
              review_notes = $4,
              updated_at = $3
          where id = $1
        `,
        [id, actor.id, reviewedAt, values.reviewNotes],
      );

      await insertEvent({
        client,
        actor,
        projectId: locked.project_id,
        changeOrderId: id,
        eventType: "change_order_rejected",
        summary: `Change order ${locked.title} rejected.`,
      });
    });

    return await getChangeOrder(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};
