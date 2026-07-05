const Database = require('better-sqlite3');
const db = new Database('public/catagory.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', JSON.stringify(tables, null, 2));

if (tables.some((t: any) => t.name === 'subcategories')) {
  const subcategories = db.prepare('SELECT * FROM subcategories WHERE category_id = 46').all();
  console.log('Delivery Services subcategories:', JSON.stringify(subcategories, null, 2));
}

db.close();
