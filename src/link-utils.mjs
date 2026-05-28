export function extractXhsNoteId(value) {
  const text = extractLinkValue(value);
  const match = text.match(/xiaohongshu\.com\/(?:explore|discovery\/item)\/([^/?#\s]+)/)
    || text.match(/\/(?:explore|discovery\/item)\/([^/?#\s]+)/);
  return match?.[1] || "";
}

export function extractBilibiliBv(value) {
  const match = extractLinkValue(value).match(/\b(BV[0-9A-Za-z]{8,})\b/);
  return match?.[1] || "";
}

export function normalizeBilibiliVideoUrl(value) {
  const bvid = extractBilibiliBv(value);
  return bvid ? `https://www.bilibili.com/video/${bvid}/` : "";
}

export function extractFirstUrl(value) {
  const match = extractLinkValue(value).match(/https?:\/\/[^\s]+/);
  return match?.[0]?.replace(/[，。,.;；]+$/, "") || "";
}

export function extractLinkValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => extractLinkValue(entry)).find(Boolean) || "";
  }
  if (value && typeof value === "object") {
    return String(value.link || value.url || value.text || "");
  }
  return String(value || "");
}

export function buildXhsExploreUrl(noteId, token = "") {
  const id = String(noteId || "").trim();
  if (!id) return "";
  const params = new URLSearchParams();
  params.set("source", "webshare");
  params.set("xhsshare", "pc_web");
  if (token) params.set("xsec_token", String(token));
  params.set("xsec_source", "pc_share");
  return `https://www.xiaohongshu.com/discovery/item/${id}?${params.toString()}`;
}

export function normalizeXhsContentLink(value) {
  const link = extractLinkValue(value).trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) && !/xiaohongshu\.com\/(?:explore|discovery\/item)\//.test(link)) return link;
  if (!/^https?:\/\//i.test(link) && !link.startsWith("/") && !/^(?:explore|discovery\/item)\//.test(link)) return link;

  try {
    const url = new URL(link, "https://www.xiaohongshu.com");
    const noteId = extractXhsNoteId(url.toString());
    if (noteId && url.pathname.includes("/explore/")) {
      return buildXhsExploreUrl(noteId, url.searchParams.get("xsec_token") || "");
    }
    if (noteId && url.pathname.includes("/discovery/item/") && url.searchParams.get("xsec_token")) {
      url.searchParams.set("source", url.searchParams.get("source") || "webshare");
      url.searchParams.set("xhsshare", url.searchParams.get("xhsshare") || "pc_web");
      url.searchParams.set("xsec_source", "pc_share");
    }
    return url.toString();
  } catch {
    return link;
  }
}

export function canonicalizeContentLink(platformId, value) {
  const link = extractLinkValue(value).trim();
  if (!link) return "";

  if (platformId === "xhs") {
    return normalizeXhsContentLink(link);
  }

  if (platformId === "bilibili") {
    return normalizeBilibiliVideoUrl(link) || link;
  }

  return link;
}
