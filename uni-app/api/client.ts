import axios from 'axios';

// 创建axios实例，配置基础路径和超时
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000 // 10秒超时
});

// 请求拦截器：自动添加JWT令牌
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  response => res,
  error => Promise.reject(err)
);

export default api;