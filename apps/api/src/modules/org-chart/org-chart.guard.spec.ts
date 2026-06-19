import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CitiesQueryDto } from './dto/cities-query.dto';

describe('org-chart global endpoints guards', () => {
  function contextWith(required: string[], permissions: string[]) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as any;
    return guard.canActivate(ctx);
  }

  it('teams/coordinators require teams.read', () => {
    expect(contextWith(['teams.read'], ['legendarios.read'])).toBe(false);
    expect(contextWith(['teams.read'], ['teams.read'])).toBe(true);
  });

  it('cities requires legendarios.read', () => {
    expect(contextWith(['legendarios.read'], ['teams.read'])).toBe(false);
    expect(contextWith(['legendarios.read'], ['legendarios.read'])).toBe(true);
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
