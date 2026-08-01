import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Em produção o Caddy é o único proxy na frente da API (1 hop). Sem isto, `req.ip`
  // resolve para o IP do container do Caddy em TODA requisição — o que colapsa os
  // limites por IP (RateLimitGuard e LoginThrottleGuard) num balde único compartilhado
  // por todos os usuários. Com `trust proxy`, o Express extrai o IP real do
  // X-Forwarded-For escrito pelo Caddy, e ignora o que o cliente tentar forjar antes dele.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  // Headers de segurança. A API serve JSON: CSP fica no front (Next); CORP cross-origin
  // para não bloquear o SPA que consome a API em outra origem.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  const frontendOrigins = [
    config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
    ...(config.get<string>('FRONTEND_URLS')?.split(',').map((origin) => origin.trim()).filter(Boolean) ??
      []),
    ...(config.get<string>('NODE_ENV') === 'development' ? ['http://localhost:3001'] : []),
  ];
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(config.get<string>('API_PORT') ?? 3333);
  await app.listen(port);
}

void bootstrap();
