
export type UserRole = 'superadmin' | 'gerente-operacional' | 'gestor-trafego' | 'design' | 'user';

export interface UserData {
  id: string;
  uid?: string; // For backward compatibility if needed
  email: string;
  name?: string;
  picture?: string;
  role: UserRole;
  allowedPages: string[];
  squad?: string;
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
