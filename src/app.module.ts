import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { ContactController } from './contact.controller';

@Module({ controllers: [PagesController, ContactController] })
export class AppModule {}
