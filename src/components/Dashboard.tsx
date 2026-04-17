import { useState, useEffect, useMemo } from 'react';
import { CHART_DATA } from '../constants';
import { cn } from '../lib/utils';
import { useBluetooth } from '../lib/bluetooth';

export const Dashboard = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100');
  
  const { isConnected, dogStatus, intensity, setIsConnected } = useBluetooth();
  const [displayImage, setDisplayImage] = useState('/idle.png');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const targetImage = useMemo(() => {
    if (!isConnected || !dogStatus || dogStatus === 'Offline') return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/idle.png';
    const status = String(dogStatus).split(',')[0].trim().toLowerCase();
    switch (status) {
      case 'eat':   return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/eat.png';
      case 'walk':  return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/walk.png';
      case 'sleep': return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/sleep.png';
      case 'sit':   return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/sit.png';
      case 'idle':  return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/idle.png';
      case 'barking':  return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/barking.png';
      default:      return 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/idle.png';
    }
  }, [isConnected, dogStatus]);

  useEffect(() => {
    if (targetImage !== displayImage) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayImage(targetImage);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetImage, displayImage]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectionSignal = params.get('connected') === 'true';
    if (connectionSignal && typeof setIsConnected === 'function') {
      setIsConnected(true);
    }
  }, [setIsConnected]);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('pet_avatar');
    if (savedAvatar) setAvatarUrl(savedAvatar);
  }, []);

  const dynamicTimeLabels = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const labels = [];
    for (let i = 3; i >= 0; i--) {
      const hour = (currentHour - i * 6 + 24) % 24;
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return labels;
  }, []);

  const dynamicChartData = useMemo(() => {
    const data = [...CHART_DATA];
    if (isConnected && data.length > 0) {
      const lastIndex = data.length - 1;
      data[lastIndex] = {
        ...data[lastIndex],
        value: intensity,
        type: dogStatus === 'Active' ? 'active' : 
              dogStatus === 'Sleep' ? 'sleep' : 
              dogStatus === 'Eat' ? 'eat' : 'light'
      };
    }
    return data;
  }, [isConnected, dogStatus, intensity]);

  const getBarColor = (type: string, isLastBar: boolean) => {
    if (!isConnected && isLastBar) return 'bg-slate-300'; 
    switch (type) {
      case 'active': return 'bg-[#4ADE80]'; 
      case 'sleep': return 'bg-[#A78BFA]';  
      case 'eat': return 'bg-[#FBBC05]';    
      case 'light': return 'bg-[#93C5FD]';  
      default: return 'bg-slate-200';
    }
  };

  const getStatusText = () => {
    if (!isConnected || !dogStatus || dogStatus === 'Offline') return '设备未就绪';
    const status = String(dogStatus).split(',')[0].trim().toLowerCase();
    switch (status) {
      case 'barking': return '狂叫中...';
      case 'eat':     return '进食中...';
      case 'idle':    return '休息中...'; 
      case 'jump':    return '正在跳跃';
      case 'play':    return '玩耍中';
      case 'run':     return '奔跑中...';
      case 'sit':     return '坐下发呆...';
      case 'sleep':   return '睡觉中...';
      case 'walk':    return '散步中...';
      default:        return '监控中';
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden bg-white font-sans antialiased text-[#333]">
      <header className="flex justify-between items-center px-6 py-4 z-30 sticky top-0 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full transition-colors duration-500",
            isConnected ? 'bg-[#4ADE80] animate-pulse' : 'bg-slate-300'
          )} />
          <h1 className="text-[12px] font-bold text-[#999] tracking-widest uppercase leading-none">
            {isConnected ? '已连接' : '未连接'}
          </h1>
        </div>
        <img 
          src={avatarUrl} 
          className="w-9 h-9 rounded-full border border-slate-100 shadow-sm object-cover cursor-pointer active:scale-90 transition-transform" 
          onClick={() => onNavigate('settings')}
          alt="User"
        />
      </header>

      {/* 主展示区 */}
      <section className="relative flex-grow flex flex-col items-center justify-center">
        <div className={cn(
          "h-[400px] w-full flex items-center justify-center transition-all duration-1000 -mt-8",
          !isConnected && "opacity-40 grayscale"
        )}>
          <img 
            src={displayImage} 
            className={cn(
              "h-full object-contain scale-[1] transition-all duration-300 ease-in-out",
              isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )} 
            alt="Dog Status" 
          />
        </div>
        
        {/* 状态文字修改：更加细腻的加粗和间距 */}
        <p className="text-[17px] font-bold tracking-[0.05em] text-[#333] -mt-9">
          {getStatusText()}
        </p>
      </section>

      {/* 底部图表区 */}
      <section 
        className="px-8 pb-36 z-30 cursor-pointer active:scale-[0.98] transition-all duration-200"
        onClick={() => onNavigate('health')}
      >
        <div className="h-[1px] w-full bg-[#F2F2F2] mb-6" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-[16px] text-[#333] tracking-tight">今日动态</h2>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 max-w-[200px]">
            {[
              { label: '运动', color: 'bg-[#4ADE80]/50' },
              { label: '睡眠', color: 'bg-[#A78BFA]/50' },
              { label: '进食', color: 'bg-[#FBBC05]/50' },
              { label: '活动', color: 'bg-[#93C5FD]/50' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                <span className="text-[12px] font-medium text-[#999] leading-none">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-full h-16 flex items-end justify-between gap-x-1.5">
          {dynamicChartData.map((d, i) => {
            const isLast = i === dynamicChartData.length - 1;
            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-700 ease-out",
                  getBarColor(d.type, isLast),
                  isLast && isConnected ? "opacity-100 scale-x-110" : "opacity-60"
                )}
                style={{ height: `${d.value}%` }}
              />
            );
          })}
          
          <div className="absolute w-full flex justify-between bottom-[-24px] px-1">
            {dynamicTimeLabels.map(t => (
              <span key={t} className="text-[10px] font-bold text-[#CCC] tracking-widest leading-none">{t}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};