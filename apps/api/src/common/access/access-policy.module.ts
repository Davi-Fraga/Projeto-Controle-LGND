import { Global, Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { EffectivePermissionsService } from './effective-permissions.service';
import { EffectiveScreenAccessService } from './effective-screen-access.service';

// Global: o PermissionsGuard (usado em todos os módulos via @UseGuards) injeta
// EffectivePermissionsService, então o provider precisa estar disponível em
// qualquer injector. PrismaService já é global.
@Global()
@Module({
  providers: [AccessPolicyService, EffectivePermissionsService, EffectiveScreenAccessService],
  exports: [AccessPolicyService, EffectivePermissionsService, EffectiveScreenAccessService],
})
export class AccessPolicyModule {}
