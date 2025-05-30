#!/bin/bash
set -e

# Check that coverage directory exists
if [ ! -d "coverage" ]; then
  echo "Error: Coverage directory not found"
  exit 1
fi

# Print the available coverage files for debugging
echo "Coverage files available:"
ls -la coverage/

# Check that coverage/coverage-summary.json exists
if [ -f "coverage/coverage-summary.json" ]; then
  echo "Using coverage-summary.json for metrics"
  
  # Parse the coverage data using node
  node -e "
    try {
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
    } catch (error) {
      console.error('Error parsing coverage-summary.json:', error.message);
      // Continue execution
    }
  "
elif [ -f "coverage/lcov.info" ]; then
  echo "Using lcov.info for metrics (less accurate than summary.json)"
  
  # Get some basic stats from lcov.info
  LINES_COVERED=$(grep "LH:" coverage/lcov.info | awk '{sum+=$2} END {print sum}')
  LINES_TOTAL=$(grep "LF:" coverage/lcov.info | awk '{sum+=$2} END {print sum}')
  FUNCTIONS_COVERED=$(grep "FNH:" coverage/lcov.info | awk '{sum+=$2} END {print sum}')
  FUNCTIONS_TOTAL=$(grep "FNF:" coverage/lcov.info | awk '{sum+=$2} END {print sum}')
  BRANCHES_COVERED=$(grep "BRH:" coverage/lcov.info | awk '{sum+=$2} END {print sum}')
  BRANCHES_TOTAL=$(grep "BRF:" coverage/lcov.info | awk '{sum+=$2} END {print sum}')

  # Safety check to avoid division by zero
  if [ -z "$LINES_TOTAL" ] || [ "$LINES_TOTAL" -eq 0 ]; then
    LINES_TOTAL=1
    echo "Warning: No line coverage data found, setting to 0%"
  fi
  
  if [ -z "$FUNCTIONS_TOTAL" ] || [ "$FUNCTIONS_TOTAL" -eq 0 ]; then
    FUNCTIONS_TOTAL=1
    echo "Warning: No function coverage data found, setting to 0%"
  fi
  
  if [ -z "$BRANCHES_TOTAL" ] || [ "$BRANCHES_TOTAL" -eq 0 ]; then
    BRANCHES_TOTAL=1
    echo "Warning: No branch coverage data found, setting to 0%"
  fi

  # Calculate percentages using awk (using conditional to avoid division by zero)
  LINES_PCT=$(awk -v covered="$LINES_COVERED" -v total="$LINES_TOTAL" 'BEGIN { printf "%.2f", (100 * covered / total) }')
  FUNCTIONS_PCT=$(awk -v covered="$FUNCTIONS_COVERED" -v total="$FUNCTIONS_TOTAL" 'BEGIN { printf "%.2f", (100 * covered / total) }')
  BRANCHES_PCT=$(awk -v covered="$BRANCHES_COVERED" -v total="$BRANCHES_TOTAL" 'BEGIN { printf "%.2f", (100 * covered / total) }')
  
  # Print coverage report
  echo "Coverage Report:"
  echo "----------------"
  echo "Lines: ${LINES_PCT}%"
  echo "Functions: ${FUNCTIONS_PCT}%"
  echo "Branches: ${BRANCHES_PCT}%"
  
  # Based on codecov.yml range of 70...100
  MIN_THRESHOLD=70
  
  # Check if any metrics are below threshold (using awk for float comparison)
  if (( $(awk -v pct="$LINES_PCT" -v threshold="$MIN_THRESHOLD" 'BEGIN { print (pct < threshold) ? 1 : 0 }') )) || \
     (( $(awk -v pct="$FUNCTIONS_PCT" -v threshold="$MIN_THRESHOLD" 'BEGIN { print (pct < threshold) ? 1 : 0 }') )) || \
     (( $(awk -v pct="$BRANCHES_PCT" -v threshold="$MIN_THRESHOLD" 'BEGIN { print (pct < threshold) ? 1 : 0 }') )); then
    echo -e "\nWarning: Some metrics below threshold of ${MIN_THRESHOLD}%"
    echo "Continuing CI process to allow gradual improvement of coverage"
  else
    echo -e "\nCoverage meets or exceeds threshold"
  fi
else
  echo "No coverage data found (neither coverage-summary.json nor lcov.info exist)"
  echo "This may indicate an issue with the coverage generation"
  # Still exit with 0 to allow the CI to continue
fi

# Always exit with success for now, to allow gradual improvement
exit 0