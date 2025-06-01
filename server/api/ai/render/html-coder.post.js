import {createError, defineEventHandler, readBody} from 'h3';
import OpenAI from 'openai';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL;

let openaiInstance;
if (DEEPSEEK_API_KEY && DEEPSEEK_BASE_URL) {
    openaiInstance = new OpenAI({baseURL: DEEPSEEK_BASE_URL, apiKey: DEEPSEEK_API_KEY});
}

export default defineEventHandler(async (event) => {
    if (!openaiInstance) {
        throw createError({
            statusCode: 503,
            statusMessage: 'AI Service Not Configured',
            message: 'AI代码补全服务当前未正确配置或不可用。请检查服务器端环境变量。',
        });
    }

    const body = await readBody(event);
    const currentCode = body.code || '';
    let instruction = body.instruction || '请分析并补全或优化以下HTML/CSS/JS代码。';

    const aiCommentRegex = /<!--\s*AI:\s*([^\]]+)\s*-->/im;
    const cssJsCommentRegex = /\/\*\s*AI:\s*([^*]+)\s*\*\//im;
    let specificInstructionFound = false;
    let matchedComment = '';

    const htmlMatch = currentCode.match(aiCommentRegex);
    if (htmlMatch?.[1]) {
        instruction = htmlMatch[1].trim();
        matchedComment = htmlMatch[0];
        specificInstructionFound = true;
    } else {
        const cssJsMatch = currentCode.match(cssJsCommentRegex);
        if (cssJsMatch?.[1]) {
            instruction = cssJsMatch[1].trim();
            matchedComment = cssJsMatch[0];
            specificInstructionFound = true;
        }
    }

    if (body.instruction?.trim()) {
        instruction = body.instruction.trim();
        specificInstructionFound = true;
    }
    const systemPrompt = `你是一位经验丰富的Web前端开发专家AI助手，精通HTML、CSS和JavaScript。你的任务是根据用户提供的现有代码和指令，帮助用户生成、补全或修改前端代码。
核心要求：
1. **理解意图**：仔细分析用户的指令和现有代码上下文。
2. **代码质量**：生成的代码应力求简洁、高效、符合现代Web标准，并具有良好的可读性。
3. **整合性**：如果是在现有代码基础上修改或添加，确保新代码能与原有代码流畅整合。
4. **仅输出代码**：你的回复必须**仅包含**所请求或修改后的**纯代码块** (HTML, CSS, JavaScript)。
5. **占位符处理**：如果用户的代码中包含AI指令占位符（如 \`<!-- AI: [指令] -->\` 或 \`/* AI: [指令] */\`），并且当前任务与之相关，请优先处理该占位符指定的任务，并用生成的代码**替换掉整个占位符注释**。
用户提供的指令是：“${instruction}”
用户提供的现有代码如下：
\`\`\`html
${currentCode}
\`\`\`
请根据上述指令和代码，生成并返回处理后的完整代码块。`;
    const messagesForApi = [
        {role: 'system', content: systemPrompt},
        {role: 'user', content: `请根据系统提示中的指令和现有代码，开始生成或修改代码。指令是：“${instruction}”。`},
    ];
    try {
        const completion = await openaiInstance.chat.completions.create({
            messages: messagesForApi,
            model: 'deepseek-chat',
            temperature: 0.3,
            max_tokens: 2048,
        });
        let aiGeneratedCode = completion.choices[0]?.message?.content?.trim() || '';
        if (aiGeneratedCode.startsWith('```html')) {
            aiGeneratedCode = aiGeneratedCode.substring(7).trim();
        } else if (aiGeneratedCode.startsWith('```')) {
            aiGeneratedCode = aiGeneratedCode.substring(3).trim();
        }
        if (aiGeneratedCode.endsWith('```')) {
            aiGeneratedCode = aiGeneratedCode.substring(0, aiGeneratedCode.length - 3).trim();
        }
        if (specificInstructionFound && matchedComment && aiGeneratedCode && !currentCode.includes(aiGeneratedCode)) {
            aiGeneratedCode = currentCode.replace(matchedComment, aiGeneratedCode);
        }
        return {completedCode: aiGeneratedCode};
    } catch (error) {
        let errorMessage = 'AI代码补全服务发生错误。';
        let errorStatusCode = 500;
        if (error instanceof OpenAI.APIError) {
            errorMessage = `AI服务接口错误: ${error.message} (状态码: ${error.status})`;
            errorStatusCode = error.status || 500;
        } else {
            errorMessage = error.message || errorMessage;
        }
        throw createError({
            statusCode: errorStatusCode,
            statusMessage: 'AI Service Error',
            message: errorMessage,
            data: {type: error.constructor.name},
        });
    }
});