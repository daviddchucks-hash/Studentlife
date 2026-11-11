import { auth, database } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { limitToLast, off, onValue, orderByChild, query, ref } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { apiRequest } from "./api.js";
import { initNavigation } from "./nav.js";

const searchForm = document.querySelector("#student-search-form");
const matricInput = document.querySelector("#matric-input");
const matricCount = document.querySelector("#matric-search-count");
const searchState = document.querySelector("#search-state");
const conversationList = document.querySelector("#conversation-list");
const conversationCount = document.querySelector("#conversation-count");
const requestList = document.querySelector("#request-list");
const requestCount = document.querySelector("#request-count");
const notificationList = document.querySelector("#notification-list");
const notificationCount = document.querySelector("#notification-count");
const blockedList = document.querySelector("#blocked-list");
const chatHeader = document.querySelector("#chat-header");
const chatMessages = document.querySelector("#chat-messages");
const chatStatus = document.querySelector("#chat-status");
const chatForm = document.querySelector("#chat-form");
const messageInput = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");

let activeUserUid = "";
let selectedConversationId = "";
let selectedOtherUid = "";
let selectedOtherName = "";
let activeConversationListener = null;
let activeConversationRef = null;
let activeRequestListener = null;
let activeRequestRef = null;
let activeNotificationListener = null;
let activeNotificationRef = null;
let activeMessageListener = null;
let activeMessageRef = null;
let pendingMessage = null;
let lastReadMessageId = "";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function avatar(name, imageUrl = "") {
  const image = typeof imageUrl === "string" && /^https:\/\/\S+$/i.test(imageUrl)
    ? `<img src="${escapeHtml(imageUrl)}" alt="" referrerpolicy="no-referrer">`
    : escapeHtml(String(name || "S").trim().charAt(0).toUpperCase() || "S");
  return `<span class="student-avatar" aria-hidden="true">${image}</span>`;
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp) || 0);
  return Number.isNaN(date.getTime()) || !Number(timestamp)
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(timestamp) {
  const date = new Date(Number(timestamp) || 0);
  return Number.isNaN(date.getTime()) || !Number(timestamp)
    ? ""
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function newId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function showSearchMessage(message, success = false) {
  searchState.innerHTML = message
    ? `<div class="${success ? "result-box" : "error-box"}">${escapeHtml(message)}</div>`
    : "";
}

function normalizeMatricSearch(value) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function matricSearchError(value) {
  const normalized = normalizeMatricSearch(value);
  if (normalized.length > 9) return "Matriculation number must be 9 characters or fewer.";
  if (normalized && !/^[A-Z0-9./_-]+$/.test(normalized)) {
    return "Enter a valid matriculation number using letters, numbers, or common separators.";
  }
  return "";
}

matricInput.addEventListener("input", () => {
  const normalized = normalizeMatricSearch(matricInput.value);
  matricCount.textContent = `${normalized.length}/9 characters`;
  const error = matricSearchError(matricInput.value);
  if (error) showSearchMessage(error);
  else if (searchState.querySelector(".error-box")) showSearchMessage("");
});

function showChatStatus(message, success = false) {
  chatStatus.innerHTML = message
    ? `<div class="${success ? "result-box" : "error-box"}">${escapeHtml(message)}</div>`
    : "";
}

function clearListener(refValue, listener) {
  if (refValue && listener) off(refValue, "value", listener);
}

function clearMessageListener() {
  clearListener(activeMessageRef, activeMessageListener);
  activeMessageRef = null;
  activeMessageListener = null;
}

function clearPageListeners() {
  clearMessageListener();
  clearListener(activeConversationRef, activeConversationListener);
  clearListener(activeRequestRef, activeRequestListener);
  clearListener(activeNotificationRef, activeNotificationListener);
  activeConversationRef = null;
  activeConversationListener = null;
  activeRequestRef = null;
  activeRequestListener = null;
  activeNotificationRef = null;
  activeNotificationListener = null;
}

function showPanel(panelId) {
  document.querySelectorAll(".messages-list-panel").forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
  document.querySelectorAll(".messages-tab").forEach((button) => {
    const active = button.dataset.panel === panelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

document.querySelector(".messages-tabs")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-panel]");
  if (button) showPanel(button.dataset.panel);
});

function renderConversationList(items = []) {
  const visible = items.filter((item) => item && item.hidden !== true)
    .sort((a, b) => Number(b.updatedAt || b.lastMessageAt || 0) - Number(a.updatedAt || a.lastMessageAt || 0));
  conversationCount.textContent = String(visible.length);
  conversationList.innerHTML = visible.length ? visible.map((item) => {
    const id = item.id || item.conversationId || "";
    const active = id === selectedConversationId ? " active" : "";
    const unread = Number(item.unreadCount || 0);
    return `
      <button type="button" class="conversation-item${active}" data-conversation-id="${escapeHtml(id)}" data-other-uid="${escapeHtml(item.otherUid || "")}" data-other-name="${escapeHtml(item.otherName || "Student")}">
        <span class="conversation-item-head">
          ${avatar(item.otherName, item.otherProfilePicture)}
          <span class="conversation-item-meta">
            <strong class="conversation-item-name">${escapeHtml(item.otherName || "Student")}</strong>
            <time class="conversation-item-time">${escapeHtml(formatTime(item.lastMessageAt || item.updatedAt))}</time>
            ${unread ? `<span class="unread-badge">${escapeHtml(String(unread))}</span>` : ""}
          </span>
        </span>
        <span class="conversation-item-preview">${escapeHtml(item.lastMessage || item.lastMessagePreview || "Conversation accepted")}</span>
      </button>
    `;
  }).join("") : '<p class="empty-list">Your accepted conversations will appear here.</p>';
}

function renderRequests(items = []) {
  const pending = items.filter((item) => item?.status === "pending");
  requestCount.textContent = String(pending.length);
  requestList.innerHTML = pending.length ? pending.map((item) => `
    <article class="request-card">
      <div class="conversation-item-head">
        ${avatar(item.senderName, item.senderProfilePicture)}
        <strong>${escapeHtml(item.senderName || "Student")}</strong>
        <time class="conversation-item-time">${escapeHtml(formatTime(item.createdAt))}</time>
      </div>
      <p>${escapeHtml(item.initialMessage || "")}</p>
      <div class="request-actions">
        <button type="button" class="button button-primary" data-request-action="accepted" data-request-id="${escapeHtml(item.id)}">Accept</button>
        <button type="button" class="button button-quiet" data-request-action="declined" data-request-id="${escapeHtml(item.id)}">Decline</button>
        <button type="button" class="button button-quiet" data-request-action="blocked" data-request-id="${escapeHtml(item.id)}">Block</button>
      </div>
    </article>
  `).join("") : '<p class="empty-list">No pending message requests.</p>';
}

function renderBlocked(items = []) {
  blockedList.innerHTML = items.length ? items.map((item) => `
    <article class="blocked-card">
      <div class="conversation-item-head">
        ${avatar(item.name, item.profilePicture)}
        <strong class="conversation-item-name">${escapeHtml(item.name || "Student")}</strong>
      </div>
      <button type="button" class="button button-quiet button-small" data-unblock-uid="${escapeHtml(item.uid)}">Unblock</button>
    </article>
  `).join("") : '<p class="empty-list">You have not blocked any students.</p>';
}

function renderNotifications(items = []) {
  const unread = items.filter((item) => item?.read !== true).length;
  notificationCount.textContent = String(unread);
  notificationList.innerHTML = items.length ? items.map((item) => `
    <article class="blocked-card">
      <strong>${escapeHtml(item.title || "Message update")}</strong>
      <p>${escapeHtml(item.message || "")}</p>
      <time class="conversation-item-time">${escapeHtml(formatTime(item.createdAt))}</time>
      ${item.read !== true ? `<button type="button" class="button button-quiet button-small" data-read-notification="${escapeHtml(item.id)}">Mark read</button>` : '<span class="muted">Read</span>'}
    </article>
  `).join("") : '<p class="empty-list">No new alerts.</p>';
}

function renderChatHeader() {
  if (!selectedConversationId) {
    chatHeader.innerHTML = '<div class="chat-empty">Choose a conversation or find a student to send a request.</div>';
    return;
  }
  chatHeader.innerHTML = `
    <button class="button button-quiet mobile-back" type="button" data-back-to-list aria-label="Back to conversations">Back</button>
    <div class="chat-header-person">
      ${avatar(selectedOtherName)}
      <div><strong>${escapeHtml(selectedOtherName || "Student")}</strong><span class="muted">Text-only conversation</span></div>
    </div>
    <button class="button button-quiet button-small" type="button" data-block-active>Block</button>
  `;
}

function renderMessages(items = []) {
  if (!items.length) {
    chatMessages.innerHTML = '<p class="chat-empty">No messages yet.</p>';
    return;
  }
  let priorDate = "";
  chatMessages.innerHTML = items.map((message) => {
    const date = formatDate(message.createdAt);
    const separator = date && date !== priorDate ? `<div class="chat-date">${escapeHtml(date)}</div>` : "";
    priorDate = date;
    const mine = message.senderUid === activeUserUid;
    return `${separator}
      <div class="message-row${mine ? " mine" : ""}">
        <div class="message-bubble">
          <span>${escapeHtml(message.text || "")}</span>
          <time class="message-time">${escapeHtml(formatTime(message.createdAt))}</time>
        </div>
      </div>`;
  }).join("");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadConversationList() {
  const result = await apiRequest("/api/messages/conversations");
  renderConversationList(result.items || []);
}

async function loadRequests() {
  const result = await apiRequest("/api/messages/requests");
  renderRequests(result.items || []);
}

async function loadBlocked() {
  const result = await apiRequest("/api/messages/blocked");
  renderBlocked(result.items || []);
}

async function loadNotifications() {
  const result = await apiRequest("/api/messages/notifications");
  renderNotifications(result.items || []);
}

async function markConversationRead(conversationId) {
  await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`, { method: "POST" });
}

function attachMessageStream(conversationId) {
  clearMessageListener();
  const messagesRef = query(
    ref(database, `messaging/messages/${conversationId}`),
    orderByChild("createdAt"),
    limitToLast(200)
  );
  activeMessageRef = messagesRef;
  activeMessageListener = onValue(messagesRef, (snapshot) => {
    const messages = Object.values(snapshot.val() || {})
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    renderMessages(messages);
    const latestIncoming = [...messages].reverse().find((item) => item.senderUid !== activeUserUid);
    if (latestIncoming && latestIncoming.id !== lastReadMessageId) {
      lastReadMessageId = latestIncoming.id;
      markConversationRead(conversationId).catch((error) => showChatStatus(error.message || "Could not update read status."));
    }
  }, (error) => {
    showChatStatus(error.message || "Realtime messages are temporarily unavailable.");
  });
}

async function selectConversation(conversationId, otherUid, otherName) {
  selectedConversationId = conversationId;
  selectedOtherUid = otherUid;
  selectedOtherName = otherName || "Student";
  lastReadMessageId = "";
  document.body.classList.add("chat-open");
  renderChatHeader();
  messageInput.disabled = false;
  sendButton.disabled = false;
  showChatStatus("");
  attachMessageStream(conversationId);
  try {
    const result = await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`);
    renderMessages(result.messages || []);
    await markConversationRead(conversationId);
  } catch (error) {
    showChatStatus(error.message || "Could not open this conversation.");
  }
}

conversationList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-conversation-id]");
  if (button) selectConversation(button.dataset.conversationId, button.dataset.otherUid, button.dataset.otherName);
});

async function respondToRequest(requestId, status) {
  const result = await apiRequest(`/api/messages/requests/${encodeURIComponent(requestId)}`, {
    method: "PUT",
    body: { status }
  });
  if (status === "accepted" && result.conversation) {
    selectConversation(result.conversation.id, result.conversation.otherUid, result.conversation.otherName);
  }
  await Promise.all([loadRequests(), loadConversationList()]);
}

requestList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-request-action]");
  if (!button) return;
  button.disabled = true;
  try {
    await respondToRequest(button.dataset.requestId, button.dataset.requestAction);
  } catch (error) {
    button.disabled = false;
    showSearchMessage(error.message || "Could not update the message request.");
  }
});

blockedList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-unblock-uid]");
  if (!button) return;
  button.disabled = true;
  try {
    await apiRequest(`/api/messages/blocked/${encodeURIComponent(button.dataset.unblockUid)}`, { method: "DELETE" });
    await Promise.all([loadBlocked(), loadConversationList()]);
  } catch (error) {
    button.disabled = false;
    showSearchMessage(error.message || "Could not unblock this student.");
  }
});

notificationList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-read-notification]");
  if (!button) return;
  button.disabled = true;
  try {
    await apiRequest(`/api/messages/notifications/${encodeURIComponent(button.dataset.readNotification)}/read`, { method: "POST" });
    await loadNotifications();
  } catch (error) {
    button.disabled = false;
    showSearchMessage(error.message || "Could not update this alert.");
  }
});

chatHeader.addEventListener("click", async (event) => {
  if (event.target.closest("[data-back-to-list]")) {
    document.body.classList.remove("chat-open");
    return;
  }
  if (!event.target.closest("[data-block-active]") || !selectedOtherUid) return;
  if (!window.confirm(`Block ${selectedOtherName}? They will not be able to message you.`)) return;
  try {
    await apiRequest("/api/messages/blocked", { method: "POST", body: { otherUid: selectedOtherUid } });
    clearMessageListener();
    selectedConversationId = "";
    selectedOtherUid = "";
    selectedOtherName = "";
    messageInput.disabled = true;
    sendButton.disabled = true;
    document.body.classList.remove("chat-open");
    renderChatHeader();
    renderMessages([]);
    await Promise.all([loadBlocked(), loadConversationList()]);
  } catch (error) {
    showChatStatus(error.message || "Could not block this student.");
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matric = matricInput.value.trim();
  if (!matric) {
    showSearchMessage("Enter a matriculation number to search.");
    return;
  }
  const validationError = matricSearchError(matric);
  if (validationError) {
    showSearchMessage(validationError);
    return;
  }
  const button = searchForm.querySelector('button[type="submit"]');
  button.disabled = true;
  showSearchMessage("Searching verified student records…", true);
  try {
    const result = await apiRequest(`/api/messages/search?matric=${encodeURIComponent(matric)}`);
    const student = result.user;
    searchState.innerHTML = `
      <div class="result-box">
        <div class="conversation-item-head">${avatar(student.name, student.profilePicture)}
          <div><strong>${escapeHtml(student.name)}</strong><div class="muted">${escapeHtml(student.department || "Department not set")} · ${escapeHtml(student.level || "Level not set")}</div></div>
        </div>
        <form id="message-request-form" class="message-request-form">
          <label class="field" for="request-message">Initial message</label>
          <textarea id="request-message" name="text" rows="3" maxlength="2000" required placeholder="Introduce yourself and say why you would like to connect."></textarea>
          <button class="button button-primary button-small" type="submit">Send message request</button>
        </form>
      </div>`;
    searchState.querySelector("#message-request-form").addEventListener("submit", async (requestEvent) => {
      requestEvent.preventDefault();
      const sendRequestButton = requestEvent.currentTarget.querySelector('button[type="submit"]');
      sendRequestButton.disabled = true;
      const requestId = requestEvent.currentTarget.dataset.requestId || newId();
      requestEvent.currentTarget.dataset.requestId = requestId;
      try {
        const text = String(new FormData(requestEvent.currentTarget).get("text") || "");
        const response = await apiRequest("/api/messages/requests", {
          method: "POST",
          body: { recipientUid: student.uid, text, requestId }
        });
        showSearchMessage(response.status === "pending"
          ? "Message request sent. A conversation will open after the student accepts."
          : "Your request is already in progress.", true);
        sendRequestButton.textContent = "Request sent";
      } catch (error) {
        sendRequestButton.disabled = false;
        showSearchMessage(error.message || "Could not send this message request.");
      }
    });
  } catch (error) {
    showSearchMessage(error.message || "No verified student was found.");
  } finally {
    button.disabled = false;
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedConversationId) return;
  const text = messageInput.value.trim();
  if (!text) {
    showChatStatus("A message cannot be empty.");
    return;
  }
  if (!pendingMessage || pendingMessage.text !== text) pendingMessage = { text, id: newId() };
  sendButton.disabled = true;
  try {
    await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages`, {
      method: "POST",
      body: { text, messageId: pendingMessage.id }
    });
    pendingMessage = null;
    messageInput.value = "";
    showChatStatus("");
    await loadConversationList();
    messageInput.focus();
  } catch (error) {
    showChatStatus(error.message || "Could not send your message. You can retry safely.");
  } finally {
    sendButton.disabled = false;
  }
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

function subscribeToRealtimeLists() {
  const conversationRef = ref(database, `messaging/userConversations/${activeUserUid}`);
  activeConversationRef = conversationRef;
  activeConversationListener = onValue(conversationRef, (snapshot) => {
    const items = Object.values(snapshot.val() || {}).filter((item) => item?.hidden !== true).map((item) => ({
      ...item,
      id: item.conversationId || item.id,
      lastMessage: item.lastMessagePreview || "",
      updatedAt: Number(item.updatedAt || item.lastMessageAt) || 0
    }));
    renderConversationList(items);
    if (selectedConversationId && !items.some((item) => item.id === selectedConversationId)) {
      clearMessageListener();
      selectedConversationId = "";
      selectedOtherUid = "";
      selectedOtherName = "";
      document.body.classList.remove("chat-open");
      renderChatHeader();
      renderMessages([]);
      messageInput.disabled = true;
      sendButton.disabled = true;
    }
  }, (error) => showSearchMessage(error.message || "Could not sync your conversations."));

  const requestRef = ref(database, `messaging/userRequests/${activeUserUid}`);
  activeRequestRef = requestRef;
  activeRequestListener = onValue(requestRef, (snapshot) => {
    renderRequests(Object.values(snapshot.val() || {}));
  }, (error) => showSearchMessage(error.message || "Could not sync message requests."));

  const notificationRef = ref(database, `messaging/notifications/${activeUserUid}`);
  activeNotificationRef = notificationRef;
  activeNotificationListener = onValue(notificationRef, (snapshot) => {
    const items = Object.values(snapshot.val() || {}).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    renderNotifications(items);
  }, (error) => showSearchMessage(error.message || "Could not sync alerts."));
}

onAuthStateChanged(auth, async (user) => {
  clearPageListeners();
  if (!user) {
    window.location.replace("./login.html");
    return;
  }
  activeUserUid = user.uid;
  initNavigation("messages");
  messageInput.disabled = true;
  sendButton.disabled = true;
  try {
    await Promise.all([loadConversationList(), loadRequests(), loadBlocked(), loadNotifications()]);
    subscribeToRealtimeLists();
  } catch (error) {
    showSearchMessage(error.message || "Could not load messages. Please try again.");
  }
});
