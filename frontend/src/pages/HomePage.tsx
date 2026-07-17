import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { ChevronRight, ChevronLeft, Ticket, Calendar, MapPin, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import heroImg from '../assets/hero.png';

interface Concert {
 id: string;
 access_code: string; 
 name: string;
 show_date: string;
 venue: string;
 layout_image_url?: string;
 is_active: boolean;
}

interface Carousel {
 id: string;
 image_url: string;
 link_url: string;
 is_active: boolean;
}

interface DocumentItem {
 id: string;
 title: string;
 cover_image: string;
 is_active: boolean;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function HomePage() {
 const { data: concertsData, isLoading: isConcertsLoading } = useSWR('/api/concerts/list', fetcher);
 const { data: carouselsData, isLoading: isCarouselsLoading } = useSWR('/api/carousel', fetcher);
 const { data: documentsData, isLoading: isDocumentsLoading } = useSWR('/api/documents/list', fetcher);

 const concerts = concertsData || [];
 const carousels = carouselsData || [];
 const documents = documentsData || [];

 const [currentSlide, setCurrentSlide] = useState(0);

 // ระบบเลื่อน Carousel อัตโนมัติ
 useEffect(() => {
 if (carousels.length <= 1) return;
 const timer = setInterval(() => {
 setCurrentSlide(prev => (prev + 1) % carousels.length);
 }, 5000);
 return () => clearInterval(timer);
 }, [carousels.length]);

 return (
 <div className="w-full overflow-x-hidden bg-canvas pb-20 transition-colors duration-300">
 {/* Premium Hero Banner - Apple Studio Style */}
 <div className="relative bg-canvas text-ink overflow-hidden border-b border-outline ">
 <div className="absolute inset-0 bg-linear-to-br from-canvas to-canvas opacity-50"></div>
 <div className="w-full px-6 lg:px-12 2xl:px-20 py-24 lg:py-32 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
 <div className="text-center md:text-left flex-1">
 <span className="inline-block py-1 px-4 rounded-full bg-zinc-950/5 /10 text-sm font-semibold tracking-widest uppercase mb-6 border border-black/10 /20 text-muted ">
 The Ultimate Experience
 </span>
 <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold mb-6 leading-tight tracking-tighter">
 Unlock Your <br className="hidden md:block" />
 <span className="text-muted ">Live Music</span> Journey
 </h1>
 <p className="text-lg md:text-2xl text-muted font-medium max-w-2xl mx-auto md:mx-0 mb-10 tracking-tight">
 ระบบจองตั๋วคอนเสิร์ตที่ล้ำสมัยที่สุด เลือกระบุที่นั่งแบบ Interactive และสัมผัสประสบการณ์ที่เหนือกว่า
 </p>
 <Link to="/concerts" className="inline-flex items-center gap-2 bg-zinc-950 text-white font-semibold py-4 px-10 rounded-full hover:scale-105 transition-transform duration-300">
 ดูคอนเสิร์ตทั้งหมด <ChevronRight size={20} />
 </Link>
 </div>
 <div className="flex-1 flex justify-center md:justify-end">
 <div className="relative w-64 md:w-80 lg:w-96">
 <img src={heroImg} alt="Hero" className="w-full h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] transform hover:scale-105 transition-transform duration-700" />
 </div>
 </div>
 </div>
 </div>

 {/* Admin Editable Carousel Section */}
 {isCarouselsLoading ? (
 <div className="w-full px-6 lg:px-12 2xl:px-20 mt-10">
 <div className="w-full h-62.5 md:h-100 lg:h-112.5 rounded-[2rem] bg-lifted animate-pulse"></div>
 </div>
 ) : carousels.length > 0 && (
 <div className="w-full px-6 lg:px-12 2xl:px-20 mt-10">
 <div className="relative w-full h-62.5 md:h-100 lg:h-112.5 rounded-[2rem] overflow-hidden shadow-2xl bg-canvas border border-outline ">
 {carousels.map((c: any, idx: number) => (
 <div
 key={c.id}
 className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
 >
 {c.link_url ? (
 <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
 <img src={c.image_url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
 </a>
 ) : (
 <img src={c.image_url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
 )}
 </div>
 ))}
 
 {carousels.length > 1 && (
 <>
 <button onClick={() => setCurrentSlide(prev => (prev - 1 + carousels.length) % carousels.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-canvas/50 hover:bg-canvas /50 dark:hover:bg-zinc-950 backdrop-blur-md text-ink w-12 h-12 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
 <ChevronLeft size={24} />
 </button>
 <button onClick={() => setCurrentSlide(prev => (prev + 1) % carousels.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-canvas/50 hover:bg-canvas /50 dark:hover:bg-zinc-950 backdrop-blur-md text-ink w-12 h-12 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
 <ChevronRight size={24} />
 </button>
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
 {carousels.map((_: any, idx: number) => (
 <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2.5 h-2.5 rounded-full transition-all shadow-md ${idx === currentSlide ? 'bg-canvas scale-150 w-6' : 'bg-canvas/50 hover:bg-canvas'}`} />
 ))}
 </div>
 </>
 )}
 </div>
 </div>
 )}

 {/* Concerts Grid Section */}
 <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
 <div className="flex items-center gap-4 mb-10">
 <div className="p-3 bg-lifted rounded-lg">
 <Ticket className="text-muted " size={28} />
 </div>
 <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
 คอนเสิร์ตเร็วๆ นี้
 </h2>
 </div>
 
 {isConcertsLoading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
 {[1,2,3,4].map(i => <div key={i} className="h-96 bg-lifted rounded-[2rem] animate-pulse"></div>)}
 </div>
 ) : concerts.length === 0 ? (
 <div className="text-center py-20 bg-canvas rounded-[2rem] shadow-sm border border-outline ">
 <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
 <p className="text-muted font-medium text-lg">ยังไม่มีคอนเสิร์ตในระบบขณะนี้</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
 {concerts.map((c: any) => (
 <div key={c.id} className={`group apple-glass rounded-[2rem] overflow-hidden flex flex-col h-full transition-all duration-500 ${!c.is_active ? 'opacity-70 grayscale' : 'hover:shadow-2xl hover:-translate-y-2'}`}>
 
 <div className="h-56 bg-lifted relative overflow-hidden">
 {c.layout_image_url ? 
 <img src={c.layout_image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/> : 
 <div className="w-full h-full flex items-center justify-center"><span className="text-muted font-medium">No Image</span></div>
 }
 <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/10 transition-colors duration-500"></div>
 <div className="absolute top-4 right-4 z-10">
 {c.is_active ? (
 <span className="bg-canvas/90 /90 backdrop-blur-md text-ink text-xs font-semibold px-4 py-2 rounded-full shadow-sm">เปิดจองแล้ว</span>
 ) : (
 <span className="bg-zinc-950/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm uppercase tracking-wider">Coming Soon</span>
 )}
 </div>
 </div>

 <div className="p-6 flex flex-col flex-1 bg-canvas/50 /50">
 <h3 className="text-2xl font-semibold mb-4 text-ink leading-snug line-clamp-2 tracking-tight">{c.name}</h3>
 <div className="space-y-3 mb-6">
 <div className="flex items-center text-muted text-sm font-medium">
 <div className="w-8 h-8 rounded-full bg-lifted flex items-center justify-center mr-3 shrink-0">
 <Calendar size={16} />
 </div>
 <span>{new Date(c.show_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.</span>
 </div>
 <div className="flex items-center text-muted text-sm font-medium">
 <div className="w-8 h-8 rounded-full bg-lifted flex items-center justify-center mr-3 shrink-0">
 <MapPin size={16} />
 </div>
 <span className="truncate">{c.venue}</span>
 </div>
 </div>
 <div className="mt-auto pt-4">
 {c.is_active ? (
 <Link to={`/concerts/${c.access_code}`} className="flex justify-center items-center w-full bg-zinc-950 text-white font-semibold py-3.5 rounded-full transition-all duration-300 hover:scale-105 shadow-sm">
 ดูรายละเอียด & จองตั๋ว
 </Link>
 ) : (
 <button disabled className="w-full bg-lifted text-muted font-semibold py-3.5 rounded-full cursor-not-allowed">
 รอเปิดจำหน่าย
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Documents/Gallery Section */}
 {isDocumentsLoading ? null : documents.length > 0 && (
 <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
 <div className="flex items-center gap-4 mb-10">
 <div className="p-3 bg-lifted rounded-lg">
 <ImageIcon className="text-muted " size={28} />
 </div>
 <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
 ข่าวสาร & ข้อมูลแกลเลอรี
 </h2>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
 {documents.map((d: any) => (
 <div key={d.id} className="group apple-glass rounded-[2rem] overflow-hidden flex flex-col h-full hover:shadow-2xl transition-all duration-300">
 <div className="h-48 bg-lifted relative overflow-hidden">
 {d.cover_image ? 
 <img src={d.cover_image} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/> : 
 <div className="w-full h-full flex items-center justify-center"><span className="text-muted font-medium">No Image</span></div>
 }
 </div>
 <div className="p-6 flex flex-col flex-1 bg-canvas/50 /50">
 <h3 className="text-xl font-semibold mb-4 text-ink leading-snug line-clamp-2 tracking-tight">{d.title}</h3>
 <div className="mt-auto pt-4">
 <Link to={`/documents/${d.id}`} className="flex justify-center items-center w-full bg-lifted hover:bg-lifted dark:hover:bg-gray-700 text-ink font-semibold py-3.5 rounded-full transition-colors duration-300">
 อ่านรายละเอียด & แกลเลอรี
 </Link>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}