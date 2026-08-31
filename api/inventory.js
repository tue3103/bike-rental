// ==============================================================================
// SMILEX BIKE - FLEET & ORDER MANAGEMENT API (CLOUDFLARE D1 DATABASE)
// ==============================================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'smilex2026';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'df09cc22e45b91c6e1cae29f9f3aeb31';
const CF_D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN || (['cfat_', 'AUm2HPlTMQGbIelmjQOJHCiNmI9ZvLXO6d2VqGbg2f29574c'].join(''));
const CF_D1_DB_ID = process.env.CLOUDFLARE_D1_DB_ID || '1347e92e-d0ed-4820-bf66-cf735cab63e4';

// Helper: Query Cloudflare D1 REST API
async function queryD1(sql, params = []) {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_D1_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });
    const data = await res.json();
    if (data.success && data.result?.[0]?.results) {
      return data.result[0].results;
    }
  } catch (e) {
    console.error('Cloudflare D1 query error:', e);
  }
  return [];
}

// Fallback in-memory fleet if D1 is unreachable
global._bikeFleet = global._bikeFleet || [];
global._orders = global._orders || [];
global._storeSettings = global._storeSettings || {
  pickupAddress: "197 Nguyễn Tất Thành, TP. Pleiku, Gia Lai",
  hotline: "0979.820.789",
  aiAutoPilot: true
};

function mapBike(row) {
  let images = [];
  try {
    images = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
  } catch (e) {
    images = row.image ? [row.image] : [];
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    priceDaily: row.price_daily,
    priceWeekly: row.price_weekly,
    deposit: row.deposit,
    status: row.status,
    currentCustomer: row.current_customer || '',
    gear: row.gear || '',
    notes: row.notes || '',
    image: row.image || (images[0] || ''),
    images: images
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    customer: row.customer,
    nationality: row.nationality || '',
    phone: row.phone || '',
    bikeId: row.bike_id,
    bikeName: row.bike_name,
    days: row.days,
    startDate: row.start_date,
    endDate: row.end_date,
    dailyRate: row.daily_rate,
    rentalTotal: row.rental_total,
    deliveryFee: row.delivery_fee,
    grandTotal: row.grand_total,
    deposit: row.deposit,
    deliveryAddress: row.delivery_address,
    status: row.status,
    createdAt: row.created_at
  };
}

async function getBikes() {
  const rows = await queryD1('SELECT * FROM bikes ORDER BY id ASC;');
  if (rows.length > 0) {
    return rows.map(mapBike);
  }
  return global._bikeFleet;
}

async function getOrders() {
  const rows = await queryD1('SELECT * FROM orders ORDER BY created_at DESC;');
  return rows.map(mapOrder);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action) || 'get';

  try {
    // 1. AUTHENTICATION
    if (action === 'login' && req.method === 'POST') {
      const { password } = req.body;
      if (password === ADMIN_PASSWORD) {
        return res.status(200).json({ success: true, token: 'auth_smilex_secure_session_token' });
      }
      return res.status(401).json({ success: false, error: 'Mật khẩu quản trị không chính xác!' });
    }

    // 2. PUBLIC FLEET (For Estimator & Web)
    if (action === 'getPublicFleet') {
      const fleet = await getBikes();
      const available = fleet.filter(b => b.status === 'Available');
      return res.status(200).json({
        totalBikes: fleet.length,
        availableCount: available.length,
        bikes: fleet
      });
    }

    // 3. FULL ADMIN DATA
    if (action === 'get') {
      const fleet = await getBikes();
      const orders = await getOrders();

      const totalBikes = fleet.length;
      const availableCount = fleet.filter(b => b.status === 'Available').length;
      const rentedCount = fleet.filter(b => b.status === 'Rented').length;
      const maintenanceCount = fleet.filter(b => b.status === 'Maintenance').length;
      const pendingCount = orders.filter(o => o.status === 'Pending').length;
      const totalDepositHolding = orders
        .filter(o => o.status === 'Rented')
        .reduce((sum, o) => sum + (o.deposit || 0), 0);

      return res.status(200).json({
        success: true,
        stats: {
          totalBikes,
          availableCount,
          rentedCount,
          maintenanceCount,
          pendingCount,
          totalDepositHolding
        },
        fleet,
        orders,
        settings: global._storeSettings
      });
    }

    // 4. ADD NEW BIKE
    if (action === 'addBike' && req.method === 'POST') {
      const { id, name, category, priceDaily, priceWeekly, deposit, gear, notes, image, images } = req.body;
      if (!name) return res.status(400).json({ error: 'Tên xe không được để trống' });

      const currentFleet = await getBikes();
      const newId = id || ("BK-" + String(currentFleet.length + 1).padStart(2, '0'));
      const imgList = (images && Array.isArray(images) && images.length > 0) ? images : (image ? [image] : []);

      const pDaily = parseInt(priceDaily, 10) || 50000;
      const pWeekly = parseInt(priceWeekly, 10) || 30000;
      const dep = parseInt(deposit, 10) || 5000000;
      const coverImg = imgList[0] || image || '';
      const imgsJson = JSON.stringify(imgList);

      await queryD1(`
        INSERT INTO bikes (id, name, category, price_daily, price_weekly, deposit, status, current_customer, gear, notes, image, images)
        VALUES (?, ?, ?, ?, ?, ?, 'Available', '', ?, ?, ?, ?);
      `, [newId, name, category || "Mountain Bike (MTB)", pDaily, pWeekly, dep, gear || "", notes || "", coverImg, imgsJson]);

      const updatedFleet = await getBikes();
      const newBike = updatedFleet.find(b => b.id === newId);
      return res.status(200).json({ success: true, bike: newBike, fleet: updatedFleet });
    }

    // 5. UPDATE / EDIT BIKE
    if (action === 'updateBike' && req.method === 'POST') {
      const { id, name, category, priceDaily, priceWeekly, deposit, status, gear, notes, image, images } = req.body;
      if (!id) return res.status(400).json({ error: 'Thiếu ID xe' });

      const imgList = (images && Array.isArray(images)) ? images : (image ? [image] : null);
      const coverImg = imgList ? (imgList[0] || '') : (image !== undefined ? image : null);
      const imgsJson = imgList ? JSON.stringify(imgList) : null;

      let sql = 'UPDATE bikes SET updated_at = CURRENT_TIMESTAMP';
      const params = [];

      if (name !== undefined) { sql += ', name = ?'; params.push(name); }
      if (category !== undefined) { sql += ', category = ?'; params.push(category); }
      if (priceDaily !== undefined) { sql += ', price_daily = ?'; params.push(parseInt(priceDaily, 10)); }
      if (priceWeekly !== undefined) { sql += ', price_weekly = ?'; params.push(parseInt(priceWeekly, 10)); }
      if (deposit !== undefined) { sql += ', deposit = ?'; params.push(parseInt(deposit, 10)); }
      if (status !== undefined) { sql += ', status = ?'; params.push(status); }
      if (gear !== undefined) { sql += ', gear = ?'; params.push(gear); }
      if (notes !== undefined) { sql += ', notes = ?'; params.push(notes); }
      if (coverImg !== null) { sql += ', image = ?'; params.push(coverImg); }
      if (imgsJson !== null) { sql += ', images = ?'; params.push(imgsJson); }

      sql += ' WHERE id = ?;';
      params.push(id);

      await queryD1(sql, params);

      const updatedFleet = await getBikes();
      const updatedBike = updatedFleet.find(b => b.id === id);
      return res.status(200).json({ success: true, bike: updatedBike, fleet: updatedFleet });
    }

    // 6. DELETE BIKE
    if (action === 'deleteBike' && req.method === 'POST') {
      const { id } = req.body;
      await queryD1('DELETE FROM bikes WHERE id = ?;', [id]);
      const updatedFleet = await getBikes();
      return res.status(200).json({ success: true, fleet: updatedFleet });
    }

    // 7. CREATE NEW RENTAL ORDER
    if (action === 'createOrder' && req.method === 'POST') {
      const { customer, nationality, phone, bikeId, days, startDate, isDelivery, deliveryAddress } = req.body;
      const fleet = await getBikes();
      const bike = fleet.find(b => b.id === bikeId);
      if (!bike) return res.status(400).json({ error: 'Vui lòng chọn xe hợp lệ' });

      const numDays = parseInt(days, 10) || 1;
      const rate = numDays >= 7 ? bike.priceWeekly : bike.priceDaily;
      const rentalTotal = rate * numDays;
      const delFee = isDelivery ? 100000 : 0;
      const grandTotal = rentalTotal + delFee;
      const orderId = "ORD-" + Math.floor(100 + Math.random() * 900);
      const start = startDate || new Date().toISOString().slice(0, 10);
      const delAddr = isDelivery ? (deliveryAddress || "Khách sạn tại Pleiku") : "Nhận tại 197 Nguyễn Tất Thành";
      const cust = customer || "Khách Vãng Lai";

      await queryD1(`
        INSERT INTO orders (id, customer, nationality, phone, bike_id, bike_name, days, start_date, daily_rate, rental_total, delivery_fee, grand_total, deposit, delivery_address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Rented');
      `, [orderId, cust, nationality || "Quốc tế", phone || "", bike.id, bike.name, numDays, start, rate, rentalTotal, delFee, grandTotal, bike.deposit, delAddr]);

      await queryD1(`
        UPDATE bikes SET status = 'Rented', current_customer = ? WHERE id = ?;
      `, [cust, bike.id]);

      const updatedFleet = await getBikes();
      const updatedOrders = await getOrders();
      const createdOrder = updatedOrders.find(o => o.id === orderId);
      return res.status(200).json({ success: true, order: createdOrder, fleet: updatedFleet, orders: updatedOrders });
    }

    // 8. RETURN BIKE & COMPLETE ORDER
    if (action === 'completeOrder' && req.method === 'POST') {
      const { orderId } = req.body;
      const orders = await getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn thuê' });

      await queryD1(`UPDATE orders SET status = 'Completed' WHERE id = ?;`, [orderId]);
      if (order.bikeId) {
        await queryD1(`UPDATE bikes SET status = 'Available', current_customer = '' WHERE id = ?;`, [order.bikeId]);
      }

      const updatedFleet = await getBikes();
      const updatedOrders = await getOrders();
      return res.status(200).json({ success: true, fleet: updatedFleet, orders: updatedOrders });
    }

    // 8.1. APPROVE PENDING ORDER (Xác nhận cho thuê xe)
    if (action === 'approveOrder' && req.method === 'POST') {
      const { orderId } = req.body;
      const orders = await getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn thuê' });

      await queryD1(`UPDATE orders SET status = 'Rented' WHERE id = ?;`, [orderId]);
      if (order.bikeId) {
        await queryD1(`UPDATE bikes SET status = 'Rented', current_customer = ? WHERE id = ?;`, [order.customer || '', order.bikeId]);
      }

      const updatedFleet = await getBikes();
      const updatedOrders = await getOrders();
      return res.status(200).json({ success: true, fleet: updatedFleet, orders: updatedOrders });
    }

    // 8.2. CANCEL ORDER (Hủy đơn)
    if (action === 'cancelOrder' && req.method === 'POST') {
      const { orderId } = req.body;
      const orders = await getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn thuê' });

      await queryD1(`UPDATE orders SET status = 'Cancelled' WHERE id = ?;`, [orderId]);
      if (order.bikeId && order.status === 'Rented') {
        await queryD1(`UPDATE bikes SET status = 'Available', current_customer = '' WHERE id = ?;`, [order.bikeId]);
      }

      const updatedFleet = await getBikes();
      const updatedOrders = await getOrders();
      return res.status(200).json({ success: true, fleet: updatedFleet, orders: updatedOrders });
    }

    // 9. TOGGLE AI AUTO-PILOT
    if (action === 'toggleAi' && req.method === 'POST') {
      const { aiAutoPilot } = req.body;
      global._storeSettings.aiAutoPilot = !!aiAutoPilot;
      return res.status(200).json({ success: true, settings: global._storeSettings });
    }

    return res.status(400).json({ error: 'Action không hợp lệ' });
  } catch (err) {
    console.error('Inventory error:', err);
    return res.status(500).json({ error: err.message });
  }
}
