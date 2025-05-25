import {ref} from 'vue';

const MOCK_RECIPES_STORE = [
    {
        id: '1',
        name: '经典番茄炒蛋',
        ingredients: '番茄 - 2个\n鸡蛋 - 3个\n盐 - 适量\n糖 - 少许\n葱花 - 适量',
        instructions: '1. 番茄切块，鸡蛋打散。\n2. 热锅冷油，先炒鸡蛋，凝固后盛出。\n3. 锅中再放少许油，下番茄块翻炒至出汁。\n4. 加入炒好的鸡蛋，盐，糖调味。\n5. 翻炒均匀，出锅前撒葱花。',
        category: '家常菜',
        prepTime: '10分钟',
        cookTime: '10分钟',
        isFavorite: true,
        createdAt: new Date(2024, 0, 15, 10, 0, 0)
    },
    {
        id: '2',
        name: '巧克力熔岩蛋糕',
        ingredients: '黑巧克力 - 100克\n黄油 - 50克\n鸡蛋 - 1个\n蛋黄 - 1个\n糖 - 30克\n低筋面粉 - 20克',
        instructions: '1. 巧克力和黄油隔水融化。\n2. 鸡蛋和蛋黄加糖打发至颜色变浅。\n3. 将融化的巧克力黄油液倒入蛋糊中拌匀。\n4. 筛入低筋面粉拌匀。\n5. 倒入模具，放入预热好的烤箱200°C烤8-10分钟。',
        category: '甜点',
        prepTime: '15分钟',
        cookTime: '10分钟',
        isFavorite: false,
        createdAt: new Date(2024, 1, 20, 14, 30, 0)
    },
    {
        id: '3',
        name: '蒜蓉西兰花',
        ingredients: '西兰花 - 1颗\n大蒜 - 5瓣\n盐 - 适量\n蚝油 - 1勺',
        instructions: '1. 西兰花切小块，洗净，焯水1分钟捞出。\n2. 大蒜切末。\n3. 热锅放油，爆香蒜末。\n4. 加入西兰花翻炒，加盐、蚝油调味。\n5. 翻炒均匀即可。',
        category: '素食',
        prepTime: '5分钟',
        cookTime: '5分钟',
        isFavorite: false,
        createdAt: new Date(2023, 11, 10, 12, 0, 0)
    },
];

export function useRecipes() {
    const recipes = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    const fetchRecipes = async () => {
        isLoading.value = true;
        error.value = null;
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
            recipes.value = JSON.parse(JSON.stringify(MOCK_RECIPES_STORE));
        } catch (e) {
            error.value = '获取食谱失败。';
        } finally {
            isLoading.value = false;
        }
    };

    const addRecipe = async (name, ingredients, instructions, category, prepTime, cookTime, isFavorite = false) => {
        isLoading.value = true;
        error.value = null;
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const newRecipe = {
                id: String(Date.now()),
                name,
                ingredients,
                instructions,
                category,
                prepTime,
                cookTime,
                isFavorite,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            MOCK_RECIPES_STORE.unshift(newRecipe);
            recipes.value = JSON.parse(JSON.stringify(MOCK_RECIPES_STORE));
            return newRecipe;
        } catch (e) {
            error.value = '添加食谱失败。';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteRecipe = async (id) => {
        isLoading.value = true;
        error.value = null;
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const index = MOCK_RECIPES_STORE.findIndex(r => r.id === id);
            if (index !== -1) {
                MOCK_RECIPES_STORE.splice(index, 1);
                recipes.value = JSON.parse(JSON.stringify(MOCK_RECIPES_STORE));
                return true;
            }
            return false;
        } catch (e) {
            error.value = '删除食谱失败。';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const toggleFavorite = async (item) => {
        isLoading.value = true;
        error.value = null;
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
            const recipeInStore = MOCK_RECIPES_STORE.find(r => r.id === item.id);
            if (recipeInStore) {
                recipeInStore.isFavorite = !recipeInStore.isFavorite;
                recipeInStore.updatedAt = new Date();
                recipes.value = JSON.parse(JSON.stringify(MOCK_RECIPES_STORE));
                return recipeInStore;
            }
            return null;
        } catch (e) {
            error.value = '更新收藏状态失败。';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    return {recipes, isLoading, error, fetchRecipes, addRecipe, deleteRecipe, toggleFavorite};
}