const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
         results = results.concat(walk(filePath));
      }
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
};

const frontendPath = path.resolve('d:\\Web_Sale_ABMT\\frontend');
const confirmModalPath = path.resolve(frontendPath, 'components', 'ConfirmModal');

const files = walk(frontendPath);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  if (!content.includes('window.confirm')) return;

  // Calculate relative path for import
  let relativePath = path.relative(path.dirname(file), confirmModalPath);
  relativePath = relativePath.replace(/\\/g, '/');
  if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

  // Add import if not present
  if (!content.includes('import { confirmAction }')) {
    content = `import { confirmAction } from "${relativePath}";\n` + content;
  }

  // 1. Arrow functions without parameters: onClick={() => { if(window.confirm("...")) ... }}
  content = content.replace(/\(\) => { if \(?window\.confirm\((.*?)\)\)? (.*?) }/g, 'async () => { if (await confirmAction($1)) $2 }');
  
  // 2. Arrow functions with event parameter: onClick={(e) => { e.preventDefault(); if(window.confirm("...")) ... }}
  content = content.replace(/\((e|event)\) => \{ (.*?); if\(?window\.confirm\((.*?)\)\)? (.*?) \}/g, 'async ($1) => { $2; if(await confirmAction($3)) $4 }');
  
  // 2.5 Alternative format mapping
  content = content.replace(/=> window\.confirm\((.*?)\) && (.*?)\(\)/g, 'async () => (await confirmAction($1)) && $2()');

  // 3. Already async function or standalone statements: if (!window.confirm("...")) return;
  content = content.replace(/window\.confirm\((.*?)\)/g, '(await confirmAction($1))');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
