export interface ActivityLog {
  id: string;
  time: string;
  day: string;
  status: '运动/玩耍' | '深度睡眠' | '进食' | '轻微活动';
  description: string;
  imageUrl: string;
  color: string;
}

export interface VitalMetric {
  label: string;
  value: string | number;
  unit: string;
}

// 1. 统一状态名称与颜色，确保健康页列表与图表颜色一致
export const ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: '1',
    time: '08:42 am',
    day: '今天',
    status: '轻微活动',
    description: '早安早安！本汪的‘人体闹钟’准时上线⏰！刚睁开眼就看到主人张开大抱抱，这谁顶得住呀～嘿嘿，先不管了，冲过去就是一个爱的舔舔！👅(๑´ڡ`๑)',
    imageUrl: 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/pet-data/7.jpg',
    color: '#4ADE80' // 绿色
  },
];

export const VITALS: VitalMetric[] = [
  { label: '步数', value: '2,227', unit: '' },
  { label: '公里', value: '1.4', unit: '' },
  { label: '分钟', value: '35', unit: '' },
  { label: '环境温度', value: '22', unit: '°C' }
];

// 2. 修正 CHART_DATA，确保健康页面的柱状图不再是灰色
// type 必须包含：'active' | 'sleep' | 'eat' | 'light'
export const CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: Math.floor(Math.random() * 60) + 20, 
  type: ['active', 'sleep', 'eat', 'light'][Math.floor(Math.random() * 4)] as 'active' | 'sleep' | 'eat' | 'light'
}));