# Building Multi tenant applications with NestJS and Prisma.
In this article we are going to build a multi tenant application using NestJS and Prisma. 
We will be using PostgreSQL as our database and we will be using Prisma to interact with the database. 
At the end our Prisma service will be going to automatic make the filters based on tenant access level.


There are several ways to implement multi-tenancy in an application. The most common ways are:
- **Database per tenant**: Each tenant has its own database. This is the most isolated approach, but it can be expensive and hard to maintain.
- **Schema per tenant**: Each tenant has its own schema in the database. This is a good balance between isolation and cost.
- **Shared database, shared schema**: All tenants share the same database and schema. This is the most cost-effective approach, but it requires more complex logic to separate the data of different tenants.

The way we are going to implement multi-tenancy in this article is by using the **Shared database, shared schema** approach. We will add a `tenant_id` column to each table in the database to associate each record with a tenant. We will then use this column to filter the data based on the tenant that is making the request. the column is called discriminator.

## First things first!

before we start lets start a new NestJS project and install the required dependencies.

```bash
$ npm i @nestjs/cli
$ nest new multi-tenant-app
$ cd multi-tenant-app
$ npm i -g prisma
$ prisma init 
```

---

## Setting up Prisma

Now were are going to define some models to exemplify our Application. The following models will be used  posts and tenants.
```prisma
model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  tenant_id Int
  tenant    Tenant  @relation(fields: [tenant_id], references: [id])

  @@map("posts")
}

model Tenant {
  id   Int    @id @default(autoincrement())
  name String
  Post Post[]

  @@map("tenants")
}
```

At the end you can just run the following command to generate the Prisma client.
```bash
$ prisma generate
```

Now you can just define a simple prisma service and a prisma module and import it at your AppModule just as NestJS documentation.
```typescript
import { Global, Injectable, Module, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

```

> [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
---

##Defining our post module

Now you can just define a simple post module with a get all posts endpoint.
```typescript
import { Controller, Get } from '@nestjs/common';
import { PostService } from './post.service';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  findAll() {
    return this.postService.findAll();
  }
}
```

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.post.findMany();
  }
}
```

---
## NestJS CLS module

Now we are going to use the NestJS CLS module to handle the tenant_id at our requests. The CLS module is a middleware that allows you to store data in a context that is shared across all the functions that are executed in the same request. This is useful for storing data that is specific to a request, such as the tenant_id.

```bash
$ npm i nestjs-cls
```

After that you can just set up the CLS module at your AppModule.
```typescript
@Module({
  imports: [
    PrismaModule,
    PostModule,
    ClsModule.forRoot({
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set('tenantId', req.headers['x-tenant-id']);
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

By doing this we are going to set the tenantId in the CLS context for each request. Now we can just use this tenantId to filter the data based on the tenant that is making the request.

Now we can just prevent the user from making a request without the tenantId or to access data he does not have access by creating a guard.

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tenantId = context.switchToHttp().getRequest().headers['x-tenant-id'];

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    const userHasAccess = true; // Check if the user has access to the tenant

    return userHasAccess;
  }
}
```

