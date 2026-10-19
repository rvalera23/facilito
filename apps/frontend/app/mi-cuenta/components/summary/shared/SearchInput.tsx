'use client';

import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textColor: string;
  subtleBorderColor: string;
  className?: string;
}

export default function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Buscar...', 
  textColor, 
  subtleBorderColor,
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative w-full sm:w-72 ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none w-full transition"
        style={{ borderColor: subtleBorderColor, color: textColor }}
      />
    </div>
  );
}