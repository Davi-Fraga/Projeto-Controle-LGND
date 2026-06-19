import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OrgChartQueryDto } from './dto/org-chart.dto';

describe('org-chart endpoint guards', () => {
  function contextWith(permissions: string[]) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as any;
  }

  it('blocks a user without tops.read (403)', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['tops.read']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(contextWith(['tops.create']))).toBe(false);
  });

  it('allows a user with tops.read', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['tops.read']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(contextWith(['tops.read']))).toBe(true);
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
