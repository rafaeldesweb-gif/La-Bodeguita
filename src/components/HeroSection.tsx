import React from 'react';
import { ArrowRight } from 'lucide-react';
import logoImage from '../assets/logo1.png';

interface HeroSectionProps {
  onOrderNow: () => void;
  onViewMenu: () => void;
  showLiveStatus?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOrderNow, onViewMenu, showLiveStatus = false }) => {
  return (
    <section className="relative w-full min-h-[85vh] flex flex-col justify-center px-6 md:px-16 py-16 overflow-hidden bg-[#0A0A0A]">
      {/* Background Image with Dark Aesthetics Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-1000 scale-105 opacity-30"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuChP_0g1pNzNSQ88BA4Fs8iYV8BuW3zYMx08Uxvw5ybP93gg0tPlH9yEGbjkR2yG1LndlF_XL4QQK2Zc4LWqIq1-fjc8xtWY-skh6VIFCnN80RN5gHer32ens93ul_EJVqEAPELyjQghgZqNh0--OgrfRJZRXVxLdasVAyV96sAWcc5ubTGpVzxOwJ5gtUz1KNyFXVgKo9oUtV694Eyx4hsEezqVFCzOehsy3oe1Rkii48F4cpg_oxJ9w')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl flex flex-col gap-8">
        <div className="space-y-4">
          {showLiveStatus && (
            <div className="flex items-center space-x-3">
              <img
                src={logoImage}
                alt="Logo La Bodeguita"
                className="h-12 w-12 object-contain rounded-full border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
              />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
                RECIBIENDO PEDIDOS
              </span>
            </div>
          )}

          <h1 className="font-bold text-5xl md:text-7xl lg:text-[96px] leading-[0.88] tracking-tighter text-white max-w-2xl">
            Kiosko <br />
            <span className="text-white/20">LA BODEGUITA</span>
          </h1>
        </div>

        <p className="text-base md:text-lg text-white/60 max-w-xl font-light leading-relaxed">
          Ingredientes de nivel superior, gastronomía urbana, energía y alegría.<br/> No preparamos hamburguesas convencionales; diseñamos experiencias sensoriales puras.
        </p>

        <div className="flex flex-wrap gap-4 mt-2">
          <button
            onClick={onOrderNow}
            className="px-8 py-4 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all rounded-sm flex items-center gap-2 cursor-pointer active:scale-95 shadow-lg"
          >
            <span>🍔</span> PEDIR AHORA
          </button>

          <button
            onClick={onViewMenu}
            className="px-8 py-4 bg-[#141414] text-white font-medium text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/20 rounded-sm flex items-center gap-2 cursor-pointer backdrop-blur-sm"
          >
            EXPLORAR MENÚ
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Parámetros del sistema en vivo */}
        <div className="pt-8 border-t border-white/10 flex space-x-12 mt-4 text-[11px] font-mono">
          <div>
            <p className="text-[10px] uppercase text-white/30 tracking-widest mb-1">Especialidad</p>
            <p className="text-white font-medium">BODEGUITA SUPREME</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/30 tracking-widest mb-1">Cocina en vivo</p>
            <p className="text-emerald-400 font-medium">4.2 MIN PREP</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/30 tracking-widest mb-1">Calificación</p>
            <p className="text-white font-medium">4.9 / 5.0 ★</p>
          </div>
        </div>
      </div>
    </section>
  );
};
