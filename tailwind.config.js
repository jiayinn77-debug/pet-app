/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 品牌色：温暖的阳光黄，呼应宠物主题
        brand: '#FFB800', 
        // 背景色系：Braun 风格的浅灰底
        appBg: '#F8F9FA',
        // 卡片色
        card: '#FFFFFF',
        // 引用你原本代码里的深色调
        dark: {
          900: '#0F172A', 
          800: '#1E293B',
        }
      },
      borderRadius: {
        // 统一全案圆角，这种大圆角更有宠物亲和力
        'doudou': '28px',
        'doudou-sm': '14px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}