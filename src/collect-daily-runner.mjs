import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { FeishuSheetsClient, loadFeishuConfig } from "./feishu-sheets.mjs";
import { readPlatformItems as defaultReadPlatformItems, writePlatformJsonToFeishu as defaultWritePlatformJsonToFeishu } from "./feishu-writer.mjs";
import { dailySummaryPath, getPlatformConfig, resolvePlatformPaths } from "./platform-config.mjs";

const NODE_BIN = process.execPath;

export async function collectDaily({
  root = process.cwd(),
  targetDate,
  platforms,
  skipFeishu = false,
  crawlMode = "conservative",
  createClient = () => new FeishuSheetsClient(loadFeishuConfig()),
  runPlatformCrawler = defaultRunPlatformCrawler,
  readPlatformItems = defaultReadPlatformItems,
  writePlatformJsonToFeishu = defaultWritePlatformJsonToFeishu,
  log = console.log
}) {
  await fs.mkdir(path.join(root, "output"), { recursive: true });
  const summary = {
    ok: false,
    targetDate,
    startedAt: new Date().toISOString(),
    skipFeishu,
    platforms: {}
  };

  log(`每日采集目标日期：${targetDate}`);
  log(`采集平台：${platforms.map((id) => getPlatformConfig(id).label).join("、")}`);
  log(`采集模式：${crawlMode === "legacy" ? "兼容旧模式" : "保守提速"}`);
  if (skipFeishu) log("已启用 --skip-feishu，本次只采集并生成本地输出。");

  for (const platformId of platforms) {
    const config = getPlatformConfig(platformId);
    log(`\n==> 开始 ${config.label}`);
    try {
      await runPlatformCrawler(platformId, targetDate, crawlMode, { root });
      summary.platforms[platformId] = {
        status: "crawled",
        collected: 0,
        feishu: null
      };
    } catch (error) {
      summary.platforms[platformId] = {
        status: "failed",
        collected: 0,
        feishu: null,
        error: error.message || String(error)
      };
      log(`${config.label} 采集失败：${error.message || String(error)}`);
    }
  }

  for (const platformId of platforms) {
    const platformSummary = summary.platforms[platformId];
    if (platformSummary?.status === "failed") continue;
    try {
      const items = await readPlatformItems(platformId, targetDate, root);
      platformSummary.status = "collected";
      platformSummary.collected = items.length;
    } catch (error) {
      platformSummary.status = "failed";
      platformSummary.error = error.message || String(error);
      log(`${getPlatformConfig(platformId).label} 读取本地输出失败：${platformSummary.error}`);
    }
  }

  const failedPlatforms = platforms.filter((platformId) => summary.platforms[platformId]?.status === "failed");
  if (failedPlatforms.length > 0) {
    summary.ok = false;
    summary.feishuSkippedReason = "采集阶段存在失败平台，已跳过飞书写入。";
    summary.finishedAt = new Date().toISOString();
    await writeSummary(summary, root);
    log(`\n每日采集存在失败平台：${failedPlatforms.map((id) => getPlatformConfig(id).label).join("、")}。已跳过飞书写入。`);
    return { ok: false, summary };
  }

  if (!skipFeishu) {
    const client = createClient();
    for (const platformId of platforms) {
      const config = getPlatformConfig(platformId);
      const result = await writePlatformJsonToFeishu({
        platformId,
        targetDate,
        root,
        client
      });
      summary.platforms[platformId].feishu = result.feishu;
      log(`${config.label} 飞书写入：新增 ${result.feishu.created}，跳过 ${result.feishu.skipped}`);
    }
  }

  summary.ok = true;
  summary.finishedAt = new Date().toISOString();
  await writeSummary(summary, root);
  log(`\n每日采集汇总：${dailySummaryPath(targetDate, root)}`);
  return { ok: true, summary };
}

export async function defaultRunPlatformCrawler(platformId, targetDate, crawlMode, { root = process.cwd() } = {}) {
  const paths = resolvePlatformPaths(platformId, root);
  await runCommand(NODE_BIN, [
    paths.crawlScriptPath,
    "--since",
    targetDate,
    "--until",
    targetDate,
    "--mode",
    crawlMode
  ], {
    cwd: root,
    env: {
      ...process.env,
      FORCE_COLOR: "0"
    }
  });
}

async function writeSummary(summary, root) {
  const summaryPath = dailySummaryPath(summary.targetDate, root);
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args[0]} 退出码：${code}`));
    });
  });
}
