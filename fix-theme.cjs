const fs = require('fs');
const path = require('path');

const files = [
  'components/checkout/checkout-form.tsx',
  'components/account/customer-account-page.tsx',
  'components/order/order-status-timeline.tsx',
  'components/Navbar.tsx',
  'components/Footer.tsx'
];

const replacements = [
  // Checkout colors to standard
  { from: /bg-\[#FFF8EF\]/g, to: 'bg-white dark:bg-[#100D0B]' },
  { from: /bg-\[#FFFDF8\]/g, to: 'bg-white dark:bg-[#1B1612]' },
  { from: /bg-\[#F6E9DD\]/g, to: 'bg-[#F9F9F9] dark:bg-[#241D17]' },
  { from: /text-\[#171717\]/g, to: 'text-[#1E1E1E] dark:text-[#F7EADB]' },
  { from: /text-\[#6F6255\]/g, to: 'text-[#666666] dark:text-[#B8A898]' },
  { from: /text-\[#5F5348\]/g, to: 'text-[#666666] dark:text-[#B8A898]' },
  { from: /border-\[#E9DCCB\]/g, to: 'border-[#E8E2DA] dark:border-[#3B3026]' },
  { from: /text-\[#B8893B\]/g, to: 'text-[#C8A97E]' },
  { from: /accent-\[#B8893B\]/g, to: 'accent-[#C8A97E]' },
  { from: /border-\[#B8893B\]\/30/g, to: 'border-[#C8A97E]/30' },
  
  // Account and generic cream backgrounds to pure white
  { from: /bg-\[#FAF7F2\]/g, to: 'bg-white dark:bg-[#100D0B]' },
  { from: /bg-\[#F5EFEB\]/g, to: 'bg-[#F9F9F9] dark:bg-[#241D17]' },
  // If a class already has dark:bg-..., this might double it up? Let's check.
  // Wait, in account page, `bg-[#FAF7F2]` is next to `dark:bg-[#100D0B]`. 
  // If we replace `bg-[#FAF7F2]` with `bg-white dark:bg-[#100D0B]`, we might get `bg-white dark:bg-[#100D0B] py-8 sm:py-16 dark:bg-[#100D0B]`. This is fine, Tailwind handles duplicates, or we can use a more precise regex.
  { from: /bg-\[#FAF7F2\](?!\s*dark:)/g, to: 'bg-white dark:bg-[#100D0B]' },
  { from: /bg-\[#FAF7F2\]\s+dark:bg-\[#[a-zA-Z0-9]+\]/g, to: 'bg-white dark:bg-[#100D0B]' },
  
  { from: /bg-\[#F5EFEB\](?!\s*dark:)/g, to: 'bg-[#F9F9F9] dark:bg-[#241D17]' },
  { from: /bg-\[#F5EFEB\]\s+dark:bg-\[#[a-zA-Z0-9]+\]/g, to: 'bg-[#F9F9F9] dark:bg-[#241D17]' },
  { from: /bg-\[#F5EFEB\]\/60\s+dark:bg-\[#[a-zA-Z0-9]+\]\/60/g, to: 'bg-[#F9F9F9]/60 dark:bg-[#241D17]/60' },

  { from: /bg-\[#FFFFFF\]/g, to: 'bg-white' }, // Normalize
];

for (const rel of files) {
  const p = path.join(process.cwd(), rel);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    
    // First, standard replacements
    for (const r of replacements) {
      content = content.replace(r.from, r.to);
    }

    // Special fix for customer-account-page.tsx
    content = content.replace(/bg-white dark:bg-\[#100D0B\] py-8 sm:py-16 dark:bg-\[#100D0B\]/g, 'bg-white py-8 sm:py-16 dark:bg-[#100D0B]');
    
    // Special fix for payment options in checkout-form
    content = content.replace(/bg-white dark:bg-\[#100D0B\] text-\[#1E1E1E\] shadow-sm dark:border-\[#C8A97E\] dark:bg-\[#241D17\] dark:text-\[#F7EADB\]/g, 'bg-white text-[#1E1E1E] shadow-sm dark:border-[#C8A97E] dark:bg-[#241D17] dark:text-[#F7EADB]');
    
    content = content.replace(/bg-white text-\[#1E1E1E\] hover:border-\[#C8A97E\]\/50 dark:border-\[#3B3026\] dark:bg-\[#100D0B\] dark:text-\[#F7EADB\]/g, 'bg-white text-[#1E1E1E] hover:border-[#C8A97E]/50 dark:border-[#3B3026] dark:bg-[#100D0B] dark:text-[#F7EADB]');

    fs.writeFileSync(p, content);
    console.log(`Updated ${rel}`);
  }
}
