// UrdfLoader.tsx 中关键配置
useEffect(() => {
  if (!url || !groupRef.current) return;

  const loader = new ThreeURDFLoader();
  
  // 配置你的STL模型所在的根目录（注意斜杠转换）
  loader.packages = {
    'package://': 'F:/Stuff/floor painting/jixiebizhengzhuang/meshes/'
  };

  // 加载URDF文件（假设URDF文件也在该目录或其他位置）
  loader.load(
    // URDF文件的绝对路径（替换为你的实际URDF文件路径）
    'F:/Stuff/floor painting/jixiebizhengzhuang/urdf/jixiebizhengzhuang.urdf',
    (robot) => {
      // 清除旧模型
      if (robotRef.current) {
        groupRef.current.remove(robotRef.current);
      }
      robotRef.current = robot;
      groupRef.current.add(robot);
    },
    (xhr) => console.log(`加载进度: ${(xhr.loaded / xhr.total) * 100}%`),
    (error) => console.error('URDF加载失败:', error)
  );

  return () => {
    if (robotRef.current) {
      groupRef.current?.remove(robotRef.current);
    }
  };
}, [url]);