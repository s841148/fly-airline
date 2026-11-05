/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   軍售／軍援清單、隨機事件
   --------------------------------------------------------------------------
   本作的核心機制之一：撐得越久、國際支持度越高，
   美國與盟國願意賣（或給）我方的東西就越好、來得越快。
   ========================================================================== */

/* ---------------- 軍援／軍售包裹 ----------------
   intl : 需要的國際支持度門檻
   pri  : 抽中的相對權重
   items: [裝備代號, 幾批]
   ic   : 需要自付的採購經費（0 = 無償軍援）
   ------------------------------------------------ */
TW.AID_PACKAGES = [

  /* --- 第一級：立即可交付的存量裝備 --- */
  { id:'a_stinger', repeat:4, tier:1, intl:0, pri:10, ic:12,
    name:'刺針飛彈緊急撥交案',
    from:'美國 · 總統撥交權（PDA）',
    items:[['stinger',2]],
    text:'美方動用總統撥交權，自駐日美軍庫存中先行撥交一批 FIM-92 刺針飛彈，以海運轉空運方式送抵花蓮。' },

  { id:'a_javelin', repeat:3, tier:1, intl:10, pri:10, ic:16,
    name:'標槍飛彈加速交付案',
    from:'美國 · 對外軍售（FMS）',
    items:[['javelin',1],['tow2b',1]],
    text:'原訂 2027 年交付的標槍飛彈提前釋出，洛克希德．馬丁的產線改為三班制。' },

  { id:'a_ammo', repeat:5, tier:1, intl:5, pri:12, ic:8,
    name:'155mm 彈藥緊急補充',
    from:'美國 · 戰備物資預置（WRSA-T）',
    items:[['ammo155',1]],
    text:'自預置於台灣本島的美軍戰備物資中撥出砲彈，可立即進入我方彈藥補給體系。' },

  { id:'a_switch', repeat:3, tier:1, intl:18, pri:9, ic:14,
    name:'彈簧刀遊蕩彈藥案',
    from:'美國 · FMS',
    items:[['switchblade',1]],
    text:'AeroVironment 公司交付彈簧刀 300／600，並派遣技術團隊在志航基地實施三日速成訓練。' },

  /* --- 第二級：改變戰場態勢的裝備 --- */
  { id:'a_himars', tier:2, intl:35, pri:9, ic:30,
    name:'海馬斯多管火箭加速交付',
    from:'美國 · FMS 加速條款',
    items:[['himars',1],['atacms',1]],
    text:'原訂分批交付的 M142 海馬斯提前全數運抵，隨行的還有 ATACMS 戰術飛彈。這代表我方首次具備打擊對岸集結港口的能力。' },

  { id:'a_harpoon', tier:2, intl:40, pri:9, ic:32,
    name:'魚叉岸置反艦飛彈系統',
    from:'美國 · FMS',
    items:[['hcds',1]],
    text:'波音公司交付 RGM-84L-4 Block II 岸置系統。發射車在夜間分散進駐西部各鄉鎮道路，沒有固定陣地，也就沒有可以被摧毀的陣地。' },

  { id:'a_volcano', tier:2, intl:32, pri:8, ic:20,
    name:'火山車載佈雷系統',
    from:'美國 · FMS',
    items:[['volcano',1],['tow2b',1]],
    text:'M136 火山佈雷車可在共軍灘頭後方數分鐘內佈下大面積雷區，把突破口變成死巷。' },

  { id:'a_mq9', tier:2, intl:38, pri:7, ic:26,
    name:'MQ-9B 海上衛士無人機',
    from:'美國 · FMS',
    items:[['mq9b',1],['starlink',1]],
    text:'四架 MQ-9B 由關島轉場抵達志航。它們將接手因雷達站被毀而中斷的海峽監視任務。' },

  { id:'a_ew', repeat:2, tier:2, intl:30, pri:7, ic:22,
    name:'電子戰莢艙與抗干擾套件',
    from:'美國 · 商售與技術支援',
    items:[['ewpod',1],['starlink',1]],
    text:'美方同時提供 GPS 抗干擾接收機與低軌衛星終端。海底電纜已經被切斷三條，這是我們剩下的耳朵。' },

  /* --- 第三級：戰略級 --- */
  { id:'a_slamer', repeat:2, tier:3, intl:55, pri:7, ic:28,
    name:'SLAM-ER 距外攻陸飛彈',
    from:'美國 · FMS',
    items:[['slamer',1],['ewpod',1]],
    text:'F-16V 掛上 AGM-84H 之後，我方戰機可以在對岸防空圈之外對港口與集結區發射。' },

  { id:'a_pac3', repeat:4, tier:3, intl:58, pri:8, ic:34,
    name:'PAC-3 MSE 攔截彈補充',
    from:'美國 · FMS 緊急撥補',
    items:[['pac3mse',1]],
    text:'第一週的飛彈飽和攻擊耗掉了我方近半數攔截彈。這批補充來得剛好。' },

  { id:'a_f16', tier:3, intl:62, pri:6, ic:40,
    name:'F-16 補充機與零附件',
    from:'美國 · 現役機轉移',
    items:[['f16v',1],['ewpod',1]],
    text:'美國空軍國民兵單位的 F-16 由飛行員直接飛抵花蓮，塗裝都還沒改。' },

  { id:'a_jassm', tier:3, intl:70, pri:6, ic:36,
    name:'JASSM-ER 匿蹤巡弋飛彈',
    from:'美國 · FMS（特別授權）',
    items:[['jassm',1]],
    text:'這是美方第一次同意出售射程 900 公里以上的攻擊性武器給我方。附帶條件寫了三頁，但飛彈已經在路上。' },

  { id:'a_e2d', tier:3, intl:66, pri:5, ic:44,
    name:'E-2D 先進鷹眼預警機',
    from:'美國 · FMS',
    items:[['e2d',1],['starlink',1]],
    text:'兩架 E-2D 進駐佳山洞庫。從此我方在東部海域重新看得見兩百浬外的東西。' },

  { id:'a_m1', tier:3, intl:60, pri:5, ic:34,
    name:'M1A2T 後續批次提前交付',
    from:'美國 · FMS',
    items:[['m1a2t',1]],
    text:'第三批 M1A2T 由運輸艦直接卸在花蓮港。卸載作業在防空警報中進行了十九個小時。' },

  { id:'a_apache', repeat:2, tier:3, intl:52, pri:5, ic:30,
    name:'AH-64E 攻擊直升機補充',
    from:'美國 · FMS',
    items:[['ah64e',1],['javelin',1]],
    text:'補足龍城部隊的戰損。阿帕契將分散配置於中央山脈西側的隱蔽掩體。' },

  /* --- 第四級：盟國直接介入 --- */
  { id:'a_jp', tier:4, intl:76, pri:4, ic:10,
    name:'日本後勤與情報支援協定',
    from:'日本 · 重要影響事態認定',
    items:[['ammo155',1],['starlink',1]],
    intl_bonus:8,
    text:'日本內閣認定台海事態屬「重要影響事態」，開放與那國、石垣作為後送與補給中繼，並開始共享海上自衛隊的水下監聽資料。' },

  { id:'a_coalition', tier:4, intl:82, pri:4, ic:24,
    name:'多國聯合軍備支援方案',
    from:'美 · 日 · 澳 · 歐盟',
    items:[['jassm',1],['pac3mse',1],['ammo155',1]],
    intl_bonus:6,
    text:'澳洲提供彈藥、歐盟提供衛星影像、日本提供後送。這已經不只是軍售，而是一個聯盟正在成形。' }
];

/* ---------------- 隨機事件 ----------------
   cond(S) 回傳 true 才可能觸發；opts 為玩家的選擇
   ------------------------------------------ */
TW.EVENTS = [

  { id:'e_cable', w:8, once:true, minTurn:1,
    title:'海底電纜遭切斷',
    sub:'INCIDENT · 台灣海峽',
    text:'兩艘掛著第三國旗幟的貨輪，在同一小時內於不同海域「拋錨拖錨」。台灣對外的十四條海底電纜，斷了九條。金融結算與對外通信全面依賴衛星備援。',
    opts:[
      { label:'啟用低軌衛星備援，維持指管', hint:'工業 −4，指管維持',
        eff:S => { S.ic -= 4; S.mod.c4isr += 4; } },
      { label:'徵用民間頻寬並實施通信管制', hint:'政治點 −5，戰爭意志 −3，指管 +8',
        eff:S => { S.pp -= 5; S.will -= 3; S.mod.c4isr += 8; } }
    ] },

  { id:'e_decap', w:7, once:true, minTurn:1, maxTurn:6,
    title:'斬首行動企圖',
    sub:'ALERT · 台北',
    text:'國安局在總統府周邊查獲兩組攜帶單兵防空飛彈與電台的滲透人員。研判為特種部隊前導組，任務是引導巡弋飛彈與直升機突擊。',
    opts:[
      { label:'元首轉入衡山指揮所，指管不中斷', hint:'戰爭意志 −2，避免指管損失',
        eff:S => { S.will -= 2; } },
      { label:'元首留在總統府公開露面', hint:'風險高，但戰爭意志 +8、國際支持 +5',
        eff:S => { S.will += 8; S.intl += 5; S.flags.leaderExposed = true; } }
    ] },

  { id:'e_refugee', w:6, minTurn:4,
    title:'西部平民大規模移動',
    sub:'HOME FRONT',
    text:'國道一號與三號南下線出現數十公里車陣。軍方的補給車隊被卡在裡面動彈不得。',
    opts:[
      { label:'國道改為軍事專用，禁止民間通行', hint:'補給 +1 格，戰爭意志 −5',
        eff:S => { S.mod.supplyRange += 1; S.will -= 5; } },
      { label:'維持民眾疏散優先', hint:'國際支持 +6，補給效率下降',
        eff:S => { S.intl += 6; S.mod.supplyPenalty = (S.mod.supplyPenalty||0) + 0.08; } }
    ] },

  { id:'e_defect', w:4, minTurn:8,
    title:'共軍飛行員駕機投誠',
    sub:'INTELLIGENCE',
    text:'一架殲-10C 關閉敵我識別、以低空進入我方防空識別區後主動聯絡。飛行員降落在志航基地，交出了完整的東部戰區空中任務規劃。',
    opts:[
      { label:'公開此事，發動心戰宣傳', hint:'國際支持 +8，共軍士氣 −5',
        eff:S => { S.intl += 8; S.plaWill -= 5; } },
      { label:'保密，直接運用其情報', hint:'本回合起我方偵蒐 +10，共軍空軍受損',
        eff:S => { S.mod.recon += 10; S.plaAirPenalty = 0.12; } }
    ] },

  { id:'e_blockade', w:7, minTurn:3,
    title:'海上封鎖與商船滯留',
    sub:'ECONOMY',
    text:'高雄港外錨地滯留三十七艘商船，保險業者已對台灣周邊海域全面拒保。天然氣存量僅剩十一天。',
    opts:[
      { label:'實施全國能源配給', hint:'工業 −6，但可持續運轉',
        eff:S => { S.ic -= 6; } },
      { label:'請求盟國護航船團', hint:'政治點 −8，國際支持 +5，軍援加速',
        eff:S => { S.pp -= 8; S.intl += 5; S.mod.aidDelivery -= 1; } }
    ] },

  { id:'e_disinfo', w:6, minTurn:2,
    title:'認知作戰：「政府已經談妥」',
    sub:'INFORMATION WARFARE',
    text:'社群平台湧現大量偽造的「高層已赴北京談判」訊息，並附上以生成式模型偽造的影片。部分後備動員據點出現報到率下降。',
    opts:[
      { label:'總統即時聯播駁斥', hint:'戰爭意志 +6，政治點 −3',
        eff:S => { S.will += 6; S.pp -= 3; } },
      { label:'依戒嚴令關閉相關平台', hint:'戰爭意志 +3，國際支持 −5',
        eff:S => { S.will += 3; S.intl -= 5; } },
      { label:'不予理會，專注軍事', hint:'戰爭意志 −7',
        eff:S => { S.will -= 7; } }
    ] },

  { id:'e_volunteer', w:5, minTurn:6,
    title:'國際志願者與外籍技術人員',
    sub:'INTERNATIONAL',
    text:'數百名外籍退役軍人、無人機工程師與戰場醫護透過各種管道抵台。同時也有大量身分不明者混雜其中。',
    opts:[
      { label:'編成國際志願旅', hint:'後備動員 +0.4／回合，國際支持 +4',
        eff:S => { S.mod.reserveRate += 0.4; S.intl += 4; } },
      { label:'僅接受技術與醫療人員', hint:'工業 +4，安全風險低',
        eff:S => { S.ic += 4; } }
    ] },

  { id:'e_pow', w:5, minTurn:5,
    title:'大量共軍俘虜',
    sub:'BATTLEFIELD',
    text:'灘頭一支失去船運支援的共軍部隊成建制投降。國際媒體要求進入戰俘營採訪。',
    opts:[
      { label:'公開透明，依日內瓦公約處理', hint:'國際支持 +10，工業 −3',
        eff:S => { S.intl += 10; S.ic -= 3; } },
      { label:'優先審訊獲取情報', hint:'偵蒐 +8，國際支持 +2',
        eff:S => { S.mod.recon += 8; S.intl += 2; } }
    ] },

  { id:'e_reactor', w:4, minTurn:10,
    title:'核電廠周邊落彈',
    sub:'CRISIS',
    text:'數枚偏離目標的巡弋飛彈落在核三廠外圍。反應爐未受損，但國際原子能總署要求立即進駐查核。',
    opts:[
      { label:'開放IAEA進駐並全球直播', hint:'國際支持 +14，共軍打擊受限',
        eff:S => { S.intl += 14; S.plaStrikePenalty = 0.15; } },
      { label:'緊急停機並疏散周邊', hint:'工業 −8，戰爭意志 −3',
        eff:S => { S.ic -= 8; S.will -= 3; } }
    ] },

  { id:'e_carrier', w:5, minTurn:14, cond:S => S.intl >= 60,
    title:'美軍航艦戰鬥群進入西太平洋',
    sub:'US 7TH FLEET',
    text:'尼米茲級與福特級各一個打擊群完成整備，正通過菲律賓海。白宮尚未表態是否介入，但共軍必須開始把一部分兵力用來看著他們。',
    opts:[
      { label:'公開歡迎並協調聯合海域感知', hint:'國際支持 +8，共軍海空壓力下降',
        eff:S => { S.intl += 8; S.plaAirPenalty = (S.plaAirPenalty||0) + 0.10; S.plaNavalPenalty = 0.12; } },
      { label:'低調處理，避免刺激升級', hint:'政治點 +6，國際支持 +3',
        eff:S => { S.pp += 6; S.intl += 3; } }
    ] },

  { id:'e_pla_supply', w:6, minTurn:8,
    title:'共軍灘頭補給困難',
    sub:'ENEMY',
    text:'偵蒐顯示共軍灘頭堆積場僅剩兩日份彈藥。海象轉惡，其海上補給梯隊延後四十八小時。',
    opts:[
      { label:'全力打擊灘頭堆積場', hint:'共軍補給大幅下降，我方彈藥消耗增加',
        eff:S => { S.plaSupplyHit = 0.30; S.mod.ammo -= 0.10; } },
      { label:'保存火力，等其主力上陸再打', hint:'政治點 +4',
        eff:S => { S.pp += 4; } }
    ] },

  { id:'e_typhoon', w:5, minTurn:6,
    title:'颱風接近台灣海峽',
    sub:'WEATHER',
    text:'中度颱風進入巴士海峽，海峽浪高將達四公尺以上。共軍的兩棲載具在這種海況下無法作業。',
    opts:[
      { label:'把握空窗期重整部隊', hint:'我方組織度回復大增，共軍無法登陸兩回合',
        eff:S => { S.weather = { turns:2, orgBonus:0.18, noLanding:true }; } }
    ] },

  { id:'e_traitor', w:4, minTurn:5,
    title:'內部洩密',
    sub:'COUNTER-INTELLIGENCE',
    text:'反情報單位查獲某作戰區參謀長期向對岸傳遞部隊調動資料。已知外洩範圍涵蓋兩個作戰區的預備隊位置。',
    opts:[
      { label:'立即逮捕並全面清查', hint:'政治點 −6，共軍情報優勢消失',
        eff:S => { S.pp -= 6; S.plaRecon = -8; } },
      { label:'反向利用，餵假情報', hint:'風險高：成功則共軍下一波攻擊嚴重受挫',
        eff:S => { S.flags.doubleAgent = true; } }
    ] }
];
