import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { ChatMessage, MenuItem } from '../types';
import logoImage from '../assets/logo1.png';

interface BodeBotWidgetProps {
  menu: MenuItem[];
  onSelectRecommendedItem?: (itemId: string) => void;
}

export const BodeBotWidget: React.FC<BodeBotWidgetProps> = ({ menu, onSelectRecommendedItem }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bodebot',
      text: '¡Hola! Soy **BodeBot** 🍔, tu camarero virtual y experto gastronómico en La Bodeguita de Sotillo. ¿En qué puedo ayudarte hoy? Te puedo sugerir hamburguesas, maridajes o ingredientes.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/bodebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          menu,
        }),
      });

      const data = await response.json();
      const botReply = data.reply || '¡Sabor único! ¿Tienes otra duda sobre el menú? 🍔';

      const botMsg: ChatMessage = {
        id: `bodebot-${Date.now()}`,
        sender: 'bodebot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Error fetching BodeBot response:', error);
      const errorMsg: ChatMessage = {
        id: `bodebot-err-${Date.now()}`,
        sender: 'bodebot',
        text: '¡Ups! Tuve una pequeña interrupción en la señal de cocina. Te recomiendo probar nuestra **Bodeguita Burger** o **La Bestia** 🍔.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-[80]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white hover:bg-white/90 text-black p-3 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer relative border border-white/20"
          aria-label="Abrir BodeBot Asistente"
        >
          <img src={logoImage} alt="Logo La Bodeguita" className="h-9 w-9 object-contain rounded-full bg-[#0A0A0A]/5" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0A0A0A] animate-ping" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0A0A0A]" />
        </button>
      </div>

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[85] w-[calc(100vw-2rem)] sm:w-96 h-[520px] bg-[#0A0A0A] text-[#E0E0E0] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-fadeIn backdrop-blur-md">
          {/* Header */}
          <div className="p-4 bg-[#141414] text-white flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                <img src={logoImage} alt="Logo La Bodeguita" className="h-full w-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest text-white">BODEBOT AI</h3>
                <span className="text-[10px] text-emerald-400 font-mono block">Sommelier Virtual & Guía</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0A0A0A]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-white text-black font-semibold rounded-br-none'
                      : 'bg-[#141414] text-white/90 border border-white/10 rounded-bl-none shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                <span className="text-[9px] font-mono text-white/30 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-white/40 font-mono bg-[#141414] p-3 rounded-xl w-max border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                BodeBot analizando maridajes...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="p-2.5 bg-[#141414] border-t border-white/10 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendMessage('¿Qué me recomiendas si me gusta el picante? 🔥')}
              className="text-[10px] font-mono uppercase tracking-wider bg-[#0A0A0A] hover:bg-white hover:text-black border border-white/10 px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer text-white/80 shrink-0"
            >
              🔥 Recomendación picante
            </button>
            <button
              onClick={() => handleSendMessage('¿Tienen opciones vegetarianas o sin queso?')}
              className="text-[10px] font-mono uppercase tracking-wider bg-[#0A0A0A] hover:bg-white hover:text-black border border-white/10 px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer text-white/80 shrink-0"
            >
              🌱 Opción vegetariana
            </button>
            <button
              onClick={() => handleSendMessage('¿Cuál es la hamburguesa más vendida?')}
              className="text-[10px] font-mono uppercase tracking-wider bg-[#0A0A0A] hover:bg-white hover:text-black border border-white/10 px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer text-white/80 shrink-0"
            >
              ⭐ Más vendida
            </button>
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#141414] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Consulta a BodeBot..."
              className="flex-1 bg-[#0A0A0A] text-xs p-2.5 rounded-xl border border-white/10 outline-none focus:border-white/40 text-white placeholder:text-white/30"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-white text-black p-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
