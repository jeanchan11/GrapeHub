import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PublicFormProps {
  leadId: string;
}

const PublicForm: React.FC<PublicFormProps> = ({ leadId }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    form_nome_completo: '',
    form_nome_fantasia: '',
    form_telefone_whatsapp: '',
    form_cep: '',
    form_cidade: '',
    form_estado: '',
  });

  useEffect(() => {
    // Fetch initial data
    const fetchLeadData = async () => {
      try {
        // Replace with your current backend origin properly handled by vite
        const res = await fetch(`/api/public/lead-form/${leadId}`);
        if (!res.ok) {
          throw new Error('Não foi possível carregar os dados');
        }
        const data = await res.json();
        setFormData({
          form_nome_completo: data.form_nome_completo || '',
          form_nome_fantasia: data.form_nome_fantasia || '',
          form_telefone_whatsapp: data.form_telefone_whatsapp || '',
          form_cep: data.form_cep || '',
          form_cidade: data.form_cidade || '',
          form_estado: data.form_estado || '',
        });
      } catch (err) {
        console.error(err);
        // Fail silently if not found, we just show empty form
      } finally {
        setLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/public/lead-form/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error('Falha ao salvar as informações.');
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-200">
      
      {/* Brand Logo */}
      <div className="flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-violet-500/20">
          <img src="/logobranca.png" alt="Grape Mídia" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="flex items-baseline">
          <span className="font-bold text-3xl text-[#7c3aed] tracking-tight">Grape</span>
          <span className="font-light text-3xl text-slate-300">Mídia</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Formulário de Contratação</h1>
            <p className="text-sm text-slate-400">Por favor, preencha os dados abaixo para darmos continuidade ao seu atendimento.</p>
          </div>

          {success ? (
            <div className="py-8 flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-3xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Muito Obrigado!</h3>
                <p className="text-sm text-slate-400">Suas informações foram recebidas com sucesso. Você já pode fechar esta página.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider pl-1">Nome Completo</label>
                <input required type="text" name="form_nome_completo" value={formData.form_nome_completo} onChange={handleChange} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" 
                  placeholder="Ex: João da Silva" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider pl-1">Nome Fantasia / Empresa</label>
                <input type="text" name="form_nome_fantasia" value={formData.form_nome_fantasia} onChange={handleChange} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" 
                  placeholder="Ex: Minha Empresa Móveis" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider pl-1">Telefone (WhatsApp)</label>
                <input required type="text" name="form_telefone_whatsapp" value={formData.form_telefone_whatsapp} onChange={handleChange} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" 
                  placeholder="(00) 00000-0000" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider pl-1">CEP</label>
                  <input type="text" name="form_cep" value={formData.form_cep} onChange={handleChange} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" 
                    placeholder="00000-000" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider pl-1">Local / UF</label>
                  <div className="flex gap-2">
                    <input type="text" name="form_cidade" value={formData.form_cidade} onChange={handleChange} 
                      className="w-[70%] bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" 
                      placeholder="Cidade" 
                    />
                    <input type="text" name="form_estado" value={formData.form_estado} onChange={handleChange} 
                      className="w-[30%] bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all uppercase text-center" 
                      placeholder="UF" maxLength={2} 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg hover:shadow-violet-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default PublicForm;
