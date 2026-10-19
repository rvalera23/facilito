// backend/src/modules/notifications/payment-templates.ts

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE = 'mobile',
  TRANSFER = 'transfer',
  PAGO_MOVIL = 'pago_movil',
  PUNTO_DE_VENTA = 'punto_de_venta',
  BANK_TRANSFER = 'bank_transfer',
}

export interface PaymentNotificationTemplate {
  buyer: {
    title: string;
    message: string;
    actionRequired: boolean;
    instructions?: string;
    nextSteps?: string[];
  };
  seller: {
    title: string;
    message: string;
    actionRequired: boolean;
    instructions?: string;
    verificationSteps?: string[];
  };
}

export const PAYMENT_TEMPLATES: Record<PaymentMethod, PaymentNotificationTemplate> = {
  [PaymentMethod.CASH]: {
    buyer: {
      title: '💰 Pago en efectivo',
      message: 'Por favor, ten el monto exacto en efectivo al momento de la entrega.',
      actionRequired: true,
      instructions: 'Prepara el monto exacto en efectivo.',
      nextSteps: ['Ten el monto exacto', 'Confirma al recibir el pedido']
    },
    seller: {
      title: '💵 Pago en efectivo',
      message: 'El cliente pagará en efectivo. Confirma el cobro al momento de la entrega.',
      actionRequired: true,
      instructions: 'Verifica que el cliente tenga el monto exacto.',
      verificationSteps: ['Verificar el monto', 'Registrar el pago']
    }
  },
  [PaymentMethod.PAGO_MOVIL]: {
    buyer: {
      title: '📱 Pago Móvil - Pendiente',
      message: 'Realiza el Pago Móvil y sube el comprobante para confirmar tu orden.',
      actionRequired: true,
      instructions: 'Realiza el pago y sube el comprobante.',
      nextSteps: ['Realiza el Pago Móvil', 'Sube el comprobante', 'Espera confirmación']
    },
    seller: {
      title: '📱 Pago Móvil - Verificar',
      message: 'El cliente ha solicitado Pago Móvil. Verifica el comprobante.',
      actionRequired: true,
      instructions: 'Revisa tu cuenta y confirma el pago.',
      verificationSteps: ['Revisar la cuenta', 'Verificar el comprobante', 'Confirmar pago']
    }
  },
  [PaymentMethod.PUNTO_DE_VENTA]: {
    buyer: {
      title: '💳 Pago con Punto de Venta',
      message: 'Tu pago ha sido procesado correctamente. ¡Orden confirmada!',
      actionRequired: false,
      instructions: 'No necesitas realizar ninguna acción adicional.',
      nextSteps: ['Orden confirmada', 'Recibirás actualizaciones']
    },
    seller: {
      title: '💳 Pago con Punto de Venta',
      message: 'El pago ha sido aprobado automáticamente.',
      actionRequired: false,
      instructions: 'El pago fue procesado. Orden lista.',
      verificationSteps: ['Verificar aprobación', 'Procesar la orden']
    }
  },
  [PaymentMethod.BANK_TRANSFER]: {
    buyer: {
      title: '🏦 Transferencia Bancaria',
      message: 'Realiza la transferencia y sube el comprobante para confirmar.',
      actionRequired: true,
      instructions: 'Realiza la transferencia y sube el comprobante.',
      nextSteps: ['Realiza la transferencia', 'Sube el comprobante', 'Espera confirmación']
    },
    seller: {
      title: '🏦 Transferencia Bancaria',
      message: 'El cliente solicita transferencia. Verifica el comprobante.',
      actionRequired: true,
      instructions: 'Revisa tu cuenta y confirma la transferencia.',
      verificationSteps: ['Revisar la cuenta', 'Verificar el comprobante', 'Confirmar pago']
    }
  },
  [PaymentMethod.CARD]: {
    buyer: {
      title: '💳 Pago con Tarjeta',
      message: 'Tu pago con tarjeta ha sido procesado exitosamente.',
      actionRequired: false,
      instructions: 'No necesitas realizar ninguna acción adicional.',
      nextSteps: ['Orden confirmada', 'En proceso']
    },
    seller: {
      title: '💳 Pago con Tarjeta',
      message: 'El pago con tarjeta ha sido aprobado.',
      actionRequired: false,
      instructions: 'El pago fue procesado automáticamente.',
      verificationSteps: ['Verificar aprobación', 'Procesar la orden']
    }
  },
  [PaymentMethod.MOBILE]: {
    buyer: {
      title: '📱 Pago Móvil',
      message: 'Has seleccionado pago móvil. Realiza el pago y confirma.',
      actionRequired: true,
      instructions: 'Realiza el pago móvil y confirma.',
      nextSteps: ['Realiza el pago', 'Confirma el pago']
    },
    seller: {
      title: '📱 Pago Móvil',
      message: 'Cliente solicita pago móvil. Confirma al recibir.',
      actionRequired: true,
      instructions: 'Confirma cuando recibas el pago.',
      verificationSteps: ['Recibir el pago', 'Confirmar en el sistema']
    }
  },
  [PaymentMethod.TRANSFER]: {
    buyer: {
      title: '🏦 Transferencia',
      message: 'Realiza la transferencia bancaria para confirmar tu orden.',
      actionRequired: true,
      instructions: 'Realiza la transferencia y confirma.',
      nextSteps: ['Realiza la transferencia', 'Confirma el pago']
    },
    seller: {
      title: '🏦 Transferencia',
      message: 'Cliente solicita transferencia. Confirma al recibir.',
      actionRequired: true,
      instructions: 'Confirma cuando recibas la transferencia.',
      verificationSteps: ['Recibir la transferencia', 'Confirmar en el sistema']
    }
  }
};

// Métodos que requieren acción
export const PAYMENT_METHODS_REQUIRING_ACTION = [
  PaymentMethod.CASH,
  PaymentMethod.PAGO_MOVIL,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.TRANSFER,
  PaymentMethod.MOBILE,
];