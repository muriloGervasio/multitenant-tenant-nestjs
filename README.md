# Building Multi-tenant applications with NestJS and Prisma.
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

## Prisma automatic filters by request tenant.

Now we are defining a new prisma service that is going to filter the data based on the tenantId that is in the CLS context.

To do this we are going to use the `prisma.$extends` method to add a middleware that is going to filter the data based on the tenantId.

```typescript
export function prismaTenantFactory(
  prisma: PrismaService,
  tenant_id: number | null,
): PrismaService {
  return prisma.$extends({
    query: {
      $allModels: {
        findMany: function ({ query, args }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as unknown;

          return query(args);
        },
        findFirst({ query, args }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as unknown;

          return query(args);
        },
        findUnique({ query, args }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as any;

          return query(args);
        },
        findUniqueOrThrow({ query, args }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as any;

          return query(args);
        },
        findFirstOrThrow({ query, args }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as unknown;

          return query(args);
        },
        updateMany({ args, query }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as unknown;

          return query(args);
        },

        deleteMany({ args, query }) {
          args.where = {
            ...args.where,
            tenant_id,
          } as unknown;

          return query(args);
        },

        create({ query, args }) {
          args.data = {
            ...args.data,
            tenant_id: tenant_id,
          } as any;

          return query(args);
        },
        upsert({ args, query }) {
          args.where = {
            ...args.where,
            tenant_id: tenant_id,
          } as any;

          args.create = {
            ...args.create,
            tenant_id: tenant_id,
          } as any;

          return query(args);
        },

        createMany({ query, args }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map(
              (d) =>
                ({
                  ...d,
                  tenant_id: tenant_id,
                }) as any,
            );
          } else {
            args.data = {
              ...args.data,
              tenant_id: tenant_id,
            } as any;
          }

          return query(args);
        },
      },
    },
  }) as PrismaService;
}
```

By doing this we define a factory that will extend our prisma client, adding a middleware that will filter the data based on the tenantId that is in the CLS context. Now we can just use this factory to create a new prisma client that will filter the data based on the tenantId.

This will be our updated prisma service calling the factory.
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly cls: ClsService) {
    super({
      log: ['query'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  get instance(): PrismaService {
    const tenantId = this.cls.get('tenantId');
    return prismaTenantFactory(this, tenantId);
  }
}
```

Now we can just use the `instance` property of the prisma service to get a new prisma client that will filter the data based on the tenantId that is in the CLS context.

```typescript
@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.instance.post.findMany();
  }
}
```
Now when we send a Get request to the `/posts` endpoint, the data will be filtered based on the tenantId that is in the CLS context.

Now we will send the bellow request to the NestJS application.
```bash
$ curl -X GET http://localhost:3000/posts -H "x-tenant-id: 3"
```
The prisma provider will create a proxy of the prisma instance and will generate the query bellow to the database.

```sql
SELECT "public"."posts"."id", "public"."posts"."title", "public"."posts"."content", "public"."posts"."tenant_id" FROM "public"."posts" WHERE "public"."posts"."tenant_id" = $1 OFFSET $2
```

You can find the full code in the [GitHub repository](https://github.com/muriloGervasio/multitenant-tenant-nestjs).
Now Happy coding! 🚀

