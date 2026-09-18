import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { MenuItem } from '../types';

interface FeaturedProductsProps {
  items: MenuItem[];
  onOpenCustomization: (item: MenuItem) => void;
  onAddToCartDirect: (item: MenuItem) => void;
  onViewAll: () => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  items,
  onOpenCustomization,
  onAddToCartDirect,
  onViewAll,
}) => {
  return (
    <section className="px-6 md:px-16 py-16 bg-[#0A0A0A] border-t border-white/5">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
            Selección Destacada
          </p>
          <h2 className="font-bold text-3xl md:text-5xl text-white tracking-tight">
            NUESTROS ICONOS
          </h2>
        </div>

        <button
          onClick={onViewAll}
          className="hidden md:flex text-[11px] font-medium uppercase tracking-[0.2em] text-white/60 hover:text-white items-center gap-2 transition-colors cursor-pointer"
        >
          Ver todo el menú <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenCustomization(item)}
            className="group bg-[#141414] rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col cursor-pointer"
          >
            <div className="h-64 overflow-hidden relative">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80" />
              {item.badge && (
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-white text-black text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                    {item.badge}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col grow justify-between gap-4">
              <div>
                <h3 className="font-medium text-xl text-white group-hover:text-emerald-400 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="font-mono text-lg text-white font-semibold">
                  ${item.price.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.customizable) {
                      onOpenCustomization(item);
                    } else {
                      onAddToCartDirect(item);
                    }
                  }}
                  className="bg-white/10 border border-white/20 text-white p-2.5 rounded-full hover:bg-white hover:text-black transition-all flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center md:hidden">
        <button
          onClick={onViewAll}
          className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70 hover:text-white items-center gap-2 flex cursor-pointer"
        >
          Ver todo el menú <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
