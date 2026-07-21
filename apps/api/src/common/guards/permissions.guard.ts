import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { EffectivePermissionsService } from '../access/effective-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length && !anyPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.sub) {
      return false;
    }

    // Reavaliado por requisição: a fonte da verdade são as permissions efetivas
    // atuais no banco, não as congeladas no access token. Assim conceder/revogar
    // reflete na próxima requisição, sem o usuário precisar relogar.
    const effective = await this.effectivePermissions.resolveKeys(user.sub);
    // Mantém o request coerente para @CurrentUser e qualquer uso downstream.
    user.permissions = effective;

    const hasAllRequired = !requiredPermissions?.length
      || requiredPermissions.every((permission) => effective.includes(permission));
    const hasAnyRequired = !anyPermissions?.length
      || anyPermissions.some((permission) => effective.includes(permission));

    return hasAllRequired && hasAnyRequired;
  }
}
