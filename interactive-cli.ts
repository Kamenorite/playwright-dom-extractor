import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { DOMMonitor } from './dom-monitor';
import { MCPAIService } from './services/mcp-ai-service';
import { AIService } from './services/ai-service';

// ASCII art banner
const banner = `
██████╗ ██╗      █████╗ ██╗   ██╗██╗    ██╗██████╗ ██╗ ██████╗ ██╗  ██╗████████╗
██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝██║    ██║██╔══██╗██║██╔════╝ ██║  ██║╚══██╔══╝
██████╔╝██║     ███████║ ╚████╔╝ ██║ █╗ ██║██████╔╝██║██║  ███╗███████║   ██║   
██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██║███╗██║██╔══██╗██║██║   ██║██╔══██║   ██║   
██║     ███████╗██║  ██║   ██║   ╚███╔███╔╝██║  ██║██║╚██████╔╝██║  ██║   ██║   
╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
                                                                                 
██████╗  ██████╗ ███╗   ███╗    ███████╗██╗  ██╗████████╗██████╗  █████╗  ██████╗████████╗ ██████╗ ██████╗ 
██╔══██╗██╔═══██╗████╗ ████║    ██╔════╝╚██╗██╔╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
██║  ██║██║   ██║██╔████╔██║    █████╗   ╚███╔╝    ██║   ██████╔╝███████║██║        ██║   ██║   ██║██████╔╝
██║  ██║██║   ██║██║╚██╔╝██║    ██╔══╝   ██╔██╗    ██║   ██╔══██╗██╔══██║██║        ██║   ██║   ██║██╔══██╗
██████╔╝╚██████╔╝██║ ╚═╝ ██║    ███████╗██╔╝ ██╗   ██║   ██║  ██║██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║
╚═════╝  ╚═════╝ ╚═╝     ╚═╝    ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
`;

// Check for MCP configuration
const hasMcpConfig = fs.existsSync(path.join(process.cwd(), '.cursor/mcp.json'));

/**
 * Main function to run the interactive CLI
 */
async function main() {
  console.log(chalk.cyan(banner));
  console.log(chalk.yellow('Interactive CLI for Playwright DOM Extractor'));
  console.log(chalk.dim('----------------------------------------'));
  console.log('');

  // Main menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🔍 Extract DOM from a URL', value: 'extract-dom' },
        { name: '📝 Scan Playwright Test Files', value: 'scan-specs' },
        { name: '🔄 Update Semantic Mappings', value: 'update-mappings' },
        { name: '🤖 Configure AI Settings', value: 'configure-ai' },
        { name: '📊 View Available Mappings', value: 'view-mappings' },
        { name: '❓ Help & Documentation', value: 'help' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'extract-dom':
      await extractDom();
      break;
    case 'scan-specs':
      await scanSpecs();
      break;
    case 'update-mappings':
      await updateMappings();
      break;
    case 'configure-ai':
      await configureAI();
      break;
    case 'view-mappings':
      await viewMappings();
      break;
    case 'help':
      showHelp();
      break;
    case 'exit':
      console.log(chalk.green('👋 Goodbye!'));
      process.exit(0);
      break;
  }

  // Ask if the user wants to perform another action
  const { continueAction } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continueAction',
      message: 'Would you like to perform another action?',
      default: true
    }
  ]);

  if (continueAction) {
    await main();
  } else {
    console.log(chalk.green('👋 Goodbye!'));
    process.exit(0);
  }
}

/**
 * Extract DOM from a URL
 */
async function extractDom() {
  console.log(chalk.cyan('\n🔍 Extract DOM Elements from a URL'));
  console.log(chalk.dim('----------------------------------------'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter the URL to analyze:',
      validate: (input: string) => input.trim() !== '' ? true : 'URL is required'
    },
    {
      type: 'list',
      name: 'aiOption',
      message: 'How would you like to generate semantic keys?',
      choices: [
        { name: 'Basic (Rule-based)', value: 'basic' },
        { name: 'AI-powered (via MCP)' + (hasMcpConfig ? ' ✅' : ' ⚠️'), value: 'ai-mcp', disabled: !hasMcpConfig },
        { name: 'AI-powered (via API Keys)', value: 'ai-api' }
      ]
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output directory:',
      default: './mappings'
    },
    {
      type: 'input',
      name: 'featureName',
      message: 'Feature name (optional, for better organization):',
    },
    {
      type: 'confirm',
      name: 'takeScreenshot',
      message: 'Take screenshot of the page?',
      default: true
    },
    {
      type: 'input',
      name: 'waitSelector',
      message: 'Wait for selector (optional):',
    },
    {
      type: 'number',
      name: 'timeout',
      message: 'Wait timeout (ms):',
      default: 5000
    }
  ]);

  // Configure AI options
  const useAI = answers.aiOption !== 'basic';
  const useMCP = answers.aiOption === 'ai-mcp';
  
  let aiService;
  if (useAI) {
    if (useMCP) {
      console.log(chalk.green('\n✅ Using Cursor MCP for AI capabilities (no external API key needed)'));
      aiService = new MCPAIService({ useMCP: true });
    } else {
      console.log(chalk.yellow('\nUsing external AI API - checking for API keys...'));
      aiService = new AIService({
        apiKey: process.env.AI_API_KEY,
        endpoint: process.env.AI_API_ENDPOINT
      });
    }
  }

  // Initialize spinner
  const spinner = ora('Initializing...').start();

  try {
    // Create DOMMonitor instance
    const monitor = new DOMMonitor({
      useAI,
      useMCP,
      aiService,
      outputPath: answers.outputPath,
      waitForSelector: answers.waitSelector || undefined,
      waitTimeout: answers.timeout,
      featureName: answers.featureName || undefined
    });

    spinner.text = 'Launching browser...';
    await monitor.init();

    spinner.text = `Navigating to ${answers.url}...`;
    await monitor.navigateTo(answers.url);

    spinner.text = 'Extracting DOM elements...';
    let elements = await monitor.extractDOMElements();
    
    spinner.text = 'Generating semantic keys...';
    elements = await monitor.generateSemanticKeys(elements);
    
    spinner.text = 'Saving reports...';
    const reports = await monitor.saveReport(answers.url, elements);
    
    // Take screenshot if enabled
    if (answers.takeScreenshot) {
      spinner.text = 'Taking screenshot...';
      
      // Extract base filename from URL for screenshot
      const urlObj = new URL(answers.url);
      const hostname = urlObj.hostname.replace(/\./g, '_');
      const pathname = urlObj.pathname.replace(/\//g, '_');
      const screenshotPath = path.join(answers.outputPath, `${hostname}${pathname}.png`);
      
      await monitor.takeScreenshot(screenshotPath, true);
    }
    
    await monitor.close();
    
    spinner.succeed('Done!');
    
    // Show summary
    console.log('\n' + chalk.green('✅ Extraction completed successfully!'));
    console.log(`\nExtracted ${chalk.yellow(elements.length)} elements from ${chalk.blue(answers.url)}`);
    console.log(`\nReports saved to:`);
    console.log(`  - JSON: ${chalk.yellow(reports.jsonPath)}`);
    console.log(`  - HTML: ${chalk.yellow(reports.htmlPath)}`);
    
    if (answers.takeScreenshot) {
      const urlObj = new URL(answers.url);
      const hostname = urlObj.hostname.replace(/\./g, '_');
      const pathname = urlObj.pathname.replace(/\//g, '_');
      const screenshotPath = path.join(answers.outputPath, `${hostname}${pathname}.png`);
      console.log(`  - Screenshot: ${chalk.yellow(screenshotPath)}`);
    }
    
  } catch (error: any) {
    spinner.fail('Error occurred');
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
  }
}

/**
 * Scan Playwright spec files
 */
async function scanSpecs() {
  console.log(chalk.cyan('\n📝 Scan Playwright Test Files'));
  console.log(chalk.dim('----------------------------------------'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'testsDir',
      message: 'Directory containing test files:',
      default: './tests'
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output directory:',
      default: './mappings'
    },
    {
      type: 'list',
      name: 'aiOption',
      message: 'How would you like to generate semantic keys?',
      choices: [
        { name: 'Basic (Rule-based)', value: 'basic' },
        { name: 'AI-powered (via MCP)' + (hasMcpConfig ? ' ✅' : ' ⚠️'), value: 'ai-mcp', disabled: !hasMcpConfig },
        { name: 'AI-powered (via API Keys)', value: 'ai-api' }
      ]
    },
    {
      type: 'confirm',
      name: 'takeScreenshots',
      message: 'Take screenshots of pages?',
      default: true
    }
  ]);

  // Build command
  let command = `npx ts-node scan-spec-files.ts --tests-dir "${answers.testsDir}" --output-path "${answers.outputPath}"`;
  
  if (answers.aiOption !== 'basic') {
    command += ' --use-ai';
    
    if (answers.aiOption === 'ai-mcp') {
      command += ' --use-mcp';
      console.log(chalk.green('\n✅ Using Cursor MCP for AI capabilities (no external API key needed)'));
    } else {
      console.log(chalk.yellow('\nUsing external AI API - will check for API keys...'));
    }
  }
  
  if (!answers.takeScreenshots) {
    command += ' --no-screenshots';
  }

  // Execute command
  console.log(chalk.dim(`\nExecuting: ${command}`));
  const spinner = ora('Scanning test files...').start();
  
  try {
    const output = execSync(command, { encoding: 'utf8' });
    spinner.succeed('Scan completed');
    console.log(chalk.green('\n✅ Test files scanned successfully!'));
    
    // Show summary (parse from output)
    const extractedPattern = /Found (\d+) URLs in (\d+) files/;
    const match = output.match(extractedPattern);
    
    if (match) {
      console.log(`\nExtracted ${chalk.yellow(match[1])} URLs from ${chalk.yellow(match[2])} test files`);
    }
    
    console.log(`\nMappings saved to: ${chalk.yellow(answers.outputPath)}`);
    
  } catch (error: any) {
    spinner.fail('Error occurred');
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
  }
}

/**
 * Update semantic mappings
 */
async function updateMappings() {
  console.log(chalk.cyan('\n🔄 Update Semantic Mappings'));
  console.log(chalk.dim('----------------------------------------'));

  const { updateType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'updateType',
      message: 'What would you like to update?',
      choices: [
        { name: 'Update mapping for a specific URL', value: 'url' },
        { name: 'Update all existing mappings', value: 'all' }
      ]
    }
  ]);

  if (updateType === 'url') {
    const { url, outputPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the URL to update:',
        validate: (input: string) => input.trim() !== '' ? true : 'URL is required'
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Mappings directory:',
        default: './mappings'
      }
    ]);

    const command = `npx ts-node update-semantic-index.ts --url "${url}" --output-path "${outputPath}"`;
    
    console.log(chalk.dim(`\nExecuting: ${command}`));
    const spinner = ora(`Updating mapping for ${url}...`).start();
    
    try {
      execSync(command, { encoding: 'utf8' });
      spinner.succeed('Update completed');
      console.log(chalk.green(`\n✅ Mapping for ${url} updated successfully!`));
    } catch (error: any) {
      spinner.fail('Error occurred');
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  } else {
    const { outputPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputPath',
        message: 'Mappings directory:',
        default: './mappings'
      }
    ]);

    const command = `npx ts-node update-semantic-index.ts --update-index --output-path "${outputPath}"`;
    
    console.log(chalk.dim(`\nExecuting: ${command}`));
    const spinner = ora('Updating all mappings...').start();
    
    try {
      execSync(command, { encoding: 'utf8' });
      spinner.succeed('Update completed');
      console.log(chalk.green('\n✅ All mappings updated successfully!'));
    } catch (error: any) {
      spinner.fail('Error occurred');
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  }
}

/**
 * Configure AI settings
 */
async function configureAI() {
  console.log(chalk.cyan('\n🤖 Configure AI Settings'));
  console.log(chalk.dim('----------------------------------------'));

  const { setupType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'setupType',
      message: 'How would you like to set up AI integration?',
      choices: [
        { name: 'Set up MCP Integration (Cursor)', value: 'mcp' },
        { name: 'Configure API Keys', value: 'api' },
        { name: 'View Current Configuration', value: 'view' }
      ]
    }
  ]);

  if (setupType === 'mcp') {
    console.log(chalk.yellow('\nSetting up MCP Integration:'));
    
    // Check if .cursor directory exists
    if (!fs.existsSync('.cursor')) {
      fs.mkdirSync('.cursor', { recursive: true });
      console.log(chalk.green('Created .cursor directory'));
    }
    
    // Create MCP configuration
    const mcpConfig = {
      mcp_server: 'https://api.cursor.sh',
      cursor_use_internal: true,
      ai: {
        provider: 'cursor'
      }
    };
    
    fs.writeFileSync('.cursor/mcp.json', JSON.stringify(mcpConfig, null, 2));
    console.log(chalk.green('Created .cursor/mcp.json configuration'));
    
    console.log(chalk.green('\n✅ MCP integration configured successfully!'));
    console.log(chalk.yellow('\nYou can now use MCP integration by:'));
    console.log('  - Setting --use-mcp flag in CLI commands');
    console.log('  - Selecting "AI-powered (via MCP)" in this interactive CLI');
    console.log(chalk.dim('\nNote: MCP integration requires running within the Cursor environment'));
    
  } else if (setupType === 'api') {
    console.log(chalk.yellow('\nConfiguring API Keys:'));
    
    const { apiKey, apiEndpoint } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your AI API Key:',
        validate: (input: string) => input.trim() !== '' ? true : 'API Key is required'
      },
      {
        type: 'input',
        name: 'apiEndpoint',
        message: 'API Endpoint (press Enter for default):',
        default: 'https://api.cursor.sh/v1/ai/completions'
      }
    ]);
    
    // Create or update .env file
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }
    
    // Replace or add AI_API_KEY
    if (envContent.includes('AI_API_KEY=')) {
      envContent = envContent.replace(/AI_API_KEY=.*(\r?\n|$)/, `AI_API_KEY=${apiKey}$1`);
    } else {
      envContent += `AI_API_KEY=${apiKey}\n`;
    }
    
    // Replace or add AI_API_ENDPOINT
    if (envContent.includes('AI_API_ENDPOINT=')) {
      envContent = envContent.replace(/AI_API_ENDPOINT=.*(\r?\n|$)/, `AI_API_ENDPOINT=${apiEndpoint}$1`);
    } else {
      envContent += `AI_API_ENDPOINT=${apiEndpoint}\n`;
    }
    
    fs.writeFileSync('.env', envContent);
    console.log(chalk.green('Updated .env file with API configuration'));
    
    console.log(chalk.green('\n✅ API keys configured successfully!'));
    console.log(chalk.yellow('\nFor current session, setting environment variables:'));
    
    // Set for current session
    process.env.AI_API_KEY = apiKey;
    process.env.AI_API_ENDPOINT = apiEndpoint;
    
  } else if (setupType === 'view') {
    console.log(chalk.yellow('\nCurrent AI Configuration:'));
    
    // Check MCP configuration
    if (fs.existsSync('.cursor/mcp.json')) {
      console.log(chalk.green('✅ MCP Integration: Configured'));
      try {
        const mcpConfig = JSON.parse(fs.readFileSync('.cursor/mcp.json', 'utf8'));
        console.log(chalk.dim(JSON.stringify(mcpConfig, null, 2)));
      } catch (error: any) {
        console.log(chalk.red('Error reading MCP configuration'));
      }
    } else {
      console.log(chalk.red('❌ MCP Integration: Not configured'));
    }
    
    // Check API keys
    console.log(chalk.yellow('\nAPI Keys:'));
    const apiKey = process.env.AI_API_KEY;
    const apiEndpoint = process.env.AI_API_ENDPOINT;
    
    if (apiKey) {
      console.log(chalk.green(`✅ API Key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`));
    } else {
      console.log(chalk.red('❌ API Key: Not set'));
    }
    
    if (apiEndpoint) {
      console.log(chalk.green(`✅ API Endpoint: ${apiEndpoint}`));
    } else {
      console.log(chalk.red('❌ API Endpoint: Not set'));
    }
  }
}

/**
 * View available mappings
 */
async function viewMappings() {
  console.log(chalk.cyan('\n📊 View Available Mappings'));
  console.log(chalk.dim('----------------------------------------'));

  const { mappingsDir } = await inquirer.prompt([
    {
      type: 'input',
      name: 'mappingsDir',
      message: 'Mappings directory:',
      default: './mappings'
    }
  ]);

  // Check if directory exists
  if (!fs.existsSync(mappingsDir)) {
    console.log(chalk.red(`\n❌ Directory ${mappingsDir} does not exist`));
    return;
  }

  // Get list of mapping files
  const files = fs.readdirSync(mappingsDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    console.log(chalk.yellow(`\nNo mapping files found in ${mappingsDir}`));
    return;
  }

  console.log(chalk.green(`\nFound ${files.length} mapping files:`));
  
  // Show file list with details
  files.forEach(file => {
    const filePath = path.join(mappingsDir, file);
    const stats = fs.statSync(filePath);
    
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const elementCount = Array.isArray(content) ? content.length : 0;
      
      console.log(`\n${chalk.cyan(file)}`);
      console.log(`  - Elements: ${chalk.yellow(elementCount)}`);
      console.log(`  - Size: ${chalk.yellow(formatBytes(stats.size))}`);
      console.log(`  - Last modified: ${chalk.yellow(stats.mtime.toLocaleString())}`);
      
      // Check for corresponding HTML report
      const htmlFile = file.replace('.json', '.html');
      if (fs.existsSync(path.join(mappingsDir, htmlFile))) {
        console.log(`  - HTML report: ${chalk.green('Available')}`);
      }
      
      // Check for corresponding screenshot
      const pngFile = file.replace('.json', '.png');
      if (fs.existsSync(path.join(mappingsDir, pngFile))) {
        console.log(`  - Screenshot: ${chalk.green('Available')}`);
      }
      
    } catch (error: any) {
      console.log(`\n${chalk.cyan(file)} ${chalk.red('(Invalid JSON)')}`);
    }
  });

  // Ask if user wants to view a specific mapping
  const { viewFile } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'viewFile',
      message: 'Would you like to open an HTML report?',
      default: false
    }
  ]);

  if (viewFile) {
    const htmlFiles = fs.readdirSync(mappingsDir).filter(file => file.endsWith('.html'));
    
    if (htmlFiles.length === 0) {
      console.log(chalk.yellow(`\nNo HTML reports found in ${mappingsDir}`));
      return;
    }
    
    const { selectedFile } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedFile',
        message: 'Select a report to open:',
        choices: htmlFiles
      }
    ]);
    
    const filePath = path.join(mappingsDir, selectedFile);
    
    try {
      // Try to open the file using different commands based on platform
      if (process.platform === 'win32') {
        execSync(`start ${filePath}`);
      } else if (process.platform === 'darwin') {
        execSync(`open ${filePath}`);
      } else {
        execSync(`xdg-open ${filePath}`);
      }
      
      console.log(chalk.green(`\n✅ Opened ${selectedFile}`));
    } catch (error: any) {
      console.log(chalk.red(`\n❌ Error opening file: ${error.message}`));
    }
  }
}

/**
 * Show help documentation
 */
function showHelp() {
  console.log(chalk.cyan('\n❓ Help & Documentation'));
  console.log(chalk.dim('----------------------------------------'));

  console.log(chalk.yellow('\nPlaywright DOM Extractor:'));
  console.log('A tool for extracting DOM elements from web pages, generating semantic keys, and creating mapping files for Playwright tests.');

  console.log(chalk.yellow('\nMain Features:'));
  console.log('- Extract DOM elements from URLs');
  console.log('- Scan Playwright test files to extract URLs and elements');
  console.log('- Generate semantic keys using rule-based or AI approaches');
  console.log('- Create HTML and JSON reports for extracted elements');
  console.log('- Take screenshots of analyzed pages');
  console.log('- Update existing semantic mappings');

  console.log(chalk.yellow('\nAI Integration Options:'));
  console.log('1. MCP Integration (Cursor):');
  console.log('   - Uses Cursor\'s Model Context Protocol for seamless AI integration');
  console.log('   - No API keys required when running in Cursor environment');
  console.log('   - Set up with "Configure AI Settings" > "Set up MCP Integration"');
  console.log('\n2. API Keys:');
  console.log('   - Uses explicit API keys for AI services');
  console.log('   - Configure with "Configure AI Settings" > "Configure API Keys"');

  console.log(chalk.yellow('\nTypical Workflow:'));
  console.log('1. Extract DOM elements from URLs or test files');
  console.log('2. Review generated semantic keys in the HTML report');
  console.log('3. Update mappings if needed');
  console.log('4. Use the mappings in your Playwright tests with the semantic helper');

  console.log(chalk.yellow('\nDocumentation:'));
  console.log('- MCP Integration: MCP-INTEGRATION.md');
  console.log('- Semantic Keys: SMART-SELECTOR.md');
  console.log('- Best Practices: BEST-PRACTICES.md');
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the CLI
main().catch(error => {
  console.error(chalk.red(`\n❌ Error: ${error.message}`));
  process.exit(1);
}); 