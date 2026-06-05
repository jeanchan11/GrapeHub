import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Briefcase, ListTodo, TrendingUp } from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';

export const GestorDashboard: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [clientsRes, todosRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/todos')
        ]);
        
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }
        
        if (todosRes.ok) {
          const todosData = await todosRes.json();
          setTodos(todosData);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeClients = clients.filter(c => c.status === 'Ativo');
  const pendingTodos = todos.filter(t => t.status === 'pending');

  const data = [
    { name: 'Ativos', value: activeClients.length },
    { name: 'Inativos', value: clients.length - activeClients.length },
  ];
  const COLORS = ['#8b5cf6', '#e11d48'];

  if (isLoading) {
    return <div className="p-8 bg-dark-bg text-white min-h-screen">Carregando...</div>;
  }

  return (
    <div className="p-8 bg-dark-bg text-white min-h-screen">
      <div className="mb-8">
        <SplitHeadline
          text="Dashboard "
          highlight="Gestor"
          subtitle="Visão geral e métricas de desempenho."
          className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-dark-card p-6 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Users className="text-violet-500" size={32} />
            <h2 className="text-lg font-bold">Quantidade de Parceiros</h2>
          </div>
          <p className="text-4xl font-bold">{clients.length}</p>
        </div>
        <div className="bg-dark-card p-6 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Briefcase className="text-violet-500" size={32} />
            <h2 className="text-lg font-bold">Projetos Ativos</h2>
          </div>
          <p className="text-4xl font-bold">{activeClients.length}</p>
        </div>
        <div className="bg-dark-card p-6 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <ListTodo className="text-violet-500" size={32} />
            <h2 className="text-lg font-bold">Tarefas Pendentes</h2>
          </div>
          <p className="text-4xl font-bold">{pendingTodos.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-card p-6 rounded-2xl border border-white/5 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Status dos Parceiros</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-dark-card p-6 rounded-2xl border border-white/5 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Tarefas por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[{ name: 'Pendentes', value: pendingTodos.length }, { name: 'Concluídas', value: todos.length - pendingTodos.length }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
