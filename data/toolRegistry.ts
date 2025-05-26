import type {Domain} from '~/components/global/QuadrantCard.vue'; // 确保此路径正确，且 Domain 类型已导出

export const allToolDomainsData: Domain[] = [
    {
        id: 'daily_life', name: '日常领域', description: '提升生活品质与效率', icon: 'ph:house-line-bold',
        tools: [
            {
                id: 'todo',
                name: '待办清单',
                usage: 250,
                description: '您的个人任务管理器，助您高效规划每一天！',
                path: '/tools/daily/todo',
                statusPreview: '查看今日任务'
            },
            {
                id: 'recipe_finder',
                name: '食谱查找',
                usage: 190,
                description: '发现美味食谱，开启烹饪灵感。',
                path: '/tools/daily/recipes',
                statusPreview: '寻找舌尖美食',
            },
            {
                id: 'BMI-calculator',
                name: 'BMI计算器',
                usage: 170,
                description: '计算您的身体质量指数，了解健康状况。',
                path: '/tools/daily/bmi',
                statusPreview: '你的健康助手',
            },
        ],
    },
    {
        id: 'finance', name: '金融领域', description: '理财规划与金融计算', icon: 'ph:bank-bold',
        tools: [
            {
                id: 'currency_converter',
                name: '汇率转换',
                usage: 280,
                description: '全球货币实时汇率查询与计算。',
                path: '/tools/finance/currency',
                statusPreview: '金融小助手',
            },
            {
                id: 'loan_calculator',
                name: '贷款计算器',
                usage: 210,
                description: '精准计算各类贷款详情与还款计划。',
                path: '/tools/finance/loan'
            },
            {
                id: 'stock_screener',
                name: '股票筛选器',
                usage: 150,
                description: '根据多种指标筛选潜力股票。',
                path: '/tools/finance/stocks'
            },
        ],
    },
    {
        id: 'learning', name: '学习领域', description: '助力知识获取与技能提升', icon: 'ph:student-bold',
        tools: [
            {
                id: 'unit_converter',
                name: '单位换算器',
                usage: 150,
                description: '快速进行长度、重量、温度、面积、体积、速度等常用物理量的单位换算。',
                path: '/tools/learning/unitconverter',
                statusPreview: '单位转换小帮手',
            },
            {
                id: 'ball_collision_sim',
                name: '小球碰撞模拟',
                usage: 120,
                description: '可视化二维弹性或非弹性小球碰撞过程，观察动量和能量守恒。',
                path: '/tools/learning/collisionsim',
                statusPreview: '探讨小球碰撞的奥秘',
            },
            {
                id: 'convex_lens_sim',
                name: '凸透镜聚焦模拟',
                usage: 110,
                description: '模拟平行光线通过凸透镜后汇聚于焦点的现象，可调整焦距。',
                path: '/tools/learning/optics-lens',
                statusPreview: '探索光学聚焦原理',
            },
            {
                id: 'math_logic_explorer',
                name: '数学与逻辑探索',
                usage: 140,
                description: '通过交互式示例学习有趣的数学概念、逻辑谜题或经典数学推理过程。',
                path: '/tools/learning/math-logic',
                statusPreview: '挑战逻辑思维',
            },
            {
                id: 'chembio_visualizer',
                name: '化学与生物一瞥',
                usage: 130,
                description: '交互式展示基础化学反应、分子结构或生物细胞结构等。',
                path: '/tools/learning/chembio',
                statusPreview: '探索微观世界',
            },
            {
                id: 'word_memorizer',
                name: '英语单词记忆',
                usage: 220,
                description: '高效记忆和背诵英语单词，支持自定义词库和多种学习模式。',
                path: '/tools/learning/word-memorizer',
                statusPreview: '开始今日单词学习',
            },
            {
                id: 'interactive_timeline',
                name: '历史时间轴',
                usage: 160,
                description: '穿梭时空，探索世界历史与中国历史长河中的重大事件、时期和人物。',
                path: '/tools/learning/timeline',
                statusPreview: '挑战逻辑思维',
            },

        ],
    },
    {
        id: 'programming', name: '编程领域', description: '开发者实用工具集', icon: 'ph:code-bold',
        tools: [
            {
                id: 'json_formatter',
                name: 'JSON格式化',
                usage: 300,
                description: '美化、校验与转换JSON数据。',
                path: '/tools/programming/json'
            },
            {
                id: 'regex_tester',
                name: '正则测试器',
                usage: 270,
                description: '在线调试与验证正则表达式。',
                path: '/tools/programming/regex'
            },
            {
                id: 'api_client',
                name: 'API客户端',
                usage: 220,
                description: '简单易用的HTTP API接口测试工具。',
                path: '/tools/programming/api-client'
            },
        ],
    },
];