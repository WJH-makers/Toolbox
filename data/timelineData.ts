import type {TimelineEvent} from '~/types/timeline';

const sourceEvents: TimelineEvent[] = [
    {
        id: 'ev1',
        year: -7000,
        title: '农业的兴起',
        description: '世界各地独立发展出农业，改变人类生活方式。',
        type: 'world',
        tags: ['general', 'humanities'],
        details: '新石器革命的核心是农业和定居生活的出现，为后续文明发展奠定了基础。'
    },
    {
        id: 'ev2',
        year: -3500,
        title: '文字的出现',
        description: '苏美尔人发明楔形文字，早期文明开始记录历史。',
        type: 'world',
        tags: ['general', 'humanities', 'tech'],
        details: '文字的发明是人类进入文明时代的重要标志之一。'
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
        id: 'ev4',
        year: -551,
        title: '孔子诞生',
        description: '儒家学派创始人，对中国及东亚文化产生深远影响。',
        type: 'china',
        tags: ['general', 'humanities'],
        details: '孔子的思想核心是“仁”与“礼”。'
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
        id: 'ev6',
        year: 105,
        title: '蔡伦改进造纸术',
        description: '极大推动了知识的传播与保存。',
        type: 'china',
        tags: ['general', 'tech'],
        details: '造纸术是中国古代四大发明之一。'
    },
    {
        id: 'ev7',
        year: 618,
        title: '唐朝建立',
        description: '中国历史上国力强盛、文化繁荣的朝代。',
        type: 'china',
        tags: ['general', 'humanities'],
        details: '唐代长安是当时世界上最大的城市之一，文化交流频繁。'
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
        id: 'ev9',
        year: 1453,
        title: '古腾堡印刷机',
        description: '约翰内斯·古腾堡在欧洲发明活字印刷技术，加速信息传播。',
        type: 'world',
        tags: ['general', 'tech', 'humanities'],
        details: '推动了欧洲的文艺复兴和宗教改革。'
    },
    {
        id: 'ev10',
        year: 1492,
        title: '哥伦布到达美洲',
        description: '标志着欧洲人对新大陆的发现，开启大航海时代。',
        type: 'world',
        tags: ['general', 'humanities'],
        details: '这一事件对世界历史格局产生了巨大影响。'
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
        id: 'ev12',
        year: 1776,
        title: '美国独立',
        description: '《独立宣言》发表，美利坚合众国诞生。',
        type: 'world',
        tags: ['general', 'humanities']
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
        id: 'ev18',
        year: 1949,
        title: '中华人民共和国成立',
        description: '中国现代史的新纪元。',
        type: 'china',
        tags: ['general', 'humanities']
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
        id: 'ev22',
        year: 1989,
        title: '万维网概念提出',
        description: '蒂姆·伯纳斯-李提出万维网概念，奠定互联网基础。',
        type: 'world',
        tags: ['general', 'tech']
    },
    {
        id: 'ev23',
        year: 2001,
        title: '中国加入世界贸易组织 (WTO)',
        description: '标志着中国深度融入全球经济体系。',
        type: 'china',
        tags: ['general']
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
        description: '人工智能、气候变化、太空探索等议题持续影响世界。',
        type: 'world',
        tags: ['general', 'tech', 'humanities'],
        details: '技术飞速发展，国际合作与挑战并存。'
    },
];

export const generalTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.tags.includes('general'));
export const humanitiesTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.tags.includes('humanities'));
export const techTimelineProvider: TimelineEvent[] = sourceEvents.filter(event => event.tags.includes('tech'));
