import { Body, Controller, Logger, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);
  private attempts = new Map<string, { count: number; expires: number }>();

  @Post()
  async submit(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const reply = (status: number, message: string) => {
      if (req.accepts(['html', 'json']) === 'json') return res.status(status).json({ message });
      return res.status(status).render('layout', {
        page: 'contact-result', style: 'cgv', home: false, canonical: null,
        title: 'Votre message · SunScript', description: 'Votre demande de contact à SunScript.',
        message, sent: status === 200,
      });
    };
    const origin = req.get('origin');
    if (origin && origin !== new URL(process.env.SITE_URL || 'https://www.sunscript.fr').origin) {
      return reply(403, 'Envoi refusé. Revenez au formulaire sur le site SunScript.');
    }
    const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const { name, email, need, website } = data;
    if (website || typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof need !== 'string' || need.trim().length < 10 || need.length > 5000) {
      return reply(400, 'Vérifiez votre nom, votre courriel et votre besoin (10 à 5 000 caractères).');
    }
    if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM) {
      return reply(503, 'Le formulaire est momentanément indisponible. Écrivez à hello@sunscript.fr.');
    }
    const now = Date.now();
    for (const [key, entry] of this.attempts) if (entry.expires <= now) this.attempts.delete(key);
    const key = req.ip || 'unknown';
    const entry = this.attempts.get(key) || { count: 0, expires: now + 600_000 };
    if (entry.count >= 5 || this.attempts.size >= 10_000 && !this.attempts.has(key)) {
      return reply(429, 'Trop de tentatives. Réessayez dans dix minutes ou écrivez à hello@sunscript.fr.');
    }
    entry.count++;
    this.attempts.set(key, entry);
    let providerStatus: number | undefined;
    let failure = 'network_error';
    try {
      const delivery = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.CONTACT_FROM, to: ['hello@sunscript.fr'],
          reply_to: email, subject: 'Nouvelle demande depuis SunScript',
          text: `Nom : ${name.trim()}\nCourriel : ${email}\n\nBesoin :\n${need.trim()}` }),
      });
      providerStatus = delivery.status;
      if (!delivery.ok) {
        failure = 'provider_rejected';
        const details: unknown = await delivery.json().catch(() => null);
        // Classify the response without logging its raw text: it can contain
        // addresses or request values. Never log the API key or form contents.
        const message = details && typeof details === 'object' && 'message' in details && typeof details.message === 'string'
          ? details.message.toLowerCase() : '';
        if (message.includes('only send testing emails')) failure = 'resend_test_sender_restricted';
        else if (message.includes('domain') && message.includes('not verified')) failure = 'sender_domain_not_verified';
        else if (delivery.status === 401) failure = 'api_key_rejected';
        else if (message.includes('api key') || message.includes('permission') || message.includes('scope')) failure = 'api_key_permission_or_status';
        else if (message.includes('quota')) failure = 'provider_quota_exceeded';
        else if (delivery.status === 429) failure = 'provider_rate_limit';
        else if (delivery.status === 422 || delivery.status === 400) failure = 'provider_validation_error';
        throw new Error('Delivery rejected');
      }
      failure = 'invalid_provider_receipt';
      const receipt = await delivery.json() as { id?: string };
      if (!receipt.id) throw new Error('Missing receipt');
      return reply(200, 'Merci, votre message a été transmis. Je vous répondrai à l’adresse indiquée.');
    } catch (error) {
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) failure = 'provider_timeout';
      this.logger.error(JSON.stringify({ event: 'contact_delivery_failed', provider: 'resend', status: providerStatus, reason: failure }));
      return reply(502, 'L’envoi n’a pas pu être confirmé. Vous pouvez réessayer ou écrire à hello@sunscript.fr.');
    }
  }
}
