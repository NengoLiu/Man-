import { useEffect } from "react";
import RobotController from "@/components/DirectRobotController";

const Index = () => {
  useEffect(() => {
    document.title = "Robot Controller | Home";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Control your robot with a clean UI.');
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <RobotController />
    </main>
  );
};

export default Index;
