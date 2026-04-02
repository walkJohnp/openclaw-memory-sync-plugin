# 手动同步到飞书

由于飞书 API 需要在 OpenClaw 运行时中调用，请按以下步骤手动同步：

## 步骤 1: 准备内容

运行扫描命令查看要同步的文件：

```bash
cd ~/.openclaw/extensions/memory-sync
node dist/cmd/feishu-sync.js
```

## 步骤 2: 创建飞书文档

在飞书中创建以下文档：

1. **OpenClaw - 🧠 长期记忆** - 包含 MEMORY.md
2. **OpenClaw - 📅 每日记忆** - 包含 memory/*.md
3. **OpenClaw - ⚙️ 配置** - 包含 AGENTS.md, USER.md
4. **OpenClaw - 👤 身份定义** - 包含 SOUL.md, IDENTITY.md
5. **OpenClaw - 💓 心跳配置** - 包含 HEARTBEAT.md
6. **OpenClaw - 🛠️ 工具配置** - 包含 TOOLS.md

## 步骤 3: 使用 OpenClaw 工具同步

在 OpenClaw 中运行以下命令：

```javascript
// 读取本地文件
const fs = require('fs');
const path = require('path');

const workspace = '/root/.openclaw/workspace/pm';

// 读取 MEMORY.md
const memoryContent = fs.readFileSync(path.join(workspace, 'MEMORY.md'), 'utf-8');

// 同步到飞书
await feishu_doc({
  action: 'create',
  title: 'OpenClaw - 🧠 长期记忆',
  content: memoryContent
});
```

## 自动化方案

要实现全自动同步，需要：

1. 将插件注册为 OpenClaw 扩展
2. 在插件中调用 feishu_doc 工具
3. 添加定时任务支持

这需要 OpenClaw 的扩展系统支持，目前可以通过手动方式完成同步。
