/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   遊戲狀態：整場戰役的所有資料都放在 TW.S 這一個物件裡
   ========================================================================== */

TW.S = null;
let _uid = 1;
const nid = () => 'u' + (_uid++);

TW.hexAt = (c, r) => {
  if (c < 0 || r < 0 || c >= TW.B.MAP_W || r >= TW.B.MAP_H) return null;
  return TW.S.hexes[r * TW.B.MAP_W + c];
};
/* 已經登艦的部隊不算在地面上——不佔格、不守土、也打不到 */
TW.unitsAt = (c, r) => TW.S.units.filter(u => !u.dead && !u.embarked && u.c === c && u.r === r);
TW.navyAt  = (c, r) => TW.S.navy.filter(f => !f.dead && f.c === c && f.r === r);

/* 這支編隊是不是潛艦編隊 */
/* 打到不同設施要講對東西——電廠沒有跑道，港口也沒有 */
TW.facilityHit = function(p){
  if (!p) return '設施';
  if (p.mw) return '機組與變電設備';
  const t = p.type || [];
  if (t.includes('airbase') || t.includes('airport')) return '跑道與塔台';
  if (t.includes('navalbase') || t.includes('port')) return '碼頭與吊掛設施';
  if (t.includes('power')) return '機組與變電設備';
  return '設施';
};

/* 灘頭（陸地格）外海的雷區密度。雷只布在海面格上，
   所以判定登陸時要看灘頭旁邊的海，不是灘頭那一格本身。
   onlyKnown = true 時只算共軍已經知道的雷區。 */
TW.seaMinesNear = function(h, onlyKnown){
  if (!h) return 0;
  let m = h.t === '.' ? h.mines : 0;
  TW.Hex.neighbors(h.c, h.r).forEach(([c, r]) => {
    const x = TW.hexAt(c, r);
    if (!x || x.t !== '.' || x.mines <= 0) return;
    if (onlyKnown && !x.plaKnows) return;
    m = Math.max(m, x.mines);
  });
  return m;
};

TW.isSub = f => !!(f && f.ships && f.ships.some(s => s.n > 0 && s.N && s.N.sub));

/* 對 side 這一方來說，這支編隊現在看不看得到。
   潛艦除非自己開火、或被反潛兵力抓到，否則對方根本不知道它在哪裡。 */
TW.fleetHidden = function(f, side){
  if (!f || f.dead) return true;
  if (f.side === side) return false;          // 自己的船當然看得到
  if (!TW.isSub(f)) return false;             // 水面艦藏不住
  return !(f.exposed > 0);
};

/* 敵方看得到的編隊（給 AI 與介面用） */
TW.visibleNavy = side => TW.S.navy.filter(f => !f.dead && !TW.fleetHidden(f, side));
TW.isSea   = (c, r) => { const h = TW.hexAt(c, r); return h && h.t === '.'; };
TW.isLand  = (c, r) => { const h = TW.hexAt(c, r); return h && h.t !== '.'; };

/* --------------------------------------------------------------------------
   建立一場新戰役
   -------------------------------------------------------------------------- */
TW.newGame = function(){

  const S = {
    turn: 1, day: 0, hour: 6,
    mapVer: TW.MAP_VERSION,     // 存檔時一起存，讀檔時比對

    /* 國力 */
    ic: TW.B.START_IC,          // 每回合工業產能
    icStore: 0,                 // 累積未用完的工業點
    pp: TW.B.START_PP,          // 政治點
    will: 100,                  // 我方戰爭意志
    plaWill: 100,               // 共軍戰爭意志
    intl: TW.B.INTL_START,      // 國際支持度
    manpower: TW.B.MANPOWER,    // 可動員人力（千人）
    reserveAcc: 0,              // 後備動員累積進度

    /* 各種修正值（研發、國策、事件會改這些） */
    mod: {
      airfieldRepair:0, missileAirfield:0, missileUnit:0,
      abmIntercept:0, beachDefense:0, depthDefense:0, urbanDefense:0,
      mineDamage:0, soft:0, ashm:0, ammo:0, ew:0, c4isr:0, recon:0,
      enemyAccuracy:0, reserveRate:0, reserveOrg:0, sortieRate:0,
      supplyRange:0, supplyPenalty:0, aidChance:0, aidDelivery:0,
      intlPerTurn:0,
      /* 國策帶來的：電網韌性、民心承受力、反滲透能量 */
      powerResist:0, willGuard:0, counterInfil:0
    },

    hexes: [],
    units: [],      // 地面部隊（雙方）
    air:   [],      // 航空聯隊
    navy:  [],      // 海上編隊
    plaPool: [],    // 共軍尚未上陸的部隊（在對岸待命）
    months: TW.B.CAMPAIGN_MONTHS,
    diff: TW.B.DIFFICULTY,
    whatIf: !!TW.WHAT_IF,     // 架空模式：解鎖反攻大陸
    scenario: TW.SCENARIO || 'standard',
    fifthDone: false,         // 第五縱隊是否已經發難
    supplyCut: [],            // 被切斷補給的格子 [{c,r,left}]
    /* 戰役越長，雙方投入的後備／增援部隊越多 */
    rocReservePool: TW.OOB.roc.reservePool.slice(0, TW.B.RESERVE_SLICE),
    plaReinfPool: TW.OOB.pla.reinforcePool.slice(0, TW.B.REINF_SLICE),

    rocket: JSON.parse(JSON.stringify(TW.OOB.pla.rocketForce)),

    stock: {},      // 已抵達、待撥交的裝備 { equipId: 批數 }
    incoming: [],   // 運送中的軍援 [{eq, packs, eta, name, from}]
    aidHistory: [],
    aidCd: 0,

    research: [],   // 進行中 [{id,left}]
    doneTech: [],
    policies: [],
    dipCd: {},
    prodQueue: [],  // 自行生產 [{eq, packs, left}]
    templates: JSON.parse(JSON.stringify(TW.DEFAULT_TEMPLATES)),   // 部隊編成器的範本
    forming: [],    // 編成中的旅 [{name, tpl, left, at}]
    formedCount: 0,

    /* 戰場環境與後勤 */
    ammo: TW.B.AMMO_START,        // 全國戰備彈藥存量
    ammoMax: TW.B.AMMO_MAX,
    ammoSpent: 0,
    ammoLast: 0,
    ammoGain: 0,
    ammoWarn: 0,
    plaLiftBuilt: 0,          // 共軍累計徵用的民船數
    power: 1,                     // 全國供電率 0~1
    powerWarn: 0,
    wx: { sea:2, vis:2 },         // 海況 0–6、能見度 0–3
    wxForecast: [],

    zoneAir: {},    // 各空域制空權 -1(共軍全控) ~ +1(我方全控)
    zoneSea: {},    // 各海域制海權
    firedEvents: [],
    weather: null,
    plaAirPenalty: 0, plaNavalPenalty: 0, plaStrikePenalty: 0,
    plaSupplyHit: 0, plaRecon: 0,

    flags: {},
    log: [],
    sel: null,
    over: null,
    stats: { plaKilled:0, rocKilled:0, shipsSunk:0, planesShot:0, landings:0, missilesFired:0, missilesIntercepted:0 }
  };

  TW.ZONES.forEach(z => { S.zoneAir[z.id] = 0; S.zoneSea[z.id] = 0; });

  /* ---- 建立地圖格 ---- */
  for (let r = 0; r < TW.B.MAP_H; r++){
    for (let c = 0; c < TW.B.MAP_W; c++){
      const t = TW.MAP_ROWS[r][c];
      const T = TW.TERRAIN[t];
      S.hexes.push({
        c, r, t, T,
        owner: t === '.' ? null : (T.prc ? 'PLA' : 'ROC'),
        place: null, beach: null,
        river: false, riverName: '',
        demo: null,       // 工兵預置的爆破裝藥 {left, ready, by}
        obstacle: 0,      // 引爆後的障礙區還剩幾回合
        zone: TW.zoneOf(c, r, t),
        sup: { ROC:0, PLA:0 },
        damage: 0,        // 機場／港口損壞度 0~1
        mines: 0,         // 水雷／地雷密度
        beachhead: null,  // 共軍灘頭：{turns, cap}
        seen: !TW.B.FOG_OF_WAR
      });
    }
  }

  TW.S = S;   // 之後的 TW.hexAt() 才查得到地圖

  TW.PLACES.forEach(p => {
    const h = TW.hexAt(p.c, p.r);
    if (h){ h.place = p; h.owner = p.side; }
  });
  TW.BEACHES.forEach(b => {
    const h = TW.hexAt(b.c, b.r);
    if (h) h.beach = b;
  });
  TW.RIVERS.forEach(rv => rv.hex.forEach(([c, r]) => {
    const h = TW.hexAt(c, r);
    if (h) { h.river = true; h.riverName = rv.name; }
  }));

  /* ---- 戰備布雷：預警期先在最可能的灘頭外海布雷 ---- */
  const sc = TW.SCENARIOS && TW.SCENARIOS[S.scenario];
  if (!(sc && sc.fifthColumn)){
    const stages = TW.PLACES.filter(p => p.staging);
    const ranked = TW.BEACHES.map(b => {
      const d = Math.min(...stages.map(p => TW.Hex.distance(p.c, p.r, b.c, b.r)));
      return { b, d: d + b.diff * 2 };            // 近而好登的灘頭最危險
    }).filter(x => x.b.c < 20)                     // 東部岩岸不用
      .sort((x, y) => x.d - y.d)
      .slice(0, TW.B.PREWAR_MINE_BEACHES);
    ranked.forEach(({ b }) => {
      TW.Hex.neighbors(b.c, b.r).forEach(([c, r]) => {
        const x = TW.hexAt(c, r);
        if (!x || x.t !== '.') return;
        x.mines = Math.max(x.mines, TW.B.PREWAR_MINE_DENSITY);
        /* 難度越高，共軍情報越可能已經摸清這片雷區 */
        x.plaKnows = Math.random() < (TW.B.DIFF_MINE_INTEL || 0);
      });
    });
    S.prewarMined = ranked.map(x => x.b.name);
  }

  /* ---- 國軍地面部隊 ---- */
  TW.OOB.roc.ground.forEach(o => S.units.push(mkGround('ROC', o)));

  /* ---- 共軍：靜態部隊上場，登陸梯隊放進待命池 ---- */
  TW.OOB.pla.ground.forEach(o => {
    const u = mkGround('PLA', o);
    if (o.static) S.units.push(u);
    else { u.wave = o.wave || 1; u.airborne = !!o.airborne; S.plaPool.push(u); }
  });

  /* ---- 航空聯隊 ---- */
  TW.OOB.roc.air.forEach(o => S.air.push(mkAir('ROC', o)));
  TW.OOB.pla.air.forEach(o => S.air.push(mkAir('PLA', o)));

  /* ---- 海上編隊 ---- */
  TW.OOB.roc.navy.forEach(o => S.navy.push(mkNavy('ROC', o)));
  TW.OOB.pla.navy.forEach(o => S.navy.push(mkNavy('PLA', o)));

  TW.AI.assignAir();          // 讓共軍一開局就把機隊擺到該去的空域
  TW.Rules.recalcSupply();
  TW.Rules.recalcAirSea();
  TW.Rules.recalcVision();

  TW.log('c-big', '【戰役開始】共軍東部戰區發起「聯合火力打擊」，全島進入緊急狀態。');
  if (S.prewarMined && S.prewarMined.length)
    TW.log('c-ok', '【戰備布雷】預警期間已於 ' + S.prewarMined.join('、') +
      ' 外海完成布雷，共軍尚未察覺雷區位置。');
  TW.log('', '國軍各作戰區進入戰備位置。撐過 ' + TW.B.MAX_TURNS + ' 個回合（' +
             (TW.B.MAX_TURNS * TW.B.HOURS_PER_TURN / 24) + ' 天）即達成戰略目標。');
  return S;
};

/* --------------------------------------------------------------------------
   建構各類單位
   -------------------------------------------------------------------------- */
function mkGround(side, o){
  const T = TW.GROUND_TYPES[o.type];
  const u = {
    id: nid(), kind:'ground', side,
    name: o.name, corps: o.corps || '', type: o.type, T,
    cls: T.cls, icon: T.icon,
    c: o.c, r: o.r,
    hp: T.hp, maxHp: T.hp,
    org: T.org, maxOrg: T.org,
    xp: o.xp || 0,
    entrench: side === 'ROC' ? 0.25 : 0,
    supply: 1,
    equip: (o.equip || []).slice(),
    rangeOverride: o.range,   // OOB 可以指定特殊射程（例如共軍 PHL-16 遠火旅）
    order: null,          // { type:'move' } / { type:'attack' } / { type:'bomb' } / { type:'refit' }
    moved: 0,
    landedTurn: 0,
    dead: false
  };
  return u;
}

function mkAir(side, o){
  const A = TW.AIR_TYPES[o.ac];
  return {
    id: nid(), kind:'air', side,
    name: o.name, ac: o.ac, A,
    n: o.n, maxN: o.n,
    equip: [],
    base: o.base,
    mission: o.mission || 'cap',
    zone: defaultZoneForBase(side, o.base, o.ac),
    dead: false
  };
}

function mkNavy(side, o){
  const ships = o.ships.map(([t, n]) => ({
    t, n, maxN: n, N: TW.NAVY_TYPES[t], hp: TW.NAVY_TYPES[t].hp * n
  }));
  const f = {
    id: nid(), kind:'navy', side,
    name: o.name, ships,
    c: o.c, r: o.r,
    mission: o.mission || 'patrol',
    order: null,
    exposed: 0,        // 潛艦被標定的剩餘回合數；水面艦用不到
    cargo: [],         // 艙裡裝著的地面部隊 id
    loading: 0,        // 還要幾個回合才裝載完成
    dead: false
  };
  f.maxHp = ships.reduce((s, x) => s + x.N.hp * x.maxN, 0);
  f.hp = f.maxHp;
  if (o.feint){ f.feint = true; f.load = 0; }   // 佯動船團：空船，但雷達上看起來跟真的一樣
  return f;
}

/* 部隊編成器編出來的旅。tpl 會一起存進存檔，讀檔時拿來重算數值。 */
TW.mkCustomBrigade = function(tpl, name, c, r){
  const T = TW.buildBrigadeType(tpl);
  return {
    id: nid(), kind:'ground', side:'ROC',
    name, corps:'自編部隊', type:'custom', T,
    tpl: JSON.parse(JSON.stringify(tpl)),
    cls: T.cls, icon: T.icon,
    c, r,
    hp: T.hp, maxHp: T.hp,
    org: T.org * 0.75, maxOrg: T.org,      // 剛編成，還在磨合
    xp: 0.08,
    entrench: 0.1, supply: 1,
    equip: [], order: null, moved: 0, landedTurn: 0, dead: false
  };
};

/* 這三個建構函式在遊戲中途也要用得到（美軍介入時要憑空生出艦隊與聯隊） */
TW.mkGround = mkGround;
TW.mkAir    = mkAir;
TW.mkNavy   = mkNavy;

function defaultZoneForBase(side, base, ac){
  if (side === 'PLA') return 'ZSN';
  /* 反潛機、反艦機這種海上巡邏兵力要擺在海域，擺在本島上空是沒有意義的 */
  const A = ac && TW.AIR_TYPES[ac];
  const p = TW.PLACES.find(x => x.name === base);
  if (A && (A.asw || 0) > 0) return p && p.r >= 13 ? 'ZSS' : 'ZSN';
  return p ? TW.zoneOf(p.c, p.r) : 'ZC';
}

/* --------------------------------------------------------------------------
   常用查詢
   -------------------------------------------------------------------------- */
/* 節 → 每回合幾格（編隊由最慢的那艘決定，所以 fleetStats 取最小值） */
/* 兩棲船團艙裡還有幾個旅。
   以前只要搶灘一次，整支船團就被當成空船開回福建——
   實測 3 場共上岸 18 個旅，卻有 335 個旅的運量被送回港重新裝載。
   現在照實際載貨算：卸多少扣多少，卸完才回港。
   被打沉的船會讓容量變小，所以取「剩餘載貨」與「目前容量」較小的那個。 */
TW.fleetLoad = function(f){
  if (!f || f.dead || f.empty) return 0;
  const cap = Math.floor(TW.fleetStats(f).lift * (f.hp / f.maxHp));
  return (typeof f.load === 'number') ? Math.min(f.load, cap) : cap;
};

TW.ktToHex = function(kt){
  return (kt || 0) * TW.B.KNOT_KM * TW.B.HOURS_PER_TURN / TW.B.HEX_KM;
};

/* 這支艦隊這一回合實際走得了幾格：基本航速 × 海況。
   小艇在大浪裡只能減速，潛艦在水下不受影響。 */
TW.fleetSpeed = function(f){
  const st = TW.fleetStats(f);
  if (!st.count) return 0;
  const sea = (TW.S && TW.S.wx) ? TW.S.wx.sea : 2;
  const live = f.ships.filter(x => x.n > 0);
  const allSub = live.length && live.every(x => x.N.sub);
  const small = live.some(x => x.N.small);
  let mult = 1;
  if (!allSub){
    const tbl = small ? TW.B.SEA_SPEED_SMALL : TW.B.SEA_SPEED_LARGE;
    mult = tbl[Math.max(0, Math.min(6, sea))];
  }
  return Math.max(1, Math.round(st.spd * mult));
};

TW.fleetStats = function(f){
  let aa = 0, asuw = 0, asw = 0, lift = 0, spd = Infinity, carrier = 0, n = 0, mine = 0, kt = Infinity;
  f.ships.forEach(s => {
    aa += s.N.aa * s.n; asuw += s.N.asuw * s.n; asw += (s.N.asw || 0) * s.n;
    lift += (s.N.lift || 0) * s.n; carrier += (s.N.carrier || 0) * s.n;
    mine += (s.N.mine || 0) * s.n;
    if (s.n > 0){ kt = Math.min(kt, s.N.kt || 12); spd = Math.min(spd, TW.ktToHex(s.N.kt || 12)); }
    n += s.n;
  });
  return { aa, asuw, asw, lift, spd: n ? spd : 0, kt: n ? kt : 0, carrier, mine, count: n };
};

/* 機隊的實際妥善出動係數：跑道被炸壞、基地失守，架次就上不去。
   這是「飛彈打機場」之所以致命的地方——飛機還在，但飛不出去。 */
TW.wingReady = function(w){
  const p = TW.PLACES.find(x => x.name === w.base);
  if (!p) return 1;
  const h = TW.hexAt(p.c, p.r);
  if (!h) return 1;
  if (h.owner !== w.side) return 0.12;              // 基地已失守，只能靠疏散場站
  let v = TW.clamp(1 - h.damage * 0.75, 0.15, 1);
  /* 國軍自己的機隊才算這兩項——共軍的「駐地」代表的是整個福建的機場群，
     美軍的艦載機與嘉手納機隊也不靠我們的跑道。 */
  if (w.side === 'ROC' && !w.us){
    v *= TW.baseCrowd(p);        // 擠太多飛機在同一座基地，地勤、油彈、跑道都排不過來
    v *= TW.wingRange(w);        // 作戰空域離駐地太遠，滯空時間變短、架次變少
  }
  return v;
};

/* --------------------------------------------------------------------------
   航空基地的容量與作戰半徑（空軍轉場用）
   -------------------------------------------------------------------------- */

/* 一座基地能正常撐多少架飛機的出勤。
   佳山、志航有山洞機庫，容量大；民航機場沒有機堡、彈藥庫，容量小。 */
TW.baseCap = function(p){
  if (!p) return 0;
  let cap = p.type.includes('airbase') ? TW.B.BASE_CAP_AIRBASE
          : (p.type.includes('airport') ? TW.B.BASE_CAP_AIRPORT : 0);
  if (p.hardened) cap += TW.B.BASE_CAP_HARDENED;
  return cap;
};

/* 這座基地現在停了（或正在轉場過來）多少架國軍飛機 */
TW.baseLoad = function(name){
  let n = 0;
  TW.S.air.forEach(w => {
    if (w.dead || w.side !== 'ROC' || w.us || w.n <= 0) return;
    const at = w.transit ? w.transit.to : w.base;
    if (at === name) n += w.n;
  });
  return n;
};

/* 超過容量的部分出勤率打折，最低剩五成 */
TW.baseCrowd = function(p){
  const cap = TW.baseCap(p), load = TW.baseLoad(p.name);
  if (!cap || load <= cap) return 1;
  return Math.max(0.5, cap / load);
};

/* 各空域／海域的「中心」：拿來量駐地離戰場有多遠 */
TW.ZONE_REF = { ZN:[15,5], ZC:[15,11], ZS:[16,17], ZSN:[8,7], ZSS:[8,17], ZE:[23,12] };

/* 作戰半徑係數：駐地到作戰空域超過 7 格（約 100 公里）開始打折，
   每多一格少 3%，最低七成。從台東飛去打北部海峽，油都燒在路上了。 */
TW.wingRange = function(w){
  const p = TW.PLACES.find(x => x.name === w.base);
  const z = TW.ZONE_REF[w.zone];
  if (!p || !z) return 1;
  const d = TW.Hex.distance(p.c, p.r, z[0], z[1]);
  return TW.clamp(1 - Math.max(0, d - TW.B.WING_RANGE_FREE) * TW.B.WING_RANGE_STEP, TW.B.WING_RANGE_MIN, 1);
};

/* 可以轉場過去的基地：還在我方手上、跑道沒被炸爛、不是現在這一座 */
TW.rebaseTargets = function(w){
  if (!w || w.dead || w.side !== 'ROC' || w.us) return [];
  return TW.PLACES.filter(p => {
    if (p.side !== 'ROC' || p.name === w.base) return false;
    if (!p.type.includes('airbase') && !p.type.includes('airport')) return false;
    const h = TW.hexAt(p.c, p.r);
    return h && h.owner === 'ROC' && h.damage < 0.85;
  });
};

/* 下達轉場命令。轉場要一個回合：飛機飛過去、地勤與油彈跟著車隊過去，
   這段期間聯隊不出勤（等於疏散保存），到了之後恢復原本的任務。 */
TW.rebaseWing = function(w, to){
  if (!TW.rebaseTargets(w).some(p => p.name === to)) return false;
  if (w.transit){ w.transit.to = to; return true; }        // 半路改目的地
  w.transit = { from:w.base, to, left:TW.B.REBASE_TURNS, mission:w.mission };
  w.mission = 'rest';
  return true;
};

/* 取消轉場（還沒飛出去之前） */
TW.cancelRebase = function(w){
  if (!w || !w.transit) return;
  w.mission = w.transit.mission || 'cap';
  w.transit = null;
};

/* 同一種裝備可以撥交好幾批（例如陸續到貨的 M1A2T），
   但第二批之後效益遞減——一個旅能吸收的新裝備有上限。 */
TW.equipMod = function(u, key){
  let v = 0;
  const seen = {};
  u.equip.forEach(id => {
    const e = TW.EQUIP[id];
    if (!e || !e.mod || !e.mod[key]) return;
    const n = (seen[id] = (seen[id] || 0) + 1);
    v += e.mod[key] * Math.pow(0.55, n - 1);
  });
  return v;
};

/* 航空聯隊在計入掛載裝備之後的實際數值。
   和地面部隊一樣，同型裝備再撥一批的效益遞減。 */
TW.airStat = function(w, key){
  let v = w.A[key] || 0;
  const dm = (w.side === 'ROC' ? (TW.B.DIFF_ROC_FIRE || 1) : (TW.B.DIFF_PLA_FIRE || 1));
  const seen = {};
  (w.equip || []).forEach(id => {
    const e = TW.EQUIP[id];
    if (!e || !e.mod || !e.mod[key]) return;
    const n = (seen[id] = (seen[id] || 0) + 1);
    v += e.mod[key] * Math.pow(0.55, n - 1);
  });
  /* 難度只調打擊力，不調防護與指管——不然預警機會莫名其妙變瞎 */
  if (key === 'air' || key === 'cas' || key === 'ashm' || key === 'strike' || key === 'asw') v *= dm;
  return v;
};

/* 部隊的射程（格，1 格 = 15 公里）。
   射程由「射得最遠的那套武器」決定，不是把所有武器的射程加起來。 */
TW.unitRange = function(u){
  const base = (u.rangeOverride !== undefined) ? u.rangeOverride : (u.T.range || 0);
  let best = 0;
  u.equip.forEach(id => {
    const e = TW.EQUIP[id];
    if (e && e.mod && e.mod.range) best = Math.max(best, e.mod.range);
  });
  return Math.max(0, Math.round(base + best));
};

/* 這支部隊有沒有遠程轟擊能力 */
TW.canBombard = u => !u.dead && TW.unitRange(u) >= 1 &&
  (u.T.cls === 'arty' || u.cls === 'arty' || u.T.bombard || TW.equipMod(u, 'range') > 0);

/* 單位在計入經驗、裝備、補給、彈藥後的實際數值 */
TW.stat = function(u, key){
  const base = (u.T[key] || 0) + TW.equipMod(u, key);
  const xp = 1 + u.xp * 0.5;
  const sup = 0.45 + 0.55 * Math.min(1, u.supply / Math.max(0.01, TW.B.SUPPLY_MIN_COMBAT + 0.35));
  let v = base * xp * Math.min(1, sup);

  /* 全國彈藥見底時，我方所有的火力會一起下降。
     這是「打得兇」與「撐得久」之間真正的取捨。 */
  if (u.side === 'ROC' && (key === 'soft' || key === 'hard' || key === 'ashm'))
    v *= TW.Env.ammoFactor();

  /* 難度：直接調雙方的火力，地面戰、砲兵火力任務、岸置反艦一次涵蓋 */
  if (key === 'soft' || key === 'hard' || key === 'ashm' || key === 'pierce')
    v *= (u.side === 'ROC' ? (TW.B.DIFF_ROC_FIRE || 1) : (TW.B.DIFF_PLA_FIRE || 1));

  return v;
};

/* ==========================================================================
   存檔／讀檔
   --------------------------------------------------------------------------
   狀態裡有很多指向靜態資料表的參照（u.T、w.A、ship.N、hex.T/place/beach），
   直接 JSON 化會爆掉也會很肥。存檔時把它們拆掉，讀檔時再接回來。
   ========================================================================== */

TW.SAVE_PREFIX = 'twdef_save_';
TW.SAVE_SLOTS  = ['auto', '1', '2', '3'];

function packUnit(u){
  const o = {};
  for (const k in u) if (k !== 'T') o[k] = u[k];
  return o;
}
function unpackUnit(o){
  const u = Object.assign({}, o);
  /* 自己編成的旅沒有固定的類型表，要照存下來的編制重新算一次 */
  u.T = u.tpl ? TW.buildBrigadeType(u.tpl) : TW.GROUND_TYPES[u.type];
  u.cls = u.T.cls; u.icon = u.T.icon;
  return u;
}

/* --------------------------------------------------------------------------
   軍售交付量
   --------------------------------------------------------------------------
   同一個軍售案，國際支持度越高，對方一次願意給的批數就越多。
   支持度低的時候只談得到「象徵性的一批」；撐到七、八十分，
   同一份清單會變成兩三倍——而且加碼的部分多半由盟國吸收，
   我方只需要補一部分經費。
   -------------------------------------------------------------------------- */
TW.aidMult = function(intl){
  const B = TW.B;
  const i = (intl === undefined ? TW.S.intl : intl);
  return TW.clamp(1 + Math.max(0, i - B.AID_QTY_INTL0) * B.AID_QTY_PER_INTL,
                  1, B.AID_QTY_MAX);
};

TW.aidItems = function(items, mult){
  const m = (mult === undefined) ? TW.aidMult() : mult;
  return (items || []).map(x => [x[0], Math.max(1, Math.round(x[1] * m))]);
};

/* 實際拿到的批數比基本量多幾成（四捨五入之後的真實值），
   用來算要自付多少經費——多拿的東西不是全部免費。 */
TW.aidCost = function(pick, items){
  const base = pick.items.reduce((s, x) => s + x[1], 0);
  const got  = items.reduce((s, x) => s + x[1], 0);
  const grow = base > 0 ? got / base : 1;
  return Math.max(1, Math.round(pick.ic * (1 + (grow - 1) * TW.B.AID_QTY_COST)));
};

TW.serialize = function(){
  const S = TW.S;
  const skip = { hexes:1, units:1, air:1, navy:1, plaPool:1 };
  const out = {};
  for (const k in S) if (!skip[k]) out[k] = S[k];

  out.hexes = S.hexes.map(h => [
    h.owner, +h.damage.toFixed(3), +h.mines.toFixed(3),
    h.beachhead ? h.beachhead.turns : -1,
    +h.sup.ROC.toFixed(3), +h.sup.PLA.toFixed(3), h.seen ? 1 : 0,
    /* 工兵埋的爆破裝藥與炸出來的障礙區也要存，不然讀檔就白埋了 */
    h.demo ? (h.demo.ready ? 1 : 0) : -1,
    h.demo ? h.demo.left : 0,
    h.demo ? h.demo.by : '',
    h.obstacle || 0,
    /* 第五縱隊奪下的設施：旗標與奪取回合都要存，
       否則讀檔之後那座港口會立刻變成可用的（卸載延遲判定會失效）。 */
    h.fifthColumn ? 1 : 0,
    h.seizedTurn || 0,
    h.plaKnows ? 1 : 0           // 共軍是否已經知道這片雷區
  ]);
  out.units   = S.units.map(packUnit);
  out.plaPool = S.plaPool.map(packUnit);
  out.air     = S.air.map(w => { const o = {}; for (const k in w) if (k !== 'A') o[k] = w[k]; return o; });
  out.navy    = S.navy.map(f => {
    const o = {}; for (const k in f) if (k !== 'ships') o[k] = f[k];
    o.ships = f.ships.map(s => ({ t:s.t, n:s.n, maxN:s.maxN, hp:s.hp }));
    return o;
  });
  return out;
};

TW.deserialize = function(d){
  /* 地圖改過之後，舊存檔的格子編號對不上新地圖，部隊會被讀到海裡。
     與其讀出一個壞掉的戰局，不如直接說清楚。 */
  if ((d.mapVer || 1) !== TW.MAP_VERSION)
    throw new Error('這是舊版地圖的存檔（地圖已經改過形狀、加了高速公路），沒辦法接著玩，請開新戰役');
  TW.setCampaign(d.months || 1);   // 先把戰役長度換算回來，再重建地圖
  TW.setDifficulty(d.diff || 2);   // 難度疊在長度之上，順序不能顛倒
  TW.quiet = true;
  TW.newGame();                 // 先造一份乾淨的地圖與靜態參照
  TW.quiet = false;

  const S = TW.S;
  const skip = { hexes:1, units:1, air:1, navy:1, plaPool:1 };
  for (const k in d) if (!skip[k]) S[k] = d[k];

  d.hexes.forEach((a, i) => {
    const h = S.hexes[i];
    if (!h) return;
    h.owner = a[0]; h.damage = a[1]; h.mines = a[2];
    h.beachhead = (a[3] >= 0) ? { turns:a[3] } : null;
    h.sup.ROC = a[4]; h.sup.PLA = a[5]; h.seen = !!a[6];
    h.demo = (a[7] >= 0) ? { ready:!!a[7], left:a[8], by:a[9] } : null;
    h.obstacle = a[10] || 0;
    h.fifthColumn = !!a[11];
    h.seizedTurn = a[12] || 0;
    h.plaKnows = !!a[13];
  });

  S.units   = d.units.map(unpackUnit);
  S.plaPool = d.plaPool.map(unpackUnit);
  S.air     = d.air.map(o => { const w = Object.assign({}, o); w.A = TW.AIR_TYPES[w.ac]; return w; });
  S.navy    = d.navy.map(o => {
    const f = Object.assign({}, o);
    f.ships = o.ships.map(s => ({ t:s.t, n:s.n, maxN:s.maxN, hp:s.hp, N:TW.NAVY_TYPES[s.t] }));
    return f;
  });

  /* 讓新單位的編號不會跟讀進來的撞號 */
  let mx = 0;
  S.units.concat(S.plaPool).forEach(u => {
    const m = /^u(\d+)$/.exec(u.id); if (m) mx = Math.max(mx, +m[1]);
  });
  _uid = mx + 1;

  TW.Rules.recalcSupply();
  TW.Rules.recalcAirSea();
  TW.Rules.recalcVision();
};

TW.saveGame = function(slot){
  try {
    const d = TW.serialize();
    d._meta = { studio:'麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory',
      ts: Date.now(), turn: TW.S.turn, day: TW.S.day,
      months: TW.S.months, maxTurns: TW.B.MAX_TURNS,
      will: Math.round(TW.S.will), intl: Math.round(TW.S.intl),
      landed: TW.S.units.filter(u => !u.dead && u.side === 'PLA' && !TW.hexAt(u.c, u.r).T.prc).length
    };
    localStorage.setItem(TW.SAVE_PREFIX + slot, JSON.stringify(d));
    return { ok:true };
  } catch (e){
    return { ok:false, msg: (e && e.name === 'QuotaExceededError')
      ? '瀏覽器儲存空間不足，請先刪掉一個舊存檔。' : ('存檔失敗：' + e.message) };
  }
};

TW.loadGame = function(slot){
  try {
    const raw = localStorage.getItem(TW.SAVE_PREFIX + slot);
    if (!raw) return { ok:false, msg:'這個欄位沒有存檔。' };
    TW.deserialize(JSON.parse(raw));
    return { ok:true };
  } catch (e){
    console.error(e);
    return { ok:false, msg:'讀檔失敗：' + e.message };
  }
};

TW.saveInfo = function(slot){
  try {
    const raw = localStorage.getItem(TW.SAVE_PREFIX + slot);
    if (!raw) return null;
    return JSON.parse(raw)._meta || {};
  } catch (e){ return null; }
};

TW.deleteSave = function(slot){ localStorage.removeItem(TW.SAVE_PREFIX + slot); };

TW.log = function(cls, text){
  const S = TW.S;
  const stamp = 'D+' + S.day + ' ' + String(S.hour).padStart(2, '0') + '00';
  S.log.push({ cls, text, stamp });
  if (S.log.length > 400) S.log.shift();
  if (!TW.quiet && TW.UI && TW.UI.appendLog) TW.UI.appendLog(cls, text, stamp);
};
