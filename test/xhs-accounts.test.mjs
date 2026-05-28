import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadXhsAccounts,
  selectXhsAccounts
} from "../src/xhs-accounts.mjs";

const SAMPLE_ACCOUNTS = [
  {
    name: "同花顺投资",
    url: "https://www.xiaohongshu.com/user/profile/690c95fe000000003002b7f4"
  },
  {
    name: "问财",
    url: "https://www.xiaohongshu.com/user/profile/65e93da0000000000500910e?channel_type=web_note_detail_r10",
    aliases: ["同花顺问财"]
  },
  {
    name: "研习社",
    url: "",
    aliases: ["同花顺研习社", "同顺研习社"]
  }
];

test("loadXhsAccounts normalizes account profile urls from accounts.json", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "xhs-accounts-"));
  await fs.writeFile(path.join(root, "accounts.json"), JSON.stringify(SAMPLE_ACCOUNTS), "utf8");

  const accounts = await loadXhsAccounts(root);

  assert.equal(accounts.length, 3);
  assert.equal(accounts[1].name, "问财");
  assert.equal(accounts[1].url, "https://www.xiaohongshu.com/user/profile/65e93da0000000000500910e");
  assert.deepEqual(accounts[1].aliases, ["同花顺问财"]);
});

test("selectXhsAccounts returns all accounts when no account is selected", () => {
  assert.deepEqual(selectXhsAccounts(SAMPLE_ACCOUNTS, ""), SAMPLE_ACCOUNTS);
});

test("selectXhsAccounts matches Xiaohongshu account aliases", () => {
  const selected = selectXhsAccounts(SAMPLE_ACCOUNTS, "同花顺问财");

  assert.equal(selected.length, 1);
  assert.equal(selected[0].name, "问财");
});

test("selectXhsAccounts reports available names for unknown selections", () => {
  assert.throws(
    () => selectXhsAccounts(SAMPLE_ACCOUNTS, "不存在的账号"),
    /未找到小红书账号：不存在的账号。可选账号：同花顺投资、问财、研习社/
  );
});
