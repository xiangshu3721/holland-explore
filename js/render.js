/* 霍兰德兴趣探索 · 页面渲染：图标、六边形、雷达图、报告 DOM */
(function (root) {
  "use strict";
  var C = root.HOLLAND_CONTENT, DIMS = ["R", "I", "A", "S", "E", "C"];
  var NAVY = "#1f2d5c", RED = "#b8262b";
  /* 六维辅助色（取自参考图的六色柔和格）：bg 底色 / ink 文字色 */
  var COLORS = {
    R: { bg: "#ece6f6", ink: "#6b5aa6" }, I: { bg: "#e2eff8", ink: "#2f6f9a" }, A: { bg: "#fbe8d8", ink: "#bd6528" },
    S: { bg: "#f8e1e4", ink: "#b34d61" }, E: { bg: "#e2f0e3", ink: "#3d8653" }, C: { bg: "#eef2d6", ink: "#77872a" }
  };
  /* 自绘线性图标（24×24，描边）：工具箱 / 显微镜 / 调色盘 / 人群 / 公文包 / 清单 */
  var ICONS = {
    R: "M3 11.5h18v8H3z M3 11.5l2.2-3.5h13.6l2.2 3.5 M9 8V5.5h6V8 M7.5 14.5v2 M16.5 14.5v2 M3 15.5h18",
    I: "M9.5 3.5l4 2-3.2 6.2-4-2z M12 8.6l2.2 1.1 M8.3 11.6L6.8 14.6 M5 20.5h14 M7.5 17.5h6 M14.6 11.4a5 5 0 0 1 .4 9.1",
    A: "M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.7-.7 1.7-1.6 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6h1.9a4.8 4.8 0 0 0 4.8-4.8c0-3.8-4-6.8-9-6.8z M7.6 11.6h.01 M9.6 7.8h.01 M14.2 7.6h.01 M17 10.6h.01",
    S: "M14.5 7.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z M7.5 19.5v-1.5a4.5 4.5 0 0 1 9 0v1.5 M20 9.8a2 2 0 1 1-4 0 2 2 0 1 1 4 0z M21 18.5v-1a3.2 3.2 0 0 0-3-3.2 M8 9.8a2 2 0 1 1-4 0 2 2 0 1 1 4 0z M3 18.5v-1a3.2 3.2 0 0 1 3-3.2",
    E: "M3 8.5h18V19H3z M9 8.5V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5 M3 13h18 M11 12v2.2h2V12",
    C: "M6 4.5h12V21H6z M9.5 3h5v3h-5z M8.8 10.2l1.3 1.3 2.3-2.4 M14 10.6h2 M8.8 15.2l1.3 1.3 2.3-2.4 M14 15.6h2"
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function icon(d, color, size) {
    return '<svg class="ic" viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) + '" fill="none" stroke="' + (color || "currentColor") +
      '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[d] + '"/></svg>';
  }
  function pt(i, r, cx, cy) { var a = (-90 + i * 60) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function hexDist(i, j) { var d = Math.abs(i - j); return Math.min(d, 6 - d); }
  function f1(x) { return Math.round(x * 10) / 10; }

  /* 首页装饰六边形：中性，无字母、无类型说明 */
  function decoHex() {
    var cx = 110, cy = 104, r = 78, s = "";
    for (var i = 0; i < 6; i++) for (var j = i + 1; j < 6; j++) {
      var a = pt(i, r, cx, cy), b = pt(j, r, cx, cy), d = hexDist(i, j);
      s += '<line x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '" stroke="' + (d === 3 ? RED : NAVY) +
        '" stroke-opacity="' + (d === 1 ? 0.7 : 0.35) + '" stroke-width="' + (d === 1 ? 1.6 : 1) + '"' + (d === 2 ? ' stroke-dasharray="6 3 1.5 3"' : d === 3 ? ' stroke-dasharray="4 4"' : "") + "/>";
    }
    DIMS.forEach(function (k, i) { var p = pt(i, r, cx, cy); s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="11" fill="' + COLORS[k].bg + '" stroke="' + (i % 2 ? RED : NAVY) + '" stroke-width="1.6"/>'; });
    return '<svg class="deco-hex" viewBox="0 0 220 208" aria-hidden="true">' + s + "</svg>";
  }

  /* 结果页：RIASEC 关系六边形（实线相邻、点划线中性、红虚线相对） */
  function relHex(top, link) {
    var cx = 160, cy = 150, r = 98, s = "";
    for (var i = 0; i < 6; i++) for (var j = i + 1; j < 6; j++) {
      var a = pt(i, r, cx, cy), b = pt(j, r, cx, cy), d = hexDist(i, j);
      var isLink = link && ((DIMS[i] === link[0] && DIMS[j] === link[1]) || (DIMS[j] === link[0] && DIMS[i] === link[1]));
      s += '<line x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '" stroke="' + (d === 3 ? RED : NAVY) +
        '" stroke-width="' + (isLink ? 3.2 : d === 1 ? 1.8 : 1.1) + '" stroke-opacity="' + (isLink ? 1 : d === 1 ? 0.85 : 0.55) + '"' +
        (d === 2 ? ' stroke-dasharray="7 4 1.5 4"' : d === 3 ? ' stroke-dasharray="5 4"' : "") + "/>";
    }
    DIMS.forEach(function (k, i) {
      var p = pt(i, r, cx, cy), on = top.indexOf(k) >= 0, lp = pt(i, r + 34, cx, cy);
      s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="17" fill="' + (on ? COLORS[k].ink : "#fff") + '" stroke="' + (on ? COLORS[k].ink : NAVY) + '" stroke-width="1.6"/>';
      s += '<text x="' + f1(p[0]) + '" y="' + f1(p[1] + 5.5) + '" text-anchor="middle" font-size="16" font-weight="800" fill="' + (on ? "#fff" : NAVY) + '">' + k + "</text>";
      s += '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] + 4) + '" text-anchor="middle" font-size="12.5" font-weight="' + (on ? 700 : 500) + '" fill="' + (on ? COLORS[k].ink : "#5d6275") + '">' + C.dims[k].name + "</text>";
    });
    return '<svg class="rel-hex" viewBox="0 0 320 300" role="img" aria-label="兴趣六边形">' + s + "</svg>" +
      '<div class="legend"><span><i class="lg solid"></i>相邻</span><span><i class="lg dashdot"></i>隔一位</span><span><i class="lg dash"></i>相对</span></div>';
  }

  /* 六维雷达图：顶点顺序同六边形 */
  function radar(scores, top) {
    var cx = 170, cy = 160, r = 106, s = "";
    [25, 50, 75, 100].forEach(function (g) {
      s += '<polygon points="' + DIMS.map(function (_, i) { return pt(i, r * g / 100, cx, cy).map(f1).join(","); }).join(" ") + '" fill="' + (g === 100 ? "#fff" : "none") + '" stroke="#d9cfbd" stroke-width="1"/>';
    });
    DIMS.forEach(function (_, i) { var p = pt(i, r, cx, cy); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(p[0]) + '" y2="' + f1(p[1]) + '" stroke="#e4dccd"/>'; });
    var poly = DIMS.map(function (k, i) { return pt(i, r * Math.max(scores[k], 2) / 100, cx, cy); });
    s += '<polygon points="' + poly.map(function (p) { return p.map(f1).join(","); }).join(" ") + '" fill="rgba(31,45,92,.14)" stroke="' + NAVY + '" stroke-width="2" stroke-linejoin="round"/>';
    DIMS.forEach(function (k, i) {
      var p = poly[i], on = top.indexOf(k) >= 0, lp = pt(i, r + 30, cx, cy);
      s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (on ? 4.5 : 3.2) + '" fill="' + (on ? RED : NAVY) + '"/>';
      s += '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] - 3) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + (on ? COLORS[k].ink : NAVY) + '">' + C.dims[k].name + " " + k + "</text>";
      s += '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] + 13) + '" text-anchor="middle" font-size="12" fill="#6b6f80">' + Math.round(scores[k]) + "</text>";
    });
    return '<svg class="radar" viewBox="0 0 340 320" role="img" aria-label="六维雷达图">' + s + "</svg>";
  }

  function focusTag(on) { return on ? '<span class="ftag">' + esc(C.focusTag) + "</span>" : ""; }

  function block(b) {
    switch (b.t) {
      case "p": return '<p class="bp">' + esc(b.text) + "</p>";
      case "note": return '<p class="bnote">' + esc(b.text) + "</p>";
      case "h": return '<h4 class="bh">' + esc(b.text) + "</h4>";
      case "callout": return '<div class="callout">' + esc(b.text) + "</div>";
      case "hero":
        return '<div class="hero">' +
          '<div class="code">' + b.letters.map(function (d, i) { return (i ? '<i class="dot">·</i>' : "") + '<b style="color:' + COLORS[d].ink + '">' + d + "</b>"; }).join("") + "</div>" +
          '<div class="phr">' + b.phrases.map(esc).join(' <i>×</i> ') + "</div>" +
          '<div class="codeline">' + esc(b.codeLine) + "</div>" +
          '<div class="nameline">' + esc(b.nameLine) + "</div>" +
          '<p class="caveat">' + esc(b.caveat) + "</p></div>";
      case "radar": return '<div class="chart">' + radar(b.scores, b.top) + "</div>";
      case "hex": return '<div class="chart hexwrap">' + relHex(b.top, b.link) + "</div>";
      case "dimcards":
        return '<div class="dimcards">' + b.items.map(function (it) {
          var c = COLORS[it.dim];
          return '<div class="dimcard" style="--bg:' + c.bg + ";--ink:" + c.ink + '">' +
            '<div class="dc-head"><span class="dc-ic">' + icon(it.dim, c.ink, 22) + '</span><span class="dc-title">' + esc(it.title) + "</span>" +
            (b.score ? '<span class="dc-score">' + Math.round(it.score) + "</span>" : '<span class="dc-letter">' + C.dims[it.dim].name + " " + it.dim + "</span>") + "</div>" +
            (b.score ? '<div class="bar"><i style="width:' + Math.max(2, it.score) + '%"></i></div>' : "") +
            '<p class="dc-text">' + esc(it.text) + "</p></div>";
        }).join("") + "</div>";
      case "lines":
        return '<ul class="lines">' + b.items.map(function (it) {
          return '<li style="--ink:' + COLORS[it.dim].ink + ";--bg:" + COLORS[it.dim].bg + '"><span class="ln-ic">' + icon(it.dim, COLORS[it.dim].ink, 20) + "</span><span>" + esc(it.text) + "</span></li>";
        }).join("") + "</ul>";
      case "dimlist":
        return '<ul class="dimlist">' + b.items.map(function (it) {
          return '<li><span class="dl-dot" style="background:' + COLORS[it.dim].ink + '"></span><span>' + esc(it.text) + "</span></li>";
        }).join("") + "</ul>";
      case "list": return '<ul class="blist">' + b.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      case "quote": return '<div class="quote"><span class="q-label">' + esc(b.label) + "</span><blockquote>“" + esc(b.text) + "”</blockquote><p>" + esc(b.tail) + "</p></div>";
      case "kv":
        return '<dl class="kv">' + b.items.map(function (it) {
          return '<div class="kv-row"><dt>' + esc(it.k) + (it.v ? '<em>' + esc(it.v) + "</em>" : "") + "</dt><dd>" + esc(it.text) + "</dd></div>";
        }).join("") + "</dl>";
      case "env":
        return '<div class="env"><div class="env-col good"><h5>' + esc(b.a.title) + "</h5><ul>" + b.a.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          '</ul></div><div class="env-col drain"><h5>' + esc(b.b.title) + "</h5><ul>" + b.b.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div>";
      case "cards":
        return '<div class="lcards">' + b.items.map(function (it) {
          return '<div class="lcard' + (it.focus ? " is-focus" : "") + '"' + (it.focus ? ' data-focus="1"' : "") + '><h5>' + esc(it.title) + focusTag(it.focus) + "</h5>" +
            it.lines.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div>";
        }).join("") + "</div>";
      case "levels":
        return '<ol class="levels">' + b.items.map(function (it, i) {
          return '<li><div class="lv-k"><span class="lv-n">' + (i + 1) + "</span>" + esc(it.k) + '</div><div class="lv-v">' +
            (it.chips ? it.chips.map(function (c) { return '<span class="chip">' + esc(c) + "</span>"; }).join("") : esc(it.v)) + "</div></li>";
        }).join("") + "</ol>";
      case "module":
        return '<div class="module' + (b.focus ? " is-focus" : "") + '"' + (b.focus ? ' data-focus="1"' : "") + '><h4 class="mod-t">' + esc(b.title) + focusTag(b.focus) + "</h4>" + b.blocks.map(block).join("") + "</div>";
    }
    return "";
  }

  function section(s) {
    var body = s.blocks.map(block).join("");
    if (s.collapsible) {
      body += '<div class="more"' + (s.collapsed ? " hidden" : "") + ">" + s.more.map(block).join("") + "</div>" +
        '<button type="button" class="btn-ghost toggle-career" aria-expanded="' + (!s.collapsed) + '">' + (s.collapsed ? C.career.expand : C.career.collapse) + "</button>";
    }
    return '<section class="rsec' + (s.focus ? " is-focus" : "") + (s.collapsed ? " is-collapsed" : "") + '" id="sec-' + s.id + '"' + (s.focus ? ' data-focus="1"' : "") + ">" +
      '<h3 class="rsec-t"><span class="no">' + (s.no < 10 ? "0" + s.no : s.no) + "</span>" + esc(s.title) + focusTag(s.focus) + "</h3>" + body + "</section>";
  }

  function fmtDate(t) { var d = new Date(t); function p(n) { return n < 10 ? "0" + n : n; } return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }

  function report(m) {
    return '<header class="r-head"><div class="stars"><i>✦</i><i>✦</i></div>' +
      '<p class="r-kicker">' + esc(C.title) + "</p>" +
      '<h2 class="r-title"><span class="r-nick">' + esc(m.nick) + '</span><span class="red">的兴趣地图</span></h2>' +
      '<p class="r-date">' + fmtDate(m.t) + "</p>" +
      '<div class="pill">✦ ' + esc(C.homeTag) + " ✦</div>" +
      '<p class="banner">' + esc(m.banner) + "</p>" +
      (m.quality.length ? '<div class="quality">' + m.quality.map(function (q) { return "<p>" + esc(q) + "</p>"; }).join("") + "</div>" : "") +
      "</header>" + m.sections.map(section).join("") +
      '<footer class="r-foot"><p>' + esc(m.footer) + "</p></footer>";
  }

  root.HollandRender = { COLORS: COLORS, ICONS: ICONS, icon: icon, decoHex: decoHex, relHex: relHex, radar: radar, report: report, esc: esc, fmtDate: fmtDate, pt: pt, hexDist: hexDist };
})(window);
