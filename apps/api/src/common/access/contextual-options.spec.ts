import { Reflector } from '@nestjs/core';
import { SocialActionsController } from '../../modules/social-actions/social-actions.controller';
import { TeamsController } from '../../modules/teams/teams.controller';
import { TopsController } from '../../modules/tops/tops.controller';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { EffectivePermissionsService } from './effective-permissions.service';

/**
 * Invariante da change `acoes-web-e-seletores-contextuais`: um endpoint de CANDIDATOS é gated
 * pela permission da AÇÃO de destino, nunca pela permission de leitura da tela global da
 * entidade pesquisada. É o que faz uma operação concedida parar de tomar `403` no seletor.
 *
 * Este spec vive em `common/access` de propósito: a regra atravessa três módulos e some se for
 * verificada dentro de cada um isoladamente.
 */
describe('endpoints contextuais de candidatos — contrato de permission', () => {
  const cases = [
    {
      route: 'GET /teams/:id/member-candidates/options',
      controller: TeamsController,
      handler: TeamsController.prototype.memberCandidateOptions,
      action: 'teams.members.add',
    },
    {
      route: 'GET /tops/:id/participant-candidates/options',
      controller: TopsController,
      handler: TopsController.prototype.participantCandidateOptions,
      action: 'tops.participants.add',
    },
    {
      route: 'GET /tops/:id/servant-candidates/options',
      controller: TopsController,
      handler: TopsController.prototype.servantCandidateOptions,
      action: 'tops.servants.add',
    },
    {
      route: 'GET /social-actions/:id/participant-candidates/options',
      controller: SocialActionsController,
      handler: SocialActionsController.prototype.participantCandidateOptions,
      action: 'social-actions.participants.add',
    },
  ];

  /** Guard real + decorator real: prova a fiação, não uma lista reescrita no teste. */
  function canActivate(controller: unknown, handler: unknown, effectiveKeys: string[]) {
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(effectiveKeys),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(new Reflector(), effective);
    return guard.canActivate({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1' } }) }),
    } as any);
  }

  it.each(cases)('$route exige exatamente $action', ({ controller, handler, action }) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler as any)).toEqual([action]);
    return expect(canActivate(controller, handler, [action])).resolves.toBe(true);
  });

  it.each(cases)('$route NÃO é destravado por legendarios.read', ({ controller, handler }) => {
    // A recíproca do problema original: ver a tela de Legendários não concede o diretório
    // contextual, assim como não ver a tela não impede a operação autorizada.
    return expect(canActivate(controller, handler, ['legendarios.read'])).resolves.toBe(false);
  });

  it.each(cases)('$route NÃO é destravado pela leitura do próprio recurso-pai', ({ controller, handler }) => {
    const readOnly = ['teams.read', 'tops.read', 'social-actions.read', 'tops.participants.read', 'tops.servants.read', 'teams.members.read', 'social-actions.participants.read'];
    return expect(canActivate(controller, handler, readOnly)).resolves.toBe(false);
  });
});
