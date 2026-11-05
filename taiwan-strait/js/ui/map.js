/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   地圖繪製與滑鼠互動
   ========================================================================== */

/* 部隊這一回合還剩多少行動力。
   上限是兵種的機動力；組織度太低、斷補會各扣一點（跟 movePhase 同一套規則）；
   已經下了移動命令的，扣掉這回合會走掉的部分；
   攻擊、火力任務、突擊、埋雷、機降、整補這些命令會把整個回合用掉。 */
TW.mpInfo = function(u){
  const max = Math.max(1, (u.T && u.T.move) || 1);
  let avail = max;
  if (u.org < u.maxOrg * 0.3) avail = Math.max(1, avail - 1);
  if (u.supply < TW.B.SUPPLY_MIN_COMBAT) avail = Math.max(1, avail - 1);
  let left = avail;
  const o = u.order;
  if (o && u.side === 'ROC'){
    if (o.type === 'move' && o.path){
      let moved = false, pc = u.c, pr = u.r;
      for (const [c, r] of o.path){
        const cost = TW.Rules.moveCost(u, c, r, pc, pr);
        if (cost > left && moved) break;
        left -= cost; moved = true; pc = c; pr = r;
        if (left <= 0) break;
      }
      left = Math.max(0, left);
    } else if (o.type !== 'hold'){
      left = 0;
    }
  }
  return { max, avail, left };
};

TW.Map = {

canvas:null, ctx:null,
cam:{ x:0, y:0, z:1 },
degenerate:true, needFit:false,
layer:'terrain',
hover:null,
fx:[],                 // 動畫特效
drag:null,

init(){
  this.canvas = document.getElementById('map');
  this.ctx = this.canvas.getContext('2d');
  this.resize();
  window.addEventListener('resize', () => { this.syncSize(); });

  const cv = this.canvas;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => this.onDown(e));
  window.addEventListener('mousemove', e => this.onMove(e));
  window.addEventListener('mouseup', () => { this.drag = null; });
  cv.addEventListener('wheel', e => this.onWheel(e), { passive:false });
  cv.addEventListener('mouseleave', () => {
    this.hover = null;
    document.getElementById('hexinfo').classList.add('hidden');
  });

  document.querySelectorAll('.lyr').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.lyr').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      this.layer = b.dataset.layer;
    };
  });

  this.fit();
  const loop = () => { this.draw(); requestAnimationFrame(loop); };
  loop();
},

resize(){
  const wrap = this.canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const cw = wrap.clientWidth, ch = wrap.clientHeight;
  /* 頁面剛載入時 #mapwrap 可能還沒排版完，寬高會是 0。
     等尺寸真的出來之後，要記得重新配適一次，不然地圖會卡在角落。 */
  const bad = (cw < 2 || ch < 2);
  if (this.degenerate && !bad) this.needFit = true;
  this.degenerate = bad;
  this.canvas.width  = Math.max(1, cw) * dpr;
  this.canvas.height = Math.max(1, ch) * dpr;
  this.dpr = dpr;
},

/* 每一幀檢查容器尺寸有沒有變（剛載入、拉視窗、開關側欄都會變） */
syncSize(){
  const wrap = this.canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  if (this.canvas.width  !== Math.max(1, wrap.clientWidth)  * dpr ||
      this.canvas.height !== Math.max(1, wrap.clientHeight) * dpr) this.resize();
  if (this.needFit && !this.degenerate){
    this.needFit = false;
    this.fit();
    if (this.pendingFocus){
      const p = this.pendingFocus; this.pendingFocus = null;
      this.focusOn(p[0], p[1], p[2]);
    }
  }
},

fit(){
  const R = TW.B.HEX_R;
  const mw = Math.sqrt(3) * R * (TW.B.MAP_W + 1);
  const mh = R * 1.5 * TW.B.MAP_H + R;
  const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
  let z = Math.min(w / mw, h / mh) * 0.97;
  if (!isFinite(z) || z <= 0.05) z = 0.6;      // 保底，不讓地圖消失
  this.cam.z = z;
  this.cam.x = (w - mw * z) / 2;
  this.cam.y = (h - mh * z) / 2;
},

/* --------------------------------------------------------------------------
   繪製
   -------------------------------------------------------------------------- */
draw(){
  const ctx = this.ctx, S = TW.S;
  if (!S) return;
  this.syncSize();
  const R = TW.B.HEX_R;

  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  ctx.fillStyle = '#070d14';
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  ctx.save();
  /* 大爆炸的時候畫面會震一下 */
  const sh = this.shakeOffset ? this.shakeOffset() : { x:0, y:0 };
  ctx.translate(this.cam.x + sh.x, this.cam.y + sh.y);
  ctx.scale(this.cam.z, this.cam.z);

  /* --- 地形格 --- */
  S.hexes.forEach(h => this.drawHex(ctx, h, R));

  /* --- 高速公路與幹道 --- */
  this.drawRoads(ctx, R);

  /* --- 空域／海域覆蓋 --- */
  if (this.layer === 'air' || this.layer === 'sea') this.drawZoneLabels(ctx, R);

  /* --- 地名 --- */
  ctx.font = '600 9px "Noto Sans TC",sans-serif';
  ctx.textAlign = 'center';
  TW.PLACES.forEach(p => {
    const h = TW.hexAt(p.c, p.r);
    if (!h.seen && h.owner === 'PLA') return;
    const q = TW.Hex.center(p.c, p.r, R);
    ctx.fillStyle = 'rgba(6,10,14,.72)';
    const w = p.name.length * 9 + 6;
    ctx.fillRect(q.x - w / 2, q.y + R * 0.42, w, 11);
    ctx.fillStyle = h.owner === 'ROC' ? '#bcd8f2' : '#f0b8b5';
    ctx.fillText(p.name, q.x, q.y + R * 0.42 + 9);
  });

  /* --- 海上編隊 --- */
  S.navy.forEach(f => { if (!f.dead) this.drawFleet(ctx, f, R); });

  /* --- 地面部隊（會在回合動畫中從舊位置滑到新位置，見 fx.js） --- */
  this.drawUnits(ctx, R);

  /* --- 空軍與陸航（駐地基地上方的機隊徽章） --- */
  this.drawAirWings(ctx, R);

  /* --- 艦隊的航路：所有已下航向的我方艦隊都畫，選取的那支畫粗 --- */
  S.navy.forEach(f => {
    if (f.dead || f.side !== 'ROC' || !f.order || f.order.type !== 'sail') return;
    if (!f.order.path || !f.order.path.length) return;
    const sel = (S.sel === f.id);
    const q0 = TW.Hex.center(f.c, f.r, R);
    const spd = TW.fleetSpeed(f);

    ctx.strokeStyle = sel ? 'rgba(120,210,255,.85)' : 'rgba(120,210,255,.35)';
    ctx.lineWidth = sel ? 2.2 : 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(q0.x, q0.y);
    f.order.path.forEach(([c, r]) => { const p = TW.Hex.center(c, r, R); ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.setLineDash([]);

    /* 這回合走得到哪裡：在航速的那一格畫個記號，玩家才知道一回合能到多遠 */
    const stop = f.order.path[Math.min(spd, f.order.path.length) - 1];
    if (stop){
      const ps = TW.Hex.center(stop[0], stop[1], R);
      ctx.strokeStyle = 'rgba(120,210,255,.9)'; ctx.lineWidth = 1.8;
      this.hexPath(ctx, ps.x, ps.y, R * 0.5); ctx.stroke();
    }
    /* 終點 */
    const end = f.order.path[f.order.path.length - 1];
    const pe = TW.Hex.center(end[0], end[1], R);
    ctx.fillStyle = sel ? 'rgba(120,210,255,.95)' : 'rgba(120,210,255,.5)';
    ctx.beginPath(); ctx.arc(pe.x, pe.y, sel ? 4.5 : 3, 0, 7); ctx.fill();

    if (sel){
      ctx.fillStyle = 'rgba(160,225,255,.95)';
      ctx.font = '700 10px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('航速 ' + spd + ' 格／回合　剩 ' + f.order.path.length + ' 格',
        q0.x, q0.y - R * 0.85);
    }
  });

  /* --- 選取與命令線 --- */
  if (S.sel){
    const u = S.units.find(x => x.id === S.sel);
    if (u && !u.dead){
      const q = TW.Hex.center(u.c, u.r, R);

      /* 砲兵：畫出射程涵蓋範圍 */
      const rng = TW.canBombard(u) ? TW.unitRange(u) : 0;
      if (rng > 0){
        for (let rr = 0; rr < TW.B.MAP_H; rr++)
          for (let cc = 0; cc < TW.B.MAP_W; cc++){
            const dd = TW.Hex.distance(u.c, u.r, cc, rr);
            if (dd < 1 || dd > rng) continue;
            const p2 = TW.Hex.center(cc, rr, R);
            if (dd === rng){                       // 射程邊界畫粗一點
              ctx.strokeStyle = 'rgba(255,170,60,.85)'; ctx.lineWidth = 2;
            } else {
              ctx.strokeStyle = 'rgba(255,170,60,.20)'; ctx.lineWidth = 1;
            }
            this.hexPath(ctx, p2.x, p2.y, R * 0.9); ctx.stroke();
          }
        ctx.fillStyle = 'rgba(255,170,60,.9)';
        ctx.font = '700 10px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('射程 ' + rng + ' 格 / ' + (rng * TW.B.HEX_KM) + ' km', q.x, q.y - R * 0.9);
      }
      /* 空機降部隊：畫出可機降的範圍 */
      if (u.T.airmobile){
        ctx.strokeStyle = 'rgba(120,200,255,.35)'; ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        for (let rr = 0; rr < TW.B.MAP_H; rr++)
          for (let cc = 0; cc < TW.B.MAP_W; cc++){
            if (TW.Hex.distance(u.c, u.r, cc, rr) !== TW.B.AIRLIFT_RANGE) continue;
            const p2 = TW.Hex.center(cc, rr, R);
            this.hexPath(ctx, p2.x, p2.y, R * 0.9); ctx.stroke();
          }
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = '#f0c060'; ctx.lineWidth = 2.2;
      this.hexPath(ctx, q.x, q.y, R * 0.98); ctx.stroke();
      if (u.order && u.order.type === 'move' && u.order.path){
        ctx.strokeStyle = 'rgba(240,192,96,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(q.x, q.y);
        u.order.path.forEach(([c, r]) => { const p = TW.Hex.center(c, r, R); ctx.lineTo(p.x, p.y); });
        ctx.stroke();
      }
      if (u.order && u.order.type === 'attack'){
        const p = TW.Hex.center(u.order.tc, u.order.tr, R);
        ctx.strokeStyle = '#e05a50'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = '#e05a50';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
      }
    }
  }

  /* --- 特效 --- */
  this.drawFx(ctx, R);

  /* --- 教學指定的格子 --- */
  if (this.focusHex){
    const q = TW.Hex.center(this.focusHex[0], this.focusHex[1], R);
    const t = (performance.now() % 1200) / 1200;
    ctx.strokeStyle = 'rgba(240,192,96,' + (0.9 - t * 0.7) + ')';
    ctx.lineWidth = 3;
    this.hexPath(ctx, q.x, q.y, R * (0.95 + t * 0.7));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,192,96,.95)';
    ctx.lineWidth = 2.5;
    this.hexPath(ctx, q.x, q.y, R * 0.95);
    ctx.stroke();
  }

  ctx.restore();
},

drawHex(ctx, h, R){
  const S = TW.S;
  const q = TW.Hex.center(h.c, h.r, R);
  let fill = h.T.color;

  if (h.t === '.'){
    fill = (h.c < 12) ? '#122336' : '#0f2233';
  }

  /* 控制權著色 */
  if (h.t !== '.'){
    if (h.owner === 'PLA' && !h.T.prc) fill = mix(fill, '#8e2f2a', 0.45);
    if (h.T.prc) fill = '#4e3a3a';
  }

  /* 圖層 */
  if (this.layer === 'supply' && h.t !== '.'){
    const v = Math.max(h.sup.ROC, h.sup.PLA);
    const col = h.sup.ROC >= h.sup.PLA ? '#3f8fd6' : '#d24a45';
    fill = mix('#10161d', col, TW.clamp(v, 0, 1) * 0.85);
  }
  if (this.layer === 'air'){
    const v = S.zoneAir[h.zone] || 0;
    fill = mix(fill, v >= 0 ? '#3f8fd6' : '#d24a45', Math.abs(v) * 0.65);
  }
  if (this.layer === 'sea'){
    const v = S.zoneSea[h.zone] || 0;
    fill = mix(fill, v >= 0 ? '#3f8fd6' : '#d24a45', Math.abs(v) * (h.t === '.' ? 0.75 : 0.25));
  }
  if (this.layer === 'aa'){
    let roc = 0, pla = 0;
    S.units.forEach(u => {
      if (u.dead || !(u.T.aa || u.T.abm)) return;
      const d = TW.Hex.distance(u.c, u.r, h.c, h.r);
      if (d > 4) return;
      const v = (1 - d * 0.18) * (u.org / u.maxOrg) *
                (u.equip.includes('pac3mse') ? 1 : 0.78);
      if (u.side === 'ROC') roc = Math.max(roc, v); else pla = Math.max(pla, v);
    });
    if (roc > 0) fill = mix(fill, '#3fd6a0', roc * 0.8);
    if (pla > roc) fill = mix(fill, '#d24a45', pla * 0.7);
  }
  if (this.layer === 'threat' && h.t !== '.'){
    let th = 0;
    S.units.forEach(u => { if (!u.dead && u.side === 'PLA'){
      const d = TW.Hex.distance(u.c, u.r, h.c, h.r);
      if (d <= 5) th = Math.max(th, (1 - d / 5) * (u.hp / u.maxHp));
    }});
    if (h.beach) th = Math.max(th, 0.35);
    fill = mix(fill, '#e04a3a', th * 0.8);
  }

  /* 迷霧 */
  if (!h.seen) fill = mix(fill, '#05080c', 0.62);

  this.hexPath(ctx, q.x, q.y, R * 0.985);
  ctx.fillStyle = fill; ctx.fill();

  /* 水雷 */
  if (h.mines > 0 && h.seen){
    ctx.fillStyle = 'rgba(220,180,60,' + Math.min(0.8, h.mines * 0.55) + ')';
    for (let i = 0; i < 3; i++){
      ctx.beginPath();
      ctx.arc(q.x + (i - 1) * 6, q.y + (i % 2 ? 4 : -4), 1.8, 0, 7); ctx.fill();
    }
  }

  /* 河川：畫一條橫貫格子的藍帶 */
  if (h.river){
    ctx.strokeStyle = 'rgba(96,168,214,.70)';
    ctx.lineWidth = Math.max(2, R * 0.20);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(q.x - R * 0.80, q.y + R * 0.14);
    ctx.quadraticCurveTo(q.x, q.y - R * 0.16, q.x + R * 0.80, q.y + R * 0.14);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /* 發電廠：一個小小的電力符號 */
  if (h.place && h.place.mw && h.seen){
    const on = h.owner === 'ROC' && h.damage < 0.6;
    ctx.strokeStyle = on ? 'rgba(240,214,110,.95)' : 'rgba(140,140,140,.8)';
    ctx.lineWidth = Math.max(1.4, R * 0.10);
    ctx.beginPath();
    ctx.moveTo(q.x + R * 0.10, q.y - R * 0.34);
    ctx.lineTo(q.x - R * 0.10, q.y - R * 0.02);
    ctx.lineTo(q.x + R * 0.06, q.y - R * 0.02);
    ctx.lineTo(q.x - R * 0.10, q.y + R * 0.32);
    ctx.stroke();
  }

  /* 灘頭標記 */
  if (h.beach){
    ctx.strokeStyle = h.beachhead ? '#ff6b5e' : 'rgba(230,190,90,.55)';
    ctx.lineWidth = h.beachhead ? 2.4 : 1.4;
    this.hexPath(ctx, q.x, q.y, R * 0.83); ctx.stroke();
  }

  /* 設施損壞 */
  if (h.place && h.damage > 0.05 && h.seen){
    ctx.strokeStyle = 'rgba(224,90,70,' + Math.min(1, h.damage + 0.25) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(q.x - R * 0.3, q.y - R * 0.3); ctx.lineTo(q.x + R * 0.3, q.y + R * 0.3);
    ctx.moveTo(q.x + R * 0.3, q.y - R * 0.3); ctx.lineTo(q.x - R * 0.3, q.y + R * 0.3);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.6;
  this.hexPath(ctx, q.x, q.y, R * 0.985); ctx.stroke();

  if (this.hover && this.hover[0] === h.c && this.hover[1] === h.r){
    ctx.strokeStyle = 'rgba(240,220,150,.8)'; ctx.lineWidth = 1.6;
    this.hexPath(ctx, q.x, q.y, R * 0.95); ctx.stroke();
  }

  if (TW.B.SHOW_HEX_COORD){
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText(h.c + ',' + h.r, q.x, q.y + 3);
  }
},

/* 高速公路：深色外框＋黃線，像地圖上的國道。
   被炸斷（障礙區）的那一段畫成紅色虛線，一眼看得出路斷在哪裡。 */
drawRoads(ctx, R){
  const S = TW.S;
  const dim = this.layer !== 'terrain';          // 其他圖層時淡一點，不要蓋掉資訊
  TW.HIGHWAYS.forEach(hw => {
    const fw = hw.cost <= 0.5;
    for (let i = 1; i < hw.hex.length; i++){
      const [ac, ar] = hw.hex[i - 1], [bc, br] = hw.hex[i];
      const a = TW.Hex.center(ac, ar, R), b = TW.Hex.center(bc, br, R);
      const broken = !TW.roadBetween(ac, ar, bc, br);
      const ha = TW.hexAt(ac, ar), hb = TW.hexAt(bc, br);
      const fog = !(ha.seen || hb.seen);

      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(10,14,18,' + (dim ? 0.35 : 0.75) + ')';
      ctx.lineWidth = fw ? R * 0.24 : R * 0.18;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

      if (broken){
        ctx.strokeStyle = 'rgba(224,90,70,' + (dim ? 0.45 : 0.9) + ')';
        ctx.setLineDash([3, 3]);
      } else {
        ctx.strokeStyle = fog ? 'rgba(150,130,80,.45)' : hw.color;
        ctx.globalAlpha = dim ? 0.45 : 0.95;
      }
      ctx.lineWidth = fw ? R * 0.11 : R * 0.08;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }

    /* 路牌：國道是梅花形的標誌，這裡簡化成盾牌，畫在路線中段 */
    if (dim) return;
    const mid = hw.hex[Math.floor(hw.hex.length * (hw.id === 'n3' ? 0.62 : 0.45))];
    const q = TW.Hex.center(mid[0], mid[1], R);
    const x = q.x + (hw.id === 'n3' ? R * 0.42 : -R * 0.42), y = q.y + R * 0.05;
    const w = R * (hw.short.length > 1 ? 0.62 : 0.42), hh = R * 0.40;
    ctx.fillStyle = fw ? '#1f5a2e' : '#2d3f55';
    ctx.strokeStyle = fw ? '#e8f0d8' : '#c9d6e4'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - hh / 2); ctx.lineTo(x + w / 2, y - hh / 2);
    ctx.lineTo(x + w / 2, y + hh * 0.15); ctx.lineTo(x, y + hh / 2); ctx.lineTo(x - w / 2, y + hh * 0.15);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + Math.round(R * 0.26) + 'px Consolas,"Noto Sans TC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hw.short, x, y + R * 0.07);
  });
},

/* 畫一支部隊。位置（cx,cy）、同格第幾支（i / n）、透明度由 drawUnits() 算好傳進來——
   回合動畫中，部隊會畫在「還沒輪到它動」的舊位置，輪到它的時候再滑過去。 */
drawUnit(ctx, u, R, cx, cy, i, n, alpha){
  const w = R * 1.05, hh = R * 0.66;
  const x = cx - w / 2 + (i * 4) - (n - 1) * 2;
  const y = cy - hh / 2 - R * 0.16 + i * 3;
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;

  /* 美軍用不同的配色，一眼分得出來哪些是自己人、哪些是第七艦隊帶來的 */
  ctx.fillStyle = u.us ? 'rgba(30,92,74,.95)'
    : (u.side === 'ROC' ? 'rgba(38,80,124,.95)' : 'rgba(124,42,38,.95)');
  ctx.fillRect(x, y, w, hh);
  ctx.strokeStyle = u.us ? '#6fd8a8' : (u.side === 'ROC' ? '#6fb0ea' : '#e88a84');
  ctx.lineWidth = u.order && u.order.type === 'attack' ? 2 : 1;
  ctx.strokeRect(x, y, w, hh);

  ctx.fillStyle = '#eef4fa';
  /* 中文代號要用有中文字的字型，Consolas 會掉字 */
  ctx.font = '700 ' + Math.round(R * 0.30) +
    "px 'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(u.icon, x + w / 2, y + hh * 0.70);

  /* 兵力／組織度／行動力條（綠／黃／藍） */
  const bw = w;
  ctx.fillStyle = '#0b0f14'; ctx.fillRect(x, y + hh, bw, 5.1);
  ctx.fillStyle = '#4caf7d'; ctx.fillRect(x, y + hh, bw * TW.clamp(u.hp / u.maxHp, 0, 1), 1.7);
  ctx.fillStyle = '#c9a227'; ctx.fillRect(x, y + hh + 1.7, bw * TW.clamp(u.org / u.maxOrg, 0, 1), 1.7);
  /* 行動力：暗藍＝這回合最多能動多少（被組織度／斷補扣過），亮藍＝下完命令後還剩多少 */
  const mp = TW.mpInfo(u);
  ctx.fillStyle = '#244f78'; ctx.fillRect(x, y + hh + 3.4, bw * TW.clamp(mp.avail / mp.max, 0, 1), 1.7);
  ctx.fillStyle = '#5fb0f0'; ctx.fillRect(x, y + hh + 3.4, bw * TW.clamp(mp.left / mp.max, 0, 1), 1.7);

  if (u.supply < TW.B.SUPPLY_MIN_COMBAT){
    ctx.fillStyle = '#e0a33a';
    ctx.font = '700 8px sans-serif';
    ctx.fillText('補', x + w + 4, y + 8);
  }
  ctx.globalAlpha = 1;
},

drawFleet(ctx, f, R){
  const h = TW.hexAt(f.c, f.r);
  if (f.side === 'PLA' && !h.seen) return;
  /* 沒被標定的共軍潛艦根本不在圖上——你不知道它在哪裡 */
  if (TW.fleetHidden(f, 'ROC')) return;
  const q = TW.Hex.center(f.c, f.r, R);
  const st = TW.fleetStats(f);
  const col = f.side === 'ROC' ? '#5fa8e8' : '#e8756c';

  ctx.strokeStyle = col; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(q.x - R * 0.42, q.y);
  ctx.lineTo(q.x + R * 0.42, q.y);
  ctx.lineTo(q.x + R * 0.24, q.y + R * 0.26);
  ctx.lineTo(q.x - R * 0.24, q.y + R * 0.26);
  ctx.closePath();
  ctx.fillStyle = f.side === 'ROC' ? 'rgba(38,80,124,.9)' : 'rgba(124,42,38,.9)';
  ctx.fill(); ctx.stroke();

  if (st.lift > 0){          // 登陸船團標記
    ctx.fillStyle = '#f0c060'; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('登', q.x, q.y - R * 0.12);
  }
  ctx.fillStyle = '#0b0f14'; ctx.fillRect(q.x - R * 0.42, q.y + R * 0.3, R * 0.84, 2.6);
  ctx.fillStyle = col; ctx.fillRect(q.x - R * 0.42, q.y + R * 0.3, R * 0.84 * TW.clamp(f.hp / f.maxHp, 0, 1), 2.6);
},

/* 在各機隊的駐地畫出機隊徽章：戰機用三角形，直升機用旋翼十字 */
drawAirWings(ctx, R){
  const S = TW.S;
  const byBase = {};
  S.air.forEach(w => {
    if (w.dead || w.n <= 0) return;
    (byBase[w.base] = byBase[w.base] || []).push(w);
  });

  for (const base in byBase){
    const p = TW.PLACES.find(x => x.name === base);
    if (!p) continue;
    const h = TW.hexAt(p.c, p.r);
    if (!h || !h.seen) continue;

    const ws = byBase[base];
    const side = ws[0].side;
    const col = side === 'ROC' ? '#7fd0ff' : '#ff9a92';
    const total = Math.round(ws.reduce((s2, w) => s2 + w.n, 0));
    const heli  = ws.every(w => /直升機/.test(w.A.name));
    const q = TW.Hex.center(p.c, p.r, R);
    const bx = q.x + R * 0.52, by = q.y - R * 0.52;

    ctx.fillStyle = 'rgba(8,12,18,.85)';
    ctx.beginPath(); ctx.arc(bx, by, R * 0.30, 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();

    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    if (heli){
      ctx.beginPath();
      ctx.moveTo(bx - R * 0.17, by - R * 0.06); ctx.lineTo(bx + R * 0.17, by - R * 0.06);
      ctx.moveTo(bx, by - R * 0.06); ctx.lineTo(bx, by + R * 0.12);
      ctx.moveTo(bx - R * 0.08, by + R * 0.12); ctx.lineTo(bx + R * 0.08, by + R * 0.12);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bx, by - R * 0.15);
      ctx.lineTo(bx - R * 0.15, by + R * 0.12);
      ctx.lineTo(bx + R * 0.15, by + R * 0.12);
      ctx.closePath(); ctx.stroke();
    }

    ctx.fillStyle = col;
    ctx.font = '700 8px Consolas,monospace'; ctx.textAlign = 'left';
    ctx.fillText(total, bx + R * 0.34, by + R * 0.12);

    /* 出擊中的機隊加一圈亮環 */
    if (ws.some(w => w.mission !== 'rest')){
      ctx.strokeStyle = side === 'ROC' ? 'rgba(127,208,255,.45)' : 'rgba(255,154,146,.45)';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(bx, by, R * 0.40, 0, 7); ctx.stroke();
    }
  }

  /* 轉場中的機隊：從原駐地拉一條虛線弧到新基地，中間畫一架小飛機 */
  S.air.forEach(w => {
    if (w.dead || !w.transit || w.side !== 'ROC') return;
    const a = TW.PLACES.find(x => x.name === w.transit.from);
    const b = TW.PLACES.find(x => x.name === w.transit.to);
    if (!a || !b) return;
    const p = TW.Hex.center(a.c, a.r, R), q = TW.Hex.center(b.c, b.r, R);
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2 - Math.hypot(q.x - p.x, q.y - p.y) * 0.25;
    ctx.strokeStyle = 'rgba(127,208,255,.75)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(mx, my, q.x, q.y); ctx.stroke();
    ctx.setLineDash([]);
    /* 小飛機沿著弧線慢慢飛，看得出方向 */
    const t = (performance.now() % 2400) / 2400;
    const x = (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * mx + t * t * q.x;
    const y = (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * my + t * t * q.y;
    const dx = 2 * (1 - t) * (mx - p.x) + 2 * t * (q.x - mx), dy = 2 * (1 - t) * (my - p.y) + 2 * t * (q.y - my);
    TW.Map.drawJet(ctx, x, y, Math.atan2(dy, dx), R * 0.34, '#bfe6ff');
  });
},

/* 一架小戰機的剪影（轉場、空戰、空襲動畫共用） */
drawJet(ctx, x, y, ang, s, col){
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(s, 0);                    // 機鼻
  ctx.lineTo(-s * 0.2, -s * 0.18);
  ctx.lineTo(-s * 0.35, -s * 0.75);    // 左翼
  ctx.lineTo(-s * 0.55, -s * 0.75);
  ctx.lineTo(-s * 0.5, -s * 0.15);
  ctx.lineTo(-s * 0.9, -s * 0.35);     // 左尾翼
  ctx.lineTo(-s * 0.95, 0);
  ctx.lineTo(-s * 0.9, s * 0.35);
  ctx.lineTo(-s * 0.5, s * 0.15);
  ctx.lineTo(-s * 0.55, s * 0.75);
  ctx.lineTo(-s * 0.35, s * 0.75);
  ctx.lineTo(-s * 0.2, s * 0.18);
  ctx.closePath(); ctx.fill();
  ctx.restore();
},

drawZoneLabels(ctx, R){
  const S = TW.S;
  ctx.font = '700 11px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
  const anchors = { ZN:[17,2], ZC:[17,13], ZS:[18,22], ZSN:[6,6], ZSS:[6,19], ZE:[24,8] };
  TW.ZONES.forEach(z => {
    const a = anchors[z.id]; if (!a) return;
    const q = TW.Hex.center(a[0], a[1], R);
    const v = (this.layer === 'air' ? S.zoneAir[z.id] : S.zoneSea[z.id]) || 0;
    ctx.fillStyle = 'rgba(6,10,14,.7)';
    ctx.fillRect(q.x - 54, q.y - 16, 108, this.layer === 'air' ? 42 : 30);
    ctx.fillStyle = '#d6dde5';
    ctx.fillText(z.name, q.x, q.y - 4);
    ctx.fillStyle = v >= 0 ? '#79b8f0' : '#ef8a85';
    ctx.fillText((v >= 0 ? '我方 +' : '共軍 ') + (v * 100).toFixed(0) + '%', q.x, q.y + 9);

    if (this.layer === 'air'){
      let rn = 0, pn = 0;
      S.air.forEach(w => {
        if (w.dead || w.n <= 0 || w.zone !== z.id || w.mission === 'rest') return;
        if (w.side === 'ROC') rn += w.n; else pn += w.n;
      });
      ctx.font = '700 9px Consolas,monospace';
      ctx.fillStyle = '#9fb2c4';
      ctx.fillText('我 ' + Math.round(rn) + ' 架　共 ' + Math.round(pn) + ' 架', q.x, q.y + 21);
      ctx.font = '700 11px "Noto Sans TC",sans-serif';
    }
  });
},

/* --------------------------------------------------------------------------
   特效
   -------------------------------------------------------------------------- */
addFxLegacy(e){
  const now = performance.now();
  if (e.t === 'missile' || e.t === 'strike')
    this.fx.push({ k:'missile', c:e.c, r:e.r, t0:now, dur:900, from:e.t === 'strike' ? 'w' : 'w' });
  else if (e.t === 'boom') this.fx.push({ k:'boom', c:e.c, r:e.r, t0:now, dur:700 });
  else if (e.t === 'battle') this.fx.push({ k:'battle', c:e.c, r:e.r, t0:now, dur:900 });
  else if (e.t === 'land') this.fx.push({ k:'land', c:e.c, r:e.r, t0:now, dur:1200 });
  else if (e.t === 'naval' || e.t === 'mine' || e.t === 'sink' || e.t === 'transport')
    this.fx.push({ k:'naval', c:e.c, r:e.r, c2:e.c2, r2:e.r2, t0:now, dur:900 });
  if (e.c !== undefined) this.center(e.c, e.r);
},

/* 硬把鏡頭移到某一格，並且至少拉近到 z（教學用）。
   如果地圖還沒排版好，先把需求記下來，等配適完再套用，
   否則會被啟動時的自動配適蓋掉。 */
focusOn(c, r, z){
  if (this.degenerate || this.needFit){ this.pendingFocus = [c, r, z]; return; }
  this.pendingFocus = null;
  this.cam.z = Math.max(this.cam.z, z || 1.2);
  const q = TW.Hex.center(c, r, TW.B.HEX_R);
  const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
  this.cam.x = w / 2 - q.x * this.cam.z;
  this.cam.y = h / 2 - q.y * this.cam.z;
},

center(c, r){
  const R = TW.B.HEX_R;
  const q = TW.Hex.center(c, r, R);
  const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
  const tx = w / 2 - q.x * this.cam.z, ty = h / 2 - q.y * this.cam.z;
  /* 只有在目標跑出畫面時才拉鏡頭 */
  const sx = q.x * this.cam.z + this.cam.x, sy = q.y * this.cam.z + this.cam.y;
  if (sx < 40 || sx > w - 40 || sy < 40 || sy > h - 40){
    this.cam.x += (tx - this.cam.x) * 0.6;
    this.cam.y += (ty - this.cam.y) * 0.6;
  }
},

drawFxLegacy(ctx, R){
  const now = performance.now();
  this.fx = this.fx.filter(f => now - f.t0 < f.dur);
  this.fx.forEach(f => {
    const t = (now - f.t0) / f.dur;
    const q = TW.Hex.center(f.c, f.r, R);

    if (f.k === 'missile'){
      const sx = q.x - 260 * (1 - t) * (f.c > 12 ? 1 : -1);
      const sy = q.y - 90 * (1 - t);
      ctx.strokeStyle = 'rgba(255,190,90,' + (1 - t) + ')'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(q.x, q.y); ctx.stroke();
      if (t > 0.7) boom(ctx, q.x, q.y, R * (t - 0.7) * 4, 1 - (t - 0.7) / 0.3);
    }
    else if (f.k === 'boom') boom(ctx, q.x, q.y, R * 0.9 * t, 1 - t);
    else if (f.k === 'battle'){
      ctx.strokeStyle = 'rgba(255,120,90,' + (1 - t) * 0.9 + ')';
      ctx.lineWidth = 2 + Math.sin(t * 18) * 1.2;
      this.hexPath(ctx, q.x, q.y, R * (0.75 + Math.sin(t * 14) * 0.1)); ctx.stroke();
    }
    else if (f.k === 'land'){
      ctx.strokeStyle = 'rgba(255,90,70,' + (1 - t) + ')'; ctx.lineWidth = 3;
      this.hexPath(ctx, q.x, q.y, R * (0.4 + t * 0.8)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,80,' + (1 - t) * 0.35 + ')';
      this.hexPath(ctx, q.x, q.y, R); ctx.fill();
    }
    else if (f.k === 'naval'){
      if (f.c2 !== undefined){
        const p = TW.Hex.center(f.c2, f.r2, R);
        const mx = q.x + (p.x - q.x) * t, my = q.y + (p.y - q.y) * t;
        ctx.strokeStyle = 'rgba(150,220,255,' + (1 - t * 0.6) + ')'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(mx, my); ctx.stroke();
        if (t > 0.85) boom(ctx, p.x, p.y, R * 0.7, 1 - t);
      } else boom(ctx, q.x, q.y, R * 0.7 * t, 1 - t);
    }
  });

  function boom(ctx, x, y, rad, a){
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, rad));
    g.addColorStop(0, 'rgba(255,240,180,' + a + ')');
    g.addColorStop(0.5, 'rgba(255,140,60,' + a * 0.7 + ')');
    g.addColorStop(1, 'rgba(200,60,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, 7); ctx.fill();
  }
},

hexPath(ctx, x, y, R){
  ctx.beginPath();
  for (let i = 0; i < 6; i++){
    const a = Math.PI / 180 * (60 * i - 90);
    const px = x + R * Math.cos(a), py = y + R * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
},

/* --------------------------------------------------------------------------
   滑鼠
   -------------------------------------------------------------------------- */
toHex(e){
  const b = this.canvas.getBoundingClientRect();
  const x = (e.clientX - b.left - this.cam.x) / this.cam.z;
  const y = (e.clientY - b.top  - this.cam.y) / this.cam.z;
  return TW.Hex.fromPixel(x, y, TW.B.HEX_R);
},

onDown(e){
  if (e.button === 2 || e.button === 1){
    this.drag = { x:e.clientX, y:e.clientY, cx:this.cam.x, cy:this.cam.y };
    return;
  }
  if (TW.busy) return;
  const hx = this.toHex(e);
  if (!hx) return;
  TW.UI.onHexClick(hx[0], hx[1], e);
},

onMove(e){
  if (this.drag){
    this.cam.x = this.drag.cx + (e.clientX - this.drag.x);
    this.cam.y = this.drag.cy + (e.clientY - this.drag.y);
    return;
  }
  const hx = this.toHex(e);
  this.hover = hx;
  if (hx) TW.UI.showHexInfo(hx[0], hx[1]);
},

onWheel(e){
  e.preventDefault();
  const b = this.canvas.getBoundingClientRect();
  const mx = e.clientX - b.left, my = e.clientY - b.top;
  const old = this.cam.z;
  this.cam.z = TW.clamp(this.cam.z * (e.deltaY < 0 ? 1.12 : 0.89), 0.4, 3.2);
  this.cam.x = mx - (mx - this.cam.x) * (this.cam.z / old);
  this.cam.y = my - (my - this.cam.y) * (this.cam.z / old);
}

};

/* 顏色混合 */
function mix(a, b, t){
  const pa = hex2rgb(a), pb = hex2rgb(b);
  return 'rgb(' + Math.round(pa[0] + (pb[0] - pa[0]) * t) + ',' +
                  Math.round(pa[1] + (pb[1] - pa[1]) * t) + ',' +
                  Math.round(pa[2] + (pb[2] - pa[2]) * t) + ')';
}
function hex2rgb(h){
  if (h[0] !== '#') { const m = h.match(/\d+/g); return m ? m.map(Number) : [0,0,0]; }
  const v = h.slice(1);
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}
