# M3 日志服务器

[English](README.md) | [中文](README_zh.md)

一个基于 Node.js 和 TypeScript 构建的轻量级日志收集和分析服务。该服务通过 HTTP 收集来自各种应用程序（Node.js、Android、iOS、Web）的日志，存储在 SQLite 中并支持自动轮转，并提供基于 Web 的查询界面。

## 功能特性

- 📥 **日志收集**：支持单条和批量日志提交的 HTTP API
- 💾 **SQLite 存储**：高效存储在 `/data` 目录
- 🔄 **自动轮转**：可配置的日志保留期（默认：7 天）
- 🔍 **查询界面**：提供多种过滤选项的 Web UI
- 🎯 **灵活搜索**：按来源、级别、时间范围、追踪 ID、内容正则表达式或自定义 SQL 进行过滤
- 📦 **多平台 SDK**：为 Node.js、Web、Android 和 iOS 提供即用型 SDK
- 🐳 **Docker 支持**：使用 Dockerfile 轻松部署
- 📘 **TypeScript**：完整的 TypeScript 实现，提供类型安全

## 快速开始

### 使用 Docker（推荐）

```bash
# 构建镜像
docker build -t m3-log-server .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v /path/to/data:/data \
  -e RETENTION_DAYS=7 \
  --name m3-log-server \
  m3-log-server
```

### 使用 Node.js

```bash
# 安装依赖
npm install

# 构建 TypeScript 代码
npm run build

# 启动服务器
npm start

# 或者用于开发（构建并启动）
npm run dev

# 或者使用自定义设置
PORT=8080 DATA_DIR=./data RETENTION_DAYS=14 npm start
```

## 环境变量

- `PORT`：服务器端口（默认：3000）
- `DATA_DIR`：SQLite 数据库的数据目录（默认：/data）
- `RETENTION_DAYS`：日志保留天数（默认：7）

## 日志格式

每条日志条目遵循以下制表符分隔的格式：

```
<date>\t<time>\t<level>\t<trace-id>\t<content>
```

- **date**：YYYY-MM-DD 格式
- **time**：HH:MM:SS 格式
- **level**：ERROR、WARN、INFO、DEBUG
- **trace-id**：可选的请求追踪 ID
- **content**：日志消息（换行符转义为 `\n`，反斜杠转义为 `\\`）

示例：
```
2026-01-18	10:30:45	INFO	trace-123	应用程序启动成功
```

## API 端点

### POST /api/log
提交单条日志条目。

**请求：**
```json
{
  "source": "my-app",
  "log": "2026-01-18\t10:30:45\tINFO\ttrace-123\t应用程序启动"
}
```

**响应：**
```json
{
  "success": true
}
```

### POST /api/logs
批量提交多条日志条目。

**请求：**
```json
{
  "source": "my-app",
  "logs": [
    "2026-01-18\t10:30:45\tINFO\ttrace-123\t应用程序启动",
    "2026-01-18\t10:30:46\tERROR\ttrace-123\t连接失败"
  ]
}
```

**响应：**
```json
{
  "success": true,
  "count": 2
}
```

### GET /api/query
使用过滤器查询日志。

**查询参数：**
- `source`：按来源应用程序过滤
- `level`：按日志级别过滤
- `traceId`：按追踪 ID 过滤
- `startDate`：开始日期（YYYY-MM-DD）
- `endDate`：结束日期（YYYY-MM-DD）
- `contentRegex`：内容搜索的正则表达式模式
- `limit`：最大结果数（默认：1000）

**示例：**
```
GET /api/query?source=web-app&level=ERROR&startDate=2026-01-01&limit=100
```

**响应：**
```json
{
  "results": [
    {
      "id": 1,
      "source": "web-app",
      "date": "2026-01-18",
      "time": "10:30:45",
      "level": "ERROR",
      "trace_id": "trace-123",
      "content": "连接失败",
      "created_at": "2026-01-18 10:30:45"
    }
  ],
  "count": 1
}
```

### POST /api/query/sql
执行自定义 SQL 查询。

**请求：**
```json
{
  "sql": "SELECT * FROM logs WHERE level = 'ERROR' ORDER BY created_at DESC LIMIT 10"
}
```

**响应：**
```json
{
  "results": [...]
}
```

## SDK 使用

### Node.js SDK

Node.js SDK 使用 TypeScript 编写，提供完整的类型安全。

**TypeScript：**
```typescript
import M3Logger from './sdk/node/dist/m3-logger';

// 初始化日志记录器
const logger = new M3Logger('http://localhost:3000', 'my-node-app');
logger.init(10); // 批量大小为 10

// 记录日志消息
logger.log('INFO', 'trace-123', '应用程序启动');
logger.log('ERROR', 'trace-124', '数据库连接失败');

// 手动刷新（可选）
logger.flush();

// 关闭日志记录器（刷新剩余日志）
logger.close();
```

**JavaScript：**
```javascript
const M3Logger = require('./sdk/node/dist/m3-logger').default;

// 初始化日志记录器
const logger = new M3Logger('http://localhost:3000', 'my-node-app');
logger.init(10); // 批量大小为 10

// 记录日志消息
logger.log('INFO', 'trace-123', '应用程序启动');
logger.log('ERROR', 'trace-124', '数据库连接失败');

// 手动刷新（可选）
logger.flush();

// 关闭日志记录器（刷新剩余日志）
logger.close();
```

### Web SDK

```html
<script src="sdk/web/m3-logger.js"></script>
<script>
  // 初始化日志记录器
  const logger = new M3Logger('http://localhost:3000', 'my-web-app');
  logger.init(10); // 批量大小为 10

  // 记录日志消息
  logger.log('INFO', null, '页面加载完成');
  logger.log('ERROR', 'trace-456', '表单验证失败');

  // 页面卸载时自动刷新日志
</script>
```

### Android SDK

```java
// 初始化日志记录器
M3Logger logger = new M3Logger("http://localhost:3000", "my-android-app");
logger.init(10); // 批量大小为 10

// 记录日志消息
logger.log("INFO", "trace-789", "Activity 启动");
logger.log("ERROR", "trace-790", "网络请求失败");

// 关闭日志记录器（刷新剩余日志）
logger.close();
```

### iOS SDK

```swift
// 初始化日志记录器
let logger = M3Logger(endpoint: "http://localhost:3000", source: "my-ios-app")
logger.init(batchCount: 10)

// 记录日志消息
logger.log(level: "INFO", traceId: "trace-101", content: "视图加载完成")
logger.log(level: "ERROR", traceId: "trace-102", content: "API 调用失败")

// 关闭日志记录器（刷新剩余日志）
logger.close()
```

## Web 查询界面

访问 `http://localhost:3000/` 的 Web 界面可以：

- 按来源、级别、追踪 ID、日期范围和内容过滤日志
- 使用正则表达式模式进行内容搜索
- 执行自定义 SQL 查询
- 在表格中查看格式化的日志条目

## 数据库模式

SQLite 数据库包含一个 `logs` 表：

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  level TEXT NOT NULL,
  trace_id TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

在以下字段上创建索引：`source`、`date`、`level`、`trace_id`、`created_at`

## 日志保留

根据 `RETENTION_DAYS` 设置自动清理日志：
- 每 24 小时运行一次清理
- 服务器启动后 5 秒运行初始清理
- 超过保留期的日志将被永久删除

## 开发

本项目使用 TypeScript 编写，编译为 JavaScript 执行。

### 项目结构

```
├── src/                    # TypeScript 源文件
│   ├── database.ts        # 数据库操作
│   ├── server.ts          # HTTP 服务器实现
│   └── index.ts           # 入口点
├── dist/                   # 编译后的 JavaScript（生成）
├── sdk/
│   └── node/              # Node.js SDK
│       ├── m3-logger.ts   # TypeScript 源代码
│       └── dist/          # 编译后的 SDK（生成）
├── public/                # 静态 Web UI 文件
└── tsconfig.json          # TypeScript 配置
```

### 构建命令

```bash
# 安装依赖
npm install

# 将 TypeScript 构建为 JavaScript
npm run build

# 启动开发服务器（构建并运行）
npm run dev

# 启动生产服务器
npm start
```

### 构建 Node.js SDK

```bash
cd sdk/node
npx tsc
```

编译后的 SDK 将在 `sdk/node/dist/` 目录中。

## 许可证

MIT
