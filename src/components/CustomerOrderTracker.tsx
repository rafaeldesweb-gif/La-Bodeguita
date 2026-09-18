import React from 'react';
import { ShoppingBag, Clock, CheckCircle2, Flame, Utensils, AlertCircle } from 'lucide-react';
import { Order, OrderStatus, getCustomizationExtraTotal, getOrderTotal } from '../types';

interface CustomerOrderTrackerProps {
  orders: Order[];
  onGoToMenu: () => void;
}

export const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({ orders, onGoToMenu }) => {
  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'NUEVOS':
        return 1;
      case 'EN PREPARACIÓN':
        return 2;
      case 'LISTOS':
        return 3;
      case 'ENTREGADOS':
        return 4;
      default:
        return 1;
    }
  };

  const getEstimatedMinutes = (status: OrderStatus) => {
    switch (status) {
      case 'NUEVOS':
        return '20-25 min';
      case 'EN PREPARACIÓN':
        return '10-15 min';
      case 'LISTOS':
        return '¡Listo!';
      case 'ENTREGADOS':
        return 'Entregado';
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">
          Estado en Vivo
        </p>
        <h1 className="font-bold text-4xl md:text-5xl text-white tracking-tighter">
          MIS PEDIDOS
        </h1>
        <p className="text-xs text-white/60 mt-1 font-light">
          Seguimiento en tiempo real directo desde la cocina de La Bodeguita de Sotillo.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl p-12 text-center border border-white/10 shadow-sm flex flex-col items-center">
          <ShoppingBag className="w-12 h-12 text-white/20 mb-4 stroke-1" />
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">AÚN NO HAY PEDIDOS</h3>
          <p className="text-xs text-white/50 mt-2 max-w-md leading-relaxed">
            Explora nuestro menú gastronómico, personaliza tu hamburguesa favorita y realiza tu primer pedido.
          </p>
          <button
            onClick={onGoToMenu}
            className="mt-6 bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-3.5 hover:bg-white/90 transition-all active:scale-95 cursor-pointer rounded-sm shadow-md"
          >
            IR AL MENÚ
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((order) => {
            const step = getStatusStep(order.status);
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const extraTotal = order.items.reduce(
              (sum, item) => sum + getCustomizationExtraTotal(item.customization) * item.quantity,
              0
            );

            return (
              <div
                key={order.id}
                className="bg-[#141414] rounded-2xl p-6 border border-white/10 shadow-md flex flex-col gap-6 relative overflow-hidden"
              >
                {/* Status bar accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    step === 1
                      ? 'bg-amber-500'
                      : step === 2
                      ? 'bg-blue-500'
                      : step === 3
                      ? 'bg-purple-500'
                      : 'bg-emerald-500'
                  }`}
                />

                {/* Top Info */}
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-2xl text-white">
                        {order.id}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold bg-white/10 text-white/80 border border-white/10">
                        {order.type === 'Table' ? 'En Mesa' : order.type === 'Delivery' ? 'Domicilio' : 'Para Llevar'}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold border ${
                          order.status === 'NUEVOS'
                            ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                            : order.status === 'EN PREPARACIÓN'
                            ? 'bg-blue-500/15 text-blue-200 border-blue-500/40'
                            : order.status === 'LISTOS'
                            ? 'bg-purple-500/15 text-purple-200 border-purple-500/40'
                            : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-1 font-mono">
                      {order.locationDetail} • {order.createdAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-[#0A0A0A] px-4 py-2 rounded-xl border border-white/10">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-white">
                      Estimado: {getEstimatedMinutes(order.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="bg-[#0A0A0A] rounded-xl border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Cliente</p>
                    <p className="mt-2 text-sm font-bold text-white">{order.customerName || 'Cliente sin nombre'}</p>
                  </div>

                  <div className="bg-[#0A0A0A] rounded-xl border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Ubicación</p>
                    <p className="mt-2 text-sm font-bold text-white">{order.locationDetail}</p>
                  </div>

                  <div className="bg-[#0A0A0A] rounded-xl border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Tipo</p>
                    <p className="mt-2 text-sm font-bold text-white">
                      {order.type === 'Table' ? 'Mesa' : order.type === 'Delivery' ? 'Domicilio' : 'Para llevar'}
                    </p>
                  </div>

                  <div className="bg-[#0A0A0A] rounded-xl border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Total</p>
                    <p className="mt-2 text-md font-mono font-bold text-emerald-400">${getOrderTotal(order.items).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-[11px] text-white/70">
                  <span>Productos: <strong className="text-white">{totalItems}</strong></span>
                  <span>Extras: <strong className="text-emerald-400">${extraTotal.toFixed(2)}</strong></span>
                  <span>Total ticket: <strong className="text-emerald-400">${getOrderTotal(order.items).toFixed(2)}</strong></span>
                </div>

                {/* Timeline Progress Bar */}
                <div className="py-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                          step >= 1 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        1
                      </div>
                      <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider">Recibido</span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                          step >= 2 ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        2
                      </div>
                      <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider">En Cocina</span>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                          step >= 3 ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        3
                      </div>
                      <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider">Listo</span>
                    </div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                          step >= 4 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        4
                      </div>
                      <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider">Entregado</span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
