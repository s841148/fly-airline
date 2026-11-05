/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   新手教學
   --------------------------------------------------------------------------
   一步一步帶玩家點過一遍。每一步會：
     1. 在左下角顯示要做什麼
     2. 把該點的地方框起來（DOM 元素用外框，地圖格子用閃爍的圈）
     3. 等玩家真的做到了才進下一步（done 回傳 true 就過關）
   想加步驟就在 steps 陣列裡加一筆，不用動其他程式。
   ========================================================================== */

TW.Tutor = {

on:false, i:0, timer:null, celebrating:false,

/* --------------------------------------------------------------------------
   教學步驟
     title  標題
     text   說明（\n 會換行）
     hl     要框起來的畫面元素（CSS 選擇器）
     hex    要在地圖上圈出來的格子 [欄, 列]
     done   回傳 true 就算完成；沒寫的話就是按「知道了」手動過關
   -------------------------------------------------------------------------- */
steps: [
  { title:'歡迎來到戰情室',
    text:'你是國防部的作戰次長。共軍今天早上開始打飛彈了，你要指揮全國的部隊撐住。\n\n' +
         '這個教學會帶你點過一遍，大概三分鐘。隨時可以按右上角「跳過教學」。' },

  { title:'先認識畫面',
    text:'畫面分成四塊：\n' +
         '・最上面一排是國力（工業、政治點、戰爭意志、國際支持…）\n' +
         '・中間是地圖\n' +
         '・右邊是你下命令的地方\n' +
         '・最下面是戰報，每回合發生什麼都會寫在那裡' },

  { title:'選一支部隊',
    text:'地圖上藍色的小方塊就是我們的部隊，紅色的是共軍。\n\n' +
         '請點一下圈起來的那一格——那是北部的「裝甲第542旅」。',
    hex:[14, 5],
    done: S => { const u = S.units.find(x => x.id === S.sel); return u && u.kind === 'ground' && u.side === 'ROC'; } },

  { title:'看得懂部隊的三個數字',
    text:'右邊出現這支部隊的資料了。最重要的是三個數字：\n\n' +
         '・**兵力**＝還剩多少人和裝備。打完會慢慢補回來。\n' +
         '・**組織度**＝還有沒有辦法打仗。掉到很低會直接潰散後撤，比兵力更關鍵。\n' +
         '・**補給**＝有沒有彈藥和油。補給斷掉的部隊會自己餓死。',
    hl:'#tabbody' },

  { title:'下移動命令',
    text:'選好部隊之後，點地圖上另一格空地，部隊就會往那裡走。\n\n' +
         '現在請點這支部隊旁邊任何一格陸地試試看。（想取消就按 Esc）',
    done: S => { const u = S.units.find(x => x.id === S.sel); return u && u.order && u.order.type === 'move'; } },

  { title:'補給圖層：打不動的時候先看這個',
    text:'請點左上角的「補給」。\n\n' +
         '藍色越亮代表補給越好。如果你的部隊站在很暗的地方，代表補給線被切斷了——' +
         '那種部隊打不贏任何人，要趕快退回來。',
    hl:'.lyr[data-layer="supply"]',
    done: () => TW.Map.layer === 'supply' },

  { title:'再切回地形',
    text:'圖層隨時可以切。除了補給，還有「制空」「制海」「防空」「威脅」。\n\n' +
         '請點「地形」切回來。',
    hl:'.lyr[data-layer="terrain"]',
    done: () => TW.Map.layer === 'terrain' },

  { title:'砲兵可以隔很遠打',
    text:'請點圈起來的那一格，那是「砲兵第21指揮部」，配了海馬斯多管火箭。\n\n' +
         '選到之後看地圖——會出現一圈橘色的射程圈。點射程圈裡面的敵人，就是叫砲兵開火，' +
         '不用把部隊推到敵人旁邊。',
    hex:[15, 5],
    done: S => { const u = S.units.find(x => x.id === S.sel); return u && TW.canBombard(u); } },

  { title:'空軍：制空權決定地面打不打得贏',
    text:'請點右邊的「空軍」分頁。\n\n' +
         '每個聯隊都可以指定任務（制空、密接支援、反艦…）和作戰空域。\n' +
         '制空權是正的代表天空是我們的；變成負的，地面部隊會被壓著打。',
    hl:'.tab[data-tab="air"]',
    done: () => TW.UI.tab === 'air' },

  { title:'這一局真正的關鍵：國際支持度',
    text:'請點右邊的「外交軍售」分頁。\n\n' +
         '撐得越久、共軍死得越多、平民保護得越好 → 國際支持度就越高。\n' +
         '國際支持度決定美國願意賣你什麼武器：從刺針飛彈，一路到海馬斯、愛國者、F-16，' +
         '最後美軍會直接下場。\n\n' +
         '**這就是為什麼「撐住」比「打贏」重要。**',
    hl:'.tab[data-tab="dip"]',
    done: () => TW.UI.tab === 'dip' },

  { title:'執行回合',
    text:'命令都下好了，就按右上角的「執行回合」（或直接按空白鍵）。\n\n' +
         '一個回合是 12 小時，會依序算飛彈、空戰、海戰、登陸、砲兵、地面戰，然後播給你看。' +
         '覺得太慢可以把旁邊的播放速度改成「瞬間」。',
    hl:'#btn-end',
    done: S => S.turn > (TW.Tutor.turnAtStep || 1) },

  { title:'看戰報',
    text:'下面那一排就是這 12 小時發生的事。\n\n' +
         '紅字是壞消息，綠字是好消息，黃字要注意。看不懂沒關係，先看有沒有「失守」兩個字。',
    hl:'#logbar' },

  { title:'記得存檔',
    text:'右上角有「存檔」。有四個欄位，其中一個是自動存檔——每執行完一回合會自動存一次，' +
         '所以就算不小心關掉也不會全部重來。\n\n' +
         '打到重要關頭建議自己手動存一份。',
    hl:'#btn-save' },

  { title:'最後三句話',
    text:'**一、灘頭是唯一的機會。**\n共軍上岸的第一個回合最虛弱，那時候反擊最划算。\n\n' +
         '**二、東部港口不能丟。**\n花蓮、台東、蘇澳是軍援唯一的入口。丟了就等不到美國的東西。\n\n' +
         '**三、撐時間就是在贏。**\n你不需要打贏第一天，你只需要讓共軍贏不了第三十天。\n\n' +
         '祝好運，次長。' }
],

/* -------------------------------------------------------------------------- */
start(){
  this.on = true;
  this.i = 0;
  this.celebrating = false;
  TW.S.flags.hints = true;          // 教學模式順便打開情境提示
  document.getElementById('tutor').classList.remove('hidden');
  this.render();
  if (this.timer) clearInterval(this.timer);
  this.timer = setInterval(() => this.tick(), 300);
},

stop(){
  this.on = false;
  if (this.timer){ clearInterval(this.timer); this.timer = null; }
  document.getElementById('tutor').classList.add('hidden');
  this.clearHl();
  TW.Map.focusHex = null;
},

next(){
  this.celebrating = false;
  this.i++;
  if (this.i >= this.steps.length){ this.finish(); return; }
  this.render();
},

finish(){
  this.stop();
  TW.UI.modal({
    title:'教學完成',
    sub:'TUTORIAL COMPLETE',
    text:'接下來就是你的戰爭了。\n\n' +
         '遇到不懂的東西，畫面上會自動跳出小提示。\n' +
         '想再看一次教學，按右上角的「？」。',
    opts:[{ label:'開始作戰', hint:'', eff:()=>{} }]
  });
  TW.UI.flushModal();
},

/* -------------------------------------------------------------------------- */
render(){
  const s = this.steps[this.i];
  const box = document.getElementById('tutor');

  box.innerHTML =
    '<div class="tt-head">' +
      '<span class="tt-n">教學　' + (this.i + 1) + ' / ' + this.steps.length + '</span>' +
      '<button class="tt-skip">跳過教學</button>' +
    '</div>' +
    '<div class="tt-title">' + s.title + '</div>' +
    '<div class="tt-text">' + fmt(s.text) + '</div>' +
    '<div class="tt-foot">' +
      (s.done ? '<span class="tt-wait">▸ 做完上面那件事就會自動繼續</span>'
              : '<button class="tt-next">知道了，下一步</button>') +
      (this.i > 0 ? '<button class="tt-back">上一步</button>' : '') +
    '</div>';

  box.querySelector('.tt-skip').onclick = () => this.stop();
  const nb = box.querySelector('.tt-next');
  if (nb) nb.onclick = () => this.next();
  const bb = box.querySelector('.tt-back');
  if (bb) bb.onclick = () => { this.i = Math.max(0, this.i - 2); this.next(); };

  /* 記錄進這一步時的回合數，給「執行回合」那一步比對用 */
  this.turnAtStep = TW.S.turn;

  this.clearHl();
  if (s.hl){
    const el = document.querySelector(s.hl);
    if (el) el.classList.add('tutor-hl');
  }
  TW.Map.focusHex = s.hex || null;
  if (s.hex) TW.Map.focusOn(s.hex[0], s.hex[1], 1.25);

  function fmt(t){
    return t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split('\n')
            .map(l => l ? '<p>' + l + '</p>' : '<p class="sp"></p>').join('');
  }
},

clearHl(){
  document.querySelectorAll('.tutor-hl').forEach(e => e.classList.remove('tutor-hl'));
},

/* 每 0.3 秒檢查一次有沒有完成 */
tick(){
  if (!this.on || this.celebrating) return;
  const box = document.getElementById('tutor');

  /* 演算中或有彈窗的時候，教學面板讓開 */
  const blocked = TW.busy || !document.getElementById('modal').classList.contains('hidden');
  box.classList.toggle('tt-dim', blocked);
  if (blocked) return;

  const s = this.steps[this.i];
  if (!s.done) return;

  let ok = false;
  try { ok = !!s.done(TW.S); } catch (e){ ok = false; }
  if (!ok) return;

  /* 過關：閃一下再進下一步 */
  this.celebrating = true;
  this.clearHl();
  TW.Map.focusHex = null;
  const foot = box.querySelector('.tt-foot');
  if (foot) foot.innerHTML = '<span class="tt-ok">✓ 做到了</span>';
  setTimeout(() => { if (this.on) this.next(); }, 850);
}

};

/* ==========================================================================
   情境提示：第一次遇到某件事的時候跳出來解釋一次
   （只有在新手模式下會出現，同一場戰役每個提示只跳一次）
   ========================================================================== */
TW.hint = function(id, title, text){
  const S = TW.S;
  if (!S || !S.flags || !S.flags.hints) return;
  S.hintsShown = S.hintsShown || [];
  if (S.hintsShown.indexOf(id) >= 0) return;
  S.hintsShown.push(id);
  TW.UI.modal({
    title: '提示：' + title,
    sub: 'HINT · 新手提示',
    text: text + '\n\n（想關掉這類提示，按右上角「？」→ 關閉新手提示）',
    opts:[{ label:'知道了', hint:'', eff:()=>{} }]
  });
};
