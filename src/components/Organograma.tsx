import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Handle,
  Position,
  Panel,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Loader2 } from 'lucide-react';

interface Collaborator {
  id: number;
  name: string;
  role: string | null;
  group_name: string | null;
  picture?: string;
  email?: string;
}

const CustomNode = ({ data }: { data: any }) => {
  return (
    <div 
      className="px-4 py-3 shadow-xl rounded-2xl bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 min-w-[220px]"
      style={{
        backgroundColor: data.group_color ? `${data.group_color}15` : undefined,
        borderColor: data.group_color ? `${data.group_color}30` : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-violet-500 border-2 border-white dark:border-dark-card" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold overflow-hidden shrink-0">
          {data.picture ? (
            <img src={data.picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            (data.name || '?')[0].toUpperCase()
          )}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{data.name}</div>
          <div className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mt-0.5">{data.role || 'Sem cargo'}</div>
          {data.group_name && (
            <div 
              className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded w-fit font-bold"
              style={{
                backgroundColor: data.group_color ? `${data.group_color}20` : 'var(--bg-slate-100)',
                color: data.group_color ? data.group_color : 'var(--text-slate-500)',
              }}
            >
              {data.group_name}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-violet-500 border-2 border-white dark:border-dark-card" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function Organograma({ collaborators, settings = [] }: { collaborators: Collaborator[], settings?: any[] }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter only active collaborators if needed (or we just map all provided)
  // Assuming the parent component passes only active ones, but let's be safe.
  // Actually, we should just use what's passed.

  useEffect(() => {
    fetch('/api/org-chart')
      .then(res => res.json())
      .then(savedData => {
        const savedNodes = savedData.nodes || [];
        const savedEdges = savedData.edges || [];

        // Build current nodes from collaborators
        const currentNodes: Node[] = collaborators.map((colab, index) => {
          // Find if it was saved
          const existing = savedNodes.find((n: Node) => n.id === String(colab.id));
          
          return {
            id: String(colab.id),
            type: 'custom',
            position: existing?.position || { x: (index % 5) * 250, y: Math.floor(index / 5) * 150 },
            data: {
              name: colab.name,
              role: colab.role,
              group_name: colab.group_name,
              picture: colab.picture,
              group_color: settings.find((s: any) => s.type === 'group' && s.name === colab.group_name)?.color || null,
            }
          };
        });

        // Add saved edges (filter out edges connecting to nodes that no longer exist)
        const validNodeIds = new Set(currentNodes.map(n => n.id));
        const validEdges = savedEdges.filter((e: Edge) => validNodeIds.has(e.source) && validNodeIds.has(e.target));

        setNodes(currentNodes);
        setEdges(validEdges);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [collaborators]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' }, style: { stroke: '#8b5cf6', strokeWidth: 2 } }, eds)),
    []
  );

  const saveChart = async () => {
    setSaving(true);
    try {
      await fetch('/api/org-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { nodes, edges } })
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar organograma');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }

  return (
    <div className="h-[calc(100vh-200px)] w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-light-bg dark:bg-dark-bg"
      >
        <Background color="#8b5cf6" gap={16} size={1} opacity={0.05} />
        <Controls className="bg-white dark:bg-dark-card border-slate-200 dark:border-white/10 text-slate-700 dark:text-white fill-slate-700 dark:fill-white" />
        <Panel position="top-right" className="m-4">
          <button
            onClick={saveChart}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Salvar Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
