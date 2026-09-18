import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, ArrowRight, Plus, Minus, MapPin, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { CartItem, getCartItemLineTotal, getOrderTotal } from '../types';

interface CartSidebarProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onCheckout: (orderType: 'Table' | 'Delivery' | 'Pickup', locationDetail: string, customerName: string) => void;
  canCheckout: boolean;
  activeUser?: any;
  isAdminOnline?: boolean;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  canCheckout,
  activeUser,
  isAdminOnline = true,
}) => {
  const [orderType, setOrderType] = useState<'Table' | 'Delivery' | 'Pickup'>('Table');
  const [locationDetail, setLocationDetail] = useState<string>('Mesa ');
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    if (cart.length === 0) {
      setOrderType('Table');
      setLocationDetail('Mesa ');
      setCustomerName(activeUser?.name || '');
    } else {
      if (!customerName && activeUser?.name) {
        setCustomerName(activeUser.name);
      }
    }
  }, [cart.length, activeUser]);
  
  useEffect(() => {
    if (orderType === 'Delivery' && activeUser?.address && !locationDetail) {
      setLocationDetail(activeUser.address);
    }
  }, [orderType, activeUser]);

  if (!isOpen) return null;

  const subtotal = getOrderTotal(cart);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !canCheckout) return;
    onCheckout(orderType, locationDetail, customerName);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="bg-[#0A0A0A] text-[#E0E0E0] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-white/10 overflow-hidden">
        {/* Cart Header */}
        <div className="p-6 border-b border-white/10 bg-[#0A0A0A] flex justify-between items-center">
          <h2 className="font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            Tu Pedido
          </h2>
          <button
            onClick={onClose}
            className="border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:border-white hover:bg-white hover:text-black cursor-pointer rounded-sm"
          >
            Añadir al ticket
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40">
              <ShoppingCart className="w-16 h-16 text-white/20 mb-4 stroke-1" />
              <p className="font-bold text-base text-white">Tu carrito está vacío</p>
              <p className="text-xs text-white/50 mt-1">Explora nuestro menú urbano y añade tus creaciones favoritas.</p>
            </div>
          ) : (
            cart.map((cartItem) => (
              <div
                key={cartItem.cartId}
                className="bg-[#141414] p-4 rounded-xl border border-white/10 flex flex-col gap-2 relative group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-medium text-sm text-white block">
                      {cartItem.quantity}x {cartItem?.item?.name || 'Producto eliminado'}
                    </span>
                    <span className="font-mono text-xs text-emerald-400 block mt-0.5 font-semibold">
                      ${getCartItemLineTotal(cartItem).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => onRemoveItem(cartItem.cartId)}
                    className="text-white/40 hover:text-red-400 p-1 cursor-pointer transition-colors"
                    title="Eliminar del carrito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Customizations summary */}
                <div className="text-xs text-white/60 space-y-0.5 pl-2 border-l-2 border-white/20">
                  {cartItem?.customization?.removals?.map((r) => (
                    <p key={r} className="text-red-400">
                      - {r}
                    </p>
                  ))}
                  {cartItem?.customization?.extras?.map((e) => (
                    <p key={e?.id || Math.random()} className="text-emerald-400">
                      + {e?.name || 'Extra'} (${(e?.price || 0).toFixed(2)})
                    </p>
                  ))}
                  {cartItem?.customization?.sauces?.length > 0 && (
                    <p className="text-white/80">
                      Salsas: {cartItem.customization.sauces.join(', ')}
                    </p>
                  )}
                  {cartItem?.customization?.notes && (
                    <p className="italic text-white/40">"{cartItem.customization.notes}"</p>
                  )}
                </div>

                {/* Quantity Controls */}
                <div className="flex justify-end items-center gap-2 mt-1">
                  <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-[#0A0A0A]">
                    <button
                      onClick={() => onUpdateQuantity(cartItem.cartId, -1)}
                      className="p-1.5 hover:bg-white/10 text-white cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-mono font-bold text-white">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(cartItem.cartId, 1)}
                      className="p-1.5 hover:bg-white/10 text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Details Form & Checkout */}
        {cart.length > 0 && (
          <form onSubmit={handleCheckoutSubmit} className="p-6 bg-[#0A0A0A] border-t border-white/10 flex flex-col gap-4">
            {/* Order Type Toggle */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 block mb-2">
                Tipo de Pedido
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('Table');
                    setLocationDetail('Mesa ');
                  }}
                  className={`py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    orderType === 'Table'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#141414] text-white/70 border-white/10 hover:border-white/30'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  En Mesa
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderType('Pickup');
                    setLocationDetail('Para Llevar');
                  }}
                  className={`py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    orderType === 'Pickup'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#141414] text-white/70 border-white/10 hover:border-white/30'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Para Llevar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderType('Delivery');
                    setLocationDetail(activeUser?.address || '');
                  }}
                  className={`py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    orderType === 'Delivery'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#141414] text-white/70 border-white/10 hover:border-white/30'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Domicilio
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className={`grid gap-3 ${orderType === 'Pickup' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-white/10 bg-[#141414] text-white outline-none focus:border-white/40"
                  placeholder="Tu nombre"
                />
              </div>

              {orderType !== 'Pickup' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">
                    {orderType === 'Table' ? 'Nº Mesa' : 'Dirección'}
                  </label>
                  <input
                    type="text"
                    required
                    value={locationDetail}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (orderType === 'Table' && !val.startsWith('Mesa ')) {
                        // Prevent erasing "Mesa " if they try to delete it
                        if (val === 'Mesa' || val === 'Mes' || val === 'Me' || val === 'M' || val === '') {
                          setLocationDetail('Mesa ');
                        } else {
                          setLocationDetail('Mesa ' + val.replace(/^Mesa\s*/, ''));
                        }
                      } else {
                        setLocationDetail(val);
                      }
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-white/10 bg-[#141414] text-white outline-none focus:border-white/40"
                    placeholder={orderType === 'Table' ? 'Ej: Mesa 4' : 'Tu dirección'}
                  />
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-white/10 space-y-1">
              <div className="flex justify-between items-center text-xs text-white/50">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-white">
                <span>Total</span>
                <span className="font-mono text-emerald-400 text-lg">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canCheckout}
              className={`w-full font-bold text-xs uppercase tracking-widest py-4 transition-all active:scale-95 flex items-center justify-center gap-2 rounded-sm shadow-lg mt-1 ${
                canCheckout
                  ? 'bg-white text-black hover:bg-white/90 cursor-pointer'
                  : 'bg-white/20 text-white/40 cursor-not-allowed'
              }`}
            >
              {canCheckout 
                ? 'PROCESAR PEDIDO' 
                : (!isAdminOnline 
                    ? 'ESTAMOS FUERA DE HORARIO' 
                    : 'INICIA SESIÓN PARA PEDIR'
                  )
              }
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
