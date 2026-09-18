import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';

interface AdminAuthPageProps {
  allowedEmail: string;
  onRegister: (values: { name: string; email: string; password: string }) => Promise<string | null>;
  onLogin: (name: string, email: string, password: string) => Promise<string | null>;
  onBack: () => void;
}

export const AdminAuthPage: React.FC<AdminAuthPageProps> = ({ allowedEmail, onRegister, onLogin, onBack }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (target: 'login' | 'register') => {
    setMode(target);
    setMessage(null);
    setIsSuccess(false);
    setName('');
    setPassword('');
    setEmail('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsSuccess(false);

    if (mode === 'register') {
      const result = await onRegister({ name: name.trim(), email: email.trim(), password });
      if (result) {
        // If the message contains "confirmación" or "enviado" it's a success message
        const looksLikeSuccess = /confirm|enviado|revisa/i.test(result);
        setIsSuccess(looksLikeSuccess);
        setMessage(result);
      }
    } else {
      const result = await onLogin(name.trim(), email.trim(), password);
      if (result) {
        setIsSuccess(false);
        setMessage(result);
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl md:p-8">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">La Bodeguita</p>
        <h2 className="mt-2 text-2xl font-bold text-white">CONTROL DE PEDIDOS</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {mode === 'register'
            ? 'Registra tu cuenta de administrador. Se enviará un correo de confirmación.'
            : 'Acceso exclusivo para el correo de la empresa.'}
        </p>

        {/* Mode tabs */}
        <div className="mt-5 flex rounded-lg border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === 'login'
                ? 'bg-emerald-400/15 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === 'register'
                ? 'bg-emerald-400/15 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-white/40">
                Nombre completo
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Rafael García"
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-white outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-white/40">
              Correo electrónico
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-white outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-white/40">
              Contraseña
            </label>
            <div className="relative">
              <input
                required
                minLength={8}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mín. 8 caracteres)"
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 pr-12 text-white outline-none focus:border-emerald-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-4 text-white/55 hover:text-white"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            disabled={isSubmitting}
            className="w-full rounded-sm bg-emerald-400 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-emerald-300 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? 'Procesando…'
              : mode === 'register'
                ? 'Crear cuenta y enviar confirmación'
                : 'Entrar al control'}
          </button>
        </form>

        {/* Feedback message */}
        {message && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${
            isSuccess
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
          }`}>
            {message}
          </div>
        )}

        {/* Toggle mode link */}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="mt-6 text-xs text-white/60 underline underline-offset-4 hover:text-white transition-colors"
        >
          {mode === 'login'
            ? '¿No tienes cuenta de administrador? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
};
