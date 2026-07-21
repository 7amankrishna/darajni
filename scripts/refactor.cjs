const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../components/Collection.tsx'),
  path.join(__dirname, '../components/order/tracking-form.tsx')
];

const replacements = [
  { search: /text-\[#6F6255\]/g, replace: 'text-text-secondary' },
  { search: /text-\[#171717\]/g, replace: 'text-text-primary' },
  { search: /bg-\[#FFFDF8\]\/82/g, replace: 'bg-surface/80' },
  { search: /border-\[#E9DCCB\]/g, replace: 'border-border' },
  { search: /text-\[#B8893B\]/g, replace: 'text-accent' },
  { search: /hover:bg-\[#F6E9DD\]/g, replace: 'hover:bg-surface-alt' },
  { search: /accent-\[#B8893B\]/g, replace: 'accent-accent' },
  { search: /border-\[#D8C6B1\]/g, replace: 'border-border' },
  { search: /bg-\[#FFFDF8\]\/70/g, replace: 'bg-surface/70' },
  { search: /bg-\[#FFFDF8\]/g, replace: 'bg-surface' },
  { search: /text-\[#6E0F1A\]/g, replace: 'text-accent' },
  { search: /bg-\[#F6E9DD\]/g, replace: 'bg-surface-alt' },
  { search: /text-\[#5F5348\]/g, replace: 'text-text-primary' }
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(file, content);
  console.log(`Refactored ${file}`);
}
