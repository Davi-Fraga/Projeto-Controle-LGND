import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';
import { GeocodingService } from './geocoding.service';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const isAdmin = request.headers['x-test-role'] === 'admin';
    request.user = {
      sub: isAdmin ? 'admin-user' : 'city-user',
      email: isAdmin ? 'admin@example.com' : 'city@example.com',
      roles: isAdmin ? ['COORDINATION_ADMIN'] : ['MEMBER'],
      permissions: ['churches.read'],
    };
    return true;
  }
}

describe('GET /churches/search (HTTP scope)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const inside = { id: 'inside', name: 'Igreja Goiânia', city: 'Goiânia' };
  const outside = { id: 'outside', name: 'Igreja Brasília', city: 'Brasília' };

  beforeAll(async () => {
    const selectRows = (where: unknown) => {
      const serialized = JSON.stringify(where);
      const restrictedToGoiania = serialized.includes('"city":{"in":["Goiânia"]}');
      const searchesBrasilia = serialized.includes('igreja brasilia');
      if (restrictedToGoiania && searchesBrasilia) return [];
      if (restrictedToGoiania) return [inside];
      if (searchesBrasilia) return [outside];
      return [inside, outside];
    };

    const prisma = {
      church: {
        findMany: jest.fn(({ where }: any) => Promise.resolve(selectRows(where))),
        count: jest.fn(({ where }: any) => Promise.resolve(selectRows(where).length)),
      },
      userScope: {
        findMany: jest.fn().mockResolvedValue([{ type: 'CITY', value: 'goiania' }]),
      },
      legendary: {
        findMany: jest.fn().mockResolvedValue([{ city: 'Goiânia' }, { city: 'Brasília' }]),
      },
      team: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChurchesController],
      providers: [
        ChurchesService,
        AccessPolicyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { create: jest.fn() } },
        { provide: GeocodingService, useValue: { geocode: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('mantém admin irrestrito e impede listagem/busca fora do escopo de cidade', async () => {
    const adminResponse = await fetch(`${baseUrl}/churches/search?perPage=10`, {
      headers: { 'x-test-role': 'admin' },
    });
    expect(adminResponse.status).toBe(200);
    expect((await adminResponse.json()).data).toEqual([inside, outside]);

    const scopedResponse = await fetch(`${baseUrl}/churches/search?perPage=10`, {
      headers: { 'x-test-role': 'city' },
    });
    expect(scopedResponse.status).toBe(200);
    expect((await scopedResponse.json()).data).toEqual([inside]);

    const outsideSearchResponse = await fetch(
      `${baseUrl}/churches/search?search=Igreja%20Brasilia&perPage=10`,
      { headers: { 'x-test-role': 'city' } },
    );
    expect(outsideSearchResponse.status).toBe(200);
    expect((await outsideSearchResponse.json()).data).toEqual([]);
  });
});
