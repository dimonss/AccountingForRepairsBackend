import * as XLSX from 'xlsx';
import path from 'path';

function analyzeExcelFile(filePath: string, fileName: string) {
  try {
    console.log(`\n📊 Analyzing ${fileName}...`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`Sheet: ${sheetName}`);
    console.log(`Range: ${worksheet['!ref']}`);
    console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
    
    // Convert to JSON to see the structure
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (data.length > 0) {
      console.log('\n📋 Column headers:');
      const headers = data[0] as string[];
      headers.forEach((header, index) => {
        console.log(`  ${index + 1}. "${header}"`);
      });
      
      console.log('\n📝 Sample data (first 3 rows):');
      for (let i = 1; i < Math.min(4, data.length); i++) {
        const row = data[i];
        console.log(`  Row ${i}:`, row);
      }
      
      // Count non-empty rows
      const nonEmptyRows = data.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
      console.log(`\n📈 Total non-empty rows: ${nonEmptyRows.length - 1}`); // -1 for header
    }
    
  } catch (error) {
    console.error(`❌ Error analyzing ${fileName}:`, error);
  }
}

function analyzeAllFiles() {
  console.log('🔍 Analyzing Excel files structure...');
  
  const dataPath = path.join(__dirname, '../../data');
  
  const files = [
    { name: 'Клиенты.xlsx', path: path.join(dataPath, 'Клиенты.xlsx') },
    { name: 'Оборудоваие.xlsx', path: path.join(dataPath, 'Оборудоваие.xlsx') },
    { name: 'Ремонт.xlsx', path: path.join(dataPath, 'Ремонт.xlsx') }
  ];
  
  files.forEach(file => {
    analyzeExcelFile(file.path, file.name);
  });
  
  console.log('\n✅ Analysis completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  analyzeAllFiles();
}

export { analyzeAllFiles };
