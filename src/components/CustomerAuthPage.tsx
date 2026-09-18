import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface CustomerAuthPageProps {
  onRegister: (values: { name: string; email: string; phone: string; password: string }) => Promise<string | null>;
  onLogin: (values: { email: string; password: string }) => Promise<string | null>;
  onBack: () => void;
}

export const CustomerAuthPage: React.FC<CustomerAuthPageProps> = ({ onRegister, onLogin, onBack }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = mode === 'register'
      ? await onRegister({ name, email, phone, password })
      : await onLogin({ email, password });
    setMessage(result);
    setIsSubmitting(false);
  };

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16 md:px-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl md:p-8">
        <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-white/55 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Volver al MENÚ
        </button>
        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">La Bodeguita</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{mode === 'register' ? 'REGÍSTRATE' : 'INICIA SESIÓN'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {mode === 'register' ? 'Crea tu cuenta para pedir y consultar el estado de tus pedidos.' : 'Accede para pedir desde el menú y seguir tus pedidos.'}
        </p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-white outline-none focus:border-emerald-400" />
              <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Número de teléfono" className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-white outline-none focus:border-emerald-400" />
            </>
          )}
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-white outline-none focus:border-emerald-400" />
          <div className="relative">
            <input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña (mín. 8 caracteres)" className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 pr-12 text-white outline-none focus:border-emerald-400" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 px-4 text-white/55 hover:text-white">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button disabled={isSubmitting} className="w-full rounded-sm bg-white py-3 text-xs font-bold uppercase tracking-widest text-black disabled:opacity-50">
            {isSubmitting ? 'Procesando…' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-amber-200">{message}</p>}
        <button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setMessage(null); }} className="mt-6 text-xs text-white/60 underline underline-offset-4 hover:text-white">
          {mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </section>
  );
};
