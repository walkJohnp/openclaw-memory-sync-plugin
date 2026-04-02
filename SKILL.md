# Memory Sync Plugin

OpenClaw Agent 记忆同步插件

## 功能

将本地记忆文件同步到远程同步服务：
- 扫描 `MEMORY.md`, `memory/*.md` 等记忆文件
- 增量同步到同步服务
- 支持文件监控自动同步

## 使用

### 初始化配置

```bash
npm run init
```

### 执行同步

```bash
npm run sync
```

### 配置同步服务

编辑 `~/.openclaw/config/memory-sync.yaml`：

```yaml
memory_sync:
  service:
    serverUrl: http://your-sync-service:8080
    apiKey: your-api-key
```

## 架构

```
Plugin → Sync Service → (PostgreSQL + MinIO)
```

插件只负责：
1. 扫描本地文件
2. 计算文件哈希
3. 调用同步服务 API

同步服务负责：
1. 存储文件元数据
2. 存储文件内容
3. 同步到飞书（内部处理）

## 开发

```bash
npm install
npm run build
npm test
```
