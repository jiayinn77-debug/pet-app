import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { AddCardIcon } from './Icons/AddCardIcon';

// --- 类型定义 ---
interface Comment {
  id: string;
  userName: string;
  text: string;
  time: string;
}

interface Post {
  id: string;
  name: string;
  dist: string;
  time: string;
  status: string;
  img: string;
  desc: string;
  isLocal?: boolean;
  likes?: number;
  isLiked?: boolean;
  isFavorited?: boolean;
  comments?: Comment[];
}

interface CommunityProps {
  onPublishingChange?: (isPublishing: boolean) => void;
}

const formatTimestamp = (timestamp: string) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  if (isNaN(postDate.getTime())) return timestamp;
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  return postDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

const DEFAULT_POSTS: Post[] = [
  {
    id: 'c1',
    name: '溢出的代码线',
    dist: '300米',
    time: new Date(Date.now() - 1800000).toISOString(),
    status: '活跃中',
    img: 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/0ea898fae8bb69143e0332bc7f2b055a.jpg',
    desc: '今天在公园尝试了新的飞盘，毛孩子表现得太棒了！',
    likes: 12,
    comments: [
      { id: 'com-1', userName: '汪汪队长', text: '太厉害了！', time: new Date().toISOString() }
    ]
  },
  {
    id: 'c2',
    name: '天空之城',
    dist: '1.2公里',
    time: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: '休息中',
    img: 'https://kockgextkiqsrgghybkd.supabase.co/storage/v1/object/public/avatars/62a4c8393a2085f876a2aa96844fe67c.jpg',
    desc: '今天吃到星巴克的奶油啦！！！！',
    likes: 5,
    comments: []
  }
];

export const Community: React.FC<CommunityProps> = ({ onPublishingChange }) => {
  const [communityList, setCommunityList] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('local_community_posts');
      return saved ? JSON.parse(saved) : DEFAULT_POSTS;
    } catch (e) {
      return DEFAULT_POSTS;
    }
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [petName, setPetName] = useState('我');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onPublishingChange?.(isPublishing || activeCommentPostId !== null);
  }, [isPublishing, activeCommentPostId, onPublishingChange]);

  useEffect(() => {
    const syncProfile = () => {
      const avatar = localStorage.getItem('pet_avatar');
      const name = localStorage.getItem('pet_name');
      if (avatar) setUserAvatar(avatar);
      if (name) setPetName(name);
    };
    syncProfile();
    window.addEventListener('focus', syncProfile);
    const interval = setInterval(syncProfile, 1000);
    return () => {
      window.removeEventListener('focus', syncProfile);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('local_community_posts', JSON.stringify(communityList));
  }, [communityList]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width, height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          setSelectedImage(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = () => {
    if (!postText || !selectedImage) return;
    const newPost: Post = {
      id: `local-${Date.now()}`,
      name: petName || '我',
      dist: '0米',
      time: new Date().toISOString(),
      status: '活跃中',
      img: selectedImage,
      desc: postText,
      isLocal: true,
      likes: 0,
      comments: []
    };
    setCommunityList(prev => [newPost, ...prev]);
    setPostText(''); setSelectedImage(null); setIsPublishing(false);
    setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCommentPostId) return;
    
    const newComment: Comment = {
      id: `com-${Date.now()}`,
      userName: petName || '我',
      text: commentInput,
      time: new Date().toISOString()
    };

    setCommunityList(prev => prev.map(post => {
      if (post.id === activeCommentPostId) {
        return { ...post, comments: [...(post.comments || []), newComment] };
      }
      return post;
    }));

    setCommentInput('');
    setActiveCommentPostId(null);
  };

  const toggleLike = (id: string) => {
    setCommunityList(prev => prev.map(post => {
      if (post.id === id) {
        const isLiked = !post.isLiked;
        return { ...post, isLiked, likes: (post.likes || 0) + (isLiked ? 1 : -1) };
      }
      return post;
    }));
  };

  const toggleFavorite = (id: string) => {
    setCommunityList(prev => prev.map(post => 
      post.id === id ? { ...post, isFavorited: !post.isFavorited } : post
    ));
  };

  return (
    <div className="w-full flex flex-col bg-white min-h-screen relative font-sans antialiased text-[#333333]">
      {showSuccessToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in fade-in zoom-in duration-300">
          <div className="bg-[#000000]/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-xl">
            <span className="material-symbols-outlined text-[20px] text-white">check</span>
            <span className="text-[13px] font-medium tracking-wide">发布成功</span>
          </div>
        </div>
      )}

{/* 顶部导航 */}
      <header className="fixed top-0 left-0 w-full z-[60] flex items-center justify-between px-4 h-12 bg-white/95 backdrop-blur-md border-b border-gray-100">
        {/* 左侧占位，保持标题居中 */}
        <div className="w-10" />

        {/* 中间标题区域：包含文字和红线 */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-[15px] font-bold text-[#333333]">附近的小伙伴</h2>
          <div className="w-10 h-0.5 bg-[#FF2442] rounded-full mt-0.5" />
        </div>

        {/* 右侧发布按钮 */}
        <div className="w-10 flex justify-end">
          <button 
            onClick={() => setIsPublishing(true)} 
            className="w-8 h-8 flex items-center justify-center text-[#333333] active:scale-90 transition-all"
          >
            <AddCardIcon size={24} color="#333333" />
          </button>
        </div>
      </header>

      <div className="pt-12 pb-24">
        <div className="max-w-2xl mx-auto">
          {communityList.map(post => (
            <div key={post.id} className="bg-white mb-4">
              {/* 用户信息 */}
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gray-50 overflow-hidden border border-gray-100 shadow-sm">
                  {post.isLocal && userAvatar ? (
                    <img src={userAvatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.name}`} alt="" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-[#333333] leading-tight">{post.name}</span>
                  <span className="text-[11px] text-gray-400">
                    {formatTimestamp(post.time)} · {post.dist}
                  </span>
                </div>
              </div>

              {/* 内容图片 */}
              <div className="px-4">
                <div className="aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden border border-gray-50 shadow-sm">
                  <img src={post.img} className="w-full h-full object-cover" alt="" />
                </div>
              </div>

              {/* 交互栏 */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-5">
                  <button onClick={() => toggleLike(post.id)} className={cn("flex items-center gap-1 active:scale-110 transition-all", post.isLiked ? "text-[#FF2442]" : "text-[#333333]")}>
                    <span className={cn("material-symbols-outlined text-[24px]", post.isLiked && "fill-current")}>favorite</span>
                    <span className="text-[13px] font-medium">{post.likes || 0}</span>
                  </button>

                  <button onClick={() => setActiveCommentPostId(post.id)} className="flex items-center gap-1 text-[#333333] active:scale-110 transition-all">
                    <span className="material-symbols-outlined text-[24px]">chat_bubble</span>
                    <span className="text-[13px] font-medium">{post.comments?.length || 0}</span>
                  </button>

                  <button onClick={() => toggleFavorite(post.id)} className={cn("active:scale-110 transition-all", post.isFavorited ? "text-[#FFB300]" : "text-[#333333]")}>
                    <span className={cn("material-symbols-outlined text-[24px]", post.isFavorited && "fill-current")}>star</span>
                  </button>
                </div>
                <button className="text-[#333333]">
                  <span className="material-symbols-outlined text-[22px]">share</span>
                </button>
              </div>

              {/* 内容描述 */}
              <div className="px-4 pb-2">
                <p className="text-[14px] leading-relaxed text-[#333333] tracking-tight">
                  <span className="font-bold mr-2">{post.name}</span>
                  {post.desc}
                </p>
              </div>

              {/* 评论展示区 */}
              {post.comments && post.comments.length > 0 && (
                <div className="mx-4 mt-1 bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-50">
                  {post.comments.slice(0, 3).map(comment => (
                    <div key={comment.id} className="text-[13px] leading-snug">
                      <span className="font-bold text-[#555555] mr-1.5">{comment.userName}</span>
                      <span className="text-[#333333]">{comment.text}</span>
                    </div>
                  ))}
                  {post.comments.length > 3 && (
                    <button className="text-[12px] text-gray-400 pt-1">查看全部评论</button>
                  )}
                </div>
              )}
              
              <div className="h-[1px] bg-gray-50 mx-4 mt-6" />
            </div>
          ))}
        </div>
      </div>

      {/* 底部评论输入框弹出层 */}
      {activeCommentPostId && (
        <div className="fixed inset-0 z-[120] flex items-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveCommentPostId(null)} />
          <div className="relative w-full bg-white p-3 pb-8 rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <input 
                autoFocus
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="喜欢就评论一下吧..."
                className="flex-grow h-10 bg-gray-100 rounded-full px-4 text-[14px] outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button 
                onClick={handleAddComment}
                className="text-[#3388FF] font-bold text-[14px] px-2 disabled:opacity-30"
                disabled={!commentInput.trim()}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发布模态框 */}
      {isPublishing && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPublishing(false)} />
          <div className="relative z-[110] w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-400">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
              <button onClick={() => setIsPublishing(false)} className="text-gray-500"><span className="material-symbols-outlined">close</span></button>
              <h3 className="text-[15px] font-bold">发笔记</h3>
              <button 
                disabled={!postText || !selectedImage}
                onClick={handlePublish}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[13px] font-bold transition-all", 
                  (postText && selectedImage) ? "bg-[#FF2442] text-white" : "bg-gray-100 text-gray-300"
                )}
              >发布</button>
            </div>
            <div className="p-5 space-y-4">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <div onClick={() => fileInputRef.current?.click()} className="aspect-square w-24 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:bg-gray-100">
                {selectedImage ? <img src={selectedImage} className="w-full h-full object-cover" alt="" /> : (
                  <div className="text-center">
                    <span className="material-symbols-outlined text-gray-400 text-[28px]">add</span>
                  </div>
                )}
              </div>
              <textarea 
                value={postText} 
                onChange={(e) => setPostText(e.target.value)} 
                placeholder="分享你的瞬间..." 
                className="w-full h-32 bg-transparent text-[15px] outline-none resize-none placeholder:text-gray-300" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};