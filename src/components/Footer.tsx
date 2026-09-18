import React from 'react';
import logoImage from '../assets/logo1.png';

interface FooterProps {
  setActiveTab: (tab: 'home' | 'menu' | 'my-orders' | 'admin') => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="w-full py-16 px-6 md:px-16 flex flex-col md:flex-row justify-between gap-12 bg-[#0A0A0A] text-[#E0E0E0] border-t border-white/10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="Logo La Bodeguita" className="h-14 w-14 object-contain rounded-full border border-white/10 bg-white/5" />
          <div className="font-bold text-2xl tracking-tighter text-white">
            LA BODEGUITA DE SOTILLO
          </div>
        </div>
        <div className="text-xs text-white/60 max-w-sm leading-relaxed font-light">
          Gastronomía Urbana de Vanguardia. LA MEJOR SMASH BURGUER.
        </div>
        <div className="text-[10px] font-mono text-white/40 mt-4 tracking-wider uppercase">
          © {new Date().getFullYear()} LA BODEGUITA. TODOS LOS DERECHOS RESERVADOS.
        </div>
      </div>

      <div className="flex flex-wrap gap-12 text-xs">
        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-white uppercase tracking-widest text-[10px] text-white/40">EXPLORAR</span>
          <button onClick={() => setActiveTab('menu')} className="text-left text-white/70 hover:text-white transition-colors uppercase tracking-wider text-[11px] cursor-pointer">
            Menú Interactivo
          </button>
          <button onClick={() => setActiveTab('my-orders')} className="text-left text-white/70 hover:text-white transition-colors uppercase tracking-wider text-[11px] cursor-pointer">
            Estado de Pedidos
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-white uppercase tracking-widest text-[10px] text-white/40">HORARIOS & UBICACIÓN</span>
          <span className="text-white/70 text-[11px] font-mono">De Jueves a Domingo: 16:00 - 00:00</span>
          <a
            href="https://maps.google.com/?q=Calle+Virgen+de+los+Remedios+5,+05420+Sotillo+de+la+Adrada,+%C3%81vila"
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/3 px-3 py-2.5 text-white/80 transition-all hover:border-emerald-400/40 hover:bg-emerald-400/5 hover:text-white"
          >
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[10px] text-emerald-400">●</span>
            <span className="text-[11px] leading-relaxed">
              Calle Virgen de los Remedios, 5, 05420 Sotillo de la Adrada, Ávila
            </span>
          </a>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-white uppercase tracking-widest text-[10px] text-white/40">REDES</span>
          <a href="#" className="text-white/70 hover:text-white transition-colors uppercase tracking-wider text-[11px]">
            Instagram
          </a>
          <a href="#" className="text-white/70 hover:text-white transition-colors uppercase tracking-wider text-[11px]">
            Twitter / X
          </a>
          <a href="#" className="text-white/70 hover:text-white transition-colors uppercase tracking-wider text-[11px]">
            TikTok
          </a>
        </div>
      </div>
    </footer>
  );
};
