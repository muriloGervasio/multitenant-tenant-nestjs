import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/db/prisma.service';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.instance.post.findMany();
  }
}
