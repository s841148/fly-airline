/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   回合流程
   --------------------------------------------------------------------------
   玩家按下「執行回合」之後，整個回合會一次算完，
   產生一串 ev（發生了什麼），再交給 UI 依序播放。
   ========================================================================== */

TW.Turn = {

execute(){
  const S = TW.S;
  const ev = [];

  TW.Env.roll();
  ev.push({ t:'phase', txt:'━━━ 第 ' + S.turn + ' 回合　D+' + S.day + ' ' + pad(S.hour) +
                            '00　' + TW.Env.label() + ' ━━━' });

  /* ---- 0. 共軍決心 ---- */
  TW.AI.plan(ev);
  TW.Rules.fifthColumnStrike(ev);     // 第五縱隊劇本：開場的裡應外合

  /* ---- 1~5. 各作戰階段 ---- */
  ev.push({ t:'phase', txt:'── 飛彈與遠程火力 ──' });
  TW.Combat.missilePhase(ev);

  ev.push({ t:'phase', txt:'── 空中作戰 ──' });
  TW.Combat.airPhase(ev);
  TW.Rules.recalcAirSea();

  ev.push({ t:'phase', txt:'── 海上機動與作戰 ──' });
  TW.Rules.aswSearch(ev);        // 先找潛艦，找到才打得到
  /* 先依航速航行，再接戰——艦隊是開過去打，不是打完才動 */
  S.navy.forEach(f => { if (!f.dead) TW.Rules.sailAlong(f, ev); });

  /* 雷達預警：滿載的兩棲船團接近我方灘頭外海。
     同一回合有好幾支船團接近時合併成一行，不要洗版。 */
  const approaching = [];
  S.navy.forEach(f => {
    if (f.dead || f.side !== 'PLA' || f.empty || TW.fleetStats(f).lift <= 0) return;
    if (TW.fleetHidden(f, 'ROC')) return;
    let best = null, bd = 99;
    TW.BEACHES.forEach(b => {
      const bh = TW.hexAt(b.c, b.r);
      if (!bh || bh.owner !== 'ROC') return;
      const d = TW.Hex.distance(f.c, f.r, b.c, b.r);
      if (d < bd){ bd = d; best = b; }
    });
    if (!best || bd > TW.B.CONVOY_WARN_RANGE) return;
    /* 每一趟出航只預警一次；回港裝載時（convoyReturn）才清掉 */
    if (f.approachWarned) return;
    f.approachWarned = best.name;
    approaching.push({ f, best, bd });
  });
  if (approaching.length){
    const beaches = [...new Set(approaching.map(x => x.best.name))];
    const nearest = Math.min(...approaching.map(x => x.bd));
    ev.push({ t:'log', cls:'c-warn',
      txt:'【雷達】偵測到 ' + approaching.length + ' 支共軍兩棲船團接近 ' + beaches.join('、') +
          ' 外海（最近 ' + nearest + ' 格，約 ' + (nearest * TW.B.HEX_KM) + ' 公里）：' +
          approaching.map(x => x.f.name).join('、') + '。' });
  }
  TW.Combat.navalPhase(ev);
  TW.Rules.recalcAirSea();

  ev.push({ t:'phase', txt:'── 兩棲與空降 ──' });
  TW.Combat.landingPhase(ev);
  TW.Combat.airbornePhase(ev);

  ev.push({ t:'phase', txt:'── 空中機動 ──' });
  this.airliftPhase(ev);

  ev.push({ t:'phase', txt:'── 砲兵與遠程火力 ──' });
  TW.Combat.artilleryPhase(ev);

  ev.push({ t:'phase', txt:'── 地面機動 ──' });
  this.movePhase(ev);

  ev.push({ t:'phase', txt:'── 地面接戰 ──' });
  TW.Combat.groundPhase(ev);
  TW.Rules.autoDetonate(ev);      // 守軍撤出、共軍踏進來的那一刻，預置炸藥自動引爆

  /* ---- 6. 態勢重算 ---- */
  TW.Rules.recalcOwner();
  TW.Rules.recalcSupply();
  TW.Rules.recalcAirSea();
  TW.Rules.recalcVision();

  /* ---- 7. 補給、整補、築壘 ---- */
  this.upkeep(ev);

  /* ---- 8. 後方：生產、研發、動員、軍援 ---- */
  this.homeFront(ev);

  /* ---- 9. 政治與國際 ---- */
  this.politics(ev);

  /* ---- 10. 事件與軍售 ---- */
  this.rollAid(ev);
  this.rollEvent(ev);

  /* ---- 11. 勝負 ---- */
  S.intl = TW.clamp(S.intl, 0, 100);
  S.will = TW.clamp(S.will, 0, 130);
  S.plaWill = TW.clamp(S.plaWill, 0, 130);
  this.checkVictory(ev);

  /* ---- 12. 推進時鐘 ---- */
  S.turn++;
  S.hour += TW.B.HOURS_PER_TURN;
  while (S.hour >= 24){ S.hour -= 24; S.day++; }
  if (S.weather){ S.weather.turns--; if (S.weather.turns <= 0) S.weather = null; }
  S.plaSupplyHit = Math.max(0, (S.plaSupplyHit || 0) - 0.1);
  S.plaLiftPenalty = Math.max(0, (S.plaLiftPenalty || 0) - 0.04);

  return ev;
},

/* --------------------------------------------------------------------------
   空機降：航特部的特戰旅可以用 C-130／UH-60 直接跳到島上另一頭。
   前提是目的地上空我方還有制空權——沒有制空權的空降就是送死。
   -------------------------------------------------------------------------- */
airliftPhase(ev){
  const S = TW.S;
  S.units.forEach(u => {
    if (u.dead || !u.order || u.order.type !== 'airlift') return;
    const o = u.order;
    const h = TW.hexAt(o.tc, o.tr);
    if (!h){ u.order = null; return; }

    const air = S.zoneAir[h.zone] || 0;
    if (air < TW.B.AIRLIFT_MIN_AIR){
      /* 命令保留：運輸機在地面待命，等制空權回來再飛。
         以前訊息寫「待命」，程式卻把命令刪掉，玩家每次都得重下。 */
      o.waited = (o.waited || 0) + 1;
      ev.push({ t:'log', cls:'c-warn',
        txt:'【空機降延後】' + TW.hexName(h) + ' 上空制空權 ' + Math.round(air * 100) +
            '%，低於起飛門檻 ' + Math.round(TW.B.AIRLIFT_MIN_AIR * 100) + '%。' +
            u.name + ' 在機場待命，下回合再試（已等 ' + o.waited + ' 回合；不想等可按「取消命令」）。' });
      return;
    }
    u.order = null;

    /* 空降損失：制空權越差、目的地離敵人越近，落地就越慘 */
    let loss = TW.B.AIRLIFT_LOSS * (1 - air * 0.6);
    const foeNear = TW.Hex.neighbors(o.tc, o.tr)
      .some(([c, r]) => TW.unitsAt(c, r).some(x => x.side !== u.side));
    if (foeNear) loss *= 1.8;
    /* 跳進敵人控制的地方，是在人家的火網裡開傘 */
    const contested = (h.owner !== 'ROC');
    if (contested) loss *= TW.B.AIRLIFT_CONTEST_MULT;
    loss *= 0.7 + Math.random() * 0.6;

    u.hp = Math.max(6, u.hp * (1 - loss));
    u.org = u.maxOrg * TW.B.AIRLIFT_ORG;
    u.c = o.tc; u.r = o.tr;
    u.entrench = 0;
    u.landedTurn = S.turn;

    ev.push({ t:'land', c:o.tc, r:o.tr, cls:'c-roc', uid:u.id, chutes:true, side:'ROC',
      txt:(contested ? '【空降突擊】' : '【空機降】') + u.name +
          (contested ? ' 空降 ' : ' 機降 ') + TW.hexName(h) + '，落地損失 ' +
          Math.round(loss * 100) + '%，兵力剩 ' + Math.round(u.hp) + '。' });

    /* 跳在敵人頭上，落地就得打 */
    const defs = TW.unitsAt(o.tc, o.tr).filter(x => x.side !== u.side && !x.dead);
    if (defs.length){
      ev.push({ t:'battle', c:o.tc, r:o.tr, cls:'c-warn', txt:'　└ 空降場遭遇戰！' });
      TW.Combat.fight(u, defs, h, ev, false);
    }
  });
},

/* --------------------------------------------------------------------------
   移動：依照下達的路徑逐格前進，遇敵或移動點用完就停
   -------------------------------------------------------------------------- */
/* 共軍徵用新的民用滾裝船，併進第二登陸波 */
plaLiftRebuild(ev){
  const S = TW.S;
  if (S.turn < TW.B.AI_LANDING_TURN) return;
  if (S.turn % TW.B.PLA_LIFT_REBUILD_TURNS !== 0) return;
  if ((S.plaLiftBuilt || 0) >= TW.B.PLA_LIFT_CAP) return;
  if (!S.plaPool.filter(u => !u.airborne).length) return;   // 沒兵要運就不用補船

  const n = Math.max(1, Math.round(TW.B.PLA_LIFT_REBUILD_N * (TW.B.DIFF_LIFT || 1)));
  S.plaLiftBuilt = (S.plaLiftBuilt || 0) + n;

  /* 新徵用的船是在福建港口裝好兵才出發的——只能併進「正停在集結港」的船團，
     不能憑空加到已經開到海峽中間的船團上 */
  const stages = TW.PLACES.filter(p => p.staging && TW.hexAt(p.c, p.r).owner === 'PLA');
  let f = S.navy.find(x => !x.dead && x.side === 'PLA' && !x.feint &&
    x.ships.some(s => s.t === 'roro') &&
    stages.some(p => TW.Hex.distance(x.c, x.r, p.c, p.r) <= 2));
  if (f){
    const slot = f.ships.find(s => s.t === 'roro');
    slot.n += n; slot.maxN += n;
    f.maxHp = f.ships.reduce((a, x) => a + x.N.hp * x.maxN, 0);
    f.hp += TW.NAVY_TYPES.roro.hp * n;
  } else {
    const stage = TW.PLACES.filter(p => p.staging)[0];
    const spot = S.hexes.find(x => x.t === '.' &&
      TW.Hex.distance(x.c, x.r, stage.c, stage.r) <= 2);
    if (!spot) return;
    f = TW.mkNavy('PLA', { name:'徵用民船船團（後續徵集）', c:spot.c, r:spot.r,
                           mission:'strike', ships:[['roro', n]] });
    S.navy.push(f);
  }
  ev.push({ t:'log', cls:'c-warn',
    txt:'【情報】共軍再徵用 ' + n + ' 艘民用滾裝船投入海運，累計徵用 ' +
        S.plaLiftBuilt + ' 艘。打沉的船他們補得回來——要打得比他們補得快。' });
},

movePhase(ev){
  const S = TW.S;
  S.units.forEach(u => {
    if (u.dead || !u.order || u.order.type !== 'move') return;
    let mp = u.T.move;
    if (u.org < u.maxOrg * 0.3) mp = Math.max(1, mp - 1);
    if (u.supply < TW.B.SUPPLY_MIN_COMBAT) mp = Math.max(1, mp - 1);
    let moved = false, blocked = null;

    while (mp > 0 && u.order.path && u.order.path.length){
      const [c, r] = u.order.path[0];
      if (!TW.Rules.canEnter(u, c, r)){
        const foes = TW.unitsAt(c, r).filter(x => x.side !== u.side);
        blocked = foes.length
          ? { why:'敵軍佔據 ' + TW.hexName(TW.hexAt(c, r)) + '，無法直接進入——請下攻擊命令。', hard:true }
          : { why:TW.hexName(TW.hexAt(c, r)) + ' 已經有兩支部隊，擠不進去。', hard:false };
        break;
      }
      const cost = TW.Rules.moveCost(u, c, r, u.c, u.r);   // 從目前這格走過去（沿國道比較便宜）
      /* 一格的代價可能高於整回合的機動力（重裝備進山地、渡河）。
         標準的兵棋規則：只要這回合還沒動過，永遠可以走進相鄰的一格，
         否則裝甲旅會拿著一條畫好的路線在原地站到天荒地老。 */
      if (cost > mp && moved) break;        // 這回合已經走過了，剩下的下回合再說

      /* 敵軍管制地帶：進入後停止繼續移動 */
      const zoc = TW.Hex.neighbors(c, r).some(([nc, nr]) =>
        TW.unitsAt(nc, nr).some(x => x.side !== u.side));

      mp -= cost;
      u.c = c; u.r = r; u.entrench = 0; moved = true;
      u.order.path.shift();
      if (zoc) break;
    }

    if (moved && u.side === 'ROC')
      ev.push({ t:'move', c:u.c, r:u.r, cls:'', uid:u.id, txt:u.name + ' 進至 ' + TW.hexName(TW.hexAt(u.c, u.r)) + '。' });
    /* 共軍的移動不寫戰報，但動畫要知道他什麼時候動（地圖上才會滑過去，不是瞬移） */
    else if (moved) ev.push({ t:'move', c:u.c, r:u.r, uid:u.id, quiet:true });

    /* 被擋住而且一步都沒走：要嘛繞路，要嘛把命令取消掉並說清楚。
       以前這裡是默默 break，部隊就頂著一條路線永遠站在原地。 */
    if (!moved && blocked){
      const dest = u.order.path[u.order.path.length - 1];
      const alt = blocked.hard ? null : TW.Rules.path(u, dest[0], dest[1]);
      if (alt && alt.length){
        u.order.path = alt;
        if (u.side === 'ROC')
          ev.push({ t:'log', cls:'c-warn',
            txt:u.name + ' 原路線受阻（' + blocked.why + '）改走替代路線。' });
      } else {
        u.order = null;
        if (u.side === 'ROC')
          ev.push({ t:'log', cls:'c-warn', txt:'【前進受阻】' + u.name + ' ' + blocked.why +
            '　命令已取消，請重新下令。' });
      }
    }

    if (u.order && (!u.order.path || !u.order.path.length)) u.order = null;
  });
},

/* --------------------------------------------------------------------------
   整補：組織度、兵力、築壘、斷補耗損
   -------------------------------------------------------------------------- */
upkeep(ev){
  const S = TW.S;
  const wBonus = (S.weather && S.weather.orgBonus) || 0;

  S.units.forEach(u => {
    if (u.dead) return;
    const h = TW.hexAt(u.c, u.r);

    if (u.supply < TW.B.SUPPLY_MIN_COMBAT){
      let lack = (TW.B.SUPPLY_MIN_COMBAT - u.supply) / TW.B.SUPPLY_MIN_COMBAT;
      /* 自編旅帶了後勤支援營：自己帶油彈，斷補時撐得比較久 */
      if (u.T.logistics) lack *= Math.max(0.4, 1 - 0.3 * u.T.logistics);
      u.org -= u.maxOrg * TW.B.OUT_OF_SUPPLY_ORG * lack;
      u.hp  -= u.maxHp * TW.B.OUT_OF_SUPPLY_HP * lack;
      if (u.side === 'ROC' && lack > 0.7){
        if (Math.random() < 0.25)
          ev.push({ t:'log', cls:'c-warn', txt:u.name + ' 補給中斷，戰力急速下降。' });
        TW.hint('supply', '有部隊斷補給了',
          '補給是從我們控制的港口與都市擴散出去的，被共軍切斷就會歸零。\n\n' +
          '斷補的部隊每回合都會自己掉兵力和組織度，撐三個回合就會成建制投降。\n' +
          '地圖左上角切到「補給」圖層看一下，趕快把他們拉回亮的地方。');
      }

      /* 完全斷補又打光組織度的部隊，撐不了幾天就會成建制瓦解 */
      u.starve = (u.supply < 0.08) ? (u.starve || 0) + 1 : 0;
      if (u.starve >= 3 && u.org <= 0){ TW.killUnit(u, ev, '彈盡糧絕，成建制放下武器。'); return; }
      if (u.hp <= 0){ TW.killUnit(u, ev); return; }
    } else {
      /* 正在接戰的部隊沒辦法好好整補——這是戰線會被磨穿的原因 */
      const combat = u.fought ? TW.B.ORG_REGEN_IN_COMBAT : 1;
      /* 下了「整補」命令的部隊會全力恢復：補充兵、換裝、修車 */
      const refit = (u.order && u.order.type === 'refit') ? TW.B.REFIT_BONUS : 1;
      const regen = (TW.B.ORG_REGEN + wBonus) * (0.5 + 0.5 * u.supply) * combat * refit;
      u.org = Math.min(u.maxOrg, u.org + u.maxOrg * regen);

      const canHeal = !u.fought && h && h.owner === u.side &&
                      (h.T.urban || h.sup[u.side] > 0.6 || refit > 1);
      if (canHeal){
        const gain = u.maxHp * TW.B.HP_REGEN * u.supply * refit;
        /* 補充兵要從人力池扣 */
        const room = Math.min(gain, u.maxHp - u.hp, S.manpower * 2);
        if (room > 0){ u.hp += room; S.manpower -= room * 0.12; }
      }
    }

    if (!u.order || u.order.type === 'hold')
      u.entrench = Math.min(TW.B.ENTRENCH_MAX, u.entrench + TW.B.ENTRENCH_PER_TURN * u.supply);

    u.org = TW.clamp(u.org, 0, u.maxOrg);   // 組織度不會變成負的
    u.hp  = Math.min(u.hp, u.maxHp);

    /* 持續消耗：接戰中的部隊整個回合都在打，不是只有結算那一瞬間。
       這才是彈藥真正燒掉的地方——一個旅在激戰中半天的基數非常可觀。 */
    if (u.side === 'ROC' && u.fought)
      TW.Env.spend((u.cls === 'arty' || u.cls === 'ssm')
        ? TW.B.AMMO_PER_ARTY_ENGAGED : TW.B.AMMO_PER_ENGAGED);

    u.fought = false;   // 清掉本回合的交戰標記
    u.firedThisTurn = false;
  });

  /* 灘頭壽命：共軍灘頭若被我方奪回就消失 */
  S.hexes.forEach(h => {
    if (!h.beachhead) return;
    if (h.owner !== 'PLA'){ h.beachhead = null; return; }
    h.beachhead.turns++;
  });

  /* 空軍轉場：飛到新基地、地勤與油彈車隊跟上，完成後恢復原本的任務 */
  S.air.forEach(w => {
    if (w.dead || !w.transit) return;
    const t = w.transit;
    const dest = TW.PLACES.find(x => x.name === t.to);
    const dh = dest && TW.hexAt(dest.c, dest.r);
    /* 飛到一半目的地被佔了：折返原駐地 */
    if (!dh || dh.owner !== w.side){
      w.mission = t.mission || 'cap';
      w.transit = null;
      if (w.side === 'ROC')
        ev.push({ t:'log', cls:'c-warn',
          txt:'【轉場中止】' + t.to + ' 已經失守，' + w.name + ' 折返 ' + w.base + '。' });
      return;
    }
    t.left--;
    if (t.left > 0) return;
    const from = w.base;
    w.base = t.to;
    w.mission = t.mission || 'cap';
    w.transit = null;
    if (w.side === 'ROC'){
      const p = TW.PLACES.find(x => x.name === w.base);
      const load = TW.baseLoad(w.base), cap = TW.baseCap(p);
      ev.push({ t:'transport', c:TW.PLACES.find(x => x.name === from).c, r:TW.PLACES.find(x => x.name === from).r,
        c2:p.c, r2:p.r, cls:'c-roc', air:true,
        txt:'【轉場完成】' + w.name + ' 由 ' + from + ' 進駐 ' + w.base +
            '（基地現有 ' + Math.round(load) + ' / ' + cap + ' 架），恢復任務。' +
            (load > cap ? '　<span style="color:#e0a33a">基地超過容量，出勤率會打折。</span>' : '') });
    }
  });

  /* 機隊整補（機場可用率決定回復速度） */
  S.air.forEach(w => {
    if (w.dead || w.n >= w.maxN) return;
    const p = TW.PLACES.find(x => x.name === w.base);
    const h = p ? TW.hexAt(p.c, p.r) : null;
    const ok = h && h.owner === w.side ? (1 - h.damage) : 0.15;
    w.n = Math.min(w.maxN, w.n + Math.max(0, w.maxN * 0.03 * ok));
    w.n = Math.round(w.n * 10) / 10;
  });
},

/* --------------------------------------------------------------------------
   後方：工業、研發、生產、動員、軍援抵達
   -------------------------------------------------------------------------- */
homeFront(ev){
  const S = TW.S;

  /* 工業產能重算（依控制的都市） */
  let ic = 6;
  TW.PLACES.forEach(p => {
    const h = TW.hexAt(p.c, p.r);
    if (p.side === 'ROC' && h && h.owner === 'ROC') ic += p.ind * (1 - h.damage * 0.5);
  });
  S.policies.forEach(id => {
    const P = TW.POLICIES.find(x => x.id === id);
    if (P && P.eff.ic) ic += P.eff.ic;
  });
  /* 供電率決定工業產能能發揮多少。全垮也不會歸零——還有緊急發電機。 */
  TW.Rules.recalcPower(ev);
  ic *= TW.B.POWER_IND_FLOOR + (1 - TW.B.POWER_IND_FLOOR) * S.power;

  S.ic = Math.max(4, Math.round(ic));
  S.icStore += S.ic;

  /* 研發 */
  for (let i = S.research.length - 1; i >= 0; i--){
    const R = S.research[i];
    const T = TW.TECH.find(x => x.id === R.id);
    R.left--;
    if (R.left <= 0){
      S.research.splice(i, 1);
      S.doneTech.push(T.id);
      TW.Rules.applyEffect(T.eff);
      ev.push({ t:'log', cls:'c-ok', txt:'【研發完成】' + T.name + ' 已服役。' });
    }
  }

  /* 自行生產 */
  for (let i = S.prodQueue.length - 1; i >= 0; i--){
    const P = S.prodQueue[i];
    P.left--;
    if (P.left <= 0){
      S.prodQueue.splice(i, 1);
      const E = TW.EQUIP[P.eq];
      if (E.shipType){
        const got = TW.Rules.commissionShip(E, P.packs);
        ev.push({ t:'log', cls:'c-ok',
          txt:'【成軍】' + E.name + ' ×' + (E.pack * P.packs) + ' 艘交艦，編入 ' + got + '。' });
      } else if (E.ammoFill){
        const got = TW.Env.refill(E.ammoFill * P.packs);
        ev.push({ t:'log', cls:'c-ok', txt:'【生產完成】' + E.name + ' 入庫，戰備彈藥 +' +
          Math.round(got) + '（現有 ' + Math.round(S.ammo) + ' / ' + S.ammoMax + '）。' });
      } else {
        S.stock[P.eq] = (S.stock[P.eq] || 0) + P.packs;
        ev.push({ t:'log', cls:'c-ok', txt:'【生產完成】' + E.name + ' ×' + P.packs + ' 批已出廠，可撥交部隊。' });
      }
    }
  }

  /* 軍援抵達（需要東部港口還在我們手上） */
  const lifeline = ['花蓮佳山', '台東志航', '蘇澳軍港'].some(n => {
    const p = TW.PLACES.find(x => x.name === n);
    const h = TW.hexAt(p.c, p.r);
    return h.owner === 'ROC' && h.damage < 0.85;
  });
  for (let i = S.incoming.length - 1; i >= 0; i--){
    const inc = S.incoming[i];
    inc.eta--;
    if (inc.eta > 0) continue;
    if (!lifeline){
      inc.eta = 2;
      ev.push({ t:'log', cls:'c-warn', txt:'【軍援延誤】東部港口無法接收，' + inc.name + ' 於海上待命。' });
      continue;
    }
    let ammoGot = 0;
    inc.items.forEach(([eq, n]) => {
      const E = TW.EQUIP[eq];
      /* 彈藥類的軍援直接進全國存量，不是撥給某一個旅 */
      if (E && E.ammoFill) ammoGot += TW.Env.refill(E.ammoFill * n);
      else S.stock[eq] = (S.stock[eq] || 0) + n;
    });
    S.incoming.splice(i, 1);
    if (ammoGot > 0)
      ev.push({ t:'log', cls:'c-us', txt:'　└ 戰備彈藥 +' + Math.round(ammoGot) +
        '（現有 ' + Math.round(S.ammo) + ' / ' + S.ammoMax + '）。' });
    TW.hint('aid', '軍援到貨了',
      '東西到了不會自己生效，要撥給部隊才算數。\n\n' +
      '到右邊「部隊」分頁，點一支部隊，下面就會出現「撥交裝備」。\n' +
      '同一種裝備可以撥給同一個旅好幾批，但第二批之後效果會遞減，分散給不同部隊比較划算。');
    ev.push({ t:'aid', cls:'c-us', txt:'【軍援抵達】' + inc.name + ' 已於東部港口卸載，可撥交部隊。' });
  }

  /* 共軍徵用民船補充海運。打沉的運輸艦會一批一批補回來，
     所以「打船」是消耗戰——你要打得比他們補得快。 */
  this.plaLiftRebuild(ev);

  /* 第五縱隊的後續破壞與補給搶修 */
  TW.Rules.fifthColumnTick(ev);

  /* 特戰突擊 */
  TW.Rules.raidPhase(ev);

  /* 兩棲裝載進度 */
  TW.Rules.embarkTick(ev);

  /* 工兵埋設爆破裝藥 */
  TW.Rules.demoWork(ev);
  TW.Rules.obstacleTick();

  /* 艦艇回港整補 */
  TW.Rules.navalRepair(ev);

  /* 彈藥補充 */
  TW.Env.resupply(ev);

  /* 部隊編成器：編成中的旅 */
  this.formingTick(ev);

  /* 後備動員 */
  S.reserveAcc += TW.B.RESERVE_PER_TURN + S.mod.reserveRate;
  while (S.reserveAcc >= 1 && S.rocReservePool.length && S.manpower > 0){
    S.reserveAcc -= 1;
    const [name, c, r] = S.rocReservePool.shift();
    const h = TW.hexAt(c, r);
    if (!h || h.owner !== 'ROC') continue;
    const T = TW.GROUND_TYPES.roc_reserve;
    S.units.push({
      id:'rv' + S.turn + name, kind:'ground', side:'ROC', name, corps:'後備', type:'roc_reserve', T,
      cls:T.cls, icon:T.icon, c, r,
      hp:T.hp, maxHp:T.hp,
      org:T.org * 0.7 + S.mod.reserveOrg, maxOrg:T.org + S.mod.reserveOrg,
      xp:0.05, entrench:0.1, supply:1, equip:[], order:null, moved:0, landedTurn:0, dead:false
    });
    S.manpower -= 4;
    ev.push({ t:'log', cls:'c-ok', txt:'【動員】' + name + ' 完成編成，於 ' + TW.hexName(h) + ' 報到。' });
  }
},

/* --------------------------------------------------------------------------
   部隊編成器：旅編成完成，在指定的地點報到
   -------------------------------------------------------------------------- */
formingTick(ev){
  const S = TW.S;
  if (!S.forming || !S.forming.length) return;
  for (let i = S.forming.length - 1; i >= 0; i--){
    const F = S.forming[i];
    F.left--;
    if (F.left > 0) continue;

    /* 指定的報到地點如果丟了，就改到最近的一座還在我方手上的都市或港口 */
    let p = TW.PLACES.find(x => x.name === F.at);
    const okPlace = x => x && x.side === 'ROC' && TW.hexAt(x.c, x.r).owner === 'ROC' &&
      !TW.unitsAt(x.c, x.r).some(u => u.side === 'PLA');
    if (!okPlace(p)){
      const cands = TW.PLACES.filter(x => okPlace(x) && !x.type.includes('power') && x.c >= 12)
        .sort((a, b) => TW.Hex.distance(a.c, a.r, p ? p.c : 15, p ? p.r : 3) -
                        TW.Hex.distance(b.c, b.r, p ? p.c : 15, p ? p.r : 3));
      p = cands[0];
      if (!p){ F.left = 1; continue; }      // 全島都沒地方報到了，下回合再試
    }
    /* 報到的格子擠滿了，就排到隔壁 */
    let c = p.c, r = p.r;
    if (TW.unitsAt(c, r).filter(u => u.side === 'ROC').length >= 2){
      const n = TW.Hex.neighbors(c, r).map(([a, b]) => TW.hexAt(a, b))
        .find(h => h && h.t !== '.' && h.owner === 'ROC' &&
          TW.unitsAt(h.c, h.r).length < 2);
      if (n){ c = n.c; r = n.r; }
    }
    const u = TW.mkCustomBrigade(F.tpl, F.name, c, r);
    S.units.push(u);
    S.forming.splice(i, 1);
    ev.push({ t:'land', c, r, cls:'c-ok', uid:u.id, form:true,
      txt:'【編成完成】' + u.name + '（' + (F.tpl.name || '自編旅') + '）於 ' + TW.hexName(TW.hexAt(c, r)) +
          ' 完成編成報到。兵力 ' + u.hp + '、軟攻 ' + u.T.soft + '、硬攻 ' + u.T.hard + '、機動 ' + u.T.move + '。' });
  }
},

/* --------------------------------------------------------------------------
   政治、國際支持、戰爭意志
   -------------------------------------------------------------------------- */
politics(ev){
  const S = TW.S;
  S.pp += TW.B.PP_PER_TURN;
  S.intl += TW.B.INTL_PER_TURN_HOLD + S.mod.intlPerTurn;
  /* 戰傷救護與平民疏散做得好，同樣的傷亡對民心的侵蝕就比較小 */
  S.will -= TW.B.WILL_LOSS_PER_TURN_LOST * (1 - TW.clamp(S.mod.willGuard || 0, 0, 0.6));

  /* 架空模式：國軍佔著對岸的土地，對北京是持續的政治重擊。
     這是這個模式的勝利路徑——不是把共軍打光，是讓他們撐不下去。 */
  if (S.whatIf){
    const held = S.hexes.filter(h => h.T.prc && h.owner === 'ROC').length;
    if (held > 0){
      S.plaWill -= held * 0.8;
      S.intl += held * 0.15;
      if (S.turn % 5 === 0)
        ev.push({ t:'log', cls:'c-ok',
          txt:'【反攻】國軍在對岸控制 ' + held + ' 個地區，' +
              '北京的政治壓力持續累積（共軍意志 ' + Math.round(S.plaWill) + '）。' });
    }
  }

  /* 打得越好，國際越願意賭我們會贏 */
  const landed = S.units.filter(u => !u.dead && u.side === 'PLA' && !TW.hexAt(u.c, u.r).T.prc).length;
  if (landed === 0 && S.turn > 4){ S.intl += 1.2; S.will += 1.0; }
  if (S.flags.taipeiFallen) S.will -= 4;

  S.intl = TW.clamp(S.intl, 0, 100);
  S.will = TW.clamp(S.will, 0, 130);
  S.plaWill = TW.clamp(S.plaWill, 0, 130);

  /* 外交行動冷卻 */
  for (const k in S.dipCd) if (S.dipCd[k] > 0) S.dipCd[k]--;

  const islandAir = (S.zoneAir.ZN + S.zoneAir.ZC + S.zoneAir.ZS) / 3;
  if (islandAir < -0.15)
    TW.hint('air', '本島制空權掉到負的了',
      '天空是共軍的，代表我們的地面部隊會被空中攻擊壓著打，共軍還可能直接空降機場。\n\n' +
      '到「空軍」分頁把戰鬥機的任務改成「制空作戰」、作戰空域改到出問題的那一區。\n' +
      '另外注意機場的「妥善出動」百分比——跑道被飛彈打壞，飛機再多也飛不出去。');

  /* 美軍直接介入 */
  if (!S.flags.usIntervened && S.intl >= TW.B.US_INTERVENE_INTL && S.turn >= TW.B.US_INTERVENE_TURN){
    S.flags.usIntervened = true;
    S.plaAirPenalty = (S.plaAirPenalty || 0) + 0.30;
    S.plaNavalPenalty = (S.plaNavalPenalty || 0) + 0.30;
    S.plaWill -= 25;
    S.will += 20;
    TW.Rules.usIntervene(ev);        // 把美軍真的放到地圖上
    TW.UI.modal({
      title:'美軍直接介入',
      sub:'BREAKING · WASHINGTON D.C.',
      text:'美國總統於白宮發表全國演說，宣布依《台灣關係法》授權美軍協防台灣。第七艦隊兩個航艦打擊群開始在巴士海峽以東執行制海任務，嘉手納與安德森基地的戰機進入台灣防空識別區。\n\n共軍的海空優勢在四十八小時內被抵銷了一半。',
      opts:[{ label:'國軍全線轉入反擊', hint:'共軍海空能力大幅下降', eff:()=>{} }]
    });
    ev.push({ t:'log', cls:'c-us', txt:'【美軍介入】第七艦隊進入戰區，共軍海空優勢大幅削弱。' });
  }
},

/* --------------------------------------------------------------------------
   軍售／軍援擲骰（本作核心機制）
   -------------------------------------------------------------------------- */
rollAid(ev){
  const S = TW.S;
  if (S.aidCd > 0){ S.aidCd--; return; }

  const p = TW.B.AID_ROLL_BASE + S.intl * TW.B.AID_ROLL_PER_INTL + S.mod.aidChance;
  if (Math.random() > p) return;

  const pool = TW.AID_PACKAGES.filter(a =>
    a.intl <= S.intl &&
    S.aidHistory.filter(x => x === a.id).length < (a.repeat || 1));
  if (!pool.length) return;
  S.aidCd = TW.B.AID_COOLDOWN;

  /* 國際支持越高，越容易抽到高階裝備 */
  const weighted = pool.map(a => ({ a, w: a.pri * (1 + (a.tier - 1) * (S.intl / 100)) }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total, pick = weighted[0].a;
  for (const x of weighted){ roll -= x.w; if (roll <= 0){ pick = x.a; break; } }

  S.aidHistory.push(pick.id);
  const eta = Math.max(1, TW.B.AID_DELIVERY_TURNS + S.mod.aidDelivery);

  /* 國際支持度越高，同一個案子一次交付的批數就越多 */
  const mult   = TW.aidMult();
  const items  = TW.aidItems(pick.items, mult);
  const cost   = TW.aidCost(pick, items);
  const ppCost = Math.max(6, Math.round(10 * (1 + (mult - 1) * 0.5)));

  const list = items.map((x, i) => {
    const base = pick.items[i][1];
    return TW.EQUIP[x[0]].name + ' ×' + x[1] + ' 批' +
      (x[1] > base ? '（基本量 ' + base + '，加碼 +' + (x[1] - base) + '）' : '');
  }).join('\n・');

  const qtyTxt = mult > 1.02
    ? '\n\n【國際支持 ' + Math.round(S.intl) + '】對方願意一次給到基本量的 ' +
      mult.toFixed(1) + ' 倍，多出來的部分我方只需負擔一部分經費。'
    : '\n\n【國際支持 ' + Math.round(S.intl) + '】目前只談得到基本量。' +
      '支持度再高一點，同一個案子一次交付的批數會跟著變多。';

  TW.UI.modal({
    title: pick.name,
    sub: pick.from,
    text: pick.text + '\n\n【內容】\n・' + list + qtyTxt +
          '\n\n【預計 ' + eta + ' 回合後由東部港口交付】',
    opts:[
      { label:'簽署　（工業點 −' + cost + '）',
        hint: S.icStore >= cost ? '正常交付' : '工業點不足，無法簽署',
        disabled: S.icStore < cost,
        eff: () => {
          S.icStore -= cost;
          S.incoming.push({ name:pick.name, items, eta, from:pick.from });
          if (pick.intl_bonus) S.intl += pick.intl_bonus;
          TW.log('c-us', '【軍購簽署】' + pick.name +
            (mult > 1.02 ? '（交付量 ×' + mult.toFixed(1) + '）' : '') +
            '，預計 ' + eta + ' 回合後抵達。');
        } },
      { label:'要求改列無償軍援　（政治點 −' + ppCost + '，國際支持 −4）',
        hint:'不花工業點，但消耗政治資本（拿得越多越難談）',
        disabled: S.pp < ppCost,
        eff: () => {
          S.pp -= ppCost; S.intl -= 4;
          S.incoming.push({ name:pick.name + '（軍援）', items, eta:eta + 1, from:pick.from });
          TW.log('c-us', '【軍援協商】' + pick.name + ' 改以無償軍援方式提供。');
        } },
      { label:'婉拒，把資源留給國造產線　（政治點 +6）',
        hint:'國際支持 −2',
        eff: () => { S.pp += 6; S.intl -= 2; TW.log('', '我方婉拒 ' + pick.name + '。'); } }
    ]
  });
},

/* --------------------------------------------------------------------------
   隨機事件
   -------------------------------------------------------------------------- */
rollEvent(ev){
  const S = TW.S;
  if (Math.random() > 0.32) return;

  const pool = TW.EVENTS.filter(e =>
    (!e.once || !S.firedEvents.includes(e.id)) &&
    (!e.minTurn || S.turn >= e.minTurn) &&
    (!e.maxTurn || S.turn <= e.maxTurn) &&
    (!e.cond || e.cond(S)));
  if (!pool.length) return;

  const total = pool.reduce((s, e) => s + e.w, 0);
  let roll = Math.random() * total, pick = pool[0];
  for (const e of pool){ roll -= e.w; if (roll <= 0){ pick = e; break; } }

  S.firedEvents.push(pick.id);
  TW.UI.modal({
    title: pick.title, sub: pick.sub, text: pick.text,
    opts: pick.opts.map(o => ({
      label:o.label, hint:o.hint,
      eff: () => { o.eff(S); TW.log('c-warn', '【' + pick.title + '】' + o.label); }
    }))
  });
},

/* --------------------------------------------------------------------------
   勝負判定
   -------------------------------------------------------------------------- */
checkVictory(ev){
  const S = TW.S;
  if (S.over) return;

  const cap = TW.PLACES.find(p => p.type.includes('capital'));
  const capH = TW.hexAt(cap.c, cap.r);
  /* 用地名找格子，不要寫死座標——地圖改過之後座標可能會變 */
  const placeHex = nm => { const p = TW.PLACES.find(x => x.name === nm); return p ? TW.hexAt(p.c, p.r) : null; };
  const kh = placeHex('左營高雄'), tc = placeHex('台中');

  if (capH.owner === 'PLA'){
    return this.end('PLA', '台北陷落',
      '共軍裝甲部隊於今日進入總統府廣場。指揮體系瓦解，各作戰區失去統一指揮。\n\n這場戰爭在第 ' + S.turn + ' 回合結束。');
  }
  if (S.will <= 0){
    return this.end('PLA', '戰爭意志崩潰',
      '連續的空襲、斷電與傷亡使社會動員能力歸零。政府在壓力下接受停火條件。');
  }
  if (kh.owner === 'PLA' && tc.owner === 'PLA'){
    return this.end('PLA', '西部走廊淪陷',
      '高雄與台中相繼失守，共軍已能自港口直接卸載重裝備。北部防線被切斷補給，全島防禦體系崩解。');
  }

  const landed = S.units.filter(u => !u.dead && u.side === 'PLA' && !TW.hexAt(u.c, u.r).T.prc);
  const lift = S.navy.filter(f => !f.dead && f.side === 'PLA' && !f.feint)   // 佯動船團是空船，不算運量
                     .reduce((s, f) => s + TW.fleetStats(f).lift, 0);
  if (S.turn > 6 && landed.length === 0 && S.plaPool.length === 0 && lift < 1){
    return this.end('ROC', '登陸行動徹底失敗',
      '共軍所有上陸部隊被殲滅或俘虜，兩棲載運能力歸零。對岸已無法在可見的未來重啟登陸作戰。');
  }
  if (S.plaWill <= 0){
    return this.end('ROC', '對岸放棄作戰',
      '損失遠超預期，加上國際制裁與內部壓力，對岸宣布「戰役目標已達成」並單方面停火。');
  }
  if (S.turn > TW.B.MAX_TURNS){
    const held = TW.PLACES.filter(p => p.side === 'ROC' && TW.hexAt(p.c, p.r).owner === 'ROC').length;
    return this.end('ROC', '戰略防衛成功',
      '國軍撐過了 ' + (TW.B.MAX_TURNS * TW.B.HOURS_PER_TURN / 24) + ' 天。\n\n' +
      '共軍未能達成速戰速決的目標，國際干預與後勤壓力使其被迫轉入僵持。\n' +
      '我方仍控制 ' + held + ' 處重要據點，戰爭意志 ' + Math.round(S.will) +
      '，國際支持度 ' + Math.round(S.intl) + '。');
  }
},

end(winner, title, text){
  const S = TW.S;
  S.over = winner;
  TW.UI.modal({
    title:(winner === 'ROC' ? '◆ 防衛成功 ◆　' : '◆ 防線崩潰 ◆　') + title,
    sub:'第 ' + S.turn + ' 回合　D+' + S.day,
    text: text + '\n\n' +
      '── 戰役統計 ──\n' +
      '殲滅共軍兵力：' + Math.round(S.stats.plaKilled) + '　我方損失：' + Math.round(S.stats.rocKilled) + '\n' +
      '擊沉艦艇：' + S.stats.shipsSunk + ' 艘　擊落敵機：' + S.stats.planesShot + ' 架\n' +
      '共軍發射飛彈：' + S.stats.missilesFired + ' 枚（攔截 ' + S.stats.missilesIntercepted + ' 枚）\n' +
      '獲得軍援：' + S.aidHistory.length + ' 批',
    opts:[{ label:'重新開始一場新戰役', hint:'', eff:() => { location.reload(); } }]
  });
}

};

function pad(n){ return String(n).padStart(2, '0'); }
