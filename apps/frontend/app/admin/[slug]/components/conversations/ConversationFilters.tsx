// frontend/app/admin/[slug]/components/conversations/ConversationFilters.tsx

import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { FILTER_OPTIONS } from './constants';

interface ConversationFiltersProps {
  filterStatus: 'all' | 'active' | 'archived' | 'completed' | 'resolved';
  setFilterStatus: (status: 'all' | 'active' | 'archived' | 'completed' | 'resolved') => void;
  filterSearch: string;
  setFilterSearch: (search: string) => void;
  onRefresh: () => void;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  loading: boolean;
}

export default function ConversationFilters({
  filterStatus,
  setFilterStatus,
  filterSearch,
  setFilterSearch,
  onRefresh,
  primary,
  textColor,
  isDarkBg,
  loading,
}: ConversationFiltersProps) {
  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilterStatus(option.id as any)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
              filterStatus === option.id
                ? 'text-white border-transparent shadow-sm'
                : `opacity-70 hover:opacity-100 ${isDarkBg ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-black/5'}`
            }`}
            style={{
              backgroundColor: filterStatus === option.id ? primary : 'transparent',
              borderColor: filterStatus === option.id ? 'transparent' : borderDynamic,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" style={{ color: textColor }} />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Buscar conversación..."
            className="w-full border rounded-xl pl-8 pr-3 py-1.5 text-[10px] outline-none bg-transparent"
            style={{ borderColor: borderDynamic, color: textColor }}
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-xl border hover:opacity-70 transition disabled:opacity-50"
          style={{ borderColor: borderDynamic, color: textColor }}
          title="Refrescar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}