import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

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
