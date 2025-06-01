import {defineEventHandler, readMultipartFormData, createError} from 'h3';
import mammoth from 'mammoth'; // 用于解析 DOCX

const ALLOWED_MIME_TYPES = {
    'text/plain': 'txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', // .docx
    'application/msword': 'doc', // 传统 .doc (mammoth 可能部分支持)
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export default defineEventHandler(async (event) => {
    if (!event.context.auth || !event.context.auth.userId) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized', message: '用户未认证'});
    }

    const formData = await readMultipartFormData(event);
    const fileData = formData?.find(item => item.name === 'file');

    if (!fileData || !fileData.data || !fileData.filename || !fileData.type) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '未上传文件或文件数据不完整。'});
    }

    if (fileData.data.length > MAX_FILE_SIZE) {
        throw createError({
            statusCode: 413,
            statusMessage: 'Payload Too Large',
            message: `文件大小超过限制 (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB)。`
        });
    }

    const fileExtension = ALLOWED_MIME_TYPES[fileData.type];
    if (!fileExtension) {
        throw createError({
            statusCode: 415,
            statusMessage: 'Unsupported Media Type',
            message: `不支持的文件类型: ${fileData.type}。目前仅支持 TXT 和 DOCX (.doc, .docx) 文件。` // 更新提示
        });
    }

    let extractedText = '';
    const buffer = fileData.data;

    try {
        if (fileExtension === 'txt') {
            extractedText = buffer.toString('utf8');
        } else if (fileExtension === 'docx' || fileExtension === 'doc') {
            try {
                const result = await mammoth.extractRawText({buffer});
                extractedText = result.value;
            } catch (docxError) {
                extractedText = `[${fileExtension.toUpperCase()} 内容提取失败: ${docxError.message}]`;
            }
        }
        // PPTX 和其他文件类型的处理逻辑已移除
        else {
            // 此分支理论上不应到达，因为 fileExtension 已经过校验
            // 但为了健壮性，可以保留一个错误抛出
            throw new Error(`文件类型 ${fileExtension} 的解析逻辑已被移除或意外到达。`);
        }

        const MAX_EXTRACTED_TEXT_LENGTH = 20000;
        if (extractedText && extractedText.length > MAX_EXTRACTED_TEXT_LENGTH) {
            extractedText = extractedText.substring(0, MAX_EXTRACTED_TEXT_LENGTH) + `\n... [内容已截断，总长度超过 ${MAX_EXTRACTED_TEXT_LENGTH} 字符] ...`;
        }

        return {
            success: true,
            fileName: fileData.filename,
            extractedText: extractedText ? extractedText.trim() : '[未能提取到文本内容]',
        };

    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: `处理文件 "${fileData.filename}" 时发生服务器内部错误。详情: ${error.message}`,
        });
    }
});