/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   裝備資料庫（型號、性能、來源盡量貼近現實）
   --------------------------------------------------------------------------
   cat  裝備類別
   pack 一「批」的數量（撥交給一個旅時的規模）
   mod  撥交後給該旅的能力加成
   ic   生產成本（工業點）  turns 生產／交付所需回合
   src  ROC=國造  US=美國  EU=歐洲  JP=日本
   ========================================================================== */

TW.EQUIP = {

  /* ---------------- 戰車、裝甲車 ---------------- */
  m1a2t: {
    name:'M1A2T 艾布蘭戰車', en:'M1A2T Abrams', cat:'armor', unit:'輛', pack:38, src:'US',
    ic:34, turns:4, mod:{ hard:9, soft:2, armor:13, pierce:11 },
    desc:'1,500 馬力燃氣渦輪、120mm M256 滑膛砲、貧鈾夾層裝甲。國軍現役最強地面火力，但油耗高、對橋梁與道路承載要求嚴苛。'
  },
  cm11: {
    name:'CM-11 勇虎式戰車', en:'CM-11 Brave Tiger', cat:'armor', unit:'輛', pack:45, src:'ROC',
    ic:14, turns:2, mod:{ hard:4, soft:2, armor:5, pierce:5 },
    desc:'M60A3 車體配 M48A5 砲塔與 105mm M68 線膛砲，加裝 M1 的射控電腦。國造整合的產物，俗稱「混血坦克」。'
  },
  m60a3: {
    name:'M60A3 TTS 戰車', en:'M60A3 TTS', cat:'armor', unit:'輛', pack:45, src:'US',
    ic:10, turns:2, mod:{ hard:3, soft:2, armor:4, pierce:4 },
    desc:'配備熱影像瞄準鏡的 M60 最終型。裝甲已顯老舊，但數量是國軍裝甲部隊的骨幹。'
  },
  cm34: {
    name:'CM-34 雲豹 30 鏈砲車', en:'CM-34 Clouded Leopard', cat:'ifv', unit:'輛', pack:60, src:'ROC',
    ic:16, turns:2, mod:{ soft:6, hard:3, armor:4, pierce:3, move:1 },
    desc:'八輪甲車配 MK44 30mm 鏈砲。公路時速 100km，適合台灣西部路網快速機動反擊。'
  },
  cm32: {
    name:'CM-32 雲豹裝步戰鬥車', en:'CM-32', cat:'ifv', unit:'輛', pack:60, src:'ROC',
    ic:11, turns:2, mod:{ soft:4, armor:3, move:1 },
    desc:'國造八輪甲車基本型，載運一個步兵班。'
  },

  /* ---------------- 砲兵、火箭 ---------------- */
  m109a6: {
    name:'M109A6 帕拉丁自走砲', en:'M109A6 Paladin', cat:'arty', unit:'門', pack:24, src:'US',
    ic:20, turns:3, mod:{ soft:9, hard:3, range:1 },
    desc:'射程 30 公里。155mm 自走榴砲，具備停車即射（shoot-and-scoot）能力，射程 24–30 公里。'
  },
  m110a2: {
    name:'M110A2 八吋自走砲', en:'M110A2', cat:'arty', unit:'門', pack:18, src:'US',
    ic:12, turns:2, mod:{ soft:7, hard:4 },
    desc:'203mm 重砲。射速慢但單發威力極大，是灘岸決戰的傳統主力。'
  },
  thunder2000: {
    name:'雷霆 2000 多管火箭', en:'RT-2000', cat:'rocket', unit:'車', pack:12, src:'ROC',
    ic:18, turns:2, mod:{ soft:12, range:2 },
    desc:'射程 45 公里，打得到灘頭與灘外海面上的舟波。中科院研製，可發射 MK-15/30/45 三種火箭，MK-45 射程 45 公里，專為覆蓋灘頭與集結區設計。'
  },
  himars: {
    name:'M142 海馬斯多管火箭', en:'M142 HIMARS', cat:'rocket', unit:'車', pack:11, src:'US',
    ic:28, turns:3, mod:{ soft:11, hard:5, range:3 },
    desc:'發射 GMLRS 時射程 70 公里；換裝 ATACMS 後可打到對岸。輪型高機動火箭系統。發射 GMLRS 精準彈射程 70 公里，可打擊灘頭、港口與集結中的登陸船團。'
  },
  atacms: {
    name:'ATACMS 陸軍戰術飛彈', en:'MGM-140 ATACMS', cat:'rocket', unit:'枚', pack:64, src:'US',
    ic:30, turns:3, mod:{ soft:6, hard:6, range:11 }, strike:true,
    desc:'射程 300 公里的戰術彈道飛彈，由 HIMARS 發射，可反制對岸港口與飛彈陣地。'
  },

  /* ---------------- 反裝甲 ---------------- */
  javelin: {
    name:'FGM-148 標槍飛彈', en:'FGM-148 Javelin', cat:'at', unit:'枚', pack:400, src:'US',
    ic:12, turns:2, mod:{ hard:8, pierce:9 },
    desc:'肩射「射後不理」反裝甲飛彈，攻頂模式可貫穿現役所有主戰車頂部裝甲。'
  },
  tow2b: {
    name:'BGM-71 拖式 2B 飛彈', en:'TOW-2B', cat:'at', unit:'枚', pack:300, src:'US',
    ic:8, turns:1, mod:{ hard:6, pierce:6 },
    desc:'車載／陣地用重型反裝甲飛彈，掠飛攻頂，射程 3.75 公里。'
  },
  kestrel: {
    name:'紅隼反裝甲火箭', en:'Kestrel', cat:'at', unit:'具', pack:1200, src:'ROC',
    ic:4, turns:1, mod:{ hard:3, pierce:3 },
    desc:'中科院國造單兵火箭，可由後備部隊大量配發，巷戰與反舟波作戰的廉價火力。'
  },

  /* ---------------- 防空 ---------------- */
  pac3mse: {
    name:'愛國者 PAC-3 MSE 攔截彈', en:'PAC-3 MSE', cat:'sam', unit:'枚', pack:64, src:'US',
    ic:32, turns:4, mod:{ aa:14, abm:16 }, strategic:true,
    desc:'撞擊殺傷式反彈道飛彈，射高提升至 35 公里以上。國軍反飛彈防禦的最後一層硬殺手段。'
  },
  tk3: {
    name:'天弓三型防空飛彈', en:'Sky Bow III', cat:'sam', unit:'枚', pack:48, src:'ROC',
    ic:22, turns:3, mod:{ aa:11, abm:11 }, strategic:true,
    desc:'中科院研製的中高層防空／反戰術彈道飛彈系統，可與愛國者形成雙層防禦。'
  },
  landsword2: {
    name:'陸射劍二防空飛彈', en:'Land Sword II', cat:'sam', unit:'枚', pack:72, src:'ROC',
    ic:14, turns:2, mod:{ aa:8 },
    desc:'由天劍二型空對空飛彈改良的野戰防空系統，掩護裝甲與砲兵部隊。'
  },
  stinger: {
    name:'FIM-92 刺針飛彈', en:'FIM-92 Stinger', cat:'sam', unit:'枚', pack:250, src:'US',
    ic:9, turns:1, mod:{ aa:6 },
    desc:'肩射短程防空飛彈，對付直升機與低空攻擊機。分散配發後極難被壓制。'
  },

  /* ---------------- 反艦 ---------------- */
  hf3: {
    name:'雄風三型超音速反艦飛彈', en:'HF-3', cat:'ashm', unit:'枚', pack:40, src:'ROC',
    ic:26, turns:3, mod:{ ashm:14 }, strategic:true,
    desc:'衝壓引擎超音速反艦飛彈，末端速度逾 2 馬赫，被稱為「航母殺手」。'
  },
  hf2: {
    name:'雄風二型反艦飛彈', en:'HF-2', cat:'ashm', unit:'枚', pack:60, src:'ROC',
    ic:16, turns:2, mod:{ ashm:9 }, strategic:true,
    desc:'次音速反艦飛彈，雙模導引（主動雷達＋紅外線），是國軍反艦火力的數量主體。'
  },
  hcds: {
    name:'魚叉岸置系統 HCDS', en:'Harpoon Coastal Defense System', cat:'ashm', unit:'枚', pack:100, src:'US',
    ic:30, turns:4, mod:{ ashm:16 }, strategic:true,
    desc:'RGM-84L-4 Block II 岸置型，含 100 套發射車與 25 部雷達車。分散部署、機動發射，難以被首波飛彈清除。'
  },
  hf2e: {
    name:'雄昇（雄二E）巡弋飛彈', en:'HF-2E / Hsiung Sheng', cat:'ashm', unit:'枚', pack:30, src:'ROC',
    ic:28, turns:4, mod:{ strike:14 }, strategic:true,
    desc:'射程逾 1,000 公里的對地巡弋飛彈，用於反制對岸機場、港口與指揮節點。'
  },
  slamer: {
    name:'AGM-84H SLAM-ER', en:'SLAM-ER', cat:'ashm', unit:'枚', pack:32, src:'US',
    ic:24, turns:3, mod:{ strike:10, ashm:8 }, strategic:true,
    desc:'空射距外精準攻陸／反艦飛彈，射程約 270 公里，由 F-16V 掛載。'
  },
  jassm: {
    name:'AGM-158 JASSM-ER', en:'JASSM-ER', cat:'ashm', unit:'枚', pack:24, src:'US',
    ic:36, turns:5, mod:{ strike:18 }, strategic:true,
    desc:'匿蹤距外巡弋飛彈，射程 900 公里以上。可在敵防空圈外攻擊對岸縱深高價值目標。'
  },

  /* ---------------- 無人機、智慧彈藥 ---------------- */
  switchblade: {
    name:'彈簧刀 300／600 遊蕩彈藥', en:'Switchblade 300/600', cat:'uav', unit:'枚', pack:180, src:'US',
    ic:14, turns:2, mod:{ soft:5, hard:5, recon:2 },
    desc:'背包攜行的自殺無人機。600 型射程 40 公里、可反裝甲，適合分散式的灘頭騷擾。'
  },
  mq9b: {
    name:'MQ-9B 海上衛士', en:'MQ-9B SeaGuardian', cat:'uav', unit:'架', pack:4, src:'US',
    ic:26, turns:4, mod:{ recon:8 }, strategic:true,
    desc:'長航時偵察無人機，可持續監控台海與巴士海峽的水面動態，提供反艦火力目獲。'
  },
  chienhsiang: {
    name:'劍翔反輻射無人機', en:'Chien Hsiang', cat:'uav', unit:'枚', pack:120, src:'ROC',
    ic:15, turns:2, mod:{ sead:10 }, strategic:true,
    desc:'中科院研製的反輻射遊蕩彈藥，自主搜索並撞擊敵方防空雷達。'
  },
  volcano: {
    name:'M136 火山車載佈雷系統', en:'M136 Volcano', cat:'mine', unit:'套', pack:14, src:'US',
    ic:18, turns:3, mod:{ mine:12 }, strategic:true,
    desc:'可在數分鐘內於灘頭後方佈設大面積反戰車雷區，遲滯共軍裝甲向縱深突破。'
  },
  seamine: {
    name:'萬象水雷／智慧水雷', en:'Smart Sea Mine', cat:'mine', unit:'枚', pack:200, src:'ROC',
    ic:12, turns:2, to:'navy', mod:{ seamine:12 }, strategic:true,
    desc:'國造感應式水雷，佈放於紅色海灘外海與港口航道，是最具成本效益的反登陸手段。'
        + '由艦艇執行「佈雷」任務時直接消耗，不撥交給地面部隊。'
  },

  /* ---------------- 航空 ---------------- */
  f16v: {
    name:'F-16V Block 70 戰機', en:'F-16V Block 70', cat:'air', unit:'架', pack:12, src:'US',
    ic:40, turns:5, to:'air', mod:{ air:10, ashm:4, sead:3 }, strategic:true,
    desc:'配備 AN/APG-83 主動相位陣列雷達，可掛載 AIM-120C-7、AGM-84 與 AGM-88。國軍空優與反艦的核心。'
  },
  e2d: {
    name:'E-2D 先進鷹眼預警機', en:'E-2D Advanced Hawkeye', cat:'air', unit:'架', pack:2, src:'US',
    ic:44, turns:6, to:'air', mod:{ c4isr:16 }, strategic:true,
    desc:'空中預警管制機。在地面雷達站遭飛彈壓制後，是維持空情圖像的唯一手段。'
  },
  ah64e: {
    name:'AH-64E 阿帕契攻擊直升機', en:'AH-64E Apache', cat:'air', unit:'架', pack:6, src:'US',
    ic:30, turns:4, to:'air', mod:{ cas:9, hard:5, def:3 },
    desc:'配備長弓雷達與地獄火飛彈，可在灘頭後方山區隱蔽待機，對舟波與登陸裝甲實施快速反擊。'
        + '撥交給陸航攻擊直升機隊。'
  },

  /* ---------------- 後勤與電子戰 ---------------- */
  ammo155: {
    name:'155mm 砲彈與火箭彈補給', en:'155mm & Rocket Ammunition', cat:'log', unit:'發', pack:20000, src:'US',
    ic:8, turns:1, to:'national', ammoFill:30,
    desc:'砲兵持續射擊的前提。國軍戰時彈藥存量是撐幾天還是撐幾週的關鍵變數。'
        + '一批直接補進全國戰備彈藥，不撥交給個別部隊。'
  },
  /* ---------------- 自建艦艇 ---------------- */
  yushanLpd: {
    name:'玉山級兩棲船塢運輸艦', en:'Yu Shan-class LPD', cat:'ship', unit:'艘', pack:1, src:'ROC',
    ic:26, turns:3, to:'navy', shipType:'yushan', joinFleet:'兩棲艦隊',
    desc:'台船建造的萬噸級船塢運輸艦，可搭載氣墊登陸艇與直升機。'
        + '外離島的兵力輪換、補給與傷患後送靠它；反攻失陷灘頭時也是唯一的載具。'
        + '海軍造船能量有限，一次只出得了一艘。'
  },
  tuochiangCorv: {
    name:'沱江級巡邏艦', en:'Tuo Chiang-class Corvette', cat:'ship', unit:'艘', pack:2, src:'ROC',
    ic:19, turns:3, to:'navy', shipType:'tuochiang', joinFleet:'快速打擊支隊',
    desc:'雙船體匿蹤飛彈巡邏艦，八枚雄二加八枚雄三。'
        + '船小、速度快、雷達截面低，是海峽裡最難被打到、也最咬得動大艦的東西。'
  },
  minelayerRoc: {
    name:'快速布雷艇', en:'Fast Minelayer', cat:'ship', unit:'艘', pack:2, src:'ROC',
    ic:12, turns:2, to:'navy', shipType:'rocmine', joinFleet:'布雷支隊',
    desc:'戰時最具成本效益的一種船。把雷佈在灘外航道，共軍的舟波就得慢下來。'
  },

  ammoRoc: {
    name:'國造彈藥緊急增產', en:'Emergency Munitions Production', cat:'log', unit:'批', pack:1, src:'ROC',
    ic:11, turns:2, to:'national', ammoFill:20,
    desc:'軍備局各廠加開生產線，把民間產能轉入彈藥製造。'
        + '比等美國的船快，但吃掉的是本來可以造裝備的工業產能。'
  },
  starlink: {
    name:'低軌衛星通訊終端', en:'LEO SATCOM Terminals', cat:'c4isr', unit:'套', pack:700, src:'US',
    ic:16, turns:2, mod:{ c4isr:10 }, strategic:true,
    desc:'海底電纜遭切斷後維持指管通信的備援。分散式終端難以被單點摧毀。'
  },
  ewpod: {
    name:'機載電子戰莢艙', en:'ECM Pods', cat:'c4isr', unit:'具', pack:20, src:'US',
    ic:20, turns:3, to:'air', mod:{ air:4, sead:6, def:3 }, strategic:true,
    desc:'干擾敵方戰機火控雷達與反艦飛彈導引頭，提高我方戰機的存活率與壓制能力。'
        + '掛載在戰機上，撥交給航空聯隊。'
  }
};

/* 這一批裝備該撥給誰：ground 地面旅／air 航空聯隊／navy 艦艇。
   個別裝備可以用 to: 覆寫——智慧水雷是艦艇用的，電戰莢艙是掛在飛機上的。 */
TW.EQUIP_TO = {
  armor:'ground', ifv:'ground', arty:'ground', rocket:'ground', at:'ground',
  sam:'ground', ashm:'ground', uav:'ground', mine:'ground', log:'ground',
  c4isr:'ground', air:'air'
};
TW.equipTarget = function(id){
  const e = TW.EQUIP[id];
  if (!e) return 'ground';
  return e.to || TW.EQUIP_TO[e.cat] || 'ground';
};
TW.EQUIP_TO_NAME = { ground:'地面部隊', air:'航空聯隊', navy:'艦艇', national:'全國存量' };

/* 裝備類別的中文名稱（面板顯示用） */
TW.EQUIP_CAT = {
  armor:'主戰車', ifv:'裝甲車', arty:'火砲', rocket:'火箭／戰術飛彈',
  at:'反裝甲', sam:'防空飛彈', ashm:'反艦／巡弋飛彈', uav:'無人機',
  mine:'佈雷', air:'航空器', log:'後勤', c4isr:'指管情監偵', ship:'艦艇'
};
