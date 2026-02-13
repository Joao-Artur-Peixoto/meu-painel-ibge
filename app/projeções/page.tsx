'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend, Line 
} from 'recharts';
import Link from 'next/link';

export default function ProjecoesVendas() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtro
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

  // Extração dinâmica das listas de filtros (Garante que busca os nomes corretos das colunas)
  const listaProdutos = useMemo(() => {
    const p = dados.map(d => d.PRODUTO || d.produto || d.Produto).filter(Boolean);
    return [...new Set(p)].sort();
  }, [dados]);

  const listaRegioes = useMemo(() => {
    const r = dados.map(d => d['Região Geográfica'] || d.REGIAO || d.regiao).filter(Boolean);
    return [...new Set(r)].sort();
  }, [dados]);

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produto) ? prev.filter(p => p !== produto) : [...prev, produto]
    );
  };

  // Processamento dos dados para o gráfico
  const dadosGrafico = useMemo(() => {
    let filtrados = [...dados];

    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => (d['Região Geográfica'] || d.REGIAO) === regiaoSelecionada);
    }
    if (produtosSelecionados.length > 0) {
      filtrados = filtrados.filter(d => produtosSelecionados.includes(d.PRODUTO || d.produto));
    }

    // Agrupamento por data para somar os valores das UFs
    const agrupado = filtrados.reduce((acc: any, curr) => {
      const dataStr = curr.DATA || curr.ds;
      if (!acc[dataStr]) {
        acc[dataStr] = { 
          DATA: dataStr, 
          VENDAS: 0, 
          PREVISAO: 0, 
          MINIMO: 0, 
          MAXIMO: 0,
          DATA_FORMATADA: new Date(dataStr).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        };
      }
      acc[dataStr].VENDAS += Number(curr.VENDAS || curr.y || 0);
      acc[dataStr].PREVISAO += Number(curr.PREVISAO || curr.yhat || 0);
      acc[dataStr].MINIMO += Number(curr.MINIMO || curr.yhat_lower || 0);
      acc[dataStr].MAXIMO += Number(curr.MAXIMO || curr.yhat_upper || 0);
      return acc;
    }, {});

    return Object.values(agrupado).sort((a: any, b: any) => new Date(a.DATA).getTime() - new Date(b.DATA).getTime());
  }, [dados, regiaoSelecionada, produtosSelecionados]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse text-blue-400 bg-slate-950 min-h-screen uppercase">Sincronizando Projeções...</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        {/* TÍTULO E BOTÃO VOLTAR */}
        <header className="mb-8">
            <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-blue-400 transition-all mb-4 block italic">
            ← Voltar ao Painel Histórico
            </Link>
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter italic">PROJEÇÕES <span className="text-blue-500 underline decoration-blue-500/30">2026-2028</span></h1>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">Inteligência Artificial aplicada ao setor de combustíveis</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl shadow-xl">
                    <span className="text-[10px] font-black text-blue-400 uppercase">Status do Modelo: <span className="text-green-500">Otimizado</span></span>
                </div>
            </div>
        </header>

        {/* ÁREA DE FILTROS (Igual à Home) */}
        <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-4 block tracking-widest italic">Região Geográfica</label>
              <div className="flex flex-wrap gap-2">
                {['Brasil Inteiro', ...listaRegioes].map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-4 block tracking-widest italic">Seleção de Produto</label>
              <div className="flex flex-wrap gap-2">
                {listaProdutos.map(p => (
                  <button key={p} onClick={() => toggleProduto(p)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* GRÁFICO */}
        <section className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <h2 className="text-9xl font-black italic">ANP</h2>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
                <h3 className="text-2xl font-black italic tracking-tight">Tendência de Mercado: <span className="text-blue-500">{regiaoSelecionada}</span></h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Soma volumétrica mensal estimada em m³</p>
            </div>
            <div className="flex gap-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase text-slate-300">Volume Histórico</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase text-slate-300">Projeção IA</span>
              </div>
            </div>
          </div>

          <div className="h-[550px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="DATA_FORMATADA" stroke="#475569" fontSize={10} tickMargin={20} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900' }}
                />
                
                <Area type="monotone" dataKey="MAXIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
                <Area type="monotone" dataKey="MINIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} />

                <Line type="monotone" dataKey="VENDAS" stroke="#3b82f6" strokeWidth={5} dot={false} name="Real" animationDuration={2000} />
                <Line type="monotone" dataKey="PREVISAO" stroke="#eab308" strokeWidth={3} strokeDasharray="10 5" dot={false} name="Previsto" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 border-t border-slate-800 pt-6">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] text-center">
                  Os dados futuros são baseados em sazonalidade anual e tendências lineares históricas via Prophet Model.
              </p>
          </div>
        </section>
      </div>
    </main>
  );
}