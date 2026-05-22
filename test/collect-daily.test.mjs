import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectDaily } from "../src/collect-daily-runner.mjs";
import { dailySummaryPath } from "../src/platform-config.mjs";

test("collectDaily finishes every platform crawl before any Feishu write", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harvester-daily-"));
  const calls = [];

  const result = await collectDaily({
    root,
    targetDate: "2026-05-19",
    platforms: ["douyin", "xhs", "bilibili"],
    skipFeishu: false,
    crawlMode: "conservative",
    createClient: () => ({ client: true }),
    runPlatformCrawler: async (platformId) => {
      calls.push(`crawl:${platformId}`);
    },
    readPlatformItems: async (platformId) => {
      calls.push(`read:${platformId}`);
      return [{ link: `${platformId}-link`, publishedAt: "2026-05-19" }];
    },
    writePlatformJsonToFeishu: async ({ platformId }) => {
      calls.push(`write:${platformId}`);
      return { collected: 1, feishu: { created: 1, skipped: 0 } };
    },
    log: () => {}
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls.slice(0, 3), ["crawl:douyin", "crawl:xhs", "crawl:bilibili"]);
  assert.deepEqual(calls.slice(3, 6), ["read:douyin", "read:xhs", "read:bilibili"]);
  assert.deepEqual(calls.slice(6), ["write:douyin", "write:xhs", "write:bilibili"]);
});

test("collectDaily records crawler failures and skips all Feishu writes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harvester-daily-"));
  const calls = [];

  const result = await collectDaily({
    root,
    targetDate: "2026-05-19",
    platforms: ["douyin", "xhs", "bilibili"],
    skipFeishu: false,
    crawlMode: "conservative",
    createClient: () => ({ client: true }),
    runPlatformCrawler: async (platformId) => {
      calls.push(`crawl:${platformId}`);
      if (platformId === "xhs") throw new Error("xhs failed");
    },
    readPlatformItems: async (platformId) => {
      calls.push(`read:${platformId}`);
      return [{ link: `${platformId}-link`, publishedAt: "2026-05-19" }];
    },
    writePlatformJsonToFeishu: async ({ platformId }) => {
      calls.push(`write:${platformId}`);
      return { collected: 1, feishu: { created: 1, skipped: 0 } };
    },
    log: () => {}
  });

  assert.equal(result.ok, false);
  assert.deepEqual(calls, [
    "crawl:douyin",
    "crawl:xhs",
    "crawl:bilibili",
    "read:douyin",
    "read:bilibili"
  ]);
  assert.equal(result.summary.platforms.xhs.status, "failed");
  assert.match(result.summary.platforms.xhs.error, /xhs failed/);
  assert.equal(result.summary.platforms.douyin.status, "collected");
  assert.equal(result.summary.platforms.bilibili.status, "collected");

  const summary = JSON.parse(await fs.readFile(dailySummaryPath("2026-05-19", root), "utf8"));
  assert.equal(summary.ok, false);
  assert.equal(summary.feishuSkippedReason, "采集阶段存在失败平台，已跳过飞书写入。");
});
