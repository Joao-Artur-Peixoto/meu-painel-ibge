'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

// Mapeamento de níveis para a API do IBGE
const NIVEIS = [
  { label: 'Regiões', value: 'N2', desc: 'all' },
  { label: 'Estados (UFs)', value: 'N3', desc: 'all' },
];

export default function DashboardDinamico() {
  const [dados, setDados] = useState<any[]>([]);
  const [nivel, setNivel] = useState(NIVEIS[0]); // Começa em Regiões
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      try {
        // A URL agora usa o 'nivel.value' dinamicamente
        const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=${nivel.value}[${nivel.desc}]`;
        const res = await fetch(url);
        const json = await res.json();
        
        const series = json[0]?.resultados[0]?.series || [];
        const formatado = series.map((item: any) => ({
          name: item.localidade.nome,
          valor: parseInt(item.serie['2022'], 10)
        }))
        // Ordena do maior para o menor para o gráfico ficar mais bonito
        .sort((a: any, b: any) => b.valor - a.valor);

        setDados(formatado);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, [nivel]); // Toda vez que o nível mudar, ele busca de novo!

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header com Filtros */}
        <div className="p-8 border-b border-slate-100 bg-white">
          <h1 className="text-2xl font-black text-blue-950 mb-6">Explorador Censo 2022</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Nível de Detalhe:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {NIVEIS.map((n) => (
                <button
                  key={n.value}
                  onClick={() => setNivel(n)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    nivel.value === n.value 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Área do Gráfico */}
        <div className="p-8">
          {carregando ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados} layout={nivel.value === 'N3' ? 'vertical' : 'horizontal'}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={nivel.value !== 'N3'} vertical={nivel.value === 'N3'} stroke="#f1f5f9" />
                  
                  {/* Inverte eixos se for UF para caber todos os nomes na lateral */}
                  {nivel.value === 'N3' ? (
                    <>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${v/1000000}M`} axisLine={false} tickLine={false} />
                    </>
                  )}
                  
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="valor" radius={[0, 10, 10, 0]}>
                    {dados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#1e3a8a' : '#3b82f6'} />
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      <p className="text-center mt-6 text-slate-400 text-xs italic">
        Dica: Clique em "Estados" para ver o ranking completo das UFs.
      </p>
    </main>
  );
}