// ── AI Chat module ────────────────────────────────────────────────────────────
const CHAT_STORAGE_KEY = 'ea_os_chat_history';
let chatHistory = [];
let chatInitialised = false;

function initChat() {
  if (chatInitialised) return;
  chatInitialised = true;
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      chatHistory = JSON.parse(saved);
      if (chatHistory.length) {
        document.getElementById('chat-empty').style.display = 'none';
        chatHistory.forEach(m => appendMessage(m.role, m.content, false));
        scrollChat();
      }
    }
  } catch (_) {}
}

function appendMessage(role, content, scroll = true) {
  const empty = document.getElementById('chat-empty');
  if (empty) empty.style.display = 'none';

  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;

  const avatar = role === 'assistant'
    ? `<div class="msg-avatar ai-av">✦</div>`
    : `<div class="msg-avatar user-av">E</div>`;

  const formatted = formatMsgContent(content);
  div.innerHTML = `${avatar}<div class="msg-bubble">${formatted}</div>`;
  container.appendChild(div);
  if (scroll) scrollChat();
  return div;
}

function formatMsgContent(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function scrollChat() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg assistant';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar ai-av">✦</div>
    <div class="typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  container.appendChild(div);
  scrollChat();
}

function removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  autoResizeChat(input);

  const sendBtn = document.getElementById('chat-send-btn');
  sendBtn.disabled = true;

  appendMessage('user', msg);
  chatHistory.push({ role: 'user', content: msg });
  saveChatHistory();

  showTyping();

  try {
    const res = await fetch(AI_CHAT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory.slice(-20), // last 20 for context window
        userMessage: msg
      })
    });

    removeTyping();

    if (!res.ok) throw new Error('AI service returned ' + res.status);

    const data = await res.json();
    const reply = data.reply || data.message || data.text || data.content || JSON.stringify(data);

    appendMessage('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    saveChatHistory();

  } catch (e) {
    removeTyping();
    appendMessage('assistant', `Sorry, I couldn't reach the AI right now. Make sure the n8n workflow at \`/webhook/evans-ai-chat\` is active. Error: ${e.message}`);
  }

  sendBtn.disabled = false;
  input.focus();
}

function sendSuggestion(el) {
  const input = document.getElementById('chat-input');
  input.value = el.textContent;
  sendChat();
}

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
}

function autoResizeChat(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function clearChat() {
  chatHistory = [];
  localStorage.removeItem(CHAT_STORAGE_KEY);
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  const empty = document.getElementById('chat-empty');
  if (empty) {
    container.appendChild(empty);
    empty.style.display = 'flex';
  }
}

function saveChatHistory() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-60)));
  } catch (_) {}
}
