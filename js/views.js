"use strict";
/* =================== YÖNLENDİRME =================== */
let R = { v: "satis", p: {} }; let stack = []; let renderTok = 0;
const NAV_FULL = [["satis", "Satış"], ["stok", "Ürünler"], ["cari", "Müşteriler"], ["menu", "Daha"]];
const NAV_SIMPLE = [["satis", "Satış"], ["cari", "Müşteriler"], ["menu", "Daha"]];
const ICON_FOR = { satis: "satis", stok: "stok", cari: "cari", kasa: "kasa", menu: "menu" };
const TITLES = { satis: "Satış", stok: "Ürünler", cari: "Müşteriler", kasa: "Kasa", rapor: "Raporlar", menu: "Daha", doc: "", urun: "Ürün", caridetay: "Müşteri / Tedarikçi", belgeler: "Belgeler", sayim: "Stok sayımı", ayarlar: "Ayarlar", kullanicilar: "Kullanıcılar", kuyruk: "Bekleyen işlemler", yedek: "Yedek & dışa aktar", toplufiyat: "Toplu fiyat güncelleme", gunsonu: "Gün sonu" };
// Basit mod: personel için zorunlu olabilir (ayar), yönetici kendi cihazında seçer
function isSimple() { if (!isAdmin() && S().staffSimple !== false) return true; return lsGet("ss_mode", "gelismis") === "basit"; }
function navList() { return isSimple() ? NAV_SIMPLE : NAV_FULL; }
function go(v, p = {}, push = true) {
  if (navList().some(n => n[0] === v)) stack = []; else if (push) stack.push(R);
  R = { v, p }; render(); window.scrollTo(0, 0);
}
function back() { if (stack.length) { R = stack.pop(); render(); } else go("satis"); }
function render() {
  if (!API.sess) return vLogin();
  if (D.role === null && !D.loadedAt) return vNoAccess();
  document.body.classList.remove("auth");
  const cur = stack.length ? stack[0].v : R.v;
  $("#nav").innerHTML = navList().map(([k, t]) => `<button data-v="${k}" class="${cur === k ? "act" : ""}">${ICONS[ICON_FOR[k]]}<span>${t}</span></button>`).join("");
  $$("#nav button").forEach(b => b.onclick = () => go(b.dataset.v));
  $("#backBtn").style.display = stack.length ? "" : "none";
  $("#ttl").textContent = R.v === "doc" ? DOC_LABEL[R.p.type] : (TITLES[R.v] || "");
  renderTok++;
  const fn = VIEWS[R.v]; if (fn) fn(R.p); updPrnPill(); setOnline(online);
}
function refreshView() { if (R.v === "doc" || R.v === "satis") return; render(); }
const DOC_LABEL = { satis: "Satış", satis_iade: "Satış iadesi", alis: "Alış girişi", alis_iade: "Alış iadesi" };
function actionSheet(title, items) {
  dialog(`<h3>${esc(title)}</h3><div class="sheet">${items.filter(Boolean).map((it, i) => `<button class="btn block ${it.bad ? "bad" : ""}" data-i="${i}" style="justify-content:flex-start">${it.icon || ""}${esc(it.t)}${it.s ? `<span class="small muted" style="margin-left:auto;font-weight:400">${esc(it.s)}</span>` : ""}</button>`).join("")}</div><div class="acts"><button class="btn" data-close>Kapat</button></div>`, (d, close) => {
    const list = items.filter(Boolean);
    $$("[data-i]", d).forEach(b => b.onclick = () => { close(); list[+b.dataset.i].f(); });
  });
}
const invoicing = () => !!S().invoicing;

/* =================== GİRİŞ =================== */
function vLogin() {
  document.body.classList.add("auth");
  $("#app").innerHTML = `<div class="login">
    <div class="logo">${ICONS.satis}</div>
    <h1>Seyyar Satış</h1><div class="muted small" style="margin-bottom:16px">Satış · Stok · Cari · Kasa</div>
    <div class="seg" id="lm"><button data-m="in" class="on">Giriş yap</button><button data-m="up">Kayıt ol</button></div>
    <label>E-posta</label><input id="le" type="email" inputmode="email" autocomplete="username" value="${esc(lsGet("ss_lastEmail", ""))}">
    <label>Şifre</label><input id="lp" type="password" autocomplete="current-password">
    <button class="btn pri block" id="lb" style="margin-top:14px">Giriş yap</button>
    <button class="btn block" id="lf" style="margin-top:8px;border:0;background:none;color:var(--muted)">Şifremi unuttum</button>
    <div class="hint" id="lh">İlk kaydolan kişi <b>yönetici</b> olur. Diğer çalışanları yönetici, Daha → Kullanıcılar'dan e-postalarıyla ekler; sonra onlar bu ekrandan kayıt olur.</div>
  </div>`;
  let mode = "in";
  $$("#lm button").forEach(b => b.onclick = () => { mode = b.dataset.m; $$("#lm button").forEach(x => x.classList.toggle("on", x === b)); $("#lb").textContent = mode === "in" ? "Giriş yap" : "Kayıt ol"; $("#lp").autocomplete = mode === "in" ? "current-password" : "new-password"; });
  const submit = () => busy($("#lb"), async () => {
    const e = $("#le").value.trim().toLowerCase(), p = $("#lp").value;
    if (!e || !p) throw new Error("E-posta ve şifre girin");
    lsSet("ss_lastEmail", e);
    if (mode === "up") {
      const j = await API.signup(e, p);
      if (j.access_token) { API.setFromToken(j); return afterLogin(); }
      $("#lh").innerHTML = `<b>Doğrulama e-postası gönderildi.</b> ${esc(e)} adresine gelen bağlantıya tıklayın, sonra buradan giriş yapın.`;
      $$("#lm button")[0].click();
      return;
    }
    await API.login(e, p); await afterLogin();
  });
  $("#lb").onclick = submit; $("#lp").onkeydown = ev => { if (ev.key === "Enter") submit(); };
  $("#lf").onclick = async () => { const e = $("#le").value.trim(); if (!e) return toast("Önce e-postanızı yazın"); try { await API.recover(e); toast("Şifre sıfırlama bağlantısı gönderildi"); } catch (er) { toast(er.message); } };
}
async function afterLogin() {
  const r = await loadAll();
  if (r === "noaccess") return vNoAccess();
  go("satis"); maybeWizard();
}
function maybeWizard() { if (isAdmin() && !S().setupDone && !S().firm && !D.products.length) setTimeout(setupWizard, 300); }
function vNoAccess() {
  document.body.classList.add("auth");
  $("#app").innerHTML = `<div class="login"><h1>Erişim bekleniyor</h1>
    <p class="muted">${esc(API.email || "")} hesabı bu işletmeye eklenmemiş. Yöneticiden Daha → Kullanıcılar bölümüne e-postanızı eklemesini isteyin.</p>
    <button class="btn pri block" id="rc">Tekrar dene</button><button class="btn block" id="lo" style="margin-top:8px">Çıkış yap</button></div>`;
  $("#rc").onclick = () => busy($("#rc"), async () => { const r = await loadAll(); if (r === "ok") go("satis"); else if (r === "noaccess") toast("Henüz eklenmemiş"); });
  $("#lo").onclick = async () => { await API.logout(); vLogin(); };
}

/* =================== BELGE / SATIŞ EKRANI =================== */
const carts = lsGet("ss_carts", {});
function newCart(type) { return { items: [], partyId: "", mode: type.startsWith("satis") ? "perakende" : "alis", discount: 0, docKind: "fis", pay: "nakit", paid: "", due: "", note: "", supDocNo: "", updateCost: true, refDoc: null }; }
function cartOf(type) { if (!carts[type]) carts[type] = newCart(type); return carts[type]; }
const saveCarts = debounce(() => lsSet("ss_carts", carts), 300);
const isBuy = t => t === "alis" || t === "alis_iade";
function priceFor(p, type, mode) { if (isBuy(type)) return +p.cost || 0; return +p.retail || 0; }
function cartTotals(c) { const gross = r2(c.items.reduce((a, i) => a + r2(i.qty * i.price), 0)); const disc = Math.min(r2(pnum(c.discount)), gross); return { gross, disc, total: r2(gross - disc) }; }
function searchProducts(q, includePassive) {
  q = q.trim(); if (!q) return [];
  const exact = D.products.filter(p => (p.barcode && p.barcode === q) || (p.code && p.code === q)); if (exact.length) return exact;
  const words = fold(q).split(/\s+/);
  return D.products.filter(p => (includePassive || p.active !== false) && words.every(w => fold(p.name + " " + (p.category || "") + " " + (p.brand || "") + " " + (p.barcode || "") + " " + (p.code || "")).includes(w))).slice(0, 40);
}
function addLine(type, p, qty = 1) {
  const c = cartOf(type); const ex = c.items.find(i => i.pid === p.id);
  if (ex) ex.qty = r2(ex.qty + qty); else c.items.unshift({ pid: p.id, name: p.name, barcode: p.barcode || "", unit: p.unit || "Adet", vat: +p.vat, price: priceFor(p, type, c.mode), qty });
  if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { }
  saveCarts();
}
/* --- hızlı ürünler: sabitlenenler + en çok satanlar --- */
function quickProducts() {
  const pins = (S().quick || []).map(prodById).filter(p => p && p.active !== false);
  const cnt = {};
  D.docs.filter(d => d.type === "satis" && d.status !== "iptal").forEach(d => d.lines.forEach(l => { if (l.product_id) cnt[l.product_id] = (cnt[l.product_id] || 0) + l.qty; }));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id]) => prodById(id)).filter(p => p && p.active !== false && !pins.includes(p));
  let list = pins.concat(top);
  if (list.length < 8) list = list.concat(D.products.filter(p => p.active !== false && !list.includes(p)).slice(0, 8 - list.length));
  return list.slice(0, 16);
}
function quickEditDialog(after) {
  let pins = [...(S().quick || [])];
  dialog(`<h3>Hızlı ürünler</h3><div class="small muted">Yıldızlı ürünler satış ekranında her zaman en başta durur. Kalan yerleri en çok satanlar doldurur.</div><input id="qq" placeholder="Ürün ara" style="margin-top:8px"><div class="list" id="ql" style="max-height:50vh;overflow:auto"></div><div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="ok">Kaydet</button></div>`, (d, close) => {
    const draw = () => { const f = fold(d.querySelector("#qq").value); const l = D.products.filter(p => p.active !== false && (!f || fold(p.name + " " + (p.barcode || "")).includes(f))).sort((a, b) => (pins.includes(b.id) - pins.includes(a.id)) || a.name.localeCompare(b.name, "tr")).slice(0, 80);
      d.querySelector("#ql").innerHTML = l.map(p => `<div class="it click" data-s="${p.id}"><span class="star ${pins.includes(p.id) ? "on" : ""}">★</span><div class="grow t">${esc(p.name)}</div><span class="muted small num">${tl(p.retail)}</span></div>`).join("") || '<div class="empty">Ürün yok</div>';
      $$("[data-s]", d).forEach(el => el.onclick = () => { const id = el.dataset.s; pins = pins.includes(id) ? pins.filter(x => x !== id) : pins.concat(id).slice(-16); draw(); }); };
    d.querySelector("#qq").oninput = draw; draw();
    d.querySelector("#ok").onclick = () => busy(d.querySelector("#ok"), async () => { await saveShared({ quick: pins }); close(); if (after) after(); });
  });
}
async function saveShared(patch) { D.settings = { ...S(), ...patch }; saveCache(); await writeNowOrQueue({ kind: "upsert", table: "settings", rows: [{ id: 1, data: D.settings }], label: "Ayarlar" }); }
/* --- bugünün özeti --- */
function todayStats() {
  const t0 = startOfDay(new Date());
  const docs = D.docs.filter(d => new Date(d.date) >= t0 && d.status !== "iptal");
  const sales = r2(sum(docs.filter(d => d.type === "satis"), d => d.total) - sum(docs.filter(d => d.type === "satis_iade"), d => d.total));
  const n = docs.filter(d => d.type === "satis").length;
  const kasa = sum(D.accounts.filter(a => a.type === "kasa" && a.active !== false), a => D.abal[a.id] || 0);
  const rec = sum(D.parties, c => Math.max(0, balance(c.id)));
  const low = D.products.filter(p => p.active !== false && p.stock <= (p.min_stock || 0)).length;
  return { sales, n, kasa, rec, low };
}
function todayStrip() {
  if (!isAdmin() || isSimple()) return "";
  const s = todayStats();
  return `<div class="today" id="today"><div><span class="k">Bugün</span><b class="num">${tl(s.sales)}</b><span class="k">${s.n} satış</span></div><div><span class="k">Kasa</span><b class="num">${tl(s.kasa)}</b></div><div><span class="k">Veresiye</span><b class="num">${tl(s.rec)}</b></div>${s.low ? `<div><span class="k">Azalan</span><b class="warnc">${s.low}</b></div>` : ""}</div>`;
}

/* --- belge / satış ekranı (sade) --- */
function vDoc(p) {
  const type = p.type || "satis"; const c = cartOf(type); const t = cartTotals(c); const party = partyById(c.partyId);
  const buy = isBuy(type); const inv = invoicing() && !buy && c.docKind === "fatura";
  const kindNow = inv ? (party && party.efatura ? "efatura" : "earsiv") : "fis";
  const hadQ = $("#q") && $("#q").dataset.type === type ? $("#q").value : "";
  const showGrid = type === "satis" && !hadQ;
  const qp = showGrid ? quickProducts() : [];
  const otherOpen = c.otherOpen;
  const payBtns = buy || type === "satis_iade" ? [["nakit", "Nakit"], ["kart", "Kart"], ["veresiye", "Hesaba"]] : [["nakit", "Nakit"], ["kart", "Kart"], ["veresiye", "Veresiye"]];
  $("#app").innerHTML = `
  ${type === "satis" ? todayStrip() : ""}
  <div class="pos">
   <div>
    ${type !== "satis" ? `<div class="banner ${buy ? "b-buy" : "b-ret"}">${DOC_LABEL[type]}${c.refDoc ? " · " + esc(c.refDoc) + " referanslı" : ""}</div>` : ""}
    <div class="row" style="margin-bottom:10px">
      <div class="searchbox grow"><input id="q" data-type="${type}" class="bigin" placeholder="Barkod okut ya da ürün ara…" autocomplete="off" enterkeyhint="search" value="${esc(hadQ)}"><div class="results" id="res" style="display:none"></div></div>
      <button class="btn iconbtn big1" id="camBtn" title="Kamera ile barkod oku">${ICONS.cam}</button>
    </div>
    ${showGrid ? `<div class="qgrid">${qp.map(x => { const inCart = c.items.find(i => i.pid === x.id); return `<button class="qt ${inCart ? "in" : ""}" data-qp="${x.id}"><span class="qn">${esc(x.name)}</span><span class="qp num">${tl(priceFor(x, type, c.mode))}</span>${inCart ? `<span class="qc">${qf(inCart.qty)}</span>` : ""}</button>`; }).join("")}${isAdmin() ? `<button class="qt qe" id="qEdit">★<span class="qn">Düzenle</span></button>` : ""}</div>` : ""}
    ${c.items.length ? `<div class="card">
      <div class="row"><h3 class="grow" style="margin:0">Sepet <span class="muted small">(${qf(c.items.reduce((a, i) => a + i.qty, 0))} ürün)</span></h3><button class="btn sm bad" id="clr">Temizle</button></div>
      <div class="list" id="cartList">
      ${c.items.map((i, ix) => { const pr = prodById(i.pid); const low = type === "satis" && pr && pr.stock - i.qty < 0; return `
        <div class="it">
          <div class="grow"><div class="t">${esc(i.name)}</div><div class="small muted num"><span data-price="${ix}" class="lnk">${tl(i.price)}</span> × ${qf(i.qty)} = <b style="color:var(--ink)">${tl(i.qty * i.price)}</b>${low ? ' · <span class="danger">stok ' + qf(pr.stock) + "</span>" : ""}</div></div>
          <div class="qty"><button data-dec="${ix}">−</button><input inputmode="decimal" data-q="${ix}" value="${qf(i.qty)}"><button data-inc="${ix}">+</button></div>
        </div>`; }).join("")}
      </div></div>` : (showGrid ? "" : `<div class="card"><div class="empty">${buy ? "Tedarikçiden gelen ürünleri okutun veya arayın." : "Ürün okutun veya arayın."}</div></div>`)}
   </div>
   <div class="side">
    <div class="card">
      <button class="btn block" id="pickParty" style="justify-content:flex-start;text-align:left">${ICONS.cari}<span class="grow">${party ? esc(party.name) : `<span class="muted">${buy ? "Tedarikçi seçin" : "Müşteri (isteğe bağlı)"}</span>`}</span>${party && balance(party.id) ? `<span class="tag ${balance(party.id) > 0 ? "w" : ""}">${tl(balance(party.id))}</span>` : ""}${party ? `<span id="unParty" class="xbtn">${ICONS.x}</span>` : ""}</button>
      <div class="seg big" id="paySeg" style="margin-top:10px">${payBtns.map(([k, l]) => `<button data-p="${k}" class="${c.pay === k || (k === "nakit" && c.pay === "havale" && false) ? "on" : ""}">${l}</button>`).join("")}</div>
      ${c.pay === "havale" ? `<div class="small muted" style="margin-top:4px">Ödeme: Havale/EFT</div>` : ""}
      ${c.pay === "veresiye" ? `<div class="grid2"><div><label>Peşin ${buy ? "ödenen" : "alınan"}</label><input id="paid" inputmode="decimal" placeholder="0,00" value="${esc(c.paid)}"></div><div><label>Vade</label><input id="due" type="date" value="${esc(c.due)}"></div></div>` : ""}
      ${inv ? `<div class="small muted" style="margin-top:6px">${kindNow === "efatura" ? "e-Fatura" : "e-Arşiv fatura"} kesilecek</div>` : ""}
      ${buy ? `<label>Tedarikçi belge no <span class="muted">— varsa</span></label><input id="supDoc" value="${esc(c.supDocNo)}" placeholder="Fatura / irsaliye no">` : ""}
      <details class="other" ${otherOpen ? "open" : ""} id="other"><summary>Diğer seçenekler${(c.discount || c.note || c.pay === "havale" || inv) ? " •" : ""}</summary>
        <div class="grid2"><div><label>İskonto (₺)</label><input id="disc" inputmode="decimal" placeholder="0,00" value="${c.discount ? esc(String(c.discount)) : ""}"></div><div><label>Not</label><input id="note" value="${esc(c.note)}"></div></div>
        <label class="chk"><input type="checkbox" id="havale" ${c.pay === "havale" ? "checked" : ""}> Havale / EFT ile ödendi</label>
        ${invoicing() && !buy ? `<label class="chk"><input type="checkbox" id="fatura" ${c.docKind === "fatura" ? "checked" : ""}> Fatura kes (e-Arşiv / e-Fatura)</label>` : ""}
        ${type === "alis" && canSeeCost() ? `<label class="chk"><input type="checkbox" id="updCost" ${c.updateCost ? "checked" : ""}> Alış fiyatlarını güncelle</label>` : ""}
      </details>
      <div class="row" style="margin-top:12px;align-items:flex-end"><div class="grow"><div class="small muted">Toplam${t.disc ? ` (iskonto −${tl(t.disc)})` : ""}</div><div class="total num">${tl(t.total)}</div></div></div>
      <button class="btn pri block big" id="finish" ${c.items.length ? "" : "disabled"}>${type === "satis" ? (c.pay === "nakit" ? "Ödeme al" : "Satışı tamamla") : "Kaydet"}</button>
    </div>
   </div>
  </div>`;
  const rerender = () => vDoc(p);
  const q = $("#q"), res = $("#res");
  const showRes = () => {
    const list = searchProducts(q.value);
    if (!q.value.trim()) { res.style.display = "none"; return; }
    res.style.display = "block";
    res.innerHTML = list.length ? list.map(pp => `<div class="it" data-pid="${pp.id}"><div class="grow"><div class="t">${esc(pp.name)}</div><div class="small muted">stok <span class="${pp.stock <= 0 ? "danger" : ""}">${qf(pp.stock)}</span></div></div><b class="num">${tl(priceFor(pp, type, c.mode))}</b></div>`).join("")
      : `<div class="empty">Bulunamadı. <button class="btn sm" id="newFromQ">${ICONS.plus} Yeni ürün olarak ekle</button></div>`;
    $$("[data-pid]", res).forEach(el => el.onclick = () => { q.value = ""; addLine(type, prodById(el.dataset.pid)); rerender(); });
    const nb = $("#newFromQ"); if (nb) nb.onclick = () => { const v = q.value.trim(); const isBc = /^\d{6,14}$/.test(v); productDialog(null, { barcode: isBc ? v : "", name: isBc ? "" : v }, np => { q.value = ""; addLine(type, np); rerender(); }); };
  };
  q.oninput = () => { if (!q.value.trim() && type === "satis") return rerender(); showRes(); if (type === "satis" && q.value.trim().length === 1) { const g = $(".qgrid"); if (g) g.remove(); } };
  q.onkeydown = e => {
    if (e.key !== "Enter") return; e.preventDefault();
    const v = q.value.trim(); if (!v) return;
    const byBc = D.products.find(x => x.barcode === v || x.code === v);
    if (byBc) { q.value = ""; addLine(type, byBc); rerender(); return; }
    const l = searchProducts(v); if (l.length === 1) { q.value = ""; addLine(type, l[0]); rerender(); return; }
    if (/^\d{6,14}$/.test(v)) { toast("Bu barkod kayıtlı değil"); productDialog(null, { barcode: v }, np => { q.value = ""; addLine(type, np); rerender(); }); } else showRes();
  };
  if (hadQ) { q.focus(); showRes(); }
  else if (window.matchMedia("(pointer:fine)").matches) q.focus();
  $("#camBtn").onclick = () => scanDialog(code => { const pp = D.products.find(x => x.barcode === code); if (pp) { addLine(type, pp); rerender(); } else { toast("Kayıtsız barkod: " + code); productDialog(null, { barcode: code }, np => { addLine(type, np); rerender(); }); } }, true);
  $$("[data-qp]").forEach(b => b.onclick = () => { addLine(type, prodById(b.dataset.qp)); rerender(); });
  const qe = $("#qEdit"); if (qe) qe.onclick = () => quickEditDialog(rerender);
  const ms = $("#modeSeg"); if (ms) $$("button", ms).forEach(b => b.onclick = () => { c.mode = b.dataset.m; c.items.forEach(i => { const pp = prodById(i.pid); if (pp) i.price = priceFor(pp, type, c.mode); }); c.otherOpen = true; saveCarts(); rerender(); });
  $$("#paySeg button").forEach(b => b.onclick = () => { c.pay = b.dataset.p; saveCarts(); if (c.pay === "veresiye" && !c.partyId) return pickParty(buy ? "tedarikci" : "musteri", id => { c.partyId = id; applyPartyDefaults(c, type); saveCarts(); rerender(); }); rerender(); });
  $("#other").ontoggle = e => { c.otherOpen = e.target.open; saveCarts(); };
  const hv = $("#havale"); if (hv) hv.onchange = () => { c.pay = hv.checked ? "havale" : "nakit"; saveCarts(); rerender(); };
  const ft = $("#fatura"); if (ft) ft.onchange = () => { c.docKind = ft.checked ? "fatura" : "fis"; saveCarts(); rerender(); };
  const clr = $("#clr"); if (clr) clr.onclick = async () => { if (await ask("Sepet temizlensin mi?", "Temizle", true)) { carts[type] = newCart(type); saveCarts(); rerender(); } };
  $$("[data-inc]").forEach(b => b.onclick = () => { c.items[b.dataset.inc].qty = r2(c.items[b.dataset.inc].qty + 1); saveCarts(); rerender(); });
  $$("[data-dec]").forEach(b => b.onclick = () => { const i = c.items[b.dataset.dec]; i.qty = r2(i.qty - 1); if (i.qty <= 0) c.items.splice(b.dataset.dec, 1); saveCarts(); rerender(); });
  $$("[data-q]").forEach(inp => inp.onchange = () => { const v = pnum(inp.value); if (v <= 0) c.items.splice(inp.dataset.q, 1); else c.items[inp.dataset.q].qty = v; saveCarts(); rerender(); });
  $$("[data-price]").forEach(el => el.onclick = async () => { const i = c.items[el.dataset.price]; const v = await prompt2(i.name, "Birim fiyat (KDV dahil)", String(i.price).replace(".", ","), "num"); if (v !== null) { i.price = r2(pnum(v)); saveCarts(); rerender(); } });
  $("#pickParty").onclick = e => { if (e.target.closest("#unParty")) { c.partyId = ""; if (c.pay === "veresiye") c.pay = "nakit";  c.items.forEach(i => { const x = prodById(i.pid); if (x) i.price = priceFor(x, type, c.mode); }); saveCarts(); return rerender(); } pickParty(buy ? "tedarikci" : "musteri", id => { c.partyId = id; applyPartyDefaults(c, type); saveCarts(); rerender(); }); };
  $("#disc").onchange = e => { c.discount = pnum(e.target.value); saveCarts(); rerender(); };
  const pd = $("#paid"); if (pd) pd.oninput = () => { c.paid = pd.value; saveCarts(); };
  const du = $("#due"); if (du) du.onchange = () => { c.due = du.value; saveCarts(); };
  const nt = $("#note"); if (nt) nt.oninput = () => { c.note = nt.value; saveCarts(); };
  const sd = $("#supDoc"); if (sd) sd.oninput = () => { c.supDocNo = sd.value; saveCarts(); };
  const uc = $("#updCost"); if (uc) uc.onchange = () => { c.updateCost = uc.checked; saveCarts(); };
  const td = $("#today"); if (td) td.onclick = () => go("gunsonu", { day: ymd(new Date()) });
  $("#finish").onclick = () => {
    lastGiven = null;
    const run = () => busy($("#finish"), async () => { try { await finishDoc(type, p); } catch (e) { lastGiven = null; throw e; } });
    if (type === "satis" && c.pay === "nakit") return cashSheet(t.total, run);
    run();
  };
}
function applyPartyDefaults(c, type) {
  const pp = partyById(c.partyId); if (!pp || isBuy(type)) return;
  if (pp.due_days && !c.due) c.due = ymd(addDays(new Date(), pp.due_days));
}
/* --- hızlı para alma --- */
let lastGiven = null;
function cashSheet(total, onDone) {
  const opts = [total]; [10, 20, 50, 100, 200, 500, 1000].forEach(s => { const v = Math.ceil(total / s) * s; if (v > total && !opts.includes(v) && opts.length < 6) opts.push(v); });
  dialog(`<div class="cash"><div class="small muted">Ödenecek</div><div class="total num" style="font-size:36px">${tl(total)}</div>
    <div class="small muted" style="margin-top:12px">Müşterinin verdiği</div>
    <div class="cgrid">${opts.map((v, i) => `<button class="btn ${i === 0 ? "pri" : ""}" data-v="${v}">${i === 0 ? "Tam " : ""}${tl(v)}</button>`).join("")}</div>
    <input id="cg" inputmode="decimal" placeholder="Başka tutar" style="margin-top:8px;text-align:center;font-size:20px">
    <div id="chg" class="change"></div>
    <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="ok" style="min-height:56px;font-size:18px">Tamamla</button></div></div>`, (d, close) => {
    let given = total;
    const upd = () => { const ch = r2(given - total); d.querySelector("#chg").innerHTML = given > total ? `Para üstü<b class="num">${tl(ch)}</b>` : given < total && given > 0 ? `<span class="danger">Eksik: ${tl(total - given)}</span>` : ""; };
    $$("[data-v]", d).forEach(b => b.onclick = () => { given = +b.dataset.v; $$("[data-v]", d).forEach(x => x.classList.toggle("pri", x === b)); d.querySelector("#cg").value = ""; upd(); });
    d.querySelector("#cg").oninput = e => { given = pnum(e.target.value) || total; $$("[data-v]", d).forEach(x => x.classList.remove("pri")); upd(); };
    upd();
    d.querySelector("#ok").onclick = () => { if (given < total) return toast("Verilen tutar toplamdan az"); lastGiven = given > total ? { given, change: r2(given - total) } : null; close(); onDone(); };
  });
}
function pickParty(kind, cb) {
  dialog(`<h3>${kind === "tedarikci" ? "Tedarikçi" : "Müşteri"} seç</h3><div class="row"><input id="cq" placeholder="Ad, telefon veya VKN ara"><button class="btn iconbtn pri" id="cnew">${ICONS.plus}</button></div>
   <label class="chk small"><input type="checkbox" id="call"> Tüm carileri göster</label><div class="list" id="cl" style="margin-top:4px;max-height:55vh;overflow:auto"></div>`, (d, close) => {
    const draw = () => {
      const f = fold(d.querySelector("#cq").value); const all = d.querySelector("#call").checked;
      const l = D.parties.filter(c => c.active !== false && (all || c.kind === kind || c.kind === "her_ikisi") && (!f || fold(c.name + " " + (c.phone || "") + " " + (c.vkn || "")).includes(f))).slice(0, 100);
      d.querySelector("#cl").innerHTML = l.length ? l.map(c => `<div class="it" data-c="${c.id}" style="cursor:pointer"><div class="grow"><div class="t">${esc(c.name)} ${c.efatura ? '<span class="tag">e-Fatura</span>' : ""}</div><div class="small muted">${esc([c.district, c.city].filter(Boolean).join(", ") || c.phone || "")}</div></div><span class="num ${balance(c.id) > 0 ? "danger" : balance(c.id) < 0 ? "okc" : "muted"}">${tl(balance(c.id))}</span></div>`).join("") : '<div class="empty">Kayıt yok. + ile ekleyin.</div>';
      $$("[data-c]", d).forEach(el => el.onclick = () => { close(); cb(el.dataset.c); });
    };
    d.querySelector("#cq").oninput = draw; d.querySelector("#call").onchange = draw; draw();
    setTimeout(() => d.querySelector("#cq").focus(), 50);
    d.querySelector("#cnew").onclick = () => { close(); partyDialog(null, { kind }, c => cb(c.id)); };
  });
}
function buildLocalDoc(pdoc, lines) {
  const gross = r2(lines.reduce((a, l) => a + r2(l.qty * l.price), 0)); const disc = Math.min(r2(pdoc.discount || 0), gross); const total = r2(gross - disc);
  const ratio = gross ? total / gross : 1; let vat = 0; lines.forEach(l => { const lt = r2(l.qty * l.price) * ratio; vat += lt - lt / (1 + l.vat / 100); });
  const paid = pdoc.pay_method === "veresiye" ? Math.min(Math.max(pnum(pdoc.paid), 0), total) : total;
  const party = pdoc.party_id ? partyById(pdoc.party_id) : null;
  return { ...pdoc, gross, discount: disc, total, vat_total: r2(vat), paid: r2(paid), credit: r2(total - paid), party: party ? { ...party } : null, status: "aktif", created_by: API.email, lines: lines.map(l => ({ ...l, cost: (prodById(l.product_id) || {}).cost || 0 })) };
}
function applyLocalDoc(doc, sign = 1) {
  const st = (doc.type === "satis" || doc.type === "alis_iade") ? -1 : 1;
  doc.lines.forEach(l => { const pp = prodById(l.product_id); if (pp) pp.stock = r2(pp.stock + sign * st * l.qty); });
  if (doc.party_id) D.pbal[doc.party_id] = r2((D.pbal[doc.party_id] || 0) + sign * ((doc.type === "satis" || doc.type === "alis_iade") ? doc.credit : -doc.credit));
  saveCache();
}
async function finishDoc(type, p) {
  const c = cartOf(type); if (!c.items.length) return;
  const party = partyById(c.partyId); const buy = isBuy(type);
  let kind = (!buy && invoicing() && c.docKind === "fatura") ? (party && party.efatura ? "efatura" : "earsiv") : "fis";
  if (buy && !party && c.pay === "veresiye") throw new Error("Hesaba yazmak için tedarikçi seçin");
  if (c.pay === "veresiye" && !party) { toast("Veresiye için müşteri seçin"); return pickParty("musteri", id => { c.partyId = id; saveCarts(); vDoc(p); }); }
  if (kind === "efatura" && !(party && party.vkn)) throw new Error("e-Fatura için müşterinin VKN/TCKN bilgisi gerekli");
  if (kind !== "fis" && !S().vkn) throw new Error("Fatura için Daha → Ayarlar'dan firma VKN/TCKN girin");
  if (kind !== "fis" && !online) { if (!await ask("İnternet yok, fatura şu an kesilemez. Bilgi fişi olarak kaydedilsin mi?", "Fiş olarak kaydet")) return; kind = "fis"; }
  const t = cartTotals(c);
  if (type === "satis" && party && c.pay === "veresiye" && party.credit_limit && balance(party.id) + t.total - pnum(c.paid) > +party.credit_limit) {
    if (!await ask(`${party.name} veresiye limitini (${tl(party.credit_limit)}) aşıyor. Devam edilsin mi?`, "Devam et")) return;
  }
  if (type === "satis" && !S().allowNegative) { const low = c.items.find(i => { const pp = prodById(i.pid); return pp && pp.stock < i.qty; }); if (low) throw new Error("Yetersiz stok: " + low.name); }
  const id = uuid();
  const pdoc = { id, type, doc_kind: kind, date: new Date().toISOString(), party_id: c.partyId || null, price_mode: c.mode, discount: t.disc, pay_method: c.pay, paid: c.pay === "veresiye" ? pnum(c.paid) : null, due_date: c.pay === "veresiye" && c.due ? c.due : null, note: c.note || null, supplier_doc_no: c.supDocNo || null, update_cost: c.updateCost, ettn: kind !== "fis" ? uuid() : null, ref_doc_id: c.refDocId || null };
  const lines = c.items.map(i => ({ product_id: i.pid, name: i.name, barcode: i.barcode, unit: i.unit, qty: i.qty, price: i.price, vat: i.vat }));
  const doc = buildLocalDoc(pdoc, lines);
  const r = await rpcNowOrQueue("save_document", { p_doc: pdoc, p_lines: lines }, `${DOC_LABEL[type]} ${tl(doc.total)}`, "docSaved");
  if (r.queued) { doc.pending = true; doc.no = null; } else { doc.no = r.no; }
  if (kind !== "fis") doc.e_status = "taslak";
  D.docs.unshift(doc); applyLocalDoc(doc);
  carts[type] = newCart(type); if (type === "satis") carts[type].docKind = c.docKind; saveCarts();
  if (!r.queued) loadAll(true);
  if (type === "satis") vDoc(p); else back();
  docDoneDialog(doc);
  if (setting("autoPrint") && type === "satis") printDoc(doc);
}
function docDoneDialog(doc) {
  const lg = lastGiven; lastGiven = null;
  dialog(`${lg ? `<div class="change"><div class="small">Para üstü</div><div class="big1 num">${tl(lg.change)}</div><div class="small muted">Alınan ${tl(lg.given)}</div></div>` : ""}<h3 class="okc">${doc.pending ? "Kaydedildi (internet gelince gönderilecek)" : "Kaydedildi ✓"}</h3>
    <div class="small muted">${docName(doc)} · ${esc(doc.no || "numara bekliyor")} · <b class="num">${tl(doc.total)}</b>${doc.credit > 0 ? ` · hesaba ${tl(doc.credit)}` : ""}</div>
    ${doc.doc_kind !== "fis" ? `<div class="hint">Fatura “taslak” olarak oluştu. Daha → Satış geçmişi'nden XML'ini alabilir ya da entegratörünüze gönderebilirsiniz.</div>` : ""}
    <div class="acts"><button class="btn" data-close>Kapat</button>${doc.party && doc.party.phone ? `<a class="btn" target="_blank" rel="noopener" href="${waLink(doc.party.phone, docWaText(doc))}">WhatsApp</a>` : ""}<button class="btn pri" id="pr">${ICONS.print} Yazdır</button></div>`, (d) => { d.querySelector("#pr").onclick = () => printDoc(doc); });
}
const waNum = p => { let n = String(p).replace(/\D/g, ""); if (n.startsWith("0")) n = "9" + n; else if (n.length === 10) n = "90" + n; return n; };
const waLink = (phone, text) => `https://wa.me/${waNum(phone)}?text=${encodeURIComponent(text)}`;
function docWaText(doc) { return `${S().firm || ""}\n${docName(doc)} ${doc.no || ""} - ${fdt(doc.date)}\n` + doc.lines.map(l => `${l.name} ${qf(l.qty)} x ${nf(l.price)} = ${nf(l.qty * l.price)}`).join("\n") + `\nToplam: ${tl(doc.total)}` + (doc.party_id ? `\nGüncel bakiye: ${tl(balance(doc.party_id))}` : ""); }

/* =================== ÜRÜN FORMU =================== */
function allCategories() { return [...new Set([...(S().categories || []), ...D.products.map(p => p.category).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "tr")); }
function productDialog(p, preset = {}, after) {
  const isNew = !p; const x = p ? { ...p } : { id: uuid(), barcode: "", code: "", name: "", category: "", brand: "", unit: "Adet", pack_qty: null, retail: "", wholesale: "", cost: "", vat: 20, stock: 0, min_stock: 0, supplier_id: null, active: true, ...preset };
  const sups = D.parties.filter(c => c.kind !== "musteri");
  const v = k => x[k] === null || x[k] === undefined || x[k] === "" ? "" : (typeof x[k] === "number" ? String(x[k]).replace(".", ",") : x[k]);
  dialog(`<h3>${isNew ? "Yeni ürün" : "Ürünü düzenle"}</h3>
    <label>Barkod</label><div class="row"><input id="f_barcode" inputmode="numeric" value="${esc(v("barcode"))}" placeholder="Okutun veya yazın"><button class="btn iconbtn" id="fcam">${ICONS.cam}</button><button class="btn sm" id="fgen" title="Barkod üret">Üret</button></div>
    <label>Ürün adı *</label><input id="f_name" value="${esc(v("name"))}">
    <div class="grid2">
      <div><label>Kategori</label><input id="f_category" list="catl" value="${esc(v("category"))}"><datalist id="catl">${allCategories().map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
      <div><label>Marka</label><input id="f_brand" value="${esc(v("brand"))}"></div>
      <div><label>Stok kodu</label><input id="f_code" value="${esc(v("code"))}"></div>
      <div><label>Birim</label><select id="f_unit">${["Adet", "Kutu", "Paket", "Koli", "Düzine", "Kg", "Gram", "Litre", "Metre"].map(u => `<option ${x.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>
      <div><label>Satış fiyatı *</label><input id="f_retail" inputmode="decimal" value="${esc(v("retail"))}"></div>
      ${canSeeCost() ? `<div><label>Alış fiyatı (KDV dahil)</label><input id="f_cost" inputmode="decimal" value="${esc(v("cost"))}"></div>` : ""}
      <div><label>KDV oranı</label><select id="f_vat">${[0, 1, 10, 20].map(k => `<option value="${k}" ${+x.vat === k ? "selected" : ""}>%${k}</option>`).join("")}</select></div>
      <div><label>Kritik stok seviyesi</label><input id="f_min_stock" inputmode="decimal" value="${esc(v("min_stock"))}"></div>
      <div><label>Koli içi adet</label><input id="f_pack_qty" inputmode="decimal" value="${esc(v("pack_qty"))}"></div>
      ${isNew ? `<div><label>Açılış stoğu</label><input id="f_stock" inputmode="decimal" value="${esc(v("stock"))}"></div>` : ""}
    </div>
    <label>Tedarikçi</label><select id="f_supplier_id"><option value="">—</option>${sups.map(s => `<option value="${s.id}" ${x.supplier_id === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
    <div id="margin" class="small muted" style="margin-top:6px"></div>
    ${!isNew ? `<label class="chk"><input type="checkbox" id="f_active" ${x.active !== false ? "checked" : ""}> Aktif (satışta görünür)</label>` : ""}
    <div class="acts">${isNew ? '<button class="btn" data-close>Vazgeç</button>' : (isAdmin() ? '<button class="btn bad" id="del">Sil</button>' : '<button class="btn" data-close>Vazgeç</button>')}<button class="btn pri" id="ok">Kaydet</button></div>`, (d, close) => {
    const g = k => { const el = d.querySelector("#f_" + k); return el ? el.value : undefined; };
    const upd = () => { const rt = pnum(g("retail")), ct = pnum(g("cost") ?? x.cost); const m = d.querySelector("#margin"); if (canSeeCost() && rt && ct) m.textContent = `Kâr: ${tl(rt - ct)} · marj %${((rt - ct) / rt * 100).toFixed(1)}`; };
    ["retail", "cost"].forEach(k => { const el = d.querySelector("#f_" + k); if (el) el.oninput = upd; }); upd();
    d.querySelector("#fcam").onclick = () => scanDialog(code => { d.querySelector("#f_barcode").value = code; });
    d.querySelector("#fgen").onclick = () => { d.querySelector("#f_barcode").value = genBarcode(); };
    if (!x.name) setTimeout(() => d.querySelector(x.barcode ? "#f_name" : "#f_barcode").focus(), 60);
    d.querySelector("#ok").onclick = () => busy(d.querySelector("#ok"), async () => {
      const row = { ...x };
      row.barcode = (g("barcode") || "").trim() || null; row.code = (g("code") || "").trim() || null; row.name = g("name").trim(); row.category = g("category").trim() || null; row.brand = g("brand").trim() || null; row.unit = g("unit");
      row.retail = r2(pnum(g("retail"))); row.wholesale = row.retail; if (g("cost") !== undefined) row.cost = pnum(g("cost")); row.vat = +g("vat"); row.min_stock = pnum(g("min_stock")); row.pack_qty = pnum(g("pack_qty")) || null;
      row.supplier_id = g("supplier_id") || null; if (!isNew) row.active = d.querySelector("#f_active").checked;
      if (!row.name || !row.retail) throw new Error("Ad ve satış fiyatı zorunlu");
      if (row.barcode && D.products.some(o => o.barcode === row.barcode && o.id !== row.id)) throw new Error("Bu barkod başka üründe kayıtlı");
      const opening = isNew ? pnum(g("stock")) : 0;
      const dbRow = productRow(row);
      await writeNowOrQueue({ kind: "upsert", table: "products", rows: [dbRow], label: "Ürün: " + row.name });
      if (isNew) { row.stock = opening; D.products.push(row); } else Object.assign(p, row);
      if (isNew && opening) await rpcNowOrQueue("stock_adjust", { p: { product_id: row.id, type: "giris", qty: opening, note: "Açılış stoğu" } }, "Açılış stoğu");
      saveCache(); close(); toast("Kaydedildi"); if (after) after(isNew ? row : p); else refreshView();
    });
    const del = d.querySelector("#del"); if (del) del.onclick = async () => {
      close(); if (!await ask(`"${p.name}" silinsin mi?`, "Sil", true, "Stok hareket geçmişi de silinir. Satışlardan kaldırmak için ürünü pasife almanız önerilir.")) return;
      try { await writeNowOrQueue({ kind: "del", table: "products", filter: "id=eq." + p.id, label: "Ürün sil" }); D.products = D.products.filter(o => o.id !== p.id); saveCache(); if (R.v === "urun") back(); else refreshView(); } catch (e) { toast(e.message); }
    };
  });
}
// stok sütunu bilerek gönderilmez: stok yalnızca hareketlerle (sunucuda) değişir
function productRow(p) { const k = ["id", "barcode", "code", "name", "category", "brand", "unit", "pack_qty", "retail", "wholesale", "cost", "vat", "min_stock", "supplier_id", "active"]; const o = {}; k.forEach(x => o[x] = p[x] === undefined ? null : p[x]); if (o.active === null) o.active = true; if (o.cost === null) o.cost = 0; if (o.min_stock === null) o.min_stock = 0; if (o.wholesale === null) o.wholesale = o.retail; if (o.vat === null) o.vat = 20; if (!o.unit) o.unit = "Adet"; return o; }
function genBarcode() { let s = "2" + String(Date.now()).slice(-11); let sm = 0; for (let i = 0; i < 12; i++) sm += (+s[i]) * (i % 2 ? 3 : 1); return s + ((10 - sm % 10) % 10); }

/* =================== STOK =================== */
let sq = "", scat = "", sflt = "";
function exportProducts() { download(`urunler-${ymd(new Date())}.csv`, toCSV(D.products, [["Barkod", p => p.barcode], ["Kod", p => p.code], ["Ürün", p => p.name], ["Kategori", p => p.category], ["Marka", p => p.brand], ["Birim", p => p.unit], ["Satış fiyatı", p => p.retail], ...(canSeeCost() ? [["Alış", p => p.cost]] : []), ["KDV", p => p.vat], ["Stok", p => p.stock], ["Kritik", p => p.min_stock], ["Aktif", p => p.active !== false ? "Evet" : "Hayır"]]), "text/csv;charset=utf-8"); }
function vStok() {
  const f = fold(sq);
  let list = D.products.filter(p => (sflt === "pasif" ? p.active === false : p.active !== false) && (!scat || p.category === scat) && (!f || fold(p.name + " " + (p.barcode || "") + " " + (p.code || "") + " " + (p.brand || "")).includes(f) || p.barcode === sq.trim()));
  if (sflt === "az") list = list.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 0));
  if (sflt === "yok") list = list.filter(p => p.stock <= 0);
  list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const act = D.products.filter(p => p.active !== false);
  const lowN = act.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 0)).length, outN = act.filter(p => p.stock <= 0).length;
  const cats = allCategories();
  const shown = list.slice(0, 300);
  $("#app").innerHTML = `
   <div class="row" style="margin-bottom:8px"><input id="sq" class="grow bigin" placeholder="Ürün ara (ad, barkod)" value="${esc(sq)}"><button class="btn iconbtn" id="scam">${ICONS.cam}</button><button class="btn pri iconbtn" id="sadd" title="Yeni ürün">${ICONS.plus}</button><button class="btn iconbtn" id="smore" title="Diğer işlemler">⋯</button></div>
   <div class="chips" style="margin-bottom:10px">
     ${[["", `Tümü (${act.length})`], ["az", `Azalan${lowN ? " " + lowN : ""}`], ["yok", `Biten${outN ? " " + outN : ""}`]].map(([k, t]) => `<button class="pill ${sflt === k ? "on" : ""} ${k && (k === "az" ? lowN : outN) ? "warn" : ""}" data-f="${k}">${t}</button>`).join("")}
     ${cats.length ? `<select id="scat" class="pillsel"><option value="">Tüm kategoriler</option>${cats.map(c => `<option ${scat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : ""}
   </div>
   <div class="card list">
    ${shown.length ? shown.map(p => `<div class="it click" data-p="${p.id}">
      <div class="grow"><div class="t">${esc(p.name)}</div><div class="small muted">${esc(p.category || p.barcode || "")}</div></div>
      <div class="right"><div class="num"><b>${tl(p.retail)}</b></div><span class="tag ${p.stock <= 0 ? "b" : p.stock <= (p.min_stock || 0) ? "w" : ""}">${qf(p.stock)} ${esc(p.unit || "")}</span></div>
    </div>`).join("") : `<div class="empty">${D.products.length ? "Ürün bulunamadı." : "Henüz ürün yok.<br><br>"}${D.products.length ? "" : `<button class="btn pri" id="firstAdd">${ICONS.plus} İlk ürünü ekle</button>`}</div>`}
    ${list.length > 300 ? `<div class="empty small">İlk 300 ürün gösteriliyor, aramayı daraltın.</div>` : ""}
   </div>`;
  const inp = $("#sq"); inp.oninput = debounce(() => { sq = inp.value; const pos = inp.selectionStart; vStok(); const n = $("#sq"); n.focus(); n.setSelectionRange(pos, pos); }, 250);
  $$("[data-f]").forEach(b => b.onclick = () => { sflt = b.dataset.f; vStok(); });
  const sc = $("#scat"); if (sc) sc.onchange = () => { scat = sc.value; vStok(); };
  $$("[data-p]").forEach(el => el.onclick = () => go("urun", { id: el.dataset.p }));
  $("#sadd").onclick = () => productDialog(null);
  const fa = $("#firstAdd"); if (fa) fa.onclick = () => productDialog(null);
  $("#scam").onclick = () => scanDialog(code => { const p = D.products.find(x => x.barcode === code); if (p) go("urun", { id: p.id }); else productDialog(null, { barcode: code }); });
  $("#smore").onclick = () => actionSheet("Ürün işlemleri", [
    { t: "Alış girişi (mal kabul)", s: "Tedarikçiden gelen", f: () => go("doc", { type: "alis" }) },
    { t: "Stok sayımı", s: "Okut-say", f: () => go("sayim") },
    isAdmin() && { t: "Toplu fiyat güncelle", s: "% zam / indirim", f: () => go("toplufiyat") },
    { t: "Excel'den ürün ekle", f: importDialog },
    { t: "Excel'e aktar", f: exportProducts },
    { t: sflt === "pasif" ? "Aktif ürünleri göster" : "Pasif ürünleri göster", f: () => { sflt = sflt === "pasif" ? "" : "pasif"; vStok(); } },
    { t: "Alış iadesi", s: "Tedarikçiye iade", f: () => go("doc", { type: "alis_iade" }) }
  ]);
}
function vUrun(p) {
  const pr = prodById(p.id); if (!pr) { back(); return; }
  const sup = partyById(pr.supplier_id); const tok = renderTok;
  $("#app").innerHTML = `
   <div class="card">
     <div class="row"><div class="grow"><h2 style="margin:0">${esc(pr.name)}</h2><div class="small muted">${esc([pr.barcode, pr.code, pr.category, pr.brand].filter(Boolean).join(" · "))}${pr.active === false ? ' · <span class="danger">PASİF</span>' : ""}</div></div><button class="btn sm" id="ed">Düzenle</button></div>
     <div class="stats" style="margin-top:12px">
       <div class="stat"><div class="k">Stok</div><div class="v ${pr.stock <= 0 ? "danger" : pr.stock <= pr.min_stock ? "warnc" : ""}">${qf(pr.stock)} <span class="small">${esc(pr.unit)}</span></div>${pr.min_stock ? `<div class="small muted">kritik: ${qf(pr.min_stock)}</div>` : ""}</div>
       <div class="stat"><div class="k">Satış fiyatı</div><div class="v num">${tl(pr.retail)}</div></div>
       ${canSeeCost() ? `<div class="stat"><div class="k">Alış · marj</div><div class="v num" style="font-size:17px">${tl(pr.cost)} <span class="small muted">%${pr.retail ? ((pr.retail - pr.cost) / pr.retail * 100).toFixed(0) : 0}</span></div></div>` : ""}
       <div class="stat"><div class="k">KDV · Tedarikçi</div><div class="v" style="font-size:15px">%${pr.vat} · ${esc(sup ? sup.name : "—")}</div></div>
     </div>
     <div class="grid4" style="margin-top:12px"><button class="btn" data-a="giris">+ Giriş</button><button class="btn" data-a="cikis">− Çıkış</button><button class="btn" data-a="fire">Fire</button><button class="btn" data-a="sayim">Sayım</button></div>
     <div class="grid2" style="margin-top:8px"><button class="btn pri" id="sell">Satışa ekle</button><button class="btn" id="buy">Alışa ekle</button></div>
   </div>
   <div class="card"><h3>Son 30 gün</h3><div id="pstat" class="small muted">Yükleniyor…</div></div>
   <div class="card"><h3>Stok hareketleri</h3><div class="list" id="moves"><div class="empty">Yükleniyor…</div></div></div>`;
  $("#ed").onclick = () => productDialog(pr, {}, () => vUrun(p));
  $$("[data-a]").forEach(b => b.onclick = () => stockAdjustDialog(pr, b.dataset.a, () => vUrun(p)));
  $("#sell").onclick = () => { addLine("satis", pr); go("satis"); };
  $("#buy").onclick = () => { addLine("alis", pr); go("doc", { type: "alis" }); };
  const MT = { satis: "Satış", alis: "Alış", satis_iade: "Satış iade", alis_iade: "Alış iade", sayim: "Sayım", fire: "Fire", giris: "Giriş", cikis: "Çıkış", acilis: "Açılış", iptal: "İptal" };
  API.get(`stock_moves?select=*&product_id=eq.${pr.id}&order=date.desc&limit=200`).then(rows => {
    if (tok !== renderTok) return;
    $("#moves").innerHTML = rows.length ? rows.map(m => `<div class="it"><div class="grow"><div class="small"><b>${MT[m.type] || m.type}</b> · ${fdt(m.date)}</div><div class="small muted">${esc(m.note || "")}</div></div><div class="right num"><div class="${+m.qty < 0 ? "danger" : "okc"}">${+m.qty > 0 ? "+" : ""}${qf(m.qty)}</div><div class="small muted">${m.balance !== null ? qf(m.balance) : ""}</div></div></div>`).join("") : '<div class="empty">Hareket yok.</div>';
    const since = addDays(new Date(), -30); const s30 = rows.filter(m => new Date(m.date) >= since);
    const sold = -sum(s30.filter(m => m.type === "satis"), m => m.qty) - sum(s30.filter(m => m.type === "satis_iade"), m => m.qty);
    const bought = sum(s30.filter(m => m.type === "alis"), m => m.qty);
    const perDay = sold / 30; const daysLeft = perDay > 0 ? Math.floor(pr.stock / perDay) : null;
    $("#pstat").innerHTML = `Satılan: <b>${qf(sold)}</b> · Alınan: <b>${qf(bought)}</b>${daysLeft !== null ? ` · Bu hızla stok yaklaşık <b>${daysLeft} gün</b> yeter` : ""}`;
  }).catch(e => { if (tok === renderTok) $("#moves").innerHTML = `<div class="empty">${isNetErr(e) ? "Çevrimdışı – hareketler görüntülenemiyor" : esc(e.message)}</div>`; });
}
function stockAdjustDialog(pr, type, after) {
  const T = { giris: "Stok girişi", cikis: "Stok çıkışı", fire: "Fire / bozuk ürün", sayim: "Sayım düzeltmesi" };
  dialog(`<h3>${T[type]} – ${esc(pr.name)}</h3><div class="small muted">Mevcut stok: ${qf(pr.stock)} ${esc(pr.unit)}</div>
   <label>${type === "sayim" ? "Sayılan miktar" : "Miktar"}</label><input id="aq" inputmode="decimal" value="${type === "sayim" ? qf(pr.stock) : ""}">
   <label>Açıklama</label><input id="an" placeholder="${type === "fire" ? "Kırık, son kullanma tarihi…" : ""}">
   <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="ok">Kaydet</button></div>`, (d, close) => {
    setTimeout(() => d.querySelector("#aq").select(), 60);
    d.querySelector("#ok").onclick = () => busy(d.querySelector("#ok"), async () => {
      const q = pnum(d.querySelector("#aq").value); if (type !== "sayim" && q <= 0) throw new Error("Miktar girin");
      await rpcNowOrQueue("stock_adjust", { p: { product_id: pr.id, type, qty: q, note: d.querySelector("#an").value || T[type] } }, T[type] + ": " + pr.name);
      pr.stock = type === "sayim" ? q : r2(pr.stock + (type === "giris" ? q : -q)); saveCache(); close(); toast("Kaydedildi"); if (after) after();
    });
  });
}
function importDialog() {
  dialog(`<h3>Toplu ürün ekle / güncelle</h3><div class="small muted">Her satır bir ürün, sütunlar <b>;</b> veya sekme ile ayrılır:<br><b>barkod; ad; kategori; satış fiyatı; alış; kdv; stok; birim; kritik</b><br>Excel'den kopyalayıp yapıştırabilir veya CSV dosyası seçebilirsiniz. Aynı barkodlu ürün varsa fiyat ve bilgileri güncellenir (stoğu değişmez).</div>
    <textarea id="csv" style="margin-top:8px;min-height:160px" placeholder="8691234567890;Oyuncak Araba;Oyuncak;95;45;20;50;Adet;5"></textarea>
    <input type="file" id="csvf" accept=".csv,.txt" style="margin-top:8px">
    <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="ok">İçe aktar</button></div>`, (d, close) => {
    d.querySelector("#csvf").onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => d.querySelector("#csv").value = r.result; r.readAsText(f, "utf-8"); };
    d.querySelector("#ok").onclick = () => busy(d.querySelector("#ok"), async () => {
      const rows = [], opens = []; let add = 0, upd = 0;
      d.querySelector("#csv").value.replace(/^﻿/, "").split(/\r?\n/).forEach(line => {
        if (!line.trim()) return; const c = line.split(/[;\t]/).map(s => s.trim().replace(/^"|"$/g, ""));
        if (c.length < 4 || /barkod/i.test(c[0])) return;
        const rec = { barcode: c[0] || null, name: c[1], category: c[2] || null, retail: r2(pnum(c[3])), wholesale: r2(pnum(c[3])), cost: pnum(c[4]), vat: c[5] !== undefined && c[5] !== "" ? +pnum(c[5]) : 20, unit: c[7] || "Adet", min_stock: pnum(c[8]) };
        if (!rec.name || !rec.retail) return;
        const ex = rec.barcode && D.products.find(p => p.barcode === rec.barcode);
        if (ex) { Object.assign(ex, rec); rows.push(productRow(ex)); upd++; }
        else { const np = { id: uuid(), active: true, stock: 0, ...rec }; D.products.push(np); rows.push(productRow(np)); const st = pnum(c[6]); if (st) { opens.push({ product_id: np.id, qty: st }); np.stock = st; } add++; }
      });
      if (!rows.length) throw new Error("Geçerli satır bulunamadı");
      for (let i = 0; i < rows.length; i += 500) await writeNowOrQueue({ kind: "upsert", table: "products", rows: rows.slice(i, i + 500), label: "Ürün içe aktarma" });
      for (const o of opens) await rpcNowOrQueue("stock_adjust", { p: { product_id: o.product_id, type: "giris", qty: o.qty, note: "Açılış stoğu (içe aktarma)" } }, "Açılış stoğu");
      saveCache(); close(); toast(`${add} eklendi, ${upd} güncellendi`); refreshView();
    });
  });
}
let sayimList = lsGet("ss_sayim", []);
function vSayim() {
  const saveS = () => lsSet("ss_sayim", sayimList);
  $("#app").innerHTML = `<div class="card"><div class="small muted" style="margin-bottom:8px">Ürünleri okutun veya arayın, sayılan miktarı girin. Bitince “Sayımı uygula” ile stoklar sayılan miktara eşitlenir.</div>
    <div class="row"><div class="searchbox grow"><input id="q" placeholder="Barkod okut / ürün ara"><div class="results" id="res" style="display:none"></div></div><button class="btn iconbtn" id="cam">${ICONS.cam}</button></div></div>
    <div class="card list">${sayimList.length ? sayimList.map((s, i) => { const p = prodById(s.id); if (!p) return ""; const diff = r2(s.qty - p.stock); return `<div class="it"><div class="grow"><div class="t">${esc(p.name)}</div><div class="small muted">Sistem: ${qf(p.stock)} · Fark: <b class="${diff < 0 ? "danger" : diff > 0 ? "okc" : ""}">${diff > 0 ? "+" : ""}${qf(diff)}</b></div></div><div class="qty"><button data-dec="${i}">−</button><input inputmode="decimal" data-q="${i}" value="${qf(s.qty)}"><button data-inc="${i}">+</button></div></div>`; }).join("") : '<div class="empty">Henüz ürün sayılmadı.</div>'}</div>
    <div class="grid2"><button class="btn bad" id="clr" ${sayimList.length ? "" : "disabled"}>Listeyi temizle</button><button class="btn pri" id="apply" ${sayimList.length ? "" : "disabled"}>Sayımı uygula (${sayimList.length})</button></div>`;
  const addP = p => { const ex = sayimList.find(s => s.id === p.id); if (ex) ex.qty = r2(ex.qty + 1); else sayimList.unshift({ id: p.id, qty: 1 }); saveS(); vSayim(); };
  const q = $("#q"), res = $("#res");
  q.oninput = () => { const l = searchProducts(q.value, true); if (!q.value.trim()) { res.style.display = "none"; return; } res.style.display = "block"; res.innerHTML = l.map(p => `<div class="it" data-pid="${p.id}"><div class="grow t">${esc(p.name)}</div><span class="muted small">${qf(p.stock)}</span></div>`).join("") || '<div class="empty">Bulunamadı</div>'; $$("[data-pid]", res).forEach(el => el.onclick = () => addP(prodById(el.dataset.pid))); };
  q.onkeydown = e => { if (e.key === "Enter") { const v = q.value.trim(); const p = D.products.find(x => x.barcode === v || x.code === v) || (searchProducts(v, true).length === 1 && searchProducts(v, true)[0]); if (p) addP(p); else toast("Bulunamadı"); } };
  setTimeout(() => q.focus(), 50);
  $("#cam").onclick = () => scanDialog(code => { const p = D.products.find(x => x.barcode === code); if (p) addP(p); else toast("Kayıtsız: " + code); }, true);
  $$("[data-inc]").forEach(b => b.onclick = () => { sayimList[b.dataset.inc].qty++; saveS(); vSayim(); });
  $$("[data-dec]").forEach(b => b.onclick = () => { const s = sayimList[b.dataset.dec]; s.qty = Math.max(0, s.qty - 1); saveS(); vSayim(); });
  $$("[data-q]").forEach(i => i.onchange = () => { sayimList[i.dataset.q].qty = Math.max(0, pnum(i.value)); saveS(); vSayim(); });
  $("#clr").onclick = async () => { if (await ask("Sayım listesi temizlensin mi?", "Temizle", true)) { sayimList = []; saveS(); vSayim(); } };
  $("#apply").onclick = () => busy($("#apply"), async () => {
    if (!await ask(`${sayimList.length} ürünün stoğu sayılan miktara eşitlensin mi?`, "Uygula")) return;
    for (const s of sayimList) { const p = prodById(s.id); if (!p || r2(p.stock) === r2(s.qty)) continue; await rpcNowOrQueue("stock_adjust", { p: { product_id: s.id, type: "sayim", qty: s.qty, note: "Sayım " + fd(new Date()) } }, "Sayım: " + p.name); p.stock = s.qty; }
    sayimList = []; saveS(); saveCache(); toast("Sayım uygulandı"); vSayim();
  });
}
function vTopluFiyat() {
  const cats = allCategories();
  $("#app").innerHTML = `<div class="card">
    <label style="margin-top:0">Hangi ürünler</label><select id="tc"><option value="">Tüm aktif ürünler</option>${cats.map(c => `<option>${esc(c)}</option>`).join("")}</select>
    <label>Yöntem</label><select id="tm"><option value="pct">Mevcut fiyata % ekle</option><option value="cost">Alış fiyatı + % kâr</option></select>
    <label>Oran (%)</label><input id="tp" inputmode="decimal" placeholder="Örn: 10 (indirim için -10)">
    <label>Yuvarlama</label><select id="tr"><option value="0">Yok</option><option value="0.5">0,50'ye</option><option value="1" selected>Tam liraya</option><option value="5">5'in katına</option><option value="10">10'un katına</option><option value="99">x,99 / x9,90 sonlu</option></select>
    <div id="prev" class="hint">Önizleme için oran girin.</div>
    <button class="btn pri block" id="ap" style="margin-top:10px">Uygula</button></div>`;
  const calc = () => {
    const cat = $("#tc").value, fld = "both", m = $("#tm").value, pct = pnum($("#tp").value), rd = $("#tr").value;
    const round = v => { if (rd === "0") return r2(v); if (rd === "99") return v >= 100 ? Math.ceil(v / 10) * 10 - 0.1 : Math.ceil(v) - 0.01; const s = +rd; return r2(Math.round(v / s) * s); };
    const list = D.products.filter(p => p.active !== false && (!cat || p.category === cat));
    const ch = list.map(p => { const o = { ...p }; ["retail", "wholesale"].forEach(k => { if (fld !== "both" && fld !== k) return; const base = m === "cost" ? p.cost : p[k]; if (!base) return; o[k] = Math.max(0, round(base * (1 + pct / 100))); }); return o; }).filter((o, i) => o.retail !== list[i].retail || o.wholesale !== list[i].wholesale);
    return { list, ch };
  };
  const prev = () => { const { list, ch } = calc(); $("#prev").innerHTML = `${list.length} ürün içinden <b>${ch.length}</b> ürünün fiyatı değişecek.` + (ch.length ? "<br>" + ch.slice(0, 5).map(o => { const p = prodById(o.id); return `${esc(p.name)}: ${tl(p.retail)} → <b>${tl(o.retail)}</b>`; }).join("<br>") + (ch.length > 5 ? "<br>…" : "") : ""); };
  ["tc", "tm", "tp", "tr"].forEach(i => $("#" + i).oninput = prev);
  $("#ap").onclick = () => busy($("#ap"), async () => {
    const { ch } = calc(); if (!ch.length) throw new Error("Değişecek ürün yok");
    if (!await ask(`${ch.length} ürünün fiyatı güncellensin mi?`, "Güncelle")) return;
    for (let i = 0; i < ch.length; i += 500) await writeNowOrQueue({ kind: "upsert", table: "products", rows: ch.slice(i, i + 500).map(productRow), label: "Toplu fiyat" });
    ch.forEach(o => Object.assign(prodById(o.id), { retail: o.retail, wholesale: o.wholesale })); saveCache(); toast("Fiyatlar güncellendi"); back();
  });
}

/* =================== CARİ =================== */
let cq = "", ckind = "", cflt = "", ccity = "";
function vCari() {
  const f = fold(cq);
  let list = D.parties.filter(c => (cflt === "pasif" ? c.active === false : c.active !== false) && (!ckind || c.kind === ckind || c.kind === "her_ikisi") && (!ccity || [c.city, c.district].filter(Boolean).join(" / ") === ccity || c.city === ccity) && (!f || fold(c.name + " " + (c.phone || "") + " " + (c.vkn || "")).includes(f)));
  if (cflt === "borclu") list = list.filter(c => balance(c.id) > 0.009);
  if (cflt === "alacakli") list = list.filter(c => balance(c.id) < -0.009);
  list.sort(cflt ? (a, b) => Math.abs(balance(b.id)) - Math.abs(balance(a.id)) : (a, b) => a.name.localeCompare(b.name, "tr"));
  const rec = sum(D.parties, c => Math.max(0, balance(c.id))), pay = sum(D.parties, c => Math.max(0, -balance(c.id)));
  $("#app").innerHTML = `
   <div class="stats"><div class="stat clickable" data-f="borclu"><div class="k">Toplam alacak (bize borçlu)</div><div class="v num danger">${tl(rec)}</div></div><div class="stat clickable" data-f="alacakli"><div class="k">Toplam borç (bizim borcumuz)</div><div class="v num okc">${tl(pay)}</div></div></div>
   <div class="card" style="margin-top:12px">
    <div class="row"><input id="cq" class="grow" placeholder="Ad, telefon, VKN ara" value="${esc(cq)}"><button class="btn pri iconbtn" id="cadd">${ICONS.plus}</button></div>
    <div class="chips" style="margin-top:8px">${[["", "Tümü"], ["musteri", "Müşteriler"], ["tedarikci", "Tedarikçiler"]].map(([k, t]) => `<button class="pill ${ckind === k ? "on" : ""}" data-k="${k}">${t}</button>`).join("")}${(() => { const cs = [...new Set(D.parties.flatMap(c => c.city ? [c.city, ...(c.district ? [c.city + " / " + c.district] : [])] : []))].sort((a, b) => a.localeCompare(b, "tr")); return cs.length ? `<select class="pillsel" id="ccity"><option value="">Tüm bölgeler</option>${cs.map(x => `<option ${x === ccity ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>` : ""; })()}<span class="sep"></span>${[["", "Hepsi"], ["borclu", "Borçlu"], ["alacakli", "Alacaklı"], ["pasif", "Pasif"]].map(([k, t]) => `<button class="pill ${cflt === k ? "on" : ""}" data-f="${k}">${t}</button>`).join("")}</div>
   </div>
   <div class="row" style="gap:6px;margin-bottom:10px"><button class="btn sm" id="cexp">${ICONS.dl} Excel</button></div>
   <div class="card list">${list.length ? list.slice(0, 300).map(c => { const b = balance(c.id); return `<div class="it click" data-c="${c.id}">
      <div class="grow"><div class="t">${esc(c.name)}</div><div class="small muted">${c.kind === "tedarikci" ? '<span class="tag">Tedarikçi</span> ' : c.kind === "her_ikisi" ? '<span class="tag">Müş.+Ted.</span> ' : ""}${esc([c.district, c.city].filter(Boolean).join(", ") || c.phone || "")}</div></div>
      <div class="right num ${b > 0 ? "danger" : b < 0 ? "okc" : "muted"}"><b>${tl(Math.abs(b))}</b><div class="small muted">${b > 0.009 ? "borçlu" : b < -0.009 ? "alacaklı" : ""}</div></div></div>`; }).join("") : '<div class="empty">Kayıt yok.</div>'}</div>`;
  const inp = $("#cq"); inp.oninput = debounce(() => { cq = inp.value; const pos = inp.selectionStart; vCari(); const n = $("#cq"); n.focus(); n.setSelectionRange(pos, pos); }, 250);
  $$("[data-k]").forEach(b => b.onclick = () => { ckind = b.dataset.k; vCari(); });
  $$("[data-f]").forEach(b => b.onclick = () => { cflt = b.dataset.f; vCari(); });
  const cc = $("#ccity"); if (cc) cc.onchange = () => { ccity = cc.value; vCari(); };
  $$("[data-c]").forEach(el => el.onclick = () => go("caridetay", { id: el.dataset.c }));
  $("#cadd").onclick = () => partyDialog(null, { kind: ckind || "musteri" });
  $("#cexp").onclick = () => download(`cariler-${ymd(new Date())}.csv`, toCSV(D.parties, [["Ad", c => c.name], ["Tür", c => ({ musteri: "Müşteri", tedarikci: "Tedarikçi", her_ikisi: "Her ikisi" })[c.kind]], ["Telefon", c => c.phone], ["VKN/TCKN", c => c.vkn], ["Vergi dairesi", c => c.tax_office], ["İl", c => c.city], ["Bakiye", c => balance(c.id)], ["Durum", c => balance(c.id) > 0 ? "Borçlu" : balance(c.id) < 0 ? "Alacaklı" : ""]]), "text/csv;charset=utf-8");
}
function partyDialog(c, preset = {}, after) {
  const isNew = !c; const x = c ? { ...c } : { id: uuid(), kind: "musteri", name: "", phone: "", email: "", vkn: "", tax_office: "", address: "", district: "", city: "", efatura: false, price_type: "perakende", credit_limit: null, due_days: null, note: "", active: true, ...preset };
  const v = k => x[k] === null || x[k] === undefined ? "" : x[k];
  const KN = { musteri: "müşteri", tedarikci: "tedarikçi", her_ikisi: "kayıt" }; const kind0 = x.kind;
  dialog(`<h3 id="pdT">${isNew ? "Yeni " + KN[x.kind] : "Düzenle: " + esc(x.name)}</h3>
    <label style="margin-top:4px">Kayıt türü</label><div class="seg" id="kd">${[["musteri", "Müşteri"], ["tedarikci", "Tedarikçi"], ["her_ikisi", "Her ikisi"]].map(([k, t]) => `<button data-k="${k}" class="${x.kind === k ? "on" : ""}">${t}</button>`).join("")}</div>
    <label>Ad Soyad / Unvan *</label><input id="f_name" value="${esc(v("name"))}">
    <div class="grid2">
      <div><label>Telefon</label><input id="f_phone" inputmode="tel" value="${esc(v("phone"))}"></div>
      <div><label>VKN / TCKN</label><input id="f_vkn" inputmode="numeric" value="${esc(v("vkn"))}"></div>
      <div><label>Vergi dairesi</label><input id="f_tax_office" value="${esc(v("tax_office"))}"></div>
      <div><label>İl</label><input id="f_city" value="${esc(v("city"))}"></div>
      <div><label>İlçe</label><input id="f_district" value="${esc(v("district"))}"></div>
    </div>
    <label>Adres</label><input id="f_address" value="${esc(v("address"))}">
    <div class="grid2">
      <div><label>E-posta</label><input id="f_email" inputmode="email" value="${esc(v("email"))}"></div>
      <div><label>Veresiye limiti (₺)</label><input id="f_credit_limit" inputmode="decimal" value="${esc(v("credit_limit"))}" placeholder="Limitsiz"></div>
      <div><label>Vade (gün)</label><input id="f_due_days" inputmode="numeric" value="${esc(v("due_days"))}" placeholder="Örn: 30"></div>
    </div>
    <label class="chk" ${invoicing() ? "" : 'style="display:none"'}><input type="checkbox" id="f_efatura" ${x.efatura ? "checked" : ""}> e-Fatura mükellefi</label>
    ${!isNew ? `<label class="chk"><input type="checkbox" id="f_active" ${x.active !== false ? "checked" : ""}> Aktif</label>` : ""}
    <label>Not</label><input id="f_note" value="${esc(v("note"))}">
    ${isNew ? `<label>Açılış bakiyesi (₺) <span class="muted">— varsa</span></label><div class="grid2"><input id="ob" inputmode="decimal" placeholder="0,00"><select id="obt"><option value="borc">Bize borçlu</option><option value="alacak">Biz borçluyuz</option></select></div>` : ""}
    <div class="acts">${isNew ? '<button class="btn" data-close>Vazgeç</button>' : (isAdmin() ? '<button class="btn bad" id="del">Sil</button>' : '<button class="btn" data-close>Vazgeç</button>')}<button class="btn pri" id="ok">Kaydet</button></div>`, (d, close) => {
    $$("#kd button", d).forEach(b => b.onclick = () => { x.kind = b.dataset.k; $$("#kd button", d).forEach(y => y.classList.toggle("on", y === b)); if (isNew) d.querySelector("#pdT").textContent = "Yeni " + KN[x.kind]; });
    setTimeout(() => !x.name && d.querySelector("#f_name").focus(), 60);
    d.querySelector("#ok").onclick = () => busy(d.querySelector("#ok"), async () => {
      const g = k => d.querySelector("#f_" + k).value.trim();
      Object.assign(x, { name: g("name"), phone: g("phone") || null,  vkn: g("vkn").replace(/\D/g, "") || null, tax_office: g("tax_office") || null, city: g("city") || null, district: g("district") || null, address: g("address") || null, email: g("email") || null, credit_limit: g("credit_limit") ? pnum(g("credit_limit")) : null, due_days: g("due_days") ? Math.round(pnum(g("due_days"))) : null, note: g("note") || null, efatura: d.querySelector("#f_efatura").checked });
      if (!isNew) x.active = d.querySelector("#f_active").checked;
      if (!x.name) throw new Error("Ad zorunlu");
      if (x.vkn && !(x.vkn.length === 10 || x.vkn.length === 11)) throw new Error("VKN 10, TCKN 11 haneli olmalı");
      const row = {}; ["id", "kind", "name", "phone", "email", "vkn", "tax_office", "address", "district", "city", "efatura", "price_type", "credit_limit", "due_days", "note", "active"].forEach(k => row[k] = x[k] === undefined ? null : x[k]); if (row.active === null) row.active = true;
      await writeNowOrQueue({ kind: "upsert", table: "parties", rows: [row], label: "Cari: " + x.name });
      if (isNew) D.parties.push(x); else Object.assign(c, x);
      if (isNew) { const ob = pnum(d.querySelector("#ob").value); if (ob > 0) { const t = d.querySelector("#obt").value; await rpcNowOrQueue("save_cash", { p: { id: uuid(), kind: t === "borc" ? "borc_dekont" : "alacak_dekont", party_id: x.id, amount: ob, note: "Açılış bakiyesi" } }, "Açılış bakiyesi"); D.pbal[x.id] = t === "borc" ? ob : -ob; } }
      saveCache(); close(); toast(!isNew && x.kind !== kind0 ? `Kaydedildi · kayıt türü “${({ musteri: "Müşteri", tedarikci: "Tedarikçi", her_ikisi: "Her ikisi" })[x.kind]}” oldu` : "Kaydedildi"); if (after) after(isNew ? x : c); else refreshView();
    });
    const del = d.querySelector("#del"); if (del) del.onclick = async () => {
      close(); if (Math.abs(balance(c.id)) > 0.009) { toast("Bakiyesi olan cari silinemez; pasife alabilirsiniz"); return; }
      if (!await ask(`"${c.name}" silinsin mi?`, "Sil", true, "Bu carinin tüm hesap hareketleri de silinir.")) return;
      try { await writeNowOrQueue({ kind: "del", table: "parties", filter: "id=eq." + c.id, label: "Cari sil" }); D.parties = D.parties.filter(o => o.id !== c.id); saveCache(); if (R.v === "caridetay") back(); else refreshView(); } catch (e) { toast(e.message); }
    };
  });
}
const LK = { satis: "Satış", alis: "Alış", satis_iade: "Satış iade", alis_iade: "Alış iade", odeme_alindi: "Peşin tahsilat", odeme_yapildi: "Peşin ödeme", tahsilat: "Tahsilat", odeme: "Ödeme", borc_dekont: "Borç dekontu", alacak_dekont: "Alacak dekontu" };
function vCariDetay(p) {
  const c = partyById(p.id); if (!c) { back(); return; } const b = balance(c.id); const tok = renderTok; const isSup = c.kind === "tedarikci";
  $("#app").innerHTML = `
   <div class="card">
    <div class="row"><div class="grow"><h2 style="margin:0">${esc(c.name)}</h2><div class="small muted">${esc([c.phone, c.city].filter(Boolean).join(" · "))}</div></div><button class="btn iconbtn" id="more" title="Diğer işlemler">⋯</button></div>
    <div class="stat" style="margin:12px 0"><div class="k">Bakiye</div><div class="v num ${b > 0 ? "danger" : b < 0 ? "okc" : ""}">${tl(Math.abs(b))} <span class="small muted">${b > 0.009 ? "bize borçlu" : b < -0.009 ? "biz borçluyuz" : "hesap kapalı"}</span></div>${c.credit_limit ? `<div class="small muted">Limit: ${tl(c.credit_limit)} · kalan ${tl(c.credit_limit - b)}</div>` : ""}<div class="small" id="overdue"></div></div>
    <div class="grid2"><button class="btn pri big1" data-k="${isSup ? "odeme" : "tahsilat"}">${isSup ? "Ödeme yap" : "Tahsilat al"}</button><button class="btn big1" id="sell">${isSup ? "Alış yap" : "Satış yap"}</button></div>
   </div>
   <div class="card"><div class="row"><h3 class="grow" style="margin:0">Hesap hareketleri</h3><select id="per" style="width:auto;min-height:36px;padding:4px 8px"><option value="90">Son 3 ay</option><option value="365">Son 1 yıl</option><option value="0">Tümü</option></select></div><div class="list" id="led" style="margin-top:8px"><div class="empty">Yükleniyor…</div></div></div>`;
  $$("[data-k]").forEach(bt => bt.onclick = () => cashDialog(bt.dataset.k, { party: c }, () => vCariDetay(p)));
  $("#sell").onclick = () => { const t = isSup ? "alis" : "satis"; cartOf(t).partyId = c.id; applyPartyDefaults(cartOf(t), t); saveCarts(); if (t === "satis") go("satis"); else go("doc", { type: t }); };
  $("#more").onclick = () => actionSheet(c.name, [
    { t: isSup ? "Tahsilat al" : "Ödeme yap (para iadesi)", f: () => cashDialog(isSup ? "tahsilat" : "odeme", { party: c }, () => vCariDetay(p)) },
    { t: "Ekstre yazdır (fiş)", f: () => printStatement(c, rows) },
    { t: "Ekstre A4 / PDF", f: () => printStatementA4(c, rows) },
    c.phone && { t: "WhatsApp ile bakiye hatırlat", f: () => window.open(waLink(c.phone, `Sayın ${c.name}, ${fd(new Date())} itibarıyla ${b >= 0 ? "borç" : "alacak"} bakiyeniz ${tl(Math.abs(b))}'dir. ${S().firm || ""}`), "_blank") },
    c.phone && { t: "Ara", s: c.phone, f: () => { location.href = "tel:" + c.phone; } },
    !isSimple() && { t: "Borç / alacak dekontu", s: "Açılış bakiyesi, düzeltme", f: () => cashDialog("dekont", { party: c }, () => vCariDetay(p)) },
    { t: "Bilgileri düzenle", f: () => partyDialog(c, {}, () => vCariDetay(p)) }
  ]);
  let rows = [];
  const draw = () => {
    const per = +$("#per").value; const since = per ? addDays(new Date(), -per) : null;
    let run = 0; const all = rows.map(l => { run = r2(run + (+l.debit) - (+l.credit)); return { ...l, run }; });
    const opening = since ? (all.filter(l => new Date(l.date) < since).pop() || { run: 0 }).run : 0;
    const shown = all.filter(l => !since || new Date(l.date) >= since).reverse();
    $("#led").innerHTML = (shown.length ? shown.map(l => `<div class="it ${l.document_id ? "click" : ""}" data-doc="${l.document_id || ""}"><div class="grow"><div class="small"><b>${LK[l.kind] || l.kind}</b> · ${fdt(l.date)}${l.due_date ? ` · <span class="${new Date(l.due_date) < new Date() ? "danger" : "muted"}">vade ${fd(l.due_date)}</span>` : ""}</div><div class="small muted">${esc(l.note || "")}</div></div><div class="right num"><div class="${+l.debit ? "danger" : "okc"}">${+l.debit ? "+" + nf(l.debit) : "−" + nf(l.credit)}</div><div class="small muted">${nf(l.run)}</div></div>${!l.document_id && isAdmin() ? `<button class="btn sm iconbtn" data-dl="${l.cash_move_id || l.id}" style="width:34px;min-height:34px">${ICONS.x}</button>` : ""}</div>`).join("") : '<div class="empty">Bu dönemde hareket yok.</div>')
      + (since ? `<div class="small muted" style="padding:8px 2px">Dönem başı devir: <b>${nf(opening)}</b></div>` : "");
    $$("[data-doc]").forEach(el => { if (el.dataset.doc) el.onclick = e => { if (e.target.closest("[data-dl]")) return; openDoc(el.dataset.doc); }; });
    $$("[data-dl]").forEach(bt => bt.onclick = async () => { if (!await ask("Bu hareket silinsin mi?", "Sil", true)) return; try { await API.rpc("delete_cash", { p_id: bt.dataset.dl }); await loadAll(true); vCariDetay(p); } catch (e) { toast(e.message); } });
    // vadesi geçmiş
    if (b > 0) { const dues = rows.filter(l => +l.debit > 0 && l.due_date && new Date(l.due_date) < startOfDay(new Date())); if (dues.length) $("#overdue").innerHTML = `<span class="danger">Vadesi geçmiş ${dues.length} kayıt var (en eski ${fd(dues[0].due_date)})</span>`; }
  };
  $("#per").onchange = draw;
  API.getAll("ledger", `select=*&party_id=eq.${c.id}&order=date.asc,seq.asc`).then(r => { if (tok !== renderTok) return; rows = r; draw(); })
    .catch(e => { if (tok === renderTok) $("#led").innerHTML = `<div class="empty">${isNetErr(e) ? "Çevrimdışı – hareketler görüntülenemiyor" : esc(e.message)}</div>`; });
}
function printStatement(c, rows) {
  const w = PW(), L = [], line = "-".repeat(w); const since = addDays(new Date(), -90);
  L.push({ t: S().firm || "SEYYAR SATIŞ", c: 1, b: 1 }, { t: "HESAP EKSTRESİ", c: 1, b: 1 }, { t: fdt(new Date()), c: 1 }, line, "Cari: " + c.name); if (c.phone) L.push("Tel: " + c.phone); L.push(line);
  let run = 0, dev = null; rows.forEach(l => { run = r2(run + (+l.debit) - (+l.credit)); if (new Date(l.date) < since) { dev = run; return; } if (dev !== null) { L.push(lr("Devir", nf(dev), w)); dev = null; } L.push(lr(fd(l.date) + " " + (LK[l.kind] || l.kind), (+l.debit ? "+" + nf(l.debit) : "-" + nf(l.credit)), w)); });
  if (dev !== null) L.push(lr("Devir", nf(dev), w));
  L.push(line, { t: lr("BAKİYE", nf(run) + " TL", w), b: 1 }, { t: run > 0 ? "(Borçlu)" : run < 0 ? "(Alacaklı)" : "", c: 1 }, "");
  printLines(L);
}
function printStatementA4(c, rows) {
  let run = 0; const st = S();
  systemPrint(`<div class="inv"><div class="hd"><div class="box"><b>${esc(st.firm)}</b><br>${esc(st.address)}<br>${esc(st.phone)}</div><div class="box" style="text-align:right"><b style="font-size:16px">CARİ HESAP EKSTRESİ</b><br>${fdt(new Date())}</div></div>
   <div class="box" style="margin-bottom:8px"><b>${esc(c.name)}</b><br>${esc([c.address, c.district, c.city].filter(Boolean).join(" "))} ${c.vkn ? "· VKN/TCKN: " + esc(c.vkn) : ""} ${c.phone ? "· " + esc(c.phone) : ""}</div>
   <table><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th>Vade</th><th class="r">Borç</th><th class="r">Alacak</th><th class="r">Bakiye</th></tr>
   ${rows.map(l => { run = r2(run + (+l.debit) - (+l.credit)); return `<tr><td>${fd(l.date)}</td><td>${LK[l.kind] || l.kind}</td><td>${esc(l.note || "")}</td><td>${l.due_date ? fd(l.due_date) : ""}</td><td class="r">${+l.debit ? nf(l.debit) : ""}</td><td class="r">${+l.credit ? nf(l.credit) : ""}</td><td class="r">${nf(run)}</td></tr>`; }).join("")}
   <tr><td colspan="6"><b>Bakiye ${run > 0 ? "(Borçlu)" : run < 0 ? "(Alacaklı)" : ""}</b></td><td class="r"><b>${nf(run)} TL</b></td></tr></table></div>`);
}

/* =================== KASA / ÖDEME =================== */
function cashDialog(kind, opt = {}, after) {
  const accs = D.accounts.filter(a => a.active !== false); const party = opt.party;
  const T = { tahsilat: "Tahsilat al", odeme: "Ödeme yap", gider: "Gider ekle", gelir: "Gelir ekle", virman: "Hesaplar arası transfer", acilis: "Açılış / düzeltme girişi", dekont: "Borç / alacak dekontu" };
  const cats = kind === "gider" ? S().expenseCats : [];
  const b = party ? balance(party.id) : 0;
  dialog(`<h3>${T[kind]}${party ? " – " + esc(party.name) : ""}</h3>${party ? `<div class="small muted">Bakiye: ${tl(Math.abs(b))} ${b > 0 ? "(borçlu)" : b < 0 ? "(alacaklı)" : ""}</div>` : ""}
    ${kind === "dekont" ? `<div class="seg" id="dk" style="margin-top:8px"><button data-v="borc_dekont" class="on">Borçlandır (+)</button><button data-v="alacak_dekont">Alacaklandır (−)</button></div><div class="small muted" style="margin-top:4px">Kasa hareketi olmadan cari bakiyesini düzeltir (açılış bakiyesi, iskonto, düzeltme).</div>` : ""}
    <label>Tutar (₺)</label><input id="amt" inputmode="decimal" value="${kind === "tahsilat" && b > 0 ? String(b).replace(".", ",") : kind === "odeme" && b < 0 ? String(-b).replace(".", ",") : ""}">
    ${(kind === "tahsilat" || kind === "odeme") && accs.length > 1 && accs.length <= 4 ? `<label>${kind === "tahsilat" ? "Nasıl ödedi?" : "Nereden ödendi?"}</label><div class="seg big" id="accSeg">${accs.map(a => `<button data-a="${a.id}">${esc(a.type === "kasa" ? "Nakit" : a.type === "pos" ? "Kart" : a.type === "banka" ? "Havale" : a.name)}</button>`).join("")}</div>` : ""}
    ${party && (kind === "tahsilat" || kind === "odeme") ? `<div class="small muted" id="rem" style="margin-top:6px"></div>` : ""}
    ${kind !== "dekont" ? `<div ${(kind === "tahsilat" || kind === "odeme") && accs.length > 1 && accs.length <= 4 ? 'style="display:none"' : ""}><label>${kind === "virman" ? "Çıkan hesap" : "Hesap"}</label><select id="acc">${accs.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>` : ""}
    ${kind === "virman" ? `<label>Giren hesap</label><select id="acc2">${accs.map((a, i) => `<option value="${a.id}" ${i === 1 ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>` : ""}
    ${kind === "gider" ? `<label>Gider türü</label><select id="cat">${cats.map(c => `<option>${esc(c)}</option>`).join("")}</select>` : ""}
    ${(kind === "tahsilat" || kind === "odeme") && !party ? `<label>Cari</label><button class="btn block" id="pp" style="justify-content:flex-start">Cari seçin (isteğe bağlı)</button>` : ""}
    ${kind === "dekont" ? `<label>Vade (isteğe bağlı)</label><input id="due" type="date">` : ""}
    <label>Tarih</label><input id="dt" type="datetime-local" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}">
    <label>Açıklama</label><input id="note">
    <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="ok">Kaydet</button></div>`, (d, close) => {
    let pid = party ? party.id : null; let dk = "borc_dekont"; d.querySelector("#dt").onchange = e => e.target.dataset.touched = "1";
    setTimeout(() => d.querySelector("#amt").select(), 60);
    const pp = d.querySelector("#pp"); if (pp) pp.onclick = () => pickParty(kind === "odeme" ? "tedarikci" : "musteri", id => { pid = id; pp.textContent = partyById(id).name; });
    $$("#dk button", d).forEach(bt => bt.onclick = () => { dk = bt.dataset.v; $$("#dk button", d).forEach(y => y.classList.toggle("on", y === bt)); });
    const acc = d.querySelector("#acc"); if (acc && kind === "tahsilat") { const k = accs.find(a => a.type === "kasa"); if (k) acc.value = k.id; }
    const syncSeg = () => $$("#accSeg button", d).forEach(x => x.classList.toggle("on", acc && x.dataset.a === acc.value)); syncSeg();
    $$("#accSeg button", d).forEach(x => x.onclick = () => { acc.value = x.dataset.a; syncSeg(); });
    const rem = d.querySelector("#rem"); if (rem) { const upd = () => { const a = r2(pnum(d.querySelector("#amt").value)); const nb = r2(kind === "tahsilat" ? b - a : b + a); rem.innerHTML = a > 0 ? `İşlemden sonra bakiye: <b>${tl(Math.abs(nb))}</b> ${nb > 0.009 ? "(borçlu)" : nb < -0.009 ? "(alacaklı)" : "· hesap kapanır ✓"}` : ""; }; d.querySelector("#amt").oninput = upd; upd(); }
    d.querySelector("#ok").onclick = () => busy(d.querySelector("#ok"), async () => {
      const amt = r2(pnum(d.querySelector("#amt").value)); if (amt <= 0) throw new Error("Tutar girin");
      const k = kind === "dekont" ? dk : kind; const accId = acc ? acc.value : null;
      if (kind === "virman" && accId === d.querySelector("#acc2").value) throw new Error("Farklı hesaplar seçin");
      const note = [kind === "gider" ? "" : "", d.querySelector("#note").value.trim()].filter(Boolean).join(" ") || (kind === "gider" ? d.querySelector("#cat").value : null);
      const pl = { id: uuid(), kind: k, account_id: accId, to_account_id: kind === "virman" ? d.querySelector("#acc2").value : null, amount: amt, party_id: pid, category: kind === "gider" ? d.querySelector("#cat").value : null, note, date: d.querySelector("#dt").dataset.touched ? new Date(d.querySelector("#dt").value).toISOString() : new Date().toISOString(), due_date: d.querySelector("#due") ? d.querySelector("#due").value || null : null };
      await rpcNowOrQueue("save_cash", { p: pl }, T[kind] + " " + tl(amt));
      // yerel güncelle
      if (pid) D.pbal[pid] = r2((D.pbal[pid] || 0) + ((k === "odeme" || k === "borc_dekont") ? amt : -amt));
      if (accId) { const sg = (k === "tahsilat" || k === "gelir" || k === "acilis") ? 1 : -1; D.abal[accId] = r2((D.abal[accId] || 0) + sg * amt); if (kind === "virman") { const a2 = d.querySelector("#acc2").value; D.abal[a2] = r2((D.abal[a2] || 0) + amt); } }
      saveCache(); close(); toast("Kaydedildi");
      if (k === "tahsilat" && pid) { if (await ask("Tahsilat makbuzu yazdırılsın mı?", "Yazdır")) printReceipt(partyById(pid), pl); }
      if (after) after(); else refreshView();
    });
  });
}
function printReceipt(c, e) {
  const w = PW(), line = "-".repeat(w);
  printLines([{ t: S().firm || "SEYYAR SATIŞ", c: 1, b: 1 }, { t: "TAHSİLAT MAKBUZU", c: 1, b: 1 }, { t: fdt(e.date), c: 1 }, line, "Sayın: " + c.name, lr("Tahsil edilen", nf(e.amount) + " TL", w), ...(e.note ? wrap(e.note, w) : []), lr("Kalan bakiye", nf(balance(c.id)) + " TL", w), line, "", "Teslim alan: ..................", ""]);
}
const CK = { satis: "Satış", tahsilat: "Tahsilat", odeme: "Ödeme", alis: "Alış", gider: "Gider", gelir: "Gelir", virman: "Transfer", acilis: "Açılış/düzeltme", iade: "İade", iptal: "İptal" };
let kday = ymd(new Date()), kacc = "";
function vKasa() {
  const tok = renderTok; const accs = D.accounts.filter(a => a.active !== false);
  const total = sum(accs, a => D.abal[a.id] || 0);
  $("#app").innerHTML = `
   <div class="stats">${accs.map(a => `<div class="stat clickable ${kacc === a.id ? "sel" : ""}" data-a="${a.id}"><div class="k">${esc(a.name)}</div><div class="v num">${tl(D.abal[a.id] || 0)}</div></div>`).join("")}<div class="stat"><div class="k">Toplam</div><div class="v num">${tl(total)}</div></div></div>
   <div class="grid3" style="margin:12px 0"><button class="btn pri big1" data-k="gider">− Gider</button><button class="btn big1" id="gs">Gün sonu</button><button class="btn big1" id="kmore">⋯ Diğer</button></div>
   <div class="card"><div class="row"><h3 class="grow" style="margin:0">Hareketler</h3><input type="date" id="kd" value="${kday}" style="width:auto;min-height:38px"></div><div id="ksum" class="small muted" style="margin-top:6px"></div><div class="list" id="kl"><div class="empty">Yükleniyor…</div></div></div>
`;
  $$("[data-a]").forEach(el => el.onclick = () => { kacc = kacc === el.dataset.a ? "" : el.dataset.a; vKasa(); });
  $$("[data-k]").forEach(b => b.onclick = () => cashDialog(b.dataset.k, {}, () => { loadAll(true).then(() => vKasa()); vKasa(); }));
  $("#gs").onclick = () => go("gunsonu", { day: kday });
  $("#kd").onchange = e => { kday = e.target.value || ymd(new Date()); vKasa(); };
  const kAfter = () => { loadAll(true).then(() => vKasa()); vKasa(); };
  $("#kmore").onclick = () => actionSheet("Kasa işlemleri", [
    { t: "+ Gelir ekle", s: "Satış dışı para girişi", f: () => cashDialog("gelir", {}, kAfter) },
    { t: "Hesaplar arası transfer", s: "Kasadan bankaya vb.", f: () => cashDialog("virman", {}, kAfter) },
    { t: "Müşteriden tahsilat", f: () => cashDialog("tahsilat", {}, kAfter) },
    { t: "Tedarikçiye ödeme", f: () => cashDialog("odeme", {}, kAfter) },
    isAdmin() && { t: "Açılış / düzeltme girişi", f: () => cashDialog("acilis", {}, kAfter) },
    isAdmin() && { t: "Kasa/banka hesaplarını düzenle", f: accountsDialog }
  ]);
  const from = startOfDay(kday + "T00:00:00"), to = addDays(from, 1);
  API.getAll("cash_moves", `select=*&date=gte.${from.toISOString()}&date=lt.${to.toISOString()}${kacc ? "&account_id=eq." + kacc : ""}&order=date.desc,seq.desc`).then(rows => {
    if (tok !== renderTok) return;
    const inn = sum(rows.filter(r => +r.amount > 0 && r.kind !== "virman"), r => r.amount), out = sum(rows.filter(r => +r.amount < 0 && r.kind !== "virman"), r => -r.amount);
    $("#ksum").innerHTML = `Giriş: <b class="okc">${tl(inn)}</b> · Çıkış: <b class="danger">${tl(out)}</b> · Net: <b>${tl(inn - out)}</b>`;
    $("#kl").innerHTML = rows.length ? rows.map(m => { const pt = partyById(m.party_id); const a = accById(m.account_id); return `<div class="it"><div class="grow"><div class="small"><b>${CK[m.kind] || m.kind}</b>${m.category ? " · " + esc(m.category) : ""} · ${new Date(m.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div><div class="small muted">${esc([pt && pt.name, m.note, a && a.name].filter(Boolean).join(" · "))}${m.created_by && m.created_by !== API.email ? " · " + esc(m.created_by.split("@")[0]) : ""}</div></div><div class="num ${+m.amount < 0 ? "danger" : "okc"}"><b>${+m.amount > 0 ? "+" : ""}${nf(m.amount)}</b></div>${!m.document_id && isAdmin() ? `<button class="btn sm iconbtn" data-dl="${m.id}" style="width:34px;min-height:34px">${ICONS.x}</button>` : ""}</div>`; }).join("") : '<div class="empty">Bu günde hareket yok.</div>';
    $$("[data-dl]").forEach(bt => bt.onclick = async () => { if (!await ask("Bu kasa hareketi silinsin mi?", "Sil", true)) return; try { await API.rpc("delete_cash", { p_id: bt.dataset.dl }); await loadAll(true); vKasa(); } catch (e) { toast(e.message); } });
  }).catch(e => { if (tok === renderTok) $("#kl").innerHTML = `<div class="empty">${isNetErr(e) ? "Çevrimdışı – hareketler görüntülenemiyor" : esc(e.message)}</div>`; });
}
function accountsDialog() {
  dialog(`<h3>Kasa / banka hesapları</h3><div class="list" id="al"></div><div class="row" style="margin-top:8px"><input id="an" placeholder="Yeni hesap adı" class="grow"><select id="at" style="width:auto"><option value="kasa">Kasa</option><option value="banka">Banka</option><option value="pos">POS</option></select><button class="btn pri iconbtn" id="aa">${ICONS.plus}</button></div><div class="acts"><button class="btn" data-close>Kapat</button></div>`, (d) => {
    const draw = () => { d.querySelector("#al").innerHTML = D.accounts.map(a => `<div class="it"><div class="grow"><input data-n="${a.id}" value="${esc(a.name)}" style="min-height:38px"></div><label class="chk small" style="margin:0"><input type="checkbox" data-act="${a.id}" ${a.active !== false ? "checked" : ""}> Aktif</label></div>`).join("");
      $$("[data-n]", d).forEach(i => i.onchange = () => saveAcc(D.accounts.find(a => a.id === i.dataset.n), { name: i.value }));
      $$("[data-act]", d).forEach(i => i.onchange = () => saveAcc(D.accounts.find(a => a.id === i.dataset.act), { active: i.checked })); };
    const saveAcc = async (a, ch) => { Object.assign(a, ch); try { await writeNowOrQueue({ kind: "upsert", table: "accounts", rows: [{ id: a.id, name: a.name, type: a.type, active: a.active !== false, sort: a.sort || 0 }], label: "Hesap" }); saveCache(); toast("Kaydedildi"); } catch (e) { toast(e.message); } };
    d.querySelector("#aa").onclick = async () => { const n = d.querySelector("#an").value.trim(); if (!n) return; const a = { id: uuid(), name: n, type: d.querySelector("#at").value, active: true, sort: D.accounts.length + 1 }; D.accounts.push(a); await saveAcc(a, {}); d.querySelector("#an").value = ""; draw(); };
    draw();
  });
}
function vGunSonu(p) {
  const day = p.day || ymd(new Date()); const tok = renderTok;
  $("#app").innerHTML = `<div class="card row"><input type="date" id="gd" value="${day}" class="grow"><button class="btn" id="gp">${ICONS.print} Yazdır</button></div><div id="gc"><div class="empty">Yükleniyor…</div></div>`;
  $("#gd").onchange = e => { R.p.day = e.target.value; vGunSonu(R.p); };
  const from = startOfDay(day + "T00:00:00"), to = addDays(from, 1);
  Promise.all([
    API.getAll("documents", `select=id,type,doc_kind,total,paid,credit,pay_method,status,created_by&date=gte.${from.toISOString()}&date=lt.${to.toISOString()}&status=eq.aktif`),
    API.getAll("cash_moves", `select=*&date=gte.${from.toISOString()}&date=lt.${to.toISOString()}`),
    API.getAll("cash_moves", `select=account_id,amount&date=lt.${from.toISOString()}`)
  ]).then(([docs, moves, before]) => {
    if (tok !== renderTok) return;
    const sales = docs.filter(d => d.type === "satis"), rets = docs.filter(d => d.type === "satis_iade");
    const z = { day, nSales: sales.length, sales: sum(sales, d => d.total), rets: sum(rets, d => d.total), credit: sum(sales, d => d.credit), byPay: {} };
    ["nakit", "kart", "havale"].forEach(k => z.byPay[k] = sum(moves.filter(m => m.kind === "satis" && accType(m.account_id) === ({ nakit: "kasa", kart: "pos", havale: "banka" })[k]), m => m.amount));
    z.tahsilat = sum(moves.filter(m => m.kind === "tahsilat"), m => m.amount); z.odeme = sum(moves.filter(m => m.kind === "odeme" || m.kind === "alis"), m => -m.amount);
    z.gider = sum(moves.filter(m => m.kind === "gider"), m => -m.amount); z.iade = sum(moves.filter(m => m.kind === "iade"), m => m.amount);
    const kasa = D.accounts.filter(a => a.type === "kasa");
    z.kasaOpen = sum(before.filter(m => kasa.some(a => a.id === m.account_id)), m => m.amount);
    z.kasaIn = sum(moves.filter(m => kasa.some(a => a.id === m.account_id) && +m.amount > 0), m => m.amount);
    z.kasaOut = sum(moves.filter(m => kasa.some(a => a.id === m.account_id) && +m.amount < 0), m => -m.amount);
    z.kasaExp = r2(z.kasaOpen + z.kasaIn - z.kasaOut);
    const gby = {}; moves.filter(m => m.kind === "gider").forEach(m => gby[m.category || "Diğer"] = r2((gby[m.category || "Diğer"] || 0) - m.amount));
    const staff = {}; sales.forEach(d => { const k = (d.created_by || "?").split("@")[0]; staff[k] = r2((staff[k] || 0) + d.total); });
    window._z = z;
    $("#gc").innerHTML = `<div class="stats">
      <div class="stat"><div class="k">Satış (${z.nSales} belge)</div><div class="v num">${tl(z.sales)}</div></div>
      <div class="stat"><div class="k">İade</div><div class="v num danger">${tl(z.rets)}</div></div>
      <div class="stat"><div class="k">Nakit satış</div><div class="v num">${tl(z.byPay.nakit)}</div></div>
      <div class="stat"><div class="k">Kart satış</div><div class="v num">${tl(z.byPay.kart)}</div></div>
      <div class="stat"><div class="k">Havale satış</div><div class="v num">${tl(z.byPay.havale)}</div></div>
      <div class="stat"><div class="k">Veresiyeye yazılan</div><div class="v num danger">${tl(z.credit)}</div></div>
      <div class="stat"><div class="k">Veresiye tahsilatı</div><div class="v num okc">${tl(z.tahsilat)}</div></div>
      <div class="stat"><div class="k">Giderler</div><div class="v num danger">${tl(z.gider)}</div></div>
      <div class="stat"><div class="k">Tedarikçi ödemeleri</div><div class="v num">${tl(z.odeme)}</div></div>
     </div>
     <div class="card" style="margin-top:12px"><h3>Nakit kasa</h3>
      <div class="list"><div class="it"><span class="grow">Gün başı devir</span><b class="num">${tl(z.kasaOpen)}</b></div><div class="it"><span class="grow">Gün içi giriş</span><b class="num okc">+${tl(z.kasaIn)}</b></div><div class="it"><span class="grow">Gün içi çıkış</span><b class="num danger">−${tl(z.kasaOut)}</b></div><div class="it"><span class="grow"><b>Kasada olması gereken</b></span><b class="num">${tl(z.kasaExp)}</b></div></div>
      <label>Sayılan nakit</label><div class="row"><input id="cnt" inputmode="decimal" class="grow" placeholder="Kasadaki parayı sayıp yazın"><button class="btn" id="fk" disabled>Farkı işle</button></div><div id="fark" class="small" style="margin-top:6px"></div></div>
     ${Object.keys(gby).length ? `<div class="card"><h3>Gider dağılımı</h3><div class="list">${Object.entries(gby).map(([k, v]) => `<div class="it"><span class="grow">${esc(k)}</span><b class="num">${tl(v)}</b></div>`).join("")}</div></div>` : ""}
     ${Object.keys(staff).length > 1 ? `<div class="card"><h3>Personel satışları</h3><div class="list">${Object.entries(staff).map(([k, v]) => `<div class="it"><span class="grow">${esc(k)}</span><b class="num">${tl(v)}</b></div>`).join("")}</div></div>` : ""}`;
    const cnt = $("#cnt"); cnt.oninput = () => { const c = pnum(cnt.value); const f = r2(c - z.kasaExp); z.counted = c; z.diff = f; $("#fark").innerHTML = cnt.value ? (Math.abs(f) < 0.01 ? '<span class="okc">Kasa tutuyor ✓</span>' : `<span class="${f < 0 ? "danger" : "okc"}">Fark: ${f > 0 ? "+" : ""}${tl(f)} (${f < 0 ? "eksik" : "fazla"})</span>`) : ""; $("#fk").disabled = !cnt.value || Math.abs(f) < 0.01 || !isAdmin(); };
    $("#fk").onclick = () => busy($("#fk"), async () => { const k = kasa[0]; if (!k) throw new Error("Kasa hesabı yok"); await API.rpc("save_cash", { p: { id: uuid(), kind: z.diff > 0 ? "gelir" : "gider", account_id: k.id, amount: Math.abs(z.diff), category: "Kasa farkı", note: "Gün sonu kasa farkı " + fd(day), date: new Date(Math.min(Date.now(), to.getTime() - 1000)).toISOString() } }); await loadAll(true); toast("Kasa farkı işlendi"); vGunSonu(R.p); });
  }).catch(e => { if (tok === renderTok) $("#gc").innerHTML = `<div class="empty">${isNetErr(e) ? "Gün sonu için internet gerekli" : esc(e.message)}</div>`; });
  $("#gp").onclick = () => { const z = window._z; if (!z) return; const w = PW(); printLines([{ t: S().firm || "GÜN SONU", c: 1, b: 1 }, { t: "GÜN SONU RAPORU", c: 1 }, { t: fd(z.day + "T12:00:00"), c: 1 }, "-".repeat(w), lr("Satış (" + z.nSales + ")", nf(z.sales), w), lr("İade", nf(z.rets), w), lr("Nakit satış", nf(z.byPay.nakit), w), lr("Kart satış", nf(z.byPay.kart), w), lr("Havale satış", nf(z.byPay.havale), w), lr("Veresiye", nf(z.credit), w), lr("Tahsilat", nf(z.tahsilat), w), lr("Gider", nf(z.gider), w), lr("Ted. ödeme", nf(z.odeme), w), "-".repeat(w), lr("Kasa devir", nf(z.kasaOpen), w), lr("Kasa giriş", nf(z.kasaIn), w), lr("Kasa çıkış", nf(z.kasaOut), w), { t: lr("OLMASI GEREKEN", nf(z.kasaExp), w), b: 1 }, ...(z.counted !== undefined ? [lr("Sayılan", nf(z.counted), w), lr("Fark", nf(z.diff), w)] : []), "", { t: "Yazdırma: " + fdt(new Date()), c: 1 }]); };
}
const accType = id => (accById(id) || {}).type;

/* =================== RAPORLAR =================== */
let rp = "bugun", rFrom = ymd(new Date()), rTo = ymd(new Date());
function periodRange() {
  const now = new Date(); let a, b = addDays(startOfDay(now), 1);
  if (rp === "bugun") a = startOfDay(now);
  else if (rp === "dun") { a = addDays(startOfDay(now), -1); b = startOfDay(now); }
  else if (rp === "hafta") { a = startOfDay(now); a = addDays(a, -((a.getDay() + 6) % 7)); }
  else if (rp === "ay") { a = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (rp === "gecenay") { a = new Date(now.getFullYear(), now.getMonth() - 1, 1); b = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (rp === "yil") { a = new Date(now.getFullYear(), 0, 1); }
  else { a = startOfDay(rFrom + "T00:00:00"); b = addDays(startOfDay(rTo + "T00:00:00"), 1); }
  return [a, b];
}
function vRapor() {
  if (!isAdmin()) { $("#app").innerHTML = '<div class="empty">Raporları yalnızca yönetici görebilir.</div>'; return; }
  const tok = renderTok; const [a, b] = periodRange();
  $("#app").innerHTML = `<div class="card"><div class="chips">${[["bugun", "Bugün"], ["dun", "Dün"], ["hafta", "Bu hafta"], ["ay", "Bu ay"], ["gecenay", "Geçen ay"], ["yil", "Bu yıl"], ["ozel", "Tarih aralığı"]].map(([k, t]) => `<button class="pill ${rp === k ? "on" : ""}" data-p="${k}">${t}</button>`).join("")}</div>
    ${rp === "ozel" ? `<div class="grid2" style="margin-top:8px"><input type="date" id="rf" value="${rFrom}"><input type="date" id="rt" value="${rTo}"></div>` : ""}</div>
    <div id="rc"><div class="empty">Hesaplanıyor…</div></div>`;
  $$("[data-p]").forEach(bt => bt.onclick = () => { rp = bt.dataset.p; vRapor(); });
  const rf = $("#rf"); if (rf) { rf.onchange = () => { rFrom = rf.value; vRapor(); }; $("#rt").onchange = e => { rTo = e.target.value; vRapor(); }; }
  Promise.all([
    API.getAll("documents", `select=*,document_lines(*)&date=gte.${a.toISOString()}&date=lt.${b.toISOString()}&status=eq.aktif&order=date.asc`),
    API.getAll("cash_moves", `select=*&date=gte.${a.toISOString()}&date=lt.${b.toISOString()}`)
  ]).then(([docs, moves]) => { if (tok === renderTok) renderReport(docs.map(normDoc), moves, a, b); })
    .catch(e => { if (tok === renderTok) $("#rc").innerHTML = `<div class="empty">${isNetErr(e) ? "Raporlar için internet gerekli" : esc(e.message)}</div>`; });
}
function renderReport(docs, moves, a, b) {
  const sales = docs.filter(d => d.type === "satis"), rets = docs.filter(d => d.type === "satis_iade"), buys = docs.filter(d => d.type === "alis"), bret = docs.filter(d => d.type === "alis_iade");
  const sTot = sum(sales, d => d.total), rTot = sum(rets, d => d.total), net = r2(sTot - rTot);
  const lineCost = d => sum(d.lines, l => l.qty * l.cost);
  const cost = r2(sum(sales, lineCost) - sum(rets, lineCost)); const gp = r2(net - cost);
  const vat = r2(sum(sales, d => d.vat_total) - sum(rets, d => d.vat_total));
  const exp = sum(moves.filter(m => m.kind === "gider"), m => -m.amount); const np = r2(gp - exp);
  const tah = sum(moves.filter(m => m.kind === "tahsilat"), m => m.amount);
  const prod = {}, cat = {}, cust = {}, staff = {}, daily = {}, pay = {};
  const addL = (d, sg) => d.lines.forEach(l => { const ratio = d.gross ? d.total / d.gross : 1; const rev = l.qty * l.price * ratio * sg; const k = l.product_id || l.name; const p = prodById(l.product_id); prod[k] = prod[k] || { name: l.name, q: 0, rev: 0, cost: 0 }; prod[k].q += l.qty * sg; prod[k].rev += rev; prod[k].cost += l.qty * l.cost * sg; const c = (p && p.category) || "Kategorisiz"; cat[c] = cat[c] || { rev: 0, cost: 0 }; cat[c].rev += rev; cat[c].cost += l.qty * l.cost * sg; });
  sales.forEach(d => addL(d, 1)); rets.forEach(d => addL(d, -1));
  sales.forEach(d => { const k = d.party ? d.party.name : "Müşterisiz"; cust[k] = (cust[k] || 0) + d.total; const s = (d.created_by || "?").split("@")[0]; staff[s] = (staff[s] || 0) + d.total; const dk = ymd(d.date); daily[dk] = daily[dk] || { s: 0, c: 0, n: 0 }; daily[dk].s += d.total; daily[dk].c += lineCost(d); daily[dk].n++; pay[d.pay_method] = (pay[d.pay_method] || 0) + d.total; });
  rets.forEach(d => { const dk = ymd(d.date); daily[dk] = daily[dk] || { s: 0, c: 0, n: 0 }; daily[dk].s -= d.total; daily[dk].c -= lineCost(d); });
  const expCat = {}; moves.filter(m => m.kind === "gider").forEach(m => expCat[m.category || "Diğer"] = (expCat[m.category || "Diğer"] || 0) - m.amount);
  const topP = Object.values(prod).sort((x, y) => y.rev - x.rev);
  const act = D.products.filter(p => p.active !== false);
  const recv = D.parties.filter(c => balance(c.id) > 0.009).map(c => ({ c, b: balance(c.id), days: D.plast && D.plast[c.id] ? Math.floor((Date.now() - new Date(D.plast[c.id])) / 864e5) : 0 }));
  const aging = [[0, 30], [31, 60], [61, 90], [91, 1e9]].map(([x, y]) => sum(recv.filter(r => r.days >= x && r.days <= y), r => r.b));
  const bar = (v, max) => `<div class="bar"><i style="width:${max ? Math.max(2, v / max * 100) : 0}%"></i></div>`;
  const maxD = Math.max(1, ...Object.values(daily).map(x => x.s));
  window._rep = { docs, topP, cust };
  $("#rc").innerHTML = `
   <div class="stats">
    <div class="stat"><div class="k">Net satış (${sales.length} belge)</div><div class="v num">${tl(net)}</div>${rTot ? `<div class="small muted">Brüt ${tl(sTot)} · iade ${tl(rTot)}</div>` : ""}</div>
    <div class="stat"><div class="k">Satılan malın maliyeti</div><div class="v num">${tl(cost)}</div></div>
    <div class="stat"><div class="k">Brüt kâr</div><div class="v num ${gp < 0 ? "danger" : "okc"}">${tl(gp)}</div><div class="small muted">marj %${net ? (gp / net * 100).toFixed(1) : 0}</div></div>
    <div class="stat"><div class="k">Giderler</div><div class="v num danger">${tl(exp)}</div></div>
    <div class="stat"><div class="k">Net kâr</div><div class="v num ${np < 0 ? "danger" : "okc"}">${tl(np)}</div></div>
    <div class="stat"><div class="k">Hesaplanan KDV</div><div class="v num">${tl(vat)}</div></div>
    <div class="stat"><div class="k">Alışlar</div><div class="v num">${tl(sum(buys, d => d.total) - sum(bret, d => d.total))}</div></div>
    <div class="stat"><div class="k">Veresiye tahsilatı</div><div class="v num okc">${tl(tah)}</div></div>
   </div>
   <div class="card" style="margin-top:12px"><h3>Ödeme türüne göre satış</h3><div class="list">${Object.entries(pay).map(([k, v]) => `<div class="it"><span class="grow">${PAYN[k]}</span><b class="num">${tl(v)}</b></div>`).join("") || '<div class="empty">Satış yok</div>'}</div></div>
   ${Object.keys(daily).length > 1 ? `<div class="card"><h3>Günlük satış</h3><div class="list">${Object.entries(daily).map(([k, v]) => `<div class="it"><span style="width:84px" class="small">${new Date(k + "T12:00").toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", weekday: "short" })}</span><div class="grow">${bar(v.s, maxD)}</div><span class="num small" style="width:110px;text-align:right">${tl(v.s)}<br><span class="muted">kâr ${tl(v.s - v.c)}</span></span></div>`).join("")}</div></div>` : ""}
   <div class="card"><div class="row"><h3 class="grow" style="margin:0">En çok satan ürünler</h3><button class="btn sm" id="xp">${ICONS.dl} Excel</button></div><div class="list" style="margin-top:6px">${topP.slice(0, 15).map(x => `<div class="it"><div class="grow"><div class="t">${esc(x.name)}</div><div class="small muted">${qf(x.q)} adet · kâr ${tl(x.rev - x.cost)}</div></div><b class="num">${tl(x.rev)}</b></div>`).join("") || '<div class="empty">Satış yok</div>'}</div></div>
   <div class="card"><h3>Kategoriye göre</h3><div class="list">${Object.entries(cat).sort((x, y) => y[1].rev - x[1].rev).map(([k, v]) => `<div class="it"><span class="grow">${esc(k)}</span><span class="small muted num">kâr ${tl(v.rev - v.cost)}</span><b class="num" style="margin-left:8px">${tl(v.rev)}</b></div>`).join("") || '<div class="empty">—</div>'}</div></div>
   <div class="card"><h3>En çok alışveriş yapan müşteriler</h3><div class="list">${Object.entries(cust).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([k, v]) => `<div class="it"><span class="grow">${esc(k)}</span><b class="num">${tl(v)}</b></div>`).join("") || '<div class="empty">—</div>'}</div></div>
   ${Object.keys(staff).length ? `<div class="card"><h3>Personele göre satış</h3><div class="list">${Object.entries(staff).map(([k, v]) => `<div class="it"><span class="grow">${esc(k)}</span><b class="num">${tl(v)}</b></div>`).join("")}</div></div>` : ""}
   ${Object.keys(expCat).length ? `<div class="card"><h3>Gider dağılımı</h3><div class="list">${Object.entries(expCat).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<div class="it"><span class="grow">${esc(k)}</span><b class="num">${tl(v)}</b></div>`).join("")}</div></div>` : ""}
   <div class="card"><h3>Stok durumu (anlık)</h3><div class="list"><div class="it"><span class="grow">Stok değeri (alış)</span><b class="num">${tl(sum(act, p => Math.max(0, p.stock) * p.cost))}</b></div><div class="it"><span class="grow">Stok değeri (satış)</span><b class="num">${tl(sum(act, p => Math.max(0, p.stock) * p.retail))}</b></div><div class="it click" id="lowS"><span class="grow">Kritik seviyedeki ürünler</span><b>${act.filter(p => p.stock <= (p.min_stock || 0)).length} ›</b></div></div></div>
   <div class="card"><h3>Alacak yaşlandırma (anlık)</h3><div class="small muted" style="margin-bottom:6px">Son hareket tarihine göre</div><div class="stats">${["0-30 gün", "31-60 gün", "61-90 gün", "90+ gün"].map((t, i) => `<div class="stat"><div class="k">${t}</div><div class="v num ${i > 1 ? "danger" : ""}" style="font-size:17px">${tl(aging[i])}</div></div>`).join("")}</div>
    <div class="list" style="margin-top:8px">${recv.sort((x, y) => y.b - x.b).slice(0, 10).map(r => `<div class="it click" data-c="${r.c.id}"><span class="grow">${esc(r.c.name)} <span class="small muted">${r.days} gün</span></span><b class="num danger">${tl(r.b)}</b></div>`).join("")}</div></div>
   <div class="grid2"><button class="btn" id="xd">${ICONS.dl} Satış detayı (Excel)</button><button class="btn" id="xc">${ICONS.dl} Müşteri satışları (Excel)</button></div>`;
  $("#xp").onclick = () => download(`urun-satis-${ymd(a)}.csv`, toCSV(topP, [["Ürün", x => x.name], ["Miktar", x => r2(x.q)], ["Ciro", x => r2(x.rev)], ["Maliyet", x => r2(x.cost)], ["Kâr", x => r2(x.rev - x.cost)]]), "text/csv");
  $("#xd").onclick = () => { const rows = []; docs.forEach(d => d.lines.forEach(l => rows.push({ d, l }))); download(`satis-detay-${ymd(a)}.csv`, toCSV(rows, [["Tarih", x => fdt(x.d.date)], ["Belge", x => x.d.no], ["Tür", x => DOC_LABEL[x.d.type]], ["Cari", x => x.d.party ? x.d.party.name : ""], ["Ödeme", x => PAYN[x.d.pay_method]], ["Ürün", x => x.l.name], ["Barkod", x => x.l.barcode], ["Miktar", x => x.l.qty], ["Birim fiyat", x => x.l.price], ["KDV", x => x.l.vat], ["Tutar", x => r2(x.l.qty * x.l.price)], ["Maliyet", x => r2(x.l.qty * x.l.cost)], ["Personel", x => x.d.created_by]]), "text/csv"); };
  $("#xc").onclick = () => download(`musteri-satis-${ymd(a)}.csv`, toCSV(Object.entries(cust), [["Müşteri", x => x[0]], ["Satış", x => r2(x[1])]]), "text/csv");
  $("#lowS").onclick = () => { sflt = "az"; go("stok"); };
  $$("[data-c]").forEach(el => el.onclick = () => go("caridetay", { id: el.dataset.c }));
}

/* =================== BELGELER =================== */
let bflt = "", bq = "", bdays = 7;
function vBelgeler() {
  const tok = renderTok;
  $("#app").innerHTML = `<div class="card"><input id="bq" placeholder="Belge no veya cari ara" value="${esc(bq)}">
    <div class="chips" style="margin-top:8px">${[["", "Tümü"], ["satis", "Satış"], ["satis_iade", "Satış iade"], ["alis", "Alış"], ["alis_iade", "Alış iade"], ...(invoicing() || D.docs.some(d => d.doc_kind !== "fis") ? [["fatura", "Faturalar"], ["taslak", "Gönderilmemiş e-belge"]] : []), ["iptal", "İptal"]].map(([k, t]) => `<button class="pill ${bflt === k ? "on" : ""}" data-f="${k}">${t}</button>`).join("")}</div>
    <div class="chips" style="margin-top:6px">${[[1, "Bugün"], [7, "7 gün"], [30, "30 gün"], [90, "90 gün"], [365, "1 yıl"]].map(([k, t]) => `<button class="pill ${bdays === k ? "on" : ""}" data-d="${k}">${t}</button>`).join("")}</div></div>
    <div class="card list" id="bl"><div class="empty">Yükleniyor…</div></div>`;
  $("#bq").oninput = debounce(e => { bq = $("#bq").value; draw(); }, 200);
  $$("[data-f]").forEach(b => b.onclick = () => { bflt = b.dataset.f; vBelgeler(); });
  $$("[data-d]").forEach(b => b.onclick = () => { bdays = +b.dataset.d; vBelgeler(); });
  let docs = D.docs;
  const draw = () => {
    const f = fold(bq); const since = addDays(startOfDay(new Date()), -(bdays - 1));
    const l = docs.filter(d => new Date(d.date) >= since && (!bflt || (bflt === "fatura" ? d.doc_kind !== "fis" : bflt === "taslak" ? d.e_status === "taslak" && d.status !== "iptal" : bflt === "iptal" ? d.status === "iptal" : d.type === bflt)) && (!f || fold((d.no || "") + " " + (d.party ? d.party.name : "")).includes(f)));
    $("#bl").innerHTML = l.length ? `<div class="small muted" style="padding:4px 2px 8px">${l.length} belge · ${tl(sum(l.filter(d => d.status !== "iptal"), d => d.total))}</div>` + l.slice(0, 300).map(d => `<div class="it click" data-s="${d.id}">
      <div class="grow"><div class="t">${esc(d.no || "⏳ gönderim bekliyor")} ${d.status === "iptal" ? '<span class="tag b">iptal</span>' : d.e_status === "taslak" ? '<span class="tag w">taslak</span>' : d.e_status === "gonderildi" ? '<span class="tag">gönderildi</span>' : ""}</div>
      <div class="small muted">${docName(d)} · ${fdt(d.date)} · ${esc(d.party ? d.party.name : "Müşterisiz")}</div></div>
      <div class="right num"><b class="${d.type.endsWith("iade") ? "danger" : ""}">${tl(d.total)}</b><div class="small muted">${PAYN[d.pay_method] || ""}</div></div></div>`).join("") : '<div class="empty">Belge yok.</div>';
    $$("[data-s]").forEach(el => el.onclick = () => docDetail(docs.find(x => x.id === el.dataset.s)));
  };
  draw();
  if (bdays > 45 || online) {
    const since = addDays(startOfDay(new Date()), -(bdays - 1));
    API.getAll("documents", `select=*,document_lines(*)&date=gte.${since.toISOString()}&order=date.desc`).then(r => { if (tok !== renderTok) return; docs = D.docs.filter(d => d.pending).concat(r.map(normDoc)); draw(); }).catch(() => { });
  }
}
async function openDoc(id) {
  let d = D.docs.find(x => x.id === id);
  if (!d) { try { const r = await API.get(`documents?select=*,document_lines(*)&id=eq.${id}`); if (r[0]) d = normDoc(r[0]); } catch (e) { return toast(e.message); } }
  if (d) docDetail(d);
}
function docDetail(d) {
  if (!d) return; const isE = d.doc_kind === "earsiv" || d.doc_kind === "efatura";
  dialog(`<h3>${docName(d)} – ${esc(d.no || "gönderim bekliyor")}</h3>
    <div class="small muted">${fdt(d.date)} · ${esc(d.party ? d.party.name : "Müşterisiz")}${d.created_by ? " · " + esc(d.created_by) : ""}${d.ettn && isE ? `<br>ETTN: ${esc(d.ettn)}` : ""}${d.supplier_doc_no ? `<br>Tedarikçi belge no: ${esc(d.supplier_doc_no)}` : ""}</div>
    <pre class="rc" style="margin-top:10px">${esc(linesToText(buildText(d)))}</pre>
    <div class="grid2" style="margin-top:10px">
      <button class="btn pri" id="pr">${ICONS.print} Yazdır</button><button class="btn" id="a4">A4 / PDF</button>
      ${isE ? `<button class="btn" id="xml">e-Belge XML</button><button class="btn" id="send" ${d.e_status !== "taslak" ? "disabled" : ""}>Entegratöre gönder</button>` : ""}
      ${isE && d.e_status === "taslak" ? `<button class="btn" id="mark">Gönderildi işaretle</button>` : ""}
      ${d.type === "satis" && d.status !== "iptal" && !d.pending ? `<button class="btn" id="ret">İade al</button>` : ""}
      ${d.type === "alis" && d.status !== "iptal" && !d.pending ? `<button class="btn" id="ret">Tedarikçiye iade</button>` : ""}
      ${d.party && d.party.phone ? `<a class="btn" target="_blank" rel="noopener" href="${waLink(d.party.phone, docWaText(d))}">WhatsApp</a>` : ""}
      ${d.status !== "iptal" && !d.pending && isAdmin() ? `<button class="btn bad" id="cancel">İptal et</button>` : ""}
    </div>
    <div class="acts"><button class="btn" data-close>Kapat</button></div>`, (dl, close) => {
    dl.querySelector("#pr").onclick = () => printDoc(d);
    dl.querySelector("#a4").onclick = () => printA4(d);
    const xml = dl.querySelector("#xml"); if (xml) xml.onclick = () => xmlDialog(d);
    const send = dl.querySelector("#send"); if (send) send.onclick = () => busy(send, () => sendToIntegrator(d).then(ok => { if (ok) { close(); docDetail(d); } }));
    const mark = dl.querySelector("#mark"); if (mark) mark.onclick = () => busy(mark, async () => { await writeNowOrQueue({ kind: "patch", table: "documents", filter: "id=eq." + d.id, body: { e_status: "gonderildi" }, label: "e-belge durumu" }); d.e_status = "gonderildi"; saveCache(); close(); docDetail(d); });
    const ret = dl.querySelector("#ret"); if (ret) ret.onclick = () => { close(); const t = d.type === "satis" ? "satis_iade" : "alis_iade"; const c = newCart(t); c.partyId = d.party_id || ""; c.refDocId = d.id; c.refDoc = d.no; c.mode = d.price_mode; c.items = d.lines.filter(l => l.product_id).map(l => ({ pid: l.product_id, name: l.name, barcode: l.barcode, unit: l.unit, vat: l.vat, price: l.price, qty: l.qty })); c.pay = d.pay_method === "veresiye" ? "veresiye" : d.pay_method; carts[t] = c; saveCarts(); toast("İade edilmeyecek kalemleri silin, miktarları düzeltin"); go("doc", { type: t }); };
    const cancel = dl.querySelector("#cancel"); if (cancel) cancel.onclick = async () => {
      close(); const msg = d.e_status === "gonderildi" ? "Bu fatura GİB'e iletilmiş. Uygulamada iptal edilir; resmi iptali entegratör/GİB portalından ayrıca yapmalısınız. Devam?" : "Belge iptal edilsin mi? Stok, kasa ve cari hareketleri geri alınır.";
      if (!await ask(msg, "İptal et", true)) return;
      try { await API.rpc("cancel_document", { p_id: d.id }); d.status = "iptal"; await loadAll(true); toast("İptal edildi"); refreshView(); } catch (e) { toast(isNetErr(e) ? "İptal için internet gerekli" : e.message); }
    };
  });
}
function xmlDialog(d) {
  const xml = buildUBL(d);
  dialog(`<h3>${docName(d)} XML (UBL-TR 1.2)</h3><div class="small muted">${esc(d.no)} · ETTN ${esc(d.ettn)}</div><textarea readonly style="min-height:200px;margin-top:8px;font:11px ui-monospace,monospace">${esc(xml)}</textarea><div class="hint">Bu XML'i entegratörünüzün paneline “dosyadan fatura yükle” ile yükleyebilirsiniz. İmzalama ve GİB'e iletim entegratör tarafından yapılır.</div><div class="acts"><button class="btn" id="dl">İndir</button><button class="btn pri" id="cp">Kopyala</button></div>`, (dl) => {
    dl.querySelector("#cp").onclick = () => copyText(xml); dl.querySelector("#dl").onclick = () => download(d.no + ".xml", xml, "application/xml");
  });
}
async function sendToIntegrator(d) {
  const st = S();
  if (!st.endpoint) { dialog(`<h3>Gönderim adresi tanımlı değil</h3><div class="hint">Daha → Ayarlar → e-Fatura bölümüne entegratörünüzün API adresini ve anahtarını girin. O zamana kadar XML'i entegratör paneline yükleyip “Gönderildi işaretle”yi kullanın.</div><div class="acts"><button class="btn" data-close>Kapat</button><button class="btn pri" id="x">XML'i göster</button></div>`, (dl, close) => { dl.querySelector("#x").onclick = () => { close(); xmlDialog(d); }; }); return false; }
  const r = await fetch(st.endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...(st.token ? { Authorization: "Bearer " + st.token } : {}) }, body: JSON.stringify({ type: d.doc_kind === "earsiv" ? "EARSIV" : "EFATURA", invoiceNumber: d.no, uuid: d.ettn, receiverId: (d.party && d.party.vkn) || "11111111111", receiverEmail: (d.party && d.party.email) || "", ublXmlBase64: btoa(unescape(encodeURIComponent(buildUBL(d)))) }) });
  if (!r.ok) throw new Error("Entegratör yanıtı: HTTP " + r.status);
  await API.patch("documents", "id=eq." + d.id, { e_status: "gonderildi" }); d.e_status = "gonderildi"; saveCache(); toast("Gönderildi ✓"); return true;
}

/* =================== MENÜ & AYARLAR =================== */
function vMenu() {
  const item = (k, t, s) => `<div class="it click" data-m="${k}"><div class="grow"><div class="t">${t}</div>${s ? `<div class="small muted">${s}</div>` : ""}</div><span class="muted">›</span></div>`;
  const simple = isSimple(); const qn = Q.items.length;
  $("#app").innerHTML = `
   <div class="card"><div class="row"><div class="grow"><b>${esc(API.email || "")}</b><div class="small muted">${isAdmin() ? "Yönetici" : "Personel"} · ${simple ? "Basit mod" : "Gelişmiş mod"}</div></div><button class="btn sm" id="rl">${ICONS.refresh} Yenile</button></div></div>
   ${qn ? `<div class="card list">${item("kuyruk", `<span class="warnc">${qn} işlem gönderilmeyi bekliyor</span>`, "İnternet gelince otomatik gönderilir")}</div>` : ""}
   <div class="card list">
    ${!simple && isAdmin() ? item("rapor", "Raporlar", "Kâr, en çok satanlar, müşteriler") : ""}
    ${!simple ? item("kasa", "Kasa", "Nakit, kart, banka; gider ve gelir") : ""}
    ${item("gunsonu", "Gün sonu", "Kasa sayımı ve günlük özet")}
    ${item("belgeler", "Satış geçmişi", "Fişler, faturalar, tekrar yazdır")}
    ${item("satis_iade", "İade al", "Müşteriden ürün iadesi")}
   </div>
   ${!simple ? `<div class="card list">
    ${item("alis", "Alış girişi", "Tedarikçiden mal kabul")}
    ${item("sayim", "Stok sayımı", "Okut-say, stokları eşitle")}
    ${item("alis_iade", "Tedarikçiye iade", "")}
   </div>` : ""}
   <div class="card list">
    ${item("ayarlar", "Ayarlar", "Görünüm, yazıcı, firma bilgileri")}
    ${!simple && isAdmin() ? item("kullanicilar", "Kullanıcılar", "Personel ekle / yetki") : ""}
    ${!simple && isAdmin() ? item("yedek", "Yedek & dışa aktar", "") : ""}
    ${!simple && isAdmin() ? item("kurulum", "Kurulum sihirbazı", "Firma, yazıcı, ilk ürünler") : ""}
    ${isAdmin() || S().staffSimple === false ? item("mod", simple ? "Gelişmiş moda geç" : "Basit moda geç", simple ? "Tüm özellikleri göster" : "Sadece satış ve tahsilat") : ""}
    ${item("cikis", "Çıkış yap", "")}
   </div>
   <div class="small muted" style="text-align:center">Seyyar Satış v${APP_VER}${D.loadedAt ? " · son eşitleme " + fdt(D.loadedAt) : ""}</div>`;
  $("#rl").onclick = () => busy($("#rl"), async () => { await Q.flush(); const r = await loadAll(); if (r === "ok") { toast("Güncellendi"); vMenu(); } });
  $$("[data-m]").forEach(el => el.onclick = async () => {
    const m = el.dataset.m;
    if (["alis", "satis_iade", "alis_iade"].includes(m)) return go("doc", { type: m });
    if (m === "gunsonu") return go("gunsonu", { day: ymd(new Date()) });
    if (m === "kurulum") return setupWizard();
    if (m === "mod") { lsSet("ss_mode", simple ? "gelismis" : "basit"); toast(simple ? "Gelişmiş mod" : "Basit mod"); return go("menu"); }
    if (m === "cikis") { if (qn && !await ask(`${qn} işlem henüz gönderilmedi. Çıkış yaparsanız kaybolabilir. Yine de çıkılsın mı?`, "Çıkış yap", true)) return; if (!qn && !await ask("Çıkış yapılsın mı?", "Çıkış yap")) return; await API.logout(); lsSet("ss_cache", null); Q.items = []; Q.save(); location.reload(); return; }
    go(m);
  });
}
function vKuyruk() {
  $("#app").innerHTML = `<div class="card list">${Q.items.length ? Q.items.map((o, i) => `<div class="it"><div class="grow"><div class="t">${esc(o.label || o.fn || o.table)}</div><div class="small muted">${fdt(o.at)}${o.failed ? ` · <span class="danger">${esc(o.error || "hata")}</span>` : " · bekliyor"}</div></div>${o.failed ? `<button class="btn sm" data-r="${i}">Tekrar</button><button class="btn sm bad" data-x="${i}">Sil</button>` : ""}</div>`).join("") : '<div class="empty">Bekleyen işlem yok ✓</div>'}</div>
   ${Q.items.length ? `<button class="btn pri block" id="fl">Şimdi gönder</button>` : ""}`;
  $$("[data-r]").forEach(b => b.onclick = () => { const o = Q.items[b.dataset.r]; o.failed = false; Q.save(); Q.flush().then(() => vKuyruk()); });
  $$("[data-x]").forEach(b => b.onclick = async () => { if (await ask("Bu işlem silinsin mi? Sunucuya hiç gönderilmeyecek.", "Sil", true)) { Q.items.splice(b.dataset.x, 1); Q.save(); D.docs = D.docs.filter(d => !d.pending || Q.items.some(o => o.args && o.args.p_doc && o.args.p_doc.id === d.id)); saveCache(); vKuyruk(); } });
  const fl = $("#fl"); if (fl) fl.onclick = () => busy(fl, async () => { Q.items.forEach(o => o.failed = false); await Q.flush(); vKuyruk(); });
}
function getFont() { return lsGet("ss_font", "normal"); }
function applyFont(f) { lsSet("ss_font", f); document.documentElement.classList.toggle("big", f === "big"); }
function vAyarlar() {
  const s = S(); const adm = isAdmin();
  const f = (k, l, ph = "", im = "") => `<div><label>${l}</label><input data-k="${k}" value="${esc(s[k] ?? "")}" placeholder="${esc(ph)}" ${im ? `inputmode="${im}"` : ""} ${adm ? "" : "disabled"}></div>`;
  const loc = k => setting(k);
  const canMode = adm || S().staffSimple === false;
  $("#app").innerHTML = `
  <div class="card"><h2>Görünüm</h2>
    <label style="margin-top:0">Tema</label><div class="seg" id="thSeg">${Object.entries(THEMES).map(([k, t]) => `<button data-th="${k}" class="${getTheme() === k ? "on" : ""}">${t}</button>`).join("")}</div>
    <label>Yazı boyutu</label><div class="seg" id="fsSeg"><button data-fs="normal" class="${getFont() === "normal" ? "on" : ""}">Normal</button><button data-fs="big" class="${getFont() === "big" ? "on" : ""}">Büyük</button></div>
    ${canMode ? `<label>Kullanım</label><div class="seg" id="mdSeg"><button data-md="basit" class="${isSimple() ? "on" : ""}">Basit</button><button data-md="gelismis" class="${!isSimple() ? "on" : ""}">Gelişmiş</button></div><div class="small muted" style="margin-top:4px">Basit modda yalnızca satış, müşteriler ve gün sonu görünür.</div>` : ""}
  </div>
  <div class="card"><h2>Yazıcı</h2>
    <div class="grid2">
      <div><label style="margin-top:0">Bağlantı</label><select data-l="printMode"><option value="bt" ${loc("printMode") === "bt" ? "selected" : ""}>Bluetooth</option><option value="rawbt" ${loc("printMode") === "rawbt" ? "selected" : ""}>RawBT uygulaması</option><option value="system" ${loc("printMode") === "system" ? "selected" : ""}>Sistem / PDF</option></select></div>
      <div><label style="margin-top:0">Kağıt</label><select data-l="paper"><option value="58" ${String(loc("paper")) === "58" ? "selected" : ""}>58 mm</option><option value="80" ${String(loc("paper")) === "80" ? "selected" : ""}>80 mm</option></select></div>
    </div>
    <div class="grid2" style="margin-top:10px"><button class="btn pri" id="btc">${bt.ch ? "✓ " + esc(bt.dev.name || "Bağlı") : "Yazıcı bağla"}</button><button class="btn" id="tp">Test çıktısı</button></div>
    <label class="chk"><input type="checkbox" data-l="autoPrint" ${loc("autoPrint") ? "checked" : ""}> Satış bitince otomatik yazdır</label>
    <details class="other"><summary>Gelişmiş yazıcı ayarları</summary>
      <div class="grid2">
        <div><label>Türkçe karakter</label><select data-l="charset"><option value="cp857" ${loc("charset") === "cp857" ? "selected" : ""}>CP857</option><option value="ascii" ${loc("charset") === "ascii" ? "selected" : ""}>Dönüştür (ş→s…)</option></select></div>
        <div><label>Kod sayfası no</label><input data-l="codepage" inputmode="numeric" value="${esc(loc("codepage"))}"></div>
        <div><label>Kopya sayısı</label><input data-l="copies" inputmode="numeric" value="${esc(loc("copies"))}"></div>
      </div>
      <div class="hint">Türkçe harfler bozuk çıkarsa kod sayfasını 13, 61 veya 29 deneyin ya da “Dönüştür”ü seçin. iPhone/iPad'de “Sistem / PDF” kullanın.</div>
    </details>
  </div>
  <div class="card"><h2>Firma bilgileri</h2>${adm ? "" : '<div class="small muted">Yalnızca yönetici değiştirebilir.</div>'}
    <div class="grid2">${f("firm", "Firma adı")}${f("phone", "Telefon", "", "tel")}</div>
    <div><label>Adres</label><input data-k="address" value="${esc(s.address)}" ${adm ? "" : "disabled"}></div>
    <div><label>Fiş alt yazısı</label><input data-k="footer" value="${esc(s.footer)}" ${adm ? "" : "disabled"}></div>
    <details class="other"><summary>Vergi bilgileri</summary><div class="grid2">${f("owner", "Yetkili ad soyad")}${f("vkn", "VKN / TCKN", "", "numeric")}${f("taxOffice", "Vergi dairesi")}${f("city", "İl")}${f("email", "E-posta", "", "email")}${f("mersis", "MERSİS no")}</div></details>
  </div>
  ${adm ? `<div class="card"><h2>Fatura (e-Arşiv / e-Fatura)</h2>
    <label class="chk" style="margin-top:0"><input type="checkbox" id="invOn" ${s.invoicing ? "checked" : ""}> Fatura kesiyorum</label>
    <div class="small muted">Kapalıyken fatura seçenekleri hiçbir ekranda görünmez; satışlar bilgi fişi olarak kaydedilir.</div>
    ${s.invoicing ? `<div class="grid2">${f("serEarsiv", "e-Arşiv seri (3 harf)", "EAR")}${f("serEfatura", "e-Fatura seri (3 harf)", "EFT")}
      <div><label>e-Fatura senaryosu</label><select data-k="efaturaProfile"><option value="TICARIFATURA" ${s.efaturaProfile === "TICARIFATURA" ? "selected" : ""}>Ticari</option><option value="TEMELFATURA" ${s.efaturaProfile === "TEMELFATURA" ? "selected" : ""}>Temel</option></select></div>
      ${f("integrator", "Özel entegratör", "Uyumsoft, Logo, Paraşüt…")}</div>
    ${f("endpoint", "Gönderim adresi (entegratör API)", "https://…")}
    <div><label>API anahtarı</label><input data-k="token" type="password" value="${esc(s.token)}"></div>
    <div class="hint">Faturalar GİB'in UBL-TR 1.2 formatında hazırlanır. Resmî olarak kesilmeleri için GİB'e kayıtlı olmanız ve bir özel entegratörle çalışmanız gerekir.</div>` : ""}
  </div>
  <div class="card"><h2>Genel</h2>
    <div class="grid2">
      <div><label style="margin-top:0">Stok eksiye düşebilir</label><select data-k="allowNegative" data-bool="1"><option value="1" ${s.allowNegative ? "selected" : ""}>Evet</option><option value="0" ${!s.allowNegative ? "selected" : ""}>Hayır</option></select></div>
      <div><label>Personel modu</label><select data-k="staffSimple" data-bool="1"><option value="1" ${s.staffSimple !== false ? "selected" : ""}>Hep basit</option><option value="0" ${s.staffSimple === false ? "selected" : ""}>Kendisi seçsin</option></select></div>
      <div><label>Personel alış fiyatını görsün</label><select data-k="staffSeeCost" data-bool="1"><option value="0" ${!s.staffSeeCost ? "selected" : ""}>Hayır</option><option value="1" ${s.staffSeeCost ? "selected" : ""}>Evet</option></select></div>
    </div>
    <label>Ürün kategorileri (virgülle)</label><input data-k="categories" data-list="1" value="${esc((s.categories || []).join(", "))}">
    <label>Gider türleri (virgülle)</label><input data-k="expenseCats" data-list="1" value="${esc((s.expenseCats || []).join(", "))}">
  </div>` : ""}`;
  $$("#thSeg button").forEach(b => b.onclick = () => { applyTheme(b.dataset.th); $$("#thSeg button").forEach(x => x.classList.toggle("on", x === b)); });
  $$("#fsSeg button").forEach(b => b.onclick = () => { applyFont(b.dataset.fs); $$("#fsSeg button").forEach(x => x.classList.toggle("on", x === b)); });
  $$("#mdSeg button").forEach(b => b.onclick = () => { lsSet("ss_mode", b.dataset.md); render(); });
  $$("[data-l]").forEach(el => el.onchange = () => { const k = el.dataset.l; let v = el.type === "checkbox" ? el.checked : el.value; if (["codepage", "copies"].includes(k)) v = pnum(v); setLocal(k, v); updPrnPill(); toast("Kaydedildi"); });
  const saveSh = debounce(async () => { try { await saveShared({}); toast("Kaydedildi"); } catch (e) { toast(e.message); } }, 400);
  $$("[data-k]").forEach(el => el.onchange = () => { const k = el.dataset.k; let v = el.value; if (el.dataset.bool) v = v === "1"; if (el.dataset.list) v = v.split(",").map(x => x.trim()).filter(Boolean); if (k === "vkn") v = v.replace(/\D/g, ""); D.settings = { ...S(), [k]: v }; saveCache(); saveSh(); });
  const io = $("#invOn"); if (io) io.onchange = async () => { await saveShared({ invoicing: io.checked }).catch(e => toast(e.message)); vAyarlar(); };
  $("#btc").onclick = () => btConnect(true).then(() => vAyarlar());
  $("#tp").onclick = () => printLines([{ t: "TEST ÇIKTISI", c: 1, b: 1, big: 1 }, "ÇçĞğİıÖöŞşÜü", lr("Sol", "Sağ", PW()), "1234567890".repeat(5).slice(0, PW()), { t: S().firm || "Seyyar Satış", c: 1 }]);
}

/* =================== KURULUM SİHİRBAZI =================== */
function setupWizard() {
  let step = 0; const added = [];
  const steps = ["Firma", "Yazıcı", "Ürünler"];
  dialog(`<div id="wz"></div>`, (d, close) => {
    const finish = async () => { try { await saveShared({ setupDone: true }); } catch (e) { } close(); toast("Kurulum tamam. İyi satışlar!"); go("satis"); };
    const draw = () => {
      const head = `<div class="steps">${steps.map((s, i) => `<span class="${i === step ? "on" : i < step ? "done" : ""}">${i + 1}. ${s}</span>`).join("")}</div>`;
      let body = "";
      if (step === 0) body = `<h3>İşletmenizin bilgileri</h3><div class="small muted">Fişlerin üstünde görünür. Sonra Ayarlar'dan değiştirebilirsiniz.</div>
        <label>Firma / tabela adı</label><input id="w_firm" value="${esc(S().firm)}" placeholder="Örn: Durusu Oyuncak">
        <label>Telefon</label><input id="w_phone" inputmode="tel" value="${esc(S().phone)}">
        <label>Fiş alt yazısı</label><input id="w_footer" value="${esc(S().footer)}">`;
      if (step === 1) body = `<h3>Fiş yazıcısı</h3><div class="small muted">Yazıcınızı açın ve telefonun Bluetooth'unun açık olduğundan emin olun.</div>
        <label>Yazıcı türü</label><div class="seg" id="w_pm"><button data-v="bt" class="${setting("printMode") === "bt" ? "on" : ""}">Bluetooth</button><button data-v="rawbt" class="${setting("printMode") === "rawbt" ? "on" : ""}">RawBT</button><button data-v="system" class="${setting("printMode") === "system" ? "on" : ""}">Yok / PDF</button></div>
        <label>Kağıt genişliği</label><div class="seg" id="w_pp"><button data-v="58" class="${String(setting("paper")) === "58" ? "on" : ""}">58 mm</button><button data-v="80" class="${String(setting("paper")) === "80" ? "on" : ""}">80 mm</button></div>
        <div class="grid2" style="margin-top:12px"><button class="btn" id="w_bt">${bt.ch ? "✓ Bağlı" : "Yazıcıyı bağla"}</button><button class="btn" id="w_tp">Test çıktısı</button></div>`;
      if (step === 2) body = `<h3>İlk ürünleriniz</h3><div class="small muted">En çok sattığınız birkaç ürünü ekleyin. Barkodu olmayanlar için boş bırakın; satış ekranında dokunarak satarsınız.</div>
        <label>Ürün adı</label><input id="w_n" placeholder="Örn: Pamuk şeker">
        <div class="grid2"><div><label>Fiyat (₺)</label><input id="w_p" inputmode="decimal"></div><div><label>Stok</label><input id="w_s" inputmode="decimal" placeholder="0"></div></div>
        <label>Barkod (varsa)</label><div class="row"><input id="w_b" inputmode="numeric"><button class="btn iconbtn" id="w_cam">${ICONS.cam}</button></div>
        <button class="btn block" id="w_add" style="margin-top:10px">${ICONS.plus} Ekle</button>
        <div class="list small" style="margin-top:6px">${added.map(x => `<div class="it">✓ ${esc(x.name)} <span class="grow"></span>${tl(x.retail)}</div>`).join("")}</div>
        <div class="small muted" style="margin-top:6px">Çok ürününüz varsa sonra Ürünler → ⋯ → Excel'den ürün ekle ile toplu yükleyebilirsiniz.</div>`;
      d.querySelector("#wz").innerHTML = head + body + `<div class="acts">${step ? '<button class="btn" id="w_back">Geri</button>' : '<button class="btn" id="w_skip">Sonra</button>'}<button class="btn pri" id="w_next">${step === 2 ? "Bitir" : "Devam"}</button></div>`;
      const nx = d.querySelector("#w_next"), bk = d.querySelector("#w_back"), sk = d.querySelector("#w_skip");
      if (sk) sk.onclick = async () => { try { await saveShared({ setupDone: true }); } catch (e) { } close(); };
      if (bk) bk.onclick = () => { step--; draw(); };
      if (step === 0) nx.onclick = () => busy(nx, async () => { await saveShared({ firm: d.querySelector("#w_firm").value.trim(), phone: d.querySelector("#w_phone").value.trim(), footer: d.querySelector("#w_footer").value.trim() }); step = 1; draw(); });
      if (step === 1) {
        $$("#w_pm button", d).forEach(b => b.onclick = () => { setLocal("printMode", b.dataset.v); draw(); });
        $$("#w_pp button", d).forEach(b => b.onclick = () => { setLocal("paper", b.dataset.v); draw(); });
        d.querySelector("#w_bt").onclick = () => (setting("printMode") === "bt" ? btConnect(true) : Promise.resolve(toast("Bluetooth seçili değil"))).then(draw);
        d.querySelector("#w_tp").onclick = () => printLines([{ t: S().firm || "Seyyar Satış", c: 1, b: 1 }, { t: "Yazıcı hazır ✓", c: 1 }, ""]);
        nx.onclick = () => { step = 2; draw(); };
      }
      if (step === 2) {
        d.querySelector("#w_cam").onclick = () => scanDialog(code => { d.querySelector("#w_b").value = code; });
        d.querySelector("#w_add").onclick = () => busy(d.querySelector("#w_add"), async () => {
          const name = d.querySelector("#w_n").value.trim(), price = r2(pnum(d.querySelector("#w_p").value)), st = pnum(d.querySelector("#w_s").value), bc = d.querySelector("#w_b").value.trim() || null;
          if (!name || !price) throw new Error("Ad ve fiyat girin");
          if (bc && D.products.some(o => o.barcode === bc)) throw new Error("Bu barkod kayıtlı");
          const row = { id: uuid(), barcode: bc, name, retail: price, wholesale: price, cost: 0, vat: 20, unit: "Adet", min_stock: 0, active: true };
          await writeNowOrQueue({ kind: "upsert", table: "products", rows: [productRow(row)], label: "Ürün: " + name });
          if (st) await rpcNowOrQueue("stock_adjust", { p: { product_id: row.id, type: "giris", qty: st, note: "Açılış stoğu" } }, "Açılış stoğu");
          row.stock = st; D.products.push(row); added.push(row); saveCache(); draw(); setTimeout(() => d.querySelector("#w_n").focus(), 50);
        });
        nx.onclick = finish;
      }
    };
    draw();
  }, { modal: true });
}
function vKullanicilar() {
  $("#app").innerHTML = `<div class="card"><div class="small muted">Eklediğiniz kişi, uygulamayı açıp aynı e-postayla <b>Kayıt ol</b> dediğinde giriş yapabilir. Personel; satış, iade, tahsilat, stok ve cari işlemlerini yapabilir; raporları, kasa silme ve belge iptalini yapamaz.</div>
   <div class="row" style="margin-top:10px"><input id="ue" type="email" placeholder="e-posta" class="grow"><select id="ur" style="width:auto"><option value="personel">Personel</option><option value="yonetici">Yönetici</option></select><button class="btn pri iconbtn" id="ua">${ICONS.plus}</button></div></div>
   <div class="card list">${D.users.map(u => `<div class="it"><div class="grow"><div class="t">${esc(u.email)}</div><div class="small muted">${u.role === "yonetici" ? "Yönetici" : "Personel"} · ${fd(u.created_at)}</div></div>${u.email.toLowerCase() !== (API.email || "").toLowerCase() ? `<select data-role="${esc(u.email)}" style="width:auto;min-height:36px"><option value="personel" ${u.role === "personel" ? "selected" : ""}>Personel</option><option value="yonetici" ${u.role === "yonetici" ? "selected" : ""}>Yönetici</option></select><button class="btn sm bad" data-del="${esc(u.email)}">Kaldır</button>` : '<span class="tag">siz</span>'}</div>`).join("")}</div>`;
  const reload = async () => { D.users = await API.get("app_users?select=*&order=created_at.asc"); saveCache(); vKullanicilar(); };
  $("#ua").onclick = () => busy($("#ua"), async () => { const e = $("#ue").value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error("Geçerli e-posta girin"); await API.upsert("app_users", [{ email: e, role: $("#ur").value }]); toast("Eklendi"); await reload(); });
  $$("[data-role]").forEach(s => s.onchange = async () => { try { await API.patch("app_users", "email=eq." + encodeURIComponent(s.dataset.role), { role: s.value }); toast("Güncellendi"); await reload(); } catch (e) { toast(e.message); } });
  $$("[data-del]").forEach(b => b.onclick = async () => { if (!await ask(b.dataset.del + " erişimi kaldırılsın mı?", "Kaldır", true)) return; try { await API.del("app_users", "email=eq." + encodeURIComponent(b.dataset.del)); await reload(); } catch (e) { toast(e.message); } });
}
function vYedek() {
  $("#app").innerHTML = `<div class="card"><div class="small muted">Verileriniz bulut veritabanında saklanır ve Supabase tarafından yedeklenir. İsterseniz buradan kendi kopyanızı da indirebilirsiniz.</div>
   <button class="btn pri block" id="bj" style="margin-top:10px">${ICONS.dl} Tüm verileri indir (JSON)</button>
   <div class="grid2" style="margin-top:8px"><button class="btn" id="bp">Ürünler (Excel)</button><button class="btn" id="bc">Cariler (Excel)</button></div></div>`;
  $("#bj").onclick = () => busy($("#bj"), async () => {
    const t = ["settings", "accounts", "parties", "products", "documents", "document_lines", "stock_moves", "cash_moves", "ledger", "app_users"]; const out = { exportedAt: new Date().toISOString(), version: APP_VER };
    for (const x of t) out[x] = await API.getAll(x, "select=*");
    download(`seyyar-yedek-${ymd(new Date())}.json`, JSON.stringify(out), "application/json"); toast("İndirildi");
  });
  $("#bp").onclick = () => { go("stok"); setTimeout(() => $("#exp") && $("#exp").click(), 50); };
  $("#bc").onclick = () => { go("cari"); setTimeout(() => $("#cexp") && $("#cexp").click(), 50); };
}

const VIEWS = { satis: () => vDoc({ type: "satis" }), doc: vDoc, stok: vStok, urun: vUrun, sayim: vSayim, toplufiyat: vTopluFiyat, cari: vCari, caridetay: vCariDetay, kasa: vKasa, gunsonu: vGunSonu, rapor: vRapor, menu: vMenu, belgeler: vBelgeler, kuyruk: vKuyruk, ayarlar: vAyarlar, kullanicilar: vKullanicilar, yedek: vYedek };

/* =================== BAŞLAT =================== */
(async function init() {
  $("#backBtn").onclick = back; $("#themeBtn").onclick = cycleTheme; applyTheme(getTheme()); document.documentElement.classList.toggle("big", getFont() === "big");
  if (!API.sess) return vLogin();
  if (D.loadedAt && D.role) { render(); }
  else $("#app").innerHTML = '<div class="empty" style="margin-top:30vh"><span class="spin"></span><br>Yükleniyor…</div>';
  const r = await loadAll(!!D.loadedAt);
  if (r === "auth") { await API.logout(); return vLogin(); }
  if (r === "noaccess") return vNoAccess();
  if (r === "ok" || D.loadedAt) { if (!$("#nav button")) render(); else refreshView(); Q.flush(); if (r === "ok") maybeWizard(); }
  else $("#app").innerHTML = `<div class="empty" style="margin-top:20vh">Bağlanılamadı. İnternet bağlantınızı kontrol edin.<br><br><button class="btn pri" onclick="location.reload()">Tekrar dene</button></div>`;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && API.sess && D.role) { Q.flush(); if (!D.loadedAt || Date.now() - new Date(D.loadedAt) > 60000) loadAll(true).then(() => refreshView()); } });
})();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => { });
