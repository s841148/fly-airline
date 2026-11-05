/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   側邊面板、資訊列、彈窗、戰報
   ========================================================================== */

TW.UI = {

tab:'unit',
modalQueue:[],
modalOpen:false,

init(){
  document.querySelectorAll('.tab').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      this.tab = b.dataset.tab;
      this.refresh();
    };
  });
},

/* --------------------------------------------------------------------------
   上方國力列
   -------------------------------------------------------------------------- */
refresh(){
  const S = TW.S;
  if (!S) return;

  document.getElementById('ui-date').textContent = 'D+' + S.day + '　' +
    String(S.hour).padStart(2, '0') + '00　' + (TW.Env.isNight() ? '夜' : '日');
  const _D = TW.DIFFICULTY[TW.B.DIFFICULTY] || TW.DIFFICULTY[2];
  document.getElementById('ui-turn').textContent =
    '第 ' + S.turn + ' / ' + TW.B.MAX_TURNS + ' 回合　' + _D.name +
    (S.whatIf ? '　架空' : '');

  const avgAir = avg(['ZN','ZC','ZS'].map(z => S.zoneAir[z]));
  const avgSea = avg(['ZSN','ZSS'].map(z => S.zoneSea[z]));

  document.getElementById('ui-stats').innerHTML =
    stat('工業產能', S.ic, '＋' + Math.round(S.icStore) + ' 存量') +
    stat('政治點', Math.round(S.pp)) +
    stat('戰爭意志', Math.round(S.will), '', S.will < 35 ? '#e05a50' : '') +
    stat('國際支持', Math.round(S.intl), '', S.intl > 60 ? '#66d3a0' : (S.intl < 25 ? '#e0a33a' : '')) +
    stat('本島制空', pct(avgAir), '', avgAir < 0 ? '#e05a50' : '#66d3a0') +
    stat('海峽制海', pct(avgSea), '', avgSea < 0 ? '#e05a50' : '#66d3a0') +
    stat('可動員人力', Math.round(S.manpower) + 'k') +
    stat('供電率', Math.round(S.power * 100) + '%', '',
         S.power < TW.B.POWER_BROWNOUT * 0.6 ? '#e05a50'
           : (S.power < TW.B.POWER_BROWNOUT ? '#e0a33a' : '')) +
    stat('戰備彈藥', Math.round(S.ammo), '/' + S.ammoMax,
         S.ammo < TW.B.AMMO_CRITICAL ? '#e05a50' : (S.ammo < TW.B.AMMO_LOW ? '#e0a33a' : '')) +
    stat('海況', (S.wx ? S.wx.sea : 2) + ' 級',
         TW.Env.canLand() ? '' : '　可登陸',
         TW.Env.canLand() ? '' : '#66d3a0') +
    stat('共軍上陸', S.units.filter(u => !u.dead && u.side === 'PLA' && !TW.hexAt(u.c, u.r).T.prc).length + ' 旅', '',
         '#ef8a85') +
    (S.whatIf
      ? stat('反攻登陸', S.hexes.filter(h => h.T.prc && h.owner === 'ROC').length + ' 格', '', '#e0c07a')
      : '');

  this.renderTab();

  function stat(k, v, d, col){
    return '<div class="stat"><span class="k">' + k + '</span><span class="v"' +
      (col ? ' style="color:' + col + '"' : '') + '>' + v +
      (d ? '<span class="d">' + d + '</span>' : '') + '</span></div>';
  }
  function pct(v){ return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; }
  function avg(a){ return a.reduce((s, x) => s + x, 0) / a.length; }
},

/* --------------------------------------------------------------------------
   側欄分頁
   -------------------------------------------------------------------------- */
renderTab(){
  const S = TW.S, box = document.getElementById('tabbody');
  const fn = { unit:'tabUnit', form:'tabForm', air:'tabAir', navy:'tabNavy', prod:'tabProd',
               tech:'tabTech', dip:'tabDip', pol:'tabPol' }[this.tab];
  box.innerHTML = this[fn]();
  this.bind(box);
},

/* ---------- 部隊 ---------- */
tabUnit(){
  const S = TW.S;
  const mine = S.units.filter(u => !u.dead && u.side === 'ROC');
  const sel = S.units.find(u => u.id === S.sel);
  let html = '';

  if (sel){
    html += '<div class="sec"><h3>選定部隊</h3>' + this.unitDetail(sel) + '</div>';
  }

  const groups = {};
  mine.forEach(u => { (groups[u.corps || '其他'] = groups[u.corps || '其他'] || []).push(u); });

  for (const g in groups){
    html += '<div class="sec"><h3>' + g + '（' + groups[g].length + '）</h3>';
    groups[g].forEach(u => html += this.unitCard(u));
    html += '</div>';
  }
  return html || '<div class="empty">沒有可用部隊。</div>';
},

unitCard(u){
  const hp = TW.clamp(u.hp / u.maxHp, 0, 1), org = TW.clamp(u.org / u.maxOrg, 0, 1);
  const h = TW.hexAt(u.c, u.r);
  return '<div class="ucard roc' + (TW.S.sel === u.id ? ' sel' : '') + '" data-sel="' + u.id + '">' +
    '<div class="un">' + u.name + '</div>' +
    '<div class="ut">' + u.T.name + '　@' + TW.hexName(h) +
      (u.order ? '　<span class="chip">' + orderName(u.order) + '</span>' : '') + '</div>' +
    '<div class="bar"><i class="hp" style="width:' + (hp * 100) + '%"></i></div>' +
    '<div class="bar"><i class="org" style="width:' + (org * 100) + '%"></i></div>' +
    '<div class="barlbl"><span>兵力 ' + Math.round(u.hp) + '</span>' +
      '<span>組織 ' + Math.round(u.org) + '</span>' +
      '<span' + (u.supply < TW.B.SUPPLY_MIN_COMBAT ? ' style="color:#e0a33a"' : '') + '>補給 ' +
      Math.round(u.supply * 100) + '%</span></div></div>';
},

unitDetail(u){
  const S = TW.S;
  const rng = TW.canBombard(u) ? TW.unitRange(u) : 0;

  let html = '<div class="item"><div class="t">' + u.name +
    (u.order ? '<span class="chip new">' + orderName(u.order) + '</span>' : '') + '</div>' +
    '<div class="d">' + u.T.name + '　經驗 ' + Math.round(u.xp * 100) + '%　築壘 ' +
    Math.round(u.entrench * 100) + '%　行動力 ' +
    (m => (Math.round(m.left * 10) / 10) + ' / ' + m.max + (m.avail < m.max ? '（組織度或補給不足 −' + (m.max - m.avail) + '）' : ''))(TW.mpInfo(u)) +
    '<br><span style="color:#7c8b9c">圖示下方三條：綠＝兵力　黃＝組織度　藍＝行動力</span><br>' +
    '軟目標 ' + TW.stat(u, 'soft').toFixed(1) + '　硬目標 ' + TW.stat(u, 'hard').toFixed(1) +
    '　裝甲 ' + TW.stat(u, 'armor').toFixed(1) + '　穿甲 ' + TW.stat(u, 'pierce').toFixed(1) +
    (rng ? '<br><b style="color:#f0c060">射程 ' + rng + ' 格（' + (rng * TW.B.HEX_KM) +
           ' 公里）</b>　在地圖上點射程內的目標即可下達火力任務' : '') +
    ((u.T.aa || u.T.abm) ? '<br><b style="color:#66d3a0">防空 ' + TW.stat(u, 'aa').toFixed(0) +
      '　反飛彈 ' + TW.stat(u, 'abm').toFixed(0) + '</b>　自動攜截半徑 4 格內的來襲飛彈' : '') +
    '</div>' +
    '<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">' +
    '<button data-act="hold" data-u="' + u.id + '">固守築壘</button>' +
    '<button data-act="refit" data-u="' + u.id + '">後送整補</button>' +
    (u.T.airmobile ? '<button data-act="airlift" data-u="' + u.id + '">空機降</button>' : '') +
    (u.T.engineer && TW.Rules.canDemo(u)
      ? '<button data-act="demo" data-u="' + u.id + '">埋設爆破裝藥</button>' : '') +
    (TW.Rules.embarkTargets(u).length
      ? '<button data-act="embark" data-u="' + u.id + '">登艦</button>' : '') +
    (TW.Rules.raidTargets(u).length
      ? '<button data-act="raid" data-u="' + u.id + '">特戰突擊</button>' : '') +
    '<button data-act="clear" data-u="' + u.id + '">取消命令</button></div>' +
    (this.airliftMode ? '<div class="d" style="color:#f0c060;margin-top:5px">' +
      '　▸ 請在地圖上點選 ' + TW.B.AIRLIFT_RANGE + ' 格內的降落點<br>' +
      '　▸ 我方控制的格子＝一般機降；敵佔區＝空降突擊（損失重、落地就打）' +
      (S.whatIf ? '<br>　▸ 要空降對岸，部隊得先進駐<b>金門或馬祖</b>當跳板' : '') +
      '</div>' : '') +
    '</div>';

  /* 自己編成的旅：列出編制 */
  if (u.tpl){
    html += '<div class="d" style="margin:2px 0 6px">自編部隊　編制：' +
      Object.keys(u.tpl.bns).filter(k => u.tpl.bns[k] > 0).map(k =>
        '<span class="chip">' + TW.BATTALIONS[k].name.replace(/（.*）/, '') + '×' + u.tpl.bns[k] + '</span>').join('') +
      '</div>';
  }

  /* 空機降待命中 */
  if (u.order && u.order.type === 'airlift'){
    const th = TW.hexAt(u.order.tc, u.order.tr);
    const a2 = th ? (S.zoneAir[th.zone] || 0) : 0;
    const ok = a2 >= TW.B.AIRLIFT_MIN_AIR;
    html += '<div class="item"><div class="t">空機降</div><div class="d">' +
      '目標：<b>' + (th ? TW.hexName(th) : '?') + '</b><br>' +
      '該空域制空權 <b style="color:' + (ok ? '#66d3a0' : '#e05a50') + '">' +
      Math.round(a2 * 100) + '%</b>（起飛門檻 ' + Math.round(TW.B.AIRLIFT_MIN_AIR * 100) + '%）<br>' +
      (ok ? '本回合結算時起飛。制空權是在空戰之後才判定，邊緣值仍可能延後。'
          : '<span style="color:#e0a33a">目前飛不了，會在機場待命' +
            (u.order.waited ? '（已等 ' + u.order.waited + ' 回合）' : '') +
            '。先爭取該空域制空權，或按「取消命令」。</span>') +
      '</div></div>';
  }

  /* 特戰突擊準備中 */
  if (u.order && u.order.type === 'raid'){
    html += '<div class="item"><div class="t">特戰突擊</div><div class="d">' +
      '目標：<b>' + u.order.target + '</b><br>' +
      (u.order.prep > 0 ? '整備中，還需 ' + (u.order.prep + 1) + ' 回合。'
                        : '本回合執行滲透。') +
      '<br><span style="color:#7c8b9c">砸完就撤，不會佔領。' +
      '制海權太差可能渡不過去。</span></div></div>';
  }

  /* 在船上 */
  if (u.embarked){
    const f = S.navy.find(x => x.id === u.embarked && !x.dead);
    html += '<div class="item"><div class="t">已登艦</div><div class="d">' +
      (f ? '在 <b>' + f.name + '</b> 艙內' +
           (f.loading > 0 ? '（裝載中，還要 ' + f.loading + ' 回合）' : '（裝載完成）') +
           '<br><span style="color:#7c8b9c">到「海軍」分頁選這支艦隊，' +
           '把船開到目標灘岸旁邊，再點岸上那一格就會登陸。</span>'
         : '運載的艦艇已經沉沒。') +
      '</div></div>';
  }

  /* 工兵：阻絕作業 */
  if (u.T.engineer){
    const dh = TW.hexAt(u.c, u.r);
    let d = '<div class="item"><div class="t">阻絕作業</div><div class="d">';
    if (dh.demo && dh.demo.ready && dh.demo.by === u.side){
      d += '<b style="color:#f0c060">' + TW.hexName(dh) + ' 已完成爆破裝藥埋設。</b><br>' +
        '等敵軍踏進這一格再按下去，效果最好。<br>' +
        '<button data-act="blow" data-c="' + u.c + '" data-r="' + u.r + '"' +
        ' style="margin-top:5px;background:#7c2a26;border-color:#e05a50;color:#ffd9d4">引爆</button>';
    } else if (dh.demo && dh.demo.by === u.side){
      d += '埋設中，還要 <b>' + dh.demo.left + '</b> 個回合。<br>' +
        '<span style="color:#7c8b9c">敵軍壓上來就沒辦法繼續作業。</span>';
    } else if (dh.obstacle > 0){
      d += '這一格剛炸過，還是廢墟（剩 ' + dh.obstacle + ' 回合），無法再次埋設。';
    } else if (TW.Rules.canDemo(u)){
      d += '可以在這一格埋設爆破裝藥，需要 ' + TW.B.DEMO_TURNS + ' 個回合。<br>' +
        '<span style="color:#7c8b9c">引爆時對格內每支敵軍造成組織度 −' + TW.B.DEMO_ORG +
        '、兵力 −' + TW.B.DEMO_HP + '，並讓該格變成 ' + TW.B.DEMO_OBSTACLE +
        ' 回合的障礙區。橋梁、隘道、灘岸後方的路口是最值得埋的地方。' +
        (TW.roadsAt(u.c, u.r).length ? '<br><b style="color:#e8b64a">這一格在' + TW.roadsAt(u.c, u.r).map(x => x.name).join('、') + '上——炸掉之後整條路在這裡斷掉，共軍就沒辦法沿著國道長驅直入。</b>' : '') + '</span>';
    } else {
      d += '<span style="color:#7c8b9c">這一格不能作業——有敵軍、已經埋過、或還是廢墟。</span>';
    }
    html += d + '</div></div>';
  }

  /* 整補狀況 */
  const hurt = u.hp < u.maxHp * 0.95 || u.org < u.maxOrg * 0.95;
  if (hurt){
    const refit = (u.order && u.order.type === 'refit');
    html += '<div class="item"><div class="t">整補狀況</div><div class="d">' +
      '兵力 ' + Math.round(u.hp) + ' / ' + u.maxHp + '　組織 ' + Math.round(u.org) + ' / ' + u.maxOrg + '<br>' +
      (u.fought ? '交戰中，整補速度大幅下降。' :
        (refit ? '<b style="color:#66d3a0">後送整補中：回復速度 ×' + TW.B.REFIT_BONUS + '</b>' :
                 '每回合自然回復組織度；兵力要在補給充足的城鳮才會補充。')) +
      '<br>補給 ' + Math.round(u.supply * 100) + '%　' +
      (u.supply < TW.B.SUPPLY_MIN_COMBAT ? '<b style="color:#e0a33a">補給不足！</b>' : '') +
      '</div></div>';
  }

  if (u.equip.length){
    const cnt = {};
    u.equip.forEach(e => cnt[e] = (cnt[e] || 0) + 1);
    html += '<div class="d" style="margin:4px 0 6px">配賦裝備：' +
      Object.keys(cnt).map(e => '<span class="chip new">' + TW.EQUIP[e].name +
        (cnt[e] > 1 ? ' ×' + cnt[e] : '') + '</span>').join('') + '</div>';
  }

  /* 同一種裝備可以再撥一批（效益遞減）。
     只列這個旅真的能操作的東西——戰機和水雷不會發給步兵。 */
  const stockKeys = Object.keys(S.stock)
    .filter(k => S.stock[k] >= 1 && TW.equipTarget(k) === 'ground');
  if (stockKeys.length){
    html += '<div class="sec"><h3>撥交裝備</h3>';
    stockKeys.forEach(k => {
      const e = TW.EQUIP[k];
      const has = u.equip.filter(x => x === k).length;
      html += '<div class="item cando"><div class="t">' + e.name +
        '<button data-act="give" data-u="' + u.id + '" data-eq="' + k + '">撥交</button></div>' +
        '<div class="d">庫存 ' + Math.floor(S.stock[k]) + ' 批' +
        (has ? '　<span class="chip">本旅已有 ' + has + ' 批（再撥效益 ×' +
               Math.pow(0.55, has).toFixed(2) + '）</span>' : '') +
        '<br>' + modText(e.mod) + '</div></div>';
    });
    html += '</div>';
  }
  return html;
},

/* ---------- 部隊編成器 ---------- */
/* 正在設計中的編制（只存在畫面上，按「開始編成」或「存成範本」才會寫進戰局） */
design:null,
designAt:null,
designBrig:'',

tabForm(){
  const S = TW.S;
  if (!this.design) this.design = JSON.parse(JSON.stringify(S.templates[0] || TW.DEFAULT_TEMPLATES[0]));
  const D = this.design;
  const T = TW.buildBrigadeType(D);
  const cost = TW.brigadeCost(D);
  const nBn = cost.n;
  let html = '';

  /* ---- 編成中 ---- */
  html += '<div class="sec"><h3>編成中（' + S.forming.length + '）</h3>';
  if (!S.forming.length) html += '<div class="empty">目前沒有正在編成的旅。</div>';
  S.forming.forEach((F, i) => {
    html += '<div class="item"><div class="t">' + F.name +
      '<span style="font-size:11px">剩 ' + F.left + ' 回合</span></div>' +
      '<div class="d">' + (F.tpl.name || '自編旅') + '：' + bnText(F.tpl) + '<br>報到地點：' + F.at +
      '　<button data-act="formcancel" data-i="' + i + '">取消（退回一半工業點）</button></div></div>';
  });
  html += '</div>';

  /* ---- 範本 ---- */
  html += '<div class="sec"><h3>範本</h3>';
  S.templates.forEach((tp, i) => {
    const c2 = TW.brigadeCost(tp);
    html += '<div class="item' + (tp.name === D.name ? ' cando' : '') + '"><div class="t">' + tp.name +
      '<span><button data-act="tplload" data-i="' + i + '">載入</button> ' +
      (S.templates.length > 1 ? '<button data-act="tpldel" data-i="' + i + '">刪除</button>' : '') + '</span></div>' +
      '<div class="d">' + bnText(tp) + '　·　' + c2.ic + ' 工業點、' + c2.turns + ' 回合</div></div>';
  });
  html += '</div>';

  /* ---- 設計 ---- */
  html += '<div class="sec"><h3>設計編制（最多 ' + TW.BRIGADE_MAX_BN + ' 個營）</h3>' +
    '<div class="item"><div class="d">' +
    '編制名稱 <input class="fin" data-dn="1" value="' + esc(D.name) + '" maxlength="10"> ' +
    '代號 <input class="fin" data-ds="1" value="' + esc(D.short) + '" maxlength="2" style="width:3em"></div>' +
    '<div class="bnrow bnhead">' +
    '<span>已編 ' + nBn + ' / ' + TW.BRIGADE_MAX_BN + ' 個營</span>' +
    /* 用每個營的簡稱排一排，一眼看出這個旅長什麼樣子，例如「步步步機車砲」 */
    '<span class="bnpips">' + Object.keys(TW.BATTALIONS).map(k =>
      TW.BATTALIONS[k].short.repeat(D.bns[k] || 0)).join('') + '</span></div>';
  Object.keys(TW.BATTALIONS).forEach(k => {
    const B = TW.BATTALIONS[k], c = D.bns[k] || 0;
    html += '<div class="bnrow">' +
      '<button data-act="bnsub" data-k="' + k + '"' + (c > 0 ? '' : ' disabled') + '>−</button>' +
      '<b class="bnc">' + c + '</b>' +
      '<button data-act="bnadd" data-k="' + k + '"' + (nBn < TW.BRIGADE_MAX_BN ? '' : ' disabled') + '>＋</button>' +
      '<span class="bnn">' + B.name + '<small>' + B.desc + '　（' + B.ic + ' 點）</small></span></div>';
  });
  html += '</div>';

  /* ---- 數值預覽：跟現有的旅比一比 ---- */
  const ref1 = TW.GROUND_TYPES.roc_combined, ref2 = TW.GROUND_TYPES.roc_armor;
  const rows = [['兵力','hp'],['組織度','org'],['對軟目標','soft'],['對硬目標','hard'],
                ['裝甲','armor'],['穿甲','pierce'],['防禦','def'],['機動力','move']];
  const maxOf = { hp:130, org:90, soft:40, hard:45, armor:25, pierce:30, def:40, move:4 };
  html += '<div class="item"><div class="t">' + esc(D.name || '自編旅') + '　預覽' +
    '<span class="chip">' + ({ armor:'裝甲', mech:'機械化', inf:'步兵', arty:'砲兵' }[T.cls] || T.cls) + '</span></div>' +
    '<table class="bntab"><tr><th></th><th>這個編制</th><th>聯兵旅</th><th>裝甲旅</th></tr>' +
    rows.map(([nm, k]) => {
      const v = T[k], a = ref1[k], b = ref2[k];
      const col = v > a * 1.08 ? '#66d3a0' : (v < a * 0.92 ? '#e0a33a' : '#d6dde5');
      return '<tr><td>' + nm + '</td><td><div class="bnbar"><i style="width:' +
        Math.min(100, v / maxOf[k] * 100) + '%"></i><b style="color:' + col + '">' + v + '</b></div></td>' +
        '<td>' + a + '</td><td>' + b + '</td></tr>';
    }).join('') + '</table>' +
    '<div class="d">' +
    (T.bombard ? '<span class="chip new">可隔 1 格砲擊</span>' : '') +
    (T.aa ? '<span class="chip new">野戰防空 ' + T.aa + '</span>' : '') +
    (T.engineer ? '<span class="chip new">可埋爆破裝藥</span>' : '') +
    (T.logistics ? '<span class="chip new">後勤：組織度 +' + (8 * T.logistics) + '、斷補較耐撐</span>' : '') +
    (T.cls === 'armor' || T.cls === 'mech' ? '<span class="chip">重裝備：進山地要多付 2 點機動力</span>' : '') +
    (T.move <= 2 && (D.bns.tank || D.bns.mech) ? '<br><span style="color:#e0a33a">混了步兵或反裝甲營，整個旅只剩機動力 ' +
      T.move + '——戰車被拖慢了。</span>' : '') +
    '</div></div>';

  /* ---- 下令編成 ---- */
  const places = TW.PLACES.filter(p => p.side === 'ROC' && !p.type.includes('power') &&
    TW.hexAt(p.c, p.r).owner === 'ROC' && (p.type.includes('city') || p.type.includes('capital') ||
    p.type.includes('port') || p.type.includes('navalbase')));
  if (!this.designAt || !places.some(p => p.name === this.designAt)) this.designAt = places[0] ? places[0].name : '';
  const defName = '自編第' + (S.formedCount + 1) + (D.short ? D.short : '') + '旅';
  const canIc = S.icStore >= cost.ic, canMan = S.manpower >= cost.man, ok = nBn >= 2 && canIc && canMan && places.length;
  html += '<div class="item' + (ok ? ' cando' : '') + '"><div class="t">開始編成</div><div class="d">' +
    '需要 <b style="color:' + (canIc ? '#d6dde5' : '#e05a50') + '">' + cost.ic + '</b> 工業點（存量 ' + Math.round(S.icStore) + '）　' +
    '<b style="color:' + (canMan ? '#d6dde5' : '#e05a50') + '">' + cost.man + 'k</b> 人力　' +
    '<b>' + cost.turns + '</b> 回合<br>' +
    '部隊名稱 <input class="fin" data-bname="1" value="' + esc(this.designBrig || defName) + '" maxlength="14"><br>' +
    '報到地點 <select class="tgt" data-fat="1">' + places.map(p => '<option' +
      (p.name === this.designAt ? ' selected' : '') + '>' + p.name + '</option>').join('') + '</select>' +
    (nBn < 2 ? '<br><span style="color:#e0a33a">至少要 2 個營才能成軍。</span>' : '') +
    '<div style="margin-top:6px;display:flex;gap:5px">' +
    '<button data-act="formstart"' + (ok ? '' : ' disabled') + '>開始編成</button>' +
    '<button data-act="tplsave"' + (nBn >= 1 ? '' : ' disabled') + '>存成範本</button></div>' +
    '<span style="color:#7c8b9c">編成期間這些人力與工業點已經投入，不能拿去做別的。' +
    '剛成軍的旅組織度只有七成五，要一兩個回合磨合。</span></div></div>';
  return html;

  function bnText(tp){
    return Object.keys(tp.bns).filter(k => tp.bns[k] > 0)
      .map(k => TW.BATTALIONS[k].name.replace(/（.*）/, '') + '×' + tp.bns[k]).join('、');
  }
  function esc(t){ return String(t || '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
},

/* ---------- 空軍 ---------- */
tabAir(){
  const S = TW.S;
  let html = '<div class="sec"><h3>空域態勢</h3>';
  TW.ZONES.forEach(z => {
    const v = S.zoneAir[z.id];
    html += '<div class="item"><div class="t">' + z.name +
      '<span style="color:' + (v >= 0 ? '#66d3a0' : '#ef8a85') + '">' +
      (v >= 0 ? '+' : '') + Math.round(v * 100) + '%</span></div></div>';
  });
  html += '</div>';

  /* ---- 防空與反飛彈 ---- */
  const aa = S.units.filter(u => !u.dead && u.side === 'ROC' && (u.T.aa || u.T.abm));
  html += '<div class="sec"><h3>防空與反飛彈</h3>';
  html += '<div class="item"><div class="d">累計攜截 <b>' + S.stats.missilesIntercepted +
    '</b> / 來襲 <b>' + S.stats.missilesFired + '</b> 枚（' +
    (S.stats.missilesFired ? Math.round(S.stats.missilesIntercepted / S.stats.missilesFired * 100) : 0) +
    '%）<br>地圖左上角切到「防空」圖層可以看到涵蓋範圍。</div></div>';
  aa.forEach(u => {
    const pac = u.equip.includes('pac3mse');
    html += '<div class="item" data-sel="' + u.id + '"><div class="t">' + u.name +
      '<span style="font-size:11px;color:#7c8b9c">' + Math.round(u.org) + '/' + u.maxOrg + '</span></div>' +
      '<div class="d">' + (pac ? '愛國者 PAC-3 MSE　單發攜截率 ' + Math.round(TW.B.PAC3_INTERCEPT * 100) + '%'
                               : '天弓三型　單發攜截率 ' + Math.round(TW.B.TK3_INTERCEPT * 100) + '%') +
      '　@' + TW.hexName(TW.hexAt(u.c, u.r)) + '</div></div>';
  });
  html += '</div>';

  /* ---- 共軍空情 ---- */
  const pw = S.air.filter(w => !w.dead && w.side === 'PLA' && w.n > 0);
  if (pw.length){
    html += '<div class="sec"><h3>共軍空中兵力（偵知）</h3>';
    pw.forEach(w => {
      const m = TW.AIR_MISSIONS.find(x => x.id === w.mission);
      const z = TW.ZONES.find(x => x.id === w.zone);
      html += '<div class="item"><div class="t" style="color:#ef8a85">' + w.name +
        '<span style="font-size:11px;color:#7c8b9c">' + Math.round(w.n) + '／' + w.maxN + ' 架</span></div>' +
        '<div class="d">' + w.A.name + '　駐地：' + w.base + '<br>' +
        '任務：<b>' + (m ? m.name : w.mission) + '</b>　空域：' + (z ? z.name : w.zone) + '</div></div>';
    });
    html += '</div>';
  }

  html += '<div class="sec"><h3>我方航空聯隊</h3>';

  S.air.filter(w => !w.dead && w.side === 'ROC').forEach(w => {
    const bp = TW.PLACES.find(x => x.name === w.base);
    const cap = TW.baseCap(bp), load = TW.baseLoad(w.base);
    const rf = TW.wingRange(w), crowd = bp ? TW.baseCrowd(bp) : 1;
    const bh = bp && TW.hexAt(bp.c, bp.r);
    const lost = bh && bh.owner !== 'ROC';
    html += '<div class="item"><div class="t">' + w.name +
      '<span style="font-size:11px;color:#7c8b9c">' + Math.round(w.n) + '／' + w.maxN + ' 架</span></div>' +
      '<div class="d">' + w.A.name + '　駐地：<b' + (lost ? ' style="color:#e05a50"' : '') + '>' + w.base +
        (lost ? '（已失守！）' : '') + '</b>' +
        '　妥善出動 ' + Math.round(TW.wingReady(w) * 100) + '%' +
        (!w.us && cap ? '<br><span style="color:#7c8b9c">基地容量 ' + Math.round(load) + ' / ' + cap + ' 架' +
          (crowd < 1 ? '　<b style="color:#e0a33a">超載 ×' + crowd.toFixed(2) + '</b>' : '') +
          '　作戰半徑 ' + (rf < 1 ? '<b style="color:#e0a33a">×' + rf.toFixed(2) + '（空域太遠）</b>' : '×1.00') +
          '</span>' : '') +
      '</div>' +
      (w.transit
        ? '<div class="d" style="color:#7fd0ff;margin-top:3px">✈ 轉場中：' + w.transit.from + ' → <b>' + w.transit.to +
          '</b>（本回合不出勤，回合結束時抵達）　<button data-act="unrebase" data-w="' + w.id + '">取消轉場</button></div>'
        : '') +
      ((w.equip && w.equip.length)
        ? '<div class="d">配賦：' + [...new Set(w.equip)].map(k =>
            '<span class="chip new">' + TW.EQUIP[k].name +
            (w.equip.filter(x => x === k).length > 1
              ? ' ×' + w.equip.filter(x => x === k).length : '') + '</span>').join('') + '</div>'
        : '') +
      '<select class="mis" data-air="' + w.id + '"' + (w.transit ? ' disabled' : '') + '>' +
      TW.AIR_MISSIONS.map(m => '<option value="' + m.id + '"' +
        ((w.transit ? w.transit.mission : w.mission) === m.id ? ' selected' : '') + '>' + m.name + '　—　' + m.desc + '</option>').join('') +
      '</select>' +
      '<select class="tgt" data-airzone="' + w.id + '">' +
      TW.ZONES.map(z => {
        /* 每個空域旁邊標出從目前駐地飛過去的作戰半徑係數 */
        const f = TW.wingRange(Object.assign({}, w, { zone:z.id }));
        return '<option value="' + z.id + '"' + (w.zone === z.id ? ' selected' : '') + '>作戰空域：' + z.name +
          (w.us ? '' : '　（半徑 ×' + f.toFixed(2) + '）') + '</option>';
      }).join('') +
      '</select>' +
      (!w.us && TW.rebaseTargets(w).length
        ? '<select class="tgt" data-rebase="' + w.id + '">' +
          '<option value="">轉場到其他基地…（要一回合，期間不出勤）</option>' +
          TW.rebaseTargets(w).map(p => {
            const c2 = TW.baseCap(p), l2 = TW.baseLoad(p.name) + (w.transit && w.transit.to === p.name ? 0 : w.n);
            const f2 = TW.wingRange(Object.assign({}, w, { base:p.name }));
            const dmg = TW.hexAt(p.c, p.r).damage;
            return '<option value="' + p.name + '"' + (w.transit && w.transit.to === p.name ? ' selected' : '') + '>' +
              '→ ' + p.name + '　轉過去後 ' + Math.round(l2) + '/' + c2 + ' 架' + (l2 > c2 ? '（超載）' : '') +
              '　跑道 ' + Math.round((1 - dmg) * 100) + '%' +
              '　對目前空域半徑 ×' + f2.toFixed(2) + (p.hardened ? '　山洞機庫' : '') + '</option>';
          }).join('') + '</select>'
        : '') +
      this.airGiveHtml(w) + '</div>';
  });
  return html + '</div>';
},

/* 航空聯隊的撥交清單。F-16V、E-2D、阿帕契、電戰莢艙是掛在飛機上的，
   之前這些會出現在陸軍旅的撥交清單裡，那是錯的。 */
airGiveHtml(w){
  const S = TW.S;
  const keys = Object.keys(S.stock)
    .filter(k => S.stock[k] >= 1 && TW.equipTarget(k) === 'air');
  if (!keys.length) return '';
  let html = '<div class="d" style="margin-top:5px;color:#e0c07a">可撥交航空裝備</div>';
  keys.forEach(k => {
    const e = TW.EQUIP[k];
    const has = (w.equip || []).filter(x => x === k).length;
    html += '<div class="d" style="margin:2px 0 0 6px">' + e.name +
      '　庫存 ' + Math.floor(S.stock[k]) + ' 批' +
      (has ? '（本聯隊已有 ' + has + '，再撥效益 ×' + Math.pow(0.55, has).toFixed(2) + '）' : '') +
      ' <button data-act="givewing" data-w="' + w.id + '" data-eq="' + k + '">撥交</button>' +
      '<br><span style="color:#7c8b9c">' + modText(e.mod) + '</span></div>';
  });
  return html;
},

/* ---------- 海軍 ---------- */
tabNavy(){
  const S = TW.S;
  let html = '<div class="sec"><h3>海域態勢</h3>';
  TW.ZONES.filter(z => z.sea).forEach(z => {
    const v = S.zoneSea[z.id];
    html += '<div class="item"><div class="t">' + z.name +
      '<span style="color:' + (v >= 0 ? '#66d3a0' : '#ef8a85') + '">' +
      (v >= 0 ? '+' : '') + Math.round(v * 100) + '%</span></div></div>';
  });
  html += '</div><div class="sec"><h3>海上編隊</h3>';

  S.navy.filter(f => !f.dead && f.side === 'ROC').forEach(f => {
    const st = TW.fleetStats(f);
    html += '<div class="item' + (S.sel === f.id ? ' cando' : '') + '" data-selfleet="' + f.id + '">' +
      '<div class="t"' + (f.us ? ' style="color:#6fd8a8"' : '') + '>' + f.name +
      '<span style="font-size:11px;color:#7c8b9c">' +
      Math.round(f.hp) + '／' + f.maxHp + '</span></div>' +
      '<div class="d">' + f.ships.filter(s => s.n > 0).map(s => s.N.name + '×' + s.n).join('、') +
      '<br>航速 ' + st.kt + ' 節（' + TW.fleetSpeed(f) + ' 格／回合）' +
      '<br>防空 ' + st.aa + '　反艦 ' + st.asuw + '　反潛 ' + st.asw +
      (st.mine >= 0.5 ? '　<b style="color:#e0c07a">布雷 ' +
        Math.round(st.mine * (f.hp / f.maxHp) * 10) / 10 + ' 格/回合</b>' : '') +
      '　@' + TW.hexName(TW.hexAt(f.c, f.r)) +
      ((f.cargo && f.cargo.length)
        ? '<br><b style="color:#e0c07a">艙內：' +
          f.cargo.map(id => { const x = S.units.find(y => y.id === id); return x ? x.name : '?'; }).join('、') +
          '</b>' + (f.loading > 0 ? '（裝載中，還要 ' + f.loading + ' 回合）'
                                  : '　<span style="color:#7c8b9c">點岸上那一格即可登陸</span>')
        : (TW.fleetStats(f).lift > 0
            ? '<br><span style="color:#7c8b9c">可載 ' +
              Math.floor(TW.fleetStats(f).lift * (f.hp / f.maxHp)) + ' 個旅（選陸軍部隊按「登艦」）</span>'
            : '')) +
      (TW.isSub(f)
        ? (f.exposed > 0
            ? '<br><b style="color:#e05a50">位置已暴露（還有 ' + f.exposed +
              ' 回合）——共軍知道你在哪裡，先脫離接觸。</b>'
            : '<br><b style="color:#66d3a0">潛航中，未被偵獲。</b>'
              + '<span style="color:#7c8b9c">　開火會暴露位置</span>')
        : '') + '</div>' +
      '<select class="mis" data-navy="' + f.id + '">' +
      TW.NAVY_MISSIONS.map(m => '<option value="' + m.id + '"' +
        (f.mission === m.id ? ' selected' : '') + '>' + m.name + '　—　' + m.desc + '</option>').join('') +
      '</select></div>';
  });
  const mines = Math.floor(TW.S.stock.seamine || 0);
  html += '</div><div class="sec"><h3>水雷庫存</h3><div class="item"><div class="t">' +
    '智慧水雷 ' + mines + ' 批</div><div class="d">' +
    (mines > 0
      ? '交由艦隊執行「佈雷」任務時直接消耗，庫存越多，單次佈設的密度越高。'
      : '<span style="color:#e0a33a">庫存見底。艦隊仍可佈雷，但密度只有基本值。</span>') +
    '<br><span style="color:#7c8b9c">水雷是艦艇的彈藥，不撥交給地面部隊。' +
    '灘外航道的雷區是最具成本效益的反登陸手段。</span></div></div></div>';
  html += '<div class="empty">點選編隊後，在地圖上點海面即可下達航向。' +
    '受損的艦隊選「回港整補」並開回左營、蘇澳或馬公，就會逐回合修復戰損。</div>';
  return html;
},

/* ---------- 生產 ---------- */
tabProd(){
  const S = TW.S;
  const e = TW.Env.detail();
  const af = TW.Env.ammoFactor();

  /* ---- 這一局的設定 ---- */
  const D = TW.DIFFICULTY[TW.B.DIFFICULTY] || TW.DIFFICULTY[2];
  const sgn = v => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
  let html = '<div class="sec"><h3>這一局的設定</h3><div class="item"><div class="t">' +
    TW.CAMPAIGN[TW.B.CAMPAIGN_MONTHS].name + '　·　難度 ' + D.name + '</div>' +
    '<div class="d">' + D.desc + '<br><br>' +
    '共軍火力 <b>' + sgn(D.plaFire) + '</b>　我方火力 <b>' + sgn(D.rocFire) + '</b><br>' +
    '軍援機率 <b>' + sgn(D.aid) + '</b>　彈藥補充 <b>' + sgn(D.ammo) + '</b><br>' +
    '共軍增援 <b>' + sgn(D.reinf) + '</b>　後備動員 <b>' + sgn(D.reserve) + '</b><br>' +
    '我方意志耗損 <b>' + sgn(D.rocWill) + '</b>　' +
    '美軍最早介入 <b>第 ' + TW.B.US_INTERVENE_TURN + ' 回合</b>' +
    '</div></div></div>';

  /* ---- 後勤：彈藥存量 ---- */
  html += '<div class="sec"><h3>戰備彈藥</h3><div class="item"><div class="t">' +
    '存量 ' + Math.round(S.ammo) + ' / ' + S.ammoMax +
    '<span style="color:' + (af >= 1 ? '#66d3a0' : (af > 0.55 ? '#e0a33a' : '#e05a50')) + '">火力 ' +
    Math.round(af * 100) + '%</span></div>' +
    '<div class="bar"><i class="hp" style="width:' +
      Math.round(TW.clamp(S.ammo / S.ammoMax, 0, 1) * 100) + '%"></i></div>' +
    '<div class="d" style="margin-top:5px">' +
    '每回合補充 <b>' + (S.ic * TW.B.AMMO_PER_IC * (1 + S.mod.ammo)).toFixed(1) + '</b>' +
    '（工業產能決定）　上回合消耗 <b>' + (S.ammoLast || 0).toFixed(1) + '</b><br>' +
    (af >= 1
      ? '存量充足，火力沒有折扣。'
      : '<b style="color:#e0a33a">彈藥不足，砲兵、地面戰與岸置反艦飛彈的火力全部打折。</b>') +
    '<br>砲兵一次火力任務 ' + TW.B.AMMO_ARTY_SHOT + '　岸置反艦一次齊射 ' + TW.B.AMMO_NAVAL_SALVO +
    '<br>接戰中的部隊每回合另外燒 ' + TW.B.AMMO_PER_ENGAGED +
    '（砲兵 ' + TW.B.AMMO_PER_ARTY_ENGAGED + '）——這是最大宗的消耗<br>' +
    '<span style="color:#7c8b9c">打得越兇，撐得越短。這是台灣防衛作戰最真實的取捨。</span>' +
    '</div></div></div>';

  /* ---- 天候與海象 ---- */
  html += '<div class="sec"><h3>天候與海象</h3><div class="item"><div class="d">' +
    '<b>' + e.time + '</b><br>' + e.sea + '<br>' + e.vis + '<br>' +
    '<b style="color:' + (TW.Env.canLand() ? '#e05a50' : '#66d3a0') + '">' + e.land + '</b><br>' +
    (e.forecast ? e.forecast + '<br>' : '') +
    '<span style="color:#7c8b9c">出動架次 ' + e.airPct + '%　海上作戰效率 ' + e.seaPct + '%</span>' +
    '</div></div></div>';

  /* ---- 電網 ---- */
  const plants = TW.PLACES.filter(p => p.mw).map(p => {
    const ph = TW.hexAt(p.c, p.r);
    const ok  = ph.owner === 'ROC';
    const pct = Math.round((1 - ph.damage) * 100);
    return '<div style="color:' + (!ok ? '#ef8a85' : (pct < 60 ? '#e0a33a' : '#8fa4b8')) + '">' +
      p.name + '　' + (ok ? '可用 ' + pct + '%' : '已失守') +
      '　<span style="color:#7c8b9c">佔全國 ' + p.mw + '%</span></div>';
  }).join('');
  html += '<div class="sec"><h3>電網</h3><div class="item"><div class="t">供電率 ' +
    Math.round(S.power * 100) + '%</div>' +
    '<div class="bar"><i class="hp" style="width:' + Math.round(S.power * 100) + '%"></i></div>' +
    '<div class="d" style="margin-top:5px">' + plants +
    '<div style="margin-top:5px">' +
    (S.power >= TW.B.POWER_BROWNOUT
      ? '供電正常，工業產能全額發揮。'
      : '<b style="color:#e0a33a">分區限電中，工業產能下滑，彈藥補充跟著變慢。</b>') +
    '</div>' +
    '<span style="color:#7c8b9c">核二、核三已於 2025 年除役，現在的電幾乎全靠這幾座火力與燃氣機組。' +
    '打掉電廠比打掉工廠有效——這也是共軍第一波飛彈的重點目標。</span>' +
    '</div></div></div>';

  html += '<div class="sec"><h3>工業</h3><div class="item"><div class="d">' +
    '每回合產能 <b>' + S.ic + '</b>　可用存量 <b>' + Math.round(S.icStore) + '</b><br>' +
    '產能來自我方控制且未被摧毀的都市與港口。</div></div></div>';

  if (S.prodQueue.length){
    html += '<div class="sec"><h3>生產中</h3>';
    S.prodQueue.forEach(p => {
      html += '<div class="item"><div class="t">' + TW.EQUIP[p.eq].name +
        '<span style="font-size:11px">剩 ' + p.left + ' 回合</span></div></div>';
    });
    html += '</div>';
  }

  html += '<div class="sec"><h3>國造產線</h3>';
  Object.keys(TW.EQUIP).filter(k => TW.EQUIP[k].src === 'ROC').forEach(k => {
    const e = TW.EQUIP[k];
    const can = S.icStore >= e.ic;
    html += '<div class="item' + (can ? ' cando' : '') + '"><div class="t">' + e.name +
      '<button data-act="build" data-eq="' + k + '"' + (can ? '' : ' disabled') + '>' + e.ic + ' 點</button></div>' +
      '<div class="d">' + e.desc + '<br><span class="chip">' + TW.EQUIP_CAT[e.cat] + '</span>' +
      '<span class="chip">' + e.turns + ' 回合</span>' + modText(e.mod) + '</div></div>';
  });
  return html + '</div>';
},

/* ---------- 研發 ---------- */
tabTech(){
  const S = TW.S;
  let html = '<div class="sec"><h3>研發中（同時最多 3 案）</h3>';
  if (!S.research.length) html += '<div class="empty">目前沒有進行中的研發案。</div>';
  S.research.forEach(r => {
    const T = TW.TECH.find(x => x.id === r.id);
    html += '<div class="item"><div class="t">' + T.name +
      '<span style="font-size:11px">剩 ' + r.left + ' 回合</span></div></div>';
  });
  html += '</div><div class="sec"><h3>可開案項目</h3>';

  TW.TECH.forEach(t => {
    const done = S.doneTech.includes(t.id);
    const running = S.research.some(r => r.id === t.id);
    const reqOk = !t.req || S.doneTech.includes(t.req);
    const can = !done && !running && reqOk && S.icStore >= t.ic && S.research.length < 3;
    html += '<div class="item' + (done ? ' done' : (can ? ' cando' : '')) + '">' +
      '<div class="t">' + t.name +
      (done ? '<span class="chip">已完成</span>' :
        '<button data-act="tech" data-t="' + t.id + '"' + (can ? '' : ' disabled') + '>' + t.ic + ' 點</button>') +
      '</div><div class="d">' + t.desc + '<br><span class="chip">' + t.cat + '</span>' +
      '<span class="chip">' + t.turns + ' 回合</span>' +
      (t.req && !reqOk ? '<span class="chip">需先完成：' + TW.TECH.find(x => x.id === t.req).name + '</span>' : '') +
      '</div></div>';
  });
  return html + '</div>';
},

/* ---------- 外交軍售 ---------- */
tabDip(){
  const S = TW.S;
  const p = TW.B.AID_ROLL_BASE + S.intl * TW.B.AID_ROLL_PER_INTL + S.mod.aidChance;
  let html = '<div class="sec"><h3>國際情勢</h3><div class="item"><div class="d">' +
    '國際支持度 <b>' + Math.round(S.intl) + '</b> / 100<br>' +
    '每回合觸發軍援的機率約 <b>' + Math.round(p * 100) + '%</b><br>' +
    '目前可取得的最高等級：<b>' + tierName(S.intl) + '</b><br>' +
    (S.flags.usIntervened ? '<span class="chip us">美軍已直接介入</span>' :
      '美軍直接介入門檻：國際支持 ' + TW.B.US_INTERVENE_INTL + ' 且撐過 ' + TW.B.US_INTERVENE_TURN + ' 回合') +
    '</div></div></div>';

  if (S.incoming.length){
    html += '<div class="sec"><h3>運送中</h3>';
    S.incoming.forEach(i => {
      html += '<div class="item"><div class="t">' + i.name +
        '<span style="font-size:11px">' + i.eta + ' 回合後抵達</span></div>' +
        '<div class="d">' + i.from + '<br>' +
        i.items.map(([e, n]) => TW.EQUIP[e].name + '×' + n).join('、') + '</div></div>';
    });
    html += '</div>';
  }

  const keys = Object.keys(S.stock).filter(k => S.stock[k] >= 1);
  if (keys.length){
    html += '<div class="sec"><h3>待撥交裝備庫</h3>';
    keys.forEach(k => {
      html += '<div class="item"><div class="t">' + TW.EQUIP[k].name +
        '<span style="font-size:11px">' + Math.floor(S.stock[k]) + ' 批</span></div>' +
        '<div class="d">到「部隊」分頁選一個旅即可撥交。</div></div>';
    });
    html += '</div>';
  }

  /* 交付量隨國際支持度變動——這是玩家最該盯著的一條線 */
  const qm = TW.aidMult();
  html += '<div class="sec"><h3>目前的交付條件</h3><div class="item"><div class="t">' +
    '軍售交付量 ×' + qm.toFixed(2) +
    '<span style="font-size:11px">國際支持 ' + Math.round(S.intl) + '</span></div>' +
    '<div class="d">' + (qm >= TW.B.AID_QTY_MAX - 0.001
      ? '已經到上限。同一個案子能一次交付的批數不會再增加了。'
      : (qm > 1.02
        ? '支持度每多 1 點，同一個軍售案交付的批數再多 ' +
          Math.round(TW.B.AID_QTY_PER_INTL * 100) + '%（上限 ×' +
          TW.B.AID_QTY_MAX.toFixed(1) + '）。加碼的部分只需自付 ' +
          Math.round(TW.B.AID_QTY_COST * 100) + '% 經費。'
        : '國際支持度到 ' + TW.B.AID_QTY_INTL0 +
          ' 以上，同一個軍售案交付的批數才會開始加碼。現在只拿得到基本量。')) +
    '</div></div></div>';

  html += '<div class="sec"><h3>外交行動</h3>';
  TW.DIPLOMACY.forEach(d => {
    const cd = S.dipCd[d.id] || 0;
    const can = cd <= 0 && S.pp >= d.pp;
    html += '<div class="item' + (can ? ' cando' : '') + '"><div class="t">' + d.name +
      '<button data-act="dip" data-d="' + d.id + '"' + (can ? '' : ' disabled') + '>' +
      (cd > 0 ? '冷卻 ' + cd : d.pp + ' PP') + '</button></div>' +
      '<div class="d">' + d.desc + '　' + modText(d.eff) + '</div></div>';
  });

  html += '</div><div class="sec"><h3>已獲得的軍售案</h3>';
  if (!S.aidHistory.length) html += '<div class="empty">尚無。</div>';
  S.aidHistory.forEach(id => {
    const a = TW.AID_PACKAGES.find(x => x.id === id);
    if (a) html += '<div class="item done"><div class="t">' + a.name + '</div>' +
      '<div class="d">' + a.from + '</div></div>';
  });
  return html + '</div>';

  function tierName(i){
    if (i >= 76) return '第四級：盟國直接介入';
    if (i >= 52) return '第三級：戰略級裝備';
    if (i >= 30) return '第二級：改變態勢的裝備';
    return '第一級：現有存量撥交';
  }
},

/* ---------- 國策 ---------- */
tabPol(){
  const S = TW.S;
  const done = S.policies.length;
  const spent = TW.POLICIES.filter(p => S.policies.includes(p.id))
                           .reduce((a, p) => a + p.pp, 0);

  let html = '<div class="sec"><h3>政治點：' + Math.round(S.pp) +
    '<span style="font-size:11px">每回合 +' + TW.B.PP_PER_TURN.toFixed(1) + '</span></h3>' +
    '<div class="item"><div class="d">已實施 ' + done + ' / ' + TW.POLICIES.length +
    ' 項，累計投入 ' + spent + ' 政治點。' +
    '整場戰役的政治點不夠推完全部——國策是取捨，不是清單。</div></div></div>';

  /* 依分類分組顯示 */
  const cats = [];
  TW.POLICIES.forEach(p => { const c = p.cat || '其他'; if (!cats.includes(c)) cats.push(c); });

  cats.forEach(cat => {
    html += '<div class="sec"><h3>' + catName(cat) + '</h3>';
    TW.POLICIES.filter(p => (p.cat || '其他') === cat).forEach(p => {
      const isDone = S.policies.includes(p.id);
      const groupTaken = p.group && !isDone && S.policies.some(id => {
        const o = TW.POLICIES.find(x => x.id === id); return o && o.group === p.group;
      });
      const reqOk = !p.req || S.policies.includes(p.req);
      const can = !isDone && !groupTaken && reqOk && S.pp >= p.pp;

      html += '<div class="item' + (isDone ? ' done' : (can ? ' cando' : '')) + '">' +
        '<div class="t">' + p.name +
        (isDone ? '<span class="chip">已實施</span>' :
          '<button data-act="pol" data-p="' + p.id + '"' + (can ? '' : ' disabled') + '>' +
          p.pp + ' PP</button>') +
        '</div><div class="d">' + p.desc + '<br>' + modText(p.eff) +
        (!isDone && p.req && !reqOk
          ? '<br><span class="chip">需先實施：' +
            TW.POLICIES.find(x => x.id === p.req).name + '</span>' : '') +
        (groupTaken ? '<br><span class="chip">已經選了別的準則，不能再改</span>' : '') +
        (!isDone && !groupTaken && reqOk && S.pp < p.pp
          ? '<br><span class="chip">政治點不足（還差 ' +
            Math.ceil(p.pp - S.pp) + '）</span>' : '') +
        '</div></div>';
    });
    html += '</div>';
  });
  return html;

  function catName(c){
    return { 動員:'動員與兵員', 後方:'後方與產能', 國安:'國土安全',
             對外:'對外開放', 準則:'作戰準則（三擇一，選了不能改）' }[c] || c;
  }
},

/* --------------------------------------------------------------------------
   按鈕綁定
   -------------------------------------------------------------------------- */
bind(box){
  const S = TW.S;

  box.querySelectorAll('[data-sel]').forEach(el => {
    el.onclick = () => {
      S.sel = el.dataset.sel;
      const u = S.units.find(x => x.id === S.sel);
      if (u) TW.Map.center(u.c, u.r);
      this.refresh();
    };
  });
  box.querySelectorAll('[data-selfleet]').forEach(el => {
    el.onclick = e => {
      if (e.target.tagName === 'SELECT') return;
      S.sel = el.dataset.selfleet;
      const f = S.navy.find(x => x.id === S.sel);
      if (f) TW.Map.center(f.c, f.r);
      this.refresh();
    };
  });
  box.querySelectorAll('[data-air]').forEach(el => {
    el.onchange = () => {
      const w = S.air.find(x => x.id === el.dataset.air);
      if (w) w.mission = el.value;
      TW.Rules.recalcAirSea(); this.refresh();
    };
  });
  box.querySelectorAll('[data-airzone]').forEach(el => {
    el.onchange = () => {
      const w = S.air.find(x => x.id === el.dataset.airzone);
      if (w) w.zone = el.value;
      TW.Rules.recalcAirSea(); this.refresh();
    };
  });
  /* 部隊編成器的文字欄：打字時只更新資料，不要整個重畫（不然游標會跳掉） */
  box.querySelectorAll('[data-dn]').forEach(el => { el.oninput = () => { this.design.name = el.value; }; });
  box.querySelectorAll('[data-ds]').forEach(el => { el.oninput = () => { this.design.short = el.value; }; });
  box.querySelectorAll('[data-bname]').forEach(el => { el.oninput = () => { this.designBrig = el.value; }; });
  box.querySelectorAll('[data-fat]').forEach(el => { el.onchange = () => { this.designAt = el.value; }; });

  box.querySelectorAll('[data-rebase]').forEach(el => {
    el.onchange = () => {
      const w = S.air.find(x => x.id === el.dataset.rebase);
      if (w && el.value && TW.rebaseWing(w, el.value)){
        TW.log('c-roc', '【轉場】' + w.name + ' 奉命由 ' + w.transit.from + ' 轉場至 ' + el.value +
          '，本回合不出勤，回合結束時抵達。');
      }
      TW.Rules.recalcAirSea(); this.refresh();
    };
  });
  box.querySelectorAll('[data-navy]').forEach(el => {
    el.onchange = () => {
      const f = S.navy.find(x => x.id === el.dataset.navy);
      if (f) f.mission = el.value;
      TW.Rules.recalcAirSea(); this.refresh();
    };
  });

  box.querySelectorAll('[data-act]').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      const a = el.dataset.act;

      if (a === 'hold'){ const u = S.units.find(x => x.id === el.dataset.u); if (u) u.order = { type:'hold' }; this.airliftMode = false; }
      if (a === 'clear'){ const u = S.units.find(x => x.id === el.dataset.u); if (u) u.order = null; this.airliftMode = false; }
      if (a === 'refit'){
        const u = S.units.find(x => x.id === el.dataset.u);
        if (u){ u.order = { type:'refit' }; u.entrench = Math.max(0, u.entrench - 0.2);
                TW.log('c-ok', u.name + ' 轉入後送整補，本回合不參加攻擊。'); }
        this.airliftMode = false;
      }
      if (a === 'airlift'){
        this.airliftMode = !this.airliftMode;
      }

      if (a === 'give'){
        const u = S.units.find(x => x.id === el.dataset.u), k = el.dataset.eq;
        if (u && S.stock[k] >= 1){
          S.stock[k] -= 1;
          u.equip.push(k);
          const e2 = TW.EQUIP[k];
          if (e2.consumable){ u.supply = Math.min(1, u.supply + 0.25); u.equip.pop(); }
          if (e2.strategic) TW.Rules.recalcAirSea();
          TW.log('c-us', '【撥交】' + e2.name + ' 配賦給 ' + u.name + '。');
        }
      }

      if (a === 'raid'){
        const u = S.units.find(x => x.id === el.dataset.u);
        const ts = TW.Rules.raidTargets(u);
        if (ts.length){
          this.modal({ title:'特種作戰突擊', sub:'SPECIAL OPERATIONS RAID',
            text:u.name + ' 要滲透對岸哪一個目標？\n\n' +
                 '突擊隊以小艇夜間潛渡，破壞油庫、吊掛設施與跑道。\n' +
                 '這不是佔領——砸完就撤，但自己也會有損失。\n' +
                 '海峽制海權太差的時候，小艇可能根本渡不過去。',
            opts: ts.map(p => {
              const th = TW.hexAt(p.c, p.r);
              return { label:p.name + '（' + TW.Hex.distance(u.c, u.r, p.c, p.r) + ' 格）',
                hint:(p.staging ? '共軍集結港，打了會削弱海運　' : '') +
                     '目前可用率 ' + Math.round((1 - th.damage) * 100) + '%',
                eff:() => {
                  u.order = { type:'raid', target:p.name, prep:TW.B.RAID_TURNS - 1 };
                  TW.log('c-roc', '【特戰】' + u.name + ' 奉命突擊 ' + p.name + '。');
                  this.refresh();
                } };
            })
          });
          this.flushModal();
        }
      }

      if (a === 'embark'){
        const u = S.units.find(x => x.id === el.dataset.u);
        const fs = TW.Rules.embarkTargets(u);
        if (fs.length === 1) TW.Rules.embark(u, fs[0]);
        else if (fs.length > 1){
          /* 旁邊有好幾艘，讓玩家挑 */
          this.modal({ title:'要登上哪一艘？', sub:'AMPHIBIOUS EMBARKATION',
            text:u.name + ' 要登艦。附近可用的兩棲艦艇：',
            opts: fs.map(f => ({
              label:f.name, hint:'還可載 ' + TW.Rules.liftFree(f) + ' 個旅',
              eff:() => { TW.Rules.embark(u, f); this.refresh(); } }))
          });
          this.flushModal();
        }
      }

      if (a === 'demo'){
        const u = S.units.find(x => x.id === el.dataset.u);
        if (u && TW.Rules.canDemo(u)){
          const h = TW.hexAt(u.c, u.r);
          h.demo = { left:TW.B.DEMO_TURNS, ready:false, by:u.side };
          u.order = { type:'demo' };
          u.entrench = Math.max(0, u.entrench - 0.1);
          TW.Env.spend(TW.B.DEMO_AMMO);
          TW.log('c-roc', '【阻絕】' + u.name + ' 開始在 ' + TW.hexName(h) + ' 埋設爆破裝藥。');
        }
      }

      if (a === 'blow'){
        TW.Rules.detonate(+el.dataset.c, +el.dataset.r, 'ROC');
      }

      /* ---- 部隊編成器 ---- */
      if (a === 'bnadd' || a === 'bnsub'){
        const D = this.design, k = el.dataset.k;
        const n = Object.values(D.bns).reduce((x, y) => x + y, 0);
        if (a === 'bnadd' && n < TW.BRIGADE_MAX_BN) D.bns[k] = (D.bns[k] || 0) + 1;
        if (a === 'bnsub' && D.bns[k] > 0) D.bns[k]--;
      }
      if (a === 'tplload'){
        const tp = S.templates[+el.dataset.i];
        if (tp){ this.design = JSON.parse(JSON.stringify(tp)); this.designBrig = ''; }
      }
      if (a === 'tpldel'){
        const i = +el.dataset.i;
        if (S.templates.length > 1) S.templates.splice(i, 1);
      }
      if (a === 'tplsave'){
        const D = JSON.parse(JSON.stringify(this.design));
        D.name = (D.name || '自編旅').trim() || '自編旅';
        const i = S.templates.findIndex(x => x.name === D.name);
        if (i >= 0) S.templates[i] = D; else S.templates.push(D);
        TW.log('', '【編成】範本「' + D.name + '」已儲存。');
      }
      if (a === 'formstart'){
        const D = JSON.parse(JSON.stringify(this.design));
        D.name = (D.name || '自編旅').trim() || '自編旅';
        const cost = TW.brigadeCost(D);
        if (cost.n >= 2 && S.icStore >= cost.ic && S.manpower >= cost.man && this.designAt){
          S.icStore -= cost.ic;
          S.manpower -= cost.man;
          S.formedCount = (S.formedCount || 0) + 1;
          const name = (this.designBrig || '').trim() || ('自編第' + S.formedCount + (D.short || '') + '旅');
          S.forming.push({ name, tpl:D, left:cost.turns, at:this.designAt, ic:cost.ic });
          this.designBrig = '';
          TW.log('c-ok', '【編成】' + name + '（' + D.name + '）開始編成，' + cost.turns +
            ' 回合後於 ' + this.designAt + ' 報到。投入工業點 ' + cost.ic + '、人力 ' + cost.man + 'k。');
        }
      }
      if (a === 'formcancel'){
        const F = S.forming[+el.dataset.i];
        if (F){
          S.forming.splice(+el.dataset.i, 1);
          const back = Math.round((F.ic || TW.brigadeCost(F.tpl).ic) * 0.5);
          S.icStore += back;
          S.manpower += TW.brigadeCost(F.tpl).man;
          TW.log('', '【編成】取消 ' + F.name + ' 的編成，退回工業點 ' + back + '，人員歸建。');
        }
      }

      if (a === 'unrebase'){
        const w = S.air.find(x => x.id === el.dataset.w);
        if (w && w.transit){
          TW.log('', '【轉場】' + w.name + ' 取消轉場，留在 ' + w.base + '。');
          TW.cancelRebase(w);
          TW.Rules.recalcAirSea();
        }
      }

      if (a === 'givewing'){
        const w = S.air.find(x => x.id === el.dataset.w), k = el.dataset.eq;
        if (w && S.stock[k] >= 1){
          S.stock[k] -= 1;
          (w.equip = w.equip || []).push(k);
          TW.Rules.recalcAirSea();
          TW.log('c-us', '【撥交】' + TW.EQUIP[k].name + ' 掛載於 ' + w.name + '。');
        }
      }

      if (a === 'build'){
        const e2 = TW.EQUIP[el.dataset.eq];
        if (S.icStore >= e2.ic){
          S.icStore -= e2.ic;
          S.prodQueue.push({ eq:el.dataset.eq, packs:1, left:e2.turns });
          TW.log('', '【生產】' + e2.name + ' 開始生產，' + e2.turns + ' 回合後出廠。');
        }
      }

      if (a === 'tech'){
        const t = TW.TECH.find(x => x.id === el.dataset.t);
        if (t && S.icStore >= t.ic && S.research.length < 3){
          S.icStore -= t.ic;
          S.research.push({ id:t.id, left:t.turns });
          TW.log('', '【研發】' + t.name + ' 開案。');
        }
      }

      if (a === 'pol'){
        const p = TW.POLICIES.find(x => x.id === el.dataset.p);
        const okReq = p && (!p.req || S.policies.includes(p.req));
        const okGrp = p && (!p.group || !S.policies.some(id => {
          const o = TW.POLICIES.find(x => x.id === id); return o && o.group === p.group;
        }));
        if (p && S.pp >= p.pp && !S.policies.includes(p.id) && okReq && okGrp){
          S.pp -= p.pp;
          S.policies.push(p.id);
          TW.Rules.applyEffect(p.eff);
          TW.log('c-ok', '【國策】' + p.name + ' 開始實施。');
          if (p.flavor) this.modal({ title:p.name, sub:'NATIONAL POLICY', text:p.flavor + '\n\n' + p.desc,
                                     opts:[{ label:'確認', hint:'', eff:()=>{} }] });
          this.flushModal();
        }
      }

      if (a === 'dip'){
        const d = TW.DIPLOMACY.find(x => x.id === el.dataset.d);
        if (d && S.pp >= d.pp && !(S.dipCd[d.id] > 0)){
          S.pp -= d.pp;
          S.dipCd[d.id] = d.cd;
          TW.Rules.applyEffect(d.eff);
          TW.log('c-us', '【外交】' + d.name + '。');
        }
      }

      this.refresh();
    };
  });
},

/* --------------------------------------------------------------------------
   地圖點擊
   -------------------------------------------------------------------------- */
onHexClick(c, r, ev){
  const S = TW.S;
  if (S.over) return;
  if (TW.Audio) TW.Audio.play('click', 0.5);
  this._pickHex = [c, r];
  const sel  = S.units.find(u => u.id === S.sel && !u.dead);
  const selF = S.navy.find(f => f.id === S.sel && !f.dead);
  const h = TW.hexAt(c, r);
  if (!h) return;
  const sameHex = sel && sel.c === c && sel.r === r;

  /* ---- 空機降模式：下一次點擊決定降落點 ---- */
  if (this.airliftMode && sel && sel.T.airmobile){
    this.airliftMode = false;
    const d = TW.Hex.distance(sel.c, sel.r, c, r);
    const here = TW.hexAt(sel.c, sel.r);
    /* 從金門、馬祖起跳＝以外島當跳板。這是唯一構得著對岸的方式。 */
    const fromIsland = here && here.place && here.place.raidBase && here.owner === 'ROC';

    if (h.t === '.' || d > TW.B.AIRLIFT_RANGE || d < 1){
      TW.log('c-warn', '無法機降：必須是陸地，且在 ' + TW.B.AIRLIFT_RANGE + ' 格以內。');
    } else if (h.T.prc && !S.whatIf){
      TW.log('c-warn', '無法機降：現實中國軍不會空降對岸。（架空模式才解得開）');
    } else if (h.T.prc && !fromIsland){
      TW.log('c-warn', '無法機降：要空降對岸，部隊得先進駐金門或馬祖當跳板。' +
                       '從台灣本島直接跳過去，運輸機根本飛不回來。');
    } else if (TW.unitsAt(c, r).filter(x => x.side === 'ROC').length >= 2){
      TW.log('c-warn', '無法機降：' + TW.hexName(h) + ' 已經有兩支部隊。');
    } else {
      sel.order = { type:'airlift', tc:c, tr:r };
      const contested = (h.owner !== 'ROC');
      TW.log('c-roc', sel.name + ' 準備' + (contested ? '空降突擊 ' : '機降 ') +
        TW.hexName(h) + '。' +
        (contested ? '　落地會直接接戰，損失比一般機降重得多。' : ''));
      /* 下令當下就告訴玩家飛不飛得了——以前要等回合結算才知道被取消 */
      const airNow = S.zoneAir[h.zone] || 0;
      const zn = (TW.ZONES.find(z => z.id === h.zone) || {}).name || '該空域';
      if (airNow < TW.B.AIRLIFT_MIN_AIR)
        TW.log('c-warn', '　└ 注意：' + zn + '目前制空權 ' + Math.round(airNow * 100) + '%，' +
          '低於起飛門檻 ' + Math.round(TW.B.AIRLIFT_MIN_AIR * 100) + '%。這回合很可能飛不了，' +
          '部隊會在機場待命到制空權回來。先派戰機去爭取這個空域。');
      else if (airNow < TW.B.AIRLIFT_MIN_AIR + 0.15)
        TW.log('c-warn', '　└ ' + zn + '制空權 ' + Math.round(airNow * 100) + '%，' +
          '剛好在門檻邊緣，這回合的空戰結果可能讓它掉下去。');
    }
    this.refresh(); return;
  }

  /* ---- 已選我方地面部隊 → 下命令 ---- */
  if (sel && sel.side === 'ROC' && !sameHex){
    const d = TW.Hex.distance(sel.c, sel.r, c, r);
    const foes  = TW.unitsAt(c, r).filter(u => u.side === 'PLA');
    const ships = TW.navyAt(c, r).filter(f => f.side === 'PLA' && !TW.fleetHidden(f, 'ROC'));
    const facility = h.place && h.owner === 'PLA';

    /* 砲兵、火箭：遠程轟擊優先於貼身肉搏。
       但「機動部隊掛了火箭」不算砲兵——聯兵旅撥到雷霆 2000 之後
       還是要能突擊相鄰敵軍，不能因為多了射程就變成只會遠遠地打。 */
    const gunner = (sel.cls === 'arty' || sel.cls === 'ssm');
    if (TW.canBombard(sel) && !(d === 1 && !gunner && foes.length)){
      const rng = TW.unitRange(sel);
      if (foes.length || ships.length || facility){
        if (d <= rng){
          sel.order = { type:'bomb', tc:c, tr:r };
          TW.log('c-roc', sel.name + ' 對 ' + TW.hexName(h) + ' 下達火力任務（' +
                          d + ' 格 / ' + (d * TW.B.HEX_KM) + ' km）。');
        } else {
          TW.log('c-warn', sel.name + ' 射程 ' + rng + ' 格（' + (rng * TW.B.HEX_KM) +
                           ' km），打不到 ' + TW.hexName(h) + '（' + d + ' 格）。');
        }
        this.refresh(); return;
      }
    }

    /* 一般部隊：相鄰敵軍 → 突擊 */
    if (foes.length && d === 1){
      sel.order = { type:'attack', tc:c, tr:r };
      TW.log('c-roc', sel.name + ' 奉命攻擊 ' + TW.hexName(h) + '。');
      this.refresh(); return;
    }

    /* 點到有友軍的格子：意思可能是「換成指揮那一支」，也可能是「移動過去會合」。
       不要幫玩家猜，直接跳選單讓他挑。 */
    const friends = TW.unitsAt(c, r).filter(x => x.side === 'ROC');
    if (!foes.length && TW.isLand(c, r) && friends.length){
      this.showStackPick(friends, TW.navyAt(c, r).filter(f => f.side === 'ROC'), ev, sel);
      return;
    }

    /* 空地 → 移動 */
    if (!foes.length && TW.isLand(c, r)){
      const path = TW.Rules.path(sel, c, r);
      if (path && path.length){          // 空陣列代表「原地」，不是有效命令
        sel.order = { type:'move', path };
        this.refresh(); return;
      }
    }
  }

  /* ---- 已選艦隊、艙內有部隊、點的是相鄰陸地 → 兩棲登陸 ---- */
  if (selF && (selF.cargo || []).length && TW.isLand(c, r) &&
      TW.Hex.distance(selF.c, selF.r, c, r) <= 1){
    if (selF.loading > 0){
      TW.log('c-warn', selF.name + ' 還在裝載（剩 ' + selF.loading + ' 回合），無法登陸。');
    } else {
      const ev2 = [];
      if (TW.Rules.amphibLand(selF, h, ev2)){
        ev2.forEach(e => { if (e.txt) TW.log(e.cls || '', e.txt);
                           if (e.c !== undefined) TW.Map.addFx(e); });
      } else {
        TW.log('c-warn', '無法在 ' + TW.hexName(h) + ' 登陸（要相鄰的陸地，而且不能是對岸）。');
      }
    }
    this.refresh(); return;
  }

  /* ---- 已選艦隊 → 下航向 ----
     以前這裡是直接 sailToward()，等於點一下就瞬移，而且可以在同一回合
     一直點一直移動。現在改成下「航向」命令，實際航行在回合結算時進行，
     一回合只走得了艦隊的航速。 */
  if (selF && TW.isSea(c, r)){
    const path = TW.Rules.seaPath(selF, c, r);
    if (!path){
      TW.log('c-warn', selF.name + ' 找不到通往該處的航路。');
      this.refresh(); return;
    }
    if (!path.length){ this.refresh(); return; }
    selF.order = { type:'sail', path };
    const spd = TW.fleetSpeed(selF);
    TW.log('c-roc', selF.name + ' 航向 ' + TW.hexName(h) + '　全程 ' + path.length +
      ' 格，航速 ' + spd + ' 格／回合，預計 ' + Math.ceil(path.length / spd) + ' 回合到達。');
    this.refresh(); return;
  }

  /* ---- 否則就是選取 ---- */
  const here = TW.unitsAt(c, r).filter(u => u.side === 'ROC');
  const fl   = TW.navyAt(c, r).filter(f => f.side === 'ROC');

  if (here.length + fl.length > 1){
    this.showStackPick(here, fl, ev);      // 兩支以上 → 讓玩家自己挑
    return;
  }
  if (here.length){ this.pick(here[0].id, 'unit'); return; }
  if (fl.length){ this.pick(fl[0].id, 'navy'); return; }

  this.hideStackPick();
  S.sel = null;
  this.refresh();
},

/* 選定某個單位並切到對應分頁 */
pick(id, tab){
  TW.S.sel = id;
  this.airliftMode = false;
  this.hideStackPick();
  this.tab = tab;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
  this.refresh();
},

/* --------------------------------------------------------------------------
   同一格有好幾支部隊時的選取清單
   -------------------------------------------------------------------------- */
showStackPick(units, fleets, ev, mover){
  const box = document.getElementById('stackpick');
  const list = [];

  /* 已經有選定部隊時，第一個選項是「把它移動過來」 */
  if (mover && !units.some(u => u.id === mover.id)){
    list.push('<button data-move="1" class="sp-move"><b>▸</b> 把「' + mover.name +
              '」移動到這一格<small>與友軍會合（同格最多兩支）</small></button>');
  }

  units.forEach(u => list.push(
    '<button data-pid="' + u.id + '" data-ptab="unit"><b>' + u.icon + '</b> ' + u.name +
    '<small>兵力 ' + Math.round(u.hp) + '　組織 ' + Math.round(u.org) +
    (u.id === (mover && mover.id) ? '　（目前選定）' : '') + '</small></button>'));

  fleets.forEach(f => list.push(
    '<button data-pid="' + f.id + '" data-ptab="navy"><b>艦</b> ' + f.name +
    '<small>' + Math.round(f.hp) + ' / ' + f.maxHp + '</small></button>'));

  box.innerHTML = '<div class="sp-t">' +
    (mover ? '要做什麼？' : '這一格有 ' + list.length + ' 支部隊') + '</div>' + list.join('');
  box.classList.remove('hidden');
  this._pickHex = ev && ev.__hex ? ev.__hex : this._pickHex;

  const wrap = document.getElementById('mapwrap').getBoundingClientRect();
  const x = ev ? ev.clientX - wrap.left : 40;
  const y = ev ? ev.clientY - wrap.top  : 40;
  box.style.left = Math.min(Math.max(6, x + 12), wrap.width - box.offsetWidth - 6) + 'px';
  box.style.top  = Math.min(Math.max(6, y - 10), wrap.height - box.offsetHeight - 6) + 'px';

  box.querySelectorAll('[data-pid]').forEach(b => {
    b.onclick = () => this.pick(b.dataset.pid, b.dataset.ptab);
  });
  const mv = box.querySelector('[data-move]');
  if (mv) mv.onclick = () => {
    const path = TW.Rules.path(mover, this._pickHex[0], this._pickHex[1]);
    if (path && path.length){
      mover.order = { type:'move', path };
      TW.log('c-roc', mover.name + ' 前往 ' +
        TW.hexName(TW.hexAt(this._pickHex[0], this._pickHex[1])) + ' 與友軍會合。');
    } else {
      TW.log('c-warn', mover.name + ' 無法前往該處（可能已經有兩支部隊，或沒有路）。');
    }
    this.hideStackPick();
    this.refresh();
  };
},

hideStackPick(){ document.getElementById('stackpick').classList.add('hidden'); },

/* --------------------------------------------------------------------------
   滑鼠停留資訊
   -------------------------------------------------------------------------- */
showHexInfo(c, r){
  const box = document.getElementById('hexinfo');
  const h = TW.hexAt(c, r);
  if (!h){ box.classList.add('hidden'); return; }
  box.classList.remove('hidden');

  const us = TW.unitsAt(c, r).filter(u => u.side === 'ROC' || h.seen);
  const fs = TW.navyAt(c, r).filter(f => (f.side === 'ROC' || h.seen) && !TW.fleetHidden(f, 'ROC'));
  const S = TW.S;

  box.innerHTML =
    '<h4>' + TW.hexName(h) + '</h4>' +
    row('地形', h.T.name + '（移動 ' + (h.T.move > 90 ? '—' : h.T.move) + '　防禦 ×' +
        TW.hexDef(h).toFixed(2) + '）') +
    row('歸屬', h.owner === 'ROC' ? '我方' : (h.owner === 'PLA' ? '共軍' : '公海')) +
    (h.river ? row('河川', h.riverName + '　守方防禦 ×' + TW.B.RIVER_DEF +
        '，渡河部隊要多付機動力') : '') +
    (TW.roadsAt(c, r).length ? row('道路', TW.roadsAt(c, r).map(hw => hw.name).join('、') +
        (h.obstacle > 0 ? '　<span style="color:#e05a50">已炸斷（剩 ' + h.obstacle + ' 回合修復）</span>'
                        : '　沿路每格只花 ' + Math.min(...TW.roadsAt(c, r).map(x => x.cost)) + ' 機動力')) : '') +
    (h.beach ? row('灘岸', h.beach.name + '（難度 ' + h.beach.diff + '）') : '') +
    (h.place ? row('設施', h.place.type.map(t => ({city:'都市',port:'商港',navalbase:'軍港',
        airbase:'空軍基地',airport:'民航機場',capital:'首都',power:'發電廠'}[t] || t)).join('、') +
        '　可用 ' + Math.round((1 - h.damage) * 100) + '%') : '') +
    (h.place && h.place.mw ? row('裝置容量', '約佔全國 ' + h.place.mw + '%') : '') +
    (h.mines > 0 ? row('水雷', h.mines.toFixed(2) + (h.plaKnows ? '　（共軍已知）' : '　（共軍未察覺）')) : '') +
    row('補給', '我 ' + Math.round(h.sup.ROC * 100) + '%　共 ' + Math.round(h.sup.PLA * 100) + '%') +
    row('空域', TW.ZONES.find(z => z.id === h.zone).name + '　制空 ' +
      (S.zoneAir[h.zone] >= 0 ? '+' : '') + Math.round(S.zoneAir[h.zone] * 100) + '%') +
    (us.length ? '<div style="margin-top:5px">' + us.map(u =>
      '<div style="color:' + (u.side === 'ROC' ? '#79b8f0' : '#ef8a85') + '">' + u.name +
      '　' + Math.round(u.hp) + '/' + Math.round(u.org) + '</div>').join('') + '</div>' : '') +
    (fs.length ? '<div style="margin-top:5px">' + fs.map(f =>
      '<div style="color:' + (f.side === 'ROC' ? '#79b8f0' : '#ef8a85') + '">' + f.name +
      '　' + Math.round(f.hp) + '</div>').join('') + '</div>' : '');

  function row(k, v){ return '<div class="row"><span>' + k + '</span><b>' + v + '</b></div>'; }
},

/* --------------------------------------------------------------------------
   存檔 / 讀檔
   -------------------------------------------------------------------------- */
openSaveMenu(){
  const box = document.getElementById('modalbox');
  const rows = TW.SAVE_SLOTS.map(slot => {
    const info = TW.saveInfo(slot);
    const nm = slot === 'auto' ? '自動存檔' : ('存檔欄位 ' + slot);
    const desc = info
      ? ('第 ' + info.turn + ' / ' + (info.maxTurns || '?') + ' 回合　D+' + info.day +
         '　<span class="chip">' + (info.months ? info.months + ' 個月戰役' : '舊版存檔') + '</span><br>' +
         '戰爭意志 ' + info.will + '　國際支持 ' + info.intl +
         '　共軍上陸 ' + (info.landed !== undefined ? info.landed : '?') + ' 旅<br>' +
         '<span style="color:#5f6d7c">' + new Date(info.ts).toLocaleString('zh-TW') + '</span>')
      : '<span style="color:#5f6d7c">（空）</span>';
    return '<div class="item' + (info ? ' cando' : '') + '">' +
      '<div class="t">' + nm + '</div>' +
      '<div class="d">' + desc + '</div>' +
      '<div style="margin-top:6px;display:flex;gap:5px">' +
      (slot === 'auto' ? '' : '<button data-sv="' + slot + '">存檔</button>') +
      '<button data-ld="' + slot + '"' + (info ? '' : ' disabled') + '>讀取</button>' +
      '<button data-dl="' + slot + '"' + (info ? '' : ' disabled') + '>刪除</button>' +
      '</div></div>';
  }).join('');

  box.innerHTML = '<h2>存檔 / 讀檔</h2><div class="sub">SAVE &amp; LOAD</div>' +
    '<p style="font-size:12px;color:#7c8b9c">存檔放在這台電腦的瀏覽器裡（localStorage）。' +
    '換瀏覽器、清除瀏覽資料都會不見，重要的進度請多存幾個欄位。' +
    '每執行一個回合會自動覆寫「自動存檔」。</p>' +
    rows + '<div class="opts"><button data-close="1">關閉</button></div>';

  document.getElementById('modal').classList.remove('hidden');
  this.modalOpen = true;

  const done = msg => {
    document.getElementById('modal').classList.add('hidden');
    this.modalOpen = false;
    if (msg) TW.log('c-ok', msg);
    this.refresh();
    setTimeout(() => this.flushModal(), 60);
  };

  box.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => {
    const r = TW.saveGame(b.dataset.sv);
    if (!r.ok){ alert(r.msg); return; }
    this.openSaveMenu();
    TW.log('c-ok', '已存入欄位 ' + b.dataset.sv + '。');
  });
  box.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => {
    TW.deleteSave(b.dataset.dl); this.openSaveMenu();
  });
  box.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => {
    const r = TW.loadGame(b.dataset.ld);
    if (!r.ok){ alert(r.msg); return; }
    document.getElementById('log').innerHTML = '';
    TW.S.log.forEach(l => this.appendLog(l.cls, l.text, l.stamp));
    TW.Map.fit();
    done('讀取完成：回到第 ' + TW.S.turn + ' 回合。');
  });
  box.querySelector('[data-close]').onclick = () => done(null);
},

/* --------------------------------------------------------------------------
   彈窗
   -------------------------------------------------------------------------- */
modal(cfg){ this.modalQueue.push(cfg); },

flushModal(){
  if (this.modalOpen || !this.modalQueue.length) return;
  const cfg = this.modalQueue.shift();
  this.modalOpen = true;

  const box = document.getElementById('modalbox');
  box.innerHTML = '<h2>' + cfg.title + '</h2><div class="sub">' + (cfg.sub || '') + '</div>' +
    cfg.text.split('\n').map(t => '<p>' + (t || '&nbsp;') + '</p>').join('') +
    '<div class="opts">' + cfg.opts.map((o, i) =>
      '<button data-o="' + i + '"' + (o.disabled ? ' disabled style="opacity:.4"' : '') + '>' +
      o.label + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</button>').join('') + '</div>';

  document.getElementById('modal').classList.remove('hidden');
  box.querySelectorAll('[data-o]').forEach(b => {
    b.onclick = () => {
      const o = cfg.opts[+b.dataset.o];
      if (o.disabled) return;
      o.eff();
      document.getElementById('modal').classList.add('hidden');
      this.modalOpen = false;
      this.refresh();
      setTimeout(() => this.flushModal(), 60);
    };
  });
},

/* --------------------------------------------------------------------------
   戰報
   -------------------------------------------------------------------------- */
appendLog(cls, text, stamp){
  const box = document.getElementById('log');
  const d = document.createElement('div');
  d.className = cls || '';
  d.innerHTML = '<span class="t">' + stamp + '</span>' + text;
  box.appendChild(d);
  while (box.children.length > 300) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

};

/* 把 mod 物件轉成人看得懂的字串 */
function modText(mod){
  if (!mod) return '';
  const nm = { hard:'對硬目標', soft:'對軟目標', armor:'裝甲', pierce:'穿甲', aa:'防空',
    abm:'反飛彈', ashm:'反艦', strike:'縱深打擊', recon:'偵蒐', move:'機動', mine:'佈雷',
    seamine:'水雷', sead:'壓制防空', c4isr:'指管', ew:'電戰', air:'空戰', supply:'補給',
    ic:'工業', pp:'政治點', will:'戰爭意志', intl:'國際支持', plaWill:'共軍意志',
    beachDefense:'灘岸防禦', urbanDefense:'城鎮防禦', depthDefense:'縱深防禦',
    reserveRate:'後備動員', sortieRate:'出動率', supplyRange:'補給距離',
    aidChance:'軍援機率', aidDelivery:'軍援時程', abmIntercept:'攔截率',
    airfieldRepair:'跑道搶修', mineDamage:'水雷威力', enemyAccuracy:'敵方精度',
    ammo:'彈藥', reserveOrg:'後備素質', intlPerTurn:'每回合國際支持', missileAirfield:'機場受損',
    missileUnit:'部隊受損', newSub:'新造潛艦',
    powerResist:'電網韌性', willGuard:'民心承受', counterInfil:'反滲透',
    manpower:'可動員人力',
    def:'防護', cas:'密接支援', range:'射程', lift:'載運', asw:'反潛' };
  return Object.keys(mod).map(k =>
    '<span class="chip">' + (nm[k] || k) + ' ' + (mod[k] > 0 ? '+' : '') +
    (Math.abs(mod[k]) < 1 && mod[k] !== 0 ? Math.round(mod[k] * 100) + '%' : mod[k]) + '</span>').join('');
}

function orderName(o){
  return { move:'移動中', attack:'攻擊', hold:'固守' }[o.type] || o.type;
}
