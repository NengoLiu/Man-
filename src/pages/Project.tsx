import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FolderOpen, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  TrendingUp,
  Zap,
  Shield,
  Target
} from "lucide-react";

const Project = () => {
  const projects = [
    {
      id: 1,
      name: "万达广场地下停车场",
      location: "北京市朝阳区",
      area: "15,000㎡",
      progress: 85,
      status: "进行中",
      startDate: "2024-01-15",
      endDate: "2024-03-30",
      team: ["张工", "李师傅", "王技师"],
      type: "环氧地坪"
    },
    {
      id: 2,
      name: "华为研发中心",
      location: "深圳市南山区",
      area: "8,500㎡",
      progress: 45,
      status: "进行中",
      startDate: "2024-02-01",
      endDate: "2024-04-15",
      team: ["刘工", "陈师傅"],
      type: "防静电地坪"
    },
    {
      id: 3,
      name: "比亚迪生产车间",
      location: "西安市高新区",
      area: "25,000㎡",
      progress: 100,
      status: "已完成",
      startDate: "2023-11-01",
      endDate: "2024-01-10",
      team: ["赵工", "孙师傅", "周技师", "吴师傅"],
      type: "工业地坪"
    }
  ];

  const stats = [
    { label: "总项目数", value: "156", icon: FolderOpen, color: "text-primary" },
    { label: "进行中", value: "23", icon: Clock, color: "text-secondary" },
    { label: "已完成", value: "133", icon: Target, color: "text-accent" },
    { label: "总面积", value: "2.3M㎡", icon: TrendingUp, color: "text-primary-glow" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "进行中": return "bg-secondary text-secondary-foreground";
      case "已完成": return "bg-accent text-accent-foreground";
      case "计划中": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <section className="container py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          工程项目管理
        </h1>
        <p className="text-muted-foreground mt-2">
          地坪漆涂敷项目的全生命周期管理，从规划到交付的智能化监控
        </p>
      </header>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="card-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary-glow/10`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">项目列表</h2>
        <Button className="btn-primary-glow">
          <Plus className="h-4 w-4 mr-2" />
          新建项目
        </Button>
      </div>

      {/* 项目列表 */}
      <div className="grid gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="card-glow hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {project.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {project.area}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {project.startDate} - {project.endDate}
                    </span>
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">项目进度</span>
                  <span className="text-sm text-muted-foreground">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              {/* 项目详情 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded bg-primary/10">
                    <Shield className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">地坪类型</p>
                    <p className="text-sm font-medium">{project.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded bg-secondary/10">
                    <Users className="h-3 w-3 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">项目团队</p>
                    <p className="text-sm font-medium">{project.team.length} 人</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded bg-accent/10">
                    <Zap className="h-3 w-3 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">自动化程度</p>
                    <p className="text-sm font-medium">95%</p>
                  </div>
                </div>
              </div>

              {/* 团队成员 */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">团队:</span>
                <div className="flex gap-1">
                  {project.team.map((member, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {member}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 智能特性展示 */}
      <Card className="card-glow mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            智能化施工特性
          </CardTitle>
          <CardDescription>
            我们的地坪漆涂敷机器人具备行业领先的智能化功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary-glow/5">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium mb-2">精确定位</h3>
              <p className="text-sm text-muted-foreground">±2mm 高精度定位，确保涂敷质量</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-secondary/5 to-accent/5">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium mb-2">智能避障</h3>
              <p className="text-sm text-muted-foreground">实时环境感知，自动路径规划</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-accent/5 to-primary/5">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium mb-2">效率提升</h3>
              <p className="text-sm text-muted-foreground">比传统方式提升300%工作效率</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Project;