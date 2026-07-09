const fs = require('fs');
let content = fs.readFileSync('src/GlobalStateContext.tsx', 'utf8');
content = content.replace(/\.limit\(5000\)/g, '.limit(10000)');
fs.writeFileSync('src/GlobalStateContext.tsx', content);
console.log('Fixed limits');
