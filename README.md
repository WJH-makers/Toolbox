## 🚀 使用指南

本指南将引导您完成项目的安装、配置和本地运行。

---

### 0. ✅ 前提条件 (推荐)

在开始之前，请确保您的开发环境中已安装以下软件：

* **Node.js**: 建议使用 LTS 版本 (例如 `v20.x` 或更高版本)。您可以从 [Node.js官网](https://nodejs.org/) 下载。
* **npm** (或 **yarn** / **pnpm**): 通常随 Node.js 一起安装。
* **MySQL 服务器**: 项目使用 MySQL 数据库。
    * **重要**: 您需要自行安装并运行一个 MySQL 服务器实例。
    * **如何安装 MySQL?**
        * **Windows**: 推荐从 [MySQL Installer for Windows](https://dev.mysql.com/downloads/installer/) 下载并根据向导安装。
        * **macOS**: 可以使用 [Homebrew](https://brew.sh/) (`brew install mysql`) 或从 [MySQL Community Downloads](https://dev.mysql.com/downloads/mysql/) 下载 `.dmg` 安装包。
        * **Linux (以 Ubuntu 为例)**: 通常可以通过包管理器安装，例如 `sudo apt update && sudo apt install mysql-server`。其他 Linux 发行版请参考其官方文档。
        * **Docker**: 如果您熟悉 Docker，也可以使用官方的 [MySQL Docker 镜像](https://hub.docker.com/_/mysql)。
    * 安装完成后，请确保 MySQL 服务已启动，并且您知道如何连接到它（例如，知道 root 用户密码或已创建了专用的数据库用户）。

---

### 1. 克隆代码库并安装依赖 📦

首先，克隆本代码库到您的本地计算机，并进入项目目录，然后安装项目所需的依赖包：

```bash
cd Desktop # 或者您想要存放项目的其他目录
git clone https://github.com/WJH-makers/Toolbox.git # 克隆代码库
cd Toolbox # 项目目录
npm install
```

* `npm install` 命令会根据项目根目录下的 `package.json` 文件中列出的依赖项，自动下载并安装所有必要的项目依赖包。这些依赖包会被存放在项目根目录下的 `node_modules` 文件夹中。

---

### 2. ⚙️ 运行安装向导配置环境 (推荐)

本项目提供了一个交互式的安装向导脚本，可以帮助您配置必要的环境变量（如数据库连接、JWT密钥等）。请在项目根目录下运行：

```bash
npm run setup
```

* 该脚本会首先询问您选择配置模式：
    1.  **新手模式 (推荐初次使用者)**: 此模式旨在最大限度地简化配置过程。
        * **数据库配置**: 脚本会尝试使用常见的默认设置 (如用户 `root`，空密码，连接到本地 MySQL) 来配置数据库。如果默认设置失败或您需要创建新的数据库和用户，脚本会提供清晰的指引，并可能生成 SQL 命令供您在 MySQL 中执行。目标是让您以最少的输入完成数据库设置。
        * **JWT 密钥**: 脚本将自动为您生成一个安全的 `JWT_SECRET`，无需手动输入。
        * **API 密钥 (可选)**: 对于 AI 助手 (DeepSeek) 和文本翻译 (腾讯翻译) 等需要外部 API 的功能，脚本会告知您这些是可选配置。在新手模式下，您可以选择跳过这些配置。相关功能在未配置密钥时将不可用，您后续可以随时通过编辑 `.env` 文件或重新运行此脚本（选择“自定义模式”）来添加它们。
    2.  **自定义模式**: 此模式允许您手动输入或确认每一个配置项，适合有经验的开发者或需要特定配置的场景。
    3.  **默认配置模式**: 如果项目预设了加密的默认值（通常用于特定部署场景），此模式会尝试加载这些值。

* 无论选择哪种模式，脚本最终都会帮助您创建或更新项目根目录下的 `.env` 文件，其中包含了所有的环境变量。
* 请按照脚本的提示完成所有步骤。

> **手动配置 (如果不想使用安装向导)**:
> 如果您不想使用 `npm run setup` 脚本，也可以手动配置：
> 1.  复制项目根目录下的 `.env.example` 文件为 `.env` (例如，在命令行中运行 `cp .env.example .env`)。
> 2.  **仔细阅读并编辑** `.env` 文件中的所有配置项，特别是 `DATABASE_URL`, `SHADOW_DATABASE_URL` (如果您的 Prisma schema 中定义了影子数据库) 和 `JWT_SECRET`。
>     * `DATABASE_URL` 需要您预先在MySQL中创建好对应的数据库和用户。您可以参考下面的“数据库创建提示”部分获取SQL命令示例。
>     * `JWT_SECRET` 必须是一个长且随机的安全字符串。您可以使用 Node.js 命令`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 在终端中生成一个。
> 3.  **(可选) 配置 API 密钥**:
>     * **DeepSeek AI 助手 API** (在 `.env` 文件中):
>         ```env
>         DEEPSEEK_API_KEY="your_deepseek_api_key_here"
>         ```
>         要获取此密钥，您需要拥有一个 DeepSeek 账户并创建 API密钥。更多信息请访问 [DeepSeek Platform](https://platform.deepseek.com/)。
>     * **腾讯翻译 API** (在 `.env` 文件中):
>         ```env
>         TENCENT_SECRET_ID="your_tencent_cloud_secret_id"
>         TENCENT_SECRET_KEY="your_tencent_cloud_secret_key"
>         TENCENT_TRANSLATE_REGION="ap-guangzhou" # 例如 ap-guangzhou, ap-singapore 等
>         ```
>         要获取这些密钥，您需要拥有一个腾讯云账户，并开通“文本翻译 (TMT)”服务。更多信息及开通服务，请访问 [腾讯云文本翻译产品页](https://cloud.tencent.com/product/tmt)。

---

### 3. 🗄️ 应用数据库迁移

在正确配置了 `.env` 文件中的数据库连接信息后（无论是通过脚本还是手动），运行以下命令来根据 `prisma/schema.prisma` 文件中的模型定义，在您的数据库中创建或更新表结构：

```bash
npx prisma migrate dev
```

* 首次运行时，此命令可能会提示您输入一个迁移的名称（例如，您可以输入 `init`）。此命令会根据您的 schema 定义同步数据库结构，并通常会自动生成 Prisma Client。

---

### 4. ✨ 生成 Prisma Client (通常自动完成)

Prisma Client 是一个类型安全的数据库查询构建器。虽然上一步的 `prisma migrate dev` **通常会自动触发 Prisma Client 的生成**，但如果因某些原因需要手动更新或确保它是最新的，可以运行：

```bash
npx prisma generate
```

* 此步骤确保您的应用代码可以正确地与数据库交互。

---

### 5. 启动本地开发服务器 💻

完成以上所有步骤后，您就可以启动项目的本地开发服务器了：

```bash
npm run dev
```

* 此命令会执行 `package.json` 文件中 `scripts` 字段里定义的名为 `dev` 的脚本。通常，这个脚本会编译代码、启动一个本地服务器（例如在 `http://localhost:3000`），并提供热更新功能，让您在修改代码后能立即在浏览器中看到效果。
