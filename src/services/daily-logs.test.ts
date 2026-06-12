import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../lib/http.js";
import { createDailyLog } from "./daily-logs.js";

const basePayload = {
  projectId: "project-1",
  phaseId: null,
  logDate: "2026-06-12",
  workforceCount: 12,
  weather: "Clear",
  completedWork: "Set anchor bolts and completed concrete pour.",
  blockers: "",
  safetyNotes: "",
  status: "draft",
};

test("createDailyLog blocks client actors before any project lookup", async () => {
  await assert.rejects(
    () => createDailyLog({ id: "client-1", role: "client" }, basePayload),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "ACCESS_DENIED");
      return true;
    },
  );
});

test("createDailyLog rejects non-draft creation attempts", async () => {
  await assert.rejects(
    () =>
      createDailyLog(
        { id: "supervisor-1", role: "site_supervisor" },
        { ...basePayload, status: "submitted" },
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "VALIDATION_ERROR");
      return true;
    },
  );
});
