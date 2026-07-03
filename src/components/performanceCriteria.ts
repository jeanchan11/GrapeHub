import {
  Star, Megaphone, LayoutGrid, Users, MessageCircle, Target, TrendingUp, Phone,
  DollarSign, Handshake, Palette, PenTool, BarChart2, Clock, CheckCircle, Award,
  Zap, Rocket, Camera, Video, ClipboardList,
} from 'lucide-react';

// Ícones disponíveis para os critérios de avaliação (compartilhado entre o
// Painel Admin — Cargos e avaliações — e a aba de Desempenho do colaborador).
export const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star, Megaphone, LayoutGrid, Users, MessageCircle, Target, TrendingUp, Phone,
  DollarSign, Handshake, Palette, PenTool, BarChart2, Clock, CheckCircle, Award,
  Zap, Rocket, Camera, Video, ClipboardList,
};
export const ICON_NAMES = Object.keys(ICON_MAP);
export const iconOf = (name?: string) => ICON_MAP[name || 'Star'] || Star;

// Cores disponíveis. Classes literais completas para o Tailwind não purgar.
export interface CriterioColor {
  key: string;
  dot: string;   // preenchimento sólido (seletor de cor)
  chip: string;  // fundo suave + texto (ícone em caixa)
  bg: string;    // só o fundo suave
  text: string;  // só o texto
  bar: string;   // barra de progresso sólida
}

export const COLORS: CriterioColor[] = [
  { key: 'violet',  dot: 'bg-violet-500',  chip: 'bg-violet-500/15 text-violet-400',   bg: 'bg-violet-500/15',  text: 'text-violet-400',  bar: 'bg-violet-500' },
  { key: 'emerald', dot: 'bg-emerald-500', chip: 'bg-emerald-500/15 text-emerald-400', bg: 'bg-emerald-500/15', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  { key: 'blue',    dot: 'bg-blue-500',    chip: 'bg-blue-500/15 text-blue-400',       bg: 'bg-blue-500/15',    text: 'text-blue-400',    bar: 'bg-blue-500' },
  { key: 'amber',   dot: 'bg-amber-500',   chip: 'bg-amber-500/15 text-amber-400',     bg: 'bg-amber-500/15',   text: 'text-amber-400',   bar: 'bg-amber-500' },
  { key: 'rose',    dot: 'bg-rose-500',    chip: 'bg-rose-500/15 text-rose-400',       bg: 'bg-rose-500/15',    text: 'text-rose-400',    bar: 'bg-rose-500' },
  { key: 'cyan',    dot: 'bg-cyan-500',    chip: 'bg-cyan-500/15 text-cyan-400',       bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    bar: 'bg-cyan-500' },
  { key: 'orange',  dot: 'bg-orange-500',  chip: 'bg-orange-500/15 text-orange-400',   bg: 'bg-orange-500/15',  text: 'text-orange-400',  bar: 'bg-orange-500' },
  { key: 'pink',    dot: 'bg-pink-500',    chip: 'bg-pink-500/15 text-pink-400',       bg: 'bg-pink-500/15',    text: 'text-pink-400',    bar: 'bg-pink-500' },
];

export const colorOf = (cor?: string): CriterioColor => COLORS.find(c => c.key === cor) || COLORS[0];
export const chipOf = (cor?: string) => colorOf(cor).chip;

// Snapshot de uma nota (critério + estrelas) salvo em cada ciclo de avaliação.
export interface NotaSnapshot {
  criterio_id: number;
  label: string;
  descricao?: string | null;
  icon: string;
  cor: string;
  nota: number;
}
