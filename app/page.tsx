'use client';
import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const REGIOES = ['Brasil', 'Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'];

export default function DashboardFinal() {
  const [todosOsDados, setTodosOsDados] = useState<any[]>([]);
  const [regiaoAtiva, setRegiaoAtiva] = useState('Brasil');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        // Chamada para a API de Estados (UF)
        const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N3[all]');
        
        if (!res.ok) throw new Error("Falha ao conectar com o IBGE");
        
        const json = await res.json();
        const series = json[0]?.resultados[0]?.series || [];
        
        if (series.length === 0) throw new Error("A API retornou uma lista vazia");

        const formatado = series.map((item: any) => {
          // Garante que o valor seja um número puro e remove nulos
          const valorRaw = item.serie['2022'];
          const valorLimpo = valorRaw ? parseInt(valorRaw.toString().replace(/\D/g, ''), 10) : 0;
          
          return {
            name: item.localidade.nome,
            valor: valorLimpo,
            regiao: identificarRegiao(item.localidade.nome)
          };
        }).sort((a: any, b: any) => b.valor - a.valor);

        setTodosOsDados(formatado);
      } catch (err: any) {
        setErro(err.message);
        // Backup se a API falhar totalmente
        setTodosOsDados([
          { name: 'São Paulo', valor: 44420459, regiao: 'Sudeste' },
          { name: 'Minas Gerais', valor: 20538718, regiao: 'Sudeste' },
          { name: 'Rio de Janeiro', valor: 16054524, regiao: 'Sudeste' }
        ]);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  const dadosExibidos = useMemo(() => {
    if (regiaoAtiva === 'Brasil') return todosOsDados.slice(0, 10);
    return todosOsDados.filter(d => d.regiao === regiaoAtiva);
  }, [todosOsDados, regiaoAtiva]);

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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="p-8 border-b border-slate-100">
          <h1 className="text-2xl font-black text-blue-900 mb-6">População Censo 2022</h1>
          
          <div className="flex flex-wrap gap-2">
            {REGIOES.map(r => (
              <button
                key={r}
                onClick={() => setRegiaoAtiva(r)}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  regiaoAtiva === r ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          {carregando ? (
            <div className="h-[400px] flex items-center justify-center animate-pulse text-blue-600 font-bold">
              CONECTANDO AO IBGE...
            </div>
          ) : (
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosExibidos} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 11, fill: '#64748b'}} 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`}
                    tick={{fontSize: 11, fill: '#64748b'}}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  {/* AQUI É ONDE A MÁGICA ACONTECE: O minPointSize garante que a barra apareça */}
                  <Bar dataKey="valor" fill="#2563eb" radius={[6, 6, 0, 0]} minPointSize={5}>
                    {dadosExibidos.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#1e3a8a' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {erro && <p className="text-center text-red-400 text-xs mt-4">Aviso: {erro}. Exibindo dados de segurança.</p>}
        </div>
      </div>
    </main>
  );
}