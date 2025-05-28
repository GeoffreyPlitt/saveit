#!/bin/bash

# Create scripts directory if it doesn't exist
mkdir -p $(dirname "$0")

# This script checks the coverage files and formats for debugging

echo "=== Coverage Check ==="
echo "Current directory: $(pwd)"

# Check if coverage directory exists
if [ -d "./coverage" ]; then
  echo "Coverage directory exists"
  echo "Contents of coverage directory:"
  ls -la ./coverage/
else
  echo "Coverage directory does not exist"
fi

# Check if coverage.lcov exists
if [ -f "./coverage.lcov" ]; then
  echo "coverage.lcov file exists"
  echo "First 10 lines of coverage.lcov:"
  head -n 10 ./coverage.lcov
else
  echo "coverage.lcov file does not exist"
fi

# Check for other coverage files
echo "Looking for other coverage files:"
find . -name "*.lcov" -o -name "coverage*" | grep -v "node_modules"

echo "=== Coverage Check Complete ==="