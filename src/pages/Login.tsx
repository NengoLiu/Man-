import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { LogIn, KeyRound, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, signIn, signUp } = useAuth();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.title = "登录 | Robot Controller";
    const getOrCreateMeta = () => {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      return meta as HTMLMetaElement;
    };
    const meta = getOrCreateMeta();
    meta.setAttribute("content", "让科技走进建造，让建造发生奇点");

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  useEffect(() => {
    if (session) {
      navigate("/controller", { replace: true });
    }
  }, [session, navigate]);

  // 密码规则：<=18 且仅限数字、大小写字母与常见特殊字符
  const PASSWORD_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{1,18}$/;
  const validatePassword = (pw: string): string | null => {
    if (pw.length > 18) return "密码长度不能超过18位";
    if (!PASSWORD_REGEX.test(pw)) return "密码只能包含数字、大小写字母和常见特殊字符";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password) {
      toast({ title: "请输入完整信息", description: "账号与密码均为必填项。" });
      return;
    }
    const err = validatePassword(password);
    if (err) {
      toast({ title: "密码不符合规则", description: err });
      return;
    }

    const { error } = await signIn(account, password);
    if (error) {
      toast({ title: "登录失败", description: error });
    } else {
      toast({ title: "登录成功", description: `欢迎，${account}` });
    }
  };

  const onDialogSubmit = async (action: 'register' | 'reset', email?: string, username?: string, dialogPassword?: string) => {
    if (action === 'register' && email && dialogPassword) {
      const { error } = await signUp(email, dialogPassword);
      if (error) {
        toast({ title: "注册失败", description: error });
      } else {
        toast({ title: "注册成功", description: "请前往邮箱完成验证后登录。" });
      }
    } else {
      toast({ title: action === 'register' ? "注册成功" : "重置邮件已发送", description: "稍后将接入 Supabase 实现真实功能。" });
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* 彩色动态背景（基于设计系统 HSL tokens） */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full blur-3xl opacity-40 bg-[hsl(var(--brand-rose))] animate-[blob_12s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full blur-3xl opacity-35 bg-[hsl(var(--brand-violet))] animate-[blob_14s_ease-in-out_infinite]" />
        <div className="absolute -bottom-16 left-1/3 h-72 w-72 rounded-full blur-3xl opacity-35 bg-[hsl(var(--brand-cyan))] animate-[blob_16s_ease-in-out_infinite]" />
      </div>

      <div className="container py-12 md:py-20">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-[hsl(var(--brand-rose))] via-[hsl(var(--brand-amber))] to-[hsl(var(--brand-violet))] bg-clip-text text-transparent">
            欢迎使用 奇点科技 系列产品
          </h1>
          <p className="text-muted-foreground mt-2">登录后即可连接并控制你的设备啦</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {/* 登录主卡片 */}
          <Card className="shadow-lg md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" /> 登录账户
              </CardTitle>
              <CardDescription>地坪涂敷哪家强 中国科技找奇点</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="account">账号（邮箱或用户名）</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="account"
                      placeholder="your@email.com 或用户名"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="pl-9"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      autoComplete="current-password"
                      maxLength={18}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">登录</Button>
              </form>
            </CardContent>
          </Card>

          {/* 侧边彩色功能卡片 */}
          <div className="flex flex-col gap-6">
            {/* 注册卡片 */}
            <RegisterDialog onSubmit={onDialogSubmit} />

            {/* 忘记密码卡片 */}
            <ResetPasswordDialog onSubmit={onDialogSubmit} />
          </div>
        </div>
      </div>
    </section>
  );
};

const RegisterDialog = ({ onSubmit }: { onSubmit: (action: 'register' | 'reset', email?: string, username?: string, password?: string) => void }) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    onSubmit('register', email, username, password);
    setEmail("");
    setUsername("");
    setPassword("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer transition hover-scale border-[hsl(var(--brand-rose))]/30 bg-gradient-to-br from-[hsl(var(--brand-rose))]/12 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">注册新账号</CardTitle>
            <CardDescription>创建你的控制账户，开始设备之旅。</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button size="sm" variant="secondary">立刻注册</Button>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建账户</DialogTitle>
          <DialogDescription>填写以下信息创建你的账户。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="signup-email">邮箱</Label>
            <Input 
              id="signup-email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-username">用户名</Label>
            <Input 
              id="signup-username" 
              placeholder="yourname" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">密码</Label>
            <Input 
              id="signup-password" 
              type="password" 
              placeholder="设置一个安全的密码" 
              maxLength={18}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="secondary">取消</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSubmit}>注册</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ResetPasswordDialog = ({ onSubmit }: { onSubmit: (action: 'register' | 'reset', email?: string) => void }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    onSubmit('reset', email);
    setEmail("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer transition hover-scale border-[hsl(var(--brand-cyan))]/30 bg-gradient-to-br from-[hsl(var(--brand-cyan))]/12 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">忘记密码？</CardTitle>
            <CardDescription>发送邮件重置你的账户密码。</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button size="sm" variant="secondary">重置密码</Button>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>输入你的邮箱以接收重置链接。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reset-email">邮箱</Label>
          <Input 
            id="reset-email" 
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="secondary">取消</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSubmit}>发送重置邮件</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Login;