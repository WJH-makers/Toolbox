import { marked } from 'marked';

export class LatexTransformer {
    constructor(rawText) {
        this.rawText = rawText || '';
        this.mathTokens = new Map();
        this.codeBlockTokens = new Map();
        this.tokenCounter = 0;
    }

    process() {
        if (!this.rawText) return '';
        let content = this.rawText;

        // 1. 保护 Markdown 代码块 (防止公式处理误伤代码块内的内容)
        content = this._preserveCodeBlocks(content);

        // 2. 清洗注释
        content = this._cleanComments(content);

        // 3. 保护数学公式 (提取并替换为 Token)
        content = this._tokenizeMath(content);

        // 4. 提取标题 (处理 \title, \author 等)
        content = this._extractAndInjectHeader(content);

        // 5. 转换 LaTeX 结构 (章节、加粗、列表等)
        content = this._transformStructure(content);

        // 6. 转义残留的反斜杠 (防止 Markdown 误判)
        content = content.replace(/\\(?![a-zA-Z0-9]+)/g, '\\\\');

        // 7. 恢复代码块 (在 Markdown 解析前恢复，以便 marked 正确高亮)
        content = this._restoreCodeBlocks(content);

        // 8. Markdown 解析
        marked.setOptions({ breaks: true, gfm: true });
        let html = marked.parse(content);

        // 9. 还原数学公式 (将 Token 替换回带 HTML 标签的公式)
        html = this._restoreMath(html);

        return html;
    }

    // === 1. 代码块保护 ===
    _preserveCodeBlocks(text) {
        // 匹配 ```...``` 或 `...`
        return text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
            const token = `__CODE_BLOCK_${this.tokenCounter++}__`;
            this.codeBlockTokens.set(token, match);
            return token;
        });
    }

    _restoreCodeBlocks(text) {
        this.codeBlockTokens.forEach((code, token) => {
            // 使用 split/join 替换所有出现的 token
            text = text.split(token).join(code);
        });
        return text;
    }

    // === 2. 注释清洗 ===
    _cleanComments(text) {
        // 移除以 % 开头的注释
        return text.replace(/(^|\s)%.*$/gm, '$1');
    }

    // === 3. 数学公式保护 ===
    _tokenizeMath(text) {
        const store = (latex, isDisplay) => {
            const token = `%%MJX_${this.tokenCounter++}%%`;
            this.mathTokens.set(token, { latex: latex, isDisplay });
            if (isDisplay) return `\n\n${token}\n\n`;
            return token;
        };

        // A. 块级公式 $$...$$ 或 \[...\]
        text = text.replace(/(\$\$[\s\S]*?\$\$)|(\\\[[\s\S]*?\\\])/g, m => store(m, true));

        // B. 环境 \begin{...}...\end{...}
        const mathEnvs = ['equation', 'align', 'gather', 'matrix', 'pmatrix', 'bmatrix', 'cases', 'split', 'multline'];
        const envRegex = new RegExp(`\\\\begin\\{(${mathEnvs.join('|')})\\*?\\}([\\s\\S]*?)\\\\end\\{\\1\\*?\\}`, 'g');
        text = text.replace(envRegex, m => store(m, true));

        // C. 行内公式 $...$ (排除转义 \$)
        text = text.replace(/(?<!\\)\$(?!\$)([^$\n\r]+?)(?<!\\)\$(?!\$)/g, (match, inner) => {
            if (!inner || !inner.trim()) return match;
            // 存储时带上 $ 分隔符
            return store(`$${inner}$`, false);
        });

        // D. 行内 \(...\)
        text = text.replace(/\\\([\s\S]*?\\\)/g, m => store(m, false));

        return text;
    }

    // === 4. 标题处理 ===
    _extractAndInjectHeader(text) {
        let meta = { title: '', author: '', date: '' };
        // 仅在前 1500 字符内查找头部信息
        const headerScope = text.slice(0, 1500);
        let remainder = text.slice(1500);

        const extract = (key) => {
            const re = new RegExp(`\\\\${key}\\{([^}]+)\\}`, '');
            const match = headerScope.match(re);
            if (match) {
                meta[key] = match[1];
                return headerScope.replace(re, '');
            }
            return headerScope;
        };

        let processedHeader = headerScope;
        processedHeader = extract('title');
        if (meta.title) {
            processedHeader = extract('author');
            processedHeader = extract('date');
        }
        text = processedHeader + remainder;

        if (meta.title) {
            const headerHtml = `
            <div class="doc-header text-center mb-8 border-b border-gray-200 pb-6">
              <h1 class="text-3xl font-bold mb-3 text-gray-900">${meta.title}</h1>
              <div class="flex justify-center items-center space-x-6 text-gray-500 text-sm">
                ${meta.author ? `<span class="font-medium">Author: ${meta.author}</span>` : ''}
                ${meta.date && meta.date !== '\\today' ? `<span>${meta.date}</span>` : ''}
              </div>
            </div>`;

            if (text.includes('\\maketitle')) {
                text = text.replace(/\\maketitle/, headerHtml);
            } else {
                text = headerHtml + text;
            }
        }

        // 清理 LaTeX 文档结构命令
        text = text.replace(/^\s*\\begin\{document\}\s*$/gm, '')
            .replace(/^\s*\\end\{document\}\s*$/gm, '')
            .replace(/^\s*\\documentclass.*$/gm, '')
            .replace(/^\s*\\usepackage.*$/gm, '');

        return text;
    }

    // === 5. 结构转换 ===
    _transformStructure(text) {
        // 修复C: 使用 gm 标志，并用 ^\s* 匹配行首缩进
        const rules = [
            [/^\s*\\section\*?\{([^}]*)\}/gm, '\n## $1\n'],
            [/^\s*\\subsection\*?\{([^}]*)\}/gm, '\n### $1\n'],
            [/^\s*\\subsubsection\*?\{([^}]*)\}/gm, '\n#### $1\n'],
            [/\\textbf\{([^}]+)\}/g, '**$1**'],
            [/\\textit\{([^}]+)\}/g, '*$1*'],
            [/\\texttt\{([^}]+)\}/g, '`$1`'],
            [/^\s*\\newpage/gm, '\n---\n'],
            [/\\\\/g, '  \n'], // 强制换行
            [/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/g, '![Image]($1)'],
            // 列表项 \item[label]
            [/^\s*\\item\[(.*?)\]/gm, '- **$1**: '],
        ];

        let output = text;
        rules.forEach(([regex, replacement]) => {
            output = output.replace(regex, replacement);
        });

        // 修复: 处理列表环境 (简单处理)
        const processList = (regex, markerGenerator) => {
            output = output.replace(regex, (match, content) => {
                let counter = 1;
                const items = content.replace(/^\s*\\item\s+/gm, () => markerGenerator(counter++));
                return `\n${items}\n`;
            });
        };

        // 枚举 (enumerate) -> 1.
        processList(/^\s*\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gm, (i) => `\n${i}. `);
        // 列表 (itemize) -> -
        processList(/^\s*\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gm, () => `\n- `);

        // 清理残留
        output = output.replace(/^\s*\\item\s+/gm, '- ')
            .replace(/^\s*\\begin\{(itemize|enumerate)\}/gm, '')
            .replace(/^\s*\\end\{(itemize|enumerate)\}/gm, '');

        return output;
    }

    // === 9. 还原数学公式 ===
    _restoreMath(html) {
        for (const [token, data] of this.mathTokens.entries()) {
            const { latex, isDisplay } = data;
            const rawLatex = latex;
            const tag = isDisplay ? 'div' : 'span';
            const replacement = `<${tag} class="mjx-process mjx-formula">${rawLatex}</${tag}>`;
            const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            if (isDisplay) {
                const blockRegex = new RegExp(`<p>\\s*${escapedToken}\\s*</p>`, 'g');
                if (blockRegex.test(html)) {
                    html = html.replace(blockRegex, replacement);
                } else {
                    html = html.split(token).join(replacement);
                }
            } else {
                html = html.split(token).join(replacement);
            }
        }
        return html;
    }

    _escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return str.replace(/[&<>"']/g, m => map[m]);
    }
}