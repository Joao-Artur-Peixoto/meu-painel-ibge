'use client';

import React, { useState, useEffect, useMemo } from 'react';

// @ts-expect-error - Biblioteca sem tipos oficiais
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// @ts-expect-error - Biblioteca sem tipos oficiais
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
}

interface EstadoAgrupado {
  id: string;
  vendas: number;
  nomeCompleto: string;
}

export default function DashboardVendas() {
  const [dados, setDados] = useState<DadoVenda[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
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

  // Função para formatar valores dinamicamente (Escala Inteligente)
  const formatarValorSufixo = (valor: number) => {
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)} Mi`;
    if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)}k`;
    return valor.toLocaleString('pt-BR');
  };

  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  const estatisticasEstado = useMemo((): EstadoAgrupado[] => {
    if (!anoSelecionado) return [];
    const filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    const agrupado = filtrados.reduce((acc: { [key: string]: number }, curr) => {
      acc[curr.UF] = (acc[curr.UF] || 0) + curr.VENDAS;
      return acc;
    }, {});

    return Object.keys(agrupado).map(uf => ({
      id: uf,
      vendas: agrupado[uf],
      nomeCompleto: dados.find(d => d.UF === uf)?.['UNIDADE DA FEDERAÇÃO'] || uf
    })).sort((a, b) => b.vendas - a.vendas);
  }, [dados, anoSelecionado]);

  // Cálculo da altura dinâmica: 40px por barra + margens
  const alturaGrafico = useMemo(() => {
    const minHeightPorBarra = 40;
    return Math.max(500, estatisticasEstado.length * minHeightPorBarra);
  }, [estatisticasEstado]);

  const colorScale = useMemo(() => {
    const volumes = estatisticasEstado.map(d => d.vendas);
    return scaleQuantile<string>()
      .domain(volumes.length > 0 ? volumes : [0, 100])
      .range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
  }, [estatisticasEstado]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse">CARREGANDO...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-blue-900">ANP|INSIGHTS</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Painel de Performance Regional</p>
          </div>
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  anoSelecionado === ano ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* MAPA - Ocupa 5 colunas */}
          <div className="lg:col-span-5 sticky top-8 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">Visualização Geográfica</h3>
            <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 900, center: [-54, -15] }}>
                <Geographies geography={geoUrl}>
                  {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { sigla: string } }> }) =>
                    geographies.map((geo) => {
                      const data = estatisticasEstado.find(s => s.id === geo.properties.sigla);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={data ? colorScale(data.vendas) : "#f1f5f9"}
                          stroke="#ffffff"
                          strokeWidth={0.5}
                          style={{ default: { outline: "none" }, hover: { fill: "#facc15", cursor: "pointer" } }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>
          </div>

          {/* RANKING - Ocupa 7 colunas */}
          <div className="lg:col-span-7 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest">Ranking por Unidade Federativa</h3>
            
            {/* AREA DE ROLAGEM */}
            <div className="overflow-y-auto max-h-[700px] pr-4 custom-scrollbar">
              <div style={{ height: `${alturaGrafico}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical" 
                    data={estatisticasEstado} 
                    margin={{ left: 10, right: 60, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="id" 
                      type="category" 
                      width={40} 
                      tick={{ fontSize: 12, fontWeight: 900, fill: '#1e3a8a' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [new Intl.NumberFormat('pt-BR').format(value) + " m³", "Total"]}
                    />
                    <Bar dataKey="vendas" radius={[0, 10, 10, 0]} barSize={24}>
                      {/* LABEL DIRETO NA BARRA */}
                      <LabelList 
                        dataKey="vendas" 
                        position="right" 
                        formatter={formatarValorSufixo}
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