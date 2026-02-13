'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import Link from 'next/link';

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const centroidesUF: { [key: string]: [number, number] } = {
  "AC": [-70, -9], "AL": [-36.5, -9.5], "AP": [-51, 1.5], "AM": [-64, -4], "BA": [-41, -12],
  "CE": [-39, -5], "DF": [-47.9, -15.8], "ES": [-40.3, -19], "GO": [-49, -16], "MA": [-45, -5],
  "MT": [-56, -13], "MS": [-54, -20], "MG": [-44, -18], "PA": [-52, -4], "PB": [-36.5, -7],
  "PR": [-51, -24.5], "PE": [-37.5, -8.5], "PI": [-42, -7.5], "RJ": [-42.5, -22.5], "RN": [-36.5, -5.5],
  "RS": [-53, -30], "RO": [-63, -11], "RR": [-61, 2], "SC": [-50, -27], "SP": [-49, -22],
  "SE": [-37, -10.5], "TO": [-48, -10]
};

export default function PainelEstrategicoConsolidado() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // --- ESTADOS FILTROS GRÁFICO 1 ---
  const [reg1, setReg1] = useState('Brasil Inteiro');
  const [uf1, setUf1] = useState('Todas as UFs');
  const [prod1, setProd1] = useState('Todos os Produtos');
  const [seg1, setSeg1] = useState('Todos os Segmentos');

  // --- ESTADOS FILTROS ESTRATÉGICOS (2 E 3) ---
  const [prod2, setProd2] = useState('Todos os Produtos');
  const [seg2, setSeg2] = useState('Todos os Segmentos');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then(data => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // Formatador de 3 Algarismos
  const f3 = (valor: number, unidade = "m³") => {
    if (valor === 0) return `0 ${unidade}`;
    const absV = Math.abs(valor);
    let n: string, s = "";
    if (absV >= 1e9) { n = (valor/1e9).toPrecision(3); s = "B"; }
    else if (absV >= 1e6) { n = (valor/1e6).toPrecision(3); s = "M"; }
    else if (absV >= 1e3) { n = (valor/1e3).toPrecision(3); s = "K"; }
    else { n = valor.toPrecision(3); }
    return `${parseFloat(n)}${s} ${unidade}`;
  };

  // --- LÓGICA DE FILTROS EM CASCATA (G1) ---
  const listaReg1 = useMemo(() => ['Brasil Inteiro', ...new Set(dadosBrutos.map(d => d['Região Geográfica']).filter(Boolean))].sort(), [dadosBrutos]);
  const listaUF1 = useMemo(() => {
    let f = reg1 === 'Brasil Inteiro' ? dadosBrutos : dadosBrutos.filter(d => d['Região Geográfica'] === reg1);
    return ['Todas as UFs', ...new Set(f.map(d => d['UNIDADE DA FEDERAÇÃO']).filter(Boolean))].sort();
  }, [dadosBrutos, reg1]);
  const listaProdGlobal = useMemo(() => ['Todos os Produtos', ...new Set(dadosBrutos.map(d => d.PRODUTO).filter(Boolean))].sort(), [dadosBrutos]);
  const listaSegGlobal = useMemo(() => ['Todos os Segmentos', ...new Set(dadosBrutos.map(d => d.SEGMENTO).filter(Boolean))].sort(), [dadosBrutos]);

  // --- PROCESSAMENTO DADOS G1 ---
  const dadosG1 = useMemo(() => {
    let f = dadosBrutos;
    if (reg1 !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === reg1);
    if (uf1 !== 'Todas as UFs') f = f.filter(d => d['UNIDADE DA FEDERAÇÃO'] === uf1);
    if (prod1 !== 'Todos os Produtos') f = f.filter(d => d.PRODUTO === prod1);
    if (seg1 !== 'Todos os Segmentos') f = f.filter(d => d.SEGMENTO === seg1);

    const m = f.reduce((acc: any, curr) => {
      const ano = curr.DATA.substring(0, 4);
      if (!acc[ano]) acc[ano] = { ano, total: 0, tipo: curr.TIPO };
      acc[ano].total += parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      return acc;
    }, {});
    return Object.values(m).sort((a: any, b: any) => a.ano - b.ano);
  }, [dadosBrutos, reg1, uf1, prod1, seg1]);

  // --- PROCESSAMENTO DADOS G2 E G3 ---
  const dadosEstrategicos = useMemo(() => {
    let f = dadosBrutos;
    if (prod2 !== 'Todos os Produtos') f = f.filter(d => d.PRODUTO === prod2);
    if (seg2 !== 'Todos os Segmentos') f = f.filter(d => d.SEGMENTO === seg2);

    const ufsMap = f.reduce((acc: any, curr) => {
      const uf = curr['UNIDADE DA FEDERAÇÃO'];
      const sigla = curr['UF'];
      const ano = curr.DATA.substring(0, 4);
      if (!acc[uf]) acc[uf] = { uf, sigla, v2025: 0, v2028: 0 };
      const val = parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      if (ano === '2025') acc[uf].v2025 += val;
      if (ano === '2028') acc[uf].v2028 += val;
      return acc;
    }, {});

    return Object.values(ufsMap).map((d: any) => {
      const cagr = d.v2025 > 0 ? (Math.pow(d.v2028 / d.v2025, 1/3) - 1) : 0;
      return { ...d, cagr: cagr * 100, volIncremental: d.v2025 * cagr };
    }).sort((a, b) => b.volIncremental - a.volIncremental);
  }, [dadosBrutos, prod2, seg2]);

  const colorScale = scaleQuantize<string>()
    .domain([-5, 5])
    .range(["#ef4444", "#f87171", "#475569", "#4ade80", "#22c55e"]);

  const alturaGraficoUFs = Math.max(600, dadosEstrategicos.length * 40);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <nav className="mb-6">
        <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-blue-400 italic">
          ← Voltar ao Dashboard Principal
        </Link>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Market <span className="text-blue-500">Intelligence</span> Hub</h1>
      </header>

      {/* --- GRÁFICO 1: VOLUME TEMPORAL --- */}
      <section className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 mb-12 shadow-2xl">
        <h2 className="text-sm font-black uppercase mb-6 text-blue-500 italic">1. Volume Consolidado Anual</h2>
        
        {/* Filtros G1 Restaurados */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
           <select value={reg1} onChange={e => { setReg1(e.target.value); setUf1('Todas as UFs'); }} className="bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none border border-slate-700">{listaReg1.map(r => <option key={r} value={r}>{r}</option>)}</select>
           <select value={uf1} onChange={e => setUf1(e.target.value)} className="bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none border border-slate-700">{listaUF1.map(u => <option key={u} value={u}>{u}</option>)}</select>
           <select value={prod1} onChange={e => setProd1(e.target.value)} className="bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none border border-slate-700">{listaProdGlobal.map(p => <option key={p} value={p}>{p}</option>)}</select>
           <select value={seg1} onChange={e => setSeg1(e.target.value)} className="bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none border border-slate-700">{listaSegGlobal.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>

        {/* Legenda Manual */}
        <div className="flex gap-6 mb-8 items-center bg-slate-800/30 w-fit px-6 py-3 rounded-2xl border border-slate-700">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Histórico</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Projeção</span>
           </div>
        </div>

        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosG1}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="ano" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => f3(v, "")} stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px'}} formatter={(v:any) => f3(v)} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {dadosG1.map((entry: any, i) => (
                   <Cell key={i} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />
                ))}
                <LabelList dataKey="total" position="top" formatter={v => f3(v, "")} fill="#94a3b8" fontSize={10} offset={12} fontWeight="bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* --- SEÇÃO ESTRATÉGICA (FILTROS INDEPENDENTES) --- */}
      <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 mb-8 backdrop-blur-sm">
        <span className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Filtros Estratégicos (Gráficos 2 e 3):</span>
        <select value={prod2} onChange={e => setProd2(e.target.value)} className="bg-slate-800 p-2.5 rounded-xl text-xs font-bold outline-none border border-slate-700">{listaProdGlobal.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <select value={seg2} onChange={e => setSeg2(e.target.value)} className="bg-slate-800 p-2.5 rounded-xl text-xs font-bold outline-none border border-slate-700">{listaSegGlobal.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* GRÁFICO 2: MAPA */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[700px] flex flex-col shadow-2xl">
          <h2 className="text-xs font-black uppercase mb-4 text-blue-500 italic tracking-widest">2. Mapa de Crescimento CAGR %</h2>
          <div className="flex-1 w-full overflow-hidden">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 900, center: [-54, -15] }} style={{ width: "100%", height: "100%" }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) => geographies.map((geo) => {
                  const ufNome = geo.properties.name.toUpperCase();
                  const d = dadosEstrategicos.find(item => item.uf.toUpperCase() === ufNome);
                  return <Geography key={geo.rsmKey} geography={geo} fill={d ? colorScale(d.cagr) : "#1e293b"} stroke="#0f172a" strokeWidth={0.5} />;
                })}
              </Geographies>
              {dadosEstrategicos.map((d) => centroidesUF[d.sigla] && (
                <Marker key={d.sigla} coordinates={centroidesUF[d.sigla]}>
                  <text textAnchor="middle" style={{ fontSize: "10px", fontWeight: "900", fill: "#fff", paintOrder: "stroke", stroke: "#000", strokeWidth: "2px" }}>
                    {d.cagr > 0 ? `+${d.cagr.toFixed(1)}%` : `${d.cagr.toFixed(1)}%`}
                  </text>
                </Marker>
              ))}
            </ComposableMap>
          </div>
        </div>

        {/* GRÁFICO 3: RANKING DE VOLUME */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 overflow-y-auto max-h-[700px] shadow-2xl scrollbar-hide">
          <h2 className="text-xs font-black uppercase mb-1 text-blue-500 italic tracking-widest">3. Volume Incremental Médio Anual</h2>
          <p className="text-[9px] text-slate-500 uppercase font-bold mb-6 italic">(m³ adicionais/ano baseados no CAGR x 2025)</p>
          <div style={{ height: `${alturaGraficoUFs}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosEstrategicos} layout="vertical" margin={{ right: 60, left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="uf" type="category" stroke="#cbd5e1" fontSize={12} fontWeight="bold" width={140} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(v:any) => f3(v)} contentStyle={{borderRadius: '12px', backgroundColor: '#0f172a'}} />
                <Bar dataKey="volIncremental" radius={[0, 6, 6, 0]}>
                  {dadosEstrategicos.map((entry, i) => <Cell key={i} fill={entry.volIncremental > 0 ? '#10b981' : '#ef4444'} />)}
                  <LabelList dataKey="volIncremental" position="right" formatter={v => f3(v, "")} fill="#94a3b8" fontSize={11} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}