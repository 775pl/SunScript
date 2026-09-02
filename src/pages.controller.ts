import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { pages, PageKey } from './page-data';

@Controller()
export class PagesController {
  @Get()
  home(@Res() res: Response) { return this.render('home', res); }

  @Get('health')
  health() { return { status: 'ok' }; }

  @Get(':slug')
  page(@Param('slug') slug: string, @Res() res: Response) {
    if (slug === 'index.html') return res.redirect(308, '/');
    const key = slug.replace(/\.html$/, '');
    if (key !== 'home' && Object.hasOwn(pages, key)) {
      if (slug !== key) return res.redirect(308, '/' + key);
      return this.render(key as PageKey, res);
    }
    return this.notFound(res);
  }

  @Get('*path')
  notFound(@Res() res: Response) {
    return res.status(404).render('layout', {
      page: 'not-found', style: 'cgv', home: false, canonical: null,
      title: 'Page introuvable · SunScript',
      description: 'Cette page est introuvable. Revenez à l’accueil de SunScript.',
    });
  }

  private render(key: PageKey, res: Response) {
    const path = key === 'home' ? '/' : '/' + key;
    const origin = new URL(process.env.SITE_URL ?? 'https://sunscript.studio');
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('SITE_URL must be an HTTP(S) origin');
    // Template paths come exclusively from this allow-listed route table.
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.render('layout', { ...pages[key], canonical: new URL(path, origin.origin).href });
  }
}
