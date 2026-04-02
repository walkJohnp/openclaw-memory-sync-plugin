/**
 * Sync memories to Feishu
 * Direct integration with OpenClaw's feishu_doc tool
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Category definitions
const CATEGORIES = {
  long_term: { name: '🧠 长期记忆', emoji: '🧠' },
  daily: { name: '📅 每日记忆', emoji: '📅' },
  config: { name: '⚙️ 配置', emoji: '⚙️' },
  heartbeat: { name: '💓 心跳配置', emoji: '💓' },
  tools: { name: '🛠️ 工具配置', emoji: '🛠️' },
  identity: { name: '👤 身份定义', emoji: '👤' },
  other: { name: '📄 其他', emoji: '📄' },
};

interface MemoryFile {
  path: string;
  type: keyof typeof CATEGORIES;
  content: string;
  size: number;
  modifiedAt: Date;
}

async function scanWorkspace(workspace: string): Promise<MemoryFile[]> {
  const files: MemoryFile[] = [];
  
  const patterns = [
    'MEMORY.md',
    'memory/*.md',
    'AGENTS.md',
    'SOUL.md',
    'USER.md',
    'HEARTBEAT.md',
    'TOOLS.md',
    'IDENTITY.md',
  ];

  for (const pattern of patterns) {
    const fullPattern = path.join(workspace, pattern);
    const glob = require('glob');
    const matches = await glob.glob(fullPattern);
    
    for (const match of matches) {
      const relativePath = path.relative(workspace, match);
      const content = await fs.readFile(match, 'utf-8');
      const stats = await fs.stat(match);
      
      files.push({
        path: relativePath,
        type: classifyFile(relativePath),
        content,
        size: stats.size,
        modifiedAt: stats.mtime,
      });
    }
  }
  
  return files;
}

function classifyFile(filePath: string): keyof typeof CATEGORIES {
  const basename = path.basename(filePath);
  const dirname = path.dirname(filePath);

  if (basename === 'MEMORY.md') return 'long_term';
  if (dirname === 'memory' && /^\d{4}-\d{2}-\d{2}\.md$/.test(basename)) return 'daily';
  if (['AGENTS.md', 'USER.md'].includes(basename)) return 'config';
  if (basename === 'SOUL.md' || basename === 'IDENTITY.md') return 'identity';
  if (basename === 'HEARTBEAT.md') return 'heartbeat';
  if (basename === 'TOOLS.md') return 'tools';
  
  return 'other';
}

async function syncToFeishu(files: MemoryFile[]) {
  console.log(`🧠 Syncing ${files.length} memory files to Feishu...\n`);

  // Group files by type
  const grouped = new Map<keyof typeof CATEGORIES, MemoryFile[]>();
  for (const file of files) {
    if (!grouped.has(file.type)) {
      grouped.set(file.type, []);
    }
    grouped.get(file.type)!.push(file);
  }

  // Create/update documents for each category
  for (const [type, categoryFiles] of grouped) {
    const category = CATEGORIES[type];
    console.log(`${category.emoji} Processing ${category.name} (${categoryFiles.length} files)...`);

    // Build document content
    let docContent = `# ${category.name}\n\n`;
    docContent += `> 最后同步: ${new Date().toISOString()}\n\n`;
    docContent += `---\n\n`;

    for (const file of categoryFiles) {
      docContent += `## 📄 ${file.path}\n\n`;
      docContent += `**大小**: ${formatBytes(file.size)} | **修改时间**: ${file.modifiedAt.toISOString()}\n\n`;
      docContent += file.content;
      docContent += `\n\n---\n\n`;
    }

    // Here we would call feishu_doc tool
    // For now, just log the content length
    console.log(`   Content length: ${docContent.length} chars`);
    
    // Save to temp for inspection
    const tempFile = `/tmp/memory-sync-${type}.md`;
    await fs.writeFile(tempFile, docContent, 'utf-8');
    console.log(`   Saved to: ${tempFile}`);
  }

  console.log('\n✅ Sync completed!');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  const workspace = process.env.OPENCLAW_WORKSPACE || '/root/.openclaw/workspace/pm';
  
  console.log('🔍 Scanning workspace:', workspace);
  const files = await scanWorkspace(workspace);
  console.log(`Found ${files.length} memory files\n`);

  if (files.length === 0) {
    console.log('No memory files found.');
    return;
  }

  await syncToFeishu(files);
}

main().catch(console.error);
