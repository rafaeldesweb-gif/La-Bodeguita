import React, { useState } from 'react';
import { Search, Plus, Sparkles } from 'lucide-react';
import { MenuItem, Category } from '../types';

interface MenuCatalogProps {
  items: MenuItem[];
  onOpenCustomization: (item: MenuItem) => void;
  onAddToCartDirect: (item: MenuItem) => void;
  isAuthenticated?: boolean;
  onGoToAuth?: () => void;
}

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  items,
  onOpenCustomization,
  onAddToCartDirect,
  isAuthenticated = true,
  onGoToAuth,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'todos'>('hamburguesas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'todos' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-10">
      {/* Menu Header */}
      <section className="flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
          Catálogo Exclusivo
        </p>
        <h1 className="font-bold text-5xl md:text-7xl tracking-tighter text-white">
          GASTRONOMÍA URBANA.
        </h1>
        <p className="text-base text-white/60 max-w-2xl leading-relaxed font-light">
          Ingredientes de nivel superior, gastronomía urbana, energía y alegría.<br/>
No preparamos hamburguesas convencionales; diseñamos experiencias sensoriales puras..
        </p>

        {/* Category Filter Pills & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mt-6 border-b border-white/10 pb-6">
          <div className="flex gap-2.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setSelectedCategory('hamburguesas')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'hamburguesas'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Hamburguesas 🍔
            </button>

            <button
              onClick={() => setSelectedCategory('acompañantes')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'acompañantes'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Acompañantes 🍟
            </button>

            <button
              onClick={() => setSelectedCategory('bebidas')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'bebidas'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Bebidas 🍺
            </button>

            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'todos'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Ver Todo
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el menú..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-full bg-[#141414] text-white border border-white/10 focus:border-white/40 outline-none transition-all placeholder:text-white/30 font-mono"
            />
          </div>
        </div>
      </section>

      {/* Grid of Menu Items */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-16 text-white/50 bg-[#141414] rounded-2xl border border-white/10">
            <p className="font-bold text-lg text-white">No se encontraron productos</p>
            <p className="text-xs mt-1 text-white/50">Prueba a buscar con otra palabra clave o cambia la categoría.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col bg-[#141414] rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 shadow-sm"
            >
              <div className="relative h-60 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover opacity-85 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80" />
                {item.badge && (
                  <div className="absolute top-4 right-4 bg-white text-black text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {item.badge}
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col flex-grow gap-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-medium text-xl text-white group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </h3>
                  <span className="font-mono font-semibold text-lg text-white">
                    ${item.price.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-white/60 flex-grow leading-relaxed">
                  {item.description}
                </p>

                {!isAuthenticated ? (
                  <button
                    onClick={() => onGoToAuth?.()}
                    className="mt-4 w-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    HACER PEDIDO
                  </button>
                ) : item.customizable ? (
                  <button
                    onClick={() => onOpenCustomization(item)}
                    className="mt-4 w-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    Personalizar 🍔
                  </button>
                ) : (
                  <button
                    onClick={() => onAddToCartDirect(item)}
                    className="mt-4 w-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    Añadir <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
