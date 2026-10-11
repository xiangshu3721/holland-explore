/* 霍兰德兴趣探索 · 计分引擎（纯前端，规则生成，不调用任何 AI 接口） */
(function (root) {
  "use strict";
  // 六边形顺序：R—I—A—S—E—C—R（R 顶、I 右上、A 右下、S 底、E 左下、C 左上）
  var DIMS = ["R", "I", "A", "S", "E", "C"];
  var LETTER_NAME = { R: "实际", I: "研究", A: "艺术", S: "社会", E: "企业", C: "常规" };

  /* ---- 自定规则（产品解释规则，非官方常模） ----
   * FAST_RESPONSE：单题作答用时（从题目出现到点选）的「中位数」< 1.2 秒，且至少有 30 道题有计时记录。
   *   用中位数而不是平均数，是为了避免中途停下来很久把整体平均拉高、掩盖了大量“秒选”。
   * LOW_VARIANCE：60 题中同一个选项占比 ≥ 90%（≥ 54 题）。
   * MANY_UNSURE：“说不上来”（3 分）占比 ≥ 40%（≥ 24 题）。
   * near_tie：两维分数差 ≤ 5（分数为 0–100 的本测评内部喜爱程度）。
   * dominance = Top1 − Top2：0–4 双核心明显（DUAL）；5–11 有一定主次（SOME）；≥ 12 第一兴趣相对突出（PROMINENT）。
   *   分数步长为 2.5，因此实际取值 0/2.5 → DUAL，5/7.5/10 → SOME，≥ 12.5 → PROMINENT。
   * differentiation = 六维分数的总体标准差（SD）：< 10 比较均衡（LOW）；10–20 有一定区分（MID）；> 20 区分清楚（HIGH）。
   * consistency：Top1 与 Top2 在六边形上的距离：相邻 = HIGH；隔一位 = MEDIUM；对角（R-S / I-E / A-C）= CROSS（跨界型组合）。
   * breadth：与 Top1 分数差 ≤ 10 的维度个数（含 Top1 自己，取值 1–6）。1 = 集中；2–3 = 少数几个中心；≥ 4 = 宽。
   * 排序并列时：先比“很喜欢”（5 分）题数，多者在前；仍并列按六边形顺序 R I A S E C。 */
  var FAST_MEDIAN_MS = 1200, FAST_MIN_TIMED = 30;
  var LOW_VAR_RATIO = 0.9, UNSURE_RATIO = 0.4, NEAR_TIE = 5, BREADTH_GAP = 10;

  function hexDist(a, b) { var d = Math.abs(DIMS.indexOf(a) - DIMS.indexOf(b)); return Math.min(d, 6 - d); }
  function median(arr) { var s = arr.slice().sort(function (x, y) { return x - y; }); var n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; }
  function r1(x) { return Math.round(x * 10) / 10; }

  function compute(answers, times) {
    var Q = root.HOLLAND_QUESTIONS, raw = {}, fives = {}, scores = {};
    DIMS.forEach(function (d) { raw[d] = 0; fives[d] = 0; });
    var vals = [];
    Q.forEach(function (q) {
      var v = Number(answers[q.id]);
      if (!(v >= 1 && v <= 5)) throw new Error("missing answer " + q.id);
      raw[q.dimension] += v; if (v === 5) fives[q.dimension]++; vals.push(v);
    });
    DIMS.forEach(function (d) { scores[d] = r1((raw[d] - 10) / 40 * 100); });
    var order = DIMS.slice().sort(function (a, b) {
      return (scores[b] - scores[a]) || (fives[b] - fives[a]) || (DIMS.indexOf(a) - DIMS.indexOf(b));
    });
    var top = order.slice(0, 3), s = order.map(function (d) { return scores[d]; });
    var dominance = r1(s[0] - s[1]);
    var mean = DIMS.reduce(function (t, d) { return t + scores[d]; }, 0) / 6;
    var sd = r1(Math.sqrt(DIMS.reduce(function (t, d) { return t + Math.pow(scores[d] - mean, 2); }, 0) / 6));
    var dist = hexDist(order[0], order[1]);
    var consistency = dist === 1 ? "HIGH" : dist === 2 ? "MEDIUM" : "CROSS";
    var breadth = DIMS.filter(function (d) { return s[0] - scores[d] <= BREADTH_GAP; }).length;

    // 质量判断（后台，仅用于温和提示）
    var quality = [];
    var t = [];
    if (times) Object.keys(times).forEach(function (k) { var x = Number(times[k]); if (x > 0) t.push(x); });
    if (t.length >= FAST_MIN_TIMED && median(t) < FAST_MEDIAN_MS) quality.push("FAST_RESPONSE");
    var freq = {}; vals.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; });
    var maxF = Math.max.apply(null, Object.keys(freq).map(function (k) { return freq[k]; }));
    if (maxF >= vals.length * LOW_VAR_RATIO) quality.push("LOW_VARIANCE");
    if ((freq[3] || 0) >= vals.length * UNSURE_RATIO) quality.push("MANY_UNSURE");

    return {
      version: "RIASEC_V2",
      scores: scores,
      top_dimensions: top,
      holland_code: top.join(""),
      structure: {
        dominance: dominance,
        near_tie_top12: Math.abs(s[0] - s[1]) <= NEAR_TIE,
        near_tie_top34: Math.abs(s[2] - s[3]) <= NEAR_TIE,
        differentiation: sd,
        consistency: consistency,
        breadth: breadth
      },
      // 以下为便于展示的派生标签
      bands: {
        dominance: dominance < 5 ? "DUAL" : dominance < 12 ? "SOME" : "PROMINENT",
        differentiation: sd < 10 ? "LOW" : sd <= 20 ? "MID" : "HIGH",
        breadth: breadth <= 1 ? "ONE" : breadth <= 3 ? "FEW" : "MANY"
      },
      ranking: order,
      quality: quality,
      median_ms: t.length ? Math.round(median(t)) : null
    };
  }

  root.HollandEngine = { DIMS: DIMS, LETTER_NAME: LETTER_NAME, compute: compute, hexDist: hexDist,
    FAST_MEDIAN_MS: FAST_MEDIAN_MS };
})(window);
