const TAG_PATTERN = /#[\p{Script=Han}\p{Letter}\p{Number}_-]+/gu;
const SPACED_TAG_PATTERN = /#\s+([\p{Script=Han}\p{Letter}\p{Number}_-]+)/gu;
const URL_PATTERN = /https?:\/\/\S+/giu;

export function extractDouyinTags(text) {
  const normalized = normalizeText(text).replace(SPACED_TAG_PATTERN, "#$1");
  const matches = normalized.match(TAG_PATTERN) || [];
  return [...new Set(matches)].join(" ");
}

export function extractDouyinTagsFromSources({ itemText = "", titleText = "", shareText = "" } = {}) {
  for (const source of [itemText, titleText, shareText]) {
    const tags = extractDouyinTags(source);
    if (tags) return tags;
  }
  return "";
}

export function extractDouyinApiDetail(rawDetail) {
  const detail = rawDetail?.aweme_detail || rawDetail || {};
  const title = extractDouyinTitle({ itemText: detail.desc || detail.caption || "" });
  const tags = extractTagsFromAwemeDetail(detail);
  const authorSecUid = String(detail.author?.sec_uid || "").trim();

  return {
    title,
    tags,
    publishedAt: parseAwemeCreateTime(detail.create_time),
    authorProfileUrl: authorSecUid ? `https://www.douyin.com/user/${authorSecUid}` : "",
    authorName: String(detail.author?.nickname || "").trim()
  };
}

export function extractDouyinTitle({ itemText = "", titleText = "", shareText = "" } = {}) {
  for (const source of [itemText, shareText, titleText]) {
    const title = extractTitleFromSource(source);
    if (title) return title;
  }
  return "";
}

function extractTitleFromSource(source) {
  const lines = normalizeText(source)
    .split(/\n+/)
    .map((line) => cleanTitleLine(line))
    .filter(Boolean);

  for (const line of lines) {
    if (isMetadataLine(line)) continue;
    const title = removeShareCodePrefix(line);
    if (title) return title;
  }

  return "";
}

function cleanTitleLine(line) {
  return normalizeText(line)
    .replace(/复制此链接.*$/u, "")
    .replace(/打开Dou音搜索.*$/iu, "")
    .replace(/打开抖音搜索.*$/u, "")
    .replace(/抖音，记录美好生活。?$/u, "")
    .replace(/-\s*抖音$/u, "")
    .replace(URL_PATTERN, "")
    .replace(SPACED_TAG_PATTERN, "#$1")
    .replace(TAG_PATTERN, "")
    .replace(/发布时间[:：]?.*$/u, "")
    .replace(/发布于[:：]?.*$/u, "")
    .replace(/\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b.*$/u, "")
    .replace(/\d{4}年\d{1,2}月\d{1,2}日.*$/u, "")
    .replace(/[ \t]+/g, " ")
    .replace(/^[\s:：,，.。;；!！?？/\\|_-]+|[\s:：,，;；/\\|_-]+$/g, "")
    .trim();
}

function removeShareCodePrefix(line) {
  return line
    .replace(/^[\d.]+\s+[A-Za-z]@[A-Za-z0-9._-]+\s+\d{2}\/\d{2}\s+\S+\s+\S+\s+/u, "")
    .replace(/^[A-Za-z0-9._-]+\s+[A-Za-z]@[A-Za-z0-9._-]+\s+\d{2}\/\d{2}\s+\S+\s+\S+\s+/u, "")
    .replace(/^[\s:：,，.。;；!！?？/\\|_-]+|[\s:：,，;；/\\|_-]+$/g, "")
    .trim();
}

function isMetadataLine(line) {
  if (!line) return true;
  if (/^(发布时间|发布于|点赞|评论|收藏|分享)\b/u.test(line)) return true;
  if (/^(首页|推荐|关注|朋友|我的|登录|扫码登录)$/u.test(line)) return true;
  if (/^(刚刚|\d+\s*分钟前|\d+\s*小时前|昨天|今天)$/u.test(line)) return true;
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}/u.test(line)) return true;
  if (/^\d{4}年\d{1,2}月\d{1,2}日/u.test(line)) return true;
  return false;
}

function extractTagsFromAwemeDetail(detail) {
  const descTags = extractDouyinTags(detail.desc || detail.caption || "");
  if (descTags) return descTags;

  const explicitTags = [
    ...extractNames(detail.text_extra, ["hashtag_name", "hashtagName", "cha_name", "tag_name"]),
    ...extractNames(detail.cha_list, ["cha_name", "hashtag_name", "tag_name"]),
    ...extractNames(detail.challenge_list, ["cha_name", "hashtag_name", "tag_name"])
  ];
  if (explicitTags.length) return formatTagNames(explicitTags);

  const categoryTags = extractNames(detail.video_tag, ["tag_name"]);
  return categoryTags.length ? formatTagNames(categoryTags) : "";
}

function extractNames(items, keys) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      for (const key of keys) {
        const value = String(item[key] || "").trim();
        if (value) return value;
      }
      return "";
    })
    .filter(Boolean);
}

function formatTagNames(names) {
  const seen = new Set();
  const tags = [];
  for (const name of names) {
    const normalized = String(name || "")
      .replace(/^#+/u, "")
      .replace(/\s+/g, "")
      .trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(`#${normalized}`);
  }
  return tags.join(" ");
}

function parseAwemeCreateTime(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const millis = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(millis);
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u3000/g, " ")
    .replace(/\r/g, "\n")
    .trim();
}
