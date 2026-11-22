/* =========================================================
   地中海覇道 — static data
   ========================================================= */
const D = {};

D.START_YEAR = -218;

/* ---------- 地中海の七つの国 ---------- */
// bonus: 合戦での強さの倍率（t_兵種 は兵種ごと、inf/rng/cav/chr/sie は兵の系統ごと）。comm 商い、water 水上と海
D.COUNTRIES = {
  rome:  { id: 'rome',  name: 'ローマ',           color: '#a52a2a', mapc: '#a52a2a', cap: 'roma',       trait: '市民の軍団', desc: 'イタリアを束ねた共和政の国。元老院と二人の執政官が治める。市民と同盟市から兵を集め、負けても負けても新しい軍団を送り出す。重装歩兵の戦列と散兵に優れる。', bonus: { inf: 1.08, t_heavy: 1.06, t_velite: 1.1 }, aggr: 0.7, laws: ['census', 'socii'] },
  carth: { id: 'carth', name: 'カルタゴ',         color: '#6c3483', mapc: '#6c3483', cap: 'carthago',   trait: '海の帝国と傭兵', desc: 'フェニキア人の海の都。交易の富で、リビア人・イベリア人・ガリア人・ヌミディア人の傭兵を雇う。バルカ家がヒスパニアに新しい領土を築き、戦象も擁する。', bonus: { comm: 1.25, water: 1.2, t_eleph: 1.1, t_sling: 1.1 }, aggr: 0.6, laws: ['merc'] },
  mace:  { id: 'mace',  name: 'マケドニア',       color: '#2e5c9a', mapc: '#2e5c9a', cap: 'pella',      trait: 'ファランクス', desc: 'アレクサンドロス大王の故国。若き王フィリッポス五世がギリシアの覇権を握る。長槍のファランクスと王の騎兵が軍の柱。', bonus: { t_phal: 1.12, t_hcav: 1.06 }, aggr: 0.55, laws: ['hetairoi'] },
  sele:  { id: 'sele',  name: 'セレウコス朝',     color: '#3d7a3a', mapc: '#3d7a3a', cap: 'antiochia',  trait: '大王の大軍', desc: 'アジアの大王国。若き王アンティオコス三世が失地の回復をめざす。ファランクスに重装騎兵・騎射兵・戦象・鎌戦車が加わる、東西の兵の寄せ集め。', bonus: { cav: 1.06, t_eleph: 1.08, t_cataph: 1.08 }, aggr: 0.6, laws: [] },
  ptol:  { id: 'ptol',  name: 'プトレマイオス朝', color: '#c9a227', mapc: '#c9a227', cap: 'alexandria', trait: 'ナイルの富', desc: 'エジプトの王国。ナイルの穀物と大灯台の港の富は随一。大図書館に学者が集まる。海軍は強いが、陸の兵は傭兵とエジプト人の兵に頼る。', bonus: { comm: 1.2, water: 1.15 }, aggr: 0.35, laws: ['granary'] },
  syra:  { id: 'syra',  name: 'シュラクサイ',     color: '#2a9d9a', mapc: '#2a9d9a', cap: 'syracusae',  trait: 'アルキメデスの兵器', desc: 'シキリア東部のギリシア人の王国。老王ヒエロン二世はローマの友。城壁とアルキメデスの発明した兵器で守りは固い。', bonus: { rng: 1.08, sie: 1.25, t_xbow: 1.15 }, aggr: 0.2, laws: ['walls'] },
  numi:  { id: 'numi',  name: 'ヌミディア',       color: '#c46a2b', mapc: '#c46a2b', cap: 'cirta',      trait: '鞍なしの騎兵', desc: '北アフリカの騎馬の民の王国。東のマッシュリと西のマサエシュリの王たちが争う。手綱も鞍もなく馬を操る軽騎兵は地中海一。', bonus: { cav: 1.12, t_lcav: 1.06 }, aggr: 0.45, laws: [] },
};
D.CORDER = ['rome', 'carth', 'mace', 'sele', 'ptol', 'syra', 'numi'];
D.BANDIT = { id: 'bandit', name: '賊', color: '#6d5a44', mapc: '#6d5a44' };
D.NOMAD = { id: 'nomad', name: 'ガリア人', color: '#7d6b3d', mapc: '#7d6b3d' };
// 史実の跡継ぎ [その年から, 名]（王が死んだとき、年が来ていればこの名で即位する）
D.HEIRS = { rome: [[-233, 'ファビウス'], [-205, 'スキピオ'], [-184, 'カトー'], [-150, '小スキピオ']], carth: [[-250, '大ハンノ'], [-196, 'ハンニバル'], [-152, 'ハスドルバル（最後の将）']], mace: [[-239, 'デメトリオス二世'], [-229, 'アンティゴノス三世'], [-221, 'フィリッポス五世'], [-180, 'ペルセウス'], [-149, 'アンドリスコス']], sele: [[-261, 'アンティオコス二世'], [-246, 'セレウコス二世'], [-226, 'セレウコス三世'], [-223, 'アンティオコス三世'], [-188, 'セレウコス四世'], [-176, 'アンティオコス四世'], [-164, 'アンティオコス五世'], [-162, 'デメトリオス一世']], ptol: [[-246, 'プトレマイオス三世'], [-222, 'プトレマイオス四世'], [-205, 'プトレマイオス五世'], [-181, 'プトレマイオス六世'], [-145, 'プトレマイオス八世']], syra: [[-216, 'ヒエロニュモス'], [-214, 'エピキュデス']], numi: [[-230, 'シュファクス'], [-202, 'マシニッサ'], [-148, 'ミキプサ']] };   // 名簿にいる人物なら、その人が立つ（src/46_events.js の W.succession）
// 国ごとの都の呼び名・君主の呼び名（文の中で使う）
D.RULER_T = { rome: '執政官', carth: 'スフェス', mace: '王', sele: '大王', ptol: 'ファラオ', syra: '王', numi: '王' };

/* @@PROV_BEGIN — data/mk_geo.py が作る（手で直さない） */
/* ---------- 州（戦略マップ 1000×720） ---------- */
// t: 地勢 plain/hill/mount/forest/river/marsh/steppe/coast/desert  cul: 文化（村の名・肖像）
D.PROVINCES = [
  {"id":"roma","name":"ローマ","o":"rome","x":449.6,"y":231.1,"pop":95,"t":"plain","cul":"latin","cap":true,"desc":"七つの丘の都。元老院とローマ市民の街。"},
  {"id":"etruria","name":"エトルリア","o":"rome","x":430.0,"y":201.9,"pop":60,"t":"hill","cul":"etrus","desc":"古いエトルリア人の都市が丘に並ぶ。鉄と陶器の産地。トラシメヌス湖がある。"},
  {"id":"umbria","name":"ウンブリア","o":"rome","x":454.6,"y":210.1,"pop":35,"t":"mount","cul":"latin","desc":"アペニン山脈の中の小さな町々。"},
  {"id":"picenum","name":"ピケヌム","o":"rome","x":470.0,"y":195.6,"pop":35,"t":"hill","cul":"latin","desc":"アドリア海に面した丘の地。アンコナの港。"},
  {"id":"ariminum","name":"アリミヌム","o":"rome","x":451.0,"y":176.5,"pop":25,"t":"plain","cul":"latin","desc":"ガリアへの門となる植民市。"},
  {"id":"campania","name":"カンパニア","o":"rome","x":485.0,"y":252.0,"pop":85,"t":"plain","cul":"latin","desc":"肥沃な平野。豊かなカプアとギリシア人の港ネアポリス。"},
  {"id":"samnium","name":"サムニウム","o":"rome","x":495.4,"y":250.7,"pop":40,"t":"mount","cul":"latin","desc":"山の民サムニウム人の地。かつてローマと三度戦った。"},
  {"id":"apulia","name":"アプリア","o":"rome","x":515.0,"y":243.8,"pop":45,"t":"plain","cul":"latin","desc":"アウフィドゥス川の平原。カンナエはここにある。"},
  {"id":"lucania","name":"ルカニア","o":"rome","x":517.0,"y":269.2,"pop":30,"t":"mount","cul":"latin","desc":"森と山に覆われた南の地。"},
  {"id":"bruttium","name":"ブルッティウム","o":"rome","x":525.0,"y":297.2,"pop":35,"t":"mount","cul":"latin","desc":"イタリアのつま先。シラの森とレギオンの港。"},
  {"id":"tarentum","name":"タレントゥム","o":"rome","x":544.6,"y":267.5,"pop":55,"t":"coast","cul":"greek","desc":"マグナ・グラエキア最大のギリシア都市と良港。"},
  {"id":"cisalpina","name":"ガリア・キサルピナ","o":"rome","x":395.0,"y":151.1,"pop":50,"t":"river","cul":"celt","desc":"パドゥス（ポー）川の平野。植民市プラケンティアとクレモナがガリア人と境を接する。"},
  {"id":"liguria","name":"リグリア","o":"rome","x":378.0,"y":167.1,"pop":25,"t":"mount","cul":"celt","desc":"山と海に挟まれた細い土地。気の荒いリグリア人の地。"},
  {"id":"massilia","name":"マッサリア","o":"rome","x":307.4,"y":195.6,"pop":40,"t":"coast","cul":"greek","desc":"ギリシア人の古い港町。ローマの友邦。"},
  {"id":"emporiae","name":"エンポリオン","o":"rome","x":262.4,"y":225.3,"pop":20,"t":"coast","cul":"greek","desc":"ヒスパニアの北東にあるマッサリアの植民市。ローマ軍の上陸地。"},
  {"id":"sardinia","name":"サルディニア","o":"rome","x":382.2,"y":299.2,"pop":35,"t":"mount","cul":"punic","desc":"穀物の島。カラリスの港。"},
  {"id":"corsica","name":"コルシカ","o":"rome","x":388.0,"y":226.1,"pop":15,"t":"mount","cul":"celt","desc":"険しい山の島。"},
  {"id":"lilybaeum","name":"シキリア西部","o":"rome","x":455.0,"y":334.0,"pop":45,"t":"hill","cul":"punic","desc":"リリュバエウムとパノルムス。第一次ポエニ戦争でローマが得た。"},
  {"id":"agrigentum","name":"アクラガス","o":"rome","x":471.6,"y":347.7,"pop":35,"t":"hill","cul":"greek","desc":"神殿の丘が並ぶシキリア南岸の都。"},
  {"id":"messana","name":"メッサナ","o":"rome","x":509.6,"y":327.2,"pop":25,"t":"hill","cul":"greek","desc":"イタリアと海峡を挟む町。マメルティニがローマを頼った。"},
  {"id":"illyria","name":"イリュリア","o":"rome","x":590.0,"y":250.2,"pop":25,"t":"mount","cul":"celt","desc":"アポロニアとデュッラキオン。ローマの保護下にある沿岸。"},
  {"id":"syracusae","name":"シュラクサイ","o":"syra","x":503.0,"y":352.6,"pop":70,"t":"coast","cul":"greek","cap":true,"desc":"シキリア最大のギリシア都市。ヒエロン王とアルキメデスの町。"},
  {"id":"leontini","name":"レオンティノイ","o":"syra","x":499.0,"y":341.6,"pop":30,"t":"plain","cul":"greek","desc":"カタネの平野とエトナの麓。"},
  {"id":"carthago","name":"カルタゴ","o":"carth","x":404.0,"y":361.9,"pop":95,"t":"plain","cul":"punic","cap":true,"desc":"海の都。二重の港と元老院、バルカ家とハンノの党派。"},
  {"id":"utica","name":"ウティカ","o":"carth","x":395.0,"y":356.9,"pop":40,"t":"river","cul":"punic","desc":"バグラダス川の河口の古い港。"},
  {"id":"byzacium","name":"ビュザキウム","o":"carth","x":408.0,"y":389.9,"pop":45,"t":"plain","cul":"punic","desc":"ハドルメトゥムとオリーブの平野。"},
  {"id":"emporia","name":"エンポリア","o":"carth","x":470.0,"y":473.7,"pop":30,"t":"desert","cul":"punic","desc":"レプティスとオエア。砂漠の縁の交易の町。"},
  {"id":"sicca","name":"シッカ","o":"carth","x":378.0,"y":379.7,"pop":25,"t":"hill","cul":"numid","desc":"ヌミディアとの境の丘。ザマの町がある。"},
  {"id":"cartnova","name":"カルタゴ・ノウァ","o":"carth","x":179.0,"y":336.5,"pop":50,"t":"hill","cul":"punic","desc":"バルカ家がヒスパニアに築いた新しいカルタゴ。銀山を抱える。"},
  {"id":"gades","name":"ガデス","o":"carth","x":82.0,"y":359.4,"pop":45,"t":"coast","cul":"punic","desc":"ヘラクレスの柱の外にあるフェニキア人の古い港。"},
  {"id":"castulo","name":"カストゥロ","o":"carth","x":128.0,"y":326.4,"pop":30,"t":"mount","cul":"iber","desc":"バエティス川の上流の銀山の町。"},
  {"id":"saguntum","name":"サグントゥム","o":"carth","x":190.0,"y":287.0,"pop":30,"t":"hill","cul":"iber","desc":"ハンニバルが八か月の包囲で落としたローマの友邦。"},
  {"id":"celtiberia","name":"ケルティベリア","o":"carth","x":148.0,"y":248.9,"pop":25,"t":"mount","cul":"iber","desc":"ケルト系の戦士が住む高原。ヌマンティアがある。"},
  {"id":"ilergetes","name":"イレルゲテス","o":"carth","x":212.4,"y":238.3,"pop":25,"t":"hill","cul":"iber","desc":"イベルス（エブロ）川の北の部族の地。"},
  {"id":"lusitania","name":"ルシタニア","o":"carth","x":44.0,"y":297.2,"pop":20,"t":"hill","cul":"iber","desc":"大西洋に面した西の部族の地。"},
  {"id":"baleares","name":"バレアレス","o":"carth","x":257.0,"y":288.3,"pop":15,"t":"hill","cul":"iber","desc":"投石の名手を出す島々。"},
  {"id":"cirta","name":"キルタ","o":"numi","x":332.2,"y":371.9,"pop":45,"t":"hill","cul":"numid","cap":true,"desc":"ヌミディア王の都。断崖の上の町。"},
  {"id":"hippo","name":"ヒッポ・レギウス","o":"numi","x":355.2,"y":361.9,"pop":25,"t":"coast","cul":"numid","desc":"王の港。"},
  {"id":"iol","name":"イオル","o":"numi","x":244.0,"y":369.6,"pop":20,"t":"coast","cul":"numid","desc":"マサエシュリの海辺の町。"},
  {"id":"siga","name":"シガ","o":"numi","x":174.0,"y":403.9,"pop":30,"t":"plain","cul":"numid","desc":"西ヌミディア（マサエシュリ）の王の都。"},
  {"id":"mauretania","name":"マウレタニア","o":"numi","x":90.0,"y":401.3,"pop":20,"t":"mount","cul":"numid","desc":"ティンギスと山の民の地。"},
  {"id":"gaetulia","name":"ガエトゥリア","o":"numi","x":310.0,"y":408.9,"pop":10,"t":"steppe","cul":"numid","desc":"高原と砂漠の縁を遊牧する民の地。"},
  {"id":"pella","name":"ペラ","o":"mace","x":647.0,"y":259.1,"pop":60,"t":"plain","cul":"maced","cap":true,"desc":"マケドニア王の都。フィリッポス五世の宮廷。"},
  {"id":"thessalia","name":"テッサリア","o":"mace","x":644.0,"y":292.1,"pop":45,"t":"plain","cul":"greek","desc":"馬の育つ平原。ラリサとキュノスケファライ。"},
  {"id":"chalcidice","name":"カルキディケ","o":"mace","x":666.0,"y":269.2,"pop":35,"t":"hill","cul":"greek","desc":"テッサロニケと三つの半島。"},
  {"id":"thracia","name":"トラキア","o":"mace","x":706.0,"y":243.8,"pop":30,"t":"hill","cul":"celt","desc":"ヘブロス川と山の部族の地。"},
  {"id":"paeonia","name":"パイオニア","o":"mace","x":632.0,"y":238.8,"pop":20,"t":"mount","cul":"maced","desc":"北の山国。ダルダニア人と境を接する。"},
  {"id":"epirus","name":"エペイロス","o":"mace","x":618.0,"y":294.6,"pop":30,"t":"mount","cul":"greek","desc":"アンブラキアと山の国。ピュロスの故郷。"},
  {"id":"aetolia","name":"アイトリア","o":"mace","x":632.0,"y":312.4,"pop":25,"t":"mount","cul":"greek","desc":"山の戦士の同盟。マケドニアの宿敵。"},
  {"id":"euboea","name":"エウボイア","o":"mace","x":675.0,"y":317.5,"pop":25,"t":"hill","cul":"greek","desc":"カルキス。ギリシアの足枷の一つ。"},
  {"id":"athenae","name":"アテナイ","o":"mace","x":674.6,"y":328.9,"pop":50,"t":"hill","cul":"greek","desc":"学問と哲学の都。ピレウスの港。"},
  {"id":"corinth","name":"コリントス","o":"mace","x":657.0,"y":334.0,"pop":40,"t":"hill","cul":"greek","desc":"アクロコリントスの城砦。地峡を押さえるギリシアの足枷。"},
  {"id":"achaea","name":"アカイア","o":"mace","x":638.0,"y":331.5,"pop":35,"t":"hill","cul":"greek","desc":"アカイア同盟の町々。"},
  {"id":"sparta","name":"スパルタ","o":"mace","x":648.6,"y":350.5,"pop":25,"t":"mount","cul":"greek","desc":"エウロタス川の谷。昔日の誇りを残す戦士の国。"},
  {"id":"antiochia","name":"アンティオキア","o":"sele","x":923.2,"y":375.9,"pop":85,"t":"river","cul":"syria","cap":true,"desc":"オロンテス河畔の王都。セレウコス朝の西の都。"},
  {"id":"apamea","name":"アパメイア","o":"sele","x":928.0,"y":395.7,"pop":45,"t":"plain","cul":"syria","desc":"戦象と軍馬の厩舎がある軍の都。"},
  {"id":"phoenicia","name":"フェニキア","o":"sele","x":908.0,"y":442.0,"pop":50,"t":"coast","cul":"syria","desc":"テュロスとシドン。アンティオコスが奪った港町。"},
  {"id":"cilicia","name":"キリキア","o":"sele","x":898.0,"y":356.9,"pop":40,"t":"plain","cul":"anat","desc":"タルソス。キリキアの門の南の平野。"},
  {"id":"seleucia","name":"東方（メソポタミア）","o":"sele","x":984.0,"y":386.1,"pop":70,"t":"river","cul":"syria","desc":"エウフラテスの向こう、ティグリス河畔のセレウキアと東方の諸州。"},
  {"id":"phrygia","name":"フリュギア","o":"sele","x":808.0,"y":322.6,"pop":30,"t":"hill","cul":"anat","desc":"高原の国。アパメイア・ケライナイ。"},
  {"id":"lydia","name":"リュディア","o":"sele","x":760.8,"y":317.8,"pop":45,"t":"plain","cul":"anat","desc":"サルデイス。ヘルモス川の平野。"},
  {"id":"pergamon","name":"ペルガモン","o":"sele","x":745.0,"y":299.7,"pop":35,"t":"hill","cul":"greek","desc":"丘の上の王城と図書館。"},
  {"id":"bithynia","name":"ビテュニア","o":"sele","x":800.0,"y":264.2,"pop":30,"t":"hill","cul":"anat","desc":"ニコメディアとプロポンティスの岸。"},
  {"id":"galatia","name":"ガラティア","o":"sele","x":856.0,"y":289.6,"pop":25,"t":"steppe","cul":"celt","desc":"小アジアに住みついたガリア人の高原。"},
  {"id":"alexandria","name":"アレクサンドリア","o":"ptol","x":798.4,"y":505.0,"pop":100,"t":"coast","cul":"egypt","cap":true,"desc":"大灯台と大図書館の都。プトレマイオス王家の宮廷。"},
  {"id":"memphis","name":"メンフィス","o":"ptol","x":822.0,"y":537.2,"pop":80,"t":"river","cul":"egypt","desc":"ナイルの谷の古い都。ピラミッドの地。"},
  {"id":"thebais","name":"テーバイス","o":"ptol","x":848.0,"y":637.5,"pop":60,"t":"river","cul":"egypt","desc":"上エジプト。テーベの神殿の地。"},
  {"id":"pelusium","name":"ペルシオン","o":"ptol","x":846.0,"y":511.8,"pop":25,"t":"marsh","cul":"egypt","desc":"エジプトの東の門。湿地と砦。"},
  {"id":"cyrene","name":"キュレネ","o":"ptol","x":637.2,"y":464.8,"pop":40,"t":"hill","cul":"greek","desc":"ギリシア人の高原の町。シルピオンの産地。"},
  {"id":"cyprus","name":"キュプロス","o":"ptol","x":872.0,"y":403.9,"pop":35,"t":"mount","cul":"greek","desc":"銅と船材の島。"},
  {"id":"gaza","name":"ガザ","o":"ptol","x":889.0,"y":497.8,"pop":30,"t":"desert","cul":"syria","desc":"エジプトへの道の入口。ラフィアの戦場が近い。"},
  {"id":"judaea","name":"ユダヤ","o":"ptol","x":904.4,"y":488.2,"pop":30,"t":"hill","cul":"syria","desc":"エルサレムと丘の国。"},
  {"id":"damascus","name":"ダマスコス","o":"ptol","x":926.0,"y":444.5,"pop":35,"t":"plain","cul":"syria","desc":"コイレ・シリアの奥の古いオアシスの都。"},
  {"id":"ionia","name":"イオニア","o":"ptol","x":748.0,"y":330.2,"pop":45,"t":"coast","cul":"greek","desc":"エフェソスと港の町々。"},
  {"id":"caria","name":"カリア","o":"ptol","x":758.0,"y":349.2,"pop":25,"t":"hill","cul":"greek","desc":"ハリカルナッソス。"},
  {"id":"lycia","name":"リュキア","o":"ptol","x":792.0,"y":365.8,"pop":20,"t":"mount","cul":"anat","desc":"断崖の墓と山の同盟。"},
  {"id":"rhodos","name":"ロドス","o":"ptol","x":759.6,"y":375.9,"pop":30,"t":"coast","cul":"greek","desc":"海の共和国。巨像の港。"},
  {"id":"creta","name":"クレタ","o":"ptol","x":698.0,"y":401.3,"pop":30,"t":"mount","cul":"greek","desc":"弓兵と傭兵の島。"},
];
// 隣接。三つ目が 1 なら海を渡る道（渡海）
D.EDGES = [
  ["roma","etruria"],["roma","umbria"],["roma","campania"],["roma","samnium"],["etruria","umbria"],["etruria","liguria"],["etruria","cisalpina"],["etruria","ariminum"],
  ["umbria","picenum"],["umbria","ariminum"],["umbria","samnium"],["picenum","ariminum"],["picenum","samnium"],["ariminum","cisalpina"],["campania","samnium"],["campania","lucania"],
  ["samnium","apulia"],["samnium","lucania"],["apulia","lucania"],["apulia","tarentum"],["lucania","tarentum"],["lucania","bruttium"],["cisalpina","liguria"],["liguria","massilia"],
  ["cisalpina","massilia"],["massilia","emporiae"],["emporiae","ilergetes"],["ilergetes","saguntum"],["ilergetes","celtiberia"],["saguntum","celtiberia"],["saguntum","cartnova"],["cartnova","castulo"],
  ["castulo","gades"],["castulo","celtiberia"],["castulo","lusitania"],["gades","lusitania"],["celtiberia","lusitania"],["lilybaeum","agrigentum"],["lilybaeum","messana"],["agrigentum","leontini"],
  ["agrigentum","syracusae"],["messana","leontini"],["leontini","syracusae"],["carthago","utica"],["carthago","byzacium"],["carthago","sicca"],["utica","sicca"],["byzacium","sicca"],
  ["byzacium","emporia"],["sicca","hippo"],["sicca","cirta"],["sicca","gaetulia"],["utica","hippo"],["cirta","hippo"],["cirta","iol"],["cirta","gaetulia"],
  ["iol","siga"],["iol","gaetulia"],["siga","mauretania"],["pella","chalcidice"],["pella","thessalia"],["pella","paeonia"],["pella","epirus"],["chalcidice","thracia"],
  ["chalcidice","paeonia"],["paeonia","thracia"],["paeonia","illyria"],["epirus","illyria"],["epirus","thessalia"],["epirus","aetolia"],["thessalia","aetolia"],["aetolia","athenae"],
  ["athenae","euboea"],["athenae","corinth"],["corinth","achaea"],["corinth","sparta"],["achaea","sparta"],["antiochia","apamea"],["antiochia","cilicia"],["antiochia","seleucia"],
  ["apamea","seleucia"],["apamea","phoenicia"],["apamea","damascus"],["phoenicia","damascus"],["phoenicia","judaea"],["damascus","seleucia"],["damascus","judaea"],["judaea","gaza"],
  ["gaza","pelusium"],["pelusium","memphis"],["pelusium","alexandria"],["alexandria","memphis"],["memphis","thebais"],["cilicia","phrygia"],["cilicia","galatia"],["cilicia","lycia"],
  ["phrygia","galatia"],["phrygia","lydia"],["phrygia","bithynia"],["phrygia","lycia"],["phrygia","caria"],["lydia","pergamon"],["lydia","ionia"],["lydia","caria"],
  ["pergamon","bithynia"],["pergamon","ionia"],["ionia","caria"],["caria","lycia"],["bithynia","galatia"],["galatia","seleucia"],["cyrene","alexandria"],["emporia","cyrene"],
  ["messana","bruttium",1],["lilybaeum","carthago",1],["sardinia","corsica",1],["corsica","etruria",1],["sardinia","roma",1],["sardinia","utica",1],["baleares","cartnova",1],["baleares","emporiae",1],
  ["gades","mauretania",1],["cartnova","siga",1],["tarentum","illyria",1],["syracusae","carthago",1],["agrigentum","carthago",1],["messana","campania",1],["thracia","bithynia",1],["thracia","pergamon",1],
  ["athenae","ionia",1],["euboea","ionia",1],["sparta","creta",1],["creta","rhodos",1],["creta","cyrene",1],["thessalia","euboea",1],["rhodos","caria",1],["rhodos","lycia",1],
  ["rhodos","alexandria",1],["cyprus","cilicia",1],["cyprus","antiochia",1],["cyprus","phoenicia",1],["cyprus","alexandria",1],["epirus","tarentum",1],["achaea","aetolia",1],["roma","massilia",1],
  ["liguria","corsica",1],
];
/* 地図の装飾（地図ができるまでの仮の絵：陸・大河） */
D.MAPDECO = {
  lands: [[[238,-30],[1030,-30],[1030,193],[994,188],[946,150],[932,145],[920,152],[908,151],[888,164],[870,165],[868,149],[850,142],[860,130],[840,116],[820,112],[814,116],[794,147],[792,159],[776,168],[772,183],[760,198],[760,229],[779,249],[779,254],[750,254],[724,277],[726,270],[733,265],[718,258],[700,255],[677,259],[679,268],[687,276],[678,271],[679,280],[672,274],[668,280],[661,273],[659,264],[652,267],[651,276],[666,296],[663,302],[659,297],[651,309],[666,315],[680,326],[681,339],[673,332],[661,333],[670,345],[663,347],[656,342],[662,368],[657,362],[651,361],[649,371],[642,355],[638,362],[633,358],[633,348],[622,334],[627,325],[635,323],[658,329],[662,326],[640,320],[622,322],[615,305],[592,277],[587,263],[591,239],[588,232],[553,202],[518,184],[504,170],[487,145],[477,156],[472,150],[475,136],[467,134],[447,141],[449,156],[446,166],[451,176],[470,188],[478,210],[492,225],[502,230],[524,231],[519,243],[559,263],[570,276],[567,284],[552,272],[544,268],[537,269],[532,287],[542,295],[543,304],[532,309],[531,319],[521,332],[514,332],[519,320],[517,314],[523,311],[513,279],[505,279],[495,263],[487,264],[478,252],[460,248],[452,243],[442,230],[423,217],[410,203],[406,182],[378,168],[364,180],[345,185],[332,197],[318,201],[300,194],[284,192],[268,197],[261,210],[265,218],[260,234],[225,252],[200,277],[193,293],[196,302],[204,311],[190,321],[185,330],[186,339],[167,347],[162,362],[112,363],[97,370],[88,379],[80,375],[61,352],[22,356],[24,333],[10,312],[24,254],[22,224],[14,203],[36,188],[84,188],[164,194],[171,189],[177,137],[156,99],[110,79],[106,66],[116,58],[140,56],[168,60],[168,34],[204,41],[232,20]],[[783,249],[828,246],[866,229],[898,227],[910,238],[940,252],[966,255],[1030,255],[1030,750],[972,750],[950,673],[899,574],[900,545],[895,551],[885,590],[851,535],[847,544],[912,696],[915,750],[-30,750],[-30,544],[3,518],[5,498],[15,475],[30,451],[63,432],[81,388],[93,386],[112,400],[162,403],[226,368],[278,358],[300,362],[320,359],[338,353],[355,358],[372,357],[397,348],[412,362],[421,354],[412,385],[421,391],[422,400],[402,424],[400,434],[415,439],[423,451],[442,461],[464,460],[503,474],[512,493],[570,524],[588,523],[599,509],[602,480],[612,467],[628,460],[639,459],[652,463],[679,480],[698,486],[703,493],[745,499],[780,512],[807,497],[818,494],[832,495],[851,506],[878,503],[889,495],[917,421],[916,394],[923,359],[911,366],[892,361],[885,370],[859,378],[848,375],[840,367],[815,359],[808,375],[793,377],[782,366],[768,362],[761,364],[749,357],[745,347],[747,332],[735,325],[742,319],[735,314],[737,305],[732,297],[723,293],[724,281],[738,271],[778,269],[786,261],[799,261],[787,258],[783,254]],[[512,323],[485,330],[467,325],[455,326],[449,335],[452,340],[502,364],[506,359],[502,343]],[[383,248],[393,254],[391,256],[396,265],[392,298],[382,300],[372,308],[368,302],[368,272],[364,255],[372,255]],[[388,203],[391,226],[383,244],[376,240],[372,221],[375,213]],[[671,392],[715,400],[726,399],[722,406],[706,408],[671,400]],[[846,409],[848,403],[880,395],[892,389],[860,418],[848,413]],[[658,307],[666,307],[692,325],[691,331]],[[247,290],[252,281],[264,281],[269,286],[265,296],[258,296],[252,292]],[[276,279],[281,278],[286,283],[280,282]],[[224,305],[229,302],[232,305],[229,309],[225,308]],[[765,370],[761,377],[755,384],[754,378],[759,372]],[[717,296],[724,295],[732,301],[728,306],[721,304]],[[717,315],[723,316],[723,324],[719,325],[717,321]],[[731,335],[741,336],[739,339],[732,339]],[[593,284],[599,286],[602,294],[599,293],[595,288]],[[608,321],[613,323],[615,328],[609,328]],[[701,281],[708,279],[709,284],[703,284]],[[691,259],[696,260],[695,264],[691,263]],[[707,351],[711,352],[711,356],[708,356]],[[484,380],[491,382],[491,386],[486,384]],[[402,208],[409,207],[408,210],[403,210]],[[415,435],[421,435],[420,439],[415,439]]],
  rivers: [{"n":"パドゥス","w":2.6,"p":[[342,160],[354,151],[366,149],[447,153]]},{"n":"ティベリス","w":1.7,"p":[[441,184],[451,221],[450,231],[445,235]]},{"n":"ロダヌス","w":2.4,"p":[[323,122],[297,133],[296,179],[292,194]]},{"n":"ガルムナ","w":1.7,"p":[[213,206],[229,188],[189,156],[178,138]]},{"n":"リゲル","w":1.9,"p":[[280,152],[280,112],[262,102],[238,79],[214,91],[169,96],[157,94]]},{"n":"セクアナ","w":1.6,"p":[[294,89],[272,66],[203,39]]},{"n":"イベルス","w":1.9,"p":[[120,203],[152,216],[182,238],[204,248],[210,259],[217,261]]},{"n":"バエティス","w":1.8,"p":[[144,332],[128,329],[104,333],[80,346],[73,361]]},{"n":"タグス","w":1.8,"p":[[162,269],[119,283],[40,293],[18,312]]},{"n":"ドゥリウス","w":1.6,"p":[[150,234],[64,253],[27,250]]},{"n":"ダヌビウス","w":3.1,"p":[[364,76],[442,51],[470,62],[578,81],[581,89],[578,127],[584,147],[609,157],[650,163],[680,185],[718,187],[758,175],[764,147],[793,147]]},{"n":"ハリュス","w":1.6,"p":[[960,284],[890,302],[876,284],[888,259],[912,246],[919,236]]},{"n":"エウフラテス","w":2.9,"p":[[964,315],[968,343],[960,366],[966,381],[1001,401]]},{"n":"ナイル","w":3.1,"p":[[858,711],[857,661],[851,653],[850,631],[838,630],[816,590],[825,537],[808,497]]},{"n":"ナイル東支流","w":1.7,"p":[[824,531],[837,496]]}],
};
/* @@PROV_END */

/* ---------- 官職 ---------- */
// track: mil(武官) civ(文官) staff(軍師) top(宰相・君主)
// tier: 立場の格（1〜10。経済・事件・合戦の規模の目安）。m: その官職に就くのに要る功績（累計）
// 同じ官職の中にも三等→二等→一等の等級がある（D.GRADES）。昇進は一段ずつで、一段ごとに在任期間が要る（D.STEP_MONTHS）
// tmax / mfull: 功績に応じて率いる兵が増える官職（m のとき troops、mfull で tmax）
// req: 昇進の条件（fame 名声・wins 勝利・battles 合戦・renown 武名の段階・favor [君主との絆, 名声] のどちらか）
D.RANKS = {
  goch:   { name: '伍長',     track: 'mil', tier: 1, troops: 5,      ap: 3, pay: 300,    m: 0,      up: 'shic', desc: '五人組の長。四人の仲間と最前線で戦う。ローマ軍なら天幕仲間（コントゥベルニウム）の古株、ファランクスなら列の後ろを締める役。上官の命に従い、組を鍛え、功を立てよ。' },
  shic:   { name: '十人長',   track: 'mil', tier: 1, troops: 10,     ap: 3, pay: 450,    m: 120,    up: 'tonc', desc: '十人を束ねる（デカルケス）。乱戦でも組を崩さず、伍長たちに目を配る。' },
  tonc:   { name: '五十人長', track: 'mil', tier: 2, troops: 50,     ap: 3, pay: 650,    m: 300,    up: 'hyak', desc: '五十人を率いる。百人隊長の副官（オプティオ）として一隊を任される。' },
  hyak:   { name: '百人隊長', track: 'mil', tier: 2, troops: 100,    ap: 3, pay: 900,    m: 600,    up: 'sanb', desc: '百人隊（ケントゥリア）を率いる。兵の手本となり、戦場で小隊を指揮する。軍の背骨と呼ばれる役。' },
  sanb:   { name: '三百人隊長', track: 'mil', tier: 3, troops: 300, ap: 3, pay: 1500,   m: 1100,   up: 'gohy', desc: '三百の兵を率いる。いくつもの百人隊を一つの塊（マニプルス）として動かす。' },
  gohy:   { name: '大隊長',   track: 'mil', tier: 3, troops: 500,    ap: 3, pay: 2200,   m: 1800,   up: 'senn', desc: '五百人の大隊（コホルス）を率いる。隊を分けて助攻や挟撃ができるようになる。' },
  senn:   { name: '千人隊長', track: 'mil', tier: 4, troops: 1000,   ap: 4, pay: 4500,   m: 2600,   up: 'sanz', desc: '千人隊の長（キリアルケス・軍団の護民官）。弓兵や騎兵を編成し、兵種を組み合わせて戦う。' },
  sanz:   { name: '軍団副将', track: 'mil', tier: 5, troops: 3000,   ap: 4, pay: 9000,   m: 4200,   up: 'goz',  desc: '三千の兵を率いる将。独立した戦術単位として動ける。' },
  goz:    { name: '軍団長',   track: 'mil', tier: 6, troops: 5000,   ap: 4, pay: 15000,  m: 11000,  up: 'shog', desc: '一個軍団（レギオ）五千を率いる。将軍の一歩手前で、副官を擁する。' },
  shog:   { name: '将軍',     track: 'mil', tier: 7, troops: 20000,  ap: 5, pay: 30000,  m: 24000,  up: 'dais', tmax: 100000, mfull: 68000, req: { wins: 5 }, desc: '一軍の将（ストラテゴス・法務官格の将軍）。軍議を開き戦術を準備できる。功績に応じて率いる兵が増える（最大十万）。許可なく小規模の戦闘を起こせる。戦争には上奏が必要。' },
  dais:   { name: '大将軍',   track: 'mil', tier: 8, troops: 100000, ap: 5, pay: 60000,  m: 68000,  up: 'tenka', tmax: 500000, mfull: 250000, req: { fame: 350, wins: 15 }, desc: '国の全軍の総司令官。功績に応じて率いる兵が増える（最大五十万）。小規模戦闘は自由だが、戦争には君主の許可が要る。' },
  tenka:  { name: '地中海の覇将', track: 'mil', tier: 9, troops: 500000, ap: 6, pay: 100000, m: 250000, up: null, nograde: true, req: { fame: 900, wins: 40, renown: 4 }, desc: '武の頂点。ハンニバルやスキピオのように、その名は地中海の岸のすべてに轟き、敵は旗を見ただけで怯む。比類なき武名を挙げた大将軍だけが、こう呼ばれる。' },
  gunri:  { name: '書記官',   track: 'staff', tier: 3, troops: 20,   ap: 3, pay: 1600,   m: 1800,   up: 'sanbo', desc: '将軍の幕舎の書記。陣立てや兵站の文書を扱いながら軍略を学ぶ。合戦では護衛を率いて将の軍で戦う。' },
  sanbo:  { name: '幕僚',     track: 'staff', tier: 4, troops: 50,   ap: 4, pay: 4000,   m: 2600,   up: 'gshib', desc: '将の幕僚として軍議に加わり、策を献じる。' },
  gshib:  { name: '主計官',   track: 'staff', tier: 5, troops: 200,  ap: 4, pay: 8000,   m: 4200,   up: 'chosh', desc: '軍の実務を預かる幕僚（クァエストル）。兵站と軍の金庫を司り、二百の護衛隊を持つ。' },
  chosh:  { name: '幕僚長',   track: 'staff', tier: 6, troops: 500,  ap: 4, pay: 14000,  m: 11000,  up: 'gunshi', desc: '幕僚の長。大軍の作戦を練り、将軍に次ぐ発言力を持つ。' },
  gunshi: { name: '軍師',     track: 'staff', tier: 7, troops: 1000, ap: 5, pay: 30000,  m: 22000,  up: 'dgun', req: { fame: 150, battles: 5 }, desc: '戦術を管理し、軍議で策を練る。合戦では総軍師として全軍に指示を出せる。直属隊を持つ。' },
  dgun:   { name: '大軍師',   track: 'staff', tier: 8, troops: 2000, ap: 5, pay: 55000,  m: 50000,  up: 'josh', req: { fame: 300, battles: 12 }, desc: '国の軍略の頂点。全軍の作戦を立て、合戦では総軍師として采配を振るう。' },
  ritei:  { name: '村長',     track: 'civ', tier: 1, troops: 5,      ap: 3, pay: 300,    m: 0,      up: 'teic', desc: '村の長。住人の名簿と畑を管理し、村の暮らしを守る。' },
  teic:   { name: '治安役',   track: 'civ', tier: 2, troops: 12,     ap: 3, pay: 900,    m: 300,    up: 'kyosa', desc: '町の一つの区の治安を守り、盗賊を捕らえる。夜警を率いて戦うこともある。' },
  kyosa:  { name: '町の書記', track: 'civ', tier: 2, troops: 25,     ap: 3, pay: 1400,   m: 900,    up: 'kyos', desc: '町長の補佐。町の名簿と徴税を手伝い、村々を回る。' },
  kyos:   { name: '町長',     track: 'civ', tier: 3, troops: 50,     ap: 3, pay: 2200,   m: 1500,   up: 'reis', desc: '町の長官。徴税・訴え・労役を司る。' },
  reis:   { name: '市の書記官', track: 'civ', tier: 3, troops: 100,  ap: 3, pay: 3000,   m: 2300,   up: 'kenj', desc: '都市の役所の書記官。文書と裁判を扱い、市の長官の目と耳となる。' },
  kenj:   { name: '市の副長官', track: 'civ', tier: 4, troops: 200,  ap: 4, pay: 4500,   m: 3500,   up: 'kenr', desc: '都市の副長官（アエディリス）。市場・倉・建物を扱う。' },
  kenr:   { name: '市の長官', track: 'civ', tier: 5, troops: 1000,   ap: 4, pay: 9000,   m: 7900,   up: 'gunj', desc: '都市の長官（アルコン・ドゥウムウィル）。市の内政と市の兵を預かる。' },
  gunj:   { name: '副総督',   track: 'civ', tier: 6, troops: 2000,   ap: 4, pay: 12000,  m: 14000,  up: 'guns', desc: '州の副長官。総督を助けて一州の政務を見る。' },
  guns:   { name: '総督',     track: 'civ', tier: 6, troops: 5000,   ap: 4, pay: 15000,  m: 22000,  up: 'daij', desc: '州（一つの地方）の長官（サトラペス・属州総督）。内政と州の兵を指揮し、敵の侵攻に備える。' },
  daij:   { name: '大臣',     track: 'civ', tier: 7, troops: 1000,   ap: 5, pay: 30000,  m: 34000,  up: 'gyos', req: { fame: 150 }, desc: '国の要職の一つを司る。担当分野の国政を動かす。' },
  gyos:   { name: '監察官',   track: 'civ', tier: 8, troops: 2000, ap: 5, pay: 60000,  m: 59000,  up: 'josh', req: { fame: 250 }, desc: '宰相に次ぐ地位（ケンソル）。百官を監察し、弾劾し、法案を上奏する。' },
  josh:   { name: '宰相',     track: 'top', tier: 9, troops: 5000,   ap: 6, pay: 100000, m: 90000,  up: null, req: { favor: [30, 450] }, desc: '百官の長（ローマなら元老院の筆頭、王国なら王の第一の友）。国法を定め、外交を行い、戦争を決める。自ら軍を率いることもできる。' },
  kuns:   { name: '君主',     track: 'top', tier: 10, troops: 10000, ap: 6, pay: 0,      m: 0,      up: null,   desc: '一国の主（王、ローマなら執政官、カルタゴならスフェス）。すべてを決める。親征して自ら大軍を率いることもできる。' },
};
// 出世の道（下から順）
D.LADDER = {
  mil: ['goch', 'shic', 'tonc', 'hyak', 'sanb', 'gohy', 'senn', 'sanz', 'goz', 'shog', 'dais', 'tenka'],
  staff: ['gunri', 'sanbo', 'gshib', 'chosh', 'gunshi', 'dgun'],
  civ: ['ritei', 'teic', 'kyosa', 'kyos', 'reis', 'kenj', 'kenr', 'gunj', 'guns', 'daij', 'gyos'],
};
D.LADDER_NAME = { mil: '武官', staff: '軍師', civ: '文官', top: '宰相と君主' };
// 格ごとの代表の官職（AIの武将や部下を作るとき）
D.RANK_ORDER_MIL = ['goch', 'hyak', 'gohy', 'senn', 'sanz', 'goz', 'shog', 'dais'];
D.RANK_ORDER_CIV = ['ritei', 'teic', 'kyos', 'kenj', 'kenr', 'guns', 'daij', 'gyos'];
D.SELECTABLE = ['kuns', 'josh',
  'dais', 'shog', 'goz', 'sanz', 'senn', 'gohy', 'sanb', 'hyak', 'tonc', 'shic', 'goch',
  'dgun', 'gunshi', 'chosh', 'gshib', 'sanbo', 'gunri',
  'gyos', 'daij', 'guns', 'gunj', 'kenr', 'kenj', 'reis', 'kyos', 'kyosa', 'teic', 'ritei'];
// 官職の中の等級（下から）
D.GRADES = ['三等', '二等', '一等'];
// 一段（等級か官職）上がるのに要る在任期間（か月）。格ごと
D.STEP_MONTHS = [0, 2, 2, 3, 3, 4, 4, 6, 6, 8, 8];
// AIの人物の功績の目安（格ごと）
D.MERIT_TIER = [0, 0, 300, 1100, 2600, 4200, 11000, 24000, 68000, 90000, 999999999];

/* ---------- 身分（二十一段） ---------- */
// ha: 土地（ユゲラの百倍ほど）, hh: 与えられた村の戸数, m: 必要功績, t: 要る官職の格, fame: 要る名声
// 一つの身分の中も下・中・上の三段に分かれ、一か月に一段ずつしか上がらない
D.JUE = [
  { n: '無位',       ha: 1,   hh: 0,     m: -1,     t: 0 },
  { n: '兵士',       ha: 1.5, hh: 0,     m: 0,      t: 0 },
  { n: '古参兵',     ha: 2,   hh: 0,     m: 100,    t: 0 },
  { n: '勲功兵',     ha: 3,   hh: 0,     m: 250,    t: 0 },
  { n: '自由民',     ha: 4,   hh: 0,     m: 500,    t: 0 },
  { n: '小地主',     ha: 5,   hh: 0,     m: 900,    t: 2 },
  { n: '地主',       ha: 7,   hh: 0,     m: 1500,   t: 2 },
  { n: '郷士',       ha: 9,   hh: 0,     m: 2400,   t: 3 },
  { n: '騎士',       ha: 20,  hh: 0,     m: 3600,   t: 3 },
  { n: '上級騎士',   ha: 25,  hh: 300,   m: 5500,   t: 4 },
  { n: '名士',       ha: 74,  hh: 500,   m: 8000,   t: 4 },
  { n: '元老格',     ha: 76,  hh: 600,   m: 11000,  t: 5 },
  { n: '名門',       ha: 78,  hh: 700,   m: 15000,  t: 5 },
  { n: '貴顕',       ha: 80,  hh: 800,   m: 20000,  t: 6 },
  { n: '王の友',     ha: 82,  hh: 900,   m: 26000,  t: 6 },
  { n: '第一の友',   ha: 84,  hh: 1000,  m: 33000,  t: 7 },
  { n: '近臣',       ha: 86,  hh: 1200,  m: 42000,  t: 7 },
  { n: '宮廷の重鎮', ha: 88,  hh: 1500,  m: 54000,  t: 7 },
  { n: '大貴族',     ha: 90,  hh: 2000,  m: 68000,  t: 8 },
  { n: '領主',       ha: 95,  hh: 3000,  m: 85000,  t: 8 },
  { n: '諸侯',       ha: 105, hh: 10000, m: 120000, t: 8, fame: 600 },
];
D.JUE_SUB = ['下', '中', '上'];
// 諸侯の上の段の目安
D.JUE_TOP = { ha: 120, hh: 15000, m: 170000 };

/* ---------- 武名と異名 ---------- */
// 武名：大きな戦で活躍すると上がる。段階が上がると名が知れ、合戦で敵がひるむ
D.RENOWN = [
  { m: 0,    n: '無名',           say: '{n}の名を知る者はまだいない。' },
  { m: 60,   n: '故郷に知られる', say: '{n}の名が故郷で語られはじめた。' },
  { m: 250,  n: '国中に知られる', say: '{n}の名は{c}の国中に知れ渡った。' },
  { m: 700,  n: '諸国に聞こえる', say: '{n}の名は諸国にまで聞こえた。' },
  { m: 1800, n: '地中海に轟く',   say: '{n}の名は地中海に轟いた！' },
  { m: 4500, n: '生ける伝説',     say: '{n}は生ける伝説となった。' },
];
// 異名のひな形：{p} 戦場の地名、{c} 国の名、{m} 主人公の名
D.EPITHET = {
  duel:   { n: '一騎打ち',     t: ['{p}の剣鬼', '一騎当千の{m}', '{c}の無双', '{p}の獅子'] },
  slayer: { n: '敵将を討つ',   t: ['{p}の鬼神', '将斬りの{m}', '{c}の戦神', '{p}の修羅'] },
  few:    { n: '寡兵で勝つ',   t: ['不敗の{m}', '{p}の奇才', '寡兵の{m}', '{c}の鬼謀'] },
  siege:  { n: '城を落とす',   t: ['{p}の城落とし', '城喰らいの{m}', '{c}の攻城槌'] },
  wall:   { n: '守り抜く',     t: ['{p}の鉄壁', '{c}の盾', '不動の{m}', '{p}の守護神'] },
  rear:   { n: '殿を務める',   t: ['{p}の殿', '不退の{m}'] },
  cav:    { n: '騎兵で駆ける', t: ['{c}の飛将', '疾風の{m}', '{p}の迅雷', '{c}の騎神'] },
  arch:   { n: '射抜く',       t: ['{p}の神弓', '必中の{m}'] },
  nomad:  { n: 'ガリア人を退ける', t: ['北辺の狼', 'ガリア狩りの{m}', '{c}の防壁'] },
  big:    { n: '大軍を率いて勝つ', t: ['{c}の軍神', '{p}の名将', '{c}の大黒柱'] },
  brave:  { n: '先陣で戦う',   t: ['{p}の猛将', '{c}の豪傑', '猛獅子の{m}'] },
  bandit: { n: '賊を討つ',     t: ['{p}の捕り手', '海賊殺しの{m}'] },
  naval:  { n: '海で勝つ',     t: ['{p}の海神', '海の獅子{m}', '{c}の提督', '衝角の{m}'] },
};

/* ---------- 管轄（文官の担当地域） ---------- */
// share: 管轄での働きが州の数字に効く割合、perk: 管轄から入る役得の割合、deputy: 副官（長官は別にいる）
D.JUR = {
  ritei: { lv: 'li',    n: '村', hh: 100,   share: 0.004 },
  teic:  { lv: 'ting',  n: '区', hh: 1000,  share: 0.03 },
  kyosa: { lv: 'xiang', n: '町', hh: 5000,  share: 0.07, deputy: true, perk: 0.5 },
  kyos:  { lv: 'xiang', n: '町', hh: 5000,  share: 0.12 },
  reis:  { lv: 'xian',  n: '市', hh: 15000, share: 0.15, deputy: true, perk: 0.5 },
  kenj:  { lv: 'xian',  n: '市', hh: 15000, share: 0.25, deputy: true },
  kenr:  { lv: 'xian',  n: '市', hh: 15000, share: 0.35 },
  gunj:  { lv: 'jun',   n: '州', hh: 0,     share: 0.5, deputy: true, perk: 0.3 },
  guns:  { lv: 'jun',   n: '州', hh: 0,     share: 1 },
};
// 地図ができる前に使う地名（どの州でもよい町の名）
D.XIANG_NAMES = ['ノラ', 'カレス', 'アルピ', 'ルナ', 'コサ', 'ノルバ', 'セティア', 'ガビイ', 'フンディ', 'ミントゥルナエ', 'ソラ', 'アティナ', 'アクィヌム', 'カシヌム', 'テアヌム', 'ウェヌシア', 'ルケリア', 'パエストゥム', 'ウェリア', 'クマエ', 'セゲスタ', 'ヘンナ', 'ゲラ', 'カマリナ', 'ヒメラ', 'ウティカ', 'ハドルメトゥム', 'タプソス', 'アクッラ', 'ザマ', 'ガデス', 'マラカ', 'カルテイア', 'サグントゥム', 'デルトサ', 'タッラコ', 'エンポリオン', 'ロデ', 'アガテ', 'ニカイア', 'アンティポリス', 'ラリサ', 'フェライ', 'ストラトス', 'ナウパクトス', 'エラテイア', 'テーバイ', 'メガラ', 'シキュオン', 'テゲア', 'メッセネ', 'ピュロス', 'エリス', 'エフェソス', 'ミレトス', 'スミュルナ', 'サルデイス', 'ペルゲ', 'シデ', 'タルソス', 'ソロイ', 'ビュブロス', 'アラドス', 'ナウクラティス', 'サイス', 'ブバスティス'];

/* ---------- 兵種 ---------- */
// cls: inf 歩兵系 / rng 射撃 / cav 騎兵 / chr 突撃獣・戦車（戦象・鎌戦車） / sie 攻城兵器
D.UT = {
  inf:    { n: '歩兵',     s: '歩', cls: 'inf', atk: 10, def: 10, spd: 1.7, chg: 3.4, mass: 1.0, dens: 1.3, cost: 1.0, desc: '剣と投げ槍と大盾の主力。ローマの軍団兵もカルタゴのリビア兵もここに入る。どこでも戦える。' },
  spear:  { n: '槍兵',     s: '槍', cls: 'inf', atk: 9,  def: 11, spd: 1.5, chg: 3.0, mass: 1.0, dens: 1.3, cost: 1.1, antiCav: 2.2, desc: '丸盾と槍のギリシア式重装歩兵（ホプリタイ）。密集して騎兵の突撃を止める。' },
  heavy:  { n: '重装歩兵', s: '重', cls: 'inf', atk: 12, def: 16, spd: 1.2, chg: 2.4, mass: 1.4, dens: 1.5, cost: 1.8, arrowRes: 0.5, desc: '鎖かたびらと兜で固めた古参兵（トリアリイ・リビア重装兵）。矢に強いが遅い。' },
  phal:   { n: 'ファランクス', s: '長', cls: 'inf', atk: 11, def: 14, spd: 1.2, chg: 2.6, mass: 1.3, dens: 1.2, cost: 1.4, antiCav: 2.8, pike: true, desc: '六メートルの長槍（サリッサ）を構えた密集陣。正面は鉄壁で騎兵も戦象も寄せつけないが、側面と背後、凸凹の地面に弱い。' },
  arch:   { n: '弓兵',     s: '弓', cls: 'rng', atk: 5,  def: 6,  spd: 1.7, chg: 3.0, mass: 0.8, dens: 1.6, cost: 1.2, range: 160, rof: 6, mdmg: 0.032, ammo: 30, desc: 'クレタやアジアの弓兵。射程が長く、曲射で敵を削る。近接戦に弱い。' },
  sling:  { n: '投石兵',   s: '石', cls: 'rng', atk: 5,  def: 6,  spd: 1.8, chg: 3.0, mass: 0.8, dens: 1.5, cost: 1.1, range: 150, rof: 5, mdmg: 0.03, ammo: 34, pierce: 0.2, desc: 'バレアレス諸島やロドスの投石兵。鉛の弾は兜もへこませる。' },
  velite: { n: '散兵',     s: '散', cls: 'rng', atk: 7,  def: 6,  spd: 2.1, chg: 3.6, mass: 0.8, dens: 1.8, cost: 0.9, range: 70, rof: 4, mdmg: 0.045, ammo: 8, antiEleph: 1.8, desc: '投げ槍を持つ身軽な兵（ウェリテス・ペルタスタイ）。戦列の前で敵を乱し、戦象を追い払うのが得意。' },
  xbow:   { n: '弩砲兵',   s: '弩', cls: 'rng', atk: 5,  def: 7,  spd: 1.4, chg: 2.6, mass: 0.9, dens: 1.7, cost: 1.6, range: 210, rof: 9, mdmg: 0.052, pierce: 0.5, ammo: 24, desc: 'ねじりばねで矢を飛ばす小型の弩砲（スコルピオ）を操る兵。鎧を貫くが、装填は遅い。' },
  lcav:   { n: '軽騎兵',   s: '騎', cls: 'cav', atk: 11, def: 8,  spd: 5.4, chg: 10, mass: 2.8, dens: 5,   cost: 3.0, desc: '投げ槍を持つ速い騎兵（ヌミディア騎兵など）。射撃兵や側背面を突き、逃げる敵を追うのが得意。' },
  hcav:   { n: '重騎兵',   s: '騎', cls: 'cav', atk: 15, def: 12, spd: 4.4, chg: 9,  mass: 3.8, dens: 6,   cost: 4.0, desc: '槍と鎧の騎兵（ヘタイロイ・イベリアやガリアの騎兵）。突撃の破壊力が随一。槍の壁の正面は苦手。' },
  cataph: { n: '重装騎兵', s: '鎧', cls: 'cav', atk: 16, def: 17, spd: 3.6, chg: 9,  mass: 4.6, dens: 6.5, cost: 5.0, arrowRes: 0.55, desc: '人も馬も鎧で覆った騎兵（カタフラクトイ）。矢をはね返すが、重く疲れやすい。' },
  harch:  { n: '騎射兵',   s: '射', cls: 'cav', atk: 8,  def: 7,  spd: 5.4, chg: 9,  mass: 2.5, dens: 5,   cost: 3.5, range: 120, rof: 5, mdmg: 0.026, ammo: 22, moveFire: true, desc: '草原の民の騎射兵（ダハイ人など）。移動しながら射撃できる。' },
  chariot:{ n: '鎌戦車',   s: '車', cls: 'chr', atk: 16, def: 10, spd: 4.6, chg: 11, mass: 6.0, dens: 14,  cost: 4.5, desc: '車輪に大鎌をつけた戦車。平地での突撃は恐ろしいが、森・丘・湿地では役に立たず、散兵の槍で馬を倒されると暴走する。' },
  eleph:  { n: '戦象',     s: '象', cls: 'chr', atk: 18, def: 16, spd: 3.2, chg: 12, mass: 9.0, dens: 18,  cost: 6.0, elephant: true, arrowRes: 0.4, moraleMod: 10, desc: '背に櫓と兵を載せた象。突撃で戦列を踏み砕き、馬は象を怖がる。散兵の槍や火に驚くと味方を踏みつけて暴れ出す。' },
  mount:  { n: '山岳兵',   s: '山', cls: 'inf', atk: 13, def: 9,  spd: 2.0, chg: 4.0, mass: 1.1, dens: 1.3, cost: 1.6, mountain: true, desc: '山の民の戦士（リグリア人・クレタ人・トラキア人）。山地・森を自在に駆ける。' },
  warb:   { n: 'ガリア戦士', s: '戦', cls: 'inf', atk: 14, def: 8, spd: 1.9, chg: 5.0, mass: 1.1, dens: 1.5, cost: 1.0, moraleMod: -4, fierce: true, desc: '長剣を振るう大柄な戦士たち。最初の突撃は嵐のように激しいが、長引くと崩れやすい。' },
  ladder: { n: '梯子隊',   s: '梯', cls: 'inf', atk: 8,  def: 8,  spd: 1.3, chg: 2.6, mass: 1.0, dens: 1.5, cost: 1.3, climb: true, desc: '梯子で城壁をよじ登る攻城部隊。' },
  ram:    { n: '破城槌',   s: '槌', cls: 'sie', atk: 2,  def: 22, spd: 0.7, chg: 0.8, mass: 8,   dens: 25,  cost: 6, gate: true, fixed: [10, 14], arrowRes: 0.85, moraleMod: 20, desc: '屋根つきの車で城門を打ち破る槌（亀甲車）。' },
  tower:  { n: '攻城塔',   s: '塔', cls: 'sie', atk: 2,  def: 20, spd: 0.55, chg: 0.6, mass: 8,  dens: 40,  cost: 8, range: 120, rof: 6, mdmg: 0.05, ammo: 40, tower: true, fixed: [12, 12], arrowRes: 0.8, moraleMod: 20, desc: '城壁に横付けして兵を送り込む攻城塔（ヘレポリス）。' },
  militia:{ n: '民兵',     s: '民', cls: 'inf', atk: 6,  def: 6,  spd: 1.6, chg: 3.0, mass: 0.9, dens: 1.4, cost: 0.5, moraleMod: -12, desc: '寄せ集めの兵。士気が低い。' },
  guard:  { n: '近衛兵',   s: '衛', cls: 'inf', atk: 14, def: 15, spd: 1.6, chg: 3.4, mass: 1.2, dens: 1.4, cost: 2.5, moraleMod: 15, desc: '王や将を守る最精鋭（銀盾隊・神聖隊・選抜兵）。' },
  shield: { n: '盾兵',     s: '盾', cls: 'inf', atk: 9,  def: 15, spd: 1.4, chg: 2.6, mass: 1.2, dens: 1.4, cost: 1.4, arrowRes: 0.45, desc: '楕円の大盾の兵（トゥレオフォロイ・イベリアのスクタリイ）。矢と突撃を防ぐ。' },
  cata:   { n: '投石機',   s: '機', cls: 'sie', atk: 2,  def: 14, spd: 0.45, chg: 0.5, mass: 8,  dens: 30,  cost: 7, range: 230, rof: 10, mdmg: 0.02, ammo: 40, fixed: [12, 10], arrowRes: 0.7, moraleMod: 15, desc: '石を投げて城門や城壁を打ち崩す攻城兵器（ペトロボロス）。' },
  // 軍船（海戦でだけ使う。陸の兵がそのまま海兵として乗り込む。crew：一隻の海兵、hull：一隻の占める幅と長さ）
  quinq:  { n: '五段櫂船', s: '五', cls: 'nav', atk: 10, def: 13, spd: 2.5, chg: 5.4, mass: 6.5, dens: 7, cost: 0, ship: true, crew: 120, hull: [15, 42], turn: 0.42, desc: 'この時代の主力艦。漕ぎ手三百人に海兵百二十人。重い衝角で敵船の横腹を破り、乗り移って戦う。' },
  trireme:{ n: '三段櫂船', s: '三', cls: 'nav', atk: 8,  def: 10, spd: 3.1, chg: 6.6, mass: 4.5, dens: 6, cost: 0, ship: true, crew: 60,  hull: [12, 36], turn: 0.6, fast: true, desc: '軽く速い軍船。敵の列をすり抜けて（ディエクプルス）横腹や艫を衝角で突く。' },
  lembos: { n: '快速船',   s: '快', cls: 'nav', atk: 8,  def: 7,  spd: 3.6, chg: 7.2, mass: 2.2, dens: 6, cost: 0, ship: true, crew: 40,  hull: [8, 22],  turn: 0.85, fast: true, light: true, desc: 'イリュリアの小型船（レンボス）。小さく速く、浅瀬も平気だが、大きな船にぶつかると脆い。' },
  hept:   { n: '大型艦',   s: '大', cls: 'nav', atk: 12, def: 18, spd: 1.9, chg: 3.8, mass: 9.5, dens: 8, cost: 0, ship: true, crew: 250, hull: [20, 52], turn: 0.3, range: 180, rof: 7, mdmg: 0.035, ammo: 30, desc: '七段櫂船などの巨艦。櫓に弩砲と弓兵を載せて遠くから撃ち、乗り移りにも強いが、重く遅い。' },
};
// 地図の札や部隊の一覧に出す、二文字の兵種名
D.UT_AB = { inf: '歩兵', spear: '槍兵', heavy: '重歩', phal: '長槍', arch: '弓兵', sling: '投石', velite: '散兵', xbow: '弩砲', lcav: '軽騎', hcav: '重騎', cataph: '鎧騎', harch: '騎射', chariot: '鎌車', eleph: '戦象', mount: '山岳', warb: '戦士', ladder: '梯子', ram: '破槌', tower: '攻塔', militia: '民兵', guard: '近衛', shield: '盾兵', cata: '投石', quinq: '五段', trireme: '三段', lembos: '快速', hept: '大艦' };
D.utAb = (t) => D.UT_AB[t] || (D.UT[t] ? D.UT[t].n.slice(0, 2) : '');
// 国ごとの兵種の呼び名（あれば）
D.UTN = {
  rome:  { inf: '軍団兵', heavy: 'トリアリイ', velite: 'ウェリテス', hcav: 'エクイテス', guard: '選抜兵' },
  carth: { inf: 'リビア歩兵', heavy: 'リビア重装兵', warb: 'ガリア傭兵', shield: 'スクタリイ', sling: 'バレアレス投石兵', lcav: 'ヌミディア騎兵', hcav: 'イベリア騎兵', guard: '神聖隊' },
  mace:  { phal: 'ファランギタイ', guard: '王の盾（ペルタスタイ）', hcav: 'ヘタイロイ', shield: 'トゥレオフォロイ', velite: 'ペルタスタイ' },
  sele:  { phal: 'ファランギタイ', guard: '銀盾隊', cataph: 'カタフラクトイ', harch: 'ダハイ騎射兵', hcav: 'アゲマ騎兵' },
  ptol:  { phal: 'ファランギタイ', inf: 'マキモイ', guard: '王の近衛', hcav: '王の騎兵' },
  syra:  { spear: 'ホプリタイ', xbow: 'アルキメデスの弩砲', cata: 'アルキメデスの投石機' },
  numi:  { lcav: 'ヌミディア騎兵', velite: 'ヌミディア散兵' },
};
D.utName = (t, c) => (c && D.UTN[c] && D.UTN[c][t]) || (D.UT[t] ? D.UT[t].n : t);
D.UT_TRAINABLE = ['inf', 'spear', 'heavy', 'phal', 'shield', 'arch', 'sling', 'velite', 'xbow', 'lcav', 'hcav', 'cataph', 'harch', 'chariot', 'eleph', 'mount', 'warb', 'ladder'];
// 兵種の編成条件（施設・国）
D.UT_REQ = {
  inf: null, spear: null, militia: null, velite: null, sling: null,
  heavy: { fac: 'smithy', lv: 2 }, shield: { fac: 'smithy', lv: 1 }, phal: { fac: 'drill', lv: 1 }, arch: null, xbow: { fac: 'workshop', lv: 1 },
  lcav: { fac: 'stable', lv: 1 }, hcav: { fac: 'stable', lv: 3 }, harch: { fac: 'stable', lv: 2 }, cataph: { fac: 'stable', lv: 4 },
  chariot: { fac: 'stable', lv: 2 }, eleph: { special: 'eleph' }, warb: { special: 'warb' }, mount: { special: 'mount' }, ladder: { fac: 'workshop', lv: 1 },
};
// 戦象を飼える国・ガリアの戦士を雇える国
D.ELEPH_C = ['carth', 'sele', 'ptol', 'numi'];
D.WARB_C = ['carth', 'rome', 'mace', 'sele'];
// 辺境の部族（襲来する側）。n: 名, w: 兵の呼び名, comp: 編成
D.RAIDERS = {
  gaul:  { n: 'ガリア人',     w: '戦士',   comp: { warb: 70, lcav: 12, hcav: 10, velite: 8 } },
  ligur: { n: 'リグリア人',   w: '山の戦士', comp: { mount: 60, velite: 25, sling: 15 } },
  thrac: { n: 'トラキア人',   w: '戦士',   comp: { mount: 40, velite: 30, lcav: 20, warb: 10 } },
  illyr: { n: 'イリュリア人', w: '戦士',   comp: { mount: 40, inf: 30, velite: 30 } },
  galat: { n: 'ガラタイ人',   w: '戦士',   comp: { warb: 60, hcav: 20, lcav: 20 } },
  lusit: { n: 'ルシタニ人',   w: '戦士',   comp: { mount: 30, velite: 40, lcav: 30 } },
  gaet:  { n: 'ガエトゥリ人', w: '騎馬の民', comp: { lcav: 70, velite: 30 } },
  garam: { n: 'ガラマンテス', w: '騎馬の民', comp: { lcav: 60, velite: 20, chariot: 20 } },
  parth: { n: 'パルティア人', w: '騎射兵', comp: { harch: 70, cataph: 15, lcav: 15 } },
  nabat: { n: 'ナバタイ人',   w: '騎馬の民', comp: { lcav: 50, arch: 30, velite: 20 } },
};
// 襲来のある州
D.RAID_AT = { cisalpina: 'gaul', massilia: 'gaul', ariminum: 'gaul', liguria: 'ligur', corsica: 'ligur', thracia: 'thrac', paeonia: 'thrac', illyria: 'illyr', galatia: 'galat', bithynia: 'galat', phrygia: 'galat', celtiberia: 'lusit', lusitania: 'lusit', mauretania: 'gaet', gaetulia: 'gaet', siga: 'gaet', emporia: 'garam', cyrene: 'garam', seleucia: 'parth', judaea: 'nabat', gaza: 'nabat', damascus: 'nabat' };
// 国ごとの主力の歩兵・射撃兵・槍兵（小さな隊を作るとき）
D.MAIN_INF = { rome: 'inf', carth: 'inf', mace: 'phal', sele: 'phal', ptol: 'phal', syra: 'spear', numi: 'inf' };
D.MAIN_RNG = { rome: 'velite', carth: 'sling', mace: 'velite', sele: 'arch', ptol: 'arch', syra: 'arch', numi: 'velite' };
D.MAIN_SPEAR = { rome: 'heavy', carth: 'spear', mace: 'phal', sele: 'phal', ptol: 'phal', syra: 'spear', numi: 'spear' };
// 国ごとの軍の編成比
D.COMP = {
  rome:  { inf: 40, heavy: 10, velite: 20, spear: 4, lcav: 6, hcav: 6, sling: 2, arch: 2, guard: 2 },
  carth: { inf: 16, heavy: 10, warb: 16, shield: 8, spear: 4, sling: 8, velite: 8, lcav: 12, hcav: 10, eleph: 4, guard: 1 },
  mace:  { phal: 40, guard: 4, shield: 8, velite: 10, arch: 6, sling: 4, hcav: 10, lcav: 8, inf: 6, mount: 4 },
  sele:  { phal: 30, guard: 4, shield: 6, velite: 8, arch: 10, sling: 4, hcav: 6, cataph: 8, harch: 8, lcav: 6, eleph: 6, chariot: 4 },
  ptol:  { phal: 34, guard: 4, inf: 12, shield: 6, velite: 8, arch: 10, sling: 4, hcav: 8, lcav: 6, eleph: 4, mount: 4 },
  syra:  { spear: 30, heavy: 10, inf: 14, arch: 10, sling: 6, velite: 10, lcav: 8, hcav: 6, xbow: 6 },
  numi:  { lcav: 48, velite: 24, inf: 14, sling: 6, eleph: 4, arch: 4 },
  bandit: { militia: 70, sling: 12, velite: 10, lcav: 8 },
  nomad: { warb: 70, lcav: 12, hcav: 10, velite: 8 },
};
for (const k in D.RAIDERS) D.COMP['raid_' + k] = D.RAIDERS[k].comp;

/* ---------- 陣形 ---------- */
D.FORM = {
  line:  { n: '横陣',     asp: 3.5, atk: 1.0,  def: 1.0,  spd: 1.0,  flank: 1.0, req: 0,  desc: '標準的な横隊。' },
  fish:  { n: '市松陣',   asp: 1.5, atk: 1.15, def: 1.0,  spd: 0.92, flank: 1.1, req: 40, impact: 1.2, desc: '小隊（マニプルス）を市松模様に重ねた陣。前列が疲れると後列が入れ替わり、正面の押し合いに強い。' },
  crane: { n: '三日月陣', asp: 6.0, atk: 1.05, def: 0.92, spd: 0.85, flank: 1.2, req: 62, envelop: 1.4, desc: '中央を張り出して受け止め、両翼で敵を包む陣。カンナエでハンニバルが用いた。接敵幅が広く挟撃しやすい。' },
  arrow: { n: '楔形陣',   asp: 0.7, atk: 1.2,  def: 0.85, spd: 1.1,  flank: 1.3, req: 55, impact: 1.45, desc: '楔（エンボロン）の形の突撃陣。突破力は最大だが側面が弱い。' },
  square:{ n: '方陣',     asp: 1.0, atk: 0.9,  def: 1.25, spd: 0.7,  flank: 0.45, req: 48, desc: '四方に盾を向けて固まる陣。挟撃・包囲に強い。' },
  cres:  { n: '前衛陣',   asp: 2.4, atk: 1.1,  def: 1.0,  spd: 0.95, flank: 1.0, req: 70, morale: 8, duel: 1.6, desc: '将が先頭に立つ陣。士気が上がるが将が危険にさらされる。' },
  goose: { n: '斜線陣',   asp: 3.0, atk: 1.0,  def: 0.95, spd: 0.95, flank: 0.9, req: 52, ranged: 1.15, desc: '片翼を前に、もう片翼を下げた斜めの陣。射撃兵を前に出しやすく、射撃が強化される。' },
  snake: { n: '行軍縦隊', asp: 0.25, atk: 0.8, def: 0.8,  spd: 1.35, flank: 1.4, req: 0,  desc: '行軍の隊形。速いが戦闘には不向き。' },
  loose: { n: '散開',     asp: 3.0, atk: 0.85, def: 0.85, spd: 1.05, flank: 1.0, req: 0,  arrowTaken: 0.55, densMul: 2.0, desc: '間隔を空けて矢や石の被害を減らす。' },
};
D.FORM_ORDER = ['line', 'fish', 'crane', 'arrow', 'square', 'cres', 'goose', 'snake', 'loose'];

/* ---------- 国法 ---------- */
D.LAWS = {
  gunkou: { n: '戦利品と褒賞',   d: '武功に応じて戦利品と土地を分け与える。兵の士気と徴兵が上がる。古い名門は不満を抱く。', eff: { morale: 6, recruit: 1.15, noble: -6 } },
  renza:  { n: '連帯責任の法',   d: '隣り合う家々を連帯責任とする。治安が大きく上がるが民心は下がる。', eff: { order: 12, loyal: -6 } },
  junou:  { n: '農を重んじる',   d: '小さな自作農を守り、商いを抑える。兵糧は増えるが金収入は減る。', eff: { agri: 1.2, comm: 0.85 } },
  genzei: { n: '減税',           d: '税を軽くする。民心が上がり人口が増えるが、金収入は減る。', eff: { loyal: 8, gold: 0.8, grow: 1.2 } },
  kaihei: { n: '総動員',         d: '兵役に就ける男をすべて呼び集める。兵は大きく増えるが人口の伸びと民心が落ちる。', eff: { recruit: 1.35, grow: 0.7, loyal: -5 } },
  kakkei: { n: '外国人の登用',   d: '他国の人材を広く召し抱える。人材が集まるが、古い家臣は面白くない。', eff: { talent: 1.6, noble: -4 } },
  doryo:  { n: '貨幣の統一',     d: '銀貨と升と秤を揃える。商いが盛んになる。', eff: { comm: 1.15 } },
  tonden: { n: '兵の植民',       d: '辺境に退役兵の植民市（コロニア）を置き、田を耕させる。兵糧の消費が減る。', eff: { upkeep: 0.85 } },
  kofuku: { n: '騎兵の改革',     d: '騎馬の民の馬と戦い方を取り入れる。騎兵が強くなる。', eff: { cav: 1.12, noble: -4 } },
  heiho:  { n: '軍事教練',       d: '国を挙げて兵を鍛える。全軍の練度が上がりやすい。', eff: { train: 1.25 } },
  genkei: { n: '厳しい刑罰',     d: '刑を重くする。治安は上がるが民心は離れる。', eff: { order: 10, loyal: -9 } },
  jinsei: { n: '寛容な政',       d: '民をいたわる政。民心と人口が伸びるが治安はゆるむ。', eff: { loyal: 10, grow: 1.15, order: -5 } },
  joukei: { n: '役人の監査',     d: '役人の帳簿を毎年厳しく調べる。内政の効果が上がる。', eff: { dev: 1.15 } },
  census: { n: 'ケンスス',       d: '市民の財産を五年ごとに調べ、兵役と税を割り当てる。兵が集まり、治安も上がる。', eff: { recruit: 1.12, order: 4 } },
  socii:  { n: '同盟市の兵',     d: '同盟を結んだ都市に兵を出させる。兵は大きく増えるが、同盟市の不満がたまる。', eff: { recruit: 1.2, loyal: -3 } },
  merc:   { n: '傭兵の雇用',     d: 'リビア・イベリア・ガリア・バレアレスの傭兵を雇う。兵は集まるが金がかかり、士気は低め。', eff: { recruit: 1.25, gold: 0.88, morale: -2 } },
  hetairoi: { n: '王の友の騎兵', d: '王に近い貴族の子弟を騎兵として仕えさせる。騎兵が強く、貴族も満足する。', eff: { cav: 1.1, noble: 4 } },
  granary: { n: '穀物の専売',    d: 'ナイルの穀物を王が買い上げて売る。金収入が大きく伸びるが民は苦しむ。', eff: { gold: 1.2, loyal: -4 } },
  walls:  { n: '城壁と兵器',     d: '都の城壁と投石機・弩砲を整える。治安が上がり、兵の練度も上がりやすい。', eff: { order: 5, train: 1.08 } },
};
D.LAW_ORDER = Object.keys(D.LAWS);

/* ---------- 大臣の担当 ---------- */
D.MINISTRIES = {
  chiso:   { n: '財務長官',     d: '国の穀物と財政を司る（ディオイケテス・クァエストル）。全国の農政と倉を動かせる。' },
  shofu:   { n: '王室財務官',   d: '王室の財と国営の工房を司る。武具の質と財源を動かせる。' },
  teii:    { n: '法務官',       d: '裁判と刑罰を司る（プラエトル）。全国の治安と謀反の摘発を担う。' },
  tenkaku: { n: '外交の長',     d: '使節と外国の王・部族の応接を司る。他国との関係を動かせる。' },
  eii:     { n: '親衛隊長',     d: '宮殿と都の衛兵を指揮する。五千の衛兵を率いる武官寄りの職。' },
  taiboku: { n: '厩舎と象舎の長', d: '馬と戦象を司る。騎兵の数と質を左右する。' },
  hojo:    { n: '神官長',       d: '神殿の祭祀・暦・占いを司る（ポンティフェクス）。民心と災害への備えを担う。' },
  rouchu:  { n: '侍従長',       d: '君主の側近と若い近習を統べる。人材の登用と育成を担う。' },
  sosei:   { n: '家宰',         d: '君主の一族と名門を統べる。一族の反乱を防ぎ、婚姻で外交を助ける。' },
};
D.MIN_ORDER = Object.keys(D.MINISTRIES);

/* ---------- 施設（私領・管轄） ---------- */
D.FAC = {
  farm:     { n: '農園',   d: '兵糧収入+30%/Lv（麦・オリーブ・ぶどう）', base: 2000 },
  market:   { n: '市場',   d: '金収入+30%/Lv',              base: 2400 },
  barracks: { n: '兵舎',   d: '私兵の募集と上限が増える',    base: 3000 },
  smithy:   { n: '鍛冶場', d: '装備強化が安くなり、上位装備が解禁',  base: 3500 },
  drill:    { n: '練兵場', d: '訓練効果+15%/Lv。長槍の密集陣を鍛えられる', base: 3000 },
  stable:   { n: '厩舎',   d: '騎兵・戦車を編成できる',      base: 4000 },
  workshop: { n: '工房',   d: '弩砲兵・攻城兵器を編成できる',  base: 4000 },
  school:   { n: '学び舎', d: '鍛錬効果が上がり、人材が集まる', base: 3000 },
  wall:     { n: '城壁',   d: '領地の防御。賊や敵襲に強くなる', base: 2500 },
};
D.FAC_ORDER = Object.keys(D.FAC);

/* ---------- 名品・装備 ---------- */
D.ITEMS = {
  bronze_sword: { n: '青銅の剣',   k: 'weapon', price: 1200,  eff: { bu: 2 }, d: '昔ながらの青銅の剣。' },
  iron_sword:   { n: 'グラディウス', k: 'weapon', price: 6000, eff: { bu: 4 }, d: 'ヒスパニア風の鋼の短剣。突きに優れ、よく斬れる。' },
  long_ji:      { n: '重い長槍',   k: 'weapon', price: 9000,  eff: { bu: 5, duel: 1.05 }, d: '騎兵の使う樫の長槍（クシュストン）。' },
  kansho:       { n: 'ピュロスの剣', k: 'weapon', price: 120000, eff: { bu: 10, duel: 1.15 }, rare: true, d: 'エペイロス王ピュロスが帯びた名剣。' },
  bakuya:       { n: '名工のファルカタ', k: 'weapon', price: 120000, eff: { bu: 9, mi: 3 }, rare: true, d: 'イベリアの名工が鍛えた曲刀。骨まで断つ。' },
  tanro:        { n: '大王の剣',   k: 'weapon', price: 160000, eff: { bu: 8, tou: 4 }, rare: true, d: 'アレクサンドロス大王が帯びたと伝わる剣。持つ者に王者の威を与える。' },
  leather:      { n: '革の鎧',     k: 'armor',  price: 1500,  eff: { hp: 10 }, d: '革の胸当て。' },
  rhino:        { n: '亜麻の胸甲', k: 'armor',  price: 15000, eff: { hp: 25 }, d: '亜麻布を何枚も貼り合わせた軽くて丈夫な鎧（リノトラクス）。' },
  iron_armor:   { n: '鎖かたびら', k: 'armor',  price: 40000, eff: { hp: 35, tou: 2 }, d: 'ガリア人の発明した鉄の輪の鎧（ロリカ）。' },
  horse:        { n: '駿馬',       k: 'horse',  price: 8000,  eff: { spd: 1.1, duel: 1.03 }, d: '足の速い馬。' },
  qianli:       { n: 'ブケファラスの血の馬', k: 'horse', price: 90000, eff: { spd: 1.2, duel: 1.08, tou: 2 }, rare: true, d: '大王の愛馬ブケファラスの血を引くという名馬。' },
  sunzi:        { n: 'クセノフォンの騎兵論', k: 'book', price: 30000, eff: { chi: 4, tou: 3 }, d: '一万人の退却を率いたクセノフォンの書。' },
  wuzi:         { n: 'アイネイアスの籠城術', k: 'book', price: 25000, eff: { tou: 5 }, d: '包囲された町をどう守るかを説く兵法家の書。' },
  weiliaozi:    { n: 'ピュロスの兵法', k: 'book',  price: 20000, eff: { tou: 2, chi: 2 }, d: 'ハンニバルが随一と称えた将の陣の書。' },
  shangjun:     { n: 'アリストテレスの政治学', k: 'book', price: 25000, eff: { pol: 5 }, d: '国のかたちを説く大王の師の書。' },
  guanzi:       { n: '家政論',     k: 'book',   price: 25000, eff: { pol: 3, chi: 2 }, d: '家と土地の治め方を説く書。' },
  heshi:        { n: '大王の印章指輪', k: 'treasure', price: 300000, eff: { mi: 10 }, rare: true, d: 'アレクサンドロス大王が死の床で渡したと伝わる指輪。王たちが喉から手が出るほど欲しがる。' },
  suihou:       { n: '黄金のスカラベ', k: 'treasure', price: 200000, eff: { mi: 6, chi: 2 }, rare: true, d: 'ファラオの墓から出たという聖なる甲虫の護符。' },
};
D.SHOP_BASE = ['bronze_sword', 'iron_sword', 'long_ji', 'leather', 'rhino', 'iron_armor', 'horse', 'sunzi', 'wuzi', 'weiliaozi', 'shangjun', 'guanzi'];

/* ---------- 人名 ---------- */
// 文化ごとの名（m: 名, h: 家名・氏族名・部族名）。ローマは「名・氏族名」、ほかは名だけを表に出す
D.NAMES = {
  latin: { m: ['ガイウス', 'ルキウス', 'マルクス', 'プブリウス', 'クィントゥス', 'ティトゥス', 'グナエウス', 'セクストゥス', 'アウルス', 'スプリウス', 'デキムス', 'マニウス', 'ティベリウス', 'セルウィウス', 'アッピウス', 'ヌメリウス', 'ウィビウス', 'ガウィウス'],
           h: ['コルネリウス', 'アエミリウス', 'クラウディウス', 'ファビウス', 'ウァレリウス', 'センプロニウス', 'フルウィウス', 'マルキウス', 'ユニウス', 'リウィウス', 'ポストゥミウス', 'ミヌキウス', 'テレンティウス', 'ポルキウス', 'セルウィリウス', 'アティリウス', 'カエキリウス', 'ドミティウス', 'フラミニウス', 'ホスティリウス', 'ラエリウス', 'オクタウィウス', 'ユリウス', 'リキニウス', 'マンリウス', 'クィンクティウス', 'ポンポニウス', 'ウェトゥリウス', 'アキリウス', 'ルタティウス', 'アウレリウス', 'ペトロニウス', 'ウィビウス', 'ヘレンニウス', 'ルクレティウス', 'ノルバヌス'] },
  greek: { m: ['アリストン', 'ディオン', 'フィロン', 'ニカノル', 'テオドトス', 'クレオン', 'デメトリオス', 'アンドロニコス', 'ヘラクレイデス', 'ゼノン', 'カッリクラテス', 'エウメネス', 'メネラオス', 'フィリスコス', 'ニコラオス', 'リュシマコス', 'アポロニオス', 'テオフィロス', 'ディオクレス', 'クリトン', 'エピクラテス', 'ポリュクセノス', 'アルケラオス', 'ストラトン', 'パンタレオン', 'アガトン', 'カリアス', 'メノン', 'ドリマコス', 'スコパス', 'アレクサメノス', 'ヒッパルコス', 'クセナルコス', 'テイシアス', 'ポリュクラテス', 'エウクレイデス', 'ディオゲネス', 'ソストラトス'],
           h: ['テメノス', 'ネレウス', 'アルクマイオン', 'ペロプス', 'カドモス', 'ダナオス', 'アイアコス', 'ケクロプス', 'エレクテウス', 'メラムプス', 'イオン', 'ドロス', 'アイオロス', 'ヘラクレス'] },
  maced: { m: ['アミュンタス', 'ペルディッカス', 'クラテロス', 'レオンナトス', 'アルキダモス', 'メレアグロス', 'ニカノル', 'アッタロス', 'カッサンドロス', 'フィロタス', 'パルメニオン', 'アサンドロス', 'ブラキュッレス', 'ゼウクシス', 'ヘラクレイデス', 'アレクサンドロス', 'ポリュペルコン', 'ディダス', 'ニカノル', 'アンドロステネス', 'ペイトン', 'ヒッポロコス'],
           h: ['テメノス', 'アルゲアダイ', 'リュンケスタイ', 'オレスタイ', 'エリメイア', 'ペラゴニア', 'ボッティアイア'] },
  punic: { m: ['ハンノ', 'ハスドルバル', 'ハミルカル', 'マゴ', 'ボミルカル', 'ギスコ', 'ハミルコ', 'アドヘルバル', 'カルタロ', 'ヒミルコ', 'ボドストル', 'マハルバル', 'ムットゥネス', 'サッポ', 'アブディメルカルト', 'バアルヤトン', 'エシュムニアトン', 'ボスタル', 'ハンニバル', 'ヒエンプサル'],
           h: ['バルカ', 'マゴ', 'ハンノ', 'ギスコ', 'ボミルカル', 'アブディ', 'ヒルマ', 'バアル'] },
  numid: { m: ['ガイア', 'オザルケス', 'カペウッサ', 'マザエトゥッルス', 'ラクマゼス', 'ウェルミナ', 'ミキプサ', 'グルッサ', 'マスタナバル', 'ヤルバス', 'ガウダ', 'オクサユンタス', 'マッシウァ', 'ナラウァス', 'ビッティアス', 'アルコバルザネス'],
           h: ['マッシュリ', 'マサエシュリ', 'ガエトゥリ', 'ムスラミ', 'ナサモネス'] },
  iber:  { m: ['インディビリス', 'マンドニウス', 'アッルキウス', 'エデコ', 'アッルクス', 'ビルスティス', 'カウケノス', 'アロス', 'イストラタエウス', 'オリッソン', 'ルクセニウス', 'アタネス', 'コルブス', 'オルソ'],
           h: ['イレルゲテス', 'アウセタニ', 'オレタニ', 'トゥルデタニ', 'エデタニ', 'バステタニ', 'ケルティベリ', 'ルシタニ'] },
  celt:  { m: ['ドゥコマルス', 'ブリトマルトゥス', 'ウィリドマルス', 'アネロエストゥス', 'コンコリタヌス', 'アッリンギオス', 'ボイオリクス', 'オルトマルス', 'カトゥマルス', 'コマヌス', 'マグルス', 'ウェルキッロス', 'セゴウェスス', 'ブレンノス', 'ドゥムノリクス'],
           h: ['ボイイ', 'インスブレス', 'ケノマニ', 'セノネス', 'タウリニ', 'アッロブロゲス', 'ウォルカエ', 'トリストボギイ'] },
  egypt: { m: ['ペトシリス', 'ホル', 'パンキス', 'ペテセ', 'パメネス', 'オンノフリス', 'アメンホテプ', 'ハルシエシス', 'パシス', 'ヘリエウス', 'イナロス', 'ネフェルヘテプ', 'パエシス'],
           h: ['テーベ', 'メンフィス', 'サイス', 'エドフ', 'ブバスティス'] },
  syria: { m: ['バルラム', 'アブダシュタルト', 'ヤシュブ', 'マッタニア', 'シモン', 'ヨナタン', 'エレアザル', 'アブダルス', 'ネタネル', 'ヒラム', 'ザブディエル', 'イアソン'],
           h: ['テュロス', 'シドン', 'アラドス', 'ダマスコス', 'ベリュトス'] },
  anat:  { m: ['モアゲテス', 'オルティアゴン', 'ガラトス', 'ロイメタルケス', 'アリアラテス', 'ミトリダテス', 'オロフェルネス', 'パルナケス', 'ジアエラス', 'プルシアス'],
           h: ['リュディア', 'カリア', 'フリュギア', 'ピシディア', 'パフラゴニア'] },
};
// 国ごとの人の文化（重みつき）
D.CNAME = {
  rome: { latin: 10 }, carth: { punic: 8, iber: 1, numid: 1 }, mace: { maced: 6, greek: 4 }, sele: { maced: 5, greek: 3, syria: 1, anat: 1 },
  ptol: { maced: 4, greek: 4, egypt: 2 }, syra: { greek: 10 }, numi: { numid: 10 }, bandit: { greek: 3, celt: 2, iber: 2, punic: 1, latin: 1 }, nomad: { celt: 10 },
};
// 古い形の名簿（使わないが、改造データとの互換のため残す）
D.SURN = D.NAMES.latin.h; D.GIVN = D.NAMES.latin.m; D.GIVN2 = [];

/* ---------- 史実の人物 ---------- */
// 26_hist.js で data/hist.json から読み込む
D.HIST = [];

/* ---------- 地勢ごとの合戦マップ ---------- */
D.TERRAIN_THEME = {
  plain:  { n: '平原', hill: 0.62, forest: 0.68, mount: 0, river: 0, marsh: 0 },
  hill:   { n: '丘陵', hill: 0.5, forest: 0.64, mount: 0.86, river: 0, marsh: 0 },
  mount:  { n: '山地', hill: 0.48, forest: 0.6, mount: 0.7, river: 0, marsh: 0 },
  forest: { n: '森林', hill: 0.58, forest: 0.5, mount: 0, river: 0, marsh: 0 },
  river:  { n: '河川', hill: 0.62, forest: 0.68, mount: 0, river: 1, marsh: 0.8 },
  marsh:  { n: '湿地', hill: 0.7, forest: 0.66, mount: 0, river: 0.6, marsh: 0.6 },
  steppe: { n: '草原', hill: 0.66, forest: 0.86, mount: 0, river: 0, marsh: 0 },
  pass:   { n: '峠', hill: 0.5, forest: 0.62, mount: 0.6, river: 0, marsh: 0 },
  coast:  { n: '海辺', hill: 0.6, forest: 0.72, mount: 0, river: 0, marsh: 0 },
  desert: { n: '荒れ野', hill: 0.64, forest: 0.95, mount: 0, river: 0, marsh: 0 },
};

/* ---------- 天候 ---------- */
D.WEATHER = {
  clear: { n: '晴れ', d: '良い天気。' },
  cloud: { n: '曇り', d: '雲が低く垂れこめている。' },
  rain:  { n: '雨', d: '弓弩の射程と命中が落ち、火がつきにくい。足元が悪く、戦車が弱る。' },
  fog:   { n: '霧', d: '視界が大きく狭まり、伏兵が見つけにくい。射程も落ちる。' },
  snow:  { n: '雪', d: '動きが鈍り、疲れやすく、士気が下がる。火はつきにくい。' },
  wind:  { n: '強風', d: '火が燃え広がりやすく、矢がそれやすい。' },
};
D.weatherFor = (month, theme, north) => {
  const w = month <= 3 ? { clear: 5, cloud: 3, rain: 2, fog: 2, wind: 1, snow: month <= 2 ? 1 : 0 }
    : month <= 6 ? { clear: 5, cloud: 2, rain: 3, fog: 1, wind: 1 }
    : month <= 9 ? { clear: 6, cloud: 3, rain: 1.5, fog: 1, wind: 2 }
    : { clear: 4, cloud: 3, snow: north ? 4 : 1.5, wind: 2, fog: 1 };
  if (theme === 'marsh' || theme === 'river') { w.fog = (w.fog || 0) + 2; w.rain = (w.rain || 0) + 1; }
  if (theme === 'steppe' || theme === 'desert') w.wind = (w.wind || 0) + 2;
  if (theme === 'desert') { w.rain = 0.3; w.snow = 0; w.fog = 0.3; w.clear = (w.clear || 0) + 4; }
  if (theme === 'coast') w.fog = (w.fog || 0) + 1;
  if (theme === 'mount' || theme === 'pass') w.fog = (w.fog || 0) + 1;
  return U.wpick(Object.keys(w), k => w[k]);
};

/* ---------- 戦場の地形タイル ---------- */
// mv: 移動倍率 [inf, cav, chr, sie, mount], def: 防御倍率, cov: 矢の遮蔽, hide: 伏兵可, burn: 燃える
D.TILE = [
  { n: '平地', c: '#a9a06a', mv: [1, 1, 1, 1, 1], def: 1, cov: 0, hide: 0, burn: 0.2, fk: 't_plain', chrOk: 1 },        // 0
  { n: '荒地', c: '#a08a62', mv: [0.95, 0.95, 0.9, 0.9, 1], def: 1, cov: 0, hide: 0, burn: 0, fk: 't_plain', chrOk: 1 },   // 1
  { n: '森', c: '#4d6a45', mv: [0.6, 0.45, 0.15, 0.25, 1], def: 1.2, cov: 0.45, hide: 1, burn: 1, fk: 't_forest', mvk: 'mv_forest', cavBad: 1, cover: 1 }, // 2
  { n: '丘', c: '#b9aa78', mv: [0.8, 0.75, 0.5, 0.5, 1], def: 1.12, cov: 0.1, hide: 0, burn: 0.1, fk: 't_hill' }, // 3
  { n: '山', c: '#6e6a62', mv: [0.25, 0, 0, 0, 0.8], def: 1.35, cov: 0.4, hide: 1, burn: 0, fk: 't_mount', mvk: 'mv_mount' },       // 4
  { n: '川', c: '#4e7d8e', mv: [0, 0, 0, 0, 0], def: 0.8, cov: 0, hide: 0, burn: 0, fk: 't_water', mvk: 'mv_water' },               // 5
  { n: '浅瀬', c: '#79a0a3', mv: [0.45, 0.5, 0.3, 0.2, 0.45], def: 0.75, cov: 0, hide: 0, burn: 0, fk: 't_water', mvk: 'mv_water' }, // 6
  { n: '湿地', c: '#728061', mv: [0.55, 0.4, 0.1, 0.15, 0.55], def: 0.9, cov: 0.1, hide: 1, burn: 0.3, fk: 't_marsh', mvk: 'mv_marsh', cavBad: 1 }, // 7
  { n: '道', c: '#c3ae84', mv: [1.15, 1.15, 1.2, 1.2, 1.15], def: 1, cov: 0, hide: 0, burn: 0, fk: 't_plain', chrOk: 1 },    // 8
  { n: '城壁', c: '#5d5249', mv: [0, 0, 0, 0, 0], def: 3, cov: 0.8, hide: 0, burn: 0, fk: 't_city' },             // 9
  { n: '城門', c: '#6e4b2f', mv: [0, 0, 0, 0, 0], def: 2, cov: 0.5, hide: 0, burn: 0, fk: 't_city' },             // 10
  { n: '城内', c: '#9e927d', mv: [1, 0.9, 0.7, 0.8, 1], def: 1.1, cov: 0.2, hide: 0, burn: 0, fk: 't_city' },     // 11
  { n: '焼跡', c: '#4a453c', mv: [0.95, 0.95, 0.9, 0.9, 1], def: 1, cov: 0, hide: 0, burn: 0, fk: 't_plain', chrOk: 1 },     // 12
  { n: '山道', c: '#857a66', mv: [0.5, 0, 0, 0, 0.9], def: 1.2, cov: 0.3, hide: 1, burn: 0, fk: 't_pass', fk2: 't_mount', mvk: 'mv_mount' },       // 13
  { n: '門(破)', c: '#5a4636', mv: [0.8, 0.7, 0.5, 0.6, 0.8], def: 1, cov: 0, hide: 0, burn: 0, fk: 't_city' },  // 14
  { n: '田畑', c: '#b3a468', mv: [0.92, 0.88, 0.75, 0.85, 1], def: 1, cov: 0, hide: 0, burn: 0.45, fk: 't_field', chrOk: 1 },   // 15
  { n: '灌漑畑', c: '#8c9f78', mv: [0.6, 0.45, 0.2, 0.3, 0.6], def: 0.95, cov: 0, hide: 0, burn: 0, fk: 't_field', fk2: 't_marsh', mvk: 'mv_marsh', cavBad: 1 }, // 16
  { n: '村', c: '#9c8566', mv: [0.8, 0.55, 0.35, 0.6, 1], def: 1.25, cov: 0.35, hide: 1, burn: 0.8, fk: 't_village', cover: 1 },  // 17
  { n: '小川', c: '#6e95a0', mv: [0.7, 0.75, 0.35, 0.45, 0.7], def: 0.85, cov: 0, hide: 0, burn: 0, fk: 't_water', mvk: 'mv_water' }, // 18
  { n: '林', c: '#6c8756', mv: [0.82, 0.7, 0.4, 0.5, 1], def: 1.1, cov: 0.25, hide: 1, burn: 0.85, fk: 't_forest', mvk: 'mv_forest', cover: 1 }, // 19
  { n: '岩場', c: '#8b847a', mv: [0.6, 0.35, 0.1, 0.2, 0.8], def: 1.2, cov: 0.3, hide: 1, burn: 0, fk: 't_mount', mvk: 'mv_mount', cavBad: 1 }, // 20
  { n: '池', c: '#5a8794', mv: [0, 0, 0, 0, 0], def: 0.8, cov: 0, hide: 0, burn: 0, fk: 't_water', mvk: 'mv_water' },              // 21
  { n: '砂地', c: '#cbb483', mv: [0.8, 0.78, 0.55, 0.6, 0.9], def: 0.95, cov: 0, hide: 0, burn: 0, fk: 't_plain', fk2: 't_steppe' },  // 22
  { n: '橋', c: '#8b6c47', mv: [1, 0.95, 0.85, 0.9, 1], def: 0.9, cov: 0, hide: 0, burn: 0.5, fk: 't_plain', chrOk: 1 },        // 23
  { n: '草原', c: '#b0aa70', mv: [1, 1.08, 1.02, 1, 1], def: 1, cov: 0, hide: 0, burn: 0.55, fk: 't_steppe', fk2: 't_plain', chrOk: 1 }, // 24
  // ---- 地中海の戦場で増えた地形（mv の六つ目は船） ----
  { n: '海', c: '#3f6f86', mv: [0, 0, 0, 0, 0, 1], def: 0.8, cov: 0, hide: 0, burn: 0, fk: 't_water', mvk: 'mv_water', sea: 1 },                       // 25
  { n: '浅い海', c: '#6f9ca6', mv: [0.35, 0.3, 0.05, 0.05, 0.35, 0.55], def: 0.75, cov: 0, hide: 0, burn: 0, fk: 't_water', mvk: 'mv_water', sea: 1 }, // 26
  { n: '崖', c: '#7d7468', mv: [0, 0, 0, 0, 0.25, 0], def: 1.4, cov: 0.4, hide: 1, burn: 0, fk: 't_mount', mvk: 'mv_mount' },                  // 27
  { n: '砂丘', c: '#d4bb88', mv: [0.7, 0.65, 0.3, 0.35, 0.85, 0], def: 1.08, cov: 0.12, hide: 1, burn: 0, fk: 't_steppe', mvk: 'mv_rough' },   // 28
  { n: '果樹園', c: '#7f9a5a', mv: [0.8, 0.55, 0.25, 0.5, 1, 0], def: 1.1, cov: 0.2, hide: 1, burn: 0.6, fk: 't_forest', mvk: 'mv_forest', cover: 1, cavBad: 1 }, // 29
  { n: '柵', c: '#8a6a44', mv: [0.18, 0, 0, 0, 0.2, 0], def: 1.45, cov: 0.5, hide: 0, burn: 0.9, fk: 't_city', obst: 1 },                       // 30
  { n: '堀', c: '#6c5a40', mv: [0.3, 0.12, 0, 0, 0.35, 0], def: 0.75, cov: 0.1, hide: 0, burn: 0, fk: 't_marsh', obst: 1, cavBad: 1 },            // 31
  { n: '逆茂木', c: '#5d5a34', mv: [0.25, 0.04, 0, 0.05, 0.3, 0], def: 1.25, cov: 0.3, hide: 0, burn: 1, fk: 't_forest', obst: 1, cavBad: 1 },   // 32
  { n: '岩塊', c: '#8e877c', mv: [0.55, 0.25, 0.03, 0.1, 0.85, 0], def: 1.2, cov: 0.4, hide: 1, burn: 0, fk: 't_mount', obst: 1, cavBad: 1 },    // 33
  { n: '荷車の砦', c: '#7a5a3a', mv: [0.25, 0, 0, 0, 0.3, 0], def: 1.35, cov: 0.45, hide: 0, burn: 0.8, fk: 't_city', obst: 1 },              // 34
  { n: '石垣', c: '#8a8070', mv: [0.35, 0.08, 0, 0.05, 0.5, 0], def: 1.35, cov: 0.5, hide: 0, burn: 0, fk: 't_city', obst: 1 },               // 35
  { n: '廃墟', c: '#958a76', mv: [0.7, 0.4, 0.15, 0.3, 0.9, 0], def: 1.2, cov: 0.4, hide: 1, burn: 0.1, fk: 't_village', obst: 1, cover: 1 },  // 36
  { n: '家並み', c: '#a08a6c', mv: [0.22, 0, 0, 0, 0.3, 0], def: 1.5, cov: 0.7, hide: 1, burn: 0.85, fk: 't_village', cover: 1, cavBad: 1 },  // 37
  { n: '神殿', c: '#cfc4ab', mv: [0.3, 0, 0, 0, 0.3, 0], def: 1.6, cov: 0.8, hide: 0, burn: 0.2, fk: 't_city', cover: 1 },                    // 38
  { n: '広場', c: '#b8aa8c', mv: [1, 0.9, 0.7, 0.9, 1, 0], def: 1, cov: 0, hide: 0, burn: 0, fk: 't_city', chrOk: 1 },                       // 39
];
// 移動の格の六つ目（船）。陸の地形は船では進めない。川と池は小舟なら進める
for (let i = 0; i < D.TILE.length; i++) { const t = D.TILE[i]; if (t.mv.length < 6) t.mv.push(i === 5 || i === 21 ? 0.7 : 0); }
D.T = { PLAIN: 0, DIRT: 1, FOREST: 2, HILL: 3, MOUNT: 4, RIVER: 5, FORD: 6, MARSH: 7, ROAD: 8, WALL: 9, GATE: 10, CITY: 11, BURNT: 12, PATH: 13, BROKEN: 14, FIELD: 15, PADDY: 16, VILLAGE: 17, STREAM: 18, GROVE: 19, ROCK: 20, POND: 21, SAND: 22, BRIDGE: 23, GRASS: 24,
  SEA: 25, SHOAL: 26, CLIFF: 27, DUNE: 28, ORCHARD: 29, PALISADE: 30, DITCH: 31, ABATIS: 32, BOULDER: 33, WAGON: 34, STONEWALL: 35, RUINS: 36, HOUSE: 37, TEMPLE: 38, PLAZA: 39 };
// 水（陸の兵は通れない）
D.isWater = (t) => t === D.T.RIVER || t === D.T.POND || t === D.T.SEA;
D.isSea = (t) => t === D.T.SEA || t === D.T.SHOAL;
// 障害物（燃やせる・壊せるものもある）
D.isObst = (t) => !!(D.TILE[t] && D.TILE[t].obst);
D.MVCLS = { inf: 0, rng: 0, cav: 1, chr: 2, sie: 3, nav: 5 };

D.SEASON = m => m <= 3 ? '春' : m <= 6 ? '夏' : m <= 9 ? '秋' : '冬';
