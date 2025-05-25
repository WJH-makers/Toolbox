import {tmt} from "tencentcloud-sdk-nodejs";

const TmtClient = tmt.v20180321.Client;

const secretId = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;
const region = process.env.TENCENT_TRANSLATE_REGION || "ap-guangzhou";

let client;

if (secretId && secretKey) {
    const clientConfig = {
        credential: {
            secretId: secretId,
            secretKey: secretKey,
        },
        region: region,
        profile: {
            httpProfile: {
                endpoint: "tmt.tencentcloudapi.com",
            },
        },
    };
    client = new TmtClient(clientConfig);
} else {
    console.warn("警告：腾讯翻译API的 SecretId 或 SecretKey 未在环境变量中配置。翻译功能将返回原文。");
}

export async function translateText(text, sourceLang = 'auto', targetLang = 'zh') {
    const originalText = text; // 保存原始文本以备回退

    if (!client) {
        console.error("腾讯翻译客户端未初始化 (缺少密钥配置)。将返回原文。");
        return originalText;
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
        return originalText; // 如果文本无效，直接返回原文本
    }

    const params = {
        SourceText: text,
        Source: sourceLang,
        Target: targetLang,
        ProjectId: 0,
    };

    try {
        const data = await client.TextTranslate(params);
        if (data && data.TargetText) {
            return data.TargetText;
        } else {
            console.error(`腾讯翻译错误: 响应中没有 TargetText (原文: "${originalText.substring(0, 50)}...")`, data);
            return originalText; // API响应格式错误，返回原文
        }
    } catch (err) {
        console.error(`腾讯翻译API调用失败 (原文: "${originalText.substring(0, 50)}..."): Code=${err.code}, Msg=${err.message}, RequestId=${err.requestId}`);
        return originalText; // API调用失败，返回原文
    }
}