import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const { toast } = useToast();
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const PASSWORD_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{6,72}$/;

  useEffect(() => {
    document.title = isLogin ? "登录 | 地坪漆涂敷机器人控制系统" : "注册 | 地坪漆涂敷机器人控制系统";
    const desc = isLogin ? "登录地坪漆涂敷机器人控制系统，开始智能操作。" : "注册新账号，使用邮箱完成验证后登录控制系统。";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, [isLogin]);

  useEffect(() => {
    if (session) {
      navigate("/controller", { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "请输入完整信息", description: "邮箱与密码均为必填项。" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "邮箱格式不正确" });
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      toast({ title: "密码不符合规则", description: "6-72位，允许常见特殊字符" });
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast({ title: "登录失败", description: error });
      else toast({ title: "登录成功" });
    } else {
      const { error } = await signUp(email, password);
      if (error) toast({ title: "注册失败", description: error });
      else toast({ title: "注册成功", description: "请前往邮箱完成验证后登录。" });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            地坪漆涂敷机器人
          </h1>
          <p className="text-muted-foreground">智能控制系统</p>
        </header>

        <Card className="shadow-2xl border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">{isLogin ? "登录" : "注册"}</CardTitle>
            <CardDescription className="text-center">
              {isLogin ? "欢迎回来，请登录您的账户" : "创建新账户，开始使用控制系统"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">邮箱地址</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="请输入您的邮箱地址" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="请输入您的密码"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="h-11 bg-background/50"
                />
                <p className="text-xs text-muted-foreground">密码需要 6-72 位字符，支持字母、数字及特殊符号</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300"
              >
                {isLogin ? "登录账户" : "创建账户"}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full hover:bg-muted/50 transition-colors" 
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "还没有账户？立即注册" : "已有账户？返回登录"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-xs text-muted-foreground text-center opacity-70">
          开发测试时可在 Supabase 控制台关闭邮箱验证功能
        </p>
      </div>
    </main>
  );
};

export default AuthPage;