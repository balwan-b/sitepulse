import test from "node:test";
import assert from "node:assert/strict";

import { USER_ROLES } from "@/constants";
import {
  getChangeOrdersEmptyState,
  getDailyLogsEmptyState,
  getPunchItemsEmptyState,
} from "./empty-states.ts";

test("daily log empty states vary by role", () => {
  assert.match(getDailyLogsEmptyState(USER_ROLES.SITE_SUPERVISOR), /saving today's site report/i);
  assert.match(getDailyLogsEmptyState(USER_ROLES.PROJECT_MANAGER), /supervisor logs/i);
});

test("punch item empty states guide manager and supervisor flows differently", () => {
  assert.match(getPunchItemsEmptyState(USER_ROLES.PROJECT_MANAGER), /overdue and open work/i);
  assert.match(getPunchItemsEmptyState(USER_ROLES.SITE_SUPERVISOR), /capture the first field issue/i);
});

test("change order empty states keep client copy distinct", () => {
  assert.match(getChangeOrdersEmptyState(USER_ROLES.CLIENT), /approved change orders/i);
  assert.match(getChangeOrdersEmptyState(USER_ROLES.PROJECT_MANAGER), /submitted requests/i);
});
