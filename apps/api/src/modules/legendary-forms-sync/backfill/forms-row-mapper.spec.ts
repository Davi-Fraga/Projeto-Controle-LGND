import {
  COLUMN_MAP,
  makeResponseId,
  normalizeFormsDate,
  parseSheetTimestampToISO,
  rowToPayload,
  validateHeaders,
} from './forms-row-mapper';

/** Registro cru (cabeçalho→valor) equivalente a uma linha da planilha de respostas. */
function record(over: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {};
  for (const { header } of COLUMN_MAP) base[header] = '';
  return {
    ...base,
    'Carimbo de data/hora': '14/07/2026 13:45:22',
    'Nome completo': 'João da Silva',
    'Número de telefone (WhatsApp)': '(64) 99988-7766',
    'Número de Legendário': '12.345',
    'Faço parte ou quero fazer parte da equipe': 'Mídia',
    'E-mail': 'joao@x.com',
    'Confirmação de e-mail': 'joao@x.com',
    'Data de nascimento': '20/05/1990',
    Bairro: 'Centro',
    Cidade: 'Caldas Novas',
    Estado: 'GO',
    'Nome da igreja que frequenta': 'Igreja X',
    Profissão: 'Pedreiro',
    'Nome da esposa ou mãe': 'Maria',
    'É líder espiritual?': 'Não',
    ...over,
  };
}

describe('forms-row-mapper', () => {
  describe('validateHeaders', () => {
    it('não acusa faltantes quando todos os 22 cabeçalhos existem (com trim)', () => {
      const headers: string[] = COLUMN_MAP.map((c) => c.header);
      // simula espaço no fim de alguns cabeçalhos, como na planilha real
      headers[headers.indexOf('Nome do Líder Espiritual')] = 'Nome do Líder Espiritual ';
      expect(validateHeaders(headers)).toEqual([]);
    });

    it('lista exatamente os cabeçalhos ausentes', () => {
      const headers = COLUMN_MAP.map((c) => c.header).filter(
        (h) => h !== 'Profissão' && h !== 'Cidade',
      );
      expect(validateHeaders(headers).sort()).toEqual(['Cidade', 'Profissão']);
    });
  });

  describe('normalizeFormsDate', () => {
    it('converte dd/MM/yyyy → YYYY-MM-DD', () => {
      expect(normalizeFormsDate('20/05/1990')).toBe('1990-05-20');
    });
    it('mantém string vazia e passa ISO adiante', () => {
      expect(normalizeFormsDate('')).toBe('');
      expect(normalizeFormsDate('1990-05-20')).toBe('1990-05-20');
    });
  });

  describe('parseSheetTimestampToISO', () => {
    it('interpreta o carimbo pt-BR como America/Sao_Paulo (-03:00)', () => {
      expect(parseSheetTimestampToISO('14/07/2026 13:45:22')).toBe('2026-07-14T13:45:22-03:00');
    });
    it('aceita carimbo sem segundos', () => {
      expect(parseSheetTimestampToISO('14/07/2026 13:45')).toBe('2026-07-14T13:45:00-03:00');
    });
    it('retorna null para vazio', () => {
      expect(parseSheetTimestampToISO('')).toBeNull();
    });
  });

  describe('makeResponseId', () => {
    it('é determinístico e prefixado com backfill:', () => {
      const a = makeResponseId('12.345', 'João da Silva', '2026-07-14T13:45:22-03:00');
      const b = makeResponseId('12345', 'JOÃO DA SILVA', '2026-07-14T13:45:22-03:00');
      expect(a).toMatch(/^backfill:[0-9a-f]{64}$/);
      // estável a variações de formatação de número/caixa/acento (mesmos helpers do serviço)
      expect(a).toBe(b);
    });
    it('gera ids DIFERENTES para carimbos diferentes da mesma pessoa', () => {
      const a = makeResponseId('12.345', 'João da Silva', '2026-07-14T13:45:22-03:00');
      const b = makeResponseId('12.345', 'João da Silva', '2026-07-15T10:00:00-03:00');
      expect(a).not.toBe(b);
    });
  });

  describe('rowToPayload', () => {
    it('monta o payload canônico igual ao Apps Script', () => {
      const { payload, timestampMs } = rowToPayload(record());
      expect(payload.lgndNumber).toBe('12.345'); // o serviço faz o cleanLgnd
      expect(payload.fullName).toBe('João da Silva');
      expect(payload.responseTimestamp).toBe('2026-07-14T13:45:22-03:00');
      expect(payload.birthDate).toBe('1990-05-20');
      expect(payload.isSpiritualLeader).toBe(false);
      expect(payload.responseId).toMatch(/^backfill:[0-9a-f]{64}$/);
      expect(timestampMs).toBe(new Date('2026-07-14T13:45:22-03:00').getTime());
    });

    it('mapeia "Sim" (qualquer caixa) para isSpiritualLeader=true', () => {
      const { payload } = rowToPayload(record({ 'É líder espiritual?': 'SIM' }));
      expect(payload.isSpiritualLeader).toBe(true);
    });

    it('deixa campos vazios como undefined (não string vazia)', () => {
      const { payload } = rowToPayload(record({ 'Habilidades (opcional)': '' }));
      expect(payload.skills).toBeUndefined();
    });
  });
});
