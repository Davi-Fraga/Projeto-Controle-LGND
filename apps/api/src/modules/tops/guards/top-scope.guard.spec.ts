import { ForbiddenException } from '@nestjs/common';
import { TopScopeGuard } from './top-scope.guard';
import { AccessPolicyService } from '../../../common/access/access-policy.service';

function context(user: unknown, params: Record<string, string>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as any;
}

describe('TopScopeGuard (IDOR por TOP)', () => {
  it('nega acesso direto a um TOP fora do escopo', async () => {
    const accessPolicy = {
      resolveScope: jest.fn().mockResolvedValue({ isAdmin: false, topIds: ['top-1'] }),
      assertTopAllowed: jest.fn(() => { throw new ForbiddenException('TOP out of scope.'); }),
    } as unknown as AccessPolicyService;
    const guard = new TopScopeGuard(accessPolicy);

    await expect(guard.canActivate(context({ sub: 'u1' }, { id: 'top-9' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(accessPolicy.assertTopAllowed).toHaveBeenCalledWith(expect.anything(), 'top-9');
  });

  it('permite um TOP dentro do escopo', async () => {
    const accessPolicy = {
      resolveScope: jest.fn().mockResolvedValue({ isAdmin: false, topIds: ['top-1'] }),
      assertTopAllowed: jest.fn(),
    } as unknown as AccessPolicyService;
    const guard = new TopScopeGuard(accessPolicy);

    await expect(guard.canActivate(context({ sub: 'u1' }, { id: 'top-1' }))).resolves.toBe(true);
  });

  it('ignora rotas sem :id (lista/options) — sem assert', async () => {
    const accessPolicy = {
      resolveScope: jest.fn(),
      assertTopAllowed: jest.fn(),
    } as unknown as AccessPolicyService;
    const guard = new TopScopeGuard(accessPolicy);

    await expect(guard.canActivate(context({ sub: 'u1' }, {}))).resolves.toBe(true);
    expect(accessPolicy.resolveScope).not.toHaveBeenCalled();
  });
});
