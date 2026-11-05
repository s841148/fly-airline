/* © 2026 麥麥(Cormac)的遊戲工廠 Cormac’s Game Factory — 台海防衛戰 Taiwan Strait Defense. All rights reserved. */
/* ==========================================================================
   研發項目、國家政策、外交行動
   --------------------------------------------------------------------------
   研發：花「工業點」與時間，完成後永久改變某個係數
   國策：花「政治點」立即生效，多數不可逆
   外交：花「政治點」影響國際支持度與軍援機率
   ========================================================================== */

/* ---------------- 研發樹（同時最多 3 案） ---------------- */
TW.TECH = [
  { id:'t_hardened', name:'機場洞庫與快速跑道修補', ic:34, turns:4, cat:'防護',
    desc:'加速搶修彈坑、擴建佳山與志航洞庫。降低彈道飛彈對機場的癱瘓效果。',
    eff:{ airfieldRepair:0.14, missileAirfield:-0.05 } },

  { id:'t_disperse', name:'分散式指揮管制', ic:30, turns:3, cat:'防護',
    desc:'將指管節點下放至旅級並備援衛星通信，敵方斬首打擊難以奏效。',
    eff:{ c4isr:8, missileUnit:-0.03 } },

  { id:'t_tk4', name:'天弓四型高層攔截', ic:52, turns:6, cat:'防空', req:'t_disperse',
    desc:'中科院新一代高層反飛彈系統，補上愛國者射高之上的空隙。',
    eff:{ abmIntercept:0.12 } },

  { id:'t_beachfort', name:'灘岸阻絕工事整備', ic:26, turns:3, cat:'反登陸',
    desc:'預置反登陸樁、消波塊、防坦克壕與預設射擊陣地。共軍搶灘代價大增。',
    eff:{ beachDefense:0.30 } },

  { id:'t_smartmine', name:'智慧水雷量產', ic:32, turns:4, cat:'反登陸', req:'t_beachfort',
    desc:'感應式水雷可辨識目標噸位，優先攻擊大型登陸艦。',
    eff:{ mineDamage:0.12, mineStock:60 } },

  { id:'t_swarm', name:'攻擊無人機蜂群', ic:38, turns:4, cat:'火力',
    desc:'量產低成本自殺無人機，以數量飽和攻擊灘頭與搶灘中的舟波。',
    eff:{ soft:4, ashm:5 } },

  { id:'t_precision', name:'精準彈藥增產', ic:30, turns:3, cat:'火力',
    desc:'擴大中科院與漢翔產線，提高戰時彈藥續航。',
    eff:{ ammo:0.25, ashm:4 } },

  { id:'t_ew', name:'電子戰與衛星導航抗干擾', ic:36, turns:4, cat:'電戰',
    desc:'強化抗干擾接收機與電子反反制，敵方飛彈精度下降。',
    eff:{ ew:12, enemyAccuracy:-0.08 } },

  { id:'t_urban', name:'城鎮持久防衛準則', ic:22, turns:3, cat:'準則',
    desc:'把每座西部城鎮變成一個要塞：預置彈藥、通道爆破、反裝甲小組編組。',
    eff:{ urbanDefense:0.35 } },

  { id:'t_mobilize', name:'後備動員效率改革', ic:24, turns:3, cat:'準則',
    desc:'縮短動員期程、預劃裝備分配，後備旅報到速度與素質提升。',
    eff:{ reserveRate:0.5, reserveOrg:8 } },

  { id:'t_sub', name:'潛艦國造後續艦', ic:60, turns:8, cat:'海軍', req:'t_precision',
    desc:'海鯤級後續艦提前服役。潛艦是共軍船團最難防範的威脅。',
    eff:{ newSub:1 } },

  { id:'t_asymmetric', name:'不對稱作戰整體規劃', ic:44, turns:5, cat:'準則', req:'t_swarm',
    desc:'資源全面轉向小型、機動、大量、廉價的載台，放棄少數昂貴平台的存活迷思。',
    eff:{ soft:3, ashm:6, aidChance:0.05, intl:5 } }
];

/* ---------------- 國家政策（花政治點） ----------------
   cat  : 分類，只影響介面上的分組
   once : 只能實施一次（預設就是）
   req  : 需要先實施哪一條
   group: 同一組只能擇一，選了就不能改
   ------------------------------------------------------ */
TW.POLICIES = [

  /* ===================== 動員 ===================== */
  { id:'p_mobilize', name:'發布全民防衛動員令', pp:12, once:true, cat:'動員',
    desc:'依《全民防衛動員準備法》全面動員後備軍人與民防體系。',
    eff:{ reserveRate:0.6, ic:6, will:-4 },
    flavor:'動員令一下，兵役署系統湧入數十萬份召集令。街上開始出現穿著舊迷彩的中年人。' },

  { id:'p_reserve2', name:'延長教召與青年戰鬥訓練', pp:9, once:true, cat:'動員', req:'p_mobilize',
    desc:'把教召從五天延長為十四天，並把民間戰鬥訓練納入編管。' +
         '後備旅報到得更快、素質也不再是「拿過槍而已」。',
    eff:{ reserveRate:0.35, reserveOrg:6, manpower:40, will:-3 },
    flavor:'體育館改成訓練場，週末的隊伍排到馬路上。教官是去年才退伍的下士。' },

  { id:'p_volunteer', name:'開放外籍志願人員從軍', pp:8, once:true, cat:'動員',
    desc:'比照國際義勇旅模式，開放具軍事專長的外籍志願者入列。' +
         '人數不多，但每一個在鏡頭前的外國面孔都是國際支持的實體證據。',
    eff:{ intl:10, manpower:15, will:3 },
    flavor:'第一批三十七人在桃園入境。其中十一個人的護照上，蓋滿了另一場戰爭的出入境章。' },

  { id:'p_martial', name:'宣告戒嚴', pp:10, once:true, cat:'動員', req:'p_mobilize',
    desc:'管制交通、徵用車輛、實施燈火與通信管制。行政效率提升，但民心受壓。',
    eff:{ supplyRange:1, will:-6, ic:4 },
    flavor:'三十八年後，戒嚴令再次貼上市政府外牆。這一次，沒有人抗議。' },

  /* ===================== 後方 ===================== */
  { id:'p_budget', name:'國防特別預算追加', pp:14, once:true, cat:'後方',
    desc:'立法院三讀通過特別條例，追加軍費並開放緊急採購。',
    eff:{ ic:12 },
    flavor:'表決結果出來的時候，議場外的防空警報正好響起。' },

  { id:'p_finance', name:'金融管制與股匯市休市', pp:7, once:true, cat:'後方',
    desc:'央行與金管會啟動應變：股匯市休市、限制資本外逃、匯回海外資產。' +
         '資金留在島內就能換成產能，代價是民間的恐慌。',
    eff:{ ic:9, intl:-2, will:-3 },
    flavor:'新台幣在休市前最後十分鐘貶了三塊。央行總裁的記者會只講了兩句話就結束。' },

  { id:'p_ration', name:'能源配給與戰備儲油釋出', pp:8, once:true, cat:'後方',
    desc:'依《石油管理法》釋出安全存量，民生用電與加油全面配給，' +
         '把剩下的燃料優先留給軍工產線與發電機組。',
    eff:{ ic:6, powerResist:0.15, will:-5 },
    flavor:'加油站前的隊伍從清晨排到中午，每輛車限加二十公升。有人在車陣裡發礦泉水。' },

  { id:'p_grid', name:'電網孤島化與關鍵設施防護', pp:11, once:true, cat:'後方',
    desc:'台電把南北縱貫的主幹切成數個可獨立運轉的區塊，' +
         '重要變電所加裝掩體與備援機組。機組被打掉，電網不會整條垮。',
    eff:{ powerResist:0.32, ic:-3 },
    flavor:'調度中心把全台切成七塊。「以後打掉一塊，就只黑一塊。」' },

  { id:'p_indust', name:'科技業戰時轉產', pp:12, once:true, cat:'後方', req:'p_budget',
    desc:'把無人機、電子零件與精密加工的民間產能整批徵用轉產。' +
         '台灣真正的戰略資產不是飛彈庫，是這些產線。',
    eff:{ ic:10, soft:3, recon:2 },
    flavor:'第一批三千架四軸機從嘉義出廠。機身上還留著原本要出口的英文標籤。' },

  { id:'p_shipping', name:'徵用民間航運與港埠', pp:7, once:true, cat:'後方',
    desc:'徵用長榮、陽明船隊與東部港口，維持外援輸入。',
    eff:{ aidDelivery:-1, supplyRange:1 },
    flavor:'花蓮港的貨櫃橋式機二十四小時不停。卸下來的不是貨櫃，是彈藥箱。' },

  { id:'p_pilots', name:'召回退役飛行員與技勤', pp:9, once:true, cat:'後方',
    desc:'召回近五年退役的飛行員與維修士官，提高妥善率與出動架次。',
    eff:{ sortieRate:0.10 },
    flavor:'有人是從航空公司的駕駛艙直接被叫回基地的。' },

  { id:'p_medic', name:'戰傷救護體系動員', pp:7, once:true, cat:'後方',
    desc:'醫學中心轉為戰傷收治、開設前進外科小組、全民普及止血訓練。' +
         '同樣的傷亡數字，救得回來的人多了，撐下去的理由也多了。',
    eff:{ willGuard:0.20, will:4 },
    flavor:'急診室外牆用紅漆寫了一個大大的「傷」字。分流的護理師手上沒有停過。' },

  /* ===================== 國安 ===================== */
  { id:'p_counter', name:'反滲透大清查', pp:10, once:true, cat:'國安',
    desc:'依《反滲透法》與國安五法全面清查協力網絡、金流與通訊。' +
         '破壞活動會少很多，但過程一定會傷到無辜的人，國際上也不會好看。',
    eff:{ counterInfil:0.55, will:3, intl:-3 },
    flavor:'調查局同一個上午在十一個縣市同步搜索。晚間新聞播的是被帶走的里長。' },

  { id:'p_info', name:'戰時新聞應變與假訊息反制', pp:6, once:true, cat:'國安',
    desc:'統一戰情發布、即時澄清假訊息、封鎖境外內容農場。' +
         '認知作戰打的是「你們撐不住了」這六個字——不反制，它會自己變成事實。',
    eff:{ will:7, intl:3, counterInfil:0.15 },
    flavor:'「總統已經搭機離境」的假消息在四十分鐘內被轉了七十萬次。反制花了三小時。' },

  { id:'p_capital', name:'中樞疏散與戰時指揮所', pp:9, once:true, cat:'國安',
    desc:'元首與統帥機構進駐衡山、佳山等地下指揮所，各部會分散至中部與東部。' +
         '斬首打擊失去了目標，但政府看起來像是跑了。',
    eff:{ c4isr:6, missileUnit:-0.04, will:-2 },
    flavor:'總統府的燈全亮著，裡面一個人也沒有。真正的作戰室在山裡面。' },

  { id:'p_evac', name:'西部沿海平民疏散', pp:8, once:true, cat:'國安',
    desc:'將紅色海灘後方鄉鎮居民往山區疏散，減少附帶傷亡並淨空戰場。',
    eff:{ urbanDefense:0.15, intl:8, willGuard:0.10, ic:-4 },
    flavor:'國道往東的車陣排了四十公里。國際媒體的鏡頭全對著這些人。' },

  /* ===================== 對外 ===================== */
  { id:'p_cable', name:'海底電纜與低軌衛星備援', pp:10, once:true, cat:'對外',
    desc:'在全台布設低軌衛星地面接收站，把指管與對外通信從海纜移開。' +
         '海纜一定會被切斷——問題只在斷了以後我們還看不看得見。',
    eff:{ c4isr:7, recon:3 },
    flavor:'馬祖的經驗寫在計畫書第一頁：兩條纜線，斷了五十六天。' },

  { id:'p_host', name:'開放盟軍使用東部港口與機場', pp:11, once:true, cat:'對外',
    desc:'開放花蓮、台東與蘇澳供盟軍後勤機與運輸艦起降靠泊。' +
         '軍援管道實質打開，但這一步跨過去就收不回來了。',
    eff:{ aidChance:0.07, intl:5, will:-3 },
    flavor:'第一架落地的是一架灰色的 C-17，機身上沒有任何標誌。' },

  /* ===================== 作戰準則：三擇一 ===================== */
  { id:'d_beach', name:'準則：灘岸決戰', pp:10, group:'doctrine', cat:'準則',
    desc:'把主力擺在灘頭，不讓共軍站穩腳跟。搶灘時我方戰力大增，但一旦被突破就沒有第二道防線。',
    eff:{ beachDefense:0.35, depthDefense:-0.15 },
    flavor:'「敵人的第一雙腳踏上沙灘的那一刻，就是他最脆弱的時候。」' },

  { id:'d_depth', name:'準則：縱深持久', pp:10, group:'doctrine', cat:'準則',
    desc:'放棄灘頭決戰，以城鎮與丘陵層層消耗。撐得久、國際支持累積快，但西部會被打爛。',
    eff:{ urbanDefense:0.25, depthDefense:0.25, beachDefense:-0.20, intlPerTurn:0.5 },
    flavor:'「我們不需要贏第一天。我們只需要讓他們贏不了第三十天。」' },

  { id:'d_strike', name:'準則：源頭打擊', pp:12, group:'doctrine', cat:'準則',
    desc:'把有限的精準彈藥拿去打對岸的集結港、機場與指揮節點，' +
         '在他們上船之前就先減量。代價是彈藥消耗得更快、灘頭留不住預備隊，' +
         '而且國際上會有人說這是升高衝突。',
    eff:{ ashm:6, soft:3, plaWill:-5, ammo:-0.15, beachDefense:-0.10, intl:-5 },
    flavor:'「等他們上岸再打，已經太晚了。船在碼頭邊的時候，一枚飛彈換一個營。」' }
];

/* ---------------- 外交行動（可重複執行） ---------------- */
TW.DIPLOMACY = [
  { id:'dp_un', name:'向聯合國安理會提出控訴', pp:5, cd:4,
    desc:'雖然會被否決，但議程本身就是國際輿論的槓桿。',
    eff:{ intl:6 } },

  { id:'dp_media', name:'開放國際媒體隨軍採訪', pp:4, cd:3,
    desc:'讓世界看見平民傷亡與防衛決心。提高國際支持，但暴露部署。',
    eff:{ intl:9, recon:-2 } },

  { id:'dp_us', name:'向美方緊急提出軍援清單', pp:8, cd:3,
    desc:'透過 AIT 管道遞交緊急需求清單，提高軍援觸發機率。',
    eff:{ aidChance:0.08 } },

  { id:'dp_ammo', name:'緊急彈藥採購（總統撥交權）', pp:7, cd:4,
    desc:'動用美方總統撥交權，從駐日、關島的預置庫存直接空運砲彈與火箭彈。'
        + '這是彈藥見底時唯一來得及的辦法。',
    eff:{ ammoFill:34 } },

  { id:'dp_jp', name:'請求日本開放後勤中繼', pp:7, cd:5,
    desc:'借道與那國、石垣建立空運中繼，縮短軍援抵達時間。',
    eff:{ aidDelivery:-1, intl:4 } },

  { id:'dp_eu', name:'爭取歐盟與G7聯合聲明', pp:6, cd:4,
    desc:'推動制裁與譴責聲明，加大對岸的政治成本。',
    eff:{ intl:7, plaWill:-3 } },

  { id:'dp_semi', name:'半導體供應鏈警訊', pp:9, cd:6,
    desc:'公開說明台海封鎖對全球晶片供應的衝擊，逼各國表態。',
    eff:{ intl:12, ic:-3 } }
];
