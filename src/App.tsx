import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Health } from './components/Health';
import { Timeline } from './components/Timeline';
import { Community } from './components/Community'; // 1. 导入新拆分的社区组件
import { BottomNav } from './components/BottomNav';
import { Settings } from './components/Settings';
import { motion, AnimatePresence } from 'framer-motion';
import { BluetoothProvider } from './lib/bluetooth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPublishing, setIsPublishing] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'health':
        return <Health onBack={() => setActiveTab('dashboard')} />;
      case 'settings':
        return <Settings />;
      case 'timeline':
        return <Timeline isPublishing={isPublishing} setIsPublishing={setIsPublishing} />;
      case 'community': // 2. 添加社区页面的渲染逻辑，并同步发布状态
        return <Community onPublishingChange={setIsPublishing} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <BluetoothProvider>
      <div className="fixed inset-0 bg-slate-50 overflow-hidden flex flex-col">
        {/* Precision Grid Overlay - 精密网格背景 */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <main className="relative flex-grow min-h-0 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full h-full overflow-y-auto no-scrollbar"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* 全局导航栏 - 排除健康详情页 */}
        {activeTab !== 'health' && (
          <BottomNav 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isHidden={isPublishing} 
          />
        )}
      </div>
    </BluetoothProvider>
  );
}