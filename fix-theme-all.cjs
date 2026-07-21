const fs = require('fs');
const path = require('path');

const files = [
  'components/cart/cart-page.tsx',
  'components/wishlist/wishlist-page.tsx',
  'components/admin/admin-dashboard.tsx',
  'components/admin/admin-login-form.tsx',
  'components/admin/analytics-panel.tsx',
  'components/admin/order-management.tsx',
  'components/admin/product-management.tsx',
  'components/admin/promo-management.tsx',
  'components/admin/settings-panel.tsx',
  'components/product/product-gallery.tsx',
  'components/product/product-info-tabs.tsx',
  'components/product/product-purchase.tsx',
  'components/screens/ProductPage.tsx',
  'components/screens/LegalPage.tsx',
  'components/screens/HomePage.tsx',
  'components/Collection.tsx',
  'components/About.tsx',
  'components/Hero.tsx',
  'components/homepage-launch-slider.tsx'
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
  { from: /bg-\[#FAF7F2\](?!\s*dark:)/g, to: 'bg-white dark:bg-[#100D0B]' },
  { from: /bg-\[#FAF7F2\]\s+dark:bg-\[#[a-zA-Z0-9]+\]/g, to: 'bg-white dark:bg-[#100D0B]' },
  { from: /bg-\[#F5EFEB\](?!\s*dark:)/g, to: 'bg-[#F9F9F9] dark:bg-[#241D17]' },
  { from: /bg-\[#F5EFEB\]\s+dark:bg-\[#[a-zA-Z0-9]+\]/g, to: 'bg-[#F9F9F9] dark:bg-[#241D17]' },
  { from: /bg-\[#F5EFEB\]\/60\s+dark:bg-\[#[a-zA-Z0-9]+\]\/60/g, to: 'bg-[#F9F9F9]/60 dark:bg-[#241D17]/60' },

  { from: /bg-\[#FFFFFF\]/g, to: 'bg-white' },
];

for (const rel of files) {
  const p = path.join(process.cwd(), rel);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    for (const r of replacements) {
      content = content.replace(r.from, r.to);
    }
    fs.writeFileSync(p, content);
    console.log(`Updated ${rel}`);
  }
}
