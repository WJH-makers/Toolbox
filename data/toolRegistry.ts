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
                path: '/tools/finance/currency'
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
                id: 'mind_map',
                name: '思维导图',
                usage: 260,
                description: '构建清晰知识结构，激发创意。',
                path: '/tools/learning/mindmap'
            },
            {
                id: 'online_dictionary',
                name: '在线词典',
                usage: 200,
                description: '多语言词汇即时查询与释义。',
                path: '/tools/learning/dictionary'
            },
            {
                id: 'code_playground',
                name: '代码演练场',
                usage: 180,
                description: '在线练习与测试不同编程语言片段。',
                path: '/tools/learning/playground'
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