import test from "node:test";
import assert from "node:assert/strict";

import type { Request } from "express";

import {
  assertCanPubliclyRegister,
  canAccessResource,
  getAuthenticatedActor,
  requireAdmin,
  requireAnyRole,
  requireStaff,
} from "./authorization.js";
import { AppError } from "./http.js";

const createRequest = (
  role?: "admin" | "project_manager" | "site_supervisor" | "client",
  id = "user-1",
) => ({ user: role ? { id, role } : undefined }) as Request;

test("getAuthenticatedActor returns the signed-in actor", () => {
  const actor = getAuthenticatedActor(createRequest("project_manager"));
  assert.deepEqual(actor, { id: "user-1", role: "project_manager" });
});

test("getAuthenticatedActor rejects unauthenticated requests", () => {
  assert.throws(() => getAuthenticatedActor(createRequest()), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, "AUTHENTICATION_REQUIRED");
    return true;
  });
});

test("requireAnyRole permits allowed actors", () => {
  const actor = requireAnyRole(
    createRequest("site_supervisor"),
    ["site_supervisor", "admin"] as const,
    "submit daily logs",
  );

  assert.equal(actor.role, "site_supervisor");
});

test("requireAnyRole blocks disallowed actors", () => {
  assert.throws(
    () =>
      requireAnyRole(
        createRequest("client"),
        ["admin", "project_manager"] as const,
        "approve change orders",
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, "ACCESS_DENIED");
      return true;
    },
  );
});

test("requireAdmin only permits admins", () => {
  assert.equal(requireAdmin(createRequest("admin"), "manage staff").role, "admin");

  assert.throws(() => requireAdmin(createRequest("client"), "manage staff"), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);
    return true;
  });
});

test("requireStaff admits operational staff roles and rejects clients", () => {
  assert.equal(requireStaff(createRequest("admin"), "view staff tools").role, "admin");
  assert.equal(
    requireStaff(createRequest("project_manager"), "view staff tools").role,
    "project_manager",
  );
  assert.equal(
    requireStaff(createRequest("site_supervisor"), "view staff tools").role,
    "site_supervisor",
  );

  assert.throws(
    () => requireStaff(createRequest("client"), "view staff tools"),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, "ACCESS_DENIED");
      return true;
    },
  );
});

test("assertCanPubliclyRegister only allows client accounts", () => {
  assert.equal(assertCanPubliclyRegister(undefined), "client");
  assert.equal(assertCanPubliclyRegister("client"), "client");

  assert.throws(() => assertCanPubliclyRegister("admin"), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "PUBLIC_ROLE_REGISTRATION_DISABLED");
    return true;
  });
});

test("canAccessResource reflects role membership", () => {
  assert.equal(canAccessResource("admin", ["admin", "project_manager"]), true);
  assert.equal(canAccessResource("client", ["admin", "project_manager"]), false);
});
