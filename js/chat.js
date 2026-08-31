// ==============================================================================
// SMILEX BIKE - LIVE CHAT CLIENT (LOCALSTORAGE/INDEXEDDB + 2-WAY POLLING)
// ==============================================================================

const CHAT_SESSION_KEY = 'smilex_bike_chat_session_v1';
const CHAT_HISTORY_KEY = 'smilex_bike_chat_history_v1';

let chatSessionId = localStorage.getItem(CHAT_SESSION_KEY);
if (!chatSessionId) {
  chatSessionId = 'vis_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  localStorage.setItem(CHAT_SESSION_KEY, chatSessionId);
}

const CHAT_TOPIC_KEY = 'smilex_bike_chat_topic_v1';
let chatTopicId = localStorage.getItem(CHAT_TOPIC_KEY);

let localMessages = [];
try {
  const saved = localStorage.getItem(CHAT_HISTORY_KEY);
  localMessages = saved ? JSON.parse(saved) : [];
} catch (e) {
  localMessages = [];
}

let isChatOpen = false;
let chatPollTimer = null;

function resetChat() {
  localStorage.removeItem(CHAT_SESSION_KEY);
  localStorage.removeItem(CHAT_HISTORY_KEY);
  localStorage.removeItem(CHAT_TOPIC_KEY);
  chatSessionId = 'vis_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  localStorage.setItem(CHAT_SESSION_KEY, chatSessionId);
  chatTopicId = null;
  localMessages = [];
  renderChatMessages();
}

function toggleChat() {
  isChatOpen = !isChatOpen;
  const win = document.getElementById('chatWindow');
  if (win) {
    win.classList.toggle('open', isChatOpen);
    if (isChatOpen) {
      document.getElementById('chatInput')?.focus();
      renderChatMessages();
      startPolling();
    } else {
      stopPolling();
    }
  }
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  if (localMessages.length === 0) {
    container.innerHTML = `
      <div class="msg-bubble ai">
        <span class="msg-author-tag">🤖 SmileX AI Assistant</span>
        Hello! Welcome to Pleiku. How can we help you today with bike rental, rates, or delivery?
        <span class="msg-time">Just now</span>
      </div>
    `;
    return;
  }

  container.innerHTML = localMessages.map(m => `
    <div class="msg-bubble ${m.sender}">
      ${m.sender === 'ai' ? '<span class="msg-author-tag">🤖 SmileX AI Assistant</span>' : ''}
      ${m.sender === 'admin' ? `<span class="msg-author-tag">👨‍💼 Support: ${m.author || 'Admin'}</span>` : ''}
      ${m.text}
      <span class="msg-time">${m.time || ''}</span>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  const userMsg = {
    sender: 'user',
    text: text,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  localMessages.push(userMsg);
  saveLocalHistory();
  renderChatMessages();

  try {
    const res = await fetch('/api/chat?action=send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: chatSessionId,
        topicId: chatTopicId ? parseInt(chatTopicId, 10) : null,
        message: text,
        history: localMessages.slice(0, -1),
        name: localStorage.getItem('smilex_guest_name') || ''
      })
    });
    const data = await res.json();
    if (data.success) {
      const respTopicId = data.session?.topicId || data.topicId;
      if (respTopicId) {
        chatTopicId = String(respTopicId);
        localStorage.setItem(CHAT_TOPIC_KEY, chatTopicId);
      }
      
      // Safely merge incoming messages without wiping previous history
      if (data.messages && Array.isArray(data.messages)) {
        if (data.messages.length >= localMessages.length) {
          localMessages = data.messages;
        } else {
          // Merge any AI / Admin messages not yet in localMessages
          data.messages.forEach(m => {
            if (m.sender !== 'user' && !localMessages.some(lm => lm.text === m.text && lm.sender === m.sender)) {
              localMessages.push(m);
            }
          });
        }
        saveLocalHistory();
        renderChatMessages();
      }
    }
  } catch (err) {
    console.error('Send error:', err);
  }
}

async function pollNewMessages() {
  try {
    const res = await fetch(`/api/chat?action=poll&sessionId=${chatSessionId}&topicId=${chatTopicId || ''}`);
    const data = await res.json();
    if (data.success) {
      if (data.topicId && !chatTopicId) {
        chatTopicId = String(data.topicId);
        localStorage.setItem(CHAT_TOPIC_KEY, chatTopicId);
      }
      if (data.messages && Array.isArray(data.messages)) {
        let hasNew = false;
        data.messages.forEach(m => {
          if (!localMessages.some(lm => lm.text === m.text && lm.sender === m.sender)) {
            localMessages.push(m);
            hasNew = true;
          }
        });
        if (hasNew) {
          saveLocalHistory();
          renderChatMessages();

          // Show notification badge if chat window is closed
          const badge = document.getElementById('chatUnreadBadge');
          if (badge && !isChatOpen) {
            badge.style.display = 'flex';
          }
        }
      }
    }
  } catch (e) {}
}

function startPolling() {
  stopPolling();
  pollNewMessages();
  chatPollTimer = setInterval(pollNewMessages, isChatOpen ? 1500 : 3500);
}

function stopPolling() {
  if (chatPollTimer) clearInterval(chatPollTimer);
}

function saveLocalHistory() {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(localMessages));
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  renderChatMessages();
  // Always keep polling active in background so traveler never misses admin replies!
  startPolling();
});
