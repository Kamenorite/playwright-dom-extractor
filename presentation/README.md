# Playwright DOM Extractor - Presentation Guide

This directory contains materials for presenting and demonstrating the Playwright DOM Extractor tool.

## Slide Deck Outline

1. **Title Slide**
   - Playwright DOM Extractor: Automated Web Element Analysis & Test Generation
   - Your Name
   - Date

2. **Problem Statement**
   - Challenges in web automation and testing
   - Brittle selectors lead to flaky tests
   - Manual selector creation is time-consuming
   - Lack of standardized naming conventions

3. **Solution Overview**
   - What is Playwright DOM Extractor?
   - Key capabilities and benefits
   - Architecture overview

4. **Key Features**
   - DOM element extraction with semantic key generation
   - Data-testid attribute prioritization
   - AI-powered element analysis (with MCP integration)
   - Test generation and element mapping

5. **Technical Components**
   - DOM Monitor for element extraction
   - Semantic Key Generation system
   - Cursor MCP AI integration
   - Reporting functionality

6. **Using the Tool**
   - Command Line Interface
   - Interactive CLI
   - Integration with existing test suites
   - Configuration options

7. **Best Practices**
   - Data-testid implementation
   - Semantic key naming conventions
   - Integration with CI/CD pipelines
   - Test organization

8. **Demo Overview**
   - What we'll demonstrate
   - Test scenarios covered

9. **Next Steps & Roadmap**
   - Upcoming features
   - Integration possibilities
   - Community contributions

10. **Q&A**
    - Contact information
    - Resources for further learning

## Demo Script

### Demo 1: Basic DOM Extraction

1. Run the interactive CLI
   ```
   npm run cli
   ```
2. Choose "Extract DOM from a URL"
3. Enter a demo URL (e.g., https://example.com)
4. Select "Basic (Rule-based)" for semantic key generation
5. Show the generated mappings files and HTML report

### Demo 2: AI-Powered Extraction with MCP

1. Run the interactive CLI again
2. Choose "Extract DOM from a URL"
3. Enter a more complex URL (e.g., https://hivebrite.io)
4. Select "AI-powered (via MCP)"
5. Compare the quality of semantic keys between basic and AI methods

### Demo 3: Using Data-testid Prioritization

1. Create a simple HTML test page with data-testid attributes
   ```html
   <!-- test-html/data-testid-demo.html -->
   <div>
     <button id="old-id" data-testid="submit_button">Submit</button>
   </div>
   ```
2. Run extraction on this page
3. Show how data-testid is prioritized in selector generation

### Demo 4: Test Generation

1. Show example of using generated selectors in a Playwright test
2. Demonstrate how semantic selectors improve test readability
3. Show how tests remain stable when UI changes (but data-testid stays consistent)

## Preparation Checklist

1. Create demo HTML files with data-testid attributes
2. Ensure Cursor MCP is properly configured
3. Prepare examples of generated reports for comparison
4. Practice the flow of demonstrations
5. Prepare answers for common questions

## Resources to Include

- GitHub repository link
- Documentation references
- Sample code snippets for slides
- Screenshots of reports and mapping files 