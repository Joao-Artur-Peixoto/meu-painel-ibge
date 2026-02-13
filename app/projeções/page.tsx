'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend, Line 
} from 'recharts';
import Link from 'next/link';

interface DadoProjecao {
  DATA: string;
  UF: string;
  'UNIDADE DA FEDERAÇÃO': string;
  PRODUTO: string;
  'Região Geográfica': string;
  PREVISAO: number;
  MINIMO: number;
  MAXIMO: number;
  TIPO: string;
  VENDAS: number | null;
}

export default function ProjecoesVendas() {
  const [dados, setDados] = useState<DadoProjecao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros idênticos à primeira página
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);

  useEffect(() => {
    // Carregando o JSON detalhado gerado no Jupyter
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then((data: DadoProjecao[]) => {
        setDados(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar projeções:", err);
        setLoading(false);
      });
  }, []);

  // Listas para os botões de filtro
  const listaProdutos = useMemo(() => [...new Set(dados.map(d => d.PRODUTO))].sort(), [dados]);
  const listaRegioes = useMemo(() => [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort(), [dados]);

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produto) ? prev.filter(p => p !== produto) : [...prev, produto]
    );
  };

  // Lógica de filtragem e agrupamento para o gráfico de linha
  const dadosGrafico = useMemo(() => {
    let filtrados = [...dados];

    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    if (produtosSelecionados.length > 0) {
      filtrados = filtrados.filter(d => produtosSelecionados.includes(d.PRODUTO));
    }

    // Agrupar por DATA (somar valores de diferentes UFs filtradas)
    const agrupado = filtrados.reduce((acc: any, curr) => {
      const dataStr = curr.DATA;
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
      acc[dataStr].VENDAS += curr.VENDAS || 0;
      acc[dataStr].PREVISAO += curr.PREVISAO || 0;
      acc[dataStr].MINIMO += curr.MINIMO || 0;
      acc[dataStr].MAXIMO += curr.MAXIMO || 0;
      return acc;
    }, {});

    return Object.values(agrupado).sort((a: any, b: any) => new Date(a.DATA).getTime() - new Date(b.DATA).getTime());
  }, [dados, regiaoSelecionada, produtosSelecionados]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse text-blue-400 bg-slate-900 min-h-screen">PROCESSANDO MODELOS PREDITIVOS...</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        {/* NAVEGAÇÃO E TÍTULO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Link href="/" className="text-blue-500 font-bold text-xs uppercase tracking-widest hover:text-blue-400 transition-all mb-2 block">
              ← Voltar ao Painel Histórico
            </Link>
            <h1 className="text-4xl font-black tracking-tighter italic text-white">
              PROJEÇÕES <span className="text-blue-500">2026-2028</span>
            </h1>
          </div>
          <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-2xl">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">Modelo: Facebook Prophet</p>
          </div>
        </div>

        {/* FILTROS IGUAIS À PRIMEIRA PÁGINA */}
        <header className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 mb-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-widest">Região Geográfica</label>
              <div className="flex flex-wrap gap-2">
                {['Brasil Inteiro', ...listaRegioes].map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-widest">Seleção de Produto</label>
              <div className="flex flex-wrap gap-2">
                {listaProdutos.map(p => (
                  <button key={p} onClick={() => toggleProduto(p)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* GRÁFICO PRINCIPAL */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-inner">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-bold italic">
              Tendência de Vendas: <span className="text-blue-500">{regiaoSelecionada}</span>
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Real</span>
              <span className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> Projeção</span>
            </div>
          </div>

          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="DATA_FORMATADA" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickMargin={15}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                  formatter={(v: number) => [v.toLocaleString('pt-BR') + ' m³', 'Volume']}
                />
                <Legend verticalAlign="top" height={36}/>

                {/* Área de Incerteza */}
                <Area 
                  type="monotone" 
                  dataKey="MAXIMO" 
                  stroke="none" 
                  fill="#3b82f6" 
                  fillOpacity={0.05} 
                />
                <Area 
                  type="monotone" 
                  dataKey="MINIMO" 
                  stroke="none" 
                  fill="#3b82f6" 
                  fillOpacity={0.05} 
                  name="Intervalo de Confiança"
                />

                {/* Linha Histórica */}
                <Line 
                  type="monotone" 
                  dataKey="VENDAS" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={false} 
                  activeDot={{ r: 6 }}
                  name="Volume Histórico"
                />

                {/* Linha de Previsão */}
                <Line 
                  type="monotone" 
                  dataKey="PREVISAO" 
                  stroke="#eab308" 
                  strokeWidth={3} 
                  strokeDasharray="8 5" 
                  dot={false}
                  name="Projeção IA"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}