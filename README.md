# OpenClaw Memory Sync Plugin

OpenClaw Agent 记忆同步插件 - 将本地记忆文件同步到同步服务。

## 架构

```
┌─────────────────┐     HTTP API      ┌─────────────────┐
│  Memory Plugin  │ ─────────────────→ │  Sync Service   │
│  (This Repo)    │                    │  (Separate)     │
└─────────────────┘                    └─────────────────┘
                                              │
                                              │ (内部处理)
                                              ▼
                                       ┌─────────────────┐
                                       │  PostgreSQL     │
                                       │  MinIO          │
                                       └─────────────────┘
```

## 功能

- 📁 扫描本地记忆文件（MEMORY.md, memory/*.md, 配置等）
- 🔄 增量同步到同步服务
- 🔐 API 密钥认证
- 📊 同步状态追踪
- 👀 文件监控（可选）

## 安装

```bash
npm install
npm run build
```

## 配置

配置文件位置：`~/.openclaw/config/memory-sync.yaml`

```yaml
memory_sync:
  source:
    workspace: /home/user/.openclaw/workspace/pm
    include:
      - MEMORY.md
      - memory/*.md
      - AGENTS.md
      - SOUL.md
      - USER.md
      - HEARTBEAT.md
      - TOOLS.md
      - IDENTITY.md
    exclude:
      - '*.secret.md'
      - node_modules/**
  
  service:
    serverUrl: http://localhost:8080
    apiKey: ''
    timeout: 30000
  
  strategy:
    syncMode: incremental
    deleteRemote: false
  
  schedule:
    enabled: false
    interval: 1h
  
  advanced:
    watch: false
    compress: false
    logLevel: info
```

## 使用

### 命令行

```bash
# 初始化配置
npm run init

# 执行同步
npm run sync

# 查看状态
npm run status

# 配置服务地址
npm run config -- --server http://sync.example.com --api-key xxx
```

### 程序化使用

```typescript
import { SyncEngine, ConfigManager } from 'memory-sync';

const configManager = new ConfigManager();
const config = await configManager.load();

const engine = new SyncEngine(config);
const result = await engine.sync();

console.log(`Uploaded: ${result.uploaded}`);
console.log(`Errors: ${result.errors.length}`);
```

## API

插件通过 HTTP API 与同步服务通信：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/files | 获取已同步文件列表 |
| POST | /api/files/upload | 上传文件 |
| DELETE | /api/files/:id | 删除文件 |

## 开发

```bash
# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## License

MIT
