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

// Configurações de Zoom e Foco por Região
const mapConfigs: Record<string, { center: [number, number]; scale: number }> = {
  "Brasil Inteiro": { center: [-55, -15], scale: 950 },
  "Norte": { center: [-63, -4], scale: 1900 },
  "Nordeste": { center: [-41, -11], scale: 2400 },
  "Centro-Oeste": { center: [-56, -16], scale: 2200 },
  "Sudeste": { center: [-46, -21], scale: 3000 },
  "Sul": { center: [-52, -27], scale: 3000 },
};

// Coordenadas para os textos de Share no Mapa
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
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)}k`;
    return `${valor.toLocaleString('pt-BR')}`;
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

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900">VERIFICANDO ACESSO...</div>;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center p-12 bg-slate-800 rounded-[3rem] border border-slate-700 shadow-2xl">
          <h2 className="text-blue-400 text-2xl font-black mb-6 italic">ANP | ACESSO RESTRITO</h2>
          <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black transition-all">
            LOGAR NO SISTEMA
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center font-black animate-pulse text-blue-900">CARREGANDO...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        {/* FILTROS */}
        <header className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic">ANP|INSIGHTS</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">SESSÃO: {session.user?.name}</p>
            </div>
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
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest italic">Região Geográfica</label>
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
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest italic">Seleção de Produto</label>
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

        {/* DASHBOARD BODY */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          
          {/* LADO ESQUERDO: MAPA */}
          <div className="w-full xl:w-[550px] shrink-0 sticky top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Venda Total Selecionada</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl">m³</span></div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Foco por UF (% Share)</h3>
              
              <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative">
                <ComposableMap 
                  projection="geoMercator" 
                  projectionConfig={{ 
                    scale: mapConfigs[regiaoSelecionada]?.scale || 950, 
                    center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] 
                  }}
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const data = estatisticasEstado.find(s => s.id === geo.properties.sigla);
                        const pertenceRegiao = regiaoSelecionada === 'Brasil Inteiro' || 
                                               dados.find(d => d.UF === geo.properties.sigla)?.['Região Geográfica'] === regiaoSelecionada;

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={pertenceRegiao ? (data ? colorScale(data.vendas) : "#f1f5f9") : "#f8fafc"}
                            stroke={pertenceRegiao ? "#ffffff" : "#f1f5f9"}
                            strokeWidth={0.8}
                            onMouseEnter={() => { if (data && pertenceRegiao) setTooltipContent(`${data.nomeCompleto}: ${data.share.toFixed(1)}%`); }}
                            onMouseLeave={() => setTooltipContent("")}
                            style={{ default: { outline: "none" }, hover: { fill: pertenceRegiao ? "#facc15" : "#f8fafc" } }}
                          />
                        );
                      })
                    }
                  </Geographies>

                  {estatisticasEstado.map((estado) => {
                    const coords = centrosEstados[estado.id];
                    const pertenceRegiao = regiaoSelecionada === 'Brasil Inteiro' || 
                                           dados.find(d => d.UF === estado.id)?.['Região Geográfica'] === regiaoSelecionada;

                    if (!coords || estado.share < 0.1 || !pertenceRegiao) return null;

                    return (
                      <Marker key={estado.id} coordinates={coords}>
                        <text
                          textAnchor="middle"
                          y={2}
                          style={{ 
                            fontSize: regiaoSelecionada === "Brasil Inteiro" ? "13px" : "18px",
                            fontWeight: 900, 
                            fill: estado.share > 15 ? "#fff" : "#1e3a8a",
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "#ffffff",
                            strokeWidth: "3px"
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

          {/* LADO DIREITO: RANKING COM FONTES GRANDES */}
          <div className="flex-1 min-w-[350px] bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest italic">Ranking Detalhado por Performance</h3>
            
            <div className="overflow-y-auto max-h-[850px] pr-2 custom-scrollbar">
              <div style={{ height: `${Math.max(500, estatisticasEstado.length * 55)}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 10, right: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="nomeCompleto" 
                      type="category" 
                      width={180} 
                      tick={{ fontSize: 13, fontWeight: 900, fill: '#1e3a8a', textAnchor: 'start' }} 
                      dx={-175} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(v: number, n: any, p: any) => [`${v.toLocaleString('pt-BR')} m³ (${p.payload.share.toFixed(2)}%)`, "Volume"]}
                    />
                    <Bar dataKey="vendas" radius={[0, 15, 15, 0]} barSize={32}>
                      <LabelList 
                        dataKey="vendas" 
                        position="right" 
                        formatter={(v: number) => `${formatarUnidade(v)} m³`}
                        style={{ fill: '#1e293b', fontSize: '13px', fontWeight: '900' }} 
                        offset={12}
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