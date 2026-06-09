import { HttpException } from '@nestjs/common';
import { LoginThrottleGuard } from './login-throttle.guard';

const ctxWith = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
const reqOf = (email: string, ip = '1.1.1.1') => ({ ip, headers: {}, body: { email } });

describe('LoginThrottleGuard', () => {
  let guard: LoginThrottleGuard;
  let redis: any;

  beforeEach(() => {
    redis = { client: { incr: jest.fn(), expire: jest.fn() } };
    guard = new LoginThrottleGuard(redis);
  });

  it('allows the request while under the limit', async () => {
    redis.client.incr.mockResolvedValue(3);
    await expect(guard.canActivate(ctxWith(reqOf('a@b.com')))).resolves.toBe(true);
  });

  it('sets the TTL only on the first hit of a key', async () => {
    redis.client.incr.mockResolvedValue(1);
    await guard.canActivate(ctxWith(reqOf('a@b.com')));
    expect(redis.client.expire).toHaveBeenCalled();
  });

  it('blocks with 429 when the per IP+email limit is exceeded', async () => {
    redis.client.incr.mockResolvedValue(11); // > 10 (IP+email) e < 50 (IP)
    await expect(guard.canActivate(ctxWith(reqOf('victim@b.com')))).rejects.toBeInstanceOf(HttpException);
  });
});
