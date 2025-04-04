import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { DOMMonitor } from './dom-monitor';
import { MCPService } from './services/mcp-ai-service';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

// Promisify the exec function
const exec = promisify(execCallback);

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
  displayHeader();
  
  // Check if MCP configuration is available
  const mcpConfigured = true;
  
  if (!mcpConfigured) {
    console.log(chalk.red('Error: MCP configuration not found.'));
    console.log('This tool requires Cursor for access to the MCP service.');
    console.log('Please run this tool within Cursor.');
    process.exit(1);
  }
  
  let exitRequested = false;
  
  while (!exitRequested) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Extract semantic keys from a single URL', value: 'extract-url' },
          { name: 'Scan Playwright spec files for semantic mapping', value: 'scan-specs' },
          { name: 'View available semantic mappings', value: 'view-mappings' },
          { name: 'Help', value: 'help' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);
    
    switch (answers.action) {
      case 'extract-url':
        await extractFromURL();
        break;
      case 'scan-specs':
        await scanSpecs();
        break;
      case 'view-mappings':
        await viewMappings();
        break;
      case 'help':
        showHelp();
        break;
      case 'exit':
        console.log(chalk.green('Goodbye!'));
        exitRequested = true;
        // Force exit after a short delay to ensure all processes are done
        setTimeout(() => {
          process.exit(0);
        }, 500);
        break;
    }
  }
}

/**
 * Display the CLI header with banner and title
 */
function displayHeader() {
  console.log(chalk.cyan(banner));
  console.log(chalk.yellow('Interactive CLI for Playwright DOM Extractor'));
  console.log(chalk.dim('----------------------------------------'));
  console.log('');
}

/**
 * Extract DOM from a URL
 */
async function extractFromURL() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter the URL to extract DOM elements from:',
      validate: (input) => {
        if (!input) return 'URL is required';
        if (!input.startsWith('http')) return 'URL must start with http:// or https://';
        return true;
      }
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Enter the output path for mappings:',
      default: './mappings'
    },
    {
      type: 'input',
      name: 'featureName',
      message: 'Enter a feature name (optional, used for file organization):',
      default: ''
    }
  ]);

  if (!fs.existsSync(answers.outputPath)) {
    fs.mkdirSync(answers.outputPath, { recursive: true });
  }

  const spinner = ora('Analyzing page and extracting DOM elements...').start();

  try {
    let command = `node dist/process-single-url.js --url="${answers.url}" --output-path="${answers.outputPath}"`;
    
    if (answers.featureName) {
      command += ` --feature-name="${answers.featureName}"`;
    }
    
    spinner.text = 'Launching browser and analyzing page...';
    
    console.log(`\nRunning command: ${command}`);
    
    const { stdout, stderr } = await exec(command);
    
    spinner.succeed('DOM extraction completed!');
    
    // Display the output or open the reports
    console.log(chalk.green('\nResults:'));
    console.log(stdout);
    
    if (stderr) {
      console.log(chalk.yellow('\nWarnings/Errors:'));
      console.log(stderr);
    }
    
    // Ask if the user wants to view the HTML report
    const { viewReport } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'viewReport',
        message: 'Would you like to open the HTML report?',
        default: true
      }
    ]);
    
    if (viewReport) {
      // Find the most recently created HTML file in the output directory
      const files = fs.readdirSync(answers.outputPath)
        .filter(file => file.endsWith('.html'))
        .map(file => ({
          name: file,
          path: path.join(answers.outputPath, file),
          time: fs.statSync(path.join(answers.outputPath, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      if (files.length > 0) {
        const htmlReportPath = files[0].path;
        console.log(chalk.green(`Opening HTML report: ${htmlReportPath}`));
        
        // Open the HTML file in the default browser
        const openCommand = process.platform === 'win32' ? 'start' : 
                            process.platform === 'darwin' ? 'open' : 'xdg-open';
        await exec(`${openCommand} "${htmlReportPath}"`);
      } else {
        console.log(chalk.yellow('No HTML report found.'));
      }
    }
  } catch (error: any) {
    spinner.fail('Error during DOM extraction');
    console.error(chalk.red('Error:'), error.message);
  }
}

/**
 * Scan Playwright spec files
 */
async function scanSpecs() {
  console.log(chalk.cyan('\n📝 Scan Playwright Test Files'));
  console.log(chalk.dim('----------------------------------------'));

  if (!hasMcpConfig) {
    console.log(chalk.yellow('\n⚠️ MCP configuration not found at: .cursor/mcp.json'));
    console.log('This tool requires Cursor MCP to function properly.');
    console.log('Please create a .cursor/mcp.json file with the following content:');
    console.log(chalk.gray(`
{
  "mcp_server": "https://api.cursor.sh",
  "cursor_use_internal": true,
  "ai": {
    "provider": "cursor"
  },
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp"]
    }
  }
}
`));
    console.log('Then restart the CLI.\n');
    return;
  }

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
      type: 'confirm',
      name: 'takeScreenshots',
      message: 'Take screenshots of pages?',
      default: true
    }
  ]);

  // Build command with MCP by default
  let command = `npx ts-node scan-spec-files.ts --tests-dir "${answers.testsDir}" --output-path "${answers.outputPath}"`;
  
  console.log(chalk.green('\n✅ Using Cursor MCP for semantic key generation'));
  
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
  console.log('- Generate semantic keys using Cursor MCP');
  console.log('- Create HTML and JSON reports for extracted elements');
  console.log('- Take screenshots of analyzed pages');
  console.log('- Update existing semantic mappings');

  console.log(chalk.yellow('\nMCP Integration:'));
  console.log('- Uses Cursor\'s Model Context Protocol (MCP) for semantic key generation');
  console.log('- Integrates directly with Playwright through @playwright/mcp');
  console.log('- No API keys required when running in Cursor environment');
  console.log('- Configured through the .cursor/mcp.json file');

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