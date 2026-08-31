// ==============================================================================
// SMILEX BIKE - LUXURY ADMIN DASHBOARD CONTROLLER (FLEET & ORDERS)
// ==============================================================================

const AUTH_KEY = 'smilex_admin_auth_token_v1';
let currentFleet = [];
let currentOrders = [];

// 1. AUTHENTICATION & LOGIN
function checkAuth() {
  const token = sessionStorage.getItem(AUTH_KEY);
  const loginOverlay = document.getElementById('loginOverlay');
  const mainApp = document.getElementById('mainApp');

  if (token) {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    loadDashboardData();
  } else {
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const pass = document.getElementById('adminPassInput').value;
  const errEl = document.getElementById('loginError');

  try {
    const res = await fetch('/api/inventory?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    const data = await res.json();

    if (data.success && data.token) {
      sessionStorage.setItem(AUTH_KEY, data.token);
      checkAuth();
    } else {
      if (errEl) {
        errEl.innerText = data.error || 'Mật khẩu không chính xác!';
        errEl.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}

function handleLogout() {
  sessionStorage.removeItem(AUTH_KEY);
  window.location.reload();
}

// 2. DATA FETCHING & RENDERING
async function loadDashboardData() {
  try {
    const res = await fetch('/api/inventory?action=get');
    const data = await res.json();

    if (data.success) {
      currentFleet = data.fleet || [];
      currentOrders = data.orders || [];
      renderStats(data.stats, data.settings);
      renderFleet(currentFleet);
      renderOrders(currentOrders);
      populateBikeSelectOptions();
    }
  } catch (err) {
    console.error('Load data error:', err);
  }
}

function renderStats(stats, settings) {
  if (!stats) return;
  document.getElementById('statTotalBikes').innerText = stats.totalBikes;
  document.getElementById('statAvailableBikes').innerText = stats.availableCount;
  document.getElementById('statRentedBikes').innerText = stats.rentedCount;
  document.getElementById('statMaintenanceBikes').innerText = stats.maintenanceCount;
  document.getElementById('statTotalDeposit').innerText = (stats.totalDepositHolding || 0).toLocaleString() + ' đ';

  const aiToggle = document.getElementById('aiAutoPilotToggle');
  if (aiToggle && settings) aiToggle.checked = !!settings.aiAutoPilot;
}

function renderFleet(fleet) {
  const container = document.getElementById('fleetGrid');
  if (!container) return;

  if (fleet.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--text-muted);">Chưa có xe nào trong kho. Hãy bấm "+ Thêm Xe Mới" để bắt đầu.</div>`;
    return;
  }

  container.innerHTML = fleet.map(b => {
    let badgeClass = b.status === 'Available' ? 'available' : (b.status === 'Rented' ? 'rented' : 'maintenance');
    let badgeText = b.status === 'Available' ? '🟢 Sẵn Sàng Cho Thuê' : (b.status === 'Rented' ? `🔴 Đang Thuê: ${b.currentCustomer || 'Khách'}` : '🟡 Đang Bảo Dưỡng');

    return `
      <div class="bike-card">
        <div>
          <div class="bike-header">
            <div>
              <span class="bike-id">${b.id}</span>
              <div class="bike-name">${b.name}</div>
              <div class="bike-category">${b.category}</div>
            </div>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>

          <div class="bike-rates">
            <div class="rate-item">
              <span class="label">Thuê ngày:</span>
              <span class="val" style="color:var(--primary);">${(b.priceDaily || 0).toLocaleString()} đ/ngày</span>
            </div>
            <div class="rate-item">
              <span class="label">Thuê tuần (>7d):</span>
              <span class="val" style="color:#6ee7b7;">${(b.priceWeekly || 0).toLocaleString()} đ/ngày</span>
            </div>
            <div class="rate-item" style="grid-column: span 2; border-top:1px dashed rgba(255,255,255,0.06); padding-top:4px;">
              <span class="label">Tiền Cọc (100% Hoàn trả):</span>
              <span class="val" style="color:var(--accent-gold); font-size:15px;">${(b.deposit || 0).toLocaleString()} đ</span>
            </div>
          </div>

          <div class="bike-gear">⚙️ <b>Cấu hình:</b> ${b.gear || 'Xe tiêu chuẩn'}</div>
          ${b.notes ? `<div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">📝 ${b.notes}</div>` : ''}
        </div>

        <div class="bike-footer">
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="openEditBikeModal('${b.id}')">✏️ Sửa</button>
            <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteBike('${b.id}')">🗑️ Xóa</button>
          </div>
          <select class="form-select" style="width:auto; padding:4px 8px; font-size:11px;" onchange="changeBikeStatus('${b.id}', this.value)">
            <option value="Available" ${b.status === 'Available' ? 'selected' : ''}>🟢 Sẵn sàng</option>
            <option value="Rented" ${b.status === 'Rented' ? 'selected' : ''}>🔴 Đang thuê</option>
            <option value="Maintenance" ${b.status === 'Maintenance' ? 'selected' : ''}>🟡 Bảo dưỡng</option>
          </select>
        </div>
      </div>
    `;
  }).join('');
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">Chưa có đơn thuê nào. Bấm "+ Tạo Đơn Thuê Xe" để thêm khách.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><b>${o.id}</b><br><small style="color:var(--text-muted);">${o.createdAt || ''}</small></td>
      <td>
        <b>${o.customer}</b> <small style="color:var(--text-muted);">(${o.nationality || 'Quốc tế'})</small><br>
        <span style="color:var(--primary); font-size:12px;">📞 ${o.phone}</span>
      </td>
      <td>
        <span class="bike-id" style="font-size:11px;">${o.bikeId}</span> <b>${o.bikeName}</b><br>
        <small style="color:var(--text-muted);">Thuê ${o.days} ngày (từ ${o.startDate})</small>
      </td>
      <td>
        <b>${(o.grandTotal || 0).toLocaleString()} đ</b><br>
        <small style="color:var(--text-muted);">${o.deliveryFee > 0 ? '+100k ship' : 'Nhận tại shop'}</small>
      </td>
      <td><span style="color:var(--accent-gold); font-weight:800;">${(o.deposit || 0).toLocaleString()} đ</span></td>
      <td><small style="color:#cbd5e1;">${o.deliveryAddress || '197 Nguyễn Tất Thành'}</small></td>
      <td>
        <span class="badge ${o.status === 'Rented' ? 'rented' : 'available'}">
          ${o.status === 'Rented' ? '🔴 Đang Thuê' : '✅ Đã Hoàn Tất'}
        </span>
      </td>
      <td>
        ${o.status === 'Rented' ? `
          <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="completeOrder('${o.id}')">
            ✅ Trả Xe & Hoàn Cọc
          </button>
        ` : '<span style="color:var(--text-muted); font-size:12px;">Đã xong</span>'}
      </td>
    </tr>
  `).join('');
}

// 3. BIKE CRUD OPERATIONS
function openAddBikeModal() {
  document.getElementById('modalBikeTitle').innerText = '🚲 Thêm Xe Mới Vào Kho';
  document.getElementById('bikeForm').reset();
  document.getElementById('bikeIdInput').value = '';
  document.getElementById('bikeModal').classList.add('open');
}

function openEditBikeModal(bikeId) {
  const bike = currentFleet.find(b => b.id === bikeId);
  if (!bike) return;

  document.getElementById('modalBikeTitle').innerText = `✏️ Chỉnh Sửa Thông Tin Xe ${bike.id}`;
  document.getElementById('bikeIdInput').value = bike.id;
  document.getElementById('bikeCodeInput').value = bike.id;
  document.getElementById('bikeNameInput').value = bike.name;
  document.getElementById('bikeCatSelect').value = bike.category;
  document.getElementById('bikeDailyRateInput').value = bike.priceDaily;
  document.getElementById('bikeWeeklyRateInput').value = bike.priceWeekly;
  document.getElementById('bikeDepositInput').value = bike.deposit;
  document.getElementById('bikeGearInput').value = bike.gear || '';
  document.getElementById('bikeNotesInput').value = bike.notes || '';

  document.getElementById('bikeModal').classList.add('open');
}

function closeBikeModal() {
  document.getElementById('bikeModal').classList.remove('open');
}

async function handleSaveBike(e) {
  e.preventDefault();
  const id = document.getElementById('bikeIdInput').value;
  const code = document.getElementById('bikeCodeInput').value.trim();
  const name = document.getElementById('bikeNameInput').value.trim();
  const category = document.getElementById('bikeCatSelect').value;
  const priceDaily = document.getElementById('bikeDailyRateInput').value;
  const priceWeekly = document.getElementById('bikeWeeklyRateInput').value;
  const deposit = document.getElementById('bikeDepositInput').value;
  const gear = document.getElementById('bikeGearInput').value.trim();
  const notes = document.getElementById('bikeNotesInput').value.trim();

  const isEdit = !!id;
  const action = isEdit ? 'updateBike' : 'addBike';

  try {
    const res = await fetch(`/api/inventory?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: isEdit ? id : code,
        name,
        category,
        priceDaily,
        priceWeekly,
        deposit,
        gear,
        notes
      })
    });
    const data = await res.json();
    if (data.success) {
      closeBikeModal();
      loadDashboardData();
    } else {
      alert(data.error || 'Có lỗi xảy ra khi lưu xe');
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteBike(bikeId) {
  if (!confirm(`Bạn có chắc chắn muốn xóa xe ${bikeId} khỏi kho không?`)) return;
  try {
    const res = await fetch('/api/inventory?action=deleteBike', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bikeId })
    });
    const data = await res.json();
    if (data.success) loadDashboardData();
  } catch (err) {
    console.error(err);
  }
}

async function changeBikeStatus(bikeId, status) {
  try {
    const res = await fetch('/api/inventory?action=updateBike', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bikeId, status })
    });
    const data = await res.json();
    if (data.success) loadDashboardData();
  } catch (err) {
    console.error(err);
  }
}

// 4. ORDER CREATION & RETURN OPERATIONS
function openNewOrderModal() {
  document.getElementById('orderForm').reset();
  document.getElementById('orderStartDate').value = new Date().toISOString().slice(0, 10);
  populateBikeSelectOptions();
  onSelectBikeForOrder();
  document.getElementById('orderModal').classList.add('open');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open');
}

function populateBikeSelectOptions() {
  const select = document.getElementById('orderBikeSelect');
  if (!select) return;

  const availableBikes = currentFleet.filter(b => b.status === 'Available');
  if (availableBikes.length === 0) {
    select.innerHTML = `<option value="">-- Hết xe sẵn sàng (Vui lòng kiểm tra lại kho) --</option>`;
    return;
  }

  select.innerHTML = availableBikes.map(b => `
    <option value="${b.id}" data-daily="${b.priceDaily}" data-weekly="${b.priceWeekly}" data-deposit="${b.deposit}">
      [${b.id}] ${b.name} - ${(b.priceDaily || 0).toLocaleString()}đ/ngày (Cọc: ${(b.deposit || 0).toLocaleString()}đ)
    </option>
  `).join('');
}

function onSelectBikeForOrder() {
  const select = document.getElementById('orderBikeSelect');
  const selectedOpt = select.options[select.selectedIndex];
  if (!selectedOpt) return;

  const daily = parseInt(selectedOpt.getAttribute('data-daily') || 50000, 10);
  const weekly = parseInt(selectedOpt.getAttribute('data-weekly') || 30000, 10);
  const deposit = parseInt(selectedOpt.getAttribute('data-deposit') || 5000000, 10);
  const days = parseInt(document.getElementById('orderDaysInput').value || 1, 10);
  const isShip = document.getElementById('orderDeliveryCheck').checked;

  const rate = days >= 7 ? weekly : daily;
  const rental = rate * days;
  const shipFee = isShip ? 100000 : 0;
  const total = rental + shipFee;

  document.getElementById('orderSummaryRate').innerText = `${rate.toLocaleString()} đ/ngày`;
  document.getElementById('orderSummaryRental').innerText = `${rental.toLocaleString()} đ`;
  document.getElementById('orderSummaryDeposit').innerText = `${deposit.toLocaleString()} đ`;
  document.getElementById('orderSummaryTotal').innerText = `${total.toLocaleString()} đ`;
}

async function handleSaveOrder(e) {
  e.preventDefault();
  const customer = document.getElementById('orderCustomerInput').value.trim();
  const nationality = document.getElementById('orderNatInput').value.trim();
  const phone = document.getElementById('orderPhoneInput').value.trim();
  const bikeId = document.getElementById('orderBikeSelect').value;
  const days = document.getElementById('orderDaysInput').value;
  const startDate = document.getElementById('orderStartDate').value;
  const isDelivery = document.getElementById('orderDeliveryCheck').checked;
  const deliveryAddress = document.getElementById('orderAddressInput').value.trim();

  if (!bikeId) {
    alert('Vui lòng chọn xe để cho thuê!');
    return;
  }

  try {
    const res = await fetch('/api/inventory?action=createOrder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        nationality,
        phone,
        bikeId,
        days,
        startDate,
        isDelivery,
        deliveryAddress
      })
    });
    const data = await res.json();
    if (data.success) {
      closeOrderModal();
      loadDashboardData();
    } else {
      alert(data.error || 'Lỗi khi tạo đơn thuê xe');
    }
  } catch (err) {
    console.error(err);
  }
}

async function completeOrder(orderId) {
  if (!confirm(`Xác nhận khách đã trả xe cho đơn ${orderId} & Hoàn trả 100% tiền cọc?`)) return;
  try {
    const res = await fetch('/api/inventory?action=completeOrder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    const data = await res.json();
    if (data.success) loadDashboardData();
  } catch (err) {
    console.error(err);
  }
}

// 5. AI SETTINGS
async function toggleAiAutoPilot() {
  const check = document.getElementById('aiAutoPilotToggle').checked;
  try {
    await fetch('/api/inventory?action=toggleAi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiAutoPilot: check })
    });
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setInterval(() => {
    if (sessionStorage.getItem(AUTH_KEY)) loadDashboardData();
  }, 10000);
});
