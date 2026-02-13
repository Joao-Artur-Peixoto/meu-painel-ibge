'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend, Line 
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
        console.log("Dados Brutos Carregados:", data[0]); // Debug: Verifique os nomes das colunas aqui
        setDados(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar JSON:", err);
        setLoading(false);
      });
  }, []);

  // Extração dinâmica com suporte a múltiplas variações de nomes de colunas
  const listaProdutos = useMemo(() => {
    const p = dados.map(d => d.PRODUTO || d.produto || d.Produto || d.segmento || "Sem Produto").filter(v => v !== "Sem Produto");
    return [...new Set(p)].sort();
  }, [dados]);

  const listaRegioes = useMemo(() => {
    const r = dados.map(d => d['Região Geográfica'] || d.REGIAO || d.regiao || d.Regiao || d.UF).filter(Boolean);
    return [...new Set(r)].sort();
  }, [dados]);

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produto) ? prev.filter(p => p !== produto) : [...prev, produto]
    );
  };

  const dadosGrafico = useMemo(() => {
    // Se não houver filtros, o gráfico tentará mostrar o total consolidado
    let filtrados = [...dados];

    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => (d['Região Geográfica'] || d.REGIAO || d.regiao || d.UF) === regiaoSelecionada);
    }
    
    if (produtosSelecionados.length > 0) {
      filtrados = filtrados.filter(d => produtosSelecionados.includes(d.PRODUTO || d.produto || d.Produto));
    }

    const agrupado = filtrados.reduce((acc: any, curr) => {
      // Tenta achar a data em múltiplos formatos
      const dataStr = curr.DATA || curr.ds || curr.data;
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
      // Mapeia VALOR_REAL (do seu print) ou y para VENDAS
      acc[dataStr].VENDAS += Number(curr.VALOR_REAL || curr.VENDAS || curr.y || 0);
      acc[dataStr].PREVISAO += Number(curr.PREVISAO || curr.yhat || 0);
      acc[dataStr].MINIMO += Number(curr.MINIMO || curr.yhat_lower || 0);
      acc[dataStr].MAXIMO += Number(curr.MAXIMO || curr.yhat_upper || 0);
      return acc;
    }, {});

    const resultado = Object.values(agrupado).sort((a: any, b: any) => new Date(a.DATA).getTime() - new Date(b.DATA).getTime());
    console.log("Dados Processados para o Gráfico:", resultado.length);
    return resultado;
  }, [dados, regiaoSelecionada, produtosSelecionados]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-blue-500 animate-pulse">SINCRONIZANDO MODELO...</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        {/* TÍTULO */}
        <header className="mb-8 flex justify-between items-end">
          <div>
            <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-widest hover:underline mb-2 block">← Voltar</Link>
            <h1 className="text-4xl font-black italic uppercase">Projeções <span className="text-blue-500">ANP</span></h1>
          </div>
          <div className="text-[10px] font-black bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/30 uppercase tracking-widest">
            IA: Facebook Prophet
          </div>
        </header>

        {/* FILTROS (Agora com verificação) */}
        <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] mb-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Região / UF</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRegiaoSelecionada('Brasil Inteiro')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === 'Brasil Inteiro' ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  Brasil Inteiro
                </button>
                {listaRegioes.map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {r}
                  </button>
                ))}
                {listaRegioes.length === 0 && <span className="text-[10px] text-red-500 font-bold">Aviso: Nenhuma Região encontrada no JSON!</span>}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Produto</label>
              <div className="flex flex-wrap gap-2">
                {listaProdutos.map(p => (
                  <button key={p} onClick={() => toggleProduto(p)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {p}
                  </button>
                ))}
                {listaProdutos.length === 0 && <span className="text-[10px] text-red-500 font-bold">Aviso: Nenhum Produto encontrado no JSON!</span>}
              </div>
            </div>
          </div>
        </section>

        {/* GRÁFICO */}
        <section className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl min-h-[600px]">
          <div className="mb-10 flex justify-between items-center">
             <h3 className="text-xl font-bold italic">Mercado: {regiaoSelecionada}</h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> <span className="text-[10px] font-bold uppercase text-slate-400">Real</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> <span className="text-[10px] font-bold uppercase text-slate-400">Projeção</span></div>
             </div>
          </div>

          <div className="h-[500px] w-full">
            {dadosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="DATA_FORMATADA" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickMargin={15} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '15px' }} />
                  <Area type="monotone" dataKey="MAXIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="MINIMO" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
                  <Line type="monotone" dataKey="VENDAS" stroke="#3b82f6" strokeWidth={4} dot={false} name="Volume Real" />
                  <Line type="monotone" dataKey="PREVISAO" stroke="#eab308" strokeWidth={2} strokeDasharray="8 5" dot={false} name="Previsão" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                <span className="text-5xl mb-4">📊</span>
                <p className="font-black uppercase tracking-widest text-xs">Aguardando dados de filtragem...</p>
                <p className="text-[10px] mt-2 italic">Verifique se o JSON possui as colunas 'UF' e 'PRODUTO'</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}