import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_XHS_ACCOUNTS = [
  { name: "同花顺投资", url: "" },
  { name: "同顺股民社区", url: "", aliases: ["同花顺股民社区"] },
  { name: "同花顺理财", url: "" },
  { name: "同顺财经", url: "" },
  { name: "问财", url: "", aliases: ["同花顺问财"] },
  { name: "喵懂投资", url: "" },
  { name: "研习社", url: "", aliases: ["同花顺研习社", "同顺研习社"] }
];

export async function loadXhsAccounts(root = process.cwd()) {
  const accountPath = path.join(root, "accounts.json");
  try {
    const text = await fs.readFile(accountPath, "utf8");
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("accounts.json must be an array");
    }
    return normalizeXhsAccounts(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return normalizeXhsAccounts(DEFAULT_XHS_ACCOUNTS);
  }
}

export function normalizeXhsAccounts(accounts) {
  return accounts
    .map((item) => ({
      name: String(item.name || "").trim(),
      url: normalizeXhsProfileUrl(String(item.url || "").trim()),
      aliases: Array.isArray(item.aliases)
        ? item.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : []
    }))
    .filter((item) => item.name);
}

export function selectXhsAccounts(accounts, accountName = "") {
  const query = String(accountName || "").trim();
  if (!query) return accounts;

  const selected = accounts.filter((account) => xhsAccountMatches(account, query));
  if (selected.length > 0) return selected;

  const names = accounts.map((account) => account.name).join("、");
  throw new Error(`未找到小红书账号：${query}。可选账号：${names}`);
}

export function xhsAccountMatches(account, query) {
  const normalizedQuery = normalizeSelector(query);
  if (!normalizedQuery) return true;
  const candidates = [account.name, ...(account.aliases || [])].map(normalizeSelector);
  return candidates.includes(normalizedQuery);
}

export function isXhsProfileUrl(url) {
  return /xiaohongshu\.com\/user\/profile\//.test(String(url || ""));
}

export function normalizeXhsProfileUrl(rawUrl) {
  if (!rawUrl) return "";
  const url = new URL(rawUrl, "https://www.xiaohongshu.com");
  const match = url.pathname.match(/\/user\/profile\/([^/?#]+)/);
  if (!match) return rawUrl;
  return `https://www.xiaohongshu.com/user/profile/${match[1]}`;
}

function normalizeSelector(value) {
  return String(value || "").trim().toLowerCase();
}
