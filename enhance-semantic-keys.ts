import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { CursorAIService } from './services/cursor-ai-service';

interface EnhanceOptions {
  file?: string;
  dir?: string;
  output?: string;
}

/**
 * Enhance a single mapping file with better semantic keys
 */
async function enhanceMappingFile(filePath: string, outputPath?: string): Promise<void> {
  console.log(`Enhancing semantic keys in ${filePath}...`);
  
  try {
    // Read the existing mapping
    const mappingContent = fs.readFileSync(filePath, 'utf-8');
    const elements = JSON.parse(mappingContent);
    
    if (!Array.isArray(elements)) {
      console.error(`Invalid mapping file: ${filePath} - not an array`);
      return;
    }
    
    // Create Cursor AI Service
    const cursorService = new CursorAIService({
      mcpEnabled: true
    });
    
    // Enhance each element's semantic key
    const enhancedElements = await Promise.all(
      elements.map(async (element) => {
        try {
          // Only process elements that already have a semantic key
          if (element.semanticKey) {
            const enhancedKey = await cursorService.generateSemanticKeyForElement(element);
            return {
              ...element,
              originalSemanticKey: element.semanticKey, // Keep the original for reference
              semanticKey: enhancedKey
            };
          }
          return element;
        } catch (error) {
          console.warn(`Error enhancing key for element:`, error);
          return element;
        }
      })
    );
    
    // Save the enhanced mapping
    const targetPath = outputPath || filePath;
    fs.writeFileSync(targetPath, JSON.stringify(enhancedElements, null, 2));
    console.log(`Enhanced mapping saved to ${targetPath}`);
    
    // Generate a comparison report
    const reportPath = path.join(
      path.dirname(targetPath),
      `${path.basename(targetPath, '.json')}-report.html`
    );
    
    generateComparisonReport(elements, enhancedElements, reportPath);
    console.log(`Comparison report generated at ${reportPath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

/**
 * Generate a HTML report comparing original and enhanced semantic keys
 */
function generateComparisonReport(originalElements: any[], enhancedElements: any[], reportPath: string): void {
  const rows = originalElements.map((original, index) => {
    const enhanced = enhancedElements[index];
    return `
    <tr>
      <td>${original.tagName}</td>
      <td>${original.innerText || ''}</td>
      <td>${original.xpath}</td>
      <td>${original.semanticKey || ''}</td>
      <td>${enhanced.semanticKey || ''}</td>
      <td>${enhanced.semanticKey !== original.semanticKey ? '✓' : ''}</td>
    </tr>
    `;
  }).join('');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Semantic Key Enhancement Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
      th { background-color: #f2f2f2; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .search { margin: 20px 0; }
      .search input { padding: 8px; width: 300px; }
      .changed { background-color: #e6ffe6; }
    </style>
    <script>
      function filterTable() {
        const input = document.getElementById('search').value.toLowerCase();
        const rows = document.getElementsByTagName('tr');
        
        for (let i = 1; i < rows.length; i++) {
          const text = rows[i].textContent.toLowerCase();
          rows[i].style.display = text.includes(input) ? '' : 'none';
        }
      }
      
      function highlightChanged() {
        const rows = document.getElementsByTagName('tr');
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].getElementsByTagName('td');
          if (cells[5].textContent === '✓') {
            rows[i].classList.add('changed');
          }
        }
      }
      
      window.onload = highlightChanged;
    </script>
  </head>
  <body>
    <h1>Semantic Key Enhancement Report</h1>
    
    <div class="search">
      <input type="text" id="search" onkeyup="filterTable()" placeholder="Search elements...">
    </div>
    
    <table>
      <tr>
        <th>Element</th>
        <th>Text</th>
        <th>XPath</th>
        <th>Original Key</th>
        <th>Enhanced Key</th>
        <th>Changed</th>
      </tr>
      ${rows}
    </table>
  </body>
  </html>
  `;
  
  fs.writeFileSync(reportPath, html);
}

/**
 * Enhance semantic keys in all mapping files in a directory
 */
async function enhanceDirectory(dirPath: string, outputDir?: string): Promise<void> {
  console.log(`Enhancing all mapping files in ${dirPath}...`);
  
  const files = glob.sync(path.join(dirPath, '*.json'));
  
  if (files.length === 0) {
    console.log(`No JSON files found in ${dirPath}`);
    return;
  }
  
  console.log(`Found ${files.length} mapping files`);
  
  // Create output directory if specified and doesn't exist
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Process each file
  for (const file of files) {
    const outputPath = outputDir ? 
      path.join(outputDir, path.basename(file)) : 
      undefined;
    
    await enhanceMappingFile(file, outputPath);
  }
  
  console.log(`Enhanced ${files.length} mapping files`);
}

async function main() {
  const args = minimist(process.argv.slice(2));
  
  if (args.help || (!args.file && !args.dir)) {
    console.log('Usage:');
    console.log('  npm run enhance-keys -- --file path/to/mapping.json [--output path/to/output.json]');
    console.log('  npm run enhance-keys -- --dir path/to/mappings/dir [--output path/to/output/dir]');
    console.log('');
    console.log('Options:');
    console.log('  --file        Single mapping file to enhance');
    console.log('  --dir         Directory containing mapping files to enhance');
    console.log('  --output      Output file or directory (defaults to overwrite input)');
    console.log('  --help        Show this help message');
    process.exit(0);
  }
  
  if (args.file) {
    await enhanceMappingFile(args.file, args.output);
  } else if (args.dir) {
    await enhanceDirectory(args.dir, args.output);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 