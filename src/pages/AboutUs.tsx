import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  Target, 
  Zap, 
  Shield,
  Heart,
  Star,
  Globe,
  Lightbulb
} from "lucide-react";

const AboutUs = () => {
  const teamMembers = [
    {
      name: "李博轩",
      position: "技术总监",
      avatar: "👨‍💼",
      expertise: ["技术统筹", "AI算法", "系统架构"],
      experience: "2年"
    },
    {
      name: "徐泽",
      position: "硬件工程师",
      avatar: "👨‍🔧‍",
      expertise: ["机器人控制系统", "嵌入式开发", "算法优化"],
      experience: "1年"
    },
    {
      name: "陈岩松",
      position: "机器人系统工程师",
      avatar: "👨‍",
      expertise: ["机械设计", "传感器", "电控系统"],
      experience: "2年"
    },
    {
      name: "戴润东",
      position: "结构工程师",
      avatar: "👷‍‍",
      expertise: ["机械结构设计", "负载分析", "材料力学"],
      experience: "3年"
    },
	{
	  name: "刘奔",
	  position: "软件工程师",
	  avatar: "👨‍💻",
	  expertise: ["前后端开发", "数据可视化", "用户界面设计"],
	  experience: "2年"
	},
	{
	  name: "XXX",
	  position: "产品经理",
	  avatar: "👨‍💻",
	  expertise: ["产品设计", "用户体验", "项目管理"],
	  experience: "2年"
	}
  ];

  const achievements = [
    { icon: Award, title: "国家高新技术企业", desc: "2025年认定" },
    { icon: Star, title: "发明专利 23项", desc: "自主知识产权" },
    { icon: Globe, title: "服务客户 500+", desc: "覆盖全国30个城市" },
    { icon: Target, title: "施工面积 200万㎡", desc: "累计完成项目" }
  ];

  const values = [
    {
      icon: Lightbulb,
      title: "创新驱动",
      desc: "持续技术创新，推动行业变革",
      color: "from-primary to-primary-glow"
    },
    {
      icon: Shield,
      title: "品质至上",
      desc: "严格质量控制，确保施工品质",
      color: "from-secondary to-accent"
    },
    {
      icon: Heart,
      title: "客户导向",
      desc: "以客户需求为中心，提供优质服务",
      color: "from-accent to-destructive"
    },
    {
      icon: Zap,
      title: "高效智能",
      desc: "智能化解决方案，提升施工效率",
      color: "from-primary-glow to-secondary"
    }
  ];

  return (
    <section className="container py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-4">
          关于我们
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          我们是一家专注于地坪漆涂敷机器人研发与应用的年轻高新技术企业，致力于通过智能化技术革新传统地坪施工行业
        </p>
      </header>

      {/* 公司简介 */}
      <Card className="card-glow mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            公司简介
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <p className="text-muted-foreground leading-relaxed mb-4">
            成立于2025年，我们专注于智能建造设备领域，特别是地坪漆涂敷机器人的研发与产业化应用。
            公司拥有一支由机器人技术、人工智能、机械工程等领域专家组成的核心团队。
          </p>
          <p className="text-muted-foreground leading-relaxed">
            我们的使命是通过先进的机器人技术和人工智能算法，为客户提供高效、精准、环保的地坪施工解决方案，
            推动传统建筑施工行业向智能化、自动化方向发展。
          </p>
        </CardContent>
      </Card>

      {/* 核心成就 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {achievements.map((achievement, index) => (
          <Card key={index} className="card-glow text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/10 to-primary-glow/10 flex items-center justify-center">
                <achievement.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{achievement.title}</h3>
              <p className="text-sm text-muted-foreground">{achievement.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 核心价值观 */}
      <Card className="card-glow mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            核心价值观
          </CardTitle>
          <CardDescription>
            我们的价值观指导着我们的每一个决策和行动
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${value.color} flex-shrink-0`}>
                  <value.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 团队成员 */}
      <Card className="card-glow mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            核心团队
          </CardTitle>
          <CardDescription>
            经验丰富的专业团队，为您提供一流的技术支持
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-gradient-to-br from-muted/20 to-muted/5">
                <div className="text-4xl mb-3">{member.avatar}</div>
                <h3 className="font-semibold mb-1">{member.name}</h3>
                <p className="text-sm text-primary mb-2">{member.position}</p>
                <Badge variant="outline" className="mb-3 text-xs">
                  {member.experience} 经验
                </Badge>
                <div className="space-y-1">
                  {member.expertise.map((skill, skillIndex) => (
                    <Badge key={skillIndex} variant="secondary" className="text-xs mr-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 联系我们 */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            联系我们
          </CardTitle>
          <CardDescription>
            有任何问题或合作意向，欢迎随时联系我们
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-primary/10">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">联系电话</p>
                <p className="text-sm text-muted-foreground">19181092607</p>
                <p className="text-sm text-muted-foreground">010-8888-6666</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-secondary/10">
                <Mail className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">电子邮箱</p>
                <p className="text-sm text-muted-foreground">nengoliu@gmail.com</p>
                <p className="text-sm text-muted-foreground">3029137527@qq.com</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-accent/10">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">公司地址</p>
                <p className="text-sm text-muted-foreground">重庆市涪陵区马鞍街道</p>
                <p className="text-sm text-muted-foreground">聚贤大道与盘龙路交叉路口往西北约80米</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <Button className="btn-primary-glow">
              <Mail className="h-4 w-4 mr-2" />
              发送邮件
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default AboutUs;