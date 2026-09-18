import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { MenuItem, ExtraOption, CartItemCustomization } from '../types';

interface CustomizationModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, customization: CartItemCustomization, unitPrice: number, quantity: number) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (item) {
      setSelectedRemovals([]);
      setSelectedExtras([]);
      setSelectedSauces([]);
      setNotes('');
      setQuantity(1);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const toggleRemoval = (removal: string) => {
    setSelectedRemovals((prev) =>
      prev.includes(removal) ? prev.filter((r) => r !== removal) : [...prev, removal]
    );
  };

  const toggleExtra = (extra: ExtraOption) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const toggleSauce = (sauce: string) => {
    setSelectedSauces((prev) =>
      prev.includes(sauce) ? prev.filter((s) => s !== sauce) : [...prev, sauce]
    );
  };

  const extrasTotal = selectedExtras.reduce((acc, curr) => acc + curr.price, 0);
  const itemTotalUnitPrice = item.price + extrasTotal;
  const totalPrice = itemTotalUnitPrice * quantity;

  const handleConfirm = () => {
    onAddToCart(
      item,
      {
        removals: selectedRemovals,
        extras: selectedExtras,
        sauces: selectedSauces,
        notes: notes.trim(),
      },
      item.price,
      quantity
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-fadeIn">
      <div className="bg-[#0A0A0A] text-[#E0E0E0] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transform transition-all border border-white/10">
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-white/10 bg-[#0A0A0A]">
          <div>
            <h2 className="font-bold text-xl text-white uppercase tracking-wider">Personalizar</h2>
            <p className="text-xs font-mono text-emerald-400 mt-0.5">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-2 bg-[#141414] border border-white/10 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Quitar Ingredientes */}
          {item.defaultRemovals && item.defaultRemovals.length > 0 && (
            <section>
              <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">
                Quitar Ingredientes
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {item.defaultRemovals.map((removal) => {
                  const isChecked = selectedRemovals.includes(removal);
                  return (
                    <button
                      key={removal}
                      type="button"
                      onClick={() => toggleRemoval(removal)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-red-950/60 text-red-400 border-red-500/50'
                          : 'bg-[#141414] text-white/80 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {removal}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <hr className="border-white/10" />

          {/* Añadir Extras */}
          {item.availableExtras && item.availableExtras.length > 0 && (
            <section>
              <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">
                Añadir Extras
              </h3>
              <div className="flex flex-col gap-2">
                {item.availableExtras.map((extra) => {
                  const isChecked = selectedExtras.some((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(extra)}
                      aria-pressed={isChecked}
                      className={`flex w-full justify-between items-center p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                          : 'bg-[#141414] border-white/10 hover:border-white/30 text-white/90'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500 text-black'
                              : 'border-white/30 bg-transparent'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </span>
                        <span className="font-medium text-xs">{extra.name}</span>
                      </div>
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        +${extra.price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <hr className="border-white/10" />

          {/* Salsas Aparte */}
          {item.availableSauces && item.availableSauces.length > 0 && (
            <section>
              <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">
                Salsas Aparte
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {item.availableSauces.map((sauce) => {
                  const isChecked = selectedSauces.includes(sauce);
                  return (
                    <button
                      key={sauce}
                      type="button"
                      onClick={() => toggleSauce(sauce)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        isChecked
                          ? 'bg-white text-black border-white'
                          : 'bg-[#141414] text-white/80 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {sauce}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Observaciones */}
          <section>
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">
              Observaciones
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: La carne bien hecha, alergia al sésamo, servilletas extra..."
              className="w-full h-24 rounded-xl bg-[#141414] p-3 text-xs text-white border border-white/10 focus:border-white/40 outline-none resize-none transition-all placeholder:text-white/30 font-mono"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-[#0A0A0A] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-white/20 rounded-xl overflow-hidden bg-[#141414]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 hover:bg-white/10 text-white cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-3 font-mono font-bold text-sm text-white">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-2 hover:bg-white/10 text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/40 block">Total</span>
              <span className="font-mono font-bold text-xl text-emerald-400">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-3.5 hover:bg-white/90 transition-all active:scale-95 shadow-md cursor-pointer rounded-sm"
          >
            AÑADIR AL PEDIDO
          </button>
        </div>
      </div>
    </div>
  );
};
