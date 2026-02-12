'use client';

import React, { useState, useEffect, useMemo } from 'react';

// Ignora a checagem de tipos apenas nestas bibliotecas específicas para o build da Vercel
// @ts-ignore
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// @ts-ignore
import { scaleQuantile } from 'd3-scale';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// URL estável do GeoJSON (Estados do Brasil)
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
      })
      .catch(err => {
        console.error("Erro ao carregar dados:", err);
        setLoading(false);
      });
  }, []);

  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

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

  // Escala de cores baseada em Quantis para melhor distribuição visual
  const colorScale = useMemo(() => {
    return scaleQuantile()
      .domain(estatisticasEstado.map(d => d.vendas))
      .range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
  }, [estatisticasEstado]);

  if (loading) return <div className="p-10 text-center font-bold">Carregando Painel ANP...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tight text-slate-800">📊 Painel de Vendas ANP</h1>
          <p className="text-slate-500 text-lg font-medium">Análise Geográfica de Consumo de Combustíveis</p>
        </header>

        {/* Filtros */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest text-center md:text-left">Ano de Referência</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  anoSelecionado === ano 
                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </section>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Lado Esquerdo: Mapa */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Concentração por UF (m³)</h3>
            <div className="flex-grow h-[500px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 relative">
              <ComposableMap 
                projection="geoMercator" 
                projectionConfig={{ scale: 850, center: [-54, -15] }}
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
                          strokeWidth={0.8}
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

          {/* Lado Direito: Ranking */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Ranking de Volume</h3>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={estatisticasEstado.slice(0, 15)} margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="id" 
                    type="category" 
                    width={40} 
                    tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [
                      new Intl.NumberFormat('pt-BR').format(Number(value)) + " m³", 
                      "Volume Total"
                    ]}
                  />
                  <Bar dataKey="vendas" radius={[0, 6, 6, 0]}>
                    {estatisticasEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colorScale(entry.vendas)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        <footer className="mt-12 text-center text-slate-400 text-sm pb-8 border-t border-slate-200 pt-8">
          Dados: ANP | Base Territorial: IBGE | Desenvolvido com Next.js 15
        </footer>
      </div>
    </main>
  );
}