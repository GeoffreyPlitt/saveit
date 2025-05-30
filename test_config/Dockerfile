FROM node:18-slim

# Install any required system dependencies first (for better caching)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    chromium \
    xvfb \
    xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./

ENV DOCKER_ENV=true

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create coverage directory with proper permissions
RUN mkdir -p coverage && chmod 777 coverage

# Default command runs tests
CMD ["npm", "test"]