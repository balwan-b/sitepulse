import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../lib/http.js";
import { createPunchItem } from "./punch-items.js";

const basePayload = {
  projectId: "project-1",
  phaseId: null,
  title: "Missing handrail at west stair landing",
  description: "A temporary barrier is in place, but permanent handrail is missing.",
  severity: "high",
  location: "West stair landing",
  assigneeId: null,
  dueDate: "2026-06-15",
  status: "open",
};

test("createPunchItem blocks clients from field issue workflows", async () => {
  await assert.rejects(
    () => createPunchItem({ id: "client-1", role: "client" }, basePayload),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "ACCESS_DENIED");
      return true;
    },
  );
});

test("createPunchItem rejects non-open starting states", async () => {
  await assert.rejects(
    () =>
      createPunchItem(
        { id: "admin-1", role: "admin" },
        { ...basePayload, status: "closed" },
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "VALIDATION_ERROR");
      return true;
    },
  );
});
