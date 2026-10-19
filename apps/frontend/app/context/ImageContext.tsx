// frontend/context/ImageContext.tsx
'use client';

import React, { createContext, useContext, useCallback } from 'react';

interface ImageContextType {
  getImageUrl: (image: string | null | undefined) => string | null;
  validateImage: (url: string) => Promise<boolean>;
  placeholderImage: string;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getImageUrl = useCallback((image: string | null | undefined): string | null => {
    if (!image) return null;
    if (image.startsWith('http') || image.startsWith('blob:')) return image;
    if (image.startsWith('data:')) return image;
    
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const cleanPath = image.startsWith('/') ? image : `/${image}`;
    return `${base}${cleanPath}`;
  }, []);

  const validateImage = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const placeholderImage = '/placeholder-product.png';

  return (
    <ImageContext.Provider value={{ getImageUrl, validateImage, placeholderImage }}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImage = () => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImage must be used within ImageProvider');
  }
  return context;
};