import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Power, Wifi, WifiOff, Battery, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Position {
  x: number;
  y: number;
}

interface TouchState {
  isDragging: boolean;
  startPos: Position;
  currentPos: Position;
}

const RobotController: React.FC = () => {
  const { toast } = useToast();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(85);
  
  // Joystick state
  const [joystickPos, setJoystickPos] = useState<Position>({ x: 0, y: 0 });
  const [joystickTouch, setJoystickTouch] = useState<TouchState>({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 }
  });
  
  // D-pad state
  const [dpadDirection, setDpadDirection] = useState<string | null>(null);
  const [dpadPos, setDpadPos] = useState<Position>({ x: 0, y: 0 });
  
  const joystickRef = useRef<HTMLDivElement>(null);
  const dpadRef = useRef<HTMLDivElement>(null);
  
  const JOYSTICK_RADIUS = 80; // Max distance from center
  const DPAD_RANGE = 40;

  // Joystick handlers
  const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setJoystickTouch({
      isDragging: true,
      startPos: { x: centerX, y: centerY },
      currentPos: { x: clientX, y: clientY }
    });
    
    // Prevent text selection
    e.preventDefault();
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickTouch.isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - joystickTouch.startPos.x;
    const deltaY = clientY - joystickTouch.startPos.y;
    
    // Calculate distance from center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Limit to circle boundary
    if (distance <= JOYSTICK_RADIUS) {
      setJoystickPos({ x: deltaX, y: deltaY });
    } else {
      const angle = Math.atan2(deltaY, deltaX);
      setJoystickPos({
        x: Math.cos(angle) * JOYSTICK_RADIUS,
        y: Math.sin(angle) * JOYSTICK_RADIUS
      });
    }
    
    setJoystickTouch(prev => ({
      ...prev,
      currentPos: { x: clientX, y: clientY }
    }));
  }, [joystickTouch.isDragging, joystickTouch.startPos]);

  const handleJoystickEnd = useCallback(() => {
    setJoystickTouch({
      isDragging: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 }
    });
    
    // Animate back to center
    setJoystickPos({ x: 0, y: 0 });
  }, []);

  // D-pad handlers
  const handleDpadStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!dpadRef.current) return;
    
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    // Determine direction based on which axis has larger movement
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setDpadDirection(direction);
      setDpadPos({ x: deltaX > 0 ? DPAD_RANGE : -DPAD_RANGE, y: 0 });
    } else {
      const direction = deltaY > 0 ? 'down' : 'up';
      setDpadDirection(direction);
      setDpadPos({ x: 0, y: deltaY > 0 ? DPAD_RANGE : -DPAD_RANGE });
    }
    
    e.preventDefault();
  }, []);

  const handleDpadEnd = useCallback(() => {
    setDpadDirection(null);
    setDpadPos({ x: 0, y: 0 });
  }, []);

  // Emergency stop
  const handleEmergencyStop = useCallback(() => {
    setJoystickPos({ x: 0, y: 0 });
    setDpadPos({ x: 0, y: 0 });
    setDpadDirection(null);
    setJoystickTouch({
      isDragging: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 }
    });
    
    toast({
      title: "Emergency Stop Activated",
      description: "All robot movements have been stopped.",
      variant: "destructive"
    });
  }, [toast]);

  // Toggle connection
  const toggleConnection = useCallback(() => {
    setIsConnected(prev => !prev);
    toast({
      title: isConnected ? "Disconnected" : "Connected",
      description: isConnected ? "Robot connection lost" : "Robot connected successfully",
      variant: isConnected ? "destructive" : "default"
    });
  }, [isConnected, toast]);

  // Mouse event handlers for desktop support
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleJoystickMove(e as any);
    const handleMouseUp = () => handleJoystickEnd();
    
    if (joystickTouch.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [joystickTouch.isDragging, handleJoystickMove, handleJoystickEnd]);

  return (
    <div className="h-screen bg-gradient-background flex flex-col overflow-hidden select-none">
      {/* Status Bar */}
      <Card className="bg-card/50 backdrop-blur-glass border-border/30 rounded-none shadow-glass">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-quick ${
              isConnected 
                ? 'bg-success/20 text-success border border-success/30' 
                : 'bg-danger/20 text-danger border border-danger/30'
            }`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConnection}
              className="h-8 px-2"
            >
              <Power className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/30">
            <Battery className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">{batteryLevel}%</span>
          </div>
        </div>
      </Card>

      {/* Main Controls */}
      <div className="flex-1 flex items-center justify-around p-8 gap-8">
        {/* Left Joystick */}
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Movement
          </h3>
          <div
            ref={joystickRef}
            className="relative w-40 h-40 rounded-full bg-joystick-bg/50 backdrop-blur-glass border-2 border-joystick-border/30 shadow-control cursor-pointer transition-quick hover:shadow-joystick"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onMouseDown={handleJoystickStart}
          >
            {/* Joystick Knob */}
            <div
              className={`absolute w-12 h-12 rounded-full bg-gradient-joystick border-2 border-joystick-active shadow-joystick transition-quick ${
                joystickTouch.isDragging ? 'scale-110 animate-glow' : 'scale-100'
              }`}
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                left: '50%',
                top: '50%',
                marginLeft: '-24px',
                marginTop: '-24px'
              }}
            />
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-joystick-border/40 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          
          {/* Position indicator */}
          <div className="text-xs text-muted-foreground font-mono">
            X: {joystickPos.x.toFixed(0)} Y: {joystickPos.y.toFixed(0)}
          </div>
        </div>

        {/* Right D-Pad */}
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Direction
          </h3>
          <div
            ref={dpadRef}
            className="relative w-40 h-40 cursor-pointer"
            onTouchStart={handleDpadStart}
            onTouchEnd={handleDpadEnd}
            onMouseDown={handleDpadStart}
            onMouseUp={handleDpadEnd}
          >
            {/* D-Pad Cross */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Vertical bar */}
              <div className="absolute w-12 h-32 bg-dpad-bg/70 backdrop-blur-glass border border-dpad-border/30 rounded-lg shadow-dpad" />
              {/* Horizontal bar */}
              <div className="absolute w-32 h-12 bg-dpad-bg/70 backdrop-blur-glass border border-dpad-border/30 rounded-lg shadow-dpad" />
            </div>
            
            {/* Direction indicator */}
            {dpadDirection && (
              <div
                className="absolute w-8 h-8 rounded-full bg-gradient-secondary border-2 border-secondary-glow shadow-dpad animate-glow transition-quick"
                style={{
                  transform: `translate(${dpadPos.x}px, ${dpadPos.y}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: '-16px',
                  marginTop: '-16px'
                }}
              />
            )}
            
            {/* Direction arrows */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-dpad-border text-sm">▲</div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-dpad-border text-sm">▼</div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-dpad-border text-sm">◀</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-dpad-border text-sm">▶</div>
            </div>
          </div>
          
          {/* Direction indicator */}
          <div className="text-xs text-muted-foreground font-mono">
            {dpadDirection ? dpadDirection.toUpperCase() : 'NONE'}
          </div>
        </div>
      </div>

      {/* Emergency Controls */}
      <Card className="bg-card/50 backdrop-blur-glass border-border/30 rounded-none shadow-glass">
        <div className="flex justify-center p-6">
          <Button
            onClick={handleEmergencyStop}
            className="bg-gradient-danger hover:scale-105 transition-spring px-8 py-6 text-lg font-bold shadow-control border border-danger-glow/30"
            size="lg"
          >
            <AlertTriangle className="w-6 h-6 mr-3" />
            EMERGENCY STOP
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RobotController;