/**
 * Config Command
 * CLI for configuration management
 */

import { ConfigManager } from '../config';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const fullQuestion = defaultValue 
    ? `${question} (${defaultValue}): ` 
    : `${question}: `;
  
  return new Promise((resolve) => {
    rl.question(fullQuestion, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'show';

  const configManager = new ConfigManager();

  switch (command) {
    case 'init':
      await configManager.init();
      console.log('✅ Configuration initialized');
      break;

    case 'show':
      const config = await configManager.load();
      console.log('Current Configuration:\n');
      console.log(JSON.stringify(config, null, 2));
      break;

    case 'wizard':
      await runWizard(configManager);
      break;

    case 'reset':
      const defaultConfig = configManager.getDefaultConfig();
      await configManager.save(defaultConfig);
      console.log('✅ Configuration reset to defaults');
      break;

    default:
      console.log('Usage: memory-sync-config [init|show|wizard|reset]');
      process.exit(1);
  }

  rl.close();
  process.exit(0);
}

async function runWizard(configManager: ConfigManager) {
  console.log('🧠 Memory Sync Configuration Wizard\n');
  
  const config = configManager.getDefaultConfig();

  // Workspace
  config.source.workspace = await prompt(
    'Workspace path',
    config.source.workspace
  );

  // Service
  config.service.serverUrl = await prompt(
    'Sync service URL',
    config.service.serverUrl
  );

  config.service.apiKey = await prompt(
    'API key (optional)',
    config.service.apiKey
  );

  // Strategy
  const syncMode = await prompt(
    'Sync mode (incremental/full)',
    config.strategy.syncMode
  );
  config.strategy.syncMode = syncMode as any;

  // Schedule
  const enableSchedule = await prompt(
    'Enable scheduled sync? (yes/no)',
    config.schedule.enabled ? 'yes' : 'no'
  );
  config.schedule.enabled = enableSchedule.toLowerCase() === 'yes';

  if (config.schedule.enabled) {
    config.schedule.interval = await prompt(
      'Sync interval (15m/30m/1h/6h/1d)',
      config.schedule.interval
    );
  }

  // Save
  await configManager.save(config);
  console.log('\n✅ Configuration saved');
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
