import React, { useState, useEffect, useRef } from 'react';
import { useBluetooth } from '../lib/bluetooth'; // 引入自定义蓝牙 Hook
import { cn } from '../lib/utils';               // 引入 Tailwind 类名合并工具
import { supabase } from '../lib/supabase';       // 引入 Supabase 数据库客户端

export const Settings = () => {
  // 默认宠物头像的占位图地址
  const INITIAL_AVATAR = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=200';
  
  // --- 状态定义 ---
  const [avatarUrl, setAvatarUrl] = useState(INITIAL_AVATAR);      // 当前头像 URL
  const [petName, setPetName] = useState('EchoPet');               // 宠物昵称
  const [isEditingName, setIsEditingName] = useState(false);      // 是否处于昵称编辑模式
  const [tempName, setTempName] = useState('');                   // 编辑时的临时输入框内容
  
  const [isResettingWifi, setIsResettingWifi] = useState(false);  // WiFi 设置弹窗显示状态
  const [wifiSSID, setWifiSSID] = useState('');                   // WiFi 账号输入
  const [wifiPass, setWifiPass] = useState('');                   // WiFi 密码输入
  const [isConnectingBle, setIsConnectingBle] = useState(false);  // 蓝牙搜索/连接中的加载状态

  const [isPendantConnected, setIsPendantConnected] = useState(false); // 全息挂坠的逻辑连接状态
  const [isSyncing, setIsSyncing] = useState(false);                   // AI 图片解析与同步状态
  
  const fileInputRef = useRef<HTMLInputElement>(null);             // 隐藏的文件选择器引用
  
  // 从自定义蓝牙 Hook 中解构出状态和方法
  const { isConnected, disconnect, connect, sendData, dogStatus } = useBluetooth();

  // --- 初始化逻辑 ---
  useEffect(() => {
    // 页面加载时从 localStorage 加载本地缓存的数据
    const savedAvatar = localStorage.getItem('pet_avatar');
    if (savedAvatar) setAvatarUrl(savedAvatar);
    
    const savedName = localStorage.getItem('pet_name');
    if (savedName) setPetName(savedName);

    const savedBreed = localStorage.getItem('pet_breed');
    if (savedBreed) setIsPendantConnected(true);

    // 处理 URL 参数
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setIsResettingWifi(false);
    }
  }, []);

  // --- 交互处理函数 ---

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleNameEdit = () => {
    setTempName(petName);
    setIsEditingName(true);
  };

  const saveName = () => {
    if (tempName.trim() !== '') {
      const trimmedName = tempName.trim();
      setPetName(trimmedName);
      localStorage.setItem('pet_name', trimmedName);
    }
    setIsEditingName(false);
  };

  const handleBleConnect = async () => {
    setIsConnectingBle(true);
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);

    if (isWechat) {
      const baseUrl = window.location.origin + window.location.pathname;
      const targetUrl = `${baseUrl}?action=connectNow&t=${Date.now()}${window.location.hash}`;
      window.location.replace(targetUrl);
    } else {
      try {
        await connect(); 
      } catch (e) {
        setIsConnectingBle(false);
      } finally {
        setIsConnectingBle(false);
      }
    }
  };

  const triggerWifiReset = async () => {
    if (!wifiSSID || !wifiPass) return;
    try {
      const configPayload = `${wifiSSID},${wifiPass}`;
      await sendData(configPayload);
      setIsResettingWifi(false); 
    } catch (e) {}
  };

  const handleLogout = () => {
    disconnect();
    setAvatarUrl(INITIAL_AVATAR);
    setIsPendantConnected(false);
    setIsSyncing(false);
    setPetName('EchoPet'); 
    localStorage.removeItem('pet_avatar');
    localStorage.removeItem('pet_name');
    localStorage.removeItem('pet_breed');
    localStorage.removeItem('pet_color');
    localStorage.removeItem('ble_connected');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSyncing(true); 
    setIsPendantConnected(false); 

    const reader = new FileReader();
    reader.onloadend = () => { setAvatarUrl(reader.result as string); };
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      localStorage.setItem('pet_avatar', publicUrl);
      setAvatarUrl(publicUrl);

      const { data, error: functionError } = await supabase.functions.invoke('clever-endpoint', {
        body: { imageUrl: publicUrl }
      });

      if (functionError) { setIsSyncing(false); return; }

      const rawContent = data?.output || data?.content;
      if (rawContent && typeof rawContent === 'string' && rawContent.includes(',')) {
        const [breed, color] = rawContent.split(',').map(item => item.trim());
        await supabase.from('pet_assets').insert([{ breed, color }]);
        
        const channel = supabase.channel('pet-sync-room');
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({ type: 'broadcast', event: 'update_pet', payload: { breed, color } });
            setIsSyncing(false);
            setIsPendantConnected(true);
            setTimeout(() => channel.unsubscribe(), 1500); 
          }
        });
        localStorage.setItem('pet_breed', breed);
        localStorage.setItem('pet_color', color);
      }
    } catch (err) {
      setIsSyncing(false);
    }
  };

  // --- 界面渲染 (JSX) ---
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-white pt-8 pb-32 px-6 font-sans antialiased text-[#333] relative">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full">
        
        {/* 头像与名字编辑区 */}
        <section className="flex flex-col items-center py-10">
          <div className="relative mb-7">
            <div 
              className="w-35 h-35 rounded-full overflow-hidden border-[6px] border-[#F8F8F8] shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer active:scale-95 transition-transform"
              onClick={handleAvatarClick}
            >
              <img alt="Pet Avatar" className="w-full h-full object-cover" src={avatarUrl} referrerPolicy="no-referrer" />
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <div className={cn(
              "absolute bottom-0 right-4 w-6 h-6 border-4 border-white rounded-full transition-colors shadow-sm",
              isConnected ? 'bg-[#4ADE80]' : 'bg-[#E5E5E5]'
            )} />
          </div>
          
          <div className="text-center group">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  className="text-[22px] font-bold tracking-tight text-[#333] border-b-2 border-[#333] outline-none w-32 text-center bg-transparent"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                />
              </div>
            ) : (
              <button onClick={handleNameEdit} className="text-[28px] font-bold tracking-tight text-[#333] mb-2 active:scale-95 transition-transform cursor-pointer block w-full hover:opacity-80">
                {petName}
              </button>
            )}
          </div>
        </section>

        {/* 硬件卡片网格 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div 
            onClick={() => setIsResettingWifi(true)}
            className="rounded-[24px] p-5 flex flex-col justify-between min-h-[130px] transition-all border border-[#F2F2F2] bg-[#F9F9F9] cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-[#333] text-xl font-light">bluetooth</span>
              <div className={cn(
                "px-2 py-0.5 rounded-full flex items-center gap-1",
                isConnected ? "bg-white" : "bg-[#EEE]/50"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#CCC]')} />
                <span className={cn("text-[10px] font-bold tracking-widest", isConnected ? 'text-[#4ADE80]' : 'text-[#999]')}>
                  {isConnected ? dogStatus.toUpperCase() : 'OFFLINE'}
                </span>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <h3 className="text-[13px] font-bold text-[#333] tracking-tight">项圈配件</h3>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-blue-500 tracking-tight">同步中</span>
                <div className="flex items-center gap-1 text-[#CCC]">
                  <span className="material-symbols-outlined text-[12px]">battery_horiz_075</span>
                  <span className="text-[11px] font-bold tracking-widest">{isConnected ? '84%' : '--'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(
            "rounded-[24px] p-5 flex flex-col justify-between min-h-[130px] border transition-all duration-500",
            isPendantConnected ? "bg-[#F9F9F9] border-[#F2F2F2]" : isSyncing ? "bg-blue-50/50 border-blue-100" : "bg-[#F9F9F9]/50 border-transparent "
          )}>
            <div className="flex justify-between items-start">
              <span className={cn("material-symbols-outlined text-xl font-light", isPendantConnected ? "text-[#333]" : isSyncing ? "text-blue-600 animate-spin" : "text-[#CCC]")}>
                {isSyncing ? 'sync' : 'pentagon'}
              </span>
              <div className={cn("px-2 py-0.5 rounded-full flex items-center gap-1", isPendantConnected ? "bg-white" : isSyncing ? "bg-blue-100" : "bg-[#EEE]")}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isPendantConnected ? "bg-[#4ADE80] animate-pulse" : isSyncing ? "bg-blue-500 animate-bounce" : "bg-[#CCC]")} />
                <span className={cn("text-[10px] font-bold tracking-widest", isPendantConnected ? "text-[#4ADE80]" : isSyncing ? "text-blue-600" : "text-[#999]")}>
                  {isSyncing ? 'SYNC' : isPendantConnected ? 'READY' : 'IDLE'}
                </span>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <h3 className={cn("text-[13px] font-bold tracking-tight", (isPendantConnected || isSyncing) ? "text-[#333]" : "text-[#CCC]")}>随身挂件</h3>
              <div className={cn("flex gap-4", isPendantConnected ? "text-[#999]" : "text-[#CCC]")}>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">{isPendantConnected ? 'battery_horiz_075' : isSyncing ? 'hourglass_empty' : 'battery_unknown'}</span>
                  <span className="text-[11px] font-bold tracking-widest">{isPendantConnected ? '92%' : '--'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 系统更新栏 */}
        <div className="bg-[#F9F9F9] rounded-[24px] overflow-hidden border border-[#F2F2F2] mb-6">
          <div className="flex items-center justify-between p-4 hover:bg-white/40 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm group-active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-blue-500 text-lg font-light">system_update_alt</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#333] tracking-tight">检查更新</span>
                <span className="text-[11px] font-bold text-[#CCC] tracking-widest uppercase">Version 2.4.1</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FF2442] text-white rounded-full tracking-tighter">NEW</span>
              <span className="material-symbols-outlined text-[#CCC] text-lg">chevron_right</span>
            </div>
          </div>
        </div>

        {/* 退出按钮 */}
        <div className="mt-auto pb-4">
          <button onClick={handleLogout} className="w-full py-4 bg-[#333] text-white rounded-[20px] text-[14px] font-bold tracking-[0.1em] flex items-center justify-center gap-3 active:scale-[0.97] transition-all">
            <span className="material-symbols-outlined text-sm">logout</span> 退出登录
          </button>
        </div>
      </div>

      {/* 弹窗部分 */}
      {isResettingWifi && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl border border-[#F8F8F8] animate-in fade-in zoom-in duration-200">
            {!isConnected ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className={cn("material-symbols-outlined text-blue-600 text-3xl font-light", isConnectingBle && "animate-pulse")}>bluetooth_searching</span>
                </div>
                <h3 className="text-[18px] font-bold tracking-tight text-[#333] mb-2">连接项圈蓝牙</h3>
                <p className="text-[13px] text-[#999] mb-6 leading-relaxed">连接蓝牙以开启实时健康监测</p>
                <button 
                  onClick={handleBleConnect}
                  disabled={isConnectingBle}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-[15px] font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {isConnectingBle ? '正在搜索...' : '立即连接'}
                </button>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="w-12 h-12 bg-[#4ADE80]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[#4ADE80] text-2xl">verified</span>
                </div>
                <h3 className="text-[18px] font-bold tracking-tight text-[#333] text-center mb-6">连接已就绪</h3>
                <div className="space-y-4">
                   <div className="space-y-1">
                     <p className="text-[11px] font-bold text-[#CCC] tracking-widest uppercase ml-2">WiFi SSID</p>
                     <input 
                       value={wifiSSID} 
                       onChange={(e) => setWifiSSID(e.target.value)}
                       className="w-full px-4 py-3 bg-[#F9F9F9] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10" 
                       placeholder="请输入网络名称" 
                     />
                   </div>
                   <div className="space-y-1">
                     <p className="text-[11px] font-bold text-[#CCC] tracking-widest uppercase ml-2">Password</p>
                     <input 
                       type="password"
                       value={wifiPass} 
                       onChange={(e) => setWifiPass(e.target.value)}
                       className="w-full px-4 py-3 bg-[#F9F9F9] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10" 
                       placeholder="请输入密码" 
                     />
                   </div>
                </div>
                <div className="flex flex-col gap-3 mt-8">
                  <button onClick={triggerWifiReset} className="w-full py-4 rounded-2xl bg-[#333] text-[15px] font-bold text-white shadow-lg active:scale-95 transition-all">
                    同步配置
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => setIsResettingWifi(false)} className="w-full mt-3 py-2 text-[13px] font-bold text-[#CCC] hover:text-[#999] transition-colors">
              BACK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};