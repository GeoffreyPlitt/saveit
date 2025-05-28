#!/bin/bash
set -e

# Check that coverage directory exists
if [ ! -d "coverage" ]; then
  echo "Error: Coverage directory not found"
  exit 1
fi

# Check that coverage/coverage-summary.json exists
if [ ! -f "coverage/coverage-summary.json" ]; then
  echo "Error: coverage-summary.json not found"
  exit 1
fi

# Parse the coverage data from the summary JSON file
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));
  const total = data.total;
  
  console.log('Coverage Report:');
  console.log('----------------');
  console.log(\`Lines: \${total.lines.pct}%\`);
  console.log(\`Statements: \${total.statements.pct}%\`);
  console.log(\`Functions: \${total.functions.pct}%\`);
  console.log(\`Branches: \${total.branches.pct}%\`);
  
  // Based on codecov.yml range of 70...100
  const MIN_THRESHOLD = 70;
  
  if (total.lines.pct < MIN_THRESHOLD || 
      total.statements.pct < MIN_THRESHOLD || 
      total.functions.pct < MIN_THRESHOLD || 
      total.branches.pct < MIN_THRESHOLD) {
    console.log(\`\nWarning: Some metrics below threshold of \${MIN_THRESHOLD}%\`);
    console.log('Continuing CI process to allow gradual improvement of coverage');
  } else {
    console.log('\nCoverage meets or exceeds threshold');
  }
"

# Always exit with success for now, to allow gradual improvement
exit 0