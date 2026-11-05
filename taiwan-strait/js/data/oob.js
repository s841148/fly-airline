/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   戰鬥序列 Order of Battle
   --------------------------------------------------------------------------
   番號與駐地依公開資料整理，並為遊戲平衡做過簡化與合併。
   實際部隊配置與戰備狀況並非公開資訊，本檔僅供遊戲使用。
   ========================================================================== */

TW.OOB = {

/* ======================= 中 華 民 國 國 軍 ======================= */
roc: {

  ground: [
    /* ---- 第六軍團（北部作戰區） ---- */
    { name:'裝甲第542旅',        corps:'六軍團', type:'roc_armor',    c:14, r:5,  xp:0.25, equip:['cm11'] },
    { name:'裝甲第584旅',        corps:'六軍團', type:'roc_armor',    c:14, r:6,  xp:0.30, equip:['m1a2t'] },   // 已完成 M1A2T 換裝
    { name:'機步第269旅',        corps:'六軍團', type:'roc_mech',     c:14, r:4,  xp:0.22, equip:['cm34'] },
    { name:'步兵第206旅',        corps:'六軍團', type:'roc_combined', c:15, r:4,  xp:0.15, equip:['kestrel'] },
    { name:'關渡地區指揮部',      corps:'六軍團', type:'roc_garrison', c:13, r:3,  xp:0.18 },
    { name:'憲兵第202指揮部',     corps:'六軍團', type:'roc_garrison', c:15, r:3,  xp:0.20 },
    { name:'蘭陽地區指揮部',      corps:'六軍團', type:'roc_garrison', c:19, r:4,  xp:0.15 },
    { name:'砲兵第21指揮部',      corps:'六軍團', type:'roc_arty',     c:15, r:5,  xp:0.25, equip:['himars','thunder2000'] },  // 海馬斯已成軍
    { name:'工兵第53工兵群',      corps:'六軍團', type:'roc_engineer', c:14, r:5,  xp:0.20 },
    { name:'防空飛彈第一群（愛國者）', corps:'空軍防砲', type:'roc_aa', c:15, r:3, xp:0.30, equip:['pac3mse'] },

    /* ---- 第十軍團（中部作戰區） ---- */
    { name:'裝甲第586旅',        corps:'十軍團', type:'roc_armor',    c:14, r:8,  xp:0.22, equip:['cm11'] },
    { name:'機步第234旅',        corps:'十軍團', type:'roc_mech',     c:14, r:11, xp:0.20, equip:['cm34'] },
    { name:'步兵第333旅',        corps:'十軍團', type:'roc_combined', c:15, r:9,  xp:0.15, equip:['kestrel'] },
    { name:'砲兵第58指揮部',      corps:'十軍團', type:'roc_arty',     c:14, r:9,  xp:0.18, equip:['thunder2000'] },
    { name:'工兵第52工兵群',      corps:'十軍團', type:'roc_engineer', c:14, r:11, xp:0.18 },
    { name:'防空飛彈第二群（天弓）', corps:'空軍防砲', type:'roc_aa',  c:15, r:8,  xp:0.25, equip:['tk3'] },

    /* ---- 第八軍團（南部作戰區） ---- */
    { name:'裝甲第564旅',        corps:'八軍團', type:'roc_armor',    c:15, r:15, xp:0.22, equip:['m60a3'] },
    { name:'機步第298旅',        corps:'八軍團', type:'roc_mech',     c:15, r:17, xp:0.20, equip:['cm34','landsword2'] },
    { name:'步兵第203旅',        corps:'八軍團', type:'roc_combined', c:16, r:19, xp:0.15, equip:['kestrel'] },
    { name:'砲兵第43指揮部',      corps:'八軍團', type:'roc_arty',     c:15, r:16, xp:0.18, equip:['m110a2','thunder2000'] },
    { name:'工兵第54工兵群',      corps:'八軍團', type:'roc_engineer', c:15, r:15, xp:0.18 },
    { name:'防空飛彈第三群（愛國者）', corps:'空軍防砲', type:'roc_aa', c:15, r:17, xp:0.28, equip:['pac3mse'] },

    /* ---- 海軍陸戰隊 ---- */
    { name:'陸戰第66旅',         corps:'陸戰隊', type:'roc_marine',   c:15, r:17, xp:0.32, equip:['tow2b'] },
    { name:'陸戰第99旅',         corps:'陸戰隊', type:'roc_marine',   c:14, r:18, xp:0.30, equip:['tow2b'] },

    /* ---- 花東防衛指揮部 ---- */
    { name:'步兵第109旅',        corps:'花防部', type:'roc_combined', c:21, r:10, xp:0.18 },
    { name:'台東守備隊',         corps:'花防部', type:'roc_garrison', c:20, r:16, xp:0.14 },

    /* ---- 特種作戰、外島 ---- */
    { name:'航特部 特戰第一旅',   corps:'航特部', type:'roc_sf',       c:17, r:7,  xp:0.45, equip:['javelin'] },
    { name:'航特部 特戰第二旅',   corps:'航特部', type:'roc_sf',       c:18, r:14, xp:0.42, equip:['javelin'] },
    { name:'澎湖防衛指揮部',      corps:'澎防部', type:'roc_garrison', c:10, r:14, xp:0.25 },
    { name:'金門防衛指揮部',      corps:'金防部', type:'roc_garrison', c:5,  r:13, xp:0.28 },
    { name:'馬祖防衛指揮部',      corps:'馬防部', type:'roc_garrison', c:3,  r:5,  xp:0.26 },
    /* 海龍蛙兵本來就駐在外島——這是對岸動手時唯一構得著的攻勢兵力 */
    { name:'海龍蛙兵中隊',        corps:'金防部', type:'roc_sf',       c:5,  r:13, xp:0.40 },
    { name:'馬祖蛙人分隊',        corps:'馬防部', type:'roc_sf',       c:3,  r:5,  xp:0.35 },

    /* ---- 海軍海鋒大隊（岸置反艦飛彈） ---- */
    { name:'海鋒大隊 北部分隊',   corps:'海鋒',  type:'roc_ssm',      c:14, r:6,  xp:0.30, equip:['hf2'] },
    { name:'海鋒大隊 中部分隊',   corps:'海鋒',  type:'roc_ssm',      c:15, r:12, xp:0.30, equip:['hf3'] },
    { name:'海鋒大隊 南部分隊',   corps:'海鋒',  type:'roc_ssm',      c:16, r:18, xp:0.30, equip:['hf2'] }
  ],

  air: [
    { name:'第401戰術戰鬥機聯隊', ac:'f16v',   n:52, base:'花蓮佳山',   mission:'cap' },
    { name:'第499戰術戰鬥機聯隊', ac:'mirage', n:48, base:'新竹基地',   mission:'cap' },
    { name:'第443戰術戰鬥機聯隊', ac:'idf',    n:50, base:'台南基地',   mission:'cap' },
    { name:'第427戰術戰鬥機聯隊', ac:'idf',    n:48, base:'清泉崗基地', mission:'cas' },
    { name:'第455戰術戰鬥機聯隊', ac:'f16v',   n:50, base:'嘉義基地',   mission:'ashm' },
    { name:'第737戰術戰鬥機聯隊', ac:'f16bk70',n:44, base:'台東志航',   mission:'cap' },
    { name:'第439混合聯隊',       ac:'f5e',    n:26, base:'岡山基地',   mission:'rest' },
    { name:'空軍預警機中隊',      ac:'e2k',    n:6,  base:'屏東基地',   mission:'cap' },
    { name:'反潛航空大隊',        ac:'p3c',    n:12, base:'屏東基地',   mission:'ashm' },
    { name:'陸航601／602／603旅', ac:'rocheli',n:60, base:'桃園機場',   mission:'cas' }
  ],

  navy: [
    { name:'一二四艦隊（基隆級）', c:21, r:4,  mission:'patrol',
      ships:[['kidd',4]] },
    { name:'一四六艦隊（康定級）', c:22, r:8,  mission:'escort',
      ships:[['kangding',6]] },
    { name:'一三一艦隊（成功級）', c:11, r:18, mission:'strike',
      ships:[['chengkung',6],['chiyang',3]] },
    { name:'一二九／一三一快艇隊', c:11, r:13, mission:'strike',
      ships:[['tuochiang',6],['kh6',12]] },
    { name:'二五六戰隊（潛艦）',   c:9,  r:9,  mission:'strike',
      ships:[['hailung',2],['haikun',1]] },
    /* 布雷艦隊母港在左營。以前開局擺在海峽正中間，第二回合就被共軍打到剩 1 點 */
    { name:'一九二艦隊（布雷）',   c:13, r:17, mission:'patrol',
      ships:[['rocmine',6],['yushan',1]] }
  ],

  /* 戰時後備動員：每回合按 RESERVE_PER_TURN 產出，從這個名單依序徵集 */
  /* 後備動員名單。戰役長度決定會用到前面幾筆（一個月 18 筆，三個月 54 筆）。
     前 18 筆是第一波動員，越後面的部隊素質與裝備越差，但人是實實在在的。 */
  reservePool: [
    ['步兵第102旅', 15, 3],  ['步兵第104旅', 14, 4],  ['步兵第108旅', 14, 6],
    ['步兵第117旅', 15, 8],  ['步兵第118旅', 15, 11], ['步兵第127旅', 15, 14],
    ['步兵第152旅', 15, 16], ['步兵第153旅', 15, 17], ['步兵第157旅', 16, 19],
    ['步兵第176旅', 13, 3],  ['步兵第178旅', 14, 5],  ['步兵第192旅', 14, 8],
    ['步兵第200旅', 15, 4],  ['步兵第212旅', 15, 9],  ['步兵第214旅', 14, 11],
    ['步兵第226旅', 15, 15], ['步兵第249旅', 15, 18], ['步兵第302旅', 21, 10],

    ['步兵第103旅', 15, 3],  ['步兵第106旅', 14, 4],  ['步兵第109旅', 14, 6],
    ['步兵第112旅', 15, 8],  ['步兵第116旅', 15, 11], ['步兵第119旅', 15, 14],
    ['步兵第124旅', 15, 16], ['步兵第131旅', 16, 17], ['步兵第143旅', 16, 19],
    ['步兵第146旅', 13, 3],  ['步兵第148旅', 14, 5],  ['步兵第151旅', 14, 8],
    ['步兵第158旅', 15, 4],  ['步兵第166旅', 15, 9],  ['步兵第172旅', 14, 11],
    ['步兵第182旅', 15, 15], ['步兵第196旅', 15, 18], ['步兵第218旅', 21, 10],

    ['步兵第232旅', 20, 16], ['步兵第244旅', 15, 3],  ['步兵第256旅', 15, 17],
    ['民防第一總隊', 15, 8], ['民防第二總隊', 15, 17], ['民防第三總隊', 15, 3],
    ['民防第四總隊', 15, 11], ['民防第五總隊', 15, 16], ['民防第六總隊', 14, 4],
    ['民防第七總隊', 16, 19], ['民防第八總隊', 14, 8],  ['民防第九總隊', 21, 10],
    ['民防第十總隊', 15, 14], ['民防第十一總隊', 15, 9], ['民防第十二總隊', 14, 6],
    ['民防第十三總隊', 15, 4], ['民防第十四總隊', 16, 17], ['民防第十五總隊', 13, 3],

    /* 長戰役＋低難度才抽得到：全面動員之後的第二、三梯次。 */
    ['步兵第258旅', 14, 9],  ['步兵第260旅', 15, 12], ['步兵第263旅', 15, 6],
    ['步兵第266旅', 16, 18], ['步兵第271旅', 14, 15], ['步兵第275旅', 15, 10],
    ['民防第十六總隊', 15, 5],  ['民防第十七總隊', 14, 12], ['民防第十八總隊', 15, 13],
    ['民防第十九總隊', 16, 16], ['民防第二十總隊', 13, 3],  ['民防第廿一總隊', 20, 16],
    ['海巡署北部支援隊', 15, 3], ['海巡署中部支援隊', 14, 9],
    ['海巡署南部支援隊', 15, 17], ['海巡署東部支援隊', 21, 10],
    ['替代役動員大隊', 15, 8],   ['後備司令部直屬旅', 15, 4]
  ]
},

/* ======================= 中 國 人 民 解 放 軍 ======================= */
pla: {

  ground: [
    /* 第一梯隊：兩棲突擊部隊（在對岸港口待命，由登陸船團載運） */
    { name:'第73集團軍 第14兩棲合成旅', corps:'73集', type:'pla_amphib', c:2, r:13, xp:0.35, wave:1 },
    { name:'第73集團軍 第91兩棲合成旅', corps:'73集', type:'pla_amphib', c:2, r:13, xp:0.33, wave:1 },
    { name:'第72集團軍 第124兩棲合成旅',corps:'72集', type:'pla_amphib', c:2, r:11, xp:0.34, wave:1 },
    { name:'海軍陸戰隊第1旅',           corps:'海陸', type:'pla_marine', c:1, r:18, xp:0.40, wave:1 },
    { name:'海軍陸戰隊第2旅',           corps:'海陸', type:'pla_marine', c:2, r:11, xp:0.38, wave:1 },

    /* 第二梯隊：重／中型合成旅，待港口或灘頭建立後上陸 */
    { name:'第72集團軍 第5重型合成旅',  corps:'72集', type:'pla_heavy',  c:1, r:3,  xp:0.28, wave:2 },
    { name:'第71集團軍 第160中型合成旅',corps:'71集', type:'pla_medium', c:2, r:5,  xp:0.26, wave:2 },
    { name:'第73集團軍 第145輕型合成旅',corps:'73集', type:'pla_light',  c:2, r:5,  xp:0.30, wave:2 },
    { name:'第71集團軍 第178中型合成旅',corps:'71集', type:'pla_medium', c:1, r:3,  xp:0.25, wave:2 },
    { name:'第73集團軍 砲兵旅',         corps:'73集', type:'pla_arty',   c:2, r:13, xp:0.28, wave:2 },

    /* 空降與特戰：可直接空投至我方後方 */
    { name:'空降兵軍 第127空降旅',      corps:'空降', type:'pla_abn',    c:1, r:3,  xp:0.36, wave:1, airborne:true },
    { name:'空降兵軍 第130空降旅',      corps:'空降', type:'pla_abn',    c:1, r:3,  xp:0.32, wave:2, airborne:true },
    { name:'東部戰區特種作戰旅',        corps:'特戰', type:'pla_sof',    c:2, r:5,  xp:0.50, wave:1, airborne:true },

    /* 火力支援：留在對岸，以遠程火箭砲支援渡海與灘頭 */
    { name:'遠火第一旅（PHL-16）',      corps:'火力', type:'pla_arty',   c:2, r:13, xp:0.30, static:true, range:11 },
    { name:'遠火第二旅（PHL-16）',      corps:'火力', type:'pla_arty',   c:2, r:5,  xp:0.28, static:true, range:11 },
    { name:'防空第一旅（紅旗-9B）',     corps:'防空', type:'pla_aa',     c:2, r:11, xp:0.30, static:true },

    /* 民兵：協助裝卸與後續補給 */
    { name:'福建民兵支援總隊',          corps:'民兵', type:'pla_militia',c:2, r:13, xp:0.05, wave:3 }
  ],

  air: [
    { name:'東部戰區空軍 第40航空旅', ac:'j16',   n:72, base:'福州', mission:'cap' },
    { name:'東部戰區空軍 第41航空旅', ac:'j10c',  n:84, base:'廈門', mission:'cap' },
    { name:'東部戰區空軍 第9航空旅',  ac:'j11b',  n:72, base:'泉州', mission:'cas' },
    { name:'東部戰區空軍 第78航空旅', ac:'jh7a',  n:60, base:'汕頭', mission:'ashm' },
    { name:'空軍第29航空旅（殲-20）', ac:'j20',   n:36, base:'福州', mission:'cap' },
    { name:'轟炸機第10師（轟-6K）',   ac:'h6k',   n:30, base:'福州', mission:'strike' },
    { name:'空警-500 預警機大隊',     ac:'kj500', n:8,  base:'廈門', mission:'cap' },
    { name:'陸航第5旅（直-10）',      ac:'plaheli',n:72, base:'廈門', mission:'cas' },
    { name:'運-20／運-9 空運旅',      ac:'y20',   n:30, base:'福州', mission:'rest' }
  ],

  navy: [
    { name:'第一登陸波（東海艦隊兩棲支隊）', c:4, r:12, mission:'strike',
      ships:[['t075',2],['t071',4],['t072a',8]] },
    { name:'第二登陸波（徵用民船船團）',     c:3, r:13, mission:'evade',
      ships:[['roro',10],['t072a',4]] },
    { name:'護航第一編隊',                   c:5, r:11, mission:'escort',
      ships:[['t055',2],['t052d',3],['t054a',4]] },
    { name:'護航第二編隊',                   c:5, r:16, mission:'strike',
      ships:[['t052d',3],['t054a',5],['t056a',6]] },
    { name:'潛艦支隊',                       c:9, r:7,  mission:'strike',
      ships:[['t093',2],['t039c',4]] },
    /* 佯動船團：艙是空的，專門開去「假裝要登陸」的方向，讓守軍調兵、讓飛彈打錯目標。
       名字故意取得跟真的船團一樣——在戰場上你本來就分不出來。 */
    { name:'徵用民船船團（東山港）',         c:4, r:17, mission:'evade', feint:true,
      ships:[['roro',4],['t072a',3],['t054a',1]] },
    { name:'山東艦航母戰鬥群',               c:23, r:14, mission:'strike',
      ships:[['shandong',1],['t055',1],['t052d',2],['t054a',2]] }
  ],

  /* 火箭軍：不在地圖上，以彈藥庫存的形式存在 */
  rocketForce: {
    df15b: { name:'東風-15B 短程彈道飛彈', stock:520, dmg:1.0,  accuracy:0.80 },
    df16:  { name:'東風-16 中近程彈道飛彈', stock:180, dmg:1.6,  accuracy:0.82 },
    df17:  { name:'東風-17 高超音速滑翔彈', stock:60,  dmg:1.9,  accuracy:0.88, hypersonic:true },
    cj10:  { name:'長劍-10 巡弋飛彈',       stock:240, dmg:1.2,  accuracy:0.85, cruise:true }
  },

  /* 每 AI_REINFORCE_EVERY 回合，從對岸再投入一批部隊 */
  /* 共軍後續梯隊。戰役長度決定會投入前面幾筆（一個月 12 筆，三個月 36 筆）。 */
  reinforcePool: [
    ['第71集團軍 第2合成旅',   'pla_medium'],
    ['第71集團軍 第35合成旅',  'pla_light'],
    ['第72集團軍 第10合成旅',  'pla_heavy'],
    ['第72集團軍 第85合成旅',  'pla_medium'],
    ['第73集團軍 第92合成旅',  'pla_light'],
    ['第73集團軍 第121合成旅', 'pla_medium'],
    ['海軍陸戰隊第3旅',        'pla_marine'],
    ['海軍陸戰隊第4旅',        'pla_marine'],
    ['空降兵軍 第131空降旅',   'pla_abn'],
    ['第80集團軍 第47合成旅',  'pla_heavy'],
    ['第80集團軍 第69合成旅',  'pla_medium'],
    ['第83集團軍 第58合成旅',  'pla_light'],

    ['第71集團軍 第179合成旅', 'pla_medium'],
    ['第72集團軍 第34合成旅',  'pla_light'],
    ['第73集團軍 第145合成旅', 'pla_medium'],
    ['第80集團軍 第138合成旅', 'pla_medium'],
    ['第80集團軍 第200合成旅', 'pla_heavy'],
    ['第81集團軍 第7合成旅',   'pla_heavy'],
    ['第81集團軍 第70合成旅',  'pla_medium'],
    ['第81集團軍 第162合成旅', 'pla_light'],
    ['第83集團軍 第113合成旅', 'pla_medium'],
    ['第83集團軍 第193合成旅', 'pla_light'],
    ['海軍陸戰隊第5旅',        'pla_marine'],
    ['海軍陸戰隊第6旅',        'pla_marine'],

    ['空降兵軍 第128空降旅',   'pla_abn'],
    ['空降兵軍 第133空降旅',   'pla_abn'],
    ['第74集團軍 第16合成旅',  'pla_medium'],
    ['第74集團軍 第132合成旅', 'pla_light'],
    ['第75集團軍 第32合成旅',  'pla_medium'],
    ['第75集團軍 第123合成旅', 'pla_light'],
    ['戰區直屬 砲兵第二旅',     'pla_arty'],
    ['戰區直屬 防空第二旅',     'pla_aa'],
    ['福建民兵第二總隊',        'pla_militia'],
    ['浙江民兵支援總隊',        'pla_militia'],
    ['第78集團軍 第68合成旅',  'pla_medium'],
    ['第79集團軍 第119合成旅', 'pla_light'],

    /* 長戰役＋高難度會抽到這一段：北部與中部戰區的跨區增援。
       真打起來確實會這樣調兵，不會只有東部戰區在打。 */
    ['第79集團軍 第190合成旅', 'pla_medium'],
    ['第78集團軍 第115合成旅', 'pla_light'],
    ['第77集團軍 第39合成旅',  'pla_medium'],
    ['第77集團軍 第55合成旅',  'pla_light'],
    ['第76集團軍 第17合成旅',  'pla_heavy'],
    ['第76集團軍 第56合成旅',  'pla_medium'],
    ['第82集團軍 第76合成旅',  'pla_medium'],
    ['第82集團軍 第188合成旅', 'pla_light'],
    ['第83集團軍 第129合成旅', 'pla_medium'],
    ['第81集團軍 第194合成旅', 'pla_heavy'],
    ['戰區直屬 砲兵第三旅',     'pla_arty'],
    ['戰區直屬 防空第三旅',     'pla_aa'],
    ['廣東民兵支援總隊',        'pla_militia'],
    ['江蘇民兵支援總隊',        'pla_militia'],
    ['海軍陸戰隊第7旅',        'pla_marine'],
    ['空降兵軍 第134空降旅',   'pla_abn'],
    ['第72集團軍 第5合成旅',   'pla_heavy'],
    ['第73集團軍 第14合成旅',  'pla_light'],
    ['第71集團軍 第160合成旅', 'pla_medium'],
    ['第74集團軍 第163合成旅', 'pla_light'],
    /* 超難三個月需要 58 個增援旅，池子要夠深 */
    ['第76集團軍 第62合成旅',  'pla_medium'],
    ['第77集團軍 第182合成旅', 'pla_light'],
    ['第79集團軍 第202合成旅', 'pla_heavy'],
    ['第82集團軍 第80合成旅',  'pla_medium']
  ]
}
};

/* 啟動時檢查：改過地圖之後，部隊與後備動員點有沒有被留在海上、船有沒有擱淺在陸地上。
   地圖字串一改，這裡就會在主控台（F12）用紅字告訴你哪一筆要跟著改。 */
(function validateOOB(){
  const at = (c, r) => (TW.MAP_ROWS[r] || '')[c];
  const land = (c, r) => { const t = at(c, r); return t && t !== '.'; };
  ['roc', 'pla'].forEach(side => {
    TW.OOB[side].ground.forEach(o => {
      if (!land(o.c, o.r)) console.error('部隊「' + o.name + '」(' + o.c + ',' + o.r + ') 落在海上');
    });
  });
  TW.OOB.roc.reservePool.forEach(([name, c, r]) => {
    if (!land(c, r)) console.error('後備動員點「' + name + '」(' + c + ',' + r + ') 落在海上');
  });
})();
