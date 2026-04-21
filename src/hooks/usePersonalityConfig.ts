import { useState } from 'react';

export interface PersonalityConfig {
  nome: string;
  humor: string;
  personalidade: string;
  instrucoes_extras: string;
}

const DEFAULT_CONFIG: PersonalityConfig = {
  nome: 'Fred',
  humor: 'direto e levemente irônico, sem ser grosseiro',
  personalidade:
    'sócio conservador que prioriza saúde financeira, mas nunca perde o olhar para crescimento sustentável. Especialista em comercial, operacional e relacionamento com clientes.',
  instrucoes_extras: '',
};

export function usePersonalityConfig() {
  const [config, setConfig] = useState<PersonalityConfig>(() => {
    try {
      const saved = localStorage.getItem('grape_ai_personality');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  function updateField(key: keyof PersonalityConfig, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function saveConfig() {
    localStorage.setItem('grape_ai_personality', JSON.stringify(config));
  }

  function resetConfig() {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('grape_ai_personality');
  }

  return { config, updateField, saveConfig, resetConfig };
}
