'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Save, User, Store, CreditCard, Settings, Shield, Truck, Clock, LayoutGrid, MessageCircle, Monitor, Key } from 'lucide-react';
import { useTenantSettings } from './hooks/useTenantSettings';
import TerminalList from './subcomponents/TerminalList';
import ActiveStore from './subcomponents/ActiveStore';
import MultiplePaymentMethods from './subcomponents/MultiplePaymentMethods';
import MultipleBinance from './subcomponents/MultipleBinance';
import MultiplePagoMovil from './subcomponents/MultiplePagoMovil';
import DeliverySettings from './subcomponents/DeliverySettings';
import { TokenModal } from './subcomponents/Modals/TokenModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import SecurityPin from './subcomponents/SecurityPin';
import PinModal from './subcomponents/Modals/PinModal';
import { useSecurityPin } from './hooks/useSecurityPin';
import { PHONE_OPERATORS, ID_TYPES } from '@/app/onboarding/components/step-contact-account/paymentConstants';
import { useIVA } from '@/app/context/IvaContext';
import ProfileSecurity from '@/components/ProfileSecurity';
import SessionsList from '@/app/mi-cuenta/components/security/SessionsList';
import { performLogout } from '@/lib/auth/logout';
interface SettingsTabProps {
  tenant: any;
  businessType?: string;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onUpdateTenant?: (updatedData: any) => void;
  onDeleteTenant?: () => void;
  brandConfig?: any;
  onChangeConfig?: (config: any) => void;
  // 🔥 TerminalManager externo (viene del page.tsx). Si no llega, se crea uno local.
  terminalManagerExternal?: any;
}

const SECTIONS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'work-modality', label: 'Modalidad', icon: LayoutGrid },
  { id: 'payment-methods', label: 'Métodos de Pago', icon: CreditCard },
  { id: 'binance', label: 'Binance', icon: Settings },
  { id: 'delivery', label: 'Envíos', icon: Truck, hideInService: true },
  { id: 'schedule', label: 'Horarios', icon: Clock },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'kiosk', label: 'Kiosko', icon: Monitor },
];
export default function SettingsTab({ 
  tenant, 
  businessType, 
  primary, 
  secondary, 
  textColor, 
  isDarkBg, 
  onUpdateTenant,
  onDeleteTenant,
  brandConfig,     
  onChangeConfig,
  terminalManagerExternal,
}: SettingsTabProps) {
  // 🔥 HOOK PARA EL IVA
  const { showIVA, toggleIVA } = useIVA();

  const {
    fullName, setFullName,
    storeName, setStoreName,
    ownerEmail,
    passwordManager,
    terminalManager,
    specificConfig, setSpecificConfig,
    showStoreNameModal, setShowStoreNameModal,
    storeNameConfirmation, setStoreNameConfirmation,
    showDeleteModal, setShowDeleteModal,
    deleteConfirmationText, setDeleteConfirmationText,
    showSuccessModal, setShowSuccessModal,
    saving, deleting, successMsg, errorMsg,
    hasChanges,
    handleSubmitForm, confirmAndSaveStoreName, handleDeleteAccount
   } = useTenantSettings(tenant, onUpdateTenant, {
    terminalManagerExternal,
  });

  // 🔥 ESTADO PARA LA SECCIÓN ACTIVA
  const [activeSection, setActiveSection] = useState('profile');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ⭐ FUNCIÓN PARA EXTRAER OPERADOR Y TELÉFONO
  const extractOperatorAndPhone = (fullNumber: string): { operator: string; phone: string } => {
    if (!fullNumber) {
      return { operator: '0414', phone: '' };
    }
    let clean = fullNumber.replace(/^\+?58/, '').replace(/[\s\-()]/g, '');
    const operators = ['0414', '0416', '0424', '0412', '0410', '0426', '0418'];
    for (const op of operators) {
      if (clean.startsWith(op)) {
        const phone = clean.replace(op, '').slice(0, 7);
        return { operator: op, phone: phone };
      }
    }
    return { operator: '0414', phone: clean.slice(-7) };
  };

  const VALID_OPERATORS = ['0414', '0416', '0424', '0412', '0410', '0426', '0418'];

  // ⭐ FUNCIÓN PARA PROCESAR PAGO MOVIL
  const processPagoMovilList = (list: any[]) => {
    if (!list || !list.length) {
      return [{ bank: '0102', operator: '0414', phone: '', idType: 'V', idNumber: '', phoneNumber: '' }];
    }
    
    return list.map((pm: any) => {
      // 🔥 PRIORIDAD 1: Si tiene phoneNumber, extraer de él
      if (pm.phoneNumber && pm.phoneNumber.length > 0) {
        const { operator, phone } = extractOperatorAndPhone(pm.phoneNumber);
        return {
          bank: pm.bankCode || pm.bank || '0102',
          operator: operator,
          phone: phone,
          idType: pm.idType || 'V',
          idNumber: pm.idNumber || '',
          phoneNumber: pm.phoneNumber
        };
      }
      
      // 🔥 PRIORIDAD 2: Si no tiene phoneNumber, usar operator y phone
      let operator = pm.operator || '0414';
      let phone = pm.phone ? pm.phone.replace(/\D/g, '').slice(0, 7) : '';
      
      if (!VALID_OPERATORS.includes(operator) && phone) {
        const fullNumber = `${operator}${phone}`;
        const extracted = extractOperatorAndPhone(fullNumber);
        if (VALID_OPERATORS.includes(extracted.operator)) {
          operator = extracted.operator;
          phone = extracted.phone;
        } else {
          operator = '0414';
        }
      }
      
      if (!VALID_OPERATORS.includes(operator)) {
        operator = '0414';
        if (phone.length > 7) {
          phone = phone.slice(-7);
        }
      }
      
      if (phone.length > 7) {
        phone = phone.slice(0, 7);
      }
      
      return {
        bank: pm.bank || '0102',
        operator: operator,
        phone: phone,
        idType: pm.idType || 'V',
        idNumber: pm.idNumber || '',
        phoneNumber: `${operator}${phone}`
      };
    });
  };

  // ⭐ ESTADO PARA MÚLTIPLES PAGO MÓVIL
  const [pagoMovilList, setPagoMovilList] = useState<Array<{ 
    bank: string; 
    operator: string; 
    phone: string; 
    idType: string; 
    idNumber: string;
    phoneNumber?: string;
  }>>(
    () => {
      const savedList = tenant?.specificConfig?.paymentMethods?.pagoMovilList;
      return processPagoMovilList(savedList);
    }
  );

  // ⭐ ESTADO PARA BINANCE
  const [binanceConfig, setBinanceConfig] = useState<{ payId: string; email: string }>(
    () => {
      const saved = tenant?.specificConfig?.paymentMethods?.binance;
      if (saved && (saved.payId || saved.email)) {
        return { payId: saved.payId || '', email: saved.email || '' };
      }
      return { payId: '', email: '' };
    }
  );

  // 🔥 HOOK PARA PIN DE SEGURIDAD
  const {
    pin,
    hasPin,
    isLoading: pinLoading,
    error: pinError,
    showPinModal,
    tempPin,
    pinConfirm,
    isSettingPin,
    setTempPin,
    setPinConfirm,
    savePin,
    deletePin,
    verifyPin,
    openPinModal,
    closePinModal,
  } = useSecurityPin({
    tenantId: tenant?.id,
    onUpdate: onUpdateTenant,
  });

  // ⭐ Sincronizar cuando cambie el tenant
  useEffect(() => {
    const savedList = tenant?.specificConfig?.paymentMethods?.pagoMovilList;
    const currentListString = JSON.stringify(pagoMovilList);
    const savedListString = JSON.stringify(savedList);
    
    if (savedList && savedList.length > 0 && currentListString !== savedListString) {
      const processedList = processPagoMovilList(savedList);
      setPagoMovilList(processedList);
    } else if (!savedList || savedList.length === 0) {
      const defaultList = [{ bank: '0102', operator: '0414', phone: '', idType: 'V', idNumber: '', phoneNumber: '' }];
      if (currentListString !== JSON.stringify(defaultList)) {
        setPagoMovilList(defaultList);
      }
    }

    const savedBinance = tenant?.specificConfig?.paymentMethods?.binance;
    if (savedBinance) {
      setBinanceConfig({ payId: savedBinance.payId || '', email: savedBinance.email || '' });
    } else {
      setBinanceConfig({ payId: '', email: '' });
    }
  }, [tenant?.specificConfig?.paymentMethods?.pagoMovilList, tenant?.specificConfig?.paymentMethods?.binance, tenant?.name]);

  // ⭐ GUARDAR - SIEMPRE RECONSTRUIR phoneNumber DESDE operator + phone
  useEffect(() => {
    if (pagoMovilList && Array.isArray(pagoMovilList) && pagoMovilList.length > 0) {
      const listToSave = pagoMovilList.map((pm: any) => {
        let operator = pm.operator || '0414';
        let phone = pm.phone || '';
        
        if (!VALID_OPERATORS.includes(operator) && phone) {
          const fullNumber = `${operator}${phone}`;
          const extracted = extractOperatorAndPhone(fullNumber);
          if (VALID_OPERATORS.includes(extracted.operator)) {
            operator = extracted.operator;
            phone = extracted.phone;
          } else {
            operator = '0414';
          }
        }
        
        const newPhoneNumber = `${operator}${phone}`;
        
        return {
          bank: pm.bank || '0102',
          operator: operator,
          phone: phone,
          idType: pm.idType || 'V',
          idNumber: pm.idNumber || '',
          phoneNumber: newPhoneNumber
        };
      });
      
      const updatedConfig = {
        ...specificConfig,
        paymentMethods: {
          ...specificConfig?.paymentMethods,
          pagoMovilList: listToSave,
          binance: specificConfig?.paymentMethods?.binance || { payId: '', email: '' }
        }
      };
      
      setSpecificConfig(updatedConfig);
      if (onChangeConfig) {
        onChangeConfig(updatedConfig);
      }
    }
  }, [pagoMovilList]);

  // ⭐ Guardar configuración de Binance
  useEffect(() => {
    const updatedConfig = {
      ...specificConfig,
      paymentMethods: {
        ...specificConfig?.paymentMethods,
        binance: binanceConfig
      }
    };
    setSpecificConfig(updatedConfig);
    if (onChangeConfig) {
      onChangeConfig(updatedConfig);
    }
  }, [binanceConfig]);

  // 🔥 FUNCIÓN PARA DESPLAZARSE A UNA SECCIÓN
const scrollToSection = (sectionId: string) => {
  setActiveSection(sectionId);
  const element = sectionRefs.current[sectionId];
  if (element) {
    // ✅ Encontrar el contenedor scrollable
    const scrollContainer = document.querySelector('main .overflow-y-auto') || 
                           document.querySelector('main') ||
                           window;
    
    // ✅ Usar scrollIntoView en el elemento
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start',
      inline: 'nearest'
    });
  }
};

  // 🔥 DETECTAR SECCIÓN ACTIVA AL HACER SCROLL
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
      const scrollPosition = window.scrollY + 100;
      let currentSection = 'profile';
      
      for (const section of SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollPosition >= offsetTop) {
            currentSection = section.id;
          }
        }
      }
      
      setActiveSection((previousSection) => (
        previousSection === currentSection ? previousSection : currentSection
      ));
        scrollFrameRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  // 🔥 DETECTAR EL TIPO DE NEGOCIO
  const rawModelType = 
    tenant?.itemType || 
    tenant?.modelType || 
    tenant?.businessType || 
    tenant?.workModality || 
    tenant?.work_modality || 
    businessType || 
    'product';

  const isService = 
    rawModelType === 'service' || 
    rawModelType === 'servicios' || 
    rawModelType === 'servicio' ||
    rawModelType === 'services';

  const formattedBusinessType = isService 
    ? 'CATÁLOGO DE SERVICIOS AGENDABLES' 
    : 'CATÁLOGO DE PRODUCTOS FÍSICOS';

  const isProductBusiness = !isService;
// 🔥 VALIDACIÓN DE SEGURIDAD PARA specificConfig
const workModality = specificConfig?.workModality || 'local';
  const modalityOptions = isService
    ? [
        { id: 'local', label: 'En el local', desc: 'El cliente va al negocio' },
        { id: 'delivery', label: 'A domicilio', desc: 'El profesional va al cliente' },
        { id: 'hybrid', label: 'Híbrido', desc: 'Local + A domicilio' },
        { id: 'remote', label: '100% Online / Remoto', desc: 'Atención virtual (videollamada, etc.)' },
      ]
    : [
        { id: 'local', label: 'Local / Tienda / Casa', desc: 'Punto físico de atención' },
        { id: 'delivery', label: 'Solo Delivery', desc: 'Envío a domicilio (sin local)' },
        { id: 'hybrid', label: 'Híbrido', desc: 'Local + Delivery' },
        { id: 'remote', label: '100% Online', desc: 'Venta digital / remota' },
      ];

  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');
  const itemBg = isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  const inputClass = `w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition placeholder:opacity-50`;
    const disabledInputClass = `w-full border rounded-xl px-3.5 py-2.5 text-xs cursor-not-allowed font-semibold opacity-60`;

  const handleSpecificConfigChange = (newConfig: any) => {
        setSpecificConfig(newConfig);
    if (onChangeConfig) {
      onChangeConfig(newConfig);
    }
  };

  // 🔥 FIX DEFINITIVO: Forzar estilos en los inputs de ProfileSecurity (contraseñas)
  useEffect(() => {
    const styleId = 'settings-security-fix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .security-inputs-wrapper input {
          background-color: ${isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'} !important;
          border: 1px solid ${isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} !important;
          color: ${textColor} !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        }
        .security-inputs-wrapper input:focus {
          outline: none !important;
          border-color: ${primary} !important;
          box-shadow: 0 0 0 2px ${primary}30 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, [isDarkBg, textColor, primary]);

  return (
    <div className="relative" style={{ colorScheme: isDarkBg ? 'dark' : 'light' }}>
        {/* 🔥 NAVEGACIÓN DE TABS - FULL WIDTH CON ANCHO EQUITATIVO */}
        <div className="mb-6">
          <div
            className="w-full flex gap-1 p-1.5 rounded-xl border shadow-sm overflow-x-auto"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            {SECTIONS.filter((section: any) => !(isService && section.hideInService)).map((section) => {
                            const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap cursor-pointer group ${
                    isActive ? 'shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? primary : 'transparent',
                    color: isActive ? '#ffffff' : textColor,
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-white' : 'opacity-60 group-hover:opacity-100'}`} />
                  <span className={isActive ? 'font-bold' : ''}>{section.label}</span>

                  {/* 🔥 DESCRIPCIÓN SOLO EN ESCRITORIO */}
                  <span className={`hidden lg:inline text-[9px] opacity-60 transition-opacity duration-300 ${
                    isActive ? 'text-white/80' : 'group-hover:opacity-100'
                  }`}>
                    {section.description || ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

<div 
  className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-[background-color,border-color,box-shadow,color]"
  style={{ 
    backgroundColor: cardBg,
    borderColor: cardBorder,
    color: textColor
  }}
>
  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
    <div>
      <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
        Configuración de la Cuenta y Negocio
      </h3>
      <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
        Gestiona tu nombre completo, nombre de tienda, parámetros de pago móvil y credenciales de acceso.
      </p>
    </div>
    <div 
      className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" 
      style={{ borderColor: cardBorder, color: textColor }}
    >
      <Settings className="w-4 h-4" />
    </div>
  </div>



        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs rounded-xl text-center font-semibold animate-fadeIn">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="space-y-4">
        {/* 🔥 SECCIÓN: PERFIL */}
          <div ref={(el) => { sectionRefs.current['profile'] = el; }} id="profile" className="scroll-mt-20"><div className="flex items-center gap-2 pb-2">
              <User className="w-4 h-4" style={{ color: primary }} />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Perfil</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
                  Nombre Completo <span className="text-[10px] font-normal opacity-65">(Cómo te llama facilito)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  style={{ 
                    color: textColor,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Usuario / Correo Electrónico Registrado<span className="text-[10px] font-normal opacity-60">(Único e inmutable)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={ownerEmail}
                  className={disabledInputClass}
                  style={{ 
                    color: textColor,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
                  }}
                />
              </div>
            </div>
          </div>
          {/* 🔥 SECCIÓN: TIENDA */}
          <div ref={(el) => { sectionRefs.current['store'] = el; }} id="store" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">  <div className="flex items-center gap-2 pb-2">
              <Store className="w-4 h-4" style={{ color: primary }} />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Tienda</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
                  Nombre de la Tienda <span className="text-[10px] font-normal opacity-60">(Requiere confirmación al modificar)</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className={inputClass}
                  style={{ 
                    color: textColor,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
                  Slug / Enlace Público de la Tienda
                </label>
                <input
                  type="text"
                  disabled
                  value={`/tienda/${tenant?.slug || 'nodo-hogar'}`}
                  className={disabledInputClass}
                  style={{ 
                    color: textColor,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
                  Modelo de Negocio <span className="text-[10px] font-normal opacity-60">(Producto o Servicio)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={formattedBusinessType}
                  style={{ 
                    color: primary,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
                  }}
                  className={`${disabledInputClass} font-bold`}
                />
              </div>
            </div>
          </div>


  {/* 🔥 MODALIDAD DE TRABAJO */}
          <div ref={(el) => { sectionRefs.current['work-modality'] = el; }} id="work-modality" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">
  <div className="flex items-center gap-2 pb-2">
              <LayoutGrid className="w-4 h-4" style={{ color: primary }} />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Modalidad de Trabajo</h4>
            </div>
            <p className="text-[11px] opacity-65 mt-0.5" style={{ color: textColor }}>
              Define cómo gestionas la atención a tus clientes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3">
              {modalityOptions.map((item) => {
                const isSelected = workModality === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const newConfig = { ...specificConfig, workModality: item.id };
                      setSpecificConfig(newConfig);
                      if (onChangeConfig) onChangeConfig(newConfig);
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-current shadow-sm ring-1'
                        : `bg-transparent ${isDarkBg ? 'border-white/15' : 'border-slate-300'} ${isDarkBg ? 'text-white/60' : 'text-slate-600'} ${isDarkBg ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${primary}15`,
                            borderColor: primary,
                            color: primary,
                            ['--tw-ring-color' as any]: primary,
                          }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="text-xs font-bold">{item.label}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'text-white' : `${isDarkBg ? 'border-white/20' : 'border-slate-300'}`
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: primary, borderColor: primary }
                            : {}
                        }
                      >
                        {isSelected ? (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : ''}
                      </div>
                    </div>
                    <span className={`text-[10px] ${isDarkBg ? 'text-white/60' : 'text-slate-600'}`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {specificConfig && (
            <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: `${primary}30`, backgroundColor: `${primary}08` }}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: primary }}>
                  Configuración de Negocio
                </h5>
                <span 
                  className="text-[10px] opacity-60"
                  style={{ color: textColor }}
                >
                  {isProductBusiness ? 'Productos' : 'Servicios'}
                </span>
              </div>
              
              <div className="space-y-4">
                {isProductBusiness ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-semibold opacity-70 mb-1.5" style={{ color: textColor }}>
                        ¿Como entregas tus productos o atiendes la venta? *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {[
                          { id: 'delivery_propio', label: 'A Domicilio / Envío', desc: 'Llevar el producto al cliente' },
                          { id: 'retiro_local', label: 'Punto Fijo / Local', desc: 'El cliente compra en el puesto o tienda' },
                          { id: 'online', label: 'Online / Remoto', desc: 'Productos digitales o remoto' },
                          { id: 'ambos', label: 'Ambas opciones', desc: 'A domicilio y retiro presencial' },
                        ].map((item) => {
                          const isSelected = (specificConfig?.deliveryType || 'retiro_local') === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                const newConfig = { ...specificConfig, deliveryType: item.id };
                                setSpecificConfig(newConfig);
                                if (onChangeConfig) onChangeConfig(newConfig);
                              }}
                              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-current shadow-sm ring-1'
                                  : `bg-transparent ${isDarkBg ? 'border-white/15' : 'border-slate-300'} ${isDarkBg ? 'text-white/60' : 'text-slate-600'} ${isDarkBg ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`
                              }`}
                              style={
                                isSelected
                                  ? {
                                      backgroundColor: `${primary}15`,
                                      borderColor: primary,
                                      color: primary,
                                      ['--tw-ring-color' as any]: primary,
                                    }
                                  : {}
                              }
                            >
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className="text-xs font-bold">{item.label}</span>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                    isSelected ? 'text-white' : `${isDarkBg ? 'border-white/20' : 'border-slate-300'}`
                                  }`}
                                  style={
                                    isSelected
                                      ? { backgroundColor: primary, borderColor: primary }
                                      : {}
                                  }
                                >
                                  {isSelected ? (
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : ''}
                                </div>
                              </div>
                              <span className={`text-[10px] ${isDarkBg ? 'text-white/60' : 'text-slate-600'}`}>
                                {item.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold opacity-70 mb-1.5" style={{ color: textColor }}>
                        ¿Manejas variantes (tallas, sabores, presentaciones)? *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          { id: 'si', label: 'Sí, manejo variantes', desc: 'Diferentes tamaños, colores o tipos' },
                          { id: 'no', label: 'No, productos estándar', desc: 'Artículos directos sin variaciones' },
                        ].map((item) => {
                          const isSelected = (specificConfig?.hasVariants || 'no') === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                const newConfig = { ...specificConfig, hasVariants: item.id };
                                setSpecificConfig(newConfig);
                                if (onChangeConfig) onChangeConfig(newConfig);
                              }}
                              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-current shadow-sm ring-1'
                                  : `bg-transparent ${isDarkBg ? 'border-white/15' : 'border-slate-300'} ${isDarkBg ? 'text-white/60' : 'text-slate-600'} ${isDarkBg ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`
                              }`}
                              style={
                                isSelected
                                  ? {
                                      backgroundColor: `${primary}15`,
                                      borderColor: primary,
                                      color: primary,
                                      ['--tw-ring-color' as any]: primary,
                                    }
                                  : {}
                              }
                            >
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className="text-xs font-bold">{item.label}</span>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                    isSelected ? 'text-white' : `${isDarkBg ? 'border-white/20' : 'border-slate-300'}`
                                  }`}
                                  style={
                                    isSelected
                                      ? { backgroundColor: primary, borderColor: primary }
                                      : {}
                                  }
                                >
                                  {isSelected ? (
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : ''}
                                </div>
                              </div>
                              <span className={`text-[10px] ${isDarkBg ? 'text-white/60' : 'text-slate-600'}`}>
                                {item.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-semibold opacity-70 mb-1.5" style={{ color: textColor }}>
                      ¿Como gestionas la atención a tus clientes? *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'citas', label: 'Por Citas / Horas', desc: 'Agendamiento previo en calendario' },
                        { id: 'orden_llegada', label: 'Orden de Llegada / Tarifa Fija', desc: 'Atención dinámica, reparaciones o revisiones' },
                        { id: 'reservas', label: 'Reservas / Días o Equipos', desc: 'Bloqueo de equipos, espacios o jornadas' },
                      ].map((item) => {
                        const isSelected = (specificConfig?.serviceType || 'citas') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const newConfig = { ...specificConfig, serviceType: item.id };
                              setSpecificConfig(newConfig);
                              if (onChangeConfig) onChangeConfig(newConfig);
                            }}
                            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'border-current shadow-sm ring-1'
                                : `bg-transparent ${isDarkBg ? 'border-white/15' : 'border-slate-300'} ${isDarkBg ? 'text-white/60' : 'text-slate-600'} ${isDarkBg ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`
                            }`}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: `${primary}15`,
                                    borderColor: primary,
                                    color: primary,
                                    ['--tw-ring-color' as any]: primary,
                                  }
                                : {}
                            }
                          >
                            <div className="flex justify-between items-center w-full mb-1">
                              <span className="text-xs font-bold">{item.label}</span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                  isSelected ? 'text-white' : `${isDarkBg ? 'border-white/20' : 'border-slate-300'}`
                                }`}
                                style={
                                  isSelected
                                    ? { backgroundColor: primary, borderColor: primary }
                                    : {}
                                }
                              >
                                {isSelected ? (
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : ''}
                              </div>
                            </div>
                            <span className={`text-[10px] ${isDarkBg ? 'text-white/60' : 'text-slate-600'}`}>
                              {item.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t" style={{ borderColor: `${primary}20` }}>
                  <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                    <span className="font-semibold">Valor guardado:</span>{' '}
                    {isProductBusiness ? (
                      <>
                        {specificConfig?.deliveryType === 'retiro_local' && 'Punto Fijo / Local'}
                        {specificConfig?.deliveryType === 'delivery_propio' && 'Delivery / Envío'}
                        {specificConfig?.deliveryType === 'online' && 'Online / Remoto'}
                        {specificConfig?.deliveryType === 'ambos' && 'Ambas opciones'}
                        {!specificConfig?.deliveryType && 'No configurado'}
                        {' | '}
                        {specificConfig?.hasVariants === 'si' ? 'Con variantes' : 'Sin variantes'}
                      </>
                    ) : (
                      <>
                        {specificConfig?.serviceType === 'citas' && 'Por Citas / Horas'}
                        {specificConfig?.serviceType === 'orden_llegada' && 'Orden de Llegada'}
                        {specificConfig?.serviceType === 'reservas' && 'Reservas / Días o Equipos'}
                        {!specificConfig?.serviceType && 'No configurado'}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

           {/* 🔥 SECCIÓN: PAGOS - USANDO MultiplePagoMovil */}
          <div ref={(el) => { sectionRefs.current['payment-methods'] = el; }} id="payment-methods" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10"> <div className="flex items-center gap-2 pb-2">
              <CreditCard className="w-4 h-4" style={{ color: primary }} />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Métodos de Pago</h4>
            </div>
            
            <MultiplePagoMovil
              pagoMovilList={pagoMovilList}
              onUpdate={setPagoMovilList}
              textColor={textColor}
              primary={primary}
              inputClass={inputClass}
              isDarkBg={isDarkBg}
            />
          </div>

{/* 🔥 SECCIÓN: BINANCE */}
<div ref={(el) => { sectionRefs.current['binance'] = el; }} id="binance" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">
  <div className="flex items-center gap-2 pb-2">
    <Settings className="w-4 h-4" style={{ color: primary }} />
    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Binance Pay</h4>
  </div>
  <MultipleBinance
    config={binanceConfig}
    onChange={setBinanceConfig}
    textColor={textColor}
    primary={primary}
    inputClass={inputClass}
    isDarkBg={isDarkBg}
  />
</div>

          {/* 🔥 SECCIÓN: MÉTODOS DE PAGO MÚLTIPLES */}
          <div className="pt-4 border-t border-black/10 dark:border-white/10">
            <MultiplePaymentMethods
              specificConfig={specificConfig}
              onChangeConfig={handleSpecificConfigChange}
              textColor={textColor}
              primary={primary}
              inputClass={inputClass}
              isDarkBg={isDarkBg}
            />
          </div>

          {/* 🔥 SECCIÓN: ENVÍOS Y MENSAJERÍA (solo productos) */}
          {!isService && (
            <div ref={(el) => { sectionRefs.current['delivery'] = el; }} id="delivery" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2 pb-2">
                <Truck className="w-4 h-4" style={{ color: primary }} />
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Envíos y Mensajería</h4>
              </div>
              <DeliverySettings
                tenant={tenant}
                setTenant={onUpdateTenant}
                onUpdate={onUpdateTenant}
                primary={primary}
                secondary={secondary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                cardBorder={cardBorder}
                itemBg={itemBg}
                inputClass={inputClass}
                specificConfig={specificConfig}
                onChangeConfig={handleSpecificConfigChange}
              />
            </div>
          )}
{/* 🔥 SECCIÓN: HORARIOS */}
<div ref={(el) => { sectionRefs.current['schedule'] = el; }} id="schedule" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">
  <div className="flex items-center gap-2 pb-2">
    <Clock className="w-4 h-4" style={{ color: primary }} />
    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Horarios</h4>
  </div>
  <ActiveStore
    specificConfig={specificConfig}
    onChangeConfig={handleSpecificConfigChange}
    textColor={textColor}
    primary={primary}
    inputClass={inputClass}
    isDarkBg={isDarkBg}
  />
</div>

        </form>

        {/* 🔥 FUERA DEL FORM — Secciones con submit propio (Seguridad, Kiosko) */}

{/* 🔥 SECCIÓN: SEGURIDAD */}
<div ref={(el) => { sectionRefs.current['security'] = el; }} id="security" className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">
  <div className="flex items-center gap-2 pb-2">
    <Shield className="w-4 h-4" style={{ color: primary }} />
    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Seguridad</h4>
  </div>

  {/* 🔥 Sesiones activas */}
  <div className="mb-5 pb-5 border-b" style={{ borderColor: cardBorder }}>
    <SessionsList
      primary={primary}
      textColor={textColor}
      isDarkBg={isDarkBg}
    />
  </div>

            <div className="security-inputs-wrapper">
              <ProfileSecurity
                textColor={textColor}
                inputClass={inputClass}
                isDarkBg={isDarkBg}
                primary={primary}
                onLogout={() => {
                  performLogout();
                }}
              />
            </div>

                        {/* 🔥 PIN DE SEGURIDAD (dentro de Seguridad) */}
            <div className="pt-4 border-t" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2 pb-2">
                <h4 className="text-xs font-bold">PIN de Seguridad</h4>
              </div>
              <SecurityPin
                hasPin={hasPin}
                pin={pin}
                isLoading={pinLoading}
                onOpenModal={openPinModal}
                onDelete={deletePin}
                onVerify={verifyPin}
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                cardBorder={cardBorder}
                itemBg={itemBg}
              />
            </div>
          </div>

{/* 🔥 SECCIÓN: MODO KIOSKO */}
<div ref={(el) => { sectionRefs.current['kiosk'] = el; }} className="scroll-mt-20 pt-4 border-t border-black/10 dark:border-white/10">
  <div className="flex items-center gap-2 pb-2">
    <Monitor className="w-4 h-4" style={{ color: primary }} />
    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Modo Kiosko</h4>
  </div>
  <TerminalList
    terminals={terminalManager.terminals}
    loadingTerminals={terminalManager.loadingTerminals}
    creatingTerminal={terminalManager.creatingTerminal}
    handleToggleKiosk={terminalManager.handleToggleKiosk}
    handleDeleteTerminal={terminalManager.handleDeleteTerminal}
    tenantSlug={tenant?.slug}
    primary={primary}
    textColor={textColor}
  />
</div>

        {/* 🔥 FORM separado SOLO para los botones Guardar / Eliminar.
            No envuelve inputs porque ya se enviaron arriba. */}
        <form onSubmit={handleSubmitForm}>
          <div className="pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
           <Button
              variant="outline-danger"
              size="lg"
              onClick={() => setShowDeleteModal(true)}
              icon={<Trash2 className="w-4 h-4" />}
              primary={primary}
              borderColor={cardBorder}
              textColor={textColor}
              cardBg={cardBg}
              isDarkBg={isDarkBg}
            >
              Eliminar Tienda
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={saving || !hasChanges}
              loading={saving}
              icon={<Save className="w-4 h-4" />}
              primary={primary}
              borderColor={cardBorder}
              textColor={textColor}
              cardBg={cardBg}
              isDarkBg={isDarkBg}
            >
              {saving ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Sin Cambios'}
            </Button>
          </div>
        </form>

        {/* MODALES */}
        <div style={{ color: textColor }}>
          <TokenModal
            newGeneratedTokenModal={terminalManager.newGeneratedTokenModal}
            setNewGeneratedTokenModal={terminalManager.setNewGeneratedTokenModal}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textColor={textColor}
            primary={primary}
          />

          <SuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            title="¡Cambios guardados!"
            message={successMsg || 'La configuración se ha actualizado correctamente en el sistema.'}
            primary={primary}
            borderColor={cardBorder}
            cardBg={cardBg}
            textColor={textColor}
            isDarkBg={isDarkBg}
            accentColor="#22c55e"
            autoCloseMs={0}
            closeLabel="Aceptar"
          />

          <ConfirmDialog
            isOpen={showStoreNameModal}
            onClose={() => setShowStoreNameModal(false)}
            onConfirm={async () => {
              await confirmAndSaveStoreName(() => setShowStoreNameModal(false));
            }}
            title="Confirmar cambio de nombre"
            message={`Estás a punto de cambiar el nombre de tu tienda a "${storeName}". Escribe el nuevo nombre para confirmar:`}
            confirmLabel="Confirmar y guardar"
            variant="warning"
            loading={saving}
            requireConfirmationText={storeName}
            requireConfirmationLabel="Para confirmar, escribe el nuevo nombre:"
            primary={primary}
            borderColor={cardBorder}
            cardBg={cardBg}
            textColor={textColor}
            isDarkBg={isDarkBg}
          />

          <ConfirmDialog
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              await handleDeleteAccount(onDeleteTenant, () => setShowDeleteModal(false));
            }}
            title="¿Estás completamente seguro?"
            message={`Esta acción no se puede deshacer. Se borrará todo rastro de tu tienda "${tenant?.name || ''}".`}
            confirmLabel="Sí, eliminar"
            variant="danger"
            loading={deleting}
            requireConfirmationText={tenant?.name || ''}
            requireConfirmationLabel="Para confirmar, escribe exactamente el nombre de tu tienda:"
            primary={primary}
            borderColor={cardBorder}
            cardBg={cardBg}
            textColor={textColor}
            isDarkBg={isDarkBg}
          />

                    {/* MODAL PIN */}
          <PinModal
            isOpen={showPinModal}
            onClose={closePinModal}
            onSave={savePin}
            isSettingPin={isSettingPin}
            isLoading={pinLoading}
            error={pinError}
            tempPin={tempPin}
            pinConfirm={pinConfirm}
            setTempPin={setTempPin}
            setPinConfirm={setPinConfirm}
            primary={primary}
            textColor={textColor}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        </div>
      </div>
    </div>
  );
}