import test from "node:test";
import assert from "node:assert/strict";

import { ensureAuthCookieFlags } from "./auth-cookies.js";

test("adds cross-site safe production defaults when cookie attributes are missing", () => {
  const cookie = ensureAuthCookieFlags("session=abc123; Path=/", true);

  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=None/i);
});

test("preserves explicit cookie attributes from upstream auth handler", () => {
  const cookie = ensureAuthCookieFlags(
    "session=abc123; Path=/; Secure; SameSite=Lax; HttpOnly",
    true,
  );

  assert.equal(cookie, "session=abc123; Path=/; Secure; SameSite=Lax; HttpOnly");
});

test("does not add cross-site flags outside production", () => {
  const cookie = ensureAuthCookieFlags("session=abc123; Path=/", false);

  assert.match(cookie, /HttpOnly/i);
  assert.doesNotMatch(cookie, /Secure/i);
  assert.doesNotMatch(cookie, /SameSite/i);
});
