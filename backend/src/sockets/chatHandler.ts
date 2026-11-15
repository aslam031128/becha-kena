import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { MessageType } from '../constants/enums.js';
import { stripExternalLinks, detectScamPatterns, SCAM_WARNING_MESSAGE } from '../utils/scamDetector.js';
import { logger } from '../utils/logger.js';

export const registerChatHandlers = (io: SocketIOServer, socket: Socket): void => {
  const user = socket.data.user;

  // Join personal user events room for targeted alerts (price drops, deals)
  if (user?.userId) {
    socket.join(`user:events_${user.userId}`);
  }

  /**
   * Event: join_conversation / join_chat
   * Validates participant status and joins conversation thread room
   */
  const handleJoinChat = async (data: { conversationId: string }, callback?: (res: any) => void) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId || conversationId === 'undefined' || !mongoose.Types.ObjectId.isValid(conversationId)) {
        if (callback) callback({ success: false, message: 'Invalid conversation ID' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ success: false, message: 'Conversation not found' });
        return;
      }

      const isParticipant =
        conversation.buyerId.toString() === user.userId ||
        conversation.sellerId.toString() === user.userId;

      if (!isParticipant) {
        if (callback) callback({ success: false, message: 'Unauthorized to join this conversation' });
        return;
      }

      const roomName = `conversation:${conversationId}`;
      socket.join(roomName);
      logger.info(`User ${user.userId} joined room ${roomName}`);

      if (callback) {
        callback({ success: true, conversationId, room: roomName });
      }
    } catch (error: any) {
      logger.error(`[join_conversation] Error: ${error.message}`);
      if (callback) callback({ success: false, message: error.message });
    }
  };

  socket.on('join_conversation', handleJoinChat);
  socket.on('join_chat', handleJoinChat);

  const handleLeaveChat = (data: { conversationId: string }) => {
    const { conversationId } = data || {};
    if (conversationId && conversationId !== 'undefined') {
      socket.leave(`conversation:${conversationId}`);
    }
  };

  socket.on('leave_conversation', handleLeaveChat);
  socket.on('leave_chat', handleLeaveChat);

  /**
   * Event: send_message
   * Strips external phishing links, detects advance payment scam patterns,
   * persists to MongoDB, and broadcasts to room.
   */
  socket.on('send_message', async (data: { conversationId: string; text?: string; content?: string }, callback?: (res: any) => void) => {
    try {
      const { conversationId } = data || {};
      const text = data?.text || data?.content || '';

      if (!conversationId || conversationId === 'undefined' || !mongoose.Types.ObjectId.isValid(conversationId)) {
        if (callback) callback({ success: false, message: 'Invalid conversation ID' });
        return;
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        if (callback) callback({ success: false, message: 'Message text cannot be empty' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ success: false, message: 'Conversation not found' });
        return;
      }

      const isParticipant =
        conversation.buyerId.toString() === user.userId ||
        conversation.sellerId.toString() === user.userId;

      if (!isParticipant) {
        if (callback) callback({ success: false, message: 'Unauthorized to post to this conversation' });
        return;
      }

      // 1. Phishing & Courier Scam Defense: Strip external hyperlinks and .apk downloads
      const sanitizedText = stripExternalLinks(text);

      // 2. In-Flight Scam Moderation Pipeline
      const hasScamWarning = detectScamPatterns(sanitizedText);

      // 3. Persist to MongoDB
      const message = await Message.create({
        conversationId: conversation._id,
        senderId: new mongoose.Types.ObjectId(user.userId),
        text: sanitizedText,
        messageType: MessageType.TEXT,
        hasScamWarning
      });

      // 4. Update Conversation denormalized preview
      conversation.lastMessage = {
        text: sanitizedText,
        senderId: new mongoose.Types.ObjectId(user.userId),
        createdAt: message.createdAt
      };
      conversation.updatedAt = new Date();
      await conversation.save();

      const payload = {
        id: message._id.toString(),
        conversationId: conversation._id.toString(),
        senderId: user.userId,
        type: 'text',
        messageType: message.messageType,
        text: sanitizedText,
        content: sanitizedText,
        hasScamWarning,
        ...(hasScamWarning && { warningText: SCAM_WARNING_MESSAGE }),
        createdAt: message.createdAt
      };

      // 5. Broadcast to room
      io.to(`conversation:${conversationId}`).emit('new_message', payload);

      if (callback) {
        callback({ success: true, data: payload });
      }
    } catch (error: any) {
      logger.error(`[send_message] Error: ${error.message}`);
      if (callback) callback({ success: false, message: error.message });
    }
  });

  /**
   * Event: typing / typing_start / typing_stop
   * Emits live typing status to other chat participant
   */
  socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
    const { conversationId, isTyping } = data || {};
    if (conversationId && conversationId !== 'undefined') {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: user.userId,
        conversationId,
        isTyping: Boolean(isTyping)
      });
    }
  });

  socket.on('typing_start', (data: { conversationId: string }) => {
    const { conversationId } = data || {};
    if (conversationId && conversationId !== 'undefined') {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: user.userId,
        conversationId,
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', (data: { conversationId: string }) => {
    const { conversationId } = data || {};
    if (conversationId && conversationId !== 'undefined') {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: user.userId,
        conversationId,
        isTyping: false
      });
    }
  });
};

