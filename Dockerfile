FROM node:18-slim

WORKDIR /app

# Install any required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create coverage directory with proper permissions
RUN mkdir -p coverage && chmod 777 coverage

# Default command runs tests
CMD ["npm", "test"]