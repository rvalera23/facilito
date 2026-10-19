import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class TenantPaymentConfigService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async saveOrUpdateTenantPaymentMethods(tenantId: string, specificConfig: any) {
    // 1. Limpiamos los métodos anteriores de este tenant
    await this.paymentMethodRepo.delete({ tenantId });

    const methodsToSave: Partial<PaymentMethod>[] = [];

    // --- A. Procesar Pago Móvil (VES) ---
    if (specificConfig.paymentMethods?.pagoMovilList && Array.isArray(specificConfig.paymentMethods.pagoMovilList)) {
      specificConfig.paymentMethods.pagoMovilList.forEach((pm: any) => {
        methodsToSave.push({
          tenantId,
          type: 'pago_movil',
          bankName: pm.bank,
          phone: pm.phone || '',
          ciRif: `${pm.idType || ''}${pm.idNumber || ''}`,
          isActive: true,
        });
      });
    }

    // --- B. Procesar Zelle (USD) ---
    if (specificConfig.paymentMethods?.zelle?.email) {
      const zelle = specificConfig.paymentMethods.zelle;
      methodsToSave.push({
        tenantId,
        type: 'zelle',
        bankName: zelle.holderName || '',
        phone: zelle.email,
        isActive: true,
      });
    }

    // --- C. Procesar Punto de Venta (POS) ---
    if (specificConfig.paymentMethods?.pos) {
      const pos = specificConfig.paymentMethods.pos;
      if (pos.idNumber && pos.idNumber.trim() !== '') {
        methodsToSave.push({
          tenantId,
          type: 'pos',
          bankName: pos.accountType || 'corriente',
          phone: pos.idNumber,
          isActive: true,
        });
      }
    }

    // --- D. Procesar Biopago ---
    if (specificConfig.paymentMethods?.biopago) {
      const biopago = specificConfig.paymentMethods.biopago;
      if (biopago.idNumber && biopago.idNumber.trim() !== '' && biopago.bank) {
        methodsToSave.push({
          tenantId,
          type: 'biopago',
          bankName: biopago.bank,
          phone: biopago.idNumber,
          isActive: true,
        });
      }
    }

    // --- E. Procesar Binance Pay ---
    if (specificConfig.paymentMethods?.binance) {
      const binance = specificConfig.paymentMethods.binance;
      if (binance.payId && binance.payId.trim() !== '') {
        methodsToSave.push({
          tenantId,
          type: 'binance',
          bankName: binance.email || '',
          phone: binance.payId,
          isActive: true,
        });
      }
    }

    // --- F. Procesar PayPal ---
    if (specificConfig.paymentMethods?.paypal?.emailOrLink) {
      methodsToSave.push({
        tenantId,
        type: 'paypal',
        bankName: specificConfig.paymentMethods.paypal.holderName || '',
        phone: specificConfig.paymentMethods.paypal.emailOrLink,
        isActive: true,
      });
    }

    // --- G. Procesar Wallet Cripto ---
    if (specificConfig.paymentMethods?.wallet?.address) {
      methodsToSave.push({
        tenantId,
        type: 'crypto_wallet',
        bankName: specificConfig.paymentMethods.wallet.network || '',
        phone: specificConfig.paymentMethods.wallet.address,
        isActive: true,
      });
    }

    // Guardar masivamente en la base de datos relacional
    if (methodsToSave.length > 0) {
      await this.paymentMethodRepo.save(methodsToSave);
    }

    return { success: true };
  }

  async getTenantWithPaymentMethods(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${tenantId} no encontrado`);
    }

    // 🔥 OBTENER paymentMethods de la tabla relacional
    const paymentMethods = await this.paymentMethodRepo.find({ where: { tenantId } });

    // 🔥 OBTENER la configuración actual del tenant
    const currentConfig = (typeof tenant.specificConfig === 'object' && tenant.specificConfig !== null) 
      ? tenant.specificConfig 
      : {};

    // 🔥 EXTRAER pagoMovilList DE specificConfig (NO RECONSTRUIR)
    const existingPagoMovilList = (currentConfig as any)?.paymentMethods?.pagoMovilList || [];

    // 🔥 SOLO SI no hay pagoMovilList en specificConfig, usar la reconstrucción
    let pagoMovilList = existingPagoMovilList;

    // Si no hay pagoMovilList en specificConfig, pero hay en paymentMethods, reconstruir
    if (!existingPagoMovilList || existingPagoMovilList.length === 0) {
      const pagoMovilFromPaymentMethods = paymentMethods
        .filter(pm => pm.type === 'pago_movil')
        .map(pm => {
          const ciRif = pm.ciRif || '';
          const idType = ciRif.charAt(0) || 'V';
          const idNumber = ciRif.slice(1) || '';
          const phone = pm.phone || '';

          return {
            bank: pm.bankName || '',
            operator: phone.slice(0, 4),
            phone,
            idType,
            idNumber,
          };
        });

      if (pagoMovilFromPaymentMethods.length > 0) {
        pagoMovilList = pagoMovilFromPaymentMethods;
      }
    }

    // 2. Reconstruir POS
    const posRecord = paymentMethods.find(pm => pm.type === 'pos');
    const posConfig = posRecord ? {
      idNumber: posRecord.phone || '',
      accountType: posRecord.bankName || 'corriente',
    } : { idNumber: '', accountType: 'corriente' };

    // 3. Reconstruir Biopago
    const biopagoRecord = paymentMethods.find(pm => pm.type === 'biopago');
    const biopagoConfig = biopagoRecord ? {
      idNumber: biopagoRecord.phone || '',
      bank: biopagoRecord.bankName || '',
    } : { idNumber: '', bank: '' };

    // 4. Reconstruir Binance
    const binanceRecord = paymentMethods.find(pm => pm.type === 'binance');
    const binanceConfig = binanceRecord ? {
      payId: binanceRecord.phone || '',
      email: binanceRecord.bankName || '',
    } : { payId: '', email: '' };

    // 5. Reconstruir Zelle
    const zelleRecord = paymentMethods.find(pm => pm.type === 'zelle');
    const zelleConfig = zelleRecord ? {
      email: zelleRecord.phone || '',
      holderName: zelleRecord.bankName || '',
    } : { email: '', holderName: '' };

    // 6. Reconstruir PayPal
    const paypalRecord = paymentMethods.find(pm => pm.type === 'paypal');
    const paypalConfig = paypalRecord ? {
      emailOrLink: paypalRecord.phone || '',
      holderName: paypalRecord.bankName || '',
    } : { emailOrLink: '', holderName: '' };

    // 7. Reconstruir Wallet Cripto
    const walletRecord = paymentMethods.find(pm => pm.type === 'crypto_wallet');
    const walletConfig = walletRecord ? {
      address: walletRecord.phone || '',
      network: walletRecord.bankName || '',
    } : { address: '', network: '' };

    // 8. Reconstruir Zimli
    const zimliRecord = paymentMethods.find(pm => pm.type === 'zimli');
    const zimliConfig = zimliRecord ? {
      accountId: zimliRecord.phone || '',
    } : { accountId: '' };

    // 🔥 MERGE: Conservar lo que está en specificConfig y solo actualizar lo que viene de paymentMethods
    const mergedSpecificConfig = {
      ...currentConfig,
      paymentMethods: {
        ...(typeof (currentConfig as any)?.paymentMethods === 'object' ? (currentConfig as any).paymentMethods : {}),
        pagoMovilList,  // ← USAR EL QUE VIENE DE specificConfig
        pos: posConfig,
        biopago: biopagoConfig,
        binance: binanceConfig,
        zelle: zelleConfig,
        paypal: paypalConfig,
        wallet: walletConfig,
        zimli: zimliConfig,
      },
      // Mantener compatibilidad con versiones anteriores
      zelle: zelleConfig,
      paypal: paypalConfig,
      binance: binanceConfig,
      wallet: walletConfig,
      zimli: zimliConfig,
    };

    return {
      ...tenant,
      specificConfig: mergedSpecificConfig,
      specific_config: mergedSpecificConfig,
    };
  }

  async getActivePaymentMethodsByTenant(tenantId: string) {
    return this.paymentMethodRepo.find({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        type: true,
        bankName: true,
        phone: true,
        ciRif: true,
      },
    });
  }
}