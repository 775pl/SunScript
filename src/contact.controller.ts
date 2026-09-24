import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('contact')
export class ContactController {
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
    try {
      const delivery = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.CONTACT_FROM, to: ['hello@sunscript.fr'],
          reply_to: email, subject: 'Nouvelle demande depuis SunScript',
          text: `Nom : ${name.trim()}\nCourriel : ${email}\n\nBesoin :\n${need.trim()}` }),
      });
      if (!delivery.ok) throw new Error('Delivery rejected');
      const receipt = await delivery.json() as { id?: string };
      if (!receipt.id) throw new Error('Missing receipt');
      return reply(200, 'Merci, votre message a été transmis. Je vous répondrai à l’adresse indiquée.');
    } catch {
      return reply(502, 'L’envoi n’a pas pu être confirmé. Vous pouvez réessayer ou écrire à hello@sunscript.fr.');
    }
  }
}
