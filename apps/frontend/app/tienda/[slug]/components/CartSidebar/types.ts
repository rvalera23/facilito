// frontend/app/tienda/[slug]/components/CartSidebar/types.ts

export interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  textMainClass?: string;
  textMutedClass?: string;
  cartItems: any[];
  primary?: string;
  secondary?: string;
  subtotal?: number;
  subtotalVes?: number;
  isSecondaryLight?: boolean;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  isPrimaryLight?: boolean;
  updateCartQty?: (productId: string, newQty: number, maxStock: number) => void;
  removeFromCart?: (productId: string) => void;
  onProcessOrder?: (data: any) => Promise<any>;
  pagoMovilData?: any;
  pagoMovilList?: any[];
  tenantId?: string;
  tenant?: any;
  onOpenPreview?: (product: any) => void;
  userId?: string;
  tenantConfig?: any;
  currentUser?: any;
  isStoreOpen?: boolean;
  storeClosedMessage?: string;

}

// Estos son los tipos internos que necesita el componente
export interface PaymentMethod {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface PagoMovilAccount {
  bank: string;
  phone: string;
  operator?: string;
  idType?: string;
  idNumber?: string;
  accountNumber?: string;
}

// Tipos para las funciones de utilidad
export type GetProductPricesFn = (product: any) => { VES: number; USD: number };
export type FormatPriceFn = (num: number) => string;
export type GetItemImageFn = (item: any) => string | null;
export type GetProductReferenceFn = (item: any) => string;
export type GetBankNameFn = (code: string) => string;