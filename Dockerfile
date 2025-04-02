FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Copy project files
COPY . .

# Create directories for mappings and reports
RUN mkdir -p mappings

# Set environment variables
ENV NODE_ENV=production

# Command to run when container starts
CMD ["npm", "run", "cli"] 