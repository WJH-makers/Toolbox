const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const envPath = path.resolve(__dirname, '../.env');
const exampleEnvPath = path.resolve(__dirname, '../.env.example');
const SCRIPT_MASTER_PASSWORD_FILE = path.resolve(__dirname, '.setup_master_password.key');

const ALGORITHM = 'aes-256-gcm';
const SCRIPT_INTERNAL_SALT = 'WJH-makers';

const PRESET_DB_USER = "user"
const PRESET_DB_NAME = "toolbox";
const PRESET_DB_PASSWORD = "password";
const PRESET_DB_HOST = "localhost";
const PRESET_DB_PORT = "3306";

const EMBEDDED_JWT_SECRET = "35abf104b5ebcae6b48a7233:6cd9f33df9821fd325e90c1cd02659ac:0cdb4e607ae7f9bc5cae9065bad1f126e72c039a6f5ccdfe7d21263b1cb82898f22d9e308a04a3df1c371f2e0ef1a6579af14f7169318df28e24c9c6b5e7c8b6";
const EMBEDDED_TENCENT_SECRET_ID = "381d5ea74b81cbbf7788a0be:1f2440900a043fa8987a7ed1136f9e2e:265784a27fd358c96b7ce0243a2ada2014c9e313143a1fefd0dca57a1a11f38584212597";
const EMBEDDED_TENCENT_SECRET_KEY = "31bbe2f2980ff822d54a7716:74ac8716951b2e18969b357538908a49:6c8f1cb26c0737be06f1e481d3e99535ddc069cec76c12d44c353d201e23a44a";
const PRESET_TENCENT_TRANSLATE_REGION = "ap-guangzhou";
const EMBEDDED_DEEPSEEK_API_KEY = "2b8f9467cdace3bf91959968:772451bd0525394c3392ee8e80005882:298c5877a7b456b9a05cbfb424eb1ab482db8842488f9051fd7c4aa860fd15475a9124";
const PRESET_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const EMBEDDED_MAIRUI_API_LICENCE = "5d121190a55c2b3d31dee68f:e90b360085f960e4086f266760cef755:ca2129a114725caf093ebf019ecd5bd908e164578aa25193bf3c19820af751e25a383c7c";
const PRESET_MAIRUI_BASE_URL = "https://api.mairui.club";

function deriveKey(password, salt) { // 用于脚本内部解密
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

function encryptForEnv(text, masterKeyHex) { // 用于最终.env文件加密
    if (!text) return "";
    try {
        const key = Buffer.from(masterKeyHex, 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('\n.env 值加密失败:', error.message);
        return "ENCRYPTION_ERROR_FOR_ENV";
    }
}

const rl = readline.createInterface({input: process.stdin, output: process.stdout});

function askQuestion(query, defaultValue = null, isPassword = false) {
    const promptText = defaultValue !== null ? `${query} (默认为: ${isPassword && defaultValue ? '********' : defaultValue}): ` : `${query}: `;
    // 简单的密码隐藏（非完美，但比没有好）
    if (isPassword && process.stdout.isTTY) {
        const question = (q, cb) => {
            const EOL = require('os').EOL;
            process.stdout.write(q);
            let buffer = "";
            process.stdin.setRawMode(true); // 捕获每个字符
            process.stdin.resume();
            const listener = (charBuffer) => {
                const char = charBuffer.toString('utf8');
                switch (char) {
                    case "\n":
                    case "\r":
                    case "\u0004": // Enter, CTRL+D
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdin.removeListener('data', listener);
                        process.stdout.write(EOL); // 换行
                        cb(buffer);
                        break;
                    case "\u0003": // CTRL+C
                        process.exit();
                        break;
                    case "\u007f": // Backspace on some terminals
                    case "\b":     // Backspace
                        if (buffer.length > 0) {
                            buffer = buffer.slice(0, -1);
                            process.stdout.clearLine(0); // 清除当前行
                            process.stdout.cursorTo(0);  // 光标到行首
                            process.stdout.write(q + '*'.repeat(buffer.length)); // 重新打印提示和星号
                        }
                        break;
                    default:
                        if (char.length === 1) { // 忽略特殊控制字符
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
                console.log(`\n\x1b[32mINFO:\x1b[0m 已从文件 ${SCRIPT_MASTER_PASSWORD_FILE} 加载脚本主密码。`);
                return smp;
            } else {
                console.warn(`\n\x1b[33m警告:\x1b[0m 文件 ${SCRIPT_MASTER_PASSWORD_FILE} 为空。将提示您手动输入。`);
            }
        } catch (err) {
            console.warn(`\n\x1b[33m警告:\x1b[0m 读取文件 ${SCRIPT_MASTER_PASSWORD_FILE} 失败: ${err.message}。将提示您手动输入。`);
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

    const configMode = await askQuestion("请选择配置模式: [1] 默认配置 (使用脚本内嵌的预设值) [2] 自定义配置 (逐项提问)", "2");

    // --- .env 文件加密密钥 (APP_MASTER_KEY) ---
    // 无论哪种模式，这个密钥都是新生成的，用于最终 .env 文件的加密（如果选择加密）
    console.log('\n\n============================= .env 文件加密密钥 =============================');
    const appMasterKey = generateKeyHex();
    console.log('已为您生成一个应用程序主加密密钥 (APP_MASTER_KEY)。');
    console.log('\x1b[31m\x1b[1m您的 APP_MASTER_KEY 是: \x1b[0m');
    console.log(`\x1b[33m${appMasterKey}\x1b[0m`);
    console.log('\n\x1b[31m\x1b[1m请务必立即将此 APP_MASTER_KEY 安全地复制并保存到别处。\x1b[0m');
    console.log('如果选择加密 .env 文件，您的应用程序将需要此密钥来解密配置。');
    console.log('===========================================================================\n');
    await askQuestion('我已安全保存了上述 APP_MASTER_KEY。按 Enter键 继续配置...');


    if (!fs.existsSync(exampleEnvPath)) { /* ... .env.example 检查 ... */
    }
    if (fs.existsSync(envPath)) { /* ... .env 文件覆盖确认 ... */
    }
    let envContent = fs.readFileSync(exampleEnvPath, 'utf8');

    // --- 定义将要收集的配置变量 ---
    let dbUser, dbPassword, dbName, dbHost, dbPort, shadowDbName;
    let jwtSecretPlain;
    let deepseekApiKeyPlain, deepseekBaseUrl;
    let tencentSecretIdPlain, tencentSecretKeyPlain, tencentRegion;
    let mairuiApiLicencePlain, mairuiBaseUrl;

    if (configMode === '1') { // 默认配置模式
        console.log('\n--- 正在加载默认配置... ---');
        dbUser = PRESET_DB_USER;
        dbPassword = PRESET_DB_PASSWORD;
        dbName = PRESET_DB_NAME;
        dbHost = PRESET_DB_HOST;
        dbPort = PRESET_DB_PORT;
        shadowDbName = `${dbName}_shadow`; // 简单规则生成

        jwtSecretPlain = decryptForScriptDefaults(EMBEDDED_JWT_SECRET, scriptPassword) || generateKeyHex(32);

        deepseekApiKeyPlain = decryptForScriptDefaults(EMBEDDED_DEEPSEEK_API_KEY, scriptPassword);
        deepseekBaseUrl = PRESET_DEEPSEEK_BASE_URL;

        tencentSecretIdPlain = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_ID, scriptPassword);
        tencentSecretKeyPlain = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_KEY, scriptPassword);
        tencentRegion = PRESET_TENCENT_TRANSLATE_REGION;

        mairuiApiLicencePlain = decryptForScriptDefaults(EMBEDDED_MAIRUI_API_LICENCE, scriptPassword);
        mairuiBaseUrl = PRESET_MAIRUI_BASE_URL;

        console.log('默认配置加载完毕 (敏感信息已从脚本内部解密或使用固定预设)。');
        // 可以在这里打印一些非敏感的默认值以供确认，例如数据库名、主机等
        console.log(`  数据库用户: ${dbUser}, 数据库名: ${dbName}`);
        if (!dbPassword) console.warn("\x1b[33m警告:\x1b[0m 数据库密码未能从预设中解密，您可能需要在.env文件中手动填写或确保数据库无需密码访问（不推荐）。");
        if (!jwtSecretPlain) console.warn("\x1b[33m警告:\x1b[0m JWT Secret未能从预设中解密，将使用新生成的。");
        // ... 其他密钥的类似检查 ...

    } else { // 自定义配置模式
        // --- 1. MySQL 数据库配置 ---
        console.log('\n--- 1. MySQL 数据库配置 ---');
        const defDbUser = PRESET_DB_USER;
        const defDbPass = PRESET_DB_PASSWORD;
        const defDbName = PRESET_DB_NAME;

        dbUser = await askQuestion('数据库用户名', defDbUser);
        dbPassword = await askQuestion('数据库密码', defDbPass, true);
        dbName = await askQuestion('主数据库名称', defDbName);
        dbHost = await askQuestion('MySQL 主机名', PRESET_DB_HOST);
        dbPort = await askQuestion('MySQL 端口号', PRESET_DB_PORT);
        shadowDbName = await askQuestion('影子数据库名称', `${dbName}_shadow`);

        // --- 2. JWT Secret 配置 ---
        console.log('\n--- 2. JWT Secret 配置 ---');
        const defJwt = decryptForScriptDefaults(EMBEDDED_JWT_SECRET, scriptPassword);
        jwtSecretPlain = await askQuestion('请输入或按 Enter 使用预设/新生成 JWT SECRET', defJwt || null, true);
        if (!jwtSecretPlain) {
            jwtSecretPlain = generateKeyHex(32);
            console.log('JWT Secret 已新生成。');
        }

        // --- 3. DeepSeek API ---
        console.log('\n--- 3. DeepSeek AI API 配置 ---');
        const defDeepSeekKey = decryptForScriptDefaults(EMBEDDED_DEEPSEEK_API_KEY, scriptPassword);
        deepseekApiKeyPlain = await askQuestion('请输入 DeepSeek API Key', defDeepSeekKey || null, !defDeepSeekKey);
        deepseekBaseUrl = await askQuestion('请输入 DeepSeek API Base URL', PRESET_DEEPSEEK_BASE_URL);

        // --- 4. 腾讯翻译 API ---
        console.log('\n--- 4. 腾讯翻译 API 配置 ---');
        const defTencentId = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_ID, scriptPassword);
        const defTencentKey = decryptForScriptDefaults(EMBEDDED_TENCENT_SECRET_KEY, scriptPassword);
        tencentSecretIdPlain = await askQuestion('请输入腾讯云 SecretId', defTencentId || null, !defTencentId);
        tencentSecretKeyPlain = await askQuestion('请输入腾讯云 SecretKey', defTencentKey || null, !defTencentKey && !!tencentSecretIdPlain);
        tencentRegion = await askQuestion('请输入腾讯翻译地域', PRESET_TENCENT_TRANSLATE_REGION);

        // --- 5. Mairui API ---
        console.log('\n--- 5. Mairui API 配置 ---');
        const defMairuiLicence = decryptForScriptDefaults(EMBEDDED_MAIRUI_API_LICENCE, scriptPassword);
        mairuiApiLicencePlain = await askQuestion('请输入 Mairui API Licence', defMairuiLicence || null, !defMairuiLicence);
        mairuiBaseUrl = await askQuestion('请输入 Mairui API Base URL', PRESET_MAIRUI_BASE_URL);
    }

    // --- 更新 envContent ---
    // 数据库 (明文)
    const dbUrl = `mysql://${dbUser}:${encodeURIComponent(dbPassword || '')}@${dbHost}:${dbPort}/${dbName}`;
    const shadowDbUrl = `mysql://${dbUser}:${encodeURIComponent(dbPassword || '')}@${dbHost}:${dbPort}/${shadowDbName}`;
    envContent = envContent.replace(/^DATABASE_URL=".*?"/m, `DATABASE_URL="${dbUrl}"`);
    envContent = envContent.replace(/^SHADOW_DATABASE_URL=".*?"/m, `SHADOW_DATABASE_URL="${shadowDbUrl}"`);

    // --- 询问是否加密 .env 中的敏感信息 ---
    console.log('\n--- 6. .env 文件敏感信息加密选项 ---');
    const encryptEnvChoice = await askQuestion(`是否使用 APP_MASTER_KEY 加密 .env 文件中的 API 密钥和 JWT Secret? (Y/n)`, 'Y');
    const useEncryptionForEnv = encryptEnvChoice.toLowerCase() !== 'n';

    if (useEncryptionForEnv) {
        console.log(`将使用 APP_MASTER_KEY (${appMasterKey.substring(0, 6)}...) 对敏感信息进行加密后存入 .env。`);
        envContent = envContent.replace(/^JWT_SECRET_ENCRYPTED=".*?"/m, `JWT_SECRET_ENCRYPTED="${encryptForEnv(jwtSecretPlain, appMasterKey)}"`);
        envContent = envContent.replace(/^DEEPSEEK_API_KEY_ENCRYPTED=".*?"/m, `DEEPSEEK_API_KEY_ENCRYPTED="${encryptForEnv(deepseekApiKeyPlain, appMasterKey)}"`);
        envContent = envContent.replace(/^TENCENT_SECRET_ID_ENCRYPTED=".*?"/m, `TENCENT_SECRET_ID_ENCRYPTED="${encryptForEnv(tencentSecretIdPlain, appMasterKey)}"`);
        envContent = envContent.replace(/^TENCENT_SECRET_KEY_ENCRYPTED=".*?"/m, `TENCENT_SECRET_KEY_ENCRYPTED="${encryptForEnv(tencentSecretKeyPlain, appMasterKey)}"`);
        envContent = envContent.replace(/^MAIRUI_API_LICENCE_ENCRYPTED=".*?"/m, `MAIRUI_API_LICENCE_ENCRYPTED="${encryptForEnv(mairuiApiLicencePlain, appMasterKey)}"`);

        // 清理或注释掉明文占位符
        envContent = envContent.replace(/^JWT_SECRET=".*?"/gm, '# JWT_SECRET="" (已使用加密版本 JWT_SECRET_ENCRYPTED)');
        envContent = envContent.replace(/^DEEPSEEK_API_KEY=".*?"/gm, '# DEEPSEEK_API_KEY="" (已使用加密版本 DEEPSEEK_API_KEY_ENCRYPTED)');
        // ... 对其他密钥也做类似处理 ...
    } else {
        console.log('敏感信息将以明文形式存入 .env 文件。');
        envContent = envContent.replace(/^JWT_SECRET=".*?"/m, `JWT_SECRET="${jwtSecretPlain || ''}"`);
        envContent = envContent.replace(/^DEEPSEEK_API_KEY=".*?"/m, `DEEPSEEK_API_KEY="${deepseekApiKeyPlain || ''}"`);
        envContent = envContent.replace(/^TENCENT_SECRET_ID=".*?"/m, `TENCENT_SECRET_ID="${tencentSecretIdPlain || ''}"`);
        envContent = envContent.replace(/^TENCENT_SECRET_KEY=".*?"/m, `TENCENT_SECRET_KEY="${tencentSecretKeyPlain || ''}"`);
        envContent = envContent.replace(/^MAIRUI_API_LICENCE=".*?"/m, `MAIRUI_API_LICENCE="${mairuiApiLicencePlain || ''}"`);

        // 清理或注释掉加密占位符
        envContent = envContent.replace(/^JWT_SECRET_ENCRYPTED=".*?"/gm, '# JWT_SECRET_ENCRYPTED="" (未使用加密)');
        envContent = envContent.replace(/^DEEPSEEK_API_KEY_ENCRYPTED=".*?"/gm, '# DEEPSEEK_API_KEY_ENCRYPTED="" (未使用加密)');
        // ... 对其他密钥也做类似处理 ...
    }

    // 非敏感URL/Region (总是明文)
    envContent = envContent.replace(/^DEEPSEEK_BASE_URL=".*?"/m, `DEEPSEEK_BASE_URL="${deepseekBaseUrl || PRESET_DEEPSEEK_BASE_URL}"`);
    envContent = envContent.replace(/^TENCENT_TRANSLATE_REGION=".*?"/m, `TENCENT_TRANSLATE_REGION="${tencentRegion || PRESET_TENCENT_TRANSLATE_REGION}"`);
    envContent = envContent.replace(/^MAIRUI_BASE_URL=".*?"/m, `MAIRUI_BASE_URL="${mairuiBaseUrl || PRESET_MAIRUI_BASE_URL}"`);

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    console.log(`\n🎉 \x1b[32m成功！\x1b[0m .env 文件已更新/创建于: ${envPath}`);
    if (useEncryptionForEnv) {
        console.log('\n\x1b[1m重要：\x1b[0m您的敏感密钥已在 .env 文件中被加密。');
        console.log('您的应用程序需要在启动时使用之前提示您保存的 \x1b[33mAPP_MASTER_KEY\x1b[0m (环境变量) 来解密这些值。');
    } else {
        console.log('\n提示：您的敏感密钥已以明文形式保存在 .env 文件中。请确保此文件不会提交到版本控制系统。');
    }
    console.log('\n下一步操作建议: ... (与之前一致的prisma, dev server提示)');
    rl.close();
}

setupEnv().catch(err => {
    console.error("\n\x1b[31m配置过程中发生意外错误:\x1b[0m", err);
    rl.close();
    process.exit(1);
});