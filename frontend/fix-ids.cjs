const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace id: number -> id: string
  content = content.replace(/id:\s*number/g, 'id: string');
  
  // Replace userId: number -> userId: string
  content = content.replace(/userId:\s*number/g, 'userId: string');
  
  // Replace bookingId: number -> bookingId: string
  content = content.replace(/bookingId:\s*number/g, 'bookingId: string');

  // Replace editingId state
  content = content.replace(/useState<number\s*\|\s*null>\(/g, 'useState<string | null>(');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

walk(path.join(__dirname, 'src'));
console.log('Done');
