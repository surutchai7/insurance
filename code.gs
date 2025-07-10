// ==================== Web App Entry Point ====================
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Insurance Sale Management')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==================== Configuration ====================
// ใส่ Spreadsheet ID ของคุณที่นี่ (ต้องเปลี่ยนให้ตรงกับ Spreadsheet จริง)
const SPREADSHEET_ID = '1prUeqh_6pB84eqqqCbPFVxfOBpa7tFCv4RGA7GFLzks';

// Email settings
const ADMIN_EMAIL = 'your-email@gmail.com'; // เปลี่ยนเป็นอีเมลของคุณ
const EMAIL_ENABLED = false; // เปลี่ยนเป็น true เพื่อเปิดใช้งานการส่งอีเมล

// Service Type to Sheet Name mapping
const SERVICE_SHEET_MAPPING = {
  'ประกันภัย': 'ประกันภัย',
  'พรบ': 'ประกันภัย', // พรบ จะบันทึกในชีทเดียวกับประกันภัย
  'ภาษีรถ': 'ภาษี',
  'ค่าตรวจสภาพรถ': 'ค่าบริการ',
  'ค่าบริการ': 'ค่าบริการ',
  'อื่นๆ': 'อื่นๆ'
};

// ==================== Error Handling Wrapper ====================
function safeExecute(functionName, fn, defaultReturn = null) {
  try {
    console.log(`Executing: ${functionName}`);
    const result = fn();
    console.log(`${functionName} completed successfully`);
    return result;
  } catch (error) {
    console.error(`Error in ${functionName}:`, error);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.toString(),
      message: `เกิดข้อผิดพลาดใน ${functionName}: ${error.toString()}`
    };
  }
}

// ==================== Sheet Management ====================
function getOrCreateSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      console.log('Creating new sheet:', sheetName);
      sheet = ss.insertSheet(sheetName);
      const headers = getSheetHeaders(sheetName);
      
      if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
        
        // Auto-resize columns
        for (let i = 1; i <= headers.length; i++) {
          sheet.autoResizeColumn(i);
        }
      }
    }
    
    return sheet;
  } catch (error) {
    console.error('Error in getOrCreateSheet:', error);
    throw new Error(`ไม่สามารถเข้าถึงหรือสร้างชีท ${sheetName}: ${error.toString()}`);
  }
}

function getSheetHeaders(sheetName) {
  const headerMap = {
    'ลูกค้า': ['รหัสลูกค้า', 'ชื่อ-นามสกุล', 'เลขบัตรประชาชน', 'เบอร์โทร', 'อีเมล', 'ที่อยู่จัดส่ง', 'ที่อยู่ตามเอกสาร', 'วันที่สร้าง', 'สถานะ', 'หมายเหตุ'],
    'รถ': ['รหัสรถ', 'รหัสลูกค้า', 'ทะเบียนรถ', 'ยี่ห้อ', 'รุ่น', 'สี', 'ปีรถ', 'เลขตัวถัง', 'วันที่สร้าง', 'สถานะ'],
    'ทรัพย์สิน': ['รหัสทรัพย์สิน', 'รหัสลูกค้า', 'ประเภท', 'ชื่อทรัพย์สิน', 'ที่อยู่', 'มูลค่า', 'รายละเอียด', 'วันที่สร้าง', 'สถานะ', 'ประเภทรถ', 'รหัสรถ'],
    'ใบงาน': ['เลขที่ใบงาน', 'รหัสลูกค้า', 'ชื่อลูกค้า', 'ประเภทประกัน', 'รหัสทรัพย์สิน', 'รายละเอียด', 'ทุนประกัน', 'เบี้ยประกัน', 'วันเริ่ม', 'วันสิ้นสุด', 'เลขกรมธรรม์', 'สถานะ', 'วันที่สร้าง', 'บริษัทประกัน', 'ผู้สร้าง', 'วันที่แก้ไข'],
    'รายการใบงาน': ['รหัสรายการ', 'เลขที่ใบงาน', 'ประเภทบริการ', 'ประเภทประกัน', 'รายละเอียด', 'ทุนประกัน', 'เบี้ยประกัน', 'วันเริ่ม', 'วันสิ้นสุด', 'เลขกรมธรรม์', 'บริษัทประกัน', 'สถานะ', 'หมายเหตุ'],
    'บริษัทประกัน': ['รหัสบริษัท', 'ชื่อบริษัท', 'ที่อยู่', 'เบอร์โทร', 'ผู้ติดต่อ', 'สถานะ'],
    'ประวัติ': ['รหัสประวัติ', 'วันที่', 'ผู้ใช้', 'การกระทำ', 'รายละเอียด', 'ตารางที่เกี่ยวข้อง', 'รหัสอ้างอิง'],
    
    // New service type specific sheets
    'ประกันภัย': ['รหัสรายการ', 'เลขที่ใบงาน', 'รหัสลูกค้า', 'ชื่อลูกค้า', 'ประเภทบริการ', 'ประเภทประกัน', 'รายละเอียด', 'ทุนประกัน', 'เบี้ยประกัน', 'วันเริ่ม', 'วันสิ้นสุด', 'เลขกรมธรรม์', 'บริษัทประกัน', 'สถานะ', 'วันที่สร้าง', 'หมายเหตุ'],
    'ภาษี': ['รหัสรายการ', 'เลขที่ใบงาน', 'รหัสลูกค้า', 'ชื่อลูกค้า', 'ประเภทบริการ', 'รายละเอียด', 'จำนวนเงิน', 'วันเริ่ม', 'วันสิ้นสุด', 'เลขที่อ้างอิง', 'สถานะ', 'วันที่สร้าง', 'หมายเหตุ'],
    'ค่าบริการ': ['รหัสรายการ', 'เลขที่ใบงาน', 'รหัสลูกค้า', 'ชื่อลูกค้า', 'ประเภทบริการ', 'รายละเอียด', 'จำนวนเงิน', 'วันที่ให้บริการ', 'สถานะ', 'วันที่สร้าง', 'หมายเหตุ'],
    'อื่นๆ': ['รหัสรายการ', 'เลขที่ใบงาน', 'รหัสลูกค้า', 'ชื่อลูกค้า', 'ประเภทบริการ', 'รายละเอียด', 'จำนวนเงิน', 'วันที่', 'สถานะ', 'วันที่สร้าง', 'หมายเหตุ']
  };
  
  return headerMap[sheetName] || [];
}

// ==================== Initialize System ====================
function initializeSystem() {
  return safeExecute('initializeSystem', function() {
    console.log('Initializing system...');
    
    // Test connection first
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Connected to spreadsheet:', ss.getName());
    
    // Base sheets
    const baseSheets = ['ลูกค้า', 'รถ', 'ทรัพย์สิน', 'ใบงาน', 'รายการใบงาน', 'บริษัทประกัน', 'ประวัติ'];
    
    // Service type specific sheets
    const serviceSheets = ['ประกันภัย', 'ภาษี', 'ค่าบริการ', 'อื่นๆ'];
    
    // Create all sheets
    [...baseSheets, ...serviceSheets].forEach(sheetName => {
      console.log('Creating/checking sheet:', sheetName);
      getOrCreateSheet(sheetName);
    });
    
    // Add default insurance companies if needed
    initializeDefaultCompanies();
    
    // Migrate old work orders to items if needed
    const migrationResult = migrateWorkOrdersToItems();
    console.log('Migration result:', migrationResult);
    
    console.log('System initialization complete');
    return { 
      success: true, 
      message: 'ระบบพร้อมใช้งาน รองรับการแยกบันทึกตามประเภทบริการ',
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      userEmail: Session.getActiveUser().getEmail(),
      migrationResult: migrationResult
    };
  });
}

function initializeDefaultCompanies() {
  try {
    const companySheet = getOrCreateSheet('บริษัทประกัน');
    if (companySheet.getLastRow() <= 1) {
      console.log('Adding default companies...');
      const defaultCompanies = [
        ['COM001', 'บริษัท ทิพยประกันภัย จำกัด (มหาชน)', 'กรุงเทพฯ', '02-123-4567', 'คุณสมชาย', 'Active'],
        ['COM002', 'บริษัท วิริยะประกันภัย จำกัด (มหาชน)', 'กรุงเทพฯ', '02-234-5678', 'คุณสมหญิง', 'Active'],
        ['COM003', 'บริษัท กรุงเทพประกันภัย จำกัด (มหาชน)', 'กรุงเทพฯ', '02-345-6789', 'คุณสมศักดิ์', 'Active']
      ];
      companySheet.getRange(2, 1, defaultCompanies.length, defaultCompanies[0].length).setValues(defaultCompanies);
    }
  } catch (error) {
    console.error('Error initializing default companies:', error);
  }
}

// ==================== Utility Functions ====================
function calculateEndDate(startDate) {
  if (!startDate) return '';
  
  try {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1); // เพิ่ม 1 ปี
    
    return end.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch (error) {
    console.error('Error calculating end date:', error);
    return '';
  }
}

function formatDateThai(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

// ==================== Enhanced Search Functions ====================
function searchWorkOrders(searchText) {
  return safeExecute('searchWorkOrders', function() {
    console.log('Searching work orders with text:', searchText);
    
    if (!searchText || searchText.trim() === '') {
      console.log('Empty search text, returning empty results');
      return { success: true, data: [], count: 0 };
    }
    
    const sheet = getOrCreateSheet('ใบงาน');
    const lastRow = sheet.getLastRow();
    
    console.log('Work orders sheet last row:', lastRow);
    
    if (lastRow <= 1) {
      console.log('No data in work orders sheet');
      return { success: true, data: [], count: 0 };
    }
    
    const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    const searchLower = searchText.toLowerCase();
    
    console.log('Total rows to search:', values.length);
    
    const results = values.filter(row => {
      // Convert all fields to string for safe searching
      const workOrderId = String(row[0] || '').toLowerCase();
      const customerName = String(row[2] || '').toLowerCase();
      const policyNumber = String(row[10] || '').toLowerCase();
      const insuranceType = String(row[3] || '').toLowerCase();
      const details = String(row[5] || '').toLowerCase();
      const status = String(row[11] || '').toLowerCase();
      
      const matches = workOrderId.includes(searchLower) || 
                     customerName.includes(searchLower) || 
                     policyNumber.includes(searchLower) ||
                     insuranceType.includes(searchLower) ||
                     details.includes(searchLower) ||
                     status.includes(searchLower);
      
      return matches;
    }).map(row => ({
      id: String(row[0] || ''),
      customerId: String(row[1] || ''),
      customerName: String(row[2] || ''),
      insuranceType: String(row[3] || ''),
      propertyId: String(row[4] || ''),
      details: String(row[5] || ''),
      sumInsured: parseFloat(row[6]) || 0,
      premium: parseFloat(row[7]) || 0,
      startDate: row[8] ? (row[8] instanceof Date ? row[8].toISOString().split('T')[0] : row[8]) : '',
      endDate: row[9] ? (row[9] instanceof Date ? row[9].toISOString().split('T')[0] : row[9]) : '',
      policyNumber: String(row[10] || ''),
      status: String(row[11] || ''),
      createdDate: row[12] ? (row[12] instanceof Date ? row[12].toISOString().split('T')[0] : row[12]) : '',
      insuranceCompany: String(row[13] || ''),
      createdBy: String(row[14] || ''),
      modifiedDate: row[15] ? (row[15] instanceof Date ? row[15].toISOString().split('T')[0] : row[15]) : ''
    }));
    
    console.log('Search found', results.length, 'matches');
    
    return {
      success: true,
      data: results,
      count: results.length
    };
  }, { success: false, data: [], count: 0, error: 'Search failed' });
}

function searchCustomers(searchText) {
  return safeExecute('searchCustomers', function() {
    if (!searchText || searchText.trim() === '') {
      return { success: true, data: [], count: 0 };
    }
    
    const sheet = getOrCreateSheet('ลูกค้า');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return { success: true, data: [], count: 0 };
    
    const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const searchLower = searchText.toLowerCase();
    
    const results = values.filter(row => {
      const name = String(row[1] || '').toLowerCase();
      const idCard = String(row[2] || '').toLowerCase();
      const phone = String(row[3] || '').toLowerCase();
      const email = String(row[4] || '').toLowerCase();
      
      return name.includes(searchLower) || 
             idCard.includes(searchLower) || 
             phone.includes(searchLower) || 
             email.includes(searchLower);
    }).map(row => ({
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      idCard: String(row[2] || ''),
      phone: String(row[3] || ''),
      email: String(row[4] || ''),
      shippingAddress: String(row[5] || ''),
      documentAddress: String(row[6] || ''),
      createdDate: row[7] ? new Date(row[7]).toISOString() : '',
      status: String(row[8] || 'Active'),
      notes: String(row[9] || '')
    }));
    
    return {
      success: true,
      data: results,
      count: results.length
    };
  }, { success: false, data: [], count: 0, error: 'Search failed' });
}

// ==================== Customer Functions ====================
function generateCustomerId() {
  try {
    const sheet = getOrCreateSheet('ลูกค้า');
    const lastRow = sheet.getLastRow();
    return 'CUS' + String(lastRow).padStart(5, '0');
  } catch (error) {
    console.error('Error generating customer ID:', error);
    return 'CUS' + String(Date.now()).substr(-5);
  }
}

function saveCustomer(data) {
  return safeExecute('saveCustomer', function() {
    console.log('Saving customer:', data);
    
    if (!data || !data.name || data.name.trim() === '') {
      throw new Error('ชื่อลูกค้าเป็นข้อมูลที่จำเป็น');
    }
    
    const sheet = getOrCreateSheet('ลูกค้า');
    const customerId = data.id || generateCustomerId();
    const now = new Date();
    
    if (data.id) {
      // Update existing customer
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            customerId,
            data.name || '',
            data.idCard || '',
            data.phone || '',
            data.email || '',
            data.shippingAddress || '',
            data.documentAddress || '',
            values[i][7], // Keep original creation date
            data.status || 'Active',
            data.notes || ''
          ]]);
          
          // Add to history
          addHistory('แก้ไขข้อมูลลูกค้า', `แก้ไขข้อมูล ${data.name}`, 'ลูกค้า', customerId);
          
          console.log('Customer updated successfully');
          return { success: true, message: 'อัพเดตข้อมูลลูกค้าสำเร็จ', id: customerId };
        }
      }
    }
    
    // Add new customer
    const newRow = [
      customerId,
      data.name || '',
      data.idCard || '',
      data.phone || '',
      data.email || '',
      data.shippingAddress || '',
      data.documentAddress || '',
      now,
      'Active',
      data.notes || ''
    ];
    
    sheet.appendRow(newRow);
    
    // Add to history
    addHistory('เพิ่มลูกค้าใหม่', `เพิ่ม ${data.name}`, 'ลูกค้า', customerId);
    
    console.log('Customer added successfully:', customerId);
    
    return { success: true, message: 'บันทึกข้อมูลลูกค้าสำเร็จ', id: customerId };
  });
}

function deleteCustomer(customerId) {
  return safeExecute('deleteCustomer', function() {
    if (!customerId) {
      throw new Error('ไม่พบรหัสลูกค้า');
    }
    
    const sheet = getOrCreateSheet('ลูกค้า');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === customerId) {
        // Soft delete - just update status
        sheet.getRange(i + 1, 9).setValue('Deleted');
        
        // Add to history
        addHistory('ลบลูกค้า', `ลบ ${values[i][1]}`, 'ลูกค้า', customerId);
        
        return { success: true, message: 'ลบข้อมูลลูกค้าสำเร็จ' };
      }
    }
    
    return { success: false, message: 'ไม่พบข้อมูลลูกค้า' };
  });
}

function getCustomerListWrapped() {
  return safeExecute('getCustomerListWrapped', function() {
    console.log('Getting customer list...');
    const sheet = getOrCreateSheet('ลูกค้า');
    const lastRow = sheet.getLastRow();
    console.log('Customer sheet last row:', lastRow);
    
    if (lastRow <= 1) {
      console.log('No customer data found');
      return {
        success: true,
        data: [],
        count: 0,
        message: 'No customers found'
      };
    }
    
    const numRows = lastRow - 1;
    const numCols = 10;
    const dataRange = sheet.getRange(2, 1, numRows, numCols);
    const values = dataRange.getValues();
    console.log('Retrieved', values.length, 'customer rows');
    
    const customers = values
      .filter(row => row[8] !== 'Deleted') // Filter out deleted customers
      .map((row, index) => {
        return {
          id: String(row[0] || ''),
          name: String(row[1] || ''),
          idCard: String(row[2] || ''),
          phone: String(row[3] || ''),
          email: String(row[4] || ''),
          shippingAddress: String(row[5] || ''),
          documentAddress: String(row[6] || ''),
          createdDate: row[7] ? new Date(row[7]).toISOString() : '',
          status: String(row[8] || 'Active'),
          notes: String(row[9] || '')
        };
      });
    
    console.log('Processed', customers.length, 'customers');
    
    return {
      success: true,
      data: customers,
      count: customers.length,
      message: 'Customers loaded successfully'
    };
  }, {
    success: false,
    data: [],
    count: 0,
    error: 'Failed to load customers',
    message: 'Failed to load customers'
  });
}

function searchCustomersForAutocomplete(searchText) {
  return safeExecute('searchCustomersForAutocomplete', function() {
    if (!searchText || searchText.length < 2) {
      return { success: true, data: [] };
    }
    
    const sheet = getOrCreateSheet('ลูกค้า');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return { success: true, data: [] };
    
    const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const searchLower = searchText.toLowerCase();
    
    const results = values
      .filter(row => {
        const name = String(row[1] || '').toLowerCase();
        const phone = String(row[3] || '').toLowerCase();
        const idCard = String(row[2] || '').toLowerCase();
        
        return row[8] !== 'Deleted' && (
          name.includes(searchLower) || 
          phone.includes(searchLower) ||
          idCard.includes(searchLower)
        );
      })
      .slice(0, 10) // Limit to 10 results
      .map(row => ({
        id: String(row[0] || ''),
        name: String(row[1] || ''),
        phone: String(row[3] || ''),
        idCard: String(row[2] || ''),
        label: `${row[1]} - ${row[3]}` // Display format
      }));
    
    return {
      success: true,
      data: results
    };
  }, { success: false, data: [], error: 'Autocomplete failed' });
}

// ==================== Vehicle Functions ====================
function generateVehicleId() {
  try {
    const sheet = getOrCreateSheet('รถ');
    const lastRow = sheet.getLastRow();
    return 'VEH' + String(lastRow).padStart(5, '0');
  } catch (error) {
    console.error('Error generating vehicle ID:', error);
    return 'VEH' + String(Date.now()).substr(-5);
  }
}

function saveVehicle(data) {
  return safeExecute('saveVehicle', function() {
    if (!data || !data.customerId || !data.licensePlate) {
      throw new Error('ข้อมูลเจ้าของและทะเบียนรถเป็นข้อมูลที่จำเป็น');
    }
    
    const sheet = getOrCreateSheet('รถ');
    const vehicleId = data.id || generateVehicleId();
    const now = new Date();
    
    if (data.id) {
      // Update existing vehicle
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            vehicleId,
            data.customerId,
            data.licensePlate,
            data.brand || '',
            data.model || '',
            data.color || '',
            data.year || '',
            data.chassisNumber || '',
            values[i][8], // Keep original creation date
            'Active'
          ]]);
          
          // Add to history
          addHistory('แก้ไขข้อมูลรถ', `แก้ไขทะเบียน ${data.licensePlate}`, 'รถ', vehicleId);
          
          return { success: true, message: 'อัพเดตข้อมูลรถสำเร็จ', id: vehicleId };
        }
      }
    }
    
    // Add new vehicle
    sheet.appendRow([
      vehicleId,
      data.customerId,
      data.licensePlate,
      data.brand || '',
      data.model || '',
      data.color || '',
      data.year || '',
      data.chassisNumber || '',
      now,
      'Active'
    ]);
    
    // Add to history
    addHistory('เพิ่มรถใหม่', `เพิ่มทะเบียน ${data.licensePlate}`, 'รถ', vehicleId);
    
    return { success: true, message: 'บันทึกข้อมูลรถสำเร็จ', id: vehicleId };
  });
}

function deleteVehicle(vehicleId) {
  return safeExecute('deleteVehicle', function() {
    if (!vehicleId) {
      throw new Error('ไม่พบรหัสรถ');
    }
    
    const sheet = getOrCreateSheet('รถ');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === vehicleId) {
        // Soft delete
        sheet.getRange(i + 1, 10).setValue('Deleted');
        
        // Add to history
        addHistory('ลบรถ', `ลบทะเบียน ${values[i][2]}`, 'รถ', vehicleId);
        
        return { success: true, message: 'ลบข้อมูลรถสำเร็จ' };
      }
    }
    
    return { success: false, message: 'ไม่พบข้อมูลรถ' };
  });
}

function getVehicleListWrapped() {
  return safeExecute('getVehicleListWrapped', function() {
    const sheet = getOrCreateSheet('รถ');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        success: true,
        data: [],
        count: 0
      };
    }
    
    const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const vehicles = values
      .filter(row => row[9] !== 'Deleted')
      .map(row => ({
        id: String(row[0] || ''),
        customerId: String(row[1] || ''),
        licensePlate: String(row[2] || ''),
        brand: String(row[3] || ''),
        model: String(row[4] || ''),
        color: String(row[5] || ''),
        year: String(row[6] || ''),
        chassisNumber: String(row[7] || ''),
        createdDate: row[8] ? new Date(row[8]).toISOString() : '',
        status: String(row[9] || 'Active')
      }));
    
    return {
      success: true,
      data: vehicles,
      count: vehicles.length
    };
  }, {
    success: false,
    data: [],
    count: 0,
    error: 'Failed to load vehicles'
  });
}

// ==================== Property Functions ====================
function generatePropertyId() {
  try {
    const sheet = getOrCreateSheet('ทรัพย์สิน');
    const lastRow = sheet.getLastRow();
    return 'PROP' + String(lastRow).padStart(5, '0');
  } catch (error) {
    console.error('Error generating property ID:', error);
    return 'PROP' + String(Date.now()).substr(-5);
  }
}

function saveProperty(data) {
  return safeExecute('saveProperty', function() {
    if (!data || !data.customerId || !data.type || !data.name) {
      throw new Error('ข้อมูลเจ้าของ ประเภท และชื่อทรัพย์สินเป็นข้อมูลที่จำเป็น');
    }
    
    const sheet = getOrCreateSheet('ทรัพย์สิน');
    const propertyId = data.id || generatePropertyId();
    const now = new Date();
    
    if (data.id) {
      // Update existing property
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 11).setValues([[
            propertyId,
            data.customerId,
            data.type,
            data.name,
            data.address || '',
            data.value || 0,
            data.description || '',
            values[i][7], // Keep original creation date
            'Active',
            data.vehicleType || '',
            data.vehicleCode || ''
          ]]);
          
          // Add to history
          addHistory('แก้ไขข้อมูลทรัพย์สิน', `แก้ไข ${data.name}`, 'ทรัพย์สิน', propertyId);
          
          return { success: true, message: 'อัพเดตข้อมูลทรัพย์สินสำเร็จ', id: propertyId };
        }
      }
    }
    
    // Add new property
    sheet.appendRow([
      propertyId,
      data.customerId,
      data.type,
      data.name,
      data.address || '',
      data.value || 0,
      data.description || '',
      now,
      'Active',
      data.vehicleType || '',
      data.vehicleCode || ''
    ]);
    
    // Add to history
    addHistory('เพิ่มทรัพย์สินใหม่', `เพิ่ม ${data.name}`, 'ทรัพย์สิน', propertyId);
    
    return { success: true, message: 'บันทึกข้อมูลทรัพย์สินสำเร็จ', id: propertyId };
  });
}

function deleteProperty(propertyId) {
  return safeExecute('deleteProperty', function() {
    if (!propertyId) {
      throw new Error('ไม่พบรหัสทรัพย์สิน');
    }
    
    const sheet = getOrCreateSheet('ทรัพย์สิน');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === propertyId) {
        // Soft delete
        sheet.getRange(i + 1, 9).setValue('Deleted');
        
        // Add to history
        addHistory('ลบทรัพย์สิน', `ลบ ${values[i][3]}`, 'ทรัพย์สิน', propertyId);
        
        return { success: true, message: 'ลบข้อมูลทรัพย์สินสำเร็จ' };
      }
    }
    
    return { success: false, message: 'ไม่พบข้อมูลทรัพย์สิน' };
  });
}

function getPropertyListWrapped() {
  return safeExecute('getPropertyListWrapped', function() {
    const sheet = getOrCreateSheet('ทรัพย์สิน');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        success: true,
        data: [],
        count: 0
      };
    }
    
    const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const properties = values
      .filter(row => row[8] !== 'Deleted')
      .map(row => ({
        id: String(row[0] || ''),
        customerId: String(row[1] || ''),
        type: String(row[2] || ''),
        name: String(row[3] || ''),
        address: String(row[4] || ''),
        value: parseFloat(row[5]) || 0,
        description: String(row[6] || ''),
        createdDate: row[7] ? new Date(row[7]).toISOString() : '',
        status: String(row[8] || 'Active'),
        vehicleType: String(row[9] || ''),
        vehicleCode: String(row[10] || '')
      }));
    
    return {
      success: true,
      data: properties,
      count: properties.length
    };
  }, {
    success: false,
    data: [],
    count: 0,
    error: 'Failed to load properties'
  });
}

// ==================== Work Order Functions ====================
function generateWorkOrderId() {
  try {
    const sheet = getOrCreateSheet('ใบงาน');
    const today = new Date();
    const year = Utilities.formatDate(today, 'GMT+7', 'yyyy');
    const month = Utilities.formatDate(today, 'GMT+7', 'MM');
    
    // Get all work orders for this month
    const lastRow = sheet.getLastRow();
    let maxSequence = 0;
    
    if (lastRow > 1) {
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const prefix = 'WO' + year + month;
      
      // Find the highest sequence number for this month
      values.forEach(row => {
        const woId = String(row[0]);
        if (woId.startsWith(prefix)) {
          const sequence = parseInt(woId.substring(prefix.length)) || 0;
          maxSequence = Math.max(maxSequence, sequence);
        }
      });
    }
    
    // Increment sequence
    const newSequence = String(maxSequence + 1).padStart(4, '0');
    return 'WO' + year + month + newSequence;
  } catch (error) {
    console.error('Error generating work order ID:', error);
    return 'WO' + String(Date.now()).substr(-6);
  }
}

function getNextWorkOrderId() {
  return safeExecute('getNextWorkOrderId', function() {
    return generateWorkOrderId();
  });
}

function getOrCreateWorkOrderItemsSheet() {
  const sheetName = 'รายการใบงาน';
  const sheet = getOrCreateSheet(sheetName);
  
  // Check if headers exist and are correct
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() < 13) {
    console.log('Setting up work order items sheet headers...');
    const headers = [
      'รหัสรายการ', 'เลขที่ใบงาน', 'ประเภทบริการ', 'ประเภทประกัน', 'รายละเอียด', 
      'ทุนประกัน', 'เบี้ยประกัน', 'วันเริ่ม', 'วันสิ้นสุด', 
      'เลขกรมธรรม์', 'บริษัทประกัน', 'สถานะ', 'หมายเหตุ'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  
  return sheet;
}

// Enhanced saveWorkOrder function to support service type separation
function saveWorkOrder(data) {
  return safeExecute('saveWorkOrder', function() {
    if (!data || !data.customerId || !data.items || data.items.length === 0) {
      throw new Error('ข้อมูลลูกค้าและรายการเป็นข้อมูลที่จำเป็น');
    }
    
    const mainSheet = getOrCreateSheet('ใบงาน');
    const itemsSheet = getOrCreateWorkOrderItemsSheet();
    const user = Session.getActiveUser().getEmail();
    const now = new Date();
    
    // Use provided work order ID or generate new one
    let workOrderId;
    if (data.id) {
      workOrderId = data.id;
    } else if (data.workOrderNumber) {
      workOrderId = data.workOrderNumber;
    } else {
      workOrderId = generateWorkOrderId();
    }
    
    // คำนวณยอดรวมจาก items
    let totalPremium = 0;
    let totalSumInsured = 0;
    
    if (data.items && data.items.length > 0) {
      totalPremium = data.items.reduce((sum, item) => sum + (parseFloat(item.premium) || 0), 0);
      totalSumInsured = data.items.reduce((sum, item) => sum + (parseFloat(item.sumInsured) || 0), 0);
    }
    
    // Save main work order
    if (data.id) {
      // Update existing work order
      updateMainWorkOrder(mainSheet, data, workOrderId, totalSumInsured, totalPremium, now, user);
      deleteWorkOrderItems(workOrderId); // Delete old items from all sheets
    } else {
      // Add new work order
      createMainWorkOrder(mainSheet, data, workOrderId, totalSumInsured, totalPremium, now, user);
    }
    
    // Save work order items to appropriate sheets based on service type
    if (data.items && data.items.length > 0) {
      saveWorkOrderItemsByServiceType(workOrderId, data.items, data);
    }
    
    // Add to history
    const action = data.id ? 'แก้ไขใบงาน' : 'สร้างใบงานใหม่';
    addHistory(action, `${action} ${workOrderId}`, 'ใบงาน', workOrderId);
    
    return { success: true, message: 'บันทึกใบงานสำเร็จ รายการได้ถูกแยกบันทึกตามประเภทบริการ', workOrderId: workOrderId };
  });
}

// Function to save work order items to appropriate sheets based on service type
function saveWorkOrderItemsByServiceType(workOrderId, items, workOrderData) {
  const itemsSheet = getOrCreateWorkOrderItemsSheet(); // Keep original items sheet for compatibility
  
  items.forEach((item, index) => {
    const itemId = workOrderId + '-' + String(index + 1).padStart(2, '0');
    const serviceType = item.serviceType || '';
    const targetSheetName = SERVICE_SHEET_MAPPING[serviceType] || 'อื่นๆ';
    
    // คำนวณวันหมดอายุอัตโนมัติถ้าไม่มี
    let endDate = item.endDate;
    if (!endDate && item.startDate) {
      endDate = calculateEndDate(item.startDate);
    }
    
    // Save to original items sheet (for compatibility)
    itemsSheet.appendRow([
      itemId,
      workOrderId,
      serviceType,
      item.insuranceType || '',
      item.details || '',
      item.sumInsured || 0,
      item.premium || 0,
      item.startDate || workOrderData.startDate || '',
      endDate || workOrderData.endDate || '',
      item.policyNumber || '',
      item.insuranceCompany || '',
      'ใช้งาน',
      item.notes || ''
    ]);
    
    // Save to service type specific sheet
    saveToServiceTypeSheet(targetSheetName, {
      itemId: itemId,
      workOrderId: workOrderId,
      customerId: workOrderData.customerId,
      customerName: workOrderData.customerName,
      serviceType: serviceType,
      item: item,
      workOrderData: workOrderData,
      endDate: endDate
    });
  });
}

// Function to save to specific service type sheet
function saveToServiceTypeSheet(sheetName, data) {
  try {
    const sheet = getOrCreateSheet(sheetName);
    const { itemId, workOrderId, customerId, customerName, serviceType, item, workOrderData, endDate } = data;
    
    switch (sheetName) {
      case 'ประกันภัย':
        sheet.appendRow([
          itemId,                           // รหัสรายการ
          workOrderId,                      // เลขที่ใบงาน
          customerId,                       // รหัสลูกค้า
          customerName,                     // ชื่อลูกค้า
          serviceType,                      // ประเภทบริการ
          item.insuranceType || '',         // ประเภทประกัน
          item.details || '',               // รายละเอียด
          item.sumInsured || 0,             // ทุนประกัน
          item.premium || 0,                // เบี้ยประกัน
          item.startDate || workOrderData.startDate || '', // วันเริ่ม
          endDate || workOrderData.endDate || '',          // วันสิ้นสุด
          item.policyNumber || '',          // เลขกรมธรรม์
          item.insuranceCompany || '',      // บริษัทประกัน
          'ใช้งาน',                          // สถานะ
          new Date(),                       // วันที่สร้าง
          item.notes || ''                  // หมายเหตุ
        ]);
        break;
        
      case 'ภาษี':
        sheet.appendRow([
          itemId,                           // รหัสรายการ
          workOrderId,                      // เลขที่ใบงาน
          customerId,                       // รหัสลูกค้า
          customerName,                     // ชื่อลูกค้า
          serviceType,                      // ประเภทบริการ
          item.details || '',               // รายละเอียด
          item.premium || 0,                // จำนวนเงิน
          item.startDate || workOrderData.startDate || '', // วันเริ่ม
          endDate || workOrderData.endDate || '',          // วันสิ้นสุด
          item.policyNumber || '',          // เลขที่อ้างอิง
          'ใช้งาน',                          // สถานะ
          new Date(),                       // วันที่สร้าง
          item.notes || ''                  // หมายเหตุ
        ]);
        break;
        
      case 'ค่าบริการ':
        sheet.appendRow([
          itemId,                           // รหัสรายการ
          workOrderId,                      // เลขที่ใบงาน
          customerId,                       // รหัสลูกค้า
          customerName,                     // ชื่อลูกค้า
          serviceType,                      // ประเภทบริการ
          item.details || '',               // รายละเอียด
          item.premium || 0,                // จำนวนเงิน
          item.startDate || new Date(),     // วันที่ให้บริการ
          'ใช้งาน',                          // สถานะ
          new Date(),                       // วันที่สร้าง
          item.notes || ''                  // หมายเหตุ
        ]);
        break;
        
      case 'อื่นๆ':
        sheet.appendRow([
          itemId,                           // รหัสรายการ
          workOrderId,                      // เลขที่ใบงาน
          customerId,                       // รหัสลูกค้า
          customerName,                     // ชื่อลูกค้า
          serviceType,                      // ประเภทบริการ
          item.details || '',               // รายละเอียด
          item.premium || 0,                // จำนวนเงิน
          item.startDate || new Date(),     // วันที่
          'ใช้งาน',                          // สถานะ
          new Date(),                       // วันที่สร้าง
          item.notes || ''                  // หมายเหตุ
        ]);
        break;
    }
    
    console.log(`Saved item ${itemId} to ${sheetName} sheet`);
  } catch (error) {
    console.error(`Error saving to ${sheetName} sheet:`, error);
  }
}

// Enhanced helper functions for main work order operations
function updateMainWorkOrder(sheet, data, workOrderId, totalSumInsured, totalPremium, now, user) {
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.id) {
      sheet.getRange(i + 1, 1, 1, 16).setValues([[
        workOrderId,
        data.customerId,
        data.customerName,
        'รวม',
        data.vehicleId || data.propertyId || '',
        `${data.items.length} รายการ`,
        totalSumInsured,
        totalPremium,
        data.startDate || '',
        data.endDate || '',
        '',
        data.status || values[i][11],
        values[i][12],
        '',
        values[i][14],
        now
      ]]);
      break;
    }
  }
}

function createMainWorkOrder(sheet, data, workOrderId, totalSumInsured, totalPremium, now, user) {
  sheet.appendRow([
    workOrderId,
    data.customerId,
    data.customerName,
    'รวม',
    data.vehicleId || data.propertyId || '',
    `${data.items.length} รายการ`,
    totalSumInsured,
    totalPremium,
    data.startDate || '',
    data.endDate || '',
    '',
    data.status || 'แจ้งงานแล้ว',
    now,
    '',
    user,
    now
  ]);
}

// Enhanced deleteWorkOrderItems to delete from all sheets
function deleteWorkOrderItems(workOrderId) {
  try {
    // Delete from original items sheet
    const itemsSheet = getOrCreateWorkOrderItemsSheet();
    deleteItemsFromSheet(itemsSheet, workOrderId);
    
    // Delete from service type specific sheets
    const uniqueSheetNames = [...new Set(Object.values(SERVICE_SHEET_MAPPING))];
    uniqueSheetNames.forEach(sheetName => {
      try {
        const sheet = getOrCreateSheet(sheetName);
        deleteItemsFromSheet(sheet, workOrderId);
      } catch (error) {
        console.warn(`Could not delete from ${sheetName}:`, error);
      }
    });
  } catch (error) {
    console.error('Error deleting work order items:', error);
  }
}

// Helper function to delete items from a specific sheet
function deleteItemsFromSheet(sheet, workOrderId) {
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Delete from bottom to top to avoid index issues
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][1] === workOrderId) { // Column 1 is work order ID
      sheet.deleteRow(i + 1);
    }
  }
}

function getWorkOrderItems(workOrderId) {
  return safeExecute('getWorkOrderItems', function() {
    console.log('Getting work order items for:', workOrderId);
    
    if (!workOrderId) {
      console.log('No workOrderId provided');
      return [];
    }
    
    const sheet = getOrCreateWorkOrderItemsSheet();
    const lastRow = sheet.getLastRow();
    
    console.log('Work order items sheet last row:', lastRow);
    
    if (lastRow <= 1) {
      console.log('No items in sheet');
      return [];
    }
    
    const values = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    console.log('Total rows in items sheet:', values.length);
    
    const items = values
      .filter(row => {
        const rowWorkOrderId = String(row[1] || '');
        const matches = rowWorkOrderId === workOrderId;
        if (matches) {
          console.log('Found matching item:', row[0]);
        }
        return matches;
      })
      .map(row => ({
        id: String(row[0] || ''),
        workOrderId: String(row[1] || ''),
        serviceType: String(row[2] || ''),
        insuranceType: String(row[3] || ''),
        details: String(row[4] || ''),
        sumInsured: parseFloat(row[5]) || 0,
        premium: parseFloat(row[6]) || 0,
        startDate: row[7] ? (row[7] instanceof Date ? row[7].toISOString().split('T')[0] : row[7]) : '',
        endDate: row[8] ? (row[8] instanceof Date ? row[8].toISOString().split('T')[0] : row[8]) : '',
        policyNumber: String(row[9] || ''),
        insuranceCompany: String(row[10] || ''),
        status: String(row[11] || ''),
        notes: String(row[12] || '')
      }));
    
    console.log('Found', items.length, 'items for work order', workOrderId);
    return items;
  }, []);
}

function getWorkOrderList() {
  return safeExecute('getWorkOrderList', function() {
    const sheet = getOrCreateSheet('ใบงาน');
    const lastRow = sheet.getLastRow();
    
    console.log('getWorkOrderList - lastRow:', lastRow);
    
    if (lastRow <= 1) {
      console.log('No work orders found');
      return [];
    }
    
    const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    console.log('Retrieved', values.length, 'work order rows');
    
    const workOrders = values.map(row => ({
      id: String(row[0] || ''),
      customerId: String(row[1] || ''),
      customerName: String(row[2] || ''),
      insuranceType: String(row[3] || ''),
      propertyId: String(row[4] || ''),
      details: String(row[5] || ''),
      sumInsured: parseFloat(row[6]) || 0,
      premium: parseFloat(row[7]) || 0,
      startDate: row[8] ? (row[8] instanceof Date ? row[8].toISOString().split('T')[0] : row[8]) : '',
      endDate: row[9] ? (row[9] instanceof Date ? row[9].toISOString().split('T')[0] : row[9]) : '',
      policyNumber: String(row[10] || ''),
      status: String(row[11] || ''),
      createdDate: row[12] ? (row[12] instanceof Date ? row[12].toISOString().split('T')[0] : row[12]) : '',
      insuranceCompany: String(row[13] || ''),
      createdBy: String(row[14] || ''),
      modifiedDate: row[15] ? (row[15] instanceof Date ? row[15].toISOString().split('T')[0] : row[15]) : ''
    }));
    
    console.log('Processed', workOrders.length, 'work orders');
    return workOrders;
  }, []);
}

function cancelWorkOrder(workOrderId) {
  return safeExecute('cancelWorkOrder', function() {
    if (!workOrderId) {
      throw new Error('ไม่พบรหัสใบงาน');
    }
    
    const sheet = getOrCreateSheet('ใบงาน');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === workOrderId) {
        // Update status to cancelled
        sheet.getRange(i + 1, 12).setValue('ยกเลิก');
        sheet.getRange(i + 1, 16).setValue(new Date());
        
        // Add to history
        addHistory('ยกเลิกใบงาน', `ยกเลิกใบงาน ${workOrderId}`, 'ใบงาน', workOrderId);
        
        return { success: true, message: 'ยกเลิกใบงานสำเร็จ' };
      }
    }
    
    return { success: false, message: 'ไม่พบใบงาน' };
  });
}

function renewPolicy(workOrderId) {
  return safeExecute('renewPolicy', function() {
    if (!workOrderId) {
      throw new Error('ไม่พบรหัสใบงาน');
    }
    
    const workOrders = getWorkOrderList();
    const workOrder = workOrders.find(wo => wo.id === workOrderId);
    
    if (!workOrder) {
      return { success: false, message: 'ไม่พบใบงาน' };
    }
    
    // Get work order items
    const items = getWorkOrderItems(workOrderId);
    
    if (items.length === 0) {
      return { success: false, message: 'ไม่พบรายการในใบงาน' };
    }
    
    // Create new items with dates extended by 1 year
    const renewedItems = items.map(item => {
      const newStartDate = item.endDate ? new Date(item.endDate) : new Date();
      newStartDate.setDate(newStartDate.getDate() + 1); // Start next day after old end date
      
      const newEndDate = calculateEndDate(newStartDate.toISOString().split('T')[0]);
      
      return {
        ...item,
        startDate: newStartDate.toISOString().split('T')[0],
        endDate: newEndDate,
        policyNumber: '', // New policy number will be assigned
        status: 'รอดำเนินการ'
      };
    });
    
    // Create new work order
    const newWorkOrderData = {
      customerId: workOrder.customerId,
      customerName: workOrder.customerName,
      vehicleId: workOrder.propertyId,
      items: renewedItems,
      status: 'แจ้งงานแล้ว',
      startDate: renewedItems[0]?.startDate,
      endDate: renewedItems[0]?.endDate
    };
    
    const result = saveWorkOrder(newWorkOrderData);
    
    if (result.success) {
      // Add to history
      addHistory('ต่ออายุกรมธรรม์', `ต่ออายุจาก ${workOrderId} เป็น ${result.workOrderId}`, 'ใบงาน', result.workOrderId);
    }
    
    return result;
  });
}

// ==================== Service Type Functions ====================
// Function to get items by service type
function getItemsByServiceType(serviceType, limit = 100) {
  return safeExecute('getItemsByServiceType', function() {
    const targetSheetName = SERVICE_SHEET_MAPPING[serviceType] || 'อื่นๆ';
    const sheet = getOrCreateSheet(targetSheetName);
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return [];
    }
    
    const startRow = Math.max(2, lastRow - limit + 1);
    const numRows = lastRow - startRow + 1;
    const values = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
    
    // Map data based on sheet structure
    if (targetSheetName === 'ประกันภัย') {
      return values.map(row => ({
        itemId: String(row[0] || ''),
        workOrderId: String(row[1] || ''),
        customerId: String(row[2] || ''),
        customerName: String(row[3] || ''),
        serviceType: String(row[4] || ''),
        insuranceType: String(row[5] || ''),
        details: String(row[6] || ''),
        sumInsured: parseFloat(row[7]) || 0,
        amount: parseFloat(row[8]) || 0,
        startDate: row[9] || '',
        endDate: row[10] || '',
        policyNumber: String(row[11] || ''),
        insuranceCompany: String(row[12] || ''),
        status: String(row[13] || ''),
        createdDate: row[14] || '',
        notes: String(row[15] || '')
      }));
    } else if (targetSheetName === 'ภาษี') {
      return values.map(row => ({
        itemId: String(row[0] || ''),
        workOrderId: String(row[1] || ''),
        customerId: String(row[2] || ''),
        customerName: String(row[3] || ''),
        serviceType: String(row[4] || ''),
        details: String(row[5] || ''),
        amount: parseFloat(row[6]) || 0,
        startDate: row[7] || '',
        endDate: row[8] || '',
        referenceNumber: String(row[9] || ''),
        status: String(row[10] || ''),
        createdDate: row[11] || '',
        notes: String(row[12] || '')
      }));
    } else if (targetSheetName === 'ค่าบริการ') {
      return values.map(row => ({
        itemId: String(row[0] || ''),
        workOrderId: String(row[1] || ''),
        customerId: String(row[2] || ''),
        customerName: String(row[3] || ''),
        serviceType: String(row[4] || ''),
        details: String(row[5] || ''),
        amount: parseFloat(row[6]) || 0,
        date: row[7] || '',
        status: String(row[8] || ''),
        createdDate: row[9] || '',
        notes: String(row[10] || '')
      }));
    } else { // อื่นๆ
      return values.map(row => ({
        itemId: String(row[0] || ''),
        workOrderId: String(row[1] || ''),
        customerId: String(row[2] || ''),
        customerName: String(row[3] || ''),
        serviceType: String(row[4] || ''),
        details: String(row[5] || ''),
        amount: parseFloat(row[6]) || 0,
        date: row[7] || '',
        status: String(row[8] || ''),
        createdDate: row[9] || '',
        notes: String(row[10] || '')
      }));
    }
  }, []);
}

// Function to get service type statistics
function getServiceTypeStats() {
  return safeExecute('getServiceTypeStats', function() {
    const stats = {};
    
    const uniqueSheetNames = [...new Set(Object.values(SERVICE_SHEET_MAPPING))];
    uniqueSheetNames.forEach(sheetName => {
      try {
        const sheet = getOrCreateSheet(sheetName);
        const lastRow = sheet.getLastRow();
        const count = Math.max(0, lastRow - 1); // Subtract header row
        
        if (count > 0) {
          let amountColumnIndex;
          if (sheetName === 'ประกันภัย') {
            amountColumnIndex = 8; // เบี้ยประกัน column
          } else {
            amountColumnIndex = 6; // จำนวนเงิน column
          }
          
          const values = sheet.getRange(2, amountColumnIndex + 1, count, 1).getValues();
          const totalAmount = values.reduce((sum, row) => sum + (parseFloat(row[0]) || 0), 0);
          
          stats[sheetName] = {
            count: count,
            totalAmount: totalAmount
          };
        } else {
          stats[sheetName] = {
            count: 0,
            totalAmount: 0
          };
        }
      } catch (error) {
        console.warn(`Could not get stats for ${sheetName}:`, error);
        stats[sheetName] = {
          count: 0,
          totalAmount: 0
        };
      }
    });
    
    return stats;
  }, {});
}

// ==================== Company Functions ====================
function getCompanyListWrapped() {
  return safeExecute('getCompanyListWrapped', function() {
    const sheet = getOrCreateSheet('บริษัทประกัน');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        success: true,
        data: [],
        count: 0
      };
    }
    
    // ตรวจสอบว่ามี column อีเมลหรือไม่
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const emailColumnExists = headers.includes('อีเมล');
    
    const numColumns = emailColumnExists ? 7 : 6;
    const values = sheet.getRange(2, 1, lastRow - 1, numColumns).getValues();
    
    const companies = values.map(row => ({
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      address: String(row[2] || ''),
      phone: String(row[3] || ''),
      contact: String(row[4] || ''),
      status: String(row[5] || ''),
      email: emailColumnExists ? String(row[6] || '') : '' // เพิ่ม email field ถ้ามี
    }));
    
    return {
      success: true,
      data: companies,
      count: companies.length
    };
  }, {
    success: false,
    data: [],
    count: 0,
    error: 'Failed to load companies'
  });
}

// ==================== History Functions ====================
function generateHistoryId() {
  try {
    const sheet = getOrCreateSheet('ประวัติ');
    const lastRow = sheet.getLastRow();
    return 'HIST' + String(lastRow).padStart(5, '0');
  } catch (error) {
    console.error('Error generating history ID:', error);
    return 'HIST' + String(Date.now()).substr(-5);
  }
}

function addHistory(action, details, relatedTable, referenceId) {
  return safeExecute('addHistory', function() {
    const sheet = getOrCreateSheet('ประวัติ');
    const historyId = generateHistoryId();
    const user = Session.getActiveUser().getEmail();
    const now = new Date();
    
    sheet.appendRow([
      historyId,
      now,
      user,
      action,
      details,
      relatedTable,
      referenceId
    ]);
    
    return { success: true, id: historyId };
  }, { success: false, error: 'Failed to add history' });
}

function getHistory(limit = 50) {
  return safeExecute('getHistory', function() {
    const sheet = getOrCreateSheet('ประวัติ');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return [];
    
    const startRow = Math.max(2, lastRow - limit + 1);
    const numRows = lastRow - startRow + 1;
    
    const values = sheet.getRange(startRow, 1, numRows, 7).getValues();
    
    return values.reverse().map(row => ({
      id: String(row[0] || ''),
      date: row[1] || '',
      user: String(row[2] || ''),
      action: String(row[3] || ''),
      details: String(row[4] || ''),
      relatedTable: String(row[5] || ''),
      referenceId: String(row[6] || '')
    }));
  }, []);
}

// ==================== Dashboard Functions ====================
function getDashboardData() {
  return safeExecute('getDashboardData', function() {
    const customersResult = getCustomerListWrapped();
    const workOrders = getWorkOrderList();
    
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    let expiringCount = 0;
    let totalRevenue = 0;
    
    workOrders.forEach(wo => {
      if (wo.endDate && wo.status !== 'ยกเลิก') {
        const endDate = new Date(wo.endDate);
        if (endDate >= today && endDate <= thirtyDaysLater) {
          expiringCount++;
        }
      }
      
      if (wo.status !== 'ยกเลิก') {
        totalRevenue += parseFloat(wo.premium) || 0;
      }
    });
    
    return {
      totalCustomers: customersResult.count || 0,
      totalWorkOrders: workOrders.filter(wo => wo.status !== 'ยกเลิก').length,
      expiringPolicies: expiringCount,
      totalRevenue: totalRevenue
    };
  }, {
    totalCustomers: 0,
    totalWorkOrders: 0,
    expiringPolicies: 0,
    totalRevenue: 0
  });
}

// ==================== Backup Functions ====================
function createBackup() {
  return safeExecute('createBackup', function() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const backupName = `Backup_Insurance_${Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmmss')}`;
    
    const backup = ss.copy(backupName);
    
    // Try to create folder, but don't fail if it already exists
    let folder;
    try {
      folder = DriveApp.getFoldersByName('Insurance_Backups').next();
    } catch (e) {
      folder = DriveApp.createFolder('Insurance_Backups');
    }
    
    DriveApp.getFileById(backup.getId()).moveTo(folder);
    
    return {
      success: true,
      message: 'สร้างสำเนาสำรองสำเร็จ',
      backupId: backup.getId(),
      backupUrl: backup.getUrl()
    };
  });
}

// ==================== Test Functions ====================
function testConnection() {
  return safeExecute('testConnection', function() {
    console.log('Testing connection with ID:', SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const result = {
      success: true,
      spreadsheetName: ss.getName(),
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: ss.getUrl(),
      userEmail: Session.getActiveUser().getEmail(),
      sheets: sheets.map(s => ({
        name: s.getName(),
        lastRow: s.getLastRow(),
        lastColumn: s.getLastColumn()
      }))
    };
    console.log('Test connection result:', result);
    return result;
  });
}

function testConnectionDetailed() {
  return testConnection(); // Use the same function for now
}

function addTestData() {
  return safeExecute('addTestData', function() {
    // Add test customer
    const customerResult = saveCustomer({
      name: 'คุณทดสอบ ระบบ',
      idCard: '1234567890123',
      phone: '0812345678',
      email: 'test@example.com',
      shippingAddress: '123 ถนนทดสอบ กรุงเทพฯ 10100',
      documentAddress: '456 ถนนจริง กรุงเทพฯ 10200',
      notes: 'ลูกค้าทดสอบระบบ'
    });
    console.log('Customer added:', customerResult);
    
    if (customerResult.success && customerResult.id) {
      // Add test vehicle
      const vehicleResult = saveVehicle({
        customerId: customerResult.id,
        licensePlate: 'กก 1234',
        brand: 'Toyota',
        model: 'Vios',
        color: 'ขาว',
        year: '2023',
        chassisNumber: 'ABC123456789'
      });
      console.log('Vehicle added:', vehicleResult);
      
      // Add test property
      const propertyResult = saveProperty({
        customerId: customerResult.id,
        type: 'บ้าน',
        name: 'บ้านทดสอบ',
        address: '789 ซอยทดสอบ',
        value: 1000000,
        description: 'บ้านเดี่ยว 2 ชั้น',
        vehicleType: 'รถเก๋ง',
        vehicleCode: 'CAR001'
      });
      console.log('Property added:', propertyResult);
      
      return {
        success: true,
        customer: customerResult,
        vehicle: vehicleResult,
        property: propertyResult
      };
    } else {
      return {
        success: false,
        error: 'Failed to create customer'
      };
    }
  });
}

// ==================== Additional Helper Functions ====================
function loadCustomerList() {
  // This is an alias for getCustomerListWrapped for consistency with frontend
  return getCustomerListWrapped();
}

function loadVehicleList() {
  // This is an alias for getVehicleListWrapped for consistency with frontend
  return getVehicleListWrapped();
}

function loadPropertyList() {
  // This is an alias for getPropertyListWrapped for consistency with frontend
  return getPropertyListWrapped();
}

function loadCompanies() {
  // This is an alias for getCompanyListWrapped for consistency with frontend
  return getCompanyListWrapped();
}

// ==================== Data Migration Functions ====================
function migrateWorkOrdersToItems() {
  // ฟังก์ชันสำหรับย้ายข้อมูลจาก sheet ใบงานไปยัง sheet รายการใบงาน
  // สำหรับใบงานที่สร้างก่อนมีระบบ items
  
  console.log('Starting work order migration...');
  
  const workOrderSheet = getOrCreateSheet('ใบงาน');
  const itemsSheet = getOrCreateWorkOrderItemsSheet();
  
  const lastRow = workOrderSheet.getLastRow();
  if (lastRow <= 1) {
    console.log('No work orders to migrate');
    return { success: true, message: 'No work orders to migrate' };
  }
  
  const workOrders = workOrderSheet.getRange(2, 1, lastRow - 1, 16).getValues();
  let migratedCount = 0;
  
  workOrders.forEach((row, index) => {
    const workOrderId = row[0];
    
    // Check if items already exist for this work order
    const existingItems = itemsSheet.getDataRange().getValues()
      .filter((itemRow, i) => i > 0 && itemRow[1] === workOrderId);
    
    if (existingItems.length === 0) {
      // No items exist, create one from the main work order data
      const itemId = workOrderId + '-01';
      
      // Determine service type based on insurance type
      let serviceType = 'ประกันภัย';
      if (row[3] === 'พรบ' || row[3] === 'พ.ร.บ.') {
        serviceType = 'พรบ';
      }
      
      itemsSheet.appendRow([
        itemId,                    // รหัสรายการ
        workOrderId,               // เลขที่ใบงาน
        serviceType,               // ประเภทบริการ
        row[3] || '',             // ประเภทประกัน
        row[5] || '',             // รายละเอียด
        row[6] || 0,              // ทุนประกัน
        row[7] || 0,              // เบี้ยประกัน
        row[8] || '',             // วันเริ่ม
        row[9] || '',             // วันสิ้นสุด
        row[10] || '',            // เลขกรมธรรม์
        row[13] || '',            // บริษัทประกัน
        'ใช้งาน',                  // สถานะ
        'Migrated from work order' // หมายเหตุ
      ]);
      
      migratedCount++;
      console.log(`Migrated work order ${workOrderId}`);
    }
  });
  
  console.log(`Migration complete. Migrated ${migratedCount} work orders.`);
  return { 
    success: true, 
    message: `Migration complete. Migrated ${migratedCount} work orders.`,
    count: migratedCount
  };
}

// ==================== Email Functions ====================
function sendEmailNotification(data) {
  return safeExecute('sendEmailNotification', function() {
    if (!data || !data.to || !data.subject || !data.body) {
      throw new Error('ข้อมูลอีเมลไม่ครบถ้วน');
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.to)) {
      throw new Error('รูปแบบอีเมลผู้รับไม่ถูกต้อง');
    }
    
    // Validate CC email if provided
    if (data.cc && !emailRegex.test(data.cc)) {
      throw new Error('รูปแบบอีเมล CC ไม่ถูกต้อง');
    }
    
    try {
      // Prepare email options
      const emailOptions = {
        to: data.to,
        subject: data.subject,
        body: data.body,
        htmlBody: convertToHtml(data.body)
      };
      
      // Add CC if provided
      if (data.cc) {
        emailOptions.cc = data.cc;
      }
      
      // Send email
      MailApp.sendEmail(emailOptions);
      
      // Add to history with CC info
      if (data.workOrderId) {
        const ccInfo = data.cc ? ` (CC: ${data.cc})` : '';
        addHistory('ส่งอีเมลแจ้งงาน', `ส่งอีเมลไปยัง ${data.to}${ccInfo} สำหรับใบงาน ${data.workOrderId}`, 'ใบงาน', data.workOrderId);
      }
      
      return {
        success: true,
        message: 'ส่งอีเมลสำเร็จ'
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('ไม่สามารถส่งอีเมลได้: ' + error.toString());
    }
  });
}

// Helper function to convert plain text to HTML
function convertToHtml(text) {
  // Convert line breaks to <br>
  let html = text.replace(/\n/g, '<br>');
  
  // Convert === headers === to bold
  html = html.replace(/=== (.*?) ===/g, '<strong>$1</strong>');
  
  // Add basic styling
  html = `
    <div style="font-family: 'Sarabun', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        ${html}
      </div>
      <div style="margin-top: 20px; padding: 10px; background-color: #e3f2fd; border-left: 4px solid #2196f3;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          อีเมลนี้ส่งจากระบบ Insurance Sale Management<br>
          หากมีข้อสงสัยกรุณาติดต่อกลับ
        </p>
      </div>
    </div>
  `;
  
  return html;
}
// ==================== SEARCH VEHICLES FUNCTION ====================
function searchVehicles(searchText) {
  return safeExecute('searchVehicles', function() {
    if (!searchText || searchText.trim() === '') {
      return { success: true, data: [], count: 0 };
    }
    
    const sheet = getOrCreateSheet('รถ');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return { success: true, data: [], count: 0 };
    
    const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const searchLower = searchText.toLowerCase();
    
    const results = values.filter(row => {
      const licensePlate = String(row[2] || '').toLowerCase();
      const brand = String(row[3] || '').toLowerCase();
      const model = String(row[4] || '').toLowerCase();
      
      return row[9] !== 'Deleted' && (
        licensePlate.includes(searchLower) || 
        brand.includes(searchLower) || 
        model.includes(searchLower)
      );
    }).map(row => ({
      id: String(row[0] || ''),
      customerId: String(row[1] || ''),
      licensePlate: String(row[2] || ''),
      brand: String(row[3] || ''),
      model: String(row[4] || ''),
      color: String(row[5] || ''),
      year: String(row[6] || ''),
      chassisNumber: String(row[7] || ''),
      createdDate: row[8] ? new Date(row[8]).toISOString() : '',
      status: String(row[9] || 'Active')
    }));
    
    return {
      success: true,
      data: results,
      count: results.length
    };
  }, { success: false, data: [], count: 0, error: 'Search failed' });
}
