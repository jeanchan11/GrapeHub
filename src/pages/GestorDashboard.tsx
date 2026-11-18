import React, { useEffect, useState } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { Anel, BarrasPorCategoria, Cartao, CartaoKpi } from '../components/graficos';
import { CarregandoPagina } from '../components/LoadingSpinner';

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

  // Gráficos no padrão do painel (graficos.tsx): anel fino e barras por categoria
  const segmentos = [
    { rotulo: 'Ativos', valor: activeClients.length, cor: 'rgb(var(--accent-color))' },
    { rotulo: 'Inativos', valor: clients.length - activeClients.length, cor: '#f43f5e' },
  ];

  if (isLoading) return <CarregandoPagina />;

  return (
    <div className="p-8 bg-dark-bg text-dark-text min-h-screen">
      <div className="mb-8">
        <SplitHeadline
          text="Dashboard "
          highlight="Gestor"
          subtitle="Visão geral e métricas de desempenho."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CartaoKpi titulo="Quantidade de parceiros" valor={clients.length} />
        <CartaoKpi titulo="Projetos ativos" valor={activeClients.length} />
        <CartaoKpi titulo="Tarefas pendentes" valor={pendingTodos.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Cartao titulo="Status dos parceiros">
          <Anel segmentos={segmentos} centro={clients.length} legendaDoCentro="parceiros" />
        </Cartao>
        <Cartao titulo="Tarefas por status">
          <div className="h-[260px]">
            <BarrasPorCategoria
              itens={[{ rotulo: 'Pendentes', valor: pendingTodos.length }, { rotulo: 'Concluídas', valor: todos.length - pendingTodos.length }]}
              unidade="tarefas"
            />
          </div>
        </Cartao>
      </div>
    </div>
  );
};
