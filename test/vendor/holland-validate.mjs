/** 霍兰德校验摘自 mindtest-web `lib/validate.mjs`（cursor/sefs-allow-assessment-75bb）。
 * 只保留 validateHollandResult 用到的检查，便于本仓库对云端正文跑同一套规则。
 */
import {
  HOLLAND_CONSENT_VERSION,
  HOLLAND_READER_GAP,
  HOLLAND_VERSION,
  hollandAnswersOk,
  hollandBodyParts,
  hollandExploreOk,
} from "./holland-score.mjs";

export const SCHEMA_VERSION = "1.0.0";
const REPORT_ID_RE = /^rpt_[A-Za-z0-9_-]{11,64}$/;
const SUBMISSION_RE = /^sub_[A-Za-z0-9_-]{8,64}$/;
const TOP_KEYS = new Set([
  "reportId", "assessmentId", "assessmentName", "assessmentVersion", "nickname",
  "completedAt", "dimensions", "result", "interpretation", "recommendations",
  "reportContent", "extensionData", "source", "schemaVersion",
]);
const FORBIDDEN_KEY = /phone|mobile|telephone|idcard|id_card|wechat|weixin|realname|real_name|email|address|手机|身份证|微信|邮箱|住址/i;
const PHONE_VALUE = /(?:^|[^\d])1[3-9]\d{9}(?:$|[^\d])/;
const PARTIAL_SCOPES = ["store", "share_link", "mentor_read"];
const HOLLAND_EXTENSION_KEYS = new Set(["answers", "score", "openText", "quality", "consent", "compat", "attribution"]);

function chars(value) {
  return Array.from(String(value || ""));
}

function scanKeys(value, issues, path) {
  if (!value || typeof value !== "object") return;
  const keys = Array.isArray(value) ? [] : Object.keys(value);
  for (const key of keys) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      issues.push(`${path} 含有不允许的键`);
    }
    if (FORBIDDEN_KEY.test(key)) issues.push(`${path}.${key} 不在可保存范围内`);
    scanKeys(value[key], issues, `${path}.${key}`);
  }
  if (Array.isArray(value)) value.forEach((item, index) => scanKeys(item, issues, `${path}[${index}]`));
}

function scanPhones(value, issues, path) {
  if (typeof value === "string") {
    if (PHONE_VALUE.test(value)) issues.push(`${path} 不能保存手机号`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPhones(item, issues, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) scanPhones(value[key], issues, `${path}.${key}`);
  }
}

function sameValue(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => sameValue(item, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key]));
}

function checkPartialFrame(result, issues, spec) {
  scanKeys(result, issues, "result");
  scanPhones(result, issues, "result");
  for (const key of Object.keys(result)) {
    if (!TOP_KEYS.has(key)) issues.push(`不能保存额外字段 ${key}`);
  }
  if (!REPORT_ID_RE.test(String(result.reportId || ""))) issues.push("reportId 格式不对");
  if (result.assessmentId !== spec.id) issues.push("测评不在可保存范围内");
  if (!String(result.assessmentName || "").includes(spec.name)) issues.push("测评名称不对");
  if (result.assessmentVersion !== spec.version) issues.push("规则版本不对");
  if (result.schemaVersion !== SCHEMA_VERSION) issues.push("协议版本不对");
  const nick = chars(result.nickname);
  if (nick.length < 1 || nick.length > 12) issues.push("昵称需要 1–12 个字");
  if (!Number.isFinite(Date.parse(result.completedAt))) issues.push("完成时间不对");
  if (!result.reportContent || result.reportContent.format !== "view-model+sections") {
    issues.push("报告快照格式不对");
  }
  if (!result.reportContent || !result.reportContent.viewModel) issues.push("缺少视图");
  const raw = JSON.stringify(result.reportContent || {});
  if (/data:(image|application\/pdf)|<!doctype|<html/i.test(raw)) issues.push("不能保存图片、PDF 或 HTML");
  const extension = result.extensionData;
  if (!extension || typeof extension !== "object" || Array.isArray(extension)) {
    issues.push("缺少扩展数据");
  } else {
    for (const key of Object.keys(extension)) {
      if (!spec.extensionKeys.has(key)) issues.push(`不能保存额外字段 extensionData.${key}`);
    }
  }
  const consent = extension && extension.consent;
  if (!consent || consent.agreed !== true) issues.push("未同意不能保存");
  if (consent && consent.version !== spec.consent) issues.push("同意文案版本不对");
  const scopes = consent && consent.scopes;
  if (!Array.isArray(scopes) || !scopes.includes("store") || !scopes.includes("share_link")) {
    issues.push("同意范围不足");
  } else if (scopes.some((scope) => !PARTIAL_SCOPES.includes(scope))) {
    issues.push("同意范围不能包含档案或电话");
  }
  const attribution = extension && extension.attribution;
  if (attribution != null) {
    if (typeof attribution !== "object" || Array.isArray(attribution)) issues.push("来源标注格式不对");
    else {
      for (const key of Object.keys(attribution)) {
        if (key !== "mentorId" && key !== "activity") issues.push(`不能保存额外字段 attribution.${key}`);
        const value = attribution[key];
        if (value == null || value === "") continue;
        if (typeof value !== "string" || Array.from(value).length > 40) issues.push(`${key} 太长`);
      }
    }
  }
  const compat = extension && extension.compat;
  if (!compat || compat.level !== "partial") issues.push(`${spec.label}这一期按部分兼容保存`);
  if (!compat || !Array.isArray(compat.gaps) || !compat.gaps.includes(spec.gap)) {
    issues.push("阅读页缺口说明不完整");
  }
  const source = result.source;
  if (!source || source.origin !== "external-repo" || source.repo !== spec.repo || source.path !== spec.path) {
    issues.push("来源不对");
  }
  if (!source || !SUBMISSION_RE.test(String(source.clientSubmissionId || ""))) issues.push("提交号格式不对");
  if (source && source.resultKitId !== spec.resultKitId) issues.push("resultKit 标识不对");
  const view = result.reportContent && result.reportContent.viewModel;
  const rushed = view && view.rushed;
  if (typeof rushed !== "boolean" || !sameValue(extension && extension.quality, { rushed })) {
    issues.push("作答速度标记不一致");
  }
  return { view, extension, rushed };
}

function checkBody(result, issues, parts) {
  if (!parts) return;
  if (!sameValue(result.dimensions, parts.dimensions)) issues.push("维度与作答不一致");
  if (!sameValue(result.result, parts.result)) issues.push("结论与作答不一致");
  if (!sameValue(result.interpretation, parts.interpretation)) issues.push("解释与作答不一致");
  if (!sameValue(result.recommendations, parts.recommendations)) issues.push("建议与作答不一致");
  if (!sameValue(result.reportContent, parts.reportContent)) issues.push("视图与作答不一致");
  if (!sameValue(result.extensionData && result.extensionData.score, parts.score)) issues.push("扩展分数与作答不一致");
}

export function validateHollandResult(result) {
  const issues = [];
  if (!result || typeof result !== "object" || Array.isArray(result)) return ["结果必须是对象"];
  const frame = checkPartialFrame(result, issues, {
    id: "holland",
    name: "霍兰德兴趣探索",
    version: HOLLAND_VERSION,
    consent: HOLLAND_CONSENT_VERSION,
    gap: HOLLAND_READER_GAP,
    label: "霍兰德兴趣探索",
    repo: "holland-explore",
    path: "index.html",
    resultKitId: "holland",
    extensionKeys: HOLLAND_EXTENSION_KEYS,
  });
  const answers = frame.view && frame.view.answers;
  const explore = frame.view && frame.view.explore;
  if (!hollandAnswersOk(answers)) issues.push("作答需要 60 道 1–5 的整数题");
  if (!hollandExploreOk(explore)) issues.push("探索题格式不对");
  if (hollandAnswersOk(answers) && hollandExploreOk(explore) && typeof frame.rushed === "boolean") {
    let parts = null;
    try {
      parts = hollandBodyParts(answers, explore, frame.rushed);
    } catch {
      parts = null;
    }
    if (!parts) issues.push("作答需要 60 道 1–5 的整数题");
    else {
      checkBody(result, issues, parts);
      if (!sameValue(frame.extension && frame.extension.answers, answers)) issues.push("扩展作答与视图不一致");
      if (!sameValue(frame.extension && frame.extension.openText, parts.openText)) issues.push("探索题与视图不一致");
    }
  }
  return issues;
}
