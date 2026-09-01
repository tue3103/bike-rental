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
      renderPaymentSettings(data.settings);
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

let currentModalImages = [];

const DEFAULT_BIKE_IMAGES = {
  "Mountain Bike (MTB)": "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=600&auto=format&fit=crop&q=80",
  "Touring Road Bike": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80",
  "City Bike (Xe nữ)": "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=600&auto=format&fit=crop&q=80",
  "Premium Carbon MTB": "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600&auto=format&fit=crop&q=80",
  "E-Bike (Trợ lực điện)": "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&auto=format&fit=crop&q=80"
};

// Store active image index per bike card
const bikeCardImgIndexes = {};

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
    
    // Normalize images array
    const imgs = (b.images && Array.isArray(b.images) && b.images.length > 0) 
      ? b.images 
      : (b.image ? [b.image] : [DEFAULT_BIKE_IMAGES[b.category] || DEFAULT_BIKE_IMAGES["Mountain Bike (MTB)"]]);

    const activeIdx = bikeCardImgIndexes[b.id] || 0;
    const currentImgUrl = imgs[activeIdx] || imgs[0];
    const totalImgs = imgs.length;

    return `
      <div class="bike-card" id="card_${b.id}">
        <div>
          <!-- BIKE MULTI-IMAGE CAROUSEL WRAPPER -->
          <div class="bike-img-wrap">
            <img src="${currentImgUrl}" alt="${b.name}" id="img_${b.id}" class="bike-img" loading="lazy">
            ${totalImgs > 1 ? `
              <button class="bike-nav-prev" onclick="slideBikeCardImage('${b.id}', -1)" title="Ảnh trước">‹</button>
              <button class="bike-nav-next" onclick="slideBikeCardImage('${b.id}', 1)" title="Ảnh tiếp theo">›</button>
              <div class="bike-photo-count" id="count_${b.id}">📷 ${activeIdx + 1}/${totalImgs}</div>
            ` : ''}
          </div>

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

// Slide through bike images on card
function slideBikeCardImage(bikeId, delta) {
  const bike = currentFleet.find(b => b.id === bikeId);
  if (!bike) return;

  const imgs = (bike.images && Array.isArray(bike.images) && bike.images.length > 0) 
    ? bike.images 
    : (bike.image ? [bike.image] : []);

  if (imgs.length <= 1) return;

  let cur = bikeCardImgIndexes[bikeId] || 0;
  cur = (cur + delta + imgs.length) % imgs.length;
  bikeCardImgIndexes[bikeId] = cur;

  const imgEl = document.getElementById(`img_${bikeId}`);
  const countEl = document.getElementById(`count_${bikeId}`);
  if (imgEl) imgEl.src = imgs[cur];
  if (countEl) countEl.innerText = `📷 ${cur + 1}/${imgs.length}`;
}

// ==============================================================================
// MULTI-IMAGE GALLERY MODAL HANDLERS
// ==============================================================================
function addBikeImageFromInput() {
  const input = document.getElementById('newBikeImageUrlInput');
  const url = input.value.trim();
  if (!url) return;

  currentModalImages.push(url);
  input.value = '';
  renderModalGallery();
}

function removeBikeImageAtIndex(idx) {
  currentModalImages.splice(idx, 1);
  renderModalGallery();
}

function setCoverBikeImage(idx) {
  if (idx <= 0 || idx >= currentModalImages.length) return;
  const item = currentModalImages.splice(idx, 1)[0];
  currentModalImages.unshift(item);
  renderModalGallery();
}

function renderModalGallery() {
  const container = document.getElementById('bikeMultiImgGallery');
  const badge = document.getElementById('bikeImageCountBadge');
  if (badge) badge.innerText = `${currentModalImages.length} ảnh`;

  if (!container) return;

  if (currentModalImages.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">Chưa có ảnh nào. Dán link ảnh ở trên rồi bấm "➕ Thêm Ảnh".</div>`;
    return;
  }

  container.innerHTML = currentModalImages.map((src, idx) => `
    <div class="gallery-thumb-item ${idx === 0 ? 'is-cover' : ''}" onclick="setCoverBikeImage(${idx})" title="${idx === 0 ? 'Ảnh đại diện (Cover)' : 'Bấm để đặt làm ảnh đại diện'}">
      <img src="${src}" class="gallery-thumb-img" alt="Ảnh ${idx + 1}" onerror="this.src='https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=200'">
      ${idx === 0 ? '<span class="cover-star-badge">⭐ Đại diện</span>' : ''}
      <button type="button" class="btn-del-thumb" onclick="event.stopPropagation(); removeBikeImageAtIndex(${idx})" title="Xóa ảnh này">✕</button>
    </div>
  `).join('');
}

function openAddBikeModal() {
  document.getElementById('modalBikeTitle').innerText = '🚲 Thêm Xe Mới Vào Kho';
  document.getElementById('bikeForm').reset();
  document.getElementById('bikeIdInput').value = '';
  currentModalImages = [];
  renderModalGallery();
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

  // Populate multiple images
  if (bike.images && Array.isArray(bike.images) && bike.images.length > 0) {
    currentModalImages = [...bike.images];
  } else if (bike.image) {
    currentModalImages = [bike.image];
  } else {
    currentModalImages = [];
  }

  renderModalGallery();
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
  
  const images = [...currentModalImages];
  const image = images[0] || '';

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
        notes,
        image,
        images
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

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTbody');
  const pendingTbody = document.getElementById('pendingOrdersTbody');
  const pendingPanel = document.getElementById('pendingPanel');
  const pendingBadge = document.getElementById('pendingBadgeCount');

  const pendingList = (orders || []).filter(o => o.status === 'Pending');
  const activeOrders = (orders || []).filter(o => o.status !== 'Pending');

  // Render Pending Panel
  if (pendingPanel && pendingBadge) {
    if (pendingList.length > 0) {
      pendingPanel.style.display = 'block';
      pendingBadge.innerText = `${pendingList.length} đơn chờ duyệt`;
      if (pendingTbody) {
        pendingTbody.innerHTML = pendingList.map(o => `
          <tr style="background:rgba(245,158,11,0.06);">
            <td>
              <b style="color:var(--accent-gold); font-family:monospace;">${o.id}</b>
              <div style="font-size:11px; color:var(--text-muted);">${o.createdAt || ''}</div>
            </td>
            <td>
              <b>${o.customer}</b>
              <div style="font-size:12px; color:var(--text-muted);">${o.phone ? '📞 ' + o.phone : 'Chưa có SĐT'} ${o.nationality ? '• ' + o.nationality : ''}</div>
            </td>
            <td>
              <span class="badge badge-info">${o.bikeId || 'N/A'}</span>
              <div style="font-size:12px; font-weight:600;">${o.bikeName || 'Xe địa hình'}</div>
            </td>
            <td>
              <b>${o.days} ngày</b>
              <div style="font-size:11px; color:var(--text-muted);">Bắt đầu: ${o.startDate || 'Hôm nay'}</div>
            </td>
            <td>
              <div style="font-size:12px;">${o.deliveryAddress || '197 Nguyễn Tất Thành'}</div>
            </td>
            <td>
              <b style="color:var(--primary);">${(o.grandTotal || o.rentalTotal || 0).toLocaleString()} đ</b>
            </td>
            <td>
              <b style="color:var(--accent-gold);">${(o.deposit || 0).toLocaleString()} đ</b>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; font-weight:700;" onclick="approveOrder('${o.id}')" title="Xác nhận cho thuê & Giao xe">
                  ✅ Duyệt & Cho Thuê
                </button>
                <button class="btn btn-danger" style="padding:6px 10px; font-size:12px;" onclick="cancelOrder('${o.id}')" title="Hủy yêu cầu">
                  ✕ Từ chối
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    } else {
      pendingPanel.style.display = 'none';
    }
  }

  // Render Active Orders Table
  if (tbody) {
    if (activeOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">Chưa có đơn thuê nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeOrders.map(o => {
      const isRented = o.status === 'Rented';
      const isCompleted = o.status === 'Completed';
      const isCancelled = o.status === 'Cancelled';
      const statusBadge = isRented 
        ? `<span class="badge badge-danger">🔴 Đang thuê</span>`
        : (isCompleted 
            ? `<span class="badge badge-success">🟢 Đã trả xe</span>` 
            : (isCancelled ? `<span class="badge badge-secondary">⚪ Đã hủy</span>` : `<span class="badge badge-warning">${o.status}</span>`));

      const slipUrl = `${window.location.origin}/phieu.html?id=${o.id}`;

      return `
        <tr class="order-row" data-search="${(o.customer || '') + ' ' + (o.phone || '') + ' ' + (o.id || '') + ' ' + (o.bikeId || '')}" data-status="${o.status}">
          <td>
            <b style="font-family:monospace;">${o.id}</b>
            <div style="font-size:11px; color:var(--text-muted);">${o.createdAt || ''}</div>
          </td>
          <td>
            <b>${o.customer}</b>
            <div style="font-size:12px; color:var(--text-muted);">${o.phone ? '📞 ' + o.phone : ''} ${o.nationality ? '• ' + o.nationality : ''}</div>
          </td>
          <td>
            <span class="badge badge-info">${o.bikeId || ''}</span>
            <div style="font-size:12px;">${o.bikeName || ''} (${o.days} ngày)</div>
          </td>
          <td>
            <b>${(o.grandTotal || o.rentalTotal || 0).toLocaleString()} đ</b>
          </td>
          <td>
            <b style="color:var(--accent-gold);">${(o.deposit || 0).toLocaleString()} đ</b>
          </td>
          <td>
            <div style="font-size:12px;">${o.deliveryAddress || o.hotelAddress || 'Tại shop'}</div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              <a href="/phieu.html?id=${o.id}" target="_blank" class="btn btn-secondary" style="padding:4px 8px; font-size:11px; text-decoration:none;" title="Xem & In Phiếu Giao Xe Điện Tử">
                📱 Phiếu
              </a>
              <button type="button" class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="copyOrderSlipLink('${o.id}')" title="Sao chép link phiếu gửi khách">
                🔗 Copy
              </button>
              ${isRented ? `
                <button class="btn btn-success" style="padding:4px 8px; font-size:11px;" onclick="completeOrder('${o.id}')">
                  🔄 Trả Xe
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function copyOrderSlipLink(orderId) {
  const url = `${window.location.origin}/phieu.html?id=${orderId}`;
  navigator.clipboard.writeText(url);
  alert(`✅ Đã sao chép link Phiếu Giao Xe Điện Tử cho đơn ${orderId}!\nLink: ${url}\nBạn có thể dán gửi cho khách qua Zalo/WhatsApp.`);
}

function filterOrdersTable() {
  const query = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'ALL';

  const rows = document.querySelectorAll('.order-row');
  rows.forEach(r => {
    const searchData = (r.getAttribute('data-search') || '').toLowerCase();
    const status = r.getAttribute('data-status') || '';

    const matchQuery = !query || searchData.includes(query);
    const matchStatus = statusFilter === 'ALL' || status === statusFilter;

    if (matchQuery && matchStatus) {
      r.style.display = '';
    } else {
      r.style.display = 'none';
    }
  });
}

async function approveOrder(orderId) {
  if (!confirm(`Xác nhận duyệt cho thuê xe cho đơn ${orderId}? Xe sẽ chuyển sang trạng thái [Đang thuê].`)) return;
  try {
    const res = await fetch('/api/inventory?action=approveOrder', {
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

async function cancelOrder(orderId) {
  if (!confirm(`Bạn có chắc muốn từ chối / hủy đơn ${orderId} này?`)) return;
  try {
    const res = await fetch('/api/inventory?action=cancelOrder', {
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

// 5. PAYMENT & STORE SETTINGS
function renderPaymentSettings(settings) {
  if (!settings) return;
  const bankSelect = document.getElementById('settingBankSelect');
  const accNo = document.getElementById('settingAccountNo');
  const accName = document.getElementById('settingAccountName');
  const intl = document.getElementById('settingIntlPayment');
  const policy = document.getElementById('settingPaymentPolicy');

  if (bankSelect && settings.bankName) {
    for (let opt of bankSelect.options) {
      if (opt.value.includes(settings.bankName) || opt.text.includes(settings.bankName)) {
        opt.selected = true;
        break;
      }
    }
  }
  if (accNo && settings.accountNo) accNo.value = settings.accountNo;
  if (accName && settings.accountName) accName.value = settings.accountName;
  if (intl && settings.intlPaymentInfo) intl.value = settings.intlPaymentInfo;
  if (policy && settings.advancePaymentPolicy) policy.value = settings.advancePaymentPolicy;

  updateQrPreview();
}

function updateQrPreview() {
  const bankVal = document.getElementById('settingBankSelect')?.value || 'MBBank|970422';
  const [bankName, bankBin] = bankVal.split('|');
  const accNo = document.getElementById('settingAccountNo')?.value.trim();
  const accName = document.getElementById('settingAccountName')?.value.trim();

  const img = document.getElementById('qrPreviewImg');
  const title = document.getElementById('qrPreviewTitle');
  const desc = document.getElementById('qrPreviewDesc');

  if (accNo && accName && img) {
    const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accNo}-compact2.png?amount=200000&addInfo=ORD-DEMO&accountName=${encodeURIComponent(accName)}`;
    img.src = qrUrl;
    img.style.display = 'block';
    if (title) title.innerText = `Mã VietQR: ${bankName} • ${accNo}`;
    if (desc) desc.innerText = `Chủ TK: ${accName}. Khi khách đặt đơn, hệ thống tự động chèn số tiền và mã đơn của khách vào mã QR này.`;
  }
}

async function handleSavePaymentSettings(e) {
  if (e) e.preventDefault();
  const bankVal = document.getElementById('settingBankSelect')?.value || 'MBBank|970422';
  const [bankName, bankBin] = bankVal.split('|');
  const accountNo = document.getElementById('settingAccountNo')?.value.trim();
  const accountName = document.getElementById('settingAccountName')?.value.trim();
  const intlPaymentInfo = document.getElementById('settingIntlPayment')?.value.trim();
  const advancePaymentPolicy = document.getElementById('settingPaymentPolicy')?.value.trim();

  try {
    const res = await fetch('/api/inventory?action=saveSettings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName,
        bankBin,
        accountNo,
        accountName,
        intlPaymentInfo,
        advancePaymentPolicy
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Đã lưu cấu hình thanh toán & ngân hàng thành công vào Cloudflare D1!');
      loadDashboardData();
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể lưu cài đặt'));
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối khi lưu cài đặt');
  }
}

// 6. AI SETTINGS
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
