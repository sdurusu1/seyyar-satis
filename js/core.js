"use strict";
/* =================== AYAR =================== */
const SUPA_URL = "https://kzwmlhncpxylqvveohsb.supabase.co";
const SUPA_KEY = "sb_publishable_mTWX0XH4IS7hbr4ZhUA0xg_rQez37iM";
const APP_VER = "2.2";
/* =================== TEMA =================== */
const THEMES = { auto: "Otomatik", light: "Açık", dark: "Koyu" };
const THEME_ICON = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};
function getTheme() { try { return localStorage.getItem("ss_theme") || "auto"; } catch (e) { return "auto"; } }
function applyTheme(t) {
  try { localStorage.setItem("ss_theme", t); } catch (e) { }
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? "#121513" : "#0f766e";
  const b = document.getElementById("themeBtn"); if (b) { b.innerHTML = THEME_ICON[t]; b.title = "Tema: " + THEMES[t]; }
}
function cycleTheme() { const o = ["auto", "light", "dark"]; const n = o[(o.indexOf(getTheme()) + 1) % 3]; applyTheme(n); toast("Tema: " + THEMES[n]); }

/* =================== YARDIMCILAR =================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
const tl = n => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(+n || 0);
const nf = n => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
const qf = n => { n = +n || 0; return Number.isInteger(n) ? String(n) : String(r2(n)).replace(".", ","); };
const pnum = v => { if (typeof v === "number") return v; v = String(v ?? "").trim().replace(/\s/g, ""); if (v.includes(",")) v = v.replace(/\./g, "").replace(",", "."); const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fdt = d => d ? new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const fd = d => d ? new Date(d).toLocaleDateString("tr-TR") : "";
const trLower = s => String(s || "").toLocaleLowerCase("tr-TR");
const fold = s => trLower(s).replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
const ymd = d => { d = new Date(d); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const startOfDay = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
const lsGet = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sum = (arr, f) => r2(arr.reduce((a, x) => a + (+f(x) || 0), 0));

/* =================== API (Supabase REST) =================== */
const API = {
  sess: lsGet("ss_session", null),
  saveSess(s) { this.sess = s; lsSet("ss_session", s); },
  get email() { return this.sess && this.sess.email; },
  async authCall(path, body) {
    const r = await fetch(SUPA_URL + "/auth/v1/" + path, { method: "POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(authMsg(j.error_description || j.msg || j.message || j.error_code || ("Hata " + r.status)));
    return j;
  },
  setFromToken(j) { this.saveSess({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || this.email }); },
  async login(email, password) { const j = await this.authCall("token?grant_type=password", { email, password }); this.setFromToken(j); return j; },
  async signup(email, password) { return this.authCall("signup", { email, password }); },
  async recover(email) { return this.authCall("recover", { email }); },
  async refresh() {
    if (!this.sess || !this.sess.refresh) throw new Error("Oturum yok");
    const j = await this.authCall("token?grant_type=refresh_token", { refresh_token: this.sess.refresh });
    this.setFromToken(j);
  },
  async logout() { try { if (this.sess) await fetch(SUPA_URL + "/auth/v1/logout", { method: "POST", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + this.sess.access } }); } catch (e) { } this.saveSess(null); },
  async token() {
    if (!this.sess) throw new Error("Oturum yok");
    if (Date.now() > this.sess.exp - 60000) await this.refresh();
    return this.sess.access;
  },
  async req(method, path, body, extraHeaders = {}) {
    const t = await this.token();
    const r = await fetch(SUPA_URL + "/rest/v1/" + path, { method, headers: { apikey: SUPA_KEY, Authorization: "Bearer " + t, "Content-Type": "application/json", ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.status === 401) { await this.refresh(); return this.req(method, path, body, extraHeaders); }
    const txt = await r.text();
    let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
    if (!r.ok) { const e = new Error(dbMsg((j && (j.message || j.hint)) || ("Sunucu hatası " + r.status))); e.server = true; throw e; }
    return j;
  },
  get(path) { return this.req("GET", path); },
  async getAll(table, query = "") {
    const out = []; const size = 1000;
    for (let off = 0; ; off += size) {
      const part = await this.req("GET", `${table}?${query}${query ? "&" : ""}limit=${size}&offset=${off}`);
      out.push(...part); if (part.length < size) break;
    }
    return out;
  },
  upsert(table, rows) { return this.req("POST", table, rows, { Prefer: "resolution=merge-duplicates,return=minimal" }); },
  patch(table, filter, body) { return this.req("PATCH", `${table}?${filter}`, body, { Prefer: "return=minimal" }); },
  del(table, filter) { return this.req("DELETE", `${table}?${filter}`, undefined, { Prefer: "return=minimal" }); },
  rpc(fn, args) { return this.req("POST", "rpc/" + fn, args); }
};
function authMsg(m) {
  const s = String(m);
  if (/invalid login|invalid_credentials/i.test(s)) return "E-posta veya şifre hatalı";
  if (/not confirmed|email_not_confirmed/i.test(s)) return "E-posta adresi henüz doğrulanmadı. Gelen kutunuzdaki bağlantıya tıklayın.";
  if (/already registered|user_already_exists/i.test(s)) return "Bu e-posta zaten kayıtlı. Giriş yapın.";
  if (/at least 6|weak_password/i.test(s)) return "Şifre en az 6 karakter olmalı";
  if (/rate limit|over_email_send_rate_limit/i.test(s)) return "Çok fazla deneme yapıldı, biraz sonra tekrar deneyin";
  return s;
}
function dbMsg(m) {
  const s = String(m);
  if (/products_barcode_uq/.test(s)) return "Bu barkod başka bir üründe kayıtlı";
  if (/row-level security|permission denied|Yetkisiz/i.test(s)) return "Bu işlem için yetkiniz yok";
  return s;
}
const isNetErr = e => !e.server && (e instanceof TypeError || /fetch|network|Failed|load/i.test(String(e.message)));

/* =================== VERİ DEPOSU =================== */
const D = lsGet("ss_cache", null) || { products: [], parties: [], accounts: [], settings: {}, pbal: {}, abal: {}, docs: [], users: [], role: null, loadedAt: null };
D.docs = D.docs || [];
const S = () => Object.assign(defaultSettings(), D.settings || {});
function defaultSettings() {
  return {
    firm: "", owner: "", vkn: "", taxOffice: "", address: "", city: "", phone: "", email: "", mersis: "",
    paper: "58", charset: "cp857", codepage: 13, printMode: "bt", copies: 1, autoPrint: false,
    footer: "Bizi tercih ettiğiniz için teşekkürler!",
    serEarsiv: "EAR", serEfatura: "EFT", efaturaProfile: "TICARIFATURA", endpoint: "", token: "",
    defaultMode: "perakende", allowNegative: true, expenseCats: ["Yakıt", "Yemek", "Araç bakım", "Kira", "Fatura (elektrik/su/tel.)", "Vergi/SGK", "Maaş", "Kırtasiye/Ambalaj", "Diğer"],
    categories: ["Oyuncak", "Şekerleme", "Hediyelik"], staffSeeCost: false,
    invoicing: false, staffSimple: true, quick: [], setupDone: false
  };
}
// cihaza özel ayarlar (yazıcı)
const LOCAL_KEYS = ["paper", "charset", "codepage", "printMode", "copies", "autoPrint"];
const LS = () => Object.assign({}, lsGet("ss_local", {}));
function setting(k) { const l = LS(); return (LOCAL_KEYS.includes(k) && l[k] !== undefined) ? l[k] : S()[k]; }
function setLocal(k, v) { const l = LS(); l[k] = v; lsSet("ss_local", l); }

const saveCache = debounce(() => { if (!lsSet("ss_cache", D)) { const c = { ...D, docs: D.docs.slice(0, 100) }; lsSet("ss_cache", c); } }, 400);
const prodById = id => D.products.find(p => p.id === id);
const partyById = id => D.parties.find(p => p.id === id);
const accById = id => D.accounts.find(a => a.id === id);
const isAdmin = () => D.role === "yonetici";
const canSeeCost = () => isAdmin() || S().staffSeeCost;
const balance = id => r2(D.pbal[id] || 0);

function normDoc(d) {
  return {
    ...d, gross: +d.gross, discount: +d.discount, vat_total: +d.vat_total, total: +d.total, paid: +d.paid, credit: +d.credit,
    lines: (d.document_lines || d.lines || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(l => ({ ...l, qty: +l.qty, price: +l.price, vat: +l.vat, cost: +l.cost || 0 }))
  };
}
function numify(p) { ["retail", "wholesale", "cost", "stock", "min_stock", "pack_qty", "credit_limit"].forEach(k => { if (p[k] !== null && p[k] !== undefined) p[k] = +p[k]; }); return p; }

let online = navigator.onLine;
async function loadAll(silent) {
  try {
    const role = await API.rpc("claim_first_admin", {});
    D.role = role;
    if (!role) { D.loadedAt = null; saveCache(); return "noaccess"; }
    const since = addDays(new Date(), -45).toISOString();
    const [products, parties, accounts, settings, pb, ab, docs, users] = await Promise.all([
      API.getAll("products", "select=*&order=name.asc"),
      API.getAll("parties", "select=*&order=name.asc"),
      API.get("accounts?select=*&order=sort.asc"),
      API.get("settings?select=data&id=eq.1"),
      API.getAll("party_balances", "select=id,balance,last_move"),
      API.get("account_balances?select=id,balance"),
      API.get(`documents?select=*,document_lines(*)&date=gte.${encodeURIComponent(since)}&order=date.desc&limit=400`),
      API.get("app_users?select=*&order=created_at.asc")
    ]);
    D.products = products.map(numify); D.parties = parties.map(numify); D.accounts = accounts;
    D.settings = (settings[0] && settings[0].data) || {};
    D.pbal = {}; pb.forEach(x => D.pbal[x.id] = +x.balance);
    D.plast = {}; pb.forEach(x => D.plast[x.id] = x.last_move);
    D.abal = {}; ab.forEach(x => D.abal[x.id] = +x.balance);
    const pend = D.docs.filter(d => d.pending);
    D.docs = pend.concat(docs.map(normDoc));
    D.users = users; D.loadedAt = new Date().toISOString();
    setOnline(true); saveCache();
    return "ok";
  } catch (e) {
    if (isNetErr(e)) { setOnline(false); if (!silent) toast("Çevrimdışı: kayıtlı veriler gösteriliyor"); return "offline"; }
    if (/Oturum|refresh|JWT|token/i.test(e.message)) return "auth";
    if (!silent) toast(e.message); return "error";
  }
}
function setOnline(v) { online = v; const el = $("#netPill"); if (!el) return; const n = Q.items.length; const fail = Q.items.some(o => o.failed);
  if (v && !n) { el.style.display = "none"; return; }
  el.style.display = ""; el.textContent = !v ? `○ Çevrimdışı${n ? " · " + n : ""}` : fail ? `⚠ ${n} gönderilemedi` : `⏳ ${n} bekliyor`; el.className = "pill " + (!v || fail ? "off" : "warn");
  el.onclick = () => typeof go === "function" && go("kuyruk"); }

/* =================== GÖNDERİM KUYRUĞU (çevrimdışı) =================== */
const Q = {
  items: lsGet("ss_queue", []),
  busy: false,
  save() { lsSet("ss_queue", this.items); setOnline(online); },
  add(op) { op.qid = uuid(); op.at = new Date().toISOString(); op.tries = 0; this.items.push(op); this.save(); return this.flush(); },
  async exec(op) {
    if (op.kind === "rpc") return API.rpc(op.fn, op.args);
    if (op.kind === "upsert") return API.upsert(op.table, op.rows);
    if (op.kind === "patch") return API.patch(op.table, op.filter, op.body);
    if (op.kind === "del") return API.del(op.table, op.filter);
  },
  async flush() {
    if (this.busy) return; this.busy = true; let changed = false; let lastRes = null;
    try {
      while (this.items.length) {
        const op = this.items[0];
        if (op.failed) { this.items.push(this.items.shift()); if (this.items.every(o => o.failed)) break; continue; }
        try { lastRes = await this.exec(op); this.items.shift(); this.save(); changed = true; if (op.onDone) runDone(op, lastRes); }
        catch (e) {
          if (isNetErr(e)) { setOnline(false); break; }
          op.tries++; op.failed = true; op.error = e.message; this.save(); toast("Gönderilemedi: " + (op.label || "") + " – " + e.message);
        }
      }
    } finally { this.busy = false; }
    if (changed) { setOnline(true); await loadAll(true); if (typeof refreshView === "function") refreshView(); }
    return lastRes;
  }
};
function runDone(op, res) { if (op.onDone === "docSaved" && res && res.id) { const d = D.docs.find(x => x.id === res.id); if (d) { d.no = res.no; d.pending = false; } } }
window.addEventListener("online", () => { setOnline(true); Q.flush(); });
window.addEventListener("offline", () => setOnline(false));
setInterval(() => { if (Q.items.some(o => !o.failed)) Q.flush(); }, 30000);

// Doğrudan çevrimiçi RPC (sonucu gereken işlemler için), değilse kuyruğa
async function rpcNowOrQueue(fn, args, label, onDone) {
  if (Q.items.some(o => !o.failed) || !online) { Q.add({ kind: "rpc", fn, args, label, onDone }); return { queued: true }; }
  try { const r = await API.rpc(fn, args); return r; }
  catch (e) { if (isNetErr(e)) { setOnline(false); Q.add({ kind: "rpc", fn, args, label, onDone }); return { queued: true }; } throw e; }
}
async function writeNowOrQueue(op) {
  if (Q.items.some(o => !o.failed) || !online) { Q.add(op); return { queued: true }; }
  try { return await Q.exec(op); }
  catch (e) { if (isNetErr(e)) { setOnline(false); Q.add(op); return { queued: true }; } throw e; }
}

/* =================== UI ÇEKİRDEK =================== */
let toastT;
function toast(m) { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); } t.textContent = m; t.style.display = "block"; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = "none", 2800); }
function dialog(html, onMount, opts = {}) {
  const ov = document.createElement("div"); ov.className = "ov";
  ov.innerHTML = `<div class="dlg ${opts.wide ? "wide" : ""}">${html}</div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); if (ov._onclose) ov._onclose(); };
  ov.addEventListener("click", e => { if (e.target === ov && !opts.modal) close(); });
  ov.querySelectorAll("[data-close]").forEach(b => b.onclick = close);
  if (onMount) onMount(ov.firstChild, close, ov);
  return close;
}
function ask(msg, okText = "Evet", bad = false, sub = "") {
  return new Promise(res => {
    dialog(`<h3>${esc(msg)}</h3>${sub ? `<div class="small muted">${esc(sub)}</div>` : ""}<div class="acts"><button class="btn" data-no>Vazgeç</button><button class="btn ${bad ? "bad" : "pri"}" data-ok>${esc(okText)}</button></div>`, (d, close) => {
      d.querySelector("[data-no]").onclick = () => { close(); res(false); };
      d.querySelector("[data-ok]").onclick = () => { close(); res(true); };
    });
  });
}
function prompt2(title, label, val = "", type = "text") {
  return new Promise(res => {
    dialog(`<h3>${esc(title)}</h3><label>${esc(label)}</label><input id="pv" type="${type}" value="${esc(val)}" ${type === "text" ? "" : 'inputmode="decimal"'}><div class="acts"><button class="btn" data-no>Vazgeç</button><button class="btn pri" data-ok>Tamam</button></div>`, (d, close) => {
      const i = d.querySelector("#pv"); setTimeout(() => { i.focus(); i.select(); }, 50);
      i.onkeydown = e => { if (e.key === "Enter") { close(); res(i.value); } };
      d.querySelector("[data-no]").onclick = () => { close(); res(null); };
      d.querySelector("[data-ok]").onclick = () => { close(); res(i.value); };
    });
  });
}
async function busy(btn, fn) {
  if (btn) { btn.disabled = true; btn.dataset.t = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>'; }
  try { return await fn(); } catch (e) { toast(e.message); throw e; }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = btn.dataset.t; } }
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast("Kopyalandı"); } catch (e) { toast("Kopyalanamadı"); } }
function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type || "text/plain;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function toCSV(rows, cols) {
  const cell = v => { v = v === null || v === undefined ? "" : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const num = v => typeof v === "number" ? String(v).replace(".", ",") : v;
  return "﻿" + [cols.map(c => cell(c[0])).join(";")].concat(rows.map(r => cols.map(c => cell(num(c[1](r)))).join(";"))).join("\r\n");
}

const ICONS = {
  satis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6"/></svg>',
  stok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  cari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/></svg>',
  kasa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
  rapor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>'
};

/* =================== KAMERA BARKOD =================== */
function scanDialog(onCode, multi) {
  if (!("BarcodeDetector" in window)) {
    dialog(`<h3>Kamera ile okuma desteklenmiyor</h3><div class="hint">Bu tarayıcı kamera ile barkod okumayı desteklemiyor. Android'de Chrome kullanın ya da Bluetooth el barkod okuyucu bağlayın (okuyucu arama kutusuna yazıp Enter'a basar).</div><div class="acts"><button class="btn pri" data-close>Tamam</button></div>`);
    return;
  }
  dialog(`<h3>Barkodu kameraya gösterin</h3><video id="vid" playsinline muted></video><div class="small muted" id="st" style="margin-top:6px">Kamera açılıyor…</div><div class="acts"><button class="btn" data-close>Kapat</button></div>`, async (d, close, ov) => {
    let stream, stop = false, last = "", lastT = 0;
    ov._onclose = () => { stop = true; if (stream) stream.getTracks().forEach(t => t.stop()); };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = d.querySelector("#vid"); v.srcObject = stream; await v.play();
      d.querySelector("#st").textContent = multi ? "Okutun, her okumada eklenir. Bitince Kapat." : "Taranıyor…";
      const det = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"] });
      const loop = async () => {
        if (stop) return;
        try {
          const r = await det.detect(v);
          if (r.length) {
            const code = r[0].rawValue;
            if (!multi) { close(); onCode(code); return; }
            if (code !== last || Date.now() - lastT > 1500) { last = code; lastT = Date.now(); if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) { } onCode(code); d.querySelector("#st").textContent = "Okundu: " + code; }
          }
        } catch (e) { }
        setTimeout(loop, 200);
      }; loop();
    } catch (e) { d.querySelector("#st").innerHTML = '<span class="danger">Kameraya erişilemedi. Tarayıcıya kamera izni verin.</span>'; }
  });
}

/* =================== YAZDIRMA =================== */
const PW = () => +setting("paper") === 80 ? 48 : 32;
function lr(l, r, w) { l = String(l); r = String(r); const sp = w - l.length - r.length; if (sp >= 1) return l + " ".repeat(sp) + r; return l.slice(0, Math.max(0, w - r.length - 1)) + " " + r; }
function wrap(s, w) { const out = []; s = String(s || ""); while (s.length > w) { let i = s.lastIndexOf(" ", w); if (i <= 0) i = w; out.push(s.slice(0, i)); s = s.slice(i).trimStart(); } if (s) out.push(s); return out; }
function vatBreak(doc) {
  const m = {}; const ratio = doc.gross ? doc.total / doc.gross : 1;
  doc.lines.forEach(i => { const g = i.qty * i.price * ratio; const base = g / (1 + i.vat / 100); m[i.vat] = m[i.vat] || { base: 0, vat: 0 }; m[i.vat].base += base; m[i.vat].vat += g - base; });
  Object.values(m).forEach(v => { v.base = r2(v.base); v.vat = r2(v.vat); });
  return m;
}
const DOC_TITLES = { satis: "SATIŞ", alis: "ALIŞ", satis_iade: "SATIŞ İADE", alis_iade: "ALIŞ İADE" };
const docName = d => d.doc_kind === "earsiv" ? "e-Arşiv fatura" : d.doc_kind === "efatura" ? "e-Fatura" : ({ satis: "Bilgi fişi", alis: "Alış fişi", satis_iade: "Satış iade fişi", alis_iade: "Alış iade fişi" })[d.type];
const PAYN = { nakit: "Nakit", kart: "Kredi kartı", havale: "Havale/EFT", veresiye: "Veresiye" };
function buildText(doc) {
  const w = PW(), st = S(), L = [], line = "-".repeat(w); const c = doc.party; const inv = doc.doc_kind === "earsiv" || doc.doc_kind === "efatura";
  L.push({ t: st.firm || "SEYYAR SATIŞ", c: 1, b: 1 });
  wrap(st.address, w).forEach(x => L.push({ t: x, c: 1 }));
  if (st.phone) L.push({ t: "Tel: " + st.phone, c: 1 });
  if (inv && st.vkn) L.push({ t: (st.taxOffice ? st.taxOffice + " VD " : "") + (st.vkn.length === 11 ? "TCKN " : "VKN ") + st.vkn, c: 1 });
  L.push(line);
  if (inv) L.push({ t: doc.doc_kind === "efatura" ? "e-FATURA" : "e-ARŞİV FATURA", c: 1, b: 1 });
  else { L.push({ t: doc.type === "satis" ? "BİLGİ FİŞİ" : DOC_TITLES[doc.type] + " FİŞİ", c: 1, b: 1 }); if (doc.type === "satis") L.push({ t: "*** MALİ DEĞERİ YOKTUR ***", c: 1 }); }
  const no = doc.no || "(gönderim bekliyor)";
  if (("No: " + no + " " + fdt(doc.date)).length <= w) L.push(lr("No: " + no, fdt(doc.date), w)); else { L.push("No: " + no); L.push("Tarih: " + fdt(doc.date)); }
  if (doc.ettn && inv) { L.push("ETTN:"); L.push(doc.ettn); }
  if (c) { L.push(line); L.push("Sayın: " + c.name); if (inv) { if (c.vkn) L.push((c.vkn.length === 11 ? "TCKN: " : "VKN: ") + c.vkn + (c.tax_office ? " / " + c.tax_office : "")); wrap([c.address, c.district, c.city].filter(Boolean).join(" "), w).forEach(x => L.push(x)); } }
  L.push(line);
  doc.lines.forEach(i => { wrap(i.name, w).forEach(x => L.push(x)); L.push(lr("  " + qf(i.qty) + " " + (i.unit || "") + " x " + nf(i.price) + (inv ? " %" + i.vat : ""), nf(i.qty * i.price), w)); });
  L.push(line);
  if (doc.discount) { L.push(lr("Ara toplam", nf(doc.gross), w)); L.push(lr("İskonto", "-" + nf(doc.discount), w)); }
  if (inv) { const vb = vatBreak(doc); let tv = 0; Object.keys(vb).sort((a, b) => a - b).forEach(k => { tv += vb[k].vat; L.push(lr("Matrah %" + k, nf(vb[k].base), w)); L.push(lr("KDV %" + k, nf(vb[k].vat), w)); }); L.push(lr("Toplam KDV", nf(r2(tv)), w)); }
  L.push({ t: lr("TOPLAM", nf(doc.total) + " TL", w), b: 1 });
  if (inv) wrap("Yalnız: " + yaziyla(doc.total), w).forEach(x => L.push(x));
  L.push(lr("Ödeme", PAYN[doc.pay_method] || doc.pay_method, w));
  if (doc.pay_method === "veresiye") { if (doc.paid) L.push(lr("Peşin", nf(doc.paid), w)); L.push(lr("Hesaba yazılan", nf(doc.credit), w)); if (doc.party_id && !doc.pending) L.push(lr("Güncel bakiye", nf(balance(doc.party_id)), w)); }
  if (doc.status === "iptal") L.push({ t: "*** İPTAL EDİLMİŞTİR ***", c: 1, b: 1 });
  L.push(line);
  if (doc.doc_kind === "earsiv") { L.push({ t: "e-Arşiv izni kapsamında", c: 1 }); L.push({ t: "elektronik ortamda iletilmiştir.", c: 1 }); }
  if (st.footer && doc.type === "satis") wrap(st.footer, w).forEach(x => L.push({ t: x, c: 1 }));
  return L;
}
function linesToText(L) { const w = PW(); return L.map(x => { if (typeof x === "string") return x; const t = String(x.t); return x.c ? " ".repeat(Math.max(0, Math.floor((w - t.length) / 2))) + t : t; }).join("\n"); }
function yaziyla(n) {
  const b = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"], o = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"], grp = ["", "Bin", "Milyon", "Milyar", "Trilyon"];
  const three = x => { const y = Math.floor(x / 100), t = Math.floor(x % 100 / 10), u = x % 10; return (y ? (y === 1 ? "" : b[y]) + "Yüz" : "") + o[t] + b[u]; };
  const words = x => { if (x === 0) return "Sıfır"; let s = "", g = 0; while (x > 0) { const p = x % 1000; if (p) s = (g === 1 && p === 1 ? "" : three(p)) + grp[g] + s; x = Math.floor(x / 1000); g++; } return s; };
  n = r2(n); const t = Math.floor(n), k = Math.round((n - t) * 100);
  return words(t) + " Türk Lirası" + (k ? " " + words(k) + " Kuruş" : "");
}
const CP857 = { "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85, "ç": 0x87, "ê": 0x88, "ë": 0x89, "è": 0x8A, "ï": 0x8B, "î": 0x8C, "ı": 0x8D, "Ä": 0x8E, "É": 0x90, "ô": 0x93, "ö": 0x94, "ò": 0x95, "û": 0x96, "ù": 0x97, "İ": 0x98, "Ö": 0x99, "Ü": 0x9A, "Ş": 0x9E, "ş": 0x9F, "á": 0xA0, "í": 0xA1, "ó": 0xA2, "ú": 0xA3, "ñ": 0xA4, "Ñ": 0xA5, "Ğ": 0xA6, "ğ": 0xA7, "Â": 0xB6, "Î": 0xD7, "Û": 0xEA };
const ASC = { "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ş": "s", "Ş": "S", "ü": "u", "Ü": "U", "â": "a", "Â": "A", "î": "i", "Î": "I", "û": "u", "Û": "U", "₺": "TL" };
function encLine(s) {
  const out = []; const cp = setting("charset") === "cp857";
  for (const ch of String(s)) {
    const code = ch.charCodeAt(0);
    if (code < 128) { out.push(code); continue; }
    if (cp && CP857[ch] !== undefined) { out.push(CP857[ch]); continue; }
    const a = ASC[ch]; if (a) { for (const x of a) out.push(x.charCodeAt(0)); continue; }
    const n = ch.normalize("NFD").replace(/[̀-ͯ]/g, ""); out.push(n.charCodeAt(0) < 128 ? n.charCodeAt(0) : 63);
  }
  return out;
}
function escpos(lines) {
  const b = [0x1B, 0x40];
  if (setting("charset") === "cp857") b.push(0x1B, 0x74, (+setting("codepage")) & 255);
  for (let L of lines) { if (typeof L === "string") L = { t: L }; b.push(0x1B, 0x61, L.c ? 1 : 0, 0x1B, 0x45, L.b ? 1 : 0, 0x1D, 0x21, L.big ? 0x11 : 0x00); b.push(...encLine(L.t), 0x0A); }
  b.push(0x1B, 0x45, 0, 0x1D, 0x21, 0, 0x1B, 0x61, 0, 0x1B, 0x64, 4, 0x1D, 0x56, 0x42, 0x00);
  return new Uint8Array(b);
}
let bt = { dev: null, ch: null };
const BT_SERVICES = ["000018f0-0000-1000-8000-00805f9b34fb", "e7810a71-73ae-499d-8c15-faa9aef0c3f2", "49535343-fe7d-4ae5-8fa9-9fafd205e455", "0000ff00-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "0000fee7-0000-1000-8000-00805f9b34fb"];
// Yazıcı rozeti yalnızca sorun varken görünür: BT yazıcı daha önce kullanılmış ama şu an bağlı değil
function updPrnPill() { const p = $("#prnPill"); if (!p) return; const m = setting("printMode");
  if (m === "bt" && !bt.ch && (bt.dev || lsGet("ss_btused", false))) { p.style.display = ""; p.textContent = "🖨 Yazıcıyı bağla"; p.className = "pill warn"; p.onclick = () => btConnect(!bt.dev); }
  else { p.style.display = "none"; p.onclick = null; } }
async function btConnect(interactive) {
  if (!navigator.bluetooth) { dialog(`<h3>Bluetooth kullanılamıyor</h3><div class="hint">Bu tarayıcı doğrudan Bluetooth yazıcı bağlantısını desteklemiyor. Android'de <b>Chrome</b> kullanın. iPhone/iPad'de Daha → Ayarlar → Yazıcı bölümünden “Sistem yazdırma”yı seçin.</div><div class="acts"><button class="btn pri" data-close>Tamam</button></div>`); return false; }
  try {
    if (!bt.dev || interactive) { bt.dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES }); bt.dev.addEventListener("gattserverdisconnected", () => { bt.ch = null; updPrnPill(); }); }
    const srv = await bt.dev.gatt.connect(); let found = null;
    for (const u of BT_SERVICES) { try { const s = await srv.getPrimaryService(u); for (const c of await s.getCharacteristics()) { if (c.properties.write || c.properties.writeWithoutResponse) { found = c; break; } } } catch (e) { } if (found) break; }
    if (!found) { try { for (const s of await srv.getPrimaryServices()) { for (const c of await s.getCharacteristics()) { if (c.properties.write || c.properties.writeWithoutResponse) { found = c; break; } } if (found) break; } } catch (e) { } }
    if (!found) throw new Error("Yazma kanalı bulunamadı");
    bt.ch = found; lsSet("ss_btused", true); updPrnPill(); toast("Yazıcı bağlandı: " + (bt.dev.name || "")); return true;
  } catch (e) { if (e && e.name !== "NotFoundError") toast("Bağlanamadı: " + (e.message || e)); updPrnPill(); return false; }
}
async function btWrite(data) { for (let i = 0; i < data.length; i += 180) { const part = data.slice(i, i + 180); if (bt.ch.properties.writeWithoutResponse && bt.ch.writeValueWithoutResponse) { await bt.ch.writeValueWithoutResponse(part); await new Promise(r => setTimeout(r, 25)); } else await bt.ch.writeValue(part); } }
function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
async function printLines(lines) {
  const copies = Math.max(1, Math.min(5, +setting("copies") || 1)); const mode = setting("printMode");
  if (mode === "system") { systemPrint(`<div class="thermal" style="width:${+setting("paper") === 80 ? "72mm" : "48mm"}">${lines.map(L => { L = typeof L === "string" ? { t: L } : L; return `<div style="text-align:${L.c ? "center" : "left"};font-weight:${L.b ? 700 : 400}">${esc(L.t) || "&nbsp;"}</div>`; }).join("")}</div>`); return; }
  let data = escpos(lines);
  if (copies > 1) { const all = new Uint8Array(data.length * copies); for (let i = 0; i < copies; i++) all.set(data, i * data.length); data = all; }
  if (mode === "rawbt") { const a = document.createElement("a"); a.href = "rawbt:base64," + b64(data); document.body.appendChild(a); a.click(); a.remove(); return; }
  if (!bt.ch) { const ok = await btConnect(!bt.dev); if (!ok) return; }
  try { await btWrite(data); toast("Yazdırıldı"); }
  catch (e) { bt.ch = null; const ok = await btConnect(false); if (ok) { try { await btWrite(data); toast("Yazdırıldı"); return; } catch (_) { } } toast("Yazdırılamadı: " + (e.message || e)); updPrnPill(); }
}
function systemPrint(html) { const pa = $("#printArea"); pa.innerHTML = html; try { window.print(); } catch (e) { toast("Yazdırma açılamadı"); } setTimeout(() => { pa.innerHTML = ""; }, 1500); }
function printDoc(doc) { printLines(buildText(doc)); }
function printA4(doc) {
  const st = S(), c = doc.party, vb = vatBreak(doc), inv = doc.doc_kind === "earsiv" || doc.doc_kind === "efatura";
  const title = inv ? (doc.doc_kind === "efatura" ? "e-FATURA" : "e-ARŞİV FATURA") : (doc.type === "satis" ? "BİLGİ FİŞİ" : DOC_TITLES[doc.type] + " FİŞİ");
  systemPrint(`<div class="inv">
   <div class="hd"><div class="box"><b style="font-size:15px">${esc(st.firm || "Firma adı")}</b><br>${esc(st.address)} ${esc(st.city)}<br>Tel: ${esc(st.phone)} ${st.email ? " · " + esc(st.email) : ""}<br>${esc(st.taxOffice)} VD · ${st.vkn.length === 11 ? "TCKN" : "VKN"}: ${esc(st.vkn)}${st.mersis ? "<br>MERSİS: " + esc(st.mersis) : ""}</div>
    <div class="box" style="text-align:right"><b style="font-size:18px">${title}</b><br>No: <b>${esc(doc.no || "-")}</b><br>Tarih: ${fdt(doc.date)}${inv ? `<br>Senaryo: ${doc.doc_kind === "efatura" ? esc(st.efaturaProfile) : "EARSIVFATURA"}<br>Tip: ${doc.type === "satis_iade" ? "İADE" : "SATIŞ"}<br><span style="font-size:10px">ETTN: ${esc(doc.ettn || "")}</span>` : (doc.type === "satis" ? "<br><i>Mali değeri yoktur</i>" : "")}</div></div>
   <div class="box" style="margin-bottom:10px"><b>${doc.type.startsWith("alis") ? "TEDARİKÇİ" : "SAYIN"}</b><br>${c ? `${esc(c.name)}<br>${esc([c.address, c.district, c.city].filter(Boolean).join(" "))}<br>${c.vkn ? (c.vkn.length === 11 ? "TCKN: " : "VKN: ") + esc(c.vkn) : ""} ${c.tax_office ? " · " + esc(c.tax_office) + " VD" : ""} ${c.phone ? " · Tel: " + esc(c.phone) : ""}` : "Nihai tüketici"}</div>
   <table><tr><th>#</th><th>Mal / Hizmet</th><th class="r">Miktar</th><th class="r">Birim fiyat (KDV hariç)</th><th class="r">KDV %</th><th class="r">KDV tutarı</th><th class="r">Tutar (KDV dahil)</th></tr>
   ${doc.lines.map((i, ix) => { const g = i.qty * i.price, base = g / (1 + i.vat / 100); return `<tr><td>${ix + 1}</td><td>${esc(i.name)}</td><td class="r">${qf(i.qty)} ${esc(i.unit || "")}</td><td class="r">${nf(i.price / (1 + i.vat / 100))}</td><td class="r">${i.vat}</td><td class="r">${nf(g - base)}</td><td class="r">${nf(g)}</td></tr>`; }).join("")}
   </table>
   <table style="width:55%;margin-left:45%;margin-top:8px">
    ${doc.discount ? `<tr><td>Ara toplam</td><td class="r">${nf(doc.gross)}</td></tr><tr><td>İskonto</td><td class="r">-${nf(doc.discount)}</td></tr>` : ""}
    ${Object.keys(vb).sort((a, b) => a - b).map(k => `<tr><td>Matrah (%${k})</td><td class="r">${nf(vb[k].base)}</td></tr><tr><td>Hesaplanan KDV (%${k})</td><td class="r">${nf(vb[k].vat)}</td></tr>`).join("")}
    <tr><td><b>Genel toplam</b></td><td class="r"><b>${nf(doc.total)} TL</b></td></tr></table>
   <p><b>Yalnız:</b> ${yaziyla(doc.total)}</p>
   <p>Ödeme şekli: ${PAYN[doc.pay_method] || ""}${doc.due_date ? " · Vade: " + fd(doc.due_date) : ""}${doc.status === "iptal" ? " · <b>İPTAL</b>" : ""}</p>
   ${doc.note ? `<p>Not: ${esc(doc.note)}</p>` : ""}
  </div>`);
}

/* =================== e-Belge: UBL-TR =================== */
const xe = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const a2 = n => r2(n).toFixed(2);
function partyXml(p, isSupplier) {
  const id = (p.vkn || "").replace(/\D/g, "") || "11111111111"; const scheme = id.length === 11 ? "TCKN" : "VKN"; let nameXml = "";
  if (scheme === "TCKN") { const parts = String(p.name || "").trim().split(/\s+/); const fam = parts.length > 1 ? parts.pop() : "-"; nameXml = `<cac:Person><cbc:FirstName>${xe(parts.join(" ") || p.name)}</cbc:FirstName><cbc:FamilyName>${xe(fam)}</cbc:FamilyName></cac:Person>`; }
  return `<cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${scheme}">${id}</cbc:ID></cac:PartyIdentification>
      ${isSupplier && p.mersis ? `<cac:PartyIdentification><cbc:ID schemeID="MERSISNO">${xe(p.mersis)}</cbc:ID></cac:PartyIdentification>` : ""}
      ${scheme === "VKN" ? `<cac:PartyName><cbc:Name>${xe(p.name)}</cbc:Name></cac:PartyName>` : ""}
      <cac:PostalAddress><cbc:StreetName>${xe(p.address || "-")}</cbc:StreetName><cbc:CitySubdivisionName>${xe(p.district || p.city || "-")}</cbc:CitySubdivisionName><cbc:CityName>${xe(p.city || "-")}</cbc:CityName><cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country></cac:PostalAddress>
      ${p.tax_office ? `<cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${xe(p.tax_office)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
      ${(p.phone || p.email) ? `<cac:Contact>${p.phone ? `<cbc:Telephone>${xe(p.phone)}</cbc:Telephone>` : ""}${p.email ? `<cbc:ElectronicMail>${xe(p.email)}</cbc:ElectronicMail>` : ""}</cac:Contact>` : ""}
      ${nameXml}
    </cac:Party>`;
}
function buildUBL(doc) {
  const st = S();
  const sup = { name: st.firm || st.owner, vkn: st.vkn, tax_office: st.taxOffice, address: st.address, city: st.city, phone: st.phone, email: st.email, mersis: st.mersis };
  const cus = doc.party || { name: "Nihai Tüketici", vkn: "11111111111" };
  const d = new Date(doc.date); const date = ymd(d), time = d.toTimeString().slice(0, 8);
  const profile = doc.doc_kind === "earsiv" ? "EARSIVFATURA" : (st.efaturaProfile || "TICARIFATURA");
  const ratio = doc.gross ? doc.total / doc.gross : 1;
  const UC = { Adet: "C62", Kutu: "BX", Paket: "PA", Koli: "CT", Kg: "KGM", Gram: "GRM", "Düzine": "DZN", Litre: "LTR", Metre: "MTR" };
  const lines = doc.lines.map((i, ix) => {
    const g = i.qty * i.price * ratio; const base = r2(g / (1 + i.vat / 100)); const vat = r2(g - base); const unitNet = i.price / (1 + i.vat / 100);
    const grossBase = r2(i.qty * unitNet); const disc = r2(grossBase - base);
    return `  <cac:InvoiceLine>
    <cbc:ID>${ix + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${UC[i.unit] || "C62"}">${i.qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${a2(base)}</cbc:LineExtensionAmount>
    ${disc > 0 ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:Amount currencyID="TRY">${a2(disc)}</cbc:Amount><cbc:BaseAmount currencyID="TRY">${a2(grossBase)}</cbc:BaseAmount></cac:AllowanceCharge>` : ""}
    <cac:TaxTotal><cbc:TaxAmount currencyID="TRY">${a2(vat)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="TRY">${a2(base)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="TRY">${a2(vat)}</cbc:TaxAmount><cbc:Percent>${i.vat}</cbc:Percent><cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
    <cac:Item><cbc:Name>${xe(i.name)}</cbc:Name>${i.barcode ? `<cac:SellersItemIdentification><cbc:ID>${xe(i.barcode)}</cbc:ID></cac:SellersItemIdentification>` : ""}</cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="TRY">${unitNet.toFixed(4)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
  });
  const vb = vatBreak(doc);
  const subs = Object.keys(vb).sort((a, b) => a - b).map(k => `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="TRY">${a2(vb[k].base)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="TRY">${a2(vb[k].vat)}</cbc:TaxAmount><cbc:Percent>${k}</cbc:Percent><cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`).join("");
  const totalVat = r2(Object.values(vb).reduce((a, v) => a + v.vat, 0)); const totalBase = r2(Object.values(vb).reduce((a, v) => a + v.base, 0));
  const grossNet = r2(doc.lines.reduce((a, i) => a + i.qty * i.price / (1 + i.vat / 100), 0));
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${profile}</cbc:ProfileID>
  <cbc:ID>${xe(doc.no)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${xe(String(doc.ettn || "").toUpperCase())}</cbc:UUID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${doc.type === "satis_iade" ? "IADE" : "SATIS"}</cbc:InvoiceTypeCode>
  <cbc:Note>Yalnız: ${xe(yaziyla(doc.total))}</cbc:Note>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${doc.lines.length}</cbc:LineCountNumeric>
  ${doc.doc_kind === "earsiv" ? `<cac:AdditionalDocumentReference><cbc:ID>ELEKTRONIK</cbc:ID><cbc:IssueDate>${date}</cbc:IssueDate><cbc:DocumentTypeCode>SEND_TYPE</cbc:DocumentTypeCode></cac:AdditionalDocumentReference>` : ""}
  <cac:AccountingSupplierParty>
    ${partyXml(sup, true)}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    ${partyXml(cus, false)}
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>${({ nakit: "10", kart: "48", havale: "42", veresiye: "1" })[doc.pay_method] || "1"}</cbc:PaymentMeansCode>${doc.due_date ? `<cbc:PaymentDueDate>${doc.due_date}</cbc:PaymentDueDate>` : ""}</cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="TRY">${a2(totalVat)}</cbc:TaxAmount>${subs}</cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${a2(totalBase)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${a2(totalBase)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${a2(doc.total)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="TRY">${a2(Math.max(0, grossNet - totalBase))}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="TRY">${a2(doc.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines.join("\n")}
</Invoice>`;
}
