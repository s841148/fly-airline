/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   戰鬥解算：飛彈 → 空戰 → 海戰 → 登陸 → 地面
   --------------------------------------------------------------------------
   每一個函式都會把「發生了什麼」推進 ev 陣列，
   之後由 UI 依序播放動畫並印出戰報。
   ========================================================================== */

TW.Combat = {

/* ======================= 飛 彈 階 段 ======================= */
missilePhase(ev){
  const S = TW.S;
  const rf = S.rocket;

  /* ---- 共軍火箭軍發射 ---- */
  let waves = 1;
  if (S.turn <= 2) waves = TW.B.AI_MISSILE_WAVES;
  else if (S.turn <= 6) waves = 2;

  const targets = this.pickMissileTargets(waves * 4);
  if (!targets.length) return;

  for (const tgt of targets){
    const type = this.pickMissileType(tgt);
    if (!type) continue;
    const rec = rf[type];
    const salvo = Math.min(rec.stock, 6 + Math.floor(Math.random() * 10));
    if (salvo <= 0) continue;
    rec.stock -= salvo;
    S.stats.missilesFired += salvo;

    /* 我方攔截 */
    const intercept = this.interceptRate(tgt.c, tgt.r, rec);
    const killed = Math.round(salvo * intercept);
    S.stats.missilesIntercepted += killed;
    const leak = (salvo - killed) * rec.accuracy * (1 + S.mod.enemyAccuracy) *
                 (1 - (S.plaStrikePenalty || 0));

    /* 動畫用：飛彈從福建內陸的發射陣地飛過來；攔截彈從最近的愛國者／天弓陣地升空 */
    const aaU = S.units.filter(u => !u.dead && u.side === 'ROC' && u.T.abm &&
      TW.Hex.distance(u.c, u.r, tgt.c, tgt.r) <= 4)
      .sort((a, b) => TW.Hex.distance(a.c, a.r, tgt.c, tgt.r) - TW.Hex.distance(b.c, b.r, tgt.c, tgt.r))[0];
    ev.push({ t:'missile', c:tgt.c, r:tgt.r, cls:'c-pla',
      fc:0, fr:TW.clamp(tgt.r + Math.round(Math.random() * 6 - 3), 1, 24), n:salvo, kills:killed,
      ac: aaU ? aaU.c : undefined, ar: aaU ? aaU.r : undefined,
      txt:'共軍 ' + rec.name + ' ×' + salvo + ' 攻擊 ' + tgt.label +
          '，攔截 ' + killed + ' 枚，' + (salvo - killed) + ' 枚突防。' });

    this.applyMissileDamage(tgt, leak, rec, ev);
  }

  /* ---- 我方反擊：巡弋飛彈打對岸港口與機場 ---- */
  this.rocCounterStrike(ev);
},

pickMissileTargets(n){
  const S = TW.S, out = [];
  const cand = [];
  S.hexes.forEach(h => {
    if (h.owner !== 'ROC' || !h.place) return;
    const p = h.place;
    let w = 0;
    if (p.type.includes('airbase')) w = 10 * (1 - h.damage);
    else if (p.type.includes('airport')) w = 6 * (1 - h.damage);
    else if (p.type.includes('navalbase')) w = 8 * (1 - h.damage);
    else if (p.type.includes('port')) w = 6 * (1 - h.damage);
    else if (p.type.includes('capital')) w = 7;
    /* 打電廠是最省力的癱瘓手段，共軍不會放過 */
    else if (p.type.includes('power')) w = 9 * (1 - h.damage);
    if (p.hardened) w *= 0.55;
    /* 飛機擠在同一座基地，那座基地就是最肥的目標——分散部署的意義在這裡 */
    if (p.type.includes('airbase') || p.type.includes('airport'))
      w *= 1 + TW.baseLoad(p.name) / TW.B.MISSILE_CROWD_W;
    if (w > 0) cand.push({ c:h.c, r:h.r, label:p.name, kind:'place', w });
  });
  S.units.forEach(u => {
    if (u.dead || u.side !== 'ROC') return;
    let w = 0;
    if (u.cls === 'aa') w = 9;
    else if (u.cls === 'ssm') w = 8 * (u.T.stealth ? 0.4 : 1);
    else if (u.cls === 'arty') w = 6;
    else if (u.cls === 'armor') w = 4;
    if (w > 0) cand.push({ c:u.c, r:u.r, label:u.name, kind:'unit', uid:u.id, w });
  });

  const total = cand.reduce((s, x) => s + x.w, 0);
  for (let i = 0; i < n && cand.length; i++){
    let roll = Math.random() * total, pick = cand[0];
    for (const x of cand){ roll -= x.w; if (roll <= 0){ pick = x; break; } }
    out.push(pick);
  }
  return out;
},

pickMissileType(tgt){
  const rf = TW.S.rocket;
  const order = tgt.kind === 'unit' ? ['df15b','df16','cj10','df17'] : ['df16','df15b','cj10','df17'];
  for (const k of order) if (rf[k] && rf[k].stock > 0) return k;
  return null;
},

interceptRate(c, r, rec){
  const S = TW.S;
  let cap = 0;
  S.units.forEach(u => {
    if (u.dead || u.side !== 'ROC' || !u.T.abm) return;
    const d = TW.Hex.distance(u.c, u.r, c, r);
    if (d > 4) return;
    const hasPac = u.equip.includes('pac3mse');
    const base = hasPac ? TW.B.PAC3_INTERCEPT : TW.B.TK3_INTERCEPT;
    cap += base * (1 - d * 0.15) * (u.org / u.maxOrg) * (0.6 + 0.4 * u.supply);
  });
  cap *= 1 + S.mod.abmIntercept;
  if (rec.hypersonic) cap *= 0.45;         // 高超音速滑翔彈難以攔截
  if (rec.cruise) cap *= 0.85;
  return TW.clamp(cap, 0, 0.88);
},

applyMissileDamage(tgt, leak, rec, ev){
  const S = TW.S;
  const h = TW.hexAt(tgt.c, tgt.r);
  if (!h) return;

  if (tgt.kind === 'place'){
    const dmgRate = (h.place.type.includes('port') || h.place.type.includes('navalbase'))
      ? TW.B.MISSILE_PORT_DMG : TW.B.MISSILE_AIRFIELD_DMG;
    const d = leak * rec.dmg * dmgRate * 0.09 * (1 + S.mod.missileAirfield);
    h.damage = TW.clamp(h.damage + d, 0, 0.95);
    if (d > 0.05)
      ev.push({ t:'boom', c:h.c, r:h.r, cls:'c-warn',
        txt:'　└ ' + h.place.name + ' ' + TW.facilityHit(h.place) +
            '受損，可用率降至 ' + Math.round((1 - h.damage) * 100) + '%。' });

    /* 停在該基地的機隊也會挨打 */
    S.air.forEach(w => {
      if (w.side !== 'ROC' || w.base !== h.place.name || w.n <= 0) return;
      const shelter = w.mission === 'rest' ? 0.35 : 1;
      const lost = Math.min(w.n, Math.round(leak * 0.16 * shelter * (h.place.hardened ? 0.4 : 1)));
      if (lost > 0){
        w.n -= lost;
        ev.push({ t:'boom', c:h.c, r:h.r, cls:'c-warn',
          txt:'　└ ' + w.name + ' 於地面損失 ' + lost + ' 架。' });
      }
    });
  } else {
    const u = S.units.find(x => x.id === tgt.uid);
    if (!u || u.dead) return;
    const d = leak * rec.dmg * TW.B.MISSILE_UNIT_DMG * 0.6 * (1 + S.mod.missileUnit);
    u.hp -= d;
    u.org -= d * 2.2;
    if (u.hp <= 0){ TW.killUnit(u, ev); }
    else ev.push({ t:'boom', c:u.c, r:u.r, cls:'c-warn', dmg:d, side:u.side,
      txt:'　└ ' + u.name + ' 遭飛彈打擊，兵力 −' + d.toFixed(1) + '。' });
  }
},

/* 我方距外打擊：用手上的巡弋飛彈打對岸集結港口 */
rocCounterStrike(ev){
  const S = TW.S;
  let power = 0;
  S.units.forEach(u => { if (!u.dead && u.side === 'ROC') power += TW.equipMod(u, 'strike'); });
  for (const k in S.stock) power += (TW.EQUIP[k].mod.strike || 0) * S.stock[k] * 0.5;
  if (power <= 0) return;

  const ports = TW.PLACES.filter(p => p.side === 'PLA' && p.staging);
  if (!ports.length) return;
  const t = ports[Math.floor(Math.random() * ports.length)];
  const h = TW.hexAt(t.c, t.r);
  const eff = power * (0.6 + Math.random() * 0.6) * 0.012;

  h.damage = TW.clamp(h.damage + eff, 0, 0.9);
  S.plaLiftPenalty = (S.plaLiftPenalty || 0) + eff * 0.5;
  S.plaWill -= eff * 6;

  ev.push({ t:'strike', c:t.c, r:t.r, cls:'c-roc', fc:15, fr:t.r, cruise:true,
    txt:'國軍距外打擊：巡弋飛彈命中 ' + t.name + ' 港區，共軍裝載作業受阻（−' +
        Math.round(eff * 100) + '%）。' });
},

/* ======================= 砲 兵 轟 擊 階 段 =======================
   砲指部、雷霆 2000、海馬斯這類部隊不必貼著敵人，
   可以隔著幾格直接打陸上部隊、灘外的舟波、甚至對岸的港口。
   =============================================================== */
artilleryPhase(ev){
  const S = TW.S;
  const shooters = S.units.filter(u => !u.dead && u.order && u.order.type === 'bomb');

  shooters.forEach(u => {
    const o = u.order;
    u.order = null;
    if (u.dead || !o) return;

    const h = TW.hexAt(o.tc, o.tr);
    if (!h) return;
    const d = TW.Hex.distance(u.c, u.r, o.tc, o.tr);
    const rng = TW.unitRange(u);
    if (d < 1 || d > rng) return;

    if (u.supply < 0.12){
      if (u.side === 'ROC')
        ev.push({ t:'log', cls:'c-warn', txt:u.name + ' 彈藥不足，無法執行火力任務。' });
      return;
    }
    if (u.org < u.maxOrg * 0.15) return;

    /* 距離衰減：打到最大射程威力會掉很多 */
    const fall = Math.max(1 - TW.B.BOMBARD_FALLOFF,
                          1 - (d - 1) / Math.max(1, rng) * TW.B.BOMBARD_FALLOFF);

    const soft = TW.stat(u, 'soft') * (1 + S.mod.soft / 40);
    const hard = TW.stat(u, 'hard');
    const pierce = TW.stat(u, 'pierce');
    const foe = u.side === 'ROC' ? 'PLA' : 'ROC';

    u.org -= TW.B.BOMBARD_ORG_COST;
    if (u.side === 'ROC') TW.Env.spend(TW.B.AMMO_ARTY_SHOT);
    u.entrench = Math.max(0, u.entrench - 0.15);   // 射擊會暴露陣地
    u.firedThisTurn = true;   // 本回合已用掉火力，不再重複算成鄰接支援

    const targets = TW.unitsAt(o.tc, o.tr).filter(x => x.side === foe);
    const fleets  = TW.navyAt(o.tc, o.tr).filter(f => f.side === foe);

    /* --- 打陸上部隊 --- */
    if (targets.length){
      ev.push({ t:'missile', c:o.tc, r:o.tr, cls: u.side === 'ROC' ? 'c-roc' : 'c-pla',
        fc:u.c, fr:u.r, arty:true, side:u.side,
        txt:'【火力任務】' + u.name + ' 對 ' + TW.hexName(h) + ' 實施 ' + d + ' 格外遠程轟擊。' });

      targets.forEach(D => {
        const dArmor = TW.stat(D, 'armor');
        const hardShare = dArmor / (dArmor + 12);
        const pf = pierce >= dArmor ? 1
          : TW.B.PIERCE_PENALTY + (pierce / Math.max(1, dArmor)) * (1 - TW.B.PIERCE_PENALTY);
        const fire = (soft * (1 - hardShare) + hard * hardShare * pf) * fall / targets.length;

        /* 砲擊對付築壘與地形的效果比正面突擊差 */
        let prot = Math.min(TW.B.TERRAIN_MAX_DEF, TW.hexDef(h)) * (1 + Math.min(TW.B.ENTRENCH_MAX, D.entrench) * 1.4);
        const dmg = TW.B.BASE_DAMAGE * TW.B.BOMBARD_DAMAGE * fire / Math.max(0.4, prot) *
                    (0.7 + Math.random() * 0.6);
        D.hp -= dmg;
        D.org -= dmg * TW.B.ORG_DAMAGE_MULT * 0.8;
        D.fought = true;
        ev.push({ t:'boom', c:o.tc, r:o.tr, cls:'', dmg:dmg, side:D.side, small:true,
          txt:'　└ ' + D.name + ' 兵力 −' + dmg.toFixed(1) + '　組織 −' +
              (dmg * TW.B.ORG_DAMAGE_MULT * 0.8).toFixed(1) });
        if (D.hp <= 0 || D.org <= D.maxOrg * TW.B.ORG_BREAK) this.breakUnit(D, h, ev);
      });
    }

    /* --- 打灘外／航道上的船團 --- */
    else if (fleets.length){
      fleets.sort((a, b) => TW.fleetStats(b).lift - TW.fleetStats(a).lift);
      const b = fleets[0];
      const sb = TW.fleetStats(b);
      let p = (soft * 0.35 + hard * 0.5) * fall * TW.B.BOMBARD_NAVAL;
      p *= (1 - TW.B.NAVAL_CIWS * 0.5 * (sb.aa / (sb.aa + 30)));
      if (b.ships.some(s => s.N.fragile)) p *= 1.4;
      TW.damageFleet(b, p, ev);
      ev.push({ t:'naval', c:u.c, r:u.r, c2:o.tc, r2:o.tr,
        cls: u.side === 'ROC' ? 'c-roc' : 'c-pla',
        txt:'【火力任務】' + u.name + ' 對海面舟波實施火箭覆蓋，' + b.name +
            ' 損傷 ' + Math.round(p) + ' 點。' });
    }

    /* --- 打港口／機場等設施（例如 ATACMS 打對岸集結港） --- */
    else if (h.place && h.owner === foe){
      const eff = (soft + hard) * fall * 0.0022;
      h.damage = TW.clamp(h.damage + eff, 0, 0.95);
      if (foe === 'PLA' && h.place.staging) S.plaLiftPenalty = (S.plaLiftPenalty || 0) + eff * 0.6;
      ev.push({ t:'strike', c:o.tc, r:o.tr, cls: u.side === 'ROC' ? 'c-roc' : 'c-pla',
        fc:u.c, fr:u.r, arty:true, side:u.side,
        txt:'【火力任務】' + u.name + ' 遠程打擊 ' + h.place.name + '，可用率降至 ' +
            Math.round((1 - h.damage) * 100) + '%。' });
    } else return;

    /* --- 反砲兵：開火就會暴露 --- */
    if (Math.random() < TW.B.COUNTER_BATTERY){
      const cb = S.units.filter(x => !x.dead && x.side === foe && TW.canBombard(x) &&
        TW.Hex.distance(x.c, x.r, u.c, u.r) <= TW.unitRange(x));
      if (cb.length){
        const g = cb[0];
        const dmg = TW.stat(g, 'soft') * 0.035 * (0.6 + Math.random() * 0.8);
        u.hp -= dmg; u.org -= dmg * 2.5;
        ev.push({ t:'boom', c:u.c, r:u.r, cls: u.side === 'ROC' ? 'c-pla' : 'c-ok',
          txt:'　└ 遭 ' + g.name + ' 反砲兵射擊，' + u.name + ' 兵力 −' + dmg.toFixed(1) + '。' });
        if (u.hp <= 0) TW.killUnit(u, ev);
      }
    }
  });
},

/* ======================= 空 戰 階 段 ======================= */
airPhase(ev){
  const S = TW.S;
  /* 夜間與低能見度會直接壓低出動架次 */
  const sortie = (TW.B.AIR_SORTIE_RATE + S.mod.sortieRate) * TW.Env.airFactor();

  TW.ZONES.forEach(z => {
    const roc = S.air.filter(w => !w.dead && w.n > 0 && w.side === 'ROC' && w.zone === z.id && w.mission !== 'rest');
    const pla = S.air.filter(w => !w.dead && w.n > 0 && w.side === 'PLA' && w.zone === z.id && w.mission !== 'rest');
    if (!roc.length || !pla.length) return;

    const pw = w => TW.airStat(w, 'air') * w.n * sortie * (w.mission === 'cap' ? 1 : 0.35) * TW.wingReady(w);
    const rp = roc.reduce((s, w) => s + pw(w), 0);
    const pp = pla.reduce((s, w) => s + pw(w), 0);
    if (rp + pp < 1) return;

    const rLoss = this.airLosses(pla, roc, pp, rp, ev, z);
    const pLoss = this.airLosses(roc, pla, rp, pp, ev, z);

    if (rLoss + pLoss > 0){
      const nm = ws => ws.slice(0, 3).map(w => w.name + '(' + Math.round(w.n) + ')').join('、') +
                       (ws.length > 3 ? ' 等' + ws.length + '個單位' : '');
      const za = TW.ZONE_REF[z.id] || [15, 11];
      ev.push({ t:'air', zone:z.id, cls:'c-warn', c:za[0], r:za[1], dogfight:true,
        rLoss, pLoss, rN:roc.reduce((s2, w) => s2 + w.n, 0), pN:pla.reduce((s2, w) => s2 + w.n, 0),
        txt:'【' + z.name + '】空戰：我方 ' + nm(roc) + '　對　共軍 ' + nm(pla) });
      ev.push({ t:'air', zone:z.id, cls:'',
        txt:'　└ 我方損失 ' + rLoss + ' 架，擊落共軍 ' + pLoss + ' 架。' });
      S.stats.planesShot += pLoss;
    }
  });

  /* 出動架次消耗彈藥：精準彈藥不是無限的 */
  S.air.forEach(w => {
    if (w.dead || w.n <= 0 || w.side !== 'ROC' || w.mission === 'rest') return;
    TW.Env.spend(w.n * sortie * TW.B.AMMO_AIR_SORTIE * TW.wingReady(w));
  });

  /* 壓制敵防空 */
  S.air.forEach(w => {
    if (w.dead || w.n <= 0 || w.mission !== 'sead') return;
    const foe = w.side === 'ROC' ? 'PLA' : 'ROC';
    const cands = S.units.filter(u => !u.dead && u.side === foe && u.cls === 'aa');
    if (!cands.length) return;
    const t = cands[Math.floor(Math.random() * cands.length)];
    const d = TW.airStat(w, 'sead') * w.n * 0.006 * (1 + TW.S.mod.ew / 100);
    t.org -= d * 3; t.hp -= d;
    const bp6 = TW.PLACES.find(x => x.name === w.base);
    ev.push({ t:'strike', c:t.c, r:t.r, cls: w.side === 'ROC' ? 'c-roc' : 'c-pla', jets:true, side:w.side,
      fc: bp6 ? bp6.c : undefined, fr: bp6 ? bp6.r : undefined,
      txt: w.name + ' 執行壓制任務，' + t.name + ' 雷達車受損。' });
    if (t.hp <= 0) TW.killUnit(t, ev);
  });

  /* 縱深打擊：打港口／機場 */
  S.air.forEach(w => {
    if (w.dead || w.n <= 0 || w.mission !== 'strike') return;
    const foe = w.side === 'ROC' ? 'PLA' : 'ROC';
    const cands = TW.S.hexes.filter(h => h.place && h.owner === foe && h.damage < 0.9 &&
      (h.place.type.includes('airbase') || h.place.type.includes('port') ||
       h.place.type.includes('power')));
    if (!cands.length) return;
    const h = cands[Math.floor(Math.random() * cands.length)];
    const air = S.zoneAir[h.zone] * (w.side === 'ROC' ? 1 : -1);
    const d = TW.airStat(w, 'strike') * w.n * 0.0016 * (1 + air * 0.6);
    if (d <= 0) return;
    h.damage = TW.clamp(h.damage + d, 0, 0.95);
    const bp7 = TW.PLACES.find(x => x.name === w.base);
    ev.push({ t:'strike', c:h.c, r:h.r, cls: w.side === 'ROC' ? 'c-roc' : 'c-pla', jets:true, side:w.side,
      fc: bp7 ? bp7.c : undefined, fr: bp7 ? bp7.r : undefined,
      txt: w.name + ' 空襲 ' + h.place.name + '，設施可用率降至 ' + Math.round((1 - h.damage) * 100) + '%。' });
  });

  /* 機場搶修 */
  S.hexes.forEach(h => {
    if (!h.place || h.damage <= 0) return;
    const rate = (h.owner === 'ROC') ? (TW.B.AIRFIELD_REPAIR + S.mod.airfieldRepair) : 0.18;
    h.damage = Math.max(0, h.damage - rate);
  });
},

airLosses(attackers, defenders, ap, dp, ev, z){
  const S = TW.S;
  let total = 0;
  const share = ap / (ap + dp + 1);
  defenders.forEach(w => {
    let rate = TW.B.AIR_KILL_RATE * share * 2;
    rate *= (30 / ((TW.airStat(w, 'def') || 20) + 10));
    if (w.A.stealth) rate *= 0.45;
    if (w.side === 'PLA') rate *= (1 + (S.plaAirPenalty || 0));
    const lost = Math.min(w.n, Math.round(w.n * rate * (0.6 + Math.random() * 0.8)));
    w.n -= lost; total += lost;
    if (w.n <= 0){ w.dead = true;
      ev.push({ t:'air', zone:z.id, cls: w.side === 'ROC' ? 'c-pla' : 'c-ok',
        txt:'　└ ' + w.name + ' 已無可用機，退出戰鬥序列。' }); }
  });
  return total;
},

/* 反艦、反潛這種海上任務要到「海域」去找目標。
   以前是硬比對 w.zone === 該艦所在空域，而反潛機的預設空域是陸地上空
   （ZS 之類），海上永遠不會有船在那裡——結果 P-3C、乃至任何被派在
   本島空域卻掛反艦任務的聯隊，全都在空轉。
   這些都是航程數百公里的海上巡邏機，本來就該涵蓋整個海峽。 */
navalTargetsFor(w, foeSide, needSub){
  const S = TW.S;
  const ok = f => !f.dead && f.side === foeSide &&
    !TW.fleetHidden(f, w.side) &&
    (!needSub ? true : TW.isSub(f));
  const inZone = S.navy.filter(f => ok(f) && TW.hexAt(f.c, f.r).zone === w.zone);
  if (inZone.length) return inZone;
  /* 指派空域裡沒有目標，就到各海域去找 */
  return S.navy.filter(f => ok(f) && (TW.hexAt(f.c, f.r).T || {}).sea);
},

/* ======================= 海 戰 階 段 ======================= */
navalPhase(ev){
  const S = TW.S;

  /* --- 水面交戰：同格或相鄰的敵對艦隊 --- */
  const fleets = S.navy.filter(f => !f.dead);
  for (const a of fleets){
    if (a.dead || a.mission === 'evade' || a.mission === 'repair') continue;
    /* 找不到的潛艦不能當目標——這是潛艦最大的價值 */
    const foes = fleets.filter(b => !b.dead && b.side !== a.side &&
      !TW.fleetHidden(b, a.side) &&
      TW.Hex.distance(a.c, a.r, b.c, b.r) <= (a.mission === 'strike' ? 3 : 1));
    if (!foes.length) continue;

    /* 優先打登陸船團 */
    foes.sort((x, y) => (TW.fleetStats(y).lift - TW.fleetStats(x).lift));
    const b = foes[0];
    const sa = TW.fleetStats(a), sb = TW.fleetStats(b);

    const sub  = a.ships.some(s => s.N.sub);   // 攻擊方是潛艦
    const tSub = b.ships.some(s => s.N.sub);   // 被攻擊方是潛艦

    let hit = sa.asuw * TW.B.NAVAL_HIT_RATE * (a.hp / a.maxHp) * TW.Env.seaFactor();

    if (tSub){
      /* 打潛艦要靠反潛。原本這裡拿「防空值」當防禦、而且完全沒用到 asw，
         等於一支毫無反潛能力的編隊也打得到潛艦——那是不對的。
         現在：反潛能力決定你找不找得到它，找不到就幾乎打不動。 */
      const detect = sa.asw / (sa.asw + TW.B.ASW_K);
      hit *= TW.B.SUB_STEALTH + (TW.B.ASW_MAX_DETECT - TW.B.SUB_STEALTH) * detect * 1.25;
      if (sa.asw <= 0) hit *= 0.25;          // 連拖曳陣列都沒有，只能亂丟深水炸彈
    } else if (sub){
      /* 潛艦用魚雷，近迫防禦系統攔不到；能對抗的是護航艦的反潛屏衛。 */
      hit *= 1.6;
      hit *= 1 - 0.55 * (sb.asw / (sb.asw + TW.B.ASW_K));
    } else {
      /* 水面對水面：反艦飛彈，這時候近迫防禦與區域防空才有意義 */
      hit *= (1 - TW.B.NAVAL_CIWS * (sb.aa / (sb.aa + 30)));
    }

    if (b.ships.some(s => s.N.fragile)) hit *= 1.5;       // 民用船團極脆弱
    const air = S.zoneAir[TW.hexAt(a.c, a.r).zone] * (a.side === 'ROC' ? 1 : -1);
    hit *= 1 + air * 0.35;

    const dmg = hit * TW.B.ASHM_DAMAGE * 0.06 * (0.7 + Math.random() * 0.6);
    if (dmg > 0.5){
      /* 開火就會暴露：魚雷航跡與飛彈發射位置藏不住 */
      if (sub) a.exposed = TW.B.SUB_EXPOSE_ATTACK;
      TW.damageFleet(b, dmg, ev);
      ev.push({ t:'naval', c:a.c, r:a.r, c2:b.c, r2:b.r, sub:sub,
        cls: a.side === 'ROC' ? 'c-roc' : 'c-pla',
        txt:(sub ? '【潛艦攻擊】' : '【海上接戰】') + a.name + ' → ' + b.name +
            '，命中造成 ' + Math.round(dmg) + ' 點損傷。' });
    }
  }

  /* --- 岸置反艦飛彈 --- */
  S.units.forEach(u => {
    if (u.dead || u.side !== 'ROC' || !u.T.ashm || u.org < u.maxOrg * 0.2) return;
    const foes = S.navy.filter(f => !f.dead && f.side === 'PLA' &&
      !TW.fleetHidden(f, 'ROC') &&
      TW.Hex.distance(u.c, u.r, f.c, f.r) <= TW.B.ASM_COAST_RANGE);
    if (!foes.length) return;
    foes.sort((x, y) => TW.fleetStats(y).lift - TW.fleetStats(x).lift);
    const b = foes[0];
    const sb = TW.fleetStats(b);
    let p = TW.stat(u, 'ashm') * (1 + S.mod.ashm / 25);
    p *= (1 - TW.B.NAVAL_CIWS * (sb.aa / (sb.aa + 30)));
    const dmg = p * TW.B.COAST_ASM_DAMAGE * (0.7 + Math.random() * 0.6);
    TW.Env.spend(TW.B.AMMO_NAVAL_SALVO);
    u.org -= 4;
    TW.damageFleet(b, dmg, ev);
    ev.push({ t:'naval', c:u.c, r:u.r, c2:b.c, r2:b.r, cls:'c-roc',
      txt:'【岸置反艦】' + u.name + ' 齊射，命中 ' + b.name + '，' + Math.round(dmg) + ' 點損傷。' });
  });

  /* --- 空中反潛：P-3C 這種東西存在就是為了獵潛，
         以前它的 asw 完全沒有用到，等於只是一架很貴的偵察機。 --- */
  S.air.forEach(w => {
    if (w.dead || w.n <= 0 || w.mission === 'rest') return;
    const A = TW.airStat(w, 'asw');
    if (!A) return;
    const foe = w.side === 'ROC' ? 'PLA' : 'ROC';
    const subs = this.navalTargetsFor(w, foe, true);
    if (!subs.length) return;
    const b = subs[0];
    const dmg = A * w.n * 0.02 * TW.wingReady(w) * TW.Env.airFactor() *
                (0.7 + Math.random() * 0.6);
    if (dmg < 0.5) return;
    TW.damageFleet(b, dmg, ev);
    ev.push({ t:'naval', c:b.c, r:b.r, c2:b.c, r2:b.r, asw:true,
      cls: w.side === 'ROC' ? 'c-roc' : 'c-pla',
      txt:'【空中反潛】' + w.name + ' 於' + (TW.ZONES.find(z => z.id === w.zone) || {}).name +
          '獵殺 ' + b.name + '，造成 ' + Math.round(dmg) + ' 點損傷。' });
  });

  /* --- 空中反艦 --- */
  S.air.forEach(w => {
    if (w.dead || w.n <= 0 || w.mission !== 'ashm') return;
    const foe = w.side === 'ROC' ? 'PLA' : 'ROC';
    const foes = this.navalTargetsFor(w, foe, false);
    if (!foes.length) return;
    foes.sort((x, y) => TW.fleetStats(y).lift - TW.fleetStats(x).lift);
    const b = foes[0], sb = TW.fleetStats(b);
    const air = S.zoneAir[TW.hexAt(b.c, b.r).zone] * (w.side === 'ROC' ? 1 : -1);
    let p = TW.airStat(w, 'ashm') * w.n * TW.B.AIR_ASM_DAMAGE * (1 + air * 0.5) * TW.wingReady(w);
    p *= (1 - TW.B.NAVAL_CIWS * (sb.aa / (sb.aa + 30)));
    if (p < 0.5) return;
    TW.damageFleet(b, p, ev);
    const bp8 = TW.PLACES.find(x => x.name === w.base);
    ev.push({ t:'naval', c: bp8 ? bp8.c : b.c, r: bp8 ? bp8.r : b.r, c2:b.c, r2:b.r, airAshm:true,
      cls: w.side === 'ROC' ? 'c-roc' : 'c-pla',
      txt:'【空中反艦】' + w.name + ' 對 ' + b.name + ' 發射反艦飛彈，' + Math.round(p) + ' 點損傷。' });
  });

  /* --- 水雷 --- */
  S.navy.forEach(f => {
    if (f.dead || f.side !== 'PLA') return;
    /* 這回合穿過的每一格都要算，不是只看停下來的那一格——
       艦艇改成現實航速後一回合會開過二、三十格，只看終點的話雷區形同虛設 */
    const seen = {};
    const route = (f.passed || []).concat([[f.c, f.r]]);
    for (const [c, r] of route){
      const k = c + ',' + r;
      if (seen[k]) continue; seen[k] = 1;
      const h = TW.hexAt(c, r);
      if (!h || h.mines <= 0) continue;

      /* 逐艘判定：船越多、雷越密，觸雷的船越多 */
      const live = f.ships.filter(x => x.n > 0);
      const nShips = live.reduce((a2, x) => a2 + x.n, 0);
      if (!nShips) break;
      const lambda = nShips * h.mines * TW.B.MINE_HIT_PER_SHIP;
      let hits = Math.floor(lambda) + (Math.random() < lambda - Math.floor(lambda) ? 1 : 0);
      hits = Math.min(hits, nShips);
      if (hits <= 0) continue;

      let dmg = 0;
      for (let i = 0; i < hits; i++){
        /* 挑中哪一種船：依艘數加權 */
        let pick = Math.random() * nShips, slot = live[0];
        for (const x of live){ pick -= x.n; if (pick < 0){ slot = x; break; } }
        const hp = slot.N.hp;
        const sev = hp >= 100 ? TW.B.MINE_SEV_LARGE : (hp >= 60 ? TW.B.MINE_SEV_MID : TW.B.MINE_SEV_SMALL);
        dmg += hp * sev * (1 + S.mod.mineDamage);
      }
      h.mines = Math.max(0, h.mines - hits * TW.B.MINE_DEPLETE_PER_HIT);
      h.plaKnows = true;                      // 炸過一次，共軍就知道這裡有雷
      TW.damageFleet(f, dmg, ev);
      ev.push({ t:'mine', c, r, cls:'c-roc',
        txt:'【水雷】' + f.name + ' 航經雷區（' + c + ',' + r + '），' +
            hits + ' 艘觸雷，' + Math.round(dmg) + ' 點損傷。' });
      if (f.dead) break;
    }
  });

  /* --- 共軍掃雷 ---
     共軍護航編隊裡編有掃雷艦（081、082II 型），會在船團前方掃雷。
     被掃過的雷區共軍就知道位置了。潛艦、兩棲艦、滾裝船不會掃雷。 */
  S.navy.forEach(f => {
    if (f.dead || f.side !== 'PLA' || TW.isSub(f)) return;
    const st = TW.fleetStats(f);
    if (st.lift > 0 || st.carrier > 0) return;
    const cells = [[f.c, f.r]].concat(TW.Hex.neighbors(f.c, f.r));
    let swept = 0;
    cells.forEach(([c, r]) => {
      const x = TW.hexAt(c, r);
      if (!x || x.t !== '.' || x.mines <= 0) return;
      x.plaKnows = true;
      const before = x.mines;
      x.mines = Math.max(0, x.mines - TW.B.PLA_MCM_SWEEP * (TW.B.DIFF_MCM || 1) * (f.hp / f.maxHp));
      swept += before - x.mines;
    });
    if (swept >= 0.1)
      ev.push({ t:'log', cls:'c-warn',
        txt:'【掃雷】共軍 ' + f.name + ' 在 (' + f.c + ',' + f.r + ') 附近掃雷，' +
            '周圍雷區密度共下降 ' + swept.toFixed(2) + '。' });
  });

  /* --- 布雷 ---
     布得了幾格由艦型決定：快速布雷艇一艘就能拉出一條，
     潛艦與玉山級量少，一般作戰艦根本沒有布雷裝備。 */
  S.navy.forEach(f => {
    if (f.dead || f.mission !== 'mine' || f.side !== 'ROC') return;

    const rate = TW.fleetStats(f).mine;
    /* 「根本沒有布雷裝備」和「有裝備但被打殘了」是兩回事，訊息不能混在一起 */
    if (rate < 0.5){
      if (!f.mineWarned){
        f.mineWarned = true;
        ev.push({ t:'log', cls:'c-warn',
          txt:'【佈雷】' + f.name + ' 沒有布雷裝備（現代作戰艦沒有布雷軌），無法執行佈雷任務。' +
              '　布雷要交給快速布雷艇、潛艦或玉山級。' });
      }
      return;
    }
    f.mineWarned = false;

    const cap = rate * (f.hp / f.maxHp);
    let slots = Math.floor(cap);
    if (Math.random() < cap - slots) slots++;      // 零頭用機率處理
    if (slots < 1){
      ev.push({ t:'log', cls:'c-warn',
        txt:'【佈雷】' + f.name + ' 戰損過重，本回合布不了雷。先回港整補。' });
      return;
    }

    /* 灘頭外海的候選格。相鄰灘頭會共用海面，所以要去重，
       否則「布五格」可能是同一格布五次。 */
    const seen = {};
    const spots = TW.BEACHES.map(b => TW.hexAt(b.c, b.r))
      .flatMap(h => TW.Hex.neighbors(h.c, h.r).map(([c, r]) => TW.hexAt(c, r)))
      .filter(h => {
        if (!h || h.t !== '.' || h.mines >= 1.2) return false;
        const k = h.c + ',' + h.r;
        if (seen[k]) return false;
        seen[k] = 1; return true;
      })
      .sort((a, b) => TW.Hex.distance(f.c, f.r, a.c, a.r) - TW.Hex.distance(f.c, f.r, b.c, b.r));
    if (!spots.length) return;

    const done = [];
    for (let i = 0; i < slots && i < spots.length; i++){
      const h = spots[i];
      /* 庫存越多，一次佈得越密；佈完要從庫存扣掉——水雷是消耗品 */
      const use = Math.min(S.stock.seamine || 0, 1);
      const amt = 0.35 + use * 0.55;
      h.mines = Math.min(1.5, h.mines + amt);
      if (use > 0) S.stock.seamine = Math.max(0, (S.stock.seamine || 0) - use);
      done.push({ h, amt });
      ev.push({ t:'mine', c:h.c, r:h.r, cls:'c-roc', txt:null });
    }
    if (!done.length) return;

    ev.push({ t:'log', cls:'c-roc',
      txt:'【佈雷】' + f.name + ' 於灘外航道布設 ' + done.length + ' 處雷區（' +
          done.map(d => TW.hexName(d.h) + ' 密度 ' + d.h.mines.toFixed(2)).join('、') + '）。' +
          '　餘智慧水雷 ' + Math.floor(S.stock.seamine || 0) + ' 批。' +
          (TW.isSub(f) ? '　潛艦由魚雷管布放，未暴露位置。' : '') });
  });
},

/* ======================= 登 陸 階 段 =======================
   兩棲登陸是整場戰爭最複雜、也最不對稱的一段。這裡照著真實的流程走：

     1. 看海象決定今天能不能作業
     2. 算共軍手上還有多少「船」（載運量來自實際存活的兩棲艦艇）
     3. 決定在哪幾處灘頭上陸——有船就可以多點同時上
     4. **船團先渡海**：岸置反艦飛彈、雷區、我方海空兵力在這裡打船團。
        打掉的是「船」，不是「人」——載具沉了，上面的部隊也一起沒了，
        而且那條船以後都不會再出現。這是台灣防衛作戰真正的重心。
     5. 活著到灘岸的舟波才上陸，再吃一次搶灘損失
     6. 守軍立刻接戰

   波次也分了：**第一波只能是陸戰隊、兩棲旅、輕型合成旅**——
   重型合成旅和砲兵不可能直接從船上衝下來搶灘，
   他們要等灘頭站穩（或拿下港口）才卸得下來。
   ============================================================ */
landingPhase(ev){
  const S = TW.S;
  if (S.turn < TW.B.AI_LANDING_TURN) return;
  if (!TW.Env.canLand()){
    const sea = TW.Env.SEA[(S.wx && S.wx.sea) || 2];
    ev.push({ t:'log', cls:'c-ok',
      txt:'海況 ' + sea.lv + ' 級（' + sea.name + '，浪高 ' + sea.wave +
          '），共軍兩棲載具無法作業，登陸行動延後。' });
    return;
  }
  if (!S.plaPool.filter(u => !u.airborne).length) return;

  /* ---- 只有「真的開到灘頭外海、而且艙裡有兵」的船團才能卸載 ----
     以前這裡把全地圖所有兩棲船團的載運量加總，然後直接把部隊放到灘頭，
     船根本不必開到那裡——實測七成的搶灘，最近的船團離灘頭超過兩格，
     最遠十三格（195 公里）。部隊等於是瞬移上岸的。 */
  const R = TW.B.LANDING_FLEET_RANGE;
  const ready = S.navy.filter(f => !f.dead && f.side === 'PLA' &&
    TW.fleetStats(f).lift > 0 && !f.empty && !(f.reload > 0) && TW.fleetLoad(f) >= 1);
  if (!ready.length){
    const any = S.navy.some(f => !f.dead && f.side === 'PLA' && TW.fleetStats(f).lift > 0);
    if (!any && S.stats.landings > 0 && S.turn % 4 === 0)
      ev.push({ t:'log', cls:'c-ok',
        txt:'【海運癱瘓】共軍兩棲艦艇損失過重，無法組織新的登陸梯隊。' });
    return;
  }

  /* ---- 船團所在位置旁邊，有哪些上得去的地方 ---- */
  const spots = [];
  const addSpot = h => {
    if (!h || spots.some(x => x.h === h)) return;
    const near = ready.filter(f => TW.Hex.distance(f.c, f.r, h.c, h.r) <= R);
    if (near.length) spots.push({ h, near });
  };
  TW.BEACHES.forEach(b => {
    const h = TW.hexAt(b.c, b.r);
    if (!h) return;
    if (h.owner === 'ROC' || (h.beachhead && h.owner === 'PLA')) addSpot(h);
  });
  /* 已經落入共軍手中、碼頭還能用的港口，也能直接靠泊卸載 */
  S.hexes.forEach(h => {
    if (h.owner !== 'PLA' || !h.place || h.T.prc) return;
    if (!h.place.type.includes('port') && !h.place.type.includes('navalbase')) return;
    if (h.damage >= TW.B.PORT_UNUSABLE) return;
    addSpot(h);
  });
  if (!spots.length) return;

  /* 已經站穩的灘頭優先擴大，其次是船團載運量最多的地方 */
  const liftOf = fs => fs.reduce((a, f) => a + TW.fleetLoad(f), 0);
  spots.sort((a, b) => ((b.h.beachhead ? 100 : 0) + liftOf(b.near)) -
                       ((a.h.beachhead ? 100 : 0) + liftOf(a.near)));

  const used = new Set();
  let beaches = 0;
  /* 風平浪靜的日子登陸艇來回得快，可以同時多開一處灘頭 */
  const maxBeaches = TW.B.LANDING_MAX_BEACHES + (TW.Env.liftSurge() > 1.3 ? 1 : 0);
  for (const sp of spots){
    if (beaches >= maxBeaches) break;
    const fleets = sp.near.filter(f => !used.has(f));
    if (!fleets.length) continue;
    /* 艙裡實際載了幾個旅。集結港被打的懲罰在裝載時就扣過了（ai.js） */
    const lift = liftOf(fleets);
    if (lift < 1) continue;
    const went = this.assaultBeach(sp.h, Math.floor(lift), ev, fleets);
    if (went){ fleets.forEach(f => used.add(f)); beaches++; }
  }
},

/* 在單一灘頭發起一次兩棲突擊，回傳實際用掉的載運量 */
assaultBeach(h, budget, ev, fleets){
  const S = TW.S;
  const seaCtl = S.zoneSea[TW.seaZoneAt(h.c, h.r)] || 0;   // 正 = 我方制海
  const airCtl = S.zoneAir[h.zone] || 0;
  const established = h.beachhead && h.beachhead.turns >= 1;

  /* 有港口在共軍手上，重裝備才卸得下來 */
  /* 共軍手上有沒有一座「能用的」港口。
     剛靠裡應外合奪下的港口不算——滾裝船得先開過來靠泊，那要幾天。 */
  const portHeld = S.hexes.some(x => {
    if (x.owner !== 'PLA' || !x.place || x.T.prc) return false;
    if (!x.place.type.includes('port') && !x.place.type.includes('navalbase')) return false;
    /* 剛靠裡應外合奪下的港口不算——滾裝船得先開過來靠泊，那要幾天 */
    if (x.fifthColumn && S.turn - (x.seizedTurn || 0) < TW.B.FIFTH_PORT_DELAY) return false;
    /* 碼頭與吊掛設施被打爛的港口卸不了戰車。
       守不住就把它炸掉，是各國都會做的事——這也是玩家最有效的反制：
       港口丟了不要緊，繼續砲擊它，讓共軍用不了。 */
    if (x.damage >= TW.B.PORT_UNUSABLE) return false;
    return true;
  });
  const cap = portHeld ? TW.B.BEACHHEAD_PORT_CAP : TW.B.BEACHHEAD_SUPPLY_CAP;
  const here = TW.unitsAt(h.c, h.r).filter(u => u.side === 'PLA').length;
  if (here >= cap) return 0;

  /* ---- 挑得出來的梯隊：第一波只有能自己泅渡上岸的部隊 ---- */
  const canAssault = u => {
    const c = u.T.cls;
    if (c === 'marine' || c === 'amphib') return true;          // 陸戰隊、兩棲旅
    if (c === 'inf' && !u.T.heavy) return true;                 // 輕型合成旅
    return established || portHeld;                             // 其餘要等灘頭或港口
  };
  const pool = S.plaPool.filter(u => !u.airborne && canAssault(u));
  if (!pool.length){
    if (!established && S.turn % 4 === 0)
      ev.push({ t:'log', cls:'c-ok',
        txt:'共軍的重裝旅無法直接搶灘，正在等待灘頭鞏固或港口易手。' });
    return 0;
  }

  let n = Math.min(pool.length, budget, cap - here);
  if (n <= 0) return 0;
  let spent = 0;                         // 這一波從艙裡卸掉（或隨船沉掉）幾個旅

  /* ================= 渡海：船團先挨打 =================
     這是「打船不打人」——岸置反艦飛彈、雷區、我方海空兵力打的是載具。
     載具沉了，上面的旅跟著沉，而且那些船不會再回來。 */
  let raw = 0, shooters = 0;

  /* 射程涵蓋這片外海的岸置反艦部隊 */
  S.units.forEach(u => {
    if (u.dead || u.side !== 'ROC' || u.cls !== 'ssm') return;
    if (TW.Hex.distance(u.c, u.r, h.c, h.r) > TW.B.ASM_COAST_RANGE) return;
    if (u.supply < TW.B.SUPPLY_MIN_COMBAT || u.org < u.maxOrg * 0.2) return;
    raw += TW.stat(u, 'ashm') * (u.hp / u.maxHp);
    shooters++;
    u.org -= 5;
    TW.Env.spend(TW.B.AMMO_NAVAL_SALVO);
  });
  /* 雷布在灘頭外海的海面格上，不在灘頭那一格——
     以前這裡讀灘頭本身的 h.mines，永遠是 0，雷區從來沒擋過任何一次登陸 */
  const beachMines = TW.seaMinesNear(h);
  let gauntlet = raw * TW.B.GAUNTLET_ASM + beachMines * TW.B.GAUNTLET_MINE;

  /* 護航艦隊的區域防空：052D、054A 就是為了擋這一波而存在的。
     算灘頭外海三格內所有共軍艦隊的防空值。 */
  if (shooters > 0){
    let escortAA = 0;
    S.navy.forEach(f => {
      if (f.dead || f.side !== 'PLA') return;
      if (TW.Hex.distance(f.c, f.r, h.c, h.r) > 3) return;
      escortAA += TW.fleetStats(f).aa * (f.hp / f.maxHp);
    });
    const leak = 1 - TW.B.GAUNTLET_ESCORT * (escortAA / (escortAA + TW.B.GAUNTLET_ESCORT_K));
    gauntlet *= Math.max(0.15, leak);

    /* 共軍制空的時候會回頭獵殺岸置發射車，飛彈打不出去那麼多 */
    gauntlet *= 1 - Math.max(0, -airCtl) * TW.B.GAUNTLET_SUPPRESS;
  }

  /* 我方掌握制空、制海的話，攔截效果會加成 */
  gauntlet *= 1 + Math.max(0, airCtl) * TW.B.GAUNTLET_AIR
                + Math.max(0, seaCtl) * TW.B.GAUNTLET_SEA;
  gauntlet = TW.clamp(gauntlet * (0.7 + Math.random() * 0.6), 0, TW.B.GAUNTLET_MAX);

  /* 損失換算成實際被擊沉的兩棲艦艇 */
  if (gauntlet > 0.02){
    /* 只打真的在這片外海的船團 */
    const lifters = (fleets || []).filter(f => !f.dead);
    let sunkTxt = [];
    lifters.forEach(f => {
      const dmg = f.hp * gauntlet * (0.6 + Math.random() * 0.5);
      const before = f.ships.reduce((s, x) => s + x.n, 0);
      TW.damageFleet(f, dmg, ev);
      const after = f.ships.reduce((s, x) => s + x.n, 0);
      if (before > after) sunkTxt.push(f.name + ' −' + (before - after) + ' 艘');
    });
    ev.push({ t:'naval', c:h.c, r:h.r, cls:'c-roc',
      txt:'【反登陸打擊】我方岸置反艦飛彈、雷區與海空兵力攔截 ' +
          (h.beach ? h.beach.name : '灘岸') + ' 外海的登陸船團，' +
          '船團折損 ' + Math.round(gauntlet * 100) + '%。' +
          (sunkTxt.length ? '（' + sunkTxt.join('、') + '）' : '') });

    /* 船沉了，上面的部隊也沒了——直接從投入的梯隊裡扣 */
    const lost = Math.min(n, Math.round(n * gauntlet));
    if (lost > 0){
      for (let i = 0; i < lost; i++){
        const u = pool.shift();
        const idx = S.plaPool.indexOf(u);
        if (idx >= 0) S.plaPool.splice(idx, 1);
        S.stats.plaKilled += u.maxHp * 0.75;
        S.plaWill -= TW.B.PLA_WILL_PER_LOSS * 0.8;
        ev.push({ t:'sink', c:h.c, r:h.r, cls:'c-ok',
          txt:'　└ ' + u.name + ' 隨運輸艦沉沒，未及上陸。' });
      }
      n -= lost;
      spent += lost;
      S.intl += TW.B.INTL_PER_PLA_LOSS * 40 * lost;
    }
  }

  if (n <= 0){
    ev.push({ t:'log', cls:'c-ok',
      txt:'　└ 該波次全數被擋在水線之外，共軍登陸失敗。' });
    this.consumeLoad(fleets, spent);
    return budget;
  }

  const cv = (fleets || []).find(f => !f.dead) || null;
  ev.push({ t:'land', c:h.c, r:h.r, cls:'c-pla', side:'PLA', boats:n,
    fc: cv ? cv.c : undefined, fr: cv ? cv.r : undefined,
    txt:'【搶灘】共軍於 ' + (h.beach ? h.beach.name : '灘岸') +
        ' 發起兩棲突擊，' + n + ' 個旅衝上灘頭。' });

  TW.hint('landing', '共軍上岸了',
    '剛上陸的部隊組織度只剩一半，這是他們整場戰爭最虛弱的時候。\n\n' +
    '現在就把附近的裝甲旅、機步旅調過去反擊，趁他們站穩之前把灘頭推下海。\n' +
    '砲兵也別閒著——選砲兵，點灘頭那一格，就是叫他們開火。\n\n' +
    '共軍站穩之後會沿著國道往台北、高雄衝。工兵在國道上埋爆破裝藥，\n' +
    '炸斷一格，整條路就在那裡斷掉。\n\n' +
    '真正該打的其實是海上的船團：岸置反艦飛彈（海鋒大隊）與灘外雷區\n' +
    '會在他們上岸之前就先打一輪，船沉了部隊也跟著沉。');

  for (let i = 0; i < n; i++){
    const u = pool.shift();
    if (!u) break;
    const idx = S.plaPool.indexOf(u);
    if (idx >= 0) S.plaPool.splice(idx, 1);

    /* 搶灘損失 */
    let loss = h.beach ? TW.B.LANDING_LOSS_BEACH * h.beach.diff : TW.B.LANDING_LOSS_ROCK;
    loss *= 1 + S.mod.beachDefense;
    loss *= 1 + Math.max(0, seaCtl) * 0.8 + Math.max(0, airCtl) * 0.5;
    loss *= 1 + beachMines * 0.5;
    loss *= TW.Env.landingSeaPenalty();      // 浪越大，舟波翻覆與失散越多
    loss *= 0.7 + Math.random() * 0.6;
    if (u.T.cls === 'marine' || u.T.cls === 'amphib') loss *= 0.72;   // 本來就是幹這個的

    u.hp = Math.max(5, u.hp * (1 - loss));
    u.org = u.maxOrg * TW.B.LANDING_ORG_PENALTY;
    u.c = h.c; u.r = h.r;
    u.entrench = 0;
    u.landedTurn = S.turn;
    S.units.push(u);
    S.stats.landings++;

    ev.push({ t:'boom', c:h.c, r:h.r, cls:'c-pla', uid:u.id, small:true,
      txt:'　└ ' + u.name + ' 上陸，舟波損失 ' + Math.round(loss * 100) +
          '%，兵力剩 ' + Math.round(u.hp) + '。' });
  }

  spent += n;
  if (!h.beachhead) h.beachhead = { turns: 0 };

  /* 灘岸即時反擊：守軍立刻與上陸部隊接戰 */
  const defs = TW.unitsAt(h.c, h.r).filter(u => u.side === 'ROC');
  if (defs.length){
    ev.push({ t:'battle', c:h.c, r:h.r, cls:'c-warn', txt:'　└ 灘岸遭遇戰爆發！' });
    const atk = TW.unitsAt(h.c, h.r).filter(u => u.side === 'PLA');
    atk.forEach(a => this.fight(a, defs, h, ev, true));
  }
  this.consumeLoad(fleets, spent);
  return budget;
},

/* 船團卸完部隊就空了，得回福建的集結港重新裝載，才能運下一波。
   兩棲作戰真正的節奏限制就在這裡：船要往返，不是部隊從對岸瞬移過來。 */
consumeLoad(fleets, k){
  let left = Math.max(0, Math.round(k || 0));
  /* 先從載最多的船團卸，卸完的才回港 */
  const fs = (fleets || []).filter(f => !f.dead).sort((a, b) => TW.fleetLoad(b) - TW.fleetLoad(a));
  fs.forEach(f => {
    const have = TW.fleetLoad(f);
    const take = Math.min(have, left);
    left -= take;
    f.load = have - take;
    if (f.load < 1){
      f.empty = true;
      f.load = 0;
      f.reload = 0;
      f.approachWarned = null;           // 下一趟出航再預警
    }
  });
},

/* 空降 */
airbornePhase(ev){
  const S = TW.S;

  /* 運輸機隊還剩多少、停在哪 */
  const tWings = S.air.filter(w => !w.dead && w.side === 'PLA' && w.A.lift && w.n > 0);
  const planes = tWings.reduce((a, w) => a + w.n * TW.wingReady(w), 0);
  const baseP = tWings.length ? TW.PLACES.find(p => p.name === tWings[0].base) : null;

  /* ================= 上一回合偵獲的空降，這回合才執行 =================
     空降不會憑空出現：傘兵要登機、運輸機要在機場集結，
     衛星、電偵和樂山雷達都看得到。所以一定是「先偵獲，下回合才跳」。 */
  if (S.abnStaging){
    const st = S.abnStaging; S.abnStaging = null;
    const h = TW.hexAt(st.c, st.r);
    const u = S.plaPool.find(x => x.id === st.uid);
    const zn = (TW.ZONES.find(z => z.id === (h && h.zone)) || {}).name || '該空域';
    if (!h || !u || h.owner !== 'ROC'){
      ev.push({ t:'log', cls:'c-ok', txt:'【情報】共軍取消原定的空降行動。' });
      return;
    }
    if ((S.zoneAir[h.zone] || 0) >= -0.30){
      ev.push({ t:'log', cls:'c-ok',
        txt:'【情報】' + zn + '制空權已被我方爭回，共軍取消對 ' + h.place.name + ' 的空降。' });
      return;
    }
    if (planes < 6){
      ev.push({ t:'log', cls:'c-ok',
        txt:'【情報】共軍運輸機不足，取消對 ' + h.place.name + ' 的空降。' });
      return;
    }
    S.plaPool.splice(S.plaPool.indexOf(u), 1);

    /* 運輸機群飛越海峽——畫面上會畫出航線 */
    if (baseP)
      ev.push({ t:'transport', c:baseP.c, r:baseP.r, c2:h.c, r2:h.r, cls:'c-pla',
        txt:'【雷達】樂山雷達追蹤到共軍運輸機群自 ' + baseP.name + ' 起飛，飛越海峽朝 ' +
            h.place.name + ' 而來。' });

    /* 途中攔截：該空域我方的戰機 */
    let cap = 0;
    S.air.forEach(w => {
      if (w.dead || w.n <= 0 || w.side !== 'ROC' || w.mission === 'rest') return;
      if (w.zone !== h.zone) return;
      cap += TW.airStat(w, 'air') * w.n * TW.wingReady(w) * TW.Env.airFactor();
    });
    const interceptFrac = TW.clamp(cap / (cap + TW.B.ABN_INTERCEPT_K), 0, 0.6);

    let loss = TW.B.AIRBORNE_LOSS * (1 + Math.max(0, S.zoneAir[h.zone]) * 1.5);
    const aa = S.units.filter(x => !x.dead && x.side === 'ROC' && x.T.aa &&
      TW.Hex.distance(x.c, x.r, h.c, h.r) <= 3);
    loss *= 1 + aa.length * 0.22;
    loss *= 1 + interceptFrac * 1.5;        // 被攔截打散的機群，傘兵落點會亂成一團
    loss *= 0.7 + Math.random() * 0.6;
    loss = Math.min(loss, 0.85);

    u.hp = Math.max(5, u.hp * (1 - loss));
    u.org = u.maxOrg * 0.5;
    u.c = h.c; u.r = h.r; u.landedTurn = S.turn;
    S.units.push(u);

    /* 運輸機損失：防空＋戰機攔截 */
    const bySam = Math.round(4 + aa.length * 2.5 * Math.random());
    const byFighter = Math.round(planes * interceptFrac * 0.5);
    const hitPlanes = Math.min(Math.floor(planes), bySam + byFighter);
    let left = hitPlanes;
    tWings.forEach(w => {
      if (left <= 0) return;
      const k = Math.min(w.n, left);
      w.n -= k; left -= k;
      if (w.n <= 0) w.dead = true;
    });

    ev.push({ t:'land', c:h.c, r:h.r, cls:'c-pla', uid:u.id, chutes:true,
      txt:'【空降】共軍 ' + u.name + ' 空降 ' + h.place.name + '！損失 ' + Math.round(loss * 100) +
          '%，兵力剩 ' + Math.round(u.hp) + '。' +
          (hitPlanes > 0 ? '　擊落運輸機 ' + hitPlanes + ' 架' +
            (byFighter > 0 ? '（其中戰機攔截 ' + byFighter + ' 架）' : '') + '。' : '') });

    const defs = TW.unitsAt(h.c, h.r).filter(x => x.side === 'ROC');
    if (defs.length) this.fight(u, defs, h, ev, false);
    return;
  }

  /* ================= 決定要不要籌畫一次新的空降 ================= */
  const abn = S.plaPool.filter(u => u.airborne);
  if (!abn.length || S.turn < 2) return;
  if (planes < 6){
    if (S.turn % 6 === 0 && S.stats.landings > 0)
      ev.push({ t:'log', cls:'c-ok',
        txt:'【情報】共軍運輸機隊折損嚴重，短期內無法組織空降作戰。' });
    return;
  }

  /* 只有在我方制空權嚴重失守時才敢空降 */
  const cands = S.hexes.filter(h => h.owner === 'ROC' && h.place &&
    (h.place.type.includes('airbase') || h.place.type.includes('airport')) &&
    (S.zoneAir[h.zone] || 0) < -0.30);
  if (!cands.length) return;
  if (Math.random() > 0.35 * TW.B.AI_AGGRESSION) return;

  const h = cands[Math.floor(Math.random() * cands.length)];
  S.abnStaging = { c:h.c, r:h.r, uid:abn[0].id, turn:S.turn };

  /* 情報只給得到「哪個空域」，給不到確切的降落場 */
  const zn = (TW.ZONES.find(z => z.id === h.zone) || {}).name || '某空域';
  const inZone = cands.filter(x => x.zone === h.zone).map(x => x.place.name);
  ev.push({ t:'log', cls:'c-warn',
    txt:'【情報】衛星與電偵發現 ' + (baseP ? baseP.name : '對岸') + ' 機場運輸機群集結、空降兵正在登機，' +
        '研判 12 小時內將對' + zn + '實施空降。可能目標：' + inZone.join('、') + '。' +
        '　還有一回合可以反應：派戰機去爭取該空域制空權，或把預備隊調到機場。' });
},

/* ======================= 地 面 階 段 ======================= */
groundPhase(ev){
  const S = TW.S;
  const attacks = S.units.filter(u => !u.dead && u.order && u.order.type === 'attack');

  attacks.forEach(a => {
    /* 這支部隊可能在先前的戰鬥中已經被打垮或後撤，命令會被清掉 */
    if (a.dead || !a.order || a.order.type !== 'attack') return;
    const h = TW.hexAt(a.order.tc, a.order.tr);
    if (!h) { a.order = null; return; }
    const defs = TW.unitsAt(h.c, h.r).filter(u => u.side !== a.side);
    if (!defs.length){
      /* 目標已空 → 推進 */
      if (TW.Rules.canEnter(a, h.c, h.r) && TW.Hex.distance(a.c, a.r, h.c, h.r) === 1){
        a.c = h.c; a.r = h.r; a.entrench = 0;
        ev.push({ t:'move', c:h.c, r:h.r, cls:'', uid:a.id, txt:a.name + ' 佔領 ' + TW.hexName(h) + '。' });
      }
      a.order = null;
      return;
    }
    if (TW.Hex.distance(a.c, a.r, h.c, h.r) > 1){ a.order = null; return; }

    ev.push({ t:'battle', c:h.c, r:h.r, cls: a.side === 'ROC' ? 'c-roc' : 'c-pla',
      fc:a.c, fr:a.r, side:a.side, open:true,
      txt:'【接戰】' + a.name + ' 攻擊 ' + TW.hexName(h) + '（守軍：' + defs.map(d => d.name).join('、') + '）' });

    this.fight(a, defs, h, ev, false);

    /* 守軍崩潰 → 撤退，攻方推進 */
    const left = TW.unitsAt(h.c, h.r).filter(u => u.side !== a.side);
    if (!left.length && !a.dead && TW.Rules.canEnter(a, h.c, h.r)){
      a.c = h.c; a.r = h.r; a.entrench = 0;
      ev.push({ t:'move', c:h.c, r:h.r, cls: a.side === 'ROC' ? 'c-ok' : 'c-pla', uid:a.id,
        txt:'　└ ' + a.name + ' 突入並佔領 ' + TW.hexName(h) + '。' });
    }
    a.order = null;
  });
},

/* --------------------------------------------------------------------------
   單場戰鬥解算
   -------------------------------------------------------------------------- */
fight(A, defs, h, ev, isLanding){
  TW.Env.spend(TW.B.AMMO_GROUND_FIGHT);
  const S = TW.S;
  A.fought = true;
  defs.forEach(d => { d.fought = true; });
  const sideAir = S.zoneAir[h.zone] * (A.side === 'ROC' ? 1 : -1);

  /* 攻方火力 */
  let aSoft = TW.stat(A, 'soft') * (1 + S.mod.soft / 40);
  let aHard = TW.stat(A, 'hard');
  const aPierce = TW.stat(A, 'pierce');

  /* 砲兵支援：相鄰的友軍砲兵 */
  S.units.forEach(g => {
    if (g.dead || g.side !== A.side || g.firedThisTurn) return;
    if (!TW.canBombard(g)) return;
    if (TW.Hex.distance(g.c, g.r, h.c, h.r) > TW.unitRange(g)) return;
    aSoft += TW.stat(g, 'soft') * 0.45;
    aHard += TW.stat(g, 'hard') * 0.45;
    g.org -= 3;
  });

  /* 空中密接支援 */
  let cas = 0;
  S.air.forEach(w => {
    if (w.dead || w.n <= 0 || w.side !== A.side || w.mission !== 'cas' || w.zone !== h.zone) return;
    cas += TW.airStat(w, 'cas') * w.n * 0.02 * TW.wingReady(w);
  });
  cas *= 1 + sideAir * TW.B.AIR_SUP_POWER * 0.4;
  cas = Math.max(0, cas) * TW.B.CAS_DAMAGE * TW.Env.casFactor();
  aSoft += cas; aHard += cas * 0.5;

  /* 攻方修正 */
  let aMod = 1 + sideAir * TW.B.AIR_SUP_POWER * 0.18;
  if (isLanding) aMod *= TW.B.RIVER_CROSS_PENALTY;
  if (A.landedTurn === S.turn) aMod *= 0.8;
  aMod *= (0.5 + 0.5 * A.org / A.maxOrg);

  defs.forEach(D => {
    const dArmor = TW.stat(D, 'armor');
    const hardShare = dArmor / (dArmor + 12);
    const pierceF = aPierce >= dArmor ? 1
      : TW.B.PIERCE_PENALTY + (aPierce / Math.max(1, dArmor)) * (1 - TW.B.PIERCE_PENALTY);
    let fire = (aSoft * (1 - hardShare) + aHard * hardShare * pierceF) * aMod / defs.length;

    /* 守方防禦係數 */
    let defMul = Math.min(TW.B.TERRAIN_MAX_DEF, TW.hexDef(h));
    defMul *= 1 + Math.min(TW.B.ENTRENCH_MAX, D.entrench);
    if (h.T.urban) defMul *= 1 + (D.side === 'ROC' ? S.mod.urbanDefense : 0);
    if (h.beach && D.side === 'ROC') defMul *= 1 + S.mod.beachDefense;
    if (!h.beach && !h.T.urban && D.side === 'ROC') defMul *= 1 + S.mod.depthDefense;
    defMul *= (0.55 + 0.45 * D.org / D.maxOrg);
    defMul *= 1 + TW.stat(D, 'def') / 60;

    const dmg = TW.B.BASE_DAMAGE * fire / Math.max(0.4, defMul) * (0.75 + Math.random() * 0.5);
    D.hp -= dmg;
    D.org -= dmg * TW.B.ORG_DAMAGE_MULT;

    /* 守方還擊 */
    const dFire = (TW.stat(D, 'soft') * 0.6 + TW.stat(D, 'hard') * 0.4) *
                  (0.5 + 0.5 * D.org / D.maxOrg) * (isLanding ? 1.45 : 1);
    const aArmor = TW.stat(A, 'armor');
    const dPierceF = TW.stat(D, 'pierce') >= aArmor ? 1
      : TW.B.PIERCE_PENALTY + (TW.stat(D, 'pierce') / Math.max(1, aArmor)) * (1 - TW.B.PIERCE_PENALTY);
    const back = TW.B.BASE_DAMAGE * dFire * dPierceF * 0.75 / Math.max(0.5, 1 + aArmor / 55) *
                 (0.75 + Math.random() * 0.5);
    A.hp -= back;
    A.org -= back * TW.B.ORG_DAMAGE_MULT * 0.9;

    ev.push({ t:'battle', c:h.c, r:h.r, cls:'', fc:A.c, fr:A.r, side:A.side, dA:back, dD:dmg, line:true,
      txt:'　　' + A.name + ' −' + back.toFixed(1) + '　│　' + D.name + ' −' + dmg.toFixed(1) });

    if (D.hp <= 0 || D.org <= D.maxOrg * TW.B.ORG_BREAK) this.breakUnit(D, h, ev);
  });

  if (A.hp <= 0 || A.org <= A.maxOrg * TW.B.ORG_BREAK) this.breakUnit(A, TW.hexAt(A.c, A.r), ev);
},

/* 組織度歸零：後撤或被殲滅 */
breakUnit(u, h, ev){
  const S = TW.S;
  if (u.hp <= 3){ TW.killUnit(u, ev); return; }

  const cands = TW.Hex.neighbors(u.c, u.r)
    .map(([c, r]) => TW.hexAt(c, r))
    .filter(n => n && n.t !== '.' && n.owner === u.side &&
                 !TW.unitsAt(n.c, n.r).some(x => x.side !== u.side) &&
                 TW.unitsAt(n.c, n.r).filter(x => x.side === u.side).length < 2);

  if (!cands.length){
    ev.push({ t:'boom', c:u.c, r:u.r, cls: u.side === 'ROC' ? 'c-pla' : 'c-ok',
      txt:'　└ ' + u.name + ' 遭包圍，無路可退，建制瓦解。' });
    TW.killUnit(u, ev);
    return;
  }
  if (u.side === 'ROC')
    TW.hint('broken', '部隊被打垮了',
      '組織度掉到太低，部隊就會自己後撤——這不是你被殲滅，是他們暫時沒辦法作戰了。\n\n' +
      '把這種部隊拉到後面，按「後送整補」，回復速度會變成 2.6 倍。\n' +
      '硬撐著讓他們留在前線只會被慢慢磨光。');

  cands.sort((a, b) => b.sup[u.side] - a.sup[u.side]);
  const to = cands[0];
  u.hp *= 0.88;
  u.org = Math.max(u.org, u.maxOrg * 0.18);
  u.c = to.c; u.r = to.r; u.entrench = 0; u.order = null;
  ev.push({ t:'move', c:to.c, r:to.r, cls: u.side === 'ROC' ? 'c-warn' : 'c-ok', uid:u.id, rout:true,
    txt:'　└ ' + u.name + ' 組織瓦解，後撤至 ' + TW.hexName(to) + '。' });
}

};

/* --------------------------------------------------------------------------
   通用：單位被殲滅、艦隊受損
   -------------------------------------------------------------------------- */
TW.killUnit = function(u, ev, reason){
  const S = TW.S;
  u.dead = true;
  if (u.side === 'PLA'){ S.stats.plaKilled += u.maxHp; S.intl += TW.B.INTL_PER_PLA_LOSS * u.maxHp;
                         S.plaWill -= TW.B.PLA_WILL_PER_LOSS; }
  else { S.stats.rocKilled += u.maxHp; S.will -= TW.B.ROC_WILL_PER_LOSS; }
  ev.push({ t:'boom', c:u.c, r:u.r, cls: u.side === 'ROC' ? 'c-pla' : 'c-ok', uid:u.id, kill:true, big:true,
    txt:'　└ ' + u.name + '　' + (reason || '全員傷亡或被俘，番號撤銷。') });
};

TW.damageFleet = function(f, dmg, ev){
  const S = TW.S;
  f.hp -= dmg;
  /* 依剩餘耐受度換算損失的艦艇數 */
  const ratio = Math.max(0, f.hp / f.maxHp);
  let sunk = 0;
  f.ships.forEach(s => {
    const want = Math.ceil(s.maxN * ratio);
    if (want < s.n){ sunk += s.n - want; s.n = Math.max(0, want); }
  });
  if (sunk > 0){ S.stats.shipsSunk += sunk;
    ev.push({ t:'sink', c:f.c, r:f.r, cls: f.side === 'ROC' ? 'c-pla' : 'c-ok', side:f.side, ships:sunk,
      txt:'　└ ' + f.name + ' 損失 ' + sunk + ' 艘。' });
  }
  if (f.hp <= 0 || f.ships.every(s => s.n <= 0)){
    f.dead = true;
    /* 艙裡載著的部隊跟著沉。這就是為什麼兩棲船團要有護航。 */
    (f.cargo || []).forEach(id => {
      const u = S.units.find(x => x.id === id && !x.dead);
      if (!u) return;
      u.embarked = null;
      TW.killUnit(u, ev, '隨運輸艦沉沒，全員未及脫離。');
    });
    f.cargo = [];
    ev.push({ t:'sink', c:f.c, r:f.r, cls: f.side === 'ROC' ? 'c-pla' : 'c-ok',
      txt:'　└ ' + f.name + ' 全滅。' });
    /* 佯動船團是徵用來的空民船，沉了對北京來說只是「損失幾艘漁船」，不是一整個兩棲支隊 */
    if (f.side === 'PLA') S.plaWill -= TW.B.PLA_WILL_PER_LOSS * (f.feint ? 0.4 : 2.5);
    else S.will -= TW.B.ROC_WILL_PER_LOSS * 1.4;
  }
};

TW.hexName = function(h){
  if (h.place) return h.place.name;
  if (h.beach) return h.beach.name;
  return h.T.name + '（' + h.c + ',' + h.r + '）';
};
