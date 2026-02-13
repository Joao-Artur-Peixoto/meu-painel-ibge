'use client';

import Link from 'next/link';
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

const mapConfigs: Record<string, { center: [number, number]; scale: number }> = {
  "Brasil Inteiro": { center: [-55, -15], scale: 950 },
  "Norte": { center: [-63, -4], scale: 1900 },
  "Nordeste": { center: [-41, -11], scale: 2400 },
  "Centro-Oeste": { center: [-56, -16], scale: 2200 },
  "Sudeste": { center: [-46, -21], scale: 3000 },
  "Sul": { center: [-52, -27], scale: 3000 },
};

const centrosEstados: Record<string, [number, number]> = {
  'AC': [-70.81, -9.02], 'AL': [-36.78, -9.57], 'AP': [-51.77, 1.41], 'AM': [-64.63, -3.41],
  'BA': [-41.71, -12.96], 'CE': [-39.53, -5.20], 'DF': [-47.88, -15.77], 'ES': [-40.30, -19.19],
  'GO': [-49.83, -15.82], 'MA': [-45.27, -5.42], 'MT': [-55.89, -12.64], 'MS': [-54.54, -20.51],
  'MG': [-44.55, -18.55], 'PA': [-52.33, -3.95], 'PB': [-36.78, -7.28], 'PR': [-51.62, -24.89],
  'PE': [-37.95, -8.28], 'PI': [-42.74, -7.71], 'RJ': [-43.17, -22.31], 'RN': [-36.95, -5.40],
  'RS': [-53.76, -30.03], 'RO': [-62.82, -10.83], 'RR': [-61.30, 1.89], 'SC': [-50.44, -27.24],
  'SP': [-48.54, -22.19], 'SE': [-37.44, -10.57], 'TO': [-48.25, -10.17]
};

export default function DashboardVendas() {
  const { data: session, status } = useSession();
  const [dados, setDados] = useState<any[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);

  useEffect(() => {
    fetch('/dados_vendas.json')
      .then(res => res.json())
      .then(data => {
        setDados(data);
        if (data.length > 0) {
          const anos = [...new Set(data.map((d: any) => new Date(d.DATA).getFullYear()))].sort((a: any, b: any) => b - a);
          setAnoSelecionado(anos[0]);
        }
      });
  }, []);

  // --- LÓGICA DE FILTRAGEM DINÂMICA E SHARE ---
  const { metricasAno, listaAnos, listaProdutos, listaRegioes, listaSegmentos, shareCalculado } = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))].sort((a, b) => b - a).slice(0, 10);
    const prods = [...new Set(dados.map(d => d.PRODUTO))].sort();
    const regs = [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort();
    const segs = [...new Set(dados.map(d => d.SEGMENTO))].filter(Boolean).sort();

    // Base para crescimento anual (YOY)
    const calcularVolAno = (ano: number) => {
      let f = dados.filter(d => new Date(d.DATA).getFullYear() === ano);
      if (regiaoSelecionada !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === regiaoSelecionada);
      if (produtosSelecionados.length > 0) f = f.filter(d => produtosSelecionados.includes(d.PRODUTO));
      if (segmentosSelecionados.length > 0) f = f.filter(d => segmentosSelecionados.includes(d.SEGMENTO));
      return f.reduce((a, b) => a + b.VENDAS, 0);
    };

    const crescimentos = anosUnicos.map(ano => {
      const vAtual = calcularVolAno(ano);
      const vAnterior = calcularVolAno(ano - 1);
      return { ano, cresc: vAnterior > 0 ? ((vAtual - vAnterior) / vAnterior) * 100 : 0 };
    });

    // CÁLCULO DE PARTICIPAÇÃO DINÂMICA (Baseado nos outros filtros aplicados)
    const baseAno = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);

    const getShareDinamico = (lista: string[], campoFoco: string, outrosFiltros: { reg?: string, prod?: string[], seg?: string[] }) => {
      // 1. Calcular o total da base considerando APENAS os filtros que NÃO são o campo foco
      let baseFiltroGlobal = baseAno;
      if (campoFoco !== 'Região Geográfica' && outrosFiltros.reg !== 'Brasil Inteiro') 
        baseFiltroGlobal = baseFiltroGlobal.filter(d => d['Região Geográfica'] === outrosFiltros.reg);
      if (campoFoco !== 'PRODUTO' && outrosFiltros.prod && outrosFiltros.prod.length > 0) 
        baseFiltroGlobal = baseFiltroGlobal.filter(d => outrosFiltros.prod?.includes(d.PRODUTO));
      if (campoFoco !== 'SEGMENTO' && outrosFiltros.seg && outrosFiltros.seg.length > 0) 
        baseFiltroGlobal = baseFiltroGlobal.filter(d => outrosFiltros.seg?.includes(d.SEGMENTO));

      const totalGlobal = baseFiltroGlobal.reduce((a, b) => a + b.VENDAS, 0);

      // 2. Calcular quanto cada item representa desse total filtrado
      return lista.reduce((acc: any, nome) => {
        const volItem = baseFiltroGlobal.filter(d => d[campoFoco] === nome).reduce((a, b) => a + b.VENDAS, 0);
        acc[nome] = totalGlobal > 0 ? (volItem / totalGlobal) * 100 : 0;
        return acc;
      }, {});
    };

    const filtroAtual = { reg: regiaoSelecionada, prod: produtosSelecionados, seg: segmentosSelecionados };

    return { 
      listaAnos: anosUnicos, 
      metricasAno: crescimentos,
      listaProdutos: prods,
      listaRegioes: regs,
      listaSegmentos: segs,
      shareCalculado: {
        regiao: getShareDinamico(['Brasil Inteiro', ...regs], 'Região Geográfica', filtroAtual),
        produto: getShareDinamico(prods, 'PRODUTO', filtroAtual),
        segmento: getShareDinamico(segs, 'SEGMENTO', filtroAtual)
      }
    };
  }, [dados, anoSelecionado, regiaoSelecionada, produtosSelecionados, segmentosSelecionados]);

  // Ranking e Total
  const { estatisticasEstado, totalFiltro } = useMemo(() => {
    let f = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    if (regiaoSelecionada !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (produtosSelecionados.length > 0) f = f.filter(d => produtosSelecionados.includes(d.PRODUTO));
    if (segmentosSelecionados.length > 0) f = f.filter(d => segmentosSelecionados.includes(d.SEGMENTO));

    const total = f.reduce((a, b) => a + b.VENDAS, 0);
    const agrupado = f.reduce((acc: any, curr) => {
      if (!acc[curr.UF]) acc[curr.UF] = { total: 0, nome: curr['UNIDADE DA FEDERAÇÃO'] };
      acc[curr.UF].total += curr.VENDAS;
      return acc;
    }, {});

    const lista = Object.keys(agrupado).map(uf => ({
      id: uf, vendas: agrupado[uf].total, share: total > 0 ? (agrupado[uf].total / total) * 100 : 0, nomeCompleto: agrupado[uf].nome
    })).sort((a, b) => b.vendas - a.vendas);

    return { estatisticasEstado: lista, totalFiltro: total };
  }, [dados, anoSelecionado, regiaoSelecionada, produtosSelecionados, segmentosSelecionados]);

  const getShareColor = (percent: number) => {
    if (percent === 0) return 'bg-transparent text-slate-300';
    if (percent < 5) return 'bg-blue-50 text-blue-400';
    if (percent < 20) return 'bg-blue-100 text-blue-600';
    return 'bg-blue-600 text-white';
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900 uppercase italic">Carregando BI...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic uppercase">ANP|INSIGHTS BI</h1>
            <Link href="/projeções" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-lg">➔ Projeções</Link>
          </div>

          <div className="space-y-12">
            {/* FILTRO ANO (MANTIDO) */}
            <div className="flex items-start gap-8">
              <div className="w-32 pt-2 shrink-0">
                <span className="text-[10px] font-black uppercase text-slate-400 italic">Filtro de Ano</span>
                <div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Crescimento</div>
              </div>
              <div className="flex gap-2">
                {listaAnos.map(ano => {
                  const meta = metricasAno.find(m => m.ano === ano);
                  return (
                    <div key={ano} className="flex flex-col gap-2 w-20">
                      <button onClick={() => setAnoSelecionado(ano)} 
                        className={`w-full py-2 rounded-lg text-xs font-black transition-all ${anoSelecionado === ano ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{ano}</button>
                      <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border ${meta && meta.cresc >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                        {meta?.cresc ? (meta.cresc > 0 ? '+' : '') + meta.cresc.toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* FILTROS ESTRUTURADOS COM CONTAINERS ALINHADOS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
              
              {/* BLOCO REGIAO */}
              <div className="flex items-start gap-6">
                <div className="w-20 pt-1 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-400 italic">Região</span>
                  <div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Part. (%)</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['Brasil Inteiro', ...listaRegioes].map(r => (
                    <div key={r} className="flex flex-col gap-2 w-[85px]">
                      <button onClick={() => setRegiaoSelecionada(r)} 
                        className={`w-full h-10 px-1 rounded-lg text-[10px] font-black border leading-tight transition-all ${regiaoSelecionada === r ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{r}</button>
                      <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent ${getShareColor(r === 'Brasil Inteiro' ? 100 : shareCalculado.regiao[r])}`}>
                        {r === 'Brasil Inteiro' ? '100%' : `${shareCalculado.regiao[r]?.toFixed(1)}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOCO PRODUTO */}
              <div className="flex items-start gap-6">
                <div className="w-20 pt-1 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-400 italic">Produto</span>
                  <div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Part. (%)</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {listaProdutos.map(p => (
                    <div key={p} className="flex flex-col gap-2 w-[85px]">
                      <button onClick={() => setProdutosSelecionados(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p])} 
                        className={`w-full h-10 px-1 rounded-lg text-[10px] font-black border leading-tight transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{p}</button>
                      <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent ${getShareColor(shareCalculado.produto[p])}`}>
                        {shareCalculado.produto[p]?.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOCO SEGMENTO */}
              <div className="flex items-start gap-6">
                <div className="w-20 pt-1 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-400 italic">Segmento</span>
                  <div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Part. (%)</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {listaSegmentos.map(s => (
                    <div key={s} className="flex flex-col gap-2 w-[85px]">
                      <button onClick={() => setSegmentosSelecionados(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s])} 
                        className={`w-full h-10 px-1 rounded-lg text-[10px] font-black border leading-tight transition-all ${segmentosSelecionados.includes(s) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{s}</button>
                      <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent ${getShareColor(shareCalculado.segmento[s])}`}>
                        {shareCalculado.segmento[s]?.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* CORPO DO DASHBOARD (INVERTIDO) */}
        <div className="flex flex-col xl:flex-row-reverse gap-8 items-start">
          
          <div className="w-full xl:w-[500px] shrink-0 xl:sticky xl:top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Vendas Consolidadas</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl opacity-60">m³</span></div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm aspect-square overflow-hidden">
               <ComposableMap projection="geoMercator" projectionConfig={{ scale: mapConfigs[regiaoSelecionada]?.scale || 950, center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] }}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }: any) => geographies.map((geo: any) => {
                      const sigla = geo.properties.sigla;
                      const data = estatisticasEstado.find(s => s.id === sigla);
                      const pertence = regiaoSelecionada === 'Brasil Inteiro' || dados.find(d => d.UF === sigla)?.['Região Geográfica'] === regiaoSelecionada;
                      
                      const volumes = estatisticasEstado.map(d => d.vendas);
                      const scale = scaleQuantile<string>().domain(volumes.length > 1 ? volumes : [0, 100]).range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
                      
                      return <Geography key={geo.rsmKey} geography={geo} fill={pertence ? (data ? scale(data.vendas) : "#f1f5f9") : "#f8fafc"} stroke="#ffffff" strokeWidth={0.5} />;
                    })}
                  </Geographies>
                  {estatisticasEstado.map((estado) => {
                    const coords = centrosEstados[estado.id];
                    if (!coords || estado.share < 0.6) return null;
                    return (
                      <Marker key={estado.id} coordinates={coords}>
                        <text textAnchor="middle" y={2} style={{ fontSize: "12px", fontWeight: 900, fill: "#1e3a8a", pointerEvents: "none", paintOrder: "stroke", stroke: "#ffffff", strokeWidth: "3px" }}>{estado.share.toFixed(1)}%</text>
                      </Marker>
                    );
                  })}
                </ComposableMap>
            </div>
          </div>

          <div className="flex-1 min-w-[350px] bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest italic text-center">Ranking de Mercado por UF</h3>
            <div className="overflow-y-auto max-h-[1000px] pr-2">
              <div style={{ height: `${Math.max(600, estatisticasEstado.length * 45)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 10, right: 120 }}>
                    <CartesianGrid horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nomeCompleto" type="category" width={180} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e3a8a', textAnchor: 'start' }} dx={-175} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="vendas" radius={[0, 15, 15, 0]} barSize={30}>
                      <LabelList dataKey="vendas" position="right" formatter={(v: number) => `${(v/1e6).toPrecision(3)}M m³`} style={{ fill: '#1e293b', fontSize: '13px', fontWeight: '900' }} offset={12} />
                      {estatisticasEstado.map((entry, index) => {
                         const volumes = estatisticasEstado.map(d => d.vendas);
                         const scale = scaleQuantile<string>().domain(volumes.length > 1 ? volumes : [0, 100]).range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
                         return <Cell key={index} fill={scale(entry.vendas)} />;
                      })}
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