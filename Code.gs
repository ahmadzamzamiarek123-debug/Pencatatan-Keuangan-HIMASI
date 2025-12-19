// ============================================
// HIMA Cash Management System - Backend
// Google Apps Script (Code.gs)
// Sketchy B&W Edition
// ============================================

// Configuration - Replace with your actual Spreadsheet ID
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// Sheet Names (Indonesian)
const SHEET_ANGGOTA = 'Anggota';
const SHEET_UANG_MASUK = 'Uang_Masuk';
const SHEET_UANG_KELUAR = 'Uang_Keluar';
const SHEET_PEMASUKAN_LAIN = 'Pemasukan_Lain';

// Security - Secret Key for API Protection (MUST match frontend SECRET_KEY)
const SECRET_KEY = 'hima_si_secret_2024';

/**
 * Validate secret key from request
 * @param {string} key - Secret key from request
 * @returns {boolean} - True if valid
 */
function validateSecretKey(key) {
  return key === SECRET_KEY;
}

/**
 * Handle GET requests
 * @param {Object} e - Event object with query parameters
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getMembers':
        result = getMembers(e.parameter.kelas);
        break;
      case 'getTransactions':
        result = getTransactions(e.parameter.kelas, e.parameter.minggu);
        break;
      case 'getExpenses':
        result = getExpenses(e.parameter.kategori);
        break;
      case 'getClasses':
        result = getClasses();
        break;
      case 'getHistory':
        result = getCombinedHistory(e.parameter.limit);
        break;
      default:
        result = { success: false, message: 'Invalid action' };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * Handle POST requests
 * @param {Object} e - Event object with postData
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    // SECURITY: Validate secret key for all POST requests
    if (!validateSecretKey(data.secretKey)) {
      return createJsonResponse({ 
        success: false, 
        message: 'Unauthorized: Invalid or missing secret key' 
      });
    }
    
    let result;

    switch (action) {
      case 'createIncome':
        result = createIncomeTransactions(data.transactions);
        break;
      case 'createExpense':
        result = createExpense(data);
        break;
      case 'updateIncome':
        result = updateIncome(data.id, data.nominal);
        break;
      case 'updateExpense':
        result = updateExpense(data.id, data);
        break;
      case 'deleteIncome':
        result = deleteIncome(data.id);
        break;
      case 'deleteExpense':
        result = deleteExpense(data.id);
        break;
      case 'createOtherIncome':
        result = createOtherIncome(data);
        break;
      default:
        result = { success: false, message: 'Invalid action' };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * Create JSON response with CORS headers
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Generate unique ID (timestamp + random)
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Get spreadsheet instance
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ============================================
// MEMBER OPERATIONS (Anggota)
// ============================================

/**
 * Get all members, optionally filtered by class
 * @param {string} kelas - Optional class filter
 */
function getMembers(kelas) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ANGGOTA);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Anggota tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  const members = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const member = {
      nim: row[0].toString(),
      nama: row[1],
      kelas: row[2]
    };

    // Filter by class if specified
    if (!kelas || kelas === '' || member.kelas === kelas) {
      members.push(member);
    }
  }

  return { 
    success: true, 
    data: members,
    total: members.length 
  };
}

/**
 * Get unique class list
 */
function getClasses() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ANGGOTA);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Anggota tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  const classSet = new Set();

  for (let i = 1; i < data.length; i++) {
    const kelas = data[i][2];
    if (kelas) {
      classSet.add(kelas);
    }
  }

  const classes = Array.from(classSet).sort();

  return { 
    success: true, 
    data: classes 
  };
}

// ============================================
// INCOME OPERATIONS (Uang_Masuk)
// ============================================

/**
 * Get income transactions with optional filters
 * @param {string} kelas - Optional class filter
 * @param {string} minggu - Optional week filter
 */
function getTransactions(kelas, minggu) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_UANG_MASUK);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Uang_Masuk tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, data: [], total: 0 };
  }

  const transactions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const transaction = {
      id: row[0],
      timestamp: row[1],
      minggu: row[2],
      tanggal: row[3],
      nim: row[4].toString(),
      nama: row[5],
      kelas: row[6],
      nominal: row[7],
      type: 'masuk'
    };

    // Apply filters
    let include = true;
    if (kelas && kelas !== '' && transaction.kelas !== kelas) {
      include = false;
    }
    if (minggu && minggu !== '' && transaction.minggu.toString() !== minggu) {
      include = false;
    }

    if (include) {
      transactions.push(transaction);
    }
  }

  // Sort by timestamp descending (newest first)
  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { 
    success: true, 
    data: transactions,
    total: transactions.length 
  };
}

/**
 * Create multiple income transactions
 * @param {Array} transactions - Array of transaction objects
 */
function createIncomeTransactions(transactions) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_UANG_MASUK);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_UANG_MASUK);
    sheet.appendRow(['ID', 'Timestamp', 'Minggu', 'Tanggal', 'NIM', 'Nama', 'Kelas', 'Nominal']);
  }

  const timestamp = new Date();
  const createdIds = [];

  for (const tx of transactions) {
    const id = generateId();
    const row = [
      id,
      timestamp,
      tx.minggu,
      tx.tanggal,
      tx.nim,
      tx.nama,
      tx.kelas,
      tx.nominal
    ];
    sheet.appendRow(row);
    createdIds.push(id);
  }

  return { 
    success: true, 
    message: `${transactions.length} transaksi pemasukan berhasil disimpan`,
    ids: createdIds
  };
}

/**
 * Update an income transaction by ID
 * @param {string} id - Transaction ID
 * @param {number} nominal - New nominal value
 */
function updateIncome(id, nominal) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_UANG_MASUK);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Uang_Masuk tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, 8).setValue(nominal);
      return { 
        success: true, 
        message: 'Transaksi berhasil diupdate' 
      };
    }
  }

  return { success: false, message: 'Transaksi tidak ditemukan' };
}

/**
 * Delete an income transaction by ID
 * @param {string} id - Transaction ID
 */
function deleteIncome(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_UANG_MASUK);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Uang_Masuk tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { 
        success: true, 
        message: 'Transaksi berhasil dihapus' 
      };
    }
  }

  return { success: false, message: 'Transaksi tidak ditemukan' };
}

// ============================================
// EXPENSE OPERATIONS (Uang_Keluar)
// ============================================

/**
 * Get expense transactions with optional filters
 * @param {string} kategori - Optional category filter
 */
function getExpenses(kategori) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_UANG_KELUAR);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Uang_Keluar tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, data: [], total: 0 };
  }

  const expenses = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    const expense = {
      id: row[0],
      timestamp: row[1],
      tanggal: row[2],
      kategori: row[3],
      keterangan: row[4],
      nominal: row[5],
      pj: row[6],
      statusBukti: row[7],
      type: 'keluar'
    };

    // Apply category filter
    if (!kategori || kategori === '' || expense.kategori === kategori) {
      expenses.push(expense);
    }
  }

  // Sort by timestamp descending
  expenses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { 
    success: true, 
    data: expenses,
    total: expenses.length 
  };
}

/**
 * Create a new expense
 * @param {Object} data - Expense data
 */
function createExpense(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_UANG_KELUAR);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_UANG_KELUAR);
    sheet.appendRow(['ID', 'Timestamp', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal', 'PJ', 'Status Bukti']);
  }

  const id = generateId();
  const timestamp = new Date();
  
  const row = [
    id,
    timestamp,
    data.tanggal,
    data.kategori,
    data.keterangan,
    data.nominal,
    data.pj,
    '❌ BELUM UPLOAD' // Auto-set status
  ];
  
  sheet.appendRow(row);

  return { 
    success: true, 
    message: 'Pengeluaran berhasil disimpan',
    id: id
  };
}

/**
 * Update an expense by ID
 * @param {string} id - Expense ID
 * @param {Object} data - Updated data
 */
function updateExpense(id, data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_UANG_KELUAR);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Uang_Keluar tidak ditemukan' };
  }

  const sheetData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === id) {
      // Update specific columns if provided
      if (data.tanggal) sheet.getRange(i + 1, 3).setValue(data.tanggal);
      if (data.kategori) sheet.getRange(i + 1, 4).setValue(data.kategori);
      if (data.keterangan !== undefined) sheet.getRange(i + 1, 5).setValue(data.keterangan);
      if (data.nominal) sheet.getRange(i + 1, 6).setValue(data.nominal);
      if (data.pj) sheet.getRange(i + 1, 7).setValue(data.pj);
      if (data.statusBukti) sheet.getRange(i + 1, 8).setValue(data.statusBukti);
      
      return { 
        success: true, 
        message: 'Pengeluaran berhasil diupdate' 
      };
    }
  }

  return { success: false, message: 'Pengeluaran tidak ditemukan' };
}

/**
 * Delete an expense by ID
 * @param {string} id - Expense ID
 */
function deleteExpense(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_UANG_KELUAR);
  
  if (!sheet) {
    return { success: false, message: 'Sheet Uang_Keluar tidak ditemukan' };
  }

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { 
        success: true, 
        message: 'Pengeluaran berhasil dihapus' 
      };
    }
  }

  return { success: false, message: 'Pengeluaran tidak ditemukan' };
}

// ============================================
// OTHER INCOME OPERATIONS (Pemasukan_Lain)
// ============================================

/**
 * Create a new other income entry
 * @param {Object} data - Other income data
 */
function createOtherIncome(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PEMASUKAN_LAIN);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PEMASUKAN_LAIN);
    sheet.appendRow(['ID', 'Timestamp', 'Tanggal', 'Sumber', 'Keterangan', 'Nominal', 'PJ']);
  }

  const id = generateId();
  const timestamp = new Date();
  
  const row = [
    id,
    timestamp,
    data.tanggal,
    data.sumber,
    data.keterangan,
    data.nominal,
    data.pj
  ];
  
  sheet.appendRow(row);

  return { 
    success: true, 
    message: 'Pemasukan lain berhasil disimpan',
    id: id
  };
}

// ============================================
// COMBINED HISTORY
// ============================================

/**
 * Format a date value to YYYY-MM-DD string
 * Handles Date objects, strings, and null values
 */
function formatDateForJson(dateValue) {
  if (!dateValue) return '';
  try {
    if (dateValue instanceof Date) {
      return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    // If it's already a string, try to parse and reformat
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return String(dateValue);
  } catch (e) {
    return String(dateValue);
  }
}

/**
 * Get combined history of all transactions from 3 sheets
 * Returns normalized data with: id, timestamp, date, title, subtitle, nominal, type
 * @param {number} limit - Max items to return (default 100)
 */
function getCombinedHistory(limit) {
  const ss = getSpreadsheet();
  const tz = Session.getScriptTimeZone();
  let combined = [];
  
  // 1. Fetch Member Income (Uang_Masuk) -> type: 'in_member'
  try {
    const masukSheet = ss.getSheetByName(SHEET_UANG_MASUK);
    if (masukSheet && masukSheet.getLastRow() > 1) {
      const masukData = masukSheet.getDataRange().getValues();
      for (let i = 1; i < masukData.length; i++) {
        const row = masukData[i];
        if (!row[0]) continue;
        combined.push({
          id: String(row[0]),
          timestamp: formatDateForJson(row[1]),
          date: formatDateForJson(row[3]), // Tanggal
          title: String(row[5] || ''), // Nama
          subtitle: `Minggu ${row[2]} - ${row[6]}`, // Minggu X - Kelas
          nominal: Number(row[7]) || 0,
          type: 'in_member'
        });
      }
    }
  } catch (e) {
    Logger.log('Error fetching Uang_Masuk: ' + e);
  }
  
  // 2. Fetch Other Income (Pemasukan_Lain) -> type: 'in_other'
  try {
    const lainSheet = ss.getSheetByName(SHEET_PEMASUKAN_LAIN);
    if (lainSheet && lainSheet.getLastRow() > 1) {
      const lainData = lainSheet.getDataRange().getValues();
      for (let i = 1; i < lainData.length; i++) {
        const row = lainData[i];
        if (!row[0]) continue;
        combined.push({
          id: String(row[0]),
          timestamp: formatDateForJson(row[1]),
          date: formatDateForJson(row[2]), // Tanggal
          title: String(row[3] || ''), // Sumber
          subtitle: String(row[4] || '-'), // Keterangan
          nominal: Number(row[5]) || 0,
          type: 'in_other'
        });
      }
    }
  } catch (e) {
    Logger.log('Error fetching Pemasukan_Lain: ' + e);
  }
  
  // 3. Fetch Expenses (Uang_Keluar) -> type: 'out'
  try {
    const keluarSheet = ss.getSheetByName(SHEET_UANG_KELUAR);
    if (keluarSheet && keluarSheet.getLastRow() > 1) {
      const keluarData = keluarSheet.getDataRange().getValues();
      for (let i = 1; i < keluarData.length; i++) {
        const row = keluarData[i];
        if (!row[0]) continue;
        combined.push({
          id: String(row[0]),
          timestamp: formatDateForJson(row[1]),
          date: formatDateForJson(row[2]), // Tanggal
          title: String(row[4] || row[3] || ''), // Keterangan or Kategori
          subtitle: `${row[3]} (PJ: ${row[6]})`, // Kategori (PJ: nama)
          nominal: Number(row[5]) || 0,
          type: 'out'
        });
      }
    }
  } catch (e) {
    Logger.log('Error fetching Uang_Keluar: ' + e);
  }
  
  // Sort by timestamp descending (newest first)
  combined.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateB - dateA;
  });
  
  // Apply limit (default 100)
  const maxItems = (limit && limit > 0) ? parseInt(limit) : 100;
  combined = combined.slice(0, maxItems);
  
  // Calculate totals
  const totalInMember = combined
    .filter(t => t.type === 'in_member')
    .reduce((sum, t) => sum + t.nominal, 0);
    
  const totalInOther = combined
    .filter(t => t.type === 'in_other')
    .reduce((sum, t) => sum + t.nominal, 0);
    
  const totalOut = combined
    .filter(t => t.type === 'out')
    .reduce((sum, t) => sum + t.nominal, 0);
  
  const totalMasuk = totalInMember + totalInOther;

  return { 
    success: true, 
    data: combined,
    total: combined.length,
    summary: {
      inMember: totalInMember,
      inOther: totalInOther,
      masuk: totalMasuk,
      keluar: totalOut,
      saldo: totalMasuk - totalOut
    }
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Initialize sheets with headers (for testing)
 */
function initializeSheets() {
  const ss = getSpreadsheet();
  
  // Create Anggota sheet
  let anggotaSheet = ss.getSheetByName(SHEET_ANGGOTA);
  if (!anggotaSheet) {
    anggotaSheet = ss.insertSheet(SHEET_ANGGOTA);
    anggotaSheet.appendRow(['NIM', 'Nama', 'Kelas']);
    
    // Sample data
    const samples = [
      ['2021001', 'Ahmad Rizki', 'SI-A'],
      ['2021002', 'Budi Santoso', 'SI-A'],
      ['2021003', 'Citra Dewi', 'SI-B'],
      ['2021004', 'Dewi Lestari', 'SI-B'],
    ];
    samples.forEach(row => anggotaSheet.appendRow(row));
  }

  // Create Uang_Masuk sheet
  let masukSheet = ss.getSheetByName(SHEET_UANG_MASUK);
  if (!masukSheet) {
    masukSheet = ss.insertSheet(SHEET_UANG_MASUK);
    masukSheet.appendRow(['ID', 'Timestamp', 'Minggu', 'Tanggal', 'NIM', 'Nama', 'Kelas', 'Nominal']);
  }

  // Create Uang_Keluar sheet
  let keluarSheet = ss.getSheetByName(SHEET_UANG_KELUAR);
  if (!keluarSheet) {
    keluarSheet = ss.insertSheet(SHEET_UANG_KELUAR);
    keluarSheet.appendRow(['ID', 'Timestamp', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal', 'PJ', 'Status Bukti']);
  }

  return { success: true, message: 'Sheets initialized successfully' };
}

/**
 * Test functions
 */
function testGetMembers() {
  const result = getMembers('');
  Logger.log(JSON.stringify(result));
}

function testGetHistory() {
  const result = getCombinedHistory(10);
  Logger.log(JSON.stringify(result));
}
