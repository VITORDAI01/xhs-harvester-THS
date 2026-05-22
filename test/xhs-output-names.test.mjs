import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { buildXhsOutputBaseName } from "../src/xhs-output-names.mjs";

const ROOT = process.cwd();

test("buildXhsOutputBaseName keeps the legacy filename for all-account crawls", () => {
  assert.equal(
    buildXhsOutputBaseName({
      since: "2026-05-19",
      until: "2026-05-19"
    }),
    "xhs_notes_2026-05-19_to_2026-05-19"
  );
});

test("buildXhsOutputBaseName adds the selected account name for single-account crawls", () => {
  assert.equal(
    buildXhsOutputBaseName({
      since: "2026-05-19",
      until: "2026-05-19",
      accountName: "问财"
    }),
    "xhs_notes_2026-05-19_to_2026-05-19_问财"
  );
});

test("buildXhsOutputBaseName sanitizes account names for filenames", () => {
  assert.equal(
    buildXhsOutputBaseName({
      since: "2026-05-19",
      until: "2026-05-19",
      accountName: "问财/补抓?"
    }),
    "xhs_notes_2026-05-19_to_2026-05-19_问财_补抓"
  );
});

test("XHS export writes note ids in code instead of Excel formulas", async () => {
  const source = await fs.readFile(path.join(ROOT, "src", "crawl-xhs.mjs"), "utf8");

  assert.doesNotMatch(source, /TEXTBEFORE|TEXTAFTER|ss:Formula/);
  assert.match(source, /"笔记id": extractXhsNoteId\(noteUrl\)/);
});
