import test from "node:test";
import assert from "node:assert/strict";
import { resolveXhsPublishedAt } from "../src/xhs-published-date.mjs";

test("XHS publish date resolution prefers the detail page publish date", () => {
  const detailPublishedAt = new Date(2026, 4, 19);
  const statePublishedAt = new Date(2026, 4, 20);

  assert.equal(
    resolveXhsPublishedAt({ detailPublishedAt, statePublishedAt }),
    detailPublishedAt
  );
});

test("XHS publish date resolution falls back to the state publish date", () => {
  const statePublishedAt = new Date(2026, 4, 20);

  assert.equal(
    resolveXhsPublishedAt({ detailPublishedAt: null, statePublishedAt }),
    statePublishedAt
  );
});

test("XHS publish date resolution returns null when no publish date is available", () => {
  assert.equal(
    resolveXhsPublishedAt({ detailPublishedAt: null, statePublishedAt: null }),
    null
  );
});
