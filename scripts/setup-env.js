import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import {fileURLToPath} from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const exampleEnvPath = path.resolve(__dirname, '../.env.example');
const SCRIPT_MASTER_PASSWORD_FILE = path.resolve(__dirname, '.setup_master_password.key');

const ALGORITHM = 'aes-256-gcm';
const SCRIPT_INTERNAL_SALT = 'WJH-makers';

const PRESET_DATABASE_URL = "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFKWDJRRzA0QzQ1M1I0NEEzNTFIRVE1QjUiLCJ0ZW5hbnRfaWQiOiIxOWFlNThmNzVmOGEzMjM1MmRlZWNkYmZiOGI1YTdiYmRkMTNlN2QzZGFlMzM5YzhhM2U1NTU5NGY1MjUxNzc2IiwiaW50ZXJuYWxfc2VjcmV0IjoiNjM0ZDhjMDUtZTBjYy00M2Y2LWFlMDYtYmJiY2RkNDJlZGFmIn0.lCwJC9vmzIwI1XLbNofDHi8ZZkb1_kwgryt1_ercaDk";

const EMBEDDED_JWT_SECRET = "35abf104b5ebcae6b48a7233:6cd9f33df9821fd325e90c1cd02659ac:0cdb4e607ae7f9bc5cae9065bad1f126e72c039a6f5ccdfe7d21263b1cb82898f22d9e308a04a3df1c371f2e0ef1a6579af14f7169318df28e24c9c6b5e7c8b6";
const EMBEDDED_TENCENT_SECRET_ID = "381d5ea74b81cbbf7788a0be:1f2440900a043fa8987a7ed1136f9e2e:265784a27fd358c96b7ce0243a2ada2014c9e313143a1f38584212597";
const EMBEDDED_TENCENT_SECRET_KEY = "31bbe2f2980ff822d54a7716:74ac8716951b2e18969b357538908a49:6c8f1cb26c0737be06f1e481d3e99535ddc069cec76c12d44c353d201e23a44a";
const PRESET_TENCENT_TRANSLATE_REGION = "ap-guangzhou";
const EMBEDDED_DEEPSEEK_API_KEY = "2b8f9467cdace3bf91959968:772451bd0525394c3392ee8e80005882:298c5877a7b456b9a05cbfb424eb1ab482db8842488f9051fd7c4aa860fd15475a9124";
const PRESET_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const EMBEDDED_MAIRUI_API_LICENCE = "5d121190a55c2b3d31dee68f:e90b360085f960e4086f266760cef755:ca2129a114725caf093ebf019ecd5bd908e164578aa25193bf3c19820af751e25a383c7c";
const PRESET_MAIRUI_BASE_URL = "https://api.mairui.club";

// ==================================================================================


function deriveKey(password, salt) {
    return crypto.scryptSync(password, salt, 32);
}

function decryptForScriptDefaults(encryptedText, scriptPassword) {
    if (!scriptPassword || !encryptedText || encryptedText.startsWith("iv:tag:在此处粘贴") || encryptedText.includes("_here")) {
        return "";
    }
    try {
        const key = deriveKey(scriptPassword, SCRIPT_INTERNAL_SALT);
        const parts = encryptedText.split(':');
        if (parts.length !== 3) throw new Error('预设密钥加密格式无效');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const ciphertext = parts[2];
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.warn(`\n\x1b[33m警告：\x1b[0m解密预设密钥失败 (${encryptedText.substring(0, 15)}...): ${error.message}。可能是脚本主密码错误或加密值损坏。将使用空默认值。`);
        return "";
    }
}

function generateKeyHex(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString('hex');
}

function encryptForEnv(text, masterKeyHex) {
    if (!text) return "";
    try {
        const key = Buffer.from(masterKeyHex, 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('\n.env 值加密失败:', error.message);
        return "ENCRYPTION_ERROR_FOR_ENV";
    }
}

const rl = readline.createInterface({input: process.stdin, output: process.stdout});

function askQuestion(query, defaultValue = null, isPassword = false) {
    const promptText = defaultValue !== null ? `${query} (默认为: ${isPassword && defaultValue ? '********' : defaultValue}): ` : `${query}: `;
    if (isPassword && process.stdout.isTTY) {
        const question = (q, cb) => {
            const EOL = os.EOL;
            process.stdout.write(q);
            let buffer = "";
            const originalRawMode = process.stdin.isRaw;
            if (!originalRawMode) { // 仅在非原始模式时设置，避免嵌套调用出问题
                process.stdin.setRawMode(true);
            }
            process.stdin.resume(); // 确保 stdin 在监听前是 resumed 状态

            const listener = (charBuffer) => {
                const char = charBuffer.toString('utf8');
                switch (char) {
                    case "\n":
                    case "\r":
                    case "\u0004": // Enter, CTRL+D
                        process.stdin.removeListener('data', listener); // 先移除监听器
                        if (!originalRawMode) { // 仅在之前设置了原始模式时恢复
                            process.stdin.setRawMode(false);
                        }
                        process.stdout.write(EOL);
                        cb(buffer);
                        break;
                    case "\u0003": // CTRL+C
                        if (!originalRawMode) process.stdin.setRawMode(false);
                        process.exit();
                        break;
                    case "\u007f": // Backspace
                    case "\b":
                        if (buffer.length > 0) {
                            buffer = buffer.slice(0, -1);
                            process.stdout.write('\b \b');
                        }
                        break;
                    default:
                        // eslint-disable-next-line no-control-regex
                        if (char.length === 1 && !/[\x00-\x1F\x7F]/.test(char)) {
                            buffer += char;
                            process.stdout.write('*');
                        }
                        break;
                }
            };
            process.stdin.on('data', listener);
        };
        return new Promise(resolve => question(promptText, answer => resolve(answer.trim() || defaultValue || '')));
    }
    return new Promise(resolve => rl.question(promptText, answer => resolve(answer.trim() || defaultValue || '')));
}


async function getScriptMasterPassword() {
    if (fs.existsSync(SCRIPT_MASTER_PASSWORD_FILE)) {
        try {
            const smp = fs.readFileSync(SCRIPT_MASTER_PASSWORD_FILE, 'utf8').trim();
            if (smp) {
                console.log(`\n\x1b[32mINFO:\x1b[0m 脚本主密码已成功加载。`);
                return smp;
            } else {
                console.warn(`\n\x1b[33m警告:\x1b[0m 脚本主密码文件为空。将提示您手动输入。`);
            }
        } catch (err) {
            console.warn(`\n\x1b[33m警告:\x1b[0m 读取脚本主密码文件失败: ${err.message}。将提示您手动输入。`);
        }
    }
    console.log(`\n提示: 您可以将脚本主密码存储在与此脚本同目录下的名为 \x1b[36m.setup_master_password.key\x1b[0m 的文件中`);
    console.log("      (确保此文件已添加到 .gitignore!)，以避免每次运行时手动输入。");
    return askQuestion('请输入脚本主密码 (用于解密预设密钥, 输入将用*号隐藏)', null, true);
}

async function setupEnv() {
    console.log('--- 欢迎使用项目环境配置向导 (增强版) ---');

    const scriptPassword = await getScriptMasterPassword();
    if (!scriptPassword) {
        console.log("\x1b[33m警告:\x1b[0m 未提供或加载脚本主密码，预设密钥将无法作为默认值。您将需要手动输入所有密钥信息。");
    } else {
        console.log("\x1b[32mINFO:\x1b[0m 脚本主密码已获取。");
    }

    const configMode = await askQuestion("请选择配置模式: [1] 默认配置 (使用脚本内嵌的预设值) [2] 自定义配置 (逐项提问)", "1");

    console.log('\n\n============================= .env 文件加密密钥 =============================');
    const appMasterKey = generateKeyHex();
    console.log('已为您生成一个应用程序主加密密钥 (APP_MASTER_KEY)。');
    console.log('\x1b[31m\x1b[1m您的 APP_MASTER_KEY 是: \x1b[0m');
    console.log(`\x1b[33m${appMasterKey}\x1b[0m`);
    console.log('\n\x1b[31m\x1b[1m请务必立即将此 APP_MASTER_KEY 安全地复制并保存到别处。\x1b[0m');
    console.log('如果选择加密 .env 文件，您的应用程序将需要此密钥来解密配置。');
    console.log('===========================================================================\n');
    await askQuestion('我已安全保存了上述 APP_MASTER_KEY。按 Enter键 继续配置...');

    if (!fs.existsSync(exampleEnvPath)) {
        console.error('\n\x1b[31m错误:\x1b[0m .env.example 文件未找到。');
        rl.close();
        process.exit(1);
    }
    if (fs.existsSync(envPath)) {
        const overwriteAnswer = await askQuestion('\n.env 文件已存在。是否要覆盖它并重新配置? (Y/N)', 'Y');
        if (overwriteAnswer.toLowerCase() !== 'y') {
            console.log('操作取消。保留现有的 .env 文件。');
            rl.close();
            return;
        }
    }
    let envContent = fs.readFileSync(exampleEnvPath, 'utf8');

    let jwtSecretPlain;
    let deepseekApiKeyPlain, deepseekBaseUrl;
    let tencentSecretIdPlain, tencentSecretKeyPlain, tencentRegion;
    let mairuiApiLicencePlain, mairuiBaseUrl;

    console.log('\n--- 1. 应用程序数据库信息配置 (Prisma Accelerate) ---');
    console.log('将直接使用预设的 Prisma Accelerate 数据库 URL。');
    const databaseUrlFinal = PRESET_DATABASE_URL;
    console.log(`主数据库 URL: \x1b[36m${databaseUrlFinal.substring(0, 50)}...\x1b[0m`);
    console.log('\n\x1b[32mINFO:\x1b[0m 数据库 URL 已配置。请确保这些 URL 指向正确的 Prisma Accelerate 实例。\x1b[0m');
    console.log('注意：此脚本不会为您创建云数据库。您需要确保 Prisma Accelerate 实例已在云端设置并正常工作。');

    if (configMode === '1' && !scriptPassword) {
        console.warn("\x1b[33m警告:\x1b[0m 由于未提供脚本主密码，默认模式下部分敏感预设值（如 API密钥等）可能为空或使用了固定明文，除非它们有非加密的固定预设。");
    }

    // --- 后续的 JWT, API密钥等配置 ---
    if (configMode === '1') {
        jwtSecretPlain = decryptForScriptDefaults(EMBEDDED_JWT_SECRET, scriptPassword) || generateKeyHex(32);
        deepseekApiKeyPlain = decryptForScriptDefaults(EMBEDDED_DEEPSEEK_API_KEY, scriptPassword);
        deepseekBaseUrl = PRESET_DEEPSEEK_BASE_URL;
        tencentSecretIdPlain = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_ID, scriptPassword);
        tencentSecretKeyPlain = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_KEY, scriptPassword);
        tencentRegion = PRESET_TENCENT_TRANSLATE_REGION;
        mairuiApiLicencePlain = decryptForScriptDefaults(EMBEDDED_MAIRUI_API_LICENCE, scriptPassword);
        mairuiBaseUrl = PRESET_MAIRUI_BASE_URL;
        if (!jwtSecretPlain || (jwtSecretPlain.length < 64 && jwtSecretPlain !== (decryptForScriptDefaults(EMBEDDED_JWT_SECRET, scriptPassword)))) {
            console.warn("\x1b[33m警告:\x1b[0m JWT Secret未能从预设中成功解密或长度不足，已使用新生成的。");
        }

    } else {
        console.log('\n--- 2. JWT Secret 配置 ---');
        const defaultJwt = decryptForScriptDefaults(EMBEDDED_JWT_SECRET, scriptPassword);
        jwtSecretPlain = await askQuestion('请输入或按 Enter 使用预设/新生成 JWT SECRET', defaultJwt || null, true);
        if (!jwtSecretPlain) {
            jwtSecretPlain = generateKeyHex(32);
            console.log('JWT Secret 已新生成。');
        }

        console.log('\n--- 3. DeepSeek AI API 配置 ---');
        const defaultDeepSeekKey = decryptForScriptDefaults(EMBEDDED_DEEPSEEK_API_KEY, scriptPassword);
        deepseekApiKeyPlain = await askQuestion('请输入 DeepSeek API Key', defaultDeepSeekKey || null, !defaultDeepSeekKey);
        deepseekBaseUrl = await askQuestion('请输入 DeepSeek API Base URL', PRESET_DEEPSEEK_BASE_URL);

        console.log('\n--- 4. 腾讯翻译 API 配置 ---');
        const defaultTencentId = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_ID, scriptPassword);
        const defaultTencentKey = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_KEY, scriptPassword);
        tencentSecretIdPlain = await askQuestion('请输入腾讯云 SecretId', defaultTencentId || null, !defaultTencentId);
        tencentSecretKeyPlain = await askQuestion('请输入腾讯云 SecretKey', defaultTencentKey || null, !defaultTencentKey && !!tencentSecretIdPlain);
        tencentRegion = await askQuestion('请输入腾讯翻译地域', PRESET_TENCENT_TRANSLATE_REGION);

        console.log('\n--- 5. Mairui API 配置 ---');
        const defaultMairuiLicence = decryptForScriptDefaults(EMBEDDED_MAIRUI_API_LICENCE, scriptPassword);
        mairuiApiLicencePlain = await askQuestion('请输入 Mairui API Licence', defaultMairuiLicence || null, !defaultMairuiLicence);
        mairuiBaseUrl = await askQuestion('请输入 Mairui API Base URL', PRESET_MAIRUI_BASE_URL);
    }

    // 替换 .env 文件中的 DATABASE_URL 和 SHADOW_DATABASE_URL
    envContent = envContent.replace(/^DATABASE_URL=".*?"/m, `DATABASE_URL="${databaseUrlFinal}"`);

    console.log('\n--- 6. .env 文件敏感信息加密选项 ---');
    const encryptEnvChoice = await askQuestion(`是否使用 APP_MASTER_KEY 加密 .env 文件中的 API 密钥和 JWT Secret? (Y/N)`, 'N');
    const useEncryptionForEnv = encryptEnvChoice.toLowerCase() !== 'n';

    const secretKeysConfig = [
        {plain: 'JWT_SECRET', encrypted: 'JWT_SECRET_ENCRYPTED', value: jwtSecretPlain},
        {plain: 'DEEPSEEK_API_KEY', encrypted: 'DEEPSEEK_API_KEY_ENCRYPTED', value: deepseekApiKeyPlain},
        {plain: 'TENCENT_SECRET_ID', encrypted: 'TENCENT_SECRET_ID_ENCRYPTED', value: tencentSecretIdPlain},
        {plain: 'TENCENT_SECRET_KEY', encrypted: 'TENCENT_SECRET_KEY_ENCRYPTED', value: tencentSecretKeyPlain},
        {plain: 'MAIRUI_API_LICENCE', encrypted: 'MAIRUI_API_LICENCE_ENCRYPTED', value: mairuiApiLicencePlain},
    ];

    if (useEncryptionForEnv) {
        console.log(`将使用 APP_MASTER_KEY (${appMasterKey.substring(0, 6)}...) 对敏感信息进行加密后存入 .env。`);
        secretKeysConfig.forEach(secret => {
            const valueToEncrypt = secret.value || "";
            envContent = envContent.replace(new RegExp(`^${secret.encrypted}=".*?"`, "m"), `${secret.encrypted}="${encryptForEnv(valueToEncrypt, appMasterKey)}"`);
            // 确保移除明文变量，只保留加密变量
            envContent = envContent.replace(new RegExp(`^${secret.plain}=".*?"\r?\n?`, "gm"), '');
        });
    } else {
        console.log('敏感信息将以明文形式存入 .env 文件。');
        secretKeysConfig.forEach(secret => {
            // 确保移除加密变量，只保留明文变量
            envContent = envContent.replace(new RegExp(`^${secret.plain}=".*?"`, "m"), `${secret.plain}="${secret.value || ''}"`);
            envContent = envContent.replace(new RegExp(`^${secret.encrypted}=".*?"\r?\n?`, "gm"), '');
        });
    }

    envContent = envContent.replace(/^DEEPSEEK_BASE_URL=".*?"/m, `DEEPSEEK_BASE_URL="${deepseekBaseUrl || PRESET_DEEPSEEK_BASE_URL}"`);
    envContent = envContent.replace(/^TENCENT_TRANSLATE_REGION=".*?"/m, `TENCENT_TRANSLATE_REGION="${tencentRegion || PRESET_TENCENT_TRANSLATE_REGION}"`);
    envContent = envContent.replace(/^MAIRUI_BASE_URL=".*?"/m, `MAIRUI_BASE_URL="${mairuiBaseUrl || PRESET_MAIRUI_BASE_URL}"`);

    // 移除多余的空行，并确保文件末尾有一个换行符
    envContent = envContent.replace(/(\r?\n){2,}/g, '\n\n').trim();
    fs.writeFileSync(envPath, envContent + '\n', 'utf8');

    console.log(`\n🎉 \x1b[32m成功！\x1b[0m .env 文件已更新/创建于: ${envPath}`);
    if (useEncryptionForEnv) {
        console.log('\n\x1b[1m重要：\x1b[0m您的敏感密钥已在 .env 文件中被加密。');
        console.log('您的应用程序需要在启动时使用之前提示您保存的 \x1b[33mAPP_MASTER_KEY\x1b[0m (环境变量) 来解密这些值。');
    } else {
        console.log('\n提示：您的敏感密钥已以明文形式保存在 .env 文件中。请确保此文件不会提交到版本控制系统。');
    }
    console.log('\n下一步操作建议:');
    console.log('1. \x1b[1m请确保\x1b[0m 您的 Prisma Accelerate 实例已在云端设置并正常工作，并且您提供的 URL 是正确的。');
    console.log('2. 运行数据库迁移: \x1b[32mnpx prisma migrate dev --name init\x1b[0m (如果是首次)');
    console.log(`3. \x1b[1m首先设置好 \x1b[33mAPP_MASTER_KEY\x1b[0m 环境变量 (如果选择了加密.env文件)\x1b[0m, 然后启动开发服务器: \x1b[32mnpm run dev\x1b[0m`);

    rl.close();
}

setupEnv().catch(err => {
    console.error("\n\x1b[31m配置过程中发生意外错误:\x1b[0m", err);
    rl.close();
    process.exit(1);
});