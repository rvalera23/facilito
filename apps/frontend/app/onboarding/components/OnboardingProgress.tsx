'use client';

import React, { useEffect, useState } from 'react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  primaryColor: string;
  isLight: boolean;
  stepNames?: string[];
}

export default function OnboardingProgress({
  currentStep,
  totalSteps,
  primaryColor,
  isLight,
  stepNames,
}: OnboardingProgressProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(true);
    const timer = setTimeout(() => setAnimated(false), 600);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Nombres de los pasos
   // Nombres de los pasos (fallback según totalSteps)
  const defaultStepNames = totalSteps === 3
    ? ['Datos', 'Dirección', 'Marca']
    : ['Datos', 'Ubicación', 'Configuración', 'Pagos', 'Marca'];

  const names = stepNames && stepNames.length === totalSteps
    ? stepNames
    : defaultStepNames;

  const currentName = names[currentStep - 1] || '';

  return (
    <div className="space-y-5">
      {/* 🔥 TÍTULO SIN BADGE - TEXTO NORMAL CON ANIMACIÓN */}
      <div className="text-center">
        <h2
          className={`text-base sm:text-lg font-bold tracking-tight transition-all duration-500 ${
            animated ? 'scale-105' : 'scale-100'
          }`}
          style={{
            color: isLight ? '#0f172a' : '#ffffff',
          }}
        >
          Paso {currentStep} de {totalSteps} —{' '}
          <span style={{ color: primaryColor }}>{currentName}</span>
        </h2>
        <div
          className={`w-12 h-0.5 mx-auto mt-1.5 rounded-full transition-all duration-700 ${
            animated ? 'w-20' : 'w-12'
          }`}
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* 🔥 LÍNEA DE TIEMPO CON ANIMACIONES */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-3 py-1 overflow-x-auto">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
          const isActive = currentStep === s;
          const isCompleted = currentStep > s;

          return (
            <div key={s} className="flex items-center space-x-2 sm:space-x-3">
              {/* Círculo */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full font-bold text-xs transition-all duration-500 ${
                  isActive ? 'scale-110' : ''
                } ${isCompleted ? 'animate-pulse-once' : ''}`}
                style={
                  isActive
                    ? {
                        backgroundColor: primaryColor,
                        color: '#ffffff',
                        boxShadow: `0 8px 20px -4px ${primaryColor}60`,
                      }
                    : isCompleted
                    ? {
                        backgroundColor: `${primaryColor}20`,
                        color: primaryColor,
                        border: `2px solid ${primaryColor}`,
                      }
                    : {
                        backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                        color: isLight ? '#94a3b8' : '#64748b',
                        border: `2px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                      }
                }
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{s}</span>
                )}
              </div>

              {/* Barra conectora */}
              {s < totalSteps && (
                <div
                  className={`h-1 w-5 sm:w-10 rounded-full transition-all duration-500 ${
                    currentStep > s ? 'animate-pulse-once' : ''
                  }`}
                  style={{
                    backgroundColor: currentStep > s ? primaryColor : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}