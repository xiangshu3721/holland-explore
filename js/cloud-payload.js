/* 霍兰德兴趣探索 · 云端协议（对齐 ECR / 寻根的 assessmentReportDev 结果对象）。
 *
 * 版本：
 * - assessmentVersion 固定 holland-h5-v1（云端契约）。
 * - extensionData.score.version 固定 RIASEC_V2（本机计分引擎的规则版本）。
 *
 * 作答用紧凑数组，不用 id→分数的对象：
 * answers 是 js/questions.js 题库顺序的 60 个整数 1–5，即 Q01…Q60。
 * 这个顺序和题号一致，也是文件顺序，不是作答时打乱后的顺序。
 * 服务端可以按每题的 dimension 重算六维分数，再和 scores / holland_code / ranking 对账。
 * 调用方可以传入数组，或传入 {Q01:1 … Q60:5}；写进协议的始终是上面这个数组。
 *
 * 隐私：只上传结构化兴趣结果。
 * 包含 scores（R I A S E C，0–100）、structure、bands、holland_code、ranking、top_dimensions、answers。
 * 不上传开放题原文（explore.q1、explore.q2other）、第 2/3 题选项、题目原文、作答用时、median_ms，也不上传电话号码。
 * 阅读不依赖那些原文：textFallback / sections 只用组合、六维分数、结构带和排序。
 */
(function (root) {
  "use strict";
  var DIMS = ["R", "I", "A", "S", "E", "C"];
  var NAMES = { R: "实际", I: "研究", A: "艺术", S: "社会", E: "企业", C: "常规" };
  var DOM_LABEL = { DUAL: "双核心明显", SOME: "有一定主次", PROMINENT: "第一兴趣相对突出" };
  var DIF_LABEL = { LOW: "比较均衡", MID: "有一定区分", HIGH: "区分清楚" };
  var CON_LABEL = { HIGH: "比较自然地连在一起", MEDIUM: "具有一定跨度", CROSS: "跨界型组合" };
  var BREADTH_LABEL = { ONE: "比较集中", FEW: "有几个中心", MANY: "比较宽" };
  var ASSESSMENT_ID = "holland";
  var ASSESSMENT_NAME = "霍兰德兴趣探索";
  var HOLLAND_VERSION = "holland-h5-v1";
  var SCORE_VERSION = "RIASEC_V2";
  var CONSENT_VERSION = "consent-assessment-holland-1";
  var SCHEMA_VERSION = "1.0.0";
  var SCREEN = "这是兴趣探索，不是职业诊断。分数是这次作答里的相对喜爱程度，不代表能力高低，也不是对你的完整定义。";
  var READER_GAP = "阅读页若尚未重绘霍兰德兴趣探索，兴趣组合、六维分数、结构带和排序写在 interpretation、sections 与 textFallback。开放题原文不在这份结果里。";

  function chars(value) {
    return Array.from(String(value == null ? "" : value));
  }

  function hollandNickname(value) {
    var s = String(value == null ? "" : value).replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    return chars(s).slice(0, 12).join("");
  }

  function phoneNickname(value) {
    var text = String(value == null ? "" : value);
    if (/(?:^|[^\d])1[3-9]\d{9}(?:$|[^\d])/.test(text)) return true;
    return /1[3-9]\d{9}/.test(text.replace(/\D/g, ""));
  }

  function likert(n) {
    return typeof n === "number" && isFinite(n) && Math.round(n) === n && n >= 1 && n <= 5;
  }

  function questions() {
    var list = root.HOLLAND_QUESTIONS;
    if (!list || list.length !== 60) return null;
    return list;
  }

  /* 归一成题库顺序数组。失败返回 null，调用方不得上传。 */
  function answersInBankOrder(input) {
    var bank = questions();
    if (!bank) return null;
    var list = [];
    var map = {};
    var i, id, n;
    if (Array.isArray(input)) {
      if (input.length !== 60) return null;
      for (i = 0; i < 60; i++) {
        n = input[i];
        if (!likert(n)) return null;
        id = bank[i].id;
        list.push(n);
        map[id] = n;
      }
    } else if (input && typeof input === "object") {
      for (i = 0; i < 60; i++) {
        id = bank[i].id;
        if (!Object.prototype.hasOwnProperty.call(input, id)) return null;
        n = input[id];
        if (!likert(n)) return null;
        list.push(n);
        map[id] = n;
      }
    } else return null;
    return { list: list, map: map };
  }

  function copyScores(scores) {
    var out = {};
    for (var i = 0; i < DIMS.length; i++) {
      var d = DIMS[i];
      var n = scores && scores[d];
      if (typeof n !== "number" || !isFinite(n) || n < 0 || n > 100) return null;
      out[d] = n;
    }
    return out;
  }

  function copyStructure(st) {
    if (!st) return null;
    var consistency = st.consistency;
    if (consistency !== "HIGH" && consistency !== "MEDIUM" && consistency !== "CROSS") return null;
    if (typeof st.dominance !== "number" || typeof st.differentiation !== "number" || typeof st.breadth !== "number") return null;
    if (st.breadth < 1 || st.breadth > 6) return null;
    return {
      dominance: st.dominance,
      near_tie_top12: !!st.near_tie_top12,
      near_tie_top34: !!st.near_tie_top34,
      differentiation: st.differentiation,
      consistency: consistency,
      breadth: st.breadth
    };
  }

  function copyBands(bands) {
    if (!bands) return null;
    if (!DOM_LABEL[bands.dominance] || !DIF_LABEL[bands.differentiation] || !BREADTH_LABEL[bands.breadth]) return null;
    return { dominance: bands.dominance, differentiation: bands.differentiation, breadth: bands.breadth };
  }

  function structured(result) {
    if (!result || result.version !== SCORE_VERSION) return null;
    var scores = copyScores(result.scores);
    var structure = copyStructure(result.structure);
    var bands = copyBands(result.bands);
    var ranking = Array.isArray(result.ranking) ? result.ranking.slice() : null;
    var top = Array.isArray(result.top_dimensions) ? result.top_dimensions.slice() : null;
    if (!scores || !structure || !bands || !ranking || ranking.length !== 6 || !top || top.length !== 3) return null;
    var seen = {};
    for (var i = 0; i < 6; i++) {
      if (DIMS.indexOf(ranking[i]) < 0 || seen[ranking[i]]) return null;
      seen[ranking[i]] = true;
      if (i < 3 && ranking[i] !== top[i]) return null;
    }
    if (result.holland_code !== top.join("")) return null;
    return {
      version: SCORE_VERSION,
      scores: scores,
      top_dimensions: top,
      holland_code: result.holland_code,
      structure: structure,
      bands: bands,
      ranking: ranking
    };
  }

  function sameStructured(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function readable(score) {
    var names = score.top_dimensions.map(function (d) { return NAMES[d] + " " + d; }).join(" × ");
    var ranked = score.ranking.map(function (d) { return NAMES[d] + " " + d + " " + score.scores[d]; }).join("，");
    var bands = "主次是" + DOM_LABEL[score.bands.dominance]
      + "，区分度是" + DIF_LABEL[score.bands.differentiation]
      + "，一致性是" + CON_LABEL[score.structure.consistency]
      + "，兴趣宽度是" + BREADTH_LABEL[score.bands.breadth] + "。";
    var headline = "你的核心兴趣组合：" + score.holland_code;
    var summary = "前三个方向是" + names + "。" + ranked + "。" + bands + SCREEN;
    return { headline: headline, summary: summary, ranked: ranked, bands: bands };
  }

  function dimensions(score) {
    return DIMS.map(function (d) {
      return {
        id: d,
        name: NAMES[d],
        kind: "score",
        score: score.scores[d],
        max: 100,
        labels: []
      };
    });
  }

  function buildHollandResult(input) {
    input = input || {};
    var nickname = hollandNickname(input.nickname);
    if (!nickname || phoneNickname(input.nickname) || phoneNickname(nickname)) return null;
    if (!input.reportId || !input.clientSubmissionId || !input.completedAt) return null;
    var packed = answersInBankOrder(input.answers);
    if (!packed) return null;
    var engine = root.HollandEngine;
    if (!engine || typeof engine.compute !== "function") return null;
    var computed;
    try {
      computed = structured(engine.compute(packed.map));
    } catch (e) {
      return null;
    }
    if (!computed) return null;
    if (input.result && !sameStructured(structured(input.result), computed)) return null;

    var text = readable(computed);
    var answerCopy = packed.list.slice();
    var sections = [
      { t: "h", l: 2, x: text.headline },
      { t: "p", x: text.summary },
      { t: "p", x: SCREEN },
      { t: "p", x: text.ranked + "。" },
      { t: "p", x: text.bands }
    ];
    return {
      reportId: input.reportId,
      assessmentId: ASSESSMENT_ID,
      assessmentName: ASSESSMENT_NAME,
      assessmentVersion: HOLLAND_VERSION,
      nickname: nickname,
      completedAt: input.completedAt,
      dimensions: dimensions(computed),
      result: {
        headline: text.headline,
        code: computed.holland_code,
        label: "兴趣探索 · 非诊断",
        summary: text.summary,
        flags: []
      },
      interpretation: [
        { id: "verdict", title: text.headline, text: text.summary },
        { id: "screen", title: "不是职业诊断", text: SCREEN },
        { id: "ranking", title: "六个方向的排序", text: text.ranked + "。" },
        { id: "structure", title: "兴趣结构", text: text.bands }
      ],
      recommendations: [
        { id: "screen", title: null, text: SCREEN },
        { id: "reader", title: null, text: READER_GAP }
      ],
      reportContent: {
        format: "view-model+sections",
        viewModel: {
          version: computed.version,
          answers: answerCopy.slice(),
          scores: computed.scores,
          top_dimensions: computed.top_dimensions.slice(),
          holland_code: computed.holland_code,
          structure: computed.structure,
          bands: computed.bands,
          ranking: computed.ranking.slice()
        },
        sections: sections,
        textFallback: sections.map(function (section) { return section.x; }).join("")
      },
      extensionData: {
        answers: answerCopy.slice(),
        score: computed,
        consent: {
          agreed: true,
          version: CONSENT_VERSION,
          at: input.completedAt,
          scopes: ["store", "share_link", "mentor_read"]
        },
        compat: { level: "partial", gaps: [READER_GAP] }
      },
      source: {
        site: ASSESSMENT_NAME,
        path: "index.html",
        repo: "holland-explore",
        origin: "external-repo",
        pageUrl: "https://xiangshu3721.github.io/holland-explore/",
        clientSubmissionId: input.clientSubmissionId,
        resultKitId: "holland",
        localKey: "holland_explore.history"
      },
      schemaVersion: SCHEMA_VERSION
    };
  }

  root.HollandCloudPayload = {
    ASSESSMENT_ID: ASSESSMENT_ID,
    ASSESSMENT_NAME: ASSESSMENT_NAME,
    HOLLAND_VERSION: HOLLAND_VERSION,
    SCORE_VERSION: SCORE_VERSION,
    CONSENT_VERSION: CONSENT_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    SCREEN: SCREEN,
    hollandNickname: hollandNickname,
    phoneNickname: phoneNickname,
    answersInBankOrder: answersInBankOrder,
    buildHollandResult: buildHollandResult
  };
})(typeof window !== "undefined" ? window : globalThis);
