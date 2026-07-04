import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AccessPolicyService } from '../../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

// Barreira de escopo de TOP: em qualquer rota com :id (o TopEvent), nega o acesso
// se o usuário é restrito por TOP e o id pedido não está no seu conjunto de escopos.
// Cobre leituras, mutações e sub-recursos (famílias/membros/equipes/participantes),
// pois todos compartilham o param :id do TOP. IDOR por URL direta é recusado aqui.
@Injectable()
export class TopScopeGuard implements CanActivate {
  constructor(private readonly accessPolicy: AccessPolicyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; params?: Record<string, string> }>();
    const user = request.user;
    const topId = request.params?.id;

    // Rotas sem :id (lista/options/create) não passam por aqui — o filtro de lista
    // é aplicado no service.
    if (!user?.sub || !topId) {
      return true;
    }

    const scope = await this.accessPolicy.resolveScope(user);
    this.accessPolicy.assertTopAllowed(scope, topId);
    return true;
  }
}
