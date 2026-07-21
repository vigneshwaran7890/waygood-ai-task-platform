export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/',
  taskDetail: (id: string) => `/tasks/${id}`,
} as const;

export const TASK_DETAIL_PATTERN = '/tasks/:id';
