'use client';

import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
// @ts-expect-error
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
// @ts-expect-error
import { scaleQuantile } from 'd3-scale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend
} from 'recharts';
import { useSession, signIn } from "next-auth/react";

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";
const CORES_PRODUTOS: Record<string, string> = {
  'DIESEL': '#1e3a8a', 'GASOLINA': '#3b82f6', 'ETANOL': '#10b981', 'GLP': '#f59e0b', 'OUTROS': '#64748b'
};

const mapConfigs: Record<string, { center: [number, number]; scale: number }> = {
  "Brasil Inteiro": { center: [-55, -15], scale: 1100 },
  "Norte": { center: [-63, -4], scale: 2000 },
  "Nordeste": { center: [-41, -11], scale: 2600 },
  "Centro-Oeste": { center: [-56, -16], scale: 2400 },
  "Sudeste": { center: [-46, -21], scale: 3200 },
  "Sul": { center: [-52, -27], scale: 3200 },
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

export default function DashboardEstrategicoVendas() {
  const { data: session, status } = useSession();
  const [dados, setDados] = useState<any[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
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

  // --- LÓGICA DE FILTRAGEM E SHARE ---
  const { metricasAno, listaAnos, listaProdutos, listaRegioes, listaSegmentos, shareCalculado, dadosMensais, estatisticasEstado, totalFiltro } = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))].sort((a, b) => b - a).slice(0, 10);
    const prods = [...new Set(dados.map(d => d.PRODUTO))].sort();
    const regs = [...new Set(dados.map(d => d['Região Geográfica']))].filter(Boolean).sort();
    const segs = [...new Set(dados.map(d => d.SEGMENTO))].filter(Boolean).sort();

    // Filtro Global
    let f = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    if (regiaoSelecionada !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (produtosSelecionados.length > 0) f = f.filter(d => produtosSelecionados.includes(d.PRODUTO));
    if (segmentosSelecionados.length > 0) f = f.filter(d => segmentosSelecionados.includes(d.SEGMENTO));

    const totalF = f.reduce((a, b) => a + b.VENDAS, 0);

    // Crescimento YOY
    const crescimentos = anosUnicos.map(ano => {
      const vAtual = dados.filter(d => new Date(d.DATA).getFullYear() === ano && (regiaoSelecionada === 'Brasil Inteiro' || d['Região Geográfica'] === regiaoSelecionada)).reduce((a,b)=>a+b.VENDAS,0);
      const vAnterior = dados.filter(d => new Date(d.DATA).getFullYear() === (ano-1) && (regiaoSelecionada === 'Brasil Inteiro' || d['Região Geográfica'] === regiaoSelecionada)).reduce((a,b)=>a+b.VENDAS,0);
      return { ano, cresc: vAnterior > 0 ? ((vAtual - vAnterior) / vAnterior) * 100 : 0 };
    });

    // Share Dinâmico
    const getShare = (lista: string[], campo: string) => lista.reduce((acc: any, n) => {
      const v = f.filter(d => d[campo] === n).reduce((a, b) => a + b.VENDAS, 0);
      acc[n] = totalF > 0 ? (v / totalF) * 100 : 0;
      return acc;
    }, {});

    // Ranking UF
    const agrupadoUF = f.reduce((acc: any, curr) => {
      if (!acc[curr.UF]) acc[curr.UF] = { total: 0, nome: curr['UNIDADE DA FEDERAÇÃO'] };
      acc[curr.UF].total += curr.VENDAS;
      return acc;
    }, {});
    const ranking = Object.keys(agrupadoUF).map(uf => ({
      id: uf, vendas: agrupadoUF[uf].total, share: totalF > 0 ? (agrupadoUF[uf].total / totalF) * 100 : 0, nomeCompleto: agrupadoUF[uf].nome
    })).sort((a, b) => b.vendas - a.vendas);

    // Gráfico Mensal Empilhado
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dMensal = meses.map((nome, i) => {
      const mesData = f.filter(d => new Date(d.DATA).getMonth() === i);
      const totalMes = mesData.reduce((a, b) => a + b.VENDAS, 0);
      const entry: any = { name: nome, total: totalMes };
      prods.forEach(p => {
        entry[p] = mesData.filter(d => d.PRODUTO === p).reduce((a, b) => a + b.VENDAS, 0);
      });
      return entry;
    });

    return { 
      listaAnos: anosUnicos, metricasAno: crescimentos, listaProdutos: prods, listaRegioes: regs, listaSegmentos: segs,
      shareCalculado: { regiao: getShare(['Brasil Inteiro', ...regs], 'Região Geográfica'), produto: getShare(prods, 'PRODUTO'), segmento: getShare(segs, 'SEGMENTO') },
      dadosMensais: dMensal, estatisticasEstado: ranking, totalFiltro: totalF
    };
  }, [dados, anoSelecionado, regiaoSelecionada, produtosSelecionados, segmentosSelecionados]);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900 uppercase italic">Iniciando Dashboard...</div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><button onClick={() => signIn('google')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black">ENTRAR</button></div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        {/* HEADER FILTROS (MANTIDO CONFORME ÚLTIMO PEDIDO) */}
        <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic uppercase">ANP|INSIGHTS BI</h1>
            <Link href="/projeções" className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all shadow-lg">➔ Projeções</Link>
          </div>

          <div className="space-y-12">
            <div className="flex items-start gap-8">
              <div className="w-32 pt-2 shrink-0"><span className="text-[10px] font-black uppercase text-slate-400 italic">Filtro de Ano</span><div className="mt-8 text-[10px] font-black uppercase text-slate-400 italic">Crescimento</div></div>
              <div className="flex gap-2">
                {listaAnos.map(ano => {
                  const m = metricasAno.find(i => i.ano === ano);
                  return (
                    <div key={ano} className="flex flex-col gap-2 w-20">
                      <button onClick={() => setAnoSelecionado(ano)} className={`w-full py-2 rounded-lg text-xs font-black ${anoSelecionado === ano ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{ano}</button>
                      <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border ${m && m.cresc >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{m?.cresc.toFixed(1)}%</div>
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
                      const share = bloco.key === 'regiao' && item === 'Brasil Inteiro' ? 100 : (shareCalculado as any)[bloco.key][item];
                      return (
                        <div key={item} className="flex flex-col gap-2 w-[85px]">
                          <button onClick={() => bloco.multi ? (bloco.set as any)(prev => prev.includes(item) ? prev.filter(i=>i!==item) : [...prev, item]) : (bloco.set as any)(item)} 
                            className={`w-full h-10 px-1 rounded-lg text-[10px] font-black border leading-tight ${isSel ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{item}</button>
                          <div className={`w-full py-1.5 rounded-lg text-[10px] font-black text-center border border-transparent ${share > 20 ? 'bg-blue-600 text-white' : share > 0 ? 'bg-blue-100 text-blue-600' : 'text-slate-200'}`}>{share?.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* CORPO PRINCIPAL: RANKING (ESQ) E MAPA (DIR - MAIOR) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mb-8">
          
          {/* RANKING + TOTALIZADOR (4 colunas) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total no Ano</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl opacity-60">m³</span></div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase italic">Ranking UF</h3>
              <div className="overflow-y-auto max-h-[600px] pr-2">
                <ResponsiveContainer width="100%" height={estatisticasEstado.length * 40}>
                  <BarChart layout="vertical" data={estatisticasEstado}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="id" type="category" width={30} tick={{fontSize: 12, fontWeight: 900}} axisLine={false} tickLine={false} />
                    <Bar dataKey="vendas" radius={[0, 10, 10, 0]} barSize={20}>
                      {estatisticasEstado.map((e, i) => <Cell key={i} fill="#3b82f6" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* MAPA AMPLIADO (8 colunas) */}
          <div className="xl:col-span-8 bg-white p-6 rounded-[3rem] border border-slate-200 shadow-sm flex items-center justify-center min-h-[750px]">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: mapConfigs[regiaoSelecionada]?.scale || 1100, center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] }}>
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
                    <text textAnchor="middle" y={2} style={{ fontSize: "14px", fontWeight: 900, fill: "#1e3a8a", paintOrder: "stroke", stroke: "#ffffff", strokeWidth: "3px" }}>{estado.share.toFixed(1)}%</text>
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>
        </div>

        {/* NOVO GRÁFICO: SAZONALIDADE MENSAL POR PRODUTO */}
        <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-black text-blue-900 tracking-tighter italic uppercase">Sazonalidade Mensal</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Volumes por tipo de combustível (m³)</p>
            </div>
            <div className="flex gap-4">
              {Object.entries(CORES_PRODUTOS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: color}} />
                  <span className="text-[9px] font-black text-slate-500 uppercase italic">{name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                
                {listaProdutos.map((prod, idx) => (
                  <Bar key={prod} dataKey={prod} stackId="a" fill={CORES_PRODUTOS[prod] || '#94a3b8'} radius={idx === listaProdutos.length - 1 ? [6, 6, 0, 0] : [0,0,0,0]}>
                    <LabelList dataKey={prod} position="center" content={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (height < 20) return null; // Não mostra se a fatia for muito pequena
                      return <text x={x + width/2} y={y + height/2} fill="#fff" textAnchor="middle" fontSize="9" fontWeight="900">{(value/1e3).toFixed(0)}k</text>;
                    }} />
                  </Bar>
                ))}
                {/* Rótulo do Total acima da barra */}
                <Bar dataKey="total" stackId="total" fill="transparent">
                  <LabelList dataKey="total" position="top" formatter={(v: number) => `${(v/1e6).toFixed(2)}M`} style={{fontSize: '11px', fontWeight: '900', fill: '#1e3a8a'}} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>
    </main>
  );
}