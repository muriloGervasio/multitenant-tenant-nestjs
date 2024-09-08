# Building Multi tenant applications with NestJS and Prisma.
In this article we are going to build a multi tenant application using NestJS and Prisma. We will be using PostgreSQL as our database and we will be using Prisma to interact with the database. At the end our Prisma service will be going to automatic make the filters based on tenant access level.
## First things first!

before we start lets start a new NestJS project and install the required dependencies.

```bash
$ npm i @nestjs/cli
$ nest new multi-tenant-app
$ cd multi-tenant-app
$ npm i -g prisma
$ prisma init 
```
