import api from './client';

// 登录请求
export const login = (username: string, password: string) => 
  api.post('/auth/login', { username, password });

// 注册请求
export const register = (username: string, password: string) => 
  api.post('/auth/register', { username, password });

// 获取当前用户信息
export const me = () => api.get('/me');