## 🚀 使用指南

本指南将引导您了解如何使用本项目，您可以选择直接访问我们部署的在线版本，或在您本地计算机上进行安装、配置和运行。

---

### 方式一：直接使用在线版本 (推荐给大多数用户)

您可以直接访问我们已经部署好的在线应用，无需任何本地安装和配置。

* **访问地址**: 见右侧的最新部署地址
* **所需条件**:
    * 一个现代的网页浏览器 (如 Chrome, Firefox, Edge, Safari)
    * 稳定的网络连接

打开上述链接即可开始使用各项工具！

---

### 方式二：在本地运行 (适用于开发者或希望自行托管的用户)

如果您希望在本地计算机上运行此项目，例如进行二次开发或自行托管，请遵循以下步骤。此方式将使用您本地的 MySQL 数据库。

#### 0. ✅ 前提条件

在开始之前，请确保您的开发环境中已安装以下软件：

* **Node.js**: 建议使用 LTS 版本 (例如 `v20.x` 或更高版本)。您可以从 [Node.js官网](https://nodejs.org/) 下载。
* **npm** (或 **yarn** / **pnpm**): 通常随 Node.js 一起安装。
* **Git**: 用于克隆代码库。
* **MySQL 服务器**: 项目后端使用 MySQL 数据库。
    * **重要**: 您需要自行安装并运行一个 MySQL 服务器实例。
    * **如何安装 MySQL?**
        * **Windows**: 推荐从 [MySQL Installer for Windows](https://dev.mysql.com/downloads/installer/) 下载并根据向导安装。
        * **macOS**: 可以使用 [Homebrew](https://brew.sh/) (`brew install mysql`) 或从 [MySQL Community Downloads](https://dev.mysql.com/downloads/mysql/) 下载 `.dmg` 安装包。
        * **Linux (以 Ubuntu 为例)**: 通常可以通过包管理器安装，例如 `sudo apt update && sudo apt install mysql-server`。其他 Linux 发行版请参考其官方文档。
        * **Docker**: 如果您熟悉 Docker，也可以使用官方的 [MySQL Docker 镜像](https://hub.docker.com/_/mysql)。
    * 安装完成后，请确保 MySQL 服务已启动，并且您知道如何连接到它（例如，知道 `root` 用户密码或已创建了专用的数据库用户和数据库）。

---

#### 1. 克隆代码库并安装依赖 📦

首先，克隆本代码库到您的本地计算机，进入项目目录，然后安装项目所需的依赖包：

```bash
# 导航到您希望存放项目的目录，例如桌面
cd ~/Desktop

# 克隆代码库
git clone https://github.com/WJH-makers/Toolbox.git

# 进入项目目录
cd Toolbox

# 安装依赖
npm install
```

* `npm install` 命令会根据项目根目录下的 `package.json` 文件中列出的依赖项，自动下载并安装所有必要的项目依赖包。这些依赖包会被存放在项目根目录下的 `node_modules` 文件夹中。

---

#### 2. ⚙️ 配置环境变量 (连接到您的本地MySQL)

环境变量用于配置数据库连接、API密钥等。对于本地运行，您主要需要配置数据库连接信息。

您可以通过以下任一方式配置：

* **方式 A: 运行安装向导 (推荐给初次本地配置者)**

  本项目提供了一个交互式的安装向导脚本，可以帮助您配置必要的环境变量。请在项目根目录下运行：

  ```bash
  npm run setup
  ```

    * 该脚本会引导您完成配置。当询问数据库信息时，请输入您**本地MySQL服务器**的连接详情：
        * **数据库主机名 (Database Host)**: 通常是 `localhost` 或 `127.0.0.1`。
        * **数据库端口号 (Database Port)**: MySQL 默认是 `3306`。
        * **数据库用户名 (Database User)**: 您本地 MySQL 的用户名（例如 `root`，或者您为项目创建的专用用户）。
        * **数据库密码 (Database Password)**: 对应用户的密码。
        * **数据库名称 (Database Name)**: 您希望项目使用（或创建）的数据库名称（例如 `toolbox_local`）。
        * 脚本可能会询问是否尝试自动创建数据库和用户。如果您提供了 MySQL 管理员权限，它可以尝试执行。否则，您需要预先手动创建好数据库和用户。
    * 对于 **JWT Secret**，向导会自动生成一个。
    * 对于第三方 **API 密钥** (如 DeepSeek, 腾讯翻译等)，在本地开发时这些是可选的。您可以暂时跳过，相关功能将不可用或使用模拟数据（如果项目支持）。
    * 脚本执行完毕后，会在项目根目录创建或更新一个 `.env` 文件。

* **方式 B: 手动配置 `.env` 文件**

    1.  复制项目根目录下的 `.env.example` 文件，并将其重命名为 `.env`。
        ```bash
        cp .env.example .env
        ```
    2.  打开并编辑新创建的 `.env` 文件。
    3.  **关键配置项 (本地MySQL)**:
        * `DATABASE_URL`: 这是最重要的配置。将其设置为指向您**本地MySQL数据库**的连接字符串。格式通常是：
          ```
          DATABASE_URL="mysql://YOUR_MYSQL_USER:YOUR_MYSQL_PASSWORD@YOUR_MYSQL_HOST:YOUR_MYSQL_PORT/YOUR_DATABASE_NAME"
          ```
          **示例**:
          ```env
          DATABASE_URL="mysql://root:mypassword@localhost:3306/toolbox_local"
          ```
          (请将 `YOUR_MYSQL_USER`, `YOUR_MYSQL_PASSWORD`, `YOUR_MYSQL_HOST`, `YOUR_MYSQL_PORT`, `YOUR_DATABASE_NAME` 替换为您本地MySQL的实际值。)
        * `SHADOW_DATABASE_URL`: Prisma 在某些迁移操作中可能会使用影子数据库。您可以将其配置为指向另一个本地MySQL数据库（例如 `toolbox_local_shadow`），或者在某些简单情况下，可以尝试使用与 `DATABASE_URL` 相同的数据库（但不推荐用于复杂场景）。如果您的本地MySQL用户有创建数据库的权限，Prisma `migrate dev` 可能会尝试自动创建它。
          **示例**:
          ```env
          SHADOW_DATABASE_URL="mysql://root:mypassword@localhost:3306/toolbox_local_shadow"
          ```
        * `JWT_SECRET`: 必须设置。这是一个用于保护用户会话安全的密钥。请生成一个长而随机的字符串。您可以使用以下 Node.js 命令在终端生成一个：
          ```bash
          node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
          ```
          然后将生成的密钥填入 `.env` 文件：
          ```env
          JWT_SECRET="您生成的64位十六进制字符串"
          ```
    4.  **(可选) 配置 API 密钥**:
        如果您希望在本地测试需要第三方 API 的功能（如 AI 助手、翻译等），请按照 `.env.example` 中的说明，填入您申请到的相应 API 密钥。如果留空，这些特定功能可能无法使用。

        * **DeepSeek AI API**:
          ```env
          DEEPSEEK_API_KEY="your_deepseek_api_key_here"
          # DEEPSEEK_BASE_URL="https://api.deepseek.com/v1" # 通常不需要修改
          ```
        * **腾讯翻译 API**:
          ```env
          TENCENT_SECRET_ID="your_tencent_cloud_secret_id"
          TENCENT_SECRET_KEY="your_tencent_cloud_secret_key"
          TENCENT_TRANSLATE_REGION="ap-guangzhou" # 或其他区域
          ```
        * **Mairui API**:
          ```env
          MAIRUI_API_LICENCE="your_mairui_api_licence"
          # MAIRUI_BASE_URL="https://api.mairui.club" # 通常不需要修改
          ```

  **重要提示**: `.env` 文件包含敏感信息，请确保已将其添加到您项目的 `.gitignore` 文件中，以避免意外提交到版本控制系统。

---

#### 3. 🗄️ 应用数据库迁移 (针对您的本地MySQL)

在正确配置了 `.env` 文件中的 `DATABASE_URL` (指向您的本地MySQL) 之后，运行以下命令。这个命令会读取 `prisma/schema.prisma` 文件中的数据模型定义，并在您的本地MySQL数据库中创建或更新相应的表结构。

```bash
npx prisma migrate dev
```

* 首次运行时，Prisma 可能会询问您为这次迁移输入一个名称（例如，您可以输入 `init_local_mysql`）。
* 此命令会根据您的 schema 定义同步数据库结构。如果您的本地MySQL中指定的数据库尚不存在，并且连接用户有权限，Prisma 可能会尝试创建它。

---

#### 4. ✨ 生成 Prisma Client (通常由上一步自动完成)

Prisma Client 是一个类型安全的数据库查询构建器，允许您的应用程序与数据库交互。虽然上一步的 `prisma migrate dev` **通常会自动触发 Prisma Client 的生成**，但如果需要手动更新或确保它是最新的，可以运行：

```bash
npx prisma generate
```

---

#### 5. 启动本地开发服务器 💻

完成以上所有步骤后，您就可以启动项目的本地开发服务器了：

```bash
npm run dev
```

* 此命令会执行 `package.json` 文件中 `scripts` 字段里定义的名为 `dev` 的脚本。
* 成功启动后，您通常可以在浏览器中访问 `http://localhost:3000` (或其他指定的端口) 来查看和使用本地运行的应用。服务器会提供热更新功能，您对代码的修改会实时反映在浏览器中。

---

如果您在配置或运行过程中遇到任何问题，请检查终端中的错误信息，并对照本指南的相关步骤进行排查。
