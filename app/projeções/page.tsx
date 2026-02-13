'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Line, YAxisProps 
} from 'recharts';
import Link from 'next/link';

export default function ProjecoesVendas() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then((data: any[]) => {
        setDados(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar JSON:", err);
        setLoading(false);
      });
  }, []);

  // Extração usando os nomes EXATOS da sua tabela (image_dbb09f)
  const listaProdutos = useMemo(() => {
    const p = dados.map(d => d['PRODUTO']).filter(Boolean);
    return [...new Set(p)].sort();
  }, [dados]);

  const listaRegioes = useMemo(() => {
    const r = dados.map(d => d['Região Geográfica']).filter(Boolean);
    return [...new Set(r)].sort();
  }, [dados]);

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produto) ? prev.filter(p => p !== produto) : [...prev, produto]
    );
  };

  const dadosGrafico = useMemo(() => {
    let filtrados = [...dados];

    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    if (produtosSelecionados.length > 0) {
      filtrados = filtrados.filter(d => produtosSelecionados.includes(d['PRODUTO']));
    }

    const agrupado = filtrados.reduce((acc: any, curr) => {
      const dataStr = curr['DATA'];
      if (!dataStr) return acc;

      if (!acc[dataStr]) {
        acc[dataStr] = { 
          DATA: dataStr, 
          VENDAS: 0, PREVISAO: 0, MINIMO: 0, MAXIMO: 0,
          DATA_FORMATADA: new Date(dataStr).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        };
      }
      
      // Forçando a conversão para número para evitar erros de String
      acc[dataStr].VENDAS += parseFloat(curr['VENDAS'] || 0);
      acc[dataStr].PREVISAO += parseFloat(curr['PREVISAO'] || 0);
      acc[dataStr].MINIMO += parseFloat(curr['MINIMO'] || 0);
      acc[dataStr].MAXIMO += parseFloat(curr['MAXIMO'] || 0);
      return acc;
    }, {});

    return Object.values(agrupado).sort((a: any, b: any) => new Date(a.DATA).getTime() - new Date(b.DATA).getTime());
  }, [dados, regiaoSelecionada, produtosSelecionados]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-blue-500 animate-pulse uppercase italic tracking-widest">Sincronizando Banco de Dados...</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        <header className="mb-10">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-blue-400 mb-4 block italic">← Retornar ao Histórico</Link>
          <div className="flex justify-between items-end">
             <h1 className="text-5xl font-black italic uppercase tracking-tighter">Projeções <span className="text-blue-500 underline decoration-blue-500/30">ANP</span></h1>
             <div className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest">Status: Otimizado</div>
          </div>
        </header>

        {/* FILTROS */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block italic">Região Geográfica</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRegiaoSelecionada('Brasil Inteiro')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === 'Brasil Inteiro' ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  Brasil Inteiro
                </button>
                {listaRegioes.map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block italic">Seleção de Produto</label>
              <div className="flex flex-wrap gap-2">
                {listaProdutos.map(p => (
                  <button key={p} onClick={() => toggleProduto(p)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* GRÁFICO */}
        <section className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-2xl font-black italic uppercase">Tendência: <span className="text-blue-500">{regiaoSelecionada}</span></h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Real</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Projeção</span></div>
            </div>
          </div>

          <div className="h-[500px] w-full">
            {dadosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="DATA_FORMATADA" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickMargin={20} />
                  {/* YAxis configurado para se ajustar a números pequenos ou grandes automaticamente */}
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px' }} />
                  
                  <Area type="monotone" dataKey="MAXIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="MINIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} />

                  <Line type="monotone" dataKey="VENDAS" stroke="#3b82f6" strokeWidth={4} dot={false} name="Real" isAnimationActive={false} />
                  <Line type="monotone" dataKey="PREVISAO" stroke="#eab308" strokeWidth={3} strokeDasharray="8 4" dot={false} name="IA" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-700 font-black border-2 border-dashed border-slate-800 rounded-3xl uppercase text-xs tracking-[0.5em]">
                Sem dados para os filtros selecionados
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}