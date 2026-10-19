// frontend/app/onboarding/components/step-contact-account/paymentConstants.ts

export const COUNTRIES = [
  { name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
  { name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { name: 'Perú', dialCode: '+51', flag: '🇵🇪' },
  { name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
  { name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
];



// 🔥 SOLO 5 OPERADORES VÁLIDOS EN VENEZUELA
export const PHONE_OPERATORS = [
  { code: '0412', name: '0412' },
  { code: '0414', name: '0414' },
  { code: '0416', name: '0416' },
  { code: '0424', name: '0424' },
  { code: '0426', name: '0426' },
];

export const ID_TYPES = [
  { code: 'V', label: 'V - Venezolano/a' },
  { code: 'E', label: 'E - Extranjero/a' },
  { code: 'J', label: 'J - Jurídico / Empresa' },
  { code: 'G', label: 'G - Gubernamental' },
  { code: 'P', label: 'P - Pasaporte' },
];

export const SOCIAL_NETWORKS_CONFIG = [
  { key: 'instagram', name: 'Instagram', baseUrl: 'instagram.com/', placeholder: 'tu_negocio' },
  { key: 'facebook', name: 'Facebook', baseUrl: 'facebook.com/', placeholder: 'tu_negocio' },
  { key: 'tiktok', name: 'TikTok', baseUrl: 'tiktok.com/@', placeholder: 'tu_negocio' },
  { key: 'x_twitter', name: 'X (Twitter)', baseUrl: 'x.com/', placeholder: 'tu_negocio' },
  { key: 'threads', name: 'Threads', baseUrl: 'threads.net/@', placeholder: 'tu_negocio' },
  { key: 'linkedin', name: 'LinkedIn', baseUrl: 'linkedin.com/in/', placeholder: 'tu-usuario' },
];