const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const envPath = path.resolve(__dirname, '../.env');
const exampleEnvPath = path.resolve(__dirname, '../.env.example');

function generateRandomString(length = 12) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function generateJwtSecret() {
    return crypto.randomBytes(32).toString('hex');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query, defaultValue = null) {
    const prompt = defaultValue ? `${query} (默认为: ${defaultValue}): ` : `${query}: `;
    return new Promise(resolve => rl.question(prompt, answer => resolve(answer.trim() || defaultValue || '')));
}

async function setupEnv() {
    console.log('--- 欢迎使用项目环境配置向导 ---');

    if (!fs.existsSync(exampleEnvPath)) {
        console.error('\n错误: .env.example 文件未找到。请确保该文件存在于项目根目录。');
        rl.close();
        process.exit(1);
    }

    if (fs.existsSync(envPath)) {
        const overwriteAnswer = await askQuestion('\n.env 文件已存在。是否要覆盖它并重新配置? (y/N)', 'N');
        if (overwriteAnswer.toLowerCase() !== 'y') {
            console.log('操作取消。保留现有的 .env 文件。');
            rl.close();
            return;
        }
    }

    let envContent = fs.readFileSync(exampleEnvPath, 'utf8');

    console.log('\n--- 1. MySQL 数据库配置 ---');
    const dbSetupChoice = await askQuestion('您是否已经为此项目准备好了MySQL数据库和用户? (y/N)', 'N');

    let dbUser, dbPassword, dbName, dbHost, dbPort, shadowDbName;

    if (dbSetupChoice.toLowerCase() !== 'y') {
        console.log('\n好的，我将为您提供创建主数据库和用户的SQL命令示例。');
        console.log('Prisma 在开发时还需要一个影子数据库 (Shadow Database) 来安全地生成迁移。');
        console.log('通常，您提供的用户也需要有权限创建这个影子数据库 (如果它不存在)。');
        console.log('请使用有足够权限的MySQL用户 (例如 root) 登录您的MySQL客户端并执行以下命令。');

        const suggestedDbNameBase = `myapp_${generateRandomString(4)}`;
        const suggestedMainDbName = suggestedDbNameBase;
        const suggestedShadowDbName = `${suggestedDbNameBase}_shadow`; // 建议的影子数据库名
        const suggestedDbUser = `myapp_user_${generateRandomString(4)}`;
        const suggestedDbPassword = generateRandomString(12);

        console.log('\n--- SQL 命令示例 (您可以修改这些值) ---');
        console.log(`-- 1. 创建主数据库:`);
        console.log(`CREATE DATABASE ${suggestedMainDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log(`-- 2. (可选，如果影子数据库不存在且用户没有全局创建权限，则需要手动创建):`);
        console.log(`-- CREATE DATABASE ${suggestedShadowDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log(`-- 3. 创建用户并授权 (确保此用户对主数据库有完全权限，并且通常能创建影子数据库):`);
        console.log(`CREATE USER '${suggestedDbUser}'@'localhost' IDENTIFIED BY '${suggestedDbPassword}';`);
        console.log(`GRANT ALL PRIVILEGES ON ${suggestedMainDbName}.* TO '${suggestedDbUser}'@'localhost';`);
        // 如果需要用户显式拥有创建数据库的权限（以便Prisma能创建影子库）
        // console.log(`GRANT CREATE ON *.* TO '${suggestedDbUser}'@'localhost';`); // 这条权限较大，请谨慎
        // 或者，如果影子数据库已手动创建，确保用户对影子数据库也有权限：
        // console.log(`GRANT ALL PRIVILEGES ON ${suggestedShadowDbName}.* TO '${suggestedDbUser}'@'localhost';`);
        console.log('FLUSH PRIVILEGES;');
        console.log('-----------------------------------------');
        console.log('如果您使用的是远程MySQL服务器，请将上述SQL命令中的 \'localhost\' 替换为 \'%\' 或您的应用服务器IP。');
        console.log('重要: 确保用户 \x1b[33m`' + suggestedDbUser + '`\x1b[0m 拥有在MySQL服务器上创建数据库的权限，以便Prisma可以管理影子数据库，或者您需要手动创建影子数据库并授予相应权限。');


        await askQuestion('\n请在您的MySQL中执行上述或类似的命令创建主数据库和用户 (并确保影子数据库可被创建/访问) 后，按 Enter键 继续...');

        console.log('\n现在，请输入您实际创建或将要使用的主数据库信息：');
        dbName = await askQuestion('主数据库名称', suggestedMainDbName);
        dbUser = await askQuestion('数据库用户名', suggestedDbUser);
        dbPassword = await askQuestion('数据库密码', suggestedDbPassword);
        // 影子数据库名将根据主数据库名自动生成
        shadowDbName = `${dbName}_shadow`;

    } else {
        console.log('\n好的，请输入您已有的主数据库信息：');
        dbName = await askQuestion('您的主数据库名称是?');
        dbUser = await askQuestion('您的数据库用户名是?');
        dbPassword = await askQuestion('您的数据库密码是?');
        // 影子数据库名将根据主数据库名自动生成
        shadowDbName = `${dbName}_shadow`;
        console.log(`将使用影子数据库名称: ${shadowDbName} (如果不存在，Prisma会尝试创建它，请确保用户 '${dbUser}' 有此权限)`);
    }

    dbHost = await askQuestion('MySQL 主机名', 'localhost');
    dbPort = await askQuestion('MySQL 端口号', '3306');

    const dbUrl = `mysql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
    const shadowDbUrl = `mysql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${shadowDbName}`; // 使用生成的影子数据库名

    envContent = envContent.replace(/DATABASE_URL=".*?"/, `DATABASE_URL="${dbUrl}"`);
    envContent = envContent.replace(/SHADOW_DATABASE_URL=".*?"/, `SHADOW_DATABASE_URL="${shadowDbUrl}"`); // 写入影子数据库URL
    console.log('数据库连接信息已准备好。');

    console.log('\n--- 2. JWT Secret 配置 ---');
    const autoGenerateJwt = await askQuestion('是否需要我为您自动生成一个新的 JWT_SECRET? (Y/n)', 'Y');
    let jwtSecret;
    if (autoGenerateJwt.toLowerCase() !== 'n') {
        jwtSecret = generateJwtSecret();
        console.log(`已生成新的 JWT_SECRET: ${jwtSecret}`);
    } else {
        jwtSecret = await askQuestion('请输入您自己的 JWT_SECRET (必须是一个长且随机的字符串):');
        if (!jwtSecret) {
            console.log('JWT_SECRET 未提供，将为您生成一个。');
            jwtSecret = generateJwtSecret();
            console.log(`已生成新的 JWT_SECRET: ${jwtSecret}`);
        }
    }
    envContent = envContent.replace(/JWT_SECRET=".*?"/, `JWT_SECRET="${jwtSecret}"`);

    console.log('\n--- 3. 腾讯翻译 API 配置 (可选) ---');
    const setupTencentApi = await askQuestion('您是否需要配置腾讯翻译 API 密钥 (用于菜谱翻译功能)? (y/N)', 'N');
    if (setupTencentApi.toLowerCase() === 'y') {
        const tencentSecretId = await askQuestion('请输入您的腾讯云 SecretId:');
        const tencentSecretKey = await askQuestion('请输入您的腾讯云 SecretKey:');
        const tencentRegion = await askQuestion('请输入腾讯翻译地域', 'ap-guangzhou');

        envContent = envContent.replace(/TENCENT_SECRET_ID=".*?"/, `TENCENT_SECRET_ID="${tencentSecretId.trim()}"`);
        envContent = envContent.replace(/TENCENT_SECRET_KEY=".*?"/, `TENCENT_SECRET_KEY="${tencentSecretKey.trim()}"`);
        envContent = envContent.replace(/TENCENT_TRANSLATE_REGION=".*?"/, `TENCENT_TRANSLATE_REGION="${tencentRegion.trim()}"`);
        console.log('腾讯翻译 API 信息已配置。');
    } else {
        console.log('跳过腾讯翻译 API 配置。如果需要此功能，请稍后手动编辑 .env 文件。');
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`\n🎉 成功！.env 文件已更新/创建于: ${envPath}`);
    console.log('\n下一步操作建议:');
    console.log('1. (如果之前未执行或不确定) 请确保您已在MySQL中创建了主数据库和用户，并授予了相应权限。');
    console.log(`   主数据库: \x1b[36m${dbName}\x1b[0m, 用户: \x1b[36m${dbUser}\x1b[0m`);
    console.log(`   Prisma 将尝试使用用户 \x1b[36m${dbUser}\x1b[0m 来管理影子数据库 \x1b[36m${shadowDbName}\x1b[0m。`);
    console.log('   请确保此用户有权在MySQL服务器上创建数据库，或者您已手动创建了影子数据库并授予了权限。');
    console.log(`2. 运行数据库迁移以创建表结构: \x1b[32mnpx prisma migrate dev\x1b[0m`);
    console.log(`3. 启动开发服务器: \x1b[32mnpm run dev\x1b[0m`);

    rl.close();
}

setupEnv().catch(err => {
    console.error("\n配置过程中发生意外错误:", err);
    rl.close();
    process.exit(1);
});