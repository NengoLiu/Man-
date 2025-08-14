-- 创建用户命令日志表
CREATE TABLE public.robot_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  command_data JSONB,
  target_ip TEXT,
  target_port INTEGER,
  hex_data TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建索引提高查询性能
CREATE INDEX idx_robot_logs_user_id ON public.robot_logs(user_id);
CREATE INDEX idx_robot_logs_created_at ON public.robot_logs(created_at);

-- 启用RLS
ALTER TABLE public.robot_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的日志
CREATE POLICY "Users can view their own logs" 
ON public.robot_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- 用户只能插入自己的日志
CREATE POLICY "Users can create their own logs" 
ON public.robot_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 创建更新时间戳的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;