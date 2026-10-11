/* 霍兰德兴趣探索 · 报告模型（根据计算结果 + 三个探索问题，按规则拼出报告结构）
 * 同一份模型既用于页面渲染（render.js），也用于导出长图（export.js），保证两者内容一致。 */
(function (root) {
  "use strict";
  var C = root.HOLLAND_CONTENT, E = root.HollandEngine;
  function D(d) { return C.dims[d]; }
  function lab(d) { return D(d).name + " " + d; }
  function fill(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? map[k] : ""; }); }
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function pairKey(a, b) { var o = "RIASEC"; return o.indexOf(a) < o.indexOf(b) ? a + b : b + a; }

  function focusSet(q3) {
    var f = {};
    (q3 || []).forEach(function (o) { var k = C.focusMap[o]; if (k) f[k] = true; });
    return f;
  }

  /* rec: { nick, t, result, explore:{q1,q2:[],q2other,q3:[]} } ; ui: { careerOpen: bool|undefined } */
  function build(rec, ui) {
    ui = ui || {};
    var R = rec.result, ex = rec.explore || {}, top = R.top_dimensions, rank = R.ranking, sc = R.scores, st = R.structure, B = R.bands;
    var t1 = top[0], t2 = top[1], t3 = top[2], low = rank[5];
    var F = focusSet(ex.q3);
    var S = C.structure, sections = [];

    /* 1 我的兴趣组合 */
    sections.push({ id: "combo", title: C.sec.s1, blocks: [
      { t: "hero", letters: top, phrases: top.map(function (d) { return D(d).phrase; }),
        codeLine: "你的核心兴趣组合：" + R.holland_code,
        nameLine: top.map(lab).join(" × "), caveat: C.codeCaveat },
      { t: "radar", scores: sc, top: top }
    ] });

    /* 2 我容易被什么吸引 */
    sections.push({ id: "attract", title: C.sec.s2, focus: !!(F.direction || F.strength), blocks: [
      { t: "dimcards", items: top.map(function (d) { return { dim: d, title: D(d).attractTitle, text: D(d).attract }; }) },
      { t: "note", text: "这并不表示其他类型与你无关。" }
    ] });

    /* 3 我习惯怎样与世界互动 */
    var s3 = { id: "interact", title: C.sec.s3, focus: !!(F.self || F.strength), blocks: [
      { t: "lines", items: top.map(function (d) { return { dim: d, text: D(d).interact + "。" }; }) },
      { t: "note", text: "另外三种方式（" + rank.slice(3).map(function (d) { return D(d).interact.replace(/^我通过|与世界发生关系$/g, ""); }).join("、") + "）也在你身上，只是这次没那么突出。" }
    ] };
    if (F.strength) s3.blocks.push({ t: "module", title: "把兴趣用起来", focus: true, blocks: [
      { t: "p", text: "你最容易投入的，是需要“" + D(t1).phrase + "”和“" + D(t2).phrase + "”的事情。在这样的场合里，你往往更有劲、也更愿意多花心思。可以多找机会，把这两样放进你正在做的事里——兴趣带来的投入，常常会慢慢变成你做得好的地方。" }
    ] });
    sections.push(s3);

    /* 4 六个兴趣维度（全部） */
    sections.push({ id: "dims", title: C.sec.s4, focus: !!F.self, blocks: [
      { t: "note", text: C.sec.s4note },
      { t: "dimcards", score: true, items: rank.map(function (d, i) {
        var s = sc[d], lv = (s >= 60 || (i < 3 && s >= 50)) ? "high" : s >= 35 ? "mid" : "low";
        return { dim: d, title: lab(d), score: s, text: D(d)[lv] };
      }) },
      { t: "note", text: C.sec.s4tail }
    ] });

    /* 5 我的兴趣结构 */
    var domText = st.near_tie_top12
      ? fill(S.nearTie12, { a: "“" + lab(t1) + "”", b: "“" + lab(t2) + "”", pa: D(t1).phrase, pb: D(t2).phrase })
      : fill(S.dom[B.dominance], { a: "“" + D(t1).name + "”", b: "“" + D(t2).name + "”" });
    var conText = fill(S.con[st.consistency], { a: "“" + D(t1).name + "”", b: "“" + D(t2).name + "”" });
    if (st.consistency === "CROSS") conText += S.cross[pairKey(t1, t2)] + S.crossTail;
    var kv = [
      { k: "主次", v: S.domLabel[B.dominance], text: domText },
      { k: "区分度", v: S.difLabel[B.differentiation], text: S.dif[B.differentiation] },
      { k: "一致性", v: S.conLabel[st.consistency], text: conText },
      { k: S.breadthLabel, v: { ONE: "比较集中", FEW: "有几个中心", MANY: "比较宽" }[B.breadth], text: S.breadth[B.breadth] }
    ];
    var s5 = { id: "structure", title: C.sec.s5, focus: !!F.self, blocks: [
      { t: "hex", top: top, link: [t1, t2], consistency: st.consistency },
      { t: "kv", items: kv }
    ] };
    if (st.near_tie_top34) s5.blocks.push({ t: "callout", text: fill(S.nearTie34, { c: "“" + lab(t3) + "”", d: "“" + lab(rank[3]) + "”" }) });
    if (sc[t1] < 50) s5.blocks.push({ t: "callout", text: S.lowAll });
    if (F.self) {
      s5.blocks.push({ t: "module", title: S.motiveTitle, focus: true, blocks: [
        { t: "p", text: "推动你的，主要是这几种满足感：" + top.map(function (d) { return "“" + D(d).attractTitle + "”"; }).join("、") + "。当一件事同时碰到其中两种，你可能会格外投入。" }
      ] });
      var tension = st.consistency === "CROSS" ? fill(S.tensionCross, { a: "“" + D(t1).name + "”", b: "“" + D(t2).name + "”", pa: "“" + D(t1).phrase + "”", pb: "“" + D(t2).phrase + "”" })
        : st.near_tie_top12 ? fill(S.tensionNear, { a: "“" + D(t1).name + "”", b: "“" + D(t2).name + "”" })
        : fill(S.tensionGap, { a: "“" + D(t1).name + "”", z: "“" + D(low).name + "”" });
      s5.blocks.push({ t: "module", title: S.tensionTitle, focus: true, blocks: [{ t: "p", text: tension }] });
    }
    sections.push(s5);

    /* 6 环境 */
    var thrive = uniq(D(t1).thrive.slice(0, 2).concat(D(t2).thrive.slice(0, 2), D(t3).thrive.slice(0, 1)));
    var drain = uniq(D(t1).drain.slice(0, 2).concat(D(t2).drain.slice(0, 1), [D(low).lowDrain]));
    sections.push({ id: "env", title: C.sec.s6, focus: !!F.self, blocks: [
      { t: "env", a: { title: C.sec.s6a, items: thrive }, b: { title: C.sec.s6b, items: drain } },
      { t: "note", text: C.envNote }
    ] });

    /* 7 生活 */
    var L = C.life;
    var s7 = { id: "life", title: C.sec.s7, focus: !!(F.learn || F.collab), blocks: [
      { t: "cards", items: [
        { title: L.learn, focus: !!F.learn, lines: [D(t1).learn, D(t2).learn] },
        { title: L.flow, lines: top.map(function (d) { return D(d).flow; }) },
        { title: L.collab, focus: !!F.collab, lines: (F.collab ? top : [t1, t2]).map(function (d) { return D(d).collab; }) },
        { title: L.daily, lines: [D(t1).daily, D(t2).daily] }
      ] }
    ] };
    if (F.learn) {
      var A = C.learning.axes;
      var tp = sc.I - sc.R > 10 ? "T" : sc.R - sc.I > 10 ? "P" : "B";
      var solo = (sc.I + sc.R) / 2, inter = (sc.S + sc.E) / 2;
      var si = solo - inter > 10 ? "S" : inter - solo > 10 ? "I" : "B";
      var oc = sc.A - sc.C > 10 ? "O" : sc.C - sc.A > 10 ? "C" : "B";
      s7.blocks.push({ t: "module", title: C.learning.title, focus: true, blocks: [{ t: "kv", items: [
        { k: A.how, v: D(t1).name + "式", text: D(t1).learn },
        { k: A.tp.name, v: { T: "偏理论", P: "偏实践", B: "两边都行" }[tp], text: A.tp[tp] },
        { k: A.si.name, v: { S: "偏独学", I: "偏互动", B: "两边都行" }[si], text: A.si[si] },
        { k: A.oc.name, v: { O: "偏开放", C: "偏结构", B: "两边都行" }[oc], text: A.oc[oc] }
      ] }] });
    }
    sections.push(s7);

    /* 8 体验 */
    var X = C.experience, s8b = [{ t: "p", text: X.intro }];
    if (ex.q1 && ex.q1.trim()) s8b.push({ t: "quote", label: X.q1Echo, text: ex.q1.trim(), tail: X.q1Tail });
    var q2 = (ex.q2 || []).filter(function (o) { return X.q2[o]; });
    if (q2.length) s8b.push({ t: "list", items: q2.map(function (o) { return fill(X.q2[o], { learn: D(t1).learn }); }) });
    if (ex.q2other && ex.q2other.trim()) s8b.push({ t: "p", text: X.q2OtherPrefix + "“" + ex.q2other.trim() + "”。可以想想，它和你的前两个兴趣方向有没有连接点。" });
    s8b.push({ t: "h", text: X.smallTitle });
    s8b.push({ t: "dimlist", items: top.map(function (d) { return { dim: d, text: D(d).exp }; }) });
    var hd = F.hobby ? top : [t1, t2];
    s8b.push({ t: "module", title: X.hobbyTitle, focus: !!F.hobby, blocks: [{ t: "kv", items: [
      { k: X.hobbyAct, text: uniq([].concat.apply([], hd.map(function (d) { return D(d).hobby.act; }))).join("；") + "。" },
      { k: X.hobbyMake, text: uniq([].concat.apply([], hd.map(function (d) { return D(d).hobby.make; }))).join("；") + "。" },
      { k: X.hobbyTry, text: uniq([].concat.apply([], hd.map(function (d) { return D(d).hobby.try; }))).join("；") + "。" }
    ] }] });
    sections.push({ id: "experience", title: C.sec.s8, focus: !!(F.direction || F.hobby), blocks: s8b });

    /* 9 工作世界（最后；不关心职业就折叠） */
    var K = C.career, p12 = K.pairs[pairKey(t1, t2)], p13 = K.pairs[pairKey(t1, t3)];
    var careerOpen = ui.careerOpen != null ? ui.careerOpen : !!F.career;
    var s9 = { id: "career", title: K.title, focus: !!F.career, collapsible: true, collapsed: !careerOpen,
      blocks: [{ t: "p", text: K.intro }], more: [] };
    if (!careerOpen && !F.career) s9.blocks.push({ t: "note", text: K.collapsedNote });
    s9.more = [
      { t: "levels", items: [
        { k: K.l1, v: top.map(function (d) { return D(d).phrase; }).join(" × ") },
        { k: K.l2, chips: uniq(D(t1).career.acts.concat(D(t2).career.acts, D(t3).career.acts.slice(0, 1))) },
        { k: K.l3, chips: uniq(p12.worlds.concat(p13.worlds.slice(0, 2), D(t1).career.worlds.slice(0, 2))).slice(0, 8) },
        { k: K.l4, v: D(t1).career.env + "；" + D(t2).career.env + "。" },
        { k: K.l5, chips: uniq(p12.ex.concat(p13.ex.slice(0, 3))).slice(0, 8) }
      ] },
      { t: "note", text: K.exampleNote }
    ];
    if ((ex.q3 || []).indexOf("专业选择") >= 0) s9.more.push({ t: "callout", text: K.major });
    if ((ex.q3 || []).indexOf("转型方向") >= 0) s9.more.push({ t: "callout", text: K.shift });
    sections.push(s9);

    sections.forEach(function (s, i) { s.no = i + 1; });

    var focusList = (ex.q3 || []).filter(function (o) { return C.focusMap[o]; });
    return {
      nick: rec.nick, t: rec.t, code: R.holland_code,
      banner: focusList.length ? fill(C.focusBanner, { list: focusList.map(function (o) { return "“" + o + "”"; }).join("、") }) : C.focusNone,
      quality: (R.quality || []).map(function (q) { return C.quality[q]; }),
      sections: sections,
      footer: C.footer
    };
  }

  root.HollandReport = { build: build, focusSet: focusSet };
})(window);
