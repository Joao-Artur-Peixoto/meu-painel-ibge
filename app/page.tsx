'use client';

import React, { useState, useEffect, useMemo } from 'react';
// @ts-expect-error
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// @ts-expect-error
import { scaleQuantile } from 'd3-scale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface DadoVenda {
  DATA: string;
  UF: string;
  'UNIDADE DA FEDERAÇÃO': string;
  PRODUTO: string;
  SEGMENTO: string;
  VENDAS: number;
  'Região Geográfica': string;
}

export default function DashboardVendas() {
  const [dados, setDados] = useState<DadoVenda[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [tooltipContent, setTooltipContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/dados_vendas.json')
      .then((res) => res.json())
      .then((data: DadoVenda[]) => {
        setDados(data);
        if (data.length > 0) {
          const anos = data.map(d => new Date(d.DATA).getFullYear());
          setAnoSelecionado(Math.max(...anos));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatarUnidade = (valor: number) => {
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)} M m³`;
    if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)} k m³`;
    return `${valor.toLocaleString('pt-BR')} m³`;
  };

  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  const listaProdutos = useMemo(() => [...new Set(dados.map(d => d.PRODUTO))].sort(), [dados]);
  const listaRegioes = useMemo(() => [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort(), [dados]);

  const toggleProduto = (produto: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produto) ? prev.filter(p => p !== produto) : [...prev, produto]
    );
  };

  const { estatisticasEstado, totalFiltro } = useMemo(() => {
    if (!anoSelecionado) return { estatisticasEstado: [], totalFiltro: 0 };

    let filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    if (produtosSelecionados.length > 0) {
      filtrados = filtrados.filter(d => produtosSelecionados.includes(d.PRODUTO));
    }

    const agrupado = filtrados.reduce((acc: Record<string, { total: number, nome: string }>, curr) => {
      if (!acc[curr.UF]) acc[curr.UF] = { total: 0, nome: curr['UNIDADE DA FEDERAÇÃO'] };
      acc[curr.UF].total += curr.VENDAS;
      return acc;
    }, {});

    const total = Object.values(agrupado).reduce((a, b) => a + b.total, 0);
    const lista = Object.keys(agrupado).map(uf => ({
      id: uf,
      vendas: agrupado[uf].total,
      share: total > 0 ? (agrupado[uf].total / total) * 100 : 0,
      nomeCompleto: agrupado[uf].nome
    })).sort((a, b) => b.vendas - a.vendas);

    return { estatisticasEstado: lista, totalFiltro: total };
  }, [dados, anoSelecionado, regiaoSelecionada, produtosSelecionados]);

  const colorScale = useMemo(() => {
    const volumes = estatisticasEstado.map(d => d.vendas);
    return scaleQuantile<string>()
      .domain(volumes.length > 1 ? volumes : [0, 100])
      .range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
  }, [estatisticasEstado]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse uppercase tracking-widest text-blue-900">Renderizando Inteligência de Dados...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1500px] mx-auto">
        
        {/* CABEÇALHO */}
        <header className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic">ANP|INSIGHTS</h1>
            <div className="flex flex-wrap gap-2">
              {listaAnos.map(ano => (
                <button key={ano} onClick={() => setAnoSelecionado(ano)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${anoSelecionado === ano ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                  {ano}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Filtrar Região</label>
              <div className="flex flex-wrap gap-2">
                {['Brasil Inteiro', ...listaRegioes].map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Selecionar Produtos</label>
              <div className="flex flex-wrap gap-2">
                {listaProdutos.map(p => (
                  <button key={p} onClick={() => toggleProduto(p)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO ESQUERDO: MAPA */}
          <div className="lg:col-span-5 sticky top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total Consolidado</h4>
              <div className="text-5xl font-black tracking-tighter">{formatarUnidade(totalFiltro)}</div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 relative group">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Share de Mercado por Estado</h3>
              
              {/* Tooltip Customizado para o Mapa */}
              {tooltipContent && (
                <div className="absolute top-2 right-6 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold z-50 shadow-2xl animate-in fade-in zoom-in duration-200">
                  {tooltipContent}
                </div>
              )}

              <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 950, center: [-54, -15] }}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const data = estatisticasEstado.find(s => s.id === geo.properties.sigla);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={data ? colorScale(data.vendas) : "#f1f5f9"}
                            stroke="#ffffff"
                            strokeWidth={0.5}
                            onMouseEnter={() => {
                              if (data) setTooltipContent(`${data.nomeCompleto}: ${data.share.toFixed(2)}% do Total`);
                            }}
                            onMouseLeave={() => setTooltipContent("")}
                            style={{ default: { outline: "none" }, hover: { fill: "#facc15", cursor: "pointer" } }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RANKING ALINHADO À ESQUERDA */}
          <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest">Distribuição por UF</h3>
            
            <div className="overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
              <div style={{ height: `${Math.max(500, estatisticasEstado.length * 50)}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical" 
                    data={estatisticasEstado} 
                    margin={{ left: 10, right: 100, top: 0, bottom: 0 }} // Margem direita larga para o LabelList
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="nomeCompleto" 
                      type="category" 
                      width={140} // Largura fixa para garantir alinhamento à esquerda
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#1e3a8a', textAnchor: 'start' }} // textAnchor: start alinha o texto à esquerda
                      dx={-130} // Desloca os nomes para a extremidade esquerda da área reservada
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string, props: any) => [`${formatarUnidade(value)} (${props.payload.share.toFixed(2)}%)`, "Performance"]}
                    />
                    <Bar dataKey="vendas" radius={[0, 12, 12, 0]} barSize={26}>
                      <LabelList 
                        dataKey="vendas" 
                        position="right" 
                        formatter={(v: number) => formatarUnidade(v)}
                        style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold' }} 
                        offset={10}
                      />
                      {estatisticasEstado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colorScale(entry.vendas)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}