import React from 'react';
import { ShoppingCart, User, Utensils, Home, ShoppingBag, LogOut } from 'lucide-react';
import logoImage from '../assets/logo1.png';

interface TopNavBarProps {
  activeTab: 'home' | 'menu' | 'my-orders' | 'admin';
  setActiveTab: (tab: 'home' | 'menu' | 'my-orders' | 'admin') => void;
  cartCount: number;
  toggleCart: () => void;
  activeOrdersCount: number;
  isAdminAuthenticated: boolean;
  isAuthenticated: boolean;
  userRole?: 'customer' | 'admin';
  userName?: string;
  onOpenAdminAccess: () => void;
  onCustomerLogout: () => void;
  hasReadyOrderNotification: boolean;
  isAnyAdminOnline?: boolean;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  toggleCart,
  activeOrdersCount,
  isAdminAuthenticated,
  isAuthenticated,
  userRole,
  userName,
  onOpenAdminAccess,
  onCustomerLogout,
  hasReadyOrderNotification,
  isAnyAdminOnline,
}) => {
  return (
    <header className="sticky top-0 w-full z-50 flex justify-between items-center px-6 md:px-12 h-20 bg-[#0A0A0A]/90 border-b border-white/10 backdrop-blur-md">
      {/* Brand logo & core indicator */}
      <div className="flex items-center space-x-6">
        <div 
          onClick={() => setActiveTab('menu')}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <img
            src={logoImage}
            alt="Logo La Bodeguita"
            className="h-12 w-12 object-contain rounded-full bg-white/5 ring-1 ring-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-transform group-hover:scale-105"
          />
          <span className="text-lg font-bold tracking-tighter uppercase text-white">
            La Bodeguita de Sotillo
          </span>
        </div>

        {/* Live status badge for Admin */}
        {isAdminAuthenticated && (
          <div className="flex items-center space-x-2 pl-4 border-l border-white/10">
            <div className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.85)] animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest text-[#39ff14] font-bold">Cocina en línea</span>
          </div>
        )}

        {userRole === 'customer' && (
          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/75">Bienvenido {userName || 'cliente'}</span>
            
            {isAnyAdminOnline && (
              <div className="flex items-center space-x-2 border-l border-white/10 pl-3">
                <div className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.85)] animate-pulse"></div>
                <span className="text-[10px] uppercase tracking-widest text-[#39ff14] font-bold">Cocina en línea</span>
              </div>
            )}

            <button
              aria-label="Cerrar sesión"
              onClick={onCustomerLogout}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        )}
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-8 text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
        {!isAuthenticated && (
          <button
            onClick={() => setActiveTab('home')}
            className={`py-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'home'
                ? 'text-white font-bold border-b-2 border-white'
                : 'hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Acceder
          </button>
        )}

        <button
          onClick={() => setActiveTab('menu')}
          className={`py-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'menu'
              ? 'text-white font-bold border-b-2 border-white'
              : 'hover:text-white'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          Menú
        </button>

        {isAuthenticated && <button
          onClick={() => setActiveTab('my-orders')}
          className={`py-2 transition-colors flex items-center gap-1.5 cursor-pointer relative ${
            activeTab === 'my-orders'
              ? 'text-white font-bold border-b-2 border-white'
              : 'hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Mis Pedidos
          {activeOrdersCount > 0 && (
            <span className="bg-emerald-500 text-black text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {activeOrdersCount}
            </span>
          )}
        </button>}
      </nav>

      {/* Action Icons & Cart Button */}
      <div className="flex items-center space-x-4">


        <button
          aria-label={isAdminAuthenticated ? 'Panel de administración' : 'Acceso de control de pedidos'}
          onClick={() => {
            if (isAdminAuthenticated) {
              setActiveTab('admin');
              return;
            }
            onOpenAdminAccess();
          }}
          className="text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 cursor-pointer"
        >
          <User className="w-4 h-4" />
        </button>

        <button
          onClick={toggleCart}
          disabled={!isAuthenticated}
          className="px-5 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all rounded-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Carrito</span>
          {cartCount > 0 && (
            <span className="bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ml-1">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
