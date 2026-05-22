export const TAG_TYPE_RULES = [
  { tags: ["同花顺资讯"], type: "资讯" },
  { tags: ["同花顺股友说"], type: "股友说" },
  { tags: ["同顺图解"], type: "图文" },
  { tags: ["同顺盘点"], type: "盘点" },
  { tags: ["问财问句", "问财"], type: "问财问句" },
  { tags: ["同顺深度财经"], type: "长视频" },
  { tags: ["同顺财商"], type: "财商动画" },
  { tags: ["同花顺股民话题"], type: "社区话题" }
];

const XHS_TAG_TYPE_RULES = [
  { tags: ["励志语录"], type: "励志语录" },
  { tags: ["说唱"], type: "说唱" },
  { tags: ["大佬采访"], type: "大佬采访" },
  { tags: ["理财内容"], type: "理财内容" },
  { tags: ["常老师"], type: "常老师" },
  { tags: ["AI视频", "AI虚拟人", "虚拟人"], type: "AI视频 虚拟人" },
  { tags: ["段子"], type: "段子" }
];

export function classifyTags(tags, { platformId = "douyin" } = {}) {
  const tagText = String(tags || "").replace(/\s+/g, " ");
  const rules = platformId === "xhs" ? [...TAG_TYPE_RULES, ...XHS_TAG_TYPE_RULES] : TAG_TYPE_RULES;
  for (const rule of rules) {
    if (rule.tags.some((tag) => tagText.includes(tag))) {
      return normalizePlatformContentType(rule.type, platformId);
    }
  }
  return "无";
}

function normalizePlatformContentType(type, platformId) {
  return type;
}
