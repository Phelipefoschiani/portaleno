import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { 
  Users, 
  Download, 
  Filter,
  BarChart3,
  MapPin,
  User as UserIcon
} from 'lucide-react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = [
  '#1b4332', '#40916c', '#52b788', '#74c69d', '#95d5b2', 
  '#b7e4c7', '#d8f3dc', '#2d6a4f', '#081c15', '#1b4332'
];

const DashboardEmpana: React.FC = () => {
  const { user } = useAuth();
  const { clientesEmpana, usuarios, loading } = useGlobalState();
  const [cityFilter, setCityFilter] = useState<string>('Todos');
  const [userFilter, setUserFilter] = useState<string>('Todos');

  const empanaUsers = useMemo(() => {
    return usuarios.filter(u => u.perfil === 'empana');
  }, [usuarios]);

  const isolatedClientes = useMemo(() => {
    let list = clientesEmpana;
    if (user?.perfil === 'empana') {
      list = list.filter(c => c.representante_id === user.id);
    } else if (user?.perfil === 'gerente' && userFilter !== 'Todos') {
      list = list.filter(c => c.representante_id === userFilter);
    }
    return list;
  }, [clientesEmpana, user, userFilter]);

  // Stats
  const totalClientes = isolatedClientes.length;

  // Data for Canal/Segmento Chart
  const canalData = useMemo(() => {
    const counts: Record<string, number> = {};
    isolatedClientes.forEach(c => {
      const canal = c.canal || 'Outro';
      counts[canal] = (counts[canal] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [isolatedClientes]);

  // Data for Cities Chart with Filter
  const filteredCitiesData = useMemo(() => {
    const counts: Record<string, number> = {};
    isolatedClientes.forEach(c => {
      if (cityFilter === 'Todos' || c.canal === cityFilter) {
        const cidade = c.cidade || 'Não Informada';
        counts[cidade] = (counts[cidade] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 cities
  }, [isolatedClientes, cityFilter]);

  const generateReport = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const now = new Date().toLocaleDateString('pt-BR');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(27, 67, 50); // Verde Escuro (Primary)
    doc.text('Relatório Geral de Clientes - Empana Fácil', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${now}`, 14, 28);

    // Prepare table data
    const tableData = isolatedClientes.map(c => {
      const row = [
        c.razao_social || c.nome_fantasia || '-',
        c.cnpj_cpf || '-',
        c.estado || '-',
        c.cidade || '-',
        c.responsavel || '-',
        c.whatsapp || c.telefone || '-',
        c.email || '-',
        c.canal || 'Outro'
      ];
      
      if (user?.perfil === 'gerente') {
        const repNome = usuarios.find(u => u.id === c.representante_id)?.nome || 'Sistema';
        row.unshift(repNome);
      }
      
      return row;
    });

    const headers = ['Razão Social', 'CNPJ/CPF', 'UF', 'Cidade', 'Responsável', 'Contato', 'E-mail', 'Canal'];
    if (user?.perfil === 'gerente') {
      headers.unshift('Vendedor');
    }

    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [27, 67, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Relatorio_Clientes_Empana_${now.replace(/\//g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Empana Fácil</h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Visão Geral e Indicadores</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.perfil === 'gerente' && (
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
              <UserIcon size={18} className="text-gray-400" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-transparent text-[11px] font-black text-gray-600 uppercase tracking-wider outline-none pr-2 cursor-pointer"
              >
                <option value="Todos">Todos Usuários</option>
                {empanaUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={generateReport}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm tracking-tight hover:bg-secondary transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download size={18} />
            GERAR RELATÓRIO PDF
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Clientes</p>
              <h3 className="text-3xl font-black text-gray-900">{totalClientes}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canal Distribution */}
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-black text-gray-900 tracking-tight uppercase text-xs tracking-widest">Clientes por Canal / Segmento</h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={canalData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '800'
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {canalData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#1b4332' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Distribution with Filter */}
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/30 rounded-xl flex items-center justify-center text-primary">
                <MapPin size={20} />
              </div>
              <h3 className="font-black text-gray-900 tracking-tight uppercase text-xs tracking-widest">Distribuição por Cidade</h3>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              <Filter size={14} className="text-gray-400 ml-2" />
              <select 
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-transparent text-[11px] font-black text-gray-600 uppercase tracking-wider outline-none pr-2 cursor-pointer"
              >
                <option value="Todos">Todos Canais</option>
                <option value="Supermercado">Supermercado</option>
                <option value="Food Service">Food Service</option>
                <option value="Distribuidor">Distribuidor</option>
                <option value="Atacado">Atacado</option>
                <option value="Varejo">Varejo</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredCitiesData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '800'
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {filteredCitiesData.map((_, index) => (
                    <Cell key={`cell-city-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: '#1b4332' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEmpana;
