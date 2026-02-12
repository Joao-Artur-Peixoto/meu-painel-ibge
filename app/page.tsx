'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';

// URL do GeoJSON dos estados brasileiros
const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface DadoVenda {
  DATA: string;
  UF: string;
  'UNIDADE DA FEDERAÇÃO': string;
  PRODUTO: string;
  SEGMENTO: string;
  VENDAS: number;
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
      });
  }, []);

  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  // Processamento unificado para Mapa e Gráfico
  const estatisticasEstado = useMemo(() => {
    if (!anoSelecionado) return [];
    const filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    const agrupado = filtrados.reduce((acc: { [key: string]: number }, curr) => {
      const uf = curr.UF; // Usamos a sigla para o mapa
      acc[uf] = (acc[uf] || 0) + curr.VENDAS;
      return acc;
    }, {});

    return Object.keys(agrupado).map(uf => ({
      id: uf,
      vendas: agrupado[uf],
      nomeCompleto: dados.find(d => d.UF === uf)?.['UNIDADE DA FEDERAÇÃO'] || uf
    })).sort((a, b) => b.vendas - a.vendas);
  }, [dados, anoSelecionado]);

  // Escala de cores para o mapa (Tons de Azul)
  const colorScale = scaleQuantile<string>()
    .domain(estatisticasEstado.map(d => d.vendas))
    .range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);

  if (loading) return <div className="p-10 text-center">Carregando Dashboard...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">📊 Painel ANP: Distribuição de Combustíveis</h1>
          <p className="text-slate-500 font-medium">Análise volumétrica anual por Unidade Federativa</p>
        </header>

        {/* Seletor de Anos */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-wrap gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  anoSelecionado === ano ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Lado a Lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Coluna 1: Mapa Choropleth */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 text-slate-700">Distribuição Geográfica ({anoSelecionado})</h3>
            <div className="h-[500px] flex items-center justify-center">
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 900, center: [-54, -15] }} style={{ width: "100%", height: "100%" }}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const cur = estatisticasEstado.find(s => s.id === geo.properties.sigla);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={cur ? colorScale(cur.vendas) : "#F5F5F5"}
                          stroke="#FFFFFF"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: "#facc15", outline: "none", cursor: "pointer" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>
          </div>

          {/* Coluna 2: Gráfico de Barras */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 text-slate-700">Ranking por Volume (m³)</h3>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={estatisticasEstado.slice(0, 15)} margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="id" type="category" width={40} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any) => [new Intl.NumberFormat('pt-BR').format(value) + " m³", "Vendas"]}
                  />
                  <Bar dataKey="vendas" radius={[0, 4, 4, 0]}>
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
    </main>
  );
}