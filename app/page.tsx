'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const NIVEIS = [
  { label: 'Regiões', value: 'N2', desc: 'all' },
  { label: 'Estados (UFs)', value: 'N3', desc: 'all' },
];

export default function DashboardDinamico() {
  const [dados, setDados] = useState<any[]>([]);
  const [nivel, setNivel] = useState(NIVEIS[0]);
  const [carregando, setCarregando] = useState(true);
  const [montado, setMontado] = useState(false); // Truque para evitar erro de hidratação

  useEffect(() => {
    setMontado(true);
    async function carregarDados() {
      setCarregando(true);
      try {
        const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=${nivel.value}[${nivel.desc}]`;
        const res = await fetch(url);
        const json = await res.json();
        
        const series = json[0]?.resultados[0]?.series || [];
        const formatado = series.map((item: any) => ({
          name: item.localidade.nome,
          valor: parseInt(item.serie['2022'], 10) || 0
        })).sort((a: any, b: any) => b.valor - a.valor);

        setDados(formatado);
      } catch (err) {
        setDados([
          { name: 'Sudeste', valor: 84847313 },
          { name: 'Nordeste', valor: 54644582 },
          { name: 'Sul', valor: 29933315 },
          { name: 'Norte', valor: 17349619 },
          { name: 'Centro-Oeste', valor: 16287809 }
        ]);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, [nivel]);

  // Se não estiver montado no navegador, não renderiza o gráfico ainda
  if (!montado) return null;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-10 text-slate-900">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        
        <div className="p-6 md:p-8 bg-white border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Explorador Censo 2022</h1>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
            {NIVEIS.map((n) => (
              <button
                key={n.value}
                onClick={() => setNivel(n)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  nivel.value === n.value ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 h-[500px] w-full bg-white">
          {carregando ? (
            <div className="h-full flex items-center justify-center animate-pulse text-slate-400">
              Carregando dados...
            </div>
          ) : (
            /* AQUI ESTÁ A CHAVE: ResponsiveContainer precisa de um pai com altura 100% */
            <div className="w-full h-full min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados} margin={{ top: 10, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0}
                    tick={{fontSize: 11, fill: '#64748b'}}
                  />
                  <YAxis 
                    tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`}
                    tick={{fontSize: 12, fill: '#64748b'}}
                  />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="valor" fill="#2563eb" radius={[4, 4, 0, 0]}>
                    {dados.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#1e3a8a' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}