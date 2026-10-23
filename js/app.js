/* 霍兰德兴趣探索 · 页面流程：首页(昵称) → 作答说明 → 作答 → 三个探索问题 → 报告；本地保存进度与历史 */
(function () {
  "use strict";
  var C = window.HOLLAND_CONTENT, Q = window.HOLLAND_QUESTIONS, E = window.HollandEngine, RD = window.HollandRender, RP = window.HollandReport, EX = window.HollandExport;
  var K_NICK = "holland_explore.nick", K_PROG = "holland_explore.progress", K_HIST = "holland_explore.history";
  var $ = function (id) { return document.getElementById(id); };
  var esc = RD.esc;
  var mem = {};
  function get(k) { try { var v = localStorage.getItem(k); return v == null ? mem[k] : JSON.parse(v); } catch (e) { return mem[k]; } }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }

  var prog = null, current = null, ui = {}, shownAt = 0, advancing = false;

  function show(id) {
    ["v-home", "v-guide", "v-quiz", "v-explore", "v-result", "v-history"].forEach(function (v) { $(v).hidden = v !== id; });
    document.body.setAttribute("data-view", id.slice(2));
    window.scrollTo(0, 0);
  }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600); }

  /* ---------- 首页 ---------- */
  function initStatic() {
    $("home-sub").textContent = C.subtitle;
    $("home-tag").textContent = "✦ " + C.homeTag + " ✦";
    $("home-hex").innerHTML = RD.decoHex();
    var L = C.homeIntro;
    $("home-intro").innerHTML = '<p class="lead">' + esc(L[0]) + "</p><ul>" + L.slice(1, 7).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      L.slice(7).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("");
    $("nick-label").textContent = C.nickLabel;
    $("nick").placeholder = C.nickPlaceholder;
    $("btn-start").textContent = C.startButton;
    $("home-meta").innerHTML = C.homeMeta.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    $("guide-text").innerHTML = C.guide.map(function (x, i) { return '<p class="' + (i === 3 ? "big" : "") + '">' + esc(x) + "</p>"; }).join("");
    $("btn-guide-go").textContent = C.guideButton;
    $("q-ask").textContent = C.quizAsk;
    $("pg-label").textContent = C.progressLabel;
    $("opts").innerHTML = C.options.map(function (o) {
      return '<button type="button" class="opt" role="radio" aria-checked="false" data-v="' + o.v + '"><span class="dots">' +
        new Array(o.v + 1).join("<i></i>") + new Array(6 - o.v).join("<i class=\"o\"></i>") + '</span><span class="ol">' + esc(o.label) + "</span></button>";
    }).join("");
    var X = C.explore;
    $("ex-intro").textContent = X.intro; $("ex-q1").textContent = X.q1; $("ex-a1").placeholder = X.q1Placeholder;
    $("ex-q2").textContent = X.q2; $("ex-q3").textContent = X.q3; $("ex-a2o").placeholder = X.q2Other;
    Array.prototype.forEach.call(document.querySelectorAll(".mh"), function (e) { e.textContent = X.multiHint; });
    $("ex-a2").innerHTML = X.q2Options.map(chip).join(""); $("ex-a3").innerHTML = X.q3Options.map(chip).join("");
    $("btn-submit").textContent = X.submit;
  }
  function chip(o) { return '<button type="button" class="chip-btn" aria-pressed="false">' + esc(o) + "</button>"; }

  function cleanNick(s) { return window.HollandCloudPayload.hollandNickname(s); }
  function phoneNick(s) { return window.HollandCloudPayload.phoneNickname(s); }
  function refreshHome() {
    var n = get(K_NICK) || "";
    if (!$("nick").value) $("nick").value = n;
    nickState();
    prog = get(K_PROG);
    if (prog && prog.order && prog.order.length === 60) {
      $("resume").hidden = false;
      $("resume-pct").textContent = prog.stage === "explore" ? "题目已经答完，还差最后三个小问题" : "约完成 " + pct() + "%，可以从上次停下的地方接着来";
    } else { prog = null; $("resume").hidden = true; }
    show("v-home");
  }
  function nickState() {
    var raw = $("nick").value;
    var v = cleanNick(raw);
    var phone = phoneNick(raw) || phoneNick(v);
    var ok = !!v && !phone;
    $("btn-start").disabled = !ok; $("btn-resume").disabled = !ok;
    $("nick-hint").textContent = phone ? C.nickPhone : v ? "" : C.nickHint;
    return ok ? v : "";
  }
  function saveNick() { var v = nickState(); if (v) set(K_NICK, v); return v; }

  /* ---------- 作答 ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function newProgress() {
    var order = [];
    // 十组按序推进；每组六题（各维一题）组内随机
    for (var b = 1; b <= 10; b++) order = order.concat(shuffle(Q.filter(function (q) { return q.block === b; }).map(function (q) { return q.id; })));
    return { v: 2, stage: "quiz", order: order, idx: 0, answers: {}, times: {}, explore: { q1: "", q2: [], q2other: "", q3: [] }, startedAt: Date.now() };
  }
  function saveProg() { set(K_PROG, prog); }
  function pct() { return Math.round(Object.keys(prog.answers).length / 60 * 100); }
  var QMAP = {}; Q.forEach(function (q) { QMAP[q.id] = q; });

  function renderQ() {
    var id = prog.order[prog.idx], q = QMAP[id], a = prog.answers[id];
    var card = $("qcard"); card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    $("q-text").textContent = q.text; // 只写题干文字，不写维度
    Array.prototype.forEach.call(document.querySelectorAll(".opt"), function (b) {
      var on = Number(b.getAttribute("data-v")) === a; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false");
    });
    var p = pct();
    $("pg-bar").style.width = Math.max(2, p) + "%";
    $("pg-pct").textContent = "约完成 " + p + "%";
    $("btn-prev").style.visibility = prog.idx > 0 ? "visible" : "hidden";
    shownAt = Date.now(); advancing = false;
  }
  function answer(v) {
    if (advancing) return;
    var id = prog.order[prog.idx];
    if (prog.answers[id] == null) prog.times[id] = Date.now() - shownAt;
    prog.answers[id] = v;
    Array.prototype.forEach.call(document.querySelectorAll(".opt"), function (b) { var on = Number(b.getAttribute("data-v")) === v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
    $("pg-bar").style.width = Math.max(2, pct()) + "%"; $("pg-pct").textContent = "约完成 " + pct() + "%";
    advancing = true;
    setTimeout(function () {
      var next = -1;
      for (var i = prog.idx + 1; i < 60; i++) if (prog.answers[prog.order[i]] == null) { next = i; break; }
      if (next < 0) for (i = 0; i < 60; i++) if (prog.answers[prog.order[i]] == null) { next = i; break; }
      if (next < 0) { prog.stage = "explore"; saveProg(); openExplore(); return; }
      prog.idx = next; saveProg(); renderQ();
    }, 200);
    saveProg();
  }
  function openQuiz() { show("v-quiz"); renderQ(); }

  /* ---------- 探索问题 ---------- */
  function setChips(box, vals) { Array.prototype.forEach.call(box.children, function (b) { b.setAttribute("aria-pressed", vals.indexOf(b.textContent) >= 0 ? "true" : "false"); }); }
  function readChips(box) { return Array.prototype.filter.call(box.children, function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.textContent; }); }
  function openExplore() {
    var e = prog.explore || {};
    $("ex-a1").value = e.q1 || ""; $("ex-a2o").value = e.q2other || "";
    setChips($("ex-a2"), e.q2 || []); setChips($("ex-a3"), e.q3 || []);
    show("v-explore");
  }
  function collectExplore() {
    prog.explore = { q1: $("ex-a1").value.slice(0, 200), q2: readChips($("ex-a2")), q2other: $("ex-a2o").value.slice(0, 60), q3: readChips($("ex-a3")) };
    saveProg();
  }
  function onChip(box, exclusive) {
    box.addEventListener("click", function (ev) {
      var b = ev.target.closest(".chip-btn"); if (!b) return;
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      // “还没想清楚 / 暂时只是好奇”与其他选项互斥
      if (on) Array.prototype.forEach.call(box.children, function (o) {
        if (o !== b && (o.textContent === exclusive || b.textContent === exclusive)) o.setAttribute("aria-pressed", "false");
      });
      collectExplore();
    });
  }

  /* ---------- 结果 ---------- */
  function submit() {
    collectExplore();
    var result = E.compute(prog.answers, prog.times);
    var answers = {};
    Q.forEach(function (q) { answers[q.id] = prog.answers[q.id]; });
    var rec = { id: "h" + Date.now().toString(36), t: Date.now(), nick: get(K_NICK) || "我", result: result, answers: answers, explore: prog.explore };
    var hist = get(K_HIST) || []; hist.unshift(rec); set(K_HIST, hist.slice(0, 30));
    del(K_PROG); prog = null;
    openResult(rec);
  }
  function openResult(rec) {
    current = rec; ui = {};
    renderResult(); show("v-result");
    var flags = rec.result && rec.result.quality;
    var rushed = !!(flags && flags.indexOf && flags.indexOf("FAST_RESPONSE") >= 0);
    if (window.HollandCloud) window.HollandCloud.mount($("share-slot"), { nickname: rec.nick, answers: rec.answers || null, completedAt: rec.t, rushed: rushed });
  }
  function renderResult() {
    $("report").innerHTML = RD.report(RP.build(current, ui));
  }

  /* ---------- 导出长图 ---------- */
  function isIOS() { var u = navigator.userAgent; return /iPad|iPhone|iPod/.test(u) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function inApp() { return /MicroMessenger|QQ\/|Weibo|DingTalk|AlipayClient|Lark|Feishu/i.test(navigator.userAgent); }
  var lastUrl = null;
  function exportImg() {
    var btn = $("btn-export"); if (btn.disabled) return;
    btn.disabled = true; btn.textContent = "正在生成…";
    setTimeout(function () {
      var cv;
      try { cv = EX.toCanvas(RP.build(current, ui)); } catch (e) { btn.disabled = false; btn.textContent = "导出图片"; toast("生成失败，请稍后再试"); return; }
      var name = "霍兰德兴趣探索-" + current.nick + "-" + current.result.holland_code + ".png";
      var done = function () { btn.disabled = false; btn.textContent = "导出图片"; };
      if (/MicroMessenger/i.test(navigator.userAgent)) { // 微信内长按识别 blob 图片不稳定，预览层用图片源（不作为下载链接 href）
        showPreview(cv.toDataURL("image/jpeg", 0.9)); done(); return;
      }
      cv.toBlob(function (blob) {
        done();
        if (!blob) { toast("生成失败，请稍后再试"); return; }
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        if (isIOS() || inApp() || !("download" in a)) { showPreview(lastUrl); return; }
        a.href = lastUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        toast("长图已开始下载");
      }, "image/png");
    }, 30);
  }
  function showPreview(src) {
    $("ov-img").src = src; $("overlay").hidden = false; document.body.classList.add("noscroll");
  }

  /* ---------- 历史 ---------- */
  function openHistory() {
    var hist = get(K_HIST) || [];
    $("hist-list").innerHTML = hist.length ? hist.map(function (r) {
      var top = r.result.top_dimensions;
      return '<div class="hist-item"><div class="hi-main"><div class="hi-code">' + top.map(function (d) { return '<b style="color:' + RD.COLORS[d].ink + '">' + d + "</b>"; }).join("·") +
        '</div><div class="hi-info"><p class="hi-nick">' + esc(r.nick) + '</p><p class="hi-date">' + RD.fmtDate(r.t) + '</p><p class="hi-ph">' + top.map(function (d) { return esc(C.dims[d].phrase); }).join(" × ") +
        '</p></div></div><div class="hi-act"><button type="button" class="btn-mini" data-view="' + r.id + '">查看</button><button type="button" class="btn-mini ghost" data-del="' + r.id + '">删除</button></div></div>';
    }).join("") : '<p class="empty">还没有记录。完成一次探索后，结果会保存在这里。</p>';
    $("btn-hist-clear").hidden = !hist.length;
    show("v-history");
  }

  /* ---------- 事件 ---------- */
  function bind() {
    $("nick").addEventListener("input", nickState);
    $("nick").addEventListener("keydown", function (e) { if (e.key === "Enter" && !$("btn-start").disabled) $("btn-start").click(); });
    $("btn-start").addEventListener("click", function () {
      if (!saveNick()) return;
      if (prog && Object.keys(prog.answers).length && !window.confirm("重新开始会清空上次未完成的作答，确定吗？")) return;
      prog = newProgress(); saveProg(); show("v-guide");
    });
    $("btn-resume").addEventListener("click", function () {
      if (!saveNick() || !prog) return;
      if (prog.stage === "explore") openExplore(); else openQuiz();
    });
    $("btn-history-home").addEventListener("click", openHistory);
    $("btn-guide-go").addEventListener("click", openQuiz);
    $("btn-guide-back").addEventListener("click", refreshHome);
    $("opts").addEventListener("click", function (e) { var b = e.target.closest(".opt"); if (b) answer(Number(b.getAttribute("data-v"))); });
    document.addEventListener("keydown", function (e) {
      if ($("v-quiz").hidden || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (/^[1-5]$/.test(e.key)) answer(Number(e.key));
    });
    $("btn-prev").addEventListener("click", function () { if (prog.idx > 0 && !advancing) { prog.idx--; saveProg(); renderQ(); } });
    $("btn-pause").addEventListener("click", function () { saveProg(); refreshHome(); toast("进度已保存，下次可以接着答"); });
    onChip($("ex-a2"), "还没想清楚"); onChip($("ex-a3"), "暂时只是好奇");
    $("ex-a1").addEventListener("input", collectExplore); $("ex-a2o").addEventListener("input", collectExplore);
    $("btn-submit").addEventListener("click", submit);
    $("btn-ex-back").addEventListener("click", function () { collectExplore(); prog.stage = "quiz"; prog.idx = 59; saveProg(); openQuiz(); });
    $("report").addEventListener("click", function (e) {
      if (e.target.closest(".toggle-career")) {
        var m = RP.build(current, ui), s = m.sections.filter(function (x) { return x.id === "career"; })[0];
        ui.careerOpen = s.collapsed; renderResult();
        var el = document.getElementById("sec-career"); if (el && ui.careerOpen) el.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    });
    $("btn-export").addEventListener("click", exportImg);
    $("btn-retest").addEventListener("click", function () { del(K_PROG); prog = null; current = null; refreshHome(); });
    $("btn-history").addEventListener("click", openHistory);
    $("btn-hist-home").addEventListener("click", refreshHome);
    $("btn-hist-clear").addEventListener("click", function () { if (window.confirm("确定清空全部历史记录吗？")) { del(K_HIST); openHistory(); } });
    $("hist-list").addEventListener("click", function (e) {
      var v = e.target.getAttribute("data-view"), d = e.target.getAttribute("data-del"), hist = get(K_HIST) || [];
      if (v) hist.forEach(function (r) { if (r.id === v) openResult(r); });
      if (d && window.confirm("删除这条记录？")) { set(K_HIST, hist.filter(function (r) { return r.id !== d; })); openHistory(); }
    });
    $("ov-close").addEventListener("click", function () { $("overlay").hidden = true; document.body.classList.remove("noscroll"); });
  }

  initStatic(); bind(); refreshHome();
  // 供自动化测试读取（只读引擎，不影响页面）
  window.__holland = { compute: E.compute, build: RP.build, state: function () { return { prog: get(K_PROG), hist: get(K_HIST), nick: get(K_NICK) }; } };
})();
