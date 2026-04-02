#!/bin/bash
# Auto-improve script for memory-sync plugin
# Runs every 20 minutes to improve code and tests

set -e

echo "🤖 Memory Sync Auto-Improve"
echo "Time: $(date)"
echo ""

cd ~/.openclaw/extensions/memory-sync

echo "📦 Installing dependencies..."
npm install 2>&1 | tail -5

echo ""
echo "🔨 Building project..."
npm run build 2>&1

echo ""
echo "🧪 Running tests..."
npm test 2>&1 || echo "⚠️ Tests failed, will continue..."

echo ""
echo "📊 Checking test coverage..."
npm run test:coverage 2>&1 | tail -20 || echo "⚠️ Coverage check failed"

echo ""
echo "📝 Project status:"
echo "  - Source files: $(find src -name '*.ts' | wc -l)"
echo "  - Test files: $(find tests -name '*.test.ts' 2>/dev/null | wc -l)"
echo "  - Lines of code: $(find src -name '*.ts' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')"
echo "  - Lines of tests: $(find tests -name '*.ts' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')"

echo ""
echo "✅ Auto-improve cycle completed at $(date)"
echo "Next run in 20 minutes..."
