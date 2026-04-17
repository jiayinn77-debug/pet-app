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
    imageUrl: '/dog/和主人互动.png',
    color: '#4ADE80' // 绿色
  },
  {
    id: '2',
    time: '12:15 pm',
    day: '昨天',
    status: '深度睡眠',
    description: '呼噜呼噜...💤 正在做一个香香的梦。今日份能量消耗完毕，原地躺平～',
    imageUrl: '/dog/睡觉.png',
    color: '#A78BFA' // 紫色
  },
  {
    id: '3',
    time: '10:12 pm',
    day: '昨天',
    status: '运动/玩耍',
    description: '报告！发现前方有可疑的‘发光体’（路灯）！💡 嗅嗅...嗯，安全！既然月亮这么圆，那今天我们就多逛一个圈吧！冲鸭——！✨🐾',
    imageUrl: '/dog/公园散步.png',
    color: '#93C5FD' // 蓝色
  },
  {
    id: '4',
    time: '09:30 am',
    day: '昨天',
    status: '运动/玩耍',
    description: '在草地上疯狂撒欢！遇到了邻居家的小金毛，我们一起玩了好久。',
    imageUrl: '/dog/在公园玩.png',
    color: '#4ADE80'
  },
  {
    id: '5',
    time: '9:50 pm',
    day: '昨天',
    status: '运动/玩耍',
    description: '救命！我怀疑我误入了天堂！😱 这里全是罐罐！全是肉肉！全是玩具！每一个都在朝我招手说‘带我回家’～ 主人主人，我们把这一排都搬空好不好呀？(≧∇≦)ﾉ',
    imageUrl: '/dog/超市.png',
    color: '#A78BFA'
  },
  {
    id: '6',
    time: '07:45 pm',
    day: '昨天',
    status: '进食',
    description: '晚饭时间到！吃到了最喜欢的牛肉罐头，身体棒棒哒！',
    imageUrl: '/dog/吃饭.png',
    color: '#FBBC05' // 橙色
  },
  {
    id: '7',
    time: '9:51 am',
    day: '今天',
    status: '轻微活动',
    description: '报告！发现不明飞行物！🛸 它的羽毛看起来软乎乎的，飞起来还带风呢。本汪已经开启‘静止监控模式’，只要它敢降落，我就...我就对着它摇尾巴！汪！( •̀ ω •́ )y',
    imageUrl: '/dog/窗外的鸟.jpg',
    color: '#4ADE80' // 绿色
  },
   {
    id: '7',
    time: '10:11 am',
    day: '今天',
    status: '运动/玩耍',
    description: '芜湖！起飞！🚀 今天在公园跟好朋狗玩疯啦！真的太好玩了，好想每天都泡在草坪上呀～ (≧∇≦)ﾉ',
    imageUrl: '/dog/在公园玩.png',
    color: '#4ADE80' // 绿色
  },
     {
    id: '7',
    time: '16:11 pm',
    day: '今天',
    status: '进食',
    description: '阳光洒在地毯上，洒在狗粮上，暖洋洋的✨。其实本汪的要求很简单，只要每天都有吃不完的骨头🦴和狗粮！！！🐾❤️',
    imageUrl: '/dog/吃饭.png',
    color: '#4ADE80' // 绿色
  },
       {
    id: '7',
    time: '16:31 pm',
    day: '今天',
    status: '深度睡眠',
    description: '阳光刚好铺在地毯上，暖洋洋的，像一个超大的抱抱✨。本汪的电量已经降到 1% 啦，申请进入“自动休眠模式”……梦里会有啃不完的肉骨头和跑不完的草地吗？',
    imageUrl: '/dog/睡觉.png',
    color: '#A78BFA' // 绿色
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