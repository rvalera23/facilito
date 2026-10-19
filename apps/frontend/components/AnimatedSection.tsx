// components/AnimatedSection.tsx
'use client';

import React from 'react';
import { useInView } from '@/hooks/useInView';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  as?: 'section' | 'div' | 'article' | 'header' | 'footer';
  distance?: number;
  id?: string;
}

export default function AnimatedSection({
  children,
  className = '',
  delay = 0,
  duration = 700,
  as: Tag = 'section',
  distance = 24,
  id,
}: AnimatedSectionProps) {
  const [ref, isInView] = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref as any}
      id={id}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: isInView ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}