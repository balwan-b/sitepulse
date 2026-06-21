import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "./http.js";
import {
  parseDateOnly,
  parsePositiveInt,
  sanitizeText,
  validateIdentifier,
} from "./validation.js";

test("sanitizeText trims and collapses whitespace", () => {
  assert.equal(
    sanitizeText("  West   stair landing  ", {
      field: "location",
      min: 2,
      max: 100,
    }),
    "West stair landing",
  );
});

test("sanitizeText rejects short values", () => {
  assert.throws(
    () =>
      sanitizeText("x", {
        field: "title",
        min: 2,
        max: 40,
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "VALIDATION_ERROR");
      return true;
    },
  );
});

test("parsePositiveInt accepts bounded integers", () => {
  assert.equal(
    parsePositiveInt("42", "workforceCount", { minimum: 0, maximum: 100 }),
    42,
  );
});

test("parseDateOnly rejects malformed dates", () => {
  assert.throws(() => parseDateOnly("2026/06/12", "dueDate"), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "VALIDATION_ERROR");
    return true;
  });
});

test("validateIdentifier upper-safe policy accepts portfolio-style codes", () => {
  assert.equal(validateIdentifier("sp-north-yard", "code"), "sp-north-yard");
});
