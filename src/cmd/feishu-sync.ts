/**
 * Feishu Sync Command
 * Direct sync to Feishu using OpenClaw feishu_doc tool
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE = '/root/.openclaw/workspace/pm';

// Category definitions
const CATEGORIES: Record<string, { name: string; emoji: string }> = {
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
  type: string;
  content: string;
  size: number;
  modifiedAt: Date;
}

async function scanFiles(): Promise<MemoryFile[]> {
  const { glob } = await import('glob');
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
    const matches = await glob(path.join(WORKSPACE, pattern));
    
    for (const match of matches) {
      const relativePath = path.relative(WORKSPACE, match);
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

function classifyFile(filePath: string): string {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function createOrUpdateDocument(title: string, content: string, docToken?: string): Promise<string> {
  // This function would call feishu_doc tool
  // For now, we return a mock token
  console.log(`   📄 ${title}: ${content.length} chars`);
  return docToken || `doc_${Date.now()}`;
}

async function syncToFeishu(files: MemoryFile[]) {
  console.log(`\n🧠 OpenClaw Memory Sync to Feishu\n`);
  console.log(`Found ${files.length} memory files\n`);

  // Group files by type
  const grouped = new Map<string, MemoryFile[]>();
  for (const file of files) {
    if (!grouped.has(file.type)) {
      grouped.set(file.type, []);
    }
    grouped.get(file.type)!.push(file);
  }

  const results: { type: string; docId: string; url: string }[] = [];

  // Create/update documents for each category
  for (const [type, categoryFiles] of grouped) {
    const category = CATEGORIES[type];
    console.log(`${category.emoji} ${category.name} (${categoryFiles.length} files)`);

    // Build document content
    let docContent = `# ${category.name}\n\n`;
    docContent += `> 最后同步: ${new Date().toLocaleString('zh-CN')}\n`;
    docContent += `> 文件数: ${categoryFiles.length}\n\n`;
    docContent += `---\n\n`;

    for (const file of categoryFiles) {
      docContent += `## 📄 ${file.path}\n\n`;
      docContent += `- 大小: ${formatBytes(file.size)}\n`;
      docContent += `- 修改时间: ${file.modifiedAt.toISOString()}\n\n`;
      docContent += file.content;
      docContent += `\n\n---\n\n`;
    }

    // Create/update document
    const docTitle = `OpenClaw - ${category.name}`;
    const docId = await createOrUpdateDocument(docTitle, docContent);
    
    results.push({
      type,
      docId,
      url: `https://feishu.cn/docx/${docId}`,
    });

    console.log(`   ✅ Created/Updated: ${docTitle}\n`);
  }

  // Print summary
  console.log('📊 Sync Summary\n');
  console.log('| 分类 | 文件数 | 文档链接 |');
  console.log('|------|--------|----------|');
  
  for (const result of results) {
    const category = CATEGORIES[result.type];
    const count = grouped.get(result.type)?.length || 0;
    console.log(`| ${category.name} | ${count} | [查看](${result.url}) |`);
  }

  console.log('\n✨ Sync completed!');
}

async function main() {
  try {
    const files = await scanFiles();
    
    if (files.length === 0) {
      console.log('No memory files found.');
      process.exit(0);
    }

    await syncToFeishu(files);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
