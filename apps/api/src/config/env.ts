export const isProduction = () => process.env.NODE_ENV === 'production';

export const getEnv = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || '';
};

export const REDIS_CONFIG = {
  host: getEnv('REDIS_HOST', 'localhost'),
  port: parseInt(getEnv('REDIS_PORT', '6379'), 10),
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
