import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EffectivePermissionsService } from '../../common/access/effective-permissions.service';
import { CitiesQueryDto } from './dto/cities-query.dto';

describe('org-chart global endpoints guards', () => {
  // As permissions efetivas vêm do banco (reavaliadas por requisição), não do token.
  function contextWith(required: string[], permissions: string[]) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    const effective = { resolveKeys: jest.fn().mockResolvedValue(permissions) } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1', permissions } }) }),
    } as any;
    return guard.canActivate(ctx);
  }

  it('teams/coordinators require teams.read', async () => {
    expect(await contextWith(['teams.read'], ['legendarios.read'])).toBe(false);
    expect(await contextWith(['teams.read'], ['teams.read'])).toBe(true);
  });

  it('cities requires legendarios.read', async () => {
    expect(await contextWith(['legendarios.read'], ['teams.read'])).toBe(false);
    expect(await contextWith(['legendarios.read'], ['legendarios.read'])).toBe(true);
  });

  it('rejects an invalid cities mode (400)', async () => {
    const errors = await validate(plainToInstance(CitiesQueryDto, { mode: 'invalid' }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isIn).toBeDefined();
  });

  it.each(['legendaries', 'churches'])('accepts the valid mode "%s"', async (mode) => {
    const errors = await validate(plainToInstance(CitiesQueryDto, { mode }));
    expect(errors.length).toBe(0);
  });
});
