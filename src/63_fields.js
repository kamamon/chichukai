/* =========================================================
   地中海覇道 — 戦場図（名のある戦場およそ二千）と戦場選び
   地形の型（隘路・湖畔の隘路・渡河点・尾根・浜辺・湿地…）× 変化 × 地方（風土）で、
   名前つきの戦場を作る。同じ戦場はいつも同じ形になる。
   統率の高い総大将は、開戦前に候補から戦場を選び、有利な側（A側）に布陣できる。
   座標：u は横（0〜1、鏡写しあり）、v は奥行き（0＝B側の後ろ、1＝A側の後ろ）。A側の前線は v≈0.66。
   ========================================================= */
const FLD = {};
FLD.MIN_TOU = 70;
FLD.choiceCount = (tou) => tou >= 98 ? 5 : tou >= 90 ? 4 : tou >= 80 ? 3 : tou >= FLD.MIN_TOU ? 2 : 1;

/* ---------- 地方（風土） ---------- */
// w: 名につける言葉、mix: 地表の割合、grove: 林を果樹園にする割合、paddy: 灌漑畑
FLD.BIOMES = {
  italia:   { n: 'イタリア',   w: ['オリーブの', 'ぶどう畑の', '樫の', '白い石の', '羊飼いの', '泉の', '古い街道の', '鷲の', '栗の', '糸杉の'], mix: { forest: 0.16, farm: 0.38 }, grove: 0.55 },
  gallia:   { n: 'ガリア',     w: ['ブナの', '霧の', '黒い森の', '鹿の', '狼の', '苔の', '渡り鳥の', '野ばらの', '雨の', '樺の'], mix: { forest: 0.3, farm: 0.25 }, grove: 0 },
  hispania: { n: 'ヒスパニア', w: ['乾いた', '赤い土の', '銀の', 'ヒイラギガシの', '牛の', '岩の', '高原の', '風の', 'ハゲワシの', 'エニシダの'], mix: { forest: 0.12, farm: 0.2, sand: 0.04 }, grove: 0.4 },
  africa:   { n: 'アフリカ',   w: ['ナツメヤシの', '赤い砂の', 'ライオンの', '塩の', '麦の', '日照りの', '岩山の', '象の', 'ジャッカルの', 'ギョリュウの'], mix: { forest: 0.05, farm: 0.25, sand: 0.12 }, grove: 0.6 },
  aegyptus: { n: 'エジプト',   w: ['葦の', '黒い土の', 'パピルスの', '運河の', 'トキの', 'ワニの', '神殿の', 'ナイルの', 'イチジクの', '砂嵐の'], mix: { forest: 0.03, farm: 0.5, sand: 0.1 }, grove: 0.5, paddy: true },
  graecia:  { n: 'ギリシア',   w: ['石灰岩の', '月桂樹の', 'ヤギの', '蜂蜜の', '白い', 'アーモンドの', '英雄の', '松の', 'タイムの', '蝉の'], mix: { forest: 0.14, farm: 0.24 }, grove: 0.55 },
  thracia:  { n: 'トラキア',   w: ['黒い', '熊の', '騎手の', '深い森の', '銀の', '冷たい', '野生馬の', '雪解けの', '鉄の', 'オオカミの'], mix: { forest: 0.3, farm: 0.15 }, grove: 0 },
  syria:    { n: 'シリア',     w: ['杉の', '乾いた', 'ラクダの', '塩の', '玄武岩の', '没薬の', '星の', '泉の', '黄色い', 'ザクロの'], mix: { forest: 0.06, farm: 0.25, sand: 0.12 }, grove: 0.5 },
  anatolia: { n: 'アナトリア', w: ['高原の', '馬の', '風の', '塩湖の', '岩の', '雪の', '鷹の', 'ポプラの', '羊の', '古い王の'], mix: { forest: 0.1, farm: 0.2, steppe: 0.4 }, grove: 0.15 },
  insula:   { n: '島々',       w: ['海風の', '岩の', 'ギンバイカの', 'カモメの', '珊瑚の', '火山の', '漁師の', '灯台の', '白波の', 'ケッパーの'], mix: { forest: 0.12, farm: 0.25 }, grove: 0.45 },
};
FLD.BIOME_ORDER = Object.keys(FLD.BIOMES);
FLD.BIOME_PROV = {
  italia: 'roma etruria umbria picenum ariminum campania samnium apulia lucania bruttium tarentum',
  gallia: 'cisalpina liguria massilia',
  hispania: 'emporiae cartnova gades castulo saguntum celtiberia ilergetes lusitania',
  africa: 'carthago utica byzacium emporia sicca cirta hippo iol siga mauretania gaetulia cyrene',
  aegyptus: 'alexandria memphis thebais pelusium',
  graecia: 'pella thessalia chalcidice epirus aetolia euboea athenae corinth achaea sparta illyria ionia caria',
  thracia: 'thracia paeonia',
  syria: 'antiochia apamea phoenicia seleucia gaza judaea damascus',
  anatolia: 'cilicia phrygia lydia pergamon bithynia galatia lycia',
  insula: 'sardinia corsica lilybaeum agrigentum messana syracusae leontini baleares cyprus rhodos creta',
};
FLD._bp = null;
FLD.biomeOf = (pid) => {
  if (!FLD._bp) { FLD._bp = {}; for (const b in FLD.BIOME_PROV) for (const p of FLD.BIOME_PROV[b].split(' ')) FLD._bp[p] = b; }
  return FLD._bp[pid] || 'italia';
};

/* ---------- 地形の型 ---------- */
// cat: 図鑑の分類、theme: 地勢、fit(s): 全体マップの土地にどれだけ合うか（0 は選ばない）
// tags: AI の好み（open 開けた・narrow 狭い・high 高所・ambush 伏兵・water 水・rough 悪路）
// hints: 選んだ側（A側）の利、bio: 出る地方（省けばすべて）
// river: none / auto / fords / bridge / bend / island / confluence、road: auto / none / y / x、ponds: 池を作るか、vill: 村の数
FLD.CATS = { open: '平地', hill: '丘陵', mount: '山地', water: '川と湖', coast: '海辺', marsh: '湿地', forest: '森', farm: '畑と村', desert: '荒れ野', fort: '陣と廃墟', sea: '海' };
/* ---------- 海（海戦の戦場は海ごとに作る。bio：島の草木の風土） ---------- */
FLD.SEAS = {
  tyrr:   { n: 'ティレニア海', bio: 'insula',   w: ['エトルリアの', '火山島の', '珊瑚の', '西風の', 'マグロの', '赤い岩の', '鉄の島の', 'サルディニアの', '白い帆の', 'ネアポリスの'] },
  adri:   { n: 'アドリア海',   bio: 'italia',   w: ['北東風の', '琥珀の', '入り組んだ', '灰色の', '海賊の', 'イリュリアの', '松の島の', '霧の', '浅い', '葦の'] },
  ionia:  { n: 'イオニア海',   bio: 'graecia',  w: ['イオニアの', '深い', 'イルカの', '青い', 'コルキュラの', '嵐の', 'ケファレニアの', '夕日の', '海鳥の', '月の'] },
  sicil:  { n: 'シキリアの海', bio: 'insula',   w: ['シキリアの', 'カルタゴの', '岬の', '塩田の', '南風の', 'マグロ漁の', '珊瑚礁の', '燃える山の', '白い砂の', '金の'] },
  aegea:  { n: 'エーゲ海',     bio: 'graecia',  w: ['葡萄酒色の', 'キクラデスの', '白い島の', '北風の', '海神の', '大理石の', 'タコの', '蜂蜜の', 'イルカの', '夜明けの'] },
  levant: { n: '東の海',       bio: 'syria',    w: ['紫貝の', 'キュプロスの', '杉の', '銅の', 'フェニキアの', '東風の', '没薬の', '星の', '黄金の', '帆柱の'] },
  libya:  { n: 'リビアの海',   bio: 'africa',   w: ['砂の', '南の', '熱風の', 'シュルティスの', '乾いた', '海亀の', '塩の', '赤い', 'ナツメヤシの', '陽炎の'] },
  iber:   { n: 'イベリアの海', bio: 'hispania', w: ['銀の', 'バレアレスの', '西の果ての', 'ヘラクレスの', '錫の', 'マグロの', '風の', '石投げの', '大洋の', '岩の'] },
};
FLD.SEA_ORDER = Object.keys(FLD.SEAS);
FLD.SEA_PROV = {
  tyrr: 'roma etruria campania lucania liguria corsica sardinia',
  adri: 'ariminum picenum apulia illyria cisalpina umbria samnium',
  ionia: 'bruttium tarentum epirus aetolia achaea',
  sicil: 'lilybaeum agrigentum syracusae leontini messana carthago utica byzacium hippo sicca cirta',
  aegea: 'pella thessalia chalcidice thracia paeonia euboea athenae corinth sparta ionia caria pergamon bithynia lydia phrygia galatia creta',
  levant: 'rhodos lycia cilicia cyprus antiochia apamea phoenicia gaza judaea damascus seleucia alexandria pelusium memphis thebais',
  libya: 'cyrene emporia gaetulia',
  iber: 'emporiae saguntum cartnova baleares gades mauretania siga iol massilia ilergetes celtiberia castulo lusitania',
};
FLD._sp = null;
FLD.seaOf = (pid) => {
  if (!FLD._sp) { FLD._sp = {}; for (const k in FLD.SEA_PROV) for (const p of FLD.SEA_PROV[k].split(' ')) FLD._sp[p] = k; }
  return FLD._sp[pid] || 'tyrr';
};
const DRY = ['africa', 'aegyptus', 'syria', 'anatolia', 'hispania'];
const GREEN = ['italia', 'gallia', 'thracia', 'graecia', 'hispania', 'anatolia', 'insula', 'syria'];
const OLIVE = ['italia', 'graecia', 'hispania', 'africa', 'syria', 'insula', 'aegyptus'];
FLD.ARCH = {
  plain: { n: ['平原', '広野', '野'], cat: 'open', theme: 'plain', fit: s => 2 + (s.rough < 0.05 ? 2 : 0) - (s.elev > 0.55 ? 2 : 0), tags: { open: 2 }, hints: ['騎兵と戦象が存分に動ける', '数の多い側に有利'], river: 'none', road: 'auto', vill: 1, sculpt: X => X.flatten(0.55) },
  rolling: { n: ['起伏の野', '丘の連なり', 'ゆるやかな丘'], cat: 'hill', theme: 'hill', fit: s => 1 + (s.rough > 0.04 ? 2 : 0), tags: { open: 1, high: 0.5 }, hints: ['小さな丘が点在し、高所の取り合いになる'], river: 'none', road: 'auto', vill: 1, sculpt: X => X.knolls(6, 0.07, 0.12) },
  ridge: { n: ['尾根', '稜線', '高台'], cat: 'hill', theme: 'hill', fit: s => (s.rough > 0.03 || s.elev > 0.35 ? 3 : 1), tags: { high: 2 }, hints: ['こちらは尾根の上に布陣する（攻撃と射撃に利）', '攻め上る敵は疲れ、勢いが落ちる'], river: 'none', road: 'auto', vill: 1, sculpt: X => X.ridgeA(0.64, 0.11) },
  hillfort: { n: ['孤丘', '丘の陣', '見張りの丘'], cat: 'hill', theme: 'hill', fit: s => (s.rough > 0.03 ? 2 : 1), tags: { high: 1.5 }, hints: ['本陣を丘の上に置ける', '四方を見下ろせるが、囲まれると逃げ場がない'], river: 'none', road: 'auto', vill: 0, sculpt: X => { X.mound(0.5, 0.66, 0.16, 0.9); X.flatten(0.3); } },
  saddle: { n: ['鞍部', '二つ丘の間', '峠の原'], cat: 'hill', theme: 'hill', fit: s => s.rough > 0.05 ? 3 : (s.rough > 0.03 ? 1 : 0), tags: { high: 1, narrow: 0.6 }, hints: ['両脇の丘に兵を置ける', '中央の通り道を押さえた方が強い'], river: 'none', road: 'y', vill: 0, sculpt: X => { X.mound(0.14, 0.52, 0.17, 1); X.mound(0.86, 0.5, 0.17, 1); } },
  valley: { n: ['谷間', '谷', '山あいの原'], cat: 'mount', theme: 'mount', fit: s => s.elev > 0.45 || s.rough > 0.07 ? 3 : (s.rough > 0.045 ? 1 : 0), tags: { narrow: 1, rough: 0.5 }, hints: ['両側は山。側面を突かれにくい', '大軍の利が薄れる'], river: 'auto', road: 'y', vill: 1, sculpt: X => X.walls(0.17, 0.24) },
  defile: { n: ['隘路', '峡谷', '切り通し', '山間の狭小部'], cat: 'mount', theme: 'mount', fit: s => (s.elev > 0.5 || s.rough > 0.08) ? 4 : (s.rough > 0.05 ? 1 : 0), tags: { narrow: 2.5, rough: 1 }, hints: ['寡兵で大軍を食い止められる', '騎兵・戦象が広がれない', '山の上に兵を伏せられる'], river: 'none', road: 'y', vill: 0, ponds: false, sculpt: X => X.hourglass(0.13, 0.5) },
  gorge: { n: ['渓谷の道', '川沿いの隘路', '狭い谷川'], cat: 'mount', theme: 'mount', fit: s => (s.elev > 0.45 || s.rough > 0.07) && s.stream ? 4 : ((s.elev > 0.5 || s.rough > 0.08) ? 1 : 0), tags: { narrow: 2, rough: 1, water: 0.5 }, hints: ['谷川と崖に挟まれた細い道', '渡れる所は少ない'], river: 'gorge', road: 'y', vill: 0, ponds: false, sculpt: X => X.hourglass(0.2, 0.55) },
  lakeshore_defile: { n: ['湖畔の隘路', '湖と山の狭間', '湖岸の細道'], cat: 'water', theme: 'mount', fit: s => s.lake && s.lake.d < 12 ? (s.rough > 0.03 ? 6 : 3) : 0, tags: { narrow: 1.5, ambush: 2.5 }, hints: ['敵を湖へ追い落とせる', 'こちらは山の林に伏兵を置ける', '霧が出ると敵は前が見えない'], river: 'none', road: 'y', vill: 0, ponds: false, sculpt: X => { X.lake(0, 0.3, 0.06); X.mountSide(1, 0.36, 0.1); X.forestOn(u => u > 0.62, 0.55); } },
  lakeshore: { n: ['湖のほとり', '湖畔の野', '湖の岸辺'], cat: 'water', theme: 'plain', fit: s => s.lake && s.lake.d < 12 ? 4 : 0, tags: { water: 1 }, hints: ['片側が湖で、回り込まれない'], river: 'none', road: 'y', vill: 1, ponds: false, sculpt: X => X.lake(0, 0.24, 0.05) },
  river_crossing: { n: ['渡し', '浅瀬の原', '渡河点'], cat: 'water', theme: 'river', fit: s => s.river && s.river.d < 11 ? 4 : 0, tags: { water: 1.5 }, hints: ['敵は川を渡らねばならない', '浅瀬を渡ってくる敵を岸で討てる'], river: 'fords', road: 'y', vill: 2 },
  river_bend: { n: ['川の湾曲', '蛇行する川辺', '川に抱かれた野'], cat: 'water', theme: 'river', fit: s => s.river && s.river.d < 11 ? 3 : 0, tags: { water: 1, open: 0.5 }, hints: ['川がこちらの側面を守る', '敵の翼は川に阻まれる'], river: 'bend', road: 'auto', vill: 1 },
  confluence: { n: ['合流点', '二つの川の間', '川の股'], cat: 'water', theme: 'river', fit: s => s.river && s.river.d < 11 ? 2 : 0, tags: { water: 1.5 }, hints: ['二つの川に守られた三角の地', '敵の退き口は狭い'], river: 'confluence', road: 'auto', vill: 1 },
  bridge: { n: ['橋のたもと', '石橋', '木の橋'], cat: 'water', theme: 'river', fit: s => s.river && s.river.d < 11 && s.river.w >= 0.8 ? 3 : 0, tags: { water: 2, narrow: 1 }, hints: ['渡れるのは橋だけ。押さえた方が勝つ'], river: 'bridge', road: 'y', vill: 1 },
  river_island: { n: ['川中島', '中洲の原'], cat: 'water', theme: 'river', fit: s => s.river && s.river.d < 11 && s.river.w >= 1.1 ? 2 : 0, tags: { water: 1.5 }, hints: ['中洲を取れば両岸に睨みが利く'], river: 'island', road: 'auto', vill: 0 },
  coast_beach: { n: ['浜辺', '砂浜', '海辺の野'], cat: 'coast', theme: 'coast', fit: s => s.coast ? 4 : 0, tags: { water: 1, open: 0.5 }, hints: ['片側が海で、回り込まれない', '敵の退き口を海でふさげる'], river: 'none', road: 'y', vill: 1, ponds: false, sculpt: X => X.sea(0, 0.22, 0.05) },
  coast_cliff: { n: ['断崖の海岸', '岩の岬の原', '白い崖'], cat: 'coast', theme: 'coast', fit: s => s.coast && s.rough > 0.04 ? 3 : 0, tags: { water: 1, high: 0.5 }, hints: ['崖の上は守りやすい', '海へ追い落とせば敵は戻れない'], river: 'none', road: 'y', vill: 0, ponds: false, sculpt: X => { X.sea(0, 0.2, 0.05, true); X.knolls(3, 0.06, 0.1); } },
  headland: { n: ['岬', '半島の付け根', '海に突き出た丘'], cat: 'coast', theme: 'coast', fit: s => s.coast ? 2 : 0, tags: { water: 1.5, narrow: 1 }, hints: ['こちらは岬に籠もれる', '首の狭い所を守ればよい'], river: 'none', road: 'y', vill: 1, ponds: false, sculpt: X => X.headland() },
  coastal_pass: { n: ['海と山の隘路', '浜の隘路', '海の門'], cat: 'coast', theme: 'mount', fit: s => s.coast && (s.rough > 0.05 || s.elev > 0.45) ? 6 : 0, tags: { narrow: 2.5, rough: 1 }, hints: ['寡兵で大軍を食い止められる（テルモピュライのように）', '山の抜け道に気をつけよ'], river: 'none', road: 'y', vill: 0, ponds: false, sculpt: X => { X.sea(0, 0.3, 0.04); X.mountSide(1, 0.42, 0.12); } },
  marsh_causeway: { n: ['沼の土手道', '葦の湿地', '湿原の道'], cat: 'marsh', theme: 'marsh', fit: s => s.marsh > 0.15 ? 4 : (s.river && s.river.w >= 1.5 ? 1 : 0), tags: { narrow: 1.5, rough: 1.5 }, hints: ['重い兵が沈む', '土手道を押さえた方が強い'], river: 'none', road: 'none', vill: 0, ponds: false, bio: ['italia', 'gallia', 'aegyptus', 'graecia', 'thracia', 'syria', 'africa'], sculpt: X => X.marshCauseway() },
  marsh_edge: { n: ['沼の縁', '湿原の端', '葦原'], cat: 'marsh', theme: 'marsh', fit: s => s.marsh > 0.08 ? 3 : 0, tags: { rough: 1, water: 0.5 }, hints: ['片翼を沼で守れる', '沼に追い込めば敵は動けない'], river: 'none', road: 'auto', vill: 1, ponds: false, bio: ['italia', 'gallia', 'aegyptus', 'graecia', 'thracia', 'syria', 'africa', 'anatolia'], sculpt: X => X.marshSide(1, 0.3) },
  forest_road: { n: ['森の道', '樫の森', '暗い森'], cat: 'forest', theme: 'forest', fit: s => s.forest > 0.3 ? 4 : (s.forest > 0.18 ? 1 : 0), tags: { ambush: 2, narrow: 1, rough: 1.5 }, hints: ['伏兵に向く', '騎兵・戦象・鎌戦車が動けない'], river: 'none', road: 'y', vill: 0, bio: GREEN, sculpt: X => X.forestOn(() => true, 0.72) },
  forest_edge: { n: ['森の縁', '林の野', '森を背にした原'], cat: 'forest', theme: 'forest', fit: s => s.forest > 0.18 ? 3 : 0, tags: { ambush: 1, open: 0.5 }, hints: ['こちらは森を背にする（伏兵と退路）'], river: 'none', road: 'auto', vill: 1, bio: GREEN, sculpt: X => X.forestOn(u => true, 0.85, v => v > 0.78) },
  clearing: { n: ['森の空き地', '森に囲まれた原'], cat: 'forest', theme: 'forest', fit: s => s.forest > 0.25 ? 2 : 0, tags: { ambush: 1.5 }, hints: ['四方の森から伏兵が出られる'], river: 'none', road: 'auto', vill: 0, bio: GREEN, sculpt: X => X.forestOn(() => true, 0.8, (v, u) => Math.hypot((u - 0.5) * 1.1, v - 0.5) > 0.36) },
  groves: { n: ['オリーブ林', 'ぶどう畑', '果樹園の丘'], cat: 'farm', theme: 'plain', fit: s => s.farm > 0.25 ? 3 : (s.farm > 0.12 ? 1 : 0), tags: { rough: 1, ambush: 0.5 }, hints: ['畑の垣根と果樹が騎兵を妨げる'], river: 'none', road: 'auto', vill: 2, bio: OLIVE, sculpt: X => X.orchards(0.42) },
  farmland: { n: ['麦畑', '畑と村', '村はずれの野'], cat: 'farm', theme: 'plain', fit: s => s.farm > 0.3 ? 3 : 1, tags: { open: 1 }, hints: ['村に籠もれば守りやすい'], river: 'auto', road: 'auto', vill: 3, sculpt: X => X.flatten(0.35) },
  town_edge: { n: ['町はずれ', '城壁のない町', '市場町の前'], cat: 'farm', theme: 'plain', fit: s => s.town || s.villages > 2 ? 3 : 1, tags: { rough: 0.5 }, hints: ['町の家並みに籠もって戦える'], river: 'auto', road: 'y', vill: 0, sculpt: X => X.townBlock(0.5, 0.56, 0.14) },
  desert_plain: { n: ['荒れ野', '乾いた原', '礫の原'], cat: 'desert', theme: 'desert', fit: s => s.sand > 0.2 || s.steppe > 0.4 ? 4 : 0, tags: { open: 2.5 }, hints: ['騎兵と戦象と鎌戦車の戦場', '隠れる所がない'], river: 'none', road: 'auto', vill: 0, ponds: false, bio: DRY, sculpt: X => { X.flatten(0.6); X.sand(0.5); } },
  dunes: { n: ['砂丘', '砂の海', '風紋の原'], cat: 'desert', theme: 'desert', fit: s => s.sand > 0.35 ? 3 : 0, tags: { rough: 1, ambush: 1 }, hints: ['砂丘の陰に兵を隠せる', '重い兵は足を取られる'], river: 'none', road: 'none', vill: 0, ponds: false, bio: ['africa', 'aegyptus', 'syria'], sculpt: X => X.dunes() },
  oasis: { n: ['オアシス', '泉の村', 'ヤシの泉'], cat: 'desert', theme: 'desert', fit: s => s.sand > 0.25 ? 2 : 0, tags: { water: 1 }, hints: ['水場を押さえた方が長く戦える'], river: 'none', road: 'auto', vill: 1, ponds: false, bio: ['africa', 'aegyptus', 'syria'], sculpt: X => { X.sand(0.4); X.oasis(0.5, 0.58); } },
  wadi: { n: ['涸れ川', 'ワディ', '乾いた川床'], cat: 'desert', theme: 'desert', fit: s => s.sand > 0.15 || s.steppe > 0.3 ? 2 : 0, tags: { ambush: 1.5, rough: 0.5 }, hints: ['涸れ川の窪みに兵を隠して進める'], river: 'none', road: 'auto', vill: 0, ponds: false, bio: DRY, sculpt: X => { X.sand(0.3); X.wadi(); } },
  camp: { n: ['野営地の前', '陣営の柵', '砦の前'], cat: 'fort', theme: 'plain', fit: s => 2, tags: { fort: 2 }, hints: ['こちらは柵と堀で囲った陣営から戦える', '騎兵と戦象は柵を越えられない', '門から打って出られる'], river: 'none', road: 'y', vill: 0, ponds: false, sculpt: X => X.flatten(0.4), finish: X => X.camp(0.64) },
  abatis_line: { n: ['逆茂木の陣', '木の柵の線', '倒木の陣'], cat: 'fort', theme: 'forest', fit: s => s.forest > 0.15 ? 2 : 0, tags: { fort: 2 }, hints: ['逆茂木と堀がこちらの前をふさぐ', '騎兵の突撃はほとんど通らない'], river: 'none', road: 'y', vill: 0, bio: GREEN, finish: X => X.abatisLine(0.62) },
  wagon_laager: { n: ['荷車の砦', '車陣', '輜重の円陣'], cat: 'fort', theme: 'plain', fit: s => s.steppe > 0.2 || s.farm > 0.2 ? 2 : 1, tags: { fort: 1.5 }, hints: ['荷車を円く並べた砦に籠もれる'], river: 'none', road: 'auto', vill: 0, bio: ['gallia', 'thracia', 'anatolia', 'hispania'], sculpt: X => X.flatten(0.5), finish: X => X.wagons(0.5, 0.78, 0.13) },
  ruins: { n: ['古い廃墟', '焼けた町の跡', '崩れた砦の原'], cat: 'fort', theme: 'hill', fit: s => 1 + (s.villages > 1 ? 1 : 0), tags: { ambush: 1, rough: 1 }, hints: ['廃墟の壁が矢を遮り、兵を隠す', '騎兵は崩れた石に足を取られる'], river: 'none', road: 'auto', vill: 0, finish: X => X.ruins(0.5, 0.5, 0.32) },
  temple_hill: { n: ['神殿の丘', '聖域の丘', '祭壇の丘'], cat: 'fort', theme: 'hill', fit: s => s.rough > 0.03 ? 2 : 1, tags: { high: 1.5, fort: 1 }, hints: ['神殿の石段と石垣に籠もれる', '丘の上から射下ろせる'], river: 'none', road: 'y', vill: 1, bio: ['italia', 'graecia', 'insula', 'syria', 'aegyptus', 'anatolia', 'africa', 'hispania'], sculpt: X => X.mound(0.5, 0.72, 0.16, 0.86), finish: X => { X.terraceRings(0.5, 0.72, 0.16); X.temple(0.5, 0.74); } },
  terraces: { n: ['段々畑', '石垣の丘', '段丘'], cat: 'hill', theme: 'hill', fit: s => s.rough > 0.04 ? 3 : 0, tags: { high: 1, rough: 1 }, hints: ['石垣の段が敵の足を止める', 'こちらは段の上から戦える'], river: 'none', road: 'y', vill: 1, bio: ['italia', 'graecia', 'insula', 'hispania', 'syria', 'anatolia'], sculpt: X => X.ridgeA(0.62, 0.16), finish: X => X.terraceLines() },
  boulders: { n: ['岩の原', '大岩の野', '石ころの丘'], cat: 'hill', theme: 'hill', fit: s => s.rough > 0.05 ? 3 : (s.elev > 0.4 ? 2 : 0), tags: { rough: 1.5, ambush: 0.5 }, hints: ['大岩が騎兵と戦象を阻む'], river: 'none', road: 'auto', vill: 0, bio: ['graecia', 'anatolia', 'hispania', 'syria', 'thracia', 'insula', 'africa'], finish: X => X.boulders(0.14) },
  urban: { n: ['市街', '町の通り', '城内の街区'], cat: 'fort', theme: 'plain', fit: () => 0, tags: {}, hints: ['家並みに籠もって通りごとに戦う', '騎兵と戦象は通りしか動けない', '広場と神殿が要になる'], river: 'none', road: 'none', vill: 0, ponds: false, urban: true, sculpt: X => X.city() },
  steppe: { n: ['草原', '風の原', '馬の原'], cat: 'open', theme: 'steppe', fit: s => s.steppe > 0.4 ? 4 : 0, tags: { open: 2.5 }, hints: ['騎兵が思うままに駆けられる'], river: 'none', road: 'auto', vill: 0, bio: ['anatolia', 'thracia', 'hispania', 'africa', 'syria'], sculpt: X => X.flatten(0.5) },
};
// 海戦の型（naval）：まず全面を海にして、島・岸・浅瀬・防波堤を置く。海の名ごとに作る
const NAVAL_ARCH = { cat: 'sea', naval: 1, theme: 'coast', river: 'none', road: 'none', vill: 0, ponds: false, mix: { forest: 0.12, farm: 0.15 }, fit: () => 0 };
Object.assign(FLD.ARCH, {
  open_sea: Object.assign({}, NAVAL_ARCH, { n: ['外洋', '沖', '大海原', '外海'], w: 3, tags: { open: 2 }, hints: ['数の多い艦隊が翼を広げて包める', '速い船が回り込みやすい'],
    sculpt: X => { X.seaAll(); if (X.rnd() < 0.55) X.island(X.rnd() < 0.5 ? 0.03 : 0.97, 0.5 + (X.rnd() - 0.5) * 0.22, 0.07, 1); for (let k = 0; k < 2; k++) X.shoalBlob(X.rnd() < 0.5 ? 0.08 : 0.92, 0.36 + X.rnd() * 0.28, 0.03); } }),
  strait: Object.assign({}, NAVAL_ARCH, { n: ['海峡', '狭い水道', '瀬戸', '島と岸の水道'], w: 2, tags: { narrow: 2 }, hints: ['狭い水道では数の差が出にくい', '重い船が押し合いに強く、回り込まれにくい'],
    sculpt: X => { X.seaAll(); X.channel(0.24, 0.52); if (X.e.v % 3 === 0) X.island(0.5 + (X.rnd() - 0.5) * 0.08, 0.5, 0.03, 0.6); } }),
  bay: Object.assign({}, NAVAL_ARCH, { n: ['入り江', '湾', '湾口', '岬に抱かれた海'], w: 2, tags: { narrow: 1, fort: 1 }, hints: ['こちらは湾の中。両脇を岬が守る', '敵は狭い湾口から入ってくる'],
    sculpt: X => { X.seaAll(); X.bayShape(0.47 + (X.rnd() - 0.5) * 0.04, 0.2 + X.rnd() * 0.05, 0.37); } }),
  islands: Object.assign({}, NAVAL_ARCH, { n: ['島々の間', '群島の海', '小島の多い海', '岩礁の海'], w: 2, tags: { ambush: 1.5, rough: 1 }, hints: ['島陰から敵の横腹を突ける', '大きな船は島と浅瀬の間で動きにくい'],
    sculpt: X => { X.seaAll(); X.archipelago(6 + X.e.v % 4); } }),
  coast_shoal: Object.assign({}, NAVAL_ARCH, { n: ['浅瀬の海岸', '砂州の沖', '浅い湾', '干潟の沖'], w: 2, tags: { rough: 1.5, water: 1 }, hints: ['浅瀬は重い船の足を取る', '軽い船が多いほど有利'],
    sculpt: X => { X.seaAll(); X.shore(0, 0.1, 0.05); X.shoalBand(0, 0.1, 0.34); for (let k = 0; k < 3; k++) X.shoalBlob(0.4 + X.rnd() * 0.45, 0.38 + X.rnd() * 0.24, 0.035 + X.rnd() * 0.03); } }),
  harbor: Object.assign({}, NAVAL_ARCH, { n: ['港の入口', '港口', '防波堤の前', '軍港の前'], w: 1, tags: { fort: 2 }, hints: ['こちらは港の中。防波堤が両脇を守る', '敵は狭い港口に押し寄せる'],
    sculpt: X => { X.seaAll(); X.harbor(0.56 + (X.rnd() - 0.5) * 0.04, 0.11 + X.rnd() * 0.04); } }),
  cape: Object.assign({}, NAVAL_ARCH, { n: ['岬の沖', '岬を回る海', '岬の陰', '突き出た岬'], w: 2, tags: { ambush: 1, narrow: 0.6 }, hints: ['岬が敵の進む道をふさぐ', '岬を回ってくる敵の横腹を突ける'],
    sculpt: X => { X.seaAll(); X.shore(0, 0.05, 0.04); X.cape(0, 0.5 + (X.rnd() - 0.5) * 0.06, 0.5 + X.rnd() * 0.1, 0.08); } }),
  estuary: Object.assign({}, NAVAL_ARCH, { n: ['河口', '河口の沖', '大河の口', '三角州の沖'], w: 1, tags: { water: 1, rough: 0.6 }, hints: ['河口の砂州が敵の列を乱す', '負けても川へ逃げ込める'],
    sculpt: X => { X.seaAll(); X.estuary(); } }),
});
FLD.ARCH_ORDER = Object.keys(FLD.ARCH);
// 史実の戦場（その場所の近くで戦うときに候補に出る）
FLD.HIST = [
  { k: 'カンナエ', arch: 'river_bend', bio: 'italia', n: 'カンナエの平原', d: '前216年、ハンニバルが三日月の陣でローマの大軍を包み込んだ。' },
  { k: 'トラシメヌス', arch: 'lakeshore_defile', bio: 'italia', n: 'トラシメヌス湖畔の隘路', d: '前217年、霧の朝、湖と丘の間でローマ軍が待ち伏せされた。' },
  { k: 'トレビア', arch: 'river_crossing', bio: 'gallia', n: 'トレビアの渡し', d: '前218年、冬の冷たい川を渡らされたローマ軍が、伏兵に背後を突かれた。' },
  { k: 'ティキヌス', arch: 'plain', bio: 'gallia', n: 'ティキヌス河畔の原', d: '前218年、騎兵どうしがぶつかり、若きスキピオが父を救った。' },
  { k: 'ザマ', arch: 'plain', bio: 'africa', n: 'ザマの原', d: '前202年、スキピオがハンニバルを破った。戦象は散兵の通り道を駆け抜けた。' },
  { k: 'メタウルス', arch: 'river_bend', bio: 'italia', n: 'メタウルス河畔', d: '前207年、ハスドルバルの援軍がローマの二つの軍に挟まれた。' },
  { k: 'イリパ', arch: 'plain', bio: 'hispania', n: 'イリパの原', d: '前206年、スキピオが陣を入れ替えてカルタゴ軍を破った。' },
  { k: 'バエクラ', arch: 'ridge', bio: 'hispania', n: 'バエクラの高台', d: '前208年、高台に布陣したハスドルバルをスキピオが両翼から攻め上った。' },
  { k: 'キュノスケファライ', arch: 'ridge', bio: 'graecia', n: '犬の頭の丘（キュノスケファライ）', d: '前197年、霧の丘でローマの軍団がマケドニアのファランクスを側面から崩した。' },
  { k: 'マグネシア', arch: 'river_crossing', bio: 'anatolia', n: 'マグネシアの原', d: '前190年、アンティオコスの戦象と鎌戦車がローマ軍の前で暴れた。' },
  { k: 'ラフィア', arch: 'desert_plain', bio: 'syria', n: 'ラフィアの原', d: '前217年、プトレマイオス四世とアンティオコス三世の戦象どうしがぶつかった。' },
  { k: 'パニオン', arch: 'valley', bio: 'syria', n: 'パニオンの谷', d: '前200年、アンティオコス三世がプトレマイオス朝の軍を破った。' },
  { k: 'ピュドナ', arch: 'rolling', bio: 'graecia', n: 'ピュドナの丘', d: '前168年、でこぼこの地でファランクスが崩れ、マケドニアは滅んだ。' },
  { k: 'テラモン', arch: 'coast_beach', bio: 'italia', n: 'テラモンの浜', d: '前225年、ガリア人の大軍がローマの二つの軍に前後から挟まれた。' },
  { k: 'クラスティディウム', arch: 'farmland', bio: 'gallia', n: 'クラスティディウムの野', d: '前222年、マルケッルスがガリアの王を一騎打ちで討った。' },
  { k: 'ベネウェントゥム', arch: 'valley', bio: 'italia', n: 'ベネウェントゥムの谷', d: '前214年、グラックスの奴隷兵がハンノの軍を破った。' },
  { k: 'ヘルドニア', arch: 'plain', bio: 'italia', n: 'ヘルドニアの原', d: '前212年と前210年、ハンニバルがローマ軍を二度打ち破った。' },
  { k: 'アスクルム', arch: 'rolling', bio: 'italia', n: 'アスクルムの丘', d: '前279年、ピュロスが勝ちはしたが多くを失った。' },
  { k: 'バグラダスの戦場', arch: 'plain', bio: 'africa', n: 'バグラダスの平原', d: '前255年、クサンティッポスの戦象がレグルスのローマ軍を踏み砕いた。' },
  { k: '大平原', arch: 'plain', bio: 'africa', n: '大平原（カンピ・マグニ）', d: '前203年、スキピオがシュファクスとハスドルバルの軍を破った。' },
  { k: 'テルモピュライ', arch: 'coastal_pass', bio: 'graecia', n: 'テルモピュライ（熱い門）', d: '海と山に挟まれた門。前191年、アンティオコスの軍がここで破られた。', pass: 1 },
  { k: 'テンペの谷', arch: 'gorge', bio: 'graecia', n: 'テンペの谷', d: 'オリュンポスとオッサの間の深い谷。マケドニアの門。', pass: 1 },
  { k: 'キリキアの門', arch: 'defile', bio: 'anatolia', n: 'キリキアの門', d: 'タウロスを抜ける狭い峠道。', pass: 1 },
  { k: 'アオオスの隘路', arch: 'gorge', bio: 'graecia', n: 'アオオスの隘路', d: '前198年、羊飼いの案内でローマ軍が山の背後に回り込んだ。', pass: 1 },
  { k: 'カウディウムの谷', arch: 'defile', bio: 'italia', n: 'カウディウムの谷', d: '前321年、ローマ軍がサムニウム人に谷の両口をふさがれた。', pass: 1 },
  { k: 'アルペスの峠', arch: 'defile', bio: 'gallia', n: 'アルペスの峠', d: '前218年、ハンニバルが戦象と大軍を連れて雪の峠を越えた。', pass: 1 },
  { k: 'ピュレネの峠', arch: 'valley', bio: 'hispania', n: 'ピュレネの峠', d: 'ヒスパニアとガリアを分ける山の道。', pass: 1 },
  { k: 'シリアの門', arch: 'coastal_pass', bio: 'syria', n: 'シリアの門', d: 'アマノスの山と海の間の細い道。', pass: 1 },
  // 海戦（pids：その州の海で戦うときに候補に出る）
  { k: 'ミュライ', arch: 'cape', sea: 'sicil', pids: 'messana', n: 'ミュライ沖', d: '前260年、ドゥイリウスのローマ艦隊が渡し橋（コルウス）を架けて乗り移り、カルタゴ艦隊を破った。' },
  { k: 'エクノムス', arch: 'open_sea', sea: 'sicil', pids: 'agrigentum syracusae', n: 'エクノムス岬沖', d: '前256年、三百隻を超える艦隊どうしがぶつかった、古代でも最大級の海戦。' },
  { k: 'ドレパナ', arch: 'harbor', sea: 'sicil', pids: 'lilybaeum', n: 'ドレパナの港口', d: '前249年、港を奇襲しようとしたローマ艦隊が、アドヘルバルのカルタゴ艦隊に岸へ押しつけられた。' },
  { k: 'アエガテス', arch: 'islands', sea: 'sicil', pids: 'lilybaeum carthago', n: 'アエガテス諸島沖', d: '前241年、ルタティウスのローマ艦隊が荷を積んだカルタゴ艦隊を襲い、第一次ポエニ戦争を終わらせた。' },
  { k: 'リリュバエウム沖', arch: 'coast_shoal', sea: 'sicil', pids: 'lilybaeum agrigentum', n: 'リリュバエウム沖', d: '前218年、シキリアを狙ったカルタゴの艦隊を、ローマの法務官が夜明けに迎え撃った。' },
  { k: 'シュラクサイの大港', arch: 'harbor', sea: 'sicil', pids: 'syracusae leontini', n: 'シュラクサイの大港', d: '前413年、アテナイの大艦隊が港に閉じ込められて滅んだ。アルキメデスの鉤爪が守る港。' },
  { k: 'エブロ河口', arch: 'estuary', sea: 'iber', pids: 'emporiae saguntum ilergetes baleares', n: 'エブロ河口', d: '前217年、グナエウス・スキピオがマッサリアの船とともに、ヒスパニアのカルタゴ艦隊を河口で破った。' },
  { k: 'サラミス', arch: 'strait', sea: 'aegea', pids: 'athenae corinth', n: 'サラミスの水道', d: '前480年、狭い水道に誘い込まれたペルシアの大艦隊を、ギリシアの三段櫂船が打ち破った。' },
  { k: 'アルテミシオン', arch: 'strait', sea: 'aegea', pids: 'euboea thessalia', n: 'アルテミシオン沖', d: '前480年、テルモピュライと同じ日、ギリシア艦隊がエウボイアの北でペルシア艦隊を食い止めた。' },
  { k: 'アイゴスポタモイ', arch: 'coast_shoal', sea: 'aegea', pids: 'thracia bithynia', n: 'アイゴスポタモイの浜', d: '前405年、浜に船を揚げていたアテナイ艦隊を、リュサンドロスが急襲した。' },
  { k: 'キオス', arch: 'islands', sea: 'aegea', pids: 'ionia pergamon', n: 'キオス沖', d: '前201年、フィリッポス五世の艦隊がロドスとペルガモンの艦隊とぶつかり、大きな損害を出した。' },
  { k: 'ラデ', arch: 'islands', sea: 'aegea', pids: 'caria ionia', n: 'ラデ島沖', d: '前201年、フィリッポス五世がミレトスの沖でロドス艦隊を破った。' },
  { k: 'ミュオネソス', arch: 'cape', sea: 'aegea', pids: 'ionia lydia', n: 'ミュオネソス岬沖', d: '前190年、ローマとロドスの艦隊がアンティオコス三世の艦隊を破り、エーゲ海を制した。' },
  { k: 'エウリュメドン', arch: 'estuary', sea: 'levant', pids: 'lycia cilicia rhodos', n: 'エウリュメドン河口（シデ沖）', d: '前190年、ハンニバルが率いたセレウコス朝の艦隊が、ロドスの艦隊に敗れた。' },
  { k: 'キュプロスのサラミス', arch: 'open_sea', sea: 'levant', pids: 'cyprus', n: 'キュプロスのサラミス沖', d: '前306年、デメトリオスの巨艦がプトレマイオス一世の艦隊を破った。' },
];

/* ---------- 図鑑（全部の戦場を作る） ---------- */
FLD.V = 7;   // 地方ごとの変化の数
FLD.hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
FLD.build = () => {
  if (FLD.LIST) return FLD.LIST;
  const out = [], byName = {};
  for (const a of FLD.ARCH_ORDER) {
    const A = FLD.ARCH[a];
    if (A.naval) continue;
    for (const b of FLD.BIOME_ORDER) {
      if (A.bio && !A.bio.includes(b)) continue;
      const B0 = FLD.BIOMES[b];
      for (let v = 0; v < FLD.V; v++) {
        const id = `${a}.${b}.${v}`, seed = FLD.hashStr(id) % 1000000007;
        const w = B0.w[(v * 3 + FLD.hashStr(a) % 10) % B0.w.length], noun = A.n[(v + FLD.hashStr(b)) % A.n.length];
        const n = w + noun;
        const e = { id, arch: a, bio: b, v, seed, n, mir: (seed >> 3) & 1 ? -1 : 1 };
        (byName[n] = byName[n] || []).push(e);
        out.push(e);
      }
    }
  }
  // 海戦の戦場（海ごと）
  for (const a of FLD.ARCH_ORDER) {
    const A = FLD.ARCH[a];
    if (!A.naval) continue;
    for (const sk of FLD.SEA_ORDER) {
      const S0 = FLD.SEAS[sk];
      for (let v = 0; v < FLD.V; v++) {
        const id = `${a}.${sk}.${v}`, seed = FLD.hashStr(id) % 1000000007;
        const w = S0.w[(v * 3 + FLD.hashStr(a) % 10) % S0.w.length], noun = A.n[(v + FLD.hashStr(sk)) % A.n.length];
        const n = w + noun;
        const e = { id, arch: a, bio: S0.bio, sea: sk, v, seed, n, mir: (seed >> 3) & 1 ? -1 : 1 };
        (byName[n] = byName[n] || []).push(e);
        out.push(e);
      }
    }
  }
  // 同じ名は地方（海）の名を添える
  for (const n in byName) if (byName[n].length > 1) for (const e of byName[n]) e.n = `${n}（${e.sea ? FLD.SEAS[e.sea].n : FLD.BIOMES[e.bio].n}）`;
  // 史実の戦場
  for (const h of FLD.HIST) {
    const id = 'h.' + h.k, seed = FLD.hashStr(id) % 1000000007;
    out.push({ id, arch: h.arch, bio: h.bio || (h.sea ? FLD.SEAS[h.sea].bio : 'italia'), sea: h.sea || null, pids: h.pids ? h.pids.split(' ') : null, v: 0, seed, n: h.n, mir: 1, hist: h.k, d: h.d, pass: !!h.pass });
  }
  FLD.LIST = out; FLD.BY = {}; for (const e of out) FLD.BY[e.id] = e;
  return out;
};
FLD.get = (id) => { FLD.build(); return FLD.BY[id] || null; };
FLD.count = () => FLD.build().length;

/* ---------- 候補の選び方 ---------- */
// この合戦で戦場を選べるか
FLD.applicable = (spec) => !!(spec && ['field', 'skirmish', 'raid', 'bandit', 'nomad', 'naval'].includes(spec.kind) && !spec.noField);
// 市街戦の街区（地方ごと）
FLD.urbanFor = (pid, seed) => { FLD.build(); const b = FLD.biomeOf(pid); const L = FLD.LIST.filter(e => e.arch === 'urban' && e.bio === b); return L.length ? L[(seed >>> 0) % L.length] : FLD.LIST.find(e => e.arch === 'urban'); };
// 土地への合いぐあい（全体マップの土地 s と地方 b）
FLD.fit = (e, s, b) => {
  const A = FLD.ARCH[e.arch]; if (!A) return 0;
  if ((e.bio !== b && !e.hist) || e.sea) return 0;
  return s ? Math.max(0, A.fit(s)) : (e.arch === 'plain' || e.arch === 'farmland' || e.arch === 'rolling' ? 2 : 1);
};
// 候補：型が重ならないように、合いぐあいの重みで選ぶ。史実の戦場が近ければ必ず入れる
FLD.candidates = (spec, k, rnd) => {
  FLD.build(); rnd = rnd || Math.random;
  const s = spec.site || null, b = FLD.biomeOf(spec.pid);
  const out = [];
  if (spec.kind === 'naval') return FLD.navalCandidates(spec, k, rnd);
  // 史実の戦場（名所が近い）
  if (s && typeof GEO !== 'undefined') {
    for (const e of FLD.LIST) {
      if (!e.hist || e.sea) continue;
      const p = (GEO.SITES || []).concat(GEO.PASSES || []).find(x => x.n === e.hist);
      if (p && Math.hypot(p.x - s.x, p.y - s.y) < 22) out.push(e);
    }
  }
  const pool = FLD.LIST.filter(e => !e.hist && !e.sea && e.bio === b && e.arch !== 'urban').map(e => ({ e, w: FLD.fit(e, s, b) })).filter(x => x.w > 0);
  const used = new Set(out.map(e => e.arch));
  while (out.length < k && pool.length) {
    const cand = pool.filter(x => !used.has(x.e.arch));
    if (!cand.length) break;
    const tot = U.sum(cand, x => x.w * x.w);
    let r = rnd() * tot, pick = cand[0];
    for (const x of cand) { r -= x.w * x.w; if (r <= 0) { pick = x; break; } }
    out.push(pick.e); used.add(pick.e.arch);
  }
  return out.slice(0, Math.max(1, k));
};
// 海戦の候補：その海の戦場から型が重ならないように。史実の海戦（その州の海）は必ず入れる
FLD.navalCandidates = (spec, k, rnd) => {
  const sk = FLD.seaOf(spec.pid), from = spec.args && spec.args.from, out = [];
  for (const e of FLD.LIST) if (e.hist && e.sea && e.pids && (e.pids.includes(spec.pid) || (from && e.pids.includes(from)))) out.push(e);
  U.shuffle(out); out.length = Math.min(out.length, Math.max(1, k - 1));
  const pool = FLD.LIST.filter(e => !e.hist && e.sea === sk).map(e => ({ e, w: FLD.ARCH[e.arch].w || 1 }));
  const used = new Set(out.map(e => e.arch));
  while (out.length < k && pool.length) {
    const cand = pool.filter(x => !used.has(x.e.arch));
    if (!cand.length) break;
    const tot = U.sum(cand, x => x.w * x.w);
    let r = rnd() * tot, pick = cand[0];
    for (const x of cand) { r -= x.w * x.w; if (r <= 0) { pick = x; break; } }
    out.push(pick.e); used.add(pick.e.arch);
  }
  return out.slice(0, Math.max(1, k));
};
// AI の好み（side から見たこの戦場の値打ち。A側に布陣するとして）
FLD.prefer = (spec, e, side) => {
  const A = FLD.ARCH[e.arch], tg = A.tags || {};
  const us = spec.units.filter(u => u.side === side), them = spec.units.filter(u => u.side !== side);
  const n0 = U.sum(us, u => u.n), n1 = U.sum(them, u => u.n), ratio = n0 / Math.max(1, n1);
  const share = (L, f) => U.sum(L.filter(f), u => u.n) / Math.max(1, U.sum(L, u => u.n));
  if (A.naval) {
    // 海戦：速い船・軽い船・重い船・櫓のある船の割合で
    const T = u => D.UT[u.t] || {};
    const fast = share(us, u => T(u).fast), ffast = share(them, u => T(u).fast), light = share(us, u => T(u).light), flight = share(them, u => T(u).light);
    const heavy = share(us, u => (T(u).mass || 0) >= 6), fheavy = share(them, u => (T(u).mass || 0) >= 6), rngS = share(us, u => T(u).range);
    let w = 0;
    w += (tg.open || 0) * ((ratio - 1) * 0.8 + (fast - ffast) * 1.5);
    w += (tg.narrow || 0) * ((1 / Math.max(0.2, ratio) - 1) * 0.9 + (heavy - fheavy) * 1.0);
    w += (tg.ambush || 0) * (0.25 + fast * 0.4);
    w += (tg.rough || 0) * ((light - flight) * 1.6 - heavy * 0.3);
    w += (tg.water || 0) * (ratio < 1 ? 0.4 : 0.1);
    w += (tg.fort || 0) * ((1 / Math.max(0.2, ratio) - 1) * 0.8 + 0.3 + rngS * 0.5);
    return w;
  }
  const mobile = u => { const c = D.UT[u.t]?.cls; return c === 'cav' || c === 'chr'; };
  const cav = share(us, mobile), fcav = share(them, mobile), rng = share(us, u => D.UT[u.t]?.cls === 'rng'), pike = share(us, u => !!D.UT[u.t]?.pike);
  let v = 0;
  v += (tg.open || 0) * ((ratio - 1) * 0.8 + (cav - fcav) * 2 + pike * 1.0);
  v += (tg.narrow || 0) * ((1 / Math.max(0.2, ratio) - 1) * 0.9 + (fcav - cav) * 1.5 - pike * 0.2);
  v += (tg.high || 0) * (0.45 + rng * 1.2);
  v += (tg.ambush || 0) * (0.25 + fcav * 0.6);
  v += (tg.water || 0) * (ratio < 1 ? 0.45 : 0.12);
  v += (tg.rough || 0) * ((fcav - cav) * 1.2 - pike * 0.9);
  v += (tg.fort || 0) * ((1 / Math.max(0.2, ratio) - 1) * 0.8 + 0.3 + fcav * 0.8 - cav * 0.4);
  return v;
};

/* ---------- 地形を彫る（62_field.js の B.genField から呼ぶ） ---------- */
FLD.ctx = (bt, e, aSide, FE, FF) => {
  const f = bt.fine, FC = f.cols, FR = f.rows, ft = f.type, T = D.T;
  const sd = e.seed, nA = U.noise2(sd + 901), nB = U.noise2(sd + 1303);
  const aBottom = aSide !== 1;    // A側が下（味方＝0の側）
  const mir = e.mir || 1;
  const rnd = U.rng(sd + 17);
  const X = {
    bt, e, f, FC, FR, ft, FE, FF, T, rnd, mir, aBottom,
    // 細格子 → (u, v)
    uv: (i) => { const c = i % FC, r = (i - c) / FC; let u = (c + 0.5) / FC, v = (r + 0.5) / FR; if (mir < 0) u = 1 - u; if (!aBottom) v = 1 - v; return [u, v]; },
    // (u, v) → 世界座標
    xy: (u, v) => { if (mir < 0) u = 1 - u; if (!aBottom) v = 1 - v; return [u * bt.W, v * bt.H]; },
    n: (u, v, k = 1) => nA(u * 3.1 * k + 2.3, v * 4.1 * k + 1.7, 3),
    n2: (u, v, k = 1) => nB(u * 5.3 * k + 7.1, v * 6.7 * k + 3.3, 2),
    each: (cb) => { for (let i = 0; i < FC * FR; i++) { const [u, v] = X.uv(i); cb(i, u, v); } },
    put: (i, t, e) => { ft[i] = t; if (e != null) FE[i] = e; },
    hi: (i, e) => { FE[i] = Math.max(FE[i], e); },
    lo: (i, e) => { FE[i] = Math.min(FE[i], e); },
    // 起伏をならす（k: 0〜1）
    flatten: (k) => X.each((i, u, v) => { FE[i] = 0.46 + (FE[i] - 0.46) * (1 - k); const t = ft[i]; if (t === T.MOUNT || t === T.ROCK) ft[i] = T.HILL; if (ft[i] === T.HILL && FE[i] < 0.55) ft[i] = T.PLAIN; }),
    // 小さな丘
    knolls: (n, r0, r1) => { for (let k = 0; k < n; k++) X.mound(0.12 + rnd() * 0.76, 0.2 + rnd() * 0.6, r0 + rnd() * (r1 - r0), 0.72 + rnd() * 0.12); },
    // 丘（中心 u0,v0、半径 r、頂の高さ h）
    mound: (u0, v0, r, h = 0.85) => X.each((i, u, v) => {
      const d = Math.hypot((u - u0) * 1.0, (v - v0) * 1.33) / r * (1 + (X.n(u, v, 2) - 0.5) * 0.4); if (d >= 1) return;
      const e = 0.46 + (h - 0.46) * (1 - d * d);
      X.hi(i, e); const t = ft[i];
      if (FE[i] > 0.6 && t !== T.RIVER && t !== T.POND && t !== T.SEA) ft[i] = (FE[i] > 0.8 && X.n2(u, v) > 0.6) ? T.ROCK : (t === T.FOREST || t === T.GROVE ? t : T.HILL);
    }),
    // A側の前に尾根（v0 の所を横切る）
    ridgeA: (v0, wv) => X.each((i, u, v) => {
      const c = v0 + (X.n(u, 0.3) - 0.5) * 0.07 + Math.sin(u * 5.1 + X.e.seed % 5) * 0.025, d = (v - c) / wv;
      // 前（B側）は急に、後ろ（A側）はゆるやかに下る
      const k = d < 0 ? d * d * 1.8 : d * d * 0.35;
      if (k > 4) return;
      const e = 0.6 + 0.3 * Math.exp(-k) * (0.85 + X.n2(u, v) * 0.3);
      X.hi(i, e); if (FE[i] > 0.6) ft[i] = FE[i] > 0.83 && X.n2(u, v, 2) > 0.6 ? T.ROCK : (ft[i] === T.FOREST || ft[i] === T.GROVE ? ft[i] : T.HILL);
    }),
    // 谷の両壁（左右の山。幅 w0〜w1）
    walls: (w0, w1) => X.each((i, u, v) => {
      const w = w0 + (w1 - w0) * X.n(0.2, v, 1.5) , wob = (X.n(u, v, 3) - 0.5) * 0.05;
      const d = Math.min(u, 1 - u) - w + wob;
      if (d < 0) { X.put(i, d < -0.035 ? T.MOUNT : T.ROCK); X.hi(i, 0.82 + Math.min(0.12, -d * 0.8)); }
      else if (d < 0.05) { X.hi(i, 0.62); if (ft[i] === T.PLAIN || ft[i] === T.DIRT || ft[i] === T.GRASS) ft[i] = T.HILL; }
    }),
    // 砂時計の隘路（中央 v=0.5 で一番狭い）
    hourglass: (minW, maxW) => X.each((i, u, v) => {
      const t = Math.abs(v - 0.5) * 2, hw = (minW + (maxW - minW) * Math.pow(t, 1.6)) / 2;
      const cx = 0.5 + Math.sin(v * 7.3 + X.e.seed % 7) * 0.035 + (X.n(0.5, v, 2) - 0.5) * 0.06;
      const d = Math.abs(u - cx) - hw + (X.n(u, v, 4) - 0.5) * 0.04;
      if (d > 0.03) { X.put(i, T.MOUNT); X.hi(i, 0.84 + Math.min(0.12, d * 0.6)); }
      else if (d > 0) { X.put(i, T.ROCK); X.hi(i, 0.74); }
      else if (d > -0.04) { X.hi(i, 0.6); if (ft[i] === T.MARSH || ft[i] === T.FIELD) ft[i] = T.HILL; }
      else if (ft[i] === T.MOUNT || ft[i] === T.ROCK) X.put(i, T.HILL, 0.6);
    }),
    // 片側の山（side: 0 左 / 1 右、端からの幅 w）
    mountSide: (side, w, wob) => X.each((i, u, v) => {
      const x = side ? 1 - u : u, d = x - w + (X.n(u, v, 3) - 0.5) * (wob || 0.06) * 2;
      if (d < -0.04) { X.put(i, T.MOUNT); X.hi(i, 0.84 + Math.min(0.12, -d * 0.6)); }
      else if (d < 0) { X.put(i, X.n2(u, v) > 0.5 ? T.ROCK : T.HILL); X.hi(i, 0.7); }
      else if (d < 0.08) { X.hi(i, 0.6); if (ft[i] === T.PLAIN || ft[i] === T.DIRT) ft[i] = T.HILL; }
    }),
    // 片側の湖（POND）
    lake: (side, w, wob) => X.each((i, u, v) => {
      const x = side ? 1 - u : u, d = x - w - (X.n(0.1, v, 2.5) - 0.5) * (wob || 0.05) * 2;
      if (d < 0) X.put(i, T.POND, 0.26);
      else if (d < 0.025) { if (ft[i] !== T.MOUNT && ft[i] !== T.ROCK) ft[i] = X.n2(u, v) > 0.55 ? T.MARSH : T.SAND; X.lo(i, 0.4); }
      else if (d < 0.07) { if (ft[i] === T.MOUNT || ft[i] === T.ROCK) ft[i] = T.HILL; X.lo(i, 0.48); }
    }),
    // 片側の海（cliff: 崖の海岸）
    sea: (side, w, wob, cliff) => X.each((i, u, v) => {
      const x = side ? 1 - u : u, d = x - w - (X.n(0.1, v, 2) - 0.5) * (wob || 0.05) * 2;
      if (d < -0.02) X.put(i, T.SEA, 0.2);
      else if (d < 0) X.put(i, cliff ? T.SEA : T.SHOAL, 0.25);
      else if (d < (cliff ? 0.02 : 0.04)) { X.put(i, cliff ? T.CLIFF : T.SAND); if (cliff) X.hi(i, 0.8); else X.lo(i, 0.36); }
      else if (d < 0.08) { if (cliff) { X.hi(i, 0.66); if (ft[i] === T.PLAIN || ft[i] === T.DIRT) ft[i] = T.HILL; } else { X.lo(i, 0.44); if (ft[i] === T.MOUNT || ft[i] === T.ROCK) ft[i] = T.HILL; } }
    }),
    // 岬：A側の三方が海、首は狭い
    headland: () => X.each((i, u, v) => {
      // 首は v=0.46 あたりで細く、その先（A側）は丸くふくらむ
      const neckV = 0.46, bulb = 0.7;
      let hw;
      if (v < neckV - 0.06) hw = 0.7;
      else if (v < neckV + 0.04) hw = 0.16 + Math.max(0, (neckV - v)) * 4;
      else hw = 0.16 + 0.24 * Math.sin(Math.min(1, (v - neckV - 0.04) / (bulb - neckV)) * Math.PI / 2) * (v > 0.92 ? Math.max(0.3, 1 - (v - 0.92) * 6) : 1);
      const d = Math.abs(u - 0.5) - hw + (X.n(u, v, 3) - 0.5) * 0.06;
      if (v > neckV - 0.06 && d > 0.03) X.put(i, T.SEA, 0.2);
      else if (v > neckV - 0.06 && d > 0) X.put(i, T.SAND, 0.36);
      else if (v > 0.58 && d < -0.05) { X.hi(i, 0.6 + (v - 0.58) * 0.6); if (ft[i] === T.PLAIN || ft[i] === T.DIRT) ft[i] = T.HILL; }
    }),
    // 湿地と土手道
    marshCauseway: () => {
      X.each((i, u, v) => { const lo = 0.2 + (X.n(u, 0.1, 3) - 0.5) * 0.12, hi = 0.8 + (X.n(u, 0.9, 3) - 0.5) * 0.12; if (v > lo && v < hi && X.n(u, v, 2) > 0.3 + Math.max(0, 0.08 - Math.min(v - lo, hi - v)) * 4) { if (ft[i] !== T.MOUNT) X.put(i, X.n2(u, v, 2) > 0.72 ? T.POND : T.MARSH, 0.36); } });
      const n = 2 + (X.e.seed % 2);
      for (let k = 0; k < n; k++) { const u0 = (k + 0.5) / n + (rnd() - 0.5) * 0.12; X.road([[u0, -0.05], [u0 + (rnd() - 0.5) * 0.25, 0.5], [u0 + (rnd() - 0.5) * 0.2, 1.05]], 2.4); }
    },
    marshSide: (side, w) => X.each((i, u, v) => { const x = side ? 1 - u : u, d = x - w + (X.n(u, v, 2) - 0.5) * 0.1; if (d < 0 && ft[i] !== T.MOUNT) X.put(i, X.n2(u, v, 3) > 0.75 ? T.POND : T.MARSH, 0.38); }),
    // 森を広げる（where(u,v)、濃さ k、area(v,u) で範囲）
    forestOn: (where, k, area) => X.each((i, u, v) => {
      if (area && !area(v, u)) return; if (!where(u, v)) return;
      const t = ft[i]; if (t === T.POND || t === T.SEA || t === T.SHOAL || t === T.RIVER || t === T.MOUNT || t === T.ROAD || t === T.SAND || t === T.CLIFF) return;
      const q = X.n2(u, v, 2.5); if (q < k) ft[i] = q < k - 0.22 ? T.FOREST : T.GROVE;
    }),
    // 果樹園（列）
    orchards: (k) => X.each((i, u, v) => {
      const t = ft[i]; if (t !== T.PLAIN && t !== T.FIELD && t !== T.DIRT && t !== T.GRASS && t !== T.HILL) return;
      const blk = X.n(u, v, 2.2); if (blk > k) return;
      // 区画ごとに木の列（列の向きは区画で変わる）
      const c = i % FC, r = (i - c) / FC, alt = GEO.hash(Math.floor(c / 24), Math.floor(r / 24), 5) < 0.5;
      if ((alt ? c : r) % 3 === 0) ft[i] = T.ORCHARD; else if (t === T.PLAIN || t === T.GRASS) ft[i] = T.DIRT;
    }),
    // 砂（k: 割合）
    sand: (k) => X.each((i, u, v) => { const t = ft[i]; if ((t === T.PLAIN || t === T.DIRT || t === T.GRASS || t === T.FIELD || t === T.HILL) && X.n2(u, v, 1.5) < k) ft[i] = T.SAND; if (t === T.FOREST || t === T.MARSH) ft[i] = T.DIRT; }),
    dunes: () => X.each((i, u, v) => {
      const t = ft[i]; if (t === T.MOUNT || t === T.SEA) return;
      const w = Math.sin((u * 2.2 + v * 6.5 + X.n(u, v, 1.5) * 2.4) * Math.PI);
      if (w > 0.55) X.put(i, T.DUNE, 0.55 + (w - 0.55) * 0.5); else ft[i] = w > 0.1 ? T.SAND : (t === T.FOREST || t === T.GROVE ? T.DIRT : (X.n2(u, v) > 0.5 ? T.SAND : T.DIRT));
    }),
    oasis: (u0, v0) => X.each((i, u, v) => {
      const d = Math.hypot(u - u0, (v - v0) * 1.33) * (1 + (X.n(u, v, 3) - 0.5) * 0.4);
      if (d < 0.05) X.put(i, T.POND, 0.3); else if (d < 0.1) ft[i] = T.GROVE; else if (d < 0.16 && X.n2(u, v, 3) > 0.45) ft[i] = T.FIELD;
    }),
    wadi: () => { const pts = []; for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push([u, 0.47 + Math.sin(u * 5 + X.e.seed % 5) * 0.06 + (X.n(u, 0.5, 2) - 0.5) * 0.08]); } X.line(pts, 0.045, (i, d) => { X.put(i, d < 0.6 ? T.DIRT : T.SAND); X.lo(i, 0.3 + d * 0.12); }); },
    // 町（家並みと通り）
    townBlock: (u0, v0, r) => X.each((i, u, v) => {
      const d = Math.max(Math.abs(u - u0), Math.abs(v - v0) * 1.33) / r; if (d > 1.15) return;
      const t = ft[i]; if (t === T.POND || t === T.SEA || t === T.RIVER || t === T.MOUNT) return;
      const c = i % FC, r0 = (i - c) / FC, gx = Math.floor(c / 9), gy = Math.floor(r0 / 9);
      if (d > 1) { ft[i] = T.FIELD; return; }
      ft[i] = (c % 9 < 2 || r0 % 9 < 2) ? T.ROAD : (GEO.hash(gx, gy, 41) < 0.1 ? T.PLAZA : T.HOUSE);
    }),
    // 四角（u0..u1, v0..v1）に cb(i, u, v)
    rect: (u0, v0, u1, v1, cb) => { const [xa, ya] = X.xy(u0, v0), [xb, yb] = X.xy(u1, v1); const fc = X.f.cell; const c0 = Math.max(0, Math.floor(Math.min(xa, xb) / fc)), c1 = Math.min(FC - 1, Math.floor(Math.max(xa, xb) / fc)), r0 = Math.max(0, Math.floor(Math.min(ya, yb) / fc)), r1 = Math.min(FR - 1, Math.floor(Math.max(ya, yb) / fc)); for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = r * FC + c; const [u, v] = X.uv(i); cb(i, u, v); } },
    land: (t) => t !== T.POND && t !== T.SEA && t !== T.SHOAL && t !== T.RIVER && t !== T.MOUNT && t !== T.CLIFF,
    // 陣営：柵と外の堀で囲む。前と横に門
    camp: (v0) => {
      const u0 = 0.2, u1 = 0.8, v1 = 0.99, gates = [0.36, 0.64];
      X.each((i, u, v) => {
        if (u < u0 - 0.04 || u > u1 + 0.04 || v < v0 - 0.04) return;
        const inX = u >= u0 && u <= u1, inV = v >= v0;
        const dEdge = Math.min(inX ? Math.min(u - u0, u1 - u) : -Math.min(Math.abs(u - u0), Math.abs(u - u1)), inV ? v - v0 : -(v0 - v));
        const front = Math.abs(v - v0) < 0.012 && inX, side = (Math.abs(u - u0) < 0.008 || Math.abs(u - u1) < 0.008) && inV && v < v1;
        const gap = front && gates.some(g => Math.abs(u - g) < 0.035) || side && Math.abs(v - 0.82) < 0.035;
        if ((front || side) && !gap) { if (X.land(ft[i])) X.put(i, T.PALISADE); }
        else if (!gap && ((v < v0 - 0.012 && v > v0 - 0.034 && inX) || (inV && v < v1 && ((u < u0 - 0.008 && u > u0 - 0.03) || (u > u1 + 0.008 && u < u1 + 0.03))))) { if (X.land(ft[i])) { X.put(i, T.DITCH); X.lo(i, 0.36); } }
        else if (inX && inV && dEdge > 0 && (ft[i] === T.FOREST || ft[i] === T.GROVE || ft[i] === T.MARSH)) ft[i] = T.DIRT;
      });
    },
    // 逆茂木の線と外の堀（隙間が二つ）
    abatisLine: (v0) => { const gaps = [0.3 + X.rnd() * 0.1, 0.6 + X.rnd() * 0.1]; X.each((i, u, v) => { const c = v0 + (X.n(u, 0.2, 2) - 0.5) * 0.04, gap = gaps.some(g => Math.abs(u - g) < 0.03); if (gap || u < 0.06 || u > 0.94 || !X.land(ft[i])) return; if (Math.abs(v - c) < 0.014) X.put(i, T.ABATIS); else if (v < c - 0.016 && v > c - 0.04) { X.put(i, T.DITCH); X.lo(i, 0.38); } }); },
    // 荷車の円陣
    wagons: (u0, v0, r) => X.each((i, u, v) => { const d = Math.hypot(u - u0, (v - v0) * 1.33), a = Math.atan2(v - v0, u - u0); if (Math.abs(d - r) < 0.012 && !(Math.abs(a + Math.PI / 2) < 0.22 || Math.abs(a) < 0.18) && X.land(ft[i])) X.put(i, T.WAGON); else if (d < r - 0.015 && (ft[i] === T.FOREST || ft[i] === T.GROVE)) ft[i] = T.DIRT; }),
    // 廃墟（崩れた壁の四角が散らばる）
    ruins: (u0, v0, r) => {
      for (let k = 0; k < 22; k++) {
        const cu = u0 + (X.rnd() - 0.5) * r * 2, cv = v0 + (X.rnd() - 0.5) * r * 1.6, w = 0.03 + X.rnd() * 0.05, h = 0.02 + X.rnd() * 0.04;
        X.rect(cu - w / 2, cv - h / 2, cu + w / 2, cv + h / 2, (i, u, v) => { if (!X.land(ft[i])) return; const edge = Math.min(u - (cu - w / 2), (cu + w / 2) - u) < 0.008 || Math.min(v - (cv - h / 2), (cv + h / 2) - v) < 0.008; if (edge && X.n2(u, v, 3) > 0.35) X.put(i, T.STONEWALL); else if (!edge) X.put(i, T.RUINS); });
      }
    },
    // 神殿（石の基壇と広場）
    temple: (u0, v0) => X.rect(u0 - 0.09, v0 - 0.05, u0 + 0.09, v0 + 0.05, (i, u, v) => { if (!X.land(ft[i]) && ft[i] !== T.MOUNT) return; X.put(i, Math.abs(u - u0) < 0.06 && Math.abs(v - v0) < 0.03 ? T.TEMPLE : T.PLAZA); }),
    // 丘をめぐる石垣（輪。上り口あり）
    terraceRings: (u0, v0, r) => X.each((i, u, v) => { const d = Math.hypot(u - u0, (v - v0) * 1.33) / r; for (const k of [0.45, 0.75]) if (Math.abs(d - k) < 0.035 && Math.abs(u - u0) > 0.03 && X.land(ft[i])) X.put(i, T.STONEWALL); }),
    // 等高線に沿った石垣（段々畑）
    terraceLines: () => X.each((i, u, v) => { const e = FE[i]; if (!X.land(ft[i]) || e < 0.58) return; const k = (e - 0.58) / 0.05; const fr = k - Math.floor(k); if (fr < 0.11 && X.n2(u, v, 4) > 0.22) X.put(i, T.STONEWALL); else if (ft[i] === T.HILL && X.n(u, v, 3) > 0.45) ft[i] = T.ORCHARD; }),
    // 大岩
    boulders: (k) => X.each((i, u, v) => { if (v < 0.18 || v > 0.86 || !X.land(ft[i])) return; const q = X.n2(u, v, 5); if (q > 1 - k) { X.put(i, T.BOULDER); X.hi(i, 0.55 + (q - (1 - k)) * 1.5); } }),
    // 市街（全面の町。大通り・広場・神殿・家並み。A側の前にバリケード）
    city: () => {
      const blk = 0.11 + X.rnd() * 0.03, st = 0.028;
      const avenue = 0.5 + (X.rnd() - 0.5) * 0.08;
      X.each((i, u, v) => {
        let t = ft[i]; if (t === T.SEA || t === T.POND) return;
        const bu = (u + 0.37) / blk, bv = (v + 0.13) / (blk * 0.8), fu = bu - Math.floor(bu), fv = bv - Math.floor(bv);
        const street = fu < st / blk || fv < st / (blk * 0.8) || Math.abs(u - avenue) < 0.03;
        const forum = Math.abs(u - avenue) < 0.13 && Math.abs(v - 0.5) < 0.07;
        X.lo(i, 0.5); FE[i] = Math.max(0.44, FE[i]);
        if (forum) { const tm = Math.abs(u - avenue - 0.07) < 0.04 && Math.abs(v - 0.5) < 0.04; X.put(i, tm ? T.TEMPLE : T.PLAZA); return; }
        if (street) { X.put(i, T.ROAD); return; }
        const h = GEO.hash(Math.floor(bu), Math.floor(bv), 7);
        X.put(i, h < 0.08 ? T.PLAZA : h < 0.13 ? T.RUINS : T.HOUSE);
      });
      // バリケード（A側の前、通りをふさぐ荷車と石）
      X.each((i, u, v) => { if (ft[i] === T.ROAD && Math.abs(v - 0.63) < 0.01 && X.n2(u, v, 3) > 0.25 && Math.abs(u - avenue) > 0.035) X.put(i, X.n(u, v) > 0.5 ? T.WAGON : T.STONEWALL); });
    },
    // ---- 海戦の地形 ----
    seaAll: () => { for (let i = 0; i < FC * FR; i++) { ft[i] = T.SEA; FE[i] = 0.2; } },
    // 陸にする（d：岸からの深さ。浜・林・丘・岩）
    landAt: (i, u, v, d) => {
      if (d < 0.012) { X.put(i, T.SAND, 0.36); return; }
      const q = X.n2(u, v, 2), e = 0.44 + Math.min(0.26, d * 1.7) * (0.6 + X.n(u, v, 2) * 0.7);
      const dry = X.e.bio === 'africa' || X.e.bio === 'syria' || X.e.bio === 'aegyptus';
      X.put(i, e > 0.7 && q > 0.58 ? T.ROCK : e > 0.63 ? T.HILL : (q > (dry ? 0.7 : 0.6) ? T.FOREST : q > (dry ? 0.5 : 0.42) ? T.GROVE : dry && q < 0.3 ? T.SAND : T.PLAIN), e);
    },
    shoalAt: (i) => { if (ft[i] === T.SEA) X.put(i, T.SHOAL, 0.25); },
    // 島（中心 u0,v0、半径 r、sh：周りの浅瀬の幅の倍率）
    island: (u0, v0, r, sh = 1) => { const R = r * 1.7 + 0.03 * sh; X.rect(u0 - R, v0 - R / 1.33, u0 + R, v0 + R / 1.33, (i, u, v) => {
      const dd = Math.hypot(u - u0, (v - v0) * 1.33), a = Math.atan2(v - v0, u - u0);
      const rr = r * (1 + 0.26 * Math.sin(a * 3 + u0 * 17) + 0.14 * Math.sin(a * 5 + v0 * 11) + (X.n(u, v, 3) - 0.5) * 0.5);
      if (dd < rr) X.landAt(i, u, v, rr - dd); else if (dd < rr + 0.022 * sh) X.shoalAt(i);
    }); },
    shoalBlob: (u0, v0, r) => X.rect(u0 - r * 1.6, v0 - r * 1.3, u0 + r * 1.6, v0 + r * 1.3, (i, u, v) => { const dd = Math.hypot(u - u0, (v - v0) * 1.33) / r * (1 + (X.n(u, v, 4) - 0.5) * 0.6); if (dd < 1) X.shoalAt(i); }),
    // 岸（side：0 左 / 1 右。端からの幅 w）
    shore: (side, w, wob) => X.each((i, u, v) => {
      const x = side ? 1 - u : u, d = w + (X.n(0.1 + side * 0.8, v, 2.2) - 0.5) * (wob || 0.05) * 2 - x;
      if (d > 0) X.landAt(i, u, v, d); else if (d > -0.025) X.shoalAt(i);
    }),
    // 水道（v=0.5 で一番狭い。両岸は陸）
    channel: (minW, maxW) => X.each((i, u, v) => {
      const t = Math.abs(v - 0.5) * 2, hw = (minW + (maxW - minW) * t) / 2;
      const cx = 0.5 + Math.sin(v * 5.3 + X.e.seed % 7) * 0.03 + (X.n(0.5, v, 2) - 0.5) * 0.05;
      const d = Math.abs(u - cx) - hw + (X.n(u, v, 3) - 0.5) * 0.05;
      if (d > 0) X.landAt(i, u, v, d); else if (d > -0.02) X.shoalAt(i);
    }),
    // 湾（vm で口が一番狭い。口より奥＝A側は内に広がる）
    bayShape: (vm, mh, ih) => X.each((i, u, v) => {
      const t = v - vm; if (t < -0.09) return;
      const hw = t < 0 ? mh + Math.pow(-t / 0.09, 1.5) * (0.64 - mh) : mh + Math.pow(Math.min(1, t / 0.2), 0.8) * (ih - mh);
      const d = Math.abs(u - 0.5) - hw + (X.n(u, v, 3) - 0.5) * 0.05;
      if (d > 0) X.landAt(i, u, v, d); else if (d > -0.02) X.shoalAt(i);
    }),
    // 群島：布陣する海（両軍の後ろ寄り）の真ん中は空ける。島は両軍の間と両脇に
    archipelago: (n) => {
      const placed = [];
      for (let tries = 0; tries < 120 && placed.length < n; tries++) {
        const u0 = 0.05 + X.rnd() * 0.9, v0 = 0.08 + X.rnd() * 0.84, r = 0.025 + X.rnd() * 0.05;
        const mid = v0 - r > 0.36 && v0 + r < 0.64, flank = u0 < 0.12 || u0 > 0.88;
        if (!mid && !flank) continue;
        if (placed.some(p => Math.hypot(p[0] - u0, (p[1] - v0) * 1.33) < p[2] + r + 0.06)) continue;
        placed.push([u0, v0, r]); X.island(u0, v0, r, 1.2);
      }
      for (let j = 0; j < 3; j++) X.shoalBlob(0.15 + X.rnd() * 0.7, 0.4 + X.rnd() * 0.2, 0.025 + X.rnd() * 0.025);
    },
    // 浅瀬の帯（side の岸から from〜to）。ところどころに水路
    shoalBand: (side, from, to) => X.each((i, u, v) => {
      const x = side ? 1 - u : u, w = (X.n(0.3, v, 3) - 0.5) * 0.06;
      if (x > from && x < to + w && X.n2(u * 0.6, v * 2.2, 2) > 0.3) X.shoalAt(i);
    }),
    // 岬（side の岸から reach まで、v0 のあたり。根元の太さ th）
    cape: (side, v0, reach, th) => X.each((i, u, v) => {
      const x = side ? 1 - u : u; if (x > reach + 0.05) return;
      const k = Math.min(1, x / reach), half = th * (1 - Math.pow(k, 2.2)) + 0.012;
      const vc = v0 + Math.sin(k * 2.2) * 0.035 + (X.n(x, 0.5, 2) - 0.5) * 0.03;
      const d = half - Math.abs(v - vc) + (X.n(u, v, 3) - 0.5) * 0.03;
      if (d > 0 && x < reach) X.landAt(i, u, v, d * 1.4); else if (d > -0.022 && x < reach + 0.03) X.shoalAt(i);
    }),
    // 港：両脇の岸と家並み、口の狭い防波堤、先に灯台
    harbor: (vMole, gap) => {
      X.shore(0, 0.07, 0.02); X.shore(1, 0.07, 0.02);
      X.each((i, u, v) => {
        const dv = Math.abs(v - vMole), du = Math.abs(u - 0.5);
        if (dv < 0.011 && u > 0.04 && u < 0.96 && du > gap) X.put(i, T.STONEWALL, 0.5);
        else if (dv < 0.022 && Math.abs(du - gap - 0.012) < 0.016) X.put(i, T.TEMPLE, 0.55);
        else if (v > vMole + 0.02 && (u < 0.075 || u > 0.925) && ft[i] !== T.SEA && ft[i] !== T.SHOAL) { const c = i % FC, r = (i - c) / FC; X.put(i, (c % 8 < 1 || r % 8 < 1) ? T.ROAD : T.HOUSE, 0.46); }
      });
    },
    // 河口：A側の後ろに陸と川の口、両軍の間に砂州の弧（切れ目が三つ）
    estuary: () => {
      const gaps = [0.2 + X.rnd() * 0.1, 0.5 + (X.rnd() - 0.5) * 0.1, 0.7 + X.rnd() * 0.1];
      X.each((i, u, v) => {
        const coast = 0.93 + (X.n(u, 0.95, 2.4) - 0.5) * 0.05;
        const river = Math.abs(u - 0.5 - Math.sin(v * 9) * 0.02) < 0.035;
        if (v > coast) { if (river) X.put(i, T.RIVER, 0.3); else if (v < coast + 0.02) X.put(i, T.SAND, 0.36); else X.put(i, X.n2(u, v, 3) > 0.55 ? T.MARSH : T.PLAIN, 0.42); return; }
        const arc = 0.5 + Math.pow((u - 0.5) * 2, 2) * 0.08 + (X.n(u, 0.5, 3) - 0.5) * 0.04;
        if (Math.abs(v - arc) < 0.032 && !gaps.some(g => Math.abs(u - g) < 0.045)) X.shoalAt(i);
        else if (v > coast - 0.04 && !river) X.shoalAt(i);
      });
    },
    // 線を塗る（点は (u,v)、幅は u の割合）
    line: (pts, w, cb) => { const P = pts.map(([u, v]) => X.xy(u, v)); B.fieldLine(X.f, P, w * bt.W, (i, d) => cb(i, d / (w * bt.W / 2))); },
    road: (pts, wMul) => { const w = Math.max(X.f.cell * (wMul || 2.4), bt.W * 0.012); const P = pts.map(([u, v]) => X.xy(u, v)); B.fieldLine(X.f, P, w, (i) => { const t = ft[i]; if (t === T.POND || t === T.RIVER || t === T.MARSH) ft[i] = t === T.MARSH ? T.ROAD : T.BRIDGE; else if (t === T.MOUNT || t === T.ROCK) ft[i] = T.PATH; else if (t !== T.FORD && t !== T.BRIDGE) ft[i] = T.ROAD; FE[i] = Math.max(FE[i], 0.4); }); bt.feat.roads.push({ pts: P, w, major: true }); },
  };
  return X;
};
// 川の形（mode）。ft と FE を塗り、bt.feat.river を作る
FLD.river = (bt, X, mode, name) => {
  const { W, H } = bt, f = bt.fine, ft = X.ft, FE = X.FE, T = D.T, rnd = X.rnd, fc = f.cell;
  const wR = U.clamp(W * 0.032, Math.max(fc * 4, bt.tile * 2.2), W * 0.06);
  const paint = (pts, w, fordsAt) => {
    const bank = w / 2 + fc * 2.5;
    B.fieldLine(f, pts, bank * 2, (i, d) => {
      if (d <= w / 2) { if (ft[i] !== T.SEA) { ft[i] = T.RIVER; FE[i] = Math.min(FE[i], 0.3); } }
      else { const t = ft[i]; if (t === T.MOUNT || t === T.HILL || t === T.ROCK || t === T.FOREST) ft[i] = T.PLAIN; FE[i] = Math.min(FE[i], 0.42); }
    });
  };
  let pts = [], extra = [];
  const wav = (u, amp, ph) => Math.sin(u * 6.28 * 1.3 + ph) * amp;
  const ph = rnd() * 6.28;
  if (mode === 'bend') {
    // A側の片翼（左下）を抱くように曲がる
    for (let k = -2; k <= 42; k++) { const t = k / 40, a = t * Math.PI / 2; pts.push(X.xy(0.5 * Math.sin(a) + (X.n(t, 0.2, 2) - 0.5) * 0.04, 1.06 - 0.64 * Math.cos(a) + (X.n(0.3, t, 2) - 0.5) * 0.03)); }
  } else if (mode === 'gorge') {
    for (let k = -2; k <= 42; k++) { const v = k / 40; pts.push(X.xy(0.5 + wav(v, 0.04, ph) + (X.n(0.5, v, 3) - 0.5) * 0.05 + 0.08, v)); }
  } else {
    // 横に流れる（v≈0.5）
    for (let k = -2; k <= 42; k++) { const u = k / 40; pts.push(X.xy(u, 0.5 + wav(u, 0.035, ph) + (X.n(u, 0.5, 2) - 0.5) * 0.06)); }
    if (mode === 'confluence') { for (let k = 0; k <= 20; k++) { const t = k / 20; extra.push(X.xy(0.5 + (rnd() - 0.5) * 0.02 + Math.sin(t * 4 + ph) * 0.04, 1.05 - t * 0.55)); } }
    if (mode === 'island') { for (let k = 0; k <= 24; k++) { const u = 0.25 + k / 24 * 0.5; extra.push(X.xy(u, 0.5 + 0.09 * Math.sin((k / 24) * Math.PI) + wav(u, 0.02, ph))); } }
  }
  const w = mode === 'gorge' ? wR * 0.6 : wR;
  paint(pts, w);
  if (extra.length) paint(extra, w * 0.7);
  // 浅瀬と橋
  const fords = [];
  if (mode === 'fords' || mode === 'auto' || mode === 'confluence' || mode === 'island' || mode === 'bend') {
    const nF = mode === 'fords' ? 3 : 2;
    for (let k = 0; k < nF; k++) {
      const fu = 0.12 + (k + 0.2 + rnd() * 0.6) * 0.76 / nF, [fx] = X.xy(fu, 0.5);
      fords.push(fx);
      const len = Math.max(bt.tile * 2.2, W * 0.035);
      for (let r = 0; r < f.rows; r++) for (let c = Math.floor((fx - len / 2) / fc); c <= Math.floor((fx + len / 2) / fc); c++) { if (c < 0 || c >= f.cols) continue; const i = r * f.cols + c; if (ft[i] === T.RIVER) ft[i] = T.FORD; }
    }
  } else if (mode === 'gorge') {
    // 渡れる所は二つだけ
    for (const vv of [0.3, 0.7]) { const [x, y] = X.xy(0.58, vv); const len = Math.max(bt.tile * 2, H * 0.03); for (let r = Math.floor((y - len / 2) / fc); r <= Math.floor((y + len / 2) / fc); r++) for (let c = 0; c < f.cols; c++) { if (r < 0 || r >= f.rows) continue; const i = r * f.cols + c; if (ft[i] === T.RIVER) ft[i] = T.FORD; } }
  }
  bt.feat.river = { pts, w, n: name || null, fords, mode };
  if (extra.length) bt.feat.streams.push({ pts: extra, w: w * 0.7 });
};
// 合戦の始めに：A側の部隊は自分の側にある高所・森へ（伏兵向きの型なら隠れて始める）
FLD.note = (e, aSide, mySide) => {
  const A = FLD.ARCH[e.arch]; const mine = aSide === mySide;
  return { name: e.n, cat: FLD.CATS[A.cat], hints: A.hints.slice(), mine };
};

/* ---------- 小さな絵（候補と図鑑） ---------- */
FLD._thumbs = new Map();
FLD.thumb = (id, aSide = 0, w = 120, h = 160) => {
  const key = id + '|' + aSide + '|' + w;
  if (FLD._thumbs.has(key)) return FLD._thumbs.get(key);
  const e = FLD.get(id); if (!e) return null;
  const Wd = 600, cols = 48, rows = 64;
  const bt = { spec: { kind: 'field', seed: e.seed, field: { id, a: aSide }, theme: FLD.ARCH[e.arch].theme, site: null, pid: null }, W: Wd, H: Wd * rows / cols, tile: Wd / cols, cols, rows };
  bt.rng = U.rng(e.seed);
  try { B.genField(bt); } catch (err) { console.warn(err); return null; }
  const f = bt.fine, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  const rgb = D.TILE.map(t => { const n = parseInt(t.c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = Math.min(f.cols - 1, Math.floor(x / w * f.cols)), r = Math.min(f.rows - 1, Math.floor(y / h * f.rows)), i = r * f.cols + c;
    const t = f.type[i], k = rgb[t] || rgb[0];
    const e1 = f.elev[i], e2 = f.elev[Math.max(0, i - f.cols - 1)];
    const sh = U.clamp(1 + (e1 - e2) * 3.2, 0.7, 1.3) * (0.82 + e1 * 0.32);
    const o = (y * w + x) * 4; d[o] = k[0] * sh; d[o + 1] = k[1] * sh; d[o + 2] = k[2] * sh; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // 布陣の印（A側＝下が味方の色）
  g.fillStyle = 'rgba(194,69,47,.85)'; g.fillRect(w * 0.3, h * 0.73, w * 0.4, 3);
  g.fillStyle = 'rgba(40,40,48,.85)'; g.fillRect(w * 0.3, h * 0.26, w * 0.4, 3);
  if (FLD._thumbs.size > 80) FLD._thumbs.delete(FLD._thumbs.keys().next().value);
  FLD._thumbs.set(key, cv);
  return cv;
};

/* ---------- 戦場選び（どちらが選ぶか・AI の選び方） ---------- */
FLD.touOf = (spec, s) => {
  const sd = spec.sides[s]; if (!sd) return 0;
  let t = (sd.cmd && sd.cmd.tou) || 0;
  if (sd.gunshi && sd.gunshi.chi) t = Math.max(t, sd.gunshi.chi - 5);
  return t;
};
// 守る側（その州の持ち主）。どちらも選べないときは守る側が地の利を持つ
FLD.defender = (spec) => { try { const o = G.prov[spec.pid]?.o; const i = spec.sides.findIndex(s => s.c === o && !s.bandit && !s.nomad); return i >= 0 ? i : 1; } catch (e) { return 1; } };
FLD.decide = (spec) => {
  const t0 = FLD.touOf(spec, 0), t1 = FLD.touOf(spec, 1);
  const top = Math.max(t0, t1);
  const chooser = top >= FLD.MIN_TOU ? (t0 >= t1 ? 0 : 1) : -1;
  const k = chooser >= 0 ? FLD.choiceCount(top) : 3;
  const cands = FLD.candidates(spec, k, U.rng((spec.seed || 1) + 5));
  return { chooser, tou: [t0, t1], k, cands };
};
FLD.aiPick = (spec, cands, side) => U.maxBy(cands, e => FLD.prefer(spec, e, side) + (e.hist ? 0.2 : 0)) || cands[0];
FLD.apply = (spec, e, aSide, how) => {
  spec.field = { id: e.id, a: aSide, how: how || '' };
  if (spec.args) spec.args.field = spec.field;
  const A = FLD.ARCH[e.arch];
  if (A && A.theme) spec.theme = A.theme;
  // 地の利を得た側は士気が上がる（選んだ将がいれば大きく）
  const sd = spec.sides && spec.sides[aSide];
  if (sd && !spec._fieldMor) { sd.morale = (sd.morale || 0) + (how === 'none' ? 2 : 4); spec._fieldMor = true; }
  FLD.seen(e.id);
  return spec;
};
// 見た戦場（図鑑。端末に残す）
FLD.SEEN_KEY = 'chichukai.fieldsSeen';
FLD.seenAll = () => { try { return JSON.parse(localStorage.getItem(FLD.SEEN_KEY) || '{}') || {}; } catch (e) { return {}; } };
FLD.seen = (id) => { try { const m = FLD.seenAll(); m[id] = (m[id] || 0) + 1; localStorage.setItem(FLD.SEEN_KEY, JSON.stringify(m)); } catch (e) {} };
