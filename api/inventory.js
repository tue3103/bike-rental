// ==============================================================================
// SMILEX BIKE - INVENTORY & ORDERS BACKEND API
// ==============================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Basic authorization or action
  const action = req.query.action || (req.body && req.body.action) || 'get';

  global._inventory = global._inventory || {
    totalBikes: 15,
    rentedBikes: 2,
    priceDaily: 50000,
    priceWeekly: 30000,
    deposit: 5000000,
    deliveryFee: 100000,
    pickupAddress: "197 Nguyễn Tất Thành, TP. Pleiku, Gia Lai",
    aiAutoPilot: true
  };

  global._orders = global._orders || [];

  if (action === 'get') {
    return res.status(200).json({
      inventory: global._inventory,
      orders: global._orders,
      activeSessionsCount: global._sessionStore ? global._sessionStore.size : 0
    });
  }

  if (action === 'updateInventory' && req.method === 'POST') {
    const { totalBikes, rentedBikes, aiAutoPilot } = req.body;
    if (totalBikes !== undefined) global._inventory.totalBikes = parseInt(totalBikes, 10);
    if (rentedBikes !== undefined) global._inventory.rentedBikes = parseInt(rentedBikes, 10);
    if (aiAutoPilot !== undefined) global._inventory.aiAutoPilot = !!aiAutoPilot;

    return res.status(200).json({ success: true, inventory: global._inventory });
  }

  if (action === 'updateOrderStatus' && req.method === 'POST') {
    const { orderId, status } = req.body;
    const order = global._orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      // Auto adjust stock if completed
      if (status === 'Completed' && global._inventory.rentedBikes > 0) {
        global._inventory.rentedBikes = Math.max(0, global._inventory.rentedBikes - order.bikes);
      } else if (status === 'Rented') {
        global._inventory.rentedBikes = Math.min(global._inventory.totalBikes, global._inventory.rentedBikes + order.bikes);
      }
      return res.status(200).json({ success: true, orders: global._orders, inventory: global._inventory });
    }
    return res.status(404).json({ error: 'Order not found' });
  }

  if (action === 'createOrder' && req.method === 'POST') {
    const newOrder = req.body;
    newOrder.id = "ORD-" + Math.floor(100 + Math.random() * 900);
    newOrder.date = new Date().toISOString().slice(0, 10);
    global._orders.unshift(newOrder);
    return res.status(200).json({ success: true, order: newOrder });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
