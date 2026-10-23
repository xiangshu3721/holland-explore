import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createContext, runInContext } from "node:vm";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

function loadPage() {
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
  for (const name of ["questions.js", "content.js", "engine.js", "cloud-config.js", "cloud-client.js", "cloud-payload.js", "cloud-share.js"]) {
    runInContext(readFileSync(new URL(`./${name}`, import.meta.url), "utf8"), sandbox, { filename: name });
  }
  return sandbox;
}

function installDom(sandbox) {
  const listeners = new Map();
  const slot = {
    isConnected: true,
    innerHTML: "",
    attrs: {},
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    addEventListener(type, fn) { listeners.set(type, fn); },
    click(name) {
      listeners.get("click")({
        stopPropagation() {},
        target: {
          closest(sel) {
            if (sel !== "[data-cloud]") return null;
            return { getAttribute: () => name };
          },
        },
      });
    },
  };
  sandbox.document = {
    body: { appendChild() {}, removeChild() {} },
    createElement() {
      return { value: "", style: {}, setAttribute() {}, select() {}, parentNode: { removeChild() {} } };
    },
    execCommand() { return false; },
  };
  sandbox.localStorage = memoryStorage();
  sandbox.location = { hostname: "xiangshu3721.github.io", origin: "https://xiangshu3721.github.io" };
  sandbox.copied = "";
  sandbox.navigator = { clipboard: { writeText: async (text) => { sandbox.copied = text; } } };
  return slot;
}

function answers(sandbox, seed) {
  const map = {};
  sandbox.HOLLAND_QUESTIONS.forEach((q, index) => { map[q.id] = ((index + seed) % 5) + 1; });
  map.q1 = "SECRET_OPEN_9f3c";
  map.q2other = "SECRET_OTHER_9f3c";
  return map;
}

async function flush() {
  for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

test("结果页自动提交一次，分享结果只复制短链", async () => {
  const sandbox = loadPage();
  const slot = installDom(sandbox);
  const calls = [];
  sandbox.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url: String(url), body, headers: options.headers });
    assert.equal(Object.prototype.hasOwnProperty.call(options.headers, "authorization"), false);
    if (String(url).endsWith("/v1/results")) {
      return { status: 200, json: async () => ({ reportId: body.result.reportId, index: "off", byteSize: 4 }) };
    }
    return { status: 404, json: async () => ({}) };
  };
  const input = { nickname: "  小林  ", answers: answers(sandbox, 0), completedAt: Date.parse("2026-10-23T15:04:05+08:00") };
  sandbox.HollandCloud.mount(slot, input);
  assert.match(slot.innerHTML, /分享结果/);
  assert.match(slot.innerHTML, /链接生成中/);
  assert.equal(slot.innerHTML.includes("我同意"), false);
  await flush();
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/assessment-report-dev\/v1\/results$/);
  assert.equal(calls[0].body.result.assessmentId, "holland");
  assert.equal(calls[0].body.result.nickname, "小林");
  assert.equal(calls[0].body.result.extensionData.answers.length, 60);
  assert.equal(JSON.stringify(calls[0].body).includes("SECRET_OPEN_9f3c"), false);
  assert.equal(JSON.stringify(calls[0].body).includes("SECRET_OTHER_9f3c"), false);
  assert.match(calls[0].body.linkSecret, /^[A-Za-z0-9_-]{16}$/);
  assert.match(calls[0].body.result.reportId, /^rpt_[A-Za-z0-9_-]{11}$/);
  sandbox.HollandCloud.mount(slot, input);
  await flush();
  assert.equal(calls.length, 1);
  slot.click("share");
  await flush();
  assert.match(sandbox.copied, /^https:\/\/xiangshu3721\.github\.io\/mindtest-web\/r\/#[A-Za-z0-9_-]{11}\.[A-Za-z0-9_-]{16}$/);
  assert.equal(sandbox.copied.includes("rpt_"), false);
  assert.equal(sandbox.copied.length, 75);
  assert.match(slot.innerHTML, /链接已复制/);
  const saved = sandbox.HollandCloudClient.createCloudStore(sandbox.localStorage).links();
  assert.equal(Object.values(saved)[0].reportUrl, sandbox.copied);
});

test("提交失败可以重试同一次，手机号和不完整结果不发请求", async () => {
  const sandbox = loadPage();
  const slot = installDom(sandbox);
  let failed = true;
  const ids = [];
  sandbox.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    ids.push(body.result.reportId);
    if (failed) throw new Error("offline");
    return { status: 200, json: async () => ({ reportId: body.result.reportId }) };
  };
  sandbox.HollandCloud.mount(slot, { nickname: "小林", answers: answers(sandbox, 2), completedAt: Date.now() });
  await flush();
  assert.match(slot.innerHTML, /重试/);
  assert.match(slot.innerHTML, /这次没生成链接/);
  assert.equal(slot.innerHTML.includes("微信"), false);
  assert.equal(slot.innerHTML.includes("二维码"), false);
  failed = false;
  slot.click("retry");
  await flush();
  assert.equal(ids.length, 2);
  assert.equal(ids[0], ids[1]);
  assert.equal(slot.innerHTML.includes("重试"), false);

  const quiet = loadPage();
  const quietSlot = installDom(quiet);
  const calls = [];
  quiet.fetch = async () => { calls.push("hit"); return { status: 200, json: async () => ({}) }; };
  quiet.HollandCloud.mount(quietSlot, { nickname: "13800000000", answers: answers(quiet, 3) });
  await flush();
  assert.equal(calls.length, 0);
  assert.match(quietSlot.innerHTML, /称呼不能是手机号/);
  quiet.HollandCloud.mount(quietSlot, { nickname: "小林", answers: null });
  await flush();
  assert.equal(calls.length, 0);
  assert.match(quietSlot.innerHTML, /这一次结果不完整，没法分享/);
});

test("链接还在生成时，点分享会提示稍后再试", async () => {
  const sandbox = loadPage();
  const slot = installDom(sandbox);
  let release;
  sandbox.fetch = () => new Promise((resolve) => { release = resolve; });
  sandbox.HollandCloud.mount(slot, { nickname: "小林", answers: answers(sandbox, 4) });
  assert.match(slot.innerHTML, /disabled/);
  assert.match(slot.innerHTML, /aria-busy="true"/);
  slot.click("share");
  assert.match(slot.innerHTML, /链接生成中，稍后再试/);
  release({ status: 200, json: async () => ({ reportId: "rpt_abcdefghijk" }) });
  await flush();
  assert.match(slot.innerHTML, /分享结果/);
  assert.equal(slot.innerHTML.includes("disabled"), false);
});
