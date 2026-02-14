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

const CORES_PRODUTOS: Record<string, string> = {
  'Óleo Diesel': '#1e3a8a',
  'Gasolina C': '#3b82f6',
  'Etanol Hidratado': '#10b981'
};

const mapConfigs: Record<string, { center: [number, number]; scale: number }> = {
  "Brasil Inteiro": { center: [-55, -15], scale: 1000 },
  "Norte": { center: [-63, -4], scale: 1800 },
  "Nordeste": { center: [-41, -11], scale: 2400 },
  "Centro-Oeste": { center: [-56, -16], scale: 2200 },
  "Sudeste": { center: [-46, -21], scale: 2800 },
  "Sul": { center: [-52, -27], scale: 2800 },
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

export default function DashboardFinal() {
  const { data: session, status } = useSession();
  const [dados, setDados] = useState<any[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2025);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);

  useEffect(() => {
    fetch('/dados_vendas.json').then(res => res.json()).then(data => {
      setDados(data);
      if (data.length > 0) {
        const anos = [...new Set(data.map((d: any) => new Date(d.DATA).getFullYear()))].sort((a: any, b: any) => b - a);
        setAnoSelecionado(anos[0]);
      }
    });
  }, []);

  const { metricasAno, listaAnos, listaProdutos, listaRegioes, listaSegmentos, shareCalculado, dadosMensais, estatisticasEstado, totalFiltro } = useMemo(() => {
    const filtrarBase = (base: any[]) => {
      let f = base;
      if (regiaoSelecionada !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === regiaoSelecionada);
      if (produtosSelecionados.length > 0) f = f.filter(d => produtosSelecionados.includes(d.PRODUTO));
      if (segmentosSelecionados.length > 0) f = f.filter(d => segmentosSelecionados.includes(d.SEGMENTO));
      return f;
    };

    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))].sort((a, b) => b - a).slice(0, 10);
    const prodsBase = [...new Set(dados.map(d => d.PRODUTO))].sort();
    const regsBase = [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort();
    const segsBase = [...new Set(dados.map(d => d.SEGMENTO))].filter(Boolean).sort();

    const crescimentos = anosUnicos.map(ano => {
      const vAtual = filtrarBase(dados.filter(d => new Date(d.DATA).getFullYear() === ano)).reduce((a, b) => a + b.VENDAS, 0);
      const vAnterior = filtrarBase(dados.filter(d => new Date(d.DATA).getFullYear() === (ano - 1))).reduce((a, b) => a + b.VENDAS, 0);
      return { ano, cresc: vAnterior > 0 ? ((vAtual - vAnterior) / vAnterior) * 100 : 0 };
    });

    const baseFiltrada = filtrarBase(dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado));
    const totalF = baseFiltrada.reduce((a, b) => a + b.VENDAS, 0);

    const getShare = (lista: string[], campo: string) => lista.reduce((acc: any, n) => {
      const v = baseFiltrada.filter(d => d[campo] === n).reduce((a, b) => a + b.VENDAS, 0);
      acc[n] = totalF > 0 ? (v / totalF) * 100 : 0;
      return acc;
    }, {});

    const agrupadoUF = baseFiltrada.reduce((acc: any, curr) => {
      if (!acc[curr.UF]) acc[curr.UF] = { total: 0, nome: curr['UNIDADE DA FEDERAÇÃO'] };
      acc[curr.UF].total += curr.VENDAS;
      return acc;
    }, {});
    const ranking = Object.keys(agrupadoUF).map(uf => ({
      id: uf, vendas: agrupadoUF[uf].total, share: totalF > 0 ? (agrupadoUF[uf].total / totalF) * 100 : 0, nomeCompleto: agrupadoUF[uf].nome
    })).sort((a, b) => b.vendas - a.vendas);

    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dMensal = meses.map((nome, i) => {
      const dadosMes = baseFiltrada.filter(d => new Date(d.DATA).getMonth() === i);
      const entry: any = { name: nome, total: dadosMes.reduce((a, b) => a + b.VENDAS, 0) };
      prodsBase.forEach(p => { entry[p] = dadosMes.filter(d => d.PRODUTO === p).reduce((a, b) => a + b.VENDAS, 0); });
      return entry;
    });

    return { 
      listaAnos: anosUnicos, metricasAno: crescimentos, listaProdutos: prodsBase, listaRegioes: regsBase, listaSegmentos: segsBase,
      shareCalculado: { regiao: getShare(['Brasil Inteiro', ...regsBase], 'Região Geográfica'), produto: getShare(prodsBase, 'PRODUTO'), segmento: getShare(segsBase, 'SEGMENTO') },
      dadosMensais: dMensal, estatisticasEstado: ranking, totalFiltro: totalF
    };
  }, [dados, anoSelecionado, regiaoSelecionada, produtosSelecionados, segmentosSelecionados]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic uppercase">ANP|INSIGHTS BI</h1>
            <Link href="/projeções" className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all">➔ Projeções</Link>
          </div>

          {/* FILTROS (ALINHADOS) */}
          <div className="space-y-12">
            <div className="flex items-start gap-8">
              <div className="w-32 pt-2 shrink-0"><span className="text-[10px] font-black uppercase text-slate-400 italic">Filtro de Ano</span><div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Crescimento</div></div>
              <div className="flex gap-2">
                {listaAnos.map(ano => {
                  const m = metricasAno.find(i => i.ano === ano);
                  return (
                    <div key={ano} className="flex flex-col gap-2 w-20">
                      <button onClick={() => setAnoSelecionado(ano)} className={`w-full py-2 rounded-lg text-xs font-black transition-all ${anoSelecionado === ano ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{ano}</button>
                      <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border ${m && m.cresc >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{m?.cresc.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
              {[ {label: 'Região', list: ['Brasil Inteiro', ...listaRegioes], key: 'regiao', state: regiaoSelecionada, set: setRegiaoSelecionada, multi: false },
                 {label: 'Produto', list: listaProdutos, key: 'produto', state: produtosSelecionados, set: setProdutosSelecionados, multi: true },
                 {label: 'Segmento', list: listaSegmentos, key: 'segmento', state: segmentosSelecionados, set: setSegmentosSelecionados, multi: true }
              ].map((bloco, idx) => (
                <div key={idx} className="flex items-start gap-6">
                  <div className="w-20 pt-1 shrink-0"><span className="text-[10px] font-black uppercase text-slate-400 italic">{bloco.label}</span><div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Part. (%)</div></div>
                  <div className="flex gap-2 flex-wrap">
                    {bloco.list.map(item => {
                      const isSel = bloco.multi ? (bloco.state as string[]).includes(item) : bloco.state === item;
                      const share = (shareCalculado as any)[bloco.key][item];
                      return (
                        <div key={item} className="flex flex-col gap-2 w-[85px]">
                          <button onClick={() => bloco.multi ? (bloco.set as any)(prev => prev.includes(item) ? prev.filter(i=>i!==item) : [...prev, item]) : (bloco.set as any)(item)} 
                            className={`w-full h-10 px-1 rounded-lg text-[10px] font-black border leading-tight transition-all ${isSel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}>{item}</button>
                          <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent ${share > 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-200'}`}>{share?.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* MEIO: RANKING E MAPA */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Venda Total ({anoSelecionado})</h4>
              <div className="text-5xl font-black tracking-tighter">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl opacity-60">m³</span></div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex-1">
              <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase italic tracking-widest">Ranking UF</h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 40, right: 60 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="id" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#1e3a8a'}} />
                    <Bar dataKey="vendas" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={18}>
                       <LabelList dataKey="vendas" position="right" formatter={(v: any) => `${(v/1e6).toFixed(1)}M`} style={{fontSize: '10px', fontWeight: '900', fill: '#64748b'}} offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8 bg-white p-6 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 mb-2 uppercase italic tracking-widest pl-4">Distribuição Geográfica</h3>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <ComposableMap projection="geoMercator" style={{ width: "100%", height: "100%", maxHeight: "600px" }} projectionConfig={{ scale: mapConfigs[regiaoSelecionada]?.scale || 1000, center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] }}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }: any) => geographies.map((geo: any) => {
                      const sigla = geo.properties.sigla;
                      const data = estatisticasEstado.find(s => s.id === sigla);
                      const pertence = regiaoSelecionada === 'Brasil Inteiro' || dados.find(d => d.UF === sigla)?.['Região Geográfica'] === regiaoSelecionada;
                      const volumes = estatisticasEstado.map(d => d.vendas);
                      const scale = scaleQuantile<string>().domain(volumes.length > 1 ? volumes : [0, 1e9]).range(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"]);
                      return <Geography key={geo.rsmKey} geography={geo} fill={pertence ? (data ? scale(data.vendas) : "#f8fafc") : "#f1f5f9"} stroke="#ffffff" strokeWidth={0.5} />;
                    })}
                  </Geographies>
                  {estatisticasEstado.map((estado) => {
                    const coords = centrosEstados[estado.id];
                    if (!coords || estado.share < 0.6) return null;
                    return <Marker key={estado.id} coordinates={coords}><text textAnchor="middle" y={2} style={{ fontSize: "11px", fontWeight: 900, fill: "#1e3a8a", paintOrder: "stroke", stroke: "#ffffff", strokeWidth: "3px" }}>{estado.share.toFixed(1)}%</text></Marker>;
                  })}
                </ComposableMap>
            </div>
          </div>
        </div>

        {/* BASE: SAZONALIDADE */}
        <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="mb-10 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-black text-blue-900 tracking-tighter italic uppercase">Sazonalidade Mensal ({anoSelecionado})</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase italic">Volume por produto (m³)</p>
            </div>
            <div className="flex gap-4">
              {Object.keys(CORES_PRODUTOS).map(name => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: CORES_PRODUTOS[name]}} />
                  <span className="text-[10px] font-black text-slate-600 uppercase">{name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#64748b'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '15px', border: 'none'}} />
                {Object.keys(CORES_PRODUTOS).map((prod, idx) => (
                  <Bar key={prod} dataKey={prod} stackId="a" fill={CORES_PRODUTOS[prod]} radius={idx === 2 ? [5, 5, 0, 0] : [0,0,0,0]}>
                     <LabelList dataKey={prod} position="center" content={(props: any) => {
                       const { x, y, width, height, value } = props;
                       return height > 20 ? <text x={x + width/2} y={y + height/2} fill="#fff" textAnchor="middle" fontSize="10" fontWeight="900">{(value/1e3).toFixed(0)}k</text> : null;
                     }} />
                  </Bar>
                ))}
                <Bar dataKey="total" stackId="total" fill="transparent">
                  <LabelList dataKey="total" position="top" formatter={(v: number) => `${(v/1e6).toFixed(2)}M`} style={{fontSize: '12px', fontWeight: '900', fill: '#1e3a8a'}} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>
    </main>
  );
}