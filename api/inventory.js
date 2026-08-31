// ==============================================================================
// SMILEX BIKE - FLEET & ORDER MANAGEMENT API (FULL DETAILED BIKES)
// ==============================================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'smilex2026';

// Global mock database for fleet & orders
global._bikeFleet = global._bikeFleet || [
  {
    id: "BK-01",
    name: "Giant ATX 830 Sport",
    category: "Mountain Bike (MTB)",
    priceDaily: 50000,
    priceWeekly: 30000,
    deposit: 5000000,
    status: "Rented", // Available | Rented | Maintenance
    currentCustomer: "David Miller (UK)",
    gear: "Shimano 24-speed, Phanh đĩa dầu",
    notes: "Xe mới 98%, lốp chống đinh"
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
    notes: "Đã gắn giá đỡ bình nước + túi điện thoại"
  },
  {
    id: "BK-03",
    name: "Trinx M100 Pro Elite",
    category: "Mountain Bike (MTB)",
    priceDaily: 50000,
    priceWeekly: 30000,
    deposit: 5000000,
    status: "Available",
    currentCustomer: "",
    gear: "Shimano 21-speed",
    notes: "Phù hợp chiều cao 1m60 - 1m75"
  },
  {
    id: "BK-04",
    name: "Giant Escape 2 City Touring",
    category: "Touring Road Bike",
    priceDaily: 70000,
    priceWeekly: 45000,
    deposit: 6000000,
    status: "Available",
    currentCustomer: "",
    gear: "Shimano Tourney 3x7, Bánh 700c lướt nhanh",
    notes: "Chuyên phượt đường dài đồi dốc Biển Hồ Chè"
  },
  {
    id: "BK-05",
    name: "Sava Deck 300 Carbon Pro",
    category: "Premium Carbon MTB",
    priceDaily: 100000,
    priceWeekly: 70000,
    deposit: 10000000,
    status: "Available",
    currentCustomer: "",
    gear: "Khung Carbon siêu nhẹ, Shimano Deore 30S",
    notes: "Dòng cao cấp phượt núi lửa Chư Đăng Ya"
  },
  {
    id: "BK-06",
    name: "Asama Rainbow Lady City",
    category: "City Bike (Xe nữ)",
    priceDaily: 40000,
    priceWeekly: 25000,
    deposit: 3000000,
    status: "Available",
    currentCustomer: "",
    gear: "Giỏ xe xinh xắn, yên êm, 1 đĩa 6 líp",
    notes: "Dạo phố ẩm thực Pleiku & công viên Diệp Kính"
  }
];

global._orders = global._orders || [
  {
    id: "ORD-101",
    customer: "David Miller",
    nationality: "United Kingdom 🇬🇧",
    phone: "+44 7911 123456",
    bikeId: "BK-01",
    bikeName: "Giant ATX 830 Sport",
    days: 3,
    startDate: "2026-08-30",
    endDate: "2026-09-02",
    dailyRate: 50000,
    rentalTotal: 150000,
    deliveryFee: 100000,
    grandTotal: 250000,
    deposit: 5000000,
    deliveryAddress: "Pleiku Hotel, 03 Nguyễn Du",
    status: "Rented",
    createdAt: "2026-08-30 08:30"
  }
];

global._storeSettings = global._storeSettings || {
  pickupAddress: "197 Nguyễn Tất Thành, TP. Pleiku, Gia Lai",
  hotline: "0979.820.789",
  aiAutoPilot: true
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action) || 'get';

  // 1. AUTHENTICATION (LOGIN CHECK)
  if (action === 'login' && req.method === 'POST') {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({ success: true, token: 'auth_smilex_secure_session_token' });
    }
    return res.status(401).json({ success: false, error: 'Mật khẩu quản trị không chính xác!' });
  }

  // 2. PUBLIC INVENTORY QUERY (For web estimator & AI)
  if (action === 'getPublicFleet') {
    const available = global._bikeFleet.filter(b => b.status === 'Available');
    return res.status(200).json({
      totalBikes: global._bikeFleet.length,
      availableCount: available.length,
      bikes: global._bikeFleet
    });
  }

  // 3. FULL ADMIN DATA QUERY
  if (action === 'get') {
    const totalBikes = global._bikeFleet.length;
    const availableCount = global._bikeFleet.filter(b => b.status === 'Available').length;
    const rentedCount = global._bikeFleet.filter(b => b.status === 'Rented').length;
    const maintenanceCount = global._bikeFleet.filter(b => b.status === 'Maintenance').length;
    const totalDepositHolding = global._orders
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
      fleet: global._bikeFleet,
      orders: global._orders,
      settings: global._storeSettings
    });
  }

  // 4. ADD NEW BIKE
  if (action === 'addBike' && req.method === 'POST') {
    const { id, name, category, priceDaily, priceWeekly, deposit, gear, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên xe không được để trống' });

    const newId = id || ("BK-" + String(global._bikeFleet.length + 1).padStart(2, '0'));
    const newBike = {
      id: newId,
      name,
      category: category || "Mountain Bike (MTB)",
      priceDaily: parseInt(priceDaily, 10) || 50000,
      priceWeekly: parseInt(priceWeekly, 10) || 30000,
      deposit: parseInt(deposit, 10) || 5000000,
      status: "Available",
      currentCustomer: "",
      gear: gear || "",
      notes: notes || ""
    };
    global._bikeFleet.push(newBike);
    return res.status(200).json({ success: true, bike: newBike, fleet: global._bikeFleet });
  }

  // 5. UPDATE / EDIT BIKE
  if (action === 'updateBike' && req.method === 'POST') {
    const { id, name, category, priceDaily, priceWeekly, deposit, status, gear, notes } = req.body;
    const bike = global._bikeFleet.find(b => b.id === id);
    if (!bike) return res.status(404).json({ error: 'Không tìm thấy xe' });

    if (name !== undefined) bike.name = name;
    if (category !== undefined) bike.category = category;
    if (priceDaily !== undefined) bike.priceDaily = parseInt(priceDaily, 10);
    if (priceWeekly !== undefined) bike.priceWeekly = parseInt(priceWeekly, 10);
    if (deposit !== undefined) bike.deposit = parseInt(deposit, 10);
    if (status !== undefined) bike.status = status;
    if (gear !== undefined) bike.gear = gear;
    if (notes !== undefined) bike.notes = notes;

    return res.status(200).json({ success: true, bike, fleet: global._bikeFleet });
  }

  // 6. DELETE BIKE
  if (action === 'deleteBike' && req.method === 'POST') {
    const { id } = req.body;
    global._bikeFleet = global._bikeFleet.filter(b => b.id !== id);
    return res.status(200).json({ success: true, fleet: global._bikeFleet });
  }

  // 7. CREATE NEW RENTAL ORDER
  if (action === 'createOrder' && req.method === 'POST') {
    const { customer, nationality, phone, bikeId, days, startDate, isDelivery, deliveryAddress } = req.body;
    const bike = global._bikeFleet.find(b => b.id === bikeId);
    if (!bike) return res.status(400).json({ error: 'Vui lòng chọn xe hợp lệ' });

    const numDays = parseInt(days, 10) || 1;
    const rate = numDays >= 7 ? bike.priceWeekly : bike.priceDaily;
    const rentalTotal = rate * numDays;
    const delFee = isDelivery ? 100000 : 0;
    const grandTotal = rentalTotal + delFee;

    const newOrder = {
      id: "ORD-" + Math.floor(100 + Math.random() * 900),
      customer: customer || "Khách Vãng Lai",
      nationality: nationality || "Quốc tế",
      phone: phone || "",
      bikeId: bike.id,
      bikeName: bike.name,
      days: numDays,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      dailyRate: rate,
      rentalTotal,
      deliveryFee: delFee,
      grandTotal,
      deposit: bike.deposit,
      deliveryAddress: isDelivery ? (deliveryAddress || "Khách sạn tại Pleiku") : "Nhận tại 197 Nguyễn Tất Thành",
      status: "Rented",
      createdAt: new Date().toLocaleString('vi-VN')
    };

    // Update bike status
    bike.status = "Rented";
    bike.currentCustomer = newOrder.customer;

    global._orders.unshift(newOrder);
    return res.status(200).json({ success: true, order: newOrder, fleet: global._bikeFleet, orders: global._orders });
  }

  // 8. RETURN BIKE & REFUND DEPOSIT
  if (action === 'completeOrder' && req.method === 'POST') {
    const { orderId } = req.body;
    const order = global._orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn thuê' });

    order.status = "Completed";
    const bike = global._bikeFleet.find(b => b.id === order.bikeId);
    if (bike) {
      bike.status = "Available";
      bike.currentCustomer = "";
    }

    return res.status(200).json({ success: true, fleet: global._bikeFleet, orders: global._orders });
  }

  // 9. TOGGLE AI AUTO-PILOT
  if (action === 'toggleAi' && req.method === 'POST') {
    const { aiAutoPilot } = req.body;
    global._storeSettings.aiAutoPilot = !!aiAutoPilot;
    return res.status(200).json({ success: true, settings: global._storeSettings });
  }

  return res.status(400).json({ error: 'Action không hợp lệ' });
}
