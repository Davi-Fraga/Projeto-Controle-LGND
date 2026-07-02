import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EffectivePermissionsService } from '../../common/access/effective-permissions.service';
import { OrgChartQueryDto } from './dto/org-chart.dto';

describe('org-chart endpoint guards', () => {
  function contextWith(permissions: string[]) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1', permissions } }) }),
    } as any;
  }

  function guardFor(required: string[], effectivePermissions: string[]) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    const effective = { resolveKeys: jest.fn().mockResolvedValue(effectivePermissions) } as unknown as EffectivePermissionsService;
    return new PermissionsGuard(reflector, effective);
  }

  it('blocks a user without tops.read (403)', async () => {
    const guard = guardFor(['tops.read'], ['tops.create']);
    expect(await guard.canActivate(contextWith(['tops.create']))).toBe(false);
  });

  it('allows a user with tops.read', async () => {
    const guard = guardFor(['tops.read'], ['tops.read']);
    expect(await guard.canActivate(contextWith(['tops.read']))).toBe(true);
  });

  it('rejects an invalid view (400)', async () => {
    const dto = plainToInstance(OrgChartQueryDto, { view: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isIn).toBeDefined();
  });

  it.each(['teams', 'families', 'cities'])('accepts the valid view "%s"', async (view) => {
    const dto = plainToInstance(OrgChartQueryDto, { view });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
