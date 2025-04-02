# Cross-Machine Compatibility Guide

This guide provides instructions for setting up the Playwright DOM Extractor on different machines and environments to avoid compatibility issues.

## Option 1: Direct Installation

For direct installation on your local machine:

```bash
# Clone the repository
git clone https://github.com/Kamenorite/playwright-dom-extractor.git
cd playwright-dom-extractor

# Install dependencies with exact versions
npm ci

# Run the application
npm run cli
```

If you encounter any ESM vs CommonJS errors like:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported.
```

Try these troubleshooting steps:

1. Clear npm cache and reinstall: `npm cache clean --force && npm ci`
2. Check Node.js version compatibility: This project works best with Node.js v16-18

## Option 2: Using Docker (Recommended for Consistency)

The Docker setup ensures a consistent environment across all machines:

```bash
# Clone the repository
git clone https://github.com/Kamenorite/playwright-dom-extractor.git
cd playwright-dom-extractor

# Build and run with Docker Compose
docker-compose up --build
```

Benefits of using Docker:
- Eliminates "works on my machine" problems
- Consistent Node.js version
- Pre-installed dependencies with exact versions
- Persistent volume for mappings

## Known Issues and Solutions

### ESM vs CommonJS Issues

This project uses CommonJS modules, but some dependencies might try to use ES Modules:

1. **Chalk package**: We use Chalk v4.x instead of v5.x to maintain CommonJS compatibility
2. **Inquirer**: We use v8.x which works with CommonJS

### Node.js Version Compatibility

- Recommended: Node.js v16.x or v18.x
- Not recommended: Node.js v20+ (may have ESM compatibility issues with some packages)

### Type Errors

If you encounter TypeScript errors:

```bash
# Install TypeScript globally
npm install -g typescript

# Run with ts-node directly
npx ts-node interactive-cli.ts
```

### MCP Configuration

For Cursor MCP integration, ensure your `.cursor/mcp.json` file exists and contains:

```json
{
  "server": "cursor-model-context",
  "provider": "cursor"
}
```

## Environment Variables

For consistent operation across environments, you can set these variables:

```bash
# For API integration (only if not using MCP)
export AI_API_KEY=your_api_key
export AI_API_ENDPOINT=your_endpoint

# For development
export NODE_ENV=development
```

## Maintenance Practices

To keep the project compatible across machines:

1. Lock dependencies to specific versions in package.json
2. Use `npm ci` instead of `npm install` for consistent installs
3. Document Node.js version requirements
4. Consider using Docker for deployment
5. Test on multiple platforms before releasing updates 