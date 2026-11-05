/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   部隊「類型」定義：地面、航空、海上
   --------------------------------------------------------------------------
   地面單位的數值意義：
     hp     兵力（100 = 一個滿編旅約 3,000～4,500 人）
     org    組織度上限（部隊還能不能有效作戰；歸零就潰散後撤）
     soft   對「軟目標」火力（步兵、卡車、集結中的登陸部隊）
     hard   對「硬目標」火力（戰車、裝甲車）
     armor  自身裝甲防護
     pierce 穿甲能力（打不穿敵方裝甲時火力會大打折扣）
     def    防禦值（守方加成）
     move   每回合移動點數
   ========================================================================== */

TW.GROUND_TYPES = {
  /* ---------------- 國軍 ---------------- */
  roc_armor: {
    name:'裝甲旅', icon:'裝甲', cls:'armor',
    hp:100, org:62, soft:22, hard:30, armor:22, pierce:27, def:20, move:4, recon:3, use:1.4
  },
  roc_mech: {
    name:'機械化步兵旅', icon:'機步', cls:'mech',
    hp:100, org:66, soft:25, hard:18, armor:13, pierce:17, def:25, move:3, recon:3, use:1.2
  },
  roc_combined: {
    name:'聯兵旅', icon:'聯兵', cls:'inf',
    hp:100, org:70, soft:21, hard:12, armor:6, pierce:12, def:29, move:2, recon:2, use:1.0
  },
  roc_marine: {
    name:'海軍陸戰隊旅', icon:'陸戰', cls:'marine',
    hp:100, org:74, soft:25, hard:13, armor:8, pierce:13, def:27, move:3, recon:3, use:1.1, amphib:true
  },
  roc_sf: {
    name:'特種作戰旅', icon:'特戰', cls:'sf',
    hp:60, org:80, soft:18, hard:8, armor:2, pierce:8, def:22, move:3, recon:6, use:0.6,
    stealth:true, airmobile:true          // 可由 C-130／UH-60 實施空降或空中突擊
  },
  roc_arty: {
    name:'砲兵指揮部', icon:'砲兵', cls:'arty',
    hp:60, org:56, soft:34, hard:10, armor:3, pierce:7, def:9, move:2, recon:1, use:1.3, range:1
  },
  roc_aa: {
    name:'防空飛彈群', icon:'防空', cls:'aa',
    hp:55, org:60, soft:4, hard:2, armor:3, pierce:2, def:11, move:2, recon:2, use:0.9, aa:26, abm:14
  },
  roc_ssm: {
    name:'海鋒大隊（岸置反艦）', icon:'海鋒', cls:'ssm',
    hp:50, org:58, soft:3, hard:2, armor:2, pierce:2, def:9, move:3, recon:2, use:0.8, ashm:30, stealth:true
  },
  roc_reserve: {
    name:'後備旅', icon:'後備', cls:'reserve',
    hp:88, org:46, soft:13, hard:5, armor:1, pierce:6, def:22, move:1, recon:1, use:0.7
  },
  roc_garrison: {
    name:'守備旅', icon:'守備', cls:'garrison',
    hp:80, org:55, soft:15, hard:6, armor:2, pierce:7, def:26, move:1, recon:2, use:0.8
  },
  /* 工兵群：戰鬥力比步兵弱，真正的價值在阻絕作業。
     國軍的縱深防禦本來就靠工兵——橋梁預置爆破孔、隘道障礙、灘岸阻絕樁，
     都是在敵人到達之前先做好的。 */
  /* ---- 美軍陸戰隊（介入後才會出現） ---- */
  us_marine: {
    name:'美軍陸戰隊遠征隊', icon:'美陸', cls:'marine',
    hp:95, org:88, soft:30, hard:22, armor:16, pierce:24, def:32, move:3, recon:5, use:1.2,
    amphib:true
  },
  roc_engineer: {
    name:'工兵群', icon:'工兵', cls:'engineer',
    hp:70, org:58, soft:10, hard:5, armor:3, pierce:5, def:19, move:2, recon:2, use:0.7,
    engineer:true
  },

  /* ---------------- 共軍 ---------------- */
  pla_heavy: {
    name:'重型合成旅', icon:'重合', cls:'armor', heavy:true,
    hp:110, org:64, soft:26, hard:33, armor:25, pierce:30, def:22, move:3, recon:3, use:1.6
  },
  pla_medium: {
    name:'中型合成旅', icon:'中合', cls:'mech', heavy:true,
    hp:105, org:66, soft:27, hard:21, armor:15, pierce:20, def:24, move:3, recon:3, use:1.3
  },
  pla_light: {
    name:'輕型高機動合成旅', icon:'輕合', cls:'inf',
    hp:95, org:70, soft:23, hard:12, armor:7, pierce:13, def:24, move:4, recon:4, use:1.0
  },
  pla_amphib: {
    name:'兩棲合成旅', icon:'兩棲', cls:'amphib',
    hp:100, org:68, soft:24, hard:19, armor:14, pierce:19, def:22, move:3, recon:3, use:1.3, amphib:true
  },
  pla_marine: {
    name:'海軍陸戰隊旅', icon:'陸戰', cls:'marine',
    hp:98, org:72, soft:26, hard:16, armor:11, pierce:17, def:23, move:3, recon:4, use:1.2, amphib:true
  },
  pla_abn: {
    name:'空降兵旅', icon:'空降', cls:'airborne',
    hp:82, org:70, soft:22, hard:10, armor:5, pierce:11, def:20, move:2, recon:4, use:0.9, airborne:true
  },
  pla_sof: {
    name:'特種作戰旅', icon:'特戰', cls:'sf',
    hp:55, org:82, soft:19, hard:7, armor:2, pierce:8, def:18, move:3, recon:7, use:0.6, stealth:true, airborne:true
  },
  pla_arty: {
    name:'遠程火箭砲兵旅', icon:'火箭', cls:'arty',
    hp:65, org:58, soft:36, hard:12, armor:4, pierce:8, def:10, move:2, recon:1, use:1.5, range:2
  },
  pla_aa: {
    name:'防空旅（紅旗系列）', icon:'防空', cls:'aa',
    hp:58, org:60, soft:4, hard:2, armor:4, pierce:2, def:12, move:2, recon:3, use:1.0, aa:28, abm:8
  },
  pla_militia: {
    name:'民兵支援隊', icon:'民兵', cls:'reserve',
    hp:70, org:40, soft:9, hard:2, armor:0, pierce:3, def:14, move:1, recon:1, use:0.5
  }
};

/* ==========================================================================
   航空聯隊
     air    空戰能力（爭奪制空權）
     cas    密接支援（打地面部隊）
     ashm   反艦
     strike 對地縱深打擊
     sead   壓制敵防空
     c4isr  空中預警／指管
     asw    反潛
   ========================================================================== */
TW.AIR_TYPES = {
  f16v:    { name:'F-16V Block 20', air:32, cas:15, ashm:19, strike:13, sead:11, def:26 },
  f16bk70: { name:'F-16C/D Block 70', air:35, cas:16, ashm:20, strike:15, sead:12, def:28 },
  mirage:  { name:'幻象 2000-5Ei', air:31, cas:5,  ashm:3,  strike:4,  sead:2,  def:25 },
  idf:     { name:'F-CK-1C/D 經國號', air:24, cas:13, ashm:15, strike:9,  sead:4,  def:21 },
  f5e:     { name:'F-5E/F 虎II', air:9,  cas:9,  ashm:2,  strike:3,  sead:1,  def:10 },
  bravehawk:{name:'T-BE5A 勇鷹（戰備轉換）', air:11, cas:10, ashm:4, strike:3, sead:1, def:12 },
  e2k:     { name:'E-2K 鷹眼預警機', air:0, c4isr:22, def:6 },
  p3c:     { name:'P-3C 獵戶座反潛機', air:0, asw:28, ashm:11, def:8 },
  rocheli: { name:'AH-64E／AH-1W 攻擊直升機隊', air:4, cas:24, hard:9, def:14 },

  /* ---- 美軍（介入後才會出現） ---- */
  f22:     { name:'F-22A 猛禽（嘉手納）', air:48, cas:8, ashm:4, strike:12, sead:9, def:38, stealth:true },
  f35c:    { name:'F-35C 閃電II（艦載）', air:40, cas:20, ashm:22, strike:24, sead:20, def:33, stealth:true },
  b1b:     { name:'B-1B 槍騎兵（安德森）', air:2, cas:10, ashm:34, strike:38, def:12 },

  j20:     { name:'殲-20 威龍', air:42, cas:6,  ashm:8,  strike:10, sead:6,  def:34, stealth:true },
  j16:     { name:'殲-16', air:34, cas:17, ashm:19, strike:19, sead:14, def:27 },
  j10c:    { name:'殲-10C', air:30, cas:11, ashm:9,  strike:8,  sead:7,  def:24 },
  j11b:    { name:'殲-11B', air:25, cas:8,  ashm:6,  strike:5,  sead:2,  def:21 },
  jh7a:    { name:'殲轟-7A 飛豹', air:8,  cas:19, ashm:21, strike:17, sead:9, def:14 },
  h6k:     { name:'轟-6K 戰略轟炸機', air:2, cas:6, ashm:24, strike:28, def:10 },
  kj500:   { name:'空警-500 預警機', air:0, c4isr:23, def:6 },
  plaheli: { name:'直-10／直-19 攻擊直升機隊', air:3, cas:22, hard:8, def:13 },
  y20:     { name:'運-20 運輸機隊', air:0, lift:10, def:6 }
};

/* ==========================================================================
   海上兵力（以「艦隊／支隊」為單位）
     hp   艦體耐受度      aa 艦隊防空     asuw 反水面     asw 反潛
     lift 兩棲載運量（可運送幾個旅）      spd 每回合可移動格數
   ========================================================================== */
/* kt = 持續作戰航速（節），不是最大航速。
   一回合 12 小時、一格 15 公里：每格/回合 ≈ 節 × 1.852 × 12 ÷ 15 ≈ 節 × 1.48。
   18 節的驅逐艦一回合走 27 格——基隆到高雄走海路約 400 公里，12 小時剛好。
   潛艦用的是安靜潛航速度，衝快了會被聽到。 */
TW.NAVY_TYPES = {
  kidd:      { name:'基隆級驅逐艦', hp:92,  aa:32, asuw:22, asw:17, kt:18 },
  chengkung: { name:'成功級巡防艦', hp:72,  aa:19, asuw:21, asw:19, kt:18 },
  kangding:  { name:'康定級巡防艦', hp:68,  aa:15, asuw:19, asw:23, kt:16 },
  chiyang:   { name:'濟陽級巡防艦', hp:60,  aa:8,  asuw:11, asw:26, kt:16 },
  tuochiang: { name:'沱江級巡邏艦', hp:30,  aa:11, asuw:32, asw:6,  kt:25, small:true },
  kh6:       { name:'光華六號飛彈快艇隊', hp:14, aa:3, asuw:18, asw:0, kt:25, small:true },
  /* mine = 一艘一回合布得了幾格。
     快速布雷艇有專用布雷軌，就是為了戰時在紅色海灘外快速拉出阻絕雷區而造的；
     潛艦從魚雷管布放，量少但不會曝光；玉山級的塢艙載得下水雷。
     基隆級、成功級這種水面作戰艦沒有布雷裝備，派它去布雷是白跑一趟。 */
  hailung:   { name:'劍龍級潛艦', hp:40, aa:0, asuw:26, asw:22, kt:6, sub:true, mine:0.5 },
  haikun:    { name:'海鯤級潛艦', hp:46, aa:0, asuw:30, asw:26, kt:6, sub:true, mine:0.5 },
  rocmine:   { name:'快速布雷艇隊', hp:20, aa:2, asuw:2, asw:0, kt:12, minelayer:true, mine:0.6 },
  yushan:    { name:'玉山級兩棲船塢運輸艦', hp:60, aa:10, asuw:4, asw:2, kt:15, lift:1, mine:0.5 },

  t055:      { name:'055型飛彈驅逐艦', hp:125, aa:42, asuw:36, asw:26, kt:18 },
  t052d:     { name:'052D型飛彈驅逐艦', hp:96, aa:33, asuw:27, asw:21, kt:18 },
  t054a:     { name:'054A型巡防艦', hp:76, aa:21, asuw:21, asw:25, kt:16 },
  t056a:     { name:'056A型輕型巡防艦', hp:46, aa:11, asuw:15, asw:17, kt:16 },
  t075:      { name:'075型兩棲攻擊艦', hp:112, aa:15, asuw:5, asw:6, kt:15, lift:3 },
  t071:      { name:'071型船塢登陸艦', hp:92, aa:9, asuw:3, asw:3, kt:15, lift:2 },
  t072a:     { name:'072A型戰車登陸艦', hp:52, aa:5, asuw:2, asw:0, kt:12, lift:1 },
  roro:      { name:'徵用民用滾裝船團', hp:38, aa:0, asuw:0, asw:0, kt:12, lift:2, fragile:true },
  shandong:  { name:'山東艦航空母艦', hp:145, aa:26, asuw:10, asw:14, kt:18, carrier:22 },
  t093:      { name:'093型攻擊核潛艦', hp:62, aa:0, asuw:30, asw:24, kt:12, sub:true },
  t039c:     { name:'039C型柴電潛艦', hp:44, aa:0, asuw:24, asw:20, kt:6, sub:true },

  /* ---- 美軍（介入後才會出現） ---- */
  cvn:       { name:'尼米茲級航空母艦', hp:170, aa:30, asuw:14, asw:20, kt:20, carrier:34 },
  ddg51:     { name:'柏克級神盾驅逐艦', hp:104, aa:46, asuw:32, asw:30, kt:20 },
  cg47:      { name:'提康德羅加級巡洋艦', hp:98, aa:44, asuw:30, asw:26, kt:20 },
  ssn774:    { name:'維吉尼亞級攻擊核潛艦', hp:70, aa:0, asuw:40, asw:34, kt:12, sub:true },
  lha6:      { name:'美利堅級兩棲突擊艦', hp:120, aa:16, asuw:6, asw:8, kt:16, carrier:12 }
};

/* ==========================================================================
   部隊編成器：用「營」組出自己的旅
   --------------------------------------------------------------------------
   國軍從 2022 年開始把舊的步兵旅改成「聯兵旅」——一個旅裡面混編步兵、
   機步、戰車、砲兵，自己就能打一場小型的合成兵種作戰。這裡讓你自己決定
   一個旅要放哪些營。

   一個旅最多 6 個營。組出來的數值怎麼算（跟《鋼鐵雄心 4》的師編制一樣）：
     兵力、軟／硬攻、防禦   → 各營相加
     組織度                 → 各營平均（後勤營另外加）
     裝甲                   → 最硬的那一營 ×0.3 ＋ 平均 ×0.7
     穿甲                   → 最強的那一營 ×0.4 ＋ 平均 ×0.6
     機動力                 → 全旅最慢的那一營（一個步兵營就會拖慢整個裝甲旅）
   兵種類別看「佔一半以上的是什麼」：戰車過半＝裝甲旅（進山要吃重裝備懲罰），
   砲兵營有 2 個以上就能隔格砲擊。

   ic＝工業點、man＝人力（千人）
   ========================================================================== */
TW.BATTALIONS = {
  inf:   { name:'步兵營',       short:'步', desc:'便宜、耐打、守得住，但走得慢也打不動戰車',
           hp:18, org:72, soft:3.5, hard:1.5, armor:1,  pierce:3,  def:6.0, move:2, ic:4,  man:0.8 },
  mech:  { name:'機步營（雲豹）', short:'機', desc:'CM-34 雲豹甲車，攻守平均，跟得上戰車',
           hp:18, org:66, soft:4.0, hard:3.0, armor:12, pierce:14, def:5.0, move:3, ic:8,  man:0.7 },
  tank:  { name:'戰車營',       short:'車', desc:'M1A2T／CM-11，打硬目標與裝甲防護最強，進山地很吃力',
           hp:17, org:62, soft:3.5, hard:7.0, armor:22, pierce:27, def:3.5, move:4, ic:11, man:0.5 },
  arty:  { name:'自走砲兵營',   short:'砲', desc:'M109 自走砲，軟目標火力最高；兩個營以上全旅可隔 1 格砲擊',
           hp:12, org:56, soft:6.0, hard:2.0, armor:3,  pierce:6,  def:1.5, move:3, ic:8,  man:0.5 },
  at:    { name:'反裝甲營',     short:'甲', desc:'標槍、拖式飛彈，專打戰車，自己很脆',
           hp:12, org:64, soft:1.5, hard:6.0, armor:2,  pierce:26, def:3.5, move:2, ic:6,  man:0.5 },
  aa:    { name:'防空營',       short:'空', desc:'復仇者、劍一，讓旅自己有野戰防空（空降、直升機都會吃虧）',
           hp:10, org:60, soft:1.0, hard:0.5, armor:3,  pierce:2,  def:1.5, move:3, ic:7,  man:0.4, aa:8 },
  recon: { name:'偵搜營',       short:'偵', desc:'輕裝甲偵察車，看得遠、跑得快',
           hp:10, org:70, soft:2.5, hard:1.5, armor:5,  pierce:6,  def:2.0, move:4, ic:5,  man:0.4, recon:2 },
  eng:   { name:'工兵營',       short:'工', desc:'有了它，這個旅就能埋爆破裝藥、炸斷國道',
           hp:12, org:62, soft:1.5, hard:1.0, armor:3,  pierce:3,  def:3.0, move:2, ic:4,  man:0.5, engineer:true },
  sup:   { name:'後勤支援營',   short:'補', desc:'不打仗，但全旅組織度 +8、斷補時掉得比較慢',
           hp:8,  org:0,  soft:0,   hard:0,   armor:1,  pierce:0,  def:1.0, move:3, ic:4,  man:0.4, logistics:true }
};
TW.BRIGADE_MAX_BN = 6;

/* 幾個現成的範本，第一次打開編成器就有得選 */
TW.DEFAULT_TEMPLATES = [
  { name:'標準聯兵旅',   short:'聯兵', bns:{ inf:3, mech:1, tank:1, arty:1 } },
  { name:'重裝甲旅',     short:'重裝', bns:{ tank:3, mech:2, arty:1 } },
  { name:'快速反應旅',   short:'快反', bns:{ mech:3, recon:1, at:1, arty:1 } },
  { name:'海岸守備旅',   short:'海守', bns:{ inf:4, at:1, eng:1 } }
];

/* 把一份編制算成一個「部隊類型」（跟 GROUND_TYPES 裡的格式一樣） */
TW.buildBrigadeType = function(tpl){
  const list = [];
  Object.keys(tpl.bns || {}).forEach(k => {
    const B = TW.BATTALIONS[k];
    for (let i = 0; i < (tpl.bns[k] || 0) && B; i++) list.push(k);
  });
  const n = list.length || 1;
  const Bs = list.map(k => TW.BATTALIONS[k]);
  const sum = key => Bs.reduce((s, b) => s + (b[key] || 0), 0);
  const cnt = k => list.filter(x => x === k).length;

  const fighting = Bs.filter(b => !b.logistics);
  const orgAvg = fighting.length ? fighting.reduce((s, b) => s + b.org, 0) / fighting.length : 50;
  const armors = Bs.map(b => b.armor), pierces = Bs.map(b => b.pierce);
  const avg = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

  let cls = 'inf';
  if (cnt('tank') * 2 >= n && cnt('tank') > 0) cls = 'armor';
  else if ((cnt('mech') + cnt('tank')) * 2 > n) cls = 'mech';
  else if (cnt('arty') * 2 > n) cls = 'arty';

  const T = {
    name: tpl.name || '自編旅',
    icon: (tpl.short || '自編').slice(0, 2),
    cls,
    hp: Math.round(sum('hp')),
    org: Math.round(orgAvg + cnt('sup') * 8),
    soft: +sum('soft').toFixed(1),
    hard: +sum('hard').toFixed(1),
    armor: +(Math.max(0, ...armors) * 0.3 + avg(armors) * 0.7).toFixed(1),
    pierce: +(Math.max(0, ...pierces) * 0.4 + avg(pierces) * 0.6).toFixed(1),
    def: +sum('def').toFixed(1),
    move: Math.min(...Bs.map(b => b.move)),
    recon: Math.min(6, 2 + sum('recon')),
    use: +(0.6 + n * 0.12).toFixed(2),
    custom: true
  };
  if (cnt('arty') >= 2){ T.range = 1; T.bombard = true; }
  if (sum('aa') > 0) T.aa = sum('aa');
  if (cnt('eng') > 0) T.engineer = true;
  if (cnt('sup') > 0) T.logistics = cnt('sup');
  return T;
};

/* 編成要花多少：工業點、人力、幾個回合 */
TW.brigadeCost = function(tpl){
  let ic = 0, man = 0, n = 0;
  Object.keys(tpl.bns || {}).forEach(k => {
    const B = TW.BATTALIONS[k]; const c = tpl.bns[k] || 0;
    if (!B || !c) return;
    ic += B.ic * c; man += B.man * c; n += c;
  });
  return { ic, man:+man.toFixed(1), turns: 3 + Math.ceil(n / 2), n };
};

/* 空軍任務清單 */
TW.AIR_MISSIONS = [
  { id:'cap',    name:'制空作戰',     desc:'爭奪空域控制權，掩護其他任務' },
  { id:'cas',    name:'密接支援',     desc:'直接打擊接戰中的敵地面部隊' },
  { id:'ashm',   name:'反艦攻擊',     desc:'攻擊敵水面艦艇與登陸船團' },
  { id:'strike', name:'縱深打擊',     desc:'攻擊敵方港口、機場與集結區' },
  { id:'sead',   name:'壓制敵防空',   desc:'削弱敵防空系統，提高我機生存率' },
  { id:'rest',   name:'疏散保存',     desc:'轉場至戰備跑道與洞庫，不出動但降低被毀損失' }
];

/* 海軍任務清單 */
TW.NAVY_MISSIONS = [
  { id:'strike', name:'反水面攻擊', desc:'主動搜索並攻擊敵艦與登陸船團' },
  { id:'escort', name:'護航屏衛',   desc:'保護東部海運生命線與友軍艦隊' },
  { id:'patrol', name:'巡弋警戒',   desc:'維持存在，提供偵蒐，交戰意願低' },
  { id:'mine',   name:'佈雷',       desc:'在灘岸外海布設水雷（限布雷艇、潛艦、玉山級）' },
  { id:'evade',  name:'疏泊保存',   desc:'避戰疏散，大幅降低被擊沉風險' },
  { id:'repair', name:'回港整補',   desc:'進軍港或商港修復戰損、補給彈藥，期間不參戰' }
];
