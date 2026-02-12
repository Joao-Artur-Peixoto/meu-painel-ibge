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

// Mapeamento de Regiões
const REGIOES: Record<string, string[]> = {
  'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC']
};

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
  share: number;
  nomeCompleto: string;
}

export default function DashboardVendas() {
  const [dados, setDados] = useState<DadoVenda[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('Todos os Produtos');
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

  // Formatação solicitada: M m³ e k m³
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
    const produtos = [...new Set(dados.map(d => d.PRODUTO))];
    return ['Todos os Produtos', ...produtos.sort()];
  }, [dados]);

  // Processamento Principal com Filtros
  const { estatisticasEstado, totalFiltro } = useMemo(() => {
    if (!anoSelecionado) return { estatisticasEstado: [], totalFiltro: 0 };

    // 1. Filtro Base
    let filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);

    // 2. Filtro por Região
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      const ufsDaRegiao = REGIOES[regiaoSelecionada];
      filtrados = filtrados.filter(d => ufsDaRegiao.includes(d.UF));
    }

    // 3. Filtro por Produto
    if (produtoSelecionado !== 'Todos os Produtos') {
      filtrados = filtrados.filter(d => d.PRODUTO === produtoSelecionado);
    }

    // 4. Agrupamento por UF
    const agrupado = filtrados.reduce((acc: { [key: string]: number }, curr) => {
      acc[curr.UF] = (acc[curr.UF] || 0) + curr.VENDAS;
      return acc;
    }, {});

    const total = Object.values(agrupado).reduce((a, b) => a + b, 0);

    const lista = Object.keys(agrupado).map(uf => ({
      id: uf,
      vendas: agrupado[uf],
      share: total > 0 ? (agrupado[uf] / total) * 100 : 0,
      nomeCompleto: dados.find(d => d.UF === uf)?.['UNIDADE DA FEDERAÇÃO'] || uf
    })).sort((a, b) => b.vendas - a.vendas);

    return { estatisticasEstado: lista, totalFiltro: total };
  }, [dados, anoSelecionado, regiaoSelecionada, produtoSelecionado]);

  const alturaGrafico = useMemo(() => {
    return Math.max(400, estatisticasEstado.length * 45);
  }, [estatisticasEstado]);

  const colorScale = useMemo(() => {
    const volumes = estatisticasEstado.map(d => d.vendas);
    return scaleQuantile<string>()
      .domain(volumes.length > 1 ? volumes : [0, 100])
      .range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
  }, [estatisticasEstado]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse">SINCRONIZANDO DADOS...</div>;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER E FILTROS */}
        <header className="mb-8 grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-1">
            <h1 className="text-4xl font-black tracking-tighter text-blue-900 leading-none">ANP|BI</h1>
            <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-tighter">Market Intelligence Dashboard</p>
          </div>

          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro Ano */}
            <select 
              value={anoSelecionado || ''} 
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className="bg-white border-none shadow-sm rounded-xl p-3 text-sm font-bold text-slate-700"
            >
              {listaAnos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>

            {/* Filtro Região */}
            <select 
              value={regiaoSelecionada} 
              onChange={(e) => setRegiaoSelecionada(e.target.value)}
              className="bg-white border-none shadow-sm rounded-xl p-3 text-sm font-bold text-slate-700"
            >
              <option value="Brasil Inteiro">Brasil Inteiro</option>
              {Object.keys(REGIOES).map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {/* Filtro Produto */}
            <select 
              value={produtoSelecionado} 
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="bg-white border-none shadow-sm rounded-xl p-3 text-sm font-bold text-slate-700"
            >
              {listaProdutos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: KPI + MAPA */}
          <div className="lg:col-span-5 sticky top-8 space-y-6">
            
            {/* NOVO ELEMENTO: TOTAL DE VENDAS */}
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-blue-100 text-xs font-black uppercase tracking-widest mb-2">Volume Total no Período</h4>
                <div className="text-4xl font-black">{formatarUnidade(totalFiltro)}</div>
                <p className="text-blue-200 text-[10px] mt-4 font-medium italic">
                  *Filtros aplicados: {regiaoSelecionada} | {produtoSelecionado}
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl font-black italic">ANP</div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">Concentração Geográfica</h3>
              <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 900, center: [-54, -15] }}>
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
                            style={{ default: { outline: "none" }, hover: { fill: "#3b82f6", cursor: "pointer" } }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: RANKING COM SHARE */}
          <div className="lg:col-span-7 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Performance por Estado & Share</h3>
            
            <div className="overflow-y-auto max-h-[800px] pr-4 custom-scrollbar">
              <div style={{ height: `${alturaGrafico}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 5, right: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="id" 
                      type="category" 
                      width={40} 
                      tick={{ fontSize: 13, fontWeight: 900, fill: '#1e3a8a' }} 
                      axisLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === "vendas") return [formatarUnidade(value), "Volume"];
                        return [value.toFixed(2) + "%", "Participação"];
                      }}
                    />
                    <Bar dataKey="vendas" radius={[0, 12, 12, 0]} barSize={26}>
                      {/* LABEL: Valor Formatado + Participação % */}
                      <LabelList 
                        dataKey="share" 
                        position="right" 
                        content={(props: any) => {
                          const { x, y, width, value, index } = props;
                          const venda = estatisticasEstado[index].vendas;
                          return (
                            <text x={x + width + 10} y={y + 17} fill="#64748b" className="text-[10px] font-bold">
                              {formatarUnidade(venda)} | <tspan fill="#2563eb">{value.toFixed(1)}%</tspan>
                            </text>
                          );
                        }}
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