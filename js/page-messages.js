import {
  dbLimitToLast,
  dbOff,
  dbOnDisconnect,
  dbOnValue,
  dbOrderByChild,
  dbQuery,
  dbRef,
  dbSet,
  firebaseEnabled,
  watchAuthState
} from "./firebase-config.js";
import { apiRequest } from "./api.js";
import { initNavigation } from "./nav.js";

const searchForm = document.querySelector("#student-search-form");
const matricInput = document.querySelector("#matric-input");
const matricCount = document.querySelector("#matric-search-count");
const searchState = document.querySelector("#search-state");
const conversationFilterInput = document.querySelector("#conversation-filter-input");
const conversationList = document.querySelector("#conversation-list");
const conversationCount = document.querySelector("#conversation-count");
const requestList = document.querySelector("#request-list");
const outgoingRequestList = document.querySelector("#outgoing-request-list");
const requestCount = document.querySelector("#request-count");
const notificationList = document.querySelector("#notification-list");
const notificationCount = document.querySelector("#notification-count");
const blockedList = document.querySelector("#blocked-list");
const chatHeader = document.querySelector("#chat-header");
const chatHeaderMenu = document.querySelector("#chat-header-menu");
const chatMessages = document.querySelector("#chat-messages");
const scrollBottomBtn = document.querySelector("#scroll-bottom-btn");
const scrollBottomBadge = document.querySelector("#scroll-bottom-badge");
const typingIndicator = document.querySelector("#typing-indicator");
const chatStatus = document.querySelector("#chat-status");
const replyPreviewBar = document.querySelector("#reply-preview-bar");
const replyPreviewSender = document.querySelector("#reply-preview-sender");
const replyPreviewText = document.querySelector("#reply-preview-text");
const cancelReplyBtn = document.querySelector("#cancel-reply-btn");
const emojiToggleBtn = document.querySelector("#emoji-toggle-btn");
const emojiPicker = document.querySelector("#emoji-picker");
const emojiGrid = document.querySelector("#emoji-grid");
const chatForm = document.querySelector("#chat-form");
const messageInput = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const contextMenu = document.querySelector("#message-context-menu");
const forwardDialog = document.querySelector("#forward-dialog");
const forwardPreview = document.querySelector("#forward-preview");
const forwardTargets = document.querySelector("#forward-targets");
const forwardCloseBtn = document.querySelector("#forward-close-btn");

const EMOJI_SETS = {
  smileys: ["😀", "😄", "😁", "😅", "😂", "😊", "😇", "😉", "😍", "🥳", "😎", "🤔", "😮", "😢", "🙏", "🔥"],
  study: ["📚", "📖", "📝", "✏️", "💻", "🧮", "🔬", "🎓", "🏫", "📅", "⏰", "📌", "✅", "💡", "🧠", "📊"],
  gestures: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🫶", "💪", "👋", "👌", "🫡", "☝️", "✍️", "👀", "☕"],
  symbols: ["❤️", "💙", "💚", "⭐", "⚡", "💯", "🎉", "📣", "📍", "🔔", "⏳", "✨", "🚀", "🏆", "💬", "🔒"]
};

const PAGE_SIZE = 50;

let activeUserUid = "";
let activeUserDisplayName = "You";
let selectedConversationId = "";
let selectedOtherUid = "";
let selectedOtherName = "";
let selectedOtherPicture = "";
let cachedConversations = [];
let cachedPresence = new Map();
let visibleMessages = [];
let olderMessages = [];
let streamMessages = [];
let hasMoreOlderMessages = false;
let loadingOlder = false;
let unreadDividerMessageId = "";
let unseenBelowCount = 0;

let replyDraft = null; // { id, senderUid, senderName, text }
let pendingMessage = null;
let optimisticSendingMessage = null;
let forwardSourceMessage = null;
let activeEmojiCategory = "smileys";
let contextMenuMessageId = "";

let activeConversationListener = null;
let activeConversationRef = null;
let activeRequestListener = null;
let activeRequestRef = null;
let activeOutgoingRequestListener = null;
let activeOutgoingRequestRef = null;
let activeNotificationListener = null;
let activeNotificationRef = null;
let activeMessageListener = null;
let activeMessageRef = null;
let activeTypingListener = null;
let activeTypingRef = null;
let activePresenceListener = null;
let activePresenceRef = null;
let presenceHeartbeatTimer = null;
let typingStopTimer = null;
let lastTypingSentAt = 0;
let localSyncTimer = null;
let lastReadMessageId = "";
let hasLoadedInitialNotifications = false;
let otherTypingState = { isTyping: false, updatedAt: 0 };
let presenceVisibilityBound = false;

const knownNotificationIds = new Set();
const knownOutgoingStatuses = new Map();
const lastDeliveredAtByConv = new Map();

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function avatar(name, imageUrl = "", online = false) {
  const image = typeof imageUrl === "string" && /^https:\/\/\S+$/i.test(imageUrl)
    ? `<img src="${escapeHtml(imageUrl)}" alt="" referrerpolicy="no-referrer">`
    : escapeHtml(String(name || "S").trim().charAt(0).toUpperCase() || "S");
  const dot = online ? '<span class="presence-dot" aria-label="Online"></span>' : "";
  return `<span class="student-avatar" aria-hidden="true">${image}${dot}</span>`;
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp) || 0);
  return Number.isNaN(date.getTime()) || !Number(timestamp)
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(timestamp) {
  const value = Number(timestamp) || 0;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const targetDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (targetDayStart === todayStart) return "Today";
  if (targetDayStart === yesterdayStart) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function formatListTime(timestamp) {
  const value = Number(timestamp) || 0;
  if (!value) return "";
  const label = formatDayLabel(value);
  return label === "Today" ? formatTime(value) : label;
}

function newId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isCoarsePointer() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
}

function showSearchMessage(message, success = false) {
  searchState.innerHTML = message
    ? `<div class="${success ? "result-box" : "error-box"}">${escapeHtml(message)}</div>`
    : "";
}

function showChatStatus(message, success = false) {
  chatStatus.innerHTML = message
    ? `<div class="${success ? "result-box" : "error-box"}">${escapeHtml(message)}</div>`
    : "";
  if (success && message) {
    setTimeout(() => {
      if (chatStatus.textContent === message) chatStatus.innerHTML = "";
    }, 2400);
  }
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
  matricCount.textContent = `${normalized.length}/9`;
  const error = matricSearchError(matricInput.value);
  if (error) showSearchMessage(error);
  else if (searchState.querySelector(".error-box")) showSearchMessage("");
});

function clearListener(refValue, listener) {
  if (refValue && listener) dbOff(refValue, "value", listener);
}

function clearMessageStreamAndPresence() {
  clearListener(activeMessageRef, activeMessageListener);
  clearListener(activeTypingRef, activeTypingListener);
  clearListener(activePresenceRef, activePresenceListener);
  activeMessageRef = null;
  activeMessageListener = null;
  activeTypingRef = null;
  activeTypingListener = null;
  activePresenceRef = null;
  activePresenceListener = null;
  otherTypingState = { isTyping: false, updatedAt: 0 };
  updateTypingIndicatorUI();
}

function clearPageListeners() {
  clearMessageStreamAndPresence();
  clearListener(activeConversationRef, activeConversationListener);
  clearListener(activeRequestRef, activeRequestListener);
  clearListener(activeOutgoingRequestRef, activeOutgoingRequestListener);
  clearListener(activeNotificationRef, activeNotificationListener);
  if (localSyncTimer) {
    clearInterval(localSyncTimer);
    localSyncTimer = null;
  }
  if (presenceHeartbeatTimer) {
    clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = null;
  }
  if (typingStopTimer) {
    clearTimeout(typingStopTimer);
    typingStopTimer = null;
  }
  activeConversationRef = null;
  activeConversationListener = null;
  activeRequestRef = null;
  activeRequestListener = null;
  activeOutgoingRequestRef = null;
  activeOutgoingRequestListener = null;
  activeNotificationRef = null;
  activeNotificationListener = null;
  hasLoadedInitialNotifications = false;
  knownNotificationIds.clear();
  knownOutgoingStatuses.clear();
  lastDeliveredAtByConv.clear();
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

function closePopovers() {
  contextMenu.hidden = true;
  contextMenuMessageId = "";
  if (chatHeaderMenu) chatHeaderMenu.hidden = true;
}

function closeEmojiPicker() {
  emojiPicker.hidden = true;
  emojiToggleBtn.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", (event) => {
  if (!event.target.closest("#message-context-menu") && !event.target.closest("[data-msg-menu]")) {
    contextMenu.hidden = true;
    contextMenuMessageId = "";
  }
  if (!event.target.closest("#chat-header-menu") && !event.target.closest("[data-chat-menu-toggle]")) {
    if (chatHeaderMenu) chatHeaderMenu.hidden = true;
  }
  if (!event.target.closest("#emoji-picker") && !event.target.closest("#emoji-toggle-btn")) {
    closeEmojiPicker();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopovers();
    closeEmojiPicker();
  }
});

function renderEmojiGrid(category = activeEmojiCategory) {
  activeEmojiCategory = EMOJI_SETS[category] ? category : "smileys";
  emojiPicker.querySelectorAll("[data-emoji-category]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.emojiCategory === activeEmojiCategory);
  });
  emojiGrid.innerHTML = EMOJI_SETS[activeEmojiCategory].map((emoji) => `
    <button type="button" class="emoji-btn" data-emoji-char="${escapeHtml(emoji)}" aria-label="Insert ${escapeHtml(emoji)}">${emoji}</button>
  `).join("");
}

emojiPicker.addEventListener("click", (event) => {
  const catBtn = event.target.closest("[data-emoji-category]");
  if (catBtn) {
    renderEmojiGrid(catBtn.dataset.emojiCategory);
    return;
  }
  const emojiBtn = event.target.closest("[data-emoji-char]");
  if (emojiBtn) {
    const emoji = emojiBtn.dataset.emojiChar || "";
    const start = Number.isInteger(messageInput.selectionStart) ? messageInput.selectionStart : messageInput.value.length;
    const end = Number.isInteger(messageInput.selectionEnd) ? messageInput.selectionEnd : messageInput.value.length;
    messageInput.value = `${messageInput.value.slice(0, start)}${emoji}${messageInput.value.slice(end)}`;
    const nextPos = start + emoji.length;
    messageInput.focus();
    messageInput.setSelectionRange?.(nextPos, nextPos);
    autoResizeComposer();
    signalTypingActivity();
  }
});

emojiToggleBtn.addEventListener("click", () => {
  if (emojiToggleBtn.disabled) return;
  closePopovers();
  const nextHidden = !emojiPicker.hidden;
  emojiPicker.hidden = nextHidden;
  emojiToggleBtn.setAttribute("aria-expanded", String(!nextHidden));
  if (!nextHidden) renderEmojiGrid(activeEmojiCategory);
});

function autoResizeComposer() {
  messageInput.style.height = "auto";
  const max = 132;
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, max)}px`;
  sendButton.disabled = !selectedConversationId || (!messageInput.value.trim() && !optimisticSendingMessage);
}

function setReplyDraft(message) {
  if (!message || message.deletedForEveryone) return;
  const senderName = message.senderUid === activeUserUid ? activeUserDisplayName : selectedOtherName;
  replyDraft = {
    id: message.id,
    senderUid: message.senderUid,
    senderName: senderName || "Student",
    text: String(message.text || "").slice(0, 200)
  };
  replyPreviewSender.textContent = replyDraft.senderName;
  replyPreviewText.textContent = replyDraft.text;
  replyPreviewBar.hidden = false;
  messageInput.focus();
}

function clearReplyDraft() {
  replyDraft = null;
  replyPreviewBar.hidden = true;
  replyPreviewSender.textContent = "";
  replyPreviewText.textContent = "";
}

cancelReplyBtn.addEventListener("click", clearReplyDraft);

function isScrolledNearBottom() {
  const remaining = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
  return remaining < 120;
}

function updateScrollBottomButton() {
  if (!selectedConversationId) {
    scrollBottomBtn.hidden = true;
    return;
  }
  const show = !isScrolledNearBottom();
  scrollBottomBtn.hidden = !show;
  if (!show) {
    unseenBelowCount = 0;
  }
  scrollBottomBadge.hidden = unseenBelowCount <= 0;
  scrollBottomBadge.textContent = unseenBelowCount > 0 ? String(unseenBelowCount) : "";
}

chatMessages.addEventListener("scroll", updateScrollBottomButton, { passive: true });

scrollBottomBtn.addEventListener("click", () => {
  unseenBelowCount = 0;
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  updateScrollBottomButton();
});

function renderConversationList(items = cachedConversations) {
  cachedConversations = items;
  const query = String(conversationFilterInput?.value || "").trim().toLowerCase();
  const visible = items
    .filter((item) => item && item.hidden !== true)
    .filter((item) => !query || String(item.otherName || "").toLowerCase().includes(query) || String(item.lastMessage || item.lastMessagePreview || "").toLowerCase().includes(query))
    .sort((a, b) => Number(b.updatedAt || b.lastMessageAt || 0) - Number(a.updatedAt || a.lastMessageAt || 0));

  const totalVisible = items.filter((item) => item && item.hidden !== true).length;
  conversationCount.textContent = String(totalVisible);

  if (!visible.length) {
    conversationList.innerHTML = query
      ? '<p class="empty-list">No conversations match that name.</p>'
      : '<p class="empty-list">Your accepted conversations will appear here.</p>';
    return;
  }

  conversationList.innerHTML = visible.map((item) => {
    const id = item.id || item.conversationId || "";
    const active = id === selectedConversationId ? " active" : "";
    const unread = Number(item.unreadCount || 0);
    const hasUnread = unread > 0 ? " has-unread" : "";
    const presence = cachedPresence.get(item.otherUid);
    const online = Boolean(presence ? presence.online : item.otherOnline);
    const isTypingInRow = id === selectedConversationId && isOtherCurrentlyTyping();
    const previewText = isTypingInRow ? "typing…" : (item.lastMessage || item.lastMessagePreview || "Conversation accepted");
    return `
      <button type="button" class="conversation-item${active}${hasUnread}" data-conversation-id="${escapeHtml(id)}" data-other-uid="${escapeHtml(item.otherUid || "")}" data-other-name="${escapeHtml(item.otherName || "Student")}" data-other-picture="${escapeHtml(item.otherProfilePicture || "")}">
        <span class="conversation-item-row">
          ${avatar(item.otherName, item.otherProfilePicture, online)}
          <span class="conversation-item-content">
            <span class="conversation-item-head">
              <strong class="conversation-item-name">${escapeHtml(item.otherName || "Student")}</strong>
              <time class="conversation-item-time tabular-nums">${escapeHtml(formatListTime(item.lastMessageAt || item.updatedAt))}</time>
            </span>
            <span class="conversation-item-foot">
              <span class="conversation-item-preview${isTypingInRow ? " is-typing" : ""}">${escapeHtml(previewText)}</span>
              ${unread ? `<span class="unread-badge tabular-nums">${escapeHtml(String(unread))}</span>` : ""}
            </span>
          </span>
        </span>
      </button>
    `;
  }).join("");
}

conversationFilterInput?.addEventListener("input", () => renderConversationList());

function renderRequests(items = []) {
  const pending = items.filter((item) => item?.status === "pending");
  requestCount.textContent = String(pending.length);
  requestList.innerHTML = pending.length ? pending.map((item) => `
    <article class="request-card" data-request-card="${escapeHtml(item.id)}">
      <div class="conversation-item-head">
        ${avatar(item.senderName, item.senderProfilePicture)}
        <strong>${escapeHtml(item.senderName || "Student")}</strong>
        <time class="conversation-item-time tabular-nums">${escapeHtml(formatTime(item.createdAt))}</time>
      </div>
      <p>${escapeHtml(item.initialMessage || "")}</p>
      <div class="request-actions">
        <button type="button" class="button button-primary" data-request-action="accepted" data-request-id="${escapeHtml(item.id)}">Accept</button>
        <button type="button" class="button button-quiet" data-request-action="declined" data-request-id="${escapeHtml(item.id)}">Decline</button>
        <button type="button" class="button button-quiet" data-request-action="blocked" data-request-id="${escapeHtml(item.id)}">Block</button>
      </div>
    </article>
  `).join("") : '<p class="empty-list">No pending incoming requests.</p>';
}

function renderOutgoingRequests(items = []) {
  if (!outgoingRequestList) return;
  const visible = items
    .filter((item) => item && ["pending", "accepted", "declined"].includes(item.status))
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));

  for (const item of visible) {
    const previousStatus = knownOutgoingStatuses.get(item.id);
    if (previousStatus === "pending" && item.status === "accepted") {
      showSearchMessage("Your message request was accepted.", true);
      loadConversationList().catch(() => {});
    } else if (previousStatus === "pending" && item.status === "declined") {
      showSearchMessage("Your message request was declined.");
    }
    knownOutgoingStatuses.set(item.id, item.status);
  }

  const pendingOutgoing = visible.filter((item) => item.status === "pending");
  const recentHandled = visible.filter((item) => item.status !== "pending").slice(0, 5);
  const displayList = [...pendingOutgoing, ...recentHandled];

  outgoingRequestList.innerHTML = displayList.length ? `
    <div class="request-card"><strong>Sent requests</strong></div>
    ${displayList.map((item) => {
      const label = item.status === "accepted" ? "Accepted" : item.status === "declined" ? "Declined" : "Pending";
      return `
        <article class="request-card">
          <div class="conversation-item-head">
            ${avatar(item.recipientName, item.recipientProfilePicture)}
            <strong>${escapeHtml(item.recipientName || "Student")}</strong>
            <time class="conversation-item-time">${escapeHtml(label)}</time>
          </div>
          <p>${escapeHtml(item.initialMessage || "")}</p>
        </article>
      `;
    }).join("")}
  ` : "";
}

function renderBlocked(items = []) {
  blockedList.innerHTML = items.length ? items.map((item) => `
    <article class="blocked-card">
      <div class="conversation-item-head">
        ${avatar(item.name, item.profilePicture)}
        <strong class="conversation-item-name">${escapeHtml(item.name || "Student")}</strong>
        <button type="button" class="button button-quiet button-small" data-unblock-uid="${escapeHtml(item.uid)}">Unblock</button>
      </div>
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
      <div class="conversation-item-head">
        <time class="conversation-item-time tabular-nums">${escapeHtml(formatTime(item.createdAt))}</time>
        ${item.read !== true ? `<button type="button" class="button button-quiet button-small" data-read-notification="${escapeHtml(item.id)}">Mark read</button>` : '<span class="muted">Read</span>'}
      </div>
    </article>
  `).join("") : '<p class="empty-list">No new alerts.</p>';
}

function isOtherCurrentlyTyping() {
  return Boolean(otherTypingState.isTyping && Date.now() - Number(otherTypingState.updatedAt || 0) < 8000);
}

function getHeaderStatusText() {
  if (isOtherCurrentlyTyping()) return { text: "typing…", cls: "is-typing" };
  const presence = cachedPresence.get(selectedOtherUid);
  if (presence?.online && Date.now() - Number(presence.lastSeenAt || 0) < 120_000) {
    return { text: "Online", cls: "is-online" };
  }
  if (presence?.lastSeenAt) {
    const day = formatDayLabel(presence.lastSeenAt);
    const time = formatTime(presence.lastSeenAt);
    return { text: day === "Today" ? `Last seen today at ${time}` : `Last seen ${day} at ${time}`, cls: "" };
  }
  return { text: "Verified student conversation", cls: "" };
}

function renderChatHeader() {
  if (!selectedConversationId) {
    chatHeader.innerHTML = `
      <div class="chat-header-placeholder">
        <strong>Select a conversation</strong>
        <span class="muted">Choose a chat on the left or search a student's matric number to connect.</span>
      </div>`;
    return;
  }
  const presence = cachedPresence.get(selectedOtherUid);
  const online = Boolean(presence?.online && Date.now() - Number(presence.lastSeenAt || 0) < 120_000);
  const status = getHeaderStatusText();

  chatHeader.innerHTML = `
    <div class="chat-header-left">
      <button class="icon-trigger mobile-back" type="button" data-back-to-list aria-label="Back to conversations">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="chat-header-person">
        ${avatar(selectedOtherName, selectedOtherPicture, online)}
        <div class="chat-header-meta">
          <strong>${escapeHtml(selectedOtherName || "Student")}</strong>
          <span class="chat-presence-text ${status.cls}">${escapeHtml(status.text)}</span>
        </div>
      </div>
    </div>
    <button class="icon-trigger" type="button" data-chat-menu-toggle aria-label="Conversation options" aria-expanded="false">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    </button>
  `;
}

function updateTypingIndicatorUI() {
  const active = Boolean(selectedConversationId && isOtherCurrentlyTyping());
  typingIndicator.hidden = !active;
  if (active) {
    typingIndicator.innerHTML = `
      <span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>
      <span>${escapeHtml(selectedOtherName || "Student")} is typing…</span>
    `;
  } else {
    typingIndicator.innerHTML = "";
  }
  if (selectedConversationId) {
    renderChatHeader();
    renderConversationList();
  }
}

function deliveryReceiptMarkup(message) {
  if (message.deliveryStatus === "sending" || message._optimistic) {
    return `<span class="receipt-icon" title="Sending" aria-label="Sending"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>`;
  }
  const isRead = message.deliveryStatus === "read" || Boolean(selectedOtherUid && message.readBy?.[selectedOtherUid] === true);
  if (isRead) {
    const readTitle = message.readAt ? `Read at ${formatTime(message.readAt)}` : "Read";
    return `<span class="receipt-icon is-read" title="${escapeHtml(readTitle)}" aria-label="Read"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l5 5L17 7"/><path d="M9 12l5 5 8-9"/></svg></span>`;
  }
  if (message.deliveryStatus === "delivered") {
    return `<span class="receipt-icon" title="Delivered" aria-label="Delivered"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l5 5L17 7"/><path d="M9 12l5 5 8-9"/></svg></span>`;
  }
  return `<span class="receipt-icon" title="Sent" aria-label="Sent"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>`;
}

function mergeVisibleMessages() {
  const byId = new Map();
  for (const item of [...olderMessages, ...streamMessages]) {
    if (!item || !item.id || item.deletedFor?.[activeUserUid] === true) continue;
    byId.set(item.id, item);
  }
  if (optimisticSendingMessage && !byId.has(optimisticSendingMessage.id)) {
    byId.set(optimisticSendingMessage.id, optimisticSendingMessage);
  }
  visibleMessages = [...byId.values()].sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
  return visibleMessages;
}

function renderMessages({ scrollMode = "auto" } = {}) {
  if (!selectedConversationId) {
    chatMessages.innerHTML = `
      <div class="chat-empty-state">
        <div class="chat-empty-mark" aria-hidden="true">A</div>
        <h2>AFITStudentLife Messages</h2>
        <p>Select a classmate from the sidebar to read messages, reply directly with quotes, and see real-time delivery updates.</p>
      </div>`;
    return;
  }

  const prevScrollTop = chatMessages.scrollTop;
  const prevScrollHeight = chatMessages.scrollHeight;
  const wasNearBottom = isScrolledNearBottom();

  const items = mergeVisibleMessages();
  if (!items.length) {
    chatMessages.innerHTML = '<div class="chat-empty-state"><p>No messages yet. Say hello to start the conversation.</p></div>';
    return;
  }

  let priorDate = "";
  let priorSender = "";
  let priorTime = 0;

  const olderButton = hasMoreOlderMessages
    ? `<div class="load-older-wrap"><button type="button" id="load-older-btn" class="load-older-btn" ${loadingOlder ? "disabled" : ""}>${loadingOlder ? "Loading…" : "Load older messages"}</button></div>`
    : "";

  const html = items.map((message) => {
    const dayLabel = formatDayLabel(message.createdAt);
    const dateSeparator = dayLabel && dayLabel !== priorDate ? `<div class="chat-date">${escapeHtml(dayLabel)}</div>` : "";
    const unreadSeparator = unreadDividerMessageId && message.id === unreadDividerMessageId
      ? '<div class="unread-divider"><span>Unread messages</span></div>'
      : "";

    const sameSenderSameDay = !dateSeparator && !unreadSeparator && priorSender === message.senderUid && (Number(message.createdAt) - priorTime) < 180_000;
    priorDate = dayLabel;
    priorSender = message.senderUid;
    priorTime = Number(message.createdAt) || 0;

    const mine = message.senderUid === activeUserUid;
    const isDeleted = message.deletedForEveryone === true;
    const groupedClass = sameSenderSameDay ? " is-grouped" : "";

    const quoteMarkup = !isDeleted && message.replyToMessageId ? `
      <button type="button" class="quoted-reply" data-jump-message-id="${escapeHtml(message.replyToMessageId)}">
        <span class="quoted-reply-sender">${escapeHtml(message.replyToSenderUid === activeUserUid ? activeUserDisplayName : (message.replyToSenderName || selectedOtherName || "Student"))}</span>
        <span class="quoted-reply-text">${escapeHtml(message.replyToText || "Original message")}</span>
      </button>
    ` : "";

    const hoverActions = `
      <div class="message-hover-actions">
        ${isDeleted ? "" : `<button type="button" class="msg-mini-btn" data-msg-reply="${escapeHtml(message.id)}" title="Reply" aria-label="Reply to message"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg></button>`}
        <button type="button" class="msg-mini-btn" data-msg-menu="${escapeHtml(message.id)}" title="More actions" aria-label="Message actions"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
      </div>
    `;

    const bodyText = isDeleted ? "This message was deleted" : String(message.text || "");

    return `${dateSeparator}${unreadSeparator}
      <div class="message-row${mine ? " mine" : ""}${groupedClass}" data-message-id="${escapeHtml(message.id)}">
        ${isDeleted ? "" : '<span class="swipe-reply-badge" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg></span>'}
        <div class="message-bubble${isDeleted ? " is-deleted" : ""}">
          ${quoteMarkup}
          <div class="message-text">${escapeHtml(bodyText)}</div>
          <div class="message-meta tabular-nums">
            <time>${escapeHtml(formatTime(message.createdAt))}</time>
            ${mine && !isDeleted ? deliveryReceiptMarkup(message) : ""}
          </div>
        </div>
        ${hoverActions}
      </div>`;
  }).join("");

  chatMessages.innerHTML = `${olderButton}${html}`;

  if (scrollMode === "preserve") {
    const newScrollHeight = chatMessages.scrollHeight;
    chatMessages.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
  } else if (scrollMode === "bottom" || (scrollMode === "auto" && wasNearBottom)) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    unseenBelowCount = 0;
  } else if (scrollMode === "auto" && !wasNearBottom) {
    unseenBelowCount += 1;
  }
  updateScrollBottomButton();
}

function jumpToOriginalMessage(targetMessageId) {
  if (!targetMessageId) return;
  const targetRow = chatMessages.querySelector(`[data-message-id="${CSS.escape(targetMessageId)}"]`);
  if (!targetRow) {
    showChatStatus(
      hasMoreOlderMessages
        ? "That quoted message is earlier in history. Tap 'Load older messages' above to jump to it."
        : "The original message could not be found."
    );
    return;
  }
  targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
  targetRow.classList.remove("is-highlighted");
  void targetRow.offsetWidth;
  targetRow.classList.add("is-highlighted");
  setTimeout(() => targetRow.classList.remove("is-highlighted"), 1600);
}

/* Swipe-to-reply (mobile) & drag-to-reply (desktop) with strict vertical scroll safety */
let activeSwipe = null;

chatMessages.addEventListener("pointerdown", (event) => {
  if (event.button && event.button !== 0) return;
  if (event.target.closest("button")) return;
  const row = event.target.closest(".message-row");
  if (!row) return;
  const msg = visibleMessages.find((item) => item.id === row.dataset.messageId);
  if (!msg || msg.deletedForEveryone) return;

  activeSwipe = {
    pointerId: event.pointerId,
    row,
    message: msg,
    startX: event.clientX,
    startY: event.clientY,
    directionLocked: "", // "horizontal" | "vertical"
    dx: 0
  };
});

chatMessages.addEventListener("pointermove", (event) => {
  if (!activeSwipe || activeSwipe.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - activeSwipe.startX;
  const deltaY = event.clientY - activeSwipe.startY;

  if (!activeSwipe.directionLocked) {
    if (Math.abs(deltaY) > 10 && Math.abs(deltaY) >= Math.abs(deltaX)) {
      activeSwipe.directionLocked = "vertical";
      activeSwipe = null;
      return;
    }
    if (deltaX > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      activeSwipe.directionLocked = "horizontal";
      activeSwipe.row.classList.add("is-swiping");
    } else if (deltaX < -12) {
      activeSwipe = null;
      return;
    }
  }

  if (activeSwipe?.directionLocked === "horizontal") {
    const clamped = Math.max(0, Math.min(deltaX, 72));
    activeSwipe.dx = clamped;
    activeSwipe.row.style.transform = `translate3d(${clamped}px, 0, 0)`;
    const badge = activeSwipe.row.querySelector(".swipe-reply-badge");
    if (badge) {
      const progress = Math.min(1, clamped / 44);
      badge.style.opacity = String(progress);
      badge.style.transform = `translateY(-50%) scale(${0.75 + progress * 0.25})`;
    }
    activeSwipe.row.classList.toggle("is-swipe-ready", clamped >= 44);
  }
});

function finishSwipe(event) {
  if (!activeSwipe || activeSwipe.pointerId !== event.pointerId) return;
  const { row, message, dx } = activeSwipe;
  activeSwipe = null;
  row.classList.remove("is-swiping", "is-swipe-ready");
  row.style.transform = "";
  const badge = row.querySelector(".swipe-reply-badge");
  if (badge) {
    badge.style.opacity = "";
    badge.style.transform = "";
  }
  if (dx >= 44) {
    navigator.vibrate?.(12);
    setReplyDraft(message);
  }
}

chatMessages.addEventListener("pointerup", finishSwipe);
chatMessages.addEventListener("pointercancel", finishSwipe);

/* Message click delegation (Quoted reply jump, Load older, Hover reply, Context menu trigger) */
chatMessages.addEventListener("click", (event) => {
  const loadOlderBtn = event.target.closest("#load-older-btn");
  if (loadOlderBtn) {
    loadOlderHistory();
    return;
  }

  const jumpBtn = event.target.closest("[data-jump-message-id]");
  if (jumpBtn) {
    jumpToOriginalMessage(jumpBtn.dataset.jumpMessageId);
    return;
  }

  const replyBtn = event.target.closest("[data-msg-reply]");
  if (replyBtn) {
    const msg = visibleMessages.find((item) => item.id === replyBtn.dataset.msgReply);
    if (msg) setReplyDraft(msg);
    return;
  }

  const menuBtn = event.target.closest("[data-msg-menu]");
  if (menuBtn) {
    event.stopPropagation();
    openMessageContextMenu(menuBtn.dataset.msgMenu, menuBtn);
  }
});

function positionPopover(menuEl, anchorEl) {
  menuEl.hidden = false;
  const rect = anchorEl.getBoundingClientRect();
  const menuRect = menuEl.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuRect.width - 8);
  const top = rect.bottom + menuRect.height + 8 <= window.innerHeight
    ? rect.bottom + 6
    : Math.max(8, rect.top - menuRect.height - 6);
  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
}

function openMessageContextMenu(messageId, anchorEl) {
  const msg = visibleMessages.find((item) => item.id === messageId);
  if (!msg) return;
  closeEmojiPicker();
  if (chatHeaderMenu) chatHeaderMenu.hidden = true;

  contextMenuMessageId = messageId;
  const mine = msg.senderUid === activeUserUid;
  const isDeleted = msg.deletedForEveryone === true;
  const forwardTargetsAvailable = cachedConversations.filter((c) => c && c.hidden !== true).length > 0;

  const actions = [];
  if (!isDeleted) {
    actions.push(`<button type="button" class="popover-menu-item" data-context-action="reply" role="menuitem">Reply</button>`);
    actions.push(`<button type="button" class="popover-menu-item" data-context-action="copy" role="menuitem">Copy text</button>`);
    if (forwardTargetsAvailable) {
      actions.push(`<button type="button" class="popover-menu-item" data-context-action="forward" role="menuitem">Forward</button>`);
    }
  }
  actions.push(`<button type="button" class="popover-menu-item" data-context-action="delete-me" role="menuitem">Delete for me</button>`);
  if (mine && !isDeleted) {
    actions.push(`<button type="button" class="popover-menu-item danger" data-context-action="delete-everyone" role="menuitem">Delete for everyone</button>`);
  }

  contextMenu.innerHTML = actions.join("");
  positionPopover(contextMenu, anchorEl);
}

contextMenu.addEventListener("click", async (event) => {
  const actionBtn = event.target.closest("[data-context-action]");
  if (!actionBtn) return;
  const action = actionBtn.dataset.contextAction;
  const msg = visibleMessages.find((item) => item.id === contextMenuMessageId);
  closePopovers();
  if (!msg) return;

  if (action === "reply") {
    setReplyDraft(msg);
  } else if (action === "copy") {
    try {
      await navigator.clipboard.writeText(msg.text || "");
      showChatStatus("Message copied.", true);
    } catch {
      showChatStatus("Could not copy message text.");
    }
  } else if (action === "forward") {
    openForwardModal(msg);
  } else if (action === "delete-me" || action === "delete-everyone") {
    const scope = action === "delete-everyone" ? "everyone" : "me";
    try {
      await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages/${encodeURIComponent(msg.id)}?scope=${scope}`, {
        method: "DELETE"
      });
      if (scope === "me") {
        streamMessages = streamMessages.filter((item) => item.id !== msg.id);
        olderMessages = olderMessages.filter((item) => item.id !== msg.id);
        renderMessages({ scrollMode: "preserve" });
      } else if (!firebaseEnabled) {
        const refreshed = await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages?limit=${PAGE_SIZE}`);
        streamMessages = refreshed.messages || [];
        renderMessages({ scrollMode: "preserve" });
      }
      await loadConversationList();
    } catch (error) {
      showChatStatus(error.message || "Could not delete this message.");
    }
  }
});

function openForwardModal(msg) {
  forwardSourceMessage = msg;
  const targets = cachedConversations.filter((c) => c && c.hidden !== true);
  if (!targets.length) return;
  forwardPreview.textContent = `"${String(msg.text || "").slice(0, 140)}${String(msg.text || "").length > 140 ? "…" : ""}"`;
  forwardTargets.innerHTML = targets.map((c) => `
    <button type="button" class="forward-target-btn" data-forward-target-id="${escapeHtml(c.id || c.conversationId)}" data-forward-target-name="${escapeHtml(c.otherName || "Student")}">
      <span>${escapeHtml(c.otherName || "Student")}</span>
      <span class="muted">Send &rarr;</span>
    </button>
  `).join("");
  forwardDialog.showModal();
}

forwardCloseBtn.addEventListener("click", () => {
  forwardSourceMessage = null;
  forwardDialog.close();
});

forwardTargets.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-forward-target-id]");
  if (!btn || !forwardSourceMessage) return;
  const targetId = btn.dataset.forwardTargetId;
  const targetName = btn.dataset.forwardTargetName || "Student";
  btn.disabled = true;
  try {
    await apiRequest(`/api/messages/conversations/${encodeURIComponent(targetId)}/messages`, {
      method: "POST",
      body: { text: forwardSourceMessage.text, messageId: newId() }
    });
    forwardSourceMessage = null;
    forwardDialog.close();
    showChatStatus(`Forwarded to ${targetName}.`, true);
    await loadConversationList();
  } catch (error) {
    btn.disabled = false;
    showChatStatus(error.message || "Could not forward this message.");
  }
});

async function syncDeliveredForConversations(items = []) {
  for (const item of items) {
    const convId = item.id || item.conversationId;
    if (!convId || Number(item.unreadCount || 0) <= 0 || convId === selectedConversationId) continue;
    const stamp = Number(item.lastMessageAt || item.updatedAt || 1);
    if (lastDeliveredAtByConv.get(convId) === stamp) continue;
    lastDeliveredAtByConv.set(convId, stamp);
    apiRequest(`/api/messages/conversations/${encodeURIComponent(convId)}/delivered`, { method: "POST" }).catch(() => {
      lastDeliveredAtByConv.delete(convId);
    });
  }
}

async function loadConversationList() {
  const result = await apiRequest("/api/messages/conversations");
  const items = result.items || [];
  for (const item of items) {
    if (item.otherUid) {
      cachedPresence.set(item.otherUid, {
        online: Boolean(item.otherOnline),
        lastSeenAt: Number(item.otherLastSeenAt) || 0
      });
    }
  }
  renderConversationList(items);
  syncDeliveredForConversations(items);
}

async function loadRequests() {
  const result = await apiRequest("/api/messages/requests");
  renderRequests(result.items || []);
  renderOutgoingRequests(result.outgoing || []);
}

async function loadBlocked() {
  const result = await apiRequest("/api/messages/blocked");
  renderBlocked(result.items || []);
}

async function loadNotifications() {
  const result = await apiRequest("/api/messages/notifications");
  const items = result.items || [];
  for (const item of items) {
    if (item?.id && !knownNotificationIds.has(item.id)) {
      if (hasLoadedInitialNotifications && item.type === "message-request-accepted" && item.read !== true) {
        showSearchMessage("Your message request was accepted.", true);
      }
      knownNotificationIds.add(item.id);
    }
  }
  hasLoadedInitialNotifications = true;
  renderNotifications(items);
}

async function markConversationRead(conversationId) {
  await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`, { method: "POST" });
}

async function loadOlderHistory() {
  if (!selectedConversationId || loadingOlder || !hasMoreOlderMessages) return;
  const oldest = mergeVisibleMessages()[0];
  if (!oldest?.createdAt) return;
  loadingOlder = true;
  renderMessages({ scrollMode: "preserve" });
  try {
    const result = await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(oldest.createdAt)}`);
    const incoming = result.messages || [];
    olderMessages = [...incoming, ...olderMessages];
    hasMoreOlderMessages = Boolean(result.hasMore);
  } catch (error) {
    showChatStatus(error.message || "Could not load older messages.");
  } finally {
    loadingOlder = false;
    renderMessages({ scrollMode: "preserve" });
  }
}

function attachConversationStreams(conversationId, otherUid) {
  clearMessageStreamAndPresence();
  if (!firebaseEnabled) return;

  const messagesRef = dbQuery(
    dbRef(`messaging/messages/${conversationId}`),
    dbOrderByChild("createdAt"),
    dbLimitToLast(PAGE_SIZE)
  );
  activeMessageRef = messagesRef;
  activeMessageListener = dbOnValue(messagesRef, (snapshot) => {
    const raw = Object.values(snapshot.val() || {})
      .filter((item) => item && item.deletedFor?.[activeUserUid] !== true)
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

    streamMessages = raw;
    if (optimisticSendingMessage && raw.some((item) => item.id === optimisticSendingMessage.id)) {
      optimisticSendingMessage = null;
    }

    renderMessages({ scrollMode: "auto" });

    const latestIncoming = [...raw].reverse().find((item) => item.senderUid !== activeUserUid);
    if (latestIncoming && (latestIncoming.id !== lastReadMessageId || !latestIncoming.readBy?.[activeUserUid])) {
      lastReadMessageId = latestIncoming.id;
      markConversationRead(conversationId).catch((error) => showChatStatus(error.message || "Could not update read status."));
    }
  }, (error) => {
    showChatStatus(error.message || "Realtime messages are temporarily unavailable.");
  });

  if (otherUid) {
    const typingRef = dbRef(`messaging/typing/${conversationId}/${otherUid}`);
    activeTypingRef = typingRef;
    activeTypingListener = dbOnValue(typingRef, (snapshot) => {
      const val = snapshot.val() || {};
      otherTypingState = { isTyping: Boolean(val.isTyping), updatedAt: Number(val.updatedAt) || 0 };
      updateTypingIndicatorUI();
    });

    const presenceRef = dbRef(`messaging/presence/${otherUid}`);
    activePresenceRef = presenceRef;
    activePresenceListener = dbOnValue(presenceRef, (snapshot) => {
      const val = snapshot.val() || {};
      cachedPresence.set(otherUid, {
        online: Boolean(val.online && Date.now() - Number(val.lastSeenAt || 0) < 120_000),
        lastSeenAt: Number(val.lastSeenAt) || 0
      });
      renderChatHeader();
      renderConversationList();
    });

    const myTypingRef = dbRef(`messaging/typing/${conversationId}/${activeUserUid}`);
    dbOnDisconnect(myTypingRef)?.set({ isTyping: false, updatedAt: Date.now() });
  }
}

async function selectConversation(conversationId, otherUid, otherName, otherPicture = "") {
  if (selectedConversationId && selectedConversationId !== conversationId) {
    publishTyping(false);
  }

  selectedConversationId = conversationId;
  selectedOtherUid = otherUid;
  selectedOtherName = otherName || "Student";
  selectedOtherPicture = otherPicture || cachedConversations.find((c) => (c.id || c.conversationId) === conversationId)?.otherProfilePicture || "";
  lastReadMessageId = "";
  olderMessages = [];
  streamMessages = [];
  hasMoreOlderMessages = false;
  unreadDividerMessageId = "";
  unseenBelowCount = 0;
  clearReplyDraft();
  closePopovers();
  closeEmojiPicker();

  const existingSummary = cachedConversations.find((c) => (c.id || c.conversationId) === conversationId);
  const previousUnreadCount = Number(existingSummary?.unreadCount || 0);

  document.body.classList.add("chat-open");
  messageInput.disabled = false;
  emojiToggleBtn.disabled = false;
  messageInput.placeholder = `Message ${selectedOtherName}…`;
  autoResizeComposer();
  renderChatHeader();
  renderConversationList();
  showChatStatus("");
  chatMessages.innerHTML = '<div class="chat-empty-state"><p>Loading messages…</p></div>';

  attachConversationStreams(conversationId, otherUid);
  try {
    const result = await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/messages?limit=${PAGE_SIZE}`);
    const fetched = result.messages || [];
    hasMoreOlderMessages = Boolean(result.hasMore);
    streamMessages = fetched;

    if (previousUnreadCount > 0) {
      const incoming = fetched.filter((m) => m.senderUid !== activeUserUid && !m.readBy?.[activeUserUid]);
      if (incoming.length) unreadDividerMessageId = incoming[0].id;
    }

    if (result.otherPresence && otherUid) {
      cachedPresence.set(otherUid, result.otherPresence);
    }
    otherTypingState = { isTyping: Boolean(result.otherTyping), updatedAt: Date.now() };
    updateTypingIndicatorUI();

    renderMessages({ scrollMode: "bottom" });
    await markConversationRead(conversationId);
    await loadConversationList();
  } catch (error) {
    showChatStatus(error.message || "Could not open this conversation.");
  }
}

conversationList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-conversation-id]");
  if (button) {
    selectConversation(
      button.dataset.conversationId,
      button.dataset.otherUid,
      button.dataset.otherName,
      button.dataset.otherPicture
    );
  }
});

async function respondToRequest(requestId, status) {
  const result = await apiRequest(`/api/messages/requests/${encodeURIComponent(requestId)}`, {
    method: "PUT",
    body: { status }
  });
  if (status === "accepted") {
    showSearchMessage("Request accepted. You can now start chatting.", true);
    showPanel("conversations-panel");
    await Promise.all([loadRequests(), loadConversationList()]);
    if (result.conversation) {
      await selectConversation(result.conversation.id, result.conversation.otherUid, result.conversation.otherName);
    }
    return;
  }
  if (status === "declined") {
    showSearchMessage("Message request declined.");
  } else if (status === "blocked") {
    showSearchMessage("Student blocked.");
    await loadBlocked();
  }
  await Promise.all([loadRequests(), loadConversationList()]);
}

requestList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-request-action]");
  if (!button) return;
  const card = button.closest("[data-request-card]");
  if (button.disabled || card?.dataset.submitting === "true") return;

  const action = button.dataset.requestAction;
  const requestId = button.dataset.requestId;
  const cardButtons = card ? [...card.querySelectorAll("button")] : [button];
  const originalText = button.textContent;
  const loadingLabels = {
    accepted: "Accepting…",
    declined: "Declining…",
    blocked: "Blocking…"
  };

  if (card) card.dataset.submitting = "true";
  cardButtons.forEach((btn) => { btn.disabled = true; });
  button.textContent = loadingLabels[action] || "Working…";

  try {
    await respondToRequest(requestId, action);
  } catch (error) {
    if (card) delete card.dataset.submitting;
    cardButtons.forEach((btn) => { btn.disabled = false; });
    button.textContent = originalText;
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

chatHeader.addEventListener("click", (event) => {
  if (event.target.closest("[data-back-to-list]")) {
    publishTyping(false);
    document.body.classList.remove("chat-open");
    return;
  }
  const menuBtn = event.target.closest("[data-chat-menu-toggle]");
  if (menuBtn && chatHeaderMenu) {
    event.stopPropagation();
    contextMenu.hidden = true;
    closeEmojiPicker();
    if (!chatHeaderMenu.hidden) {
      chatHeaderMenu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    } else {
      menuBtn.setAttribute("aria-expanded", "true");
      positionPopover(chatHeaderMenu, menuBtn);
    }
  }
});

chatHeaderMenu?.addEventListener("click", async (event) => {
  const actionBtn = event.target.closest("[data-chat-action]");
  if (!actionBtn) return;
  const action = actionBtn.dataset.chatAction;
  chatHeaderMenu.hidden = true;

  if (action === "jump-latest") {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    return;
  }
  if (action === "block-user" && selectedOtherUid) {
    if (!window.confirm(`Block ${selectedOtherName}? They will not be able to message you.`)) return;
    try {
      await apiRequest("/api/messages/blocked", { method: "POST", body: { otherUid: selectedOtherUid } });
      clearMessageStreamAndPresence();
      selectedConversationId = "";
      selectedOtherUid = "";
      selectedOtherName = "";
      selectedOtherPicture = "";
      messageInput.disabled = true;
      emojiToggleBtn.disabled = true;
      sendButton.disabled = true;
      clearReplyDraft();
      document.body.classList.remove("chat-open");
      renderChatHeader();
      renderMessages();
      await Promise.all([loadBlocked(), loadConversationList()]);
    } catch (error) {
      showChatStatus(error.message || "Could not block this student.");
    }
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
        await loadRequests();
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

function publishTyping(isTyping) {
  if (!selectedConversationId || !activeUserUid) return;
  if (typingStopTimer) {
    clearTimeout(typingStopTimer);
    typingStopTimer = null;
  }
  const now = Date.now();
  if (isTyping) {
    typingStopTimer = setTimeout(() => publishTyping(false), 3500);
    if (now - lastTypingSentAt < 2200) return;
    lastTypingSentAt = now;
  } else {
    lastTypingSentAt = 0;
  }

  if (firebaseEnabled) {
    dbSet(dbRef(`messaging/typing/${selectedConversationId}/${activeUserUid}`), { isTyping, updatedAt: now }).catch(() => {});
  } else {
    apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/typing`, {
      method: "PUT",
      body: { isTyping }
    }).catch(() => {});
  }
}

function signalTypingActivity() {
  if (!selectedConversationId) return;
  publishTyping(Boolean(messageInput.value.trim()));
}

messageInput.addEventListener("input", () => {
  autoResizeComposer();
  signalTypingActivity();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedConversationId || optimisticSendingMessage) return;
  const text = messageInput.value.trim();
  if (!text) {
    showChatStatus("A message cannot be empty.");
    return;
  }

  const targetReply = replyDraft ? { ...replyDraft } : null;
  if (!pendingMessage || pendingMessage.text !== text || pendingMessage.replyToMessageId !== (targetReply?.id || null)) {
    pendingMessage = {
      text,
      id: newId(),
      replyToMessageId: targetReply?.id || null
    };
  }

  optimisticSendingMessage = {
    id: pendingMessage.id,
    senderUid: activeUserUid,
    text,
    createdAt: Date.now(),
    deliveryStatus: "sending",
    _optimistic: true,
    ...(targetReply ? {
      replyToMessageId: targetReply.id,
      replyToSenderUid: targetReply.senderUid,
      replyToSenderName: targetReply.senderName,
      replyToText: targetReply.text
    } : {})
  };

  sendButton.classList.add("is-sending");
  sendButton.disabled = true;
  unreadDividerMessageId = "";
  publishTyping(false);
  renderMessages({ scrollMode: "bottom" });

  try {
    const payload = {
      text,
      messageId: pendingMessage.id,
      ...(pendingMessage.replyToMessageId ? { replyToMessageId: pendingMessage.replyToMessageId } : {})
    };
    const res = await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages`, {
      method: "POST",
      body: payload
    });
    pendingMessage = null;
    optimisticSendingMessage = null;
    messageInput.value = "";
    clearReplyDraft();
    autoResizeComposer();
    showChatStatus("");

    if (res?.message) {
      const idx = streamMessages.findIndex((m) => m.id === res.message.id);
      if (idx === -1) streamMessages = [...streamMessages, res.message];
      else streamMessages[idx] = res.message;
      renderMessages({ scrollMode: "bottom" });
    }
    await loadConversationList();
    messageInput.focus();
  } catch (error) {
    optimisticSendingMessage = null;
    renderMessages({ scrollMode: "preserve" });
    showChatStatus(error.message || "Could not send your message. You can retry safely.");
  } finally {
    sendButton.classList.remove("is-sending");
    autoResizeComposer();
  }
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !isCoarsePointer()) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

function publishCurrentPresence(online) {
  if (!activeUserUid) return;
  if (firebaseEnabled) {
    const pRef = dbRef(`messaging/presence/${activeUserUid}`);
    dbSet(pRef, { online, lastSeenAt: Date.now() }).catch(() => {});
    if (online) {
      dbOnDisconnect(pRef)?.set({ online: false, lastSeenAt: Date.now() });
    }
  } else {
    apiRequest("/api/messages/presence", { method: "PUT", body: { online } }).catch(() => {});
  }
}

function setupPresence() {
  if (!activeUserUid) return;
  publishCurrentPresence(true);
  if (presenceHeartbeatTimer) clearInterval(presenceHeartbeatTimer);
  presenceHeartbeatTimer = setInterval(() => {
    if (!document.hidden) publishCurrentPresence(true);
  }, 45_000);

  if (!presenceVisibilityBound) {
    presenceVisibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (!activeUserUid) return;
      if (document.hidden) {
        publishTyping(false);
        publishCurrentPresence(false);
      } else {
        publishCurrentPresence(true);
      }
    });
  }
}

function subscribeToRealtimeLists() {
  if (!firebaseEnabled) {
    if (localSyncTimer) clearInterval(localSyncTimer);
    localSyncTimer = setInterval(async () => {
      if (!activeUserUid || document.hidden) return;
      try {
        await Promise.all([loadConversationList(), loadRequests(), loadNotifications()]);
        if (selectedConversationId) {
          const updated = await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages?limit=${PAGE_SIZE}`);
          streamMessages = updated.messages || [];
          hasMoreOlderMessages = Boolean(updated.hasMore);
          if (updated.otherPresence && selectedOtherUid) {
            cachedPresence.set(selectedOtherUid, updated.otherPresence);
          }
          otherTypingState = { isTyping: Boolean(updated.otherTyping), updatedAt: Date.now() };
          updateTypingIndicatorUI();
          renderMessages({ scrollMode: "auto" });
        }
      } catch {
        // Ignore transient background sync errors
      }
    }, 2500);
    return;
  }

  const conversationRef = dbRef(`messaging/userConversations/${activeUserUid}`);
  activeConversationRef = conversationRef;
  activeConversationListener = dbOnValue(conversationRef, (snapshot) => {
    const items = Object.values(snapshot.val() || {}).filter((item) => item?.hidden !== true).map((item) => ({
      ...item,
      id: item.conversationId || item.id,
      lastMessage: item.lastMessagePreview || "",
      updatedAt: Number(item.updatedAt || item.lastMessageAt) || 0
    }));
    renderConversationList(items);
    syncDeliveredForConversations(items);

    if (selectedConversationId && !items.some((item) => item.id === selectedConversationId)) {
      clearMessageStreamAndPresence();
      selectedConversationId = "";
      selectedOtherUid = "";
      selectedOtherName = "";
      selectedOtherPicture = "";
      document.body.classList.remove("chat-open");
      renderChatHeader();
      renderMessages();
      messageInput.disabled = true;
      emojiToggleBtn.disabled = true;
      sendButton.disabled = true;
    }
  }, (error) => showSearchMessage(error.message || "Could not sync your conversations."));

  const requestRef = dbRef(`messaging/userRequests/${activeUserUid}`);
  activeRequestRef = requestRef;
  activeRequestListener = dbOnValue(requestRef, (snapshot) => {
    renderRequests(Object.values(snapshot.val() || {}));
  }, (error) => showSearchMessage(error.message || "Could not sync message requests."));

  const outgoingRequestRef = dbRef(`messaging/outgoingRequests/${activeUserUid}`);
  activeOutgoingRequestRef = outgoingRequestRef;
  activeOutgoingRequestListener = dbOnValue(outgoingRequestRef, (snapshot) => {
    renderOutgoingRequests(Object.values(snapshot.val() || {}));
  }, (error) => showSearchMessage(error.message || "Could not sync sent requests."));

  const notificationRef = dbRef(`messaging/notifications/${activeUserUid}`);
  activeNotificationRef = notificationRef;
  activeNotificationListener = dbOnValue(notificationRef, (snapshot) => {
    const items = Object.values(snapshot.val() || {}).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    let newlyAccepted = false;
    for (const item of items) {
      if (item?.id && !knownNotificationIds.has(item.id)) {
        if (hasLoadedInitialNotifications && item.type === "message-request-accepted" && item.read !== true) {
          newlyAccepted = true;
        }
        knownNotificationIds.add(item.id);
      }
    }
    hasLoadedInitialNotifications = true;
    renderNotifications(items);
    if (newlyAccepted) {
      showSearchMessage("Your message request was accepted.", true);
      loadConversationList().catch(() => {});
      loadRequests().catch(() => {});
    }
  }, (error) => showSearchMessage(error.message || "Could not sync alerts."));
}

watchAuthState(async (user) => {
  clearPageListeners();
  if (!user) {
    window.location.replace("./login.html");
    return;
  }
  activeUserUid = user.uid;
  activeUserDisplayName = user.displayName || user.email?.split("@")[0] || "You";
  initNavigation("messages");
  messageInput.disabled = true;
  emojiToggleBtn.disabled = true;
  sendButton.disabled = true;
  try {
    await Promise.all([loadConversationList(), loadRequests(), loadBlocked(), loadNotifications()]);
    setupPresence();
    subscribeToRealtimeLists();
  } catch (error) {
    showSearchMessage(error.message || "Could not load messages. Please try again.");
  }
});
