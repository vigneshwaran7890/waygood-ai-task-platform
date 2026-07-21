export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/',
  profile: '/profile',
  taskDetail: (id: string) => `/tasks/${id}`,
} as const;

export const TASK_DETAIL_PATTERN = '/tasks/:id';
