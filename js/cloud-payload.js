/* 霍兰德兴趣探索 · 云端协议。正文与 mindtest-web hollandBodyParts 对齐。
 *
 * assessmentId=holland，assessmentVersion=holland-h5-v1，
 * consent.version=consent-assessment-holland-1。
 * viewModel.answers 是题库顺序 Q01–Q60 的 60 个整数 1–5。
 *
 * 隐私：开放题原文不上传。
 * viewModel.explore 与 extensionData.openText 始终是同一个空对象
 * { q1:"", q2:[], q2other:"", q3:[] }。页面上的原话只留在本机报告。
 * 不上传作答用时。score 不含 median_ms。quality 去掉 FAST_RESPONSE。
 * 作答偏快只写 viewModel.rushed 和 extensionData.quality.rushed。
 */
(function (root) {
  "use strict";
  var DIMS = ["R", "I", "A", "S", "E", "C"];
  var NAMES = { R: "实际", I: "研究", A: "艺术", S: "社会", E: "企业", C: "常规" };
  var LINES = {
    R: "喜欢动手，把想法变成看得见的东西。",
    I: "喜欢追问为什么，把事情弄明白。",
    A: "喜欢创造、表达和想象。",
    S: "喜欢跟人连接，陪人成长。",
    E: "喜欢推动事情发生，影响结果。",
    C: "喜欢把混乱整理成清楚、有序的样子。"
  };
  var DOM_TEXT = {
    DUAL: "前两个兴趣几乎一样高，可以看成双核心。",
    SOME: "第一兴趣比第二兴趣高出一截，主次还在。",
    PROMINENT: "第一兴趣明显高出第二兴趣。"
  };
  var DIF_TEXT = {
    LOW: "六个方向比较均衡，区分还不明显。",
    MID: "六个方向有一定区分。",
    HIGH: "六个方向分得比较开。"
  };
  var CON_TEXT = {
    HIGH: "前两个兴趣在六边形上相邻。",
    MEDIUM: "前两个兴趣在六边形上隔了一位。",
    CROSS: "前两个兴趣在六边形上相对，是跨界组合。"
  };
  var BREADTH_TEXT = {
    ONE: "和第一兴趣接近的方向比较集中。",
    FEW: "有少数几个兴趣中心。",
    MANY: "和第一兴趣接近的方向比较宽。"
  };
  var DOM_LABEL = { DUAL: "双核心", SOME: "有主次", PROMINENT: "第一兴趣突出" };
  var DIF_LABEL = { LOW: "比较均衡", MID: "有一定区分", HIGH: "区分清楚" };
  var CON_LABEL = { HIGH: "相邻", MEDIUM: "隔一位", CROSS: "跨界" };
  var BREADTH_LABEL = { ONE: "比较集中", FEW: "有几个中心", MANY: "比较宽" };
  var ASSESSMENT_ID = "holland";
  var ASSESSMENT_NAME = "霍兰德兴趣探索";
  var HOLLAND_VERSION = "holland-h5-v1";
  var SCORE_VERSION = "RIASEC_V2";
  var CONSENT_VERSION = "consent-assessment-holland-1";
  var SCHEMA_VERSION = "1.0.0";
  var SCREEN = "这是兴趣探索，不是职业诊断，也不说明哪种类型更好。";
  var READER_GAP = "阅读页若尚未重绘霍兰德兴趣探索，RIASEC 分数、holland_code、structure、bands 与 ranking 在 extensionData.score 与 viewModel。";
  var LOW_VAR_RATIO = 0.9;
  var UNSURE_RATIO = 0.4;
  var NEAR_TIE = 5;
  var BREADTH_GAP = 10;

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

  function r1(value) {
    return Math.round(value * 10) / 10;
  }

  function hexDist(a, b) {
    var d = Math.abs(DIMS.indexOf(a) - DIMS.indexOf(b));
    return Math.min(d, 6 - d);
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

  function emptyExplore() {
    return { q1: "", q2: [], q2other: "", q3: [] };
  }

  function cloneExplore(explore) {
    return {
      q1: explore.q1,
      q2: explore.q2.slice(),
      q2other: explore.q2other,
      q3: explore.q3.slice()
    };
  }

  function copyScores(scores) {
    var out = {};
    for (var i = 0; i < DIMS.length; i++) out[DIMS[i]] = scores[DIMS[i]];
    return out;
  }

  function copyStructure(st) {
    return {
      dominance: st.dominance,
      near_tie_top12: st.near_tie_top12,
      near_tie_top34: st.near_tie_top34,
      differentiation: st.differentiation,
      consistency: st.consistency,
      breadth: st.breadth
    };
  }

  function copyBands(bands) {
    return { dominance: bands.dominance, differentiation: bands.differentiation, breadth: bands.breadth };
  }

  function copyScore(scored) {
    return {
      version: scored.version,
      scores: copyScores(scored.scores),
      raw: copyScores(scored.raw),
      top_dimensions: scored.top_dimensions.slice(),
      holland_code: scored.holland_code,
      structure: copyStructure(scored.structure),
      bands: copyBands(scored.bands),
      ranking: scored.ranking.slice(),
      quality: scored.quality.slice()
    };
  }

  /* 与 holland-score.mjs 的 scoreHolland 相同。不读作答用时，所以没有 FAST_RESPONSE，也没有 median_ms。 */
  function scoreList(answers) {
    var raw = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    var fives = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    var scores = {};
    var i, dim, value;
    for (i = 0; i < answers.length; i++) {
      value = answers[i];
      dim = DIMS[i % 6];
      raw[dim] += value;
      if (value === 5) fives[dim] += 1;
    }
    for (i = 0; i < DIMS.length; i++) {
      dim = DIMS[i];
      scores[dim] = r1((raw[dim] - 10) / 40 * 100);
    }
    var ranking = DIMS.slice().sort(function (a, b) {
      return (scores[b] - scores[a]) || (fives[b] - fives[a]) || (DIMS.indexOf(a) - DIMS.indexOf(b));
    });
    var top = ranking.slice(0, 3);
    var ordered = ranking.map(function (id) { return scores[id]; });
    var dominance = r1(ordered[0] - ordered[1]);
    var mean = 0;
    for (i = 0; i < DIMS.length; i++) mean += scores[DIMS[i]];
    mean /= 6;
    var variance = 0;
    for (i = 0; i < DIMS.length; i++) variance += Math.pow(scores[DIMS[i]] - mean, 2);
    var sd = r1(Math.sqrt(variance / 6));
    var dist = hexDist(ranking[0], ranking[1]);
    var consistency = dist === 1 ? "HIGH" : dist === 2 ? "MEDIUM" : "CROSS";
    var breadth = DIMS.filter(function (id) { return ordered[0] - scores[id] <= BREADTH_GAP; }).length;
    var freq = {};
    for (i = 0; i < answers.length; i++) freq[answers[i]] = (freq[answers[i]] || 0) + 1;
    var maxFreq = 0;
    for (var key in freq) if (freq[key] > maxFreq) maxFreq = freq[key];
    var quality = [];
    if (maxFreq >= answers.length * LOW_VAR_RATIO) quality.push("LOW_VARIANCE");
    if ((freq[3] || 0) >= answers.length * UNSURE_RATIO) quality.push("MANY_UNSURE");
    return {
      version: SCORE_VERSION,
      scores: scores,
      raw: raw,
      top_dimensions: top,
      holland_code: top.join(""),
      structure: {
        dominance: dominance,
        near_tie_top12: Math.abs(ordered[0] - ordered[1]) <= NEAR_TIE,
        near_tie_top34: Math.abs(ordered[2] - ordered[3]) <= NEAR_TIE,
        differentiation: sd,
        consistency: consistency,
        breadth: breadth
      },
      bands: {
        dominance: dominance < 5 ? "DUAL" : dominance < 12 ? "SOME" : "PROMINENT",
        differentiation: sd < 10 ? "LOW" : sd <= 20 ? "MID" : "HIGH",
        breadth: breadth <= 1 ? "ONE" : breadth <= 3 ? "FEW" : "MANY"
      },
      ranking: ranking,
      quality: quality
    };
  }

  function sameList(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function sameCore(given, scored) {
    if (!given || given.version !== scored.version || given.holland_code !== scored.holland_code) return false;
    if (!given.scores || !given.structure || !given.bands) return false;
    var i, id;
    for (i = 0; i < DIMS.length; i++) {
      id = DIMS[i];
      if (given.scores[id] !== scored.scores[id]) return false;
    }
    if (!sameList(given.top_dimensions, scored.top_dimensions) || !sameList(given.ranking, scored.ranking)) return false;
    var a = given.structure, b = scored.structure;
    if (a.dominance !== b.dominance || !!a.near_tie_top12 !== b.near_tie_top12 || !!a.near_tie_top34 !== b.near_tie_top34) return false;
    if (a.differentiation !== b.differentiation || a.consistency !== b.consistency || a.breadth !== b.breadth) return false;
    if (given.bands.dominance !== scored.bands.dominance) return false;
    if (given.bands.differentiation !== scored.bands.differentiation || given.bands.breadth !== scored.bands.breadth) return false;
    return true;
  }

  function rushedFlag(input) {
    if (input && typeof input.rushed === "boolean") return input.rushed;
    var quality = input && input.result && input.result.quality;
    return !!(quality && quality.indexOf && quality.indexOf("FAST_RESPONSE") >= 0);
  }

  function dimensions(scored) {
    return DIMS.map(function (id) {
      return {
        id: id,
        name: NAMES[id],
        kind: "score",
        score: scored.scores[id],
        raw: scored.raw[id],
        max: 100,
        level: null,
        levelLabel: null,
        narrative: LINES[id],
        labels: []
      };
    });
  }

  function outcome(scored) {
    var names = scored.top_dimensions.map(function (id) { return NAMES[id] + " " + id; }).join(" × ");
    return {
      headline: "核心兴趣组合：" + scored.holland_code,
      code: scored.holland_code,
      label: names,
      summary: names + "。" + DOM_TEXT[scored.bands.dominance] + CON_TEXT[scored.structure.consistency] + SCREEN,
      flags: scored.quality.slice()
    };
  }

  function interpretation(scored) {
    var head = outcome(scored);
    var blocks = [
      { id: "verdict", title: head.headline, text: head.summary },
      { id: "screen", title: "不是诊断", text: SCREEN },
      { id: "dominance", title: "主次", text: DOM_LABEL[scored.bands.dominance] + "。" + DOM_TEXT[scored.bands.dominance] },
      { id: "differentiation", title: "区分度", text: DIF_LABEL[scored.bands.differentiation] + "。" + DIF_TEXT[scored.bands.differentiation] },
      { id: "consistency", title: "一致性", text: CON_LABEL[scored.structure.consistency] + "。" + CON_TEXT[scored.structure.consistency] },
      { id: "breadth", title: "广度", text: BREADTH_LABEL[scored.bands.breadth] + "。" + BREADTH_TEXT[scored.bands.breadth] }
    ];
    scored.ranking.forEach(function (id) {
      blocks.push({
        id: id,
        title: NAMES[id] + " " + id,
        text: scored.scores[id] + " 分。" + LINES[id]
      });
    });
    return blocks;
  }

  function recommendations() {
    return [
      { id: "screen", title: null, text: SCREEN },
      { id: "reader", title: null, text: READER_GAP }
    ];
  }

  function sections(scored) {
    var head = outcome(scored);
    var lines = scored.ranking.map(function (id) { return NAMES[id] + " " + id + " " + scored.scores[id]; }).join(" · ");
    return [
      { t: "h", l: 2, x: head.headline },
      { t: "p", x: head.summary },
      { t: "p", x: SCREEN },
      { t: "p", x: lines }
    ];
  }

  function buildHollandResult(input) {
    input = input || {};
    var nickname = hollandNickname(input.nickname);
    if (!nickname || phoneNickname(input.nickname) || phoneNickname(nickname)) return null;
    if (!input.reportId || !input.clientSubmissionId || !input.completedAt) return null;
    var packed = answersInBankOrder(input.answers);
    if (!packed) return null;
    var scored = scoreList(packed.list);
    if (input.result && !sameCore(input.result, scored)) return null;
    var rushed = rushedFlag(input);
    var explore = emptyExplore();
    var openText = cloneExplore(explore);
    var viewExplore = cloneExplore(explore);
    var score = copyScore(scored);
    var head = outcome(scored);
    var sectionList = sections(scored);
    return {
      reportId: input.reportId,
      assessmentId: ASSESSMENT_ID,
      assessmentName: ASSESSMENT_NAME,
      assessmentVersion: HOLLAND_VERSION,
      nickname: nickname,
      completedAt: input.completedAt,
      dimensions: dimensions(scored),
      result: head,
      interpretation: interpretation(scored),
      recommendations: recommendations(),
      reportContent: {
        format: "view-model+sections",
        viewModel: {
          answers: packed.list.slice(),
          version: score.version,
          scores: score.scores,
          raw: score.raw,
          top_dimensions: score.top_dimensions.slice(),
          holland_code: score.holland_code,
          structure: score.structure,
          bands: score.bands,
          ranking: score.ranking.slice(),
          quality: score.quality.slice(),
          explore: viewExplore,
          rushed: rushed
        },
        sections: sectionList,
        textFallback: sectionList.map(function (section) { return section.x; }).join("")
      },
      extensionData: {
        answers: packed.list.slice(),
        score: score,
        openText: openText,
        quality: { rushed: rushed },
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
        localKey: "holland-explore"
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
    READER_GAP: READER_GAP,
    hollandNickname: hollandNickname,
    phoneNickname: phoneNickname,
    answersInBankOrder: answersInBankOrder,
    emptyExplore: emptyExplore,
    buildHollandResult: buildHollandResult
  };
})(typeof window !== "undefined" ? window : globalThis);
