import { Body, Controller, Headers, PayloadTooLargeException, Post, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { getFormsWebhookSecret } from '../../config/env';
import { FormsSyncWebhookDto } from './dto/forms-sync-webhook.dto';
import { LegendaryFormsSyncService } from './legendary-forms-sync.service';

const MAX_WEBHOOK_PAYLOAD_BYTES = 50_000;

/**
 * Controller PÚBLICO do webhook de sincronização de legendários (Google Forms da
 * manada). Sem JwtAuthGuard — protegido pelo header x-webhook-secret (timing-safe).
 * O guard global (RateLimitGuard) permanece aplicado.
 *
 * Rota SEPARADA do webhook de pré-inscrição de TOP: aqui é upsert direto de
 * Legendary, sem aprovação. Reusa o mesmo FORMS_WEBHOOK_SECRET (mesmo operador).
 */
@Controller()
export class LegendaryFormsSyncController {
  constructor(private readonly formsSync: LegendaryFormsSyncService) {}

  @Post('legendarios/forms-sync/webhook')
  async webhook(
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() payload: FormsSyncWebhookDto,
  ) {
    this.assertWebhookSecret(secret);
    this.assertPayloadSize(payload);
    return { data: await this.formsSync.ingest(payload) };
  }

  private assertPayloadSize(payload: unknown) {
    if (Buffer.byteLength(JSON.stringify(payload ?? {})) > MAX_WEBHOOK_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException('Webhook payload too large.');
    }
  }

  private assertWebhookSecret(provided: string | undefined) {
    const expected = getFormsWebhookSecret();
    const a = Buffer.from(provided ?? '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook secret.');
    }
  }
}
