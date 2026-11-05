/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   戰鬥動畫
   --------------------------------------------------------------------------
   這個檔案管兩件事：

   一、部隊「走過去」而不是「瞬移」
       按下執行回合之後，引擎會一口氣把整回合算完，這時候所有部隊其實
       已經在新位置了。所以播放前先把每支部隊的位置拍一張快照，
       播放時部隊先畫在舊位置，等戰報播到「它移動了」那一行，才從舊位置
       滑到新位置；被殲滅的部隊也是等到那一行才爆炸、消失。

   二、各種戰鬥特效
       彈道飛彈與攔截彈、砲兵彈幕、地面交火曳光彈、空戰纏鬥、
       空襲機群、反艦飛彈、魚雷、登陸艇搶灘、傘兵、沉船、
       爆炸的火光與濃煙、傷害數字、畫面震動。

   想調動畫速度或份量，改下面 FX 那幾個數字就好。
   ========================================================================== */

TW.FX = {
  GLIDE_MS: 520,        // 部隊從舊位置滑到新位置要多久
  MAX_PARTS: 900,       // 同時最多幾顆粒子（煙、火花、碎片），太多會卡
  SHAKE: true           // 大爆炸時畫面震動
};

Object.assign(TW.Map, {

anim:null,       // 回合動畫中的部隊位置快照
parts:[],        // 粒子
texts:[],        // 浮起來的傷害數字
shake:null,
lastFrame:0,

/* --------------------------------------------------------------------------
   一、部隊位置動畫
   -------------------------------------------------------------------------- */

/* 回合結算「之前」呼叫：記下每支部隊現在在哪裡 */
beginAnim(){
  const snap = {};
  TW.S.units.forEach(u => { if (!u.dead && !u.embarked) snap[u.id] = { c:u.c, r:u.r }; });
  this.anim = { on:true, snap, rel:{} };
},

/* 戰報播到跟這支部隊有關的那一行：開始滑動（或爆炸消失、或淡入出現） */
release(uid){
  const A = this.anim;
  if (!A || !uid || A.rel[uid] !== undefined) return;
  A.rel[uid] = performance.now();
},

/* 播放結束：還沒輪到的全部一起動，動完就不再追蹤 */
endAnim(){
  const A = this.anim;
  if (!A) return;
  const now = performance.now();
  A.on = false;
  TW.S.units.forEach(u => { if (A.rel[u.id] === undefined) A.rel[u.id] = now; });
  Object.keys(A.snap).forEach(id => { if (A.rel[id] === undefined) A.rel[id] = now; });
  A.doneAt = now + TW.FX.GLIDE_MS + 50;
},

/* 這支部隊這一幀要畫在哪裡、透明度多少。回傳 null 代表不畫。 */
displayOf(u, now){
  const A = this.anim;
  if (u.embarked) return null;
  if (!A) return u.dead ? null : { c:u.c, r:u.r, a:1 };
  const s = A.snap[u.id], t0 = A.rel[u.id];
  const G = TW.FX.GLIDE_MS;
  if (s){
    if (t0 === undefined) return { c:s.c, r:s.r, a:1 };                // 還沒輪到它
    const t = (now - t0) / G;
    if (u.dead) return t < 1 ? { c:s.c, r:s.r, a:1 - t } : null;       // 被殲滅：淡出
    if (t >= 1 || (s.c === u.c && s.r === u.r)) return { c:u.c, r:u.r, a:1 };
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;    // 緩進緩出
    return { from:s, c:u.c, r:u.r, t:e, a:1 };
  }
  /* 這回合才出現的部隊（登陸、空降、動員、編成）：輪到它才淡入 */
  if (u.dead) return null;
  if (t0 === undefined) return A.on ? null : { c:u.c, r:u.r, a:1 };
  return { c:u.c, r:u.r, a:Math.min(1, (now - t0) / G) };
},

drawUnits(ctx, R){
  const S = TW.S, now = performance.now();
  if (this.anim && !this.anim.on && now > (this.anim.doneAt || 0)) this.anim = null;

  /* 先算每支部隊的顯示位置，再依「顯示的那一格」分組算堆疊偏移 */
  const list = [];
  S.units.forEach(u => {
    const d = this.displayOf(u, now);
    if (!d) return;
    const h = TW.hexAt(d.c, d.r);
    if (u.side === 'PLA' && h && !h.seen && !(d.from && TW.hexAt(d.from.c, d.from.r).seen)) return;
    list.push({ u, d, key: d.c + ',' + d.r });
  });
  const groups = {};
  list.forEach(x => { (groups[x.key] = groups[x.key] || []).push(x); });
  list.forEach(x => {
    const g = groups[x.key];
    const q = TW.Hex.center(x.d.c, x.d.r, R);
    let cx = q.x, cy = q.y;
    if (x.d.from){
      const p = TW.Hex.center(x.d.from.c, x.d.from.r, R);
      cx = p.x + (q.x - p.x) * x.d.t;
      cy = p.y + (q.y - p.y) * x.d.t - Math.sin(x.d.t * Math.PI) * R * 0.12;   // 走路微微起伏
      /* 移動中揚起的塵土 */
      if (Math.random() < 0.35) this.puff(cx, cy + R * 0.2, 'dust');
    }
    this.drawUnit(ctx, x.u, R, cx, cy, g.indexOf(x), g.length, x.d.a);
  });
},

/* --------------------------------------------------------------------------
   二、特效
   -------------------------------------------------------------------------- */

P(c, r){ return TW.Hex.center(c, r, TW.B.HEX_R); },

addFx(e){
  if (!e) return;
  const now = performance.now();
  const R = TW.B.HEX_R;
  if (e.uid) this.release(e.uid);
  if (e.uids) e.uids.forEach(id => this.release(id));
  if (e.c === undefined || e.c === null) return;
  if (e.quiet) return;                                  // 共軍的移動：只要讓部隊滑過去就好
  const to = this.P(e.c, e.r);
  const has = (c, r) => c !== undefined && c !== null && r !== undefined && r !== null;
  const F = (o) => { o.t0 = o.t0 || now; this.fx.push(o); };

  switch (e.t){

  case 'missile': {
    if (e.arty && has(e.fc, e.fr)){
      /* 砲兵彈幕：一串砲彈拋物線落下 */
      const from = this.P(e.fc, e.fr);
      const col = e.side === 'ROC' ? '#ffd27a' : '#ff9a70';
      for (let i = 0; i < 6; i++)
        F({ k:'shell', from, to:jitter(to, R * 0.35), t0:now + i * 70, dur:620, col, h:0.35 });
      break;
    }
    if (has(e.fc, e.fr)){
      /* 彈道飛彈：從福建內陸高拋過來，一部分在半空被攔截 */
      const from = this.P(e.fc, e.fr); from.x -= R * 1.5;
      const m = Math.max(2, Math.min(7, Math.ceil((e.n || 6) / 3)));
      const k = Math.round(m * ((e.kills || 0) / Math.max(1, e.n || 1)));
      const aa = has(e.ac, e.ar) ? this.P(e.ac, e.ar) : null;
      for (let i = 0; i < m; i++){
        const kill = i < k;
        F({ k:'bm', from:jitter(from, R), to:jitter(to, R * 0.45), t0:now + i * 110, dur:1150,
            kill, killAt:0.62 + Math.random() * 0.18, aa });
      }
      break;
    }
    F({ k:'bm', from:{ x:to.x - 260, y:to.y - 90 }, to, dur:900 });
    break;
  }

  case 'strike': {
    if (e.jets && has(e.fc, e.fr)){
      /* 空襲：機群從基地飛過去、投彈、拉起 */
      const from = this.P(e.fc, e.fr);
      for (let i = 0; i < 3; i++)
        F({ k:'jetrun', from:jitter(from, R * 0.4), to:jitter(to, R * 0.3), t0:now + i * 120, dur:1100,
            col: e.side === 'ROC' ? '#bfe6ff' : '#ffc2bb' });
    } else if (has(e.fc, e.fr)){
      const from = this.P(e.fc, e.fr);
      if (e.cruise) from.x += R * 6;
      for (let i = 0; i < (e.arty ? 5 : 3); i++)
        F({ k: e.arty ? 'shell' : 'cm', from:jitter(from, R * 0.3), to:jitter(to, R * 0.3), t0:now + i * 90,
            dur: e.arty ? 700 : 1000, col:'#ffd27a', h: e.arty ? 0.25 : 0.05 });
    } else {
      F({ k:'bm', from:{ x:to.x + 260, y:to.y - 90 }, to, dur:900 });
    }
    break;
  }

  case 'boom': {
    const big = e.big || e.kill;
    this.explode(to.x, to.y, big ? 1.4 : (e.small ? 0.6 : 1));
    if (e.dmg) this.floatText(to.x, to.y - R * 0.5, '−' + e.dmg.toFixed(1), e.side === 'ROC' ? '#ff8a7a' : '#8fd6ff');
    if (big) this.kick(5);
    break;
  }

  case 'battle': {
    if (e.open && has(e.fc, e.fr)){
      /* 地面交火：攻方打過去的曳光彈、守方還擊（比較稀）、雙方陣地的槍口閃光 */
      const from = this.P(e.fc, e.fr);
      F({ k:'fire', from, to, dur:1300, col: e.side === 'ROC' ? '#ffe28a' : '#ff9a6a',
          back: e.side === 'ROC' ? '#ff9a6a' : '#ffe28a' });
    } else if (e.line){
      /* 單一守軍的交戰結果：雙方頭上飄傷害數字 */
      if (e.dD > 0.05) this.floatText(to.x + R * 0.25, to.y - R * 0.55, '−' + e.dD.toFixed(1),
        e.side === 'ROC' ? '#8fd6ff' : '#ff8a7a');
      if (has(e.fc, e.fr) && e.dA > 0.05){
        const from = this.P(e.fc, e.fr);
        this.floatText(from.x - R * 0.25, from.y - R * 0.55, '−' + e.dA.toFixed(1),
          e.side === 'ROC' ? '#ff8a7a' : '#8fd6ff');
      }
      for (let i = 0; i < 3; i++) this.explode(to.x + (Math.random() - 0.5) * R, to.y + (Math.random() - 0.5) * R * 0.6, 0.35);
    } else {
      F({ k:'pulse', c:e.c, r:e.r, dur:900 });
    }
    break;
  }

  case 'land': {
    if (e.chutes){
      /* 空降：傘兵一朵一朵飄下來 */
      for (let i = 0; i < 9; i++){
        const x = to.x + (Math.random() - 0.5) * R * 1.6, y = to.y - R * (1.6 + Math.random());
        this.parts.push({ k:'chute', x, y, vx:(Math.random() - 0.5) * 0.004, vy:R * 0.0014,
          t0:now + i * 90, life:1500, ground:to.y + (Math.random() - 0.5) * R * 0.5,
          col: e.side === 'ROC' ? '#dff1ff' : '#ffe0dc' });
      }
    } else if (e.form){
      F({ k:'spawn', c:e.c, r:e.r, dur:1400 });
    } else if (e.boats && has(e.fc, e.fr)){
      /* 搶灘：登陸艇拖著白色航跡衝上灘頭 */
      const from = this.P(e.fc, e.fr);
      const n = Math.min(7, (e.boats || 1) + 2);
      for (let i = 0; i < n; i++)
        F({ k:'boat', from:jitter(from, R * 0.6), to:jitter(to, R * 0.35), t0:now + i * 80, dur:1100,
            col: e.side === 'ROC' ? '#9fd0ff' : '#ffb2a8' });
      F({ k:'landring', c:e.c, r:e.r, t0:now + 900, dur:900 });
    } else {
      F({ k:'landring', c:e.c, r:e.r, dur:1200 });
    }
    break;
  }

  case 'naval': {
    const has2 = has(e.c2, e.r2);
    const tgt = has2 ? this.P(e.c2, e.r2) : to;
    if (e.sub){
      F({ k:'torpedo', from:to, to:tgt, dur:1100 });
    } else if (e.asw){
      for (let i = 0; i < 4; i++) F({ k:'splash', x:tgt.x + (Math.random() - 0.5) * R, y:tgt.y + (Math.random() - 0.5) * R * 0.6,
        t0:now + i * 150, dur:800 });
    } else if (e.airAshm && has2){
      F({ k:'jetrun', from:to, to:tgt, dur:900, col: e.cls === 'c-roc' ? '#bfe6ff' : '#ffc2bb', noBomb:true });
      for (let i = 0; i < 2; i++)
        F({ k:'cm', from:{ x:(to.x + tgt.x) / 2, y:(to.y + tgt.y) / 2 }, to:jitter(tgt, R * 0.3), t0:now + 500 + i * 90,
            dur:600, col:'#ffe8a8', h:0.02, sea:true });
    } else if (has2 && (e.c !== e.c2 || e.r !== e.r2)){
      for (let i = 0; i < 3; i++)
        F({ k:'cm', from:jitter(to, R * 0.2), to:jitter(tgt, R * 0.3), t0:now + i * 110, dur:850,
            col:'#ffe8a8', h:0.06, sea:true });
    } else {
      F({ k:'splash', x:tgt.x, y:tgt.y, dur:800 });
    }
    break;
  }

  case 'mine':
    F({ k:'splash', x:to.x, y:to.y, dur:900, big:true });
    this.kick(3);
    break;

  case 'sink':
    for (let i = 0; i < Math.min(3, e.ships || 1); i++)
      F({ k:'sink', x:to.x + (i - 1) * R * 0.45, y:to.y + (i % 2) * R * 0.15, t0:now + i * 160, dur:1800,
          col: e.side === 'ROC' ? '#5fa8e8' : '#e8756c' });
    break;

  case 'transport': {
    if (!has(e.c2, e.r2)) break;
    const tgt = this.P(e.c2, e.r2);
    if (e.air){
      F({ k:'jetrun', from:to, to:tgt, dur:1400, col:'#bfe6ff', noBomb:true });
    } else {
      for (let i = 0; i < 4; i++)
        F({ k:'cargo', from:jitter(to, R * 0.4), to:jitter(tgt, R * 0.3), t0:now + i * 140, dur:1500 });
    }
    break;
  }

  case 'air': {
    if (e.dogfight){
      const n1 = Math.max(2, Math.min(5, Math.round((e.rN || 20) / 25)));
      const n2 = Math.max(2, Math.min(5, Math.round((e.pN || 20) / 25)));
      F({ k:'dogfight', x:to.x, y:to.y, dur:1700, n1, n2,
          fall1: Math.min(3, Math.ceil((e.rLoss || 0) / 6)), fall2: Math.min(3, Math.ceil((e.pLoss || 0) / 6)),
          seed: Math.random() * 10 });
    }
    break;
  }

  case 'move':
    if (e.rout) this.puff(to.x, to.y, 'smoke');
    break;
  }

  if (!e.quiet && e.t !== 'move') this.center(e.c, e.r);

  function jitter(p, d){ return { x:p.x + (Math.random() - 0.5) * d, y:p.y + (Math.random() - 0.5) * d * 0.7 }; }
},

/* 爆炸：一團火光＋衝擊波環＋火花＋碎片＋之後慢慢散開的濃煙 */
explode(x, y, s){
  const now = performance.now(), R = TW.B.HEX_R;
  this.fx.push({ k:'flash', x, y, t0:now, dur:420 * (0.7 + s * 0.3), s });
  if (this.parts.length > TW.FX.MAX_PARTS) return;
  const n = Math.round(8 * s);
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, v = (0.02 + Math.random() * 0.05) * R * s;
    this.parts.push({ k:'spark', x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 0.02 * R, t0:now, life:380 + Math.random() * 300,
      col: Math.random() < 0.5 ? '#ffd27a' : '#ff8a3a' });
  }
  for (let i = 0; i < Math.round(4 * s); i++){
    const a = Math.random() * Math.PI * 2, v = (0.015 + Math.random() * 0.03) * R * s;
    this.parts.push({ k:'debris', x, y, vx:Math.cos(a) * v, vy:-Math.abs(Math.sin(a) * v) - 0.02 * R, t0:now, life:700 });
  }
  for (let i = 0; i < Math.round(3 * s) + 1; i++)
    this.puff(x + (Math.random() - 0.5) * R * 0.5 * s, y + (Math.random() - 0.5) * R * 0.3 * s, 'smoke', now + 150 + i * 60, s);
},

puff(x, y, kind, t0, s){
  if (this.parts.length > TW.FX.MAX_PARTS) return;
  const R = TW.B.HEX_R;
  this.parts.push({ k:kind, x, y, vx:(Math.random() - 0.5) * 0.004 * R, vy:-0.004 * R * (kind === 'dust' ? 0.3 : 1),
    t0:t0 || performance.now(), life: kind === 'dust' ? 600 : 2200 + Math.random() * 900,
    size: (kind === 'dust' ? 0.18 : 0.28) * R * (s || 1) * (0.7 + Math.random() * 0.6) });
},

floatText(x, y, txt, col){
  this.texts.push({ x, y, txt, col, t0:performance.now(), life:1300 });
  if (this.texts.length > 40) this.texts.shift();
},

kick(mag){
  if (!TW.FX.SHAKE) return;
  this.shake = { t0:performance.now(), dur:320, mag:Math.max(mag, this.shake && performance.now() - this.shake.t0 < 300 ? this.shake.mag : 0) };
},

shakeOffset(){
  const s = this.shake;
  if (!s) return { x:0, y:0 };
  const t = (performance.now() - s.t0) / s.dur;
  if (t >= 1){ this.shake = null; return { x:0, y:0 }; }
  const m = s.mag * (1 - t);
  return { x:(Math.random() - 0.5) * 2 * m, y:(Math.random() - 0.5) * 2 * m };
},

/* 每一幀：畫特效、推進粒子 */
drawFx(ctx, R){
  const now = performance.now();
  const dt = Math.min(50, now - (this.lastFrame || now));
  this.lastFrame = now;
  const self = this;

  this.fx = this.fx.filter(f => now - f.t0 < f.dur);
  this.fx.forEach(f => {
    const t = (now - f.t0) / f.dur;
    if (t < 0) return;                       // 還沒輪到它（錯開發射的那幾發）
    const q = f.c !== undefined ? this.P(f.c, f.r) : null;

    switch (f.k){

    case 'flash': {
      const rad = R * (0.35 + t * 0.9) * f.s;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, Math.max(1, rad));
      g.addColorStop(0, 'rgba(255,250,210,' + (1 - t) + ')');
      g.addColorStop(0.35, 'rgba(255,170,70,' + (1 - t) * 0.85 + ')');
      g.addColorStop(1, 'rgba(200,60,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(1, rad), 0, 7); ctx.fill();
      /* 衝擊波 */
      ctx.strokeStyle = 'rgba(255,230,190,' + (1 - t) * 0.6 + ')'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.3 + t * 1.3) * f.s, 0, 7); ctx.stroke();
      break;
    }

    case 'bm': {
      /* 彈道飛彈：高拋弧線、白熱彈頭、後面拖一條煙 */
      const H = Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * 0.45;
      const at = s => arc(f.from, f.to, H, s);
      const end = f.kill ? f.killAt : 1;
      const tt = Math.min(t, end);
      /* 煙跡 */
      ctx.strokeStyle = 'rgba(210,210,215,' + (0.55 * (1 - Math.max(0, t - end) * 3)) + ')';
      ctx.lineWidth = 1.4; ctx.beginPath();
      for (let s = Math.max(0, tt - 0.35); s <= tt + 0.001; s += 0.03){
        const p = at(s); s === Math.max(0, tt - 0.35) ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      if (t < end){
        const p = at(t);
        glow(p.x, p.y, 3.2, '255,235,170');
      }
      /* 攔截彈：從愛國者陣地升空，撞上的那一刻炸成一團白光 */
      if (f.kill){
        const src = f.aa || { x:f.to.x + R * 0.8, y:f.to.y + R * 0.4 };
        const meet = at(f.killAt);
        const it0 = f.killAt - 0.22;
        if (t > it0 && t < f.killAt){
          const s = (t - it0) / 0.22;
          const x = src.x + (meet.x - src.x) * s, y = src.y + (meet.y - src.y) * s - Math.sin(s * Math.PI) * R * 0.3;
          ctx.strokeStyle = 'rgba(160,220,255,.8)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(x, y); ctx.stroke();
          glow(x, y, 2.2, '190,235,255');
        }
        if (t >= f.killAt && !f.popped){
          f.popped = true;
          self.fx.push({ k:'flash', x:meet.x, y:meet.y, t0:now, dur:300, s:0.55 });
          self.puff(meet.x, meet.y, 'smoke', now, 0.5);
        }
      } else if (t > 0.9 && !f.hit){
        f.hit = true;
        self.explode(f.to.x, f.to.y, 1.1);
        self.kick(4);
      }
      break;
    }

    case 'cm': {
      /* 巡弋／反艦飛彈：低飛、幾乎是直線 */
      const p = arc(f.from, f.to, Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * (f.h || 0.05), Math.min(1, t));
      const p0 = arc(f.from, f.to, Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * (f.h || 0.05), Math.max(0, t - 0.15));
      ctx.strokeStyle = 'rgba(235,235,240,.7)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      glow(p.x, p.y, 3.2, '255,240,190');
      if (t > 0.9 && !f.hit){
        f.hit = true;
        if (f.sea){ self.fx.push({ k:'splash', x:f.to.x, y:f.to.y, t0:now, dur:700 }); self.explode(f.to.x, f.to.y, 0.7); }
        else self.explode(f.to.x, f.to.y, 0.9);
      }
      break;
    }

    case 'shell': {
      const p = arc(f.from, f.to, Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * (f.h || 0.3), t);
      glow(p.x, p.y, 1.8, hexToRgb(f.col || '#ffd27a'));
      if (t < 0.15){                                           // 砲口閃光
        ctx.fillStyle = 'rgba(255,230,160,' + (1 - t / 0.15) + ')';
        ctx.beginPath(); ctx.arc(f.from.x, f.from.y, R * 0.18, 0, 7); ctx.fill();
      }
      if (t > 0.9 && !f.hit){ f.hit = true; self.explode(f.to.x, f.to.y, 0.45); }
      break;
    }

    case 'fire': {
      /* 地面交火：一串一串的曳光彈 */
      for (let i = 0; i < 7; i++){
        const ph = ((t * 3.2) + i / 7) % 1;
        const sx = f.from.x + (Math.sin(i * 7.3) * R * 0.3), sy = f.from.y + (Math.cos(i * 3.1) * R * 0.2);
        const ex = f.to.x + (Math.sin(i * 5.1) * R * 0.35), ey = f.to.y + (Math.cos(i * 2.3) * R * 0.25);
        const x = sx + (ex - sx) * ph, y = sy + (ey - sy) * ph;
        ctx.strokeStyle = f.col; ctx.globalAlpha = 0.9 * (1 - t * 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (ex - sx) * 0.1, y - (ey - sy) * 0.1); ctx.stroke();
        if (i < 3){                                            // 守方還擊，比較稀疏
          const ph2 = ((t * 2.6) + i / 3 + 0.5) % 1;
          const x2 = ex + (sx - ex) * ph2, y2 = ey + (sy - ey) * ph2;
          ctx.strokeStyle = f.back; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - (sx - ex) * 0.08, y2 - (sy - ey) * 0.08); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      /* 槍口閃光 */
      if (Math.random() < 0.6) glow(f.from.x + (Math.random() - 0.5) * R * 0.6, f.from.y + (Math.random() - 0.5) * R * 0.4, 3, '255,240,190');
      if (Math.random() < 0.25) self.explode(f.to.x + (Math.random() - 0.5) * R * 0.8, f.to.y + (Math.random() - 0.5) * R * 0.5, 0.3);
      break;
    }

    case 'pulse':
      ctx.strokeStyle = 'rgba(255,120,90,' + (1 - t) * 0.9 + ')';
      ctx.lineWidth = 2 + Math.sin(t * 18) * 1.2;
      self.hexPath(ctx, q.x, q.y, R * (0.75 + Math.sin(t * 14) * 0.1)); ctx.stroke();
      break;

    case 'landring':
      ctx.strokeStyle = 'rgba(255,90,70,' + (1 - t) + ')'; ctx.lineWidth = 3;
      self.hexPath(ctx, q.x, q.y, R * (0.4 + t * 0.8)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,80,' + (1 - t) * 0.3 + ')';
      self.hexPath(ctx, q.x, q.y, R); ctx.fill();
      break;

    case 'spawn':
      for (let i = 0; i < 3; i++){
        const tt = (t * 1.6 - i * 0.25);
        if (tt < 0 || tt > 1) continue;
        ctx.strokeStyle = 'rgba(120,210,255,' + (1 - tt) + ')'; ctx.lineWidth = 2.2;
        self.hexPath(ctx, q.x, q.y, R * (0.3 + tt * 0.9)); ctx.stroke();
      }
      break;

    case 'boat': {
      /* 登陸艇：小小的楔形，後面拖著 V 字航跡 */
      const tt = Math.min(1, t * 1.1);
      const x = f.from.x + (f.to.x - f.from.x) * tt, y = f.from.y + (f.to.y - f.from.y) * tt;
      const ang = Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x);
      ctx.strokeStyle = 'rgba(220,240,255,' + 0.5 * (1 - tt) + ')'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ang - 0.35) * R * 0.6, y - Math.sin(ang - 0.35) * R * 0.6); ctx.lineTo(x, y);
      ctx.lineTo(x - Math.cos(ang + 0.35) * R * 0.6, y - Math.sin(ang + 0.35) * R * 0.6); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = f.col; ctx.fillRect(-R * 0.14, -R * 0.07, R * 0.28, R * 0.14);
      ctx.restore();
      if (tt >= 1 && !f.hit){ f.hit = true; self.puff(f.to.x, f.to.y, 'dust', now, 1.3); }
      break;
    }

    case 'torpedo': {
      /* 魚雷：水下一條虛線航跡，最後炸出水柱 */
      const x = f.from.x + (f.to.x - f.from.x) * Math.min(1, t * 1.15), y = f.from.y + (f.to.y - f.from.y) * Math.min(1, t * 1.15);
      ctx.strokeStyle = 'rgba(190,230,255,.6)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(f.from.x, f.from.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      if (t > 0.86 && !f.hit){
        f.hit = true;
        self.fx.push({ k:'splash', x:f.to.x, y:f.to.y, t0:now, dur:1000, big:true });
        self.explode(f.to.x, f.to.y, 0.8); self.kick(3);
      }
      break;
    }

    case 'splash': {
      /* 水柱＋一圈一圈的波紋 */
      const hgt = R * (f.big ? 1.1 : 0.7) * Math.sin(Math.min(1, t * 2) * Math.PI);
      ctx.fillStyle = 'rgba(220,240,255,' + (1 - t) * 0.8 + ')';
      ctx.beginPath(); ctx.ellipse(f.x, f.y - hgt / 2, R * 0.12, Math.max(0.5, hgt / 2), 0, 0, 7); ctx.fill();
      for (let i = 0; i < 2; i++){
        const tt = t - i * 0.2; if (tt < 0) continue;
        ctx.strokeStyle = 'rgba(200,230,255,' + (1 - tt) * 0.7 + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, R * (0.2 + tt * 0.8), R * (0.08 + tt * 0.3), 0, 0, 7); ctx.stroke();
      }
      break;
    }

    case 'sink': {
      /* 沉船：船身慢慢傾斜、往下沉，冒泡泡 */
      ctx.save();
      ctx.translate(f.x, f.y + t * R * 0.25);
      ctx.rotate(t * 0.9);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = f.col;
      ctx.beginPath();
      ctx.moveTo(-R * 0.45, 0); ctx.lineTo(R * 0.45, 0); ctx.lineTo(R * 0.3, R * 0.2); ctx.lineTo(-R * 0.3, R * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(-R * 0.1, -R * 0.18, R * 0.18, R * 0.18);
      ctx.restore(); ctx.globalAlpha = 1;
      if (Math.random() < 0.5)
        self.parts.push({ k:'bubble', x:f.x + (Math.random() - 0.5) * R * 0.6, y:f.y + R * 0.1,
          vx:0, vy:-0.01 * R, t0:now, life:700 });
      if (Math.random() < 0.08) self.puff(f.x, f.y - R * 0.1, 'smoke', now, 0.7);
      break;
    }

    case 'jetrun': {
      /* 機群：從基地飛過去、投彈、拉起轉走 */
      const tt = Math.min(1, t * 1.2);
      const p = arc(f.from, f.to, R * 1.2, tt);
      const p2 = arc(f.from, f.to, R * 1.2, Math.min(1, tt + 0.02));
      self.drawJet(ctx, p.x, p.y, Math.atan2(p2.y - p.y, p2.x - p.x), R * 0.3, f.col || '#bfe6ff');
      if (!f.noBomb && tt >= 0.98 && !f.hit){ f.hit = true; self.explode(f.to.x, f.to.y, 0.9); self.kick(2); }
      break;
    }

    case 'cargo': {
      /* 運輸機群：大一點、慢一點，到了之後灑出傘兵 */
      const p = arc(f.from, f.to, R * 0.8, Math.min(1, t * 1.1));
      const p2 = arc(f.from, f.to, R * 0.8, Math.min(1, t * 1.1 + 0.02));
      self.drawJet(ctx, p.x, p.y, Math.atan2(p2.y - p.y, p2.x - p.x), R * 0.45, '#ffd0c8');
      if (t * 1.1 >= 0.95 && !f.hit){
        f.hit = true;
        for (let i = 0; i < 3; i++)
          self.parts.push({ k:'chute', x:f.to.x + (Math.random() - 0.5) * R, y:f.to.y - R, vx:0, vy:R * 0.0014,
            t0:now + i * 80, life:1300, ground:f.to.y + R * 0.2, col:'#ffe0dc' });
      }
      break;
    }

    case 'dogfight': {
      /* 空戰：雙方戰機在空域中心纏鬥，互射曳光彈；被擊落的冒煙墜落 */
      const nA = f.n1, nB = f.n2;
      const pos = (i, side) => {
        const w = f.seed + i * 1.7 + (side ? 3.1 : 0);
        const ang = t * 5.2 * (side ? -1 : 1) + w;
        return { x:f.x + Math.cos(ang) * R * (1.1 + (i % 2) * 0.5),
                 y:f.y + Math.sin(ang * 1.3) * R * (0.6 + (i % 3) * 0.2), ang:ang + Math.PI / 2 * (side ? -1 : 1) };
      };
      const alive = [];
      for (let side = 0; side < 2; side++){
        const n = side ? nB : nA, fall = side ? f.fall2 : f.fall1;
        for (let i = 0; i < n; i++){
          const p = pos(i, side);
          const shot = i < fall && t > 0.45 + i * 0.12;
          if (shot){
            /* 被擊落：往下掉、拖一條黑煙 */
            const ft = Math.min(1, (t - 0.45 - i * 0.12) / 0.5);
            const x = p.x + ft * R * 0.4, y = p.y + ft * ft * R * 1.6;
            self.drawJet(ctx, x, y, p.ang + ft * 3, R * 0.38, side ? 'rgba(255,160,150,' + (1 - ft) + ')' : 'rgba(170,220,255,' + (1 - ft) + ')');
            if (Math.random() < 0.6) self.puff(x, y, 'smoke', now, 0.35);
            if (Math.random() < 0.3) glow(x, y, 2.4, '255,160,60');
          } else {
            self.drawJet(ctx, p.x, p.y, p.ang, R * 0.38, side ? '#ffb4ab' : '#bfe6ff');
            alive.push({ p, side });
          }
        }
      }
      /* 曳光彈 */
      if (alive.length > 1 && Math.random() < 0.7){
        const a = alive[Math.floor(Math.random() * alive.length)];
        const bs = alive.filter(x => x.side !== a.side);
        if (bs.length){
          const b = bs[Math.floor(Math.random() * bs.length)];
          ctx.strokeStyle = a.side ? 'rgba(255,170,120,.8)' : 'rgba(170,230,255,.8)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y);
          ctx.lineTo(a.p.x + (b.p.x - a.p.x) * 0.6, a.p.y + (b.p.y - a.p.y) * 0.6); ctx.stroke();
        }
      }
      break;
    }

    /* 舊版的簡單特效（被別的程式直接呼叫時用得到） */
    case 'missile': case 'boom': case 'battle': case 'land': case 'naval':
      break;
    }
  });

  /* ---- 粒子 ---- */
  this.parts = this.parts.filter(p => now - p.t0 < p.life);
  this.parts.forEach(p => {
    const t = (now - p.t0) / p.life;
    if (t < 0) return;
    const k = dt / 16;
    p.x += p.vx * k * 16 / 16; p.y += p.vy * k;
    if (p.k === 'spark'){
      p.vy += 0.0012 * R * k;
      ctx.fillStyle = p.col; ctx.globalAlpha = 1 - t;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    } else if (p.k === 'debris'){
      p.vy += 0.002 * R * k;
      ctx.fillStyle = 'rgba(40,30,25,' + (1 - t) + ')';
      ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
    } else if (p.k === 'smoke' || p.k === 'dust'){
      const rad = p.size * (1 + t * 1.8);
      ctx.fillStyle = p.k === 'dust' ? 'rgba(170,150,110,' + 0.35 * (1 - t) + ')'
                                     : 'rgba(70,70,75,' + 0.45 * (1 - t) * Math.min(1, t * 6) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 7); ctx.fill();
    } else if (p.k === 'bubble'){
      ctx.strokeStyle = 'rgba(200,235,255,' + (1 - t) + ')'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 + t * 1.5, 0, 7); ctx.stroke();
    } else if (p.k === 'chute'){
      if (p.y >= p.ground){ p.vy = 0; }
      ctx.globalAlpha = Math.min(1, (1 - t) * 3);
      ctx.fillStyle = p.col; ctx.strokeStyle = p.col; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(p.x, p.y - R * 0.18, R * 0.14, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - R * 0.14, p.y - R * 0.18); ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + R * 0.14, p.y - R * 0.18); ctx.stroke();
      ctx.fillRect(p.x - 1, p.y - 1, 2, 3);
    }
    ctx.globalAlpha = 1;
  });

  /* ---- 傷害數字 ---- */
  this.texts = this.texts.filter(x => now - x.t0 < x.life);
  ctx.textAlign = 'center';
  this.texts.forEach(x => {
    const t = (now - x.t0) / x.life;
    ctx.font = '700 ' + Math.round(R * 0.42) + 'px Consolas,"Noto Sans TC",sans-serif';
    ctx.globalAlpha = t < 0.8 ? 1 : (1 - t) * 5;
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillText(x.txt, x.x + 1, x.y - t * R * 0.9 + 1);
    ctx.fillStyle = x.col;
    ctx.fillText(x.txt, x.x, x.y - t * R * 0.9);
    ctx.globalAlpha = 1;
  });

  /* 二次貝茲曲線：from 到 to，中間往上拱 H */
  function arc(a, b, H, s){
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - H;
    return { x:(1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * mx + s * s * b.x,
             y:(1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * my + s * s * b.y };
  }
  function glow(x, y, rad, rgb){
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.4);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.35, 'rgba(' + rgb + ',.85)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 2.4, 0, 7); ctx.fill();
  }
  function hexToRgb(h){
    const v = h.replace('#', '');
    return parseInt(v.slice(0, 2), 16) + ',' + parseInt(v.slice(2, 4), 16) + ',' + parseInt(v.slice(4, 6), 16);
  }
}

});
