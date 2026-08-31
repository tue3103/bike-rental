// ==============================================================================
// SMILEX BIKE - 2-WAY LIVE CHAT API (TELEGRAM TOPICS + AI AUTO-REPLY)
// ==============================================================================

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8539622251:AAFAY3UlPj5X--2sjGwv0EtsxKUxF9GSLiU';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1004298681574';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vkwesmhtexlxbvesdgan.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrd2VzbWh0ZXhseGJ2ZXNkZ2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE4NDI1MSwiZXhwIjoyMTAzNzYwMjUxfQ.JF4MQxJr_CqMSyaEC-Htk63eHrz3XGA9yQLJgCWP0f8';

// Global memory cache across serverless warm invocations
// In production, syncs with Telegram message threads & cache
global._sessionStore = global._sessionStore || new Map();
// Structure: sessionId -> { topicId, name, phone, messages: [{ sender: 'user'|'admin'|'ai', text, time }] }
global._topicToSession = global._topicToSession || new Map();
global._bikeFleet = global._bikeFleet || [
  {
    id: "BK-01",
    name: "Giant ATX 830 Sport",
    category: "Mountain Bike (MTB)",
    priceDaily: 50000,
    priceWeekly: 30000,
    deposit: 5000000,
    status: "Available",
    currentCustomer: "",
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

const REMOTE_STORE_ID = 'ff808181a057a55b01a057d33ec00091';

async function getSharedChatStore() {
  try {
    const res = await fetch(`https://api.restful-api.dev/objects/${REMOTE_STORE_ID}`);
    if (res.ok) {
      const data = await res.json();
      return data.data || {};
    }
  } catch (e) {
    console.error('Fetch shared store error:', e);
  }
  return {};
}

async function updateSharedChatStore(data) {
  try {
    await fetch(`https://api.restful-api.dev/objects/${REMOTE_STORE_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'smilex_bike_chat_sync',
        data: data
      })
    });
  } catch (e) {
    console.error('Update shared store error:', e);
  }
}

async function createFreshTopic(session, sessionId) {
  try {
    const topicRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/createForumTopic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        name: `🚴 Khách ${session.name || 'Du Khách'} (#${sessionId.slice(-4)})`
      })
    });
    const topicData = await topicRes.json();
    if (topicData.ok) {
      session.topicId = topicData.result.message_thread_id;

      // Send greeting info card
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_GROUP_ID,
          message_thread_id: session.topicId,
          text: `🆕 <b>PHIÊN CHAT MỚI TỪ KHÁCH THUÊ XE</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>Tên khách:</b> ${session.name}\n📞 <b>SĐT/WhatsApp:</b> ${session.phone || 'Chưa cung cấp'}\n📍 <b>Khách sạn/Nơi ở:</b> ${session.hotel || 'Pleiku'}\n━━━━━━━━━━━━━━━━━━━━\n👉 <i>Khi bạn gõ trả lời trong Topic này, AI sẽ <b>tự động nhường quyền (tắt AI)</b> để bạn chat 1-1 với khách. Gõ <code>/ai</code> nếu muốn bật lại AI!</i>`,
          parse_mode: 'HTML'
        })
      });
    }
  } catch (err) {
    console.error('Create topic error:', err);
  }
}

async function sendToTelegramTopic(session, sessionId, text, isAi = false) {
  if (!session.topicId) {
    await createFreshTopic(session, sessionId);
  }

  if (session.topicId) {
    const payload = {
      chat_id: TELEGRAM_GROUP_ID,
      message_thread_id: session.topicId,
      text: isAi ? `🤖 <b>[SmileX AI]:</b>\n${text}` : `💬 <b>[Khách]:</b> ${text}`,
      parse_mode: 'HTML'
    };

    let sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let sendData = await sendRes.json();

    // If topic was deleted on Telegram or thread not found (400/404), auto recreate fresh topic
    if (!sendData.ok && (sendData.description?.includes('thread not found') || sendData.error_code === 400)) {
      console.log(`Topic ${session.topicId} invalid/deleted, creating fresh topic...`);
      session.topicId = null;
      await createFreshTopic(session, sessionId);
      if (session.topicId) {
        payload.message_thread_id = session.topicId;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action) || 'send';

  try {
    const store = await getSharedChatStore();

    // ------------------------------------------------------------------------
    // ACTION: SEND MESSAGE (From Web Client)
    // ------------------------------------------------------------------------
    if (action === 'send' && req.method === 'POST') {
      const { sessionId, topicId: clientTopicId, message, history, name, phone, hotel } = req.body;
      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
      }

      let session = store[sessionId] || global._sessionStore.get(sessionId) || {
        sessionId,
        name: name || 'Traveler #' + sessionId.slice(-4),
        phone: phone || '',
        hotel: hotel || '',
        topicId: null,
        messages: []
      };

      // Check if client or memory already has topicId
      if (!session.topicId && clientTopicId) {
        session.topicId = parseInt(clientTopicId, 10);
      }
      if (!session.topicId && global._sessionStore.has(sessionId)) {
        session.topicId = global._sessionStore.get(sessionId)?.topicId || null;
      }

      // Initialize or rebuild session messages from client history
      if (history && Array.isArray(history) && history.length > 0) {
        session.messages = [...history];
      }

      // Add user message
      const userMsg = {
        sender: 'user',
        text: message,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      session.messages.push(userMsg);

      // Auto deliver message to Telegram Topic (with auto-recreate if old topic was deleted)
      await sendToTelegramTopic(session, sessionId, message, false);

      // Check if AI is paused for this session or topic
      const isAiPaused = session.aiPaused || store['paused_' + String(session.topicId)] || false;

      // AI AUTO-PILOT RESPONSE (Only if global AI is on AND Human Admin has not taken over)
      if (global._inventory.aiAutoPilot && !isAiPaused) {
        const aiReplyText = await generateAiResponse(message, session, global._inventory);
        if (aiReplyText) {
          const aiMsg = {
            sender: 'ai',
            text: aiReplyText,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          };
          session.messages.push(aiMsg);

          // Forward AI's response to Telegram Topic so Admin can see it
          await sendToTelegramTopic(session, sessionId, aiReplyText, true);
        }
      }

      // Keep memory & remote cache updated
      global._sessionStore.set(sessionId, session);
      store[sessionId] = session;
      await updateSharedChatStore(store);

      return res.status(200).json({
        success: true,
        session,
        topicId: session.topicId,
        messages: session.messages
      });
    }

    // ------------------------------------------------------------------------
    // ACTION: TELEGRAM WEBHOOK (Receives Admin replies from Telegram Topics)
    // ------------------------------------------------------------------------
    if (action === 'webhook' || (req.body && req.body.message)) {
      const msg = req.body && req.body.message;
      if (msg && msg.text) {
        const threadId = msg.message_thread_id;
        const text = msg.text.trim();
        const fromBot = msg.from?.is_bot;

        if (!fromBot && threadId) {
          // TELEGRAM COMMANDS: /ai (turn on AI), /off (turn off AI)
          if (text === '/ai' || text === '/on' || text.toLowerCase() === 'bật ai') {
            store['paused_' + String(threadId)] = false;
            for (const [sId, sess] of Object.entries(store)) {
              if (sess && String(sess.topicId) === String(threadId)) {
                sess.aiPaused = false;
              }
            }
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: TELEGRAM_GROUP_ID,
                message_thread_id: threadId,
                text: `🤖 <b>[SmileX Bot]:</b> Đã <b>BẬT lại AI</b> cho khách này. AI sẽ tự động tư vấn các câu hỏi tiếp theo!`,
                parse_mode: 'HTML'
              })
            });
            await updateSharedChatStore(store);
            return res.status(200).json({ ok: true });
          }

          if (text === '/off' || text === '/pause' || text.toLowerCase() === 'tắt ai') {
            store['paused_' + String(threadId)] = true;
            for (const [sId, sess] of Object.entries(store)) {
              if (sess && String(sess.topicId) === String(threadId)) {
                sess.aiPaused = true;
              }
            }
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: TELEGRAM_GROUP_ID,
                message_thread_id: threadId,
                text: `⏸️ <b>[SmileX Bot]:</b> Đã <b>TẠM DỪNG AI</b> cho khách này. Chuyển sang chế độ Admin tự chat trực tiếp 1-1! Gõ <code>/ai</code> nếu muốn bật lại.`,
                parse_mode: 'HTML'
              })
            });
            await updateSharedChatStore(store);
            return res.status(200).json({ ok: true });
          }

          // Normal Admin Message: Auto Human Takeover (Auto-pause AI so it won't interrupt)
          store['paused_' + String(threadId)] = true;

          const adminMsg = {
            sender: 'admin',
            text: text,
            author: msg.from?.first_name || 'Admin',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          };

          // 1. Store in direct topic queue
          const topicKey = 'topic_' + String(threadId);
          store[topicKey] = store[topicKey] || [];
          store[topicKey].push(adminMsg);

          // 2. Also append directly to matching session in store & memory and pause AI
          for (const [sId, sess] of Object.entries(store)) {
            if (sess && String(sess.topicId) === String(threadId)) {
              sess.messages = sess.messages || [];
              sess.messages.push(adminMsg);
              sess.aiPaused = true; // Auto Human Takeover!
            }
          }
          for (const [sId, sess] of global._sessionStore.entries()) {
            if (sess && String(sess.topicId) === String(threadId)) {
              sess.messages = sess.messages || [];
              sess.messages.push(adminMsg);
              sess.aiPaused = true; // Auto Human Takeover!
            }
          }

          // 3. Persist to shared store
          await updateSharedChatStore(store);
          console.log(`[Admin Takeover -> Topic ${threadId}]:`, text);
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ------------------------------------------------------------------------
    // ACTION: POLL / GET MESSAGES (For Web Client Realtime Updates)
    // ------------------------------------------------------------------------
    if (action === 'poll' || action === 'get') {
      const sessionId = req.query.sessionId;
      const topicId = req.query.topicId;
      const session = store[sessionId] || global._sessionStore.get(sessionId);

      let messages = session ? [...(session.messages || [])] : [];
      const activeTopicId = topicId || (session ? session.topicId : null);

      // Query Telegram getUpdates directly for real-time admin replies
      if (activeTopicId) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?allowed_updates=["message"]`);
          if (tgRes.ok) {
            const tgData = await tgRes.json();
            if (tgData.ok && tgData.result && tgData.result.length > 0) {
              tgData.result.forEach(u => {
                const m = u.message;
                if (m && !m.from?.is_bot && String(m.message_thread_id) === String(activeTopicId) && m.text) {
                  const adminMsg = {
                    sender: 'admin',
                    text: m.text,
                    author: m.from?.first_name || 'Admin',
                    time: new Date((m.date || Date.now() / 1000) * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  };
                  if (!messages.some(ex => ex.text === adminMsg.text && ex.sender === 'admin')) {
                    messages.push(adminMsg);
                  }
                }
              });
            }
          }
        } catch (e) {
          console.error('getUpdates error:', e);
        }
      }

      return res.status(200).json({
        success: true,
        topicId: activeTopicId ? parseInt(activeTopicId, 10) : null,
        messages: messages
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
  let fleet = global._bikeFleet || [];
  try {
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/bikes?select=*&order=id.asc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (sbRes.ok) {
      const sbData = await sbRes.json();
      if (Array.isArray(sbData) && sbData.length > 0) {
        fleet = sbData.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          priceDaily: r.price_daily,
          priceWeekly: r.price_weekly,
          deposit: r.deposit,
          status: r.status,
          gear: r.gear || ''
        }));
      }
    }
  } catch (e) {}

  const availableBikesList = fleet.filter(b => b.status === 'Available');
  const availableCount = availableBikesList.length || fleet.length;

  const fleetSummary = availableBikesList.map(b => 
    `- [${b.id}] ${b.name} (${b.category}): ${(b.priceDaily || 50000).toLocaleString()} VND/day, Deposit: ${(b.deposit || 5000000).toLocaleString()} VND. Gear: ${b.gear || 'Standard'}`
  ).join('\n');

  const prompt = `You are the friendly, professional customer support AI for "SmileX Bike Rental" at 197 Nguyễn Tất Thành, TP. Pleiku, Gia Lai.
  
Current Store & Fleet Available in Stock (${availableCount} bikes ready):
${fleetSummary || '- Standard sport mountain bikes (50,000 VND/day, 5M deposit)'}

Store Policies:
- Standard Rates: 50,000 VND / day (~$2.00 USD), Weekly (>7 days) is 30,000 VND / day (~$1.20 USD).
- Security Deposit: 100% refundable upon bike return.
- Passport Policy: NO PASSPORT OR ID IS HELD! 5-minute fast handover.
- Delivery: 100,000 VND flat round-trip fee for door-to-door delivery & pickup anywhere in Pleiku city. Free pickup at 197 Nguyễn Tất Thành.
- Free Accessories: Helmets, anti-theft cable lock, phone mount, mini pump.
- Popular Scenic Routes: Sea Lake (Biển Hồ - 8km), Century Pines & Tea Hills (12km), Chư Đăng Ya Volcano (22km).

Customer's message: "${userMessage}"

Instructions:
1. Detect customer's language and reply in the EXACT SAME LANGUAGE (English, French, Vietnamese, Korean, etc.).
2. Keep the answer concise, polite, friendly, and helpful (2-4 sentences).
3. If they want to reserve, tell them they can fill the form or send dates/hotel address right here in chat and we will prepare the bike immediately.`;

  // 1. Try Groq API (Qwen 3.8 27B / Qwen 3.6 27B)
  if (GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + GROQ_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            {
              role: 'system',
              content: `You are the friendly, multilingual AI customer support for "SmileX Bike Rental" in Pleiku, Gia Lai (Store: 197 Nguyễn Tất Thành).
We ALWAYS have high-quality bikes available in stock!

Current Ready Fleet (${availableCount} bikes in stock):
${fleetSummary}

Key Store Highlights:
- Daily Rate: 50,000 VND/day (~$2 USD), Weekly (>7 days): 30,000 VND/day (~$1.20 USD).
- Deposit: 5,000,000 VND (100% refunded when returned). NO PASSPORT OR ID HELD!
- Free Accessories: Helmet, cable lock, phone mount, mini pump included.
- Fast Delivery: 100,000 VND round-trip to any hotel in Pleiku, or free pickup at 197 Nguyễn Tất Thành.

Rules:
1. Always reply in the EXACT SAME LANGUAGE the customer speaks.
2. If customer asks to rent or says "i want one", enthusiastically confirm we have bikes ready, recommend popular models like Trek Marlin 5 / Giant ATX, and ask when they would like pickup or delivery to their hotel.
3. Keep replies natural, concise (2-3 sentences), warm, and helpful.`
            },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.6,
          max_tokens: 220
        })
      });
      const groqData = await groqRes.json();
      const groqText = groqData.choices?.[0]?.message?.content;
      if (groqText) return groqText.trim();
    } catch (e) {
      console.error('Groq API Error:', e);
    }
  }

  // 2. Try Gemini API if key is present
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

  // 3. Built-in Smart Intelligent Fallback
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
