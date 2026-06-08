// O webhook recebe o JSON cru do Google Forms (campos arbitrários). O ValidationPipe global usa
// forbidNonWhitelisted:true, então o corpo NÃO é validado como classe (rejeitaria os campos extras
// do Forms). Esta interface apenas tipa os campos que mapeamos; o objeto inteiro é persistido em
// rawPayload.
export interface WebhookPreRegistrationDto {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  churchName?: string;
  [key: string]: unknown;
}
