/* =========================================================
   地中海覇道 — 特性・戦法・戦術（効果キー方式）
   特性：部隊を率いる将／内政を担う官吏の個性
   戦法：合戦中に采配を使って発動する技
   戦術：軍議で準備し、全軍に効く策
   ========================================================= */

/* ---------- 効果キー ----------
   [表示名, 種別]  種別: p=割合(+12%)  n=数値(+3)  f=有無  r=軽減(-15%) */
D.FXK = {
  // 能力
  bu: ['武力', 'n'], tou: ['統率', 'n'], chi: ['知力', 'n'], pol: ['政治', 'n'], mi: ['魅力', 'n'],
  // 合戦：全般
  atk: ['攻撃', 'p'], def: ['防御', 'p'],
  c_inf: ['率いる歩兵の攻防', 'p'], c_rng: ['率いる射撃兵の攻防', 'p'], c_cav: ['率いる騎兵の攻防', 'p'], c_chr: ['率いる戦象・戦車の攻防', 'p'], c_sie: ['率いる攻城兵器の攻防', 'p'],
  u_spear: ['率いる槍兵の攻防', 'p'], u_heavy: ['率いる重装歩兵の攻防', 'p'], u_arch: ['率いる弓兵の攻防', 'p'], u_xbow: ['率いる弩砲兵の攻防', 'p'],
  u_lcav: ['率いる軽騎兵の攻防', 'p'], u_hcav: ['率いる重騎兵の攻防', 'p'], u_harch: ['率いる騎射兵の攻防', 'p'], u_mount: ['率いる山岳兵の攻防', 'p'],
  u_militia: ['率いる民兵の攻防', 'p'], u_guard: ['率いる近衛の攻防', 'p'], u_ladder: ['率いる梯子隊の攻防', 'p'], u_shield: ['率いる盾兵の攻防', 'p'],
  u_phal: ['率いるファランクスの攻防', 'p'], u_velite: ['率いる散兵の攻防', 'p'], u_sling: ['率いる投石兵の攻防', 'p'], u_cataph: ['率いる重装騎兵の攻防', 'p'],
  u_eleph: ['率いる戦象の攻防', 'p'], u_chariot: ['率いる鎌戦車の攻防', 'p'], u_warb: ['率いるガリア戦士の攻防', 'p'],
  vs_inf: ['歩兵への攻撃', 'p'], vs_rng: ['射撃兵への攻撃', 'p'], vs_cav: ['騎兵への攻撃', 'p'], vs_chr: ['戦象・戦車への攻撃', 'p'], vs_sie: ['攻城兵器への攻撃', 'p'],
  vs_nomad: ['襲来する部族への攻撃', 'p'], vs_bandit: ['賊への攻撃', 'p'], vs_hq: ['敵本陣への攻撃', 'p'],
  t_plain: ['平地での攻防', 'p'], t_hill: ['丘での攻防', 'p'], t_mount: ['山地での攻防', 'p'], t_forest: ['森での攻防', 'p'], t_marsh: ['湿地での攻防', 'p'],
  t_water: ['川・浅瀬での攻防', 'p'], t_city: ['城・砦での攻防', 'p'], t_village: ['村での攻防', 'p'], t_field: ['田畑での攻防', 'p'], t_steppe: ['草原での攻防', 'p'],
  t_pass: ['隘路・山道での攻防', 'p'], t_desert: ['砂地での攻防', 'p'], terrain: ['平地以外での防御', 'p'],
  mv_forest: ['森での移動の不利', 'r'], mv_mount: ['山での移動の不利', 'r'], mv_marsh: ['湿地での移動の不利', 'r'], mv_water: ['渡河の不利', 'r'], mv_rough: ['悪路での移動の不利', 'r'],
  w_rain: ['雨の日の攻防', 'p'], w_fog: ['霧の日の攻防', 'p'], w_snow: ['雪の日の攻防', 'p'], w_wind: ['強風の日の攻防', 'p'], weather: ['天候の読み', 'p'],
  f_line: ['横陣の攻防', 'p'], f_fish: ['市松陣の攻防', 'p'], f_crane: ['三日月陣の攻防', 'p'], f_arrow: ['楔形陣の攻防', 'p'], f_square: ['方陣の攻防', 'p'],
  f_cres: ['前衛陣の攻防', 'p'], f_goose: ['斜線陣の攻防', 'p'], f_snake: ['行軍縦隊の攻防と速さ', 'p'], f_loose: ['散開の攻防', 'p'], form_all: ['全陣形の攻防', 'p'], form_fast: ['陣形変更の速さ', 'p'],
  spd: ['移動速度', 'p'], chg: ['突撃の威力', 'p'], brace: ['突撃を受け止める力', 'p'],
  rng_dmg: ['射撃の威力', 'p'], rng_range: ['射程', 'p'], rng_rate: ['射撃の速さ', 'p'], ammo: ['矢弾の数', 'p'], arrow_res: ['矢の被害', 'r'], arrow_mor: ['矢で敵の士気を削る', 'p'], snipe: ['狙撃の命中', 'p'], ff_res: ['味方への誤射', 'r'],
  mor: ['士気', 'n'], mor_rec: ['士気の回復', 'p'], mor_res: ['士気の崩れにくさ', 'p'], rally: ['潰走からの立て直し', 'p'], fear: ['近くの敵を威圧', 'p'], aura: ['近くの味方を励ます', 'p'],
  flank_res: ['側背面からの被害', 'r'], flank_dmg: ['側背面への打撃', 'p'], pincer: ['挟撃・包囲の打撃', 'p'], pursuit: ['潰走する敵への打撃', 'p'], rearguard: ['殿の守り', 'p'], disengage: ['離脱時の被害', 'r'],
  ambush: ['伏兵・奇襲の威力', 'p'], stealth: ['伏兵の隠密', 'p'], detect: ['伏兵を見破る力', 'p'], sight: ['視界', 'p'],
  fire: ['火計の威力', 'p'], fire_res: ['火の被害', 'r'], water: ['水計の威力', 'p'],
  siege_atk: ['攻城（登攀・破城）の速さ', 'p'], siege_def: ['城壁での防御', 'p'], climb: ['登攀の速さ', 'p'], ram: ['破城槌の威力', 'p'], trap: ['罠の威力', 'p'], surrender: ['敵兵の投降', 'p'],
  night: ['夜襲の成功率', 'p'], night_def: ['夜襲への備え', 'p'], chaos: ['乱戦での打撃', 'p'], fatigue: ['疲れにくさ', 'p'], train_b: ['戦場での練度', 'n'],
  hero: ['将の武勇の打撃', 'p'], lead_surv: ['将が討たれにくい', 'p'], duel: ['一騎打ちの威力', 'p'], duel_hp: ['一騎打ちの体力', 'n'], duel_read: ['一騎打ちの読み', 'p'], duel_ki: ['一騎打ちの気迫', 'p'], duel_flee: ['一騎打ちで退く巧さ', 'p'],
  cp_rec: ['采配の回復', 'p'], courier: ['伝令の遅れ', 'r'], capture: ['敵将の捕縛', 'p'], heal: ['戦後の負傷兵の復帰', 'p'], loot: ['戦利品', 'p'], camp_heal: ['夜営の回復', 'p'], camp_def: ['陣の守り', 'p'],
  slots: ['軍議の戦術枠', 'n'], big: ['大軍を率いる時の攻防', 'p'], few: ['寡兵で戦う時の攻防', 'p'], sally: ['城から打って出る時の攻撃', 'p'],
  cav_arch: ['軽騎兵が騎射できる', 'f'], noRetreat: ['退かずの陣', 'f'],
  // 内政・政治
  train: ['訓練の効果', 'p'], agri: ['農業開発', 'p'], comm: ['商業開発', 'p'], order: ['治安の施策', 'p'], loyal: ['民心の施策', 'p'], cult: ['教化', 'p'], hh: ['戸数の伸び', 'p'],
  recruit: ['徴兵', 'p'], tax: ['徴税', 'p'], gold: ['金の収入', 'p'], food: ['兵糧の収入', 'p'], upkeep: ['兵の維持費', 'r'], build: ['建設・修築の費用', 'r'], fort: ['修築の効果', 'p'], levee: ['水害の被害', 'r'],
  debate: ['舌戦', 'p'], dip: ['外交', 'p'], plot: ['謀略', 'p'], spy: ['偵察・諜報', 'p'], talent: ['人材探し', 'p'], bond: ['絆の深まり', 'p'], merit: ['功績', 'p'], fame: ['名声', 'p'],
  exp: ['鍛錬の経験', 'p'], health: ['病や老いへの強さ', 'p'], luck: ['天運', 'p'], loy: ['忠誠の堅さ', 'p'], trade: ['買い物の値段', 'r'], smith: ['装備強化の費用', 'r'], horse: ['騎兵の鍛錬', 'p'], bandit: ['盗賊の取り締まり', 'p'],
  ap: ['任務状', 'n'],
};
// 陣形の効果の名は、陣形の名（D.FORM）に合わせる
for (const f in D.FORM || {}) if (D.FXK['f_' + f]) D.FXK['f_' + f][0] = D.FORM[f].n + (f === 'snake' ? 'の攻防と速さ' : 'の攻防');
D.fxText = (k, v) => {
  const d = D.FXK[k]; if (!d) return '';
  const [n, t] = d;
  if (t === 'f') return n;
  if (t === 'n') return `${n}${v >= 0 ? '+' : ''}${Math.round(v * 10) / 10}`;
  if (t === 'r') return `${n}${v >= 0 ? '-' : '+'}${Math.round(Math.abs(v) * 100)}%`;
  return `${n}${v >= 0 ? '+' : '-'}${Math.round(Math.abs(v) * 100)}%`;
};

/* ---------- 戦法（合戦中の技） ---------- */
// t: 対象の兵種（rng=射撃のみ cav=騎兵のみ inf=歩兵のみ sie=攻城兵器のみ）
D.SKILLS = {
  kobu:     { n: '鼓舞',     cost: 18, cd: 45, d: '自部隊の士気+25、周囲の味方+12。潰走中の部隊を立て直す。' },
  totsu:    { n: '突撃号令', cost: 20, cd: 40, dur: 15, d: '15秒間、攻撃と突撃の威力1.5倍。' },
  shinsoku: { n: '神速',     cost: 15, cd: 40, dur: 20, d: '20秒間、移動速度1.6倍。' },
  teppeki:  { n: '鉄壁',     cost: 20, cd: 45, dur: 20, d: '20秒間、防御1.6倍・側背面の不利を軽減。' },
  seisha:   { n: '斉射',     cost: 22, cd: 45, t: 'rng', d: '射程内の敵へ威力3倍の一斉射撃。' },
  kakei:    { n: '火計',     cost: 28, cd: 80, d: '近くの森・草地・村に火を放つ。燃え広がり敵を焼く。' },
  ikki:     { n: '一騎駆け', cost: 25, cd: 60, d: '単騎で斬り込む。周囲の敵の士気を大きく下げ、敵将との一騎打ちを狙う。' },
  sogeki:   { n: '狙撃',     cost: 20, cd: 60, d: '射程内の敵将を狙撃する。' },
  rakuseki: { n: '落石',     cost: 22, cd: 999, d: '確保した丘から麓の敵へ岩を落とす。', tactic: 'rakuseki' },
  suikei:   { n: '水計',     cost: 35, cd: 999, d: '確保した堰を切り、川沿いを水攻めにする。', tactic: 'suikei' },
  gitai:    { n: '偽退',     cost: 8,  cd: 25, d: '退却を装い、士気を下げずに後退する。敵を誘い込む。', tactic: 'gitai' },
  chohatsu: { n: '挑発',     cost: 12, cd: 40, d: '近くの敵部隊を挑発し、こちらへ向かわせる。', tactic: 'chohatsu' },
  kakei_t:  { n: '火計',     cost: 28, cd: 80, d: '近くの森・草地・村に火を放つ。', tactic: 'kakei' },
  renya:    { n: '連射',     cost: 18, cd: 50, dur: 20, t: 'rng', d: '20秒間、射撃の装填が倍の速さになる。' },
  kongou:   { n: '不動',     cost: 20, cd: 60, dur: 15, d: '15秒間、士気が下がらない。' },
  gekirin:  { n: '逆上',     cost: 18, cd: 50, dur: 15, d: '15秒間、攻撃1.8倍。ただし防御は0.6倍。' },
  senpu:    { n: '旋風',     cost: 24, cd: 55, t: 'cav', d: '騎兵で敵中を駆け抜け、周りの敵すべてに打撃と動揺を与える。' },
  kaiten:   { n: '回天',     cost: 30, cd: 90, d: '周囲の潰走している味方を立て直し、士気を戻す。' },
  kyouhei:  { n: '強兵',     cost: 26, cd: 70, dur: 20, d: '20秒間、自部隊と近くの味方の攻防+20%。' },
  konran:   { n: '攪乱',     cost: 24, cd: 60, d: '敵一隊を混乱させる。12秒間、命令を聞かず攻撃が落ちる。', tactic: 'konran' },
  youdou:   { n: '陽動',     cost: 26, cd: 90, d: '偽の動きで敵の数隊をおびき寄せる。', tactic: 'youdou' },
  shippu:   { n: '疾風',     cost: 20, cd: 60, dur: 15, d: '15秒間、自部隊と周囲の味方の速度+30%。' },
  kyuuen:   { n: '救護',     cost: 20, cd: 90, d: '倒れた兵の一部を手当てして戦列に戻す。' },
  ransha:   { n: '乱射',     cost: 22, cd: 50, t: 'rng', d: '射程内の敵数隊へ矢を浴びせ、動揺させる。' },
  tettai:   { n: '退き陣',   cost: 15, cd: 45, d: '自部隊と周囲の味方が整然と交戦から離れる。背中を討たれにくい。' },
  bouheki:  { n: '盾の壁',   cost: 15, cd: 45, dur: 20, d: '20秒間、矢の被害-60%。' },
  tsuki:    { n: '突き崩し', cost: 20, cd: 45, d: '交戦中の敵の隊列を崩す。士気-20、乱戦に引き込む。' },
  hien:     { n: '飛燕',     cost: 18, cd: 40, t: 'cav', d: '突撃して一撃を与え、すぐに駆け抜けて離れる。' },
  hekireki: { n: '霹靂',     cost: 25, cd: 60, t: 'sie', d: '投石機や弩砲で、城門や城壁に大打撃を与える。' },
  sally:    { n: '突出',     cost: 20, cd: 60, dur: 15, d: '城から打って出る。15秒間、攻撃+30%・速度+20%。' },
};

/* ---------- 特性 ---------- */
D.TRAIT_CATS = { unit: '兵種', terr: '地形・天候', battle: '戦い方', duel: '武芸', cmd: '統率', dev: '内政', pol: '政治・外交', school: '学派', pers: '性格', orig: '出自', body: '資質', king: '王佐', uniq: '固有' };
D.TRAIT_CAT_ORDER = Object.keys(D.TRAIT_CATS);
D.TRAITS = {};
(function defineTraits() {
  const T = D.TRAITS;
  const add = (id, n, cat, lv, fx, o = {}) => {
    if (T[id]) throw new Error('trait dup ' + id);
    fx = Object.assign({}, fx || {}); for (const k in fx) if (!fx[k]) delete fx[k];
    T[id] = Object.assign({ id, n, cat, lv, fx: fx || {}, role: o.role || ({ unit: 'mil', terr: 'mil', battle: 'mil', duel: 'any', cmd: 'mil', dev: 'civ', pol: 'civ', school: 'any', pers: 'any', orig: 'any', body: 'any', king: 'top', uniq: 'any' }[cat]) }, o);
  };
  const fam = (base, cat, names, fxs, o = {}) => names.forEach((n, i) => add(base + (i + 1), n, cat, names.length === 1 ? 1 : i + 1, typeof fxs === 'function' ? fxs(i) : fxs[i], typeof o === 'function' ? o(i) : o));
  const tier3 = (a, b, c) => i => [a, b, c][i];

  /* --- 旧来の特性（保存データとの互換のため id は不変） --- */
  add('moushou', '猛将', 'duel', 2, { bu: 5, duel: 0.2, hero: 0.15 });
  add('kobu', '鼓舞', 'battle', 1, { aura: 0.15 }, { sk: 'kobu' });
  add('totsu', '突撃', 'battle', 1, { chg: 0.08 }, { sk: 'totsu' });
  add('shinsoku', '神速', 'battle', 1, { spd: 0.05 }, { sk: 'shinsoku' });
  add('teppeki', '鉄壁', 'battle', 1, { def: 0.04 }, { sk: 'teppeki' });
  add('seisha', '斉射', 'battle', 1, { rng_dmg: 0.05 }, { sk: 'seisha' });
  add('fukuhei', '伏兵の名手', 'battle', 2, { ambush: 0.5, stealth: 0.5, detect: 0.15 });
  add('kakei', '火攻め', 'battle', 1, { fire: 0.15 }, { sk: 'kakei' });
  add('renpei', '練兵', 'cmd', 2, { train: 0.5 });
  add('heitan', '兵站', 'cmd', 1, { upkeep: 0.3, fatigue: 0.15, camp_heal: 0.3 });
  add('chikujo', '築城', 'dev', 1, { siege_def: 0.25, fort: 1, build: 0.1 }, { role: 'any' });
  add('meii', '名医', 'dev', 1, { heal: 0.5, health: 0.2 }, { role: 'any' });
  add('benzetsu', '弁舌', 'pol', 1, { debate: 0.15, dip: 0.1 }, { role: 'any' });
  add('rizai', '理財', 'dev', 1, { gold: 0.3 });
  add('nousei', '農政', 'dev', 1, { agri: 0.5 });
  add('houka', '法学', 'school', 1, { order: 0.5, tax: 0.1, loyal: -0.05 });
  add('jinbou', '人望', 'pol', 1, { bond: 0.5, talent: 0.15, mor: 1 }, { role: 'any' });
  add('iatsu', '威圧', 'battle', 1, { fear: 0.25, mor_res: 0.05 });
  add('ikkigake', '一騎駆け', 'battle', 1, { hero: 0.1 }, { sk: 'ikki' });
  add('sogeki', '狙撃', 'battle', 1, { snipe: 0.2 }, { sk: 'sogeki' });
  add('kisha', '騎射', 'unit', 1, { cav_arch: 1, u_harch: 0.05 });
  add('sangaku', '山岳', 'terr', 1, { mv_mount: 0.7, mv_forest: 0.6, t_mount: 0.12, t_forest: 0.08 });
  add('suiren', '水練', 'terr', 1, { mv_water: 0.6, mv_marsh: 0.5, t_water: 0.12, t_marsh: 0.08 });
  add('tenun', '天運', 'body', 2, { luck: 0.5, lead_surv: 0.3 });
  add('gunryaku', '軍略', 'cmd', 2, { slots: 1, cp_rec: 0.12 });
  add('kiba', '騎馬の才', 'unit', 1, { c_cav: 0.15 });

  /* --- 兵種 --- */
  const unitFam = (key, names, fxk, extra) => fam('tu_' + key, 'unit', names, i => Object.assign({ [fxk]: [0.08, 0.15, 0.24][i] }, extra ? extra(i) : {}));
  unitFam('inf', ['歩卒の心得', '歩戦巧者', '歩戦無双'], 'c_inf', i => i === 2 ? { mor: 2 } : {});
  unitFam('spear', ['槍兵の心得', '槍陣巧者', '長槍の壁'], 'u_spear', i => ({ brace: [0.05, 0.1, 0.2][i] }));
  unitFam('heavy', ['重装の心得', '重装巧者', '鉄甲の将'], 'u_heavy', i => ({ arrow_res: [0, 0.05, 0.1][i] }));
  unitFam('arch', ['弓兵の心得', '弓兵巧者', '弓兵の名将'], 'u_arch', i => ({ rng_range: [0, 0.05, 0.1][i] }));
  unitFam('xbow', ['弩砲の心得', '弩砲巧者', '弩砲の主'], 'u_xbow', i => ({ rng_rate: [0, 0.06, 0.15][i] }));
  unitFam('lcav', ['軽騎の心得', '軽騎巧者', '疾風の騎将'], 'u_lcav', i => ({ spd: [0, 0.03, 0.08][i] }));
  unitFam('hcav', ['重騎の心得', '重騎巧者', '鉄騎の将'], 'u_hcav', i => ({ chg: [0, 0.06, 0.15][i] }));
  unitFam('harch', ['騎射の心得', '騎射巧者', '草原の騎射将'], 'u_harch', i => ({ rng_dmg: [0, 0.04, 0.08][i] }));
  unitFam('chr', ['戦象の心得', '戦象巧者', '象使いの名将'], 'c_chr');
  unitFam('mount', ['山兵の心得', '山兵巧者', '山の王'], 'u_mount', i => ({ mv_mount: [0.1, 0.25, 0.5][i] }));
  fam('tu_sie', 'unit', ['攻城の心得', '攻城巧者', '城攻めの名手'], i => ({ siege_atk: [0.12, 0.25, 0.4][i], c_sie: [0.1, 0.2, 0.3][i] }));
  fam('tu_mil', 'unit', ['民兵の束ね', '市民兵の将', '烏合を軍に'], i => ({ u_militia: [0.1, 0.2, 0.35][i], mor: [1, 2, 4][i] }));
  fam('tu_guard', 'unit', ['近衛の心得', '親衛の長'], i => ({ u_guard: [0.08, 0.15][i], lead_surv: [0.1, 0.2][i] }));
  fam('tu_shield', 'unit', ['盾兵の心得', '盾兵巧者'], i => ({ u_shield: [0.08, 0.16][i], arrow_res: [0.03, 0.06][i] }));
  fam('tu_ladder', 'unit', ['梯子攻めの心得'], [{ u_ladder: 0.12, climb: 0.15 }]);
  // 地中海の兵種
  unitFam('phal', ['ファランクスの心得', 'ファランクス巧者', 'サリッサの壁'], 'u_phal', i => ({ brace: [0.05, 0.1, 0.2][i] }));
  unitFam('velite', ['散兵の心得', '散兵巧者', '散兵の名手'], 'u_velite', i => ({ spd: [0, 0.03, 0.06][i] }));
  unitFam('sling', ['投石の心得', '投石巧者', 'バレアレスの名手'], 'u_sling', i => ({ rng_dmg: [0, 0.04, 0.08][i] }));
  fam('tu_eleph', 'unit', ['象の扱い', '象使い巧者'], i => ({ u_eleph: [0.1, 0.2][i], vs_cav: [0, 0.06][i] }));
  fam('tu_cataph', 'unit', ['重装騎兵の心得', '鉄騎の主'], i => ({ u_cataph: [0.1, 0.2][i], arrow_res: [0, 0.05][i] }));
  fam('tu_warb', 'unit', ['戦士の束ね', '戦士の王'], i => ({ u_warb: [0.1, 0.2][i], chg: [0.04, 0.1][i] }));

  /* --- 地形・天候 --- */
  fam('tt_plain', 'terr', ['平原戦の心得', '平原の覇者'], tier3({ t_plain: 0.08 }, { t_plain: 0.16 }));
  fam('tt_hill', 'terr', ['丘陵戦の心得', '高所の利'], tier3({ t_hill: 0.08 }, { t_hill: 0.16 }));
  fam('tt_mount', 'terr', ['山岳戦の心得', '山岳戦の達人'], tier3({ t_mount: 0.1, mv_mount: 0.3 }, { t_mount: 0.18, mv_mount: 0.6 }));
  fam('tt_forest', 'terr', ['森林戦の心得', '森の狩人', '林間の鬼'], tier3({ t_forest: 0.08, mv_forest: 0.2 }, { t_forest: 0.15, mv_forest: 0.4 }, { t_forest: 0.24, mv_forest: 0.6, stealth: 0.1 }));
  fam('tt_marsh', 'terr', ['湿地戦の心得', '沼沢の主'], tier3({ t_marsh: 0.1, mv_marsh: 0.3 }, { t_marsh: 0.18, mv_marsh: 0.6 }));
  fam('tt_water', 'terr', ['渡河の心得', '水辺の戦巧者'], tier3({ t_water: 0.1, mv_water: 0.3 }, { t_water: 0.18, mv_water: 0.5 }));
  fam('tt_city', 'terr', ['守城の心得', '守城巧者', '不落の守将'], tier3({ siege_def: 0.1, t_city: 0.05 }, { siege_def: 0.2, t_city: 0.1 }, { siege_def: 0.32, t_city: 0.15, mor_res: 0.05 }));
  fam('tt_pass', 'terr', ['隘路の戦巧者', 'テルモピュライの守り'], tier3({ t_pass: 0.12 }, { t_pass: 0.25, def: 0.03 }));
  fam('tt_village', 'terr', ['巷戦の心得', '巷戦巧者'], tier3({ t_village: 0.1 }, { t_village: 0.2 }));
  fam('tt_field', 'terr', ['田園の戦'], [{ t_field: 0.1 }]);
  fam('tt_steppe', 'terr', ['草原の騎将', '遊牧の戦法'], tier3({ t_steppe: 0.1, c_cav: 0.03 }, { t_steppe: 0.18, c_cav: 0.06 }));
  fam('tt_snow', 'terr', ['雪中行軍', '寒地の将'], tier3({ w_snow: 0.1 }, { w_snow: 0.2, fatigue: 0.05 }));
  fam('tt_desert', 'terr', ['砂塵の行軍'], [{ t_desert: 0.12, fatigue: 0.1 }]);
  fam('tt_night', 'terr', ['夜戦の心得', '夜襲の名手', '闇の将'], tier3({ night: 0.15 }, { night: 0.3, night_def: 0.2 }, { night: 0.45, night_def: 0.3, stealth: 0.1 }));
  fam('tt_rain', 'terr', ['雨中戦の心得', '雨を味方に'], tier3({ w_rain: 0.1 }, { w_rain: 0.2 }));
  fam('tt_fog', 'terr', ['霧中の用兵', '霧隠れ'], tier3({ w_fog: 0.1, stealth: 0.1 }, { w_fog: 0.2, stealth: 0.2 }));
  fam('tt_heat', 'terr', ['炎暑に強い'], [{ fatigue: 0.15 }]);
  fam('tt_wind', 'terr', ['風を読む', '天候を知る'], tier3({ fire: 0.15, w_wind: 0.1 }, { weather: 0.4, fire: 0.1, w_rain: 0.05, w_fog: 0.05 }));
  fam('tt_map', 'terr', ['地図を読む', '地の利を知る'], tier3({ mv_rough: 0.2 }, { mv_rough: 0.4, terrain: 0.06 }));

  /* --- 戦い方 --- */
  fam('tb_atk', 'battle', ['攻めの心得', '攻勢巧者', '猛攻の将'], tier3({ atk: 0.05 }, { atk: 0.1 }, { atk: 0.16 }));
  fam('tb_def', 'battle', ['守りの心得', '守勢巧者', '不動の将'], tier3({ def: 0.06 }, { def: 0.12 }, { def: 0.2, mor_res: 0.05 }));
  fam('tb_chg', 'battle', ['突撃の心得', '突撃巧者', '破陣の将'], tier3({ chg: 0.12 }, { chg: 0.24 }, { chg: 0.4 }));
  fam('tb_brace', 'battle', ['突撃への備え', '槍の壁の名手'], tier3({ brace: 0.2 }, { brace: 0.4 }));
  fam('tb_pincer', 'battle', ['挟撃の心得', '包囲巧者', '殲滅の将'], tier3({ pincer: 0.12 }, { pincer: 0.24 }, { pincer: 0.4 }));
  fam('tb_pursuit', 'battle', ['追撃の心得', '追撃巧者', '追い討ちの鬼'], tier3({ pursuit: 0.2 }, { pursuit: 0.4 }, { pursuit: 0.65 }));
  fam('tb_rg', 'battle', ['殿の心得', '殿の名手', '退き陣の名人'], tier3({ rearguard: 0.3, disengage: 0.1 }, { rearguard: 0.6, disengage: 0.2 }, { rearguard: 1, disengage: 0.35 }));
  fam('tb_flank', 'battle', ['側面の備え', '全周防御'], tier3({ flank_res: 0.15 }, { flank_res: 0.3 }));
  fam('tb_amb', 'battle', ['伏兵の心得', '埋伏の名人'], tier3({ ambush: 0.2, stealth: 0.2 }, { ambush: 0.6, stealth: 0.5 }));
  fam('tb_det', 'battle', ['看破の心得', '洞察', '千里眼'], tier3({ detect: 0.2 }, { detect: 0.4, sight: 0.1 }, { detect: 0.7, sight: 0.2 }));
  fam('tb_fire', 'battle', ['火計巧者', '焦土の将'], tier3({ fire: 0.25 }, { fire: 0.5 }), i => i === 1 ? { sk: 'kakei' } : {});
  fam('tb_water', 'battle', ['水計巧者', '治水の兵法'], tier3({ water: 0.3 }, { water: 0.6 }));
  fam('tb_shoot', 'battle', ['射撃指揮の心得', '射撃指揮巧者', '矢の雨'], tier3({ rng_dmg: 0.08 }, { rng_dmg: 0.15 }, { rng_dmg: 0.24, arrow_mor: 0.2 }));
  fam('tb_range', 'battle', ['遠矢', '強弓'], tier3({ rng_range: 0.06 }, { rng_range: 0.12 }));
  fam('tb_rate', 'battle', ['速射', '連射の名手'], tier3({ rng_rate: 0.12 }, { rng_rate: 0.25 }), i => i === 1 ? { sk: 'renya' } : {});
  add('tb_seisha2', '斉射の名手', 'battle', 2, { rng_dmg: 0.1 }, { sk: 'seisha' });
  add('tb_snipe2', '百発百中', 'battle', 3, { snipe: 0.4, rng_range: 0.05 }, { sk: 'sogeki' });
  fam('tb_aura', 'battle', ['激励', '檄の将'], tier3({ aura: 0.2, mor: 1 }, { aura: 0.4, mor: 3 }));
  fam('tb_fear', 'battle', ['鬼気', '覇気'], tier3({ fear: 0.15, mor_res: 0.05 }, { fear: 0.3, mor_res: 0.1 }));
  add('tb_wall', '盾の壁', 'battle', 2, { arrow_res: 0.2 }, { sk: 'bouheki' });
  fam('tb_spd', 'battle', ['迅速', '疾風'], tier3({ spd: 0.06 }, { spd: 0.12 }));
  fam('tb_chaos', 'battle', ['乱戦の心得', '乱戦巧者', '修羅'], tier3({ chaos: 0.12 }, { chaos: 0.24 }, { chaos: 0.4, mor_res: 0.05 }));
  add('tb_dis', '引き際', 'battle', 1, { disengage: 0.3 });
  fam('tb_hero', 'battle', ['斬り込み', '万夫不当', '一騎当千'], tier3({ hero: 0.25 }, { hero: 0.5, duel: 0.05 }, { hero: 0.9, duel: 0.1, fear: 0.1 }));
  fam('tb_surv', 'battle', ['不死身', '九死に一生'], tier3({ lead_surv: 0.25 }, { lead_surv: 0.5, luck: 0.2 }));
  fam('tb_cp', 'battle', ['采配の妙', '名采配'], tier3({ cp_rec: 0.15 }, { cp_rec: 0.3 }));
  add('tb_courier', '伝令の才', 'battle', 1, { courier: 0.4 });
  fam('tb_fat', 'battle', ['健脚', '疲れ知らず'], tier3({ fatigue: 0.15 }, { fatigue: 0.3 }));
  add('tb_supply', '輜重の才', 'battle', 1, { fatigue: 0.1, upkeep: 0.15, ammo: 0.2 });
  add('tb_medic', '軍医', 'battle', 1, { heal: 0.3 });
  add('tb_capture', '生け捕り', 'battle', 1, { capture: 0.4 });
  add('tb_loot', '目利き', 'battle', 1, { loot: 0.4 });
  fam('tb_veteran', 'battle', ['精兵', '百戦錬磨'], tier3({ train_b: 5 }, { train_b: 10, mor: 1 }));
  add('tb_vanguard', '先駆け', 'battle', 1, { chg: 0.1, spd: 0.05, mor: 2 });
  add('tb_rage', '逆上', 'battle', 2, { atk: 0.03 }, { sk: 'gekirin' });
  add('tb_steady', '金剛不壊', 'battle', 2, { mor_res: 0.1 }, { sk: 'kongou' });
  add('tb_whirl', '旋風の騎将', 'battle', 2, { c_cav: 0.05 }, { sk: 'senpu' });
  add('tb_rally', '回天の将', 'battle', 3, { rally: 0.3 }, { sk: 'kaiten' });
  add('tb_strong', '強兵の将', 'battle', 2, { atk: 0.03, def: 0.03 }, { sk: 'kyouhei' });
  add('tb_konran', '攪乱戦法', 'battle', 2, { plot: 0.05 }, { sk: 'konran' });
  add('tb_feint', '陽動の妙', 'battle', 2, { plot: 0.05 }, { sk: 'youdou' });
  add('tb_gale', '疾風迅雷', 'battle', 2, { spd: 0.05 }, { sk: 'shippu' });
  add('tb_aid', '救護の心得', 'battle', 1, { heal: 0.1 }, { sk: 'kyuuen' });
  add('tb_volley', '乱射', 'battle', 2, { rng_dmg: 0.03 }, { sk: 'ransha' });
  add('tb_withdraw', '整然たる退却', 'battle', 2, { disengage: 0.15 }, { sk: 'tettai' });
  add('tb_break', '突き崩し', 'battle', 2, { atk: 0.03 }, { sk: 'tsuki' });
  add('tb_swallow', '飛燕の騎', 'battle', 2, { c_cav: 0.03 }, { sk: 'hien' });
  add('tb_thunder', '霹靂の砲手', 'battle', 2, { siege_atk: 0.1 }, { sk: 'hekireki' });
  add('tb_sally', '突出の名手', 'battle', 2, { siege_def: 0.05, sally: 0.1 }, { sk: 'sally' });
  fam('tb_big', 'battle', ['大軍の統率', '百万の将'], tier3({ big: 0.06 }, { big: 0.12 }));
  fam('tb_few', 'battle', ['寡兵の用兵', '少数精鋭'], tier3({ few: 0.08 }, { few: 0.16 }));
  for (const [f, nm] of [['line', '横陣'], ['fish', '市松陣'], ['crane', '三日月陣'], ['arrow', '楔形陣'], ['square', '方陣'], ['cres', '前衛陣'], ['goose', '斜線陣'], ['snake', '行軍縦隊'], ['loose', '散開']]) add('tb_f_' + f, (D.FORM && D.FORM[f] ? D.FORM[f].n : nm) + 'の名手', 'battle', 1, { ['f_' + f]: 0.1 });
  fam('tb_vscav', 'battle', ['対騎兵の心得', '騎兵殺し'], tier3({ vs_cav: 0.1 }, { vs_cav: 0.2, brace: 0.1 }));
  add('tb_vsinf', '対歩兵の心得', 'battle', 1, { vs_inf: 0.08 });
  add('tb_vschr', '対戦象の心得', 'battle', 1, { vs_chr: 0.2 });
  add('tb_vssie', '兵器壊し', 'battle', 1, { vs_sie: 0.3 });
  fam('tb_nomad', 'battle', ['辺境の戦い', '辺境の守り手'], tier3({ vs_nomad: 0.15 }, { vs_nomad: 0.3, detect: 0.1 }));
  fam('tb_bandit', 'battle', ['盗賊狩り', '捕り物の名人'], tier3({ vs_bandit: 0.2, bandit: 0.2 }, { vs_bandit: 0.4, bandit: 0.4 }), { role: 'any' });
  fam('tb_hq', 'battle', ['本陣狙い', '斬首の将'], tier3({ vs_hq: 0.15 }, { vs_hq: 0.3 }));
  add('tb_campguard', '夜営の備え', 'battle', 1, { night_def: 0.3 });
  fam('tb_scout', 'battle', ['斥候の才', '物見の名人'], tier3({ sight: 0.15 }, { sight: 0.3, detect: 0.1 }));
  add('tb_starve', '兵糧攻めの名手', 'battle', 2, { siege_atk: 0.1 });
  add('tb_hold', '籠城の名人', 'battle', 2, { siege_def: 0.2, camp_heal: 0.2 });
  add('tb_gate', '城門破り', 'battle', 1, { ram: 0.5 });
  add('tb_climb', '登攀の名手', 'battle', 1, { climb: 0.5 });
  add('tb_trap', '罠の名手', 'battle', 1, { trap: 0.5 });
  add('tb_cata', '投石の名手', 'battle', 1, { siege_atk: 0.2, c_sie: 0.1 });
  add('tb_music', '軍楽の才', 'battle', 1, { mor_rec: 0.15 });
  add('tb_drill', '調練の名人', 'cmd', 2, { train: 0.4, train_b: 3 });
  add('tb_cut', '退路を断つ', 'battle', 2, { capture: 0.2, pursuit: 0.2 });
  add('tb_mercy', '降将を許す', 'battle', 1, { surrender: 0.3, fame: 0.05 }, { role: 'any' });
  add('tb_taunt', '挑発の名人', 'battle', 1, { plot: 0.03 }, { sk: 'chohatsu' });
  add('tb_feign', '偽退の名人', 'battle', 1, { disengage: 0.1 }, { sk: 'gitai' });
  add('tb_flankd', '側背を突く', 'battle', 1, { flank_dmg: 0.15 });

  /* --- 武芸 --- */
  fam('td_pow', 'duel', ['剛力', '怪力', '無双の膂力'], tier3({ duel: 0.06, bu: 1 }, { duel: 0.12, bu: 2 }, { duel: 0.2, bu: 4 }));
  fam('td_sword', 'duel', ['剣術', '剣の達人', '剣聖'], tier3({ duel: 0.05, duel_read: 0.05 }, { duel: 0.1, duel_read: 0.1 }, { duel: 0.18, duel_read: 0.15 }));
  fam('td_spear', 'duel', ['槍術', '槍の達人', '神槍'], tier3({ duel: 0.06, hero: 0.05 }, { duel: 0.12, hero: 0.1 }, { duel: 0.2, hero: 0.15 }));
  fam('td_ji', 'duel', ['長柄術', '大槍の使い手'], tier3({ duel: 0.06, duel_hp: 5 }, { duel: 0.12, duel_hp: 10 }));
  fam('td_bow', 'duel', ['弓術', '弓の達人', '神弓'], tier3({ rng_dmg: 0.03, snipe: 0.2 }, { rng_dmg: 0.06, snipe: 0.4 }, { rng_dmg: 0.1, snipe: 0.6 }), i => i >= 1 ? { sk: 'sogeki' } : {});
  fam('td_ride', 'duel', ['馬術', '人馬一体'], tier3({ duel: 0.04, spd: 0.03, duel_flee: 0.2 }, { duel: 0.08, spd: 0.06, duel_flee: 0.4 }));
  fam('td_read', 'duel', ['見切り', '心眼'], tier3({ duel_read: 0.15 }, { duel_read: 0.3 }));
  fam('td_tough', 'duel', ['頑健', '鋼の肉体'], tier3({ duel_hp: 10, health: 0.1 }, { duel_hp: 20, health: 0.2 }));
  fam('td_grit', 'duel', ['不屈', '不撓不屈'], tier3({ duel_hp: 8, mor_res: 0.05, rally: 0.1 }, { duel_hp: 15, mor_res: 0.1, rally: 0.2 }));
  fam('td_ki', 'duel', ['気迫', '闘気'], tier3({ duel_ki: 0.2, duel: 0.03 }, { duel_ki: 0.4, duel: 0.06 }));
  fam('td_hidden', 'duel', ['暗器', '刺客の技'], tier3({ duel: 0.08, duel_read: 0.05 }, { duel: 0.15, duel_read: 0.1 }));
  add('td_fist', '拳法', 'duel', 1, { duel: 0.05, duel_hp: 5 });
  add('td_twin', '双剣', 'duel', 2, { duel: 0.1 });
  add('td_shield', '盾術', 'duel', 1, { duel_hp: 10, arrow_res: 0.05 });

  /* --- 統率（総大将のとき全軍に効く：side） --- */
  fam('tc_lead', 'cmd', ['統率の才', '名将の器', '軍神'], tier3({ mor: 2 }, { mor: 3, atk: 0.04, def: 0.04 }, { mor: 5, atk: 0.08, def: 0.08 }), i => ({ side: true, w: [8, 3, 0.5][i] }));
  fam('tc_disc', 'cmd', ['軍紀厳正', '鬼の軍律'], tier3({ mor_res: 0.1, order: 0.1 }, { mor_res: 0.2, order: 0.2, bond: -0.1 }), { side: true });
  fam('tc_love', 'cmd', ['兵に慕われる', '兵と寝食を共にす'], tier3({ mor: 3, mor_rec: 0.1 }, { mor: 5, mor_rec: 0.2 }), { side: true });
  fam('tc_drill', 'cmd', ['鍛錬の鬼', '教練の名人'], tier3({ train: 0.3 }, { train: 0.8 }));
  add('tc_cp', '采配上手', 'cmd', 1, { cp_rec: 0.2 }, { side: true });
  add('tc_fast', '速攻の将', 'cmd', 1, { spd: 0.06 }, { side: true });
  add('tc_endure', '持久の将', 'cmd', 1, { fatigue: 0.2, def: 0.03 }, { side: true });
  fam('tc_plan', 'cmd', ['戦機を見る', '神算鬼謀'], tier3({ slots: 1, cp_rec: 0.1 }, { slots: 2, cp_rec: 0.2 }));
  add('tc_call', '号令一下', 'cmd', 1, { courier: 0.5 }, { side: true });
  add('tc_morale', '士気を操る', 'cmd', 2, { mor_rec: 0.3 }, { side: true });
  add('tc_wall', '堅陣の将', 'cmd', 1, { def: 0.06 }, { side: true });
  add('tc_trick', '奇策の将', 'cmd', 2, { ambush: 0.2, stealth: 0.2 }, { side: true });
  add('tc_form', '用兵自在', 'cmd', 2, { form_all: 0.06, form_fast: 0.5 }, { side: true });
  add('tc_know', '敵を知る', 'cmd', 2, { detect: 0.2, sight: 0.1 }, { side: true });

  /* --- 内政 --- */
  fam('tv_agri', 'dev', ['勧農', '農事に明るい', 'デメテルの恵み'], tier3({ agri: 0.2 }, { agri: 0.4 }, { agri: 0.8, food: 0.1 }));
  fam('tv_comm', 'dev', ['商才', 'クロイソスの才'], tier3({ comm: 0.3 }, { comm: 0.7, gold: 0.1 }));
  fam('tv_levee', 'dev', ['治水', '水利の大家'], tier3({ levee: 0.5, agri: 0.1 }, { levee: 1, agri: 0.2 }));
  fam('tv_build', 'dev', ['普請上手', '普請奉行'], tier3({ build: 0.15, fort: 0.2 }, { build: 0.3, fort: 0.4 }), { role: 'any' });
  fam('tv_order', 'dev', ['捕吏の才', '治安の鬼'], tier3({ order: 0.2, bandit: 0.2 }, { order: 0.6, bandit: 0.4 }));
  fam('tv_loyal', 'dev', ['仁政', '民に慕われる'], tier3({ loyal: 0.3 }, { loyal: 0.6 }));
  fam('tv_cult', 'dev', ['教化', '学芸の振興'], tier3({ cult: 0.4 }, { cult: 0.8, loyal: 0.1 }));
  fam('tv_hh', 'dev', ['名簿の才', '人口調査の名人'], tier3({ hh: 0.3 }, { hh: 0.6 }));
  fam('tv_recruit', 'dev', ['徴兵上手', '募兵の名人'], tier3({ recruit: 0.25 }, { recruit: 0.5 }), { role: 'any' });
  fam('tv_tax', 'dev', ['徴税上手', '苛斂誅求'], tier3({ tax: 0.25 }, { tax: 0.5, loyal: -0.2 }));
  fam('tv_food', 'dev', ['兵糧の才', '穀倉の守り手'], tier3({ food: 0.25 }, { food: 0.5 }), { role: 'any' });
  fam('tv_thrift', 'dev', ['倹約', '節倹の鑑'], tier3({ upkeep: 0.15 }, { upkeep: 0.3, fame: 0.05 }), { role: 'any' });
  add('tv_iron', '鉄の利', 'dev', 1, { smith: 0.25 });
  add('tv_salt', '塩の利', 'dev', 1, { gold: 0.15 });
  fam('tv_horse', 'dev', ['牧畜', '牧馬の才'], tier3({ horse: 0.25 }, { horse: 0.5, c_cav: 0.03 }), { role: 'any' });
  fam('tv_trade', 'dev', ['交易', '大商人の才'], tier3({ trade: 0.1, comm: 0.1 }, { trade: 0.2, comm: 0.2 }));
  fam('tv_acc', 'dev', ['算術', '会計の鬼'], tier3({ gold: 0.1, merit: 0.05 }, { gold: 0.2, merit: 0.1 }));
  fam('tv_open', 'dev', ['開墾', '拓地の名人'], tier3({ hh: 0.15, agri: 0.1 }, { hh: 0.3, agri: 0.2 }));
  fam('tv_relief', 'dev', ['救荒', '施しの名人'], tier3({ loyal: 0.2, levee: 0.2 }, { loyal: 0.4, levee: 0.3 }));
  add('tv_craft', '工芸振興', 'dev', 1, { comm: 0.15, smith: 0.1 });
  fam('tv_med', 'dev', ['医術', '名医の腕'], tier3({ health: 0.2, heal: 0.2 }, { health: 0.4, heal: 0.4 }), { role: 'any' });
  add('tv_road', '道路普請', 'dev', 1, { build: 0.1, trade: 0.05 });
  add('tv_mine', '鉱山開発', 'dev', 1, { gold: 0.2 });
  add('tv_market', '市場の振興', 'dev', 1, { comm: 0.2 });
  add('tv_port', '水運の才', 'dev', 1, { trade: 0.15, comm: 0.05 });
  add('tv_irr', '灌漑', 'dev', 1, { agri: 0.25 });
  add('tv_silk', '紫染めの奨励', 'dev', 1, { comm: 0.15, loyal: 0.05 });
  add('tv_forest', '植林', 'dev', 1, { build: 0.1, levee: 0.2 });
  add('tv_rite', '祭祀に通じる', 'dev', 1, { loyal: 0.15, cult: 0.1 });
  add('tv_school', '学舎の運営', 'dev', 1, { exp: 0.1, talent: 0.1 });
  add('tv_census', '人口調査（ケンスス）', 'dev', 1, { hh: 0.2 });
  add('tv_granary', '公の穀倉', 'dev', 1, { food: 0.2, loyal: 0.1 });

  /* --- 政治・外交 --- */
  fam('tp_debate', 'pol', ['雄弁', '舌鋒鋭し'], tier3({ debate: 0.25 }, { debate: 0.4 }), { role: 'any' });
  fam('tp_dip', 'pol', ['外交の才', '外交の妙技'], tier3({ dip: 0.25 }, { dip: 0.5 }));
  fam('tp_plot', 'pol', ['謀略', '深謀', '離間の名人'], tier3({ plot: 0.2 }, { plot: 0.4 }, { plot: 0.6 }), { role: 'any' });
  fam('tp_spy', 'pol', ['諜報', '間者使い'], tier3({ spy: 0.3 }, { spy: 0.6, detect: 0.1 }), { role: 'any' });
  fam('tp_talent', 'pol', ['人を見る目', '伯楽'], tier3({ talent: 0.3 }, { talent: 0.6 }), { role: 'any' });
  fam('tp_bond', 'pol', ['人たらし', '徳望'], tier3({ bond: 0.3 }, { bond: 0.6, fame: 0.2 }), { role: 'any' });
  fam('tp_rite', 'pol', ['礼法', '儀礼の大家'], tier3({ fame: 0.15, dip: 0.05 }, { fame: 0.3, dip: 0.1 }));
  fam('tp_letter', 'pol', ['文才', '名文家'], tier3({ exp: 0.1, cult: 0.1 }, { exp: 0.2, cult: 0.2 }), { role: 'any' });
  fam('tp_learn', 'pol', ['博識', '碩学'], tier3({ exp: 0.15, chi: 1 }, { exp: 0.3, chi: 3 }), { role: 'any' });
  fam('tp_frank', 'pol', ['直言', '諫臣'], tier3({ debate: 0.1, fame: 0.05 }, { debate: 0.2, fame: 0.1 }));
  add('tp_slander', '讒言', 'pol', 1, { plot: 0.2, bond: -0.15 }, { neg: true });
  add('tp_audit', '監察の目', 'pol', 1, { order: 0.1, plot: 0.1 });
  fam('tp_admin', 'pol', ['能吏', '政務の達人'], tier3({ pol: 2, merit: 0.05 }, { pol: 4, merit: 0.1 }));
  fam('tp_court', 'pol', ['宮廷工作', '宮廷の裏に通じる'], tier3({ plot: 0.15, fame: 0.05 }, { plot: 0.3, fame: 0.05 }));
  add('tp_nego', '交渉上手', 'pol', 1, { dip: 0.15, trade: 0.1 }, { role: 'any' });

  /* --- 学派（ギリシア・ローマの学問と技芸） --- */
  add('ts_ru', 'ストア派', 'school', 2, { loyal: 0.2, cult: 0.3, debate: 0.1, fame: 0.1 });
  add('ts_mo', '機械学', 'school', 2, { siege_def: 0.2, build: 0.2, fort: 0.3 });
  add('ts_dao', 'エピクロス派', 'school', 2, { health: 0.3, exp: 0.1, mor_res: 0.05 });
  add('ts_bing', '兵学', 'school', 2, { atk: 0.04, def: 0.04, slots: 1 });
  add('ts_zong', '弁論術', 'school', 2, { dip: 0.35, debate: 0.15 });
  add('ts_yin', '占星術と卜占', 'school', 2, { luck: 0.2, weather: 0.4 });
  add('ts_nong', '農学', 'school', 2, { agri: 0.3, food: 0.2 });
  add('ts_ming', 'アカデメイア派', 'school', 2, { debate: 0.3 });
  add('ts_za', 'ペリパトス派', 'school', 2, { exp: 0.15, agri: 0.05, comm: 0.05 });
  add('ts_yi', '医学', 'school', 2, { heal: 0.3, health: 0.3 });
  add('ts_cyn', 'キュニコス派', 'school', 2, { mor_res: 0.1, upkeep: 0.15, fame: 0.1, bond: -0.1 });
  add('ts_geo', '数学と天文', 'school', 2, { exp: 0.15, chi: 2, weather: 0.2 });
  add('ts_hist', '歴史学', 'school', 2, { exp: 0.15, detect: 0.15, debate: 0.1 });

  /* --- 性格 --- */
  const P = (id, n, fx, o) => add('tx_' + id, n, 'pers', 1, fx, o);
  P('brave', '勇猛', { atk: 0.06, chg: 0.05 });
  P('bold', '豪胆', { mor_res: 0.1, fear: 0.1 });
  P('calm', '冷静', { detect: 0.1, mor_res: 0.05, debate: 0.05 });
  P('steady', '沈着', { def: 0.05, rally: 0.2 });
  P('hot', '短気', { atk: 0.08, def: -0.05, debate: -0.1 }, { neg: true });
  P('passion', '激情家', { chg: 0.1, chaos: 0.1, plot: -0.1 });
  P('careful', '慎重', { def: 0.06, spd: -0.05, stealth: 0.1 });
  P('coward', '臆病', { lead_surv: 0.3, mor: -3 }, { neg: true });
  P('proud', '傲慢', { atk: 0.05, bond: -0.2 }, { neg: true });
  P('humble', '謙虚', { bond: 0.2, fame: 0.1 });
  P('honest', '誠実', { loyal: 0.1, dip: 0.1, plot: -0.2 });
  P('cunning', '狡猾', { plot: 0.2, bond: -0.1 });
  P('greedy', '強欲', { gold: 0.2, loyal: -0.1, loy: -0.1 }, { neg: true });
  P('clean', '清廉', { fame: 0.2, gold: -0.1, order: 0.1 });
  P('loyal', '忠義', { loy: 0.3, mor: 2 });
  P('ambition', '野心家', { merit: 0.1, loy: -0.3 });
  P('chivalry', '義侠', { bond: 0.2, mor: 2 });
  P('cruel', '冷酷', { fear: 0.2, loyal: -0.2, order: 0.1 });
  P('generous', '寛大', { loyal: 0.2, bond: 0.1 });
  P('jealous', '嫉妬深い', { bond: -0.2, merit: 0.05 }, { neg: true });
  P('stubborn', '頑固', { def: 0.05, debate: 0.05, bond: -0.1 });
  P('flexible', '柔軟', { exp: 0.1, train: 0.1 });
  P('optimist', '楽天家', { mor_rec: 0.1, health: 0.1 });
  P('pessimist', '悲観的', { detect: 0.1, mor: -2 }, { neg: true });
  P('drinker', '酒豪', { bond: 0.2, health: -0.1 });
  P('glutton', '大食漢', { duel_hp: 10, upkeep: -0.05 });
  P('neat', '潔癖', { order: 0.1, bond: -0.1 });
  P('diligent', '勤勉', { exp: 0.2 });
  P('lazy', '怠惰', { exp: -0.2, health: 0.1 }, { neg: true });
  P('warlike', '好戦的', { atk: 0.05, dip: -0.15 });
  P('peace', '平和を好む', { dip: 0.2, atk: -0.05 });
  P('lone', '孤高', { duel: 0.05, bond: -0.15 });
  P('social', '社交家', { bond: 0.25 });
  P('daring', '大胆', { chg: 0.05, stealth: -0.1, plot: 0.1 });
  P('meticulous', '細心', { detect: 0.15, ambush: 0.05 });
  P('vengeful', '執念深い', { atk: 0.04, mor: 2, bond: -0.05 });
  P('honor', '名誉を重んじる', { mor: 3, plot: -0.1, duel: 0.03 });
  P('real', '現実主義', { gold: 0.1, debate: 0.05 });
  P('ideal', '理想主義', { cult: 0.1, loyal: 0.1, gold: -0.05 });
  P('warm', '情に厚い', { bond: 0.15, mor: 1 });
  P('cold', '冷徹', { plot: 0.1, fear: 0.1, bond: -0.1 });
  P('straight', '直情', { chg: 0.06, plot: -0.1 });
  P('tenacious', '粘り強い', { mor_res: 0.08, def: 0.03 });
  P('magnanimous', '鷹揚', { loyal: 0.1, bond: 0.1, detect: -0.05 });
  P('nervous', '神経質', { detect: 0.12, mor: -1 });
  P('cheerful', '陽気', { mor_rec: 0.08, bond: 0.1 });
  P('quiet', '寡黙', { stealth: 0.1, debate: -0.05 });
  P('curious', '好奇心旺盛', { exp: 0.15, spy: 0.05 });
  P('faithful', '義理堅い', { loy: 0.2, bond: 0.1 });
  P('traitor', '裏切りの相', { loy: -0.4, plot: 0.15 }, { neg: true });
  P('boast', '大言壮語', { mor: 2, fame: 0.05, bond: -0.05 });
  P('patient', '忍耐強い', { def: 0.04, siege_def: 0.05, fatigue: 0.05 });

  /* --- 出自 --- */
  const O = (id, n, fx, o) => add('to_' + id, n, 'orig', 1, fx, o);
  O('noble', '名門の出', { fame: 0.2, mi: 2, bond: 0.1 });
  O('royal', '王族', { fame: 0.3, mi: 3, loy: 0.1 }, { w: 1 });
  O('fallen', '没落貴族', { mi: 2, exp: 0.1 });
  O('farmer', '農民出身', { agri: 0.15, u_militia: 0.05, c_inf: 0.03 });
  O('merchant', '商人出身', { comm: 0.2, gold: 0.1 });
  O('artisan', '職人出身', { smith: 0.2, build: 0.1 });
  O('hunter', '猟師出身', { t_forest: 0.08, rng_dmg: 0.05, detect: 0.05 });
  O('herder', '牧人出身', { u_lcav: 0.06, horse: 0.2 });
  O('fisher', '漁師出身', { t_water: 0.1, mv_water: 0.2 });
  O('youxia', '傭兵上がり', { bond: 0.2, duel: 0.05, order: -0.05 });
  O('bandit', '元盗賊', { ambush: 0.1, stealth: 0.1, loy: -0.1 });
  O('assassin', '刺客上がり', { duel: 0.1, snipe: 0.1, lead_surv: 0.1 });
  O('exile', '亡命者', { loy: -0.1, exp: 0.1, talent: 0.1 });
  O('hu', 'スキタイの血', { u_harch: 0.1, u_lcav: 0.05, t_steppe: 0.1 });
  O('mountain', '山の民', { u_mount: 0.1, mv_mount: 0.5, t_mount: 0.05 });
  O('south', '南方の出', { t_marsh: 0.1, mv_marsh: 0.3 });
  O('north', '辺境育ち', { w_snow: 0.1, vs_nomad: 0.08 });
  O('capital', '都育ち', { comm: 0.1, cult: 0.1, mi: 1 });
  O('poor', '貧しい家の出', { exp: 0.15, merit: 0.05 });
  O('soldier', '兵卒上がり', { c_inf: 0.05, mor: 2, train: 0.1 });
  O('scholar', '学者の家', { chi: 2, exp: 0.2 });
  O('fangshi', '占星術師の家', { health: 0.2, luck: 0.1, weather: 0.2 });
  O('doctor', '医者の家系', { heal: 0.4, health: 0.2 });
  O('scribe', '書吏上がり', { pol: 2, tax: 0.1 });
  O('slave', '奴隷上がり', { exp: 0.1, mor: 2, bond: 0.1 });
  O('orphan', '孤児', { bond: 0.1, mor_res: 0.05 });
  O('warhouse', '武門の家', { bu: 2, tou: 2 });
  O('general', '将門の子', { tou: 3, mor: 2 });
  O('inlaw', '外戚', { fame: 0.2, loy: -0.1, plot: 0.1 });
  O('sailor', '船乗り', { t_water: 0.12, mv_water: 0.3, weather: 0.1 });
  O('hostage', '人質育ち', { dip: 0.15, exp: 0.1, loy: -0.05 });

  /* --- 資質 --- */
  const Y = (id, n, fx, o) => add('ty_' + id, n, 'body', 1, fx, o);
  Y('tall', '長身', { duel: 0.04, mor: 1 });
  Y('giant', '巨躯', { duel_hp: 15, duel: 0.06, spd: -0.03 });
  Y('swift', '俊足', { spd: 0.05 });
  Y('robust', '頑丈', { health: 0.2, duel_hp: 10 });
  Y('sickly', '病弱', { health: -0.3, chi: 2 }, { neg: true });
  Y('oneeye', '隻眼', { fear: 0.05, detect: -0.05 });
  Y('veteran', '老練', { def: 0.05, rally: 0.2, exp: -0.1 });
  Y('young', '若武者', { atk: 0.05, exp: 0.2 });
  Y('early', '早熟', { exp: 0.1 });
  Y('late', '大器晩成', { exp: 0.15, health: 0.1 });
  Y('genius', '天才', { chi: 4, exp: 0.3 }, { w: 0.6 });
  Y('bright', '秀才', { exp: 0.15, chi: 2 });
  Y('weird', '鬼才', { plot: 0.2, chi: 3 }, { w: 0.8 });
  Y('handsome', '美丈夫', { mi: 4, bond: 0.1 });
  Y('ugly', '醜貌', { mi: -3, fear: 0.05 }, { neg: true });
  Y('voice', '美声', { mor: 2, debate: 0.05 });
  Y('loud', '大音声', { fear: 0.05, mor: 1 });
  Y('memory', '記憶力抜群', { exp: 0.1, spy: 0.1 });
  Y('sleepless', '眠らぬ者', { night: 0.2, health: -0.1 });
  Y('nighteye', '夜目が利く', { night: 0.25, sight: 0.05 });
  fam('ty_bu', 'body', ['剛勇', '剛勇無比'], tier3({ bu: 3 }, { bu: 6 }));
  fam('ty_tou', 'body', ['統帥の器', '統帥の天稟'], tier3({ tou: 3 }, { tou: 6 }));
  fam('ty_chi', 'body', ['明晰', '明晰無比'], tier3({ chi: 3 }, { chi: 6 }));
  fam('ty_pol', 'body', ['治世の才', '治世の天稟'], tier3({ pol: 3 }, { pol: 6 }));
  fam('ty_mi', 'body', ['華がある', '人を惹きつける'], tier3({ mi: 3 }, { mi: 6 }));
  Y('longlife', '長寿の相', { health: 0.4 });
  Y('lucky', '強運', { luck: 0.3 });
  Y('scar', '歴戦の傷跡', { fear: 0.05, mor: 1, health: -0.05 });
  Y('keen', '勘が鋭い', { detect: 0.1, duel_read: 0.05 });
  Y('stamina', '無尽の体力', { fatigue: 0.12, duel_hp: 5 });

  /* --- 王佐（君主・宰相） --- */
  const K = (id, n, fx, o) => add('tk_' + id, n, 'king', 2, fx, o);
  K('wang', '王道', { loyal: 0.2, fame: 0.2 });
  K('ba', '覇道', { recruit: 0.2, atk: 0.03, mor: 1 });
  K('ren', '仁君', { loyal: 0.3, order: -0.05 });
  K('ming', '名君', { agri: 0.15, comm: 0.15, order: 0.15, loyal: 0.15 }, { w: 0.5 });
  K('bao', '暴君', { order: 0.2, loyal: -0.3, fear: 0.1 }, { neg: true });
  K('an', '暗君', { agri: -0.2, comm: -0.2, order: -0.1 }, { neg: true });
  K('xian', '賢相', { agri: 0.1, comm: 0.1, order: 0.1, loyal: 0.1 });
  K('quan', '権臣', { plot: 0.2, loy: -0.2 }, { neg: true });
  K('zai', '宰相の器', { pol: 3, agri: 0.1, comm: 0.1 });
  K('fa', '法の守護者', { order: 0.2, tax: 0.1 });
  K('kai', '開明', { talent: 0.3, exp: 0.1 });
  K('jian', '倹約の君', { upkeep: 0.2, gold: 0.1 });
  K('tian', '神々の寵児', { mor: 3, fame: 0.3, loyal: 0.1 }, { w: 0.3 });

  /* --- 固有（史実の人物） --- */
  const Q = (id, n, fx, o = {}) => add('tq_' + id, n, 'uniq', 3, fx, Object.assign({ uniq: true }, o));
  // カルタゴ
  Q('hannibal', 'カンナエの包囲', { pincer: 0.45, ambush: 0.3, mor: 5, fear: 0.2, mv_mount: 0.5, fatigue: 0.15 }, { side: true });
  Q('hasdrubal', 'バルカの次兄', { recruit: 0.3, rally: 0.3, disengage: 0.4, mv_mount: 0.4 });
  Q('mago', 'トレビアの伏兵', { ambush: 0.5, stealth: 0.5, w_snow: 0.15, w_rain: 0.1 });
  Q('maharbal', 'ローマへ急げ', { pursuit: 0.6, spd: 0.1, c_cav: 0.12, chg: 0.15 });
  Q('hanno', '平和派の領袖', { dip: 0.3, gold: 0.25, debate: 0.2, plot: 0.15 });
  Q('hamilcar', '雷光（バルカ）', { ambush: 0.3, night: 0.3, t_mount: 0.15, mor: 4, recruit: 0.2 });
  Q('xanthippus', 'スパルタの傭兵隊長', { train: 0.6, c_chr: 0.25, c_cav: 0.1, form_all: 0.06 }, { side: true });
  Q('sophonisba', 'カルタゴの花嫁', { dip: 0.4, plot: 0.3, bond: 0.3 });
  // ローマ
  Q('cunctator', 'クンクタトル（遷延者）', { def: 0.15, fatigue: 0.2, detect: 0.3, mor_res: 0.15, rearguard: 0.5, lead_surv: 0.3 }, { side: true });
  Q('africanus', 'アフリカヌス', { pincer: 0.25, form_all: 0.08, form_fast: 0.6, vs_chr: 0.35, mor: 4, talent: 0.2 }, { side: true });
  Q('gladius', 'ローマの剣', { atk: 0.12, hero: 0.3, duel: 0.2, siege_atk: 0.2, mor: 3 });
  Q('volones', '奴隷兵の解放', { u_militia: 0.4, mor: 4, bond: 0.3, recruit: 0.2 });
  Q('nero', 'メタウルスへの強行軍', { spd: 0.15, fatigue: 0.3, courier: 0.4, flank_dmg: 0.2 }, { side: true });
  Q('laelius', 'スキピオの右腕', { c_cav: 0.12, pursuit: 0.4, loy: 0.4, flank_dmg: 0.15 });
  Q('cato', 'カルタゴ滅ぶべし', { debate: 0.4, order: 0.3, upkeep: 0.2, fame: 0.2, agri: 0.2 }, { role: 'any' });
  Q('liberator', 'ギリシアの解放者', { dip: 0.4, fame: 0.3, debate: 0.2, flank_dmg: 0.15 });
  Q('pydna', 'ピュドナの勝者', { terrain: 0.1, t_hill: 0.15, mor_res: 0.15, train_b: 5, def: 0.08 }, { side: true });
  Q('aemilianus', 'カルタゴの破壊者', { siege_atk: 0.4, ram: 0.4, climb: 0.3, fire: 0.3, mor: 3, duel: 0.1 });
  Q('nasica', 'カルタゴ存続論', { debate: 0.3, order: 0.2, cult: 0.2, dip: 0.1 });
  Q('laenas', '砂の上の円', { dip: 0.5, debate: 0.3, fear: 0.2 });
  Q('duilius', 'カラス（乗船橋）', { t_water: 0.3, mv_water: 0.4, chaos: 0.2, hero: 0.1 });
  Q('regulus', '誓いを守る者', { mor_res: 0.15, fame: 0.3, loy: 0.5, atk: 0.06 });
  Q('catulus', 'アエガテスの勝者', { t_water: 0.25, w_wind: 0.2, train: 0.3 });
  // ヌミディア
  Q('masinissa', 'ヌミディアの騎王', { c_cav: 0.15, u_lcav: 0.15, pursuit: 0.4, health: 0.4, flank_dmg: 0.2 });
  Q('syphax', 'マサエシュリの王', { u_lcav: 0.12, recruit: 0.2, dip: 0.15 });
  // マケドニアとギリシア
  Q('philip', 'ヘラスの愛し子', { mor: 4, chg: 0.1, fame: 0.2, plot: 0.15, spd: 0.06 }, { side: true });
  Q('philopoemen', '最後のギリシア人', { train: 0.6, c_cav: 0.1, hero: 0.2, form_fast: 0.4, mor: 3 }, { side: true });
  Q('aratus', '夜の奇襲', { night: 0.5, stealth: 0.3, plot: 0.3, dip: 0.2, mor_res: -0.05 });
  Q('perseus', '王国の蓄え', { siege_def: 0.2, def: 0.06, gold: 0.2 });
  Q('pharos', '海賊の王', { t_water: 0.15, plot: 0.25, loot: 0.3 });
  Q('polybius', '歴史家の目', { exp: 0.3, detect: 0.3, spy: 0.3, cult: 0.2, chi: 3 });
  // セレウコス朝・プトレマイオス朝
  Q('megas', '大王（メガス）', { recruit: 0.3, mor: 4, fame: 0.3, c_chr: 0.15, c_cav: 0.08 }, { side: true });
  Q('epiphanes', 'エピファネス（神の顕現）', { fame: 0.3, cult: 0.3, gold: 0.2, loyal: -0.1 });
  Q('sosibios', '影の宰相', { plot: 0.4, train: 0.4, talent: 0.3, spy: 0.2 });
  Q('arsinoe', 'ラフィアの王妃', { mor: 4, aura: 0.2, bond: 0.2, loyal: 0.15 }, { side: true });
  // シュラクサイ
  Q('hiero', '賢王ヒエロン', { agri: 0.3, food: 0.2, order: 0.2, dip: 0.3, loyal: 0.2 });
  Q('archimedes', 'アルキメデスの兵器', { siege_def: 0.6, fort: 1, c_sie: 0.4, rng_dmg: 0.2, rng_range: 0.2, fire: 0.3, chi: 4 });
})();
D.TRAIT_ORDER = Object.keys(D.TRAITS);
D.traitDesc = (id) => {
  const T = D.TRAITS[id]; if (!T) return '';
  if (T._d) return T._d;
  const parts = [];
  for (const k in T.fx) parts.push(D.fxText(k, T.fx[k]));
  if (T.sk && D.SKILLS[T.sk]) parts.push(`戦法「${D.SKILLS[T.sk].n}」`);
  T._d = parts.filter(Boolean).join('・') + (T.side ? '（総大将なら全軍に効く）' : '');
  return T._d;
};
for (const id of D.TRAIT_ORDER) Object.defineProperty(D.TRAITS[id], 'd', { get() { return D.traitDesc(id); }, enumerable: false, configurable: true });

/* ---------- 自作の特性（特性工房） ----------
   ブラウザに保存し、使ったものはセーブにも写す。id は cx_ で始まる。
   乱数で配る特性の候補（D.TRAIT_ORDER）には入れない。 */
D.TRAIT_CATS.custom = '自作';
D.TRAIT_CAT_ORDER.push('custom');
// 工房で選ぶときの効果の分類
D.FXG = [
  ['能力', ['bu', 'tou', 'chi', 'pol', 'mi']],
  ['合戦', ['atk', 'def', 'spd', 'chg', 'brace', 'big', 'few', 'sally', 'chaos', 'fatigue', 'train_b', 'slots', 'cp_rec', 'courier', 'noRetreat']],
  ['士気', ['mor', 'mor_rec', 'mor_res', 'rally', 'fear', 'aura']],
  ['戦い方', ['flank_res', 'flank_dmg', 'pincer', 'pursuit', 'rearguard', 'disengage', 'ambush', 'stealth', 'detect', 'sight', 'night', 'night_def']],
  ['射撃', ['rng_dmg', 'rng_range', 'rng_rate', 'ammo', 'arrow_res', 'arrow_mor', 'snipe', 'ff_res']],
  ['兵種', ['c_inf', 'c_rng', 'c_cav', 'c_chr', 'c_sie', 'u_spear', 'u_heavy', 'u_phal', 'u_arch', 'u_sling', 'u_velite', 'u_xbow', 'u_lcav', 'u_hcav', 'u_cataph', 'u_harch', 'u_eleph', 'u_chariot', 'u_mount', 'u_warb', 'u_militia', 'u_guard', 'u_ladder', 'u_shield', 'cav_arch', 'horse']],
  ['相手', ['vs_inf', 'vs_rng', 'vs_cav', 'vs_chr', 'vs_sie', 'vs_nomad', 'vs_bandit', 'vs_hq']],
  ['地形・天候', ['t_plain', 't_hill', 't_mount', 't_forest', 't_marsh', 't_water', 't_city', 't_village', 't_field', 't_steppe', 't_pass', 't_desert', 'terrain', 'mv_forest', 'mv_mount', 'mv_marsh', 'mv_water', 'mv_rough', 'w_rain', 'w_fog', 'w_snow', 'w_wind', 'weather']],
  ['陣形', ['form_all', 'form_fast', 'f_line', 'f_fish', 'f_crane', 'f_arrow', 'f_square', 'f_cres', 'f_goose', 'f_snake', 'f_loose']],
  ['計略・攻城', ['fire', 'fire_res', 'water', 'siege_atk', 'siege_def', 'climb', 'ram', 'trap', 'surrender']],
  ['武芸', ['hero', 'lead_surv', 'duel', 'duel_hp', 'duel_read', 'duel_ki', 'duel_flee', 'capture']],
  ['戦のあと', ['heal', 'loot', 'camp_heal', 'camp_def']],
  ['内政', ['train', 'agri', 'comm', 'order', 'loyal', 'cult', 'hh', 'recruit', 'tax', 'gold', 'food', 'upkeep', 'build', 'fort', 'levee', 'bandit']],
  ['政治・人物', ['debate', 'dip', 'plot', 'spy', 'talent', 'bond', 'merit', 'fame', 'exp', 'health', 'luck', 'loy', 'trade', 'smith', 'ap']],
];
(() => {
  const seen = new Set();
  for (const g of D.FXG) g[1] = g[1].filter(k => D.FXK[k] && !seen.has(k) && seen.add(k));
  const rest = Object.keys(D.FXK).filter(k => !seen.has(k));
  if (rest.length) D.FXG.push(['その他', rest]);
})();
D.CTR_STATS = ['bu', 'tou', 'chi', 'pol', 'mi'];
D.CTR_FAST = new Set(['spd', 'f_snake', 'form_fast', 'rng_rate', 'rng_range', 'climb', 'siege_atk', 'cp_rec', 'sight']);
// 工房で決められる幅（画面の単位。％の効果は％で）
D.fxLim = (k) => {
  const t = D.FXK[k] && D.FXK[k][1];
  if (t === 'f') return { min: 1, max: 1, step: 1, def: 1, unit: '' };
  if (t === 'n') {
    if (D.CTR_STATS.includes(k)) return { min: -50, max: 100, step: 1, def: 5, unit: '' };
    if (k === 'slots' || k === 'ap') return { min: -2, max: 5, step: 1, def: 1, unit: '' };
    if (k === 'duel_hp') return { min: -50, max: 200, step: 5, def: 20, unit: '' };
    return { min: -30, max: 50, step: 1, def: 5, unit: '' };
  }
  if (t === 'r') return { min: -100, max: 90, step: 5, def: 20, unit: '%' };
  if (D.CTR_FAST.has(k)) return { min: -50, max: 100, step: 5, def: 20, unit: '%' };
  return { min: -90, max: 300, step: 5, def: 20, unit: '%' };
};
D.fxPct = (k) => { const t = D.FXK[k] && D.FXK[k][1]; return t === 'p' || t === 'r'; };
D.fxToUi = (k, v) => (D.fxPct(k) ? Math.round(v * 100) : v);
D.fxFromUi = (k, x) => (D.FXK[k] && D.FXK[k][1] === 'f' ? 1 : D.fxPct(k) ? x / 100 : x);
// 強さ（組み込みの特性のおよその値：一段目≒3・二段目≒5・★≒10）
D.CTR_BROAD = new Set(['atk', 'def', 'chg', 'brace', 'rng_dmg', 'mor_res', 'mor_rec', 'pincer', 'pursuit', 'hero', 'big', 'few', 'flank_dmg', 'aura', 'fear', 'spd', 'form_all', 'terrain', 'cp_rec', 'rally', 'duel', 'lead_surv', 'ambush', 'siege_atk', 'siege_def', 'fire']);
D.fxPower = (k, v) => {
  const t = D.FXK[k] && D.FXK[k][1]; if (!t) return 0;
  if (t === 'f') return k === 'cav_arch' ? 6 : 2;
  if (t === 'n') return v * (D.CTR_STATS.includes(k) || k === 'mor' ? 1 : k === 'train_b' ? 0.5 : k === 'duel_hp' ? 0.1 : k === 'slots' ? 8 : k === 'ap' ? 15 : 1);
  if (t === 'r') return v * 10;
  if (D.CTR_BROAD.has(k)) return v * 20;
  if (/^(c_|u_|vs_|t_|w_|f_|mv_)/.test(k)) return v * 7;
  return v * 8;
};
D.ctrPower = (def) => {
  let p = 0;
  for (const k in (def && def.fx) || {}) p += D.fxPower(k, def.fx[k]) * (def.side && !D.CTR_STATS.includes(k) ? 2 : 1);
  if (def && def.sk && D.SKILLS[def.sk]) p += 4;
  return Math.round(p * 10) / 10;
};
// 通常モードで付けるときの能力pt（組み込みの★は20pt・二段目は8pt）
D.ctrCost = (pw) => (pw < 0 ? Math.max(-8, Math.round(pw * 2)) : Math.max(0, Math.round((pw - 2.5) * 2.6)));
D.ctrDescAuto = (T) => {
  const ks = Object.keys(T.fx || {});
  const many = ks.length > 6;
  const parts = ks.slice(0, many ? 4 : 6).map(k => D.fxText(k, T.fx[k]));
  if (many) parts.push(`ほか${ks.length - 4}件`);
  if (T.sk && D.SKILLS[T.sk]) parts.push(`戦法「${D.SKILLS[T.sk].n}」`);
  return (parts.filter(Boolean).join('・') || '効果なし') + (T.side ? '（総大将なら全軍に効く）' : '');
};
// 合戦中に使える戦法（準備の要る計略は除く）
D.CTR_SKILLS = () => Object.keys(D.SKILLS).filter(k => !D.SKILLS[k].tactic && k !== 'kakei_t');
D.CTR_IDS = [];
D.regCTrait = (def) => {
  if (!def || typeof def.id !== 'string' || !/^cx_[a-z0-9]+$/i.test(def.id)) return null;
  const fx = {};
  for (const k in def.fx || {}) { const v = Number(def.fx[k]); if (D.FXK[k] && Number.isFinite(v) && v !== 0) { const L = D.fxLim(k); fx[k] = D.FXK[k][1] === 'f' ? 1 : U.clamp(v, D.fxFromUi(k, L.min), D.fxFromUi(k, L.max)); } }
  const sk = def.sk && D.SKILLS[def.sk] && D.CTR_SKILLS().includes(def.sk) ? def.sk : undefined;
  const pw = D.ctrPower({ fx, side: !!def.side, sk });
  const T = { id: def.id, n: String(def.n || '').trim().slice(0, 12) || '無名の特性', cat: 'custom', lv: pw >= 8 ? 3 : pw >= 4 ? 2 : 1, fx, role: 'any', custom: true, side: !!def.side, sk, neg: pw < 0, pw, cost: D.ctrCost(pw), ud: String(def.d || '').trim().slice(0, 80), ts: def.ts || 0 };
  Object.defineProperty(T, 'd', { get() { return T.ud || D.ctrDescAuto(T); }, enumerable: false, configurable: true });
  D.TRAITS[def.id] = T;
  if (!D.CTR_IDS.includes(def.id)) D.CTR_IDS.push(def.id);
  return T;
};
D.ctrDef = (id) => { const T = D.TRAITS[id]; return T && T.custom ? { id, n: T.n, d: T.ud, fx: Object.assign({}, T.fx), side: T.side, sk: T.sk || null, ts: T.ts } : null; };
// 最強：すべての効果を最大に（退かずの陣は縛りなので入れない）
D.ctrMax = (base) => {
  const fx = {};
  for (const k in D.FXK) if (k !== 'noRetreat') fx[k] = D.fxFromUi(k, D.fxLim(k).max);
  return { id: (base && base.id) || 'cx_' + U.uid(), n: (base && base.n) || '地中海無双', d: (base && base.d) || '', fx, side: true, sk: 'kyouhei', ts: 0 };
};

/* ---------- 戦術（軍議で準備） ---------- */
// req: 必要な能力  cat: 分類  fx: 準備した側の全部隊に効く効果  act: 特別な仕掛け
D.TACTIC_CATS = { form: '布陣', plot: '計略', amb: '伏兵・奇襲', rng: '射撃', cav: '騎兵', inf: '歩兵', siegeA: '攻城', siegeD: '守城', supply: '兵站・軍政', intel: '情報', mor: '士気' };
// 陣形の名（D.FORM）を使う
const FMN = (f, s) => (D.FORM && D.FORM[f] ? D.FORM[f].n : s);
D.TACTICS = {
  // 既存
  fukuhei:  { n: '伏兵',       cat: 'amb', req: { chi: 25 }, d: '森や草地・村に部隊を伏せ、奇襲する。奇襲の一撃は大打撃と動揺を与える。' },
  shazone:  { n: '射撃区域',   cat: 'rng', req: { chi: 15 }, d: '射撃兵に射撃区域を設定。侵入した敵へ威力2倍の斉射。' },
  kakei:    { n: '火計',       cat: 'plot', req: { chi: 55 }, d: '森や草地・村に火を放つ。燃え広がり、伏兵もいぶし出す。' },
  rakuseki: { n: '落石',       cat: 'plot', req: { chi: 40 }, d: '丘の戦術地点を確保すると、麓の敵に岩を落とせる。' },
  gitai:    { n: '偽退却',     cat: 'plot', req: { chi: 45 }, d: '退くふりをして敵を誘う。士気が下がらない後退。' },
  taiko:    { n: '鼓舞の角笛', cat: 'mor', req: { chi: 20 }, d: 'ラッパと角笛で兵を励ます。全軍の士気回復速度+50%・士気+3。', fx: { mor_rec: 0.5, mor: 3 } },
  yashuu:   { n: '夜襲',       cat: 'amb', req: { chi: 50 }, d: '夜営時に夜襲を仕掛けられる。' },
  suikei:   { n: '水計',       cat: 'plot', req: { chi: 70 }, d: '堰の戦術地点を確保すると、川沿いを水攻めにできる。' },
  iryou:    { n: '医療陣',     cat: 'supply', req: { chi: 35 }, d: '陣の戦術地点で士気と負傷兵が回復する。戦後の負傷兵の復帰+20%。', fx: { heal: 0.2 } },
  kanchou:  { n: '間諜',       cat: 'intel', req: { chi: 60 }, d: '開戦前に敵の布陣と伏兵を見抜く。' },
  ryugen:   { n: '流言',       cat: 'intel', req: { chi: 50 }, d: '開戦前に流言を流し、敵軍の士気を下げる。' },
  chohatsu: { n: '挑発',       cat: 'plot', req: { chi: 30 }, d: '敵部隊を挑発し、こちらへ向かわせる。' },
  houi:     { n: '包囲殲滅',   cat: 'form', req: { chi: 65 }, d: '挟撃・包囲したときの打撃と動揺が増す。', fx: { pincer: 0.2 } },
  kenjin:   { n: '堅陣',       cat: 'form', req: { chi: 30 }, d: '全軍の防御+10%。', fx: { def: 0.1 } },
  // 布陣
  kakuyoku: { n: `${FMN('crane', '三日月陣')}の構え`, cat: 'form', req: { chi: 35, tou: 55 }, d: `${FMN('crane', '三日月陣')}の攻防+12%、挟撃の打撃+10%。`, fx: { f_crane: 0.12, pincer: 0.1 } },
  gyorin:   { n: `${FMN('fish', '市松陣')}の構え`, cat: 'form', req: { chi: 35, tou: 55 }, d: `${FMN('fish', '市松陣')}の攻防+12%、突撃+8%。`, fx: { f_fish: 0.12, chg: 0.08 } },
  housi:    { n: `${FMN('arrow', '楔形陣')}の構え`, cat: 'form', req: { chi: 40, tou: 65 }, d: `${FMN('arrow', '楔形陣')}の攻防+12%、突撃+10%。`, fx: { f_arrow: 0.12, chg: 0.1 } },
  houen:    { n: `${FMN('square', '方陣')}の構え`, cat: 'form', req: { chi: 35, tou: 50 }, d: `${FMN('square', '方陣')}の攻防+15%。`, fx: { f_square: 0.15 } },
  engetsu:  { n: `${FMN('cres', '前衛陣')}の構え`, cat: 'form', req: { chi: 40, tou: 70 }, d: `${FMN('cres', '前衛陣')}の攻防+15%、士気+3。`, fx: { f_cres: 0.15, mor: 3 } },
  gankou:   { n: `${FMN('goose', '斜線陣')}の構え`, cat: 'form', req: { chi: 35, tou: 55 }, d: `${FMN('goose', '斜線陣')}の攻防+12%、射程+5%。`, fx: { f_goose: 0.12, rng_range: 0.05 } },
  chouda:   { n: `${FMN('snake', '行軍縦隊')}の鍛錬`, cat: 'form', req: { chi: 20 }, d: `${FMN('snake', '行軍縦隊')}の速さ・攻防+20%、全軍の移動+5%。`, fx: { f_snake: 0.2, spd: 0.05 } },
  sanpei:   { n: '散兵戦術',   cat: 'form', req: { chi: 30 }, d: `${FMN('loose', '散開')}の攻防+15%、矢の被害-10%。`, fx: { f_loose: 0.15, arrow_res: 0.1 } },
  haisui:   { n: '背水の陣',   cat: 'form', req: { chi: 50 }, d: '退路を断って戦う。士気+12・攻撃+8%・立て直し+50%。ただし全軍撤退はできない。', fx: { mor: 12, atk: 0.08, rally: 0.5, noRetreat: 1 } },
  shamen:   { n: '戦列の交代', cat: 'form', req: { chi: 55, tou: 60 }, d: '前の列が疲れたら後ろの列と入れ替わって戦う（ローマの三列の戦列）。疲れにくさ+40%、士気の回復+30%。', fx: { fatigue: 0.4, mor_rec: 0.3 } },
  kouchi:   { n: '高地占拠',   cat: 'form', req: { chi: 30 }, d: '丘での攻防+10%。丘や櫓の戦術地点を早く確保できる。', fx: { t_hill: 0.1 }, act: 'kouchi' },
  jinchi:   { n: '野戦築城',   cat: 'form', req: { chi: 45 }, d: '陣を柵と塹壕で固める。陣の近くで防御+20%。', fx: { camp_def: 0.2 } },
  kyoba:    { n: '馬防ぎの柵', cat: 'inf', req: { chi: 40 }, d: '歩兵の前に尖った杭と逆茂木を並べる。突撃を受け止める力+40%。', fx: { brace: 0.4 } },
  // 計略
  youdou:   { n: '陽動',       cat: 'plot', req: { chi: 50 }, d: '戦法「陽動」：偽の動きで敵の数隊をおびき寄せる。', skill: 'youdou' },
  konran:   { n: '攪乱',       cat: 'plot', req: { chi: 55 }, d: '戦法「攪乱」：敵一隊を混乱させ、しばらく命令を聞かなくする。', skill: 'konran' },
  rikan_b:  { n: '離間の計',   cat: 'plot', req: { chi: 65 }, d: '敵の将たちを疑心暗鬼にさせ、連携を乱す（敵の判断が遅れる）。', act: 'rikan' },
  gihei:    { n: '疑兵の計',   cat: 'plot', req: { chi: 45 }, d: '旗や篝火を増やして大軍に見せる。敵は慎重になり、士気-3。', act: 'gihei' },
  kujo:     { n: '開門の計',   cat: 'siegeD', req: { chi: 75 }, d: '城門を開け放ち敵を惑わす。攻め手はしばらく攻めかかれず、知略で劣れば退くこともある。', act: 'kujo' },
  naiou:    { n: '内応',       cat: 'siegeA', req: { chi: 60, pol: 50 }, d: '城内に内通者を作る。時が来れば城門が内から開く。', act: 'naiou' },
  kousan:   { n: '降伏勧告',   cat: 'plot', req: { chi: 40, mi: 50 }, d: '潰走する敵兵に降伏を呼びかける。敵兵が投降し、敵の士気が下がる。', fx: { surrender: 0.5 } },
  kousui:   { n: '渡河急襲',   cat: 'amb', req: { chi: 45 }, d: '浅瀬や川を素早く渡る。渡河の不利-50%、水辺の攻防+20%。', fx: { mv_water: 0.5, t_water: 0.2 } },
  dokuya:   { n: '毒矢',       cat: 'rng', req: { chi: 45 }, d: '矢に毒を塗る。射撃の威力+15%、矢で敵の士気を大きく削る。', fx: { rng_dmg: 0.15, arrow_mor: 0.3 } },
  hiya:     { n: '火矢',       cat: 'rng', req: { chi: 50 }, d: '森や村、攻城兵器にいる敵を射ると火がつくことがある。火計の威力+20%。', fx: { fire: 0.2 }, act: 'hiya' },
  wana:     { n: '落とし穴',   cat: 'plot', req: { chi: 45 }, d: '自陣の前に落とし穴を掘っておく。踏み込んだ敵に打撃と動揺。', act: 'trap' },
  // 攻城
  tousekiki:{ n: '投石機',     cat: 'siegeA', req: { chi: 55 }, d: '攻城戦で投石機を持ち込む。城門・城壁を遠くから打ち崩す。', act: 'cata' },
  chikadou: { n: '坑道',       cat: 'siegeA', req: { chi: 60 }, d: '城壁の下へ坑道を掘る。時が経つと城壁の一部が崩れ落ちる。', act: 'tunnel' },
  untei:    { n: '梯子の改良', cat: 'siegeA', req: { chi: 35 }, d: '長い梯子と鉤縄をそろえる。城壁を登る速さ+40%。', fx: { climb: 0.4 } },
  shousha:  { n: '破城槌の強化', cat: 'siegeA', req: { chi: 35 }, d: '破城槌の威力+50%。', fx: { ram: 0.5 } },
  seiran:   { n: '攻城塔の強化', cat: 'siegeA', req: { chi: 45 }, d: '攻城塔（ヘレポリス）の射撃と防御が強くなり、登攀を大きく助ける。', fx: { c_sie: 0.25 }, act: 'tower' },
  hyorou:   { n: '兵糧攻め',   cat: 'siegeA', req: { chi: 50 }, d: '城への補給を断つ。夜ごとに守兵の兵糧と士気が大きく減る。', act: 'starve' },
  // 守城
  roujou:   { n: '籠城の備え', cat: 'siegeD', req: { chi: 35 }, d: '兵糧を蓄え、夜に城壁を倍の速さで修理する。城壁での防御+10%。', fx: { siege_def: 0.1 }, act: 'roujou' },
  nettou:   { n: '熱湯と油',   cat: 'siegeD', req: { chi: 40 }, d: '城壁を登る敵と破城槌へ、熱湯と煮えた油を浴びせる。打撃+50%。', act: 'nettou' },
  gaimon:   { n: '門の補強',   cat: 'siegeD', req: { chi: 30 }, d: '城門の耐久+50%。', act: 'gate' },
  shutsu:   { n: '出撃口',     cat: 'siegeD', req: { chi: 45 }, d: '城から打って出る部隊の攻撃+15%。戦法「突出」が使える。', fx: { sally: 0.15 }, skill: 'sally' },
  // 射撃
  sandan:   { n: '交代射撃',   cat: 'rng', req: { chi: 45 }, d: '射手を入れ替えて間断なく射る。射撃の速さ+30%。', fx: { rng_rate: 0.3 } },
  kyokusha: { n: '曲射',       cat: 'rng', req: { chi: 40 }, d: '味方の頭越しに射る。射程+10%、味方への誤射-70%。', fx: { rng_range: 0.1, ff_res: 0.7 } },
  sogekitai:{ n: '狙撃隊',     cat: 'rng', req: { chi: 55 }, d: 'すべての弓弩隊が戦法「狙撃」を使える。', skill: 'sogeki', skillCls: 'rng' },
  yahei:    { n: '矢弾の補給', cat: 'rng', req: { chi: 25 }, d: '矢や石弾、投げ槍を多く運ぶ。矢弾の数+60%。', fx: { ammo: 0.6 } },
  // 騎兵
  kibasha:  { n: '騎射戦術',   cat: 'cav', req: { chi: 40 }, d: '軽騎兵が馬上から射撃できる。', fx: { cav_arch: 1 } },
  ukai:     { n: '迂回挟撃',   cat: 'cav', req: { chi: 50 }, d: '騎兵の移動+15%、側背面への打撃+15%。', fx: { flank_dmg: 0.15 }, act: 'ukai' },
  shuuchuu: { n: '騎馬集中',   cat: 'cav', req: { chi: 35, tou: 60 }, d: '騎兵を集めて叩きつける。突撃の威力+25%。', fx: { chg: 0.25 } },
  sensha:   { n: '戦象突撃',   cat: 'cav', req: { chi: 30 }, d: '戦象と鎌戦車の攻防+20%。', fx: { c_chr: 0.2 } },
  tsuigeki: { n: '追撃',       cat: 'cav', req: { chi: 30 }, d: '潰走する敵への打撃+50%。', fx: { pursuit: 0.5 } },
  // 歩兵
  kikkou:   { n: 'テストゥド', cat: 'inf', req: { chi: 35 }, d: '盾を屋根のように重ねて矢を防ぐ（亀の陣）。矢の被害-25%。', fx: { arrow_res: 0.25 } },
  yarifusuma:{ n: '槍の壁',    cat: 'inf', req: { chi: 30 }, d: '長い槍の穂先を揃えて突撃を止める。突撃を受け止める力+50%。', fx: { brace: 0.5 } },
  kyouren:  { n: '強兵の鍛錬', cat: 'inf', req: { chi: 25, tou: 50 }, d: '戦場での練度+10。', fx: { train_b: 10 } },
  // 兵站・軍政
  heitan_b: { n: '兵站確保',   cat: 'supply', req: { chi: 30 }, d: '疲れにくさ+30%、夜営の回復+50%。', fx: { fatigue: 0.3, camp_heal: 0.5 } },
  kyougun:  { n: '強行軍',     cat: 'supply', req: { chi: 35 }, d: '移動+12%。ただし疲れやすい。', fx: { spd: 0.12, fatigue: -0.2 } },
  noroshi:  { n: '烽火と伝令', cat: 'supply', req: { chi: 30 }, d: '丘の上の火と早馬で知らせを送る。伝令の遅れ-60%、采配の回復+15%。', fx: { courier: 0.6, cp_rec: 0.15 } },
  gunritsu: { n: '軍律',       cat: 'mor', req: { chi: 30, tou: 60 }, d: '士気が崩れにくい（+15%）。', fx: { mor_res: 0.15 } },
  gungaku:  { n: '軍楽',       cat: 'mor', req: { chi: 25 }, d: '士気の回復+20%。', fx: { mor_rec: 0.2 } },
  gekibun:  { n: '檄文',       cat: 'mor', req: { chi: 40, pol: 40 }, d: '大義を説く檄文で全軍の士気+6。', fx: { mor: 6 } },
  kansoku:  { n: '観天望気',   cat: 'intel', req: { chi: 55 }, d: '天候と風を読む。火計・水計+30%、火計の時は風が味方する。', fx: { fire: 0.3, water: 0.3, weather: 0.5 }, act: 'wind' },
  chiri:    { n: '地の利',     cat: 'intel', req: { chi: 50 }, d: '地形を知り尽くす。悪路の不利-50%、平地以外での防御+10%。', fx: { mv_rough: 0.5, terrain: 0.1 } },
  sekkou:   { n: '斥候騎',     cat: 'intel', req: { chi: 20 }, d: '視界+30%、伏兵を見破る力+30%。', fx: { sight: 0.3, detect: 0.3 } },
  gisou:    { n: '偽装',       cat: 'amb', req: { chi: 45 }, d: '伏兵が見破られにくい（+50%）。', fx: { stealth: 0.5 } },
  zanshu:   { n: '斬首戦術',   cat: 'amb', req: { chi: 55 }, d: '敵本陣への攻撃+25%。敵総大将を討てば敵は大きく崩れる。', fx: { vs_hq: 0.25 } },
  shingari: { n: '殿の備え',   cat: 'supply', req: { chi: 35 }, d: '殿の守り+50%、離脱時の被害-30%。', fx: { rearguard: 0.5, disengage: 0.3 } },
  taihai:   { n: '退路遮断',   cat: 'cav', req: { chi: 60 }, d: '敵の退路を断つ。潰走する敵を捕らえやすく、敵将の捕縛+30%。', fx: { capture: 0.3, pursuit: 0.2 }, act: 'cut' },
};
D.TACTIC_ORDER = Object.keys(D.TACTICS);
D.tacticReqOk = (t, o) => { const r = D.TACTICS[t]?.req || {}; for (const k in r) if ((o[k] || 0) < r[k]) return false; return true; };
D.tacticReqStr = (t) => { const r = D.TACTICS[t]?.req || {}; const nm = { bu: '武', tou: '統', chi: '知', pol: '政', mi: '魅' }; return Object.keys(r).map(k => nm[k] + r[k]).join('・'); };

/* ---------- 経験による特性の会得 ---------- */
// c: 経験の種類（me.tx[c]）  ids: 段階の特性  th: 必要回数
D.LEARN = [
  { c: 'forest', ids: ['tt_forest1', 'tt_forest2', 'tt_forest3'], th: [3, 8, 16] },
  { c: 'hill', ids: ['tt_hill1', 'tt_hill2'], th: [3, 9] },
  { c: 'mount', ids: ['tt_mount1', 'tt_mount2'], th: [3, 9] },
  { c: 'marsh', ids: ['tt_marsh1', 'tt_marsh2'], th: [3, 9] },
  { c: 'river', ids: ['tt_water1', 'tt_water2'], th: [3, 9] },
  { c: 'plain', ids: ['tt_plain1', 'tt_plain2'], th: [5, 14] },
  { c: 'steppe', ids: ['tt_steppe1', 'tt_steppe2'], th: [3, 9] },
  { c: 'siegeA', ids: ['tu_sie1', 'tu_sie2', 'tu_sie3'], th: [2, 6, 12] },
  { c: 'siegeD', ids: ['tt_city1', 'tt_city2', 'tt_city3'], th: [2, 6, 12] },
  { c: 'pass', ids: ['tt_pass1', 'tt_pass2'], th: [2, 6] },
  { c: 'night', ids: ['tt_night1', 'tt_night2', 'tt_night3'], th: [2, 5, 10] },
  { c: 'rain', ids: ['tt_rain1', 'tt_rain2'], th: [2, 6] },
  { c: 'fog', ids: ['tt_fog1', 'tt_fog2'], th: [2, 6] },
  { c: 'snow', ids: ['tt_snow1', 'tt_snow2'], th: [2, 6] },
  { c: 'charge', ids: ['tb_chg1', 'tb_chg2', 'tb_chg3'], th: [6, 18, 40] },
  { c: 'pincer', ids: ['tb_pincer1', 'tb_pincer2', 'tb_pincer3'], th: [4, 12, 28] },
  { c: 'ambush', ids: ['tb_amb1', 'tb_amb2'], th: [3, 10] },
  { c: 'detect', ids: ['tb_det1', 'tb_det2', 'tb_det3'], th: [3, 9, 20] },
  { c: 'rearguard', ids: ['tb_rg1', 'tb_rg2', 'tb_rg3'], th: [2, 6, 14] },
  { c: 'pursuit', ids: ['tb_pursuit1', 'tb_pursuit2', 'tb_pursuit3'], th: [300, 1500, 5000] },
  { c: 'fire', ids: ['tb_fire1', 'tb_fire2'], th: [2, 6] },
  { c: 'duel', ids: ['td_pow1', 'td_pow2', 'td_pow3'], th: [2, 6, 14] },
  { c: 'duelSlay', ids: ['tb_hero1', 'tb_hero2', 'tb_hero3'], th: [2, 6, 14] },
  { c: 'shoot', ids: ['tb_shoot1', 'tb_shoot2', 'tb_shoot3'], th: [500, 3000, 12000] },
  { c: 'u_inf', ids: ['tu_inf1', 'tu_inf2', 'tu_inf3'], th: [5, 15, 35] },
  { c: 'u_spear', ids: ['tu_spear1', 'tu_spear2', 'tu_spear3'], th: [4, 12, 28] },
  { c: 'u_heavy', ids: ['tu_heavy1', 'tu_heavy2', 'tu_heavy3'], th: [4, 12, 28] },
  { c: 'u_arch', ids: ['tu_arch1', 'tu_arch2', 'tu_arch3'], th: [4, 12, 28] },
  { c: 'u_xbow', ids: ['tu_xbow1', 'tu_xbow2', 'tu_xbow3'], th: [4, 12, 28] },
  { c: 'u_lcav', ids: ['tu_lcav1', 'tu_lcav2', 'tu_lcav3'], th: [4, 12, 28] },
  { c: 'u_hcav', ids: ['tu_hcav1', 'tu_hcav2', 'tu_hcav3'], th: [4, 12, 28] },
  { c: 'u_harch', ids: ['tu_harch1', 'tu_harch2', 'tu_harch3'], th: [4, 12, 28] },
  { c: 'u_chariot', ids: ['tu_chr1', 'tu_chr2', 'tu_chr3'], th: [4, 12, 28] },
  { c: 'u_militia', ids: ['tu_mil1', 'tu_mil2', 'tu_mil3'], th: [4, 12, 28] },
  { c: 'u_phal', ids: ['tu_phal1', 'tu_phal2', 'tu_phal3'], th: [4, 12, 28] },
  { c: 'u_velite', ids: ['tu_velite1', 'tu_velite2', 'tu_velite3'], th: [4, 12, 28] },
  { c: 'u_sling', ids: ['tu_sling1', 'tu_sling2', 'tu_sling3'], th: [4, 12, 28] },
  { c: 'u_eleph', ids: ['tu_eleph1', 'tu_eleph2'], th: [4, 14] },
  { c: 'u_cataph', ids: ['tu_cataph1', 'tu_cataph2'], th: [4, 14] },
  { c: 'u_warb', ids: ['tu_warb1', 'tu_warb2'], th: [4, 14] },
  { c: 'win', ids: ['tb_atk1', 'tb_atk2', 'tb_atk3'], th: [8, 25, 60] },
  { c: 'hold', ids: ['tb_def1', 'tb_def2', 'tb_def3'], th: [5, 15, 35] },
  { c: 'bandit', ids: ['tb_bandit1', 'tb_bandit2'], th: [3, 10] },
  { c: 'nomad', ids: ['tb_nomad1', 'tb_nomad2'], th: [3, 9] },
  { c: 'train', ids: ['tc_drill1', 'tc_drill2'], th: [12, 40] },
  { c: 'kannou', ids: ['tv_agri1', 'tv_agri2', 'tv_agri3'], th: [6, 18, 45] },
  { c: 'ichiba', ids: ['tv_comm1', 'tv_comm2'], th: [6, 20] },
  { c: 'junsatsu', ids: ['tv_order1', 'tv_order2'], th: [6, 20] },
  { c: 'kyouka', ids: ['tv_cult1', 'tv_cult2'], th: [6, 20] },
  { c: 'suiri', ids: ['tv_levee1', 'tv_levee2'], th: [3, 10] },
  { c: 'koseki', ids: ['tv_hh1', 'tv_hh2'], th: [5, 15] },
  { c: 'choushu', ids: ['tv_tax1', 'tv_tax2'], th: [6, 20] },
  { c: 'chouhei', ids: ['tv_recruit1', 'tv_recruit2'], th: [6, 20] },
  { c: 'saiban', ids: ['tp_frank1', 'tp_frank2'], th: [6, 20] },
  { c: 'debateWin', ids: ['tp_debate1', 'tp_debate2'], th: [3, 10] },
  { c: 'diplo', ids: ['tp_dip1', 'tp_dip2'], th: [4, 12] },
  { c: 'plotOk', ids: ['tp_plot1', 'tp_plot2', 'tp_plot3'], th: [2, 6, 12] },
  { c: 'scout', ids: ['tp_spy1', 'tp_spy2'], th: [5, 15] },
  { c: 'recruitOk', ids: ['tp_talent1', 'tp_talent2'], th: [3, 9] },
  { c: 'feast', ids: ['tp_bond1', 'tp_bond2'], th: [6, 20] },
  { c: 'build', ids: ['tv_build1', 'tv_build2'], th: [4, 12] },
  { c: 'study', ids: ['tp_learn1', 'tp_learn2'], th: [12, 40] },
];
