// ==============================================================================
// SMILEX BIKE - FLEET & ORDER MANAGEMENT API (SUPABASE POSTGRESQL INTEGRATION)
// ==============================================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'smilex2026';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vkwesmhtexlxbvesdgan.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrd2VzbWh0ZXhseGJ2ZXNkZ2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE4NDI1MSwiZXhwIjoyMTAzNzYwMjUxfQ.JF4MQxJr_CqMSyaEC-Htk63eHrz3XGA9yQLJgCWP0f8';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Fallback in-memory fleet if Supabase is initializing
global._bikeFleet = global._bikeFleet || [
  {
    id: "BK-01",
    name: "Giant ATX 830 Sport",
    category: "Mountain Bike (MTB)",
    priceDaily: 50000,
    priceWeekly: 30000,
    deposit: 5000000,
    status: "Rented",
    currentCustomer: "David Miller (UK)",
    gear: "Shimano 24-speed, Phanh đĩa dầu",
    notes: "Xe mới 98%, lốp chống đinh",
    image: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "BK-02",
    name: "Trek Marlin 5 Highland",
    category: "Mountain Bike (MTB)",
    priceDaily: 50000,
    priceWeekly: 30000,
    deposit: 5000000,
    status: "Available",
    currentCustomer: "",
    gear: "Shimano Altus 2x8, Phuộc nhún dầu",
    notes: "Đã gắn giá đỡ bình nước + túi điện thoại",
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80"]
  }
];

global._orders = global._orders || [];
global._storeSettings = global._storeSettings || {
  pickupAddress: "197 Nguyễn Tất Thành, TP. Pleiku, Gia Lai",
  hotline: "0979.820.789",
  aiAutoPilot: true
};

// Helper: Normalize Supabase row to JS object
function mapBikeFromDb(row) {
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
    image: row.image || '',
    images: Array.isArray(row.images) ? row.images : (row.image ? [row.image] : [])
  };
}

function mapOrderFromDb(row) {
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

async function fetchBikesFromDb() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bikes?select=*&order=id.asc`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapBikeFromDb);
      }
    }
  } catch (e) {
    console.error('Fetch Supabase bikes error:', e);
  }
  return global._bikeFleet;
}

async function fetchOrdersFromDb() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(mapOrderFromDb);
      }
    }
  } catch (e) {
    console.error('Fetch Supabase orders error:', e);
  }
  return global._orders;
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

    // 2. PUBLIC FLEET
    if (action === 'getPublicFleet') {
      const fleet = await fetchBikesFromDb();
      const available = fleet.filter(b => b.status === 'Available');
      return res.status(200).json({
        totalBikes: fleet.length,
        availableCount: available.length,
        bikes: fleet
      });
    }

    // 3. FULL ADMIN DATA
    if (action === 'get') {
      const fleet = await fetchBikesFromDb();
      const orders = await fetchOrdersFromDb();

      const totalBikes = fleet.length;
      const availableCount = fleet.filter(b => b.status === 'Available').length;
      const rentedCount = fleet.filter(b => b.status === 'Rented').length;
      const maintenanceCount = fleet.filter(b => b.status === 'Maintenance').length;
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

      const currentFleet = await fetchBikesFromDb();
      const newId = id || ("BK-" + String(currentFleet.length + 1).padStart(2, '0'));
      const imgList = (images && Array.isArray(images) && images.length > 0) ? images : (image ? [image] : []);

      const dbPayload = {
        id: newId,
        name,
        category: category || "Mountain Bike (MTB)",
        price_daily: parseInt(priceDaily, 10) || 50000,
        price_weekly: parseInt(priceWeekly, 10) || 30000,
        deposit: parseInt(deposit, 10) || 5000000,
        status: "Available",
        current_customer: "",
        gear: gear || "",
        notes: notes || "",
        image: imgList[0] || image || "",
        images: imgList
      };

      await fetch(`${SUPABASE_URL}/rest/v1/bikes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(dbPayload)
      });

      const updatedFleet = await fetchBikesFromDb();
      return res.status(200).json({ success: true, bike: mapBikeFromDb(dbPayload), fleet: updatedFleet });
    }

    // 5. UPDATE / EDIT BIKE
    if (action === 'updateBike' && req.method === 'POST') {
      const { id, name, category, priceDaily, priceWeekly, deposit, status, gear, notes, image, images } = req.body;
      if (!id) return res.status(400).json({ error: 'Thiếu ID xe' });

      const dbUpdate = {};
      if (name !== undefined) dbUpdate.name = name;
      if (category !== undefined) dbUpdate.category = category;
      if (priceDaily !== undefined) dbUpdate.price_daily = parseInt(priceDaily, 10);
      if (priceWeekly !== undefined) dbUpdate.price_weekly = parseInt(priceWeekly, 10);
      if (deposit !== undefined) dbUpdate.deposit = parseInt(deposit, 10);
      if (status !== undefined) dbUpdate.status = status;
      if (gear !== undefined) dbUpdate.gear = gear;
      if (notes !== undefined) dbUpdate.notes = notes;
      if (images !== undefined && Array.isArray(images)) {
        dbUpdate.images = images;
        dbUpdate.image = images[0] || '';
      } else if (image !== undefined) {
        dbUpdate.image = image;
        dbUpdate.images = image ? [image] : [];
      }

      await fetch(`${SUPABASE_URL}/rest/v1/bikes?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(dbUpdate)
      });

      const updatedFleet = await fetchBikesFromDb();
      const updatedBike = updatedFleet.find(b => b.id === id);
      return res.status(200).json({ success: true, bike: updatedBike, fleet: updatedFleet });
    }

    // 6. DELETE BIKE
    if (action === 'deleteBike' && req.method === 'POST') {
      const { id } = req.body;
      await fetch(`${SUPABASE_URL}/rest/v1/bikes?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });
      const updatedFleet = await fetchBikesFromDb();
      return res.status(200).json({ success: true, fleet: updatedFleet });
    }

    // 7. CREATE NEW RENTAL ORDER
    if (action === 'createOrder' && req.method === 'POST') {
      const { customer, nationality, phone, bikeId, days, startDate, isDelivery, deliveryAddress } = req.body;
      const fleet = await fetchBikesFromDb();
      const bike = fleet.find(b => b.id === bikeId);
      if (!bike) return res.status(400).json({ error: 'Vui lòng chọn xe hợp lệ' });

      const numDays = parseInt(days, 10) || 1;
      const rate = numDays >= 7 ? bike.priceWeekly : bike.priceDaily;
      const rentalTotal = rate * numDays;
      const delFee = isDelivery ? 100000 : 0;
      const grandTotal = rentalTotal + delFee;
      const orderId = "ORD-" + Math.floor(100 + Math.random() * 900);

      const orderPayload = {
        id: orderId,
        customer: customer || "Khách Vãng Lai",
        nationality: nationality || "Quốc tế",
        phone: phone || "",
        bike_id: bike.id,
        bike_name: bike.name,
        days: numDays,
        start_date: startDate || new Date().toISOString().slice(0, 10),
        daily_rate: rate,
        rental_total: rentalTotal,
        delivery_fee: delFee,
        grand_total: grandTotal,
        deposit: bike.deposit,
        delivery_address: isDelivery ? (deliveryAddress || "Khách sạn tại Pleiku") : "Nhận tại 197 Nguyễn Tất Thành",
        status: "Rented"
      };

      await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload)
      });

      // Update bike status to Rented in Supabase
      await fetch(`${SUPABASE_URL}/rest/v1/bikes?id=eq.${bike.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'Rented', current_customer: orderPayload.customer })
      });

      const updatedFleet = await fetchBikesFromDb();
      const updatedOrders = await fetchOrdersFromDb();
      return res.status(200).json({ success: true, order: mapOrderFromDb(orderPayload), fleet: updatedFleet, orders: updatedOrders });
    }

    // 8. RETURN BIKE & REFUND DEPOSIT
    if (action === 'completeOrder' && req.method === 'POST') {
      const { orderId } = req.body;
      const orders = await fetchOrdersFromDb();
      const order = orders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn thuê' });

      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'Completed' })
      });

      if (order.bikeId) {
        await fetch(`${SUPABASE_URL}/rest/v1/bikes?id=eq.${order.bikeId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'Available', current_customer: '' })
        });
      }

      const updatedFleet = await fetchBikesFromDb();
      const updatedOrders = await fetchOrdersFromDb();
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
