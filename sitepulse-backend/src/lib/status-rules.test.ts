import test from "node:test";
import assert from "node:assert/strict";

import {
  assertChangeOrderTransition,
  assertPunchItemTransition,
} from "./status-rules.js";

test("assertPunchItemTransition allows the next valid workflow state", () => {
  assert.equal(assertPunchItemTransition("open", "in_progress"), "in_progress");
});

test("assertPunchItemTransition rejects skipping review", () => {
  assert.throws(() => assertPunchItemTransition("open", "closed"));
});

test("assertChangeOrderTransition allows submit then approve", () => {
  assert.equal(assertChangeOrderTransition("submitted", "approved"), "approved");
});

test("assertChangeOrderTransition rejects reopening approved work", () => {
  assert.throws(() => assertChangeOrderTransition("approved", "draft"));
});
