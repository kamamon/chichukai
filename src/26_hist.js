/* =========================================================
   地中海覇道 — 史実の人物・名品・国法・施設の追加
   ========================================================= */
// [名前, 国, 役職, 武, 統, 知, 政, 魅, 年齢(前218年), 特性, 型, 没年, 部隊特記, 戦術, 登場年, 経歴[[年, 官職], …]（省いてよい）]
D.HIST = DATA_JSON.hist;   // data/hist.json（ビルドで埋め込む）

/* ---------- 名品（効果つき） ---------- */
// 鍵は七雄覇道のまま（セーブ・事件が参照する）。名と説明を地中海の品に差し替えた
Object.assign(D.ITEMS, {
  gyocho:     { n: 'ハルモディオスの短剣', k: 'weapon', price: 90000,  eff: { bu: 6 }, fx: { duel: 0.08, stealth: 0.1 }, rare: true, d: 'ミルテの枝に隠せるほどの短剣。アテナイのハルモディオスとアリストゲイトンが、これで僭主の弟を刺した。' },
  junkin:     { n: 'ダモクレスの剣', k: 'weapon', price: 140000, eff: { bu: 8, mi: 2 }, fx: { duel: 0.06, fame: 0.05 }, rare: true, d: 'シュラクサイの僭主の玉座の上に、馬の毛一本で吊るされていたという剣。持つ者は権力の危うさを知り、その話は人の口にのぼる。' },
  taia:       { n: 'ブレンヌスの剣', k: 'weapon', price: 180000, eff: { bu: 7, tou: 5 }, fx: { aura: 0.15, mor: 4 }, rare: true, d: 'ローマを焼いたガリアの王ブレンヌスの長剣。「敗者に災いあれ」と黄金の秤に投げ込まれた。掲げれば味方は奮い立つ。' },
  ryuen:      { n: 'ケルティベリアの名剣', k: 'weapon', price: 150000, eff: { bu: 9 }, fx: { duel: 0.1 }, rare: true, d: '鉄の板を土に埋めて弱い所を錆びさせ、残った鋼だけで鍛えた剣。頭の上まで曲げても元に戻るという。' },
  hanjaku:    { n: 'オデュッセウスの強弓', k: 'weapon', price: 60000,  eff: { bu: 4 }, fx: { rng_dmg: 0.12, rng_range: 0.1 }, rare: true, d: '求婚者たちを射倒したオデュッセウスの弓と伝わる。並の者には弦も張れない。' },
  ugou:       { n: 'ヘラクレスの弓', k: 'weapon', price: 70000,  eff: { bu: 4, chi: 1 }, fx: { rng_dmg: 0.1, snipe: 0.15 }, rare: true, d: 'ヘラクレスからピロクテテスに渡ったと伝わる弓。その矢は狙いを外さない。' },
  keishi:     { n: 'ガストラフェテス', k: 'weapon', price: 45000,  eff: { bu: 3 }, fx: { u_xbow: 0.12, rng_range: 0.08 }, d: '腹に当てて弦を引く、ギリシアの大きな弩（腹当て弓）。並の弓より遠くの敵を、盾ごと射抜く。' },
  jiriki:     { n: 'ポリュボロス',   k: 'weapon', price: 40000,  eff: { bu: 3 }, fx: { u_xbow: 0.1, rng_rate: 0.08 }, d: 'アレクサンドリアのディオニュシオスが作り、ロドスの兵器庫に置かれた連射の弩砲。取っ手を回すと矢が次々に送り出される。' },
  shohu_do:   { n: 'シュラクサイの弩砲', k: 'weapon', price: 30000, eff: { bu: 2 }, fx: { u_xbow: 0.08 }, d: 'シュラクサイの兵器工房で作られた小型の弩砲（スコルピオ）。この町は弩砲が生まれた所だ。' },
  bronze_ge:  { n: 'ホプリタイの槍', k: 'weapon', price: 3000,   eff: { bu: 2, tou: 1 }, fx: { u_spear: 0.03 }, d: 'ギリシアの重装歩兵が構える長い槍（ドリュ）。穂先が折れても、尻の石突きで戦える。' },
  shield_rh:  { n: '大盾スクトゥム', k: 'armor',  price: 12000,  eff: { hp: 15 }, fx: { arrow_res: 0.08, u_shield: 0.05 }, d: '薄い板を貼り合わせて革で覆った、身の丈ほどの楕円の大盾。矢も投げ槍も受け止める。' },
  gyorin_kou: { n: '黄金の鱗の鎧', k: 'armor',  price: 60000,  eff: { hp: 40, tou: 2 }, fx: { def: 0.05 }, rare: true, d: '金の小札を魚の鱗のように重ねたペルシアの鎧。プラタイアでペルシアの騎兵の将が着ていたものは、槍も矢も通さなかったという。' },
  helmet:     { n: 'ボイオティアの兜', k: 'armor', price: 8000,  eff: { hp: 12 }, fx: { lead_surv: 0.1 }, d: 'クセノフォンが騎兵に勧めた、視界をさえぎらない青銅の兜。将の命を拾う。' },
  kanketsu:   { n: 'ニサイアの名馬', k: 'horse',  price: 150000, eff: { spd: 1.25, duel: 1.1, tou: 2 }, fx: { u_lcav: 0.06, chg: 0.06 }, rare: true, d: 'メディアのニサイアの野で育つ大王たちの馬。大きく、速く、疲れを知らない。' },
  hu_horse:   { n: 'スキタイの馬', k: 'horse',  price: 20000,  eff: { spd: 1.12 }, fx: { u_harch: 0.05 }, d: '黒海の北の草原で育った、騎射の民の頑丈な馬。' },
  rikutou:    { n: 'キュロスの教育', k: 'book',  price: 40000,  eff: { tou: 4, chi: 3 }, fx: { form_all: 0.04 }, d: 'クセノフォンがペルシアの大王キュロスに託して、将と王の道を説いた書。兵の組み方と動かし方にくわしい。' },
  shibahou:   { n: 'リュクルゴスの掟', k: 'book', price: 25000,  eff: { tou: 3, pol: 2 }, fx: { order: 0.05, mor: 2 }, d: 'スパルタの立法者リュクルゴスが定めたと伝わる掟。戦士の規律と質素を説く。' },
  sunbin:     { n: 'クサンティッポスの兵法', k: 'book', price: 45000, eff: { chi: 5, tou: 2 }, fx: { pincer: 0.05, ambush: 0.05 }, rare: true, d: 'カルタゴに雇われたスパルタ人の書。騎兵と戦象で敵を包み込み、ローマの執政官レグルスを破った。' },
  mozi:       { n: 'アルキメデスの書', k: 'book', price: 20000,  eff: { chi: 3, pol: 2 }, fx: { siege_def: 0.1, fort: 0.08 }, d: 'てこと滑車の理を説く書。「足場をくれれば大地を動かしてみせよう」。城を守る機械の工夫に役立つ。' },
  laozi:      { n: 'エピクロスの書簡', k: 'book', price: 20000,  eff: { chi: 3, mi: 2 }, fx: { health: 0.05 }, d: '心の平静と質素な暮らしを説く、エピクロスの手紙。' },
  lunyu:      { n: 'プラトンの対話篇', k: 'book', price: 20000,  eff: { pol: 3, mi: 2 }, fx: { loyal: 0.05 }, d: 'ソクラテスの問いと言葉を、弟子のプラトンが書き残した書。' },
  huangdi:    { n: 'ヒポクラテスの医書', k: 'book', price: 35000, eff: { chi: 2 }, fx: { heal: 0.15, health: 0.08 }, d: 'コスの医師ヒポクラテスとその弟子たちの書。傷病の手当てと養生がうまくなる。' },
  lvshi:      { n: 'エウクレイデスの原論', k: 'book', price: 50000, eff: { chi: 3, pol: 3 }, fx: { exp: 0.06 }, rare: true, d: 'アレクサンドリアのエウクレイデスが図形の理をまとめた十三巻。「学問に王の近道はない」。' },
  hanzi:      { n: 'ソロンの法',   k: 'book',   price: 50000,  eff: { pol: 5, chi: 3 }, fx: { order: 0.08 }, rare: true, d: 'アテナイの賢人ソロンが定めた法。借金で市民を奴隷にすることを禁じ、富む者と貧しい者の争いを収めた。' },
  kakishi:    { n: 'クロイソスの黄金の獅子', k: 'treasure', price: 160000, eff: { mi: 6, pol: 2 }, fx: { dip: 0.1 }, rare: true, d: 'リュディアの大富豪クロイソス王がデルフォイに納めた黄金の獅子。王たちが欲しがる。' },
  jade_seal:  { n: '紅玉髄の印章指輪', k: 'treasure', price: 50000, eff: { mi: 3 }, fx: { fame: 0.05 }, d: '赤い玉髄に神々の姿を彫った印章の指輪。' },
  bronze_mir: { n: 'エトルリアの鏡', k: 'treasure', price: 15000,  eff: { mi: 2 }, d: '裏に神話の場面を細かく彫り込んだ、エトルリアの青銅の鏡。' },
  tiger_tally: { n: 'ファスケス',  k: 'treasure', price: 250000, eff: { tou: 4, mi: 3 }, fx: { cp_rec: 0.15, courier: 0.2 }, rare: true, d: '斧を棒の束で包んだ権標。命令の権（インペリウム）のしるしで、これを先に立てた者の命は軍の隅々まですばやく届く。' },
  // 地中海の新しい品（市場で買える）
  sarissa:    { n: 'サリッサ',     k: 'weapon', price: 7000,   eff: { bu: 3, tou: 1 }, fx: { brace: 0.06 }, d: '六メートルにもなるマケドニアの長槍。並べて構えれば、槍の壁が騎兵の突撃を止める。' },
  kopis:      { n: 'コピス',       k: 'weapon', price: 6500,   eff: { bu: 4 }, fx: { c_cav: 0.03 }, d: '前に反った片刃の重い剣。馬の上から振り下ろすのに向き、クセノフォンが騎兵に勧めた。' },
  crete_bow:  { n: 'クレタの弓',   k: 'weapon', price: 9000,   eff: { bu: 2 }, fx: { u_arch: 0.06, rng_range: 0.04 }, d: '角と木を貼り合わせた強い弓。クレタの弓兵は地中海のどこでも雇われる。' },
  bal_sling:  { n: 'バレアレスの投石紐', k: 'weapon', price: 4000, eff: { bu: 1 }, fx: { rng_dmg: 0.05 }, d: 'バレアレスの子は、棒の上のパンを石で落とすまで食べさせてもらえないという。その島の三本の投石紐。' },
  bronze_cuirass: { n: '青銅の胸甲', k: 'armor', price: 26000,  eff: { hp: 28 }, fx: { arrow_res: 0.04 }, d: '胸と腹の筋肉の形に打ち出した青銅の鎧。重いが、将の威厳を示す。' },
  numi_horse: { n: 'ヌミディア馬', k: 'horse',  price: 16000,  eff: { spd: 1.12 }, fx: { u_lcav: 0.05 }, d: '小柄で疲れを知らない北アフリカの馬。ヌミディアの騎兵は手綱も鞍もなしに操る。' },
  thess_horse: { n: 'テッサリア馬', k: 'horse', price: 24000,  eff: { spd: 1.12, duel: 1.04 }, fx: { u_hcav: 0.05 }, d: '平原で育つ大きく力強い馬。名馬ブケファラスもテッサリアの馬だった。' },
});
D.SHOP_BASE.push('keishi', 'jiriki', 'shohu_do', 'bronze_ge', 'sarissa', 'kopis', 'crete_bow', 'bal_sling', 'shield_rh', 'bronze_cuirass', 'helmet', 'hu_horse', 'numi_horse', 'thess_horse', 'shibahou', 'mozi', 'laozi', 'lunyu', 'huangdi', 'jade_seal', 'bronze_mir', 'rikutou');

/* ---------- 国法 ---------- */
Object.assign(D.LAWS, {
  bunii:   { n: '独身者への課税', d: '妻を持たない男に税を課し、家を立てさせる。子が増え、税と兵の元が増えるが、民は嫌がる。', eff: { grow: 1.15, recruit: 1.05, loyal: -2 } },
  gunken:  { n: '総督の派遣',   d: '土地の名門に任せず、都で任じた総督と役人を各州に送る。内政が進むが名門は不満。', eff: { dev: 1.12, order: 4, noble: -5 } },
  ensen:   { n: '銀山と塩の専売', d: '銀山と塩田を国が直に営み、売り値も国が決める。金収入が大きく伸びるが民は不満。', eff: { gold: 1.2, loyal: -5 } },
  konsou:  { n: '開墾の奨励',   d: '荒れ地や沼地を拓いた者に、その土地を与える。農業が伸び、人口も増える。', eff: { agri: 1.1, grow: 1.08 } },
  kokukan: { n: '密告の奨励',   d: '悪事を訴え出た者に褒美を与える。治安は上がるが、人心は荒む。', eff: { order: 8, loyal: -4 } },
  shouken: { n: '新しい人の登用', d: '家柄を問わず、才ある者を官職に就ける（ローマでは「新人」と呼ばれる）。人材が集まる。', eff: { talent: 1.35, noble: -2 } },
  kinyu:   { n: '徒党の禁止',   d: '有力者の私兵と、町の荒くれ者の徒党を禁じる。治安が上がる。', eff: { order: 6 } },
  kenai:   { n: 'エピクロス派の教え', d: '争いを避けて心の平静を求める、エピクロスの教えを広める。民の心は和らぐが、兵は奮わない。', eff: { loyal: 6, morale: -3 } },
});
D.LAW_ORDER = Object.keys(D.LAWS);

/* ---------- 施設 ---------- */
Object.assign(D.FAC, {
  granary:  { n: '穀物倉', d: '私兵の兵糧の消費-8%/Lv。飢饉に強くなる', base: 2600 },
  shrine:   { n: '神殿',   d: '私領の民心と治安が上がり、神々の祭りが開かれる', base: 2200 },
  clinic:   { n: '療養所', d: '医神アスクレピオスを祀る療養所。主人公の傷の治りと、負傷兵の復帰が早くなる', base: 3200 },
  tower:    { n: '物見の塔', d: '盗賊や敵襲を早く見つけ、のろしで知らせて被害を減らす', base: 2800 },
  brewery:  { n: 'ぶどう酒の蔵', d: '金収入+12%/Lv。私兵の士気が上がる', base: 3000 },
});
D.FAC_ORDER = Object.keys(D.FAC);

/* ---------- シナリオ（開始年） ----------
   owners: 郡の持ち主の上書き　dead: 滅んだ国　rulers: 国→王の名（史実の人物か extra の人物）
   extra: 前218年の名簿にいない人物（書式は D.HIST と同じ。年齢は前218年のときの年齢で書く） */
D.SCENARIOS = DATA_JSON.scenarios;   // data/scenarios.json
D.scenario = (id) => D.SCENARIOS.find(s => s.id === id) || D.SCENARIOS.find(s => s.default);
