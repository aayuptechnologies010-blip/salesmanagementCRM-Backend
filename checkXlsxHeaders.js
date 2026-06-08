const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'uploads/temp/1780826656472-83315545.xlsx');

try {
  console.log(`Reading file: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (allRows.length > 0) {
    console.log('\nFirst 3 rows in the uploaded Excel:');
    console.log(JSON.stringify(allRows.slice(0, 3), null, 2));
  } else {
    console.log('File is empty');
  }

} catch (err) {
  console.error('Error reading xlsx:', err.message);
}
