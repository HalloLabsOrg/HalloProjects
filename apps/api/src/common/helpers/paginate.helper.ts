import { PaginationQuery } from '../pipes/parse-pagination.pipe';

export function paginateResponse<T>(items: T[], total: number, pagination: PaginationQuery) {
  return {
    data: items,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export function paginateArgs(pagination: PaginationQuery) {
  return {
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  };
}
