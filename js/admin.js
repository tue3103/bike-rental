// ==============================================================================
// SMILEX BIKE - ADMIN PORTAL CONTROLLER
// ==============================================================================

async function fetchAdminData() {
  try {
    const res = await fetch('/api/inventory?action=get');
    const data = await res.json();
    renderStats(data.inventory, data.orders);
    renderOrders(data.orders);
  } catch (err) {
    console.error('Fetch admin data error:', err);
  }
}

function renderStats(inv, orders) {
  const available = inv.totalBikes - inv.rentedBikes;
  document.getElementById('statTotalBikes').innerText = inv.totalBikes;
  document.getElementById('statAvailableBikes').innerText = available;
  document.getElementById('statRentedBikes').innerText = inv.rentedBikes;

  const totalDeposit = orders.filter(o => o.status === 'Rented' || o.status === 'Active')
                             .reduce((sum, o) => sum + (o.deposit || 0), 0);
  document.getElementById('statTotalDeposit').innerText = totalDeposit.toLocaleString() + ' đ';

  const aiToggle = document.getElementById('aiAutoPilotToggle');
  if (aiToggle) aiToggle.checked = !!inv.aiAutoPilot;
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTbody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Chưa có đơn đặt xe nào</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><b>${o.id}</b><br><small style="color:var(--text-muted);">${o.date || ''}</small></td>
      <td><b>${o.customer}</b><br><small style="color:var(--primary);">${o.phone}</small></td>
      <td><b>${o.bikes} xe</b> (${o.days} ngày)</td>
      <td>${(o.total || 0).toLocaleString()} đ</td>
      <td><span style="color:var(--accent-gold); font-weight:700;">${(o.deposit || 0).toLocaleString()} đ</span></td>
      <td><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></td>
      <td>
        ${o.status !== 'Completed' ? `<button class="btn-action" onclick="setOrderStatus('${o.id}', 'Completed')">✅ Đã Trả & Hoàn Cọc</button>` : '<span style="color:var(--text-muted); font-size:12px;">Đã xong</span>'}
      </td>
    </tr>
  `).join('');
}

async function setOrderStatus(orderId, status) {
  if (!confirm(`Xác nhận chuyển trạng thái đơn ${orderId} sang "${status}"?`)) return;
  try {
    const res = await fetch('/api/inventory?action=updateOrderStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status })
    });
    const data = await res.json();
    if (data.success) {
      renderStats(data.inventory, data.orders);
      renderOrders(data.orders);
    }
  } catch (e) {
    console.error(e);
  }
}

async function updateBikeCount(delta) {
  const totalEl = document.getElementById('statTotalBikes');
  let count = parseInt(totalEl.innerText, 10) + delta;
  if (count < 1) count = 1;

  try {
    const res = await fetch('/api/inventory?action=updateInventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalBikes: count })
    });
    const data = await res.json();
    if (data.success) {
      fetchAdminData();
    }
  } catch (e) {
    console.error(e);
  }
}

async function toggleAiAutoPilot() {
  const check = document.getElementById('aiAutoPilotToggle').checked;
  try {
    await fetch('/api/inventory?action=updateInventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiAutoPilot: check })
    });
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAdminData();
  setInterval(fetchAdminData, 6000);
});
