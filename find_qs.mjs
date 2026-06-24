import { SourceMapConsumer } from 'source-map';
import fs from 'fs';

const mapData = JSON.parse(fs.readFileSync('./dist/assets/index-BzUwKmP9.js.map', 'utf8'));
const bundleContent = fs.readFileSync('./dist/assets/index-BzUwKmP9.js', 'utf8');

// Find all positions of Qs.filter
const positions = [];
let idx = 0;
while ((idx = bundleContent.indexOf('Qs.filter', idx)) !== -1) {
  positions.push(idx);
  idx += 9;
}

console.log(`Found ${positions.length} occurrences of Qs.filter`);

const consumer = await new SourceMapConsumer(mapData);

for (const col of positions) {
  const orig = consumer.originalPositionFor({ line: 1, column: col });
  console.log(`\nCol ${col} => ${orig.source}:${orig.line}:${orig.column}`);
  console.log(`  Name: ${orig.name}`);
}

consumer.destroy();
