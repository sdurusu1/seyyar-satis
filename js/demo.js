// Seyyar Satış – örnek verili tanıtım (vitrin). Tüm veriler tarayıcıda, sunucuya hiçbir şey gönderilmez.
(function () {
  if (!window.DEMO) return;
  try { Object.keys(localStorage).filter(k => k.startsWith("demo_")).forEach(k => localStorage.removeItem(k)); } catch (e) { }
  localStorage.setItem("demo_ss_session", JSON.stringify({ access: "demo", refresh: "demo", exp: Date.now() + 365 * 864e5, email: "demo@ornek.com" }));
  window.__EMAIL = "demo@ornek.com";
  window.__TENANT = { id: "demo", name: "Örnek Toptan Gıda", status: "demo", demo_until: new Date(Date.now() + 14 * 864e5).toISOString(), modules: ["stok", "kasa", "rota", "efatura"], max_users: 5 };
})();
// Bellek içi sahte Supabase (yalnızca test)
(function () {
  const URL0 = "https://kzwmlhncpxylqvveohsb.supabase.co";
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const db = window.__db = {
    app_users: [], settings: [{ tenant_id: "t1", data: {} }], counters: [],
    accounts: [{ id: uid(), name: "Nakit Kasa", type: "kasa", active: true, sort: 1 }, { id: uid(), name: "Kart (POS)", type: "pos", active: true, sort: 2 }, { id: uid(), name: "Banka", type: "banka", active: true, sort: 3 }],
    parties: [], products: [], documents: [], document_lines: [], stock_moves: [], cash_moves: [], ledger: [], visits: [], party_prices: [], vehicles: [], vehicle_stock: [], vehicle_moves: []
  };
  let email = window.__EMAIL || "patron@test.com";
  window.__offline = false;
  const r2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
  const nextNo = (kind, pre, w = 9) => { const y = new Date().getFullYear(); let c = db.counters.find(x => x.kind === kind && x.year === y); if (!c) { c = { kind, year: y, last: 0 }; db.counters.push(c); } c.last++; return pre + y + String(c.last).padStart(w, "0"); };
  const stock = (pid, q, type, doc, note) => { const p = db.products.find(x => x.id === pid); if (!p) return; p.stock = r2(+p.stock + q); db.stock_moves.push({ id: uid(), product_id: pid, date: now(), type, qty: q, balance: p.stock, document_id: doc, note }); };
  const vst = (veh, pid, q) => { let r = db.vehicle_stock.find(x => x.vehicle_id === veh && x.product_id === pid); if (!r) { r = { vehicle_id: veh, product_id: pid, qty: 0 }; db.vehicle_stock.push(r); } r.qty = r2(r.qty + q); };
  const rpc = {
    vehicle_transfer({ p }) { if (db.vehicle_moves.some(x => x.group_id === p.id)) return { duplicate: true }; p.lines.forEach(l => { vst(p.vehicle_id, l.product_id, p.type === "yukleme" ? Math.abs(l.qty) : -Math.abs(l.qty)); db.vehicle_moves.push({ group_id: p.id, type: p.type }); }); return { id: p.id }; },
    vehicle_count({ p }) { const diffs = []; p.lines.forEach(l => { const r = db.vehicle_stock.find(x => x.vehicle_id === p.vehicle_id && x.product_id === l.product_id); const d = r2(l.qty - (r ? r.qty : 0)); if (d) { vst(p.vehicle_id, l.product_id, d); stock(l.product_id, d, "arac_sayim", null, "sayım"); diffs.push({ product_id: l.product_id, diff: d }); } }); db.vehicle_moves.push({ group_id: p.id }); return { id: p.id, diffs }; },
    my_tenant() {
      let u = db.app_users.find(x => x.email === email);
      if (!u && !db.app_users.length) { u = { email, role: "yonetici", created_at: now() }; db.app_users.push(u); }
      const ten = Object.assign({ id: "t1", name: "Test Firma", status: "active", demo_until: null, paid_until: null, modules: ["stok", "kasa", "rota", "efatura"], max_users: 10 }, window.__TENANT || {});
      if (!u) return { role: null, vendor: !!window.__VENDOR, allow_self_trial: true, trial_days: 14, contact: "0555 000 00 00" };
      return { role: u.role, vendor: !!window.__VENDOR, contact: "0555 000 00 00", brand: "Seyyar Satış", tenant: ten, writable: window.__WRITABLE !== false };
    },
    vendor_list() { return [{ id: "t1", name: "Test Firma", status: "active", modules: ["stok", "kasa", "rota", "efatura"], max_users: 10, users: db.app_users.length, products: db.products.length, parties: db.parties.length, docs: db.documents.length, emails: db.app_users.map(u => u.email) }, { _config: { brand: "Seyyar Satış", contact: "0555 000 00 00", allow_self_trial: true, trial_days: 14 } }]; },
    vendor_save({ p }) { window.__lastVendorSave = p; return { id: p.id || uid() }; },
    vendor_config_save() { return null; },
    import_products({ p_rows }) { let ins = 0, upd = 0; p_rows.forEach(r => { let p = (r.barcode && db.products.find(x => x.barcode === r.barcode)) || db.products.find(x => x.name.toLowerCase() === r.name.toLowerCase()); if (p) { Object.assign(p, { retail: r.retail === "" ? p.retail : +r.retail, cost: r.cost === "" ? p.cost : +r.cost }); upd++; } else { p = { id: uid(), barcode: r.barcode || null, code: r.code || null, name: r.name, category: r.category || null, unit: r.unit || "Adet", retail: +r.retail || 0, wholesale: +r.retail || 0, cost: +r.cost || 0, vat: r.vat === "" ? 20 : +r.vat, stock: 0, min_stock: +r.min_stock || 0, pack_qty: r.pack_qty === "" ? null : +r.pack_qty, active: true }; db.products.push(p); if (+r.stock) stock(p.id, +r.stock, "acilis", null, "Aktarım"); ins++; } }); return { inserted: ins, updated: upd, skipped: 0 }; },
    import_parties({ p_rows }) { let ins = 0, upd = 0; p_rows.forEach(r => { const ex = db.parties.find(x => x.name.toLowerCase() === r.name.toLowerCase()); if (ex) { upd++; return; } const p = { id: uid(), kind: r.kind || "musteri", name: r.name, phone: r.phone || null, vkn: r.vkn || null, city: r.city || null, district: r.district || null, address: r.address || null, active: true }; db.parties.push(p); if (+r.balance) db.ledger.push({ id: uid(), party_id: p.id, date: now(), debit: Math.max(0, +r.balance), credit: Math.max(0, -r.balance), kind: +r.balance > 0 ? "borc_dekont" : "alacak_dekont", note: "Açılış bakiyesi (aktarım)" }); ins++; }); return { inserted: ins, updated: upd, skipped: 0 }; },
    report_data({ p_from, p_to }) {
      const D0 = db.documents.filter(d => d.status === "aktif" && d.date >= p_from && d.date < p_to), M = db.cash_moves.filter(c => c.date >= p_from && c.date < p_to);
      const S = (a, f) => r2(a.reduce((s, x) => s + (+f(x) || 0), 0)); const sales = D0.filter(d => d.type === "satis"), rets = D0.filter(d => d.type === "satis_iade");
      const L = []; D0.filter(d => d.type === "satis" || d.type === "satis_iade").forEach(d => db.document_lines.filter(l => l.document_id === d.id).forEach(l => L.push({ ...l, sg: d.type === "satis" ? 1 : -1, ratio: d.gross ? d.total / d.gross : 1, date: d.date })));
      const pay = {}, staff = {}, expcat = {}, daily = {}, prod = {}, cust = {};
      sales.forEach(d => { pay[d.pay_method] = r2((pay[d.pay_method] || 0) + d.total); const s = (d.created_by || "?").split("@")[0]; staff[s] = r2((staff[s] || 0) + d.total); const k = d.party ? d.party.name : "Müşterisiz"; cust[k] = r2((cust[k] || 0) + d.total); });
      D0.filter(d => d.type === "satis" || d.type === "satis_iade").forEach(d => { const k = d.date.slice(0, 10); daily[k] = daily[k] || { s: 0, c: 0 }; const sg = d.type === "satis" ? 1 : -1; daily[k].s = r2(daily[k].s + sg * d.total); daily[k].c = r2(daily[k].c + sg * S(db.document_lines.filter(l => l.document_id === d.id), l => l.qty * l.cost)); });
      L.forEach(l => { const k = l.product_id || l.name; const p = db.products.find(x => x.id === l.product_id); prod[k] = prod[k] || { k, name: l.name, q: 0, rev: 0, cost: 0, cat: (p && p.category) || "Kategorisiz" }; prod[k].q += l.qty * l.sg; prod[k].rev += l.qty * l.price * l.ratio * l.sg; prod[k].cost += l.qty * l.cost * l.sg; });
      M.filter(c => c.kind === "gider").forEach(c => { const k = c.category || "Diğer"; expcat[k] = r2((expcat[k] || 0) - c.amount); });
      return { sales_n: sales.length, sales: S(sales, d => d.total), rets: S(rets, d => d.total), vat: 0, buys: S(D0.filter(d => d.type === "alis"), d => d.total) - S(D0.filter(d => d.type === "alis_iade"), d => d.total), cost: S(L, l => l.qty * l.cost * l.sg), exp: S(M.filter(c => c.kind === "gider"), c => -c.amount), tah: S(M.filter(c => c.kind === "tahsilat"), c => c.amount), pay, daily, prod: Object.values(prod).sort((a, b) => b.rev - a.rev), cust: Object.entries(cust).map(([name, s]) => ({ name, s })).sort((a, b) => b.s - a.s), staff, expcat };
    },
    claim_first_admin() { const u = db.app_users.find(x => x.email === email); if (u) return u.role; if (!db.app_users.length) { db.app_users.push({ email, role: "yonetici", created_at: now() }); return "yonetici"; } return null; },
    save_document({ p_doc, p_lines }) {
      if (db.documents.find(d => d.id === p_doc.id)) return { id: p_doc.id, duplicate: true };
      const t = p_doc.type, sign = (t === "satis" || t === "alis_iade") ? -1 : 1;
      let gross = 0; p_lines.forEach(l => gross += r2(l.qty * l.price)); gross = r2(gross);
      const disc = Math.min(+p_doc.discount || 0, gross), total = r2(gross - disc);
      if (p_doc.pay_method === "veresiye" && !p_doc.party_id) throw { message: "Veresiye için cari seçilmeli" };
      const paid = p_doc.pay_method === "veresiye" ? Math.min(Math.max(+p_doc.paid || 0, 0), total) : total;
      const acc = db.accounts.find(a => a.type === ({ kart: "pos", havale: "banka" }[p_doc.pay_method] || "kasa"));
      const s = db.settings[0].data;
      const no = p_doc.doc_kind === "earsiv" ? nextNo("earsiv", (s.serEarsiv || "EAR")) : p_doc.doc_kind === "efatura" ? nextNo("efatura", s.serEfatura || "EFT") : t === "satis" ? nextNo("fis", "F", 6) : t === "satis_iade" ? nextNo("si", "SI", 6) : t === "alis" ? nextNo("alis", "A", 6) : nextNo("ai", "AI", 6);
      const party = db.parties.find(p => p.id === p_doc.party_id) || null;
      const doc = { ...p_doc, no, gross, discount: disc, total, paid, credit: r2(total - paid), vat_total: 0, account_id: acc.id, party, status: "aktif", e_status: p_doc.doc_kind !== "fis" ? "taslak" : null, created_by: email, created_at: now() };
      delete doc.update_cost; db.documents.push(doc);
      const veh = (t === "satis" || t === "satis_iade") && db.vehicles.some(v => v.id === p_doc.vehicle_id) ? p_doc.vehicle_id : null; doc.vehicle_id = veh;
      p_lines.forEach(l => { if (veh && l.product_id) vst(veh, l.product_id, sign * l.qty); if (party && t === "satis" && l.product_id) { const pr = db.products.find(x => x.id === l.product_id); db.party_prices = db.party_prices.filter(x => !(x.party_id === party.id && x.product_id === l.product_id)); db.party_prices.push({ party_id: party.id, product_id: l.product_id, price: l.price, base: pr.retail }); } });
      p_lines.forEach((l, i) => { const p = db.products.find(x => x.id === l.product_id); db.document_lines.push({ id: uid(), document_id: doc.id, ...l, line_total: r2(l.qty * l.price), cost: t === "alis" ? l.price : (p ? p.cost : 0), sort: i + 1 }); if (l.product_id) { stock(l.product_id, sign * l.qty, t, doc.id, no); if (t === "alis" && p_doc.update_cost !== false && p) p.cost = l.price; } });
      if (party) { if (t === "satis" || t === "alis_iade") db.ledger.push({ id: uid(), party_id: party.id, date: doc.date, debit: total, credit: 0, kind: t, document_id: doc.id, note: no, due_date: p_doc.due_date }); else db.ledger.push({ id: uid(), party_id: party.id, date: doc.date, debit: 0, credit: total, kind: t, document_id: doc.id, note: no }); }
      if (paid > 0) { const cm = { id: uid(), date: doc.date, account_id: acc.id, amount: (t === "satis" || t === "alis_iade") ? paid : -paid, kind: t === "satis" ? "satis" : t === "alis" ? "alis" : "iade", party_id: p_doc.party_id, document_id: doc.id, note: no, created_by: email }; db.cash_moves.push(cm); if (party) db.ledger.push({ id: uid(), party_id: party.id, date: doc.date, debit: (t === "satis" || t === "alis_iade") ? 0 : paid, credit: (t === "satis" || t === "alis_iade") ? paid : 0, kind: "odeme", document_id: doc.id, cash_move_id: cm.id, note: no + " peşin" }); }
      return { id: doc.id, no, total, paid, credit: r2(total - paid) };
    },
    cancel_document({ p_id }) { const d = db.documents.find(x => x.id === p_id); const sg = (d.type === "satis" || d.type === "alis_iade") ? 1 : -1; db.document_lines.filter(l => l.document_id === p_id).forEach(l => { if (l.product_id) { stock(l.product_id, sg * l.qty, "iptal", p_id, d.no + " iptal"); if (d.vehicle_id) vst(d.vehicle_id, l.product_id, sg * l.qty); } }); db.ledger = db.ledger.filter(l => l.document_id !== p_id); db.cash_moves = db.cash_moves.filter(l => l.document_id !== p_id); d.status = "iptal"; return null; },
    save_cash({ p }) {
      const amt = r2(p.amount), g = uid(), d = p.date || now();
      const cm = (a, am, k) => db.cash_moves.push({ id: a === p.account_id && !db.cash_moves.find(x => x.id === p.id) ? p.id : uid(), date: d, account_id: a, amount: am, kind: k, party_id: p.party_id, category: p.category, note: p.note, group_id: g, created_by: email });
      if (p.kind === "tahsilat") { cm(p.account_id, amt, "tahsilat"); if (p.party_id) db.ledger.push({ id: uid(), party_id: p.party_id, date: d, debit: 0, credit: amt, kind: "tahsilat", cash_move_id: p.id, note: p.note }); }
      else if (p.kind === "odeme") { cm(p.account_id, -amt, "odeme"); if (p.party_id) db.ledger.push({ id: uid(), party_id: p.party_id, date: d, debit: amt, credit: 0, kind: "odeme", cash_move_id: p.id, note: p.note }); }
      else if (p.kind === "gider") cm(p.account_id, -amt, "gider");
      else if (p.kind === "gelir" || p.kind === "acilis") cm(p.account_id, amt, p.kind);
      else if (p.kind === "virman") { cm(p.account_id, -amt, "virman"); cm(p.to_account_id, amt, "virman"); }
      else if (p.kind.endsWith("dekont")) db.ledger.push({ id: p.id, party_id: p.party_id, date: d, debit: p.kind === "borc_dekont" ? amt : 0, credit: p.kind === "alacak_dekont" ? amt : 0, kind: p.kind, note: p.note });
      return { id: p.id };
    },
    stock_adjust({ p }) { const pr = db.products.find(x => x.id === p.product_id); const d = p.type === "sayim" ? p.qty - pr.stock : (p.type === "fire" || p.type === "cikis") ? -Math.abs(p.qty) : Math.abs(p.qty); if (d) stock(pr.id, d, p.type, null, p.note); return pr.stock; },
    delete_cash({ p_id }) { const c = db.cash_moves.find(x => x.id === p_id); if (c) { db.cash_moves = db.cash_moves.filter(x => x.group_id !== c.group_id); db.ledger = db.ledger.filter(l => l.cash_move_id !== p_id); } else db.ledger = db.ledger.filter(l => l.id !== p_id); return null; }
  };
  window.__rpc = rpc;
  function view(name) {
    if (name === "party_balances") return db.parties.map(p => { const l = db.ledger.filter(x => x.party_id === p.id); return { id: p.id, balance: r2(l.reduce((a, x) => a + (+x.debit) - (+x.credit), 0)), last_visit: null, last_move: [l.length ? l[l.length - 1].date : null, ...db.visits.filter(v => v.party_id === p.id && v.result === "ziyaret").map(v => v.date)].filter(Boolean).sort().pop() || null }; });
    if (name === "account_balances") return db.accounts.map(a => ({ id: a.id, balance: r2(db.cash_moves.filter(c => c.account_id === a.id).reduce((s, c) => s + c.amount, 0)) }));
    return db[name];
  }
  function query(table, qs) {
    let rows = (view(table) || []).slice(); const params = new URLSearchParams(qs); let limit = 1e9, offset = 0, order = null, embed = false;
    for (const [k, v] of params) {
      if (k === "select") { embed = v.includes("document_lines"); continue; }
      if (k === "limit") { limit = +v; continue; } if (k === "offset") { offset = +v; continue; } if (k === "order") { order = v; continue; }
      const [op, ...rest] = v.split("."); const val = rest.join(".");
      rows = rows.filter(r => { const x = r[k]; if (op === "eq") return String(x) === val; if (op === "gte") return String(x) >= val; if (op === "lt") return String(x) < val; return true; });
    }
    if (order) { const keys = order.split(",").map(o => o.split(".")); rows = rows.map((r, i) => ({ r, i })).sort((x, y) => { for (const [f, dir] of keys) { const a = f === "seq" ? x.i : x.r[f], b = f === "seq" ? y.i : y.r[f]; if (a !== b) return (a > b ? 1 : -1) * (dir === "desc" ? -1 : 1); } return x.i - y.i; }).map(o => o.r); }
    rows = rows.slice(offset, offset + limit);
    if (embed) rows = rows.map(r => ({ ...r, document_lines: db.document_lines.filter(l => l.document_id === r.id) }));
    return JSON.parse(JSON.stringify(rows));
  }
  const resp = (body, status = 200) => new Response(body === null ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, opt = {}) => {
    url = String(url); if (!url.startsWith(URL0)) return realFetch(url, opt);
    await new Promise(r => setTimeout(r, 5));
    if (window.__offline) throw new TypeError("Failed to fetch");
    const u = new URL(url); const path = u.pathname; const body = opt.body ? JSON.parse(opt.body) : null; const m = opt.method || "GET";
    try {
      if (path.startsWith("/auth/v1/")) { if (body && body.email) email = body.email; return resp({ access_token: "tok", refresh_token: "ref", expires_in: 3600, user: { email } }); }
      const name = path.replace("/rest/v1/", "");
      if (name.startsWith("rpc/")) return resp(rpc[name.slice(4)](body) ?? null);
      if (m === "GET") return resp(query(name, u.search.slice(1)));
      if (m === "POST") { (Array.isArray(body) ? body : [body]).forEach(row => { const key = name === "app_users" ? "email" : name === "settings" ? "tenant_id" : "id"; const ex = db[name].find(r => r[key] === row[key]); if (name === "products" && row.barcode && db.products.some(p => p.barcode === row.barcode && p.id !== row.id)) throw { message: "duplicate key value violates unique constraint \"products_barcode_uq\"" }; if (ex) Object.assign(ex, row); else db[name].push({ stock: 0, created_at: now(), ...row }); }); return resp(null, 201); }
      if (m === "PATCH") { const [k, v] = u.search.slice(1).split("="); db[name].filter(r => String(r[k]) === decodeURIComponent(v.slice(3))).forEach(r => Object.assign(r, body)); return resp(null, 204); }
      if (m === "DELETE") { const [k, v] = u.search.slice(1).split("="); db[name] = db[name].filter(r => String(r[k]) !== decodeURIComponent(v.slice(3))); return resp(null, 204); }
    } catch (e) { return resp({ message: e.message || String(e) }, 400); }
  };
})();
(function () {
  if (!window.DEMO) return;
  const db = window.__db, rpc = window.__rpc, uid = () => crypto.randomUUID();
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const pick = a => a[Math.floor(rnd() * a.length)];
  db.app_users.push({ email: "demo@ornek.com", role: "yonetici", created_at: new Date().toISOString() });
  db.settings[0].data = { firm: "Örnek Toptan Gıda", phone: "0312 000 00 00", address: "Yenimahalle / Ankara", footer: "Bu fiş örnektir", setupDone: true, categories: ["Şekerleme", "Oyuncak", "Hediyelik", "İçecek"], quick: [] };
  const P = [["Lolipop şeker", "Şekerleme", 4, 2.2, 48], ["Jelibon 80 g", "Şekerleme", 12, 7, 24], ["Sakız 5'li", "Şekerleme", 6, 3.5, 60], ["Çikolatalı gofret", "Şekerleme", 9, 5.5, 36], ["Lokum kutusu 500 g", "Şekerleme", 85, 55, 12], ["Pamuk şeker", "Şekerleme", 15, 8, 20], ["Akide şekeri 1 kg", "Şekerleme", 120, 80, 10], ["Draje 100 g", "Şekerleme", 14, 8.5, 24],
    ["Oyuncak araba", "Oyuncak", 45, 26, 12], ["Peluş ayı küçük", "Oyuncak", 90, 52, 6], ["Su tabancası", "Oyuncak", 35, 19, 24], ["Balon 10'lu", "Oyuncak", 18, 9, 50], ["Yapboz 100 parça", "Oyuncak", 60, 34, 10], ["Sabun köpüğü", "Oyuncak", 20, 10, 36], ["Topaç", "Oyuncak", 25, 13, 24],
    ["Anahtarlık", "Hediyelik", 30, 14, 20], ["Kupa bardak", "Hediyelik", 75, 40, 12], ["Magnet", "Hediyelik", 15, 6, 50], ["Mini kar küresi", "Hediyelik", 95, 55, 8],
    ["Meyve suyu 200 ml", "İçecek", 10, 6, 27], ["Soda 6'lı", "İçecek", 42, 28, 4], ["Ayran 200 ml", "İçecek", 8, 4.8, 20]];
  P.forEach(([name, category, retail, cost, pack], i) => db.products.push({ id: uid(), barcode: "86900" + String(10000 + i * 37), code: "U" + (100 + i), name, category, brand: null, unit: "Adet", pack_qty: pack, retail, wholesale: retail, cost, vat: category === "Şekerleme" || category === "İçecek" ? 1 : 20, stock: Math.round(pack * (6 + rnd() * 20)), min_stock: pack, active: true }));
  const C = [["Yıldız Market", "Çankaya", 39.918, 32.862], ["Can Büfe", "Çankaya", 39.911, 32.855], ["Ekin Bakkal", "Keçiören", 39.982, 32.865], ["Deniz Market", "Keçiören", 39.975, 32.872], ["Güneş Gıda", "Yenimahalle", 39.966, 32.81], ["Kardeşler Büfe", "Yenimahalle", 39.958, 32.802], ["Park Kantin", "Mamak", 39.926, 32.913], ["Okul Kırtasiye", "Mamak", 39.932, 32.921], ["Sevgi Market", "Etimesgut", 39.948, 32.669], ["Tuna Bakkal", "Etimesgut", 39.951, 32.675], ["Özlem Şarküteri", "Sincan", 39.97, 32.58], ["Bahar Büfe", "Sincan", 39.966, 32.576]];
  C.forEach(([name, district, lat, lng], i) => db.parties.push({ id: uid(), kind: "musteri", name, phone: "053" + (20000000 + i * 1234567).toString().slice(0, 8), city: "Ankara", district, lat: i % 4 === 3 ? null : lat, lng: i % 4 === 3 ? null : lng, price_type: "perakende", active: true }));
  db.parties.push({ id: uid(), kind: "tedarikci", name: "Anadolu Şekerleme A.Ş.", city: "İstanbul", active: true });
  const veh = { id: uid(), name: "06 ABC 123", active: true, sort: 0 }; db.vehicles.push(veh);
  localStorage.setItem("demo_ss_local", JSON.stringify({ vehicleId: veh.id }));
  // son 30 günün satışları
  const custs = db.parties.filter(p => p.kind === "musteri");
  for (let d = 30; d >= 0; d--) {
    const n = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) {
      const c = pick(custs); const lines = []; const m = 2 + Math.floor(rnd() * 4);
      for (let j = 0; j < m; j++) { const p = pick(db.products); if (lines.some(l => l.product_id === p.id)) continue; const q = p.pack_qty * (1 + Math.floor(rnd() * 3)); lines.push({ product_id: p.id, name: p.name, barcode: p.barcode, unit: "Adet", qty: q, price: p.retail, vat: p.vat }); }
      const dt = new Date(Date.now() - d * 864e5); dt.setHours(d ? 9 + Math.floor(rnd() * 8) : Math.max(0, new Date().getHours() - 1 - k), Math.floor(rnd() * 60)); if (dt > new Date()) dt.setTime(Date.now() - 60000 * (k + 1));
      const pay = pick(["nakit", "nakit", "kart", "veresiye", "veresiye"]);
      const tot = lines.reduce((a, l) => a + l.qty * l.price, 0);
      rpc.save_document({ p_doc: { id: uid(), type: "satis", doc_kind: "fis", date: dt.toISOString(), party_id: c.id, pay_method: pay, paid: pay === "veresiye" ? Math.round(tot * (rnd() < .5 ? 0 : .3)) : null, discount: 0 }, p_lines: lines });
    }
    if (d % 3 === 0) { const c = pick(custs); const acc = db.accounts.find(a => a.type === "kasa"); const dt = new Date(Date.now() - d * 864e5 + 5 * 36e5); rpc.save_cash({ p: { id: uid(), kind: "tahsilat", account_id: acc.id, party_id: c.id, amount: 200 + Math.round(rnd() * 600), date: dt.toISOString(), note: "Tahsilat" } }); }
    if (d % 4 === 0) { const acc = db.accounts.find(a => a.type === "kasa"); rpc.save_cash({ p: { id: uid(), kind: "gider", account_id: acc.id, amount: 300 + Math.round(rnd() * 400), category: "Yakıt", date: new Date(Date.now() - d * 864e5).toISOString(), note: "Akaryakıt" } }); }
  }
  // araca yükleme
  rpc.vehicle_transfer({ p: { id: uid(), vehicle_id: veh.id, type: "yukleme", lines: db.products.slice(0, 14).map(p => ({ product_id: p.id, qty: p.pack_qty * 3 })) } });
  db.documents.forEach(d => { d.created_by = "demo@ornek.com"; });
})();
