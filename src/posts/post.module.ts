import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { ClsModule } from 'nestjs-cls';

@Module({
  controllers: [PostController],
  providers: [PostService],
  imports: [ClsModule.forFeature()],
})
export class PostModule {}
