import { auth, database } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { off, onValue, ref } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { apiRequest } from "./api.js";
import { initNavigation } from "./nav.js";

const searchForm = document.querySelector("#student-search-form");
const searchState = document.querySelector("#search-state");
const conversationList = document.querySelector("#conversation-list");
const conversationCount = document.querySelector("#conversation-count");
const chatHeader = document.querySelector("#chat-header");
const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const messageInput = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");

let activeUserUid = null;
let selectedConversationId = "";
let selectedOtherName = "Student";
let selectedOtherUid = "";
let searchResult = null;
let activeConversationListener = null;
let activeConversationRef = null;
let activeMessageListener = null;
let activeMessageRef = null;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatMessageTime(timestamp) {
  const numeric = Number(timestamp || 0);
  if (!numeric) return "";
  const date = new Date(numeric);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatMessageDate(timestamp) {
  const numeric = Number(timestamp || 0);
  if (!numeric) return "";
  const date = new Date(numeric);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function setSearchState(message, success = false, details = "") {
  if (!searchState) return;
  searchState.innerHTML = `
    <div class="${success ? "result-box" : "error-box"}" style="margin-bottom:14px;">
      <strong>${escapeHtml(message)}</strong>
      ${details ? `<div class="muted" style="margin-top:6px;">${escapeHtml(details)}</div>` : ""}
    </div>
  `;
}

function clearMessageListener() {
  if (activeMessageRef && activeMessageListener) {
    off(activeMessageRef, "value", activeMessageListener);
  }
  activeMessageRef = null;
  activeMessageListener = null;
}

function clearConversationListener() {
  if (activeConversationRef && activeConversationListener) {
    off(activeConversationRef, "value", activeConversationListener);
  }
  activeConversationRef = null;
  activeConversationListener = null;
}

function renderConversationList(items) {
  if (!conversationList) return;

  const safeItems = Array.isArray(items) ? items : [];
  conversationList.innerHTML = safeItems.length
    ? safeItems.map((item) => {
        const conversationId = item.id || item.conversationId || "";
        const otherName = item.otherName || "Student";
        const preview = item.lastMessage || "No messages yet.";
        const unread = Number(item.unreadCount || 0);
        const active = conversationId === selectedConversationId ? "active" : "";
        return `
          <button type="button" class="record-item ${active}" data-conversation-id="${escapeHtml(conversationId)}" style="width:100%; text-align:left; border:1px solid var(--line); border-radius:12px; background:${active ? "rgba(63, 94, 251, 0.06)" : "transparent"}; padding:10px 12px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
              <strong>${escapeHtml(otherName)}</strong>
              ${unread ? `<span class="badge">${escapeHtml(String(unread))}</span>` : ""}
            </div>
            <small style="color:var(--muted);">${escapeHtml(preview.slice(0, 90))}</small>
            <small style="color:var(--muted);">${escapeHtml(formatMessageTime(item.lastMessageAt))}</small>
          </button>
        `;
      }).join("")
    : '<p class="muted">No conversations yet. Search for a student by matric number to get started.</p>';

  conversationCount.textContent = safeItems.length;

  conversationList.querySelectorAll("[data-conversation-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const conversationId = button.dataset.conversationId;
      const match = safeItems.find((item) => (item.id || item.conversationId) === conversationId);
      if (!match) return;
      selectConversation(conversationId, match.otherUid, match.otherName || "Student");
    });
  });
}

function renderChatHeader() {
  if (!chatHeader) return;
  if (!selectedConversationId) {
    chatHeader.innerHTML = '<div class="muted">Select a conversation to begin.</div>';
    return;
  }

  chatHeader.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; width:100%; justify-content:space-between; flex-wrap:wrap;">
      <div>
        <strong style="display:block; font-size:1.05rem;">${escapeHtml(selectedOtherName || "Student")}</strong>
        <span class="muted">Text-only conversation</span>
      </div>
      <span class="muted">${escapeHtml(selectedOtherUid ? selectedOtherUid.slice(0, 12) : "")}</span>
    </div>
  `;
}

function renderMessages(items) {
  if (!chatMessages) return;

  const safeItems = Array.isArray(items) ? items : [];
  chatMessages.innerHTML = safeItems.length
    ? safeItems.map((message) => {
        const isMine = String(message.senderUid || "") === String(activeUserUid || "");
        const messageText = escapeHtml(message.text || "");
        return `
          <div style="display:flex; justify-content:${isMine ? "flex-end" : "flex-start"};">
            <div style="max-width:72%; border-radius:16px; padding:10px 12px; background:${isMine ? "var(--primary)" : "#f1f4f7"}; color:${isMine ? "#fff" : "var(--text)"}; box-shadow:0 8px 24px rgba(15,23,42,0.06);">
              <div style="white-space:pre-wrap; line-height:1.5; word-break:break-word;">${messageText}</div>
              <small style="opacity:0.75; display:block; margin-top:6px; text-align:right;">${escapeHtml(formatMessageTime(message.createdAt))}</small>
            </div>
          </div>
        `;
      }).join("")
    : '<p class="muted">No messages yet. Say hello to start the conversation.</p>';

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadConversationMessages(conversationId) {
  if (!conversationId) return;
  const history = await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`);
  renderMessages(history.messages || []);
  await apiRequest(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`, { method: "POST" });
}

function attachMessageStream(conversationId) {
  clearMessageListener();
  if (!conversationId) return;
  const messagesRef = ref(database, `messaging/messages/${conversationId}`);
  activeMessageRef = messagesRef;
  activeMessageListener = onValue(messagesRef, (snapshot) => {
    const messages = Object.values(snapshot.val() || {}).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    renderMessages(messages);
  });
}

async function selectConversation(conversationId, otherUid, otherName) {
  selectedConversationId = conversationId || "";
  selectedOtherUid = otherUid || "";
  selectedOtherName = otherName || "Student";
  renderChatHeader();

  if (!selectedConversationId) {
    renderMessages([]);
    messageInput.disabled = true;
    sendButton.disabled = true;
    return;
  }

  messageInput.disabled = false;
  sendButton.disabled = false;
  attachMessageStream(selectedConversationId);
  await loadConversationMessages(selectedConversationId);
}

async function refreshConversationList() {
  if (!activeUserUid) return;
  const conversationRef = ref(database, `messaging/userConversations/${activeUserUid}`);
  clearConversationListener();
  activeConversationRef = conversationRef;
  activeConversationListener = onValue(conversationRef, (snapshot) => {
    const raw = snapshot.val() || {};
    const items = Object.values(raw)
      .filter(Boolean)
      .map((item) => ({
        ...item,
        id: item.conversationId || item.id || "",
        lastMessage: item.lastMessagePreview || "",
        lastMessageAt: item.lastMessageAt || item.updatedAt || 0,
        unreadCount: Number(item.unreadCount || 0)
      }))
      .sort((a, b) => Number(b.lastMessageAt || 0) - Number(a.lastMessageAt || 0));

    renderConversationList(items);

    if (!selectedConversationId && items[0]) {
      selectConversation(items[0].id, items[0].otherUid, items[0].otherName);
      return;
    }

    const stillSelected = items.some((item) => (item.id || item.conversationId) === selectedConversationId);
    if (selectedConversationId && !stillSelected) {
      selectedConversationId = "";
      selectedOtherUid = "";
      selectedOtherName = "Student";
      renderChatHeader();
      renderMessages([]);
      messageInput.disabled = true;
      sendButton.disabled = true;
    }
  });
}

searchForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(searchForm);
  const matric = String(formData.get("matric") || "").trim();

  if (!matric) {
    setSearchState("Enter a valid matriculation number to search.", false);
    return;
  }

  try {
    const result = await apiRequest(`/api/messages/search?matric=${encodeURIComponent(matric)}`);
    searchResult = result.user || null;
    setSearchState(`Found a verified student: ${searchResult.name || "Student"}`, true, `${searchResult.department || "Department not set"} · ${searchResult.level || "Level not set"}`);

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "button button-primary button-small";
    startButton.textContent = "Start Conversation";
    startButton.addEventListener("click", async () => {
      if (!searchResult) return;
      const conversation = await apiRequest("/api/messages/conversations", {
        method: "POST",
        body: { otherUid: searchResult.uid }
      });
      const chat = conversation.conversation || {};
      selectConversation(chat.id, chat.otherUid, chat.otherName || searchResult.name || "Student");
    });

    const searchDetails = searchState.querySelector(".result-box");
    if (searchDetails) {
      const actions = document.createElement("div");
      actions.style.marginTop = "12px";
      actions.appendChild(startButton);
      searchDetails.appendChild(actions);
    }
  } catch (error) {
    searchResult = null;
    setSearchState(error.message || "No student could be found for that matric number.", false);
  }
});

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedConversationId) return;

  const text = messageInput.value.trim();
  if (!text) {
    setSearchState("Your message cannot be empty.", false);
    return;
  }

  sendButton.disabled = true;
  messageInput.disabled = true;
  try {
    await apiRequest(`/api/messages/conversations/${encodeURIComponent(selectedConversationId)}/messages`, {
      method: "POST",
      body: { text }
    });
    messageInput.value = "";
    messageInput.disabled = false;
    messageInput.focus();
  } catch (error) {
    setSearchState(error.message || "Could not send the message.", false);
    messageInput.disabled = false;
  } finally {
    sendButton.disabled = false;
  }
});

messageInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  activeUserUid = user.uid;
  initNavigation("messages");
  renderChatHeader();
  messageInput.disabled = true;
  sendButton.disabled = true;
  refreshConversationList();
});
