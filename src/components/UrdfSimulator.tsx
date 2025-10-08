// UrdfSimulator.tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { UrdfModel } from './UrdfLoader';

interface UrdfSimulatorProps {
  yaw: number;
  roll: number;
}

export const UrdfSimulator: React.FC<UrdfSimulatorProps> = ({ yaw, roll }) => {
  return (
    <Canvas
      style={{ width: '200px', height: '150px', border: '1px solid #333' }}
      camera={{ position: [0.8, 0.8, 0.8], fov: 60 }}
    >
      <Environment preset="warehouse" />
      <UrdfModel url="/robot.urdf" yawAngle={yaw} rollAngle={roll} />
      <OrbitControls 
        enableZoom={true} 
        enablePan={false} 
        maxDistance={2} 
        minDistance={0.5}
      />
      <gridHelper args={[1, 10, 'gray', 'darkgray']} />
    </Canvas>
  );
};