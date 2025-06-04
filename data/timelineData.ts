import type {TimelineEvent} from '~/types/timeline';

const sourceEvents: TimelineEvent[] = [
    {
        id: 'ev1',
        year: -7000,
        title: '农业的兴起',
        description: '世界各地独立发展出农业，改变人类生活方式。',
        type: 'world',
        tags: ['general', 'humanities'], // 移除 'ancient'
        details: '新石器革命的核心是农业和定居生活的出现，为后续文明发展奠定了基础。'
    },
    {
        id: 'ev2',
        year: -3500,
        title: '文字的出现',
        description: '苏美尔人发明楔形文字，早期文明开始记录历史。',
        type: 'world',
        tags: ['general', 'humanities', 'tech'], // 移除 'ancient'
        details: '文字的发明是人类进入文明时代的重要标志之一。同期埃及象形文字也在发展。'
    },
    {
        id: 'ev2_egypt',
        year: -3100,
        title: '埃及第一王朝建立',
        description: '上埃及和下埃及统一，标志着古埃及文明的开始。',
        type: 'world',
        tags: ['humanities', 'general'], // 'general' 替代 'ancient'
        details: '传说中的美尼斯（那尔迈）完成了统一。'
    },
    {
        id: 'ev_indus',
        year: -2600,
        title: '印度河流域文明繁荣期',
        description: '哈拉帕和摩亨佐-达罗等城市展现高度规划。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '拥有先进的排水系统和印章文字，但文字尚未完全解读。'
    },
    {
        id: 'ev3',
        year: -2070,
        title: '夏朝建立 (传说)',
        description: '中国史书记载的第一个世袭制王朝。',
        type: 'china',
        tags: ['general', 'humanities'],
        details: '夏朝的存在目前主要依据文献记载和考古推测，如二里头文化。'
    },
    {
        id: 'ev_babylon',
        year: -1792,
        title: '汉谟拉比法典颁布',
        description: '古巴比伦国王汉谟拉比制定的已知最早较完整的成文法典。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '法典体现了“以眼还眼，以牙还牙”的原则。'
    },
    {
        id: 'ev_shang',
        year: -1600,
        title: '商朝建立',
        description: '中国历史上第二个主要王朝，以青铜器和甲骨文闻名。',
        type: 'china',
        tags: ['humanities', 'general', 'tech'], // 青铜器和甲骨文可视为技术
        details: '殷墟的发现证实了商朝晚期的存在。'
    },
    {
        id: 'ev_minoan_crete',
        year: -1600,
        title: '米诺斯文明火山爆发',
        description: '圣托里尼火山爆发，对克里特岛的米诺斯文明造成重创。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '此事件可能与柏拉图描述的亚特兰蒂斯传说有关。'
    },
    {
        id: 'ev_zhou',
        year: -1046,
        title: '牧野之战，西周建立',
        description: '周武王伐纣，商朝灭亡，周朝建立，实行分封制和礼乐制度。',
        type: 'china',
        tags: ['humanities', 'general'],
        details: '周公旦制礼作乐，对后世影响深远。'
    },
    {
        id: 'ev_olympics',
        year: -776,
        title: '第一次有记载的古奥运会',
        description: '在古希腊奥林匹亚举行，是泛希腊运动会的一部分。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '奥运会期间通常会实行“神圣休战”。'
    },
    {
        id: 'ev4',
        year: -551,
        title: '孔子诞生',
        description: '儒家学派创始人，对中国及东亚文化产生深远影响。',
        type: 'china',
        tags: ['general', 'humanities'],
        details: '孔子的思想核心是“仁”与“礼”。'
    },
    {
        id: 'ev_buddha',
        year: -563,
        title: '释迦牟尼诞生 (大致年份)',
        description: '佛教创始人，其教义对亚洲及世界产生广泛影响。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '原名悉达多·乔达摩，在菩提树下悟道成佛。'
    },
    {
        id: 'ev_persian_wars',
        year: -490,
        title: '马拉松战役',
        description: '希波战争中的关键战役，雅典以少胜多击败波斯入侵者。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '传说菲迪皮茨跑回雅典报捷，成为马拉松长跑的起源。'
    },
    {
        id: 'ev_socrates',
        year: -399,
        title: '苏格拉底被处死',
        description: '古希腊哲学家，因“腐蚀青年”和“不敬神”被雅典法庭判处死刑。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '他的思想主要通过其弟子柏拉图的对话录流传。'
    },
    {
        id: 'ev_alexander',
        year: -323,
        title: '亚历山大大帝去世',
        description: '马其顿国王，征服了广阔的领土，促进了希腊文化的传播。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '他的帝国在他死后迅速分裂，开启了希腊化时代。'
    },
    {
        id: 'ev_qin',
        year: -221,
        title: '秦始皇统一中国',
        description: '结束春秋战国的分裂局面，建立中国历史上第一个中央集权的大一统王朝。',
        type: 'china',
        tags: ['general', 'humanities'],
        details: '推行书同文、车同轨、统一度量衡，修筑长城。'
    },
    {
        id: 'ev_han',
        year: -202,
        title: '汉朝建立',
        description: '刘邦建立汉朝，是中国历史上重要的统一王朝，奠定了汉文化的基础。',
        type: 'china',
        tags: ['humanities', 'general'],
        details: '汉武帝时期国力达到顶峰，“罢黜百家，独尊儒术”。'
    },
    {
        id: 'ev5',
        year: -4,
        title: '耶稣基督诞生 (传统年份)',
        description: '基督教创始人，对西方文明影响深远。',
        type: 'world',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev_roman_empire_peak',
        year: 117,
        title: '罗马帝国疆域达到顶峰',
        description: '在图拉真皇帝统治下，罗马帝国版图达到最大。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '罗马帝国对西方法律、语言、建筑等产生深远影响。'
    },
    {
        id: 'ev6',
        year: 105,
        title: '蔡伦改进造纸术',
        description: '极大推动了知识的传播与保存。',
        type: 'china',
        tags: ['general', 'tech'],
        details: '造纸术是中国古代四大发明之一，对世界文明进程贡献巨大。'
    },
    {
        id: 'ev_three_kingdoms',
        year: 220,
        title: '三国时期开始',
        description: '曹丕篡汉，建立魏国，中国进入魏蜀吴三国鼎立的时期。',
        type: 'china',
        tags: ['humanities', 'general'],
        details: '《三国演义》是中国四大名著之一，描述了这一时期的历史故事。'
    },
    {
        id: 'ev_constantinople',
        year: 330,
        title: '君士坦丁堡成为罗马帝国新首都',
        description: '君士坦丁大帝将罗马帝国首都迁至拜占庭，并改名为君士坦丁堡。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '成为东罗马帝国（拜占庭帝国）的中心，持续千年。'
    },
    {
        id: 'ev_fall_rome',
        year: 476,
        title: '西罗马帝国灭亡',
        description: '日耳曼将领奥多亚克废黜西罗马末代皇帝，通常被认为是欧洲中世纪的开端。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '西罗马帝国的衰落是一个漫长而复杂的过程。'
    },
    {
        id: 'ev_islam_birth',
        year: 610,
        title: '穆罕默德开始传播伊斯兰教',
        description: '伊斯兰教先知穆罕默德在麦加附近的希拉山洞首次获得启示。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '伊斯兰教的兴起对阿拉伯半岛及周边地区产生了深远影响。'
    },
    {
        id: 'ev7',
        year: 618,
        title: '唐朝建立',
        description: '中国历史上国力强盛、文化繁荣的朝代。',
        type: 'china',
        tags: ['general', 'humanities'],
        details: '唐代长安是当时世界上最大的城市之一，文化交流频繁，诗歌艺术达到顶峰。'
    },
    {
        id: 'ev_charlemagne',
        year: 800,
        title: '查理曼加冕为罗马人皇帝',
        description: '法兰克国王查理曼由教皇利奥三世加冕，象征着西欧的某种统一。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '查理曼帝国奠定了后世法国、德国和意大利部分地区的基础。'
    },
    {
        id: 'ev_printing_china',
        year: 1041,
        title: '毕昇发明活字印刷术',
        description: '中国的毕昇发明了胶泥活字印刷，是印刷史上的重要革新。',
        type: 'china',
        tags: ['tech', 'general'],
        details: '比欧洲古腾堡的金属活字印刷早约400年。'
    },
    {
        id: 'ev_norman_conquest',
        year: 1066,
        title: '诺曼征服英格兰',
        description: '诺曼底公爵威廉在黑斯廷斯战役中获胜，成为英格兰国王。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '对英国的语言、文化和政治结构产生了深远影响。'
    },
    {
        id: 'ev_magna_carta',
        year: 1215,
        title: '英国签署《大宪章》',
        description: '限制了国王的权力，确立了法律至上的原则。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '被认为是现代宪政的重要基石之一。'
    },
    {
        id: 'ev_mongol_empire',
        year: 1279,
        title: '蒙古灭南宋，元朝统一中国',
        description: '忽必烈建立元朝，蒙古帝国疆域空前广阔。',
        type: 'china',
        tags: ['humanities', 'general'],
        details: '促进了东西方文化和贸易的交流。'
    },
    {
        id: 'ev_black_death',
        year: 1347,
        title: '黑死病开始在欧洲蔓延',
        description: '鼠疫在欧洲大规模爆发，造成大量人口死亡，深刻改变了欧洲社会。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '估计造成欧洲三分之一至二分之一的人口丧生。'
    },
    {
        id: 'ev8',
        year: 1368,
        title: '明朝建立',
        description: '汉族在推翻蒙古统治后建立的统一王朝。',
        type: 'china',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev_renaissance_peak',
        year: 1450,
        title: '文艺复兴鼎盛时期',
        description: '欧洲文化艺术和思想的繁荣，代表人物如达芬奇、米开朗基罗。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '标志着从中世纪向近代的过渡。'
    },
    {
        id: 'ev9',
        year: 1453,
        title: '古腾堡印刷机',
        description: '约翰内斯·古腾堡在欧洲改良活字印刷技术，加速信息传播。',
        type: 'world',
        tags: ['general', 'tech', 'humanities'],
        details: '推动了欧洲的文艺复兴和宗教改革。'
    },
    {
        id: 'ev_fall_constantinople',
        year: 1453,
        title: '奥斯曼帝国攻陷君士坦丁堡',
        description: '拜占庭帝国灭亡，对欧洲历史和东西方贸易产生重要影响。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '许多学者逃往西欧，携带了古希腊罗马的文献，促进了文艺复兴。'
    },
    {
        id: 'ev10',
        year: 1492,
        title: '哥伦布到达美洲',
        description: '标志着欧洲人对新大陆的“发现”，开启大航海时代。',
        type: 'world',
        tags: ['general', 'humanities'],
        details: '这一事件对世界历史格局、物种交换和殖民扩张产生了巨大影响。'
    },
    {
        id: 'ev_reformation',
        year: 1517,
        title: '马丁·路德提出《九十五条论纲》',
        description: '引发欧洲宗教改革运动，导致新教的产生。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '挑战了罗马天主教会的权威。'
    },
    {
        id: 'ev_copernicus',
        year: 1543,
        title: '哥白尼发表《天体运行论》',
        description: '提出日心说，挑战了地心说，是近代科学革命的开端之一。',
        type: 'world',
        tags: ['tech', 'humanities', 'general'],
        details: '尽管遭到教会反对，但日心说逐渐被接受。'
    },
    {
        id: 'ev_galileo',
        year: 1610,
        title: '伽利略使用望远镜进行天文观测',
        description: '通过望远镜观测到木星的卫星、月球的环形山等，支持日心说。',
        type: 'world',
        tags: ['tech', 'general'],
        details: '被誉为“近代观测天文学之父”。'
    },
    {
        id: 'ev11',
        year: 1644,
        title: '清朝建立',
        description: '中国历史上最后一个帝制王朝。',
        type: 'china',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev_newton_principia',
        year: 1687,
        title: '牛顿发表《自然哲学的数学原理》',
        description: '提出万有引力定律和牛顿三运动定律，奠定了经典物理学的基础。',
        type: 'world',
        tags: ['tech', 'humanities', 'general'],
        details: '是科学史上最重要的著作之一。'
    },
    {
        id: 'ev_enlightenment',
        year: 1750,
        title: '启蒙运动鼎盛时期',
        description: '强调理性、个人权利和科学方法，代表人物如伏尔泰、卢梭、孟德斯鸠。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '深刻影响了美国独立战争和法国大革命。'
    },
    {
        id: 'ev_industrial_revolution',
        year: 1769,
        title: '第一次工业革命开始 (标志性事件)',
        description: '以蒸汽机的广泛应用为标志，机器生产取代手工生产。',
        type: 'world',
        tags: ['tech', 'humanities', 'general'],
        details: '首先在英国发生，后扩展到世界各地，深刻改变了社会结构和生产方式。'
    },
    {
        id: 'ev12',
        year: 1776,
        title: '美国独立',
        description: '《独立宣言》发表，美利坚合众国诞生。',
        type: 'world',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev_french_revolution',
        year: 1789,
        title: '法国大革命爆发',
        description: '攻占巴士底狱，推翻波旁王朝，传播自由、平等、博爱思想。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '对欧洲乃至世界历史进程产生深远影响。'
    },
    {
        id: 'ev13',
        year: 1840,
        title: '第一次鸦片战争',
        description: '清朝与英国的战争，中国近代史的开端。',
        type: 'china',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev_darwin',
        year: 1859,
        title: '达尔文发表《物种起源》',
        description: '提出生物进化论和自然选择学说，对生物学和人类思想产生革命性影响。',
        type: 'world',
        tags: ['tech', 'humanities', 'general'],
        details: '挑战了神创论，引发了广泛的社会和宗教争论。'
    },
    {
        id: 'ev_meiji_restoration',
        year: 1868,
        title: '日本明治维新开始',
        description: '日本进行了一系列改革，旨在实现现代化和工业化。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '使日本迅速崛起为东亚强国。'
    },
    {
        id: 'ev_telephone',
        year: 1876,
        title: '贝尔发明电话',
        description: '亚历山大·格雷厄姆·贝尔获得电话专利，彻底改变了远程通讯方式。',
        type: 'world',
        tags: ['tech', 'general'],
        details: '电话的商业化迅速展开。'
    },
    {
        id: 'ev_einstein_relativity',
        year: 1905,
        title: '爱因斯坦发表狭义相对论',
        description: '阿尔伯特·爱因斯坦提出狭义相对论，改变了对时间、空间和物质的传统观念。',
        type: 'world',
        tags: ['tech', 'general'], // general 因为其广泛影响
        details: '同年他还发表了关于光电效应和布朗运动的论文，被称为“奇迹年”。1915年发表广义相对论。'
    },
    {
        id: 'ev14',
        year: 1911,
        title: '辛亥革命',
        description: '推翻清朝统治，结束中国两千多年的帝制。',
        type: 'china',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev15',
        year: 1914,
        title: '第一次世界大战爆发',
        description: '一场波及全球主要大国的战争。',
        type: 'world',
        tags: ['general']
    },
    {
        id: 'ev_russian_revolution',
        year: 1917,
        title: '俄国十月革命',
        description: '布尔什维克党推翻临时政府，建立苏维埃政权，诞生了世界上第一个社会主义国家。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '对20世纪世界格局产生了深远影响。'
    },
    {
        id: 'ev_penicillin',
        year: 1928,
        title: '弗莱明发现青霉素',
        description: '亚历山大·弗莱明意外发现青霉素的抗菌作用，开启了抗生素时代。',
        type: 'world',
        tags: ['tech', 'general'],
        details: '青霉素的广泛应用极大地降低了细菌感染的死亡率。'
    },
    {
        id: 'ev16',
        year: 1939,
        title: '第二次世界大战爆发',
        description: '人类历史上规模最大的全球性战争。',
        type: 'world',
        tags: ['general']
    },
    {
        id: 'ev17',
        year: 1945,
        title: '第一颗原子弹爆炸',
        description: '美国在新墨西哥州成功试验原子弹，核时代的开端。',
        type: 'world',
        tags: ['general', 'tech']
    },
    {
        id: 'ev_un_founded',
        year: 1945,
        title: '联合国成立',
        description: '旨在维护国际和平与安全，促进国际合作的全球性组织。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '取代了第一次世界大战后成立的国际联盟。'
    },
    {
        id: 'ev18',
        year: 1949,
        title: '中华人民共和国成立',
        description: '中国现代史的新纪元。',
        type: 'china',
        tags: ['general', 'humanities']
    },
    {
        id: 'ev_dna_structure',
        year: 1953,
        title: 'DNA双螺旋结构发现',
        description: '沃森和克里克提出DNA双螺旋结构模型，揭示了遗传物质的本质。',
        type: 'world',
        tags: ['tech', 'general'],
        details: '基于罗莎琳·富兰克林和莫里斯·威尔金斯的研究成果。'
    },
    {
        id: 'ev19',
        year: 1957,
        title: '第一颗人造卫星发射',
        description: '苏联发射“斯普特尼克1号”，开启太空竞赛。',
        type: 'world',
        tags: ['general', 'tech']
    },
    {
        id: 'ev20',
        year: 1969,
        title: '阿波罗11号登月',
        description: '美国宇航员首次踏上月球，人类探索宇宙的里程碑。',
        type: 'world',
        tags: ['general', 'tech']
    },
    {
        id: 'ev21',
        year: 1978,
        title: '中国改革开放',
        description: '中国开始实行对内改革、对外开放的政策。',
        type: 'china',
        tags: ['general', 'humanities', 'tech']
    },
    {
        id: 'ev_fall_berlin_wall',
        year: 1989,
        title: '柏林墙倒塌',
        description: '象征着冷战的结束和德国的重新统一。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '东欧剧变的重要事件之一。'
    },
    {
        id: 'ev22',
        year: 1989,
        title: '万维网概念提出',
        description: '蒂姆·伯纳斯-李提出万维网概念，奠定互联网基础。',
        type: 'world',
        tags: ['general', 'tech']
    },
    {
        id: 'ev_apartheid_end',
        year: 1994,
        title: '南非首次多种族大选，曼德拉当选总统',
        description: '标志着南非种族隔离制度的终结。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '纳尔逊·曼德拉为此进行了长期的斗争。'
    },
    {
        id: 'ev23',
        year: 2001,
        title: '中国加入世界贸易组织 (WTO)',
        description: '标志着中国深度融入全球经济体系。',
        type: 'china',
        tags: ['general'] // 可以考虑添加 'humanities' 或 'tech' (经济科技相关)
    },
    {
        id: 'ev_911',
        year: 2001,
        title: '9·11恐怖袭击事件',
        description: '基地组织对美国本土发动系列恐怖袭击，深刻影响国际政治。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '直接导致了美国发动“反恐战争”。'
    },
    {
        id: 'ev24',
        year: 2007,
        title: '第一代iPhone发布',
        description: '苹果公司推出iPhone，开启智能手机时代。',
        type: 'world',
        tags: ['tech', 'general']
    },
    {
        id: 'ev_arab_spring',
        year: 2010,
        title: '“阿拉伯之春”开始',
        description: '一系列在中东和北非地区爆发的反政府示威和起义。',
        type: 'world',
        tags: ['humanities', 'general'],
        details: '对该地区政治格局造成了长期影响。'
    },
    {
        id: 'ev_crispr',
        year: 2020,
        title: 'CRISPR基因编辑技术获诺贝尔奖',
        description: 'CRISPR/Cas9基因编辑技术的开发为生命科学带来革命性工具。',
        type: 'world',
        tags: ['tech', 'general'],
        details: '该技术在疾病治疗、农业改良等方面有巨大潜力，同时也引发伦理讨论。'
    },
    {
        id: 'ev25',
        year: 2020,
        title: 'COVID-19全球大流行',
        description: '新型冠状病毒对全球健康、经济和社会造成深远影响。',
        type: 'world',
        tags: ['general']
    },
    {
        id: 'ev26',
        year: 2025,
        title: '当前与未来展望',
        description: '人工智能、气候变化、太空探索、生物技术等议题持续影响世界。',
        type: 'world',
        tags: ['general', 'tech', 'humanities'],
        details: '技术飞速发展，全球化面临新挑战，可持续发展成为共同目标。'
    },
];

// Provider 逻辑保持不变，它们会根据现有的 'general', 'humanities', 'tech' 标签进行筛选
export const generalTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.tags.includes('general'));
export const humanitiesTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.tags.includes('humanities'));
export const techTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.tags.includes('tech'));

// 如果您想基于 'type' (china/world) 创建 provider，可以这样做：
export const chinaTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.type === 'china');
export const worldTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.type === 'world');