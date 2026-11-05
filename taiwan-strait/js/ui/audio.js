/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   音效與背景音樂
   --------------------------------------------------------------------------
   要加自己的音樂或音效，只要做兩件事：

     1. 把檔案丟進 assets/bgm/ 或 assets/sfx/
     2. 在下面的 TW.Audio.FILES 裡把檔名填進去

   找不到的檔案會被自動略過，不會讓遊戲壞掉，所以你可以一次只加一兩個。

   支援格式：.mp3 最保險（所有瀏覽器都能播），.ogg 檔案小但 Safari 不支援，
   .wav 沒壓縮、檔案很大，短音效才適合。

   注意：瀏覽器規定「使用者還沒點過畫面之前不准自動播放聲音」，
   所以背景音樂會等你第一次點畫面（或按下執行回合）才開始。這是瀏覽器的
   規則，不是程式有問題。
   ========================================================================== */

TW.Audio = {

  /* ------------------------------------------------------------------
     ★ 要換音樂就改這裡 ★
     值可以是「一個檔名」或「一個陣列」。
     **陣列 = 播放清單**：會依序輪播，一首播完自動接下一首，
     整輪播完再從頭開始（順序每輪會重洗）。
     設成 null 或空陣列就是不播。

     例如：
       calm: ['calm1.mp3', 'calm2.mp3', 'calm3.mp3'],
     ------------------------------------------------------------------ */
  FILES: {
    /* --- 背景音樂：放在 assets/bgm/ --- */
    bgm: {
      menu:   'menu.mp3',
      calm:   ['calm.mp3', 'calm2.mp3', 'calm3.mp3', 'calm4.mp3', 'calm5.mp3', 'calm6.mp3', 'calm7.mp3'],
      battle: ['battle.mp3', 'battle2.mp3', 'battle3.mp3', 'battle4.mp3', 'battle5.mp3', 'battle6.mp3', 'battle7.mp3'],
      crisis: 'crisis.mp3',
      win:    'win.mp3',
      lose:   'lose.mp3'
    },

    /* --- 音效：放在 assets/sfx/ ---
       現在放的是程式產生的佔位音（.wav），只是為了讓你確認音效有接通。
       換成你自己的檔案時，把檔名改掉就好，例如 boom:'我的爆炸聲.mp3'。 */
    sfx: {
      click:   'click.wav',      // 點按鈕、選部隊
      missile: 'missile.wav',    // 飛彈來襲
      boom:    'boom.wav',       // 爆炸、部隊被殲滅
      battle:  'battle_hit.wav', // 地面接戰
      naval:   'naval.wav',      // 海上交戰、反艦飛彈
      sink:    'sink.wav',       // 艦艇被擊沉
      land:    'land.wav',       // 共軍搶灘
      mine:    'mine.wav',       // 布雷、觸雷
      air:     'air.wav',        // 空戰
      strike:  'strike.wav',     // 遠程打擊
      alert:   'alert.wav',      // 警告訊息（後勤、電力、失守）
      aid:     'aid.wav'         // 軍援抵達
    }
  },

  /* 音量預設值（0～1），玩家可以在介面上調 */
  bgmVol: 0.35,
  sfxVol: 0.60,
  muted: false,

  _bgm: null,          // 目前正在播的 <audio>
  _bgmKey: '',         // 目前播的是哪一首
  _cache: {},          // 音效預載
  _missing: {},        // 找不到的檔案，記下來就不再重試
  _tried: {},          // 已經試過載入的檔案
  _ok: {},             // 確認可以播的檔案
  _ready: false,       // 使用者是否已經互動過（瀏覽器的自動播放限制）
  _fadeTimer: null,
  _queue: {},          // 每個情境的播放順序
  _qi: {},             // 播到第幾首

  /* ==================================================================
     初始化：在 main.js 啟動時呼叫一次
     ================================================================== */
  init(){
    /* 讀回上次的音量設定 */
    try {
      const v = JSON.parse(localStorage.getItem('tw_audio') || '{}');
      if (typeof v.bgm === 'number') this.bgmVol = v.bgm;
      if (typeof v.sfx === 'number') this.sfxVol = v.sfx;
      if (typeof v.muted === 'boolean') this.muted = v.muted;
    } catch (e) {}

    /* 瀏覽器不准「使用者還沒動作就播聲音」，所以等第一次互動 */
    const unlock = () => {
      if (this._ready) return;
      this._ready = true;
      this.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    this.buildUI();
  },

  save(){
    try {
      localStorage.setItem('tw_audio', JSON.stringify(
        { bgm:this.bgmVol, sfx:this.sfxVol, muted:this.muted }));
    } catch (e) {}
  },

  /* 檔名 → 完整路徑 */
  path(kind, name){
    return 'assets/' + (kind === 'bgm' ? 'bgm/' : 'sfx/') + name;
  },

  /* 從設定裡挑一個檔名出來。
     音效＝隨機挑一個（同一種爆炸聲有變化比較不膩）；
     背景音樂＝照播放清單依序取下一首。 */
  pick(kind, key){
    const v = (this.FILES[kind] || {})[key];
    if (!v) return null;
    if (!Array.isArray(v)) return v;
    if (!v.length) return null;
    if (kind === 'sfx') return v[Math.floor(Math.random() * v.length)];
    return this.nextInQueue(key, v);
  },

  /* 播放清單：整輪播完才重洗，避免同一首連續重複 */
  nextInQueue(key, list){
    const k = key + '|' + list.length;
    if (!this._queue[k] || this._qi[k] >= this._queue[k].length){
      const q = list.slice();
      for (let i = q.length - 1; i > 0; i--){        // 洗牌
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
      /* 新的一輪不要以上一輪的最後一首開頭 */
      if (this._queue[k] && q.length > 1 &&
          q[0] === this._queue[k][this._queue[k].length - 1]){
        [q[0], q[1]] = [q[1], q[0]];
      }
      this._queue[k] = q;
      this._qi[k] = 0;
    }
    return this._queue[k][this._qi[k]++];
  },

  /* ==================================================================
     音效
     ================================================================== */
  play(key, vol){
    if (this.muted || !this._ready) return;
    const name = this.pick('sfx', key);
    if (!name) return;
    const url = this.path('sfx', name);
    if (this._missing[url]) return;

    /* 同一個音效可能同時響好幾次，所以每次都複製一份來播 */
    let base = this._cache[url];
    if (!base){
      base = new Audio(url);
      base.preload = 'auto';
      base.addEventListener('error', () => { this._missing[url] = true; });
      this._cache[url] = base;
    }
    const a = base.cloneNode();
    a.volume = Math.max(0, Math.min(1, this.sfxVol * (vol === undefined ? 1 : vol)));
    const p = a.play();
    if (p && p.catch) p.catch(() => {});     // 播不出來就算了，不要吵
  },

  /* 回合演算時，把事件對應到音效 */
  onEvent(e){
    if (!e || !e.t) return;
    const map = {
      missile:'missile', strike:'strike', boom:'boom', battle:'battle',
      naval:'naval', sink:'sink', land:'land', mine:'mine', air:'air', transport:'air'
    };
    if (map[e.t]) { this.play(map[e.t]); return; }
    if (e.t === 'aid') { this.play('aid'); return; }
    if (e.t === 'log' && e.cls === 'c-warn') this.play('alert', 0.7);
  },

  /* ==================================================================
     背景音樂
     ================================================================== */
  playBgm(key, opts, force){
    /* 同一個情境而且還在播 → 不動它（除非是上一首放完要接下一首） */
    if (!force && this._bgmKey === key && this._bgm && !this._bgm.paused) return;
    const name = this.pick('bgm', key);
    if (!name){ this.stopBgm(); return; }
    const url = this.path('bgm', name);
    if (this._missing[url]) return;

    /* 同一個檔案只嘗試載入一次。沒放的曲子會 404，但只會 404 一次，
       不會每回合在主控台洗版。 */
    if (this._tried[url] && !this._ok[url]){ this._missing[url] = true; return; }
    this._tried[url] = true;

    this._bgmKey = key;
    const raw = (this.FILES.bgm || {})[key];
    const isList = Array.isArray(raw) && raw.length > 1;
    const noLoop = (opts && opts.loop === false);

    const start = () => {
      const a = new Audio(url);
      /* 有播放清單就不要 loop——要讓它播完，才接得到下一首 */
      a.loop = !isList && !noLoop;
      a.volume = 0;
      a.addEventListener('error', () => {
        this._missing[url] = true;
        if (this._bgm === a){ this._bgm = null; this._bgmKey = ''; }
      });
      a.addEventListener('canplay', () => { this._ok[url] = true; }, { once:true });
      /* 一首放完，接同一個情境的下一首 */
      if (isList){
        a.addEventListener('ended', () => {
          if (this._bgm !== a) return;          // 中途已經換過曲了
          this.playBgm(key, opts, true);
        }, { once:true });
      }
      this._bgm = a;
      if (!this.muted && this._ready){
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      }
      this.fadeTo(this.muted ? 0 : this.bgmVol, 900);
    };

    if (this._bgm) this.fadeOut(600, start);
    else start();
  },

  stopBgm(){
    if (!this._bgm) return;
    this.fadeOut(500, () => { this._bgm = null; this._bgmKey = ''; });
  },

  fadeTo(target, ms){
    const a = this._bgm;
    if (!a) return;
    clearInterval(this._fadeTimer);
    const step = 40, from = a.volume, n = Math.max(1, Math.round(ms / step));
    let i = 0;
    this._fadeTimer = setInterval(() => {
      i++;
      a.volume = Math.max(0, Math.min(1, from + (target - from) * (i / n)));
      if (i >= n) clearInterval(this._fadeTimer);
    }, step);
  },

  fadeOut(ms, done){
    const a = this._bgm;
    if (!a){ if (done) done(); return; }
    clearInterval(this._fadeTimer);
    const step = 40, from = a.volume, n = Math.max(1, Math.round(ms / step));
    let i = 0;
    this._fadeTimer = setInterval(() => {
      i++;
      a.volume = Math.max(0, from * (1 - i / n));
      if (i >= n){
        clearInterval(this._fadeTimer);
        try { a.pause(); } catch (e) {}
        if (done) done();
      }
    }, step);
  },

  /* 依戰況自動換曲。每回合結束時呼叫一次。 */
  updateBgm(){
    const S = TW.S;
    if (!S) return;
    if (S.over){ this.playBgm(S.over === 'ROC' ? 'win' : 'lose', { loop:false }); return; }

    const landed = S.units.filter(u => !u.dead && u.side === 'PLA' &&
      !TW.hexAt(u.c, u.r).T.prc).length;
    const taipei = TW.PLACES.find(p => p.type.includes('capital'));
    const taipeiRisk = taipei && TW.Hex.neighbors(taipei.c, taipei.r)
      .some(([c, r]) => TW.unitsAt(c, r).some(u => u.side === 'PLA'));

    if (S.will < 35 || taipeiRisk) this.playBgm('crisis');
    else if (landed > 0)           this.playBgm('battle');
    else                           this.playBgm('calm');
  },

  resume(){
    if (this.muted) return;
    if (this._bgm && this._bgm.paused){
      const p = this._bgm.play();
      if (p && p.catch) p.catch(() => {});
      this.fadeTo(this.bgmVol, 500);
    } else if (!this._bgm){
      this.updateBgm();
    }
  },

  setMuted(v){
    this.muted = v;
    if (v) this.fadeTo(0, 250);
    else { this.resume(); this.fadeTo(this.bgmVol, 400); }
    this.save();
  },

  /* ==================================================================
     介面：右上角的音量控制
     ================================================================== */
  buildUI(){
    if (document.getElementById('audio-ctl')) return;
    /* 放進頂欄右邊的控制區，擠在「播放速度」旁邊 */
    const host = document.querySelector('#topbar .ctrl') ||
                 document.getElementById('topbar') || document.body;
    const box = document.createElement('div');
    box.id = 'audio-ctl';
    box.innerHTML =
      '<button id="au-mute" title="靜音">' + (this.muted ? '🔇' : '🔊') + '</button>' +
      '<label title="背景音樂音量">樂<input id="au-bgm" type="range" min="0" max="100"></label>' +
      '<label title="音效音量">效<input id="au-sfx" type="range" min="0" max="100"></label>';
    const anchor = host.querySelector('.spd');
    if (anchor && anchor.nextSibling) host.insertBefore(box, anchor.nextSibling);
    else host.appendChild(box);

    const bgm = box.querySelector('#au-bgm');
    const sfx = box.querySelector('#au-sfx');
    bgm.value = Math.round(this.bgmVol * 100);
    sfx.value = Math.round(this.sfxVol * 100);

    bgm.oninput = () => {
      this.bgmVol = bgm.value / 100;
      if (this._bgm && !this.muted) this._bgm.volume = this.bgmVol;
      this.save();
    };
    sfx.oninput = () => { this.sfxVol = sfx.value / 100; this.save(); };
    sfx.onchange = () => this.play('click');

    box.querySelector('#au-mute').onclick = (ev) => {
      this.setMuted(!this.muted);
      ev.currentTarget.textContent = this.muted ? '🔇' : '🔊';
    };
  }
};
