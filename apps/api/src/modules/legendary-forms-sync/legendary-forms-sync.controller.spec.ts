import { PayloadTooLargeException, UnauthorizedException } from '@nestjs/common';
import { LegendaryFormsSyncController } from './legendary-forms-sync.controller';
import { FormsSyncWebhookDto } from './dto/forms-sync-webhook.dto';

describe('LegendaryFormsSyncController', () => {
  const SECRET = 'segredo-forte-de-teste';
  let controller: LegendaryFormsSyncController;
  let service: { ingest: jest.Mock };

  beforeEach(() => {
    process.env.FORMS_WEBHOOK_SECRET = SECRET;
    service = { ingest: jest.fn().mockResolvedValue({ result: 'created', legendaryId: 'leg-1' }) };
    controller = new LegendaryFormsSyncController(service as any);
  });

  const payload = () => ({ responseId: 'r1', responseTimestamp: '2026-07-09T12:00:00Z', fullName: 'X', lgndNumber: '1' }) as FormsSyncWebhookDto;

  it('rejeita 401 com segredo inválido', async () => {
    await expect(controller.webhook('errado', payload())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.ingest).not.toHaveBeenCalled();
  });

  it('rejeita 401 sem segredo', async () => {
    await expect(controller.webhook(undefined, payload())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita 413 quando o payload excede o limite', async () => {
    const huge = { ...payload(), skills: 'a'.repeat(60_000) } as FormsSyncWebhookDto;
    await expect(controller.webhook(SECRET, huge)).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(service.ingest).not.toHaveBeenCalled();
  });

  it('aceita e delega ao service com segredo correto', async () => {
    const res = await controller.webhook(SECRET, payload());
    expect(service.ingest).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ data: { result: 'created', legendaryId: 'leg-1' } });
  });
});
