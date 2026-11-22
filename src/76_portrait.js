/* =========================================================
   地中海覇道 — 人物の肖像（手続き生成）
   名と能力・年齢・国・文化・官職から、同じ人には同じ顔を描く。
   顔は人で決まり、装い（兜・鎧・衣）は官職と国で変わる。
   PORT.canvas(o, size, opt) … 描いた canvas（キャッシュ）。opt: seal 印 / dark 暗い背景 / noBg 背景なし / expr 表情
   PORT.tag(o, size, opt)    … innerHTML 用の置き場 <span class="por">（PORT.fill で中身を描く）
   PORT.fill(root)           … 置き場に肖像を入れる
   PORT.params(o)            … 顔と装いのパラメータ
     p.cul   見た目の文化：rom ローマ / hel ギリシア・マケドニア / pun カルタゴ / num ヌミディア / gal ガリア / ibe イベリア / egy エジプト / eas シリア・小アジア
     p.head  被り物：bare montef attic phryg boeot pilos conic corinth horned sinew kausia petasos diadem wreath nemes pcap scarf tiara
     p.hair  髪：crop curly tight long wig shaven fem　　p.dress 衣：toga tunic chiton pect mail muscle lino scale himat robe ntunic bare gtunic rags linen kandys itunic
     p.hat   古い分類（helm 飾りつき兜 / cap 兜 / fur 帽子・髪 / band 頭巾）。p.beard（none must goat full long）・p.armor（0〜2）も古い意味のまま（決闘の人形が使う）
   ========================================================= */
const PORT = {};
PORT._cache = new Map();
PORT._reg = new Map();
PORT.MAX = 420;
PORT.hash = (s) => { let h = 2166136261 >>> 0; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
// 肖像の種：名で決める（同じ名の別人は id で分ける）
PORT.key = (o) => { if (!o) return 'none'; const base = (o.n || '') + '|' + (o.hist ? 'h' : ''); return o.id != null && !o.hist ? base + '|' + String(o.id).slice(0, 8) : base; };
// 乱数の列（部品ごとに番号が決まっている。官職や年齢が変わっても顔は変わらない）
PORT.rnd = (seed) => { const r = U.rng(PORT.hash(seed)), a = new Array(48); for (let i = 0; i < 48; i++) a[i] = r(); return a; };
// 色の明暗（shade は rgb() を返す。tone・mix は #hex を返す）
PORT.shade = (hex, f) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return `rgb(${r | 0},${g | 0},${b | 0})`; };
PORT.rgba = (hex, a) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
PORT.hx = (hex) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
PORT.toHex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
PORT.tone = (hex, f) => { let [r, g, b] = PORT.hx(hex); if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return PORT.toHex(r, g, b); };
PORT.mix = (a, b, t) => { const x = PORT.hx(a), y = PORT.hx(b); return PORT.toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };

/* ---------- 文化 ---------- */
// 名の文化（D.NAMES の鍵）→ 見た目の文化
PORT.CUL = { latin: 'rom', greek: 'hel', maced: 'hel', punic: 'pun', numid: 'num', iber: 'ibe', celt: 'gal', egypt: 'egy', syria: 'eas', anat: 'eas' };
// 国の標準の見た目
PORT.CDEF = { rome: 'rom', carth: 'pun', mace: 'hel', sele: 'hel', ptol: 'hel', syra: 'hel', numi: 'num', nomad: 'gal', bandit: 'hel', rebel: 'hel' };
// 女性の名（データに印がないので名で見分ける）・王妃の名
PORT.FEM = /^(アルシノエ|ベレニケ|クレオパトラ|ソフォニスバ|ラオディケ|アパメ|ストラトニケ|フィラ|オリュンピアス|ダマラタ|ハルモニア|テオクセナ|アガトクレイア|オイナンテ|ポリュクセナ|ネレイス|デメトリア|コルネリア|アエミリア|クラウディア|セルウィリア|リウィア|トゥッリア|ユリア|テルティア|イミルケ|エリッサ|ディド)$/;
PORT.QUEEN = /^(アルシノエ|ベレニケ|クレオパトラ|ソフォニスバ|ラオディケ|アパメ|ストラトニケ|フィラ|オリュンピアス|エリッサ|ディド)$/;
PORT.clean = (s) => String(s || '').replace(/（[^）]*）|\([^)]*\)/g, '').replace(/[一二三四五六七八九十]+世$/, '').trim();
// 名から文化を推す（その国にいる文化だけ。わからなければ null）
PORT.nameCul = (o, c) => {
  if (!PORT._nm) { const m = PORT._nm = new Map(); const N = D.NAMES || {}; for (const k in N) { for (const x of N[k].m || []) if (!m.has(x)) m.set(x, k); for (const x of N[k].h || []) if (!m.has('#' + x)) m.set('#' + x, k); } }
  const w = D.CNAME && c ? D.CNAME[c] : null, ok = (k) => (k && (!w || w[k]) ? k : null);
  const parts = String(o.n || '').split('・');
  const mei = PORT.clean(o.mei || parts[0]), sei = PORT.clean(o.sei || parts[parts.length - 1]);
  return ok(PORT._nm.get(mei)) || ok(PORT._nm.get('#' + sei)) || ok(PORT._nm.get(sei)) || ok(PORT._nm.get('#' + mei)) || null;
};
// 肌（明るい→濃い）と髪
PORT.SKINS = {
  rom: ['#eccaa4', '#e2bc94', '#d8ae86', '#cda17a', '#c2946d'],
  hel: ['#efcda7', '#e5bf97', '#dab088', '#cfa27b', '#c4956e'],
  pun: ['#d9ac80', '#cd9e73', '#c09066', '#b2825a', '#a2744f'],
  num: ['#a8764c', '#946540', '#805535', '#6d462c', '#5b3a24'],
  gal: ['#f5dfca', '#f0d5bc', '#e9caab', '#e2be9c', '#d8b18e'],
  ibe: ['#e0b88c', '#d5aa7e', '#ca9d72', '#be9066', '#b1835b'],
  egy: ['#c38f60', '#b48155', '#a5734a', '#956641', '#865939'],
  eas: ['#ddb28a', '#d1a57d', '#c59870', '#b88b64', '#aa7e59'],
};
PORT.HAIRS = {
  rom: ['#1c1510', '#2a1d14', '#3a281a', '#4a3424'],
  hel: ['#1e1612', '#2e2018', '#43301f', '#5a3e24', '#6e4c2a'],
  pun: ['#120e0b', '#1a140f', '#231a12'],
  num: ['#0f0b09', '#16100c', '#1d1510'],
  gal: ['#c9a25a', '#b8893f', '#d6b878', '#a0522a', '#7e3e1c', '#6b4a2a'],
  ibe: ['#16110d', '#22180f', '#2e2015'],
  egy: ['#0e0b09', '#16110d'],
  eas: ['#15100c', '#21170f', '#2d2015'],
};
PORT.SKIN = PORT.SKINS.hel; PORT.HAIR = PORT.HAIRS.rom;   // 古い名（互換）
PORT.C = { red: '#9b2a22', scarlet: '#b0281e', purple: '#5c2363', crimson: '#8c1d26', white: '#eee8da', linen: '#ede6d3', wool: '#a08a68', brown: '#6e5236', black: '#2a2422', gold: '#d4ac4c', ink: '#1d1a22' };
PORT.METAL = { bronze: ['#e8c883', '#b58b47', '#6e4f22'], gold: ['#f8e295', '#d6ad4d', '#8a651d'], iron: ['#b8bcbf', '#7a7f83', '#3e4246'], silver: ['#eef0f2', '#aab0b6', '#5a6168'] };
PORT.HELM = { montef: 1, attic: 1, phryg: 1, boeot: 1, pilos: 1, conic: 1, corinth: 1, horned: 1, sinew: 1 };
PORT.EARS = { montef: 1, attic: 1, phryg: 1, nemes: 1, tiara: 1, sinew: 1 };   // 耳を覆う被り物

/* ---------- 装い：文化・官職・格から ---------- */
PORT.attire = (p, R) => {
  const C = PORT.C, cul = p.cul, t = p.tier, tr = p.track, c = p.c, v = R[30], v2 = R[31], v3 = R[32];
  const pick = (a, x) => a[Math.min(a.length - 1, Math.floor(x * a.length))];
  const cc = p.col, mil = tr === 'mil', staff = tr === 'staff', top = p.ruler || p.rk === 'josh';
  const A = { head: 'bare', hair: { rom: 'crop', hel: 'curly', pun: 'curly', num: 'tight', gal: 'long', ibe: 'curly', egy: v < 0.5 ? 'shaven' : 'wig', eas: 'curly' }[cul] || 'crop',
    dress: 'tunic', tunic: C.wool, robe: null, himat: null, trim: null, cloak: null, cpat: '', ck2: null, cpin: 1, crest: null, crestT: '', crest2: null, plume: null, metal: 'bronze', armor: 0,
    hatC: null, capH: 1, capBand: null, band: null, wreath: null, jav: 0, torc: null, ear: null, neck: null, phal: 0, collar: 0, tanit: 0, gorg: 0, clavus: null, praet: null, bareSh: 0, mantle: null, sash: null, patch: 0, braid: 0, spiky: 0, stripe: null };
  if (p.bandit) {
    // 山賊・海賊：頭巾と粗い服
    A.head = 'scarf'; A.hatC = pick(['#8a2e22', '#2e3e5a', '#9a7a3a', '#3e5a3a', '#5a2a4a'], v2); A.hatPat = v3 < 0.45 ? 'stripe' : v3 < 0.7 ? 'dot' : '';
    A.dress = 'rags'; A.tunic = pick(['#6e5a44', '#5a5048', '#7a6448', '#4e4a42'], v3);
    A.ear = R[29] < 0.5 ? C.gold : null; A.patch = R[34] < 0.18 ? 1 : 0;
    if (t >= 6 || p.ruler) { A.cloak = pick(['#3a3430', '#5a2a22', '#2e3a4a'], v); A.ear = C.gold; A.neck = C.gold; }
    A.armor = t >= 5 ? 1 : 0;
    return A;
  }
  if (p.fem) {
    A.hair = 'fem'; A.dress = 'himat'; A.tunic = pick(['#ece5d4', '#e2d6bc'], v3); A.himat = p.queen ? C.purple : pick(['#8293ab', '#a5663f', '#76844f', PORT.tone(cc, 0.15)], v2); A.trim = C.gold;
    A.ear = C.gold; A.neck = C.gold; A.head = p.queen || t >= 7 ? 'diadem' : 'bare';
    if (cul === 'egy') A.collar = 2;
    return A;
  }
  if (cul === 'rom') {
    if (top) { A.dress = 'toga'; A.praet = C.purple; A.clavus = C.purple; }
    else if (p.tenka) { A.head = 'wreath'; A.wreath = '#7f9a3e'; A.dress = 'muscle'; A.metal = 'gold'; A.tunic = C.scarlet; A.cloak = C.purple; A.armor = 2; }
    else if (mil) {
      // 兵はモンテフォルティーノ型。将は兜を脱いだ姿・モンテフォルティーノ・アッティカ型のどれか
      const hv = R[36], cv = R[35];
      A.tunic = C.red; A.armor = t >= 6 ? 2 : 1;
      A.head = t <= 4 ? 'montef' : hv < 0.28 ? 'bare' : t <= 6 && hv < 0.64 ? 'montef' : 'attic';
      if (t <= 1) { A.dress = 'pect'; if (v < 0.5) { A.crestT = 'feath'; A.crest = C.ink; A.crest2 = C.ink; } }
      else if (t === 2) { A.dress = 'mail'; if (p.rk === 'hyak') { A.crestT = 'trans'; A.crest = C.scarlet; } else { A.crestT = 'feath'; A.crest = C.ink; A.crest2 = v < 0.5 ? C.purple : C.scarlet; } }
      else if (t <= 4) { A.dress = 'mail'; A.crestT = 'crest'; A.crest = pick([C.scarlet, C.scarlet, C.ink, '#ece6d6'], cv); if (t === 4) A.cloak = '#7e2a20'; }
      else { A.dress = 'muscle'; A.crestT = 'crest'; A.crest = pick([C.scarlet, C.scarlet, C.ink, '#ece6d6', '#c9a640'], cv); A.cloak = t >= 7 ? C.scarlet : '#7e2a20'; if (t >= 7 && R[38] < 0.6) A.plume = '#ece6d6'; if (t >= 8) A.metal = 'gold'; }
      if (A.head === 'bare') { A.crestT = ''; A.crest = null; A.plume = null; }
      A.phal = t >= 2 && t <= 6 && p.bu >= 72 ? 1 : 0;
    } else if (staff) { A.tunic = C.red; A.dress = t >= 5 ? 'muscle' : 'tunic'; A.armor = t >= 7 ? 2 : t >= 5 ? 1 : 0; A.cloak = t >= 7 ? C.scarlet : '#7e2a20'; }
    else if (t <= 2) { A.dress = 'tunic'; A.tunic = pick(['#a08a68', '#8f7a5a', '#b39a72'], v2); A.cloak = pick(['#6e5236', '#5d4a3a', '#7a6040'], v3); A.cpin = 0; }
    else { A.dress = 'toga'; if (t >= 5) A.praet = C.purple; if (t >= 6) A.clavus = C.purple; }
    return A;
  }
  if (cul === 'hel') {
    // 外套は国の色（プトレマイオス朝は白に金の縁、王族は紫）。セレウコス朝の兜は銀
    const cl = p.royal ? C.purple : c === 'ptol' ? '#ece5d3' : cc;
    if (c === 'ptol' && !p.royal) A.ctrim = C.gold;
    if (p.ruler) {
      if (c === 'ptol') { A.head = 'nemes'; A.dress = 'linen'; A.tunic = C.linen; A.collar = 2; }
      else { A.head = 'diadem'; A.cloak = C.purple; A.ctrim = C.gold; A.tunic = C.white; if (p.bu >= 70) { A.dress = c === 'sele' ? 'scale' : 'muscle'; A.scaleC = '#c29a45'; A.armor = 2; A.gorg = 1; A.metal = 'gold'; } else A.dress = 'chiton'; }
    } else if (p.tenka) { A.head = c === 'syra' ? 'corinth' : 'attic'; A.metal = 'gold'; A.crestT = 'crest'; A.crest = '#ece6d6'; A.plume = '#ece6d6'; A.dress = 'muscle'; A.cloak = C.purple; A.tunic = C.white; A.armor = 2; A.gorg = 1; }
    else if (mil) {
      const cor = c === 'syra';
      A.tunic = cc; A.trim = PORT.tone(cc, -0.3);
      if (c === 'sele') A.metal = 'silver';
      if (t <= 1) { A.head = 'pilos'; A.dress = 'tunic'; }
      else if (t === 2) { A.head = cor ? 'corinth' : 'pilos'; A.dress = 'lino'; A.armor = 1; if (cor) { A.crestT = 'crest'; A.crest = PORT.tone(cc, -0.35); } else if (v < 0.6) { A.crestT = 'tuft'; A.crest = pick(['#ece6d6', C.crimson, PORT.tone(cc, -0.3)], v2); } }
      else if (t <= 4) { A.head = cor ? 'corinth' : 'phryg'; A.dress = 'lino'; A.armor = 1; A.crestT = 'crest'; A.crest = pick(['#ece6d6', C.crimson, PORT.tone(cc, -0.3)], v2); if (t === 4) A.cloak = cl; }
      else if (t <= 6) { A.head = cor ? 'corinth' : 'phryg'; A.dress = c === 'sele' && v3 < 0.5 ? 'scale' : t >= 6 ? 'muscle' : 'lino'; A.armor = t >= 6 ? 2 : 1; A.crestT = 'crest'; A.crest = pick(['#ece6d6', C.crimson, C.ink], v2); if (t >= 6) A.plume = '#ece6d6'; A.cloak = cl; }
      else { A.head = cor ? 'corinth' : v < 0.55 ? 'boeot' : 'attic'; A.dress = c === 'sele' && v3 < 0.4 ? 'scale' : 'muscle'; A.armor = 2; A.crestT = A.head === 'boeot' ? 'tuft' : 'crest'; A.crest = pick(['#ece6d6', C.crimson], v2); A.plume = A.head === 'boeot' ? null : '#ece6d6'; if (A.head === 'boeot') A.wreath = '#d4ac4c'; A.cloak = cl; A.gorg = 1; if (t >= 8) A.metal = 'gold'; }
      if (t >= 5 && R[36] < 0.25) { A.head = 'bare'; A.crestT = ''; A.crest = null; A.plume = null; A.wreath = null; }   // 兜を脱いだ将
    } else if (staff) {
      A.head = c === 'syra' ? 'bare' : 'kausia'; A.hatC = p.royal ? C.purple : pick(['#e3dccb', '#c8b58f', '#8a6f4e', '#77726a'], v2);
      A.dress = t >= 7 ? 'lino' : 'tunic'; A.tunic = t >= 7 ? cc : pick(['#e6dfcc', '#c9b896'], v3); A.trim = PORT.tone(cc, -0.3); A.cloak = cl; A.armor = t >= 7 ? 1 : 0;
    } else if (top) { A.head = 'wreath'; A.wreath = '#d4ac4c'; A.dress = 'himat'; A.tunic = C.white; A.himat = '#efe9dc'; A.trim = C.purple; }
    else if (t <= 2) { A.head = 'petasos'; A.hatC = pick(['#b59a62', '#8a7048', '#6a5640'], v2); A.dress = 'tunic'; A.tunic = pick(['#cdbb94', '#a89070', '#b8a684'], v3); }
    else {
      A.dress = 'himat'; A.tunic = pick(['#ece5d4', '#e2d8c0'], v3); A.himat = pick(['#d9c9a3', '#8293ab', '#a5663f', '#e9e2d0', '#76844f', PORT.tone(cc, 0.2)], v2); A.trim = PORT.tone(A.himat, -0.4);
      if (t >= 6) { A.head = 'wreath'; A.wreath = pick(['#55703a', '#7a8a4c', '#3f5a34'], v); }
      else if (c === 'mace' && v < 0.45) { A.head = 'kausia'; A.hatC = pick(['#e3dccb', '#c8b58f', '#8a6f4e'], v3); }
      A.bareSh = p.chi >= 74 && v3 < 0.5 ? 1 : 0;
    }
    return A;
  }
  if (cul === 'pun') {
    A.ear = R[29] < 0.55 ? C.gold : null;
    if (p.ruler) { A.head = 'pcap'; A.hatC = '#ece6d8'; A.capBand = C.gold; A.dress = 'robe'; A.robe = C.purple; A.trim = C.gold; A.mantle = '#3e1642'; A.neck = C.gold; A.ear = C.gold; A.sash = '#e8dcc0'; }
    else if (p.tenka) { A.head = 'attic'; A.metal = 'gold'; A.crestT = 'crest'; A.crest = C.purple; A.plume = '#ece6d6'; A.dress = 'muscle'; A.cloak = C.purple; A.tunic = C.crimson; A.armor = 2; }
    else if (mil) {
      A.tunic = pick([C.crimson, '#e3d8c0'], v3); A.trim = C.crimson;
      if (t <= 2) { A.head = 'conic'; A.dress = t <= 1 ? 'tunic' : 'lino'; A.crestT = 'tuft'; A.crest = PORT.tone(C.crimson, -0.1); A.tanit = 1; A.armor = t >= 2 ? 1 : 0; }
      else if (t <= 4) { A.head = 'conic'; A.dress = v < 0.3 ? 'mail' : 'lino'; A.crestT = 'crest'; A.crest = pick([C.purple, C.crimson], v2); A.tanit = 1; A.armor = 1; if (t === 4) A.cloak = C.crimson; }
      else if (t <= 6) { A.head = v < 0.5 ? 'phryg' : 'attic'; A.dress = 'muscle'; A.crestT = 'crest'; A.crest = C.purple; A.cloak = C.crimson; A.armor = t >= 6 ? 2 : 1; A.tanit = 1; }
      else { A.head = 'attic'; A.dress = 'muscle'; A.crestT = 'crest'; A.crest = C.purple; A.plume = C.crimson; A.cloak = C.purple; A.armor = 2; A.tanit = 1; if (t >= 8) A.metal = 'gold'; }
      if (t >= 5 && R[36] < 0.25) { A.head = 'bare'; A.crestT = ''; A.crest = null; A.plume = null; }   // 兜を脱いだ将
    } else if (staff) { A.dress = t >= 7 ? 'lino' : 'tunic'; A.tunic = pick(['#e3d8c0', '#c9b48a'], v3); A.trim = C.crimson; A.cloak = C.crimson; A.armor = t >= 7 ? 1 : 0; }
    else {
      A.dress = t <= 2 ? 'tunic' : 'robe'; A.tunic = pick(['#d9ccae', '#b8a27a', '#a8522e'], v3); A.trim = C.gold;
      A.robe = t >= 6 || top ? pick([C.purple, C.crimson], v2) : pick(['#2e4a72', '#b0782a', C.crimson, '#5a6a3a'], v2);
      A.head = 'pcap'; A.capH = t <= 2 ? 0.7 : 1;
      A.hatC = t <= 2 ? pick(['#8a6a48', '#6e5236', '#b59a6a'], v) : t >= 6 || top ? pick(['#ece6d8', C.purple], v) : pick(['#ece6d8', '#3a3a52', C.crimson], v);
      if (t >= 6 || top) { A.mantle = PORT.tone(A.robe, -0.35); A.neck = C.gold; A.capBand = C.gold; }
    }
    return A;
  }
  if (cul === 'num') {
    A.ear = R[29] < 0.35 ? C.gold : null; A.braid = R[33] < 0.45 ? 1 : 0;
    A.dress = 'ntunic'; A.tunic = pick(['#e8dec6', '#d9c9a5', '#c9b48a'], v3);
    if (p.ruler) { A.head = 'diadem'; A.cloak = C.purple; A.neck = C.gold; A.ear = C.gold; }
    else if (p.tenka) { A.band = C.gold; A.cloak = C.purple; A.neck = C.gold; A.jav = 1; }
    else if (mil) {
      A.jav = 2; if (t >= 3) A.band = pick(['#8a2a1e', '#5a3a22', '#b08a5a'], v2);
      if (t >= 3) A.cloak = t >= 5 ? pick([C.crimson, '#b0682a'], v) : pick(['#8a6a42', '#6e5236'], v);
      if (t >= 7) { A.neck = C.gold; A.cloak = C.crimson; }
    } else { A.cloak = t >= 6 || top ? C.crimson : pick(['#e8e0cc', '#b8a27a', '#8a6a42'], v2); A.cpin = t >= 6 || top ? 1 : 0; if (t >= 6 || top) A.neck = C.gold; }
    return A;
  }
  if (cul === 'gal') {
    A.spiky = mil && t <= 3 ? 1 : 0; A.torc = t >= 5 || p.ruler ? C.gold : '#b8894a';
    const k1 = pick(['#8c2a20', '#2f5a3a', '#2e4a7a', '#a8802a'], v2), k2 = pick(['#e0c060', '#e8dcc0', '#1d1a22', '#c0392b'], v3);
    if (p.ruler || p.tenka || (mil && t >= 7)) { A.head = 'horned'; A.dress = 'mail'; A.tunic = k1; A.cloak = k1; A.cpat = 'check'; A.ck2 = k2; A.armor = 2; A.metal = p.tenka ? 'gold' : 'bronze'; }
    else if (mil && t <= 3) { A.dress = 'bare'; if (t === 3) { A.cloak = k1; A.cpat = 'check'; A.ck2 = k2; } }
    else { A.dress = 'gtunic'; A.tunic = pick(['#8c2a20', '#2f5a3a', '#a8802a', '#2e4a7a'], v); A.stripe = pick(['#e0c060', '#e8dcc0', '#1d1a22'], v2); A.cloak = k1; A.cpat = 'check'; A.ck2 = k2; A.armor = mil && t >= 5 ? 1 : 0; }
    return A;
  }
  if (cul === 'ibe') {
    A.dress = 'itunic'; A.tunic = '#ece6d8'; A.trim = C.crimson; A.braid = 0;
    if (mil || p.tenka) {
      A.head = 'sinew'; A.hatC = '#2a221d'; if (t >= 3) { A.crestT = 'crest'; A.crest = C.crimson; }
      if (t >= 5) { A.cloak = C.black; A.armor = 1; }
      if (t >= 7) { A.head = 'montef'; A.crestT = 'crest'; A.crest = C.crimson; A.plume = C.crimson; A.dress = 'mail'; A.tunic = C.crimson; A.armor = 2; }
    } else A.cloak = C.black;
    return A;
  }
  if (cul === 'egy') {
    A.dress = 'linen'; A.tunic = C.linen; A.collar = t >= 6 || top ? 2 : 1;
    if (p.ruler) { A.head = 'nemes'; A.collar = 2; }
    else if (mil || p.tenka) {
      A.hair = 'wig'; A.collar = 0;
      if (t >= 5) { A.head = 'phryg'; A.crestT = 'crest'; A.crest = '#ece6d6'; A.dress = 'lino'; A.tunic = cc; A.trim = cc; A.cloak = t >= 7 ? cc : null; A.armor = t >= 7 ? 2 : 1; }
      else { A.dress = t >= 3 ? 'lino' : 'linen'; A.trim = '#2f6fa0'; A.armor = t >= 3 ? 1 : 0; A.collar = t >= 3 ? 0 : 1; }
    }
    return A;
  }
  // eas：シリア・フェニキア・小アジア
  A.ear = R[29] < 0.5 ? C.gold : null;
  A.hatC = pick(['#b07a2a', '#8e2a2a', '#2e4a7a', '#5a3a6a', '#3d6a3a'], v2);
  A.robe = pick(['#7a2a3a', '#2a4a6a', '#a8742a', '#3d6a3a', '#5a3a6a'], v3); A.trim = C.gold; A.tunic = A.robe;
  if (mil || p.tenka) { A.dress = t >= 3 ? 'scale' : 'kandys'; A.head = t >= 5 ? 'phryg' : 'tiara'; if (t >= 5) { A.crestT = 'crest'; A.crest = pick([C.crimson, '#ece6d6'], v); A.cloak = A.robe; A.armor = t >= 6 ? 2 : 1; } else A.armor = t >= 3 ? 1 : 0; }
  else { A.dress = 'kandys'; A.head = 'tiara'; if (t >= 6 || top) A.torc = C.gold; }
  return A;
};

// 顔つきのパラメータ（決定的）
PORT.params = (o) => {
  const o2 = o || {};
  const live = o2.id != null && typeof G !== 'undefined' && G && G.off && G.off[o2.id] ? G.off[o2.id] : null;
  const seedS = PORT.key(o2);
  const R = PORT.rnd(seedS);
  const bu = o2.bu ?? (live ? live.bu : 50), chi = o2.chi ?? (live ? live.chi : 50), tou = o2.tou ?? (live ? live.tou : 50), mi = o2.mi ?? (live ? live.mi : 50);
  const st = o2.st || (live ? live.st : 'bal') || 'bal';
  const age = live ? live.age : (o2.age != null ? o2.age : 24 + Math.floor(R[47] * 30));
  const rkey = o2.r || (live ? live.r : null);
  const rk = D.RANKS[rkey] || null;
  const track = rk ? rk.track : 'mil', tier = rk ? rk.tier : 3;
  const c = o2.c || (live ? live.c : null);
  const C = (c && D.COUNTRIES[c]) || (c === 'nomad' ? D.NOMAD : D.BANDIT);
  const col = C.color === '#26262d' ? '#3b3b47' : C.color;
  const p = { seed: seedS, age, bu, chi, tou, mi, st, track, tier, c, col, rk: rkey, name: o2.n || '', sei: String(o2.sei || o2.n || '').slice(0, 1), player: !!o2.player, ruler: rkey === 'kuns', tenka: rkey === 'tenka', royal: !!(o2.royal || (live && live.royal)) };
  // 文化：明示（cul）→ 名 → 国
  const src = o2.n ? o2 : (live || o2);
  const ck = (o2.cul && PORT.CUL[o2.cul] ? o2.cul : null) || (live && live.cul && PORT.CUL[live.cul] ? live.cul : null) || PORT.nameCul(src, c);
  const cul = p.cul = c === 'nomad' ? 'gal' : (ck && PORT.CUL[ck]) || PORT.CDEF[c] || 'hel';
  p.bandit = c === 'bandit' || c === 'rebel';
  const nm0 = PORT.clean(String(src.n || '').split('・')[0]);
  const fem = p.fem = !!(o2.fem || o2.female || o2.sex === 'f' || (live && (live.fem || live.female || live.sex === 'f')) || PORT.FEM.test(nm0));
  p.queen = fem && (PORT.QUEEN.test(nm0) || tier >= 9);
  // 肌
  const SK = PORT.SKINS[cul] || PORT.SKINS.hel;
  const si = Math.max(0, Math.min(SK.length - 1, Math.floor(R[0] * 3.4 + (track === 'mil' ? 0.9 : 0) + (p.bandit ? 1 : 0) - (fem ? 1 : 0))));
  p.skin = cul === 'num' && R[37] < 0.25 ? PORT.SKINS.pun[2 + Math.floor(R[0] * 2.99)] : SK[si];
  // 顔の形
  p.faceW = (fem ? 0.84 : 0.86) + R[1] * (fem ? 0.12 : 0.22) + (bu > 70 && !fem ? 0.05 : 0) - (chi > 70 && bu < 55 ? 0.05 : 0);
  p.faceH = 0.94 + R[2] * 0.2;
  const j = R[3];
  p.jaw = fem ? (j < 0.6 ? 'oval' : 'round') : bu >= 68 ? (j < 0.6 ? 'square' : j < 0.8 ? 'oval' : 'round') : chi >= 66 ? (j < 0.5 ? 'pointed' : j < 0.8 ? 'oval' : 'round') : ['square', 'pointed', 'round', 'oval', 'oval'][Math.floor(j * 5)];
  p.cheek = R[4];                                  // 頬骨の張り
  const e = R[5];
  p.eye = st === 'chi' ? (e < 0.6 ? 'narrow' : 'almond') : st === 'ins' ? (e < 0.6 ? 'sharp' : 'round') : ['almond', 'narrow', 'round', 'droop', 'sharp'][Math.floor(e * 5)];
  if (fem && p.eye === 'sharp') p.eye = 'almond';
  p.eyeSize = 0.85 + R[6] * 0.35 + (mi > 70 ? 0.08 : 0) + (fem ? 0.08 : 0);
  p.eyeGap = 0.9 + R[7] * 0.25;
  const b = R[8];
  p.brow = fem ? (b < 0.5 ? 'thin' : 'arched') : st === 'ins' || bu >= 72 ? (b < 0.7 ? 'angled' : 'thick') : st === 'chi' ? (b < 0.6 ? 'thin' : 'arched') : ['thick', 'thin', 'flat', 'arched', 'angled'][Math.floor(b * 5)];
  p.browH = 0.8 + R[9] * 0.5;
  // 鼻：ローマ人は鷲鼻、ギリシア人はまっすぐ、北アフリカは広め
  const NW = { rom: [0.32, 0.38, 0.12], hel: [0.6, 0.16, 0.1], pun: [0.3, 0.42, 0.14], num: [0.3, 0.12, 0.43], gal: [0.45, 0.1, 0.1], ibe: [0.4, 0.3, 0.15], egy: [0.4, 0.15, 0.3], eas: [0.25, 0.5, 0.12] }[cul] || [0.4, 0.2, 0.2];
  const n = R[10];
  p.nose = fem ? (n < 0.6 ? 'small' : 'straight') : n < NW[0] ? 'straight' : n < NW[0] + NW[1] ? 'hook' : n < NW[0] + NW[1] + NW[2] ? 'wide' : 'small';
  const m = R[11];
  p.mouth = st === 'ins' ? (m < 0.6 ? 'frown' : 'line') : mi >= 68 ? (m < 0.6 ? 'smile' : 'line') : ['line', 'frown', 'line', 'smile', 'tight'][Math.floor(m * 5)];
  p.lip = 0.8 + R[12] * 0.5;
  p.iris = cul === 'gal' ? (R[27] < 0.42 ? '#3f6488' : R[27] < 0.58 ? '#5b6e58' : '#3a2818') : (cul === 'hel' || cul === 'rom') && R[27] < 0.08 ? '#55636b' : '#2a1c12';
  p.kohl = cul === 'egy' || (fem && R[27] < 0.6);
  // 髪の色・白髪・はげ
  const HP = PORT.HAIRS[cul] || PORT.HAIRS.hel;
  const hc0 = HP[Math.floor(R[14] * HP.length)];
  p.hairC = age >= 66 ? '#d9d2c4' : age >= 56 ? '#8f887d' : age >= 47 ? PORT.mix(hc0, '#8f887d', 0.45) : hc0;
  p.beardC = age >= 62 ? '#d2cabc' : age >= 52 ? '#7f776c' : p.hairC;
  p.bald = fem || cul === 'egy' ? 0 : Math.max(0, Math.min(1, (age - 38) / 28)) * (R[28] < 0.35 ? 1 : R[28] < 0.6 ? 0.45 : 0);
  // ひげ（beard は古い分類、bs は形：trim 短く刈る / curly 巻き毛 / point 尖る / gaul 垂れた口ひげ、stub は無精ひげ）
  const bR = R[13];
  let beard = 'none', bs = '', stub = 0;
  if (cul === 'rom') { stub = R[26] < (track === 'mil' ? 0.5 : 0.16) ? 0.35 + R[26] : 0; if (age >= 22 && age < 46 && bR < 0.1) { beard = 'full'; bs = 'trim'; } }
  else if (cul === 'hel') {
    if (p.ruler) stub = 0;                         // ヘレニズムの王はひげを剃る
    else if (age < 28) { if (bR < 0.12) { beard = 'full'; bs = 'trim'; } else stub = R[26] < 0.3 ? 0.45 : 0; }
    else if (age < 42) { beard = bR < 0.42 ? 'full' : bR < 0.55 ? 'goat' : 'none'; bs = 'curly'; if (beard === 'none') stub = R[26] < 0.35 ? 0.45 : 0; }
    else { beard = bR < 0.5 ? 'full' : bR < 0.78 ? 'long' : bR < 0.86 ? 'goat' : 'none'; bs = 'curly'; }
    if (!p.ruler && track !== 'mil' && chi >= 72 && age >= 40 && beard !== 'none') beard = 'long';   // 学者のひげ
  }
  else if (cul === 'pun' || cul === 'eas') {
    if (age < 24) { if (bR < 0.55) { beard = 'full'; bs = 'trim'; } else stub = 0.5; }
    else { beard = bR < 0.62 ? 'full' : bR < 0.85 ? 'long' : 'goat'; bs = 'curly'; }
    if (cul === 'eas' && age >= 35 && bR < 0.75) beard = 'long';
  }
  else if (cul === 'num') { beard = age < 22 && bR < 0.4 ? 'none' : bR < 0.7 ? 'goat' : 'full'; bs = 'point'; }
  else if (cul === 'gal') { beard = age >= 50 && bR < 0.3 ? 'full' : bR < 0.92 ? 'must' : 'none'; bs = 'gaul'; }
  else if (cul === 'ibe') { beard = bR < 0.4 ? 'full' : 'none'; bs = 'trim'; if (beard === 'none') stub = R[26] < 0.6 ? 0.5 : 0; }
  else if (cul === 'egy') stub = R[26] < 0.15 ? 0.3 : 0;
  if (p.bandit && beard === 'none') { stub = 0.75; if (bR < 0.4) { beard = 'full'; bs = 'trim'; } }
  if (fem) { beard = 'none'; stub = 0; }
  p.beard = beard; p.bs = bs; p.stub = stub;
  p.scar = !fem && (bu >= 66 || p.bandit) && R[15] < (p.bandit ? 0.5 : 0.38) ? 1 + Math.floor(R[16] * 3) : 0;   // 1: 頬 2: 眉 3: 顎
  p.wrinkle = age >= 56 ? 3 : age >= 46 ? 2 : age >= 38 ? 1 : 0;
  p.eyebag = age >= 40 ? R[17] * 0.6 : 0;
  p.tilt = (R[19] - 0.5) * 0.06;                     // 顔のわずかな傾き
  p.look = (R[20] - 0.5) * 0.5;                      // 視線
  p.wash = [R[22], R[23], R[24], R[25]];
  p.hatTint = R[18];
  // 装い
  const A = p.at = PORT.attire(p, R);
  p.head = A.head; p.hair = A.hair; p.dress = A.dress; p.cloak = A.cloak; p.crestT = A.crestT; p.crest = A.crest; p.metal = A.metal; p.armor = A.armor;
  p.tall = !!(A.crestT === 'crest' || A.crestT === 'feath' || A.crestT === 'trans' || A.plume || A.head === 'pilos' || A.head === 'conic' || A.head === 'tiara' || A.head === 'horned' || (A.head === 'pcap' && A.capH >= 1));
  p.hat = PORT.HELM[A.head] ? (A.crestT ? 'helm' : 'cap') : A.head === 'scarf' ? 'band' : 'fur';
  p.sig = [cul, A.head, A.hair, A.dress, A.cloak || '', A.crestT, A.crest || '', A.metal, A.hatC || '', A.tunic || '', beard, bs, fem ? 'f' : ''].join(',');
  return p;
};
// 表情：眉の傾き（正で内側が下がる＝怒り、負で内側が上がる＝苦悶）、目の開き、口
PORT.EXPR = {
  normal: {},
  angry:  { browTilt: 1.0, eyeOpen: 0.85, mouth: 'shout', look: 0, eyeSize: 0.95 },
  pain:   { browTilt: -0.9, eyeOpen: 0.45, mouth: 'grit', sweat: true },
  joy:    { browTilt: -0.3, eyeOpen: 0.6, mouth: 'laugh', browUp: 0.4, blush: true },
  shock:  { browTilt: -0.2, eyeOpen: 1.45, mouth: 'o', browUp: 1.0, eyeSize: 1.15, sweat: true },
  calm:   { browTilt: 0, eyeOpen: 0.8, mouth: 'line' },
};

/* ---------- 体：衣・鎧・外套（100×100 の座標） ---------- */
// 細かい模様（鎖かたびら・小札）は小さな絵を敷き詰めて一度で塗る
PORT._tiles = {};
PORT.TILES = {
  mail: { w: 2, h: 3.8, draw: (g) => {
    const P = [[0, 0], [2, 0], [1, 1.9], [0, 3.8], [2, 3.8]];
    g.strokeStyle = 'rgba(22,25,30,.55)'; g.lineWidth = 0.45; g.beginPath(); for (const [x, y] of P) { g.moveTo(x + 0.8, y); g.arc(x, y, 0.8, 0, 6.2832); } g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 0.3; g.beginPath(); for (const [x, y] of P) { g.moveTo(x + 0.7 * Math.cos(3.8), y + 0.7 * Math.sin(3.8)); g.arc(x, y, 0.7, 3.8, 5.2); } g.stroke();
  } },
  scale: { w: 3.2, h: 5.4, draw: (g) => {
    const P = [[0, 0], [3.2, 0], [1.6, 2.7], [0, 5.4], [3.2, 5.4], [1.6, -2.7]];
    g.strokeStyle = 'rgba(40,24,6,.6)'; g.lineWidth = 0.55; g.beginPath(); for (const [x, y] of P) { g.moveTo(x - 1.6, y); g.quadraticCurveTo(x - 1.6, y + 2.5, x, y + 2.8); g.quadraticCurveTo(x + 1.6, y + 2.5, x + 1.6, y); } g.stroke();
    g.strokeStyle = 'rgba(255,240,200,.24)'; g.lineWidth = 0.5; g.beginPath(); for (const [x, y] of P) { g.moveTo(x - 1.1, y + 0.6); g.quadraticCurveTo(x - 1.1, y + 1.8, x - 0.2, y + 2); } g.stroke();
  } },
  // 縮れ毛（ヌミディア）：少しずつずらした小さな渦
  tight: { w: 13, h: 15.6, draw: (g) => {
    const rr = U.rng(7), P = [];
    for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) P.push([i * 2.6 + (j % 2) * 1.3 + (rr() - 0.5) * 1.1, j * 2.6 + (rr() - 0.5) * 1.0, 0.75 + rr() * 0.35, 3.3 + rr() * 0.8]);
    g.strokeStyle = 'rgba(255,240,220,.3)'; g.lineWidth = 0.55; g.beginPath();
    for (const [x, y, r, a] of P) for (const dx of [-13, 0, 13]) for (const dy of [-15.6, 0, 15.6]) { g.moveTo(x + dx + r * Math.cos(a), y + dy + r * Math.sin(a)); g.arc(x + dx, y + dy, r, a, a + 2.4); }
    g.stroke();
  } },
  // 巻いたひげ
  curl: { w: 14, h: 13.2, draw: (g) => {
    const rr = U.rng(11), P = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) P.push([i * 3.5 + (j % 2) * 1.7 + (rr() - 0.5) * 1.6, j * 3.3 + (rr() - 0.5) * 1.4, 1.15 + rr() * 0.55, 0.3 + rr() * 0.6]);
    const W = (f) => { g.beginPath(); for (const q of P) for (const dx of [-14, 0, 14]) for (const dy of [-13.2, 0, 13.2]) f(q[0] + dx, q[1] + dy, q[2], q[3]); g.stroke(); };
    g.strokeStyle = 'rgba(0,0,0,.26)'; g.lineWidth = 0.55; W((x, y, r, a) => { g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); g.arc(x, y, r, a, a + 2.5); });
    g.strokeStyle = 'rgba(255,245,230,.13)'; W((x, y, r, a) => { const b = a + 3.3; g.moveTo(x + r * 0.55 * Math.cos(b), y + r * 0.55 * Math.sin(b)); g.arc(x, y, r * 0.55, b, b + 2.0); });
  } },
  // 背景の壁の粒（明るい背景・暗い背景）
  grainL: { w: 50, h: 50, px: 4, draw: (g) => { const rr = U.rng(5); g.fillStyle = 'rgba(60,40,20,.07)'; g.beginPath(); for (let i = 0; i < 23; i++) g.rect(rr() * 48, rr() * 48, 0.7 + rr(), 0.5 + rr() * 0.8); g.fill(); } },
  grainD: { w: 50, h: 50, px: 4, draw: (g) => { const rr = U.rng(5); g.fillStyle = 'rgba(255,240,210,.05)'; g.beginPath(); for (let i = 0; i < 23; i++) g.rect(rr() * 48, rr() * 48, 0.7 + rr(), 0.5 + rr() * 0.8); g.fill(); } },
};
// 敷き詰め模様（ox, oy でずらす）。古いブラウザで使えなければ null（模様なしで描く）
PORT.pat = (g, key, ox = 0, oy = 0) => {
  let t = PORT._tiles[key];
  if (t === undefined) {
    t = null;
    try { const T = PORT.TILES[key], px = T.px || 8, c = document.createElement('canvas'); c.width = Math.round(T.w * px); c.height = Math.round(T.h * px); const tg = c.getContext('2d'); tg.scale(px, px); T.draw(tg); t = { c, px }; } catch (e) { t = null; }
    PORT._tiles[key] = t;
  }
  if (!t || typeof DOMMatrix === 'undefined') return null;
  try { const pat = g.createPattern(t.c, 'repeat'); if (!pat || !pat.setTransform) return null; pat.setTransform(new DOMMatrix([1 / t.px, 0, 0, 1 / t.px, ox, oy])); return pat; } catch (e) { return null; }
};
PORT.body = (g, p) => {
  const A = p.at, C = PORT.C;
  const sh = () => { g.beginPath(); g.moveTo(4, 104); g.quadraticCurveTo(10, 78, 36, 74); g.lineTo(64, 74); g.quadraticCurveTo(90, 78, 96, 104); g.closePath(); };
  const torso = (w) => { g.beginPath(); g.moveTo(50 - 27 * w, 104); g.quadraticCurveTo(50 - 26 * w, 88, 50 - 21 * w, 80.5); g.quadraticCurveTo(50 - 15 * w, 75.5, 39, 74.4); g.lineTo(61, 74.4); g.quadraticCurveTo(50 + 15 * w, 75.5, 50 + 21 * w, 80.5); g.quadraticCurveTo(50 + 26 * w, 88, 50 + 27 * w, 104); g.closePath(); };
  // 平らに塗り、陰（上は明るく下と両肩は暗く）は最後に体全体へ一度だけ掛ける
  const fillS = (fn, col) => { g.fillStyle = col; fn(); g.fill(); };
  const tex = (fn, key) => { const pt = PORT.pat(g, key); if (pt) { g.fillStyle = pt; fn(); g.fill(); } };
  const edge = (fn, a = 0.45, w = 0.8) => { fn(); g.lineWidth = w; g.strokeStyle = `rgba(29,21,12,${a})`; g.stroke(); };
  const folds = (lines, a = 0.22) => { g.strokeStyle = `rgba(30,20,10,${a})`; g.lineWidth = 0.8; g.beginPath(); for (const l of lines) { g.moveTo(l[0], l[1]); g.quadraticCurveTo(l[2], l[3], l[4], l[5]); } g.stroke(); };
  const MET = PORT.METAL[A.metal] || PORT.METAL.bronze;
  if (p.fem) { g.save(); g.translate(50, 0); g.scale(0.9, 1); g.translate(-50, 0); }
  // 背の投げ槍（ヌミディア）
  if (A.jav) {
    const jav = (x0, y0, x1, y1) => { g.strokeStyle = '#6a4a2c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.save(); g.translate(x1, y1); g.rotate(Math.atan2(x1 - x0, y0 - y1)); g.fillStyle = '#a7acb1'; g.beginPath(); g.moveTo(0, 1); g.quadraticCurveTo(-2.4, -3, 0, -10); g.quadraticCurveTo(2.4, -3, 0, 1); g.fill(); g.strokeStyle = 'rgba(29,21,12,.6)'; g.lineWidth = 0.5; g.stroke(); g.restore(); };
    jav(70, 104, 88, 24); if (A.jav >= 2) jav(75, 104, 94, 30);
  }
  const d = A.dress;
  if (d === 'toga') {
    // 白い市民の服。紫の縁（プラエテクスタ）と、胸の紫の筋（クラウス）
    fillS(sh, '#e2dccb');
    if (A.clavus) { g.fillStyle = A.clavus; g.fillRect(31, 76.5, 3.4, 30); }
    g.save(); sh(); g.clip();
    const T = () => { g.beginPath(); g.moveTo(57, 73); g.bezierCurveTo(51, 84, 34, 96, 21, 106); g.lineTo(101, 106); g.lineTo(101, 70); g.closePath(); };
    fillS(T, '#f3eee3');
    folds([[66, 75, 58, 90, 40, 106], [76, 78, 70, 92, 56, 106], [86, 84, 80, 96, 72, 106]], 0.2);
    if (A.praet) { g.beginPath(); g.moveTo(60.5, 74.5); g.bezierCurveTo(55, 86, 38, 98, 25.5, 107); g.lineWidth = 2.6; g.strokeStyle = A.praet; g.stroke(); }
    g.beginPath(); g.moveTo(57, 73); g.bezierCurveTo(51, 84, 34, 96, 21, 106); g.lineWidth = 4.6; g.strokeStyle = '#f7f3ea'; g.stroke(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(90,70,40,.5)'; g.stroke();
    g.beginPath(); g.moveTo(55, 75.5); g.bezierCurveTo(49, 86, 32, 98, 19, 108); g.strokeStyle = 'rgba(90,70,40,.35)'; g.stroke();
    g.restore();
  } else if (d === 'pect') {
    // 赤い上衣に四角い青銅の胸当て
    fillS(sh, A.tunic);
    g.strokeStyle = '#4e3220'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(38.5, 75); g.lineTo(43.5, 82); g.moveTo(61.5, 75); g.lineTo(56.5, 82); g.moveTo(70, 77); g.lineTo(30, 106); g.stroke();
    const pg = g.createLinearGradient(42, 81, 58, 97); pg.addColorStop(0, MET[0]); pg.addColorStop(1, MET[2]);
    g.fillStyle = pg; g.fillRect(42, 81, 16, 15.5); g.strokeStyle = 'rgba(50,30,10,.75)'; g.lineWidth = 0.8; g.strokeRect(42, 81, 16, 15.5);
    g.strokeStyle = 'rgba(60,38,12,.6)'; g.lineWidth = 0.6; g.beginPath(); for (const [x, y] of [[46, 85.2], [54, 85.2], [50, 91.8]]) { g.moveTo(x + 2.1, y); g.arc(x, y, 2.1, 0, 6.2832); } g.stroke();
  } else if (d === 'mail') {
    // 鎖かたびら（肩の二重当てと胸の留め金）
    fillS(sh, A.tunic);
    const mc = A.mailC || '#767a7e';
    const M = () => torso(1.12);
    fillS(M, mc); tex(M, 'mail');
    for (const s of [-1, 1]) {
      const H = () => { g.beginPath(); g.moveTo(50 + s * 10.5, 74.6); g.quadraticCurveTo(50 + s * 22, 75.5, 50 + s * 28, 81); g.lineTo(50 + s * 25, 91); g.quadraticCurveTo(50 + s * 16, 88.5, 50 + s * 7.5, 86); g.closePath(); };
      fillS(H, PORT.tone(mc, 0.08)); tex(H, 'mail'); edge(H, 0.55);
    }
    g.fillStyle = MET[1]; g.fillRect(40.5, 83.6, 5, 3.6); g.fillRect(54.5, 83.6, 5, 3.6); g.strokeStyle = MET[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(45.5, 85.4); g.lineTo(54.5, 85.4); g.stroke();
  } else if (d === 'muscle') {
    // 青銅の筋肉鎧と肩の革帯
    fillS(sh, A.tunic);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = 50 + s * (25 + i * 3.7); g.fillStyle = i % 2 ? '#d8cbab' : '#e9dfc6'; g.beginPath(); g.moveTo(x - 1.7, 79.5 + i * 1.3); g.lineTo(x + 1.7, 79.5 + i * 1.3); g.lineTo(x + 2 + s * 0.6, 92 + i * 1.6); g.lineTo(x - 1.4 + s * 0.6, 92 + i * 1.6); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,25,10,.45)'; g.lineWidth = 0.5; g.stroke(); }
    const cg = g.createLinearGradient(24, 0, 76, 0); cg.addColorStop(0, MET[2]); cg.addColorStop(0.33, MET[0]); cg.addColorStop(0.62, MET[1]); cg.addColorStop(1, MET[2]);
    g.fillStyle = cg; torso(0.98); g.fill();
    g.strokeStyle = 'rgba(55,35,10,.6)'; g.lineWidth = 0.9; g.beginPath();
    g.moveTo(33, 84); g.quadraticCurveTo(40, 93.5, 49.4, 89); g.moveTo(67, 84); g.quadraticCurveTo(60, 93.5, 50.6, 89);
    g.moveTo(50, 89.5); g.lineTo(50, 104); g.moveTo(41.5, 98.5); g.quadraticCurveTo(46, 100.5, 49.2, 99); g.moveTo(58.5, 98.5); g.quadraticCurveTo(54, 100.5, 50.8, 99); g.stroke();
    g.strokeStyle = 'rgba(255,248,215,.4)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(36, 82.5); g.quadraticCurveTo(41, 88.5, 46.5, 87.5); g.stroke();
    edge(() => torso(0.98), 0.6, 0.8);
    g.beginPath(); g.moveTo(39, 75); g.quadraticCurveTo(50, 79, 61, 75); g.lineWidth = 1.9; g.strokeStyle = MET[0]; g.stroke();
  } else if (d === 'lino') {
    // 亜麻を重ねた胸甲（肩当てを胸で結ぶ）
    fillS(sh, A.tunic);
    const lc = A.lino || '#e7dec5', tc = A.trim || PORT.tone(p.col, -0.25);
    const L = () => torso(1.04);
    fillS(L, lc);
    g.fillStyle = PORT.tone(lc, -0.07); g.strokeStyle = tc; g.lineWidth = 1.3;
    g.beginPath(); for (const s of [-1, 1]) { g.moveTo(50 + s * 10.8, 74.6); g.lineTo(50 + s * 21.5, 78); g.lineTo(50 + s * 18.5, 88.5); g.lineTo(50 + s * 9, 86.5); g.closePath(); } g.fill(); g.stroke();
    g.strokeStyle = 'rgba(40,25,10,.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(41, 87); g.lineTo(44, 90); g.moveTo(59, 87); g.lineTo(56, 90); g.stroke();
    g.fillStyle = tc; g.fillRect(25, 99, 50, 2.6);
    g.beginPath(); g.moveTo(39, 75); g.quadraticCurveTo(50, 79, 61, 75); g.lineWidth = 1.6; g.strokeStyle = tc; g.stroke();
    edge(L, 0.4);
  } else if (d === 'scale') {
    // 小札の鎧（東方の重装騎兵）
    fillS(sh, A.tunic);
    const Sc = () => torso(1.1);
    fillS(Sc, A.scaleC || '#a07c3e'); tex(Sc, 'scale');
    g.beginPath(); g.moveTo(39, 75); g.quadraticCurveTo(50, 79, 61, 75); g.lineWidth = 1.6; g.strokeStyle = A.trim || C.gold; g.stroke();
  } else if (d === 'himat') {
    // ギリシアの外衣（左の肩から斜めに掛ける）
    if (A.bareSh) { fillS(sh, p.skin); g.strokeStyle = 'rgba(90,50,25,.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(37, 79); g.quadraticCurveTo(43, 80.5, 47.5, 79.5); g.moveTo(26, 90); g.quadraticCurveTo(33, 95, 40, 92.5); g.stroke(); }
    else { fillS(sh, A.tunic); folds([[30, 80, 29, 92, 27, 104], [42, 84, 41, 95, 40, 104]], 0.16); }
    g.save(); sh(); g.clip();
    const Hm = () => { g.beginPath(); g.moveTo(60, 73); g.bezierCurveTo(54, 86, 37, 98, 26, 106); g.lineTo(101, 106); g.lineTo(101, 70); g.closePath(); };
    fillS(Hm, A.himat || '#d9c9a3');
    folds([[69, 76, 62, 91, 47, 106], [80, 80, 74, 94, 63, 106]], 0.22);
    g.beginPath(); g.moveTo(61.6, 74.5); g.bezierCurveTo(56, 87, 39, 99, 28.6, 107); g.lineWidth = 1.5; g.strokeStyle = A.trim || '#6a5434'; g.stroke();
    edge(() => { g.beginPath(); g.moveTo(60, 73); g.bezierCurveTo(54, 86, 37, 98, 26, 106); }, 0.45);
    g.restore();
  } else if (d === 'robe') {
    // カルタゴの長衣（胸の飾り帯、肩の外衣、斜めの帯）
    fillS(sh, A.robe || C.crimson);
    if (A.mantle) { const Mn = () => { g.beginPath(); for (const s of [-1, 1]) { g.moveTo(50 + s * 46, 104); g.quadraticCurveTo(50 + s * 40, 78, 50 + s * 14, 74); g.lineTo(50 + s * 11, 74.6); g.quadraticCurveTo(50 + s * 20, 80, 50 + s * 24, 90); g.quadraticCurveTo(50 + s * 26, 98, 50 + s * 26, 104); g.closePath(); } }; fillS(Mn, A.mantle); edge(Mn, 0.45); }
    g.fillStyle = A.trim || C.gold; g.fillRect(47.6, 78, 4.8, 28);
    g.fillStyle = 'rgba(70,20,20,.55)'; g.beginPath(); for (let y = 80.5; y < 104; y += 3) { g.moveTo(50, y - 1.1); g.lineTo(51.2, y); g.lineTo(50, y + 1.1); g.lineTo(48.8, y); g.closePath(); } g.fill();
    if (A.sash) { g.beginPath(); g.moveTo(68, 77); g.lineTo(34, 106); g.lineWidth = 4.2; g.strokeStyle = A.sash; g.stroke(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(60,40,20,.45)'; g.stroke(); }
  } else if (d === 'ntunic') {
    // 袖なしの軽い上衣（腕は素肌）
    fillS(sh, p.skin);
    const N = () => { g.beginPath(); g.moveTo(21, 104); g.quadraticCurveTo(22, 87, 27.5, 79.5); g.quadraticCurveTo(32.5, 75.5, 39, 74.4); g.lineTo(61, 74.4); g.quadraticCurveTo(67.5, 75.5, 72.5, 79.5); g.quadraticCurveTo(78, 87, 79, 104); g.closePath(); };
    fillS(N, A.tunic); edge(N, 0.35);
    g.strokeStyle = 'rgba(90,50,25,.35)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(15, 92); g.quadraticCurveTo(13, 98, 14, 104); g.moveTo(85, 92); g.quadraticCurveTo(87, 98, 86, 104); g.stroke();
    folds([[42, 80, 41, 92, 40, 104], [58, 80, 59, 92, 60, 104]], 0.14);
  } else if (d === 'bare') {
    // 裸の上半身（ガリアの戦士）
    fillS(sh, p.skin);
    g.strokeStyle = 'rgba(90,50,25,.32)'; g.lineWidth = 0.8; g.beginPath();
    g.moveTo(33, 86); g.quadraticCurveTo(41, 93, 49, 89.5); g.moveTo(67, 86); g.quadraticCurveTo(59, 93, 51, 89.5);
    g.moveTo(38, 79); g.quadraticCurveTo(44, 80.5, 48, 79.6); g.moveTo(62, 79); g.quadraticCurveTo(56, 80.5, 52, 79.6); g.stroke();
    g.beginPath(); g.moveTo(69, 75.5); g.lineTo(27, 106); g.lineWidth = 2.8; g.strokeStyle = '#4a3020'; g.stroke(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(255,230,190,.25)'; g.stroke();
  } else if (d === 'gtunic') {
    // ガリアの縞の上衣
    fillS(sh, A.tunic);
    g.strokeStyle = PORT.rgba(A.stripe || '#e0c060', 0.7); g.lineWidth = 1.5; g.beginPath(); for (const x of [22, 30, 38, 62, 70, 78]) { const y0 = 74 + Math.max(0, Math.abs(x - 50) - 14) * 0.32; g.moveTo(x, y0); g.lineTo(x + (x - 50) * 0.08, 106); } g.stroke();
  } else if (d === 'rags') {
    // 粗い服・継ぎはぎ・剣帯
    fillS(sh, A.tunic);
    g.fillStyle = PORT.tone(A.tunic, -0.22); g.save(); g.translate(28, 93); g.rotate(-0.2); g.fillRect(-4, -3, 8, 6.5); g.strokeStyle = 'rgba(230,210,170,.35)'; g.lineWidth = 0.5; g.setLineDash([0.9, 0.9]); g.strokeRect(-4, -3, 8, 6.5); g.setLineDash([]); g.restore();
    g.save(); g.translate(72, 96); g.rotate(0.25); g.fillRect(-3.5, -3, 7, 6); g.restore();
    g.beginPath(); g.moveTo(68, 76); g.lineTo(30, 106); g.lineWidth = 3; g.strokeStyle = '#3e2a1a'; g.stroke();
    g.fillStyle = '#8a7a5a'; g.fillRect(46.5, 88.5, 4.4, 3.4);
    folds([[36, 78, 40, 90, 37, 104], [60, 80, 62, 92, 64, 104]], 0.2);
  } else if (d === 'linen') {
    // エジプトの白い亜麻（細いひだ）
    fillS(sh, A.tunic || C.linen);
    g.strokeStyle = 'rgba(120,100,70,.2)'; g.lineWidth = 0.5; g.beginPath(); for (let x = 18; x < 84; x += 3.2) { g.moveTo(x, 80 + Math.abs(x - 50) * 0.08); g.lineTo(x + (x - 50) * 0.1, 106); } g.stroke();
  } else if (d === 'kandys') {
    // 東方の長袖の衣（前の飾り縁）
    fillS(sh, A.robe || '#7a2a3a');
    const tc = A.trim || C.gold;
    g.strokeStyle = tc; g.lineWidth = 3.2; g.beginPath(); g.moveTo(39.5, 75); g.lineTo(50, 90); g.lineTo(60.5, 75); g.moveTo(50, 90); g.lineTo(50, 106); g.stroke();
    g.fillStyle = 'rgba(80,30,20,.6)'; g.beginPath(); for (let i = 0; i < 6; i++) { g.moveTo(50.6, 92.5 + i * 2.6); g.arc(50, 92.5 + i * 2.6, 0.6, 0, 6.2832); } g.fill();
    g.strokeStyle = PORT.rgba(tc, 0.6); g.lineWidth = 1.6; g.beginPath(); g.moveTo(12, 96); g.quadraticCurveTo(14, 90, 19, 86); g.moveTo(88, 96); g.quadraticCurveTo(86, 90, 81, 86); g.stroke();
  } else if (d === 'itunic') {
    // イベリアの白い上衣と深紅の縁
    fillS(sh, A.tunic || '#ece6d8');
    g.beginPath(); g.moveTo(37, 74.6); g.quadraticCurveTo(50, 88, 63, 74.6); g.lineWidth = 3.6; g.strokeStyle = A.trim || C.crimson; g.stroke();
    g.beginPath(); g.moveTo(10, 90); g.quadraticCurveTo(14, 84, 21, 80.5); g.moveTo(90, 90); g.quadraticCurveTo(86, 84, 79, 80.5); g.lineWidth = 2.4; g.stroke();
    g.beginPath(); g.moveTo(67, 76); g.lineTo(31, 106); g.lineWidth = 2.4; g.strokeStyle = '#4a3020'; g.stroke();
  } else {
    // tunic / chiton：上衣（キトンは細いひだ）
    fillS(sh, A.tunic || C.wool);
    if (d === 'chiton') { g.strokeStyle = 'rgba(110,90,60,.22)'; g.lineWidth = 0.55; g.beginPath(); for (let x = 20; x < 82; x += 3.4) { g.moveTo(x, 79 + Math.abs(x - 50) * 0.06); g.lineTo(x + (x - 50) * 0.1, 106); } g.stroke(); }
    else folds([[36, 79, 39, 91, 36, 104], [64, 79, 61, 91, 64, 104]], 0.18);
    if (A.trim && d === 'tunic' && p.track !== 'civ') { g.beginPath(); g.moveTo(39.5, 74.8); g.quadraticCurveTo(50, 84, 60.5, 74.8); g.lineWidth = 1.2; g.strokeStyle = A.trim; g.stroke(); }
  }
  // 外套
  let brooch = null;
  if (A.cloak) {
    const cl = A.cloak;
    const checks = (fn) => { if (A.cpat !== 'check') return; g.save(); fn(); g.clip(); g.strokeStyle = PORT.rgba(A.ck2 || '#e0c060', 0.55); g.lineWidth = 1.3; g.beginPath(); for (let x = 2; x < 100; x += 6) { g.moveTo(x, 70); g.lineTo(x, 106); } for (let y = 72; y < 106; y += 6) { g.moveTo(0, y); g.lineTo(100, y); } g.stroke(); g.strokeStyle = PORT.rgba(PORT.tone(cl, -0.5), 0.55); g.lineWidth = 0.6; g.beginPath(); for (let x = 5; x < 100; x += 6) { g.moveTo(x, 70); g.lineTo(x, 106); } for (let y = 75; y < 106; y += 6) { g.moveTo(0, y); g.lineTo(100, y); } g.stroke(); g.restore(); };
    if (!A.cpin) {
      // 前で閉じる外套（パエヌラ・羊飼いの外套）
      const Cl = () => { g.beginPath(); g.moveTo(4, 104); g.quadraticCurveTo(10, 78, 36, 74); g.lineTo(64, 74); g.quadraticCurveTo(90, 78, 96, 104); g.lineTo(57, 104); g.quadraticCurveTo(54, 92, 51, 81); g.lineTo(49, 81); g.quadraticCurveTo(46, 92, 43, 104); g.closePath(); };
      fillS(Cl, cl); checks(Cl); edge(Cl, 0.42);
      folds([[24, 82, 20, 94, 21, 104], [76, 82, 80, 94, 79, 104]], 0.22);
      g.fillStyle = '#5a4630'; g.beginPath(); g.arc(50, 84.5, 1.4, 0, 6.2832); g.fill();
    } else {
      // 肩で留める外套（クラミュス・サグム・将軍の緋の外套）
      const LR = () => { g.beginPath(); g.moveTo(4, 104); g.quadraticCurveTo(10, 78, 36, 74); g.lineTo(39.5, 74.6); g.quadraticCurveTo(33, 77, 30.5, 80.5); g.quadraticCurveTo(25.5, 92, 23.5, 104); g.closePath(); g.moveTo(96, 104); g.quadraticCurveTo(90, 78, 64, 74); g.lineTo(60.5, 74.6); g.quadraticCurveTo(70, 78, 75, 86); g.quadraticCurveTo(79, 95, 79.5, 104); g.closePath(); };
      fillS(LR, cl); checks(LR); edge(LR, 0.42);
      folds([[16, 86, 15, 95, 12, 104], [27, 85, 22, 95, 19, 104], [80, 82, 85, 92, 88, 104], [72, 80, 78, 92, 82, 104]], 0.26);
      if (A.ctrim) { g.strokeStyle = A.ctrim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(39, 74.8); g.quadraticCurveTo(32.6, 77.4, 30.2, 81); g.quadraticCurveTo(25.3, 92, 23.3, 104); g.moveTo(61, 74.8); g.quadraticCurveTo(70.5, 78.4, 75.5, 86.4); g.quadraticCurveTo(79.4, 95, 79.8, 104); g.stroke(); }
      brooch = A.brooch || C.gold;
    }
  }
  // 体全体の陰
  const lg = g.createLinearGradient(0, 74, 0, 104); lg.addColorStop(0, 'rgba(255,245,220,.16)'); lg.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = lg; sh(); g.fill();
  const sg = g.createLinearGradient(4, 0, 96, 0); sg.addColorStop(0, 'rgba(0,0,0,.3)'); sg.addColorStop(0.27, 'rgba(0,0,0,0)'); sg.addColorStop(0.73, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = sg; sh(); g.fill();
  // 陰のあとに描く光りもの：胸の飾り・勲章・留め金
  if (d === 'muscle' && A.gorg) { const gg = g.createRadialGradient(49.4, 85.4, 0.3, 50, 86, 3); gg.addColorStop(0, '#fbeaa8'); gg.addColorStop(1, '#9a7428'); g.fillStyle = gg; g.beginPath(); g.arc(50, 86, 2.9, 0, 6.2832); g.fill(); g.fillStyle = 'rgba(60,35,10,.75)'; g.fillRect(48.8, 85.4, 0.8, 0.6); g.fillRect(50.4, 85.4, 0.8, 0.6); g.fillRect(49.3, 87.2, 1.4, 0.5); }
  if (d === 'lino' && A.tanit) PORT.tanit(g, 50, 93, 1, C.gold);
  if (A.phal) {
    // 勲章（ローマ兵の円盤飾り）
    g.strokeStyle = '#4a3020'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(42, 82); g.lineTo(58, 82); g.moveTo(42, 82); g.lineTo(42, 97); g.moveTo(58, 82); g.lineTo(58, 97); g.stroke();
    const PH = [[44.5, 86], [50, 86], [55.5, 86], [47, 92.5], [53, 92.5]];
    g.fillStyle = '#b8963e'; g.beginPath(); for (const [x, y] of PH) { g.moveTo(x + 2.1, y); g.arc(x, y, 2.1, 0, 6.2832); } g.fill();
    g.fillStyle = '#f2dc96'; g.beginPath(); for (const [x, y] of PH) { g.moveTo(x + 0.4, y - 0.5); g.arc(x - 0.5, y - 0.5, 0.9, 0, 6.2832); } g.fill();
  }
  if (brooch) { const bx = 31, by = 80.6; g.fillStyle = brooch; g.beginPath(); g.arc(bx, by, 2.9, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(60,40,10,.8)'; g.lineWidth = 0.6; g.stroke(); g.fillStyle = 'rgba(255,250,220,.75)'; g.beginPath(); g.arc(bx - 0.8, by - 0.8, 0.9, 0, 6.2832); g.fill(); }
  if (p.fem) g.restore();
};
// タニトの印（カルタゴの女神の記号）
PORT.tanit = (g, x, y, s, col) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.moveTo(-2.2, 2.6); g.lineTo(2.2, 2.6); g.lineTo(0.5, -0.6); g.lineTo(-0.5, -0.6); g.closePath(); g.fill(); g.fillRect(-2.2, -1.1, 4.4, 0.7); g.beginPath(); g.arc(0, -2.4, 1.05, 0, 6.2832); g.fill(); g.restore(); };
// 首まわり：エジプトの胸飾り・首飾り・トルク
PORT.neckwear = (g, p) => {
  const A = p.at;
  if (A.collar) {
    const cols = A.collar >= 2 ? ['#d4ac4c', '#2f6fa0', '#d4ac4c', '#a8322a', '#3a8a7a', '#d4ac4c'] : ['#2f6fa0', '#d4ac4c', '#3a8a7a', '#a8322a'];
    for (let i = 0; i < cols.length; i++) { const r = 11 + i * 2.5; g.beginPath(); g.ellipse(50, 71.5, r + 3, r * 0.78, 0, 0.06 * Math.PI, 0.94 * Math.PI); g.lineWidth = 2.6; g.strokeStyle = cols[i]; g.stroke(); }
    g.fillStyle = A.collar >= 2 ? '#d4ac4c' : '#2f6fa0'; const R0 = 11 + cols.length * 2.5;
    for (let i = 0; i <= 12; i++) { const a = (0.08 + i * 0.07) * Math.PI; g.beginPath(); g.ellipse(50 + Math.cos(a) * (R0 + 3), 71.5 + Math.sin(a) * R0 * 0.78, 1, 1.5, a - Math.PI / 2, 0, 6.2832); g.fill(); }
  }
  if (A.neck) { g.strokeStyle = A.neck; g.lineWidth = 0.8; g.beginPath(); g.moveTo(41.5, 71); g.quadraticCurveTo(50, 85, 58.5, 71); g.stroke(); g.fillStyle = A.neck; g.beginPath(); g.moveTo(50, 77.5); g.lineTo(51.6, 80); g.lineTo(50, 82.5); g.lineTo(48.4, 80); g.closePath(); g.fill(); }
  if (A.torc) {
    const tc = A.torc;
    g.lineWidth = 2.8; g.strokeStyle = PORT.tone(tc, -0.3); g.beginPath(); g.moveTo(40, 70.5); g.quadraticCurveTo(40.4, 78.6, 46.6, 79.6); g.moveTo(60, 70.5); g.quadraticCurveTo(59.6, 78.6, 53.4, 79.6); g.stroke();
    g.lineWidth = 1.6; g.strokeStyle = tc; g.stroke();
    g.lineWidth = 0.5; g.strokeStyle = 'rgba(255,250,220,.7)'; g.beginPath(); g.moveTo(40.6, 71); g.quadraticCurveTo(41, 77.6, 46.4, 78.8); g.stroke();
    for (const x of [46.8, 53.2]) { g.fillStyle = tc; g.beginPath(); g.arc(x, 79.5, 1.9, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(60,40,10,.7)'; g.lineWidth = 0.5; g.stroke(); }
  }
};
/* ---------- 頭の後ろ（顔より先に描く。頭の中心が原点） ---------- */
PORT.back = (g, p, rw, rh) => {
  const A = p.at, hc = p.hairC;
  // 長い髪（ガリア）
  if (A.hair === 'long') {
    g.fillStyle = PORT.tone(hc, -0.15);
    g.beginPath(); g.moveTo(-rw * 0.95, -rh * 0.5);
    g.bezierCurveTo(-rw * 1.42, -rh * 0.1, -rw * 1.45, rh * 0.75, -rw * 1.32, rh * 1.18);
    const n = 8; for (let i = 0; i < n; i++) { const x1 = -rw * 1.32 + (rw * 2.64) * (i + 1) / n; g.quadraticCurveTo(x1 - rw * 0.17, rh * (1.42 - (i % 2) * 0.1), x1, rh * 1.18); }
    g.bezierCurveTo(rw * 1.45, rh * 0.75, rw * 1.42, -rh * 0.1, rw * 0.95, -rh * 0.5); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.7; g.beginPath(); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { g.moveTo(s * rw * (1.0 + i * 0.08), -rh * 0.2); g.quadraticCurveTo(s * rw * (1.25 + i * 0.05), rh * 0.5, s * rw * (1.05 + i * 0.07), rh * 1.25); } g.stroke();
  }
  // 女性の髷
  if (A.hair === 'fem') {
    g.fillStyle = PORT.tone(hc, -0.08); g.beginPath(); g.ellipse(0, -rh * 1.02, rw * 0.44, rh * 0.27, 0, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(255,240,220,.18)'; g.lineWidth = 0.7; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * rw * 0.12, -rh * 1.25); g.quadraticCurveTo(i * rw * 0.2, -rh * 1.02, i * rw * 0.12, -rh * 0.8); } g.stroke();
    g.fillStyle = PORT.tone(hc, -0.12); g.beginPath(); g.ellipse(0, rh * 0.25, rw * 1.08, rh * 0.5, 0, 0, 6.2832); g.fill();
  }
  // 王の帯の端（頭の後ろで結んで垂らす）
  if (A.head === 'diadem' || A.head === 'wreath' || A.band) {
    const bc = A.head === 'diadem' ? '#f3efe4' : A.head === 'wreath' ? '#c9a640' : A.band;
    for (const [dx, dy] of [[0, 0], [-0.16, 0.12]]) { g.beginPath(); g.moveTo(rw * (0.86 + dx), -rh * 0.2); g.bezierCurveTo(rw * (1.25 + dx), rh * 0.15, rw * (1.0 + dx), rh * 0.55, rw * (1.3 + dx), rh * (1.05 + dy)); g.lineWidth = 2.3; g.strokeStyle = bc; g.stroke(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(60,45,25,.45)'; g.stroke(); }
  }
  // ネメス頭巾の後ろと、胸に垂れる房
  if (A.head === 'nemes') {
    const B = '#2c4c8c', Au = '#d9b54a';
    const stripes = (fn) => { g.save(); fn(); g.clip(); g.strokeStyle = Au; g.lineWidth = 1.2; g.beginPath(); for (let y = -rh * 1.4; y < rh * 2; y += 2.7) { g.moveTo(-rw * 2, y); g.lineTo(rw * 2, y); } g.stroke(); g.restore(); };
    const flap = () => { g.beginPath(); g.moveTo(-rw * 1.0, -rh * 0.45); g.lineTo(-rw * 1.58, rh * 0.8); g.lineTo(rw * 1.58, rh * 0.8); g.lineTo(rw * 1.0, -rh * 0.45); g.closePath(); };
    g.fillStyle = PORT.tone(B, -0.15); flap(); g.fill(); stripes(flap);
    for (const s of [-1, 1]) { const L = () => { g.beginPath(); g.moveTo(s * rw * 1.04, rh * 0.1); g.lineTo(s * rw * 0.62, rh * 0.25); g.lineTo(s * rw * 0.66, rh * 1.72); g.quadraticCurveTo(s * rw * 0.84, rh * 1.8, s * rw * 1.02, rh * 1.72); g.closePath(); }; g.fillStyle = B; L(); g.fill(); stripes(L); L(); g.lineWidth = 0.7; g.strokeStyle = 'rgba(20,20,40,.6)'; g.stroke(); }
  }
};
/* ---------- 髪（顔のあと。兜の下は縁より下だけ） ---------- */
PORT.hairF = (g, p, rw, rh, head) => {
  const A = p.at, hc = p.hairC, H = A.hair;
  const dark = 'rgba(0,0,0,.28)', light = PORT.rgba(PORT.mix(hc, '#fff4e0', 0.35), 0.35);
  const rr = U.rng(PORT.hash(p.seed + 'h'));
  if (H === 'shaven') {
    g.save(); g.clip(head);
    g.fillStyle = 'rgba(45,45,58,.14)'; g.beginPath(); g.moveTo(-rw * 1.1, -rh * 0.05); g.lineTo(-rw * 0.86, -rh * 0.08); g.quadraticCurveTo(-rw * 0.84, -rh * 0.42, -rw * 0.6, -rh * 0.6); g.quadraticCurveTo(0, -rh * 0.68, rw * 0.6, -rh * 0.6); g.quadraticCurveTo(rw * 0.84, -rh * 0.42, rw * 0.86, -rh * 0.08); g.lineTo(rw * 1.1, -rh * 0.05); g.lineTo(rw * 1.1, -rh * 1.3); g.lineTo(-rw * 1.1, -rh * 1.3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,250,235,.22)'; g.beginPath(); g.ellipse(-rw * 0.3, -rh * 0.8, rw * 0.3, rh * 0.1, -0.3, 0, 6.2832); g.fill();
    g.restore(); return;
  }
  const helm = PORT.HELM[A.head], cap = { scarf: 1, pcap: 1, tiara: 1, nemes: 1, kausia: 1, petasos: 1 }[A.head];
  const clipY = helm ? -rh * (A.head === 'corinth' ? 0.7 : 0.6) : cap ? -rh * 0.62 : null;
  if (clipY != null) { g.save(); g.beginPath(); g.rect(-rw * 2, clipY, rw * 4, rh * 4); g.clip(); }
  const bald = clipY != null ? 0 : p.bald || 0;
  const hl = -rh * (0.6 + 0.3 * Math.min(bald, 0.6)), tmp = 0.84 - 0.14 * Math.min(bald, 0.6);
  // 髪の塊（外の輪郭 vol・頭頂 topY・もみあげの下 side・生え際の反り arch）
  const mass = (vol, topY, side, arch) => { g.beginPath(); g.moveTo(-rw * 0.97, side); g.bezierCurveTo(-rw * vol, -rh * 0.5, -rw * 0.92, topY, 0, topY); g.bezierCurveTo(rw * 0.92, topY, rw * vol, -rh * 0.5, rw * 0.97, side); g.lineTo(rw * 0.86, side - rh * 0.03); g.quadraticCurveTo(rw * tmp, -rh * 0.4, rw * 0.6, hl); g.quadraticCurveTo(0, hl - arch, -rw * 0.6, hl); g.quadraticCurveTo(-rw * tmp, -rh * 0.4, -rw * 0.86, side - rh * 0.03); g.closePath(); };
  const curl = (x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); };
  if (bald > 0.55 && (H === 'crop' || H === 'curly' || H === 'tight')) {
    // はげ頭：耳の上に残る髪と、頭頂の薄い髪
    if (bald < 0.85) { g.strokeStyle = PORT.rgba(hc, 0.45); g.lineWidth = 0.6; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * rw * 0.2 - rw * 0.25, -rh * 0.92); g.quadraticCurveTo(i * rw * 0.22, -rh * 1.0, i * rw * 0.2 + rw * 0.25, -rh * 0.9); } g.stroke(); }
    g.fillStyle = hc; g.beginPath();
    for (const s of [-1, 1]) { g.moveTo(s * rw * 0.8, -rh * 0.64); g.bezierCurveTo(s * rw * 1.03, -rh * 0.68, s * rw * 1.15, -rh * 0.42, s * rw * 1.06, -rh * 0.08); g.quadraticCurveTo(s * rw * 1.0, rh * 0.03, s * rw * 0.9, -rh * 0.02); g.quadraticCurveTo(s * rw * 0.86, -rh * 0.32, s * rw * 0.8, -rh * 0.64); g.closePath(); }
    g.fill();
    if (H !== 'crop') { g.beginPath(); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) curl(s * rw * (1.04 + (i % 2) * 0.04), -rh * (0.56 - i * 0.15), rw * 0.09); g.fill(); }
    g.strokeStyle = dark; g.lineWidth = 0.55; g.beginPath(); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.moveTo(s * rw * (0.86 + i * 0.06), -rh * (0.6 - i * 0.04)); g.quadraticCurveTo(s * rw * (1.0 + i * 0.03), -rh * 0.35, s * rw * (0.94 + i * 0.04), -rh * 0.06); } g.stroke();
    if (clipY != null) g.restore();
    return;
  }
  if (H === 'crop') {
    // ローマ風の短い髪（前に梳かした房）
    g.fillStyle = hc; mass(1.05, -rh * 1.05, -rh * 0.04, -rh * 0.02); g.fill();
    if (bald < 0.35) { g.beginPath(); for (let i = -4; i <= 4; i++) { const x = i * rw * 0.135 + (rr() - 0.5) * 1.2, y = hl + Math.abs(i) * rh * 0.008 + (rr() - 0.5) * 1.0, d = i < 0 ? -1 : 1; g.moveTo(x - 2.2, y - 1.8); g.quadraticCurveTo(x - 0.6 * d, y + 1.2, x + 0.8 * d, y + 2.2 + rr()); g.quadraticCurveTo(x + 0.4, y, x + 2.0, y - 1.8); g.closePath(); } g.fill(); }
    g.strokeStyle = dark; g.lineWidth = 0.55; g.beginPath(); for (let i = -4; i <= 4; i++) { const x = i * rw * 0.17; g.moveTo(x * 0.6, -rh * 1.0); g.quadraticCurveTo(x * 1.05, -rh * 0.84, x * 1.1 + (i < 0 ? -1 : 1), hl - 1.2); } g.stroke();
    g.strokeStyle = light; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-rw * 0.55, -rh * 0.9); g.quadraticCurveTo(-rw * 0.1, -rh * 1.01, rw * 0.32, -rh * 0.95); g.stroke();
  } else if (H === 'curly') {
    // 巻き毛（ギリシア・カルタゴ）
    const cr = rw * (p.cul === 'pun' ? 0.115 : 0.135);
    g.fillStyle = hc; mass(1.14, -rh * 1.1, rh * 0.04, rh * 0.06); g.fill();
    const pts = [];
    for (let i = 0; i <= 11; i++) { const a = Math.PI * (1.04 + i * 0.084) + (rr() - 0.5) * 0.05; pts.push([Math.cos(a) * rw * 1.04, Math.sin(a) * rh * 1.06 - rh * 0.02, cr * (0.85 + rr() * 0.3)]); }
    if (bald < 0.35) for (let i = -3; i <= 3; i++) pts.push([i * rw * 0.185 + (rr() - 0.5) * 1.2, hl + rh * 0.01 + Math.abs(i) * rh * 0.012 + (rr() - 0.5), cr * (0.7 + rr() * 0.25)]);
    for (const s of [-1, 1]) pts.push([s * rw * 0.93, -rh * 0.18, cr * 0.85], [s * rw * 0.96, rh * 0.0, cr * 0.72]);
    g.beginPath(); for (const [x, y, r] of pts) curl(x, y, r); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.55; g.beginPath(); for (const [x, y, r] of pts) { g.moveTo(x + r * Math.cos(0.4), y + r * Math.sin(0.4)); g.arc(x, y, r, 0.4, 2.6); } g.stroke();
    g.strokeStyle = light; g.lineWidth = 0.55; g.beginPath(); for (const [x, y, r] of pts) { g.moveTo(x + r * 0.5 * Math.cos(3.7), y + r * 0.5 * Math.sin(3.7)); g.arc(x, y, r * 0.5, 3.7, 5.7); } g.stroke();
    g.beginPath(); for (let i = -2; i <= 2; i++) { const x = i * rw * 0.32 + (rr() - 0.5) * 2, y = -rh * 0.86 + Math.abs(i) * rh * 0.06; g.moveTo(x + cr * 0.45 * Math.cos(3.4), y + cr * 0.45 * Math.sin(3.4)); g.arc(x, y, cr * 0.45, 3.4, 6.6); } g.stroke();
  } else if (H === 'tight') {
    // 細かく縮れた髪と編んだ房（ヌミディア）
    const M = () => mass(1.08, -rh * 1.09, -rh * 0.04, -rh * 0.02);
    g.fillStyle = hc; M(); g.fill();
    g.beginPath(); for (let i = 0; i <= 15; i++) { const a = Math.PI * (1.03 + i * 0.0627); curl(Math.cos(a) * rw * 1.02, Math.sin(a) * rh * 1.06 - rh * 0.02, 1.6 + rr() * 0.5); } g.fill();
    const pt = PORT.pat(g, 'tight', rr() * 13, rr() * 13); if (pt) { g.fillStyle = pt; M(); g.fill(); }
    if (A.braid) for (const s of [-1, 1]) for (let b = 0; b < 2; b++) { const x0 = s * rw * (0.95 - b * 0.09); for (let y = -rh * 0.25; y < rh * 0.42; y += 2.1) { g.fillStyle = hc; g.beginPath(); g.ellipse(x0 + s * Math.sin(y * 0.3) * 0.3, y, 1.25, 1.35, 0, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(255,245,230,.2)'; g.lineWidth = 0.4; g.stroke(); } g.fillStyle = '#c9a14a'; g.beginPath(); g.arc(x0, rh * 0.45, 1.0, 0, 6.2832); g.fill(); }
  } else if (H === 'long') {
    // 長い髪（ガリア）：まん中で分け、耳を覆う。若い戦士は石灰で固めて逆立てる
    const P = () => { g.beginPath(); g.moveTo(0, hl - 0.5); g.quadraticCurveTo(-rw * 0.62, hl - rh * 0.02, -rw * 0.84, -rh * 0.3); g.quadraticCurveTo(-rw * 0.95, rh * 0.05, -rw * 0.9, rh * 0.42); g.quadraticCurveTo(-rw * 1.06, rh * 0.52, -rw * 1.22, rh * 0.48); g.bezierCurveTo(-rw * 1.32, -rh * 0.3, -rw * 1.0, -rh * 1.15, 0, -rh * 1.15); g.bezierCurveTo(rw * 1.0, -rh * 1.15, rw * 1.32, -rh * 0.3, rw * 1.22, rh * 0.48); g.quadraticCurveTo(rw * 1.06, rh * 0.52, rw * 0.9, rh * 0.42); g.quadraticCurveTo(rw * 0.95, rh * 0.05, rw * 0.84, -rh * 0.3); g.quadraticCurveTo(rw * 0.62, hl - rh * 0.02, 0, hl - 0.5); g.closePath(); };
    g.fillStyle = hc; P(); g.fill();
    if (A.spiky) {
      const lc = PORT.mix(hc, '#f2ead2', 0.5);
      for (let i = -3; i <= 3; i++) {
        const x = i * rw * 0.27, y = -rh * (1.02 - Math.abs(i) * 0.07), tx = x * 1.35 + (i % 2 ? 1.6 : -1.2), ty = y - rh * (0.34 - Math.abs(i) * 0.04);
        const gr = g.createLinearGradient(x, y + 2, tx, ty); gr.addColorStop(0, hc); gr.addColorStop(1, lc);
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3.6, y + 3.5); g.quadraticCurveTo(x - 1.2, y - 2, tx, ty); g.quadraticCurveTo(x + 1.8, y - 1, x + 3.6, y + 3.5); g.closePath(); g.fill();
      }
    }
    g.strokeStyle = dark; g.lineWidth = 0.65; g.beginPath(); for (const s of [-1, 1]) for (let i = 1; i <= 4; i++) { g.moveTo(s * rw * 0.06, hl - rh * 0.02 - i * 0.4); g.quadraticCurveTo(s * rw * (0.5 + i * 0.12), -rh * (0.95 - i * 0.04), s * rw * (0.95 + i * 0.06), rh * 0.4); } g.stroke();
    g.strokeStyle = light; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-rw * 0.15, -rh * 1.05); g.quadraticCurveTo(-rw * 0.75, -rh * 0.95, -rw * 1.05, -rh * 0.3); g.stroke();
  } else if (H === 'wig') {
    // エジプトの短いかつら
    const W = () => { g.beginPath(); g.moveTo(-rw * 0.84, -rh * 0.54); g.lineTo(rw * 0.84, -rh * 0.54); g.quadraticCurveTo(rw * 0.95, -rh * 0.3, rw * 0.93, rh * 0.38); g.lineTo(rw * 1.24, rh * 0.42); g.bezierCurveTo(rw * 1.34, -rh * 0.5, rw * 1.0, -rh * 1.18, 0, -rh * 1.18); g.bezierCurveTo(-rw * 1.0, -rh * 1.18, -rw * 1.34, -rh * 0.5, -rw * 1.24, rh * 0.42); g.lineTo(-rw * 0.93, rh * 0.38); g.quadraticCurveTo(-rw * 0.95, -rh * 0.3, -rw * 0.84, -rh * 0.54); g.closePath(); };
    g.fillStyle = '#141110'; W(); g.fill();
    g.save(); W(); g.clip(); g.strokeStyle = 'rgba(255,245,230,.13)'; g.lineWidth = 0.6; g.beginPath(); for (let y = -rh * 1.2; y < rh * 0.5; y += 2.2) { g.moveTo(-rw * 1.4, y); g.quadraticCurveTo(0, y - rh * 0.12, rw * 1.4, y); } g.stroke(); g.restore();
  } else if (H === 'fem') {
    // 女性：まん中で分けた波打つ髪（後ろで髷）
    const F = () => { g.beginPath(); g.moveTo(0, hl - 0.5); g.quadraticCurveTo(-rw * 0.7, hl - rh * 0.02, -rw * 0.86, -rh * 0.28); g.quadraticCurveTo(-rw * 0.98, rh * 0.02, -rw * 0.94, rh * 0.3); g.lineTo(-rw * 1.12, rh * 0.32); g.bezierCurveTo(-rw * 1.24, -rh * 0.4, -rw * 0.98, -rh * 1.12, 0, -rh * 1.12); g.bezierCurveTo(rw * 0.98, -rh * 1.12, rw * 1.24, -rh * 0.4, rw * 1.12, rh * 0.32); g.lineTo(rw * 0.94, rh * 0.3); g.quadraticCurveTo(rw * 0.98, rh * 0.02, rw * 0.86, -rh * 0.28); g.quadraticCurveTo(rw * 0.7, hl - rh * 0.02, 0, hl - 0.5); g.closePath(); };
    g.fillStyle = hc; F(); g.fill();
    g.strokeStyle = dark; g.lineWidth = 0.7; g.beginPath(); for (const s of [-1, 1]) for (let i = 1; i <= 4; i++) { const y0 = hl - i * rh * 0.1; g.moveTo(s * rw * 0.05, y0); g.bezierCurveTo(s * rw * 0.4, y0 - rh * 0.06, s * rw * 0.7, y0 + rh * 0.08, s * rw * (1.0 + i * 0.03), y0 + rh * (0.3 + i * 0.05)); } g.stroke();
    g.strokeStyle = light; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-rw * 0.2, -rh * 1.02); g.quadraticCurveTo(-rw * 0.7, -rh * 0.95, -rw * 0.95, -rh * 0.5); g.stroke();
    g.fillStyle = hc; g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * rw * 0.78, -rh * 0.3); g.arc(s * rw * 0.8, -rh * 0.22, 1.6, -1.5, 3); } g.fill();
  }
  if (clipY != null) g.restore();
};
/* ---------- 被り物（兜・冠・帽子・頭巾） ---------- */
PORT.headwear = (g, p, rw, rh) => {
  const A = p.at, H = A.head, C = PORT.C;
  if (H === 'bare') { if (A.band) PORT.band(g, rw, rh, A.band, 2.2); return; }
  const MET = PORT.METAL[A.metal] || PORT.METAL.bronze;
  // 金属と布の陰（グラデーションは一度だけ作って使い回す）
  let HG = null, SG = null;
  const mfill = (fn, M = MET) => { g.fillStyle = M[1]; fn(); g.fill(); if (!HG) { HG = g.createLinearGradient(-rw * 1.2, 0, rw * 1.2, 0); HG.addColorStop(0, 'rgba(0,0,0,.42)'); HG.addColorStop(0.3, 'rgba(255,250,230,.3)'); HG.addColorStop(0.46, 'rgba(255,250,230,.06)'); HG.addColorStop(1, 'rgba(0,0,0,.45)'); } g.fillStyle = HG; g.fill(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(30,18,6,.72)'; g.stroke(); };
  const softFill = (fn, col) => { g.fillStyle = col; fn(); g.fill(); if (!SG) { SG = g.createLinearGradient(-rw * 1.2, 0, rw * 1.2, 0); SG.addColorStop(0, 'rgba(0,0,0,.32)'); SG.addColorStop(0.35, 'rgba(255,250,235,.14)'); SG.addColorStop(0.55, 'rgba(255,250,235,0)'); SG.addColorStop(1, 'rgba(0,0,0,.34)'); } g.fillStyle = SG; g.fill(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(29,21,12,.6)'; g.stroke(); };
  const bowl = (rimY, tY, w) => () => { g.beginPath(); g.moveTo(-rw * w, rimY); g.bezierCurveTo(-rw * (w + 0.06), rimY + (tY - rimY) * 0.72, -rw * 0.62, tY, 0, tY); g.bezierCurveTo(rw * 0.62, tY, rw * (w + 0.06), rimY + (tY - rimY) * 0.72, rw * w, rimY); g.quadraticCurveTo(0, rimY - rh * 0.14, -rw * w, rimY); g.closePath(); };
  const rim = (rimY, w, lw = 2.2, cable = true) => { const P = () => { g.beginPath(); g.moveTo(-rw * w, rimY - 0.5); g.quadraticCurveTo(0, rimY - rh * 0.14 - 0.5, rw * w, rimY - 0.5); }; P(); g.lineWidth = lw; g.strokeStyle = MET[0]; g.stroke(); if (cable) { g.setLineDash([0.9, 1.1]); g.lineWidth = 0.8; g.strokeStyle = 'rgba(60,38,10,.6)'; P(); g.stroke(); g.setLineDash([]); } };
  const feather = (x, y, ang, len, col) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-2.8, -len * 0.3, -2.3, -len * 0.82, 0, -len); g.bezierCurveTo(2.3, -len * 0.82, 2.8, -len * 0.3, 0, 0); g.fill(); g.lineWidth = 0.4; g.strokeStyle = 'rgba(0,0,0,.3)'; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -len * 0.95); g.stroke(); g.restore(); };
  const crestL = (y0, h, w, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(-1.8, y0 + 1); g.bezierCurveTo(-w, y0 - h * 0.35, -w * 1.15, y0 - h * 0.86, 0, y0 - h); g.bezierCurveTo(w * 1.15, y0 - h * 0.86, w, y0 - h * 0.35, 1.8, y0 + 1); g.closePath(); g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(); g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 0.5, y0); g.quadraticCurveTo(i * w * 0.42, y0 - h * 0.5, i * w * 0.3, y0 - h * 0.92); } g.stroke(); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-w * 0.35, y0 - h * 0.2); g.quadraticCurveTo(-w * 0.62, y0 - h * 0.6, -w * 0.2, y0 - h * 0.9); g.stroke(); };
  const crestTr = (y0, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(-w, y0); g.bezierCurveTo(-w * 1.04, y0 - h * 1.2, w * 1.04, y0 - h * 1.2, w, y0); g.quadraticCurveTo(0, y0 - h * 0.3, -w, y0); g.closePath(); g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(); g.beginPath(); for (let i = -6; i <= 6; i++) { g.moveTo(i * w * 0.07, y0 - h * 0.3); g.lineTo(i * w * 0.15, y0 - h * 0.86 + Math.abs(i) * h * 0.03); } g.stroke(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-w * 0.75, y0 - h * 0.35); g.quadraticCurveTo(-w * 0.5, y0 - h * 0.85, 0, y0 - h * 0.88); g.stroke(); };
  const tuft = (y0, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(-1.6, y0 + 1); g.quadraticCurveTo(-5, y0 - 4, -2.4, y0 - 8.5); g.quadraticCurveTo(-0.4, y0 - 5, 0.8, y0 - 9.5); g.quadraticCurveTo(2.6, y0 - 5, 5, y0 - 6.8); g.quadraticCurveTo(4.2, y0 - 2, 1.6, y0 + 1); g.closePath(); g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(); };
  const crest = (y0) => {
    const T = A.crestT, c1 = A.crest || C.scarlet;
    if (T === 'feath') { feather(-2.4, y0 + 1.5, -0.3, rh * 0.62, c1); feather(2.4, y0 + 1.5, 0.3, rh * 0.62, c1); feather(0, y0, 0, rh * 0.72, A.crest2 || c1); }
    else if (T === 'crest') crestL(y0, rh * 0.6, 5.8, c1);
    else if (T === 'trans') crestTr(y0 + 2.5, rw * 1.08, rh * 0.48, c1);
    else if (T === 'tuft') tuft(y0, c1);
  };
  const plumes = (y0) => { if (A.plume) { feather(-rw * 0.78, y0, -0.42, rh * 0.62, A.plume); feather(rw * 0.78, y0, 0.42, rh * 0.62, A.plume); } };
  // 頬当て（m: 三つの膨らみ＝モンテフォルティーノ、a: 細身＝アッティカ、p: 尖る＝トラキア）
  const cheeks = (kind) => {
    for (const s of [-1, 1]) {
      const P = () => {
        g.beginPath(); g.moveTo(s * rw * 1.07, -rh * 0.52);
        if (kind === 'p') { g.bezierCurveTo(s * rw * 1.16, -rh * 0.05, s * rw * 1.04, rh * 0.42, s * rw * 0.74, rh * 0.62); g.bezierCurveTo(s * rw * 0.66, rh * 0.36, s * rw * 0.68, rh * 0.12, s * rw * 0.8, -rh * 0.04); g.bezierCurveTo(s * rw * 0.76, -rh * 0.24, s * rw * 0.84, -rh * 0.42, s * rw * 0.84, -rh * 0.52); }
        else if (kind === 'a') { g.bezierCurveTo(s * rw * 1.12, -rh * 0.1, s * rw * 1.05, rh * 0.28, s * rw * 0.88, rh * 0.4); g.bezierCurveTo(s * rw * 0.76, rh * 0.3, s * rw * 0.74, rh * 0.1, s * rw * 0.82, -rh * 0.06); g.bezierCurveTo(s * rw * 0.8, -rh * 0.26, s * rw * 0.84, -rh * 0.42, s * rw * 0.85, -rh * 0.52); }
        else { g.bezierCurveTo(s * rw * 1.13, -rh * 0.1, s * rw * 1.06, rh * 0.3, s * rw * 0.86, rh * 0.44); g.bezierCurveTo(s * rw * 0.68, rh * 0.48, s * rw * 0.6, rh * 0.28, s * rw * 0.67, rh * 0.15); g.bezierCurveTo(s * rw * 0.73, rh * 0.05, s * rw * 0.84, 0, s * rw * 0.81, -rh * 0.12); g.bezierCurveTo(s * rw * 0.78, -rh * 0.3, s * rw * 0.84, -rh * 0.42, s * rw * 0.85, -rh * 0.52); }
        g.closePath();
      };
      mfill(P);
      if (kind === 'm') { g.strokeStyle = 'rgba(60,38,10,.5)'; g.lineWidth = 0.6; for (const [x, y] of [[0.95, -0.28], [0.93, 0.02], [0.82, 0.3]]) { g.beginPath(); g.arc(s * rw * x, rh * y, 1.6, 0, 6.2832); g.stroke(); } }
      else if (kind === 'p') { g.strokeStyle = 'rgba(60,38,10,.5)'; g.lineWidth = 0.6; g.beginPath(); for (let i = 0; i < 3; i++) { const y = rh * (0.12 + i * 0.14); g.moveTo(s * rw * 0.82, y); g.arc(s * rw * 0.88, y, 1.2, 3.1, 6); } g.stroke(); }
    }
    g.strokeStyle = '#4a3020'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-rw * 0.8, rh * 0.42); g.quadraticCurveTo(0, rh * 1.16, rw * 0.8, rh * 0.42); g.stroke();
  };
  if (H === 'montef') {
    // モンテフォルティーノ型（頂に突起、首の覆い、三つ玉の頬当て）
    const rimY = -rh * 0.5, tY = -rh * 1.28, B = bowl(rimY, tY, 1.08);
    g.fillStyle = MET[2]; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * rw * 0.98, rimY - 3.5); g.lineTo(s * rw * 1.25, rimY + 1.2); g.lineTo(s * rw * 1.0, rimY + 1.2); g.closePath(); g.fill(); }
    mfill(B); rim(rimY, 1.07, 2.4);
    g.fillStyle = MET[1]; g.fillRect(-1.2, tY - 3.2, 2.4, 3.6); g.beginPath(); g.ellipse(0, tY - 4.6, 2.3, 2.0, 0, 0, 6.2832); g.fill(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(30,18,6,.7)'; g.stroke();
    if (A.head === 'montef' && A.plume) plumes(-rh * 1.02);
    cheeks('m'); crest(tY - 5.5);
  } else if (H === 'attic') {
    // アッティカ型（額の飾り板、細い頬当て、高い前立て）
    const rimY = -rh * 0.52, tY = -rh * 1.25, B = bowl(rimY, tY, 1.07);
    mfill(B);
    const F = () => { g.beginPath(); g.moveTo(-rw * 1.0, rimY + 0.4); g.quadraticCurveTo(-rw * 0.45, rimY - rh * 0.12, 0, rimY - rh * 0.38); g.quadraticCurveTo(rw * 0.45, rimY - rh * 0.12, rw * 1.0, rimY + 0.4); g.quadraticCurveTo(0, rimY - rh * 0.1, -rw * 1.0, rimY + 0.4); g.closePath(); };
    g.fillStyle = MET[0]; F(); g.fill(); g.strokeStyle = 'rgba(30,18,6,.65)'; g.lineWidth = 0.7; F(); g.stroke();
    g.strokeStyle = 'rgba(70,45,12,.65)'; g.lineWidth = 0.6; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * rw * 0.42, rimY - rh * 0.13, 1.7, 0, 5.4); g.stroke(); }
    plumes(-rh * 1.0);
    g.fillStyle = MET[2]; g.fillRect(-1.6, tY - 3.2, 3.2, 3.8);
    cheeks('a'); crest(tY - 2.6);
  } else if (H === 'phryg') {
    // トラキア・フリュギア型（前に曲がる頂、ひさし、尖った頬当て）
    const rimY = -rh * 0.5, tY = -rh * 1.36, B = bowl(rimY, tY, 1.08);
    mfill(B);
    g.fillStyle = MET[0]; g.beginPath(); g.ellipse(rw * 0.08, -rh * 1.18, rw * 0.52, rh * 0.22, -0.12, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(40,24,6,.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(rw * 0.08, -rh * 1.18, rw * 0.52, rh * 0.22, -0.12, 0.25, 2.9); g.stroke();
    const V = () => { g.beginPath(); g.moveTo(-rw * 1.0, rimY - 0.4); g.quadraticCurveTo(0, rimY - rh * 0.14 + 2.8, rw * 1.0, rimY - 0.4); g.lineTo(rw * 1.0, rimY - 2.4); g.quadraticCurveTo(0, rimY - rh * 0.14 - 0.4, -rw * 1.0, rimY - 2.4); g.closePath(); };
    g.fillStyle = MET[0]; V(); g.fill(); g.strokeStyle = 'rgba(30,18,6,.6)'; g.lineWidth = 0.6; V(); g.stroke();
    plumes(-rh * 1.02);
    cheeks('p'); crest(-rh * 1.38);
  } else if (H === 'boeot') {
    // ボイオティア型（騎兵の将。広く垂れたつば）
    const Br = () => { g.beginPath(); g.moveTo(-rw * 0.95, -rh * 0.78); g.quadraticCurveTo(-rw * 1.36, -rh * 0.68, -rw * 1.56, -rh * 0.22); g.quadraticCurveTo(-rw * 1.3, -rh * 0.3, -rw * 1.12, -rh * 0.25); g.quadraticCurveTo(-rw * 0.92, -rh * 0.5, -rw * 0.6, -rh * 0.52); g.quadraticCurveTo(-rw * 0.25, -rh * 0.68, 0, -rh * 0.6); g.quadraticCurveTo(rw * 0.25, -rh * 0.68, rw * 0.6, -rh * 0.52); g.quadraticCurveTo(rw * 0.92, -rh * 0.5, rw * 1.12, -rh * 0.25); g.quadraticCurveTo(rw * 1.3, -rh * 0.3, rw * 1.56, -rh * 0.22); g.quadraticCurveTo(rw * 1.36, -rh * 0.68, rw * 0.95, -rh * 0.78); g.closePath(); };
    mfill(Br);
    g.strokeStyle = 'rgba(40,24,6,.5)'; g.lineWidth = 0.7; g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * rw * 0.95, -rh * 0.72); g.quadraticCurveTo(s * rw * 1.12, -rh * 0.5, s * rw * 1.12, -rh * 0.27); g.moveTo(s * rw * 0.7, -rh * 0.74); g.quadraticCurveTo(s * rw * 0.66, -rh * 0.6, s * rw * 0.6, -rh * 0.53); } g.stroke();
    const Cr = () => { g.beginPath(); g.moveTo(-rw * 0.95, -rh * 0.76); g.bezierCurveTo(-rw * 1.0, -rh * 1.2, -rw * 0.55, -rh * 1.36, 0, -rh * 1.36); g.bezierCurveTo(rw * 0.55, -rh * 1.36, rw * 1.0, -rh * 1.2, rw * 0.95, -rh * 0.76); g.quadraticCurveTo(0, -rh * 0.9, -rw * 0.95, -rh * 0.76); g.closePath(); };
    mfill(Cr);
    if (A.wreath) PORT.leaves(g, rw * 0.95, rh, -rh * 0.8, -rh * 0.95, A.wreath, 5);
    crest(-rh * 1.36);
  } else if (H === 'pilos' || H === 'conic') {
    // ピロス（円錐の兜）。カルタゴの円錐兜は飾り帯とタニトの印
    const rimY = -rh * 0.52, tY = -rh * (H === 'conic' ? 1.62 : 1.68);
    const P = () => { g.beginPath(); g.moveTo(-rw * 1.05, rimY); g.bezierCurveTo(-rw * 1.02, -rh * 1.0, -rw * 0.42, tY + rh * 0.08, 0, tY); g.bezierCurveTo(rw * 0.42, tY + rh * 0.08, rw * 1.02, -rh * 1.0, rw * 1.05, rimY); g.quadraticCurveTo(0, rimY - rh * 0.14, -rw * 1.05, rimY); g.closePath(); };
    mfill(P, H === 'pilos' && p.tier <= 1 ? PORT.METAL.iron : MET);
    rim(rimY, 1.1, 2.6, false);
    if (H === 'conic') {
      g.beginPath(); g.moveTo(-rw * 1.0, rimY - 3); g.quadraticCurveTo(0, rimY - rh * 0.14 - 3, rw * 1.0, rimY - 3); g.lineWidth = 2.4; g.strokeStyle = C.gold; g.stroke(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(60,38,10,.6)'; g.stroke();
      if (A.tanit) PORT.tanit(g, 0, -rh * 0.98, 1.15, C.gold);
    }
    crest(tY);
  } else if (H === 'corinth') {
    // コリントス型（額の上に押し上げて被る。目の穴が見える）
    const Bd = () => { g.beginPath(); g.moveTo(-rw * 1.12, -rh * 0.47); g.bezierCurveTo(-rw * 1.2, -rh * 1.0, -rw * 0.7, -rh * 1.42, 0, -rh * 1.42); g.bezierCurveTo(rw * 0.7, -rh * 1.42, rw * 1.2, -rh * 1.0, rw * 1.12, -rh * 0.47); g.quadraticCurveTo(rw * 0.9, -rh * 0.57, rw * 0.62, -rh * 0.61); g.quadraticCurveTo(rw * 0.3, -rh * 0.67, rw * 0.12, -rh * 0.67); g.lineTo(rw * 0.09, -rh * 0.57); g.lineTo(-rw * 0.09, -rh * 0.57); g.lineTo(-rw * 0.12, -rh * 0.67); g.quadraticCurveTo(-rw * 0.3, -rh * 0.67, -rw * 0.62, -rh * 0.61); g.quadraticCurveTo(-rw * 0.9, -rh * 0.57, -rw * 1.12, -rh * 0.47); g.closePath(); };
    mfill(Bd);
    g.fillStyle = 'rgba(22,12,5,.88)'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * rw * 0.14, -rh * 0.74); g.quadraticCurveTo(s * rw * 0.36, -rh * 0.92, s * rw * 0.68, -rh * 0.78); g.quadraticCurveTo(s * rw * 0.4, -rh * 0.71, s * rw * 0.14, -rh * 0.74); g.fill(); }
    g.strokeStyle = 'rgba(255,245,210,.35)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-rw * 0.7, -rh * 0.88); g.quadraticCurveTo(0, -rh * 1.02, rw * 0.7, -rh * 0.88); g.stroke();
    plumes(-rh * 1.12); crest(-rh * 1.42);
  } else if (H === 'horned') {
    // ガリアの族長の角つき兜
    for (const s of [-1, 1]) { const Hn = () => { g.beginPath(); g.moveTo(s * rw * 0.5, -rh * 0.98); g.quadraticCurveTo(s * rw * 1.32, -rh * 1.0, s * rw * 1.5, -rh * 1.74); g.quadraticCurveTo(s * rw * 1.16, -rh * 1.24, s * rw * 0.56, -rh * 1.22); g.closePath(); }; mfill(Hn); g.fillStyle = MET[0]; g.beginPath(); g.arc(s * rw * 1.5, -rh * 1.74, 1.4, 0, 6.2832); g.fill(); }
    const B = bowl(-rh * 0.5, -rh * 1.22, 1.06); mfill(B); rim(-rh * 0.5, 1.06, 2.2, false);
    g.strokeStyle = 'rgba(60,38,10,.6)'; g.lineWidth = 0.6; g.beginPath(); for (let i = -3; i <= 3; i++) { const x = i * rw * 0.26, y = -rh * 0.72 + Math.abs(i) * rh * 0.03; g.moveTo(x + 1.6, y); g.arc(x, y, 1.6, 0, 4.6); } g.stroke();
    g.fillStyle = '#b8402e'; g.beginPath(); g.arc(0, -rh * 1.0, 1.6, 0, 6.2832); g.fill();
  } else if (H === 'sinew') {
    // イベリアの黒い筋の帽子（耳覆いと小さな前立て）
    const B = bowl(-rh * 0.5, -rh * 1.2, 1.07), hcol = A.hatC || '#2a221d';
    for (const s of [-1, 1]) { g.fillStyle = hcol; g.beginPath(); g.moveTo(s * rw * 1.07, -rh * 0.52); g.quadraticCurveTo(s * rw * 1.12, -rh * 0.05, s * rw * 0.95, rh * 0.12); g.lineTo(s * rw * 0.83, rh * 0.08); g.quadraticCurveTo(s * rw * 0.84, -rh * 0.3, s * rw * 0.86, -rh * 0.52); g.closePath(); g.fill(); }
    softFill(B, hcol);
    g.save(); B(); g.clip(); g.strokeStyle = 'rgba(200,180,150,.22)'; g.lineWidth = 0.5; g.beginPath(); for (let i = -6; i <= 6; i++) { g.moveTo(i * rw * 0.18 - rw * 0.4, -rh * 0.4); g.lineTo(i * rw * 0.18 + rw * 0.4, -rh * 1.3); g.moveTo(i * rw * 0.18 + rw * 0.4, -rh * 0.4); g.lineTo(i * rw * 0.18 - rw * 0.4, -rh * 1.3); } g.stroke(); g.restore();
    if (A.crestT) crestL(-rh * 1.18, rh * 0.42, 3.4, A.crest || C.crimson);
  } else if (H === 'kausia') {
    // マケドニアの平たいフェルト帽
    const kc = A.hatC || '#d8ccb0';
    const Bd = () => { g.beginPath(); g.moveTo(-rw * 1.0, -rh * 0.5); g.quadraticCurveTo(0, -rh * 0.66, rw * 1.0, -rh * 0.5); g.lineTo(rw * 1.02, -rh * 0.66); g.quadraticCurveTo(0, -rh * 0.82, -rw * 1.02, -rh * 0.66); g.closePath(); };
    softFill(Bd, PORT.tone(kc, -0.2));
    // ふくらんだ平たい本体（ベレー帽のように縁が垂れる）
    const Dk = () => { g.beginPath(); g.moveTo(-rw * 1.32, -rh * 0.76); g.bezierCurveTo(-rw * 1.48, -rh * 0.98, -rw * 1.02, -rh * 1.22, 0, -rh * 1.22); g.bezierCurveTo(rw * 1.02, -rh * 1.22, rw * 1.48, -rh * 0.98, rw * 1.32, -rh * 0.76); g.quadraticCurveTo(rw * 1.12, -rh * 0.6, rw * 0.6, -rh * 0.68); g.quadraticCurveTo(0, -rh * 0.75, -rw * 0.6, -rh * 0.68); g.quadraticCurveTo(-rw * 1.12, -rh * 0.6, -rw * 1.32, -rh * 0.76); g.closePath(); };
    softFill(Dk, kc);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-rw * 1.26, -rh * 0.73); g.quadraticCurveTo(-rw * 1.06, -rh * 0.63, -rw * 0.6, -rh * 0.7); g.quadraticCurveTo(0, -rh * 0.77, rw * 0.6, -rh * 0.7); g.quadraticCurveTo(rw * 1.06, -rh * 0.63, rw * 1.26, -rh * 0.73); g.stroke();
    g.strokeStyle = 'rgba(255,250,235,.32)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-rw * 0.95, -rh * 1.04); g.quadraticCurveTo(-rw * 0.35, -rh * 1.18, rw * 0.2, -rh * 1.16); g.stroke();
  } else if (H === 'petasos') {
    // つば広の旅の帽子
    const pc = A.hatC || '#b59a62';
    g.fillStyle = PORT.tone(pc, -0.25); g.beginPath(); g.ellipse(0, -rh * 0.72, rw * 1.72, rh * 0.2, 0, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(29,21,12,.55)'; g.lineWidth = 0.7; g.stroke();
    const Cw = () => { g.beginPath(); g.moveTo(-rw * 0.8, -rh * 0.76); g.bezierCurveTo(-rw * 0.84, -rh * 1.28, rw * 0.84, -rh * 1.28, rw * 0.8, -rh * 0.76); g.quadraticCurveTo(0, -rh * 0.84, -rw * 0.8, -rh * 0.76); g.closePath(); };
    softFill(Cw, pc);
    g.beginPath(); g.moveTo(-rw * 0.8, -rh * 0.8); g.quadraticCurveTo(0, -rh * 0.9, rw * 0.8, -rh * 0.8); g.lineWidth = 1.6; g.strokeStyle = PORT.tone(pc, -0.45); g.stroke();
    g.beginPath(); g.ellipse(0, -rh * 0.72, rw * 1.72, rh * 0.2, 0, 0.05, Math.PI - 0.05); g.lineWidth = 1.1; g.strokeStyle = PORT.rgba(PORT.tone(pc, 0.25), 0.8); g.stroke();
  } else if (H === 'diadem') {
    // 王の白い帯（ディアデマ）
    PORT.band(g, rw, rh, '#f3efe4', 3.0);
  } else if (H === 'wreath') {
    // 月桂・オリーブ・ミルテの冠
    PORT.leaves(g, rw * 1.06, rh, -rh * 0.38, -rh * 0.8, A.wreath || '#5d7a35', 7);
  } else if (H === 'nemes') {
    // ファラオのネメス頭巾（青と金の縞、額の蛇）
    const B = '#2c4c8c', Au = '#d9b54a';
    const N = () => { g.beginPath(); g.moveTo(-rw * 0.88, -rh * 0.52); g.bezierCurveTo(-rw * 1.08, -rh * 1.04, -rw * 0.55, -rh * 1.24, 0, -rh * 1.24); g.bezierCurveTo(rw * 0.55, -rh * 1.24, rw * 1.08, -rh * 1.04, rw * 0.88, -rh * 0.52); g.lineTo(rw * 1.18, -rh * 0.56); g.lineTo(rw * 1.52, rh * 0.3); g.lineTo(rw * 1.0, rh * 0.3); g.lineTo(rw * 0.9, -rh * 0.1); g.lineTo(rw * 0.86, -rh * 0.52); g.lineTo(-rw * 0.86, -rh * 0.52); g.lineTo(-rw * 0.9, -rh * 0.1); g.lineTo(-rw * 1.0, rh * 0.3); g.lineTo(-rw * 1.52, rh * 0.3); g.lineTo(-rw * 1.18, -rh * 0.56); g.closePath(); };
    g.fillStyle = B; N(); g.fill();
    g.save(); N(); g.clip(); g.strokeStyle = Au; g.lineWidth = 1.25; g.beginPath(); for (let y = -rh * 1.3; y < rh * 0.4; y += 2.7) { g.moveTo(-rw * 2, y); g.quadraticCurveTo(0, y - rh * 0.1, rw * 2, y); } g.stroke(); g.restore();
    g.lineWidth = 0.7; g.strokeStyle = 'rgba(20,20,40,.7)'; N(); g.stroke();
    g.beginPath(); g.moveTo(-rw * 0.9, -rh * 0.5); g.quadraticCurveTo(0, -rh * 0.66, rw * 0.9, -rh * 0.5); g.lineWidth = 2.6; g.strokeStyle = Au; g.stroke(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(80,50,10,.7)'; g.stroke();
    g.strokeStyle = Au; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -rh * 0.56); g.quadraticCurveTo(-2.2, -rh * 0.66, 0, -rh * 0.75); g.quadraticCurveTo(1.8, -rh * 0.8, 0.4, -rh * 0.86); g.stroke();
    g.fillStyle = Au; g.beginPath(); g.ellipse(0.4, -rh * 0.88, 1.5, 1.9, 0, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(80,50,10,.8)'; g.lineWidth = 0.4; g.stroke();
  } else if (H === 'pcap') {
    // カルタゴの円い帽子（高さ capH）
    const ch = A.capH || 1, tY = -rh * (1.0 + 0.66 * ch);
    const P = () => { g.beginPath(); g.moveTo(-rw * 1.0, -rh * 0.52); g.bezierCurveTo(-rw * 1.04, -rh * 0.95, -rw * (0.5 + 0.3 * (1 - ch)), tY + rh * 0.1, -rw * 0.14, tY + rh * 0.02); g.quadraticCurveTo(0, tY - rh * 0.03, rw * 0.14, tY + rh * 0.02); g.bezierCurveTo(rw * (0.5 + 0.3 * (1 - ch)), tY + rh * 0.1, rw * 1.04, -rh * 0.95, rw * 1.0, -rh * 0.52); g.quadraticCurveTo(0, -rh * 0.68, -rw * 1.0, -rh * 0.52); g.closePath(); };
    softFill(P, A.hatC || '#ece6d8');
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(rw * 0.35, -rh * 0.64); g.quadraticCurveTo(rw * 0.42, (tY - rh * 0.6) / 2, rw * 0.1, tY + 1.5); g.stroke();
    if (A.capBand) { g.beginPath(); g.moveTo(-rw * 1.01, -rh * 0.58); g.quadraticCurveTo(0, -rh * 0.74, rw * 1.01, -rh * 0.58); g.lineWidth = 2.8; g.strokeStyle = A.capBand; g.stroke(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(80,50,10,.6)'; g.stroke(); }
  } else if (H === 'scarf') {
    // 賊の頭巾（横で結んで垂らす）
    const sc = A.hatC || '#8a2e22';
    const Sf = () => { g.beginPath(); g.moveTo(-rw * 1.07, -rh * 0.32); g.bezierCurveTo(-rw * 1.16, -rh * 0.98, -rw * 0.62, -rh * 1.22, 0, -rh * 1.2); g.bezierCurveTo(rw * 0.62, -rh * 1.22, rw * 1.16, -rh * 0.98, rw * 1.07, -rh * 0.32); g.quadraticCurveTo(rw * 0.6, -rh * 0.7, 0, -rh * 0.68); g.quadraticCurveTo(-rw * 0.6, -rh * 0.7, -rw * 1.07, -rh * 0.32); g.closePath(); };
    for (const [x1, y1, w] of [[1.34, 0.36, 2.6], [1.14, 0.5, 2.2]]) { g.beginPath(); g.moveTo(rw * 1.0, -rh * 0.42); g.quadraticCurveTo(rw * 1.28, -rh * 0.05, rw * x1, rh * y1); g.lineWidth = w; g.strokeStyle = PORT.tone(sc, -0.15); g.stroke(); }
    softFill(Sf, sc);
    if (A.hatPat) { g.save(); Sf(); g.clip(); g.fillStyle = 'rgba(240,225,190,.45)'; g.strokeStyle = 'rgba(240,225,190,.4)'; g.lineWidth = 1.1; g.beginPath(); if (A.hatPat === 'stripe') { for (let i = -6; i <= 6; i++) { g.moveTo(i * 4 - 6, -rh * 0.4); g.lineTo(i * 4 + 6, -rh * 1.3); } g.stroke(); } else { for (let y = -rh * 1.15; y < -rh * 0.4; y += 3.4) for (let x = -rw * 1.1; x < rw * 1.1; x += 3.4) { g.moveTo(x + 0.6, y); g.arc(x, y, 0.6, 0, 6.2832); } g.fill(); } g.restore(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-rw * 0.8, -rh * 0.7); g.quadraticCurveTo(-rw * 0.2, -rh * 0.95, rw * 0.6, -rh * 0.75); g.moveTo(-rw * 0.4, -rh * 1.05); g.quadraticCurveTo(rw * 0.3, -rh * 1.0, rw * 0.9, -rh * 0.6); g.stroke();
    g.fillStyle = PORT.tone(sc, -0.1); g.beginPath(); g.ellipse(rw * 1.02, -rh * 0.44, 3, 2.4, 0.4, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(29,21,12,.5)'; g.lineWidth = 0.5; g.stroke();
  } else if (H === 'tiara') {
    // 東方の柔らかい帽子（頬を覆う垂れ布）
    const tc = A.hatC || '#b07a2a';
    for (const s of [-1, 1]) { const L = () => { g.beginPath(); g.moveTo(s * rw * 0.84, -rh * 0.5); g.lineTo(s * rw * 1.1, -rh * 0.46); g.quadraticCurveTo(s * rw * 1.16, rh * 0.2, s * rw * 0.92, rh * 0.64); g.lineTo(s * rw * 0.78, rh * 0.56); g.quadraticCurveTo(s * rw * 0.9, rh * 0.1, s * rw * 0.84, -rh * 0.5); g.closePath(); }; softFill(L, PORT.tone(tc, -0.1)); }
    const T = () => { g.beginPath(); g.moveTo(-rw * 1.07, -rh * 0.45); g.bezierCurveTo(-rw * 1.12, -rh * 1.1, -rw * 0.6, -rh * 1.55, rw * 0.12, -rh * 1.62); g.quadraticCurveTo(rw * 0.56, -rh * 1.64, rw * 0.5, -rh * 1.38); g.bezierCurveTo(rw * 1.0, -rh * 1.2, rw * 1.12, -rh * 0.9, rw * 1.07, -rh * 0.45); g.quadraticCurveTo(0, -rh * 0.64, -rw * 1.07, -rh * 0.45); g.closePath(); };
    softFill(T, tc);
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-rw * 0.5, -rh * 0.62); g.quadraticCurveTo(-rw * 0.3, -rh * 1.2, rw * 0.3, -rh * 1.45); g.moveTo(rw * 0.3, -rh * 0.6); g.quadraticCurveTo(rw * 0.5, -rh * 1.0, rw * 0.45, -rh * 1.36); g.stroke();
    // 前に垂れた帽子の先（フリュギア帽）
    g.fillStyle = PORT.tone(tc, 0.12); g.beginPath(); g.ellipse(rw * 0.12, -rh * 1.3, rw * 0.46, rh * 0.2, -0.25, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(rw * 0.12, -rh * 1.3, rw * 0.46, rh * 0.2, -0.25, 0.2, 2.9); g.stroke();
    g.strokeStyle = 'rgba(29,21,12,.5)'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(rw * 0.12, -rh * 1.3, rw * 0.46, rh * 0.2, -0.25, 3.1, 6.1); g.stroke();
    g.beginPath(); g.moveTo(-rw * 1.06, -rh * 0.5); g.quadraticCurveTo(0, -rh * 0.7, rw * 1.06, -rh * 0.5); g.lineWidth = 2.2; g.strokeStyle = A.trim || C.gold; g.stroke();
  }
};
// 頭の帯（王のディアデマ・革の鉢巻）
PORT.band = (g, rw, rh, col, w) => {
  const P = () => { g.beginPath(); g.moveTo(-rw * 1.06, -rh * 0.38); g.quadraticCurveTo(-rw * 0.6, -rh * 0.8, 0, -rh * 0.82); g.quadraticCurveTo(rw * 0.6, -rh * 0.8, rw * 1.06, -rh * 0.38); };
  P(); g.lineWidth = w + 0.9; g.strokeStyle = 'rgba(29,21,12,.45)'; g.stroke(); P(); g.lineWidth = w; g.strokeStyle = col; g.stroke();
  g.lineWidth = 0.5; g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(-rw * 0.9, -rh * 0.5); g.quadraticCurveTo(-rw * 0.5, -rh * 0.83, 0, -rh * 0.85); g.stroke();
};
// 葉の冠（左右から額の中央へ向かう葉）
PORT.leaves = (g, rx, rh, ySide, yTop, col, n) => {
  const paths = [new Path2D(), new Path2D()];   // 外向きの葉・内向きの葉（色を少し変える）
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const t = (i + 0.3) / n, u = 1 - t;
    const x = u * u * s * rx + 2 * u * t * s * rx * 0.58, y = u * u * ySide + 2 * u * t * yTop + t * t * yTop;
    const tx = 2 * u * (s * rx * 0.58 - s * rx) + 2 * t * (0 - s * rx * 0.58), ty = 2 * u * (yTop - ySide);
    const a = Math.atan2(ty, tx);
    for (const k of [0, 1]) { const th = a + (k ? 0.55 : -0.55), cx = x + 2.2 * Math.cos(th), cy = y + 2.2 * Math.sin(th); paths[k].moveTo(cx + 2.6 * Math.cos(th), cy + 2.6 * Math.sin(th)); paths[k].ellipse(cx, cy, 2.6, 1.05, th, 0, 6.2832); }
  }
  g.lineWidth = 0.35; g.strokeStyle = PORT.rgba(PORT.tone(col, -0.35), 0.7);
  g.fillStyle = PORT.tone(col, -0.15); g.fill(paths[0]); g.stroke(paths[0]);
  g.fillStyle = col; g.fill(paths[1]); g.stroke(paths[1]);
};

/* ---------- 描く：g は 100×100 の座標系（size で拡大）。頭の中心は (50,46) ---------- */
PORT.draw = (g, p0, opt = {}) => {
  const S = opt.size || 100, k = S / 100;
  const X = PORT.EXPR[opt.expr] || PORT.EXPR.normal;
  const p = X.mouth || X.eyeSize != null ? Object.assign({}, p0, X.mouth ? { mouth: X.mouth } : {}, X.eyeSize != null ? { eyeSize: p0.eyeSize * X.eyeSize } : {}, X.look != null ? { look: X.look } : {}) : p0;
  const browTilt = X.browTilt || 0, browUp = X.browUp || 0, eyeOpen = X.eyeOpen || 1;
  const A = p.at;
  g.save();
  g.scale(k, k);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const brush = (fn, w, a = 0.9) => { g.beginPath(); fn(); g.lineWidth = w * 1.9; g.strokeStyle = `rgba(29,21,12,${a * 0.28})`; g.stroke(); g.lineWidth = w; g.strokeStyle = `rgba(29,21,12,${a})`; g.stroke(); };
  // ---- 背景（漆喰の壁と国の色の霞） ----
  if (!opt.noBg) {
    g.fillStyle = opt.dark ? '#1a1612' : '#e8d9bc'; g.fillRect(0, 0, 100, 100);
    const gr = g.createRadialGradient(50, 40, 6, 50, 46, 70);
    gr.addColorStop(0, PORT.rgba(p.col, opt.dark ? 0.55 : 0.5)); gr.addColorStop(0.6, PORT.rgba(p.col, opt.dark ? 0.35 : 0.22)); gr.addColorStop(1, PORT.rgba(p.col, opt.dark ? 0.2 : 0.05));
    g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
    // 壁のしみ
    for (let i = 0; i < 3; i++) { const w = p.wash[i]; g.fillStyle = `rgba(60,36,18,${0.04 + w * 0.05})`; g.beginPath(); g.ellipse(14 + w * 72, 10 + p.wash[(i + 1) % 4] * 80, 16 + w * 22, 8 + w * 10, w * 3, 0, 6.2832); g.fill(); }
    // 壁の粒（敷き詰め模様を人ごとにずらす）
    const gp = PORT.pat(g, opt.dark ? 'grainD' : 'grainL', p.wash[2] * 50, p.wash[3] * 50);
    if (gp) { g.fillStyle = gp; g.fillRect(0, 0, 100, 100); }
  }
  // 人物（少し下げて頭の上をあける。高い前立てや帽子は引いて描く）
  const zoom = p.tall ? 0.9 : 1;
  g.save(); g.translate(50, 100); g.scale(zoom, zoom); g.translate(-50, -98);
  // ---- 肩・衣 ----
  PORT.body(g, p);
  const cx = 50, cy = 46, rw = 23 * p.faceW, rh = 27 * p.faceH;
  // ---- 頭の後ろ（長い髪・帯の端・ネメス） ----
  g.save(); g.translate(cx, cy); g.rotate(p.tilt); PORT.back(g, p, rw, rh); g.restore();
  // ---- 首 ----
  const nU = { tunic: 4, chiton: 4, toga: 3.5, robe: 3, himat: 3.5, rags: 4.5, ntunic: 3, gtunic: 4, kandys: 2, itunic: 3, linen: 3, pect: 3.5 }[p.dress] || 1;
  const neck = () => { g.beginPath(); g.moveTo(41, 62); g.lineTo(59, 62); g.lineTo(59.6, 75); g.quadraticCurveTo(50, 75 + nU * 2, 40.4, 75); g.closePath(); };
  g.fillStyle = PORT.shade(p.skin, -0.12); neck(); g.fill();
  const ng = g.createLinearGradient(0, 62, 0, 74); ng.addColorStop(0, 'rgba(60,30,10,.4)'); ng.addColorStop(1, 'rgba(60,30,10,0)');
  g.fillStyle = ng; neck(); g.fill();
  if (nU > 1 && p.dress !== 'bare') { g.beginPath(); g.moveTo(39.8, 74.7); g.quadraticCurveTo(50, 75 + nU * 2, 60.2, 74.7); g.strokeStyle = 'rgba(29,21,12,.45)'; g.lineWidth = 0.9; g.stroke(); }
  PORT.neckwear(g, p);
  // ---- 頭 ----
  g.save(); g.translate(cx, cy); g.rotate(p.tilt);
  const head = new Path2D();
  if (p.jaw === 'square') { head.moveTo(-rw, -rh * 0.35); head.bezierCurveTo(-rw, -rh * 1.15, rw, -rh * 1.15, rw, -rh * 0.35); head.bezierCurveTo(rw * 1.02, rh * 0.45, rw * 0.72, rh * 0.98, rw * 0.3, rh); head.lineTo(-rw * 0.3, rh); head.bezierCurveTo(-rw * 0.72, rh * 0.98, -rw * 1.02, rh * 0.45, -rw, -rh * 0.35); }
  else if (p.jaw === 'pointed') { head.moveTo(-rw, -rh * 0.3); head.bezierCurveTo(-rw, -rh * 1.15, rw, -rh * 1.15, rw, -rh * 0.3); head.bezierCurveTo(rw * 0.95, rh * 0.5, rw * 0.45, rh * 0.95, 0, rh * 1.02); head.bezierCurveTo(-rw * 0.45, rh * 0.95, -rw * 0.95, rh * 0.5, -rw, -rh * 0.3); }
  else if (p.jaw === 'round') { head.ellipse(0, 0, rw, rh, 0, 0, 6.2832); }
  else { head.moveTo(-rw, -rh * 0.3); head.bezierCurveTo(-rw, -rh * 1.15, rw, -rh * 1.15, rw, -rh * 0.3); head.bezierCurveTo(rw * 0.98, rh * 0.5, rw * 0.6, rh, 0, rh); head.bezierCurveTo(-rw * 0.6, rh, -rw * 0.98, rh * 0.5, -rw, -rh * 0.3); }
  // 耳
  g.fillStyle = PORT.shade(p.skin, -0.05);
  g.beginPath(); g.ellipse(-rw * 0.98, rh * 0.05, 3.2, 5, 0.1, 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(rw * 0.98, rh * 0.05, 3.2, 5, -0.1, 0, 6.2832); g.fill();
  g.strokeStyle = 'rgba(90,50,30,.35)'; g.lineWidth = 0.6; g.beginPath(); g.arc(-rw * 0.99, rh * 0.04, 1.8, 1.9, 4.6); g.moveTo(rw * 0.99 + 1.8 * Math.cos(-1.5), rh * 0.04 + 1.8 * Math.sin(-1.5)); g.arc(rw * 0.99, rh * 0.04, 1.8, -1.5, 1.2); g.stroke();
  // 顔
  g.fillStyle = p.skin; g.fill(head);
  const fg = g.createLinearGradient(-rw, 0, rw, 0); fg.addColorStop(0, 'rgba(90,50,20,.22)'); fg.addColorStop(0.35, 'rgba(90,50,20,0)'); fg.addColorStop(0.75, 'rgba(255,240,220,.1)'); fg.addColorStop(1, 'rgba(90,50,20,.12)');
  g.fillStyle = fg; g.fill(head);
  // 頬骨・陰
  if (p.cheek > 0.5) { g.fillStyle = 'rgba(120,60,30,.12)'; g.beginPath(); g.ellipse(-rw * 0.62, rh * 0.22, rw * 0.3, rh * 0.22, 0.3, 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(rw * 0.62, rh * 0.22, rw * 0.3, rh * 0.22, -0.3, 0, 6.2832); g.fill(); }
  if (p.wrinkle >= 2) { g.strokeStyle = 'rgba(90,50,30,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-rw * 0.38, rh * 0.25); g.quadraticCurveTo(-rw * 0.45, rh * 0.5, -rw * 0.3, rh * 0.68); g.moveTo(rw * 0.38, rh * 0.25); g.quadraticCurveTo(rw * 0.45, rh * 0.5, rw * 0.3, rh * 0.68); g.stroke(); }
  if (p.wrinkle >= 3) { g.strokeStyle = 'rgba(90,50,30,.3)'; g.lineWidth = 0.7; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-rw * 0.4, -rh * (0.46 + i * 0.1)); g.quadraticCurveTo(0, -rh * (0.52 + i * 0.1), rw * 0.4, -rh * (0.46 + i * 0.1)); g.stroke(); } }
  // 無精ひげ（剃り跡）
  if (p.stub > 0) { g.save(); g.clip(head); g.fillStyle = PORT.rgba(p.beardC, 0.1 + p.stub * 0.16); g.beginPath(); g.moveTo(-rw * 1.0, rh * 0.12); g.quadraticCurveTo(-rw * 0.9, rh * 0.95, 0, rh * 1.1); g.quadraticCurveTo(rw * 0.9, rh * 0.95, rw * 1.0, rh * 0.12); g.quadraticCurveTo(rw * 0.55, rh * 0.38, rw * 0.34, rh * 0.42); g.quadraticCurveTo(0, rh * 0.36, -rw * 0.34, rh * 0.42); g.quadraticCurveTo(-rw * 0.55, rh * 0.38, -rw * 1.0, rh * 0.12); g.fill(); g.restore(); }
  // 輪郭
  g.lineWidth = 1.1; g.strokeStyle = 'rgba(29,21,12,.75)'; g.stroke(head); g.lineWidth = 2.2; g.strokeStyle = 'rgba(29,21,12,.2)'; g.stroke(head);
  // ---- 目 ----
  const ey = -rh * 0.08, ex = rw * 0.42 * p.eyeGap, ew = rw * 0.2 * p.eyeSize, eh = rh * 0.09 * p.eyeSize * eyeOpen;
  for (const s of [-1, 1]) { const sg = g.createRadialGradient(s * ex, ey - eh, 1, s * ex, ey, ew * 1.9); sg.addColorStop(0, 'rgba(110,60,30,.2)'); sg.addColorStop(1, 'rgba(110,60,30,0)'); g.fillStyle = sg; g.beginPath(); g.ellipse(s * ex, ey, ew * 1.9, eh * 3.2, 0, 0, 6.2832); g.fill(); }
  for (const s of [-1, 1]) {
    const x = s * ex;
    if (A.patch && s < 0) continue;
    g.save(); g.translate(x, ey);
    // 白目
    g.fillStyle = '#f4ede0';
    g.beginPath();
    if (p.eye === 'narrow') { g.moveTo(-ew, 0); g.quadraticCurveTo(0, -eh * 1.2, ew, -eh * 0.1); g.quadraticCurveTo(0, eh * 0.9, -ew, 0); }
    else if (p.eye === 'round') { g.ellipse(0, 0, ew * 0.9, eh * 1.6, 0, 0, 6.2832); }
    else if (p.eye === 'droop') { g.moveTo(-ew, -eh * 0.4 * s); g.quadraticCurveTo(0, -eh * 1.7, ew, eh * 0.2 * s); g.quadraticCurveTo(0, eh * 1.3, -ew, -eh * 0.4 * s); }
    else if (p.eye === 'sharp') { g.moveTo(-ew, eh * 0.3 * s); g.quadraticCurveTo(0, -eh * 1.9, ew, -eh * 0.6 * s); g.quadraticCurveTo(ew * 0.2, eh * 1.1, -ew, eh * 0.3 * s); }
    else { g.moveTo(-ew, 0); g.quadraticCurveTo(0, -eh * 1.8, ew, 0); g.quadraticCurveTo(0, eh * 1.4, -ew, 0); }
    g.closePath(); g.fill();
    g.save(); g.clip();
    // 瞳
    const ir = Math.min(ew * 0.52, eh * 1.4);
    g.fillStyle = p.iris || '#2a1c12'; g.beginPath(); g.arc(p.look * ew * 0.5, eh * 0.1, ir, 0, 6.2832); g.fill();
    g.fillStyle = '#0f0a06'; g.beginPath(); g.arc(p.look * ew * 0.5, eh * 0.1, ir * 0.55, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(p.look * ew * 0.5 - ir * 0.35, eh * 0.1 - ir * 0.35, ir * 0.22, 0, 6.2832); g.fill();
    // 上まぶたの影
    g.fillStyle = 'rgba(60,35,15,.25)'; g.fillRect(-ew, -eh * 2, ew * 2, eh * 0.9);
    g.restore();
    // まぶたの線（エジプト人と女性は太く、目尻を引く）
    g.lineWidth = p.kohl ? 1.6 : 1.2; g.strokeStyle = p.kohl ? 'rgba(15,10,6,.95)' : 'rgba(29,21,12,.9)'; g.beginPath();
    if (p.eye === 'narrow') { g.moveTo(-ew, 0); g.quadraticCurveTo(0, -eh * 1.2, ew, -eh * 0.1); }
    else if (p.eye === 'round') { g.ellipse(0, 0, ew * 0.9, eh * 1.6, 0, Math.PI, 6.2832); }
    else if (p.eye === 'droop') { g.moveTo(-ew, -eh * 0.4 * s); g.quadraticCurveTo(0, -eh * 1.7, ew, eh * 0.2 * s); }
    else if (p.eye === 'sharp') { g.moveTo(-ew, eh * 0.3 * s); g.quadraticCurveTo(0, -eh * 1.9, ew, -eh * 0.6 * s); }
    else { g.moveTo(-ew, 0); g.quadraticCurveTo(0, -eh * 1.8, ew, 0); }
    g.stroke();
    if (p.kohl) { g.lineWidth = 1.1; g.beginPath(); g.moveTo(s * ew * 0.85, -eh * 0.2); g.lineTo(s * ew * 1.45, -eh * 0.75); g.stroke(); }
    // 下まぶた・隈
    g.lineWidth = p.kohl ? 0.9 : 0.6; g.strokeStyle = p.kohl ? 'rgba(15,10,6,.6)' : 'rgba(29,21,12,.4)'; g.beginPath(); g.moveTo(-ew * 0.8, eh * 0.6); g.quadraticCurveTo(0, eh * 1.3, ew * 0.8, eh * 0.4); g.stroke();
    if (p.eyebag > 0.2) { g.strokeStyle = `rgba(90,50,30,${p.eyebag * 0.5})`; g.beginPath(); g.moveTo(-ew * 0.7, eh * 1.6); g.quadraticCurveTo(0, eh * 2.3, ew * 0.7, eh * 1.5); g.stroke(); }
    if (p.wrinkle >= 1) { g.strokeStyle = 'rgba(90,50,30,.3)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(s * ew * 1.1, -eh * 0.3); g.lineTo(s * ew * 1.6, -eh * 0.9); g.moveTo(s * ew * 1.1, eh * 0.4); g.lineTo(s * ew * 1.6, eh * 0.9); g.stroke(); }
    g.restore();
  }
  // ---- 眉 ----
  const by = ey - rh * 0.22 * p.browH - browUp * rh * 0.08;
  g.strokeStyle = p.hairC; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const x0 = s * ex * 0.45, x1 = s * ex * 1.5;
    g.save();
    if (browTilt) { g.translate(s * ex, by); g.rotate(-s * browTilt * 0.28); g.translate(-s * ex, -by); }
    g.beginPath();
    if (p.brow === 'angled') { g.lineWidth = 2.6; g.moveTo(x0, by + rh * 0.04); g.lineTo(s * ex * 0.9, by - rh * 0.08); g.lineTo(x1, by - rh * 0.02); }
    else if (p.brow === 'thick') { g.lineWidth = 3.2; g.moveTo(x0, by + rh * 0.02); g.quadraticCurveTo(s * ex, by - rh * 0.1, x1, by); }
    else if (p.brow === 'thin') { g.lineWidth = 1.2; g.moveTo(x0, by); g.quadraticCurveTo(s * ex, by - rh * 0.12, x1, by - rh * 0.02); }
    else if (p.brow === 'arched') { g.lineWidth = 1.8; g.moveTo(x0, by + rh * 0.03); g.quadraticCurveTo(s * ex * 0.95, by - rh * 0.16, x1, by + rh * 0.02); }
    else { g.lineWidth = 2.2; g.moveTo(x0, by); g.lineTo(x1, by - rh * 0.02); }
    g.stroke();
    g.restore();
  }
  if (browTilt > 0.5) { g.strokeStyle = 'rgba(90,50,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2.5, by + 1); g.lineTo(-1.5, by + rh * 0.16); g.moveTo(2.5, by + 1); g.lineTo(1.5, by + rh * 0.16); g.stroke(); }
  if (p.st === 'ins') { g.strokeStyle = 'rgba(90,50,30,.4)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-1.5, by + 1); g.lineTo(-1, by + rh * 0.12); g.moveTo(1.5, by + 1); g.lineTo(1, by + rh * 0.12); g.stroke(); }
  // ---- 鼻 ----
  const ny = rh * 0.28;
  brush(() => {
    if (p.nose === 'hook') { g.moveTo(-1.5, ey + eh); g.quadraticCurveTo(3.8, ny * 0.45, 2.6, ny); g.quadraticCurveTo(0, ny + 2.5, -4, ny + 1.5); }
    else if (p.nose === 'wide') { g.moveTo(-1, ey + eh * 1.5); g.quadraticCurveTo(-1, ny * 0.7, -1, ny); g.moveTo(-6, ny + 2); g.quadraticCurveTo(-1, ny + 4.5, 5.5, ny + 1.5); }
    else if (p.nose === 'small') { g.moveTo(-1, ny * 0.3); g.quadraticCurveTo(0.5, ny * 0.75, 1.5, ny); g.quadraticCurveTo(0, ny + 1.6, -3, ny + 1); }
    else { g.moveTo(-1.2, by + rh * 0.08); g.quadraticCurveTo(0.6, ny * 0.5, 2, ny); g.quadraticCurveTo(0, ny + 2, -4, ny + 1.2); }
  }, 1.0, 0.8);
  g.fillStyle = 'rgba(120,60,30,.14)'; g.beginPath(); g.ellipse(2.5, ny - 1.5, 3.5, 2.5, 0, 0, 6.2832); g.fill();
  // ---- 口 ----
  const my = rh * 0.58, mw = rw * 0.3 * p.lip;
  g.fillStyle = p.fem ? 'rgba(178,64,62,.72)' : 'rgba(150,70,55,.55)';
  if (p.mouth === 'frown') { brush(() => { g.moveTo(-mw, my - 1); g.quadraticCurveTo(0, my + 2.2, mw, my - 1); }, 1.3, 0.85); }
  else if (p.mouth === 'smile') { brush(() => { g.moveTo(-mw, my + 0.5); g.quadraticCurveTo(0, my + 3.2, mw, my + 0.5); }, 1.2, 0.8); g.beginPath(); g.moveTo(-mw * 0.8, my + 0.8); g.quadraticCurveTo(0, my + 2.4, mw * 0.8, my + 0.8); g.quadraticCurveTo(0, my + 0.6, -mw * 0.8, my + 0.8); g.fill(); }
  else if (p.mouth === 'tight') { brush(() => { g.moveTo(-mw * 0.8, my); g.lineTo(mw * 0.8, my); }, 1.6, 0.9); }
  else if (p.mouth === 'shout') { g.fillStyle = '#4a1a14'; g.beginPath(); g.moveTo(-mw, my - 1.5); g.quadraticCurveTo(0, my - 3.5, mw, my - 1.5); g.quadraticCurveTo(mw * 0.6, my + 6, 0, my + 6.5); g.quadraticCurveTo(-mw * 0.6, my + 6, -mw, my - 1.5); g.fill(); g.fillStyle = '#f1e8d8'; g.beginPath(); g.moveTo(-mw * 0.85, my - 1); g.quadraticCurveTo(0, my - 2.6, mw * 0.85, my - 1); g.lineTo(mw * 0.8, my + 0.8); g.quadraticCurveTo(0, my + 0.2, -mw * 0.8, my + 0.8); g.closePath(); g.fill(); brush(() => { g.moveTo(-mw, my - 1.5); g.quadraticCurveTo(0, my - 3.5, mw, my - 1.5); }, 1.1, 0.8); }
  else if (p.mouth === 'grit') { g.fillStyle = '#f1e8d8'; g.beginPath(); g.moveTo(-mw, my - 1); g.lineTo(mw, my - 1); g.lineTo(mw * 0.9, my + 2.5); g.lineTo(-mw * 0.9, my + 2.5); g.closePath(); g.fill(); g.strokeStyle = 'rgba(29,21,12,.6)'; g.lineWidth = 0.6; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * mw * 0.28, my - 1); g.lineTo(i * mw * 0.26, my + 2.5); g.stroke(); } brush(() => { g.moveTo(-mw, my - 1); g.lineTo(mw, my - 1); g.moveTo(-mw * 0.9, my + 2.5); g.lineTo(mw * 0.9, my + 2.5); }, 1.0, 0.85); }
  else if (p.mouth === 'laugh') { g.fillStyle = '#4a1a14'; g.beginPath(); g.moveTo(-mw * 1.1, my - 0.5); g.quadraticCurveTo(0, my + 1, mw * 1.1, my - 0.5); g.quadraticCurveTo(mw * 0.7, my + 6.5, 0, my + 7); g.quadraticCurveTo(-mw * 0.7, my + 6.5, -mw * 1.1, my - 0.5); g.fill(); g.fillStyle = '#f1e8d8'; g.beginPath(); g.moveTo(-mw, my); g.quadraticCurveTo(0, my + 1.2, mw, my); g.lineTo(mw * 0.9, my + 2.2); g.quadraticCurveTo(0, my + 3.2, -mw * 0.9, my + 2.2); g.closePath(); g.fill(); brush(() => { g.moveTo(-mw * 1.1, my - 0.5); g.quadraticCurveTo(0, my + 1, mw * 1.1, my - 0.5); }, 1.1, 0.8); }
  else if (p.mouth === 'o') { g.fillStyle = '#4a1a14'; g.beginPath(); g.ellipse(0, my + 1.5, mw * 0.45, mw * 0.55, 0, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(29,21,12,.8)'; g.lineWidth = 1; g.stroke(); }
  else { brush(() => { g.moveTo(-mw, my); g.quadraticCurveTo(0, my + 1.2, mw, my); }, 1.2, 0.85); g.beginPath(); g.moveTo(-mw * 0.9, my + 0.4); g.quadraticCurveTo(0, my + 2.6, mw * 0.9, my + 0.4); g.quadraticCurveTo(0, my + 0.9, -mw * 0.9, my + 0.4); g.fill(); }
  g.fillStyle = 'rgba(120,60,30,.18)'; g.beginPath(); g.ellipse(0, my - 3.2, 2.2, 1.6, 0, 0, 6.2832); g.fill();
  if (X.sweat) { g.fillStyle = 'rgba(190,225,245,.9)'; g.beginPath(); g.moveTo(rw * 0.78, -rh * 0.55); g.quadraticCurveTo(rw * 0.92, -rh * 0.3, rw * 0.8, -rh * 0.22); g.quadraticCurveTo(rw * 0.66, -rh * 0.3, rw * 0.78, -rh * 0.55); g.fill(); }
  if (X.blush) { g.fillStyle = 'rgba(210,90,70,.22)'; g.beginPath(); g.ellipse(-rw * 0.55, rh * 0.2, rw * 0.22, rh * 0.12, 0, 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(rw * 0.55, rh * 0.2, rw * 0.22, rh * 0.12, 0, 0, 6.2832); g.fill(); }
  // ---- 傷 ----
  if (p.scar) {
    g.strokeStyle = 'rgba(150,60,50,.75)'; g.lineWidth = 1.1; g.beginPath();
    if (p.scar === 1) { g.moveTo(rw * 0.55, -rh * 0.05); g.lineTo(rw * 0.78, rh * 0.42); }
    else if (p.scar === 2) { g.moveTo(-ex * 1.4, by - rh * 0.22); g.lineTo(-ex * 0.9, ey + eh * 2.2); }
    else { g.moveTo(-rw * 0.3, rh * 0.75); g.lineTo(rw * 0.1, rh * 0.95); }
    g.stroke();
    g.strokeStyle = 'rgba(29,21,12,.5)'; g.lineWidth = 0.5; for (let i = 0; i < 3; i++) { const t = (i + 0.5) / 3; g.beginPath(); if (p.scar === 1) { const x = rw * 0.55 + (rw * 0.23) * t, y = -rh * 0.05 + rh * 0.47 * t; g.moveTo(x - 1.6, y + 0.8); g.lineTo(x + 1.6, y - 0.8); } g.stroke(); }
  }
  // ---- 眼帯（賊） ----
  if (A.patch) { g.strokeStyle = '#1a1410'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-rw * 1.02, -rh * 0.4); g.lineTo(-ex, ey); g.lineTo(rw * 0.75, -rh * 0.68); g.stroke(); g.fillStyle = '#1e1813'; g.beginPath(); g.ellipse(-ex, ey + 0.3, ew * 1.25, eh * 2.3, -0.1, 0, 6.2832); g.fill(); }
  // ---- ひげ ----
  PORT.beardD(g, p, rw, rh, my, mw);
  // ---- 髪・被り物 ----
  PORT.hairF(g, p, rw, rh, head);
  PORT.headwear(g, p, rw, rh);
  // 耳飾り
  if (A.ear && !PORT.EARS[A.head] && A.hair !== 'long' && A.hair !== 'wig') { g.strokeStyle = A.ear; g.lineWidth = 0.9; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * rw * 0.99, rh * 0.31, 1.5, 0, 6.2832); g.stroke(); } }
  g.restore();
  g.restore();
  // ---- 枠と印 ----
  if (!opt.noBg) {
    const vg = g.createRadialGradient(50, 50, 40, 50, 50, 78); vg.addColorStop(0, 'rgba(20,14,8,0)'); vg.addColorStop(1, opt.dark ? 'rgba(0,0,0,.6)' : 'rgba(20,14,8,.35)');
    g.fillStyle = vg; g.fillRect(0, 0, 100, 100);
    if (opt.seal && p.sei) { g.fillStyle = '#a8382a'; g.beginPath(); g.arc(86, 86, 8.4, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(246,236,214,.55)'; g.lineWidth = 0.8; g.beginPath(); g.arc(86, 86, 6.9, 0, 6.2832); g.stroke(); g.fillStyle = '#f6ecd6'; g.font = `10px ${V.fontHead ? V.fontHead() : 'serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.sei, 86, 86.6); }
  }
  g.restore();
};
// ひげ（beard：none must goat full long、bs：trim curly point gaul）
PORT.beardD = (g, p, rw, rh, my, mw) => {
  const bd = p.beard, bs = p.bs, bc = p.beardC;
  if (bd === 'none') return;
  g.fillStyle = bc; g.strokeStyle = bc;
  // 巻いたひげ：少しずらした小さな渦の模様を重ねる（人ごとに模様の位置をずらす）
  const curls = (fn) => {
    if (bs !== 'curly') return;
    const h = PORT.hash(p.seed + 'b'), pt = PORT.pat(g, 'curl', (h & 15) * 0.9, (h >> 4 & 15) * 0.8);
    if (pt) { g.fillStyle = pt; fn(); g.fill(); g.fillStyle = bc; }
  };
  // 口ひげ
  if (bs === 'gaul') {
    // 垂れた長い口ひげ（ガリア）
    g.beginPath(); for (const s of [-1, 1]) { g.moveTo(0, my - 3.6); g.quadraticCurveTo(s * mw * 0.9, my - 4.6, s * mw * 1.25, my - 0.5); g.quadraticCurveTo(s * mw * 1.45, my + 4, s * mw * 1.35, my + 8); g.quadraticCurveTo(s * mw * 1.12, my + 3, s * mw * 0.8, my - 1.2); g.quadraticCurveTo(s * mw * 0.4, my - 2.6, 0, my - 2.4); } g.fill();
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.5; g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * mw * 0.3, my - 3); g.quadraticCurveTo(s * mw * 1.1, my - 2.5, s * mw * 1.3, my + 5); } g.stroke(); g.strokeStyle = bc;
  } else if (bd === 'must' || bd === 'full' || bd === 'long' || bd === 'goat') {
    g.lineWidth = bd === 'goat' ? 1.7 : bs === 'trim' ? 1.8 : 2.2; g.beginPath(); g.moveTo(-1, my - 3); g.quadraticCurveTo(-mw * 0.8, my - 5, -mw * 1.3, my - 1); g.moveTo(1, my - 3); g.quadraticCurveTo(mw * 0.8, my - 5, mw * 1.3, my - 1); g.stroke();
  }
  if (bd === 'goat') {
    if (bs === 'point') { const P = () => { g.beginPath(); g.moveTo(-rw * 0.72, rh * 0.42); g.quadraticCurveTo(-rw * 0.55, rh * 1.0, 0, rh * 1.4); g.quadraticCurveTo(rw * 0.55, rh * 1.0, rw * 0.72, rh * 0.42); g.quadraticCurveTo(rw * 0.42, rh * 0.86, 0, rh * 0.86); g.quadraticCurveTo(-rw * 0.42, rh * 0.86, -rw * 0.72, rh * 0.42); }; P(); g.fill(); g.strokeStyle = 'rgba(255,245,230,.14)'; g.lineWidth = 0.5; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 2.2, rh * 0.92); g.quadraticCurveTo(i * 2, rh * 1.1, i * 0.8, rh * 1.3); } g.stroke(); }
    else { g.beginPath(); g.moveTo(-4, rh * 0.82); g.quadraticCurveTo(0, rh * 1.35, 4, rh * 0.82); g.quadraticCurveTo(0, rh * 0.9, -4, rh * 0.82); g.fill(); }
  }
  if (bd === 'full') {
    const low = bs === 'trim' ? 1.04 : bs === 'point' ? 1.3 : 1.15;
    const P = () => { g.beginPath(); g.moveTo(-rw * 0.84, rh * 0.28); g.quadraticCurveTo(-rw * 0.86, rh * 1.0, 0, rh * low); g.quadraticCurveTo(rw * 0.86, rh * 1.0, rw * 0.84, rh * 0.28); g.quadraticCurveTo(rw * 0.6, rh * 0.8, 0, rh * 0.84); g.quadraticCurveTo(-rw * 0.6, rh * 0.8, -rw * 0.84, rh * 0.28); };
    if (bs === 'trim') { g.save(); g.globalAlpha = 0.82; P(); g.fill(); g.restore(); }
    else { P(); g.fill(); }
    curls(P);
    if (bs !== 'curly') { g.lineWidth = 0.6; g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 3, rh * 0.9); g.lineTo(i * 3.4, rh * (low - 0.05)); g.stroke(); } }
  }
  if (bd === 'long') {
    const P = () => { g.beginPath(); g.moveTo(-rw * 0.84, rh * 0.28); g.quadraticCurveTo(-rw * 0.9, rh * 1.05, -rw * 0.4, rh * 1.45); g.quadraticCurveTo(0, rh * 1.85, rw * 0.4, rh * 1.45); g.quadraticCurveTo(rw * 0.9, rh * 1.05, rw * 0.84, rh * 0.28); g.quadraticCurveTo(rw * 0.6, rh * 0.8, 0, rh * 0.84); g.quadraticCurveTo(-rw * 0.6, rh * 0.8, -rw * 0.84, rh * 0.28); };
    P(); g.fill(); curls(P);
    if (bs !== 'curly') { g.lineWidth = 0.6; g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 2.5, rh * 1.0); g.quadraticCurveTo(i * 2.8, rh * 1.4, i * 2, rh * 1.7); g.stroke(); } }
  }
};
// 外で作った肖像（歴史上の人物だけ。名は assets/face/ の名）
PORT.FACES = Object.fromEntries('ファビウス:fabius,フルウィウス:fulvius,プブリウス・スキピオ:p_scipio,グナエウス・スキピオ:cn_scipio,センプロニウス:sempronius,マルケッルス:marcellus,フラミニウス:flaminius,アエミリウス・パウルス:aemilius_paullus,ウァッロ:varro,ミヌキウス:minucius,グラックス:gracchus,クラウディウス・ネロ:claudius_nero,リウィウス:livius,アッピウス・クラウディウス:appius_claudius,スキピオ:scipio,ラエリウス:laelius,ルキウス・スキピオ:l_scipio,カトー:cato,フラミニヌス:flamininus,アエミリウス・パウルス（子）:paullus_mac,アキリウス・グラブリオ:glabrio,スキピオ・ナシカ:nasica,小スキピオ:aemilianus,ムンミウス:mummius,ポピリウス・ラエナス:popillius,ラエウィヌス:laevinus,マルキウス:marcius,トルクァトゥス:torquatus,ポストゥミウス:postumius,リキニウス・クラッスス:crassus_dives,ウァレリウス・フラックス:valerius_flaccus,エンニウス:ennius,マンリウス・ウルソ:manlius_vulso,エウメネス二世:eumenes2,ティベリウス・グラックス:t_gracchus,メテッルス:metellus,スルピキウス・ガッルス:sulpicius_gallus,ラエリウス（子）:laelius_minor,アッピウス・カウデクス:appius_caudex,マニウス・ウァレリウス:m_valerius,ドゥイリウス:duilius,レグルス:regulus,ルタティウス・カトゥルス:lutatius,クラウディウス・プルケル:claudius_pulcher,大ハンノ:hanno_great,ハスドルバル・ハエドゥス:hasdrubal_haedus,ハンニバル:hannibal,ハスドルバル:hasdrubal_barca,マゴ:mago_barca,マハルバル:maharbal,ハンノ（ボミルカルの子）:hanno_bomilcar,ハスドルバル（ギスコの子）:hasdrubal_gisco,ボミルカル:bomilcar,ヒミルコ:himilco,ムットゥネス:muttines,カルタロ:carthalo,インディビリス:indibilis,ハスドルバル・カルウス:hasdrubal_calvus,ハンノ（ハミルカルの子）:hanno_hamilcar,ハスドルバル（最後の将）:hasdrubal_last,ハンノ（老将）:hanno_elder,ハンニバル（ギスコの子）:hannibal_gisco,クサンティッポス:xanthippus,ハミルカル・バルカ:hamilcar_barca,シュファクス:syphax,ガイア:gaia,マシニッサ:masinissa,ウェルミナ:vermina,ソフォニスバ:sophonisba,ミキプサ:micipsa,グルッサ:gulussa,フィリッポス五世:philip5,アラトス:aratus,デメトリオス（ファロスの）:demetrius_pharos,タウリオン:taurion,ヘラクレイデス:heracleides,フィロポイメン:philopoemen,スコパス:scopas,ナビス:nabis,ペルセウス:perseus,デメトリオス（王子）:demetrius_prince,ポリュビオス:polybius,アンティゴノス二世:antigonus2,アンティオコス三世:antiochus3,ゼウクシス:zeuxis,アカイオス:achaeus,テオドトス:theodotus,ニカルコス:nicarchus,アンティパトロス:antipater,ポリュクセニダス:polyxenidas,セレウコス四世:seleucus4,アンティオコス四世:antiochus4,ヘリオドロス:heliodorus,アンティオコス一世:antiochus1,プトレマイオス四世:ptolemy4,ソシビオス:sosibius,アガトクレス:agathocles,アンドロマコス:andromachus,ポリュクラテス:polycrates,エケクラテス:echecrates,フォクシダス:phoxidas,アルシノエ三世:arsinoe3,アリストメネス:aristomenes,プトレマイオス五世:ptolemy5,クレオパトラ一世:cleopatra1,プトレマイオス二世:ptolemy2,クレモニデス:chremonides,ヒエロン二世:hiero2,ゲロン:gelon,アルキメデス:archimedes,ヒエロニュモス:hieronymus,アドラノドロス:adranodorus,ヒッポクラテス:hippocrates_syr,エピキュデス:epicydes'.split(',').map(s => s.split(':')));
// 年齢・時期による差し替え（絵があるときだけ）：[名, 差し替えの名, その年月より前か後か]
PORT.FACE_ALT = [['hannibal', 'hannibal_old', -196, 1, 1], ['hannibal', 'hannibal_oneeye', -217, 4, 1], ['scipio', 'scipio_young', -209, 1, 0], ['masinissa', 'masinissa_old', -170, 1, 1], ['philip5', 'philip5_old', -185, 1, 1]];
PORT.faceKey = (o, expr) => {
  if (!o || typeof ASSET === 'undefined' || !ASSET.on()) return null;
  const real = o.hist || (o.id != null && typeof G !== 'undefined' && G && G.off && G.off[o.id] && G.off[o.id].hist && G.off[o.id].n === o.n);
  let k = real && PORT.FACES[o.n];
  if (!k || !ASSET.has('face/' + k)) return null;
  if (typeof G !== 'undefined' && G && G.year != null) {
    const ym = G.year * 12 + (G.month || 1);
    for (const [b, alt, y, m, after] of PORT.FACE_ALT) if (b === k && ASSET.has('face/' + alt) && (after ? ym >= y * 12 + m : ym < y * 12 + m)) { k = alt; break; }
  }
  if (expr && expr !== 'normal' && ASSET.has('face/' + k + '_' + expr)) return 'face/' + k + '_' + expr;
  return 'face/' + k;
};
PORT.imgCanvas = (o, im, fk, size, dpr, opt) => {
  const key = `img|${fk}|${size}|${opt.seal ? 's' : ''}`;
  let c = PORT._cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
  c.style.width = size + 'px'; c.style.height = size + 'px';
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(im, 0, 0, c.width, c.height);
  const sei = opt.seal && (o.sei || PORT.params(o).sei);
  if (sei) { g.scale(c.width / 100, c.height / 100); g.fillStyle = '#a8382a'; g.beginPath(); g.arc(86, 86, 8.4, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(246,236,214,.55)'; g.lineWidth = 0.8; g.beginPath(); g.arc(86, 86, 6.9, 0, 6.2832); g.stroke(); g.fillStyle = '#f6ecd6'; g.font = `10px ${V.fontHead ? V.fontHead() : 'serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(sei).slice(0, 1), 86, 86.6); }
  if (PORT._cache.size >= PORT.MAX) PORT._cache.delete(PORT._cache.keys().next().value);
  PORT._cache.set(key, c);
  return c;
};
PORT.canvas = (o, size, opt = {}) => {
  size = Math.max(16, Math.round(size || 48));
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const fk = PORT.faceKey(o, opt.expr);
  if (fk) { const im = ASSET.img(fk, () => PORT._cache.clear()); if (im) return PORT.imgCanvas(o, im, fk, size, dpr, opt); }
  const p = PORT.params(o);
  const key = `${p.seed}|${size}|${p.age >> 2}|${p.sig}|${opt.dark ? 'd' : ''}${opt.seal ? 's' : ''}${opt.noBg ? 'n' : ''}|${opt.expr || ''}`;
  let c = PORT._cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
  c.style.width = size + 'px'; c.style.height = size + 'px';
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  PORT.draw(g, p, Object.assign({ size }, opt));
  if (PORT._cache.size >= PORT.MAX) PORT._cache.delete(PORT._cache.keys().next().value);
  PORT._cache.set(key, c);
  return c;
};
// innerHTML に埋める置き場
PORT.tag = (o, size, opt = {}) => {
  if (!o) return '';
  const k = 'p' + (PORT._seq = (PORT._seq || 0) + 1);
  PORT._reg.set(k, { o: Object.assign({}, o), size, opt });
  if (PORT._reg.size > 600) { const first = PORT._reg.keys().next().value; PORT._reg.delete(first); }
  return `<span class="por${opt.cls ? ' ' + opt.cls : ''}" data-pk="${k}" style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
};
PORT.fill = (root) => {
  if (!root) return;
  for (const el of U.$$('.por[data-pk]', root)) {
    const k = el.dataset.pk; const r = PORT._reg.get(k); if (!r) continue;
    el.removeAttribute('data-pk');
    const src = PORT.canvas(r.o, r.size, r.opt);
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = src.style.width; c.style.height = src.style.height;
    c.getContext('2d').drawImage(src, 0, 0);
    el.innerHTML = ''; el.append(c);
    PORT._reg.delete(k);
  }
};
// 置き場を自動で埋める（画面の書き換えのたびに）
PORT.watch = () => {
  if (PORT._mo || typeof MutationObserver === 'undefined') return;
  PORT._mo = new MutationObserver((muts) => { let any = false; for (const m of muts) if (m.addedNodes && m.addedNodes.length) { any = true; break; } if (any) PORT.fill(document.body); });
  PORT._mo.observe(document.body, { childList: true, subtree: true });
};
// 主人公の肖像（設定画面用：仮の人物から）
PORT.fromCfg = (cfg) => ({ id: 'me', n: S.fullName(cfg.sei || 'コルネリウス', cfg.mei || 'ルキウス', cfg.cul || S.cultOf(cfg.country)), sei: cfg.sei || 'コルネリウス', mei: cfg.mei || 'ルキウス', cul: cfg.cul || null, c: cfg.country, r: cfg.rank, bu: cfg.stats.bu, tou: cfg.stats.tou, chi: cfg.stats.chi, pol: cfg.stats.pol, mi: cfg.stats.mi, st: cfg.style, age: cfg.age, player: true });
