import { Global, Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { EffectivePermissionsService } from './effective-permissions.service';

// Global: o PermissionsGuard (usado em todos os módulos via @UseGuards) injeta
// EffectivePermissionsService, então o provider precisa estar disponível em
// qualquer injector. PrismaService já é global.
@Global()
@Module({
  providers: [AccessPolicyService, EffectivePermissionsService],
  exports: [AccessPolicyService, EffectivePermissionsService],
})
export class AccessPolicyModule {}
