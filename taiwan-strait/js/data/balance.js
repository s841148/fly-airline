/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   ★★★ 數 值 調 整 區 ★★★
   --------------------------------------------------------------------------
   整個遊戲的平衡數字都集中在這裡。想讓遊戲變難、變簡單、變快、變慢，
   先只改這個檔案的數字，其他程式碼都不用動。改完存檔，回瀏覽器按 F5。
   ========================================================================== */

window.TW = window.TW || {};

TW.B = {

  /* ---------- 時間 ---------- */
  HOURS_PER_TURN: 12,        // 一回合代表幾小時（改成 24 會讓戰役節奏變快一倍）
  MAX_TURNS: 60,             // 由開場選的戰役長度決定，見檔案最下面的 TW.setCampaign()

  /* ---------- 地圖 ---------- */
  MAP_W: 26,                 // 地圖有幾欄（改了就要一起改 terrain.js 的地圖字串）
  MAP_H: 27,                 // 地圖有幾列
  HEX_KM: 15,                // 一格代表幾公里（也用來把艦艇節數換算成格數）
  KNOT_KM: 1.852,            // 一節 = 每小時 1.852 公里
  /* 海況對航速的影響（索引 = 海況 0～6）。
     小艇（沱江級、光華六號）浪一大就只能減速保命；大艦影響小；
     潛艦在水下，不受海況影響。 */
  SEA_SPEED_SMALL: [1, 1, 0.95, 0.8, 0.55, 0.35, 0.2],
  SEA_SPEED_LARGE: [1, 1, 1, 0.95, 0.85, 0.7, 0.55],
  HEX_R: 21,                 // 六角格半徑（畫面上的大小，改大地圖就變大）

  /* ---------- 地面戰鬥 ---------- */
  BASE_DAMAGE: 0.085,        // 基礎傷害係數（調大＝雙方死得更快）
  ORG_DAMAGE_MULT: 3.8,      // 組織度掉得比兵力快幾倍
  ORG_BREAK: 0.15,           // 組織度低於這個比例就會被擊退
  ARMOR_BONUS: 0.55,         // 裝甲值大於對方穿甲時，最多減傷多少
  PIERCE_PENALTY: 0.45,      // 打不穿敵方裝甲時，火力打折到剩多少
  TERRAIN_MAX_DEF: 1.9,      // 地形防禦加成上限
  RIVER_CROSS_PENALTY: 0.7,  // 跨海／搶灘時攻擊力打幾折
  ENTRENCH_PER_TURN: 0.12,   // 每回合原地不動增加的築壘值
  ENTRENCH_MAX: 0.6,         // 築壘上限（+60% 防禦）
  ORG_REGEN: 0.11,           // 每回合恢復的組織度（滿補給時）
  ORG_REGEN_IN_COMBAT: 0.22, // 這回合有交戰的部隊，只能回復上面數值的幾成
  HP_REGEN: 0.025,           // 每回合恢復的兵力（滿補給、在我方城市附近）

  REFIT_BONUS: 2.6,          // 下「整補」命令後，組織度與兵力回復的倍率
  AIRLIFT_RANGE: 10,         // 空機降最遠距離（格）
  AIRLIFT_CONTEST_MULT: 2.2, // 跳到敵佔區的額外損失倍率（對方在等你落地）
  AIRLIFT_LOSS: 0.14,        // 空機降的基礎損失
  AIRLIFT_ORG: 0.45,         // 落地當回合組織度剩幾成
  AIRLIFT_MIN_AIR: -0.35,    // 目的地制空權低於此值就不准起飛

  BOMBARD_DAMAGE: 0.80,      // 遠程轟擊相對於正面突擊的傷害倍率（原 0.55）。
                             // 海馬斯的 GMLRS 是 GPS 導引，圓公算誤差個位數公尺；
                             // 155 砲兵對暴露在灘頭、沒有工事的部隊殺傷力是最大的。
  BOMBARD_NAVAL: 0.60,       // 岸砲／火箭打海上舟波的倍率
  BOMBARD_ORG_COST: 7,       // 每次射擊消耗的組織度（彈藥與陣地轉移）
  COUNTER_BATTERY: 0.30,     // 射擊後被敵方反砲兵找到的機率
  BOMBARD_FALLOFF: 0.75,     // 打到最大射程時，威力衰減到剩多少（0.75 = 掉 75%）

  /* ---------- 補給 ---------- */
  SUPPLY_RANGE: 7,           // 補給從補給點最多傳幾格
  SUPPLY_DECAY: 0.11,        // 每遠一格，補給值衰減多少
  SUPPLY_MIN_COMBAT: 0.35,   // 補給低於此值，戰鬥力開始嚴重下降
  OUT_OF_SUPPLY_ORG: 0.18,   // 斷補時每回合額外掉的組織度
  OUT_OF_SUPPLY_HP: 0.03,    // 斷補時每回合額外掉的兵力
  PLA_SEALIFT_SUPPLY: 0.75,  // 共軍灘頭靠海運補給的上限（受制海權影響）

  /* ---------- 工兵阻絕爆破 ---------- */
  DEMO_TURNS: 1,             // 埋設需要幾個回合
  DEMO_ORG: 34,              // 引爆對格內每支敵軍造成的組織度打擊
  DEMO_HP: 11,               // 引爆造成的兵力損失
  DEMO_OBSTACLE: 3,          // 引爆後該格變成障礙區的回合數
  DEMO_OBSTACLE_MOVE: 2,     // 障礙區額外的機動力代價
  DEMO_AMMO: 2.6,            // 埋設一處爆破裝藥消耗的彈藥

  /* ---------- 艦艇整補 ---------- */
  NAVY_REPAIR_NAVALBASE: 0.16,  // 在軍港每回合修復多少（佔現有艦隊耐受度）
  NAVY_REPAIR_PORT: 0.08,       // 在商港的修復速率（設備沒那麼齊全）
  NAVY_REPAIR_AMMO: 1.8,        // 整補一支艦隊每回合消耗的彈藥

  /* ---------- 電網與河川 ---------- */
  RIVER_DEF: 1.30,           // 河川格的防禦加成
  RIVER_MOVE: 1,             // 通過河川格要多付的機動力
  /* ---------- 空軍轉場 ---------- */
  REBASE_TURNS: 1,           // 轉場要花幾回合（這段期間聯隊不出勤）
  BASE_CAP_AIRBASE: 110,     // 一座空軍基地能正常支撐的飛機數
  BASE_CAP_AIRPORT: 70,      // 民航機場（沒有機堡與彈藥庫）
  BASE_CAP_HARDENED: 40,     // 佳山、志航的山洞機庫額外容量
  WING_RANGE_FREE: 7,        // 駐地到作戰空域幾格以內不打折（7 格 ≈ 100 公里）
  WING_RANGE_STEP: 0.03,     // 超過之後每多一格，出勤效率少多少
  WING_RANGE_MIN: 0.7,       // 最低打到幾成
  MISSILE_CROWD_W: 150,      // 基地停越多飛機越招飛彈：權重 ×(1 + 架數 / 這個數)

  /* 高速公路：沿路移動的機動力在 terrain.js 的 TW.HIGHWAYS 裡（國道 0.5、省道 0.75） */
  HIGHWAY_SUPPLY: 0.5,       // 補給沿道路傳遞時，衰減只剩幾成（0.5 = 一半）
  HIGHWAY_SUPPLY_REACH: 0.5, // 沿道路傳一格只算走了幾格（讓補給沿國道送得更遠）
  POWER_IND_FLOOR: 0.55,     // 電廠全毀時工業產能還剩幾成（緊急發電、民間機組）
  POWER_BROWNOUT: 0.62,      // 供電率低於此值就開始限電

  /* ---------- 戰場環境：天候、海象、日夜 ---------- */
  WEATHER_CHANGE: 0.55,      // 每回合海況／能見度改變的機率
  SEA_MEAN: 2.0,             // 海況的平均值（共軍會挑季節，所以不是全年最壞的那種）
  FRONT_CHANCE: 0.05,        // 每回合有鋒面／低壓過境的機率（約五分之一的回合無法登陸）
  SEA_STATE_BLOCK: 4,        // 海況幾級以上就無法進行兩棲作業
  LIFT_SURGE: 0.30,          // 海況每好一級，共軍該回合的載運量增加多少
  NIGHT_SORTIE: 0.72,        // 夜間的出動架次係數
  NIGHT_CAS: 0.60,           // 夜間密接支援的效果

  /* ---------- 彈藥存量（全國戰備彈藥） ---------- */
  AMMO_START: 108,           // 開局存量（承平時期囤積的戰備存量）
  AMMO_MAX: 120,             // 存量上限
  AMMO_PER_IC: 0.15,         // 每點工業產能每回合補充多少（產能遠追不上高強度消耗）
  AMMO_ARTY_SHOT: 2.2,       // 一次砲兵火力任務消耗
  AMMO_GROUND_FIGHT: 0.5,    // 一場地面接戰消耗（結算當下）
  AMMO_PER_ENGAGED: 0.75,    // 每個「本回合有接戰」的旅，一整個回合的持續消耗
  AMMO_PER_ARTY_ENGAGED: 1.4,// 砲兵部隊接戰時的額外消耗（砲兵是最大宗的消耗者）
  AMMO_AIR_SORTIE: 0.012,    // 每架次出動消耗
  AMMO_NAVAL_SALVO: 1.4,     // 一次岸置反艦齊射消耗
  AMMO_LOW: 34,              // 低於此值，火力開始受限
  AMMO_CRITICAL: 13,         // 低於此值，火力嚴重受限

  /* ---------- 空戰 ---------- */
  AIR_SORTIE_RATE: 0.62,     // 每回合可出動的機隊比例（其餘在整備）
  AIR_KILL_RATE: 0.055,      // 空戰基礎擊落率
  AIR_SUP_POWER: 1.35,       // 制空權對地面戰的影響力（調大＝制空更關鍵）
  CAS_DAMAGE: 0.9,           // 密接支援對地面單位的傷害倍率
  AIRFIELD_REPAIR: 0.15,     // 機場每回合修復比例
  SEAD_EFFECT: 0.25,         // 壓制防空任務對敵防空的削弱

  /* ---------- 海戰 ---------- */
  NAVAL_HIT_RATE: 0.24,      // 反艦飛彈基礎命中率
  NAVAL_CIWS: 0.42,          // 艦上防空/近迫武器攔截率
  ASHM_DAMAGE: 26,           // 反艦飛彈單發傷害（原 18）。
                             // 雄三、魚叉的戰鬥部都是兩百公斤級，一發命中通常就讓
                             // 一艘巡防艦失去戰鬥力，原本的數值太溫和了。
  COAST_ASM_DAMAGE: 0.80,    // 岸置反艦齊射的傷害係數（原寫死 0.55）
  AIR_ASM_DAMAGE: 0.075,     // 空射反艦飛彈的傷害係數（原寫死 0.055）
  SEA_SUP_POWER: 1.25,       // 制海權對登陸與海運補給的影響力
  MINE_DAMAGE: 0.18,         // （舊的比例傷害，已不用於航經雷區；保留給事件與研發加成參考）
  /* 觸雷改成逐艘判定。一枚兩三百公斤裝藥的感應水雷在船底下爆炸，
     小船直接斷成兩截，大船也會龍骨受損失去戰鬥力。 */
  MINE_HIT_PER_SHIP: 0.12,   // 每艘船每穿過一格密度 1.0 的雷區，觸雷的機率
  MINE_SEV_SMALL: 1.00,      // 耐受度 60 以下的船，一次觸雷損失整艘的耐受度
  MINE_SEV_MID: 0.80,        // 60～99
  MINE_SEV_LARGE: 0.55,      // 100 以上（055、075、航艦這種大艦撐得住一次）
  MINE_DEPLETE_PER_HIT: 0.12,// 每觸發一枚，該格密度下降多少
  PLA_MCM_SWEEP: 0.15,       // 共軍護航編隊每回合對周圍一格雷區的掃除量
  /* 共軍護航編隊的任務是守住登陸區與船團航道的制海權，不是滿地圖追國軍軍艦。 */
  PLA_ESCORT_THREAT_RADIUS: 8,   // 國軍艦隊進到登陸灘頭幾格內，護航編隊才離開陣位去打
  PLA_ESCORT_CONVOY_RADIUS: 4,   // 或是靠近滿載船團幾格內
  /* 戰備布雷。共軍集結兩棲船團要好幾週，衛星看得到，
     國軍會在預警期先在最可能的登陸灘頭外海布雷。
     「第五縱隊」劇本是突襲，沒有預警期，所以不布。 */
  PREWAR_MINE_DENSITY: 0.6,  // 開戰時每處灘頭外海的雷區密度
  PREWAR_MINE_BEACHES: 5,    // 布幾處灘頭（挑離對岸集結港最近的）

  /* ---------- 飛彈／防空 ---------- */
  TBM_LEAK_BASE: 0.55,       // 彈道飛彈在無防空時的命中比例
  PAC3_INTERCEPT: 0.62,      // 愛國者 PAC-3 攔截率
  TK3_INTERCEPT: 0.48,       // 天弓三型攔截率
  MISSILE_AIRFIELD_DMG: 0.16,// 每波飛彈對機場的破壞
  MISSILE_PORT_DMG: 0.13,    // 每波飛彈對港口的破壞
  MISSILE_UNIT_DMG: 0.10,    // 每波飛彈對地面部隊的損傷

  /* ---------- 兩棲登陸 ---------- */
  LANDING_LOSS_BEACH: 0.16,  // 在紅色海灘登陸的基礎損失
  LANDING_LOSS_ROCK: 0.34,   // 在非灘岸強行上陸的損失
  LANDING_ORG_PENALTY: 0.55, // 上陸當回合組織度剩幾成
  AIRBORNE_LOSS: 0.28,       // 空降的基礎損失
  BEACHHEAD_SUPPLY_CAP: 4,   // 一個灘頭最多支撐幾個旅（沒有港口時）
  BEACHHEAD_PORT_CAP: 8,     // 拿下港口之後可以支撐幾個旅
  PORT_UNUSABLE: 0.55,       // 港口損壞到這個程度就卸不了重裝備。
                             // 碼頭吊車與滾裝跳板被打爛，戰車就是下不了船。
                             // 守不住就炸掉，這是各國的標準作法。

  /* ---------- 第五縱隊 ---------- */
  FIFTH_SEIZE_TURN: 1,       // 第幾回合發難
  FIFTH_SUPPLY_CUT: 2,       // 周圍幾格的補給被切斷。
                             // 半徑 4 在六角格上是 52 格，等於整個南台灣斷補，
                             // 那不是破壞，那是核彈。2 格（19 格）才是合理的規模。
  FIFTH_CUT_TURNS: 6,        // 補給切斷持續幾回合
  FIFTH_SABOTAGE_CHANCE: 0.16, // 之後每回合再次破壞的機率
  FIFTH_SABOTAGE_DMG: 0.22,  // 破壞造成的設施損壞
  FIFTH_INTL: 20,            // 裡應外合曝光後，國際支持度的跳升。
                             // 在還沒宣戰的情況下派武裝人員滲透奪取港口，
                             // 是連原本觀望的國家都很難裝作沒看到的事。
  FIFTH_PORT_DELAY: 3,       // 奪下的港口要幾回合才卸得了重裝備
                             // （滾裝船得先開過來靠泊）

  /* ---------- 特種作戰突擊 ---------- */
  RAID_RANGE: 5,             // 從外島出發能滲透多遠（格 = 75 km）。
                             // 海龍蛙兵是駐在金門的——金門離廈門最近處只有幾公里，
                             // 馬祖離福建不到二十公里。突擊從這裡出發，
                             // 不是從台灣本島橫渡整個海峽過去。
  RAID_TURNS: 1,             // 突擊需要幾回合準備
  RAID_DAMAGE: 0.30,         // 對港口／機場造成的損壞
  RAID_LIFT_HIT: 0.10,       // 對共軍海運能力的打擊
  RAID_LOSS: 0.20,           // 突擊部隊自身的損失
  RAID_FAIL_SEA: -0.35,      // 制海權低於這個值，突擊有機率失敗

  /* ---------- 縱深打擊 ---------- */
  DEEP_STRIKE_SORTIE: 0.05,  // 每打壞一座縱深機場，共軍出動率下降多少

  /* ---------- 我方兩棲作戰 ---------- */
  EMBARK_TURNS: 1,           // 裝載需要幾個回合（吊掛重裝備、車輛上塢艙）
  ROC_LAND_LOSS_HOSTILE: 0.22,  // 對敵佔灘岸強行登陸的基礎損失
  ROC_LAND_LOSS_FRIENDLY: 0.02, // 在我方控制的港口／灘岸卸載的損失
  ROC_LAND_ORG: 0.55,        // 上陸當回合組織度剩幾成

  /* ---------- 潛艦匿蹤 ---------- */
  SUB_EXPOSE_ATTACK: 2,      // 發動攻擊後會被標定幾個回合
  SUB_EXPOSE_DETECT: 1,      // 被反潛兵力抓到後會被標定幾個回合
                             // （只有一個回合：接觸很快就會斷，潛艦會轉向脫離）
  ASW_SHIP_RANGE: 2,         // 水面艦的反潛搜索半徑（格）
  ASW_DETECT_K: 320,         // 搜索強度的半飽和點。
                             // 一個六艘巡防艦的護航編隊反潛值約 150，
                             // 對上這個門檻大概三成機率抓到——這是「持續搜索
                             // 十二小時」的機率，不是「開一次聲納」的機率。
  ASW_SHALLOW: 1.55,         // 海峽水淺，潛艦在這裡好抓很多
  ASW_DEEP: 0.62,            // 東部海域水深，藏得住

  /* ---------- 反潛 ---------- */
  ASW_K: 55,                 // 反潛值的半飽和點
  ASW_MAX_DETECT: 0.80,      // 反潛做到最好也只能削掉潛艦八成的攻擊
  SUB_STEALTH: 0.35,         // 沒有反潛能力的編隊，對潛艦只能打出這麼多

  /* ---------- 反登陸：打船不打人 ---------- */
  /* 岸置反艦飛彈的射程（格，1 格 = 15 公里）。
     雄二約 150 km、魚叉約 130 km，8 格 = 120 km 是保守的取值。
     海峽最窄處只有 130 km，所以岸置反艦本來就涵蓋得到大半個海峽——
     這是台灣反登陸最重要的一件事，原本寫死 5 格（75 km）太短了。 */
  ASM_COAST_RANGE: 8,
  GAUNTLET_ASM: 0.0058,      // 每點岸置反艦火力對船團的殺傷（原 0.0042，跟著反艦傷害一起調）
  GAUNTLET_MINE: 0.10,       // 灘外雷區對船團的殺傷
  GAUNTLET_AIR: 0.30,        // 制空權對船團殺傷的加成
  GAUNTLET_SEA: 0.45,        // 制海權對船團殺傷的加成
  GAUNTLET_ESCORT: 0.75,     // 護航艦隊區域防空能攔掉多少比例
  GAUNTLET_ESCORT_K: 300,    // 防空值的半飽和點
  GAUNTLET_SUPPRESS: 0.50,   // 共軍完全制空時，岸置發射車被壓制的程度
  GAUNTLET_MAX: 0.35,        // 單一波次最多能打掉船團幾成
  LANDING_MAX_BEACHES: 2,    // 一個回合最多同時在幾處灘頭上陸
  LANDING_FLEET_RANGE: 2,    // 兩棲船團要開到灘頭幾格內才能卸載部隊
  PLA_RELOAD_TURNS: 2,       // 船團回到集結港重新裝載要幾回合。
                             // 一個合成旅的車輛、彈藥、油料吊掛上船約要一天；
                             // 以前航速慢得不合理時設 1，改成現實航速後要跟著改。
  CONVOY_WARN_RANGE: 4,      // 滿載船團接近到幾格內，雷達就發出預警
  COASTAL_RADAR_RANGE: 4,    // 岸置對海雷達涵蓋距離（格 = 60 公里）
  ABN_INTERCEPT_K: 900,      // 我方戰機攔截運輸機群的半飽和點

  /* ---------- 共軍的海運補充 ----------
     打沉運輸艦不等於贏。中國手上有數以百計的滾裝船、貨櫃輪可以徵用，
     真打起來會一批一批補上來。這條讓「打船」變成消耗戰而不是一擊定勝負。 */
  PLA_LIFT_REBUILD_TURNS: 4, // 每幾回合徵用一批新的民船
  PLA_LIFT_REBUILD_N: 3,     // 一批幾艘
  PLA_LIFT_CAP: 26,          // 徵用總量的上限（艘）

  /* ---------- 後方（生產／政治） ---------- */
  START_IC: 42,              // 開局每回合工業產能
  START_PP: 25,              // 開局政治點
  PP_PER_TURN: 2.2,          // 每回合獲得政治點
  MANPOWER: 380,             // 可動員人力（單位：千人）
  RESERVE_PER_TURN: 0.6,     // 每回合後備動員產出（後備旅／回合）
  IC_LOSS_PER_CITY: 6,       // 每丟一座主要都市損失的工業
  WILL_LOSS_PER_CITY: 7,     // 每丟一座主要都市損失的戰爭意志
  WILL_LOSS_PER_TURN_LOST: 0.35,

  /* ---------- 國際支持與軍售（本作核心） ---------- */
  INTL_START: 30,            // 開局國際支持度
  INTL_PER_TURN_HOLD: 0.9,   // 每撐住一回合增加的國際支持度
  INTL_PER_CITY_LOST: -4,    // 每丟一座主要都市的國際支持變化
  INTL_PER_PLA_LOSS: 0.006,  // 每消滅 1 點共軍兵力增加的支持度
  AID_ROLL_BASE: 0.045,       // 每回合觸發軍援事件的基礎機率
  AID_ROLL_PER_INTL: 0.0030, // 國際支持度每 1 點增加的機率
  AID_DELIVERY_TURNS: 4,     // 軍援簽署後幾回合抵達
  /* 交付「數量」也隨國際支持度走。這才是本作的核心：撐得越久、打得越好，
     外面不只是「比較可能給」，而是同一個案子一次給的批數也變多——
     烏克蘭那幾年就是這樣，第一批是幾十枚刺針，一年後是整個營的裝備。 */
  AID_QTY_INTL0: 25,         // 支持度到這裡以上，交付量才開始加碼
  AID_QTY_PER_INTL: 0.020,   // 每多 1 點支持度，交付量倍率 +2%
  AID_QTY_MAX: 3.0,          // 倍率上限
  AID_QTY_COST: 0.65,        // 加碼的部分要自付幾成經費（其餘由盟國吸收）
  US_INTERVENE_INTL: 88,     // 國際支持度到多少，美軍才可能直接介入
  US_INTERVENE_TURN: 20,     // 且至少要撐過幾回合

  /* ---------- AI ---------- */
  AI_AGGRESSION: 1.2,        // 共軍積極度（1.3 = 更兇猛，0.7 = 保守）
  AI_MISSILE_WAVES: 3,       // 開戰首日的飛彈波次
  /* ---- 共軍多方向作戰（主攻／助攻／佯動）---- */
  AI_OPS_REPLAN: 4,          // 作戰構想維持幾回合才重新檢討
  AI_SECOND_FRONT_LIFT: 8,   // 手上滿載的運量至少幾個旅，才敢另開助攻方向
  AI_SECOND_FRONT_DIST: 4,   // 助攻灘頭離主攻至少幾格（太近等於同一個登陸場）
  AI_MAIN_SHARE: 0.7,        // 主攻方向分到幾成的運量
  AI_FEINT_DIST: 5,          // 佯動方向離真正的登陸點至少幾格
  AI_FEINT_LOITER: 2,        // 佯動船團在灘外晃幾個回合才掉頭
  AI_FEINT_COOLDOWN: 3,      // 佯動船團回港後休息幾回合再出發
  AI_FEINT_REBUILD: 12,      // 佯動船團被打沉後，隔幾回合湊出新的一支
  AI_LANDING_TURN: 4,        // 共軍最早在第幾回合搶灘
  AI_REINFORCE_EVERY: 6,     // 共軍每幾回合從對岸增援一批
  AI_MIN_ODDS: 0.30,         // 共軍最低願意進攻的戰力比（調低＝更不計代價地猛攻）
  AID_COOLDOWN: 2,           // 兩次軍援事件之間至少間隔幾回合

  /* ---------- 顯示 ---------- */
  FOG_OF_WAR: true,          // 是否開啟戰爭迷霧（關掉可以看到共軍全部部署，方便測試）
  SHOW_HEX_COORD: false      // 是否在每格顯示座標（除錯用）
};


/* ==========================================================================
   戰役長度：一個月 / 兩個月 / 三個月
   --------------------------------------------------------------------------
   只改 MAX_TURNS 是不夠的。「每回合會累積的東西」如果不跟著換算，
   打三個月會變成這樣：
     ・國際支持度第 60 回合就頂到 100，後面 120 回合完全沒有進展感
     ・戰爭意志被每回合的固定扣分磨光，你什麼都沒做錯也會輸
     ・後備旅第 30 回合就全部動員完，之後再也等不到援軍

   所以這裡用兩條原則換算：
     1. 每回合的節奏不變（速率照舊，打起來手感一樣）
     2. 總量隨長度增加（打越久，雙方投入的兵力越多、人力消耗越大）
   時間門檻（例如美軍介入）則按比例往後推，維持在戰役的同一個階段。
   ========================================================================== */

TW.CAMPAIGN = {
  1: { name:'一個月',  days:30, turns:60,
       desc:'速決戰。共軍全力猛攻，你要撐住第一波，美軍大概來不及。' },
  2: { name:'兩個月',  days:60, turns:120,
       desc:'標準戰役。有時間動員與研發，也有時間被慢慢消耗。' },
  3: { name:'三個月',  days:90, turns:180,
       desc:'持久戰。國際支持累積得慢，但撐到後面美軍介入的機會最大。' }
};

/* 換算的基準值（以一個月＝60 回合為基準，不要直接改 TW.B 裡的對應項） */
TW.B._base = {
  MAX_TURNS: 60,
  INTL_PER_TURN_HOLD: 0.9,
  INTL_PER_PLA_LOSS: 0.006,
  WILL_LOSS_PER_TURN_LOST: 0.35,
  US_INTERVENE_TURN: 20,
  MANPOWER: 380,
  AID_ROLL_BASE: 0.045,
  AID_ROLL_PER_INTL: 0.0030,
  AID_QTY_PER_INTL: 0.020,
  PLA_WILL_PER_LOSS: 1.2,
  ROC_WILL_PER_LOSS: 1.4,
  RESERVE_PER_TURN: 0.6,
  RESERVE_SLICE: 18,    // 一個月的戰役會動員到幾個後備旅
  REINF_SLICE: 12       // 一個月的戰役共軍會投入幾個增援旅
};

TW.setCampaign = function(months){
  const m = Math.max(1, Math.min(3, Math.round(months) || 1));
  const b = TW.B._base;

  TW.B.CAMPAIGN_MONTHS = m;
  TW.B.MAX_TURNS = b.MAX_TURNS * m;

  /* 每回合累積 → 除以長度，讓「整場打完」的總量不會爆掉。
     但不是完全按比例除：戰役越長，守方要撐的時間越久，
     如果外援也等比例變慢就會變成不可能的任務。這裡讓長戰役
     的國際支持累積得「相對快一點」，當作對守方的補償。 */
  const slow = 1 + (m - 1) * 0.7;          // 1個月 1.0 / 2個月 1.7 / 3個月 2.4
  /* 國際支持度要照長度攤開。原本只除 slow 還是太快——三個月的仗第 62 回合
     就頂到 100，剩下三分之二都在吃滿額軍援，難度自然沒意義。 */
  const intlSlow = slow * (1 + (m - 1) * 0.45);
  TW.B.INTL_PER_TURN_HOLD      = +(b.INTL_PER_TURN_HOLD / intlSlow).toFixed(4);
  TW.B.INTL_PER_PLA_LOSS       = +(b.INTL_PER_PLA_LOSS / intlSlow).toFixed(6);
  TW.B.WILL_LOSS_PER_TURN_LOST = b.WILL_LOSS_PER_TURN_LOST / m;

  /* 美軍介入的時間門檻 → 往後推，但推得比戰役長度慢，
     否則三個月的戰役等於要自己硬撐 60 回合才等得到人。 */
  /* 介入時機要用「戰役走到幾成」來算，不是固定加幾回合。
     原本 20 / 32 / 44 換算成比例是 33% / 27% / 24%——戰役越長美軍反而來得越早，
     結果三個月的仗後面一百多回合變成走過場。改成固定落在四成二左右。 */
  TW.B.US_INTERVENE_TURN = Math.round(TW.B.MAX_TURNS * 0.42);

  /* 軍援的觸發機率 → 隨長度放慢，否則三個月的戰役會拿到三倍的軍援，
     反而變成越長越簡單。 */
  TW.B.AID_ROLL_BASE     = +(b.AID_ROLL_BASE / slow).toFixed(5);
  TW.B.AID_ROLL_PER_INTL = +(b.AID_ROLL_PER_INTL / slow).toFixed(6);

  /* 每損失一個旅要扣多少戰爭意志 → 隨長度縮小。
     不這樣做的話，長戰役裡雙方的累積損失一定會把意志磨到零，
     變成「誰先流完血誰輸」，跟打得好不好無關。 */
  TW.B.PLA_WILL_PER_LOSS = +(b.PLA_WILL_PER_LOSS / m).toFixed(3);
  TW.B.ROC_WILL_PER_LOSS = +(b.ROC_WILL_PER_LOSS / m).toFixed(3);

  /* 總量 → 隨長度增加。動員速度也會隨戰爭拖長而加快。 */
  TW.B.MANPOWER        = Math.round(b.MANPOWER * (1 + (m - 1) * 0.6));
  /* 後備「池子」隨長度變大，但「動員速率」維持不變。兩個都放大的話，
     三個月的仗會在第 30 回合就把 49 個後備旅全倒上戰線，之後人數輾壓。 */
  TW.B.RESERVE_PER_TURN = b.RESERVE_PER_TURN;
  TW.B.RESERVE_SLICE   = b.RESERVE_SLICE * m;
  TW.B.REINF_SLICE     = b.REINF_SLICE * m;

  /* 上面把 TW.B 從 _base 重算了一遍，難度是疊在這之上的，所以要再套一次。
     這樣 setCampaign 和 setDifficulty 不管誰先呼叫都不會互相蓋掉。 */
  if (TW.setDifficulty) TW.setDifficulty(TW.B.DIFFICULTY || 2);

  return m;
};

/* ==========================================================================
   開戰劇本
   --------------------------------------------------------------------------
   共軍怎麼打第一擊。這不是難度，是「戰爭以什麼形態開始」。
   ========================================================================== */
TW.SCENARIOS = {
  standard: {
    name:'聯合火力打擊', sub:'標準劇本',
    desc:'共軍以彈道飛彈與空襲開場，先癱瘓機場港口與防空陣地，' +
         '再以船團實施兩棲登陸。這是最常被推演的想定。',
    brief:'共軍東部戰區於今晨 0600 展開「聯合火力打擊」。第一波彈道飛彈已經在路上，\n' +
          '目標是我方的機場、港口、防空陣地與指揮節點。'
  },
  fifthColumn: {
    name:'第五縱隊裡應外合', sub:'港口被裡應外合奪取',
    desc:'開戰前已滲透的武裝人員與在地協力者同時發難，突襲奪取一座港口或機場，' +
         '為後續重裝部隊直接卸載打開缺口，並切斷當地國軍的補給。' +
         '灘岸決戰的前提被跳過了——你得先把門關回去。',
    brief:'開戰前潛伏的武裝人員在今晨同時發難。\n' +
          '一座港口的管制中心與油庫已經失守，共軍的滾裝船正在靠泊。\n' +
          '這不是登陸——他們是直接把重裝備開下船。',
    fifthColumn: true
  }
};

/* ==========================================================================
   難度
   --------------------------------------------------------------------------
   難度不是只把敵人的血調高，那樣只會變得無聊。這裡動的是四件真正決定
   台海防衛戰勝負的事：雙方火力、彈藥與後備的續戰力、共軍能投入多少增援、
   以及國際社會願不願意、來不來得及幫你。
   ========================================================================== */
TW.DIFFICULTY = {
  1: { name:'簡單', sub:'先熟悉操作',
       desc:'共軍火力較弱，軍援來得快，美軍也會早點下場。適合第一次玩。',
       plaFire:0.82, rocFire:1.15, aid:1.50, intervene:-5,
       rocWill:0.75, reinf:0.80, ammo:1.35, reserve:1.25, lift:0.60, mcm:0.80, mineIntel:0.0 },
  2: { name:'中等', sub:'標準劇本',
       desc:'雙方按帳面實力打。撐得住，但要會取捨。建議從這裡開始。',
       plaFire:0.94, rocFire:1.06, aid:1.15, intervene:-2,
       rocWill:0.90, reinf:0.92, ammo:1.12, reserve:1.08, lift:0.85, mcm:1.00, mineIntel:0.0 },
  3: { name:'困難', sub:'共軍準備充分',
       desc:'共軍火力更強、增援更多，軍援變慢，美軍介入的門檻往後推。',
       plaFire:1.36, rocFire:0.96, aid:0.72, intervene:5,
       rocWill:1.15, reinf:1.45, ammo:0.88, reserve:0.93, lift:2.80, mcm:1.80, mineIntel:0.5 },
  4: { name:'超難', sub:'最壞的一天',
       desc:'每一項都再往壞的方向壓一格：軍援更少、美軍更晚、共軍增援更多。' +
            '你要用最少的東西撐最久。',
       plaFire:1.42, rocFire:0.95, aid:0.55, intervene:7,
       rocWill:1.18, reinf:1.60, ammo:0.85, reserve:0.91, lift:3.20, mcm:2.50, mineIntel:0.9 }
};

/* 難度是「疊在戰役長度換算之上」的。setCampaign() 會把 TW.B 從 _base 重算，
   所以它結束時一定要再套一次難度，兩邊的呼叫順序才不會互相蓋掉。 */
TW.setDifficulty = function(level){
  const lv = Math.max(1, Math.min(4, Math.round(level) || 2));
  TW.B.DIFFICULTY = lv;
  const D = TW.DIFFICULTY[lv];

  TW.B.DIFF_PLA_FIRE = D.plaFire;
  TW.B.DIFF_ROC_FIRE = D.rocFire;

  const b = TW.B._base, m = TW.B.CAMPAIGN_MONTHS || 1;
  const slow = 1 + (m - 1) * 0.7;

  TW.B.AID_ROLL_BASE     = +(b.AID_ROLL_BASE / slow * D.aid).toFixed(5);
  TW.B.AID_ROLL_PER_INTL = +(b.AID_ROLL_PER_INTL / slow * D.aid).toFixed(6);
  /* 盟國越不情願，同一份支持度換到的批數也越少 */
  TW.B.AID_QTY_PER_INTL  = +(b.AID_QTY_PER_INTL * D.aid).toFixed(5);
  TW.B.US_INTERVENE_TURN = Math.max(4,
    Math.round(TW.B.MAX_TURNS * 0.42) + D.intervene);
  TW.B.ROC_WILL_PER_LOSS = +(b.ROC_WILL_PER_LOSS / m * D.rocWill).toFixed(3);
  TW.B.WILL_LOSS_PER_TURN_LOST = +(b.WILL_LOSS_PER_TURN_LOST / m * D.rocWill).toFixed(4);
  TW.B.REINF_SLICE       = Math.round(b.REINF_SLICE * m * D.reinf);
  TW.B.AMMO_PER_IC       = +(TW.B._baseAmmoPerIC * D.ammo).toFixed(4);
  TW.B.RESERVE_PER_TURN  = +(b.RESERVE_PER_TURN * D.reserve).toFixed(3);
  TW.B.RESERVE_SLICE     = Math.round(b.RESERVE_SLICE * m * D.reserve);
  TW.B.DIFF_LIFT         = D.lift || 1;
  /* 共軍準備得越充分：掃雷兵力投入越多，情報也越早摸清國軍戰備雷區的位置 */
  TW.B.DIFF_MCM          = D.mcm || 1;
  TW.B.DIFF_MINE_INTEL   = D.mineIntel || 0;
  /* 徵用總量的上限也要跟著難度走，不然高難度只是「補得比較快」，
     補到上限之後就沒差了。 */
  TW.B.PLA_LIFT_CAP      = Math.round(TW.B._basePlaLiftCap * (D.lift || 1));
  return lv;
};

/* AMMO_PER_IC 不歸 setCampaign 管，難度要調它就得自己留一份原始值 */
TW.B._baseAmmoPerIC = TW.B.AMMO_PER_IC;
TW.B._basePlaLiftCap = TW.B.PLA_LIFT_CAP;

TW.setCampaign(1);
TW.setDifficulty(2);     // 預設一個月，開場選單會覆寫
