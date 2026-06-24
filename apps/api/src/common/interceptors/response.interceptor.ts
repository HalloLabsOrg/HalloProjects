import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StandardResponse<T> {
  data: T;
  meta?: PaginatedResponse<T>['meta'];
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((value: unknown) => {
        // Already wrapped (e.g. from paginated responses)
        if (value && typeof value === 'object' && 'data' in value) {
          return value as StandardResponse<T>;
        }
        return { data: value as T };
      }),
    );
  }
}
