import React from 'react';
import { cn } from '../lib/utils';

interface NavItemProps {
  icon: string; 
  active?: boolean;
  onClick: () => void;
  large?: boolean;
}

const NavItem = ({ icon, active, onClick, large }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center justify-center transition-all duration-300 active:scale-90",
      large ? "w-16 h-16 shadow-lg z-10" : "w-14 h-14 shadow-md",
      active 
        ? "bg-on-surface text-surface-container-lowest rounded-full" 
        : "bg-surface-container-lowest/80 text-outline hover:bg-surface-container-high rounded-full backdrop-blur-md"
    )}
  >
    <span className={cn("material-symbols-outlined", large ? "text-3xl" : "text-2xl")}>
      {icon}
    </span>
  </button>
);

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isHidden?: boolean; 
}

export const BottomNav = ({ activeTab, setActiveTab, isHidden }: BottomNavProps) => {
  return (
    <nav className={cn(
      "fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center z-50 gap-6 transition-all duration-500 ease-in-out",
      "safe-bottom",
      isHidden ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
    )}>
      {/* 首页/控制台 */}
      <NavItem 
        icon="grid_view" 
        active={activeTab === 'dashboard'} 
        onClick={() => setActiveTab('dashboard')}
        large={activeTab === 'dashboard'}
      />

      {/* 动态/足迹 */}
      <NavItem 
        icon="timeline" 
        active={activeTab === 'timeline'} 
        onClick={() => setActiveTab('timeline')}
        large={activeTab === 'timeline'}
      />

      {/* 社区 (新增) */}
      <NavItem 
        icon="explore" 
        active={activeTab === 'community'} 
        onClick={() => setActiveTab('community')}
        large={activeTab === 'community'}
      />

      {/* 设置 */}
      <NavItem 
        icon="tune" 
        active={activeTab === 'settings'} 
        onClick={() => setActiveTab('settings')}
        large={activeTab === 'settings'}
      />
    </nav>
  );
};