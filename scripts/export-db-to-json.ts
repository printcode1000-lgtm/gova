import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public', 'catagory.db');
const outputDir = path.join(process.cwd(), 'public', 'catagory');

// إنشاء مجلد الإخراج إذا لم يكن موجوداً
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created directory: ${outputDir}`);
}

// فتح قاعدة البيانات
const db = new Database(dbPath, { readonly: true });

// الحصول على جميع الجداول
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all() as { name: string }[];

console.log(`📊 Found ${tables.length} tables`);

// تصدير كل جدول إلى ملف JSON منفصل
tables.forEach((table) => {
  const tableName = table.name;
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
  
  const outputPath = path.join(outputDir, `${tableName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf-8');
  
  console.log(`✅ Exported ${rows.length} rows from '${tableName}' to ${outputPath}`);
});

// إغلاق قاعدة البيانات
db.close();

console.log('\n🎉 Export completed successfully!');
