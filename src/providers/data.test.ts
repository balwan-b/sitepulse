import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { dataProvider } from "./data.ts";

test("dataProvider.getList sends pagination and equality filters", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    assert.match(url, /projects\?page=2&limit=25&status=active/);
    return new Response(
      JSON.stringify({
        data: [{ id: "project-1", name: "North Yard" }],
        pagination: { total: 1 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await dataProvider.getList({
    resource: "projects",
    pagination: { currentPage: 2, pageSize: 25 },
    filters: [{ field: "status", operator: "eq", value: "active" }],
  });

  assert.equal(result.total, 1);
  assert.equal(result.data[0]?.id, "project-1");
  fetchMock.mock.restore();
});

test("dataProvider.create posts JSON payloads", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, JSON.stringify({ name: "North Yard" }));
    return new Response(
      JSON.stringify({
        data: { id: "project-1", name: "North Yard" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await dataProvider.create({
    resource: "projects",
    variables: { name: "North Yard" },
  });

  assert.equal(result.data.id, "project-1");
  fetchMock.mock.restore();
});

test("dataProvider.custom stays intentionally unimplemented", async () => {
  await assert.rejects(
    async () => {
      await dataProvider.custom?.({} as never);
    },
    /not implemented/i,
  );
});
