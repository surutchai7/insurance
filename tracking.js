// ==================== TRACKING FUNCTIONS ====================
function generateYearOptions() {
  const currentYear = new Date().getFullYear();
  let options = '';
  for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year + 543}</option>`;
  }
  return options;
}

function loadInstallmentTracking() {
  const content = `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">ติดตามการผ่อนชำระ</h5>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-3">
            <label for="installmentMonth">เดือน</label>
            <select class="form-control" id="installmentMonth">
              <option value="1">มกราคม</option>
              <option value="2">กุมภาพันธ์</option>
              <option value="3">มีนาคม</option>
              <option value="4">เมษายน</option>
              <option value="5">พฤษภาคม</option>
              <option value="6">มิถุนายน</option>
              <option value="7">กรกฎาคม</option>
              <option value="8">สิงหาคม</option>
              <option value="9">กันยายน</option>
              <option value="10">ตุลาคม</option>
              <option value="11">พฤศจิกายน</option>
              <option value="12">ธันวาคม</option>
            </select>
          </div>
          <div class="col-md-3">
            <label for="installmentYear">ปี</label>
            <select class="form-control" id="installmentYear">
              ${generateYearOptions()}
            </select>
          </div>
          <div class="col-md-3">
            <label>&nbsp;</label>
            <button class="btn btn-primary btn-block" onclick="filterInstallments()">
              <i class="fas fa-search"></i> ค้นหา
            </button>
          </div>
          <div class="col-md-3">
            <label>&nbsp;</label>
            <button class="btn btn-info btn-block" onclick="loadCurrentMonthInstallments()">
              <i class="fas fa-calendar-day"></i> เดือนปัจจุบัน
            </button>
          </div>
        </div>
        <div id="installmentTrackingContent">
          <div class="text-center">
            <div class="spinner-border" role="status">
              <span class="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('content').innerHTML = content;
  
  // Set current month/year
  const now = new Date();
  document.getElementById('installmentMonth').value = now.getMonth() + 1;
  document.getElementById('installmentYear').value = now.getFullYear();
  
  loadInstallmentsDue();
}

function loadRenewalTracking() {
  const content = `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">ติดตามการต่ออายุ</h5>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-3">
            <label for="renewalMonth">เดือน</label>
            <select class="form-control" id="renewalMonth">
              <option value="1">มกราคม</option>
              <option value="2">กุมภาพันธ์</option>
              <option value="3">มีนาคม</option>
              <option value="4">เมษายน</option>
              <option value="5">พฤษภาคม</option>
              <option value="6">มิถุนายน</option>
              <option value="7">กรกฎาคม</option>
              <option value="8">สิงหาคม</option>
              <option value="9">กันยายน</option>
              <option value="10">ตุลาคม</option>
              <option value="11">พฤศจิกายน</option>
              <option value="12">ธันวาคม</option>
            </select>
          </div>
          <div class="col-md-3">
            <label for="renewalYear">ปี</label>
            <select class="form-control" id="renewalYear">
              ${generateYearOptions()}
            </select>
          </div>
          <div class="col-md-3">
            <label>&nbsp;</label>
            <button class="btn btn-primary btn-block" onclick="filterRenewals()">
              <i class="fas fa-search"></i> ค้นหา
            </button>
          </div>
          <div class="col-md-3">
            <label>&nbsp;</label>
            <button class="btn btn-info btn-block" onclick="loadCurrentMonthRenewals()">
              <i class="fas fa-calendar-day"></i> เดือนปัจจุบัน
            </button>
          </div>
        </div>
        <div id="renewalTrackingContent">
          <div class="text-center">
            <div class="spinner-border" role="status">
              <span class="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('content').innerHTML = content;
  
  // Set current month/year
  const now = new Date();
  document.getElementById('renewalMonth').value = now.getMonth() + 1;
  document.getElementById('renewalYear').value = now.getFullYear();
  
  loadRenewalsDue();
}

async function loadInstallmentsDue() {
  try {
    const installments = await callGoogleScript('getInstallmentsDueThisMonth');
    displayInstallmentTracking(installments);
  } catch (error) {
    console.error('Error loading installments:', error);
    showToast('ไม่สามารถโหลดข้อมูลการผ่อนชำระได้', 'error');
  }
}

async function filterInstallments() {
  const month = document.getElementById('installmentMonth').value;
  const year = document.getElementById('installmentYear').value;
  
  try {
    showLoading('กำลังค้นหา...');
    const installments = await callGoogleScript('getInstallmentsByMonthYear', month, year);
    hideLoading();
    displayInstallmentTracking(installments);
  } catch (error) {
    hideLoading();
    console.error('Error filtering installments:', error);
    showToast('ไม่สามารถค้นหาได้', 'error');
  }
}

async function loadCurrentMonthInstallments() {
  const now = new Date();
  document.getElementById('installmentMonth').value = now.getMonth() + 1;
  document.getElementById('installmentYear').value = now.getFullYear();
  await loadInstallmentsDue();
}

function displayInstallmentTracking(installments) {
  const content = document.getElementById('installmentTrackingContent');
  if (!content) return;
  
  if (!installments || installments.length === 0) {
    content.innerHTML = '<p class="text-center text-muted">ไม่มีรายการผ่อนชำระในเดือนนี้</p>';
    return;
  }
  
  let html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>เลขที่ใบงาน</th>
            <th>ชื่อลูกค้า</th>
            <th>งวดที่</th>
            <th>จำนวนเงิน</th>
            <th>วันครบกำหนด</th>
            <th>สถานะ</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  installments.forEach(inst => {
    const statusClass = inst.status === 'ชำระแล้ว' ? 'badge-success' : 
                      inst.status === 'เกินกำหนด' ? 'badge-danger' : 'badge-warning';
    
    html += `
      <tr>
        <td>${inst.workOrderId}</td>
        <td>${inst.customerName}</td>
        <td>${inst.installmentNumber}${inst.totalInstallments ? '/' + inst.totalInstallments : ''}</td>
        <td>฿${formatNumber(inst.amount)}</td>
        <td>${formatDate(inst.dueDate)}</td>
        <td><span class="badge ${statusClass}">${inst.status}</span></td>
        <td>
          ${inst.status !== 'ชำระแล้ว' ? 
            `<button class="btn btn-success btn-sm" onclick="markInstallmentPaid('${inst.workOrderId}', ${inst.installmentNumber})">
              <span class="material-icons">check_circle</span> ชำระแล้ว
            </button>` : 
            `<span class="text-success">ชำระเมื่อ ${formatDate(inst.paymentDate)}</span>`
          }
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  content.innerHTML = html;
}

async function loadRenewalsDue() {
  try {
    const renewals = await callGoogleScript('getRenewalsDueThisMonth');
    displayRenewalTracking(renewals);
  } catch (error) {
    console.error('Error loading renewals:', error);
    showToast('ไม่สามารถโหลดข้อมูลการต่ออายุได้', 'error');
  }
}

async function filterRenewals() {
  const month = document.getElementById('renewalMonth').value;
  const year = document.getElementById('renewalYear').value;
  
  try {
    showLoading('กำลังค้นหา...');
    const renewals = await callGoogleScript('getRenewalsByMonthYear', month, year);
    hideLoading();
    displayRenewalTracking(renewals);
  } catch (error) {
    hideLoading();
    console.error('Error filtering renewals:', error);
    showToast('ไม่สามารถค้นหาได้', 'error');
  }
}

async function loadCurrentMonthRenewals() {
  const now = new Date();
  document.getElementById('renewalMonth').value = now.getMonth() + 1;
  document.getElementById('renewalYear').value = now.getFullYear();
  await loadRenewalsDue();
}

function displayRenewalTracking(renewals) {
  const content = document.getElementById('renewalTrackingContent');
  if (!content) return;
  
  if (!renewals || renewals.length === 0) {
    content.innerHTML = '<p class="text-center text-muted">ไม่มีกรมธรรม์ที่ต้องต่ออายุในเดือนนี้</p>';
    return;
  }
  
  let html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>เลขที่ใบงาน</th>
            <th>ชื่อลูกค้า</th>
            <th>ประเภทประกัน</th>
            <th>วันหมดอายุ</th>
            <th>เลขกรมธรรม์</th>
            <th>สถานะ</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  renewals.forEach(renewal => {
    const statusClass = getRenewalStatusClass(renewal.status);
    
    html += `
      <tr>
        <td>${renewal.workOrderId}</td>
        <td>${renewal.customerName}</td>
        <td>${renewal.insuranceType}</td>
        <td>${formatDate(renewal.expiryDate)}</td>
        <td>${renewal.policyNumber || '-'}</td>
        <td><span class="badge ${statusClass}">${renewal.status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="updateRenewalStatus('${renewal.trackingId || renewal.workOrderId}', '${renewal.status}')">
            <span class="material-icons">update</span> อัพเดต
          </button>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  content.innerHTML = html;
}

function getRenewalStatusClass(status) {
  const classes = {
    'รอดำเนินการ': 'badge-warning',
    'แจ้งผู้เอาประกันแล้ว': 'badge-info',
    'สั่งต่ออายุแล้ว': 'badge-success',
    'กรมธรรม์ขาดต่อ': 'badge-danger'
  };
  return classes[status] || 'badge-secondary';
}

async function markInstallmentPaid(workOrderId, installmentNumber) {
  try {
    const result = await callGoogleScript('payInstallment', {
      workOrderId: workOrderId,
      installmentNumber: installmentNumber
    });
    
    if (result && result.success) {
      showToast('บันทึกการชำระเงินสำเร็จ', 'success');
      await filterInstallments(); // Refresh the list
    } else {
      throw new Error(result?.message || 'Payment failed');
    }
  } catch (error) {
    console.error('Error marking installment paid:', error);
    showToast('ไม่สามารถบันทึกการชำระเงินได้', 'error');
  }
}

async function updateRenewalStatus(trackingId, currentStatus) {
  // Create modal for status update
  const statusOptions = [
    { value: 'รอดำเนินการ', text: 'รอดำเนินการ' },
    { value: 'แจ้งผู้เอาประกันแล้ว', text: 'แจ้งผู้เอาประกันแล้ว' },
    { value: 'สั่งต่ออายุแล้ว', text: 'สั่งต่ออายุแล้ว' },
    { value: 'กรมธรรม์ขาดต่อ', text: 'กรมธรรม์ขาดต่อ' }
  ];
  
  const modalContent = `
    <div class="form-group">
      <label>สถานะปัจจุบัน</label>
      <input type="text" class="form-control" value="${currentStatus}" readonly>
    </div>
    <div class="form-group">
      <label>สถานะใหม่ *</label>
      <select class="form-control" id="renewal-new-status" required>
        ${statusOptions.map(opt => 
          `<option value="${opt.value}" ${opt.value === currentStatus ? 'selected' : ''}>${opt.text}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group" id="new-policy-group" style="display: none;">
      <label>เลขกรมธรรม์ใหม่</label>
      <input type="text" class="form-control" id="renewal-new-policy">
    </div>
    <div class="form-group">
      <label>หมายเหตุ</label>
      <textarea class="form-control" id="renewal-notes" rows="2"></textarea>
    </div>
  `;
  
  // Use search results modal
  const modal = document.getElementById('search-results-modal');
  const content = document.getElementById('search-results-content');
  
  if (modal && content) {
    const modalHeader = modal.querySelector('.modal-header h3');
    if (modalHeader) {
      modalHeader.textContent = 'อัพเดตสถานะการต่ออายุ';
    }
    
    content.innerHTML = modalContent;
    
    // Add event listener for status change
    const statusSelect = document.getElementById('renewal-new-status');
    const policyGroup = document.getElementById('new-policy-group');
    
    statusSelect.addEventListener('change', function() {
      if (this.value === 'สั่งต่ออายุแล้ว') {
        policyGroup.style.display = 'block';
      } else {
        policyGroup.style.display = 'none';
      }
    });
    
    // Add footer
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.style.marginTop = '20px';
      footer.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('search-results-modal')">ยกเลิก</button>
        <button class="btn btn-primary" onclick="saveRenewalStatus('${trackingId}')">
          <span class="material-icons">save</span>
          บันทึก
        </button>
      `;
      modalBody.appendChild(footer);
    }
    
    modal.style.display = 'block';
  }
}

async function saveRenewalStatus(trackingId) {
  const newStatus = document.getElementById('renewal-new-status')?.value;
  const newPolicyNumber = document.getElementById('renewal-new-policy')?.value;
  const notes = document.getElementById('renewal-notes')?.value;
  
  if (!newStatus) {
    showToast('กรุณาเลือกสถานะ', 'warning');
    return;
  }
  
  try {
    showLoading('กำลังบันทึก...');
    
    const result = await callGoogleScript('updateRenewalStatus', {
      trackingId: trackingId,
      status: newStatus,
      newPolicyNumber: newPolicyNumber,
      notes: notes
    });
    
    if (result && result.success) {
      showToast(result.message, 'success');
      closeModal('search-results-modal');
      await filterRenewals(); // Refresh the list
    } else {
      throw new Error(result?.message || 'Update failed');
    }
    
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error updating renewal status:', error);
    showToast('ไม่สามารถอัพเดตสถานะได้', 'error');
  }
}

// Register functions globally
window.loadInstallmentTracking = loadInstallmentTracking;
window.loadRenewalTracking = loadRenewalTracking;
window.generateYearOptions = generateYearOptions;
window.filterInstallments = filterInstallments;
window.filterRenewals = filterRenewals;
window.loadCurrentMonthInstallments = loadCurrentMonthInstallments;
window.loadCurrentMonthRenewals = loadCurrentMonthRenewals;
window.updateRenewalStatus = updateRenewalStatus;
window.saveRenewalStatus = saveRenewalStatus;
window.markInstallmentPaid = markInstallmentPaid;