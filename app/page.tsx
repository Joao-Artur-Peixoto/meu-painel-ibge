'use client';

import React, { useState, useEffect, useMemo } from 'react';
// @ts-expect-error
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
// @ts-expect-error
import { scaleQuantile } from 'd3-scale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { useSession, signIn } from "next-auth/react";

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// Coordenadas centrais aproximadas de cada estado para as labels (Share %)
const centrosEstados: Record<string, [number, number]> = {
  'AC': [-70.81, -9.02], 'AL': [-36.78, -9.57], 'AP': [-51.77, 1.41], 'AM': [-64.63, -3.41],
  'BA': [-41.71, -12.96], 'CE': [-39.53, -5.20], 'DF': [-47.88, -15.77], 'ES': [-40.30, -19.19],
  'GO': [-49.83, -15.82], 'MA': [-45.27, -5.42], 'MT': [-55.89, -12.64], 'MS': [-54.54, -20.51],
  'MG': [-44.55, -18.55], 'PA': [-52.33, -3.95], 'PB': [-36.78, -7.28], 'PR': [-51.62, -24.89],
  'PE': [-37.95, -8.28], 'PI': [-42.74, -7.71], 'RJ': [-43.17, -22.31], 'RN': [-36.95, -5.40],
  'RS': [-53.76, -30.03], 'RO': [-62.82, -10.83], 'RR': [-61.30, 1.89], 'SC': [-50.44, -27.24],
  'SP': [-48.54, -22.19], 'SE': [-37.44, -10.57], 'TO': [-48.25, -10.17]
};

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
  const { data: session, status } = useSession();
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

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900">VALIDANDO ACESSO...</div>;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center p-12 bg-slate-800 rounded-[3rem] border border-slate-700 shadow-2xl">
          <h2 className="text-blue-400 text-2xl font-black mb-6 italic">ANP | ACESSO RESTRITO</h2>
          <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black transition-all">
            ENTRAR COM CONTA GOOGLE
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center font-black animate-pulse text-blue-900">Sincronizando Dados...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* CABEÇALHO */}
        <header className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic">ANP|INSIGHTS</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Usuário: {session.user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {listaAnos.map(ano => (
                <button key={ano} onClick={() => setAnoSelecionado(ano)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${anoSelecionado === ano ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                  {ano}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Região</label>
              <div className="flex flex-wrap gap-2">
                {['Brasil Inteiro', ...listaRegioes].map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${regiaoSelecionada === r ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Produtos</label>
              <div className="flex flex-wrap gap-2">
                {listaProdutos.map(p => (
                  <button key={p} onClick={() => toggleProduto(p)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* LAYOUT FLEXÍVEL PARA EVITAR SOBREPOSIÇÃO */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          
          {/* LADO ESQUERDO: KPI + MAPA COM LABELS FIXAS */}
          <div className="w-full xl:w-[500px] shrink-0 sticky top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Volume Consolidado</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{formatarUnidade(totalFiltro)}</div>
              <div className="absolute -right-4 -bottom-4 text-white/10 text-8xl font-black italic">ANP</div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição Geográfica (%)</h3>
                {tooltipContent && (
                  <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold animate-pulse">
                    {tooltipContent}
                  </div>
                )}
              </div>
              
              <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 1000, center: [-54, -15] }}>
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
                            onMouseEnter={() => { if (data) setTooltipContent(`${data.nomeCompleto}: ${data.share.toFixed(1)}%`); }}
                            onMouseLeave={() => setTooltipContent("")}
                            style={{ default: { outline: "none" }, hover: { fill: "#facc15", cursor: "pointer" } }}
                          />
                        );
                      })
                    }
                  </Geographies>
                  {/* Labels Fixas de Share sobre o mapa */}
                  {estatisticasEstado.map((estado) => {
                    const coords = centrosEstados[estado.id];
                    if (!coords || estado.share < 0.1) return null; // Não mostra labels em estados minúsculos/sem dados
                    return (
                      <Marker key={estado.id} coordinates={coords}>
                        <text
                          textAnchor="middle"
                          y={2}
                          style={{ 
                            fontSize: "8px", 
                            fontWeight: 900, 
                            fill: estado.share > 15 ? "#fff" : "#1e3a8a", // Cor contrastante conforme fundo
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: estado.share > 15 ? "none" : "#ffffff80",
                            strokeWidth: "2px"
                          }}
                        >
                          {estado.share.toFixed(1)}%
                        </text>
                      </Marker>
                    );
                  })}
                </ComposableMap>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RANKING */}
          <div className="flex-1 min-w-[350px] bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest">Ranking por Performance de UF</h3>
            <div className="overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
              <div style={{ height: `${Math.max(500, estatisticasEstado.length * 52)}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 10, right: 110 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="nomeCompleto" 
                      type="category" 
                      width={160} // Aumentado para nomes longos
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#1e3a8a', textAnchor: 'start' }} 
                      dx={-155} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string, props: any) => [`${formatarUnidade(value)} (${props.payload.share.toFixed(2)}%)`, "Volume"]}
                    />
                    <Bar dataKey="vendas" radius={[0, 12, 12, 0]} barSize={28}>
                      <LabelList 
                        dataKey="vendas" 
                        position="right" 
                        formatter={(v: number) => formatarUnidade(v)}
                        style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold' }} 
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