# OpenClaw Memory Sync Plugin

🧠 将 OpenClaw Agent 的记忆同步到飞书云端

## 功能特性

- 📁 **智能采集** - 自动扫描 MEMORY.md、每日记忆、配置等文件
- ☁️ **云端同步** - 一键同步到飞书文档，支持分类存储
- 🔄 **增量同步** - 只同步变更内容，高效省流
- ⏰ **定时任务** - 支持自动定时同步
- 🔒 **安全可控** - 支持排除敏感文件，冲突处理策略可配置

## 快速开始

### 安装依赖

```bash
cd ~/.openclaw/extensions/memory-sync
npm install
npm run build
```

### 初始化配置

```bash
npm run config -- init
# 或使用向导
npm run config -- wizard
```

### 执行同步

```bash
npm run sync
```

## 配置说明

配置文件位置：`~/.openclaw/config/memory-sync.yaml`

```yaml
memory_sync:
  source:
    workspace: "~/.openclaw/workspace/pm"
    include:
      - "MEMORY.md"
      - "memory/*.md"
      - "AGENTS.md"
      - "SOUL.md"
    exclude:
      - "*.secret.md"
  
  target:
    doc_name: "OpenClaw记忆中心"
    categorize: true  # 按类型分类存储
  
  strategy:
    conflict_resolution: "local_priority"  # 冲突解决策略
    sync_mode: "incremental"               # 增量同步
  
  schedule:
    enabled: false
    interval: "1h"
```

## 文档结构

同步到飞书后的文档结构：

```
OpenClaw记忆中心
├── 🧠 长期记忆 (MEMORY.md)
├── 📅 每日记忆 (memory/*.md)
├── ⚙️ 配置 (AGENTS.md, USER.md)
├── 👤 身份定义 (SOUL.md, IDENTITY.md)
├── 💓 心跳配置 (HEARTBEAT.md)
└── 🛠️ 工具配置 (TOOLS.md)
```

## 开发计划

- [x] Phase 1: 基础框架搭建
- [ ] Phase 2: 飞书 API 集成
- [ ] Phase 3: 增量同步与定时任务
- [ ] Phase 4: 实时监听与版本历史

## License

MIT
