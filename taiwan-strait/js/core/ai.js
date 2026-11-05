/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   共軍 AI
   --------------------------------------------------------------------------
   作戰構想（依現實推演的一般順序）：
     1. 火力癱瘓：飛彈打機場、港口、防空與指管
     2. 奪取制空與制海
     3. 選擇灘頭搶灘、同時空降奪取機場
     4. 擴大灘頭 → 奪取港口（讓重裝備能上岸）
     5. 沿西部走廊向台北或高雄推進
   ========================================================================== */

TW.AI = {

/* 每回合開頭：決定任務分派與海上運動 */
plan(ev){
  const S = TW.S;
  this.opsPlan(ev);          // 先決定這幾天的主攻、助攻、佯動方向
  this.rebuildFeint(ev);
  this.assignAir();
  this.moveFleets(ev);
  this.groundOrders();
  this.artilleryOrders();
  this.reinforce(ev);
},

/* ==========================================================================
   多方向作戰構想：主攻、助攻、佯動
   --------------------------------------------------------------------------
   真實的兩棲作戰不會把所有船擠在同一片海灘外面。共軍的準則是：
     · 主攻：兵力最多、最有把握的灘頭
     · 助攻：離主攻夠遠的第二個登陸場，逼守軍把預備隊分成兩半
     · 佯動：一支「看起來像登陸船團」的空船團開向第三個方向，
             讓雷達預警、讓守軍調兵、讓岸置飛彈打錯目標
   玩家在雷達上看到的三支船團長得一模一樣——哪一支是真的，要自己判斷。
   ========================================================================== */
opsPlan(ev){
  const S = TW.S;
  if (S.turn < TW.B.AI_LANDING_TURN - 2) return;         // 開戰頭一兩天還在打火力準備
  const P = S.plaOps;
  const B = TW.B;

  /* 主攻灘頭如果被我方收復、或已經整片拿下（不再是 ROC 也不是灘頭），就要重新規劃 */
  const stillOk = P && P.main && (() => {
    const h = TW.hexAt(P.main[0], P.main[1]);
    return h && (h.owner === 'ROC' || (h.beachhead && h.owner === 'PLA'));
  })();
  if (P && stillOk && S.turn < P.until) return;

  const ranked = this.rankBeaches();
  if (!ranked.length){ S.plaOps = null; return; }

  /* 主攻：已經站住、還塞得下人的灘頭優先；否則挑分數最高的 */
  const bh = S.hexes.find(h => h.beachhead && h.owner === 'PLA' &&
    TW.unitsAt(h.c, h.r).filter(u => u.side === 'PLA').length < B.BEACHHEAD_SUPPLY_CAP);
  const main = bh ? { h:bh } : ranked[0];

  /* 助攻：要離主攻夠遠，守軍的同一批預備隊才顧不到兩邊；
     船不夠多就不開第二個口，免得兩邊都打不贏 */
  const D = (a, b) => TW.Hex.distance(a.c, a.r, b.c, b.r);
  const lift = this.loadedLift();
  const second = (lift >= B.AI_SECOND_FRONT_LIFT)
    ? ranked.find(x => x.h !== main.h && D(x.h, main.h) >= B.AI_SECOND_FRONT_DIST && x.score > -30)
    : null;

  /* 佯動：挑一個離真正登陸點都很遠、灘後又有值錢東西的地方——
     要讓守軍相信那裡是真的，就得挑一個「他們不敢不守」的方向 */
  const feintCands = ranked.filter(x => x.h !== main.h && (!second || x.h !== second.h) &&
    D(x.h, main.h) >= B.AI_FEINT_DIST && (!second || D(x.h, second.h) >= B.AI_FEINT_DIST - 1))
    .sort((a, b) => b.value - a.value).slice(0, 3);
  const feint = feintCands.length ? feintCands[Math.floor(Math.random() * feintCands.length)] : null;

  S.plaOps = {
    main:[main.h.c, main.h.r],
    second: second ? [second.h.c, second.h.r] : null,
    feint: feint ? [feint.h.c, feint.h.r] : null,
    until: S.turn + B.AI_OPS_REPLAN,
    since: S.turn
  };
},

/* 把每一個還在我方手上的灘頭打分數（分數越高越適合登陸） */
rankBeaches(){
  const S = TW.S;
  const out = [];
  TW.BEACHES.forEach(b => {
    const h = TW.hexAt(b.c, b.r);
    if (!h || h.owner !== 'ROC') return;
    const s = this.scoreBeach(b, h);
    out.push({ h, b, score:s.score, value:s.value });
  });
  return out.sort((a, b) => b.score - a.score);
},

scoreBeach(b, h){
  const S = TW.S;
  /* 守軍強度 */
  let def = 0;
  TW.unitsAt(h.c, h.r).forEach(u => { if (u.side === 'ROC') def += u.hp * (1 + u.entrench); });
  TW.Hex.neighbors(h.c, h.r).forEach(([c, r]) => {
    TW.unitsAt(c, r).forEach(u => { if (u.side === 'ROC') def += u.hp * 0.35; });
  });

  /* 離對岸出發港的距離（越近越好） */
  let dPort = 99;
  TW.PLACES.filter(p => p.staging).forEach(p => {
    dPort = Math.min(dPort, TW.Hex.distance(p.c, p.r, h.c, h.r));
  });

  /* 灘後有沒有值錢的東西 */
  let value = 0;
  TW.PLACES.forEach(p => {
    const d = TW.Hex.distance(p.c, p.r, h.c, h.r);
    if (p.side === 'ROC' && d <= 4) value += p.vp / (d + 1);
  });

  const sea = S.zoneSea[TW.seaZoneAt(h.c, h.r)] || 0;   // 正 = 我方制海，對共軍不利
  const air = S.zoneAir[h.zone] || 0;

  let score = value * 2.2
            - def * 0.30
            - dPort * 2.0
            - b.diff * 14
            - TW.seaMinesNear(h, true) * 22
            - sea * 40
            - air * 22;

  score *= (0.85 + Math.random() * 0.3);   // 一點不可預測性
  score *= TW.B.AI_AGGRESSION;
  return { score, value };
},

/* 目前艙裡裝著兵、隨時可以出航的船團，一共載了幾個旅 */
loadedLift(){
  return TW.S.navy.filter(f => !f.dead && f.side === 'PLA' && !f.feint &&
    TW.fleetStats(f).lift > 0 && !f.empty && !(f.reload > 0))
    .reduce((s, f) => s + TW.fleetLoad(f), 0);
},

/* --------------------------------------------------------------------------
   共軍砲兵與遠火：優先軟化「接下來要打的那一格」
   -------------------------------------------------------------------------- */
artilleryOrders(){
  const S = TW.S;
  const feintHex = this.activeFeint();
  S.units.forEach(u => {
    if (u.dead || u.side !== 'PLA' || !TW.canBombard(u)) return;
    if (u.org < u.maxOrg * 0.25 || u.supply < 0.15){ u.order = { type:'hold' }; return; }

    const rng = TW.unitRange(u);
    let best = null, bestScore = -1e9;

    S.units.forEach(t => {
      if (t.dead || t.side !== 'ROC') return;
      const d = TW.Hex.distance(u.c, u.r, t.c, t.r);
      if (d < 1 || d > rng) return;

      /* 「準備突擊的部隊」＝已經上陸的機動部隊，不含砲兵、防空與還在對岸的單位。
         沒有這個限制的話，遠火旅會因為自己就站在外島隔壁而一直砲擊外島。 */
      const assaulter = (x) => x.side === 'PLA' && !x.dead &&
        x.cls !== 'arty' && x.cls !== 'aa' && !TW.hexAt(x.c, x.r).T.prc;

      let s = t.hp * 0.5;
      /* 旁邊有我軍準備突擊 → 這格最值得砲擊 */
      if (TW.Hex.neighbors(t.c, t.r).some(([c, r]) =>
            TW.unitsAt(c, r).some(assaulter))) s += 120;
      if (t.cls === 'arty' || t.cls === 'aa' || t.cls === 'ssm') s += 60;
      const hh = TW.hexAt(t.c, t.r);
      if (hh.beach) s += 50;
      /* 佯動要演得像：佯動方向的灘頭也要挨一輪「登陸前火力準備」 */
      if (feintHex && TW.Hex.distance(t.c, t.r, feintHex.c, feintHex.r) <= 2) s += 55;
      /* 距離懲罰要看「佔自己射程多少比例」，否則遠火旅永遠只會打最近的外島 */
      s -= (d / Math.max(1, rng)) * 45;

      /* 外島（金門、馬祖、澎湖，都在第 12 欄以西）除非真的要打，
         否則不值得把遠程火力全砸下去——本島才是決勝點 */
      if (t.c < 12){
        const assault = S.units.some(x => assaulter(x) &&
                                          TW.Hex.distance(x.c, x.r, t.c, t.r) <= 3);
        if (!assault) s -= 90;
      }
      if (s > bestScore){ bestScore = s; best = { c:t.c, r:t.r }; }
    });

    /* 沒有值得打的目標就停火——彈藥留給真正的決戰，
       也避免對岸的遠火旅整場戰爭都在砲擊一座外島 */
    if (best && bestScore > 0) u.order = { type:'bomb', tc:best.c, tr:best.r };
    else u.order = { type:'hold' };
  });
},

/* --------------------------------------------------------------------------
   選擇登陸灘頭
   -------------------------------------------------------------------------- */
chooseBeach(){
  const S = TW.S;

  /* 已有灘頭且還沒飽和 → 優先擴大既有登陸場 */
  const existing = S.hexes.filter(h => h.beachhead && h.owner === 'PLA');
  for (const h of existing){
    const n = TW.unitsAt(h.c, h.r).filter(u => u.side === 'PLA').length;
    if (n < 2) return h;
  }

  let best = null, bestScore = -1e9;
  TW.BEACHES.forEach(b => {
    const h = TW.hexAt(b.c, b.r);
    if (!h || h.owner !== 'ROC') return;

    /* 守軍強度 */
    let def = 0;
    TW.unitsAt(h.c, h.r).forEach(u => { if (u.side === 'ROC') def += u.hp * (1 + u.entrench); });
    TW.Hex.neighbors(h.c, h.r).forEach(([c, r]) => {
      TW.unitsAt(c, r).forEach(u => { if (u.side === 'ROC') def += u.hp * 0.35; });
    });

    /* 離對岸出發港的距離（越近越好） */
    let dPort = 99;
    TW.PLACES.filter(p => p.staging).forEach(p => {
      dPort = Math.min(dPort, TW.Hex.distance(p.c, p.r, h.c, h.r));
    });

    /* 灘後有沒有值錢的東西 */
    let value = 0;
    TW.PLACES.forEach(p => {
      const d = TW.Hex.distance(p.c, p.r, h.c, h.r);
      if (p.side === 'ROC' && d <= 4) value += p.vp / (d + 1);
    });

    const sea = S.zoneSea[TW.seaZoneAt(h.c, h.r)] || 0;   // 正 = 我方制海，對共軍不利
    const air = S.zoneAir[h.zone] || 0;

    let score = value * 2.2
              - def * 0.30
              - dPort * 2.0
              - b.diff * 14
              - TW.seaMinesNear(h, true) * 22
              - sea * 40
              - air * 22;

    score *= (0.85 + Math.random() * 0.3);   // 一點不可預測性
    score *= TW.B.AI_AGGRESSION;

    if (score > bestScore){ bestScore = score; best = h; }
  });

  return bestScore > -30 ? best : null;
},

/* 一個回合可以同時在幾處上陸。真實的兩棲作戰不會只挑一個點——
   多點同時上陸是為了分散守軍、也是為了萬一某一處被打回去還有備案。
   船夠多才做得到，所以由載運量決定要開幾個口。 */
chooseBeaches(maxN){
  const S = TW.S, out = [];

  /* 先擴大已經站住的灘頭，那比另開一個新的划算太多 */
  S.hexes.forEach(h => {
    if (out.length >= maxN) return;
    if (!h.beachhead || h.owner !== 'PLA') return;
    const n = TW.unitsAt(h.c, h.r).filter(u => u.side === 'PLA').length;
    if (n < TW.B.BEACHHEAD_SUPPLY_CAP) out.push(h);
  });

  /* 還有餘力就另闢新的登陸場 */
  let guard = 0;
  while (out.length < maxN && guard++ < 6){
    const b = this.chooseBeach();
    if (!b || out.includes(b)) break;
    out.push(b);
  }
  return out;
},

/* --------------------------------------------------------------------------
   空軍任務分派
   -------------------------------------------------------------------------- */
assignAir(){
  const S = TW.S;
  const wings = S.air.filter(w => !w.dead && w.side === 'PLA' && w.n > 0);

  /* 主戰空域：有灘頭就往灘頭集中，否則打海峽 */
  const bh = S.hexes.find(h => h.beachhead && h.owner === 'PLA');
  const mainZone = bh ? bh.zone : 'ZSN';

  wings.forEach(w => {
    const A = w.A;
    if (A.lift){ w.mission = 'rest'; return; }
    if (A.c4isr){ w.mission = 'cap'; w.zone = mainZone; return; }

    if (S.turn <= 3){
      /* 開戰初期：全力奪取制空、癱瘓機場 */
      if ((A.strike || 0) >= 17) { w.mission = 'strike'; w.zone = pickRocZone(); }
      else if ((A.sead || 0) >= 10 && Math.random() < 0.4) { w.mission = 'sead'; w.zone = pickRocZone(); }
      else { w.mission = 'cap'; w.zone = Math.random() < 0.6 ? mainZone : pickRocZone(); }
    } else {
      const air = S.zoneAir[mainZone] || 0;
      if (air > -0.2 && (A.air || 0) >= 24) { w.mission = 'cap'; w.zone = mainZone; }
      else if ((A.cas || 0) >= 15 && bh) { w.mission = 'cas'; w.zone = bh.zone; }
      else if ((A.ashm || 0) >= 18) { w.mission = 'ashm'; w.zone = mainZone; }
      else if ((A.strike || 0) >= 15) { w.mission = 'strike'; w.zone = pickRocZone(); }
      else { w.mission = 'cap'; w.zone = mainZone; }
    }
  });

  /* 佯動方向也要看得到共軍戰機在爭制空——空蕩蕩的天空騙不了人 */
  const fh = this.activeFeint();
  if (fh && fh.zone !== mainZone){
    const decoy = wings.filter(w => w.mission === 'cap' && !w.A.c4isr && (w.A.air || 0) >= 24)
      .sort((a, b) => a.n - b.n)[0];
    if (decoy) decoy.zone = fh.zone;
  }

  function pickRocZone(){
    const zs = ['ZN', 'ZC', 'ZS'];
    return zs[Math.floor(Math.random() * zs.length)];
  }
},

/* --------------------------------------------------------------------------
   海上運動
   -------------------------------------------------------------------------- */
moveFleets(ev){
  const S = TW.S;
  const P = S.plaOps;
  const target = P ? TW.hexAt(P.main[0], P.main[1]) : this.chooseBeach();
  const tHex = target || TW.hexAt(12, 12);
  const tHex2 = (P && P.second) ? TW.hexAt(P.second[0], P.second[1]) : null;
  const D = (a, b) => TW.Hex.distance(a.c, a.r, b.c, b.r);

  /* ---- 滿載船團分配到主攻與助攻兩個方向 ----
     已經開到某個灘頭附近的船團不要臨時改道（那會在海上來回跑、兩邊都趕不上）；
     其餘依序填：主攻先拿到 AI_MAIN_SHARE 的運量，剩下的去助攻。 */
  const valid = h => h && (h.owner === 'ROC' || (h.beachhead && h.owner === 'PLA'));
  const loaded = S.navy.filter(f => !f.dead && f.side === 'PLA' && !f.feint &&
    TW.fleetStats(f).lift > 0 && !f.empty && !(f.reload > 0) && TW.fleetLoad(f) >= 1)
    .sort((a, b) => TW.fleetLoad(b) - TW.fleetLoad(a));
  const total = loaded.reduce((s2, f) => s2 + TW.fleetLoad(f), 0);
  let toMain = 0;
  const goesTo = new Map();
  loaded.forEach(f => {
    const old = f.opsTarget && TW.hexAt(f.opsTarget[0], f.opsTarget[1]);
    if (old && valid(old) && (old === tHex || old === tHex2) && D(f, old) <= 6){
      goesTo.set(f, old);
      if (old === tHex) toMain += TW.fleetLoad(f);
    }
  });
  let assigned = 0;
  goesTo.forEach((t, f) => { assigned += TW.fleetLoad(f); });
  loaded.forEach(f => {
    if (goesTo.has(f)) return;
    /* 誰比較缺就補誰：主攻拿 AI_MAIN_SHARE，助攻拿剩下的。
       第一支船團一定去主攻；只要有第二支，助攻就至少分得到一支。 */
    let t = tHex;
    if (tHex2 && assigned > 0 && toMain / assigned >= TW.B.AI_MAIN_SHARE) t = tHex2;
    if (t === tHex) toMain += TW.fleetLoad(f);
    assigned += TW.fleetLoad(f);
    goesTo.set(f, t);
  });

  S.navy.forEach(f => {
    if (f.dead || f.side !== 'PLA') return;
    const st = TW.fleetStats(f);

    /* 佯動船團另外處理 */
    if (f.feint){ this.feintFleet(f, ev); return; }

    /* 被打殘的編隊會退回福建的港口修理。共軍也有乾塢，
       不會把剩下三成耐受度的驅逐艦繼續丟在海峽裡。 */
    const cap = TW.Rules.fleetCap(f);
    if (f.mission === 'repair'){
      /* 修到八成就歸建 */
      if (f.hp >= cap * 0.8) f.mission = 'strike';
      else { if (!TW.Rules.portFor(f)){
               const home = TW.PLACES.filter(p => p.side === 'PLA' && p.type.includes('port'))
                 .sort((a, b) => TW.Hex.distance(f.c, f.r, a.c, a.r) -
                                 TW.Hex.distance(f.c, f.r, b.c, b.r))[0];
               if (home) this.sailToward(f, TW.hexAt(home.c, home.r), st.spd);
             }
             return; }
    } else if (cap > 0 && f.hp < cap * 0.42 && st.lift <= 0){
      f.mission = 'repair';
      return;
    }

    /* 潛艦：被標定就先脫離接觸，別留在原地跟驅逐艦對打。
       真正的潛艦戰術是打完就走，等對方失去接觸再回來。 */
    if (TW.isSub(f)){
      if (f.exposed > 0){
        f.mission = 'evade';
        const away = TW.Hex.neighbors(f.c, f.r)
          .map(([c, r]) => TW.hexAt(c, r))
          .filter(x => x && x.t === '.')
          .sort((a2, b2) => {
            const risk = x => {
              let v = 0;
              S.navy.forEach(y => { if (!y.dead && y.side === 'ROC')
                v -= TW.Hex.distance(x.c, x.r, y.c, y.r); });
              return v;
            };
            return risk(a2) - risk(b2);
          })[0];
        if (away){ f.c = away.c; f.r = away.r; }
        return;
      }
      f.mission = 'strike';
    }

    let goal;
    if (st.lift > 0){
      if (f.empty || f.reload > 0 || TW.fleetLoad(f) < 1){
        /* 空船：開回福建的集結港重新裝載 */
        const ports = TW.PLACES.filter(p => p.side === 'PLA' && p.staging &&
          TW.hexAt(p.c, p.r).owner === 'PLA');
        ports.sort((a, b) => TW.Hex.distance(f.c, f.r, a.c, a.r) - TW.Hex.distance(f.c, f.r, b.c, b.r));
        const home = ports[0];
        f.mission = 'evade';
        if (home && TW.Hex.distance(f.c, f.r, home.c, home.r) <= 2){
          if (f.empty || TW.fleetLoad(f) < 1){
            f.empty = false;
            f.reload = Math.max(0, TW.B.PLA_RELOAD_TURNS - 1);   // 靠港當回合就開始裝載
            /* 裝得下多少就裝多少；集結港被打過的話，吊掛與碼頭效率打折 */
            f.load = Math.floor(TW.fleetStats(f).lift * (f.hp / f.maxHp) *
                                Math.max(0.25, 1 - (S.plaLiftPenalty || 0)));
          } else if (f.reload > 0){
            f.reload--;
          }
          f.order = null;
          return;
        }
        goal = home ? TW.hexAt(home.c, home.r) : null;
      } else if (S.turn < TW.B.AI_LANDING_TURN - 1){
        /* 還沒到登陸發起日：滿載的船團留在港裡等，不要提早三天開到灘外當靶。
           橫渡海峽只要一個晚上，發起前一個回合才出港。 */
        const ports = TW.PLACES.filter(p => p.side === 'PLA' && p.staging)
          .sort((a, b) => D(f, a) - D(f, b));
        f.mission = 'evade';
        if (ports[0] && D(f, ports[0]) > 2) goal = TW.hexAt(ports[0].c, ports[0].r);
        else { f.order = null; return; }
      } else {
        /* 滿載：航向分配到的灘頭外海（主攻或助攻） */
        const tgt = goesTo.get(f) || tHex;
        f.opsTarget = [tgt.c, tgt.r];
        const adj = TW.Hex.neighbors(tgt.c, tgt.r).map(([c, r]) => TW.hexAt(c, r))
          .filter(h => h && h.t === '.')
          .sort((a, b) => D(f, a) - D(f, b));        // 挑離自己最近的那一面海，不要繞到島的另一邊
        goal = adj.length ? adj[0] : tgt;
        f.mission = (S.zoneSea[TW.seaZoneAt(tgt.c, tgt.r)] || 0) > 0.4 ? 'evade' : 'strike';
      }
    } else if (st.carrier > 0){
      goal = TW.hexAt(23, 14);           // 航母戰鬥群留在東部海域
      f.mission = 'strike';
    } else {
      /* 護航編隊：守住登陸區與船團航道的制海權。
         以前這裡是「追離自己最近的國軍艦隊」，追到哪算哪——
         國軍布雷艦隊停在左營，整個護航兵力就被引到南部，
         北部登陸區的制海權拱手讓人，上岸的部隊斷補餓死。
         真實的兩棲作戰，護航兵力是釘在登陸區和航道上的。 */
      const D = (a, b) => TW.Hex.distance(a.c, a.r, b.c, b.r);
      const stages = TW.PLACES.filter(p => p.side === 'PLA' && p.staging && TW.hexAt(p.c, p.r).owner === 'PLA');
      const port = stages.slice().sort((a, b) => D(a, tHex) - D(b, tHex))[0];
      const loaded = S.navy.filter(x => !x.dead && x.side === 'PLA' && TW.fleetStats(x).lift > 0 &&
        !x.empty && TW.fleetLoad(x) >= 1);

      /* 1. 有國軍艦隊威脅到登陸灘頭或滿載船團 → 離開陣位去打 */
      const threats = S.navy.filter(x => !x.dead && x.side === 'ROC' && !TW.fleetHidden(x, 'PLA') &&
        (D(x, tHex) <= TW.B.PLA_ESCORT_THREAT_RADIUS ||
         loaded.some(c => D(x, c) <= TW.B.PLA_ESCORT_CONVOY_RADIUS)));

      if (threats.length){
        threats.sort((a, b) => D(f, a) - D(f, b));
        goal = TW.hexAt(threats[0].c, threats[0].r);
      } else {
        /* 2. 沒有威脅 → 占住陣位。第二支護航編隊守航道中段，其餘守灘頭外海 */
        const escorts = S.navy.filter(x => !x.dead && x.side === 'PLA' && !TW.isSub(x) &&
          TW.fleetStats(x).lift <= 0 && TW.fleetStats(x).carrier <= 0 && x.mission !== 'repair');
        const idx = escorts.indexOf(f);
        const seas = S.hexes.filter(x => x.t === '.');
        if (idx === 1 && port){
          /* 航道中段：離集結港與灘頭距離差不多、又最貼近兩者連線的海面 */
          const L = D(port, tHex);
          goal = seas.slice().sort((a, b) => {
            const sc = x => Math.abs(D(x, port) - D(x, tHex)) + (D(x, port) + D(x, tHex) - L) * 2;
            return sc(a) - sc(b);
          })[0];
        } else {
          /* 灘頭外海 2～3 格、靠對岸那一側：擋在國軍艦隊與船團之間 */
          const ring = seas.filter(x => { const d = D(x, tHex); return d >= 2 && d <= 3; });
          goal = (ring.length ? ring : seas).slice()
            .sort((a, b) => (port ? D(a, port) - D(b, port) : D(a, tHex) - D(b, tHex)))[0];
        }
      }
      f.mission = 'strike';
    }

    this.sailToward(f, goal, st.spd || 3);
  });
},

/* --------------------------------------------------------------------------
   佯動船團
   --------------------------------------------------------------------------
   一支空船的民船船團。在雷達上它跟真的登陸船團長得一模一樣——
   一樣會觸發「偵測到兩棲船團接近」的預警。它會開到佯動方向的灘頭外海，
   在那裡晃個一兩天，讓守軍調兵、讓岸置飛彈對它開火，然後掉頭回港，
   休息幾天再換一個方向重來。
   打沉它不是沒有意義（共軍少了船），但你的飛彈與預備隊花在錯的地方了。
   -------------------------------------------------------------------------- */
feintFleet(f, ev){
  const S = TW.S, B = TW.B, P = S.plaOps;
  const D = (a, b) => TW.Hex.distance(a.c, a.r, b.c, b.r);
  f.load = 0;                 // 艙裡沒有兵
  f.empty = false;            // 但吃水看起來是滿的——雷達分不出來
  f.mission = 'evade';
  const phase = f.feintPhase || 'home';

  const homePort = () => {
    const ports = TW.PLACES.filter(p => p.side === 'PLA' && p.staging && TW.hexAt(p.c, p.r).owner === 'PLA')
      .sort((a, b) => D(f, a) - D(f, b));
    return ports[0] ? TW.hexAt(ports[0].c, ports[0].r) : null;
  };

  if (phase === 'home'){
    if (!P || !P.feint || S.turn < (f.feintReady || 0)){
      const hp = homePort();
      if (hp && D(f, hp) > 2) this.sailToward(f, hp, 3);
      return;
    }
    f.feintTarget = P.feint.slice();
    f.feintPhase = 'go';
    f.feintLoiter = 0;
  }

  if (f.feintPhase === 'go'){
    const tgt = TW.hexAt(f.feintTarget[0], f.feintTarget[1]);
    if (!tgt || tgt.owner !== 'ROC'){ f.feintPhase = 'back'; }
    else {
      if (D(f, tgt) <= B.CONVOY_WARN_RANGE){
        f.feintLoiter = (f.feintLoiter || 0) + 1;
        if (f.feintLoiter > B.AI_FEINT_LOITER){
          f.feintPhase = 'back';
          /* 船團掉頭，而且一直沒有卸載動作——情報單位這時候才看得出來它是空的 */
          if (f.approachWarned && ev)
            ev.push({ t:'log', cls:'c-ok',
              txt:'【情報研判】在 ' + TW.hexName(tgt) + ' 外海徘徊了 ' + (f.feintLoiter - 1) +
                  ' 個回合的 ' + f.name + ' 開始掉頭返航。吃水很淺、始終沒有卸載動作——' +
                  '研判是佯動，艙裡沒有部隊。共軍真正的主攻不在這裡。' });
        }
      }
      if (f.feintPhase === 'go'){
        /* 開到灘頭外海 2 格左右晃，不要真的貼上去 */
        const ring = S.hexes.filter(x => x.t === '.' && D(x, tgt) === 2)
          .sort((a, b) => D(f, a) - D(f, b));
        const g = ring[0] || tgt;
        if (D(f, g) > 0) this.sailToward(f, g, 3);
        return;
      }
    }
  }

  if (f.feintPhase === 'back'){
    const hp = homePort();
    if (!hp || D(f, hp) <= 2){
      f.feintPhase = 'home';
      f.feintReady = S.turn + B.AI_FEINT_COOLDOWN;
      f.approachWarned = null;     // 下一次出航要再預警一次
      f.order = null;
      return;
    }
    this.sailToward(f, hp, 3);
  }
},

/* 佯動船團被打沉之後，共軍會再湊一支出來。
   名字跟真的後續船團一模一樣——你在雷達上分不出來，這才是佯動。 */
rebuildFeint(ev){
  const S = TW.S, B = TW.B;
  if (S.navy.some(f => !f.dead && f.side === 'PLA' && f.feint)) return;
  if (S.turn < (S.feintRebuildAt || 0)) { return; }
  if (S.feintRebuildAt === undefined){ S.feintRebuildAt = S.turn + B.AI_FEINT_REBUILD; return; }
  const stages = TW.PLACES.filter(p => p.staging && TW.hexAt(p.c, p.r).owner === 'PLA' &&
    TW.hexAt(p.c, p.r).damage < 0.75);
  if (!stages.length) return;
  const st = stages[Math.floor(Math.random() * stages.length)];
  const spot = S.hexes.find(x => x.t === '.' && TW.Hex.distance(x.c, x.r, st.c, st.r) === 2);
  if (!spot) return;
  const f = TW.mkNavy('PLA', { name:'徵用民船船團（後續徵集）', c:spot.c, r:spot.r,
    mission:'evade', feint:true, ships:[['roro', 3], ['t072a', 2]] });
  f.feintReady = S.turn + 1;
  S.navy.push(f);
  S.feintRebuildAt = S.turn + B.AI_FEINT_REBUILD;
},

/* 佯動正在進行中（船團在路上或在灘外晃）的話，回傳佯動的目標格 */
activeFeint(){
  const f = TW.S.navy.find(x => !x.dead && x.side === 'PLA' && x.feint &&
    x.feintPhase === 'go' && x.feintTarget);
  return f ? TW.hexAt(f.feintTarget[0], f.feintTarget[1]) : null;
},

/* 下一個航向命令。實際航行和玩家一樣在回合結算時進行，
   一回合只走得了艦隊的航速——共軍的船也不會瞬移。 */
sailToward(f, goal, spd){
  if (!goal) return;
  if (TW.Hex.distance(f.c, f.r, goal.c, goal.r) <= 1){ f.order = null; return; }

  /* 目標本身是陸地（例如港口）就改瞄它旁邊的海面 */
  let g = goal;
  if (g.t !== '.'){
    const adj = TW.Hex.neighbors(g.c, g.r).map(([c, r]) => TW.hexAt(c, r))
      .filter(h => h && h.t === '.')
      .sort((a, b) => TW.Hex.distance(f.c, f.r, a.c, a.r) - TW.Hex.distance(f.c, f.r, b.c, b.r));
    if (!adj.length) return;
    g = adj[0];
  }
  const path = TW.Rules.seaPath(f, g.c, g.r);
  if (path && path.length) f.order = { type:'sail', path };
},

/* --------------------------------------------------------------------------
   地面部隊命令
   -------------------------------------------------------------------------- */
groundOrders(){
  const S = TW.S;
  const units = S.units.filter(u => !u.dead && u.side === 'PLA' && !u.T.range && !u.T.aa);

  units.forEach(u => {
    const h = TW.hexAt(u.c, u.r);
    if (h && h.T.prc){ u.order = null; return; }        // 還在對岸的靜態單位

    /* 剛上陸、組織度太低 → 先鞏固 */
    if (u.org < u.maxOrg * 0.32){ u.order = { type:'hold' }; return; }

    /* 相鄰有敵軍 → 評估是否攻擊 */
    const adjFoes = [];
    TW.Hex.neighbors(u.c, u.r).forEach(([c, r]) => {
      const fs = TW.unitsAt(c, r).filter(x => x.side === 'ROC');
      if (fs.length) adjFoes.push({ c, r, fs });
    });

    if (adjFoes.length){
      adjFoes.sort((a, b) => scoreTarget(u, a) - scoreTarget(u, b));
      const best = adjFoes[0];
      const odds = attackOdds(u, best);

      /* 卡住越久，越願意用不利的交換比硬攻——
         登陸部隊沒有時間慢慢等，灘頭每多待一天補給就更糟。 */
      u.stall = (u.stall || 0) + 1;
      const need = Math.max(TW.B.AI_MIN_ODDS, 0.85 - u.stall * 0.07) / TW.B.AI_AGGRESSION;

      if (odds > need || u.stall > 12){
        u.order = { type:'attack', tc:best.c, tr:best.r };
        u.stall = 0;
        return;
      }
      /* 已經接敵就不再繞路——就地鞏固，等砲兵與空中支援上來 */
      u.order = { type:'hold' };
      return;
    } else u.stall = 0;

    /* 否則向目標推進 */
    const obj = this.objective(u);
    if (!obj){ u.order = { type:'hold' }; return; }
    let path = TW.Rules.path(u, obj.c, obj.r, true);

    /* 路被自己人塞住時，至少往目標方向擠一格 */
    if (!path || !path.length){
      const step = TW.Hex.neighbors(u.c, u.r)
        .filter(([c, r]) => TW.Rules.canEnter(u, c, r))
        .sort((a, b) => TW.Hex.distance(a[0], a[1], obj.c, obj.r) -
                        TW.Hex.distance(b[0], b[1], obj.c, obj.r))[0];
      path = step && TW.Hex.distance(step[0], step[1], obj.c, obj.r) <
                     TW.Hex.distance(u.c, u.r, obj.c, obj.r) ? [step] : null;
    }
    if (path && path.length) u.order = { type:'move', path };
    else u.order = { type:'hold' };
  });

  function scoreTarget(u, t){
    let s = 0;
    t.fs.forEach(f => s += f.hp * (1 + f.entrench));
    const h = TW.hexAt(t.c, t.r);
    s *= TW.hexDef(h);
    if (h.place) s -= h.place.vp * 3;
    return s;
  }
  function attackOdds(u, t){
    let def = 0;
    const h = TW.hexAt(t.c, t.r);
    t.fs.forEach(f => def += (TW.stat(f, 'def') + TW.stat(f, 'soft') * 0.5) * (1 + f.entrench) * TW.hexDef(h));

    let atk = TW.stat(u, 'soft') + TW.stat(u, 'hard') * 0.6;

    /* 把可以支援這場攻擊的火力也算進去：友軍砲兵、相鄰的其他攻擊部隊、空中密接支援 */
    TW.S.units.forEach(g => {
      if (g.dead || g.side !== u.side) return;
      const d = TW.Hex.distance(g.c, g.r, t.c, t.r);
      if (g.T.range && d <= g.T.range + 1) atk += TW.stat(g, 'soft') * 0.45;
      else if (g !== u && d === 1) atk += TW.stat(g, 'soft') * 0.30;
    });
    TW.S.air.forEach(w => {
      if (w.dead || w.side !== u.side || w.mission !== 'cas' || w.zone !== h.zone) return;
      atk += TW.airStat(w, 'cas') * w.n * 0.02 * TW.wingReady(w);
    });

    return atk / Math.max(1, def);
  }
},

/* 共軍的階段性目標：港口 → 機場 → 都市 → 台北 */
objective(u){
  const S = TW.S;
  let best = null, bestScore = -1e9;
  /* 決勝目標：台北，或是「高雄＋台中」同時拿下。
     多方向登陸之後各路部隊很容易各打各的、在南部撿一堆小據點；
     共軍的戰役目標是讓台灣的防衛體系崩潰，所以已經拿下其中一座的話，
     另一座的價值要大幅提高，而且再遠也值得走過去。 */
  const own = nm => { const p = TW.PLACES.find(x => x.name === nm); return p && TW.hexAt(p.c, p.r).owner === 'PLA'; };
  const decisive = {};
  if (own('左營高雄')) decisive['台中'] = 3.2;
  if (own('台中'))     decisive['左營高雄'] = 3.2;
  TW.PLACES.forEach(p => {
    const h = TW.hexAt(p.c, p.r);
    if (!h || h.owner !== 'ROC') return;
    /* 距離用「實際要走多少機動力」算，不是直線格數：
       隔著中央山脈的花蓮、台東直線很近，實際上要翻山；沿著國道的台北直線很遠，實際上一天就到。
       以前用直線距離，南部上岸的部隊會一路往山裡鑽去打台東。 */
    const field = this.travelField(p);
    const d = field[u.r * TW.B.MAP_W + u.c];
    if (d === undefined || d === Infinity) return;
    const far = p.type.includes('capital') || decisive[p.name];
    if (d > (far ? 26 : 16)) return;
    let v = p.vp;
    if (p.type.includes('port') || p.type.includes('navalbase')) v *= 2.2;   // 港口讓重裝備能上岸
    if (p.type.includes('airbase')) v *= 1.6;
    if (p.type.includes('capital')) v *= 1.8;
    if (decisive[p.name]) v *= decisive[p.name];
    /* 守得很硬的要塞先繞過去：一整支集團軍卡在高雄城下啃不動，
       不如先去拿防守薄弱、一樣有價值的地方。真的打不下來的才繞，
       決勝目標（台北、高雄＋台中）打折得少一點，終究還是要啃。 */
    const guard = this.guardAt(h);
    v /= 1 + guard * (p.type.includes('capital') || decisive[p.name] ? 0.12 : 0.28);
    const score = v / (d * 0.9 + 1);
    if (score > bestScore){ bestScore = score; best = h; }
  });
  return best;
},

/* 某一格的守備強度（以「滿編築壘旅」為單位）：格內守軍全算、隔壁的算三成 */
guardAt(h){
  let g = 0;
  const add = (c, r, w) => TW.unitsAt(c, r).forEach(x => {
    if (x.side === 'ROC') g += (x.hp / 100) * (x.org / x.maxOrg) * (1 + x.entrench) * w;
  });
  add(h.c, h.r, TW.hexDef(h));
  TW.Hex.neighbors(h.c, h.r).forEach(([c, r]) => add(c, r, 0.3));
  return g;
},

/* 從某個地點往外算「走到這裡要花多少機動力」的距離場（Dijkstra）。
   用一支中型機步旅當標準：山地要多付重裝備懲罰、河川要架橋、國道很便宜。
   每回合每個地點只算一次，存起來給所有部隊共用。 */
travelField(p){
  const S = TW.S;
  const key = p.name;
  if (!this._tf || this._tfTurn !== S.turn || this._tfGame !== S){
    this._tf = {}; this._tfTurn = S.turn; this._tfGame = S;
  }
  if (this._tf[key]) return this._tf[key];

  const W = TW.B.MAP_W, dist = new Array(W * TW.B.MAP_H).fill(Infinity);
  const probe = { cls:'mech', T:{} };
  const start = p.r * W + p.c;
  dist[start] = 0;
  const open = [[0, p.c, p.r]];
  while (open.length){
    /* 地圖很小（七百格），用簡單的線性找最小值就夠快了 */
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [d, c, r] = open[bi];
    open[bi] = open[open.length - 1]; open.pop();
    if (d > dist[r * W + c]) continue;
    TW.Hex.neighbors(c, r).forEach(([nc, nr]) => {
      const h = TW.hexAt(nc, nr);
      if (!h || h.t === '.' || h.T.prc) return;
      /* 反向走：從 (nc,nr) 走進 (c,r) 的代價 */
      const nd = d + TW.Rules.moveCost(probe, c, r, nc, nr);
      const k = nr * W + nc;
      if (nd < dist[k]){ dist[k] = nd; open.push([nd, nc, nr]); }
    });
  }
  this._tf[key] = dist;
  return dist;
},

/* --------------------------------------------------------------------------
   後續梯隊增援
   -------------------------------------------------------------------------- */
reinforce(ev){
  const S = TW.S;
  if (S.turn % TW.B.AI_REINFORCE_EVERY !== 0) return;
  if (!S.plaReinfPool.length) return;

  /* 手上有港口才敢投入重裝部隊 */
  const hasPort = S.hexes.some(h => h.owner === 'PLA' && h.place &&
    (h.place.type.includes('port') || h.place.type.includes('navalbase')) && !h.T.prc);
  const n = hasPort ? 2 : 1;

  /* 民船動員：只要對岸港口還能作業，載運能力就會慢慢補回來。
     這也是為什麼「打船團」必須持續做，打一次是沒有用的。 */
  const portOk = TW.PLACES.filter(p => p.staging)
    .reduce((s, p) => s + (1 - TW.hexAt(p.c, p.r).damage), 0) / 4;
  if (portOk > 0.25){
    let grp = S.navy.find(f => !f.dead && f.side === 'PLA' && !f.feint && f.ships.some(s => s.N.fragile));
    if (!grp){
      grp = { id:'roro' + S.turn, kind:'navy', side:'PLA', name:'徵用民船船團（第 ' + S.turn + ' 波）',
        ships:[{ t:'roro', n:0, maxN:8, N:TW.NAVY_TYPES.roro, hp:0 }],
        c:3, r:13, mission:'evade', order:null, dead:false, hp:0, maxHp:TW.NAVY_TYPES.roro.hp * 8 };
      S.navy.push(grp);
    }
    const add = Math.round(3 * portOk);
    const sh = grp.ships.find(s => s.N.fragile);
    sh.n = Math.min(sh.maxN, sh.n + add);
    grp.hp = Math.min(grp.maxHp, grp.hp + TW.NAVY_TYPES.roro.hp * add);
    ev.push({ t:'log', cls:'c-pla',
      txt:'共軍再徵用 ' + add + ' 艘民用滾裝船，兩棲載運能力部分恢復。' });
  }

  for (let i = 0; i < n && S.plaReinfPool.length; i++){
    const [name, type] = S.plaReinfPool.shift();
    const T = TW.GROUND_TYPES[type];
    const u = {
      id:'r' + S.turn + '_' + i, kind:'ground', side:'PLA', name, corps:'增援', type, T,
      cls:T.cls, icon:T.icon, c:2, r:13,
      hp:T.hp * (hasPort ? 1 : 0.9), maxHp:T.hp,
      org:T.org * 0.8, maxOrg:T.org, xp:0.15, entrench:0, supply:1,
      equip:[], order:null, moved:0, landedTurn:0, dead:false,
      wave:2, airborne:!!T.airborne
    };
    S.plaPool.push(u);
    ev.push({ t:'log', cls:'c-pla', txt:'共軍後續梯隊 ' + name + ' 於對岸完成整備，準備投入。' });
  }
}

};
