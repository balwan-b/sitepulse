import test from "node:test";
import assert from "node:assert/strict";

import { USER_ROLES } from "@/constants";
import { getResourcesForRole } from "./resource-adapters.ts";

test("client resource visibility excludes staff-only tools", () => {
  const resources = getResourcesForRole(USER_ROLES.CLIENT).map((item) => item.name);

  assert.deepEqual(
    resources,
    ["dashboard", "projects", "project-phases", "change-orders", "client-portal"],
  );
});

test("project managers can access operational resources but not client portal", () => {
  const resources = getResourcesForRole(USER_ROLES.PROJECT_MANAGER).map(
    (item) => item.name,
  );

  assert.equal(resources.includes("client-portal"), false);
  assert.equal(resources.includes("change-orders"), true);
  assert.equal(resources.includes("users"), true);
});
