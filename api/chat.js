// ==============================================================================
// SMILEX BIKE - 2-WAY LIVE CHAT API (TELEGRAM TOPICS + AI AUTO-REPLY)
// ==============================================================================

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8539622251:AAFAY3UlPj5X--2sjGwv0EtsxKUxF9GSLiU';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1004298681574';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Global memory cache across serverless warm invocations
// In production, syncs with Telegram message threads & cache
global._sessionStore = global._sessionStore || new Map();
// Structure: sessionId -> { topicId, name, phone, messages: [{ sender: 'user'|'admin'|'ai', text, time }] }
global._topicToSession = global._topicToSession || new Map();
// Structure: topicId -> sessionId

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

global._orders = global._orders || [
  {
    id: "ORD-101",
    customer: "David Miller (UK)",
    phone: "+44 7911 123456",
    bikes: 2,
    days: 3,
    total: 300000,
    deposit: 10000000,
    delivery: "Pleiku Hotel (100k)",
    status: "Rented",
    date: "2026-08-30"
  },
  {
    id: "ORD-102",
    customer: "Elena Rossi (Italy)",
    phone: "+39 340 1234567",
    bikes: 1,
    days: 8,
    total: 240000,
    deposit: 5000000,
    delivery: "Pickup at Store 197 Nguyen Tat Thanh",
    status: "Active",
    date: "2026-08-29"
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action) || 'send';

  try {
    // ------------------------------------------------------------------------
    // ACTION: SEND MESSAGE (From Web Client)
    // ------------------------------------------------------------------------
    if (action === 'send' && req.method === 'POST') {
      const { sessionId, message, name, phone, hotel } = req.body;
      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
      }

      let session = global._sessionStore.get(sessionId);
      if (!session) {
        session = {
          sessionId,
          name: name || 'Traveler #' + sessionId.slice(-4),
          phone: phone || '',
          hotel: hotel || '',
          topicId: null,
          messages: []
        };
        global._sessionStore.set(sessionId, session);
      }

      // Add user message
      const userMsg = {
        sender: 'user',
        text: message,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      session.messages.push(userMsg);

      // Create Telegram Topic if not already created
      if (!session.topicId) {
        try {
          const topicRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/createForumTopic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_GROUP_ID,
              name: `🚴 Khách ${session.name} (#${sessionId.slice(-4)})`
            })
          });
          const topicData = await topicRes.json();
          if (topicData.ok) {
            session.topicId = topicData.result.message_thread_id;
            global._topicToSession.set(String(session.topicId), sessionId);

            // Send introductory card to Telegram Topic
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: TELEGRAM_GROUP_ID,
                message_thread_id: session.topicId,
                text: `🆕 <b>PHIÊN CHAT MỚI TỪ KHÁCH THUÊ XE</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>Tên khách:</b> ${session.name}\n📞 <b>SĐT/WhatsApp:</b> ${session.phone || 'Chưa cung cấp'}\n📍 <b>Khách sạn/Nơi ở:</b> ${session.hotel || 'Pleiku'}\n━━━━━━━━━━━━━━━━━━━━\n👉 <i>Bạn chỉ cần gõ tin nhắn trả lời ngay trong Topic này, khách trên web sẽ nhận được tức thì!</i>`,
                parse_mode: 'HTML'
              })
            });
          }
        } catch (err) {
          console.error('Create topic error:', err);
        }
      }

      // Send User's Message into Telegram Topic
      if (session.topicId) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_GROUP_ID,
              message_thread_id: session.topicId,
              text: `💬 <b>[Khách]:</b> ${message}`,
              parse_mode: 'HTML'
            })
          });
        } catch (err) {
          console.error('Send message to topic error:', err);
        }
      }

      // AI AUTO-PILOT RESPONSE
      if (global._inventory.aiAutoPilot) {
        const aiReplyText = await generateAiResponse(message, session, global._inventory);
        if (aiReplyText) {
          const aiMsg = {
            sender: 'ai',
            text: aiReplyText,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          };
          session.messages.push(aiMsg);

          // Forward AI's response to Telegram Topic so Admin can see it
          if (session.topicId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: TELEGRAM_GROUP_ID,
                message_thread_id: session.topicId,
                text: `🤖 <b>[AI Phản Hồi]:</b>\n${aiReplyText}`,
                parse_mode: 'HTML'
              })
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        messages: session.messages
      });
    }

    // ------------------------------------------------------------------------
    // ACTION: POLL / GET MESSAGES (For Web Client Realtime Updates)
    // ------------------------------------------------------------------------
    if (action === 'poll' || action === 'get') {
      const sessionId = req.query.sessionId;
      const session = global._sessionStore.get(sessionId);
      return res.status(200).json({
        success: true,
        messages: session ? session.messages : []
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ==============================================================================
// SMART AI RESPONSE GENERATOR (MULTILINGUAL + INVENTORY AWARE)
// ==============================================================================
async function generateAiResponse(userMessage, session, inventory) {
  const availableBikes = inventory.totalBikes - inventory.rentedBikes;

  const prompt = `You are the friendly, professional customer support AI for "SmileX Bike Rental" in Pleiku, Gia Lai (Central Highlands, Vietnam).
  
Current Store & Inventory Information:
- Available Sport Bikes: ${availableBikes} bikes in stock ready for rent.
- Daily Rate: 50,000 VND / day (~$2.00 USD).
- Weekly Rate (>7 days): 30,000 VND / day (~$1.20 USD - 40% discount).
- Security Deposit: 5,000,000 VND (~$200 USD) 100% refundable upon return.
- Passport Policy: NO PASSPORT OR ID IS HELD! 5-minute fast handover.
- Free Accessories: Quality helmets, anti-theft cable lock, handlebar phone mount, mini pump, bottle cage.
- Delivery: 100,000 VND flat round-trip fee for door-to-door delivery & pickup anywhere in Pleiku city.
- Store Address (Free Pickup): 197 Nguyễn Tất Thành, TP. Pleiku, Gia Lai.
- Popular Routes: Sea Lake (Biển Hồ - 8km), Century Pines & Tea Hills (12km), Chư Đăng Ya Volcano (22km).
- Payment Accepted: Cash (VND/USD), Wise, Revolut, VN Bank QR, Crypto (USDT).

Customer's message: "${userMessage}"

Instructions:
1. Detect customer's language and reply in the EXACT SAME LANGUAGE (English, French, Vietnamese, Korean, etc.).
2. Keep the answer concise, polite, friendly, and helpful (2-4 sentences).
3. If they want to reserve, tell them they can fill the form or send dates/hotel address right here in chat and we will prepare the bike immediately.`;

  // 1. Try Gemini API if key is present
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await geminiRes.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (e) {
      console.error('Gemini API Error:', e);
    }
  }

  // 2. Built-in Smart Intelligent Fallback
  const lower = userMessage.toLowerCase();

  // English greetings & availability
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('available') || lower.includes('rent') || lower.includes('bike')) {
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
      return `Hello! Our rental rate is 50,000 VND/day (~$2 USD), and only 30,000 VND/day for weekly rentals (>7 days). The refundable security deposit is 5,000,000 VND (~$200 USD), and we do NOT hold your passport!`;
    }
    if (lower.includes('deposit') || lower.includes('passport')) {
      return `Hi! Our security deposit is 5,000,000 VND (~$200 USD) which is 100% refunded when you return the bike. We do NOT keep your passport! You can pay cash, Wise, Revolut, or Crypto.`;
    }
    if (lower.includes('delivery') || lower.includes('hotel') || lower.includes('where')) {
      return `Yes! We provide door-to-door delivery & return pickup anywhere in Pleiku city for 100,000 VND round-trip. You can also pick up for free at our shop at 197 Nguyễn Tất Thành, Pleiku. Currently we have ${availableBikes} bikes available!`;
    }
    return `Hello! Welcome to SmileX Bike Rental Pleiku. We currently have ${availableBikes} sport bicycles available in stock (50k/day, weekly 30k/day). How many bikes and for which dates would you like to reserve?`;
  }

  // Vietnamese queries
  if (lower.includes('chào') || lower.includes('xe') || lower.includes('thuê') || lower.includes('giá') || lower.includes('cọc')) {
    if (lower.includes('giá') || lower.includes('bao nhiêu')) {
      return `Chào bạn! Giá thuê xe là 50.000đ/ngày, thuê trên 1 tuần ưu đãi chỉ 30.000đ/ngày. Cọc 5.000.000đ hoàn trả 100% khi trả xe và không giữ bất kỳ giấy tờ nào!`;
    }
    if (lower.includes('địa chỉ') || lower.includes('ở đâu') || lower.includes('giao')) {
      return `Cửa hàng bên mình tại 197 Nguyễn Tất Thành, TP. Pleiku (nhận xe miễn phí). Bên mình cũng có dịch vụ giao nhận xe tận khách sạn/homestay phí 100k khứ hồi bạn nhé! Hiện trong kho đang có sẵn ${availableBikes} xe.`;
    }
    return `Chào bạn! Cửa hàng SmileX Bike hiện có sẵn ${availableBikes} xe đạp thể thao tại 197 Nguyễn Tất Thành. Bạn dự kiến thuê mấy xe và từ ngày nào ạ?`;
  }

  // Default international friendly response
  return `Hello! Thank you for reaching out to SmileX Bike Rental Pleiku. We have ${availableBikes} sport bikes ready for rent (50,000 VND/day, weekly 30,000 VND/day, 100% refundable 5M deposit, no passport held). Please let us know your dates or hotel address and we will assist you right away!`;
}
