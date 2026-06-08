import { Body, Controller, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { getFormsWebhookSecret } from '../../config/env';
import { WebhookPreRegistrationDto } from './dto/webhook-pre-registration.dto';
import { PreRegistrationsService } from './preregistrations.service';

/**
 * Controller PÚBLICO do webhook do Google Forms. Sem JwtAuthGuard (não há JWT global) —
 * protegido pelo header x-webhook-secret. O guard global (RateLimitGuard) permanece aplicado.
 */
@Controller()
export class PreRegistrationsWebhookController {
  constructor(private readonly preRegistrations: PreRegistrationsService) {}

  @Post('tops/:topEventId/pre-registrations/webhook')
  async webhook(
    @Param('topEventId') topEventId: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() payload: WebhookPreRegistrationDto,
  ) {
    this.assertWebhookSecret(secret);
    return { data: await this.preRegistrations.ingestFromWebhook(topEventId, payload) };
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
