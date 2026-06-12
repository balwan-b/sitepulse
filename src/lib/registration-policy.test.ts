import test from "node:test";
import assert from "node:assert/strict";

import { USER_ROLES } from "@/constants";
import { isPublicRegistrationRoleAllowed } from "./registration-policy.ts";

test("public registration only permits client identities", () => {
  assert.equal(isPublicRegistrationRoleAllowed(USER_ROLES.CLIENT), true);
  assert.equal(isPublicRegistrationRoleAllowed(USER_ROLES.ADMIN), false);
  assert.equal(isPublicRegistrationRoleAllowed(USER_ROLES.PROJECT_MANAGER), false);
  assert.equal(isPublicRegistrationRoleAllowed(USER_ROLES.SITE_SUPERVISOR), false);
});
