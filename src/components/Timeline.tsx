import React, { useState, useEffect, useRef } from 'react';
import { ACTIVITY_LOGS } from '../constants';
import { cn } from '../lib/utils';
import AMapLoader from '@amap/amap-jsapi-loader';
import { RoutingIcon } from './Icons/RoutingIcon';
import { createClient } from '@supabase/supabase-js';

// --- Supabase 客户端初始化 ---
const supabase = createClient(
  'https://kockgextkiqsrgghybkd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvY2tnZXh0a2lxc3JnZ2h5YmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTUzNzMsImV4cCI6MjA4OTk5MTM3M30.PvaihC7l5lcTL49XXvXzUOY7Ft20Zg03Mev_UVRPGrw'
);

export interface ActivityLog {
  id: string;
  day: string;
  time: string;
  status: string; 
  color: string;
  imageUrl: string;
  description: string;
  timestamp: number;
}

interface TimelineProps {
  isPublishing: boolean;
  setIsPublishing: (val: boolean) => void;
  bluetoothData?: string; 
}

// 状态汉化映射表
const STATUS_MAP: Record<string, string> = {
  'sleep': '正在睡觉',
  'idle': '原地休息',
  'run': '欢快奔跑',
  'walk': '悠闲散步',
  'play': '尽情玩耍',
  'sit': '坐下发呆',
};

export const Timeline = ({ isPublishing, setIsPublishing, bluetoothData }: TimelineProps) => {
  const [petName, setPetName] = useState('我的足迹');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapInstance = useRef<any>(null);
  const petMarkerRef = useRef<any>(null);
  
  const [realtimePos, setRealtimePos] = useState<{lat: number, lng: number} | null>(null);
  const [phonePos, setPhonePos] = useState<{lat: number, lng: number} | null>(null);

  const [personalLogs, setPersonalLogs] = useState<ActivityLog[]>(() => {
    const savedLogs = localStorage.getItem('local_personal_logs_v3');
    return savedLogs ? JSON.parse(savedLogs) : (ACTIVITY_LOGS as ActivityLog[]);
  });

  // --- 格式化函数 ---
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  const formatDay = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.ceil((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  const processImageUrl = (urlOrName: string) => (!urlOrName || urlOrName.startsWith('http')) ? urlOrName : `https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/pet-data/${urlOrName}`;

  // --- 解析蓝牙字符串逻辑 ---
  useEffect(() => {
    if (bluetoothData) {
      const parts = bluetoothData.split(',');
      if (parts.length >= 4) {
        const lat = parseFloat(parts[2]);
        const lng = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          setRealtimePos({ lat, lng });
        }
      }
    }
  }, [bluetoothData]);

  // --- 加载 Supabase 历史足迹（含汉化逻辑） ---
  useEffect(() => {
    const loadInitialData = async () => {
      const [photoRes, statusRes] = await Promise.all([
        supabase.from('dog_photo').select('*').order('created_at', { ascending: false }),
        supabase.from('dog_status').select('state, updated_at').order('updated_at', { ascending: false })
      ]);

      if (photoRes.data) {
        const dbLogs: ActivityLog[] = photoRes.data.map(item => {
          const photoTimestamp = new Date(item.created_at).getTime();
          
          let rawStatus = (item.status || '自动捕捉').toLowerCase();
          let statusColor = '#FF2442';

          if (statusRes.data && statusRes.data.length > 0) {
            const closest = statusRes.data.reduce((prev, curr) => {
              const currDiff = Math.abs(new Date(curr.updated_at).getTime() - photoTimestamp);
              const prevDiff = Math.abs(new Date(prev.updated_at).getTime() - photoTimestamp);
              return currDiff < prevDiff ? curr : prev;
            });

            const finalDiff = Math.abs(new Date(closest.updated_at).getTime() - photoTimestamp);
            if (finalDiff < 15 * 60 * 1000) {
              rawStatus = closest.state.toLowerCase();
              if (rawStatus === 'sleep') statusColor = '#5856D6';
              if (rawStatus === 'idle') statusColor = '#999999';
            }
          }

          // 执行汉化转换
          const displayStatus = STATUS_MAP[rawStatus] || rawStatus;

          return {
            id: item.id.toString(),
            day: formatDay(new Date(item.created_at)),
            time: formatTime(new Date(item.created_at)),
            status: displayStatus,
            color: statusColor,
            imageUrl: processImageUrl(item.image_url),
            description: item.description || `检测到宠物行为变化，已自动记录`,
            timestamp: photoTimestamp
          };
        });
        setPersonalLogs(dbLogs);
      }
    };
    loadInitialData();

    const channel = supabase.channel('pet-changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dog_photo' }, (payload) => {
      const newRecord = payload.new;
      const itemDate = new Date(newRecord.created_at || new Date());
      const newLog: ActivityLog = {
        id: newRecord.id.toString(),
        day: formatDay(itemDate),
        time: formatTime(itemDate),
        status: newRecord.status || '实时捕捉',
        color: '#FF2442',
        imageUrl: processImageUrl(newRecord.image_url),
        description: newRecord.description || '刚刚捕捉到的瞬间！',
        timestamp: itemDate.getTime()
      };
      setPersonalLogs(prev => [newLog, ...prev]);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- 实时地图渲染逻辑 ---
  useEffect(() => {
    let map: any = null;
    let geolocation: any = null;

    if (showMap) {
      (window as any)._AMapSecurityConfig = { securityJsCode: 'e7f8805686d88d9fdc477697937ac810' };
      AMapLoader.load({
        key: '3758f5a354fc74e52086f2562bb57b25',
        version: '2.0',
        plugins: ['AMap.Geolocation', 'AMap.Marker'],
      }).then((AMap) => {
        map = new AMap.Map('map-container', {
          viewMode: '3D',
          zoom: 17,
          mapStyle: 'amap://styles/whitesmoke', 
        });
        mapInstance.current = map;

        geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          buttonPosition: 'RB',
          buttonOffset: [20, 80],
          showMarker: true,
          showCircle: true,
          panToLocation: true,
          zoomToAccuracy: true,
        });
        map.addControl(geolocation);
        geolocation.watchPosition();

        AMap.Event.addListener(geolocation, 'complete', (data: any) => {
          setPhonePos({
            lat: data.position.getLat(),
            lng: data.position.getLng()
          });
        });

        const petMarker = new AMap.Marker({
          content: `
            <div style="position: relative;">
              <div style="background: #FF2442; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                <div style="width: 20px; height: 20px; background: white; border-radius: 50%; transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                    <span style="color: #FF2442; font-size: 12px; font-weight: bold;">🐾</span>
                </div>
              </div>
            </div>`,
          offset: new AMap.Pixel(-16, -32)
        });
        petMarkerRef.current = petMarker;
        map.add(petMarker);

        if (realtimePos) {
          petMarker.setPosition([realtimePos.lng, realtimePos.lat]);
        }
      });
    }
    return () => { 
      if (map) map.destroy(); 
    };
  }, [showMap]);

  // --- 实时更新宠物 Marker 位置 ---
  useEffect(() => {
    if (mapInstance.current && petMarkerRef.current && realtimePos) {
      petMarkerRef.current.setPosition([realtimePos.lng, realtimePos.lat]);
    }
  }, [realtimePos]);

  // --- 分组逻辑 ---
  const groupedLogs = [...personalLogs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .reduce((acc, log) => {
      const dayKey = log.day || '未知日期';
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(log);
      return acc;
    }, {} as Record<string, ActivityLog[]>);

  const sortedDays = Object.keys(groupedLogs).sort((a, b) => {
    if (a === '今天') return -1;
    if (b === '今天') return 1;
    if (a === '昨天') return -1;
    if (b === '昨天') return 1;
    return 0; 
  });

  return (
    <div className="w-full flex flex-col bg-white min-h-screen relative font-sans antialiased text-[#333]">
      {showSuccessToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200]">
          <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-xl">
            <span className="material-symbols-outlined text-[20px] text-[#FF2442]">favorite</span>
            <span className="text-[14px] font-medium">已记录到足迹</span>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 w-full z-[60] flex items-center px-4 h-14 bg-white border-b border-[#F2F2F2]">
        <div className="w-10" />
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-[15px] font-bold tracking-tight text-[#333]">{petName}</h2>
          <div className="w-10 h-0.5 bg-[#FF2442] rounded-full mt-0.5" />
        </div>
        <div className="w-10 flex justify-end">
          <button onClick={() => setShowMap(true)} className="active:scale-90 transition-transform">
            <RoutingIcon size={26} color="#333" /> 
          </button>
        </div>
      </header>

      <div className="pt-20 pb-32 px-4 max-w-2xl mx-auto w-full">
        {sortedDays.map((day) => (
          <div key={day} className="mb-10">
            <div className="flex items-center mb-6">
              <span className={cn("text-[18px] font-bold mr-3 text-[#333]", day !== '今天' && "text-[#999]")}>{day}</span>
              <div className="h-[1px] flex-grow bg-[#EEE]" />
            </div>
            <div className="space-y-6">
              {groupedLogs[day].map((log) => (
                <div key={log.id} className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden border border-[#F2F2F2]">
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#F5F5F5]">
                    <img src={log.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-medium">{log.time}</div>
                  </div>
                  <div className="p-4">
                    <p className="text-[15px] leading-[1.6] text-[#333] mb-4 font-normal">{log.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-[#F8F8F8]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: log.color }} />
                        <span className="text-[#999] text-[12px] font-medium">{log.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showMap && (
        <div className="fixed inset-0 z-[150] bg-white animate-in slide-in-from-bottom duration-500 flex flex-col">
          <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-[#F2F2F2]">
            <button className="w-10 h-10 flex items-center" onClick={() => setShowMap(false)}>
              <span className="material-symbols-outlined text-[#333] text-[28px]">expand_more</span>
            </button>
            <h2 className="text-[15px] font-bold text-[#333]">实时定位追踪</h2>
            <div className="w-10" />
          </header>
          <div id="map-container" className="flex-1 bg-[#F9F9F9]" />
          
          <div className="absolute bottom-30 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white",
              phonePos ? "bg-[#007AFF] animate-pulse" : "bg-gray-400"
            )}>
               <span className="material-symbols-outlined">{phonePos ? 'my_location' : 'location_off'}</span>
            </div>
            <div>
              <p className="text-[13px] font-bold">{phonePos ? '定位已锁定' : '正在获取位置...'}</p>
              <p className="text-[11px] text-[#666]">
                {phonePos 
                  ? `当前位置: ${phonePos.lng.toFixed(4)}, ${phonePos.lat.toFixed(4)}`
                  : '请确保已开启定位'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};