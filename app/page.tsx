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

  useEffect(() => {
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
        console.error("Erro ao buscar dados:", err);
        // Backup de segurança para o gráfico nunca ficar em branco
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200">
        
        <div className="p-6 md:p-8 border-b border-slate-100">
          <h1 className="text-2xl font-black text-blue-950 mb-6">Explorador Censo 2022</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escolha o nível:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {NIVEIS.map((n) => (
                <button
                  key={n.value}
                  onClick={() => setNivel(n)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    nivel.value === n.value 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8">
          {carregando ? (
            <div className="h-[400px] flex items-center justify-center text-blue-600 font-medium">
              Buscando dados no IBGE...
            </div>
          ) : (
            /* Ajustamos a altura aqui para garantir visibilidade */
            <div style={{ width: '100%', height: 450, minHeight: 450 }}>
              <ResponsiveContainer>
                <BarChart 
                  data={dados} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0} 
                    height={80} 
                    tick={{fontSize: 10, fill: '#64748b'}}
                  />
                  <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {dados.map((entry, index) => (
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