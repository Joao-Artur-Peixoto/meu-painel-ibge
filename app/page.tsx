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

  // --- LÓGICA DE CRESCIMENTO E SHARE ---
  const { metricasAno, listaAnos, listaProdutos, listaRegioes, listaSegmentos, shareCalculado } = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))].sort((a, b) => b - a).slice(0, 10);
    const prods = [...new Set(dados.map(d => d.PRODUTO))].sort();
    const regs = [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort();
    const segs = [...new Set(dados.map(d => d.SEGMENTO))].filter(Boolean).sort();

    // Cálculo de crescimento para as caixinhas (YOY) baseado nos filtros de produto/regiao/segmento
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

    // Cálculo de Participação (%) para a segunda linha dos filtros
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

  // --- DADOS DO DASHBOARD (MAPA E RANKING) ---
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

  const colorScale = useMemo(() => {
    const volumes = estatisticasEstado.map(d => d.vendas);
    return scaleQuantile<string>().domain(volumes.length > 1 ? volumes : [0, 100]).range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
  }, [estatisticasEstado]);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900 uppercase">Verificando Credenciais...</div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><button onClick={() => signIn('google')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black">LOGIN</button></div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        {/* CABEÇALHO COM FILTROS EM CAMADAS */}
        <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic">ANP|INSIGHTS</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Dashboard Histórico de Vendas</p>
            </div>
            <Link href="/projeções" className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all shadow-lg">➔ Ver Projeções</Link>
          </div>

          <div className="space-y-8">
            {/* LINHA 1: ANOS E CRESCIMENTO */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Filtro de Ano:</span>
                <div className="flex gap-2">
                  {listaAnos.map(ano => (
                    <button key={ano} onClick={() => setAnoSelecionado(ano)} 
                      className={`w-20 py-2 rounded-xl text-xs font-black transition-all ${anoSelecionado === ano ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{ano}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Crescimento Anual:</span>
                <div className="flex gap-2">
                  {metricasAno.map(({ ano, cresc }) => (
                    <div key={ano} className={`w-20 py-1.5 rounded-xl text-[10px] font-black text-center border ${cresc >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                      {cresc > 0 ? '+' : ''}{cresc.toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* LINHA 2: REGIAO E PARTICIPAÇÃO */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Região Geográfica:</span>
                <div className="flex gap-2">
                  {['Brasil Inteiro', ...listaRegioes].map(r => (
                    <button key={r} onClick={() => setRegiaoSelecionada(r)} 
                      className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${regiaoSelecionada === r ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Participação (%):</span>
                <div className="flex gap-2">
                  {['Brasil Inteiro', ...listaRegioes].map(r => (
                    <div key={r} className="px-4 py-1.5 w-auto min-w-[80px] text-center rounded-xl text-[10px] font-black bg-slate-50 text-blue-900 border border-slate-100">
                      {r === 'Brasil Inteiro' ? '100%' : `${shareCalculado.regiao[r]?.toFixed(1)}%`}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LINHA 3: PRODUTO E PARTICIPAÇÃO */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Tipo de Produto:</span>
                <div className="flex gap-2 flex-wrap">
                  {listaProdutos.map(p => (
                    <button key={p} onClick={() => setProdutosSelecionados(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p])} 
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${produtosSelecionados.includes(p) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Participação Mix:</span>
                <div className="flex gap-2 flex-wrap">
                  {listaProdutos.map(p => (
                    <div key={p} className="px-4 py-1.5 min-w-[70px] text-center rounded-xl text-[10px] font-black bg-slate-50 text-blue-900 border border-slate-100">
                      {shareCalculado.produto[p]?.toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LINHA 4: SEGMENTO E PARTICIPAÇÃO */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Segmento Mercado:</span>
                <div className="flex gap-2">
                  {listaSegmentos.map(s => (
                    <button key={s} onClick={() => setSegmentosSelecionados(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s])} 
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${segmentosSelecionados.includes(s) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-[10px] font-black uppercase text-slate-400 italic">Share Segmento:</span>
                <div className="flex gap-2">
                  {listaSegmentos.map(s => (
                    <div key={s} className="px-4 py-1.5 min-w-[70px] text-center rounded-xl text-[10px] font-black bg-slate-50 text-blue-900 border border-slate-100">
                      {shareCalculado.segmento[s]?.toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY (Mapa e Ranking) */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          <div className="w-full xl:w-[550px] shrink-0 sticky top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Volume Total Selecionado</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl opacity-60">m³</span></div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: mapConfigs[regiaoSelecionada]?.scale || 950, center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] }}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }: any) => geographies.map((geo: any) => {
                      const sigla = geo.properties.sigla;
                      const data = estatisticasEstado.find(s => s.id === sigla);
                      const pertence = regiaoSelecionada === 'Brasil Inteiro' || dados.find(d => d.UF === sigla)?.['Região Geográfica'] === regiaoSelecionada;
                      return <Geography key={geo.rsmKey} geography={geo} fill={pertence ? (data ? colorScale(data.vendas) : "#f1f5f9") : "#f8fafc"} stroke="#ffffff" strokeWidth={0.8} style={{ default: { outline: "none" } }} />;
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
          </div>

          <div className="flex-1 min-w-[350px] bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest italic text-center">Ranking de Mercado por UF</h3>
            <div className="overflow-y-auto max-h-[850px] pr-2">
              <div style={{ height: `${Math.max(500, estatisticasEstado.length * 45)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 10, right: 120 }}>
                    <CartesianGrid horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nomeCompleto" type="category" width={180} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e3a8a', textAnchor: 'start' }} dx={-175} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="vendas" radius={[0, 15, 15, 0]} barSize={32}>
                      <LabelList dataKey="vendas" position="right" formatter={(v: number) => `${(v/1e6).toPrecision(3)}M m³`} style={{ fill: '#1e293b', fontSize: '13px', fontWeight: '900' }} offset={12} />
                      {estatisticasEstado.map((entry, index) => <Cell key={index} fill={colorScale(entry.vendas)} />)}
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