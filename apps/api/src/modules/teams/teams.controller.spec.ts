import { Reflector } from '@nestjs/core';
import { EffectivePermissionsService } from '../../common/access/effective-permissions.service';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TEAM_OPTIONS_PERMISSIONS, TeamsController } from './teams.controller';

describe('TeamsController — GET /teams/options', () => {
  /** Roda o guard REAL sobre o decorator REAL do handler (não uma lista alimentada à mão). */
  function canActivate(handler: unknown, effectiveKeys: string[]) {
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(effectiveKeys),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(new Reflector(), effective);
    const context = {
      getHandler: () => handler,
      getClass: () => TeamsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1' } }) }),
    } as any;
    return guard.canActivate(context);
  }

  it('exige QUALQUER UMA das permissions de opções, não todas', () => {
    const anyOf = Reflect.getMetadata(ANY_PERMISSIONS_KEY, TeamsController.prototype.options);
    const allOf = Reflect.getMetadata(PERMISSIONS_KEY, TeamsController.prototype.options);

    expect(anyOf).toEqual([...TEAM_OPTIONS_PERMISSIONS]);
    // `@Permissions` sobrevivente faria AND com o OR e manteria `teams.read` obrigatória.
    expect(allOf).toBeUndefined();
  });

  it.each(TEAM_OPTIONS_PERMISSIONS.map((permission) => [permission]))(
    'libera a busca para quem só tem %s',
    async (permission) => {
      await expect(canActivate(TeamsController.prototype.options, [permission])).resolves.toBe(true);
    },
  );

  it('nega quem não tem nenhuma das permissions de opções', async () => {
    await expect(
      canActivate(TeamsController.prototype.options, ['tops.read', 'teams.members.read']),
    ).resolves.toBe(false);
  });

  it('candidatos a membro são gated pela permission da AÇÃO, não pela tela de Legendários', async () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TeamsController.prototype.memberCandidateOptions))
      .toEqual(['teams.members.add']);

    // O caso que originou a change: pode adicionar membro, não pode abrir Legendários.
    await expect(
      canActivate(TeamsController.prototype.memberCandidateOptions, ['teams.members.add']),
    ).resolves.toBe(true);
    // E a recíproca: ler a tela de Legendários não dá acesso ao diretório de candidatos.
    await expect(
      canActivate(TeamsController.prototype.memberCandidateOptions, ['legendarios.read', 'teams.read']),
    ).resolves.toBe(false);
  });

  it('não afrouxa a lista nem o detalhe: ambos seguem exigindo teams.read', async () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TeamsController.prototype.findAll)).toEqual(['teams.read']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TeamsController.prototype.findOne)).toEqual(['teams.read']);

    await expect(canActivate(TeamsController.prototype.findAll, ['tops.teams.add'])).resolves.toBe(false);
    await expect(canActivate(TeamsController.prototype.findOne, ['tops.teams.add'])).resolves.toBe(false);
  });
});
