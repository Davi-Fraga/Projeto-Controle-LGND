import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { GeocodeQueryDto } from './dto/geocode-query.dto';

describe('churches geocode endpoint guard + DTO', () => {
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

  it('exige churches.read (403 sem a permissão)', () => {
    expect(contextWith(['churches.read'], ['churches.create'])).toBe(false);
    expect(contextWith(['churches.read'], ['churches.read'])).toBe(true);
  });

  it('rejeita query sem cidade (400)', async () => {
    const errors = await validate(plainToInstance(GeocodeQueryDto, { name: 'Igreja Central' }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('aceita query com cidade (name é opcional)', async () => {
    const errors = await validate(plainToInstance(GeocodeQueryDto, { city: 'Goiânia' }));
    expect(errors.length).toBe(0);
  });
});
