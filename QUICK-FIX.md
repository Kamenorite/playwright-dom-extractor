# Quick Fix Guide for ESM vs CommonJS Error

If you're experiencing this error:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module /Users/.../node_modules/chalk/source/index.js from .../interactive-cli.ts not supported.
```

This is happening because `chalk` version 5.x is an ESM-only module, while our project uses CommonJS.

## Option 1: Quick Local Fix

```bash
# Navigate to your project directory
cd /Users/marc.lederoff/Repos/playwright-dom-extractor

# Uninstall the problematic packages
npm uninstall chalk inquirer ora

# Install compatible versions
npm install chalk@4.1.2 inquirer@8.2.5 ora@5.4.1

# Clean npm cache (optional but recommended)
npm cache clean --force

# Try running again
npm run cli
```

## Option 2: Pull the Updated Repository

We've updated the repository with fixed dependencies and cross-machine compatibility improvements:

```bash
# Navigate to your project directory
cd /Users/marc.lederoff/Repos/playwright-dom-extractor

# Pull the latest changes
git pull

# Install dependencies with exact versions
npm ci

# Run the application
npm run cli
```

## Option 3: Docker (Most Reliable)

For the most consistent experience across all machines, we've added Docker support:

```bash
# Navigate to your project directory
cd /Users/marc.lederoff/Repos/playwright-dom-extractor

# Pull the latest changes
git pull

# Build and run with Docker Compose
docker-compose up --build
```

## Understanding the Issue

This problem occurs because:

1. Modern versions of packages like `chalk` (v5.x+) use ESM (ECMAScript Modules)
2. Our project uses CommonJS
3. When npm installs packages on different machines, it may choose different versions based on your Node.js version and other factors

The fixes in our updates:
- Pin exact package versions to prevent variation
- Downgrade ESM-only packages to CommonJS-compatible versions
- Add Docker configuration for consistent environments
- Add `.npmrc` settings to enforce strict versioning 