import MarkdownIt from 'markdown-it';
import tm from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import 'katex/dist/katex.min.css';

const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        const langMap = { 'latex': 'tex', 'tex': 'tex' };
        lang = langMap[lang?.toLowerCase()] || lang;
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
            } catch (__) {}
        }
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
});

md.use(tm, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: {
        macros: { "\\RR": "\\mathbb{R}" },
        throwOnError: false,
        errorColor: '#cc0000'
    }
});

function smartClean(content) {
    if (!content) return '';

    // ============================================
    // 🔥 Step 1: 保护代码块（最高优先级）
    // ============================================
    const protectedBlocks = [];

    content = content.replace(/```[\s\S]*?```/g, (match) => {
        // 保护包含 documentclass 或示例代码的块
        if (match.includes('\\documentclass') ||
            match.includes('\\usepackage') ||
            match.includes('❌') ||
            match.includes('✅') ||
            match.includes('正确示例') ||
            match.includes('错误示例')) {
            const key = `__PROTECTED_${protectedBlocks.length}__`;
            protectedBlocks.push(match);
            return key;
        }
        return match;
    });

    // ============================================
    // 🔥 Step 2: 修复所有单 $ 包裹的多行块
    // ============================================
    // 简单粗暴：把 $\n 替换成 $$\n，把 \n$ 替换成 \n$$
    content = content.replace(/\$\s*\n/g, '$$\n');
    content = content.replace(/\n\s*\$/g, '\n$$');

    // ============================================
    // 🔥 Step 3: 处理裸露的数学环境
    // ============================================
    const mathEnvs = ['equation', 'align', 'gather', 'split', 'aligned', 'gathered', 'multline'];

    mathEnvs.forEach(env => {
        // 匹配 \begin{env} ... \end{env}（独立成段）
        const regex = new RegExp(`^(\\s*\\\\begin\\{${env}\\*?\\}[\\s\\S]*?\\\\end\\{${env}\\*?\\}\\s*)$`, 'gm');
        content = content.replace(regex, (match) => {
            return `\n$$\n${match.trim()}\n$$\n`;
        });
    });

    // ============================================
    // Step 4: 提取和清洗数学块
    // ============================================
    const mathBlocks = [];

    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
        const key = `__MATH_${mathBlocks.length}__`;
        mathBlocks.push(inner);
        return key;
    });

    const cleanedMathBlocks = mathBlocks.map(block => {
        let cleaned = block;

        // 移除纯注释行
        cleaned = cleaned.split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return !(trimmed.startsWith('%') && !trimmed.includes('\\'));
            })
            .join('\n');

        // KaTeX 不支持的环境
        cleaned = cleaned.replace(/\\begin\{multline\*?\}/g, '\\begin{gather}');
        cleaned = cleaned.replace(/\\end\{multline\*?\}/g, '\\end{gather}');

        // 清理多余空行
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        return cleaned.trim();
    });

    // 重新组装
    cleanedMathBlocks.forEach((block, index) => {
        const key = `__MATH_${index}__`;
        if (block) {
            content = content.replace(key, `\n$$\n${block}\n$$\n`);
        } else {
            content = content.replace(key, '');
        }
    });

    // ============================================
    // Step 5: 清理
    // ============================================
    // 清理可能的三个 $$$
    content = content.replace(/\$\$\$+/g, '$$');

    // 清理连续的空 $$
    content = content.replace(/\$\$\s*\$\$/g, '');

    // 清理多余空行
    content = content.replace(/\n{4,}/g, '\n\n\n');

    // ============================================
    // Step 6: 还原保护的代码块
    // ============================================
    protectedBlocks.forEach((block, index) => {
        const key = `__PROTECTED_${index}__`;
        content = content.replace(key, block);
    });

    return content.trim();
}

export function renderMarkdown(content) {
    if (!content) return '';
    try {
        const processed = smartClean(content);
        return md.render(processed);
    } catch (e) {
        console.error('MD Render Error:', e);
        return `<pre>${content}</pre>`;
    }
}