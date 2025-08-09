# Man App Backend (Express + MySQL)

最小可运行后端，用于提供注册、登录（JWT）、用户信息和日志写入。

## 快速开始

1) 准备 MySQL（任选其一）
- 方式 A：Docker 一键启动
```
cd backend
cp .env.example .env  # 然后修改密码等
docker compose up -d
```
- 方式 B：本地已有 MySQL：保证能连接，并在 `.env` 中填好 DB_* 配置。

2) 初始化数据库表
```
# 使用 docker 启动的，可在 http://localhost:8080 通过 Adminer 登录执行
# 或者在本地客户端执行
mysql -h127.0.0.1 -uroot -p<yourpassword> < sql/schema.sql
```

3) 安装依赖并启动 API
```
cd backend
npm i
npm run dev
# API 默认 http://localhost:3000
```

## API 列表
- POST /api/auth/register  body: { username, password }
- POST /api/auth/login     body: { username, password } => { token, user }
- GET  /api/me             header: Authorization: Bearer <token>
- POST /api/logs           header: Authorization: Bearer <token>, body: { message }

## 生产部署建议
- 使用 PM2 守护进程，Nginx 反代，开启 HTTPS
- 强随机 JWT_SECRET，限制 CORS 白名单
- MySQL 定期备份，建议只读账号