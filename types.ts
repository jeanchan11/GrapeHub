
export type UserRole = 'superadmin' | 'gerente-operacional' | 'gestor-trafego' | 'design' | 'user' | 'diretor-operacional' | 'analista-ia' | 'gerente-comercial';

export interface UserData {
  id: string;
  uid?: string; // For backward compatibility if needed
  email: string;
  name?: string;
  picture?: string;
  role: UserRole;
  allowedPages: string[];
  squad?: string;
  phone?: string;
  bio?: string;
}

export interface Subtask {
  id: string;
  title: string;
  status: 'pending' | 'completed';
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  createdAt: any; // Timestamp
  dueDate?: any; // Timestamp or ISO string
  createdBy: string;
  assignedTo?: string; // UID or 'all'
  subtasks?: Subtask[];
  page_id?: string;
}

export interface TrafficManagerData {
  baseSalary: number;
  maxBonus: number;
  meetingDelay: boolean;
  reportDelay: boolean;
  taskDelays: boolean[]; // Array of 3 booleans
  activeClients: number;
  okResultClients: number;
}

// Calculadora de bonificação do Head de Operação.
// Quatro critérios com peso igual (25% cada): resultado de projetos e churn são
// medidos por número; GrapeHub e Relacionamento são liga/desliga, e marcar zera
// a fatia daquele critério — mesmo comportamento dos toggles do gestor.
export interface HeadOperacaoData {
  baseSalary: number;
  maxBonus: number;
  // Resultado de projetos
  totalProjetos: number;
  projetosOkBom: number;
  // Churn
  churnNoPeriodo: number;
  metaChurn: number;
  // Processo (toggles: true = falhou, perde a fatia)
  falhaGrapehub: boolean;
  falhaRelacionamento: boolean;
}

export interface HeadOperacaoResults {
  bonusResultado: number;
  bonusChurn: number;
  bonusGrapehub: number;
  bonusRelacionamento: number;
  totalBonus: number;
  totalEarnings: number;
  scoreResultado: number;   // 0-100
  scoreChurn: number;       // 0-100
}

export interface TrafficManagerResults {
  meetingBonus: number;
  reportBonus: number;
  taskBonus: number;
  resultBonus: number;
  totalBonus: number;
  totalEarnings: number;
  resultScore: number;
  deliveryScore: number; // Sum of meeting, report, task scores (max 30)
}
