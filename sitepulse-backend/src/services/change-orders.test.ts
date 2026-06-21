import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../lib/http.js";
import { createChangeOrder } from "./change-orders.js";

const basePayload = {
  projectId: "project-1",
  phaseId: null,
  title: "Additional drainage trench at loading dock",
  description: "Stormwater is ponding outside the revised dock apron footprint.",
  reason: "Unexpected site drainage conditions require a permanent trench addition.",
  requestedAmount: 25000,
  requestedDays: 4,
  status: "draft",
};

test("createChangeOrder blocks clients from commercial workflows", async () => {
  await assert.rejects(
    () => createChangeOrder({ id: "client-1", role: "client" }, basePayload),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "ACCESS_DENIED");
      return true;
    },
  );
});

test("createChangeOrder rejects non-draft creation requests", async () => {
  await assert.rejects(
    () =>
      createChangeOrder(
        { id: "manager-1", role: "project_manager" },
        { ...basePayload, status: "submitted" },
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "VALIDATION_ERROR");
      return true;
    },
  );
});
