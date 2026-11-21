"use strict";

const {
  conversationId,
  pairId,
  matricLookupKey,
  isPairBlocked,
  requestDecision,
  publicMessagingProfile
} = require("./messaging");
const { normalizeMatricNumber, validateMatricNumber, validateTextMessage, snapshotToList, validRecordId } = require("./validation");

function payloadHasOnly(payload, allowedKeys) {
  return payload && typeof payload === "object" && !Array.isArray(payload) &&
    Object.keys(payload).every((key) => allowedKeys.includes(key));
}

function registerMessagingRoutes(app, {
  database,
  firebaseAuth,
  requireAuth,
  validUid,
  allowMessageSearch,
  allowMessageAction
}) {
  async function getEligibleProfile(uid) {
    if (!validUid(uid)) return null;
    const [profileSnapshot, account] = await Promise.all([
      database.ref(`users/${uid}/profile`).get(),
      firebaseAuth.getUser(uid).catch((error) => {
        if (error.code === "auth/user-not-found") return null;
        throw error;
      })
    ]);
    const profile = profileSnapshot.val() || {};
    if (!account || account.disabled || !profile || typeof profile !== "object") return null;
    return { profile, publicProfile: publicMessagingProfile(uid, profile) };
  }

  async function pairIsBlocked(firstUid, secondUid) {
    const [first, second] = await Promise.all([
      database.ref(`messaging/blocks/${firstUid}/${secondUid}`).get(),
      database.ref(`messaging/blocks/${secondUid}/${firstUid}`).get()
    ]);
    return isPairBlocked({
      [firstUid]: { [secondUid]: first.exists() },
      [secondUid]: { [firstUid]: second.exists() }
    }, firstUid, secondUid);
  }

  async function authorizedConversation(id, uid) {
    if (!validRecordId(id)) return { error: "Conversation not found.", status: 404 };
    const snapshot = await database.ref(`messaging/conversations/${id}`).get();
    if (!snapshot.exists()) return { error: "Conversation not found.", status: 404 };
    const record = snapshot.val();
    if (record.status !== "active" || !record.acceptedRequestId) {
      return { error: "This conversation has not been accepted.", status: 403 };
    }
    const participants = record.participants || {};
    if (!participants[uid]) return { error: "You are not a participant in this conversation.", status: 403 };
    const otherUid = Object.keys(participants).find((participantUid) => participantUid !== uid);
    if (!otherUid || await pairIsBlocked(uid, otherUid)) {
      return { error: "This conversation is unavailable.", status: 403 };
    }
    const requestSnapshot = await database.ref(`messaging/requests/${record.acceptedRequestId}`).get();
    const request = requestSnapshot.val();
    if (
      !request ||
      request.status !== "accepted" ||
      !participants[request.senderUid] ||
      !participants[request.recipientUid]
    ) {
      return { error: "This conversation is unavailable.", status: 403 };
    }
    return { record, otherUid };
  }

  async function updateUserConversation(uid, id, update) {
    const ref = database.ref(`messaging/userConversations/${uid}/${id}`);
    const result = await ref.transaction((current) => (current ? update(current) : null));
    return result.snapshot.val();
  }

  async function createAcceptedConversation(request, requestId, timestamp) {
    const sender = await getEligibleProfile(request.senderUid);
    const recipient = await getEligibleProfile(request.recipientUid);
    if (!sender || !recipient) throw Object.assign(new Error("A student account is no longer eligible for messaging."), { statusCode: 409 });
    if (await pairIsBlocked(request.senderUid, request.recipientUid)) {
      throw Object.assign(new Error("This student has blocked messaging with you."), { statusCode: 403 });
    }

    const id = conversationId(request.senderUid, request.recipientUid);
    const conversation = {
      id,
      participants: { [request.senderUid]: true, [request.recipientUid]: true },
      participantProfiles: {
        [request.senderUid]: sender.publicProfile,
        [request.recipientUid]: recipient.publicProfile
      },
      acceptedRequestId: requestId,
      status: "active",
      createdAt: request.createdAt || timestamp,
      updatedAt: timestamp,
      lastMessagePreview: request.initialMessage,
      lastMessageAt: request.createdAt || timestamp,
      lastMessageSenderUid: request.senderUid
    };
    const conversationRef = database.ref(`messaging/conversations/${id}`);
    const saved = await conversationRef.transaction((current) => {
      if (current?.status === "active") {
        return {
          ...current,
          participantProfiles: conversation.participantProfiles,
          updatedAt: Math.max(timestamp, Number(current.updatedAt) || 0)
        };
      }
      return conversation;
    });
    if (!saved.committed || saved.snapshot.val()?.status !== "active") {
      throw Object.assign(new Error("Conversation could not be established. Please try again."), { statusCode: 409 });
    }

    const messageId = `request_${requestId}`;
    const message = {
      id: messageId,
      messageId,
      conversationId: id,
      senderUid: request.senderUid,
      text: request.initialMessage,
      createdAt: request.createdAt || timestamp,
      deliveryStatus: "read",
      deliveredAt: timestamp,
      readAt: timestamp,
      readBy: { [request.senderUid]: true, [request.recipientUid]: true }
    };
    const senderConversationEntry = {
      conversationId: id,
      otherUid: request.recipientUid,
      otherName: recipient.publicProfile.name,
      otherProfilePicture: recipient.publicProfile.profilePicture,
      lastMessagePreview: request.initialMessage.slice(0, 160),
      lastMessageAt: message.createdAt,
      updatedAt: timestamp,
      unreadCount: 0,
      hidden: false
    };
    const recipientConversationEntry = {
      conversationId: id,
      otherUid: request.senderUid,
      otherName: sender.publicProfile.name,
      otherProfilePicture: sender.publicProfile.profilePicture,
      lastMessagePreview: request.initialMessage.slice(0, 160),
      lastMessageAt: message.createdAt,
      updatedAt: timestamp,
      unreadCount: 0,
      hidden: false
    };
    const messageRef = database.ref(`messaging/messages/${id}/${messageId}`);
    await messageRef.transaction((current) => current || message);
    await Promise.all([
      database.ref(`messaging/userConversations/${request.senderUid}/${id}`).transaction((current) => (
        current
          ? {
              ...current,
              otherName: recipient.publicProfile.name,
              otherProfilePicture: recipient.publicProfile.profilePicture,
              hidden: false,
              updatedAt: Math.max(timestamp, Number(current.updatedAt) || 0)
            }
          : senderConversationEntry
      )),
      database.ref(`messaging/userConversations/${request.recipientUid}/${id}`).transaction((current) => (
        current
          ? {
              ...current,
              otherName: sender.publicProfile.name,
              otherProfilePicture: sender.publicProfile.profilePicture,
              hidden: false,
              updatedAt: Math.max(timestamp, Number(current.updatedAt) || 0)
            }
          : recipientConversationEntry
      )),
      database.ref(`messaging/conversationAccess/${request.senderUid}/${id}`).set(true),
      database.ref(`messaging/conversationAccess/${request.recipientUid}/${id}`).set(true),
      database.ref(`messaging/notifications/${request.senderUid}/accepted-${requestId}`).transaction((current) => current || ({
        id: `accepted-${requestId}`,
        type: "message-request-accepted",
        title: "Message request accepted",
        message: `${recipient.publicProfile.name} accepted your message request.`,
        conversationId: id,
        requestId,
        createdAt: timestamp,
        read: false
      }))
    ]);
    return { id, otherUid: request.senderUid, otherName: sender.publicProfile.name };
  }

  app.get("/api/messages/search", requireAuth, async (req, res, next) => {
    try {
      if (!allowMessageSearch(req.user.uid)) {
        return res.status(429).json({ error: "Too many search attempts. Please wait a moment and try again." });
      }
      const normalized = validateMatricNumber(req.query.matric);
      if (!normalized) return res.status(400).json({ error: "Enter a matriculation number to search." });

      const lookupSnapshot = await database.ref(`matricLookup/${matricLookupKey(normalized)}`).get();
      const legacyLookupSnapshot = lookupSnapshot.exists()
        ? lookupSnapshot
        : await database.ref(`matricLookup/${normalized}`).get();
      const requester = await getEligibleProfile(req.user.uid);
      if (!requester) return res.status(403).json({ error: "Your account is not eligible for student messaging." });
      if (!legacyLookupSnapshot.exists() || !validUid(legacyLookupSnapshot.val())) {
        return res.status(404).json({ error: "No verified student matches that matriculation number." });
      }
      const otherUid = legacyLookupSnapshot.val();
      if (otherUid === req.user.uid) return res.status(400).json({ error: "You cannot message yourself." });
      const target = await getEligibleProfile(otherUid);
      if (
        !target ||
        target.profile.matricVerified !== true ||
        typeof target.profile.matricNumber !== "string" ||
        normalizeMatricNumber(target.profile.matricNumber) !== normalized
      ) {
        return res.status(404).json({ error: "No verified student matches that matriculation number." });
      }
      if (await pairIsBlocked(req.user.uid, otherUid)) {
        return res.status(403).json({ error: "Messaging is unavailable for this student." });
      }
      res.json({ user: target.publicProfile });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/messages/notifications", requireAuth, async (req, res, next) => {
    try {
      const snapshot = await database.ref(`messaging/notifications/${req.user.uid}`).get();
      const items = snapshotToList(snapshot.val())
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
        .slice(0, 100);
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/notifications/:notificationId/read", requireAuth, async (req, res, next) => {
    try {
      const id = req.params.notificationId;
      if (!validRecordId(id)) return res.status(400).json({ error: "Invalid notification ID." });
      const notificationRef = database.ref(`messaging/notifications/${req.user.uid}/${id}`);
      const result = await notificationRef.transaction((current) =>
        current ? { ...current, read: true } : null
      );
      if (!result.snapshot.exists()) return res.status(404).json({ error: "Notification not found." });
      res.json({ id, read: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/messages/conversations", requireAuth, async (req, res, next) => {
    try {
      const snapshot = await database.ref(`messaging/userConversations/${req.user.uid}`).get();
      const entries = snapshotToList(snapshot.val()).filter((item) => item.hidden !== true);
      const items = (await Promise.all(entries.map(async (item) => {
        const id = item.conversationId || item.id;
        const authorized = await authorizedConversation(id, req.user.uid);
        if (authorized.error) return null;
        const [other, presenceSnap] = await Promise.all([
          getEligibleProfile(authorized.otherUid),
          database.ref(`messaging/presence/${authorized.otherUid}`).get()
        ]);
        if (!other) return null;
        const presence = presenceSnap.val() || {};
        return {
          id,
          otherUid: authorized.otherUid,
          otherName: other.publicProfile.name,
          otherProfilePicture: other.publicProfile.profilePicture,
          otherOnline: Boolean(presence.online && Date.now() - Number(presence.lastSeenAt || 0) < 120_000),
          otherLastSeenAt: Number(presence.lastSeenAt) || 0,
          lastMessage: String(item.lastMessagePreview || "").slice(0, 160),
          lastMessageAt: Number(item.lastMessageAt) || 0,
          unreadCount: Number(item.unreadCount) || 0,
          updatedAt: Number(item.updatedAt) || Number(item.lastMessageAt) || 0
        };
      }))).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/messages/requests", requireAuth, async (req, res, next) => {
    try {
      const [incomingSnap, outgoingSnap] = await Promise.all([
        database.ref(`messaging/userRequests/${req.user.uid}`).get(),
        database.ref(`messaging/outgoingRequests/${req.user.uid}`).get()
      ]);
      const items = snapshotToList(incomingSnap.val())
        .filter((item) => item.status === "pending")
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      const outgoing = snapshotToList(outgoingSnap.val())
        .sort((a, b) => (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0));
      res.json({ items, outgoing });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/requests", requireAuth, async (req, res, next) => {
    try {
      if (!allowMessageAction(`request:${req.user.uid}`, 5, 10 * 60_000)) {
        return res.status(429).json({ error: "You have sent too many message requests. Try again later." });
      }
      if (!payloadHasOnly(req.body, ["recipientUid", "text", "requestId"])) {
        return res.status(400).json({ error: "Message requests support text only." });
      }
      const recipientUid = String(req.body.recipientUid || "").trim();
      const requestId = String(req.body.requestId || "").trim();
      if (!validUid(recipientUid) || recipientUid === req.user.uid) {
        return res.status(400).json({ error: "Choose a valid student to message." });
      }
      if (!validRecordId(requestId) || requestId.length > 100) return res.status(400).json({ error: "A valid request ID is required." });
      const initialMessage = validateTextMessage(req.body.text, 2000);
      const [sender, recipient] = await Promise.all([
        getEligibleProfile(req.user.uid),
        getEligibleProfile(recipientUid)
      ]);
      if (!sender) return res.status(403).json({ error: "Your account is not eligible for student messaging." });
      if (!recipient) return res.status(404).json({ error: "This student account is unavailable for messaging." });
      if (await pairIsBlocked(req.user.uid, recipientUid)) {
        return res.status(403).json({ error: "This student has blocked messaging with you." });
      }

      const conversationKey = conversationId(req.user.uid, recipientUid);
      const activeConversation = await database.ref(`messaging/conversations/${conversationKey}`).get();
      if (activeConversation.val()?.status === "active") {
        return res.status(409).json({ error: "You already have a conversation with this student.", conversationId: conversationKey });
      }

      const pairKey = pairId(req.user.uid, recipientUid);
      const pairRef = database.ref(`messaging/requestPairs/${pairKey}`);
      const requestRef = database.ref(`messaging/requests/${requestId}`);
      const priorRequest = await requestRef.get();
      if (priorRequest.exists()) {
        const prior = priorRequest.val();
        if (prior.senderUid !== req.user.uid || prior.recipientUid !== recipientUid || prior.initialMessage !== initialMessage) {
          return res.status(409).json({ error: "This request ID has already been used." });
        }
        return res.status(200).json({ id: requestId, status: prior.status });
      }

      const now = Date.now();
      let decision = "create";
      const reservation = await pairRef.transaction((current) => {
        decision = requestDecision(current, activeConversation.val(), now);
        if (current?.status === "pending") {
          if (current.requestId === requestId && current.senderUid === req.user.uid) {
            decision = "retry";
            return current;
          }
          return undefined;
        }
        if (decision !== "create") return undefined;
        return { requestId, senderUid: req.user.uid, recipientUid, status: "pending", createdAt: now, updatedAt: now };
      });
      if (!reservation.committed && decision === "request-pending") {
        return res.status(409).json({ error: "A message request is already pending for this student." });
      }
      if (!reservation.committed && decision === "cooldown") {
        return res.status(429).json({ error: "This request was declined recently. You can try again after the 30-day cooldown." });
      }
      if (!reservation.committed && decision === "conversation-exists") {
        return res.status(409).json({ error: "You already have a conversation with this student.", conversationId: conversationKey });
      }
      if (!reservation.committed) return res.status(409).json({ error: "A message request could not be created." });

      const existingRequest = await requestRef.get();
      if (existingRequest.exists()) return res.status(200).json({ id: requestId, status: existingRequest.val().status });
      const request = {
        id: requestId,
        pairId: pairKey,
        senderUid: req.user.uid,
        recipientUid,
        senderName: sender.publicProfile.name,
        senderProfilePicture: sender.publicProfile.profilePicture,
        recipientName: recipient.publicProfile.name,
        initialMessage,
        status: "pending",
        createdAt: now,
        updatedAt: now
      };
      await database.ref().update({
        [`messaging/requests/${requestId}`]: request,
        [`messaging/userRequests/${recipientUid}/${requestId}`]: {
          id: requestId,
          senderUid: req.user.uid,
          senderName: sender.publicProfile.name,
          senderProfilePicture: sender.publicProfile.profilePicture,
          initialMessage,
          status: "pending",
          createdAt: now
        },
        [`messaging/outgoingRequests/${req.user.uid}/${requestId}`]: {
          id: requestId,
          senderUid: req.user.uid,
          recipientUid,
          recipientName: recipient.publicProfile.name,
          recipientProfilePicture: recipient.publicProfile.profilePicture,
          initialMessage,
          status: "pending",
          createdAt: now,
          updatedAt: now
        },
        [`messaging/notifications/${recipientUid}/request-${requestId}`]: {
          id: `request-${requestId}`,
          type: "message-request",
          title: "New message request",
          message: `${sender.publicProfile.name} sent you a message request.`,
          createdAt: now,
          read: false
        }
      });
      res.status(201).json({ id: requestId, status: "pending" });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/messages/requests/:requestId", requireAuth, async (req, res, next) => {
    try {
      if (!payloadHasOnly(req.body, ["status"])) return res.status(400).json({ error: "Unsupported request action." });
      const requestId = req.params.requestId;
      if (!validRecordId(requestId)) return res.status(400).json({ error: "Invalid request ID." });
      const action = String(req.body.status || "");
      if (!["accepted", "declined", "blocked"].includes(action)) {
        return res.status(400).json({ error: "Choose accept, decline, or block." });
      }
      if (!allowMessageAction(`request-action:${req.user.uid}`, 20)) {
        return res.status(429).json({ error: "Too many request actions. Try again shortly." });
      }
      const requestRef = database.ref(`messaging/requests/${requestId}`);
      const snapshot = await requestRef.get();
      if (!snapshot.exists()) return res.status(404).json({ error: "Message request not found." });
      const current = snapshot.val();
      if (current.recipientUid !== req.user.uid) return res.status(403).json({ error: "Only the recipient can respond to this request." });

      if (current.status === "accepted") {
        if (action === "accepted") {
          const now = Date.now();
          const conversation = await createAcceptedConversation(current, requestId, now);
          await database.ref().update({
            [`messaging/userRequests/${req.user.uid}/${requestId}`]: null,
            [`messaging/outgoingRequests/${current.senderUid}/${requestId}/status`]: "accepted",
            [`messaging/outgoingRequests/${current.senderUid}/${requestId}/conversationId`]: conversation.id,
            [`messaging/outgoingRequests/${current.senderUid}/${requestId}/updatedAt`]: now,
            [`messaging/outgoingRequests/${current.senderUid}/${requestId}/acceptedAt`]: current.acceptedAt || now
          });
          return res.json({ id: requestId, status: "accepted", conversation });
        }
        return res.status(409).json({ error: "This message request was already accepted." });
      }
      if (current.status === "declined") {
        return res.status(409).json({ error: "This message request was already declined." });
      }
      if (current.status === "blocked") {
        return res.status(409).json({ error: "This message request was already blocked." });
      }
      if (current.status !== "pending") {
        return res.status(409).json({ error: "This message request is no longer pending." });
      }
      if (await pairIsBlocked(current.senderUid, current.recipientUid) && action !== "blocked") {
        return res.status(403).json({ error: "This request is unavailable because messaging is blocked." });
      }

      const now = Date.now();
      if (action === "blocked") {
        await database.ref(`messaging/blocks/${req.user.uid}/${current.senderUid}`).transaction((block) =>
          block || { blockedUid: current.senderUid, createdAt: now }
        );
      }
      const updatedSnapshot = await requestRef.transaction((request) => {
        if (!request) return null;
        if (request.recipientUid !== req.user.uid || request.status !== "pending") return undefined;
        return {
          ...request,
          status: action,
          updatedAt: now,
          respondedAt: now,
          ...(action === "accepted" ? { acceptedAt: now } : {})
        };
      });
      const updated = updatedSnapshot.snapshot.val();
      if (!updated) {
        return res.status(404).json({ error: "Message request not found." });
      }
      if (!updatedSnapshot.committed || updated.status !== action) {
        if (action === "accepted" && updated.status === "accepted" && updated.recipientUid === req.user.uid) {
          const conversation = await createAcceptedConversation(updated, requestId, now);
          await database.ref().update({
            [`messaging/userRequests/${req.user.uid}/${requestId}`]: null,
            [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/status`]: "accepted",
            [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/conversationId`]: conversation.id,
            [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/updatedAt`]: now,
            [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/acceptedAt`]: updated.acceptedAt || now
          });
          return res.json({ id: requestId, status: "accepted", conversation });
        }
        const statusLabel = ["accepted", "declined", "blocked"].includes(updated.status) ? updated.status : "handled";
        return res.status(409).json({ error: `This message request was already ${statusLabel}.` });
      }

      if (action === "accepted") {
        const conversation = await createAcceptedConversation(updated, requestId, now);
        await database.ref().update({
          [`messaging/requestPairs/${current.pairId}/status`]: "accepted",
          [`messaging/requestPairs/${current.pairId}/updatedAt`]: now,
          [`messaging/requests/${requestId}/conversationId`]: conversation.id,
          [`messaging/userRequests/${req.user.uid}/${requestId}`]: null,
          [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/status`]: "accepted",
          [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/conversationId`]: conversation.id,
          [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/updatedAt`]: now,
          [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/acceptedAt`]: now
        });
        return res.json({ id: requestId, status: "accepted", conversation });
      }

      const updates = {
        [`messaging/requestPairs/${current.pairId}/status`]: action === "declined" ? "declined" : "blocked",
        [`messaging/requestPairs/${current.pairId}/updatedAt`]: now,
        [`messaging/userRequests/${req.user.uid}/${requestId}`]: null,
        [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/status`]: action,
        [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/updatedAt`]: now,
        [`messaging/outgoingRequests/${updated.senderUid}/${requestId}/respondedAt`]: now
      };
      if (action === "blocked") {
        updates[`messaging/blocks/${req.user.uid}/${current.senderUid}`] = { blockedUid: current.senderUid, createdAt: now };
      }
      await database.ref().update(updates);

      if (action === "blocked") {
        await hidePairConversations(current.senderUid, current.recipientUid);
      }
      if (action === "declined") {
        await database.ref(`messaging/notifications/${current.senderUid}/declined-${requestId}`).set({
          id: `declined-${requestId}`,
          type: "message-request-declined",
          title: "Message request declined",
          message: "Your message request was declined.",
          requestId,
          createdAt: now,
          read: false
        });
      }
      res.json({ id: requestId, status: action });
    } catch (error) {
      next(error);
    }
  });

  async function hidePairConversations(firstUid, secondUid) {
    const id = conversationId(firstUid, secondUid);
    const conversationSnapshot = await database.ref(`messaging/conversations/${id}`).get();
    if (!conversationSnapshot.exists()) return;
    await database.ref().update({
      [`messaging/userConversations/${firstUid}/${id}/hidden`]: true,
      [`messaging/userConversations/${secondUid}/${id}/hidden`]: true,
      [`messaging/conversationAccess/${firstUid}/${id}`]: null,
      [`messaging/conversationAccess/${secondUid}/${id}`]: null
    });
  }

  app.get("/api/messages/blocked", requireAuth, async (req, res, next) => {
    try {
      const snapshot = await database.ref(`messaging/blocks/${req.user.uid}`).get();
      const items = await Promise.all(Object.entries(snapshot.val() || {}).map(async ([uid, block]) => {
        const student = await getEligibleProfile(uid);
        return {
          uid,
          name: student?.publicProfile.name || "Student",
          profilePicture: student?.publicProfile.profilePicture || "",
          createdAt: Number(block.createdAt) || 0
        };
      }));
      items.sort((a, b) => b.createdAt - a.createdAt);
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/blocked", requireAuth, async (req, res, next) => {
    try {
      if (!payloadHasOnly(req.body, ["otherUid"])) return res.status(400).json({ error: "Unsupported block payload." });
      const otherUid = String(req.body.otherUid || "").trim();
      if (!validUid(otherUid) || otherUid === req.user.uid) return res.status(400).json({ error: "Choose a valid student to block." });
      if (!await getEligibleProfile(otherUid)) return res.status(404).json({ error: "Student account not found." });
      const now = Date.now();
      await database.ref(`messaging/blocks/${req.user.uid}/${otherUid}`).transaction((current) =>
        current || { blockedUid: otherUid, createdAt: now }
      );
      const pairKey = pairId(req.user.uid, otherUid);
      const pairRef = database.ref(`messaging/requestPairs/${pairKey}`);
      await pairRef.transaction((current) => current
        ? { ...current, status: "blocked", updatedAt: now }
        : { senderUid: req.user.uid, recipientUid: otherUid, status: "blocked", createdAt: now, updatedAt: now });
      const pairSnapshot = await pairRef.get();
      const requestId = pairSnapshot.val()?.requestId;
      if (requestId) {
        const reqSnap = await database.ref(`messaging/requests/${requestId}`).get();
        const senderUid = reqSnap.val()?.senderUid;
        await database.ref().update({
          [`messaging/requests/${requestId}/status`]: "blocked",
          [`messaging/requests/${requestId}/updatedAt`]: now,
          [`messaging/userRequests/${req.user.uid}/${requestId}`]: null,
          [`messaging/userRequests/${otherUid}/${requestId}`]: null,
          ...(senderUid ? { [`messaging/outgoingRequests/${senderUid}/${requestId}/status`]: "blocked", [`messaging/outgoingRequests/${senderUid}/${requestId}/updatedAt`]: now } : {})
        });
      }
      await hidePairConversations(req.user.uid, otherUid);
      res.json({ uid: otherUid, blocked: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/messages/blocked/:uid", requireAuth, async (req, res, next) => {
    try {
      const otherUid = req.params.uid;
      if (!validUid(otherUid)) return res.status(400).json({ error: "Invalid student ID." });
      if (!await getEligibleProfile(otherUid)) return res.status(404).json({ error: "Student account not found." });
      await database.ref(`messaging/blocks/${req.user.uid}/${otherUid}`).remove();
      if (!await pairIsBlocked(req.user.uid, otherUid)) {
        const id = conversationId(req.user.uid, otherUid);
        const snapshot = await database.ref(`messaging/conversations/${id}`).get();
        if (snapshot.exists() && snapshot.val().status === "active") {
          const conversation = snapshot.val();
          const requestRef = database.ref(`messaging/requests/${conversation.acceptedRequestId}`);
          const requestSnapshot = await requestRef.get();
          const request = requestSnapshot.val();
          if (request?.status === "blocked") {
            await requestRef.update({ status: "accepted", updatedAt: Date.now() });
            await database.ref(`messaging/requestPairs/${pairId(req.user.uid, otherUid)}`).update({
              status: "accepted",
              updatedAt: Date.now()
            });
          }
          await database.ref().update({
            [`messaging/userConversations/${req.user.uid}/${id}/hidden`]: false,
            [`messaging/userConversations/${otherUid}/${id}/hidden`]: false,
            [`messaging/conversationAccess/${req.user.uid}/${id}`]: true,
            [`messaging/conversationAccess/${otherUid}/${id}`]: true
          });
        }
      }
      res.json({ uid: otherUid, blocked: false });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/messages/conversations/:conversationId/messages", requireAuth, async (req, res, next) => {
    try {
      const conversationId = req.params.conversationId;
      const authorized = await authorizedConversation(conversationId, req.user.uid);
      if (authorized.error) return res.status(authorized.status).json({ error: authorized.error });

      const requestedLimit = Number(req.query.limit);
      const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 50;
      const beforeParam = Number(req.query.before);
      const hasBefore = Number.isFinite(beforeParam) && beforeParam > 0;

      const [snapshot, typingSnap, presenceSnap] = await Promise.all([
        database.ref(`messaging/messages/${conversationId}`).orderByChild("createdAt").get(),
        database.ref(`messaging/typing/${conversationId}/${authorized.otherUid}`).get(),
        database.ref(`messaging/presence/${authorized.otherUid}`).get()
      ]);

      const visibleAll = snapshotToList(snapshot.val())
        .filter((item) => item?.deletedFor?.[req.user.uid] !== true)
        .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));

      const filtered = hasBefore
        ? visibleAll.filter((item) => (Number(item.createdAt) || 0) < beforeParam)
        : visibleAll;

      const hasMore = filtered.length > limit;
      const messages = hasMore ? filtered.slice(-limit) : filtered;
      const typingVal = typingSnap.val() || {};
      const presenceVal = presenceSnap.val() || {};
      const otherTyping = Boolean(typingVal.isTyping && Date.now() - Number(typingVal.updatedAt || 0) < 8000);
      const otherPresence = {
        online: Boolean(presenceVal.online && Date.now() - Number(presenceVal.lastSeenAt || 0) < 120_000),
        lastSeenAt: Number(presenceVal.lastSeenAt) || 0
      };

      res.json({ messages, hasMore, otherTyping, otherPresence });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/conversations/:conversationId/messages", requireAuth, async (req, res, next) => {
    try {
      if (!allowMessageAction(`send:${req.user.uid}`, 40)) {
        return res.status(429).json({ error: "You are sending messages too quickly. Please wait and try again." });
      }
      if (!payloadHasOnly(req.body, ["text", "messageId", "replyToMessageId"])) {
        return res.status(400).json({ error: "Only text messages and message replies are supported; attachments are not accepted." });
      }
      const messageId = String(req.body.messageId || "").trim();
      if (!validRecordId(messageId) || messageId.length > 120) return res.status(400).json({ error: "A valid message ID is required." });
      const text = validateTextMessage(req.body.text, 2000);
      const replyToMessageId = req.body.replyToMessageId === undefined || req.body.replyToMessageId === null || req.body.replyToMessageId === ""
        ? null
        : String(req.body.replyToMessageId).trim();
      if (replyToMessageId && (!validRecordId(replyToMessageId) || replyToMessageId.length > 120)) {
        return res.status(400).json({ error: "Invalid reply target message ID." });
      }

      const conversationId = req.params.conversationId;
      const authorized = await authorizedConversation(conversationId, req.user.uid);
      if (authorized.error) return res.status(authorized.status).json({ error: authorized.error });
      const { record: conversation, otherUid } = authorized;
      const [sender, recipient] = await Promise.all([
        getEligibleProfile(req.user.uid),
        getEligibleProfile(otherUid)
      ]);
      if (!sender || !recipient) return res.status(403).json({ error: "A student account is no longer eligible for messaging." });

      let replyMetadata = {};
      if (replyToMessageId) {
        const targetSnap = await database.ref(`messaging/messages/${conversationId}/${replyToMessageId}`).get();
        const target = targetSnap.val();
        if (!targetSnap.exists() || !target || target.deletedForEveryone === true || target.deletedFor?.[req.user.uid] === true) {
          return res.status(400).json({ error: "The message you are replying to could not be found." });
        }
        const replyToSenderUid = String(target.senderUid || "");
        const replyToSenderName = replyToSenderUid === req.user.uid
          ? sender.publicProfile.name
          : (replyToSenderUid === otherUid ? recipient.publicProfile.name : "Student");
        replyMetadata = {
          replyToMessageId,
          replyToSenderUid,
          replyToSenderName,
          replyToText: String(target.text || "").slice(0, 200)
        };
      }

      const now = Date.now();
      const message = {
        id: messageId,
        messageId,
        conversationId,
        senderUid: req.user.uid,
        text,
        createdAt: now,
        deliveryStatus: "sent",
        readBy: { [req.user.uid]: true },
        ...replyMetadata
      };
      const messageRef = database.ref(`messaging/messages/${conversationId}/${messageId}`);
      const existingMessage = await messageRef.get();
      if (existingMessage.exists()) {
        const prior = existingMessage.val();
        if (
          prior.senderUid !== req.user.uid ||
          prior.text !== text ||
          (prior.replyToMessageId || null) !== (replyToMessageId || null)
        ) {
          return res.status(409).json({ error: "This message ID has already been used." });
        }
      }
      const result = await messageRef.transaction((current) => current || message);
      const saved = result.snapshot.val();
      if (saved.senderUid !== req.user.uid || saved.text !== text) {
        return res.status(409).json({ error: "This message ID has already been used." });
      }
      const preview = text.slice(0, 160);
      await database.ref(`messaging/conversations/${conversationId}`).transaction((current) => {
        if (!current) return null;
        if (current.status !== "active" || current.acceptedRequestId !== conversation.acceptedRequestId) return undefined;
        if (Number(current.lastMessageAt) > Number(saved.createdAt)) return current;
        return {
          ...current,
          updatedAt: Math.max(now, Number(current.updatedAt) || 0),
          lastMessagePreview: preview,
          lastMessageAt: Number(saved.createdAt),
          lastMessageSenderUid: req.user.uid
        };
      });
      await Promise.all([
        updateUserConversation(req.user.uid, conversationId, (current) => ({
          ...current,
          ...(Number(current.lastMessageAt) > Number(saved.createdAt) ? {} : {
            lastMessagePreview: preview,
            lastMessageAt: Number(saved.createdAt),
            updatedAt: Math.max(now, Number(current.updatedAt) || 0)
          }),
          unreadCount: 0
        })),
        updateUserConversation(otherUid, conversationId, (current) => {
          const processed = current.processedMessageIds || {};
          const alreadyCounted = Object.prototype.hasOwnProperty.call(processed, messageId);
          return {
            ...current,
            ...(Number(current.lastMessageAt) > Number(saved.createdAt) ? {} : {
              lastMessagePreview: preview,
              lastMessageAt: Number(saved.createdAt),
              updatedAt: Math.max(now, Number(current.updatedAt) || 0)
            }),
            unreadCount: (Number(current.unreadCount) || 0) + (existingMessage.exists() || alreadyCounted ? 0 : 1),
            processedMessageIds: Object.fromEntries(
              Object.entries({ ...processed, [messageId]: Number(saved.createdAt) })
                .sort((a, b) => Number(a[1]) - Number(b[1]))
                .slice(-200)
            )
          };
        }),
        database.ref(`messaging/typing/${conversationId}/${req.user.uid}`).set({ isTyping: false, updatedAt: now })
      ]);
      await database.ref(`messaging/notifications/${otherUid}/message-${messageId}`).transaction((current) => current || ({
        id: `message-${messageId}`,
        type: "message",
        title: "New message",
        message: `New message from ${sender.publicProfile.name}.`,
        conversationId,
        createdAt: Number(saved.createdAt) || now,
        read: false
      }));
      res.status(existingMessage.exists() ? 200 : 201).json({ message: saved });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/conversations/:conversationId/delivered", requireAuth, async (req, res, next) => {
    try {
      const conversationId = req.params.conversationId;
      const authorized = await authorizedConversation(conversationId, req.user.uid);
      if (authorized.error) return res.status(authorized.status).json({ error: authorized.error });

      const messagesSnap = await database.ref(`messaging/messages/${conversationId}`).get();
      const raw = messagesSnap.val() || {};
      const now = Date.now();
      const updates = {};
      for (const [msgId, msg] of Object.entries(raw)) {
        if (!msg || typeof msg !== "object") continue;
        if (
          msg.senderUid === authorized.otherUid &&
          msg.deletedForEveryone !== true &&
          msg.deliveryStatus !== "read" &&
          msg.deliveryStatus !== "delivered" &&
          msg.readBy?.[req.user.uid] !== true
        ) {
          updates[`messaging/messages/${conversationId}/${msgId}/deliveryStatus`] = "delivered";
          updates[`messaging/messages/${conversationId}/${msgId}/deliveredAt`] = now;
        }
      }
      if (Object.keys(updates).length) {
        await database.ref().update(updates);
      }
      res.json({ ok: true, updated: Object.keys(updates).length / 2 });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/conversations/:conversationId/read", requireAuth, async (req, res, next) => {
    try {
      const conversationId = req.params.conversationId;
      const authorized = await authorizedConversation(conversationId, req.user.uid);
      if (authorized.error) return res.status(authorized.status).json({ error: authorized.error });
      const now = Date.now();

      const userConversationRef = database.ref(`messaging/userConversations/${req.user.uid}/${conversationId}`);
      await userConversationRef.transaction((current) => (current ? { ...current, unreadCount: 0 } : null));

      const messagesSnap = await database.ref(`messaging/messages/${conversationId}`).get();
      const raw = messagesSnap.val() || {};
      const updates = {};
      for (const [msgId, msg] of Object.entries(raw)) {
        if (!msg || typeof msg !== "object") continue;
        if (
          msg.senderUid === authorized.otherUid &&
          (msg.readBy?.[req.user.uid] !== true || msg.deliveryStatus !== "read")
        ) {
          updates[`messaging/messages/${conversationId}/${msgId}/readBy/${req.user.uid}`] = true;
          updates[`messaging/messages/${conversationId}/${msgId}/deliveryStatus`] = "read";
          updates[`messaging/messages/${conversationId}/${msgId}/deliveredAt`] = Number(msg.deliveredAt) || now;
          updates[`messaging/messages/${conversationId}/${msgId}/readAt`] = Number(msg.readAt) || now;
        }
      }
      if (Object.keys(updates).length) {
        await database.ref().update(updates);
      }

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/messages/conversations/:conversationId/messages/:messageId", requireAuth, async (req, res, next) => {
    try {
      const { conversationId, messageId } = req.params;
      if (!validRecordId(messageId) || messageId.length > 120) {
        return res.status(400).json({ error: "Invalid message ID." });
      }
      const scope = String(req.query.scope || req.body?.scope || "me").trim().toLowerCase();
      if (!["me", "everyone"].includes(scope)) {
        return res.status(400).json({ error: "Choose delete for me or delete for everyone." });
      }

      const authorized = await authorizedConversation(conversationId, req.user.uid);
      if (authorized.error) return res.status(authorized.status).json({ error: authorized.error });

      const messageRef = database.ref(`messaging/messages/${conversationId}/${messageId}`);
      const msgSnap = await messageRef.get();
      if (!msgSnap.exists()) return res.status(404).json({ error: "Message not found." });
      const message = msgSnap.val();
      const now = Date.now();

      if (scope === "everyone") {
        if (message.senderUid !== req.user.uid) {
          return res.status(403).json({ error: "Only the sender can delete a message for everyone." });
        }
        await database.ref().update({
          [`messaging/messages/${conversationId}/${messageId}/deletedForEveryone`]: true,
          [`messaging/messages/${conversationId}/${messageId}/deletedAt`]: now,
          [`messaging/messages/${conversationId}/${messageId}/deletedBy`]: req.user.uid,
          [`messaging/messages/${conversationId}/${messageId}/text`]: ""
        });
        const allMsgs = snapshotToList((await database.ref(`messaging/messages/${conversationId}`).get()).val())
          .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
        const newest = allMsgs[allMsgs.length - 1];
        if (!newest || newest.id === messageId) {
          const preview = "This message was deleted";
          await Promise.all([
            database.ref(`messaging/conversations/${conversationId}/lastMessagePreview`).set(preview),
            updateUserConversation(req.user.uid, conversationId, (c) => ({ ...c, lastMessagePreview: preview })),
            updateUserConversation(authorized.otherUid, conversationId, (c) => ({ ...c, lastMessagePreview: preview }))
          ]);
        }
        return res.json({ ok: true, id: messageId, scope: "everyone" });
      }

      await database.ref(`messaging/messages/${conversationId}/${messageId}/deletedFor/${req.user.uid}`).set(true);
      const visibleRemaining = snapshotToList((await database.ref(`messaging/messages/${conversationId}`).get()).val())
        .filter((item) => item?.deletedFor?.[req.user.uid] !== true)
        .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
      const latestForMe = visibleRemaining[visibleRemaining.length - 1];
      const nextPreview = latestForMe
        ? (latestForMe.deletedForEveryone ? "This message was deleted" : String(latestForMe.text || "").slice(0, 160))
        : "Conversation started";
      await updateUserConversation(req.user.uid, conversationId, (current) => ({
        ...current,
        lastMessagePreview: nextPreview,
        lastMessageAt: Number(latestForMe?.createdAt || current.lastMessageAt) || 0
      }));
      res.json({ ok: true, id: messageId, scope: "me" });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/messages/conversations/:conversationId/typing", requireAuth, async (req, res, next) => {
    try {
      if (!payloadHasOnly(req.body, ["isTyping"])) return res.status(400).json({ error: "Unsupported typing payload." });
      const conversationId = req.params.conversationId;
      const authorized = await authorizedConversation(conversationId, req.user.uid);
      if (authorized.error) return res.status(authorized.status).json({ error: authorized.error });
      const isTyping = Boolean(req.body.isTyping);
      const now = Date.now();
      await database.ref(`messaging/typing/${conversationId}/${req.user.uid}`).set({ isTyping, updatedAt: now });
      res.json({ ok: true, isTyping, updatedAt: now });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/messages/presence", requireAuth, async (req, res, next) => {
    try {
      if (!payloadHasOnly(req.body, ["online"])) return res.status(400).json({ error: "Unsupported presence payload." });
      const now = Date.now();
      const online = Boolean(req.body.online);
      await database.ref(`messaging/presence/${req.user.uid}`).set({ online, lastSeenAt: now });
      res.json({ ok: true, online, lastSeenAt: now });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = { registerMessagingRoutes };
