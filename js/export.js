/* 霍兰德兴趣探索 · 导出长图
 * 直接用 Canvas 按“报告模型”逐块绘制（与页面同一份数据），不依赖第三方库、不截 DOM，
 * 因此包含昵称和结果页全部内容；工作世界部分按当前展开/收起状态绘制。 */
(function (root) {
  "use strict";
  var R = root.HollandRender, COLORS = R.COLORS, DIMS = ["R", "I", "A", "S", "E", "C"], C = root.HOLLAND_CONTENT;
  var NAVY = "#1f2d5c", RED = "#b8262b", INK = "#2a2f45", MUTED = "#6b6f80", LINE = "#e6dccb", BG = "#faf6ef", CARD = "#fffdf9";
  var FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif';
  var W = 750, PAD = 24, IN = 26;
  var ctx, DRAW;

  function font(sz, wt) { ctx.font = (wt || 400) + " " + sz + "px " + FONT; }
  var NOSTART = "，。、；：！？）》」』”’…%,.;:!?)";
  function wrap(text, maxW) {
    var out = [], line = "";
    String(text).split("").forEach(function (ch) {
      if (ch === "\n") { out.push(line); line = ""; return; }
      var t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (NOSTART.indexOf(ch) >= 0) { var last = line.slice(-1); out.push(line.slice(0, -1)); line = last + ch; }
        else { out.push(line); line = ch; }
      } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  function text(str, x, y, w, sz, wt, color, lh, align) {
    font(sz, wt); var lines = wrap(str, w), L = Math.round(sz * (lh || 1.7));
    if (DRAW) {
      ctx.fillStyle = color || INK; ctx.textBaseline = "middle"; ctx.textAlign = align || "left";
      lines.forEach(function (l, i) { ctx.fillText(l, align === "center" ? x + w / 2 : x, y + L * i + L / 2); });
      ctx.textAlign = "left";
    }
    return lines.length * L;
  }
  function rr(x, y, w, h, r, fill, stroke, lw, dash) {
    if (!DRAW) return;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.setLineDash(dash || []); ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); ctx.setLineDash([]); }
  }
  function icon(d, x, y, size, color) {
    if (!DRAW || !root.Path2D) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D(R.ICONS[d])); ctx.restore();
  }
  function tag(str, x, y) { // 红色小标签，返回宽度
    font(19, 700); var w = ctx.measureText(str).width + 22;
    if (DRAW) { rr(x, y, w, 32, 16, RED); ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(str, x + 11, y + 16); }
    return w;
  }
  function chips(items, x, y, w) {
    font(22, 500); var cx = x, cy = y, H = 42, gap = 10;
    items.forEach(function (c) {
      var cw = Math.min(ctx.measureText(c).width + 28, w);
      if (cx + cw > x + w) { cx = x; cy += H + gap; }
      if (DRAW) { rr(cx, cy, cw, H, 21, "#fff", LINE, 1.5); ctx.fillStyle = NAVY; ctx.textBaseline = "middle"; font(22, 500); ctx.fillText(c, cx + 14, cy + H / 2); }
      cx += cw + gap;
    });
    return cy + H - y;
  }

  function lineDash(i, j) { var d = R.hexDist(i, j); return d === 2 ? [10, 6, 2, 6] : d === 3 ? [8, 6] : []; }
  function radar(b, x, y, w) {
    var h = 470; if (!DRAW) return h;
    var cx = x + w / 2, cy = y + h / 2 + 4, r = 160, sc = b.scores;
    function P(i, rad) { return R.pt(i, rad, cx, cy); }
    [25, 50, 75, 100].forEach(function (g) {
      ctx.beginPath(); DIMS.forEach(function (_, i) { var p = P(i, r * g / 100); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
      if (g === 100) { ctx.fillStyle = "#fff"; ctx.fill(); } ctx.strokeStyle = "#d9cfbd"; ctx.lineWidth = 1.5; ctx.stroke();
    });
    DIMS.forEach(function (_, i) { var p = P(i, r); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.strokeStyle = "#e4dccd"; ctx.stroke(); });
    var poly = DIMS.map(function (k, i) { return P(i, r * Math.max(sc[k], 2) / 100); });
    ctx.beginPath(); poly.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    ctx.fillStyle = "rgba(31,45,92,.14)"; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke();
    DIMS.forEach(function (k, i) {
      var on = b.top.indexOf(k) >= 0, p = poly[i], lp = P(i, r + 46);
      ctx.beginPath(); ctx.arc(p[0], p[1], on ? 7 : 5, 0, 7); ctx.fillStyle = on ? RED : NAVY; ctx.fill();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      font(22, 700); ctx.fillStyle = on ? COLORS[k].ink : NAVY; ctx.fillText(C.dims[k].name + " " + k, lp[0], lp[1] - 12);
      font(20, 400); ctx.fillStyle = MUTED; ctx.fillText(String(Math.round(sc[k])), lp[0], lp[1] + 14);
      ctx.textAlign = "left";
    });
    return h;
  }
  function hex(b, x, y, w) {
    var h = 470; if (!DRAW) return h;
    var cx = x + w / 2, cy = y + 215, r = 150;
    for (var i = 0; i < 6; i++) for (var j = i + 1; j < 6; j++) {
      var a = R.pt(i, r, cx, cy), c = R.pt(j, r, cx, cy), d = R.hexDist(i, j);
      var isLink = (DIMS[i] === b.link[0] && DIMS[j] === b.link[1]) || (DIMS[j] === b.link[0] && DIMS[i] === b.link[1]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.setLineDash(lineDash(i, j));
      ctx.strokeStyle = d === 3 ? RED : NAVY; ctx.globalAlpha = isLink ? 1 : d === 1 ? 0.85 : 0.55; ctx.lineWidth = isLink ? 5 : d === 1 ? 2.6 : 1.6; ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    DIMS.forEach(function (k, i) {
      var p = R.pt(i, r, cx, cy), on = b.top.indexOf(k) >= 0, lp = R.pt(i, r + 52, cx, cy);
      ctx.beginPath(); ctx.arc(p[0], p[1], 26, 0, 7); ctx.fillStyle = on ? COLORS[k].ink : "#fff"; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = on ? COLORS[k].ink : NAVY; ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      font(24, 800); ctx.fillStyle = on ? "#fff" : NAVY; ctx.fillText(k, p[0], p[1] + 1);
      font(20, on ? 700 : 500); ctx.fillStyle = on ? COLORS[k].ink : "#5d6275"; ctx.fillText(C.dims[k].name, lp[0], lp[1]);
      ctx.textAlign = "left";
    });
    // 图例
    var ly = y + h - 18, items = [["相邻", [], NAVY], ["隔一位", [10, 6, 2, 6], NAVY], ["相对", [8, 6], RED]], lx = cx - 210;
    items.forEach(function (it) {
      ctx.beginPath(); ctx.setLineDash(it[1]); ctx.moveTo(lx, ly); ctx.lineTo(lx + 46, ly); ctx.strokeStyle = it[2]; ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
      font(20, 400); ctx.fillStyle = MUTED; ctx.textBaseline = "middle"; ctx.fillText(it[0], lx + 56, ly); lx += 150;
    });
    return h;
  }

  function block(b, x, y, w) {
    var h = 0, pad, yy;
    switch (b.t) {
      case "p": return text(b.text, x, y, w, 25, 400, INK) + 10;
      case "note": return text(b.text, x, y, w, 21, 400, MUTED, 1.65) + 8;
      case "h": return text(b.text, x, y + 6, w, 25, 700, NAVY) + 14;
      case "callout":
        h = (function () { var s = DRAW; DRAW = false; var r = text(b.text, 0, 0, w - 44, 23, 400, INK, 1.65); DRAW = s; return r; })();
        if (DRAW) { rr(x, y, w, h + 36, 14, "#f8e9e6"); text(b.text, x + 22, y + 18, w - 44, 23, 400, "#7a2a22", 1.65); }
        return h + 36 + 14;
      case "hero":
        yy = y + 8;
        if (DRAW) {
          font(104, 900); var parts = [], tw = 0;
          b.letters.forEach(function (d, i) { if (i) parts.push(["·", RED]); parts.push([d, COLORS[d].ink]); });
          parts.forEach(function (p) { tw += ctx.measureText(p[0]).width + 14; });
          var lx = x + (w - tw) / 2; ctx.textBaseline = "middle";
          parts.forEach(function (p) { ctx.fillStyle = p[1]; ctx.fillText(p[0], lx, yy + 62); lx += ctx.measureText(p[0]).width + 14; });
        }
        yy += 130;
        yy += text(b.phrases.join("  ×  "), x, yy, w, 25, 600, NAVY, 1.6, "center") + 10;
        yy += text(b.codeLine, x, yy, w, 30, 800, NAVY, 1.6, "center");
        yy += text(b.nameLine, x, yy, w, 23, 500, RED, 1.6, "center") + 6;
        yy += text(b.caveat, x + 20, yy, w - 40, 21, 400, MUTED, 1.6, "center") + 6;
        return yy - y;
      case "radar": return radar(b, x, y, w) + 6;
      case "hex": return hex(b, x, y, w) + 16;
      case "dimcards":
        yy = y;
        b.items.forEach(function (it) {
          var c = COLORS[it.dim], ip = 22, top = 70 + (b.score ? 22 : 0);
          var th = (function () { var s = DRAW; DRAW = false; var r = text(it.text, 0, 0, w - ip * 2, 23, 400, INK, 1.7); DRAW = s; return r; })();
          var ch = top + th + 18;
          rr(x, yy, w, ch, 16, c.bg);
          if (DRAW) {
            icon(it.dim, x + ip, yy + 18, 34, c.ink);
            font(26, 800); ctx.fillStyle = c.ink; ctx.textBaseline = "middle"; ctx.fillText(it.title, x + ip + 48, yy + 36);
            var right = b.score ? String(Math.round(it.score)) : C.dims[it.dim].name + " " + it.dim;
            font(b.score ? 30 : 21, b.score ? 800 : 600); ctx.textAlign = "right"; ctx.fillText(right, x + w - ip, yy + 36); ctx.textAlign = "left";
            if (b.score) { rr(x + ip, yy + 66, w - ip * 2, 10, 5, "rgba(255,255,255,.85)"); rr(x + ip, yy + 66, Math.max(10, (w - ip * 2) * it.score / 100), 10, 5, c.ink); }
          }
          text(it.text, x + ip, yy + top, w - ip * 2, 23, 400, INK, 1.7);
          yy += ch + 14;
        });
        return yy - y + 4;
      case "lines":
        yy = y;
        b.items.forEach(function (it) {
          var c = COLORS[it.dim];
          var th = (function () { var s = DRAW; DRAW = false; var r = text(it.text, 0, 0, w - 90, 25, 600, NAVY, 1.6); DRAW = s; return r; })();
          var ch = Math.max(th + 32, 76);
          rr(x, yy, w, ch, 16, c.bg); icon(it.dim, x + 22, yy + ch / 2 - 16, 32, c.ink);
          text(it.text, x + 70, yy + (ch - th) / 2, w - 90, 25, 600, NAVY, 1.6);
          yy += ch + 12;
        });
        return yy - y + 4;
      case "dimlist": case "list":
        yy = y;
        b.items.forEach(function (it) {
          var str = typeof it === "string" ? it : it.text, col = typeof it === "string" ? RED : COLORS[it.dim].ink;
          if (DRAW) { ctx.beginPath(); ctx.arc(x + 8, yy + 21, 5, 0, 7); ctx.fillStyle = col; ctx.fill(); }
          yy += text(str, x + 26, yy, w - 26, 24, 400, INK, 1.7) + 8;
        });
        return yy - y + 6;
      case "quote":
        yy = y + 18;
        yy += text(b.label, x + 24, yy, w - 48, 21, 600, MUTED, 1.6);
        yy += text("“" + b.text + "”", x + 24, yy, w - 48, 25, 600, NAVY, 1.7) + 4;
        yy += text(b.tail, x + 24, yy, w - 48, 22, 400, INK, 1.65);
        if (DRAW) { rr(x, y, w, yy - y + 18, 14, null, LINE, 1.5); ctx.fillStyle = RED; ctx.fillRect(x, y + 14, 5, yy - y - 10); }
        return yy - y + 18 + 16;
      case "kv":
        yy = y;
        b.items.forEach(function (it, i) {
          if (i && DRAW) { ctx.fillStyle = LINE; ctx.fillRect(x, yy - 10, w, 1.5); }
          font(24, 800); var kw = ctx.measureText(it.k).width;
          if (DRAW) { ctx.fillStyle = NAVY; ctx.textBaseline = "middle"; ctx.fillText(it.k, x, yy + 20); }
          if (it.v) tag(it.v, x + kw + 14, yy + 4);
          yy += 46;
          yy += text(it.text, x, yy, w, 23, 400, INK, 1.7) + 22;
        });
        return yy - y;
      case "env":
        yy = y;
        [[b.a, "#2f7a52", "#eaf4ec"], [b.b, RED, "#f9ecea"]].forEach(function (col) {
          var start = yy, inner = 0;
          var hh = (function () { var s = DRAW; DRAW = false; var r = 0; col[0].items.forEach(function (t) { r += text(t, 0, 0, w - 70, 23, 400, INK, 1.65) + 6; }); DRAW = s; return r; })();
          rr(x, yy, w, hh + 78, 16, col[2]);
          if (DRAW) { font(25, 800); ctx.fillStyle = col[1]; ctx.textBaseline = "middle"; ctx.fillText(col[0].title, x + 24, yy + 34); }
          inner = yy + 62;
          col[0].items.forEach(function (t) {
            if (DRAW) { ctx.beginPath(); ctx.arc(x + 32, inner + 20, 4.5, 0, 7); ctx.fillStyle = col[1]; ctx.fill(); }
            inner += text(t, x + 48, inner, w - 70, 23, 400, INK, 1.65) + 6;
          });
          yy = start + hh + 78 + 14;
        });
        return yy - y + 4;
      case "cards":
        yy = y;
        b.items.forEach(function (it) {
          var hh = (function () { var s = DRAW; DRAW = false; var r = 0; it.lines.forEach(function (l) { r += text(l, 0, 0, w - 48, 23, 400, INK, 1.7) + 8; }); DRAW = s; return r; })();
          var ch = hh + 76;
          rr(x, yy, w, ch, 16, "#fff", it.focus ? RED : LINE, it.focus ? 2.5 : 1.5);
          if (DRAW) { font(25, 800); ctx.fillStyle = NAVY; ctx.textBaseline = "middle"; ctx.fillText(it.title, x + 24, yy + 36); }
          if (it.focus) { font(25, 800); tag(C.focusTag, x + 24 + ctx.measureText(it.title).width + 14, yy + 20); }
          var iy = yy + 62;
          it.lines.forEach(function (l) { iy += text(l, x + 24, iy, w - 48, 23, 400, INK, 1.7) + 8; });
          yy += ch + 14;
        });
        return yy - y + 4;
      case "levels":
        yy = y;
        b.items.forEach(function (it, i) {
          if (DRAW) {
            ctx.beginPath(); ctx.arc(x + 17, yy + 18, 17, 0, 7); ctx.fillStyle = NAVY; ctx.fill();
            font(19, 800); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), x + 17, yy + 19); ctx.textAlign = "left";
            font(24, 800); ctx.fillStyle = NAVY; ctx.fillText(it.k, x + 48, yy + 18);
          }
          yy += 48;
          yy += (it.chips ? chips(it.chips, x + 48, yy, w - 48) : text(it.v, x + 48, yy, w - 48, 24, 500, INK, 1.7)) + 22;
        });
        return yy - y;
      case "module":
        pad = 24;
        var inner = (function () { var s = DRAW; DRAW = false; var r = 0; b.blocks.forEach(function (bb) { r += block(bb, 0, 0, w - pad * 2); }); DRAW = s; return r; })();
        var mh = inner + 76;
        rr(x, y, w, mh, 16, b.focus ? "#fdf5f3" : "#fbf8f2", b.focus ? RED : LINE, b.focus ? 2.5 : 1.5);
        if (DRAW) { font(26, 800); ctx.fillStyle = b.focus ? RED : NAVY; ctx.textBaseline = "middle"; ctx.fillText(b.title, x + pad, y + 36); }
        if (b.focus) { font(26, 800); tag(C.focusTag, x + pad + ctx.measureText(b.title).width + 14, y + 20); }
        yy = y + 66;
        b.blocks.forEach(function (bb) { yy += block(bb, x + pad, yy, w - pad * 2); });
        return mh + 16;
    }
    return 0;
  }

  function section(s, y) {
    var x = PAD, w = W - PAD * 2, ix = x + IN, iw = w - IN * 2;
    var blocks = s.blocks.concat(s.collapsible && !s.collapsed ? s.more : []);
    if (s.collapsible && s.collapsed) blocks = blocks.concat([{ t: "note", text: "（这一部分在页面上处于收起状态。）" }]);
    var save = DRAW; DRAW = false; var hh = 0; blocks.forEach(function (b) { hh += block(b, ix, 0, iw); }); DRAW = save;
    var head = 92, H = head + hh + 18;
    rr(x, y, w, H, 22, CARD, s.focus ? RED : LINE, s.focus ? 3 : 1.5);
    if (DRAW) {
      font(30, 900); ctx.fillStyle = RED; ctx.textBaseline = "middle"; var no = (s.no < 10 ? "0" : "") + s.no; ctx.fillText(no, ix, y + 50);
      var nw = ctx.measureText(no).width + 16; font(31, 900); ctx.fillStyle = NAVY;
      var title = s.title, tw = ctx.measureText(title).width, maxT = iw - nw - (s.focus ? 120 : 0);
      while (tw > maxT && title.length > 4) { title = title.slice(0, -1); tw = ctx.measureText(title + "…").width; }
      if (title !== s.title) title += "…";
      ctx.fillText(title, ix + nw, y + 50);
      if (s.focus) tag(C.focusTag, ix + nw + ctx.measureText(title).width + 14, y + 34);
      ctx.fillStyle = LINE; ctx.fillRect(ix, y + 84, iw, 1.5);
    }
    var yy = y + head + 14;
    blocks.forEach(function (b) { yy += block(b, ix, yy, iw); });
    return H + 22;
  }

  function star(x, y, r, color) {
    if (!DRAW) return; ctx.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? r * 0.28 : r; ctx[i ? "lineTo" : "moveTo"](x + rad * Math.cos(a), y + rad * Math.sin(a)); }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  function layout(m) {
    var y = 0, x = PAD, w = W - PAD * 2;
    if (DRAW) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, 100000); }
    star(70, 70, 16, RED); star(W - 70, 70, 16, NAVY);
    y = 50;
    y += text("—  " + C.title + "  —", x, y, w, 24, 600, NAVY, 1.6, "center") + 10;
    font(60, 900);
    var nick = m.nick, part2 = "的兴趣地图", nw = ctx.measureText(nick).width, pw = ctx.measureText(part2).width;
    if (nw + pw > w) {
      y += text(nick, x, y, w, 56, 900, NAVY, 1.3, "center");
      y += text(part2, x, y, w, 56, 900, RED, 1.3, "center");
    } else {
      if (DRAW) { var sx = x + (w - nw - pw) / 2; ctx.textBaseline = "middle"; ctx.fillStyle = NAVY; ctx.fillText(nick, sx, y + 42); ctx.fillStyle = RED; ctx.fillText(part2, sx + nw, y + 42); }
      y += 88;
    }
    y += text(R.fmtDate(m.t), x, y, w, 21, 400, MUTED, 1.6, "center") + 12;
    font(22, 700); var cap = "✦  " + C.homeTag + "  ✦", cw = Math.min(ctx.measureText(cap).width + 44, w);
    if (DRAW) { rr(x + (w - cw) / 2, y, cw, 50, 25, RED); ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; font(22, 700); ctx.fillText(cap, W / 2, y + 26); ctx.textAlign = "left"; }
    y += 70;
    var bh = (function () { var s = DRAW; DRAW = false; var r = text(m.banner, 0, 0, w - 48, 23, 400, INK, 1.65); DRAW = s; return r; })();
    rr(x, y, w, bh + 36, 18, "#fff", LINE, 1.5); text(m.banner, x + 24, y + 18, w - 48, 23, 400, INK, 1.65); y += bh + 36 + 16;
    m.quality.forEach(function (q) { y += block({ t: "callout", text: q }, x, y, w); });
    y += 8;
    m.sections.forEach(function (s) { y += section(s, y); });
    // 底部固定句
    var fh = (function () { var s = DRAW; DRAW = false; var r = text(m.footer, 0, 0, w - 64, 23, 400, "#fff", 1.75); DRAW = s; return r; })();
    rr(x, y, w, fh + 56, 22, NAVY); text(m.footer, x + 32, y + 28, w - 64, 23, 400, "#fff", 1.75);
    y += fh + 56 + 36;
    y += text(C.title + " · " + C.subtitle, x, y, w, 20, 400, MUTED, 1.6, "center");
    // 底部蓝红弧线色块
    var arcTop = y + 30, H = arcTop + 130;
    if (DRAW) {
      ctx.beginPath(); ctx.moveTo(0, arcTop + 40); ctx.quadraticCurveTo(W * 0.45, arcTop + 150, W, arcTop - 10); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = RED; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, arcTop + 70); ctx.quadraticCurveTo(W * 0.5, arcTop + 160, W, arcTop + 40); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = NAVY; ctx.fill();
    }
    return H;
  }

  function toCanvas(m) {
    var probe = document.createElement("canvas"); probe.width = probe.height = 4;
    ctx = probe.getContext("2d"); DRAW = false;
    var H = Math.ceil(layout(m));
    // 控制总像素，兼顾 iOS Safari 画布上限（约 1670 万像素）与单边 ≤ 32000
    var scale = Math.min(2, Math.sqrt(15.5e6 / (W * H)), 32000 / H);
    var cv = document.createElement("canvas");
    cv.width = Math.floor(W * scale); cv.height = Math.floor(H * scale);
    ctx = cv.getContext("2d"); ctx.scale(scale, scale); DRAW = true;
    layout(m);
    return cv;
  }

  root.HollandExport = { toCanvas: toCanvas };
})(window);
