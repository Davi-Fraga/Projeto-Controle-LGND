export const isProduction = () => process.env.NODE_ENV === 'production';

export const getEnv = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || '';
};

export const REDIS_CONFIG = {
  host: getEnv('REDIS_HOST', 'localhost'),
  port: parseInt(getEnv('REDIS_PORT', '6379'), 10),
  // Em produção o Redis exige AUTH (`--requirepass`, docker-compose.prod.yml).
  // `undefined` quando ausente: o ioredis só manda AUTH se houver senha, então o
  // dev local (Redis sem senha, porta presa em 127.0.0.1) continua conectando.
  password: getEnv('REDIS_PASSWORD') || undefined,
};

export const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Validação lazy: env.ts roda no import (antes do ConfigModule popular process.env),
// então um const eager quebraria o boot. Valida no momento da requisição do webhook.
export const getFormsWebhookSecret = (): string => getRequiredEnv('FORMS_WEBHOOK_SECRET');
