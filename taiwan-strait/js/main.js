/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   進入點：開局、回合執行、戰鬥動畫播放
   ========================================================================== */

TW.busy = false;
TW.skip = false;

window.addEventListener('DOMContentLoaded', () => {

  TW.newGame();               // 先建一場，UI 才有東西可以畫
  TW.Map.init();
  TW.UI.init();
  TW.UI.refresh();

  document.getElementById('btn-end').onclick = () => runTurn();
  document.getElementById('btn-save').onclick = () => TW.UI.openSaveMenu();
  document.getElementById('btn-help').onclick = () => {
    const on = !!(TW.S.flags && TW.S.flags.hints);
    TW.UI.modal({
      title:'教學與提示',
      sub:'HELP',
      text:'目前新手提示：' + (on ? '開啟' : '關閉') + '\n\n' +
           '教學會從頭帶你點一次；新手提示則是在第一次遇到某種狀況時（共軍上陸、' +
           '部隊斷補、軍援到貨…）跳出來解釋一次。',
      opts:[
        { label:'重看新手教學', hint:'約三分鐘', eff:() => setTimeout(() => TW.Tutor.start(), 200) },
        { label:(on ? '關閉' : '開啟') + '新手提示', hint:'',
          eff:() => { TW.S.flags.hints = !on; } },
        { label:'換戰役長度或難度重來', hint:'目前進度會消失（記得先存檔）',
          eff:() => setTimeout(chooseLength, 200) },
        { label:'關閉這個視窗', hint:'', eff:()=>{} }
      ]
    });
    TW.UI.flushModal();
  };
  document.getElementById('pb-skip').onclick = () => { TW.skip = true; };

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !TW.busy){ e.preventDefault(); runTurn(); }
    if (e.code === 'Escape'){
      TW.S.sel = null; TW.UI.airliftMode = false;
      TW.UI.hideStackPick(); TW.UI.refresh();
    }
    if (e.code === 'F5' && e.ctrlKey){ e.preventDefault(); TW.UI.openSaveMenu(); }
  });

  console.log('%c台海防衛戰 Taiwan Strait Defense%c\n© 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory. All rights reserved.', 'font-size:16px;font-weight:700;color:#e0c07a', 'color:#8fa4b8');
  TW.Audio.init();
  chooseLength();
});

/* --------------------------------------------------------------------------
   開場：選戰役長度
   -------------------------------------------------------------------------- */
function chooseLength(){
  TW.Audio.playBgm('menu');
  TW.UI.modal({
    title:'台海防衛戰',
    sub:'OPERATION · TAIWAN STRAIT DEFENSE　｜　麥麥(Cormac)的遊戲工廠 · Cormac’s Game Factory',
    text:
      '共軍東部戰區於今晨 0600 展開「聯合火力打擊」。第一波彈道飛彈已經在路上，\n' +
      '目標是我方的機場、港口、防空陣地與指揮節點。\n\n' +
      '你是國防部聯合作戰指揮中心的作戰次長。\n\n' +
      '這場仗你想打多久？',
    opts:[1, 2, 3].map(m => {
      const c = TW.CAMPAIGN[m];
      return { label:c.name + '　（' + c.days + ' 天 / ' + c.turns + ' 回合）',
               hint:c.desc, eff:() => setTimeout(() => chooseDifficulty(m), 200) };
    })
  });
  TW.UI.flushModal();
}

/* --------------------------------------------------------------------------
   開場：選難度
   -------------------------------------------------------------------------- */
function chooseScenario(months, diff){
  TW.UI.modal({
    title:'開戰劇本',
    sub:'OPENING SCENARIO',
    text:'共軍會用什麼方式打第一擊？\n\n' +
         '這不是難度，是「戰爭以什麼形態開始」——\n' +
         '兩種劇本要你在完全不同的地方做決定。',
    opts:Object.keys(TW.SCENARIOS).map(k => {
      const sc = TW.SCENARIOS[k];
      return { label:sc.name + '　—　' + sc.sub, hint:sc.desc,
               eff:() => { TW.SCENARIO = k; startCampaign(months, diff); } };
    })
  });
  TW.UI.flushModal();
}

function chooseMode(months, diff){
  TW.UI.modal({
    title:'戰役模式',
    sub:'CAMPAIGN MODE',
    text:
      '最後一個選擇。\n\n' +
      '「防衛作戰」是這款遊戲原本的樣子，所有機制都對著現實調過。\n' +
      '「架空模式」會解開一條現實裡不存在的限制——讓國軍可以反攻大陸。\n\n' +
      '說明白：**現實中國軍沒有反攻大陸的能力，也沒有這個計畫。**\n' +
      '全部兩棲載具加起來只運得動一兩個旅，而且反攻計畫（國光計畫）\n' +
      '早在 1972 年就終止了，現行戰略是「防衛固守、重層嚇阻」。\n' +
      '架空模式純粹是拿來玩的，不是推演。',
    opts:[
      { label:'防衛作戰　—　符合現實（推薦）',
        hint:'國軍不會打過去。攻勢手段是遠程打擊、特戰突擊、奪回外島',
        eff:() => { TW.WHAT_IF = false; setTimeout(() => chooseScenario(months, diff), 200); } },
      { label:'架空模式　—　可以反攻大陸',
        hint:'解開限制，地面部隊與兩棲登陸可以進入大陸沿岸。不符合現實',
        eff:() => { TW.WHAT_IF = true; setTimeout(() => chooseScenario(months, diff), 200); } }
    ]
  });
  TW.UI.flushModal();
}

function chooseDifficulty(months){
  const c = TW.CAMPAIGN[months];
  TW.UI.modal({
    title:'難度',
    sub:'戰役長度：' + c.name + '　·　' + c.turns + ' 回合',
    text:
      '難度不是只把共軍的血調高，那樣只會變得無聊。\n' +
      '這裡動的是四件真正決定這場仗的事：\n\n' +
      '　· 雙方的火力\n' +
      '　· 你的彈藥與後備動員能撐多久\n' +
      '　· 共軍能投入多少增援\n' +
      '　· 國際社會願不願意、來不來得及幫你\n\n' +
      '第一次玩建議選「中等」。',
    opts:[1, 2, 3, 4].map(lv => {
      const D = TW.DIFFICULTY[lv];
      return { label:D.name + '　—　' + D.sub, hint:D.desc,
               eff:() => setTimeout(() => chooseMode(months, lv), 200) };
    })
  });
  TW.UI.flushModal();
}

function startCampaign(months, diff){
  TW.Audio.playBgm('calm');
  TW.setCampaign(months);
  TW.setDifficulty(diff || 2);     // 一定要在 setCampaign 之後
  TW.newGame();
  document.getElementById('log').innerHTML = '';
  TW.S.log.forEach(l => TW.UI.appendLog(l.cls, l.text, l.stamp));
  TW.Map.fit();
  TW.UI.refresh();

  const c = TW.CAMPAIGN[months];
  const D = TW.DIFFICULTY[TW.B.DIFFICULTY];
  TW.UI.modal({
    title:'國防部聯合作戰指揮中心',
    sub:'戰役長度：' + c.name + '　·　' + TW.B.MAX_TURNS + ' 回合　·　難度：' + D.name +
        '　·　' + (TW.SCENARIOS[TW.S.scenario] || TW.SCENARIOS.standard).name +
        (TW.S.whatIf ? '　·　架空模式' : ''),
    text:
      (TW.SCENARIOS[TW.S.scenario] || TW.SCENARIOS.standard).brief + '\n\n' +
      '【你的任務】\n' +
      '撐過 ' + TW.B.MAX_TURNS + ' 個回合（' + c.days + ' 天）。\n' +
      '撐得越久、共軍損失越大、平民保護得越好，國際支持度就越高，\n' +
      '美國和盟國願意給的武器就越好——撐到最後美軍會直接下場。\n' +
      '（這一局美軍最早在第 ' + TW.B.US_INTERVENE_TURN + ' 回合、國際支持 ' +
      TW.B.US_INTERVENE_INTL + ' 以上才可能介入）\n\n' +
      '【你會輸】台北陷落／戰爭意志歸零／高雄與台中同時失守。\n\n' +
      '【三個原則】\n' +
      '一、灘頭是唯一的機會，共軍上岸第一回合最虛弱。\n' +
      '二、花蓮、台東、蘇澳不能丟，那是軍援唯一的入口。\n' +
      '三、你不需要贏第一天，只需要讓對方贏不了最後一天。',
    opts:[
      { label:'第一次玩 — 帶我做一次教學', hint:'約三分鐘，一步一步點過一遍',
        eff:() => setTimeout(() => TW.Tutor.start(), 200) },
      { label:'直接進戰情室', hint:'關鍵時刻仍然會跳出新手提示',
        eff:() => { TW.S.flags.hints = true; } },
      { label:'我很熟了，什麼提示都不要', hint:'關閉所有新手提示',
        eff:() => { TW.S.flags.hints = false; } }
    ]
  });
  TW.UI.flushModal();
}

/* --------------------------------------------------------------------------
   執行一個回合
   -------------------------------------------------------------------------- */
async function runTurn(){
  const S = TW.S;
  if (TW.busy || S.over) return;
  TW.busy = true;
  TW.skip = false;

  const btn = document.getElementById('btn-end');
  btn.disabled = true;
  btn.textContent = '演算中…';

  /* 演算期間先把戰報攔下來，等播放時才照順序印 */
  const buffer = [];
  const realAppend = TW.UI.appendLog.bind(TW.UI);
  TW.UI.appendLog = (cls, text, stamp) => buffer.push([cls, text, stamp]);

  let ev;
  TW.Map.beginAnim();              // 先記下每支部隊的位置，播放時才能從舊位置滑過去
  try {
    ev = TW.Turn.execute();
  } catch (err){
    console.error(err);
    TW.Map.anim = null;
    TW.UI.appendLog = realAppend;
    realAppend('c-warn', '【引擎錯誤】' + err.message + '（請按 F12 看主控台）', 'ERR');
    TW.busy = false; btn.disabled = false; btn.textContent = '執行回合 ▶';
    return;
  }
  TW.UI.appendLog = realAppend;

  await playback(ev);
  TW.Map.endAnim();                // 還沒輪到的部隊一起就位

  /* 演算過程中額外產生的戰報（例如城市易手） */
  buffer.forEach(b => realAppend(b[0], b[1], b[2]));

  document.getElementById('playbar').classList.add('hidden');
  TW.UI.refresh();

  /* 每回合自動存檔，當機或關掉分頁也不會全部重來 */
  const sv = TW.saveGame('auto');
  if (!sv.ok) realAppend('c-warn', '【自動存檔失敗】' + sv.msg, '');

  TW.UI.flushModal();
  TW.Audio.updateBgm();          // 依戰況換背景音樂

  TW.busy = false;
  btn.disabled = false;
  btn.textContent = '執行回合 ▶';
}

/* --------------------------------------------------------------------------
   播放戰鬥事件
   -------------------------------------------------------------------------- */
async function playback(ev){
  const bar = document.getElementById('playbar');
  const txt = document.getElementById('pb-txt');
  const speed = () => +document.getElementById('ui-speed').value;

  bar.classList.remove('hidden');
  let phase = '';

  for (const e of ev){
    if (e.t === 'phase'){
      phase = e.txt;
      txt.textContent = phase;
      TW.UI.appendLog('c-big', e.txt, stamp());
      if (!TW.skip && speed() > 0) await wait(speed() * 0.9);
      continue;
    }

    if (e.txt) TW.UI.appendLog(e.cls || '', e.txt, stamp());

    /* 跳過動畫或「瞬間」：不放特效，只讓部隊就位 */
    const s = speed();
    const fast = TW.skip || s <= 0;
    if (fast){
      if (e.uid) TW.Map.release(e.uid);
      if (e.uids) e.uids.forEach(id => TW.Map.release(id));
    } else {
      TW.Map.addFx(e);
    }
    if (!e.quiet) TW.Audio.onEvent(e);

    if (!fast && !e.quiet){
      let d = (e.t === 'battle' || e.t === 'missile' || e.t === 'land') ? s : s * 0.45;
      if (e.line) d = s * 0.55;                        // 同一場戰鬥的逐支結果，不用每行都等滿
      if (e.dogfight) d = s * 1.6;                     // 空戰動畫比較長，讓它演完
      if (e.t === 'move' && !e.rout) d = s * 0.35;
      await wait(d);
    }
  }
  function stamp(){
    const S = TW.S;
    return 'D+' + S.day + ' ' + String(S.hour).padStart(2, '0') + '00';
  }
}

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
