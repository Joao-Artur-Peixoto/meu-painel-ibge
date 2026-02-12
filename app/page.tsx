'use client';

import React, { useState, useEffect, useMemo } from 'react';

// @ts-expect-error - Biblioteca sem tipos oficiais
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// @ts-expect-error - Biblioteca sem tipos oficiais
import { scaleQuantile } from 'd3-scale';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
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
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-blue-900">ANP|INSIGHTS</h1>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-wrap gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  anoSelecionado === ano ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="h-[500px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 800, center: [-54, -15] }}>
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

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={estatisticasEstado.slice(0, 12)} margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="id" type="category" width={40} tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip 
                    formatter={(value: number) => [new Intl.NumberFormat('pt-BR').format(value) + " m³", "Total"]}
                  />
                  <Bar dataKey="vendas" radius={[0, 8, 8, 0]}>
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