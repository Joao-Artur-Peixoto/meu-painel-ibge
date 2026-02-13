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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/dados_vendas.json')
      .then(res => res.json())
      .then(data => {
        setDados(data);
        if (data.length > 0) {
          const anos = [...new Set(data.map((d: any) => new Date(d.DATA).getFullYear()))].sort((a: any, b: any) => b - a);
          setAnoSelecionado(anos[0]);
        }
        setLoading(false);
      });
  }, []);

  const { metricasAno, listaAnos, listaProdutos, listaRegioes, listaSegmentos, shareCalculado } = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))].sort((a, b) => b - a).slice(0, 10);
    const prods = [...new Set(dados.map(d => d.PRODUTO))].sort();
    const regs = [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort();
    const segs = [...new Set(dados.map(d => d.SEGMENTO))].filter(Boolean).sort();

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

    const baseAno = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    const totalAno = baseAno.reduce((a, b) => a + b.VENDAS, 0);

    const getShare = (lista: string[], campo: string) => {
      return lista.reduce((acc: any, nome) => {
        const vol = baseAno.filter(d => d[campo] === nome).reduce((a, b) => a + b.VENDAS, 0);
        acc[nome] = totalAno > 0 ? (vol / totalAno) * 100 : 0;
        return acc;
      }, {});
    };

    return { 
      listaAnos: anosUnicos, 
      metricasAno: crescimentos,
      listaProdutos: prods,
      listaRegioes: regs,
      listaSegmentos: segs,
      shareCalculado: {
        regiao: getShare(['Brasil Inteiro', ...regs], 'Região Geográfica'),
        produto: getShare(prods, 'PRODUTO'),
        segmento: getShare(segs, 'SEGMENTO')
      }
    };
  }, [dados, anoSelecionado, regiaoSelecionada, produtosSelecionados, segmentosSelecionados]);

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
    if (percent < 15) return 'bg-blue-100 text-blue-600';
    if (percent < 30) return 'bg-blue-200 text-blue-700';
    return 'bg-blue-600 text-white';
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900 uppercase italic">Carregando BI...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic uppercase">ANP|INSIGHTS BI</h1>
            <Link href="/projeções" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-lg">➔ Projeções</Link>
          </div>

          <div className="space-y-10">
            {/* FILTRO ANO E CRESCIMENTO */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-6">
                <span className="w-40 text-[10px] font-black uppercase text-slate-400 italic shrink-0">Filtro de Ano</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {listaAnos.map(ano => (
                    <button key={ano} onClick={() => setAnoSelecionado(ano)} 
                      className={`w-[85px] py-2 rounded-lg text-xs font-black transition-all shrink-0 ${anoSelecionado === ano ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{ano}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-40 text-[10px] font-black uppercase text-slate-400 italic shrink-0">Crescimento Anual</span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {metricasAno.map(({ ano, cresc }) => (
                    <div key={ano} className={`w-[85px] py-1.5 rounded-lg text-[10px] font-black text-center shrink-0 border ${cresc >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                      {cresc > 0 ? '+' : ''}{cresc.toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* FILTROS DE TRIPLA COLUNA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-[9px] font-black uppercase text-slate-400 italic shrink-0">Região</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {['Brasil Inteiro', ...listaRegioes].map(r => (
                      <button key={r} onClick={() => setRegiaoSelecionada(r)} 
                        className={`min-w-[75px] px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all ${regiaoSelecionada === r ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-[9px] font-black uppercase text-slate-400 italic shrink-0">Participação (%)</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {['Brasil Inteiro', ...listaRegioes].map(r => (
                      <div key={r} className={`min-w-[75px] px-2 py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent transition-colors ${getShareColor(r === 'Brasil Inteiro' ? 100 : shareCalculado.regiao[r])}`}>
                        {r === 'Brasil Inteiro' ? '100%' : `${shareCalculado.regiao[r]?.toFixed(1)}%`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-[9px] font-black uppercase text-slate-400 italic shrink-0">Produto</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {listaProdutos.map(p => (
                      <button key={p} onClick={() => setProdutosSelecionados(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p])} 
                        className={`min-w-[75px] px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-[9px] font-black uppercase text-slate-400 italic shrink-0">Participação (%)</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {listaProdutos.map(p => (
                      <div key={p} className={`min-w-[75px] px-2 py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent transition-colors ${getShareColor(shareCalculado.produto[p])}`}>
                        {shareCalculado.produto[p]?.toFixed(1)}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-[9px] font-black uppercase text-slate-400 italic shrink-0">Segmento</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {listaSegmentos.map(s => (
                      <button key={s} onClick={() => setSegmentosSelecionados(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s])} 
                        className={`min-w-[75px] px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all ${segmentosSelecionados.includes(s) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-[9px] font-black uppercase text-slate-400 italic shrink-0">Participação (%)</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {listaSegmentos.map(s => (
                      <div key={s} className={`min-w-[75px] px-2 py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent transition-colors ${getShareColor(shareCalculado.segmento[s])}`}>
                        {shareCalculado.segmento[s]?.toFixed(1)}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* CORPO INVERTIDO: RANKING À ESQUERDA, MAPA À DIREITA */}
        <div className="flex flex-col xl:flex-row-reverse gap-8 items-start">
          
          {/* LADO DIREITO (STICKY): MAPA E TOTALIZADOR */}
          <div className="w-full xl:w-[550px] shrink-0 xl:sticky xl:top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Consolidado</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl opacity-60">m³</span></div>
              <div className="absolute right-[-10px] bottom-[-10px] text-white/10 text-9xl font-black italic select-none uppercase">ANP</div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden aspect-square">
               <ComposableMap projection="geoMercator" projectionConfig={{ scale: mapConfigs[regiaoSelecionada]?.scale || 950, center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] }}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }: any) => geographies.map((geo: any) => {
                      const sigla = geo.properties.sigla;
                      const data = estatisticasEstado.find(s => s.id === sigla);
                      const pertence = regiaoSelecionada === 'Brasil Inteiro' || dados.find(d => d.UF === sigla)?.['Região Geográfica'] === regiaoSelecionada;
                      
                      const volumes = estatisticasEstado.map(d => d.vendas);
                      const scale = scaleQuantile<string>().domain(volumes.length > 1 ? volumes : [0, 100]).range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
                      
                      return <Geography key={geo.rsmKey} geography={geo} fill={pertence ? (data ? scale(data.vendas) : "#f1f5f9") : "#f8fafc"} stroke="#ffffff" strokeWidth={0.5} style={{ default: { outline: "none" } }} />;
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

          {/* LADO ESQUERDO: RANKING DETALHADO */}
          <div className="flex-1 min-w-[350px] bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest italic">Ranking Regional de Vendas</h3>
            <div className="overflow-y-auto max-h-[1000px] pr-2 custom-scrollbar">
              <div style={{ height: `${Math.max(600, estatisticasEstado.length * 45)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 10, right: 120 }}>
                    <CartesianGrid horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nomeCompleto" type="category" width={180} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e3a8a', textAnchor: 'start' }} dx={-175} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none' }} />
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