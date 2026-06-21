import test from "node:test";
import assert from "node:assert/strict";

import {
  AppError,
  asAppError,
  buildClientErrorResponse,
  classifyDbError,
} from "./http.js";

test("buildClientErrorResponse exposes AppError fields", () => {
  const response = buildClientErrorResponse(
    new AppError(409, "DUPLICATE_RECORD", "Already exists."),
  );

  assert.deepEqual(response, {
    statusCode: 409,
    body: {
      code: "DUPLICATE_RECORD",
      message: "Already exists.",
    },
  });
});

test("classifyDbError recognizes duplicate violations by message", () => {
  const classified = classifyDbError(new Error("duplicate key value violates unique constraint"));
  assert.equal(classified.code, "DUPLICATE_RECORD");
  assert.equal(classified.statusCode, 409);
});

test("asAppError preserves existing AppError instances", () => {
  const error = new AppError(400, "VALIDATION_ERROR", "Bad request");
  assert.equal(asAppError(error), error);
});

test("asAppError wraps unknown database errors", () => {
  const normalized = asAppError(new Error("foreign key violation"));
  assert.ok(normalized instanceof AppError);
  assert.equal(normalized.code, "RELATIONSHIP_VIOLATION");
});
