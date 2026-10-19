'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import StepRoleSelection from './components/StepRoleSelection';
import StepBuyerGeneralInfo from './components/StepBuyerGeneralInfo';
import StepBuyerAddressDetails from './components/StepBuyerAddressDetails';
import StepBuyerBranding from './components/StepBuyerBranding';

import StepGeneralInfo from './components/StepGeneralInfo';
import StepLocationModalities from './components/StepLocationModalities';
import StepDynamicConfig from './components/StepDynamicConfig';
import StepContactAccount from './components/StepContactAccount';
import StepBrandingLogo from './components/StepBrandingLogo';
import { APP_PALETTES } from '../constants/palettes';
import OnboardingProgress from './components/OnboardingProgress';
import { useTheme } from '../context/ThemeContext';
import LoadingModal from './components/LoadingModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 🔥 FUNCIÓN PARA EXTRAER OPERADOR Y TELÉFONO
const extractOperatorAndPhone = (fullNumber: string): { operator: string; phone: string } => {
  if (!fullNumber) return { operator: '0414', phone: '' };
  const clean = fullNumber.replace(/^\+?58/, '').replace(/[\s\-()]/g, '');
  const operators = ['0414', '0416', '0424', '0412', '0410', '0426', '0418'];
  for (const op of operators) {
    if (clean.startsWith(op)) {
      const phone = clean.replace(op, '').slice(0, 7);
      return { operator: op, phone: phone };
    }
  }
  return { operator: '0414', phone: clean.slice(-7) };
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState('Usuario');

  // ✅ USAR useTheme DEL CONTEXTO (como page.tsx)
  const theme = useTheme();

  // 🔥 OVERRIDE LOCAL: el ThemeContext da EMPTY_THEME al onboarding,
  // así que necesitamos un state propio para reflejar los cambios de paleta
  // que el usuario elige en el StepBrandingLogo.
  const [paletteOverride, setPaletteOverride] = useState<{
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    name: string;
  } | null>(null);

  // 🔥 Crear activePalette: primero el override, sino el theme del contexto
  const activePalette = {
    id: 'tenant-custom',
    name: paletteOverride?.name || theme.name || 'Mi Tema',
    primary: paletteOverride?.primary || theme.primaryColor || APP_PALETTES[0].primary,
    secondary: paletteOverride?.secondary || theme.secondaryColor || APP_PALETTES[0].secondary,
    accent: paletteOverride?.accent || theme.accentColor || APP_PALETTES[0].accent,
    background: paletteOverride?.background || theme.backgroundColor || APP_PALETTES[0].background,
  };

  // 🔥 Handler que el StepBrandingLogo llama cuando elige una paleta
  const handlePaletteChange = useCallback((palette: any) => {
    setPaletteOverride({
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background || palette.bg || '#0b0f19',
      name: palette.name || 'Mi Tema',
    });
  }, []);
  
const [formData, setFormData] = useState({
  userId: '', 
  role: 'seller',
  fullName: '',
  name: '',
  email: '',
  password: '',
  modelType: 'product',
  niche: 'general',
  currencies: [],
  preferredCurrency: '',
    slogan: '',
  description: '',
  workModality: 'local',
  city: '',
  deliveryCity: '',
  zone: '',
  address: '',
  ownerName: '',
  countryCode: '+58',
  phone: '',
  idNumber: '',
  idType: 'V' as 'V' | 'E' | 'J' | 'G',
  pagoMovilSameAsProfile: false,
  // 🔥 Defaults alineados con la paleta "facilito" oficial
  primaryColor: '#ea580c',      // naranja facilito
  secondaryColor: '#1e293b',    // slate-800 (más claro que #0f172a)
  accentColor: '#fbbf24',       // amarillo
  backgroundColor: '#0b0f19',   // azul oscuro facilito
  fontFamily: 'Quicksand',
  logoFile: null as File | null,
  bannerFile: null as File | null,
  faviconFile: null as File | null,
  logoUrl: '',
  bannerUrl: '',
  faviconUrl: '',
    avatarUrl: '',
  avatarFile: null as File | null,
  instagram: '',
  facebook: '',
  tiktok: '',
  x_twitter: '',
  threads: '',
  linkedin: '',
  specificConfig: {
    deliveryType: 'retiro_local',
    hasVariants: 'no',
    serviceType: 'citas',
  } as any,
  state: '',
  municipality: '',
  latitude: null as number | null,
  longitude: null as number | null,
  addressType: 'Casa' as 'Casa' | 'Local' | 'Oficina',
  addressZone: '',
  addressStreet: '',
  addressNumber: '',
  addressReference: '',
});

  const applyColorsToDOM = (colors: any) => {
    const root = document.documentElement;
    if (colors.primaryColor || colors.primary) {
      const primary = colors.primaryColor || colors.primary;
      root.style.setProperty('--color-primary', primary);
      root.style.setProperty('--primary-color', primary);
      root.style.setProperty('--accent-color', primary);
    }
    if (colors.secondaryColor || colors.secondary) {
      const secondary = colors.secondaryColor || colors.secondary;
      root.style.setProperty('--color-secondary', secondary);
      root.style.setProperty('--secondary-color', secondary);
    }
    if (colors.accentColor || colors.accent) {
      const accent = colors.accentColor || colors.accent;
      root.style.setProperty('--color-accent', accent);
      root.style.setProperty('--accent-glow', accent);
    }
    if (colors.backgroundColor || colors.background) {
      const bg = colors.backgroundColor || colors.background;
      root.style.setProperty('--color-background', bg);
      root.style.setProperty('--background-color', bg);
      root.style.setProperty('--bg-color', bg);
    }
  };


  useEffect(() => {
    console.log('[DEBUG] OnboardingPage montado. Verificando localStorage...');
    setIsMounted(true);
    
    // ✅ EL TEMA SE CARGA DESDE useTheme() - NO HACER NADA AQUÍ
    const storedUserStr = localStorage.getItem('user');
    const storedUserName = localStorage.getItem('userName');
    const savedTenant = localStorage.getItem('tenant');
    const params = new URLSearchParams(window.location.search);
    const isNewUser = params.get('new') === 'true';
    const isSellerOnboarding = params.get('role') === 'seller';

    if (isNewUser) {
      console.log('[DEBUG] Parámetro ?new=true detectado. Limpiando sesión previa.');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      setStep(0);
      return;
    }

    let currentUserId = '';
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        currentUserId = parsed.id || parsed._id || parsed.sub || localStorage.getItem('temp_userId') || '';
        console.log('[DEBUG] Usuario detectado en storage, ID:', currentUserId);
      } catch (e) {
        console.error('[DEBUG] Error parseando storedUserStr:', e);
      }
    }

    if (currentUserId) {
      setFormData(prev => ({ ...prev, userId: currentUserId }));
    }

    if (savedTenant) {
      try {
        const parsedTenant = JSON.parse(savedTenant);
        if (parsedTenant?.slug) {
          console.log('[DEBUG] Tienda existente detectada, redirigiendo a /admin/', parsedTenant.slug);
          router.replace(`/admin/${parsedTenant.slug}`);
          return;
        }
      } catch (e) {
        console.error('[DEBUG] Error parseando savedTenant:', e);
      }
    }

    if (isSellerOnboarding && storedUserStr) {
      try {
        const parsedUser = JSON.parse(storedUserStr);
        const currentUserId = parsedUser.id || parsedUser._id || parsedUser.sub || '';

        setUserName(parsedUser.name || parsedUser.fullName || 'Usuario');
        setFormData(prev => ({
          ...prev,
          userId: currentUserId || prev.userId,
          role: 'seller',
          // 🔥 NO setear `name` (nombre de TIENDA). Solo `ownerName` (nombre del DUEÑO).
          // Si querés que el nombre de la tienda se pre-llene con algo, que sea vacío
          // y el user lo escriba en el Paso 1.
          ownerName: parsedUser.name || parsedUser.fullName || prev.ownerName,
          email: parsedUser.email || prev.email,
          phone: parsedUser.phone || prev.phone,
          city: parsedUser.city || parsedUser.deliveryCity || prev.city,
          deliveryCity: parsedUser.deliveryCity || prev.deliveryCity,
          address: parsedUser.address || prev.address,
          state: parsedUser.state || prev.state,
          municipality: parsedUser.municipality || prev.municipality,
          latitude: parsedUser.latitude ?? prev.latitude,
          longitude: parsedUser.longitude ?? prev.longitude,
          preferredCurrency: parsedUser.preferredCurrency || prev.preferredCurrency,
          addressType: parsedUser.addressType || prev.addressType,
          addressZone: parsedUser.addressZone || prev.addressZone,
          addressStreet: parsedUser.addressStreet || prev.addressStreet,
          addressNumber: parsedUser.addressNumber || prev.addressNumber,
          addressReference: parsedUser.addressReference || prev.addressReference,
        }));
        setStep(1);
        return;
      } catch (e) {
        console.error('[DEBUG] Error preparando onboarding de vendedor:', e);
      }
    }
    
    if (storedUserStr) {
      try {
        const parsedUser = JSON.parse(storedUserStr);
        const role = (parsedUser?.role || '').toLowerCase();
        const onboardingCompleted = parsedUser?.onboarding_completed;

        console.log('[DEBUG] Rol de usuario:', role, '| Onboarding completado:', onboardingCompleted);

        if (role === 'buyer' || role === 'comprador') {
          router.replace('/mi-cuenta');
          return;
        } 
        
        if (role === 'seller' || role === 'vendedor') {
          if (onboardingCompleted) {
            router.replace('/admin/dashboard');
            return;
          }
        }
      } catch (e) {
        console.error('[DEBUG] Error validando roles:', e);
      }
    }

    if (storedUserName) {
      setUserName(storedUserName);
    } else if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        if (parsed?.name) {
          setUserName(parsed.name);
        }
      } catch (e) {}
    }

    setStep(0);
  }, [router]);

  // ✅ SOLO ESCUCHAR CAMBIOS DE USUARIO, NO DE TEMA (como page.tsx)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'userName') {
        console.log('[Onboarding] Cambio en usuario detectado');
      }
    };

    const handleAuthChange = () => {
      console.log('[Onboarding] authChange detectado');
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const getPaletteBg = (palette: any) => palette?.background || palette?.bg || '#0b0f19';

  const isLightBackground = (colorHex?: string) => {
    if (!colorHex) return false;
    const hex = colorHex.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  };

  const activeBg = getPaletteBg(activePalette);
  const isLight = isLightBackground(activeBg);
  const textColorClass = isLight ? 'text-slate-900' : 'text-slate-100';
  const mutedTextColorClass = isLight ? 'text-slate-600' : 'text-slate-300';
  const cardBgStyle = isLight ? `${activeBg}F8` : `${activeBg}EE`;

  useEffect(() => {
    if (step > 0) {
      setTimeout(() => {
        const mainContent = document.querySelector('main');
        if (mainContent) {
          const headerOffset = 80;
          const elementPosition = mainContent.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [step]);

  useEffect(() => {
    const bgValue = getPaletteBg(activePalette);
    document.documentElement.style.setProperty('--accent-color', activePalette.primary);
    document.documentElement.style.setProperty('--secondary-color', activePalette.secondary);
    document.documentElement.style.setProperty('--accent-glow', activePalette.accent);
    document.documentElement.style.setProperty('--bg-color', bgValue);
    document.body.style.backgroundColor = bgValue;

    // 🔥 Avisar al Header (y a cualquier componente que escuche) que el tema cambió.
    // El Header escucha themeChange, paletteChange y tenantThemeUpdated.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('themeChange'));
      window.dispatchEvent(new Event('paletteChange'));
      window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { detail: activePalette }));
    }
  }, [activePalette]);
  const updateFormData = (fields: Partial<typeof formData>) => {
    console.log('[DEBUG] Actualizando formData con campos:', fields);
    setFormData((prev) => {
      // ✅ SOLO actualizar formData, NO cambiar la paleta (como page.tsx)
      return { ...prev, ...fields };
    });
  };
const handleFinishBuyer = async () => {
  // 🔥 Esperar un tick para asegurar que los cambios pendientes
  // (paleta, avatar) ya se propagaron al formData.
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('[DEBUG] Iniciando handleFinishBuyer con datos:', formData);
  setLoading(true);
  setLoadingStep(1);

  try {
    const timer2 = setTimeout(() => setLoadingStep(2), 1000);
    const timer3 = setTimeout(() => setLoadingStep(3), 2200);

    // 🔥 CONSTRUIR DIRECCIÓN COMPLETA
    // 🔥 Usar el MISMO formato que ProfileTab espera
    const zoneVal = formData.addressZone || '';
    const streetVal = formData.addressStreet || '';
    const numberVal = formData.addressNumber || '';
    const referenceVal = formData.addressReference || '';

    const addressParts = [zoneVal, streetVal, numberVal].filter(Boolean);
    const fullAddress = addressParts.length > 0
      ? `${formData.addressType || 'Casa'}: ${addressParts.join(', ')}${referenceVal ? ` - Ref: ${referenceVal}` : ''}`
      : `${formData.addressType || 'Casa'}: Sin dirección especificada`;

    // 🔥 SUBIR AVATAR SI EXISTE
    let avatarUploadedUrl = formData.avatarUrl || '';
    
    if (formData.avatarFile instanceof File) {
      console.log('[DEBUG] Subiendo avatar temporalmente...');
      const uploadData = new FormData();
      uploadData.append('file', formData.avatarFile);

      try {
        const uploadRes = await fetch(`${API_URL}/upload/temp`, {
          method: 'POST',
          body: uploadData,
        });

        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json();
          console.log('[DEBUG] ✅ Avatar subido:', uploadResult.url);
          avatarUploadedUrl = uploadResult.url;
        } else {
          console.error('[DEBUG] ❌ Falló la subida del avatar');
        }
      } catch (err) {
        console.error('[DEBUG] ❌ Error en subida de avatar:', err);
      }
    }

    // ✅ PAYLOAD PARA REGISTRO COMPLETO
    const payloadBuyer = {
      name: formData.fullName,
      email: formData.email,
      password: formData.password,
      role: 'buyer',
      fullName: formData.fullName,
      phone: formData.phone,
      deliveryCity: formData.deliveryCity,
      preferredCurrency: formData.preferredCurrency,
      state: formData.state || null,
      municipality: formData.municipality || null,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      geoPrecision: formData.latitude != null ? 'pin' : null,
      geoSource: 'pin',
      address: fullAddress,
      addressType: formData.addressType || 'Casa',
      addressZone: formData.addressZone || null,
      addressStreet: formData.addressStreet || null,
      addressNumber: formData.addressNumber || null,
      addressReference: formData.addressReference || null,
      primaryColor: formData.primaryColor || '#ea580c',
      secondaryColor: formData.secondaryColor || '#0f172a',
      accentColor: formData.accentColor || '#fbbf24',
      backgroundColor: formData.backgroundColor || '#0b0f19',
      fontFamily: formData.fontFamily || 'Quicksand',
      avatarUrl: avatarUploadedUrl || formData.avatarUrl || '',
      // 🔥 Cédula + flag Pago Móvil
      id_number: formData.idNumber || null,
      id_type: formData.idType || 'V',
      pago_movil_same_as_profile: Boolean(formData.pagoMovilSameAsProfile),
    };

    console.log('[DEBUG] 📦 Enviando a /api/auth/register:', JSON.stringify(payloadBuyer, null, 2));

    // ✅ USAR /api/auth/register EN LUGAR DE /complete-profile
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadBuyer),
    });

    clearTimeout(timer2);
    clearTimeout(timer3);

    const textResponse = await res.text();
    console.log('[DEBUG] 📨 Respuesta cruda:', textResponse);

    let buyerData;
    try {
      buyerData = JSON.parse(textResponse);
    } catch (err) {
      console.error('[DEBUG] ❌ Error parseando JSON:', err);
      setLoading(false);
      alert('Error en la respuesta del servidor.');
      return;
    }

    if (!res.ok) {
      console.error('[DEBUG] ❌ Error del servidor:', buyerData);
      setLoading(false);
      alert(buyerData.message || buyerData.error || 'Error al registrar el usuario.');
      return;
    }

    console.log('[DEBUG] ✅ Registro completado:', buyerData);

    setLoadingStep(4);

    const newUserId = buyerData.user?.id || buyerData.id || buyerData._id;
    const accessToken = buyerData.access_token || buyerData.token;

    // ✅ GUARDAR SESIÓN
    const userSession = {
      id: newUserId,
      name: formData.fullName,
      email: formData.email,
      role: 'buyer',
      fullName: formData.fullName,
      phone: formData.phone,
      id_number: formData.idNumber || null,
      id_type: formData.idType || 'V',
      pago_movil_same_as_profile: Boolean(formData.pagoMovilSameAsProfile),
      deliveryCity: formData.deliveryCity,
      preferredCurrency: formData.preferredCurrency,
      state: formData.state || null,
      municipality: formData.municipality || null,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      address: fullAddress,
      addressType: formData.addressType || 'Casa',
      addressZone: formData.addressZone || null,
      addressStreet: formData.addressStreet || null,
      addressNumber: formData.addressNumber || null,
      addressReference: formData.addressReference || null,
      primaryColor: formData.primaryColor || '#ea580c',
      secondaryColor: formData.secondaryColor || '#0f172a',
      accentColor: formData.accentColor || '#fbbf24',
      backgroundColor: formData.backgroundColor || '#0b0f19',
      fontFamily: formData.fontFamily || 'inter',
      avatarUrl: avatarUploadedUrl || formData.avatarUrl || '',
      onboarding_completed: true,
    };

    if (accessToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token', accessToken);
    }

    localStorage.setItem('user', JSON.stringify(userSession));
    localStorage.setItem('userName', formData.fullName || userName);
    localStorage.removeItem('temp_userId');

    // 🔥 Guardar en app_theme (compatibilidad)
    localStorage.setItem('app_theme', JSON.stringify({
      primaryColor: formData.primaryColor || '#ea580c',
      secondaryColor: formData.secondaryColor || '#0f172a',
      accentColor: formData.accentColor || '#fbbf24',
      backgroundColor: formData.backgroundColor || '#0b0f19',
      name: formData.fullName || 'Mi Perfil',
    }));

    // 🔥 CRÍTICO: guardar TAMBIÉN en user_theme (lo que lee /mi-cuenta y useAppTheme)
    localStorage.setItem('user_theme', JSON.stringify({
      primaryColor: formData.primaryColor || '#ea580c',
      secondaryColor: formData.secondaryColor || '#0f172a',
      accentColor: formData.accentColor || '#fbbf24',
      backgroundColor: formData.backgroundColor || '#0b0f19',
      fontFamily: formData.fontFamily || 'Quicksand',
      name: formData.fullName || 'Mi Perfil',
    }));

    window.dispatchEvent(new Event('authChange'));
    window.dispatchEvent(new Event('themeChange'));
    window.dispatchEvent(new CustomEvent('userThemeChange'));

    setTimeout(() => {
      router.push('/mi-cuenta');
    }, 800);

  } catch (error) {
    setLoading(false);
    console.error('[DEBUG] ❌ Excepción general:', error);
    alert('Error de conexión con el servidor.');
  }
};


const handleFinish = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  console.log('[DEBUG] Iniciando handleFinish (Seller/Tenant). Estado actual formData:', formData);
  console.log('[DEBUG] 🔑 formData.password:', formData.password);
  console.log('[DEBUG] 📦 formData.specificConfig:', JSON.stringify(formData.specificConfig, null, 2));
  setLoading(true);
  setLoadingStep(1);

  const generatedSlug = (formData.name || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  console.log('[DEBUG] Slug generado:', generatedSlug);

  try {
    const timer2 = setTimeout(() => setLoadingStep(2), 1000);
    const timer3 = setTimeout(() => setLoadingStep(3), 2200);

    // ============================================================
    // 🔥 PASO 1: SUBIR IMÁGENES TEMPORALMENTE
    // ============================================================
    let uploadedUrls: any = {};
    const filesToUpload = [
      { key: 'logoFile', field: 'logoUrl' },
      { key: 'bannerFile', field: 'bannerUrl' },
      { key: 'faviconFile', field: 'faviconUrl' },
    ];

    console.log('[DEBUG] 🔥 Subiendo imágenes al endpoint temporal /upload/temp...');

    for (const item of filesToUpload) {
      const file = formData[item.key as keyof typeof formData];
      if (file instanceof File) {
        console.log(`[DEBUG] Subiendo archivo temporal ${item.key} (${file.name})...`);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
          const uploadRes = await fetch(`${API_URL}/upload/temp`, {
            method: 'POST',
            body: uploadData,
          });

          if (uploadRes.ok) {
            const uploadResult = await uploadRes.json();
            console.log(`[DEBUG] ✅ Archivo temporal ${item.key} subido:`, uploadResult.url);
            uploadedUrls[item.field] = uploadResult.url;
          } else {
            const errorText = await uploadRes.text();
            console.error(`[DEBUG] ❌ Falló la subida temporal de ${item.key}:`, uploadRes.status, errorText);
          }
        } catch (err) {
          console.error(`[DEBUG] ❌ Error en subida temporal de ${item.key}:`, err);
        }
      } else {
        console.log(`[DEBUG] ${item.key} no es un archivo, omitiendo...`);
      }
    }

    console.log('[DEBUG] 📦 URLs temporales obtenidas:', uploadedUrls);

    // ============================================================
    // 🔥 PASO 2: PROCESAR MÉTODOS DE PAGO - CORREGIDO
    // ============================================================
    const paymentConfig = formData.specificConfig?.paymentMethods || {};
    const rawPaymentMethods = paymentConfig;
    
    console.log('[DEBUG] rawPaymentMethods COMPLETO:', JSON.stringify(rawPaymentMethods, null, 2));

    const formattedPaymentMethods: any[] = [];
    const VALID_OPERATORS = ['0414', '0416', '0424', '0412', '0410', '0426', '0418'];

    // 🔥 PAGO MOVIL - CORREGIDO CON VALIDACIÓN DE OPERADOR
    if (rawPaymentMethods.pagoMovilList && Array.isArray(rawPaymentMethods.pagoMovilList)) {
      console.log('[DEBUG] Procesando pagoMovilList:', rawPaymentMethods.pagoMovilList);
      rawPaymentMethods.pagoMovilList.forEach((pm: any) => {
        if (pm.phone && pm.idNumber) {
          const cleanPhone = pm.phone.replace(/^\+?58/, '').replace(/\D/g, '').slice(0, 7);
          
          // 🔥 OBTENER OPERADOR DEL SELECT O EXTRAER DEL TELÉFONO
          let cleanOperator = pm.operator ? pm.operator.replace(/^\+?58/, '').replace(/\D/g, '') : '0414';
          
          // 🔥 VALIDAR QUE EL OPERADOR SEA VÁLIDO
          if (!VALID_OPERATORS.includes(cleanOperator)) {
            // Intentar extraer del teléfono
            const extracted = extractOperatorAndPhone(cleanPhone);
            if (VALID_OPERATORS.includes(extracted.operator)) {
              cleanOperator = extracted.operator;
            } else {
              cleanOperator = '0414';
            }
            console.log(`[DEBUG] 🔄 Operador "${pm.operator}" corregido a "${cleanOperator}"`);
          }
          
          const fullPhoneNumber = `${cleanOperator}${cleanPhone}`;
          
          formattedPaymentMethods.push({
            type: 'PAGO_MOVIL',
            bankCode: pm.bank,
            bankName: pm.bank,
            operator: cleanOperator,  // 🔥 GUARDAR OPERADOR
            phone: cleanPhone,         // 🔥 GUARDAR TELÉFONO
            phoneNumber: fullPhoneNumber,
            idType: pm.idType,
            idNumber: pm.idNumber,
            isActive: true,
          });
          console.log(`[DEBUG] ✅ Pago Móvil guardado: ${cleanOperator} ${cleanPhone}`);
        }
      });
    }

    if (rawPaymentMethods.zelleList && Array.isArray(rawPaymentMethods.zelleList)) {
      console.log('[DEBUG] Procesando zelleList:', rawPaymentMethods.zelleList);
      rawPaymentMethods.zelleList.forEach((zelle: any) => {
        if (zelle.emailOrPhone) {
          formattedPaymentMethods.push({
            type: 'ZELLE',
            accountIdentifier: zelle.emailOrPhone,
            holderName: zelle.holderName || '',
            isActive: true,
          });
        }
      });
    }

    if (rawPaymentMethods.binanceList && Array.isArray(rawPaymentMethods.binanceList)) {
      console.log('[DEBUG] Procesando binanceList:', rawPaymentMethods.binanceList);
      rawPaymentMethods.binanceList.forEach((binance: any) => {
        if (binance.payId || binance.email) {
          formattedPaymentMethods.push({
            type: 'BINANCE',
            accountIdentifier: binance.payId || binance.email,
            email: binance.email || '',
            isActive: true,
          });
        }
      });
    }

    const activePaymentMethods = rawPaymentMethods.activePaymentMethods || ['cash', 'pos'];

    console.log('[DEBUG] Métodos de pago formateados:', JSON.stringify(formattedPaymentMethods, null, 2));
    console.log('[DEBUG] Métodos de pago activos:', activePaymentMethods);

    // ============================================================
    // 🔥 PASO 3: CONSTRUIR DIRECCIÓN
    // ============================================================
    const addressParts = [];
    if (formData.addressZone) addressParts.push(`Zona: ${formData.addressZone}`);
    if (formData.addressStreet) addressParts.push(`Calle: ${formData.addressStreet}`);
    if (formData.addressNumber) addressParts.push(`Nro: ${formData.addressNumber}`);
    if (formData.addressReference) addressParts.push(`Ref: ${formData.addressReference}`);
    
    const fullAddress = addressParts.length > 0 
      ? `${formData.addressType || 'Casa'}: ${addressParts.join(', ')}`
      : formData.address || `${formData.addressType || 'Casa'}: Sin dirección especificada`;

    // ============================================================
    // 🔥 PASO 4: CREAR TENANT
    // ============================================================
    const tenantPayload = {
      name: formData.name,
      slug: generatedSlug,
      email: formData.email,
      phone: formData.phone,
      ownerName: formData.ownerName,
      countryCode: formData.countryCode,
      slogan: formData.slogan,
      description: formData.description,
      modelType: formData.modelType,
      niche: formData.niche,
      currencies: formData.currencies,
      preferredCurrency: formData.preferredCurrency,
      workModality: formData.workModality,
      city: formData.city,
      deliveryCity: formData.deliveryCity,
      zone: formData.zone,
      address: fullAddress,
      addressType: formData.addressType || 'Casa',
      addressZone: formData.addressZone || null,
      addressStreet: formData.addressStreet || null,
      addressNumber: formData.addressNumber || null,
      addressReference: formData.addressReference || null,
      state: formData.state || null,
      municipality: formData.municipality || null,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      backgroundColor: formData.backgroundColor,
      fontFamily: formData.fontFamily,
      password: formData.password,
      instagram: formData.instagram || '',
      facebook: formData.facebook || '',
      tiktok: formData.tiktok || '',
      x_twitter: formData.x_twitter || '',
      threads: formData.threads || '',
      linkedin: formData.linkedin || '',
      logoUrl: uploadedUrls.logoUrl || '',
      bannerUrl: uploadedUrls.bannerUrl || '',
      faviconUrl: uploadedUrls.faviconUrl || '',
      paymentMethods: formattedPaymentMethods,
      activePaymentMethods: activePaymentMethods,
      specificConfig: {
        deliveryType: formData.specificConfig?.deliveryType || 'retiro_local',
        hasVariants: formData.specificConfig?.hasVariants || 'no',
        serviceType: formData.specificConfig?.serviceType || 'citas',
        paymentMethods: {
          ...rawPaymentMethods,
          pagoMovilList: rawPaymentMethods.pagoMovilList?.map((pm: any) => ({
            ...pm,
            operator: pm.operator || '0414'
          })) || []
        },
        ...formData.specificConfig,
      },
    };

    console.log('[DEBUG] Payload final enviado a POST /tenants:', JSON.stringify(tenantPayload, null, 2));

    const res = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantPayload),
    });

    clearTimeout(timer2);
    clearTimeout(timer3);

    const textResponse = await res.text();
    console.log('[DEBUG] Respuesta cruda POST /tenants:', textResponse);

    let tenant;
    try {
      tenant = JSON.parse(textResponse);
    } catch (err) {
      console.error('[DEBUG] Error parseando respuesta JSON de /tenants:', err);
      setLoading(false);
      alert('Error en la respuesta del servidor al crear la tienda.');
      return;
    }

    if (!res.ok) {
      console.error('[DEBUG] Error reportado por servidor /tenants:', tenant);
      setLoading(false);
      alert(tenant.message || 'Hubo un error al crear la tienda.');
      return;
    }

    console.log('[DEBUG] Tienda creada con éxito. Respuesta:', tenant);

    // ============================================================
    // 🔥 PASO 5: OBTENER TENANT ACTUALIZADO
    // ============================================================
    console.log('[DEBUG] 🔥 Obteniendo tenant actualizado...');
    
    let tenantUpdated = tenant;
    try {
      const tenantUpdatedRes = await fetch(`${API_URL}/tenants/${tenant.slug || generatedSlug}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (tenantUpdatedRes.ok) {
        const fetchedTenant = await tenantUpdatedRes.json();
        console.log('[DEBUG] 🔥 Tenant actualizado:', {
          logoUrl: fetchedTenant.logoUrl,
          bannerUrl: fetchedTenant.bannerUrl,
          faviconUrl: fetchedTenant.faviconUrl,
        });
        tenantUpdated = fetchedTenant;
      }
    } catch (err) {
      console.warn('[DEBUG] ⚠️ Error al obtener tenant actualizado:', err);
    }

    // ============================================================
    // 🔥 PASO 6: GUARDAR SESIÓN
    // ============================================================
    let sessionToken = localStorage.getItem('access_token') || localStorage.getItem('token') || '';

    if (!sessionToken && formData.email && formData.password) {
      try {
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          sessionToken = loginData.access_token || loginData.token || '';
        }
      } catch (err) {
        console.warn('[DEBUG] ⚠️ No se pudo renovar la sesión después de crear la tienda:', err);
      }
    }

    setLoadingStep(4);
    
    const userSession = {
      id: formData.userId || tenantUpdated.userId || tenantUpdated.id,
      name: formData.ownerName || formData.name || userName,
      email: formData.email,
      role: 'seller',
      onboarding_completed: true,
    };

    const getFullImageUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
      return url;
    };

    const tenantSession = {
      id: tenantUpdated.id,
      name: formData.name,
      slug: tenantUpdated.slug || generatedSlug,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      backgroundColor: formData.backgroundColor,
      logoUrl: getFullImageUrl(tenantUpdated.logoUrl || tenantUpdated.logo_url || uploadedUrls.logoUrl || ''),
      bannerUrl: getFullImageUrl(tenantUpdated.bannerUrl || tenantUpdated.banner_url || uploadedUrls.bannerUrl || ''),
      faviconUrl: getFullImageUrl(tenantUpdated.faviconUrl || tenantUpdated.favicon_url || uploadedUrls.faviconUrl || ''),
      state: formData.state || null,
      municipality: formData.municipality || null,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      address: fullAddress,
      addressType: formData.addressType || 'Casa',
      addressZone: formData.addressZone || null,
      addressStreet: formData.addressStreet || null,
      addressNumber: formData.addressNumber || null,
      addressReference: formData.addressReference || null,
    };

    const sessionUser = {
      ...userSession,
      tenantId: tenantSession.id,
      store_slug: tenantSession.slug,
      tenant: tenantSession,
    };

    localStorage.setItem('tenant', JSON.stringify(tenantSession));
    localStorage.setItem('user', JSON.stringify(sessionUser));
    if (sessionToken) {
      localStorage.setItem('access_token', sessionToken);
      localStorage.setItem('token', sessionToken);
    }
    localStorage.setItem('userName', formData.ownerName || formData.name || userName);
    
    localStorage.setItem('app_theme', JSON.stringify({
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      backgroundColor: formData.backgroundColor,
      name: formData.name || 'Mi Tienda',
    }));

    // 🔥 CRÍTICO: guardar también en user_theme para que /mi-cuenta y useAppTheme lo lean
    localStorage.setItem('user_theme', JSON.stringify({
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      backgroundColor: formData.backgroundColor,
      fontFamily: formData.fontFamily || 'Quicksand',
      name: formData.name || 'Mi Tienda',
    }));

    window.dispatchEvent(new Event('authChange'));
    window.dispatchEvent(new CustomEvent('userThemeChange'));

    setTimeout(() => {
      router.push(`/admin/${tenantUpdated.slug || generatedSlug}`);
    }, 800);

  } catch (error) {
    setLoading(false);
    console.error('[DEBUG] Excepción crítica capturada en handleFinish:', error);
    alert('Error de conexión con el servidor.');
  }
};

  if (!isMounted) {
    return (
      <div 
        className="min-h-screen flex flex-col font-sans"
        style={{ backgroundColor: getPaletteBg(APP_PALETTES[0]), color: APP_PALETTES[0].primary }}
      />
    );
  }

  return (
    <div 
      className={`min-h-screen flex flex-col ${textColorClass} font-sans justify-between relative transition-colors duration-500 overflow-x-hidden`}
      style={{ backgroundColor: activeBg }}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        <div 
          className="absolute w-[450px] h-[350px] sm:w-[700px] sm:h-[500px] rounded-full blur-[160px] opacity-25 transition-all duration-700"
          style={{ backgroundColor: activePalette.primary }}
        ></div>
      </div>

<Header/>

      <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative z-10 w-full">
        <div 
          className="max-w-6xl w-full border rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative z-10 backdrop-blur-md transition-all duration-500"
          style={{ 
            backgroundColor: cardBgStyle, 
            borderColor: `${activePalette.primary}30`,
            boxShadow: `0 20px 40px -10px ${activePalette.primary}20`
          }}
        >
          {step > 0 && (
            <OnboardingProgress
              currentStep={step}
              totalSteps={formData.role === 'buyer' ? 3 : 5}
              primaryColor={activePalette.primary}
              isLight={isLight}
              stepNames={
                formData.role === 'buyer'
                  ? ['Datos', 'Dirección', 'Marca']
                  : ['Datos', 'Ubicación', 'Configuración', 'Pagos', 'Marca']
              }
            />
          )}

          {step === 0 && (
            <StepRoleSelection 
              data={formData} 
              onNext={(role) => {
                console.log('[DEBUG] Rol seleccionado vía onNext:', role);
                updateFormData({ role });
                setStep(1);
              }}
              onUserRegistered={(userData) => {
                console.log('[DEBUG Onboarding] Usuario registrado en Paso 0:', userData);
                // 🔥 NO setear `name` (eso es nombre de TIENDA, no del usuario).
                // El nombre del usuario va a `ownerName` (si es seller) o `fullName` (si es buyer).
                updateFormData({ 
                  userId: userData.id || userData.userId,
                  email: userData.email,
                  fullName: userData.name || userData.fullName || '',
                  password: userData.password || ''
                });
              }}
              onSelectBuyer={(roleVal) => {
                console.log('[DEBUG] Rol seleccionado: buyer');
                updateFormData({ role: 'buyer' });
                setStep(1);
              }}
              onSelectSeller={(roleVal) => {
                console.log('[DEBUG] Rol seleccionado: seller');
                updateFormData({ role: 'seller' });
                setStep(1);
              }}
              activePalette={activePalette}
              cardBgStyle={cardBgStyle}
              textColorClass={textColorClass}
              mutedTextColorClass={mutedTextColorClass}
              isLight={isLight}
            />
          )}

          {step === 1 && formData.role === 'buyer' && (
            <StepBuyerGeneralInfo 
              data={formData} 
              next={() => setStep(2)} 
              update={updateFormData} 
              prev={() => setStep(0)} 
            />
          )}

{step === 2 && formData.role === 'buyer' && (
  <StepBuyerAddressDetails 
    data={formData} 
    next={() => setStep(3)} // Cambia de handleFinishBuyer a setStep(3)
    update={updateFormData} 
    prev={() => setStep(1)} 
  />
)}

{/* ✅ NUEVO PASO: BRANDING PARA COMPRADOR */}
{step === 3 && formData.role === 'buyer' && (
  <StepBuyerBranding 
    data={formData} 
    update={updateFormData}
    next={handleFinishBuyer}
    prev={() => setStep(2)}
    isSubmitting={loading}
    user={formData}
    activePalette={activePalette}
    isLight={isLight}
    textColorClass={textColorClass}
    mutedTextColorClass={mutedTextColorClass}
    cardBgStyle={cardBgStyle}
    onPaletteChange={handlePaletteChange}
  />
)}

          {step === 1 && formData.role === 'seller' && (
            <StepGeneralInfo 
              key={activePalette?.id || 'default'}
              data={formData} 
              next={() => setStep(2)} 
              update={updateFormData} 
              prev={() => {
                const params = new URLSearchParams(window.location.search);
                if (params.get('new') === 'true') {
                  setStep(0);
                  return;
                }
                router.push('/');
              }} 
              textColorClass={textColorClass}
              mutedTextColorClass={mutedTextColorClass}
              isLight={isLight}
              activePalette={activePalette}
            />
          )}

          {step === 2 && formData.role === 'seller' && (
            <StepLocationModalities 
              data={formData} 
              next={() => setStep(3)} 
              update={updateFormData} 
              prev={() => setStep(1)} 
            />
          )}

          {step === 3 && formData.role === 'seller' && (
            <StepDynamicConfig 
              data={formData} 
              next={() => setStep(4)} 
              update={updateFormData} 
              back={() => setStep(2)} 
            />
          )}

          {step === 4 && formData.role === 'seller' && (
            <StepContactAccount 
              data={formData} 
              next={() => setStep(5)} 
              update={updateFormData} 
              back={() => setStep(3)} 
            />
          )}

          {step === 5 && formData.role === 'seller' && (
            <StepBrandingLogo 
              data={formData} 
              next={handleFinish} 
              update={updateFormData} 
              back={() => setStep(4)}
              isSubmitting={loading}
              onPaletteChange={handlePaletteChange}
            />
          )}
        </div>
      </main>

      <LoadingModal
        isOpen={loading}
        step={loadingStep}
        userType={formData.role || 'seller'}
        primaryColor={activePalette.primary}
        secondaryColor={activePalette.secondary}
        isLight={isLight}
      />

      <Footer/>
    </div>
  );
}