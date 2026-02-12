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

interface EstadoAgrupado {
  id: string; // UF (sigla)
  vendas: number;
  share: number;
  nomeCompleto: string;
}

export default function DashboardVendas() {
  const [dados, setDados] = useState<DadoVenda[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
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

  const listaProdutos = useMemo(() => {
    return [...new Set(dados.map(d => d.PRODUTO))].sort();
  }, [dados]);

  const listaRegioes = useMemo(() => {
    return [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort();
  }, [dados]);

  // Função para alternar produtos (Seleção Múltipla)
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

  if (loading) return <div className="p-10 text-center font-black animate-pulse">CARREGANDO...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-4xl font-black tracking-tighter text-blue-900">ANP|INSIGHTS</h1>
          
          {/* FILTRO DE ANOS (BOTÕES) */}
          <div className="mt-6 flex flex-wrap gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  anoSelecionado === ano ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA: FILTROS E MAPA */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* FILTRO DE PRODUTOS (MÚLTIPLO) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex justify-between mb-4">
                <h3 className="text-xs font-black uppercase text-slate-400">Produtos (Seleção Múltipla)</h3>
                {produtosSelecionados.length > 0 && (
                  <button onClick={() => setProdutosSelecionados([])} className="text-[10px] text-blue-600 font-bold underline">Limpar</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {listaProdutos.map(p => (
                  <button
                    key={p}
                    onClick={() => toggleProduto(p)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                      produtosSelecionados.includes(p) ? 'bg-blue-100 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* TOTAL KPI */}
            <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-lg">
              <h4 className="text-blue-100 text-xs font-bold uppercase mb-1">Volume Total</h4>
              <div className="text-4xl font-black">{formatarUnidade(totalFiltro)}</div>
            </div>

            {/* MAPA COM SHARE NO HOVER/TOOLTIP */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-black uppercase text-slate-400 mb-4">Participação Geográfica (%)</h3>
              <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative">
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
                            style={{
                              default: { outline: "none" },
                              hover: { fill: "#facc15", cursor: "pointer" }
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                {/* Legenda Flutuante */}
                <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-3 rounded-xl border border-slate-200 text-[10px] font-bold">
                  Passe o mouse para ver o Share (%)
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: RANKING ESTADOS COMPLETOS */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase text-slate-400">Ranking por Estado (Nome Completo)</h3>
              <select 
                value={regiaoSelecionada} 
                onChange={(e) => setRegiaoSelecionada(e.target.value)}
                className="text-xs font-bold border-none bg-slate-100 rounded-lg p-2"
              >
                <option value="Brasil Inteiro">Brasil Inteiro</option>
                {listaRegioes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <div className="overflow-y-auto max-h-[850px] pr-4 custom-scrollbar">
              <div style={{ height: `${Math.max(500, estatisticasEstado.length * 45)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 120, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="nomeCompleto" 
                      type="category" 
                      width={110} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#1e3a8a' }} 
                      axisLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: number, name: string, props: any) => {
                        const share = props.payload.share.toFixed(2);
                        return [`${formatarUnidade(value)} (${share}%)`, "Volume (Share)"];
                      }}
                    />
                    <Bar dataKey="vendas" radius={[0, 10, 10, 0]} barSize={24}>
                      <LabelList 
                        dataKey="vendas" 
                        position="right" 
                        formatter={(v: number) => formatarUnidade(v)}
                        style={{ fill: '#64748b', fontSize: '10px', fontWeight: 'bold' }} 
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