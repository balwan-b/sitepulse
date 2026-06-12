import test from "node:test";
import assert from "node:assert/strict";

import { changeOrderSchema, projectSchema } from "./schema.ts";

test("projectSchema accepts a valid project payload", () => {
  const parsed = projectSchema.parse({
    id: "project-1",
    code: "SP-001",
    name: "North Yard Logistics Hub",
    clientName: "Atlas Freight",
    location: "Pune",
    contractValue: 1200000,
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: null,
    status: "active",
    projectManagerId: "pm-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  });

  assert.equal(parsed.code, "SP-001");
});

test("changeOrderSchema rejects invalid workflow states", () => {
  assert.throws(() =>
    changeOrderSchema.parse({
      id: "co-1",
      projectId: "project-1",
      projectCode: "SP-001",
      projectName: "North Yard Logistics Hub",
      phaseId: null,
      phaseName: null,
      title: "Drainage revision",
      description: "Add trench drain",
      reason: "Site condition discovered",
      requestedAmount: 25000,
      requestedDays: 4,
      approvedAmount: null,
      approvedDays: null,
      status: "queued",
      createdBy: "pm-1",
      createdByName: "Priya Manager",
      submittedBy: null,
      submittedByName: null,
      reviewedBy: null,
      reviewedByName: null,
      submittedAt: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    }),
  );
});
