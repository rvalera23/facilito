// ARCHIVO: apps/backend/src/modules/account/account.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { Account } from './entities/account.entity';
import { User } from '../auth/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity'; // 🔥 Importar Tenant
import { UserCredit } from './entities/user-credit.entity'; // 🔥 NUEVO
import { TenantsModule } from '../tenants/tenants.module'; // 🔥 Importar TenantsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, User, Tenant, UserCredit]), // 🔥 Agregar UserCredit
    TenantsModule, // 🔥 Importar el módulo completo
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}