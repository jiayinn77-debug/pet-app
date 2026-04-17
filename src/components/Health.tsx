import { useState, useRef, useMemo } from 'react';
import { VITALS, CHART_DATA } from '../constants';
import { cn } from '../lib/utils';
import { useBluetooth } from '../lib/bluetooth';

type TimeRange = '日' | '周' | '月' | '年';

const getDynamicLabels = (range: TimeRange) => {
  const now = new Date();
  if (range === '日') {
    const currentHour = now.getHours();
    return [3, 2, 1, 0].map(i => {
      const h = (currentHour - i * 6 + 24) % 24;
      return `${h.toString().padStart(2, '0')}:00`;
    });
  }
  if (range === '周') {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDay = now.getDay();
    return [6, 4, 2, 0].map(i => days[(currentDay - i + 7) % 7]);
  }
  if (range === '月') return ['W1', 'W2', 'W3', 'W4'];
  if (range === '年') {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentMonth = now.getMonth();
    return [9, 6, 3, 0].map(i => months[(currentMonth - i + 12) % 12]);
  }
  return [];
};

export const Health = ({ onBack }: { onBack: () => void }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('日');
  const chartRef = useRef<HTMLDivElement>(null);
  const { isConnected, dogStatus } = useBluetooth(); 

  const currentConfig = useMemo(() => {
    const now = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentMonthName = months[now.getMonth()];
    const currentYear = now.getFullYear().toString();

    const configs: Record<TimeRange, any> = {
      '日': { day: now.getDate().toString(), month: currentMonthName, stats: [{ val: '2,227', label: '步数' }, { val: '1.4', label: '公里' }, { val: '35', label: '分钟' }] },
      '周': { day: `${new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).getDate()}-${now.getDate()}`, month: currentMonthName, stats: [{ val: '15,432', label: '步数' }, { val: '10.2', label: '公里' }, { val: '245', label: '分钟' }] },
      '月': { day: currentMonthName, month: currentYear, stats: [{ val: '68,210', label: '步数' }, { val: '45.8', label: '公里' }, { val: '1,120', label: '分钟' }] },
      '年': { day: currentYear, month: 'YEAR', stats: [{ val: '824,500', label: '步数' }, { val: '540.2', label: '公里' }, { val: '14,200', label: '分钟' }] }
    };
    return { ...configs[selectedRange], chartLabels: getDynamicLabels(selectedRange) };
  }, [selectedRange]);

  const currentChartData = useMemo(() => {
    const seed = selectedRange.charCodeAt(0);
    return CHART_DATA.slice(0, 16).map((d, i) => ({
      ...d,
      value: Math.max(10, Math.min(100, d.value + (seed % (i + 1)) - 5))
    }));
  }, [selectedRange]);

  const getBarColor = (type: string) => {
    switch (type) {
      case 'active': return 'bg-[#4ADE80]'; 
      case 'sleep': return 'bg-[#A78BFA]';  
      case 'eat': return 'bg-[#FBBC05]';    
      case 'light': return 'bg-[#93C5FD]';  
      default: return 'bg-slate-200';
    }
  };

  const handleInteraction = (clientX: number) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const index = Math.max(0, Math.min(15, Math.floor((x / rect.width) * 16)));
    setActiveIndex(index);
  };

  return (
    <div className="w-full flex flex-col bg-white min-h-screen font-sans antialiased text-[#1A1A1A]">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-4 h-14 bg-white/70 backdrop-blur-xl border-b border-slate-50">
        <div className="flex items-center w-10 cursor-pointer active:scale-90 transition-transform" onClick={onBack}>
          <span className="material-symbols-outlined text-[#1A1A1A] text-[28px] font-light">chevron_left</span>
        </div>
        <div className="flex-1 text-center font-bold text-[#1A1A1A] text-[15px] tracking-tight">健康数据</div>
        <div className="w-10" />
      </header>

      <div className="max-w-lg mx-auto w-full space-y-6 pt-20 pb-24 px-5">
        
        {/* 时间切换器 */}
        <div className="flex bg-[#F5F5F5] p-1 rounded-2xl relative border border-slate-100">
          {(['日', '周', '月', '年'] as TimeRange[]).map((label) => (
            <button 
              key={label}
              onClick={() => setSelectedRange(label)}
              className={cn(
                "flex-1 py-2 text-[13px] font-bold rounded-xl transition-all relative z-10 active:scale-95",
                selectedRange === label ? "text-[#1A1A1A]" : "text-slate-400"
              )}
            >
              {label}
            </button>
          ))}
          <div 
            className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm transition-all duration-300 ease-out z-0"
            style={{ left: `${(['日', '周', '月', '年'].indexOf(selectedRange) * 25) + 0.5}%`, width: '24%' }}
          />
        </div>

        {/* 环形进度主卡片 */}
        <div className="bg-[#F9F9F9] rounded-[32px] p-8 border border-slate-100 flex flex-col items-center">
          <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle className="text-white" cx="96" cy="96" fill="transparent" r="90" stroke="currentColor" strokeWidth="8" />
              <circle 
                className={cn(
                  "transition-all duration-1000 ease-out",
                  isConnected ? "text-[#4ADE80]" : "text-slate-300"
                )}
                cx="96" cy="96" fill="transparent" r="90" 
                stroke="currentColor" 
                strokeDasharray="565" 
                strokeDashoffset={565 - (565 * (selectedRange === '日' ? 0.75 : 0.45))} 
                strokeLinecap="round" strokeWidth="8" 
              />
            </svg>
            <div className="text-center">
              <div className="text-[52px] font-bold tracking-tighter text-[#1A1A1A] leading-none">{currentConfig.day}</div>
              <div className="text-[12px] font-bold text-slate-400 uppercase mt-1 tracking-[0.15em]">{currentConfig.month}</div>
            </div>
          </div>
          
          {/* 三项统计 */}
          <div className="w-full flex justify-between mt-10 px-4">
            {currentConfig.stats.map((item: any) => (
              <div key={item.label} className="text-center">
                <div className="text-[20px] font-bold text-[#1A1A1A] leading-tight tracking-tight">{item.val}</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 动态趋势图表卡片 */}
        <section className="bg-[#F9F9F9] rounded-[32px] p-6 border border-slate-100">
          <div className="flex justify-between items-center mb-6 px-1">
            <span className="text-[14px] font-bold text-[#1A1A1A] tracking-tight">动态趋势</span>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                isConnected ? "bg-[#4ADE80] animate-pulse" : "bg-slate-300"
              )} />
              <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase",
                isConnected ? "text-[#4ADE80]" : "text-slate-400"
              )}>
                {isConnected ? (dogStatus || "ACTIVE") : "OFFLINE"}
              </span>
            </div>
          </div>
          
          <div 
            ref={chartRef}
            className="relative h-32 flex items-end justify-between gap-1 touch-none"
            onMouseMove={(e) => handleInteraction(e.clientX)}
            onMouseLeave={() => setActiveIndex(null)}
            onTouchMove={(e) => handleInteraction(e.touches[0].clientX)}
            onTouchStart={(e) => handleInteraction(e.touches[0].clientX)}
            onTouchEnd={() => setActiveIndex(null)}
          >
            {activeIndex !== null && (
              <div 
                className="absolute top-0 flex flex-col items-center z-20 pointer-events-none transition-all duration-200"
                style={{ left: `${(activeIndex / 15) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <div className="bg-[#1A1A1A] rounded-lg px-2 py-1 shadow-lg">
                  <span className="text-white text-[10px] font-bold tracking-tighter">{currentChartData[activeIndex].value}%</span>
                </div>
                <div className="w-px h-24 bg-[#1A1A1A]/10" />
              </div>
            )}
            
            {currentChartData.map((d, i) => (
              <div 
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-700",
                  getBarColor(d.type), 
                  activeIndex === i ? "opacity-100 scale-x-125 shadow-sm" : "opacity-25"
                )}
                style={{ height: `${d.value}%` }}
              />
            ))}
          </div>

          <div className="flex justify-between mt-5 text-[10px] font-bold text-slate-400 px-1 tracking-widest uppercase">
            {currentConfig.chartLabels.map((label: string) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          {/* 图例 */}
          <div className="flex justify-center gap-4 mt-2 pt-5 border-t border-slate-100">
            {[{ label: '运动', color: 'bg-[#4ADE80]' }, { label: '睡眠', color: 'bg-[#A78BFA]' }, { label: '进食', color: 'bg-[#FBBC05]' }, { label: '活动', color: 'bg-[#93C5FD]' }].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                <span className="text-[10px] font-bold text-slate-500 tracking-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 详情卡片网格 */}
        <section className="grid grid-cols-2 gap-4">
          {VITALS.map(vital => (
            <div 
              key={vital.label} 
              className="p-5 rounded-[28px] bg-[#F9F9F9] flex flex-col justify-between h-32 border border-slate-100 active:scale-95 transition-transform"
            >
              <span className="text-[12px] font-bold text-slate-400 tracking-wider uppercase">{vital.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[32px] font-bold tracking-tighter text-[#1A1A1A] leading-none">{vital.value}</span>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{vital.unit}</span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};