/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   戰場環境與後勤：天候、海象、日夜、彈藥存量
   --------------------------------------------------------------------------
   這一層處理的是「不由任何一方決定、但決定雙方能做什麼」的東西。

   ・海象：海況四級以上，兩棲載具根本無法作業。台灣海峽一年只有
     春末與秋初兩個較長的窗口，這是登陸時機最硬的限制。
   ・能見度：低雲、鋒面、霧會讓空中支援與精準彈藥失效。
   ・日夜：一回合 12 小時，0600 與 1800 交替。夜間出動架次下降，
     但滲透與奇襲比較容易。
   ・彈藥：全國戰備彈藥是有限的。砲兵打得越兇，撐得越短。
     這是台灣防衛作戰最常被討論、卻最少出現在遊戲裡的限制。
   ========================================================================== */

TW.Env = {

/* --------------------------------------------------------------------------
   海況表（蒲福風級／道格拉斯海況的簡化）
   -------------------------------------------------------------------------- */
SEA: [
  { lv:0, name:'無浪',   wave:'< 0.1 m' },
  { lv:1, name:'微浪',   wave:'0.1–0.5 m' },
  { lv:2, name:'小浪',   wave:'0.5–1.25 m' },
  { lv:3, name:'輕浪',   wave:'1.25–2.5 m' },
  { lv:4, name:'中浪',   wave:'2.5–4 m' },
  { lv:5, name:'大浪',   wave:'4–6 m' },
  { lv:6, name:'巨浪',   wave:'> 6 m' }
],
VIS: [
  { lv:0, name:'惡劣', desc:'低雲、濃霧或強降雨' },
  { lv:1, name:'不良', desc:'雲幕低，目視受限' },
  { lv:2, name:'普通', desc:'一般天候' },
  { lv:3, name:'良好', desc:'晴，能見度佳' }
],

/* --------------------------------------------------------------------------
   每回合的天候演變
     海象有慣性：不會今天巨浪明天無浪，所以用「往鄰近等級移動」的方式演變。
   -------------------------------------------------------------------------- */
roll(){
  const S = TW.S;
  if (!S.wx) S.wx = { sea:2, vis:2 };

  S.wx.sea = this.stepSea(S.wx.sea);
  S.wx.vis = this.stepVis(S.wx.vis);

  /* 颱風事件會直接把海況壓到最高 */
  if (S.weather && S.weather.noLanding) S.wx.sea = 6;

  /* 給玩家一個兩回合的預報——現實中你當然有氣象中心。
     預報只是推估，不保證準。 */
  S.wxForecast = [];
  let sea = S.wx.sea;
  for (let i = 0; i < 2; i++){ sea = this.stepSea(sea); S.wxForecast.push(sea); }
},

/* 海況用「往平均值回歸 + 雜訊」演變。
   純隨機漫步會卡在 0 或 6 不動，那不像天氣，像壞掉的溫度計。
   台灣海峽終年風浪不小，平均落在 2–3 級，偶爾有鋒面過境。 */
stepSea(cur){
  if (Math.random() > TW.B.WEATHER_CHANGE) return cur;
  const pull  = (TW.B.SEA_MEAN - cur) * 0.45;
  const noise = (Math.random() * 2 - 1) * 1.7;
  let v = Math.round(cur + pull + noise);
  if (Math.random() < TW.B.FRONT_CHANCE) v += 2 + Math.floor(Math.random() * 2);  // 鋒面／低壓
  return TW.clamp(v, 0, 6);
},

stepVis(cur){
  if (Math.random() > TW.B.WEATHER_CHANGE * 1.3) return cur;
  const pull  = (2 - cur) * 0.5;
  const noise = (Math.random() * 2 - 1) * 1.3;
  return TW.clamp(Math.round(cur + pull + noise), 0, 3);
},

/* --------------------------------------------------------------------------
   日夜
   -------------------------------------------------------------------------- */
isNight(){ const h = TW.S.hour; return (h >= 18 || h < 6); },

/* --------------------------------------------------------------------------
   各種效果係數
   -------------------------------------------------------------------------- */

/* 空中出動：夜間與低能見度都會壓低架次 */
airFactor(){
  const S = TW.S;
  let f = 1;
  if (this.isNight()) f *= TW.B.NIGHT_SORTIE;
  f *= [0.55, 0.78, 1.0, 1.08][(S.wx && S.wx.vis) || 2];
  return f;
},

/* 密接支援：夜間分辨敵我更難，效果再打折 */
casFactor(){
  return this.airFactor() * (this.isNight() ? TW.B.NIGHT_CAS : 1);
},

/* 海上作戰：浪大的時候小艇根本出不去，大艦也打不準 */
seaFactor(){
  const sea = (TW.S.wx && TW.S.wx.sea) || 2;
  return [1.05, 1.02, 1.0, 0.92, 0.78, 0.6, 0.45][sea];
},

/* 兩棲作業能不能進行 */
canLand(){
  const S = TW.S;
  if (S.weather && S.weather.noLanding) return false;
  return ((S.wx && S.wx.sea) || 2) < TW.B.SEA_STATE_BLOCK;
},

/* 登陸損失的天候修正：浪越大，舟波翻覆與失散越多 */
/* 海象好的時候共軍會加倍傾注——他們也在等這個窗口。
   所以天候不是單純削弱共軍，而是把登陸壓縮成「幾波猛攻＋幾天空白」。 */
liftSurge(){
  const sea = (TW.S.wx && TW.S.wx.sea) || 2;
  return 1 + Math.max(0, TW.B.SEA_STATE_BLOCK - 1 - sea) * TW.B.LIFT_SURGE;
},

landingSeaPenalty(){
  const sea = (TW.S.wx && TW.S.wx.sea) || 2;
  return 1 + Math.max(0, sea - 1) * 0.14;
},

/* --------------------------------------------------------------------------
   彈藥存量
     ammoFactor() 是所有火力的共同乘數。彈藥見底時，
     砲兵、空軍、岸置反艦飛彈會一起變弱——這正是現實中最怕的狀況。
   -------------------------------------------------------------------------- */
ammoFactor(){
  const a = TW.S.ammo;
  if (a >= TW.B.AMMO_LOW) return 1;
  if (a <= 0) return 0.30;
  if (a <= TW.B.AMMO_CRITICAL)
    return 0.30 + 0.25 * (a / TW.B.AMMO_CRITICAL);
  return 0.55 + 0.45 * ((a - TW.B.AMMO_CRITICAL) / (TW.B.AMMO_LOW - TW.B.AMMO_CRITICAL));
},

/* 補進全國戰備彈藥，回傳實際補到多少（滿了就溢出） */
refill(n){
  const S = TW.S;
  const before = S.ammo;
  S.ammo = Math.min(S.ammoMax, S.ammo + n);
  S.ammoWarn = S.ammo < TW.B.AMMO_CRITICAL ? 2 : (S.ammo < TW.B.AMMO_LOW ? 1 : 0);
  return S.ammo - before;
},

spend(n){
  const S = TW.S;
  S.ammo = Math.max(0, S.ammo - n);
  S.ammoSpent = (S.ammoSpent || 0) + n;
},

/* 每回合的補充：工業產能轉成彈藥 */
resupply(ev){
  const S = TW.S;
  const gain = S.ic * TW.B.AMMO_PER_IC * (1 + S.mod.ammo);
  S.ammo = Math.min(S.ammoMax, S.ammo + gain);
  S.ammoGain = gain;

  /* 見底的時候要講清楚，不要讓玩家莫名其妙覺得部隊變弱了。
     用一個閂鎖記住上次講到哪一級，才不會每回合重複洗版。 */
  const lv = S.ammo < TW.B.AMMO_CRITICAL ? 2 : (S.ammo < TW.B.AMMO_LOW ? 1 : 0);
  if (lv > (S.ammoWarn || 0)){
    ev.push({ t:'log', cls:'c-warn', txt: lv === 2
      ? '【後勤危機】戰備彈藥即將見底。停止不必要的火力任務，優先保住灘岸。'
      : '【後勤警告】全國戰備彈藥低於安全存量，砲兵、地面戰與岸置反艦飛彈的火力開始受限。' });
  } else if (lv < (S.ammoWarn || 0) && lv === 0){
    ev.push({ t:'log', cls:'c-ok', txt:'【後勤】戰備彈藥回補至安全存量，火力恢復正常。' });
  }
  S.ammoWarn = lv;

  /* 把這回合的消耗留下來給介面看，再歸零 */
  S.ammoLast = S.ammoSpent || 0;
  S.ammoSpent = 0;
},

/* --------------------------------------------------------------------------
   顯示用的文字
   -------------------------------------------------------------------------- */
label(){
  const S = TW.S;
  const sea = this.SEA[(S.wx && S.wx.sea) || 2];
  const vis = this.VIS[(S.wx && S.wx.vis) || 2];
  return (this.isNight() ? '夜間' : '日間') + '　海況 ' + sea.lv + ' ' + sea.name +
         '　能見度 ' + vis.name;
},

detail(){
  const S = TW.S;
  const sea = this.SEA[(S.wx && S.wx.sea) || 2];
  const vis = this.VIS[(S.wx && S.wx.vis) || 2];
  const fc = (S.wxForecast || []).map(x => this.SEA[x].lv).join(' → ');
  return {
    time: this.isNight() ? '夜間（1800–0600）' : '日間（0600–1800）',
    sea: '海況 ' + sea.lv + ' 級　' + sea.name + '（浪高 ' + sea.wave + '）',
    vis: '能見度 ' + vis.name + '　' + vis.desc,
    land: this.canLand() ? '兩棲作業：可行' : '兩棲作業：海象過惡，共軍無法搶灘',
    forecast: fc ? '未來兩回合海況預報：' + fc + ' 級' : '',
    airPct: Math.round(this.airFactor() * 100),
    seaPct: Math.round(this.seaFactor() * 100)
  };
}

};
