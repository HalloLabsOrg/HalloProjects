import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PAGINATION_DEFAULTS } from '@hallo/shared';

export interface PaginationQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(query: Record<string, string>): PaginationQuery {
    const page = parseInt(query['page'] ?? String(PAGINATION_DEFAULTS.PAGE), 10);
    const limit = parseInt(query['limit'] ?? String(PAGINATION_DEFAULTS.LIMIT), 10);

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }

    if (isNaN(limit) || limit < 1 || limit > PAGINATION_DEFAULTS.MAX_LIMIT) {
      throw new BadRequestException(`limit must be between 1 and ${PAGINATION_DEFAULTS.MAX_LIMIT}`);
    }

    const sortOrder = query['sortOrder'];
    if (sortOrder && sortOrder !== 'asc' && sortOrder !== 'desc') {
      throw new BadRequestException('sortOrder must be "asc" or "desc"');
    }

    return {
      page,
      limit,
      search: query['search'],
      sortBy: query['sortBy'],
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    };
  }
}
