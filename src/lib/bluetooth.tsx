import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from './supabase';

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const IMAGE_UUID = "00002a37-0000-1000-8000-00805f9b34fb"; 

interface BluetoothContextType {
  isConnected: boolean;
  dogStatus: string;
  intensity: number;
  lastPhoto: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendData: (data: string) => Promise<void>;
  setIsConnected: (connected: boolean) => void;
  setLastPhoto: (photo: string | null) => void;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

// --- 【标准中英映射表】 ---
const ACTION_MAP: Record<string, string> = {
  'barking': '狂叫中...',
  'eat':     '进食中...',
  'idle':    '休息...', 
  'jump':    '正在跳跃',
  'play':    '玩耍中',
  'run':     '奔跑中...',
  'sit':     '坐下发呆...',
  'sleep':   '睡觉中...',
  'walk':    '散步中...',
};

// 反向映射，用于从小程序显示的中文或蓝牙原始状态推断英文 Key
const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_MAP).map(([en, zh]) => [zh, en])
);

export const BluetoothProvider = ({ children }: { children: ReactNode }) => {
  const [dogStatus, setDogStatus] = useState('Offline');
  const [intensity, setIntensity] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [device, setDevice] = useState<any>(null); 
  const [characteristic, setCharacteristic] = useState<any>(null); 

  // lastStatusRef 存储的是最终同步的英文 action，用于判断状态是否真正改变
  const lastStatusRef = useRef<string>('');
  const imageBuffer = useRef<Uint8Array>(new Uint8Array(0));
  
  // 创建实时广播信道
  const broadcastChannel = useRef(supabase.channel('realtime-dog-status'));

  // --- 【修改后的同步逻辑：严格根据首页呈现的状态变化来上传】 ---
  const syncToSupabase = async (rawStatus: string, accel: number) => {
    // 1. 清洗数据：取逗号前内容并去空格
    const cleanRaw = String(rawStatus).split(',')[0].trim();
    
    // 2. 转换：统一转为英文 Key（例如：“坐下发呆...” -> “sit”）
    const actionKey = (REVERSE_MAP[cleanRaw] || cleanRaw).toLowerCase();
    
    // 3. 过滤噪音状态
    if (!actionKey || ['offline', 'connected', 'capturing'].includes(actionKey)) return;

    // 4. 【关键拦截】：只有当最终映射的英文 Key 发生变化时才执行同步
    if (actionKey !== lastStatusRef.current) {
      const chineseStatus = ACTION_MAP[actionKey] || '监控中';
      
      // 立即更新 Ref，防止在异步请求期间被重复触发
      lastStatusRef.current = actionKey;

      try {
        // A. 极速广播：让网页端秒级响应（不依赖数据库写入速度）
        broadcastChannel.current.send({
          type: 'broadcast',
          event: 'action_sync',
          payload: { action: actionKey }
        });

        // B. 数据库写入：用于历史记录存储
        await supabase
          .from('dog_status')
          .insert([{ 
            state: chineseStatus, 
            action: actionKey, 
            intensity: accel 
          }]);
        
        console.log(`🚀 云端同步成功: [${actionKey}] -> ${chineseStatus}`);
      } catch (err) {
        console.error("云端同步失败:", err);
        // 如果同步彻底失败，可以考虑重置 Ref 以便下次重试
        // lastStatusRef.current = ''; 
      }
    }
  };

  useEffect(() => {
    // 初始化订阅
    broadcastChannel.current.subscribe();

    const handleUrlStatus = () => {
      const hash = window.location.hash;
      const search = hash.includes('?') ? hash.split('?')[1] : window.location.search;
      const params = new URLSearchParams(search);
      
      const connectionSignal = params.get('connected');
      const statusFromUrl = params.get('status');     
      const intensityFromUrl = params.get('intensity'); 
      const photoData = params.get('photoData');

      if (connectionSignal === 'true') {
        setIsConnected(true);
        if (statusFromUrl) {
          setDogStatus(statusFromUrl);
          const accel = intensityFromUrl ? parseFloat(intensityFromUrl) : 0;
          setIntensity(accel);
          syncToSupabase(statusFromUrl, accel);
        } else if (dogStatus === 'Offline' || dogStatus === 'Connected') {
          setDogStatus('Connected');
        }
      } else if (connectionSignal === 'false') {
        setIsConnected(false);
        setDogStatus('Offline');
      }
      
      if (photoData) setLastPhoto(decodeURIComponent(photoData));
    };

    handleUrlStatus();
    window.addEventListener('hashchange', handleUrlStatus); 
    return () => window.removeEventListener('hashchange', handleUrlStatus);
  }, []);

  const processImageBuffer = () => {
    if (imageBuffer.current.length === 0) return;
    const blob = new Blob([imageBuffer.current] as any[], { type: 'image/jpeg' });
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setLastPhoto(reader.result as string);
        imageBuffer.current = new Uint8Array(0); 
      }
    };
    reader.readAsDataURL(blob);
  };

  const connect = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) return;
    
    try {
      const bleDevice = await nav.bluetooth.requestDevice({
        filters: [{ name: 'EchoPet_Collar' }],
        optionalServices: [SERVICE_UUID]
      });

      const server = await bleDevice.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);
      const char = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      if (char) {
        setCharacteristic(char);
        setIsConnected(true);
        setDogStatus('Connected');
        
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = new TextDecoder().decode(event.target.value);
          if (value === "Capturing...") {
            imageBuffer.current = new Uint8Array(0);
          } else if (value.includes(',')) {
            const [status, accelStr] = value.split(',');
            const accel = parseFloat(accelStr);
            
            // 更新 UI 状态
            setDogStatus(status);
            setIntensity(accel);

            // 调用优化后的同步函数，内部会自动根据 actionKey 变化去重
            syncToSupabase(status, accel);
          }
        });
      }

      const imgChar = await service?.getCharacteristic(IMAGE_UUID);
      if (imgChar) {
        await imgChar.startNotifications();
        imgChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value;
          if (value) {
            const chunk = new Uint8Array(value.buffer);
            if (chunk.length === 0) {
              processImageBuffer();
              return;
            }
            const combined = new Uint8Array(imageBuffer.current.length + chunk.length);
            combined.set(imageBuffer.current);
            combined.set(chunk, imageBuffer.current.length);
            imageBuffer.current = combined;
            if (chunk.length < 180) { 
              setTimeout(processImageBuffer, 50);
            }
          }
        });
      }
      setDevice(bleDevice);
    } catch (e) {
      console.error("蓝牙连接失败:", e);
    }
  };

  const sendData = async (data: string) => {
    if (characteristic) {
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(data));
    }
  };

  const disconnect = () => {
    if (device?.gatt?.connected) device.gatt.disconnect();
    setIsConnected(false);
    setDogStatus('Offline');
    lastStatusRef.current = ''; 
    setCharacteristic(null);
    setDevice(null);
  };

  return (
    <BluetoothContext.Provider value={{ 
      isConnected, dogStatus, intensity, lastPhoto, connect, disconnect, sendData, setIsConnected, setLastPhoto 
    }}>
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);
  if (!context) throw new Error("useBluetooth 必须在 BluetoothProvider 内部使用");
  return context;
};