'use client';

import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
// @ts-expect-error
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
// @ts-expect-error
import { scaleQuantile } from 'd3-scale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie
} from 'recharts';
import { useSession, signIn } from "next-auth/react";

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

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

export default function DashboardVendasEstrategico() {
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
          const anos = data.map((d: any) => new Date(d.DATA).getFullYear());
          setAnoSelecionado(Math.max(...anos));
        }
        setLoading(false);
      });
  }, []);

  // --- CÁLCULO DE CRESCIMENTO ANO A ANO (DINÂMICO PELOS FILTROS) ---
  const metricasYOY = useMemo(() => {
    let f = dados;
    if (regiaoSelecionada !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (produtosSelecionados.length > 0) f = f.filter(d => produtosSelecionados.includes(d.PRODUTO));
    if (segmentosSelecionados.length > 0) f = f.filter(d => segmentosSelecionados.includes(d.SEGMENTO));

    const volumesPorAno = f.reduce((acc: any, curr) => {
      const ano = new Date(curr.DATA).getFullYear();
      acc[ano] = (acc[ano] || 0) + curr.VENDAS;
      return acc;
    }, {});

    const anosOrdenados = Object.keys(volumesPorAno).map(Number).sort((a, b) => b - a);
    return anosOrdenados.map((ano, index) => {
      const volAtual = volumesPorAno[ano];
      const anoAnterior = ano - 1;
      const volAnterior = volumesPorAno[anoAnterior];
      let cresc = 0;
      if (volAnterior) cresc = ((volAtual - volAnterior) / volAnterior) * 100;
      return { ano, cresc, volAtual };
    });
  }, [dados, regiaoSelecionada, produtosSelecionados, segmentosSelecionados]);

  // --- MARKET SHARE PARA OS MINI GRÁFICOS ---
  const shareData = useMemo(() => {
    const baseAno = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    const agrupar = (chave: string) => {
      const total = baseAno.reduce((a, b) => a + b.VENDAS, 0);
      const m = baseAno.reduce((acc: any, curr) => {
        const label = curr[chave] || 'N/I';
        acc[label] = (acc[label] || 0) + curr.VENDAS;
        return acc;
      }, {});
      return Object.keys(m).map(name => ({ name, value: m[name], percent: (m[name]/total)*100 })).sort((a,b)=>b.value-a.value);
    };
    return { regioes: agrupar('Região Geográfica'), produtos: agrupar('PRODUTO'), segmentos: agrupar('SEGMENTO') };
  }, [dados, anoSelecionado]);

  // --- DADOS PARA MAPA E RANKING ---
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

  const MiniDonut = ({ data, titulo, selecionado, setSelecionado, isMulti = false }: any) => (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
      <div className="w-20 h-20 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none" onClick={(e) => isMulti ? setSelecionado((p:any) => p.includes(e.name) ? p.filter((i:any)=>i!==e.name) : [...p, e.name]) : setSelecionado(selecionado === e.name ? 'Brasil Inteiro' : e.name)}>
              {data.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={isMulti ? (selecionado.includes(_.name) || selecionado.length === 0 ? 1 : 0.3) : (selecionado === _.name || selecionado === 'Brasil Inteiro' ? 1 : 0.3)} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-tighter italic">{titulo}</h4>
        {data.slice(0, 2).map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-[10px] font-bold truncate">
            <span className="text-slate-500 truncate">{item.name}</span>
            <span className="text-blue-600 ml-1">{item.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-900 uppercase">Acessando ANP...</div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><button onClick={() => signIn('google')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black">ENTRAR NO SISTEMA</button></div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1700px] mx-auto">
        
        <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-blue-900 italic">ANP|INSIGHTS</h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Analista: {session.user?.name}</p>
              </div>
              <Link href="/projeções" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg">➔ Projeções</Link>
            </div>

            {/* SELETOR DE ANO + PERFORMANCE YOY */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-1.5">
                {metricasYOY.slice(0, 6).map(({ ano }) => (
                  <button key={ano} onClick={() => setAnoSelecionado(ano)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${anoSelecionado === ano ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{ano}</button>
                ))}
              </div>
              {/* LINHA DE CRESCIMENTO PERCENTUAL */}
              <div className="flex gap-4 px-2">
                {metricasYOY.slice(0, 5).map(({ ano, cresc }) => (
                  <div key={ano} className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase italic leading-none mb-1">{ano}/{ano-1}</span>
                    <span className={`text-[11px] font-black ${cresc >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {cresc > 0 ? '+' : ''}{cresc.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TRÊS GRÁFICOS DE SHARE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
            <MiniDonut data={shareData.regioes} titulo="Share por Região" selecionado={regiaoSelecionada} setSelecionado={setRegiaoSelecionada} />
            <MiniDonut data={shareData.produtos} titulo="Mix de Produtos" selecionado={produtosSelecionados} setSelecionado={setProdutosSelecionados} isMulti={true} />
            <MiniDonut data={shareData.segmentos} titulo="Canais / Segmentos" selecionado={segmentosSelecionados} setSelecionado={setSegmentosSelecionados} isMulti={true} />
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* MAPA */}
          <div className="w-full xl:w-[550px] shrink-0 sticky top-8 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white overflow-hidden relative">
              <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 italic">Volume Total Filtrado</h4>
              <div className="text-5xl font-black tracking-tighter relative z-10">{totalFiltro.toLocaleString('pt-BR')} <span className="text-xl opacity-60">m³</span></div>
              <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-[10rem] font-black italic">BI</div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Foco por UF (% Share)</h3>
              <div className="aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: mapConfigs[regiaoSelecionada]?.scale || 950, center: mapConfigs[regiaoSelecionada]?.center || [-55, -15] }}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }: any) => geographies.map((geo: any) => {
                      const sigla = geo.properties.sigla;
                      const data = estatisticasEstado.find(s => s.id === sigla);
                      const pertence = regiaoSelecionada === 'Brasil Inteiro' || dados.find(d => d.UF === sigla)?.['Região Geográfica'] === regiaoSelecionada;
                      return <Geography key={geo.rsmKey} geography={geo} fill={pertence ? (data ? colorScale(data.vendas) : "#f1f5f9") : "#f8fafc"} stroke={pertence ? "#ffffff" : "#f1f5f9"} strokeWidth={0.8} style={{ default: { outline: "none" }, hover: { fill: pertence ? "#facc15" : "#f8fafc" } }} />;
                    })}
                  </Geographies>
                  {estatisticasEstado.map((estado) => {
                    const coords = centrosEstados[estado.id];
                    if (!coords || estado.share < 0.6) return null;
                    return (
                      <Marker key={estado.id} coordinates={coords}>
                        <text textAnchor="middle" y={2} style={{ fontSize: regiaoSelecionada === "Brasil Inteiro" ? "12px" : "16px", fontWeight: 900, fill: "#1e3a8a", pointerEvents: "none", paintOrder: "stroke", stroke: "#ffffff", strokeWidth: "3.2px" }}>{estado.share.toFixed(1)}%</text>
                      </Marker>
                    );
                  })}
                </ComposableMap>
              </div>
            </div>
          </div>

          {/* RANKING */}
          <div className="flex-1 min-w-[350px] bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest italic">Ranking de Performance Regional</h3>
            <div className="overflow-y-auto max-h-[850px] pr-2 custom-scrollbar">
              <div style={{ height: `${Math.max(500, estatisticasEstado.length * 45)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={estatisticasEstado} margin={{ left: 10, right: 120 }}>
                    <CartesianGrid horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nomeCompleto" type="category" width={180} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e3a8a', textAnchor: 'start' }} dx={-175} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
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