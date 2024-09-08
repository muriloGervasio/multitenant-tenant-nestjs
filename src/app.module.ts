import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/db/prisma.service';
import { PostModule } from './posts/post.module';
import { ClsModule } from 'nestjs-cls';
import { APP_GUARD } from '@nestjs/core';
import { TenantGuard } from './infrastructure/guards/tenant.guard';

@Module({
  imports: [
    PrismaModule,
    PostModule,
    ClsModule.forRoot({
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set('tenantId', Number(req.headers['x-tenant-id']));
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
