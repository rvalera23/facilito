// frontend/app/admin/[slug]/components/conversations/ConversationCard.tsx

import React from 'react';
import { Conversation } from './types';
import { formatDate, getInitials, getFullAvatarUrl } from './utils/conversationUtils';
import { CONVERSATION_STATUS } from './constants';
import { Archive } from 'lucide-react';

interface ConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  unreadCount?: number;
}

export default function ConversationCard({
  conversation,
  isSelected,
  onSelect,
  primary,
  textColor,
  isDarkBg,
  unreadCount = 0,
}: ConversationCardProps) {
  const statusConfig = CONVERSATION_STATUS[conversation.status] || CONVERSATION_STATUS.active;
  const isArchived = conversation.status === 'archived';
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const lastMessageText = lastMessage?.content || 'Sin mensajes';
  const lastMessageDate = lastMessage?.createdAt || conversation.updatedAt || conversation.createdAt;
  const buyerName = conversation.buyer?.name || 'Cliente anónimo';
  const avatarUrl = getFullAvatarUrl(conversation.buyer?.avatarUrl || conversation.buyer?.avatar);

  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      onClick={() => onSelect(conversation)}
      className={`p-3 rounded-xl border cursor-pointer transition-all hover:bg-white/5 ${
        isSelected ? 'border' : ''
      } ${isArchived ? 'opacity-60' : ''}`}
      style={{
        borderColor: isSelected ? primary : borderDynamic,
        borderLeftColor: isSelected ? primary : borderDynamic,
        backgroundColor: isSelected ? (isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden relative"
          style={{
            backgroundColor: isArchived ? '#64748b20' : `${primary}20`,
            color: isArchived ? '#64748b' : primary,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={buyerName} className="w-full h-full object-cover" />
          ) : (
            getInitials(buyerName)
          )}
          {isArchived && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Archive className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold truncate ${isArchived ? 'line-through opacity-50' : ''}`} style={{ color: textColor }}>
                {buyerName}
              </p>
              {isArchived && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-500 border border-slate-500/30">
                  Archivada
                </span>
              )}
            </div>
            <span className="text-[9px] opacity-40 shrink-0 ml-2" style={{ color: textColor }}>
              {formatDate(lastMessageDate)}
            </span>
          </div>

          <p className={`text-[10px] truncate mt-0.5 ${isArchived ? 'opacity-40' : 'opacity-60'}`} style={{ color: textColor }}>
            {lastMessageText.length > 50 ? lastMessageText.slice(0, 50) + '...' : lastMessageText}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                color: statusConfig.color,
                backgroundColor: statusConfig.bg,
                border: `1px solid ${statusConfig.color}30`,
              }}
            >
              {statusConfig.label}
            </span>

            {conversation.product?.name && (
              <span className="text-[8px] opacity-40 truncate max-w-[100px]" style={{ color: textColor }}>
                {conversation.product.name}
              </span>
            )}

            {unreadCount > 0 && !isArchived && (
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: primary }}
              >
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}