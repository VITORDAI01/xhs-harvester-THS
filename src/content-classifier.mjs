import {
  DOUYIN_CONTENT_TYPE_DROPDOWN_VALUES,
  XHS_CONTENT_TYPE_DROPDOWN_VALUES
} from "./daily-records.mjs";
import { classifyTags } from "./tag-rules.mjs";

export const CONTENT_TYPE_REVIEW_PASS = "通过";
export const CONTENT_TYPE_REVIEW_REQUIRED = "需审核";

const CONTENT_TYPES_BY_PLATFORM = {
  douyin: DOUYIN_CONTENT_TYPE_DROPDOWN_VALUES,
  xhs: XHS_CONTENT_TYPE_DROPDOWN_VALUES
};

export async function classifyContentType({
  platformId,
  accountName = "",
  title = "",
  tags = "",
  text = "",
  env = process.env,
  fetch = globalThis.fetch
} = {}) {
  const tagType = classifyTags(tags, { platformId });
  if (tagType && tagType !== "无") {
    return classificationResult(tagType, CONTENT_TYPE_REVIEW_PASS, "tag");
  }

  const allowedContentTypes = CONTENT_TYPES_BY_PLATFORM[platformId] || [];
  const config = loadDeepSeekConfig(env);
  if (!config.ok || !allowedContentTypes.length || typeof fetch !== "function") {
    return classificationResult("无", CONTENT_TYPE_REVIEW_REQUIRED, "fallback");
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          {
            role: "system",
            content: [
              "你负责给短视频/图文内容选择内容类型。",
              "只能从用户提供的 allowedContentTypes 中选择一个 contentType。",
              "只返回 JSON，例如：{\"contentType\":\"图文\",\"review\":\"通过\"}。",
              "review 只能是 \"通过\" 或 \"需审核\"。证据不足或不确定时 review 写 \"需审核\"。"
            ].join("")
          },
          {
            role: "user",
            content: JSON.stringify({
              platformId,
              accountName,
              title,
              tags,
              text,
              allowedContentTypes
            })
          }
        ]
      })
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`DeepSeek API ${response.status || ""}: ${responseText}`);
    }

    const parsed = parseDeepSeekClassification(JSON.parse(responseText));
    const contentType = String(parsed.contentType || "").trim();
    if (!allowedContentTypes.includes(contentType)) {
      return classificationResult("无", CONTENT_TYPE_REVIEW_REQUIRED, "deepseek");
    }

    const review = parsed.review === CONTENT_TYPE_REVIEW_PASS
      ? CONTENT_TYPE_REVIEW_PASS
      : CONTENT_TYPE_REVIEW_REQUIRED;
    return classificationResult(contentType, review, "deepseek");
  } catch (error) {
    console.warn(`DeepSeek 内容类型分类失败：${error.message || String(error)}`);
    return classificationResult("无", CONTENT_TYPE_REVIEW_REQUIRED, "deepseek");
  }
}

export function parseDeepSeekClassification(responseJson) {
  const content = responseJson?.choices?.[0]?.message?.content;
  if (content && typeof content === "object") return content;
  const text = String(content || "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

function loadDeepSeekConfig(env = process.env) {
  const apiKey = String(env.DEEPSEEK_API_KEY || env.DEEPSEEK_API || "").trim();
  const model = String(env.DEEPSEEK_MODEL || "").trim();
  const baseUrl = String(env.DEEPSEEK_BASE_URL || env.DEEPSEEK_URL || "https://api.deepseek.com")
    .trim()
    .replace(/\/+$/, "");

  return {
    ok: Boolean(apiKey && model && baseUrl),
    apiKey,
    model,
    baseUrl
  };
}

function classificationResult(contentType, contentTypeReview, source) {
  return {
    contentType,
    contentTypeReview,
    source
  };
}
