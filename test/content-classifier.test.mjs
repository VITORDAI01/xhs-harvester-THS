import test from "node:test";
import assert from "node:assert/strict";
import { classifyContentType, parseDeepSeekClassification } from "../src/content-classifier.mjs";

test("content classifier uses tag rules before DeepSeek", async () => {
  let calls = 0;
  const result = await classifyContentType({
    platformId: "douyin",
    tags: "#同花顺资讯 #同花顺APP",
    fetch: async () => {
      calls += 1;
      throw new Error("DeepSeek should not be called");
    }
  });

  assert.deepEqual(result, {
    contentType: "资讯",
    contentTypeReview: "通过",
    source: "tag"
  });
  assert.equal(calls, 0);
});

test("content classifier accepts a valid DeepSeek fallback type", async () => {
  const result = await classifyContentType({
    platformId: "xhs",
    accountName: "同花顺投资",
    title: "一张图看懂今日市场机会",
    tags: "#投资",
    env: {
      DEEPSEEK_API_KEY: "sk-test",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-v4-flash"
    },
    fetch: async (url, options) => {
      assert.equal(url, "https://api.deepseek.com/chat/completions");
      assert.equal(options.headers.Authorization, "Bearer sk-test");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "deepseek-v4-flash");
      assert.equal(body.response_format.type, "json_object");
      assert.match(body.messages.at(-1).content, /一张图看懂今日市场机会/);
      return jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                contentType: "图文",
                review: "通过"
              })
            }
          }
        ]
      });
    }
  });

  assert.deepEqual(result, {
    contentType: "图文",
    contentTypeReview: "通过",
    source: "deepseek"
  });
});

test("content classifier marks invalid DeepSeek output for review", async () => {
  const result = await classifyContentType({
    platformId: "douyin",
    title: "今日市场机会",
    tags: "#投资",
    env: {
      DEEPSEEK_API_KEY: "sk-test",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-v4-flash"
    },
    fetch: async () => jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              contentType: "不存在的类型",
              review: "通过"
            })
          }
        }
      ]
    })
  });

  assert.deepEqual(result, {
    contentType: "无",
    contentTypeReview: "需审核",
    source: "deepseek"
  });
});

test("content classifier requires DeepSeek to explicitly pass review", async () => {
  const result = await classifyContentType({
    platformId: "douyin",
    title: "今日市场机会",
    tags: "#投资",
    env: {
      DEEPSEEK_API_KEY: "sk-test",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-v4-flash"
    },
    fetch: async () => jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              contentType: "资讯"
            })
          }
        }
      ]
    })
  });

  assert.deepEqual(result, {
    contentType: "资讯",
    contentTypeReview: "需审核",
    source: "deepseek"
  });
});

test("parseDeepSeekClassification reads JSON text from chat response", () => {
  assert.deepEqual(parseDeepSeekClassification({
    choices: [
      {
        message: {
          content: '{"contentType":"盘点","review":"需审核"}'
        }
      }
    ]
  }), {
    contentType: "盘点",
    review: "需审核"
  });
});

function jsonResponse(data) {
  return {
    ok: true,
    async text() {
      return JSON.stringify(data);
    }
  };
}
