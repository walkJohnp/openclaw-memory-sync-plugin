# Memory Sync Skill

同步 OpenClaw Agent 记忆到飞书云端

## 功能

- 扫描本地记忆文件（MEMORY.md、memory/*.md 等）
- 同步到飞书文档，支持分类存储
- 增量同步，只上传变更内容
- 定时自动同步

## 使用

### 命令行

```bash
# 初始化配置
memory-sync config init

# 执行同步
memory-sync sync

# 查看状态
memory-sync status
```

### 程序化调用

```typescript
import { SyncEngine, ConfigManager } from 'openclaw-memory-sync';

const configManager = new ConfigManager();
const config = await configManager.load();

const engine = new SyncEngine(config);
const result = await engine.sync();

console.log(`Synced ${result.uploaded} files`);
```

## 配置

```yaml
memory_sync:
  source:
    workspace: "~/.openclaw/workspace/pm"
    include: ["MEMORY.md", "memory/*.md"]
    exclude: ["*.secret.md"]
  target:
    doc_name: "OpenClaw记忆中心"
    categorize: true
  strategy:
    conflict_resolution: "local_priority"
    sync_mode: "incremental"
```
