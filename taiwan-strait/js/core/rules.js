/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   規則層：補給、控制權、制空制海、視野、移動與路徑
   ========================================================================== */

TW.Rules = {

/* --------------------------------------------------------------------------
   地面控制權：敵軍佔領且我方無部隊的陸地格會易手
   -------------------------------------------------------------------------- */
recalcOwner(){
  const S = TW.S;
  S.hexes.forEach(h => {
    if (h.t === '.') return;
    const us = TW.unitsAt(h.c, h.r);
    const roc = us.some(u => u.side === 'ROC');
    const pla = us.some(u => u.side === 'PLA');
    if (pla && !roc && h.owner !== 'PLA'){
      h.owner = 'PLA';
      h.entrenchReset = true;
      if (h.place) TW.onPlaceCaptured(h, 'PLA');
    } else if (roc && !pla && h.owner !== 'ROC' && (!h.T.prc || S.whatIf)){
      h.owner = 'ROC';
      if (h.place) TW.onPlaceCaptured(h, 'ROC');
    }
  });
},

/* --------------------------------------------------------------------------
   補給：從補給來源沿己方控制區擴散，每遠一格衰減
   -------------------------------------------------------------------------- */
recalcSupply(){
  const S = TW.S;
  S.hexes.forEach(h => { h.sup.ROC = 0; h.sup.PLA = 0; });

  const range = TW.B.SUPPLY_RANGE + S.mod.supplyRange;
  const decay = TW.B.SUPPLY_DECAY + (S.mod.supplyPenalty || 0);

  /* 第五縱隊破壞掉的節點：這些格子這幾回合收不到補給 */
  const cut = {};
  (S.supplyCut || []).forEach(x => { cut[x.c + ',' + x.r] = 1; });

  ['ROC', 'PLA'].forEach(side => {
    const q = [];

    S.hexes.forEach(h => {
      if (h.t === '.' || h.owner !== side) return;
      let src = 0;

      if (side === 'PLA' && h.T.prc) src = 1;                       // 對岸本土
      if (h.place && h.place.side === side || (h.place && h.owner === side)){
        const p = h.place;
        if (p.type.includes('capital')) src = Math.max(src, 1);
        else if (p.type.includes('port') || p.type.includes('navalbase')) src = Math.max(src, 0.95 - h.damage * 0.5);
        else if (p.type.includes('city')) src = Math.max(src, 0.8 - h.damage * 0.4);
        else if (p.type.includes('airbase') || p.type.includes('airport')) src = Math.max(src, 0.6 - h.damage * 0.4);
      }

      /* 共軍灘頭：靠海運補給，受制海權影響 */
      if (side === 'PLA' && h.beachhead){
        const sea = S.zoneSea[TW.seaZoneAt(h.c, h.r)] || 0;           // +我方優勢 / −共軍優勢
        const f = Math.max(0, Math.min(1, 0.5 - sea * 0.5 * TW.B.SEA_SUP_POWER));
        src = Math.max(src, TW.B.PLA_SEALIFT_SUPPLY * f * (1 - (S.plaSupplyHit || 0)));
      }

      /* 節點被第五縱隊破壞，這幾回合供不出補給 */
      if (side === 'ROC' && cut[h.c + ',' + h.r]) src = 0;
      if (src > 0){ h.sup[side] = src; q.push([h, 0]); }
    });

    /* 廣度優先擴散 */
    let head = 0;
    while (head < q.length){
      const [h, d] = q[head++];
      if (d >= range) continue;
      const val = h.sup[side];
      TW.Hex.neighbors(h.c, h.r).forEach(([nc, nr]) => {
        const n = TW.hexAt(nc, nr);
        if (!n || n.t === '.' || n.owner !== side) return;
        /* 道路與電力節點被炸斷，補給過不去 */
        if (side === 'ROC' && cut[nc + ',' + nr]) return;
        /* 沿著高速公路，卡車車隊跑得又快又遠：衰減打折、距離也算短一點 */
        const road = TW.roadBetween(h.c, h.r, nc, nr);
        const cost = road ? decay * TW.B.HIGHWAY_SUPPLY
                          : decay + (n.T.move - 1) * 0.02;
        const nv = val - cost;
        if (nv > n.sup[side] + 0.001){
          n.sup[side] = nv;
          q.push([n, d + (road ? TW.B.HIGHWAY_SUPPLY_REACH : 1)]);
        }
      });
    }
  });

  /* 把補給值套到各單位 */
  S.units.forEach(u => {
    if (u.dead) return;
    const h = TW.hexAt(u.c, u.r);
    u.supply = h ? Math.max(0, Math.min(1, h.sup[u.side])) : 0;
  });
},

/* --------------------------------------------------------------------------
   制空權與制海權（以空域／海域為單位，範圍 −1 ~ +1，正值表示我方優勢）
   -------------------------------------------------------------------------- */
recalcAirSea(){
  const S = TW.S;
  /* 制空權也要吃天候：飛不出去的飛機不算戰力 */
  const sortie = (TW.B.AIR_SORTIE_RATE + S.mod.sortieRate) * TW.Env.airFactor();

  TW.ZONES.forEach(z => {
    let ra = 0, pa = 0, rc = 0, pc = 0;

    S.air.forEach(w => {
      if (w.dead || w.n <= 0 || w.zone !== z.id || w.mission === 'rest') return;
      const A = w.A;
      const weight = (w.mission === 'cap') ? 1 : 0.3;
      const rdy = TW.wingReady(w);
      const p = (A.air || 0) * w.n * sortie * weight * rdy;
      const cc = TW.airStat(w, 'c4isr') * w.n * sortie * rdy;
      if (w.side === 'ROC'){ ra += p; rc += cc; } else { pa += p; pc += cc; }
    });

    ra *= 1 + (S.mod.c4isr + rc * 0.4) / 100 + S.mod.ew / 150;
    pa *= 1 - (S.plaAirPenalty || 0);
    /* 打壞對岸的機場，共軍的飛機就飛不出來——和他們打我們的機場同理 */
    pa *= Math.max(0.35, 1 - this.plaAirfieldPenalty());
    pa *= 1 + pc * 0.004;

    S.zoneAir[z.id] = clamp((ra - pa) / (ra + pa + 60), -1, 1);

    /* ---- 制海 ---- */
    let rs = 0, ps = 0;
    S.navy.forEach(f => {
      if (f.dead) return;
      const h = TW.hexAt(f.c, f.r);
      if (!h || h.zone !== z.id) return;
      const st = TW.fleetStats(f);
      const w = f.mission === 'strike' ? 1 : (f.mission === 'escort' ? 0.75 :
                (f.mission === 'evade' ? 0.1 : (f.mission === 'repair' ? 0 : 0.4)));
      const p = st.asuw * w * (f.hp / f.maxHp);
      if (f.side === 'ROC') rs += p; else ps += p;
    });

    /* 空中反艦兵力 */
    S.air.forEach(w => {
      if (w.dead || w.n <= 0 || w.zone !== z.id || w.mission !== 'ashm') return;
      const p = TW.airStat(w, 'ashm') * w.n * sortie * 0.45 * TW.wingReady(w);
      if (w.side === 'ROC') rs += p; else ps += p;
    });

    /* 岸置反艦飛彈涵蓋鄰接海域 */
    if (z.sea){
      S.units.forEach(u => {
        if (u.dead || u.side !== 'ROC' || !u.T.ashm) return;
        const near = TW.Hex.neighbors(u.c, u.r).some(([nc, nr]) => {
          const n = TW.hexAt(nc, nr); return n && n.t === '.';
        });
        if (!near) return;
        const d = distToZone(u.c, u.r, z.id);
        if (d <= 4) rs += TW.stat(u, 'ashm') * (1 + S.mod.ashm / 30) * (1 - d * 0.12);
      });
    }

    ps *= 1 - (S.plaNavalPenalty || 0);
    S.zoneSea[z.id] = clamp((rs - ps) / (rs + ps + 40), -1, 1);
  });
},

/* --------------------------------------------------------------------------
   視野：戰爭迷霧
   -------------------------------------------------------------------------- */
recalcVision(){
  const S = TW.S;
  if (!TW.B.FOG_OF_WAR){ S.hexes.forEach(h => h.seen = true); return; }
  S.hexes.forEach(h => { h.seen = (h.owner === 'ROC'); });

  const reveal = (c, r, rad) => {
    for (let dr = -rad; dr <= rad; dr++)
      for (let dc = -rad; dc <= rad; dc++){
        const h = TW.hexAt(c + dc, r + dr);
        if (h && TW.Hex.distance(c, r, h.c, h.r) <= rad) h.seen = true;
      }
  };

  /* 港口、機場、都市的位置是公開情報——你一定知道福州基地在哪，
     只是不一定知道那裡現在停了幾架飛機。 */
  TW.PLACES.forEach(p => { const h = TW.hexAt(p.c, p.r); if (h) h.seen = true; });

  const bonus = Math.floor(S.mod.recon / 6);
  S.units.forEach(u => { if (!u.dead && u.side === 'ROC') reveal(u.c, u.r, 2 + (u.T.recon > 3 ? 1 : 0) + bonus); });
  S.navy.forEach(f => { if (!f.dead && f.side === 'ROC') reveal(f.c, f.r, 3 + bonus); });

  /* 岸置對海雷達：本島沿岸與金馬澎外島的對海搜索雷達，涵蓋近岸約 60 公里。
     只照海面——雷達看得到船，看不到躲在內陸的部隊。 */
  const RR = TW.B.COASTAL_RADAR_RANGE || 4;
  S.hexes.forEach(h => {
    if (h.t === '.' || h.owner !== 'ROC' || h.T.prc) return;
    if (!TW.Hex.neighbors(h.c, h.r).some(([c, r]) => TW.isSea(c, r))) return;
    for (let dr = -RR; dr <= RR; dr++)
      for (let dc = -RR; dc <= RR; dc++){
        const x = TW.hexAt(h.c + dc, h.r + dr);
        if (x && x.t === '.' && TW.Hex.distance(h.c, h.r, x.c, x.r) <= RR) x.seen = true;
      }
  });
  TW.PLACES.forEach(p => {
    const h = TW.hexAt(p.c, p.r);
    if (h && h.owner === 'ROC') reveal(p.c, p.r, p.type.includes('airbase') ? 5 + bonus : 3 + bonus);
  });
},

/* --------------------------------------------------------------------------
   移動
   -------------------------------------------------------------------------- */
canEnter(u, c, r, loose){
  const h = TW.hexAt(c, r);
  if (!h || h.t === '.') return false;
  /* 現實裡國軍不會反攻大陸——沒有那個運量，也沒有那個計畫。
     只有架空模式才解得開這條。 */
  if (h.T.prc && u.side === 'ROC' && !TW.S.whatIf) return false;
  const us = TW.unitsAt(c, r);
  if (us.some(x => x.side !== u.side)) return false;                // 有敵軍 → 要用攻擊
  /* loose = 規劃路線時用：友軍佔住的格子先當作「等一下會讓開」，
     否則部隊一多就會互相卡死，整條戰線動不了。實際進入時仍會檢查堆疊上限。 */
  if (!loose && us.filter(x => x.side === u.side).length >= 2) return false;
  return true;
},

/* (fc,fr) 是「從哪一格走過來」。沿著高速公路走，不管地形、不管河川（有橋），
   一律照道路的機動力算；沒給來源格（舊的呼叫方式）就照地形算。 */
moveCost(u, c, r, fc, fr){
  const h = TW.hexAt(c, r);
  const road = TW.roadBetween(fc, fr, c, r);
  if (road) return road.cost;
  let cost = h.T.move;
  if (h.T.heavyPenalty && (u.cls === 'armor' || u.cls === 'mech')) cost += 2;
  /* 渡河要架橋、要找渡口，重裝備更慢 */
  if (h.river){
    cost += TW.B.RIVER_MOVE;
    if (u.cls === 'armor' || u.cls === 'mech' || u.cls === 'arty') cost += 1;
  }
  /* 炸出來的彈坑、倒塌的橋梁、翻覆的車輛，都要清 */
  if (h.obstacle > 0) cost += TW.B.DEMO_OBSTACLE_MOVE;
  return cost;
},

/* ==========================================================================
   第五縱隊
   --------------------------------------------------------------------------
   開戰前已經滲透進來的武裝人員與在地協力者，在同一個時間點發難，
   突襲奪取一座港口或機場。這是台灣防衛研究裡討論很多的一種想定，
   因為它跳過了整個灘岸決戰——重裝備直接從碼頭開下船。

   遊戲裡的效果有三層：
     1. 該設施直接易手，而且嚴重受損（他們會先炸管制中心與油庫）
     2. 周圍幾格的補給被切斷數個回合（電力、道路、通信節點被破壞）
     3. 共軍從此可以在那裡卸載重裝旅（landingPhase 的 portHeld 判定）

   反制方式就是把它奪回來——所以開場你得先決定要不要抽兵回去。
   ========================================================================== */
fifthColumnStrike(ev){
  const S = TW.S;
  if (S.fifthDone) return;
  const sc = TW.SCENARIOS[S.scenario];
  if (!sc || !sc.fifthColumn) return;
  if (S.turn < TW.B.FIFTH_SEIZE_TURN) return;
  S.fifthDone = true;

  /* 挑一座「值得奪、而且守備薄弱」的西部港口或機場 */
  const cands = S.hexes.filter(h => {
    if (h.owner !== 'ROC' || !h.place) return false;
    const t = h.place.type;
    if (!t.includes('port') && !t.includes('navalbase') && !t.includes('airbase')) return false;
    if (h.place.hardened) return false;            // 佳山、志航挖在山裡，不好搞
    if (h.c > 17) return false;                    // 東部離對岸太遠，滲透補給線太長
    return true;
  });
  if (!cands.length) return;

  /* 港口優先——這個劇本的重點就是讓重裝備直接從碼頭卸下來。
     搶到機場是次要選擇（打開空運頭堡，但卸不了戰車）。 */
  const isPort = x => x.place.type.includes('port') || x.place.type.includes('navalbase');
  cands.sort((a, b) => {
    const guard = h => TW.unitsAt(h.c, h.r).filter(u => u.side === 'ROC')
      .reduce((s, u) => s + u.hp * (1 + u.entrench), 0);
    const score = h => (isPort(h) ? 260 : 0) + h.place.vp * 6 - guard(h);
    return score(b) - score(a);
  });
  const h = cands[0];
  const p = h.place;
  const port = isPort(h);

  /* --- 設施易手並嚴重受損 --- */
  h.owner = 'PLA';
  h.damage = TW.clamp(h.damage + 0.55, 0, 0.9);
  h.fifthColumn = true;
  h.seizedTurn = S.turn;
  TW.onPlaceCaptured(h, 'PLA');

  /* --- 周圍補給被切斷 --- */
  S.supplyCut = [];
  S.hexes.forEach(x => {
    if (x.t === '.') return;
    if (TW.Hex.distance(x.c, x.r, h.c, h.r) > TW.B.FIFTH_SUPPLY_CUT) return;
    S.supplyCut.push({ c:x.c, r:x.r,
      left:Math.max(1, Math.round(TW.B.FIFTH_CUT_TURNS *
        (1 - TW.clamp(S.mod.counterInfil || 0, 0, 0.6)))) });
  });

  /* --- 駐守該地的部隊被打散 --- */
  TW.unitsAt(h.c, h.r).filter(u => u.side === 'ROC').forEach(u => {
    u.org = Math.max(0, u.org * 0.35);
    u.hp = Math.max(5, u.hp * 0.7);
    u.entrench = 0;
  });

  /* 在還沒宣戰的情況下派武裝人員滲透奪取港口，是很難被辯解的事。
     原本觀望的國家會被迫表態——這是這個劇本給玩家的補償。 */
  S.intl += TW.B.FIFTH_INTL;

  ev.push({ t:'boom', c:h.c, r:h.r, cls:'c-pla',
    txt:'【第五縱隊】潛伏武裝人員於 ' + p.name + ' 同時發難，' +
        '突襲管制中心與油庫，該設施已經失守。' });
  ev.push({ t:'aid', cls:'c-us',
    txt:'【國際反應】滲透奪港的畫面傳遍全球，各國政府被迫表態，' +
        '國際支持度 +' + TW.B.FIFTH_INTL + '。' });
  ev.push({ t:'log', cls:'c-warn',
    txt:'　└ 周圍 ' + TW.B.FIFTH_SUPPLY_CUT + ' 格內的補給線被切斷 ' +
        TW.B.FIFTH_CUT_TURNS + ' 個回合（道路、電力、通信節點同時被破壞）。' });
  ev.push({ t:'log', cls:'c-warn',
    txt: port
      ? '　└ 共軍的滾裝船可以直接靠泊卸載重裝備——灘岸決戰被跳過了。' +
        '把港口奪回來，否則重裝旅會源源不絕地上岸。'
      : '　└ 跑道落入共軍手中，成為空運頭堡。' +
        '卸不了戰車，但傘兵與輕裝部隊會直接運進來——盡快奪回。' });

  TW.hint('fifth', '據點被裡應外合奪走了',
    '這不是登陸，是滲透。潛伏人員直接把 ' + p.name + ' 交到共軍手上。\n\n' +
    '後果有三個：\n' +
    (port ? '　· 共軍可以在那裡直接卸重裝旅，不用搶灘\n'
          : '　· 那條跑道成了共軍的空運頭堡\n') +
    '　· 周圍的補給被切斷，附近的部隊會開始掉戰力\n' +
    '　· 那座設施本身也被破壞了\n\n' +
    '最優先的事情是把它奪回來。憲兵、守備旅、附近的機步旅都可以用，\n' +
    '愈快愈好——拖越久，上岸的東西越多。');
},

/* 補給切斷的倒數，以及後續的零星破壞 */
fifthColumnTick(ev){
  const S = TW.S;
  const sc = TW.SCENARIOS[S.scenario];
  if (!sc || !sc.fifthColumn) return;

  if (S.supplyCut && S.supplyCut.length){
    S.supplyCut.forEach(x => x.left--);
    S.supplyCut = S.supplyCut.filter(x => x.left > 0);
    if (!S.supplyCut.length)
      ev.push({ t:'log', cls:'c-ok',
        txt:'【後勤】被破壞的道路與電力節點已經搶修完成，該地區補給恢復。' });
  }

  /* 殘餘的協力者還會零星破壞我方設施 */
  /* 反滲透清查做得越徹底，殘餘的協力網絡能動用的人手就越少 */
  const ci = TW.clamp(S.mod.counterInfil || 0, 0, 0.85);
  if (Math.random() < TW.B.FIFTH_SABOTAGE_CHANCE * (1 - ci)){
    const cands = S.hexes.filter(x => x.owner === 'ROC' && x.place && x.damage < 0.8 &&
      (x.place.type.includes('airbase') || x.place.type.includes('port') ||
       x.place.mw));
    if (cands.length){
      const t = cands[Math.floor(Math.random() * cands.length)];
      t.damage = TW.clamp(t.damage + TW.B.FIFTH_SABOTAGE_DMG, 0, 0.9);
      ev.push({ t:'boom', c:t.c, r:t.r, cls:'c-warn',
        txt:'【破壞活動】' + t.place.name + ' 遭殘餘協力者破壞，' +
            '可用率降至 ' + Math.round((1 - t.damage) * 100) + '%。' });
    }
  }
},

/* ==========================================================================
   特種作戰突擊
   --------------------------------------------------------------------------
   海龍蛙兵、特戰旅以小艇或潛艦滲透到對岸，破壞集結港與機場。
   這不是佔領，是「去砸掉東西然後回來」——真實存在的想定，
   而且是不對稱作戰裡少數台灣真的做得到的攻勢手段。
   ========================================================================== */

/* 這支部隊能不能突擊，回傳打得到的目標清單。

   關鍵限制：**必須從金門或馬祖出發。**
   海龍蛙兵本來就是駐在金門的——金門離廈門最近處只有幾公里，
   馬祖離福建不到二十公里，這才是突擊隊真正的出發位置。
   從台灣本島橫渡一百多公里去摸哨不是實際的作法。

   所以外島是有戰略價值的：丟了金門馬祖，你就失去對對岸動手的能力。 */
raidTargets(u){
  const S = TW.S;
  if (!u || u.dead || u.side !== 'ROC') return [];
  if (u.cls !== 'sf') return [];
  if (u.embarked) return [];
  if (u.org < u.maxOrg * 0.5) return [];        // 組織度太低沒辦法出任務
  const h = TW.hexAt(u.c, u.r);
  if (!h || h.t === '.') return [];

  /* 只有站在還在我方手上的前進外島才出得去 */
  const base = h.place && h.place.raidBase && h.owner === 'ROC';
  if (!base) return [];

  return TW.PLACES.filter(p => {
    if (p.side !== 'PLA') return false;
    if (!p.staging && !p.type.includes('airbase') && !p.type.includes('port')) return false;
    const t = TW.hexAt(p.c, p.r);
    if (!t || t.damage >= 0.9) return false;
    return TW.Hex.distance(u.c, u.r, p.c, p.r) <= TW.B.RAID_RANGE;
  });
},

/* 每回合結算突擊 */
raidPhase(ev){
  const S = TW.S;
  S.units.forEach(u => {
    if (u.dead || u.side !== 'ROC') return;
    if (!u.order || u.order.type !== 'raid') return;

    const p = TW.PLACES.find(x => x.name === u.order.target);
    const h = p && TW.hexAt(p.c, p.r);
    if (!h){ u.order = null; return; }

    if (u.order.prep > 0){
      u.order.prep--;
      ev.push({ t:'log', cls:'c-roc',
        txt:'【特戰】' + u.name + ' 整備突擊 ' + p.name + '，還需 ' + (u.order.prep + 1) + ' 回合。' });
      return;
    }

    /* 制海權太差，小艇根本渡不過去 */
    const sea = S.zoneSea[TW.seaZoneAt(u.c, u.r)] || 0;
    const fail = sea < TW.B.RAID_FAIL_SEA && Math.random() < 0.5;
    u.order = null;

    if (fail){
      const loss = TW.B.RAID_LOSS * (1.4 + Math.random());
      u.hp = Math.max(5, u.hp * (1 - loss));
      u.org = Math.max(0, u.org - 25);
      ev.push({ t:'log', cls:'c-warn',
        txt:'【特戰失敗】' + u.name + ' 滲透 ' + p.name + ' 途中遭攔截，' +
            '損失 ' + Math.round(loss * 100) + '%，任務中止。' +
            '　海峽制海權太差，小艇渡不過去。' });
      return;
    }

    const eff = TW.B.RAID_DAMAGE * (0.7 + Math.random() * 0.6) * (1 + u.xp);
    h.damage = TW.clamp(h.damage + eff, 0, 0.95);
    if (p.staging) S.plaLiftPenalty = (S.plaLiftPenalty || 0) + TW.B.RAID_LIFT_HIT;

    const loss = TW.B.RAID_LOSS * (0.6 + Math.random() * 0.8);
    u.hp = Math.max(5, u.hp * (1 - loss));
    u.org = Math.max(0, u.org - 18);
    S.intl += 1.5;

    ev.push({ t:'strike', c:p.c, r:p.r, cls:'c-roc',
      txt:'【特戰突擊】' + u.name + ' 夜間滲透 ' + p.name + '，爆破油庫與吊掛設施，' +
          '該地可用率降至 ' + Math.round((1 - h.damage) * 100) + '%。' +
          (p.staging ? '　共軍海運能力再受打擊。' : '') });
    ev.push({ t:'log', cls:'c-roc',
      txt:'　└ 突擊隊撤回，自身損失 ' + Math.round(loss * 100) + '%。' });
  });
},

/* ==========================================================================
   我方的兩棲作戰
   --------------------------------------------------------------------------
   玉山級船塢運輸艦不是拿來看的。國軍真正會用到兩棲載具的場合有三種：
     · 外離島（金門、馬祖、澎湖）的兵力輪換與增援——陸路根本到不了
     · 西部灘岸失守之後的逆登陸反擊
     · 本島陸路被切斷時，從海上把部隊送到另一頭

   流程照現實走：**進港裝載 → 航渡 → 搶灘或卸載**。
   裝載要一個回合（重裝備要吊掛、車輛要開進塢艙），裝載中的船不能動。
   ========================================================================== */

/* 這支艦隊還能裝多少個旅 */
liftFree(f){
  const cap = Math.floor(TW.fleetStats(f).lift * (f.hp / f.maxHp));
  return Math.max(0, cap - (f.cargo || []).length);
},

/* 這支部隊現在能不能登艦：要在港口或岸邊，旁邊要有還裝得下的兩棲艦 */
embarkTargets(u){
  const S = TW.S;
  if (!u || u.dead || u.side !== 'ROC') return [];
  if (u.embarked) return [];
  const h = TW.hexAt(u.c, u.r);
  if (!h || h.t === '.') return [];
  /* 有敵軍壓在旁邊就沒辦法從容裝載 */
  if (TW.Hex.neighbors(u.c, u.r).some(([c, r]) =>
        TW.unitsAt(c, r).some(x => x.side !== u.side))) return [];

  return S.navy.filter(f => !f.dead && f.side === 'ROC' &&
    TW.fleetStats(f).lift > 0 && this.liftFree(f) > 0 && !f.loading &&
    TW.Hex.distance(f.c, f.r, u.c, u.r) <= 1);
},

/* 登艦 */
embark(u, f){
  const S = TW.S;
  if (this.liftFree(f) <= 0) return false;
  (f.cargo = f.cargo || []).push(u.id);
  u.embarked = f.id;
  u.order = null;
  f.loading = TW.B.EMBARK_TURNS;
  TW.log('c-roc', '【裝載】' + u.name + ' 開始登上 ' + f.name +
    '（' + TW.B.EMBARK_TURNS + ' 回合完成，裝載中無法航行）。');
  return true;
},

/* 下船（還在船上、船靠著岸就能放回岸上） */
disembarkHere(f, ev){
  const S = TW.S;
  const spot = TW.Hex.neighbors(f.c, f.r).map(([c, r]) => TW.hexAt(c, r))
    .find(h => h && h.t !== '.' && h.owner === 'ROC' &&
               TW.unitsAt(h.c, h.r).filter(x => x.side === 'ROC').length < 2);
  if (!spot) return false;
  return this.amphibLand(f, spot, ev);
},

/* 兩棲上陸。目標是敵佔區就是搶灘，是我方地盤就是單純卸載。 */
amphibLand(f, h, ev){
  const S = TW.S;
  if (!f.cargo || !f.cargo.length) return false;
  if (f.loading > 0) return false;
  if (!h || h.t === '.') return false;
  if (h.T.prc && !S.whatIf) return false;          // 反攻大陸只有架空模式才行
  if (TW.Hex.distance(f.c, f.r, h.c, h.r) > 1) return false;
  if (!TW.Env.canLand()){
    ev.push({ t:'log', cls:'c-warn',
      txt:'【兩棲作戰】海況 ' + (S.wx ? S.wx.sea : '?') + ' 級，我方兩棲載具同樣無法作業。' });
    return false;
  }

  const foes = TW.unitsAt(h.c, h.r).filter(x => x.side === 'PLA' && !x.dead);
  const hostile = foes.length > 0 || h.owner === 'PLA';

  const landed = [];
  const ids = f.cargo.slice();
  f.cargo = [];
  ids.forEach(id => {
    const u = S.units.find(x => x.id === id && !x.dead) ||
              (S.reserveHold || []).find(x => x.id === id);
    if (!u) return;

    let loss;
    if (hostile){
      loss = TW.B.ROC_LAND_LOSS_HOSTILE * (h.beach ? h.beach.diff : 1.4);
      loss *= 1 + h.mines * 0.4;
      loss *= TW.Env.landingSeaPenalty();
      /* 陸戰隊本來就是幹這個的；其他部隊硬上灘會付出代價 */
      loss *= u.T.amphib ? 0.7 : 1.5;
      loss *= 0.75 + Math.random() * 0.5;
    } else {
      loss = TW.B.ROC_LAND_LOSS_FRIENDLY;
    }

    u.hp = Math.max(5, u.hp * (1 - loss));
    u.org = u.maxOrg * (hostile ? TW.B.ROC_LAND_ORG : 0.8);
    u.c = h.c; u.r = h.r;
    u.entrench = 0;
    u.embarked = null;
    u.landedTurn = S.turn;
    u.order = null;
    landed.push({ u, loss });
  });

  if (!landed.length) return false;

  ev.push({ t:'land', c:h.c, r:h.r, cls:'c-roc', side:'ROC', boats:landed.length, fc:f.c, fr:f.r,
    uids:landed.map(x => x.u.id),
    txt: hostile
      ? '【逆登陸】' + f.name + ' 於 ' + TW.hexName(h) + ' 實施兩棲突擊，' +
        landed.length + ' 個旅搶灘上陸。'
      : '【卸載】' + f.name + ' 於 ' + TW.hexName(h) + ' 卸下 ' + landed.length + ' 個旅。' });
  landed.forEach(x => ev.push({ t:'log', cls:'c-roc',
    txt:'　└ ' + x.u.name + (hostile
      ? '　舟波損失 ' + Math.round(x.loss * 100) + '%，兵力剩 ' + Math.round(x.u.hp)
      : '　完成卸載') + '。' }));

  /* 搶灘就地接戰 */
  if (hostile && foes.length){
    ev.push({ t:'battle', c:h.c, r:h.r, cls:'c-warn', txt:'　└ 灘岸遭遇戰爆發！' });
    landed.forEach(x => TW.Combat.fight(x.u, foes, h, ev, true));
  }
  return true;
},

/* 每回合推進裝載進度 */
embarkTick(ev){
  TW.S.navy.forEach(f => {
    if (f.dead || !f.loading) return;
    f.loading--;
    if (f.loading <= 0 && f.side === 'ROC' && (f.cargo || []).length)
      ev.push({ t:'log', cls:'c-ok',
        txt:'【裝載完成】' + f.name + ' 已完成裝載（' + f.cargo.length + ' 個旅），可以出港。' });
  });
},

/* 反潛搜索。每回合跑一次，決定哪些潛艦「這回合被抓到了」。

   潛艦不是靠裝甲活下來的，是靠沒人知道它在哪裡。所以：
     · 平常它不在地圖上，敵方也不能把它設為目標
     · 一開火就會暴露（魚雷與飛彈的發射位置藏不住）
     · 反潛艦艇、反潛機搜到了才會被標定，標定會過期

   台灣海峽平均水深只有六十公尺，是很差的潛艦活動海域；
   東部海域一下去就是幾千公尺，那才藏得住。所以搜索難度分海域。 */
aswSearch(ev){
  const S = TW.S;

  S.navy.forEach(f => {
    if (f.dead || !TW.isSub(f)) return;
    if (f.exposed > 0) f.exposed--;          // 標定會過期

    const foe = f.side === 'ROC' ? 'PLA' : 'ROC';
    const h = TW.hexAt(f.c, f.r);
    const zone = h ? h.zone : 'ZSN';

    /* 水面艦的反潛搜索：要靠得夠近 */
    let power = 0;
    S.navy.forEach(x => {
      if (x.dead || x.side !== foe || x.mission === 'repair') return;
      if (TW.Hex.distance(x.c, x.r, f.c, f.r) > TW.B.ASW_SHIP_RANGE) return;
      power += TW.fleetStats(x).asw * (x.hp / x.maxHp);
    });

    /* 反潛機：整個海域都在它的搜索範圍內 */
    S.air.forEach(w => {
      if (w.dead || w.n <= 0 || w.side !== foe || w.mission === 'rest') return;
      if (w.zone !== zone) return;
      /* 一個中隊沒辦法同時覆蓋整片海域——它只能在某幾條航線上巡邏，
         所以整支機隊的反潛能力在單一回合裡只發揮得出一小部分。 */
      power += TW.airStat(w, 'asw') * w.n * 0.12 * TW.wingReady(w) * TW.Env.airFactor();
    });

    if (power <= 0) return;

    /* 水深：海峽淺，東部深 */
    power *= (zone === 'ZE') ? TW.B.ASW_DEEP : TW.B.ASW_SHALLOW;

    const chance = power / (power + TW.B.ASW_DETECT_K);
    if (Math.random() < chance){
      const wasHidden = !(f.exposed > 0);
      f.exposed = TW.B.SUB_EXPOSE_DETECT;
      if (wasHidden){
        const zn = (TW.ZONES.find(z => z.id === zone) || {}).name || '該海域';
        ev.push({ t:'log', cls: foe === 'ROC' ? 'c-ok' : 'c-warn',
          txt: foe === 'ROC'
            ? '【反潛】我方於' + zn + '偵獲共軍潛艦蹤跡，' + f.name + ' 已被標定。'
            : '【警告】共軍反潛兵力於' + zn + '偵獲我方潛艦，' + f.name + ' 位置已暴露。' });
      }
    }
  });
},

/* 新造的船交艦。同型的併進既有艦隊，沒有就在左營新編一支。
   船是從船廠出來的，所以一律出現在我方還控制的軍港；
   軍港全丟了就交不了艦——這是刻意的。 */
commissionShip(E, packs){
  const S = TW.S;
  const n = (E.pack || 1) * (packs || 1);
  const N = TW.NAVY_TYPES[E.shipType];
  if (!N) return '（無此艦型）';

  /* 沒有軍港就交不了艦——船是從船廠出來的，不是憑空冒出來的。
     台船與中信造船都在高雄，所以左營優先，其次蘇澳、馬公。 */
  const order = ['左營高雄', '蘇澳軍港', '馬公'];
  let base = null;
  for (const nm of order){
    const p = TW.PLACES.find(x => x.name === nm);
    if (p && TW.hexAt(p.c, p.r).owner === 'ROC' && TW.hexAt(p.c, p.r).damage < 0.85){ base = p; break; }
  }
  if (!base) return '（軍港皆已失守，無法交艦）';

  /* 同名的殘骸先清掉，否則面板上會留著一支耐受度負數的鬼艦隊 */
  for (let i = S.navy.length - 1; i >= 0; i--)
    if (S.navy[i].dead && S.navy[i].name === E.joinFleet) S.navy.splice(i, 1);

  let f = S.navy.find(x => !x.dead && x.side === 'ROC' && x.name === E.joinFleet);
  if (f){
    const slot = f.ships.find(s => s.t === E.shipType);
    if (slot){ slot.n += n; slot.maxN += n; }
    else f.ships.push({ t:E.shipType, n, maxN:n, N, hp:N.hp * n });
    f.maxHp = f.ships.reduce((s, x) => s + x.N.hp * x.maxN, 0);
    f.hp += N.hp * n;
    return f.name;
  }

  /* 母港外海挑一格「離共軍最遠」的水域，別讓剛交的船一出廠就被打沉 */
  const cands = S.hexes.filter(x => x.t === '.' &&
    TW.Hex.distance(x.c, x.r, base.c, base.r) <= 2);
  if (!cands.length) return '（母港無可用泊地）';
  const risk = x => {
    let d = 99;
    S.navy.forEach(f => { if (!f.dead && f.side === 'PLA')
      d = Math.min(d, TW.Hex.distance(x.c, x.r, f.c, f.r)); });
    return -d;
  };
  cands.sort((a2, b2) => risk(a2) - risk(b2));
  const spot = cands[0];

  f = TW.mkNavy('ROC', { name:E.joinFleet, c:spot.c, r:spot.r,
                         mission:'patrol', ships:[[E.shipType, n]] });
  S.navy.push(f);
  return f.name + '（新編）';
},

/* 美軍介入：把第七艦隊與駐日、關島的兵力真的放到地圖上。
   以前介入只是給共軍一個 30% 的懲罰數字，玩家看不到任何東西上場。
   美軍算在我方陣營（side ROC），但番號與代號都標明是美軍。 */
usIntervene(ev){
  const S = TW.S;
  const east = z => TW.hexAt(z[0], z[1]);

  /* --- 第七艦隊：兩個航艦打擊群，在台灣東部海域 --- */
  const groups = [
    { name:'美軍第五航艦打擊群（雷根號）', c:23, r:8,
      ships:[['cvn',1],['cg47',1],['ddg51',4],['ssn774',1]] },
    { name:'美軍第三航艦打擊群（卡爾文森號）', c:23, r:15,
      ships:[['cvn',1],['cg47',1],['ddg51',4],['ssn774',1]] },
    { name:'美軍第31遠征打擊群', c:22, r:12,
      ships:[['lha6',1],['ddg51',3]] }
  ];
  groups.forEach(g => {
    const f = TW.mkNavy('ROC', { name:g.name, c:g.c, r:g.r, mission:'strike', ships:g.ships });
    if (f){ f.us = true; S.navy.push(f); }
  });

  /* --- 駐日、關島的航空兵力 --- */
  [
    { name:'美軍第18聯隊（嘉手納）', ac:'f22',  n:24, base:'花蓮佳山', zone:'ZN' },
    { name:'美軍第9遠征轟炸機隊（安德森）', ac:'b1b', n:8, base:'台東志航', zone:'ZE' },
    { name:'美軍艦載機聯隊（CVW-5）', ac:'f35c', n:36, base:'花蓮佳山', zone:'ZC' }
  ].forEach(o => {
    const w = TW.mkAir('ROC', o);
    if (w){ w.us = true; w.mission = 'cap'; w.zone = o.zone; S.air.push(w); }
  });

  /* --- 陸戰隊遠征隊：直接上岸協防 --- */
  const spot = S.hexes.find(h => h.owner === 'ROC' && h.t !== '.' &&
    h.place && h.place.name === '花蓮佳山');
  const mu = TW.mkGround('ROC', {
    name:'美軍第31陸戰遠征隊', corps:'美軍', type:'us_marine',
    c: spot ? spot.c : 21, r: spot ? spot.r : 10, xp:0.45 });
  if (mu){ mu.us = true; S.units.push(mu); }

  ev.push({ t:'log', cls:'c-us',
    txt:'【第七艦隊】兩個航艦打擊群進入台灣東部海域，第31遠征打擊群隨行。' });
  ev.push({ t:'log', cls:'c-us',
    txt:'【美軍空中兵力】嘉手納 F-22、關島 B-1B、CVW-5 艦載機聯隊進入台灣防空識別區。' });
  ev.push({ t:'log', cls:'c-us',
    txt:'【美軍陸戰隊】第31陸戰遠征隊於花蓮上陸，編入東部防衛。' });
},

/* 海上航路。和陸軍的 path() 一樣是 A*，只是只能走海面，
   而且會稍微避開雷區——艦長不會直直開過自己知道的水雷。 */
seaPath(f, tc, tr){
  const start = f.c + ',' + f.r, goal = tc + ',' + tr;
  if (start === goal) return [];
  const th = TW.hexAt(tc, tr);
  if (!th || th.t !== '.') return null;

  const open = [[0, f.c, f.r]], came = {}, g = { [start]:0 };
  let guard = 0;
  while (open.length && guard++ < 6000){
    open.sort((a, b) => a[0] - b[0]);
    const [, c, r] = open.shift();
    const k = c + ',' + r;
    if (k === goal) break;
    TW.Hex.neighbors(c, r).forEach(([nc, nr]) => {
      const n = TW.hexAt(nc, nr);
      if (!n || n.t !== '.') return;
      /* 雷區要繞——但只繞「知道的」。我方當然知道自己布在哪；
         共軍要等觸雷或掃過雷才知道。感應水雷的價值就在於對方不知道它在哪。 */
      const known = (f.side === 'ROC') || n.plaKnows;
      const cost = 1 + (known ? n.mines * 3 : 0);
      const ng = g[k] + cost;
      const nk = nc + ',' + nr;
      if (g[nk] !== undefined && g[nk] <= ng) return;
      g[nk] = ng; came[nk] = [c, r];
      open.push([ng + TW.Hex.distance(nc, nr, tc, tr), nc, nr]);
    });
  }
  if (g[goal] === undefined) return null;

  const out = [];
  let cur = goal;
  while (cur !== start){
    const [pc, pr] = cur.split(',').map(Number);
    out.unshift([pc, pr]);
    const prev = came[cur];
    if (!prev) return null;
    cur = prev[0] + ',' + prev[1];
  }
  return out;
},

/* 依照航速沿著航路前進。走完就把命令清掉。 */
sailAlong(f, ev){
  /* 沿途經過的格子要記下來：船開得快，一回合會穿過好幾格，
     雷區不能只看最後停在哪一格 */
  f.passed = [];
  if (!f.order || f.order.type !== 'sail' || !f.order.path) return;
  if (f.loading > 0) return;              // 還在吊掛裝備，開不了
  let spd = TW.fleetSpeed(f);
  while (spd > 0 && f.order.path.length){
    const [c, r] = f.order.path[0];
    const h = TW.hexAt(c, r);
    if (!h || h.t !== '.'){ f.order = null; return; }
    f.c = c; f.r = r;
    f.passed.push([c, r]);
    f.order.path.shift();
    spd--;
  }
  if (!f.order.path.length){
    f.order = null;
    if (f.side === 'ROC' && ev)
      ev.push({ t:'log', cls:'c-roc',
        txt:'【航行】' + f.name + ' 抵達 ' + TW.hexName(TW.hexAt(f.c, f.r)) + '。' });
  }
},

/* 這支部隊現在能不能做阻絕爆破。
   工兵得待在我方控制、沒有敵軍的格子上才有辦法從容作業。 */
canDemo(u){
  if (!u || u.dead || !u.T.engineer) return false;
  const h = TW.hexAt(u.c, u.r);
  if (!h || h.t === '.' || h.T.prc) return false;
  if (h.demo) return false;                                   // 已經埋好或正在埋
  if (h.obstacle > 0) return false;                           // 剛炸過，還是廢墟
  return !TW.unitsAt(u.c, u.r).some(x => x.side !== u.side);
},

/* 每回合推進埋設進度 */
demoWork(ev){
  const S = TW.S;
  S.units.forEach(u => {
    if (u.dead || !u.T.engineer) return;
    if (!u.order || u.order.type !== 'demo') return;
    const h = TW.hexAt(u.c, u.r);
    if (!h || !h.demo || h.demo.by !== u.side) return;

    /* 有敵軍壓在頭上就沒辦法慢慢埋 */
    if (TW.unitsAt(u.c, u.r).some(x => x.side !== u.side)){
      if (u.side === 'ROC')
        ev.push({ t:'log', cls:'c-warn',
          txt:'【阻絕】' + u.name + ' 在敵軍壓迫下無法完成爆破裝藥的埋設。' });
      return;
    }
    if (h.demo.ready) return;

    h.demo.left--;
    if (h.demo.left <= 0){
      h.demo.ready = true;
      u.order = null;
      if (u.side === 'ROC')
        ev.push({ t:'log', cls:'c-ok',
          txt:'【阻絕】' + u.name + ' 已於 ' + TW.hexName(h) +
              ' 完成爆破裝藥埋設，可隨時引爆。' });
    }
  });
},

/* 引爆。這是「敵人踏進來的那一刻才按下去」的東西。 */
detonate(c, r, side, ev, auto){
  const S = TW.S, h = TW.hexAt(c, r);
  if (!h || !h.demo || !h.demo.ready || h.demo.by !== side) return false;

  const foes = TW.unitsAt(c, r).filter(x => x.side !== side && !x.dead);
  h.demo = null;
  h.obstacle = TW.B.DEMO_OBSTACLE;

  /* 玩家即時按下去的走戰情訊息；回合結算中自動引爆的走事件流（才會跟動畫同步） */
  const live = !ev;
  const out = ev || [];
  const cls = side === 'ROC' ? 'c-ok' : 'c-pla';
  out.push({ t:'boom', c, r, cls,
    txt:(auto ? '【自動引爆】守軍撤出 ' + TW.hexName(h) + '，預置爆破裝藥在共軍進入時引爆！'
              : '【引爆】' + TW.hexName(h) + ' 預置爆破裝藥引爆！') +
        (foes.length ? '' : '　該格沒有敵軍，只留下阻絕障礙。') });

  foes.forEach(x => {
    x.org = Math.max(0, x.org - TW.B.DEMO_ORG);
    x.hp  = Math.max(0, x.hp - TW.B.DEMO_HP);
    x.entrench = 0;
    out.push({ t:'log', cls,
      txt:'　└ ' + x.name + ' 遭爆破打擊，組織度 −' + TW.B.DEMO_ORG + '、兵力 −' + TW.B.DEMO_HP + '。' });
    if (x.hp <= 0) TW.killUnit(x, out, '在阻絕爆破中被摧毀。');
  });

  if (live){
    out.forEach(e => { if (e.txt) TW.log(e.cls || '', e.txt); });
    if (TW.Map && TW.Map.addFx) TW.Map.addFx({ t:'boom', c, r });
  }
  return true;
},

/* 守軍撤出、共軍進入的格子如果還埋著我方的爆破裝藥，就在這一刻引爆。
   預置爆破本來就是「最後一批人撤出時按下去」的東西，不會留給敵人去拆。
   我方部隊還在格子裡就不引爆（會炸到自己人）。
   還沒埋完的裝藥則會被進入的共軍發現並拆除。 */
autoDetonate(ev){
  const S = TW.S;
  S.hexes.forEach(h => {
    if (!h.demo) return;
    const us = TW.unitsAt(h.c, h.r);
    const own = us.some(u => u.side === h.demo.by);
    const foe = us.some(u => u.side !== h.demo.by);
    if (!foe || own) return;
    if (h.demo.ready){
      this.detonate(h.c, h.r, h.demo.by, ev, true);
    } else {
      h.demo = null;
      ev.push({ t:'log', cls:'c-warn',
        txt:'【阻絕】' + TW.hexName(h) + ' 尚未完成的爆破裝藥被進入的共軍發現並拆除。' });
    }
  });
},

/* 障礙區每回合遞減 */
obstacleTick(){
  TW.S.hexes.forEach(h => { if (h.obstacle > 0) h.obstacle--; });
},

/* 艦隊現在還「浮著」的那些船，總共能承受多少傷害。
   被擊沉的船不會因為進廠就回來，所以整補的上限是倖存艦艇的耐受度。 */
fleetCap(f){
  return f.ships.reduce((s, x) => s + x.N.hp * x.n, 0);
},

/* 這支艦隊現在停靠的港口（要在我方手上、而且沒被炸爛）。
   軍港有乾塢與彈藥庫，商港只能做基本搶修。 */
portFor(f){
  /* 艦隊停在海上，港口在岸上，所以要找「進得去的港」。
     兩格（30 公里）以內都算在港口的進出航道與錨地範圍——
     左營與基隆在這張圖上被畫在內陸一格，卡死在相鄰格會讓海軍主基地不能用。 */
  let best = null;
  TW.PLACES.forEach(p => {
    const x = TW.hexAt(p.c, p.r);
    if (!x || x.owner !== f.side || x.damage >= 0.85) return;
    if (TW.Hex.distance(f.c, f.r, p.c, p.r) > 2) return;
    let cand = null;
    if (p.type.includes('navalbase')) cand = { h:x, rate:TW.B.NAVY_REPAIR_NAVALBASE, kind:'軍港' };
    else if (p.type.includes('port')) cand = { h:x, rate:TW.B.NAVY_REPAIR_PORT,      kind:'商港' };
    if (cand && (!best || cand.rate > best.rate)) best = cand;
  });
  return best;
},

/* 回港整補：修復戰損。港口被炸得越爛，修得越慢。 */
navalRepair(ev){
  const S = TW.S;
  S.navy.forEach(f => {
    if (f.dead || f.mission !== 'repair') return;
    const cap = this.fleetCap(f);
    const port = this.portFor(f);

    if (!port){
      if (f.side === 'ROC')
        ev.push({ t:'log', cls:'c-warn',
          txt:'【整補】' + f.name + ' 附近沒有可用的港口，無法進廠。請先航向左營、蘇澳或馬公。' });
      return;
    }
    if (f.hp >= cap - 0.5){
      if (f.side === 'ROC')
        ev.push({ t:'log', cls:'c-ok',
          txt:'【整補】' + f.name + ' 於 ' + port.h.place.name + ' 完成整補，可歸建出海。' });
      return;
    }

    /* 彈藥也要從全國存量裡扣——修船容易，補飛彈難 */
    if (f.side === 'ROC') TW.Env.spend(TW.B.NAVY_REPAIR_AMMO);

    const rate = port.rate * (1 - port.h.damage) * (0.6 + 0.4 * (S.power || 1));
    const before = f.hp;
    f.hp = Math.min(cap, f.hp + cap * rate);
    ev.push({ t:'log', cls: f.side === 'ROC' ? 'c-ok' : 'c-pla',
      txt:'【整補】' + f.name + ' 於 ' + port.h.place.name + '（' + port.kind + '）修復戰損，' +
          '耐受度 ' + Math.round(before) + ' → ' + Math.round(f.hp) +
          '／' + Math.round(cap) + '。' });
  });
},

/* 共軍縱深機場的受損程度 → 出動率折扣。
   打對岸的機場不會讓飛機消失，但會讓它們飛不出來——
   跟共軍打我們的機場是同一個道理。 */
plaAirfieldPenalty(){
  let hit = 0;
  TW.PLACES.forEach(p => {
    if (p.side !== 'PLA') return;
    if (!p.type.includes('airbase')) return;
    const h = TW.hexAt(p.c, p.r);
    if (h) hit += h.damage;
  });
  return hit * TW.B.DEEP_STRIKE_SORTIE;
},

/* 全國供電率：電廠被打掉或被佔領，工業產能會跟著垮。
   台灣的電網是一條南北縱貫的主幹，少了幾座大機組就得限電。 */
recalcPower(ev){
  const S = TW.S;
  let have = 0, total = 0;
  TW.PLACES.forEach(p => {
    if (!p.mw) return;
    total += p.mw;
    const h = TW.hexAt(p.c, p.r);
    /* 電網孤島化與備援機組：機組受損不再等於出力歸零 */
    const res = TW.clamp(S.mod.powerResist || 0, 0, 0.6);
    if (h && h.owner === 'ROC') have += p.mw * (1 - h.damage * (1 - res));
  });
  S.power = total > 0 ? have / total : 1;

  const lv = S.power < TW.B.POWER_BROWNOUT * 0.6 ? 2 : (S.power < TW.B.POWER_BROWNOUT ? 1 : 0);
  if (ev && lv > (S.powerWarn || 0)){
    ev.push({ t:'log', cls:'c-warn', txt: lv === 2
      ? '【電力危機】主要機組多數停擺，全國大規模停電，軍工生產與整補幾乎中斷。'
      : '【電力警告】供電率低於安全值，台電啟動分區限電，工業產能下滑。' });
  } else if (ev && lv === 0 && (S.powerWarn || 0) > 0){
    ev.push({ t:'log', cls:'c-ok', txt:'【電力】機組陸續併聯，供電恢復正常。' });
  }
  S.powerWarn = lv;
  return S.power;
},

/* A* 路徑。loose = true 時忽略友軍堆疊（給 AI 規劃長程路線用） */
path(u, tc, tr, loose){
  const start = u.c + ',' + u.r, goal = tc + ',' + tr;
  const open = [[0, u.c, u.r]], came = {}, g = { [start]: 0 };
  let guard = 0;
  while (open.length && guard++ < 4000){
    open.sort((a, b) => a[0] - b[0]);
    const [, c, r] = open.shift();
    const k = c + ',' + r;
    if (k === goal) break;
    TW.Hex.neighbors(c, r).forEach(([nc, nr]) => {
      if (!this.canEnter(u, nc, nr, loose) && !(nc === tc && nr === tr)) return;
      const nk = nc + ',' + nr;
      const ng = g[k] + this.moveCost(u, nc, nr, c, r);
      if (g[nk] === undefined || ng < g[nk]){
        g[nk] = ng;
        came[nk] = [c, r];
        /* 估計值要乘上最便宜的一步（國道 0.5），否則 A* 會看不到「繞去上國道比較快」 */
        open.push([ng + TW.Hex.distance(nc, nr, tc, tr) * 0.5, nc, nr]);
      }
    });
  }
  if (g[goal] === undefined) return null;
  const out = [];
  let cur = [tc, tr];
  while (cur[0] !== u.c || cur[1] !== u.r){
    out.unshift(cur);
    cur = came[cur[0] + ',' + cur[1]];
    if (!cur) return null;
  }
  return out;
},

/* --------------------------------------------------------------------------
   套用研發／國策／事件的效果
   -------------------------------------------------------------------------- */
applyEffect(eff){
  const S = TW.S;
  for (const k in eff){
    const v = eff[k];
    if (k === 'ic') S.ic += v;
    else if (k === 'pp') S.pp += v;
    else if (k === 'will') S.will += v;
    else if (k === 'intl') S.intl += v;
    else if (k === 'plaWill') S.plaWill += v;
    else if (k === 'mineStock') S.stock.seamine = (S.stock.seamine || 0) + v / 60;
    else if (k === 'ammoFill'){
      const got = TW.Env.refill(v);
      TW.log('c-us', '【後勤】緊急彈藥入庫，戰備彈藥 +' + Math.round(got) +
        '（現有 ' + Math.round(S.ammo) + ' / ' + S.ammoMax + '）。');
    }
    else if (k === 'manpower') S.manpower += v;
    else if (k === 'newSub'){
      S.navy.push({ id:'sub' + S.turn, kind:'navy', side:'ROC', name:'海鯤級後續艦',
        ships:[{ t:'haikun', n:1, maxN:1, N:TW.NAVY_TYPES.haikun, hp:TW.NAVY_TYPES.haikun.hp }],
        c:22, r:12, mission:'strike', hp:46, maxHp:46, dead:false });
    }
    else if (S.mod[k] !== undefined) S.mod[k] += v;
    else S.mod[k] = (S.mod[k] || 0) + v;
  }
}

};

/* ---------------- 小工具 ---------------- */
function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
TW.clamp = clamp;

function distToZone(c, r, zid){
  let best = 99;
  for (let rr = 0; rr < TW.B.MAP_H; rr += 2)
    for (let cc = 0; cc < TW.B.MAP_W; cc += 2){
      if (TW.zoneOf(cc, rr) !== zid) continue;
      const h = TW.hexAt(cc, rr);
      if (!h || h.t !== '.') continue;
      best = Math.min(best, TW.Hex.distance(c, r, cc, rr));
    }
  return best;
}

/* 地點易手時的政治／工業效果 */
TW.onPlaceCaptured = function(h, side){
  const S = TW.S, p = h.place;
  /* 架空模式：打下對岸的地方，對共軍是政治上的重擊 */
  if (side === 'ROC' && h.T.prc){
    S.plaWill -= 12;
    S.will += 6;
    S.intl += 4;
    TW.log('c-ok', '【反攻】國軍攻佔 ' + (p ? p.name : '對岸據點') +
      '！共軍戰爭意志重挫。');
    return;
  }
  if (!p || p.vp <= 0) return;
  if (side === 'PLA'){
    S.will -= TW.B.WILL_LOSS_PER_CITY * (p.vp / 20) * (1 - TW.clamp(S.mod.willGuard || 0, 0, 0.6));
    S.ic   -= Math.round(p.ind);
    S.intl += TW.B.INTL_PER_CITY_LOST;
    TW.log('c-pla', '【失守】' + p.name + ' 陷落。工業產能 −' + p.ind + '，戰爭意志重挫。');
    /* 駐在這裡的機隊跑道沒了——提醒玩家趕快轉場 */
    const stuck = S.air.filter(w => !w.dead && w.side === 'ROC' && w.base === p.name && !w.transit && w.n > 0);
    if (stuck.length){
      TW.log('c-warn', '【空軍】' + stuck.map(w => w.name).join('、') + ' 的駐地 ' + p.name +
        ' 失守，只剩疏散場站可用（出勤率 12%）。到「空軍」分頁把他們轉場到別的基地。');
      TW.hint('rebase', '機場被佔了，飛機還在',
        '基地失守不代表飛機沒了——它們疏散到備用跑道，但只能發揮一成多的戰力。\n\n' +
        '到「空軍」分頁，在那個聯隊下面的「轉場」選一座還在我們手上的基地。\n' +
        '轉場要一個回合，這段期間不出勤，到了之後就恢復正常。\n\n' +
        '選基地的時候注意兩件事：容量（擠太多飛機出勤率會打折，也更招飛彈），\n' +
        '還有離你要打的空域近不近（太遠也會打折）。');
    }
    if (p.type.includes('capital')) S.flags.taipeiFallen = true;
  } else {
    S.will += 1.5;   // 工業產能在 homeFront() 會依實際控制區重算，這裡不重複加
    TW.log('c-ok', '【收復】國軍收復 ' + p.name + '。');
  }
};
