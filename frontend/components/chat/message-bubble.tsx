import React from 'react';
import { ChatMessage } from '@/lib/types/chat.types';

interface MessageBubbleProps {
  message: ChatMessage;
  isSentByMe: boolean;
}

export function MessageBubble({ message, isSentByMe }: MessageBubbleProps) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] italic font-medium">
          {message.content || message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} my-1`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
          isSentByMe
            ? 'bg-emerald-600 text-white rounded-br-xs shadow-xs'
            : 'bg-slate-100 text-slate-900 rounded-bl-xs'
        }`}
      >
        {message.mediaUrl && (
          <div className="mb-2 rounded-lg overflow-hidden max-h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.mediaUrl} alt="Media" className="w-full h-full object-cover" />
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content || message.text}</p>
      </div>

      <span className="text-[10px] text-slate-400 mt-0.5 px-1">
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}

