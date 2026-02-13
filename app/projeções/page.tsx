'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import Link from 'next/link';

// URL do GeoJSON dos estados brasileiros
const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

export default function PainelEstrategicoCompleto() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // --- FILTROS GRÁFICO 1 (TEMPORAL) ---
  const [reg1, setReg1] = useState('Brasil Inteiro');
  const [uf1, setUf1] = useState('Todas as UFs');
  const [prod1, setProd1] = useState('Todos os Produtos');
  const [seg1, setSeg1] = useState('Todos os Segmentos');

  // --- FILTROS GRÁFICOS 2 E 3 (ESTRATÉGICOS) ---
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

  // --- LÓGICA FILTROS CASCATA GRÁFICO 1 ---
  const listaRegioes = useMemo(() => ['Brasil Inteiro', ...new Set(dadosBrutos.map(d => d['Região Geográfica']).filter(Boolean))].sort(), [dadosBrutos]);
  const listaUFs = useMemo(() => {
    let f = reg1 === 'Brasil Inteiro' ? dadosBrutos : dadosBrutos.filter(d => d['Região Geográfica'] === reg1);
    return ['Todas as UFs', ...new Set(f.map(d => d['UNIDADE DA FEDERAÇÃO']).filter(Boolean))].sort();
  }, [dadosBrutos, reg1]);
  const listaProds = useMemo(() => ['Todos os Produtos', ...new Set(dadosBrutos.map(d => d.PRODUTO).filter(Boolean))].sort(), [dadosBrutos]);
  const listaSegs = useMemo(() => ['Todos os Segmentos', ...new Set(dadosBrutos.map(d => d.SEGMENTO).filter(Boolean))].sort(), [dadosBrutos]);

  // --- DADOS GRÁFICO 1 ---
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

  // --- DADOS GRÁFICOS 2 E 3 (CAGR E VOLUME) ---
  const dadosEstrategicos = useMemo(() => {
    let f = dadosBrutos;
    if (prod2 !== 'Todos os Produtos') f = f.filter(d => d.PRODUTO === prod2);
    if (seg2 !== 'Todos os Segmentos') f = f.filter(d => d.SEGMENTO === seg2);

    const ufsMap = f.reduce((acc: any, curr) => {
      const uf = curr['UNIDADE DA FEDERAÇÃO'];
      const ano = curr.DATA.substring(0, 4);
      if (!acc[uf]) acc[uf] = { uf, v2025: 0, v2028: 0 };
      const val = parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      if (ano === '2025') acc[uf].v2025 += val;
      if (ano === '2028') acc[uf].v2028 += val;
      return acc;
    }, {});

    return Object.values(ufsMap).map((d: any) => ({
      uf: d.uf,
      cagr: d.v2025 > 0 ? (Math.pow(d.v2028 / d.v2025, 1/3) - 1) * 100 : 0,
      vol2028: d.v2028
    })).sort((a, b) => b.vol2028 - a.vol2028);
  }, [dadosBrutos, prod2, seg2]);

  // Escala de cores para o Mapa (Vermelho para queda, Verde para crescimento)
  const colorScale = scaleQuantize<string>()
    .domain([-5, 5])
    .range(["#ef4444", "#f87171", "#94a3b8", "#4ade80", "#22c55e"]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <header className="mb-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">ANP <span className="text-blue-500">Predictive Hub</span></h1>
      </header>

      {/* --- SEÇÃO GRÁFICO 1 --- */}
      <section className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 mb-12">
        <div className="grid grid-cols-4 gap-4 mb-8">
           {/* Filtros restaurados */}
           <select value={reg1} onChange={e => setReg1(e.target.value)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold">{listaRegioes.map(r => <option key={r} value={r}>{r}</option>)}</select>
           <select value={uf1} onChange={e => setUf1(e.target.value)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold">{listaUFs.map(u => <option key={u} value={u}>{u}</option>)}</select>
           <select value={prod1} onChange={e => setProd1(e.target.value)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold">{listaProds.map(p => <option key={p} value={p}>{p}</option>)}</select>
           <select value={seg1} onChange={e => setSeg1(e.target.value)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold">{listaSegs.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosG1}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="ano" stroke="#475569" fontSize={11} />
              <YAxis tickFormatter={v => f3(v, "")} stroke="#475569" fontSize={11} />
              <Tooltip contentStyle={{backgroundColor: '#0f172a'}} formatter={(v:any) => f3(v)} />
              <Bar dataKey="total">
                {dadosG1.map((entry: any, i) => <Cell key={i} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />)}
                <LabelList dataKey="total" position="top" formatter={v => f3(v, "")} fill="#94a3b8" fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* --- SEÇÃO ESTRATÉGICA (MAPA + VOLUME) --- */}
      <div className="mb-6 flex gap-4 items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <span className="text-xs font-black uppercase text-slate-500 italic">Filtros Estratégicos (Gráficos 2 e 3):</span>
        <select value={prod2} onChange={e => setProd2(e.target.value)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold">{listaProds.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <select value={seg2} onChange={e => setSeg2(e.target.value)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold">{listaSegs.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRÁFICO 2: MAPA DE CALOR CAGR */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[650px] overflow-hidden">
          <h2 className="text-sm font-black uppercase mb-4 text-blue-500 italic">2. Mapa de Crescimento CAGR % (25-28)</h2>
          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 900, center: [-54, -15] }} style={{ width: "100%", height: "90%" }}>
            <Geographies geography={geoUrl}>
              {({ geographies }) => geographies.map((geo) => {
                const ufNome = geo.properties.name.toUpperCase();
                const d = dadosEstrategicos.find(item => item.uf.toUpperCase() === ufNome);
                return (
                  <Geography 
                    key={geo.rsmKey} 
                    geography={geo} 
                    fill={d ? colorScale(d.cagr) : "#1e293b"}
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    style={{ hover: { fill: "#3b82f6", outline: "none" } }}
                  />
                );
              })}
            </Geographies>
          </ComposableMap>
        </div>

        {/* GRÁFICO 3: VOLUME POR UF ORDENADO */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[650px]">
          <h2 className="text-sm font-black uppercase mb-4 text-blue-500 italic">3. Volume Projetado em 2028 (m³)</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dadosEstrategicos} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="uf" type="category" stroke="#475569" fontSize={9} width={110} />
              <Tooltip contentStyle={{backgroundColor: '#0f172a'}} formatter={(v:any) => f3(v)} />
              <Bar dataKey="vol2028" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="vol2028" position="right" formatter={v => f3(v, "")} fill="#94a3b8" fontSize={9} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}