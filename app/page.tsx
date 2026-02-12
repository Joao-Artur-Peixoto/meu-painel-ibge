'use client';

import React, { useState, useEffect, useMemo } from 'react';

// @ts-ignore
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// @ts-ignore
import { scaleQuantile } from 'd3-scale';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// URL do GeoJSON oficial simplificado (Estados do Brasil)
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

  // 1. Busca dos dados locais (JSON que você salvou no public)
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
      .catch(err => {
        console.error("Erro ao carregar dados:", err);
        setLoading(false);
      });
  }, []);

  // 2. Extração de anos únicos para o filtro
  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  // 3. Agrupamento de vendas por Estado
  const estatisticasEstado = useMemo(() => {
    if (!anoSelecionado) return [];
    
    const filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    
    const agrupado = filtrados.reduce((acc: { [key: string]: number }, curr) => {
      const uf = curr.UF;
      acc[uf] = (acc[uf] || 0) + curr.VENDAS;
      return acc;
    }, {});

    return Object.keys(agrupado).map(uf => ({
      id: uf,
      vendas: agrupado[uf],
      nomeCompleto: dados.find(d => d.UF === uf)?.['UNIDADE DA FEDERAÇÃO'] || uf
    })).sort((a, b) => b.vendas - a.vendas);
  }, [dados, anoSelecionado]);

  // 4. Escala de Cores (Azuis do Tailwind para intensidade)
 const colorScale = useMemo(() => {
    const volumes = estatisticasEstado.map(d => d.vendas);
    // Forçamos a escala a entender que o retorno será uma string (hexadecimal da cor)
    return scaleQuantile<string>()
      .domain(volumes.length > 0 ? volumes : [0, 100])
      .range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
  }, [estatisticasEstado]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse">CARREGANDO DADOS ANP...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Título */}
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-blue-900 italic">ANP|INSIGHTS</h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-sm">Distribuição de Combustíveis por Estado</p>
        </header>

        {/* Filtro de Ano */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase mb-4">Ano de Referência</h2>
          <div className="flex flex-wrap gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  anoSelecionado === ano 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </section>

        {/* Dashboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Mapa de Calor */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Mapa de Consumo (m³)</h3>
            <div className="h-[500px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
              <ComposableMap 
                projection="geoMercator" 
                projectionConfig={{ scale: 800, center: [-54, -15] }}
                style={{ width: "100%", height: "100%" }}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo) => {
                      const sigla = geo.properties.sigla;
                      const data = estatisticasEstado.find(s => s.id === sigla);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={data ? colorScale(data.vendas) : "#f1f5f9"}
                          stroke="#ffffff"
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

          {/* Gráfico de Barras */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Ranking de Volume por UF</h3>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={estatisticasEstado.slice(0, 12)} margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="id" type="category" width={40} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [new Intl.NumberFormat('pt-BR').format(Number(value)) + " m³", "Total"]}
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

        <footer className="mt-12 text-center text-slate-400 text-xs pb-10">
          Base de dados extraída da ANP e Malha Digital IBGE 2022
        </footer>
      </div>
    </main>
  );
}