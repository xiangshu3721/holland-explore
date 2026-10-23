import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import test from "node:test";

function loadHolland(extra) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Intl,
    Number,
    String,
    Object,
    Array,
    Boolean,
    Error,
    Uint8Array,
    btoa: globalThis.btoa,
    atob: globalThis.atob,
    crypto: globalThis.crypto,
    isFinite,
    isNaN,
    Promise,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  createContext(sandbox);
  const names = ["questions.js", "content.js", "engine.js", "report.js", "cloud-config.js", "cloud-client.js", "cloud-payload.js"].concat(extra || []);
  for (const name of names) {
    runInContext(readFileSync(new URL(`./${name}`, import.meta.url), "utf8"), sandbox, { filename: name });
  }
  return sandbox;
}

const page = loadHolland();
const P = page.HollandCloudPayload;
const E = page.HollandEngine;
const Q = page.HOLLAND_QUESTIONS;

function base(extra) {
  return {
    nickname: "林深",
    reportId: "rpt_abcdefghijk",
    clientSubmissionId: "sub_abcdefghijklmnop",
    completedAt: "2026-10-23T15:04:05+08:00",
    ...extra,
  };
}

function pattern(seed) {
  const map = {};
  Q.forEach((q, index) => { map[q.id] = ((index + seed) % 5) + 1; });
  return map;
}

function same(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

function keysOf(value, found = []) {
  if (!value || typeof value !== "object") return found;
  const keys = Array.isArray(value) ? [] : Object.keys(value);
  for (const key of keys) {
    found.push(key);
    keysOf(value[key], found);
  }
  if (Array.isArray(value)) value.forEach((item) => keysOf(item, found));
  return found;
}

test("称呼取前 12 个字，手机号和坏作答不上传", () => {
  assert.equal(P.hollandNickname("  林深  "), "林深");
  assert.equal(P.hollandNickname(`${"林深".repeat(6)}尾`), "林深".repeat(6));
  assert.equal(P.hollandNickname("   "), "");
  assert.equal(P.phoneNickname("13800000000"), true);
  assert.equal(P.phoneNickname("+86 138-0000-0000"), true);
  assert.equal(P.phoneNickname("林深"), false);
  const answers = pattern(0);
  assert.equal(P.buildHollandResult(base({ nickname: "  ", answers })), null);
  assert.equal(P.buildHollandResult(base({ nickname: "13800000000", answers })), null);
  assert.equal(P.buildHollandResult(base({ nickname: "电话13800000000", answers })), null);
  assert.equal(P.buildHollandResult(base({ answers: null })), null);
  assert.equal(P.buildHollandResult(base({ answers: { ...answers, Q60: 0 } })), null);
  assert.equal(P.buildHollandResult(base({ answers: { ...answers, Q60: 6 } })), null);
  assert.equal(P.buildHollandResult(base({ answers: { ...answers, Q12: 1.5 } })), null);
  const missing = { ...answers };
  delete missing.Q60;
  assert.equal(P.buildHollandResult(base({ answers: missing })), null);
  assert.equal(P.buildHollandResult(base({ answers, reportId: "" })), null);
  const computed = E.compute(answers);
  const tampered = { ...computed, holland_code: "XXX" };
  assert.equal(P.buildHollandResult(base({ answers, result: tampered })), null);
});

test("题库顺序数组与作答映射等价，分数跟引擎，开放题不进云端", () => {
  const map = pattern(1);
  map.Q01 = 5;
  map.q1 = "SECRET_OPEN_9f3c 我小时候最投入的是修收音机";
  map.q2other = "SECRET_OTHER_9f3c";
  const list = Q.map((q) => map[q.id]);
  const computed = E.compute(map);
  const shared = {
    q1: "SECRET_OPEN_9f3c 我小时候最投入的是修收音机",
    q2other: "SECRET_OTHER_9f3c",
    explore: { q1: "SECRET_OPEN_9f3c", q2: ["学一种东西"], q2other: "SECRET_OTHER_9f3c", q3: ["专业选择"] },
    phone: "13800000000",
    wechat: "secret-wechat",
    wechatQr: "secret-qr",
    times: { Q01: 987654 },
    median_ms: 987654,
    profile: { name: "张三", phone: "13800000000" },
  };
  const fromMap = P.buildHollandResult(base({
    nickname: `${"林深".repeat(6)}多余`,
    answers: map,
    result: computed,
    ...shared,
  }));
  const fromList = P.buildHollandResult(base({ nickname: "林深".repeat(6), answers: list }));
  const packed = JSON.stringify(fromMap);
  assert.equal(fromMap.assessmentId, "holland");
  assert.equal(fromMap.assessmentId, P.ASSESSMENT_ID);
  assert.equal(fromMap.assessmentName, "霍兰德兴趣探索");
  assert.equal(fromMap.assessmentVersion, "holland-h5-v1");
  assert.equal(fromMap.assessmentVersion, P.HOLLAND_VERSION);
  assert.equal(fromMap.schemaVersion, "1.0.0");
  assert.equal(fromMap.nickname, "林深".repeat(6));
  assert.equal(fromMap.extensionData.score.version, "RIASEC_V2");
  assert.equal(fromMap.result.code, computed.holland_code);
  assert.equal(fromMap.result.code, fromMap.extensionData.score.holland_code);
  same(fromMap.extensionData.score.scores, computed.scores);
  same(fromMap.extensionData.score.top_dimensions, computed.top_dimensions);
  same(fromMap.extensionData.score.structure, computed.structure);
  same(fromMap.extensionData.score.bands, computed.bands);
  same(fromMap.extensionData.score.ranking, computed.ranking);
  same(fromMap.reportContent.viewModel.scores, computed.scores);
  same(fromMap.reportContent.viewModel.bands, computed.bands);
  same(fromMap.reportContent.viewModel.ranking, computed.ranking);
  same(fromMap.extensionData.answers, list);
  same(fromMap.reportContent.viewModel.answers, list);
  assert.equal(fromMap.extensionData.answers.length, 60);
  assert.equal(fromMap.extensionData.answers[0], 5);
  assert.equal(Q[0].id, "Q01");
  same(fromList.extensionData.answers, list);
  same(fromList.extensionData.score, fromMap.extensionData.score);
  same(fromMap.dimensions.map((item) => item.id), ["R", "I", "A", "S", "E", "C"]);
  same(fromMap.dimensions.map((item) => item.score), ["R", "I", "A", "S", "E", "C"].map((id) => computed.scores[id]));
  assert.equal(fromMap.dimensions.every((item) => item.score >= 0 && item.score <= 100), true);
  assert.equal(fromMap.reportContent.format, "view-model+sections");
  assert.equal(fromMap.reportContent.textFallback, fromMap.reportContent.sections.map((section) => section.x).join(""));
  assert.equal(fromMap.reportContent.textFallback.includes(computed.holland_code), true);
  assert.equal(fromMap.reportContent.textFallback.includes(P.SCREEN), true);
  for (const id of ["R", "I", "A", "S", "E", "C"]) {
    assert.equal(fromMap.reportContent.textFallback.includes(String(computed.scores[id])), true);
  }
  assert.equal(fromMap.source.repo, "holland-explore");
  assert.equal(fromMap.source.origin, "external-repo");
  assert.equal(fromMap.source.path, "index.html");
  assert.equal(fromMap.source.pageUrl, "https://xiangshu3721.github.io/holland-explore/");
  assert.equal(fromMap.source.resultKitId, "holland");
  assert.equal(fromMap.source.localKey, "holland_explore.history");
  same(fromMap.extensionData.consent.scopes, ["store", "share_link", "mentor_read"]);
  assert.equal(fromMap.extensionData.consent.version, "consent-assessment-holland-1");
  assert.equal(fromMap.extensionData.compat.level, "partial");
  assert.equal(fromMap.recommendations[0].title, null);
  assert.equal(packed.includes("SECRET_OPEN_9f3c"), false);
  assert.equal(packed.includes("SECRET_OTHER_9f3c"), false);
  assert.equal(packed.includes("13800000000"), false);
  assert.equal(packed.includes("secret-wechat"), false);
  assert.equal(packed.includes("secret-qr"), false);
  assert.equal(packed.includes("987654"), false);
  assert.equal(packed.includes("张三"), false);
  assert.equal(packed.includes(Q[0].text), false);
  assert.equal(packed.includes("学一种东西"), false);
  assert.equal(packed.includes("专业选择"), false);
  for (const key of ["q1", "q2", "q2other", "q3", "explore", "phone", "wechat", "wechatQr", "times", "median_ms", "quality", "profile", "openAnswers"]) {
    assert.equal(keysOf(fromMap).includes(key), false, key);
  }
  same(Object.keys(fromMap).sort(), [
    "assessmentId", "assessmentName", "assessmentVersion", "completedAt", "dimensions",
    "extensionData", "interpretation", "nickname", "recommendations", "reportContent",
    "reportId", "result", "schemaVersion", "source",
  ].sort());
  same(Object.keys(fromMap.extensionData).sort(), ["answers", "compat", "consent", "score"]);
  same(Object.keys(fromMap.extensionData.score).sort(), [
    "bands", "holland_code", "ranking", "scores", "structure", "top_dimensions", "version",
  ]);
});

test("均匀作答的质量标记留在本机，云端报告仍然可读", () => {
  const map = {};
  Q.forEach((q) => { map[q.id] = 3; });
  const computed = E.compute(map, { Q01: 100 });
  assert.equal(computed.quality.includes("LOW_VARIANCE"), true);
  const report = P.buildHollandResult(base({ answers: map, result: computed, times: { Q01: 100 } }));
  const packed = JSON.stringify(report);
  assert.equal(report.extensionData.score.holland_code, computed.holland_code);
  assert.equal(packed.includes("LOW_VARIANCE"), false);
  assert.equal(packed.includes("MANY_UNSURE"), false);
  assert.equal(packed.includes("FAST_RESPONSE"), false);
  assert.equal(packed.includes("median_ms"), false);
  const quiet = page.HollandReport.build({
    nick: "林深",
    t: Date.parse("2026-10-23T15:04:05+08:00"),
    result: computed,
    explore: { q1: "", q2: [], q2other: "", q3: [] },
  }, {});
  assert.equal(quiet.code, computed.holland_code);
  same(quiet.sections.map((section) => section.id), [
    "combo", "attract", "interact", "dims", "structure", "env", "life", "experience", "career",
  ]);
  assert.equal(JSON.stringify(quiet).includes("你提到："), false);
  const echoed = page.HollandReport.build({
    nick: "林深",
    t: Date.parse("2026-10-23T15:04:05+08:00"),
    result: computed,
    explore: { q1: "SECRET_OPEN_9f3c", q2: [], q2other: "SECRET_OTHER_9f3c", q3: [] },
  }, {});
  assert.equal(JSON.stringify(echoed).includes("SECRET_OPEN_9f3c"), true);
  assert.equal(JSON.stringify(echoed).includes("SECRET_OTHER_9f3c"), true);
  assert.equal(packed.includes("SECRET_OPEN_9f3c"), false);
});

test("分享短链和提交体按 ECR / 寻根的公开地址，源码不带密钥和二维码", () => {
  const client = page.HollandCloudClient;
  const ids = client.createSubmissionIds();
  const url = client.buildShareUrl(page.HOLLAND_CLOUD_CONFIG.reportPageBase, ids.reportId, ids.linkSecret);
  assert.match(url, /^https:\/\/xiangshu3721\.github\.io\/mindtest-web\/r\/#[A-Za-z0-9_-]{11}\.[A-Za-z0-9_-]{16}$/);
  assert.equal(url.includes("rpt_"), false);
  assert.equal(url.length, 75);
  assert.equal(client.parseShareLink(url).reportId, ids.reportId);
  assert.equal(client.parseShareLink(url).linkSecret, ids.linkSecret);
  assert.equal(page.HOLLAND_CLOUD_CONFIG.endpoint, "https://root-journey-prod-d4d7pzd0a8f805-1304965105.ap-shanghai.app.tcloudbase.com/assessment-report-dev");
  const body = client.submitBody({ payload: { assessmentId: "holland" }, linkSecret: ids.linkSecret, ownerToken: ids.ownerToken });
  same(Object.keys(body).sort(), ["linkSecret", "ownerToken", "result"]);
  const payload = readFileSync(new URL("./cloud-payload.js", import.meta.url), "utf8");
  const share = readFileSync(new URL("./cloud-share.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(payload.includes("Q01"), true);
  assert.equal(payload.includes("题库顺序"), true);
  assert.equal(payload.includes("fetch("), false);
  assert.equal(share.includes("分享结果"), true);
  assert.equal(share.includes("/v1/results"), true);
  assert.equal(share.includes("submitBody"), true);
  assert.equal(html.includes('id="share-slot"'), true);
  assert.equal(html.includes("cloud-share.js"), true);
  for (const source of [payload, share]) {
    assert.equal(source.includes("微信"), false);
    assert.equal(source.includes("二维码"), false);
    assert.equal(source.includes("openai"), false);
    assert.equal(source.includes("apiKey"), false);
    assert.equal(source.includes("sk-"), false);
  }
  assert.equal(share.includes("我同意"), false);
  assert.equal(share.includes("腾讯云"), false);
  assert.equal(html.includes("tcloudbase"), false);
});
