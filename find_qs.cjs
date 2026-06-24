const fs = require('fs');

// Read the bundle
const bundle = fs.readFileSync('./dist/assets/index-BzUwKmP9.js', 'utf8');
const lines = bundle.split('\n');

console.log(`Bundle has ${lines.length} lines`);

// Check line 5793
if (lines.length >= 5793) {
  const line = lines[5792]; // 0-indexed
  const col = 15232;
  const context = line.substring(Math.max(0, col - 100), col + 100);
  console.log(`\nLine 5793, Col 15232 context:`);
  console.log(context);
  
  // Also check the TaskRows4 call at col 21158
  const col2 = 21158;
  const context2 = line.substring(Math.max(0, col2 - 100), col2 + 100);
  console.log(`\nLine 5793, Col 21158 (TaskRows4) context:`);
  console.log(context2);
} else {
  console.log(`File only has ${lines.length} lines, checking single line`);
  const line = lines[0];
  console.log(`Line 1 length: ${line.length}`);
}

// Also look for TaskRows
const taskRowIdx = bundle.indexOf('TaskRow');
if (taskRowIdx >= 0) {
  console.log(`\nTaskRow found at position ${taskRowIdx}`);
  console.log(bundle.substring(taskRowIdx - 20, taskRowIdx + 50));
}
