const fs = require('fs');
const css = fs.readFileSync('app/brand.css', 'utf8');

let depth = 0;
let lines = css.split('\n');
for (let i = 0; i < css.length; i++) {
  if (css[i] === '{') depth++;
  if (css[i] === '}') depth--;
  if (depth < 0) {
    console.log(`Unmatched } at index ${i}`);
    break;
  }
}
if (depth > 0) {
  console.log(`Unmatched { remaining, depth: ${depth}`);
} else if (depth === 0) {
  console.log('Braces balanced');
}
