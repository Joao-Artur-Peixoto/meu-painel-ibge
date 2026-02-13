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

  // Extração das listas usando os nomes EXATOS da sua imagem dbb09f
  const listaProdutos = useMemo(() => {
    const p = dados.map(d => d['PRODUTO']).filter(Boolean);
    return [...new Set(p)].sort() as string[];
  }, [dados]);

  const listaRegioes = useMemo(() => {
    const r = dados.map(d => d['Região Geográfica']).filter(Boolean);
    return [...new Set(r)].sort() as string[];
  }, [dados]);

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produto) ? prev.filter(p => p !== produto) : [...prev, produto]
    );
  };

  // Processamento dos dados para o gráfico
  const dadosGrafico = useMemo(() => {
    let filtrados = [...dados];

    // Filtro por Região
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    
    // Filtro por Produto
    if (produtosSelecionados.length > 0) {
      filtrados = filtrados.filter(d => produtosSelecionados.includes(d['PRODUTO']));
    }

    // Agrupamento por DATA (somando os valores das UFs daquela região/produto)
    const agrupado = filtrados.reduce((acc: any, curr) => {
      const dataStr = curr['DATA'];
      if (!dataStr) return acc;

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
      
      // Mapeando as colunas exatas: VENDAS, PREVISAO, MINIMO, MAXIMO
      acc[dataStr].VENDAS += Number(curr['VENDAS'] || 0);
      acc[dataStr].PREVISAO += Number(curr['PREVISAO'] || 0);
      acc[dataStr].MINIMO += Number(curr['MINIMO'] || 0);
      acc[dataStr].MAXIMO += Number(curr['MAXIMO'] || 0);
      return acc;
    }, {});

    return Object.values(agrupado).sort((a: any, b: any) => new Date(a.DATA).getTime() - new Date(b.DATA).getTime());
  }, [dados, regiaoSelecionada, produtosSelecionados]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-blue-500 animate-pulse uppercase tracking-[0.5em]">Carregando Inteligência...</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        <header className="mb-10 flex justify-between items-end">
          <div>
            <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-widest hover:text-blue-400 mb-4 block italic">← Voltar ao Painel Histórico</Link>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">Projeções <span className="text-blue-500 underline decoration-blue-500/20">2026-2028</span></h1>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl shadow-xl">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Modelo: Facebook Prophet</span>
          </div>
        </header>

        {/* SEÇÃO DE FILTROS - Agora deve popular corretamente */}
        <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block italic">Região Geográfica</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRegiaoSelecionada('Brasil Inteiro')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === 'Brasil Inteiro' ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  Brasil Inteiro
                </button>
                {listaRegioes.map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block italic">Seleção de Produto</label>
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

        {/* ÁREA DO GRÁFICO */}
        <section className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-2xl font-black italic">Tendência: <span className="text-blue-500">{regiaoSelecionada}</span></h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Volume total mensal (m³)</p>
            </div>
            <div className="flex gap-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                <span className="text-[10px] font-black uppercase text-slate-400">Real</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                <span className="text-[10px] font-black uppercase text-slate-400">Projeção</span>
              </div>
            </div>
          </div>

          <div className="h-[550px] w-full">
            {dadosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="DATA_FORMATADA" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickMargin={20} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '20px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="MAXIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} name="Limite Superior" />
                  <Area type="monotone" dataKey="MINIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} name="Limite Inferior" />
                  <Line type="monotone" dataKey="VENDAS" stroke="#3b82f6" strokeWidth={4} dot={false} name="Volume Real" />
                  <Line type="monotone" dataKey="PREVISAO" stroke="#eab308" strokeWidth={3} strokeDasharray="10 5" dot={false} name="Projeção IA" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 font-black uppercase text-xs tracking-widest">
                Nenhum dado encontrado para os filtros selecionados
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}