// frontend/app/admin/[slug]/components/conversations/EmptyState.tsx

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'chat' | 'inbox' | 'search' | 'check';
  textColor: string;
  isDarkBg: boolean;
}

export default function EmptyState({ title, description, icon = 'chat', textColor, isDarkBg }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <MessageSquare className="w-12 h-12 opacity-20" style={{ color: textColor }} />
      <p className="text-sm font-medium opacity-70 mt-4" style={{ color: textColor }}>
        {title}
      </p>
      <p className="text-xs opacity-40 mt-1" style={{ color: textColor }}>
        {description}
      </p>
    </div>
  );
}