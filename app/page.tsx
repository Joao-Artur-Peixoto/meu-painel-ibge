'use client';
import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const REGIOES = ['Brasil', 'Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'];

export default function DashboardUFs() {
  const [todosOsDados, setTodosOsDados] = useState<any[]>([]);
  const [regiaoAtiva, setRegiaoAtiva] = useState('Brasil');
  const [carregando, setCarregando] = useState(true);

  // 1. Busca todos os dados de uma vez ao carregar a página
  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N3[all]');
        const json = await res.json();
        const series = json[0]?.resultados[0]?.series || [];
        
        const formatado = series.map((item: any) => ({
          name: item.localidade.nome,
          valor: parseInt(item.serie['2022'], 10) || 0,
          // Guardamos a região para o filtro (Ex: 'São Paulo' -> 'Sudeste')
          regiao: identificarRegiao(item.localidade.nome)
        })).sort((a: any, b: any) => b.valor - a.valor);

        setTodosOsDados(formatado);
      } catch (err) {
        console.error("Erro na API", err);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  // 2. Filtra os dados dinamicamente conforme o botão clicado
  const dadosFiltrados = useMemo(() => {
    if (regiaoAtiva === 'Brasil') return todosOsDados.slice(0, 15); // Top 15 se for Brasil
    return todosOsDados.filter(item => item.regiao === regiaoAtiva);
  }, [todosOsDados, regiaoAtiva]);

  // Função auxiliar para classificar estados por região
  function identificarRegiao(estado: string) {
    const norte = ['Acre', 'Amapá', 'Amazonas', 'Pará', 'Rondônia', 'Roraima', 'Tocantins'];
    const nordeste = ['Alagoas', 'Bahia', 'Ceará', 'Maranhão', 'Paraíba', 'Pernambuco', 'Piauí', 'Rio Grande do Norte', 'Sergipe'];
    const sudeste = ['Espírito Santo', 'Minas Gerais', 'Rio de Janeiro', 'São Paulo'];
    const sul = ['Paraná', 'Rio Grande do Sul', 'Santa Catarina'];
    if (norte.includes(estado)) return 'Norte';
    if (nordeste.includes(estado)) return 'Nordeste';
    if (sudeste.includes(estado)) return 'Sudeste';
    if (sul.includes(estado)) return 'Sul';
    return 'Centro-Oeste';
  }

  if (carregando) return <div className="p-20 text-center font-bold">Carregando dados do Censo...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200">
        
        {/* Filtros */}
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 mb-6">População por Estado (UF)</h1>
          <div className="flex flex-wrap gap-2">
            {REGIOES.map(r => (
              <button
                key={r}
                onClick={() => setRegiaoAtiva(r)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  regiaoAtiva === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfico */}
        <div className="p-6 h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosFiltrados} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{fontSize: 11}} 
                angle={-45} 
                textAnchor="end" 
                interval={0}
              />
              <YAxis 
                tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`}
                tick={{fontSize: 11}}
              />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {dadosFiltrados.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#1e3a8a' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}