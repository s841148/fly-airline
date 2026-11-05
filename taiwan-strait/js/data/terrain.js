/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   地形、地圖、地名、空域
   --------------------------------------------------------------------------
   地圖是 26 欄 × 27 列的六角格。一格 = 15 公里。
   左邊是中國福建沿岸，中間是台灣海峽，右邊是台灣本島。

   地圖字串的符號：
     .  海洋        p  平原        h  丘陵／台地
     m  山地        u  都市        c  中國大陸
   ========================================================================== */

TW.TERRAIN = {
  '.': { id:'sea',   name:'海域',     move:99, def:1.00, sea:true,  color:'#12283f' },
  'p': { id:'plain', name:'平原',     move:1,  def:1.00, color:'#4a6b3f' },
  'h': { id:'hill',  name:'丘陵台地', move:2,  def:1.35, color:'#6d7a42' },
  'm': { id:'mtn',   name:'山地',     move:3,  def:1.75, color:'#6a5c48', heavyPenalty:0.5 },
  'u': { id:'urban', name:'市區',     move:1,  def:1.55, color:'#8d8577', urban:true },
  'c': { id:'prc',   name:'大陸沿岸', move:1,  def:1.10, color:'#5c4a4a', prc:true }
};

/* --------------------------------------------------------------------------
   地圖本體。每一行 26 個字，共 27 行。北在上。

   地形修正（2026/09/30）：
     · 中南部原本太胖——嘉義以南一路 8、9 格寬，但真實的台灣過了台南
       就快速收窄：高雄到台東約 85 公里（6 格）、枋寮到大武只剩 2～3 格，
       恆春半島更細。現在南部照這個比例收窄，台東志航往北移到它真正
       相對於高雄的位置（台東的緯度其實跟高雄差不多，但在「拉直」的地圖上
       它在高雄的東北方）。
     · 山地比例從 28% 提高到 33%，山地加丘陵共 62%——台灣本來就是
       三分之二是山。中央山脈、雪山山脈往北延伸到新竹、宜蘭之間，
       花蓮以北是清水斷崖一路到海。
     · 東部多了花東縱谷（花蓮到台東之間那條平原）與海岸山脈。
     · 宜蘭多了蘭陽平原。
   -------------------------------------------------------------------------- */
/* 地圖版本：地圖字串或地點座標大改時要 +1，舊版存檔讀進來才會被擋下來
   （不然部隊可能會被讀到海裡）。 */
TW.MAP_VERSION = 2;

TW.MAP_ROWS = [
  /* 00 */ "..........................",
  /* 01 */ "cc........................",
  /* 02 */ "cc.............hhh........",
  /* 03 */ "ccc..........puuuh........",
  /* 04 */ "ccc..........pphhmph......",
  /* 05 */ "cccp.........ppuhmmh......",
  /* 06 */ "cc...........pphmmmm......",
  /* 07 */ "cc...........pphhmmm......",
  /* 08 */ "ccc..........ppuhmmmm.....",
  /* 09 */ "ccc..........pphmmmmmh....",
  /* 10 */ "ccc..........pphhmmmmh....",
  /* 11 */ "ccc..........ppuhmmmph....",
  /* 12 */ "ccc..........pphhmmmph....",
  /* 13 */ "cccc.p....p..pphhmmmph....",
  /* 14 */ "cccc......p..ppuhmmhp.....",
  /* 15 */ "cccc.........ppphmmhp.....",
  /* 16 */ "cccc..........puhmmmp.....",
  /* 17 */ "cccc..........puuhmm......",
  /* 18 */ "ccc...........ppuhm.......",
  /* 19 */ "ccc............phm........",
  /* 20 */ "ccc.............phm.......",
  /* 21 */ "ccc.............hm........",
  /* 22 */ "ccc..............hh.......",
  /* 23 */ "cc...............hp.......",
  /* 24 */ "cc...............ph.......",
  /* 25 */ "..........................",
  /* 26 */ ".........................."
];

/* --------------------------------------------------------------------------
   重要地點：都市、港口、機場。
   type: city 都市 / port 商港 / navalbase 軍港 / airbase 空軍基地 / airport 民航機場
   vp   : 戰略價值（共軍佔領後我方戰爭意志下降幅度、也是勝負判定依據）
   ind  : 提供的工業產能
   -------------------------------------------------------------------------- */
TW.PLACES = [
  // ---- 我方：北部 ----
  { c:15,r:3,  name:'台北',        side:'ROC', type:['city','capital'],       vp:40, ind:8, hq:true },
  { c:16,r:3,  name:'基隆港',      side:'ROC', type:['city','port'],          vp:14, ind:3 },
  { c:13,r:3,  name:'淡水',        side:'ROC', type:['city'],                 vp:6,  ind:1 },
  { c:19,r:4,  name:'蘇澳軍港',    side:'ROC', type:['navalbase','port'],     vp:12, ind:2 },
  { c:14,r:5,  name:'桃園機場',    side:'ROC', type:['airport'],              vp:10, ind:2 },
  { c:14,r:6,  name:'新竹基地',    side:'ROC', type:['airbase'],              vp:11, ind:2 },
  // ---- 我方：中部 ----
  { c:13,r:7,  name:'台中港',      side:'ROC', type:['port'],                 vp:15, ind:3 },
  { c:14,r:8,  name:'清泉崗基地',  side:'ROC', type:['airbase'],              vp:12, ind:2 },
  { c:15,r:8,  name:'台中',        side:'ROC', type:['city'],                 vp:22, ind:6 },
  { c:15,r:11, name:'彰化員林',    side:'ROC', type:['city'],                 vp:9,  ind:3 },
  { c:15,r:14, name:'嘉義基地',    side:'ROC', type:['airbase','city'],       vp:13, ind:3 },
  // ---- 我方：南部 ----
  { c:15,r:16, name:'台南基地',    side:'ROC', type:['airbase','city'],       vp:16, ind:4 },
  { c:15,r:17, name:'左營高雄',    side:'ROC', type:['navalbase','port','city'], vp:26, ind:7 },
  { c:16,r:17, name:'岡山基地',    side:'ROC', type:['airbase'],              vp:11, ind:2 },
  { c:16,r:18, name:'屏東基地',    side:'ROC', type:['airbase'],              vp:9,  ind:2 },
  // ---- 我方：東部（軍援生命線） ----
  { c:21,r:10, name:'花蓮佳山',    side:'ROC', type:['airbase','port'],       vp:18, ind:3, hardened:true },
  { c:20,r:16, name:'台東志航',    side:'ROC', type:['airbase','port'],       vp:15, ind:2, hardened:true },
  // ---- 我方：外島 ----
  { c:10,r:14, name:'馬公',        side:'ROC', type:['airbase','navalbase'],  vp:14, ind:1 },
  { c:5, r:13, name:'金門',        side:'ROC', type:['city'],                 vp:8,  ind:0, raidBase:true },
  { c:3, r:5,  name:'馬祖',        side:'ROC', type:['city'],                 vp:5,  ind:0, raidBase:true },

  // ---- 發電廠 ----
  // 核二、核三已於 2025 年停機除役，台灣目前的電力幾乎全靠火力與燃氣機組，
  // 所以這裡放的是真正在發電的那幾座。mw 是它佔全國裝置容量的相對比重。
  { c:14,r:4,  name:'大潭電廠',    side:'ROC', type:['power'], vp:9,  ind:1, mw:22 },
  { c:13,r:8,  name:'台中火力',    side:'ROC', type:['power'], vp:11, ind:1, mw:28 },
  { c:13,r:12, name:'麥寮電廠',    side:'ROC', type:['power'], vp:7,  ind:1, mw:14 },
  { c:14,r:16, name:'興達電廠',    side:'ROC', type:['power'], vp:8,  ind:1, mw:18 },
  { c:15,r:18, name:'大林電廠',    side:'ROC', type:['power'], vp:7,  ind:1, mw:18 },

  // ---- 共軍：福建沿岸 ----
  { c:1, r:1,  name:'溫州',        side:'PLA', type:['city','port'],          vp:0,  ind:0 },
  { c:1, r:3,  name:'福州',        side:'PLA', type:['city','port','airbase'],vp:0,  ind:0 },
  { c:2, r:5,  name:'平潭',        side:'PLA', type:['port'],                 vp:0,  ind:0, staging:true },
  { c:2, r:11, name:'泉州',        side:'PLA', type:['port','airbase'],       vp:0,  ind:0, staging:true },
  { c:2, r:13, name:'廈門',        side:'PLA', type:['city','port','airbase'],vp:0,  ind:0, staging:true },
  { c:1, r:18, name:'汕頭',        side:'PLA', type:['port','airbase'],       vp:0,  ind:0, staging:true },

  // ---- 共軍：福建縱深機場（雄昇巡弋飛彈打得到的距離） ----
  { c:1, r:8,  name:'惠安機場',    side:'PLA', type:['airbase'],              vp:0, ind:0, deep:true },
  { c:2, r:9,  name:'連城機場',    side:'PLA', type:['airbase'],              vp:0, ind:0, deep:true },
  { c:1, r:15, name:'漳州機場',    side:'PLA', type:['airbase'],              vp:0, ind:0, deep:true },
  { c:0, r:6,  name:'水門機場',    side:'PLA', type:['airbase'],              vp:0, ind:0, deep:true }
];

/* --------------------------------------------------------------------------
   紅色海灘：國軍所判定「共軍可能登陸」的灘岸。
   diff 越大越難登陸（灘外水深、消波塊、潮差、灘後地形）
   -------------------------------------------------------------------------- */
TW.BEACHES = [
  { c:13,r:4,  name:'林口八里灘岸', diff:1.10 },
  { c:13,r:5,  name:'觀音草漯灘岸', diff:0.95 },
  { c:13,r:6,  name:'新竹香山灘岸', diff:1.00 },
  { c:13,r:9,  name:'台中大甲灘岸', diff:0.95 },
  { c:13,r:11, name:'彰濱崙尾灘岸', diff:0.90 },
  { c:13,r:13, name:'雲林台西灘岸', diff:0.90 },
  { c:13,r:15, name:'嘉義布袋灘岸', diff:0.95 },
  { c:14,r:17, name:'台南將軍灘岸', diff:1.00 },
  { c:14,r:18, name:'高雄林園灘岸', diff:1.10 },
  { c:15,r:19, name:'屏東枋寮灘岸', diff:1.15 },
  { c:10,r:13, name:'澎湖時裡灘岸', diff:1.05 },
  { c:21,r:12, name:'花蓮鹽寮岩岸', diff:1.60 }
];

/* --------------------------------------------------------------------------
   河川防線：西部主要溪流。
   台灣西部平原被幾條東西向的大河橫切，這些河川自古就是天然的守勢線，
   國軍的縱深防禦構想也是沿著它們一段一段往後撤。
   在這裡的效果是：守方防禦加成、攻方（含裝甲）通過要多付機動力。
   -------------------------------------------------------------------------- */
TW.RIVERS = [
  { name:'淡水河', hex:[[13,3],[14,3]] },
  { name:'頭前溪', hex:[[13,6],[14,6]] },
  { name:'大甲溪', hex:[[13,8],[14,9]] },
  { name:'濁水溪', hex:[[13,12],[14,12],[15,12]] },   // 西部最大的一條，天然的南北分界
  { name:'曾文溪', hex:[[14,15],[15,15]] },
  { name:'高屏溪', hex:[[15,18],[16,19]] }
];

/* --------------------------------------------------------------------------
   高速公路與主要幹道
   --------------------------------------------------------------------------
   hex 是依序走過的格子，前後兩格一定要相鄰（啟動時會檢查）。
   cost 是沿著這條路「從一格走到下一格」要花的機動力，不管地形多難走：
     · 國道：0.5——橋梁、隧道都做好了，重裝備也跑得動
     · 省道：0.75——台 9 線蘇花改、花東公路，彎多、路窄
   只有「沿著路走」才有優惠；從路上岔出去進山，照原本的地形算。

   道路是雙面刃：共軍上岸之後一樣會沿著國道往台北、高雄衝。
   反制方式是叫工兵在國道上埋爆破裝藥——炸斷的那一格（障礙區）
   在修好之前整條路都在那裡斷掉，移動與補給都沒有優惠。
   -------------------------------------------------------------------------- */
TW.HIGHWAYS = [
  { id:'n1', short:'1', name:'國道一號（中山高速公路）', cost:0.5, color:'#e8b64a',
    hex:[[16,3],[15,3],[15,4],[14,5],[14,6],[14,7],[15,8],[14,9],[15,10],[15,11],
         [15,12],[15,13],[15,14],[15,15],[15,16],[15,17]] },
  { id:'n3', short:'3', name:'國道三號（福爾摩沙高速公路）', cost:0.5, color:'#e8b64a',
    hex:[[16,3],[16,4],[15,5],[15,6],[15,7],[16,8],[15,9],[16,10],[16,11],[16,12],
         [16,13],[16,14],[16,15],[16,16],[16,17],[16,18]] },
  { id:'n5', short:'5', name:'國道五號（蔣渭水高速公路・雪山隧道）', cost:0.5, color:'#e8b64a',
    hex:[[15,3],[16,4],[17,4],[18,4],[19,4]] },
  { id:'p9', short:'台9', name:'台9線（蘇花改・花東公路）', cost:0.75, color:'#b9c7d6',
    hex:[[19,4],[19,5],[19,6],[19,7],[20,8],[20,9],[21,10],[20,11],[20,12],[20,13],
         [20,14],[20,15],[20,16]] }
];

/* 道路相連表：'c,r|c,r' → 那一段路的資料。啟動時算好一次，之後查表就好。 */
TW.HW_LINK = {};
TW.HIGHWAYS.forEach(hw => {
  for (let i = 1; i < hw.hex.length; i++){
    const [a, b] = [hw.hex[i - 1], hw.hex[i]];
    const k1 = a[0] + ',' + a[1] + '|' + b[0] + ',' + b[1];
    const k2 = b[0] + ',' + b[1] + '|' + a[0] + ',' + a[1];
    /* 兩條路共用同一段時，取比較快的那條 */
    const old = TW.HW_LINK[k1];
    if (!old || hw.cost < old.cost){ TW.HW_LINK[k1] = hw; TW.HW_LINK[k2] = hw; }
  }
});

/* 從 (fc,fr) 走到 (c,r) 有沒有道路可以走；有的話回傳那條路，沒有回傳 null。
   任何一端被炸成障礙區，這一段就不通。 */
TW.roadBetween = function(fc, fr, c, r){
  if (fc === undefined || fr === undefined) return null;
  const hw = TW.HW_LINK[fc + ',' + fr + '|' + c + ',' + r];
  if (!hw) return null;
  if (TW.S){
    const a = TW.hexAt(fc, fr), b = TW.hexAt(c, r);
    if ((a && a.obstacle > 0) || (b && b.obstacle > 0)) return null;
  }
  return hw;
};

/* 這一格有經過哪些道路（給介面顯示用） */
TW.roadsAt = function(c, r){
  return TW.HIGHWAYS.filter(hw => hw.hex.some(([a, b]) => a === c && b === r));
};

/* 一格在計入河川之後的實際防禦係數 */
TW.hexDef = function(h){
  return h.T.def * (h.river ? TW.B.RIVER_DEF : 1);
};

/* --------------------------------------------------------------------------
   空域／海域分區：空戰與制海權以「區」為單位計算
   -------------------------------------------------------------------------- */
TW.ZONES = [
  { id:'ZN',  name:'台灣北部空域', color:'#5b7fb5' },
  { id:'ZC',  name:'台灣中部空域', color:'#5b93b5' },
  { id:'ZS',  name:'台灣南部空域', color:'#5ba8b5' },
  { id:'ZSN', name:'海峽北部',     color:'#8a6ab5', sea:true },
  { id:'ZSS', name:'海峽南部',     color:'#b56a9a', sea:true },
  { id:'ZE',  name:'東部海域',     color:'#4f9e7a', sea:true }
];

/* 海面一律歸入三個海域，陸地歸入三個空域。
   這樣「海峽制海權」才會真的涵蓋灘頭外海，打船團才對登陸有意義。 */
TW.zoneOf = function(c, r, t){
  if (t === undefined) t = (TW.MAP_ROWS[r] || '')[c];
  if (t === '.'){
    if (c >= 20) return 'ZE';                 // 東部海域（軍援生命線）
    /* 南部收窄之後，台東、大武、恆春東邊的海也是太平洋，不是台灣海峽 */
    if (r >= 16 && c >= 18) return 'ZE';
    return (r < 13) ? 'ZSN' : 'ZSS';          // 台灣海峽（含西部近岸）
  }
  if (r < 9)   return 'ZN';
  if (r < 17)  return 'ZC';
  return 'ZS';
};

/* 某一格「外海」屬於哪個海域：灘頭本身是陸地，要看它旁邊的海 */
TW.seaZoneAt = function(c, r){
  const h = TW.hexAt(c, r);
  if (h && h.t === '.') return h.zone;
  const n = TW.Hex.neighbors(c, r).map(([a, b]) => TW.hexAt(a, b)).find(x => x && x.t === '.');
  return n ? n.zone : (h ? h.zone : 'ZSN');
};

/* ==========================================================================
   六角格數學（odd-r 偏移座標：奇數列向右推半格）
   ========================================================================== */
TW.Hex = {
  // 相鄰 6 格的位移
  DIR_EVEN: [[ 1, 0],[ 0,-1],[-1,-1],[-1, 0],[-1, 1],[ 0, 1]],
  DIR_ODD:  [[ 1, 0],[ 1,-1],[ 0,-1],[-1, 0],[ 0, 1],[ 1, 1]],

  neighbors(c, r){
    const d = (r & 1) ? this.DIR_ODD : this.DIR_EVEN;
    const out = [];
    for (const [dc, dr] of d){
      const nc = c + dc, nr = r + dr;
      if (nc >= 0 && nc < TW.B.MAP_W && nr >= 0 && nr < TW.B.MAP_H) out.push([nc, nr]);
    }
    return out;
  },

  // 偏移座標 → 立方座標
  toCube(c, r){
    const x = c - ((r - (r & 1)) / 2);
    const z = r;
    return [x, -x - z, z];
  },

  distance(c1, r1, c2, r2){
    const a = this.toCube(c1, r1), b = this.toCube(c2, r2);
    return Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2]));
  },

  // 格子中心的畫面座標
  center(c, r, R){
    const w = Math.sqrt(3) * R;
    return {
      x: w * (c + 0.5 * (r & 1)) + w / 2,
      y: R * 1.5 * r + R
    };
  },

  // 畫面座標 → 最近的格子（先粗算再比對 7 個候選）
  fromPixel(px, py, R){
    const w = Math.sqrt(3) * R;
    const r0 = Math.round((py - R) / (R * 1.5));
    let best = null, bestD = 1e9;
    for (let r = r0 - 1; r <= r0 + 1; r++){
      if (r < 0 || r >= TW.B.MAP_H) continue;
      const c0 = Math.round((px - w / 2) / w - 0.5 * (r & 1));
      for (let c = c0 - 1; c <= c0 + 1; c++){
        if (c < 0 || c >= TW.B.MAP_W) continue;
        const p = this.center(c, r, R);
        const d = (p.x - px) ** 2 + (p.y - py) ** 2;
        if (d < bestD){ bestD = d; best = [c, r]; }
      }
    }
    return best;
  }
};

/* 啟動時檢查地圖字串長度有沒有寫錯 */
(function validateMap(){
  TW.MAP_ROWS.forEach((row, i) => {
    if (row.length !== TW.B.MAP_W){
      console.error('地圖第 ' + i + ' 列長度是 ' + row.length + '，應該是 ' + TW.B.MAP_W);
    }
  });
  if (TW.MAP_ROWS.length !== TW.B.MAP_H){
    console.error('地圖列數是 ' + TW.MAP_ROWS.length + '，應該是 ' + TW.B.MAP_H);
  }
  const at = (c, r) => (TW.MAP_ROWS[r] || '')[c];
  const seen = {};
  TW.PLACES.forEach(p => {
    const t = at(p.c, p.r);
    if (!t || t === '.') console.error('地點「' + p.name + '」(' + p.c + ',' + p.r + ') 落在海上');
    const k = p.c + ',' + p.r;
    if (seen[k]) console.error('地點「' + p.name + '」與「' + seen[k] + '」座標重疊');
    seen[k] = p.name;
  });
  TW.HIGHWAYS.forEach(hw => hw.hex.forEach(([c, r], i) => {
    const t = at(c, r);
    if (!t || t === '.') console.error('道路「' + hw.name + '」第 ' + i + ' 格 (' + c + ',' + r + ') 落在海上');
    if (i > 0){
      const [pc, pr] = hw.hex[i - 1];
      if (TW.Hex.distance(pc, pr, c, r) !== 1)
        console.error('道路「' + hw.name + '」(' + pc + ',' + pr + ')→(' + c + ',' + r + ') 兩格不相鄰');
    }
  }));
  TW.BEACHES.forEach(b => {
    const t = at(b.c, b.r);
    if (!t || t === '.') console.error('灘岸「' + b.name + '」落在海上');
    const hasSea = TW.Hex.neighbors(b.c, b.r).some(([nc, nr]) => at(nc, nr) === '.');
    if (!hasSea) console.error('灘岸「' + b.name + '」不臨海，無法登陸');
  });
})();
