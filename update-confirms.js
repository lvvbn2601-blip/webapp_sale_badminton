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

const files = walk('d:\\Web_Sale_ABMT\\frontend');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  const replacements = [
    { 
       regex: /(const (?:handleCancel|removeAddress|handleDeleteUser|removeProduct|removeBrand|removeCategory|handleDelete) = (?:async )?\(.*?\) => \{)/g, 
       replacement: '$1\n    if (!window.confirm("Are you sure you want to delete this?")) return;' 
    }
  ];

  let modified = false;
  replacements.forEach(rep => {
    if (rep.regex.test(content)) {
       // Prevent double insertion
       if (!content.includes('window.confirm("Are you sure you want to delete this?")')) {
         content = content.replace(rep.regex, rep.replacement);
         modified = true;
       }
    }
  });

  if (modified && content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
