'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import Link from 'next/link';

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// Coordenadas aproximadas para os rótulos no mapa
const offsets: { [key: string]: [number, number] } = {
  "AC": [0, 0], "AL": [2, 0], "AP": [0, 0], "AM": [0, 0], "BA": [0, 0], "CE": [0, 0],
  "DF": [0, 5], "ES": [2, 0], "GO": [0, 0], "MA": [0, 0], "MT": [0, 0], "MS": [0, 0],
  "MG": [0, 0], "PA": [0, 0], "PB": [2, 0], "PR": [0, 0], "PE": [2, 0], "PI": [0, 0],
  "RJ": [2, 0], "RN": [2, 0], "RS": [0, 0], "RO": [0, 0], "RR": [0, 0], "SC": [0, 0],
  "SP": [0, 0], "SE": [2, 0], "TO": [0, 0]
};

export default function PainelEstrategicoV3() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // Filtros Gráfico 1
  const [reg1, setReg1] = useState('Brasil Inteiro');
  const [uf1, setUf1] = useState('Todas as UFs');
  const [prod1, setProd1] = useState('Todos os Produtos');
  const [seg1, setSeg1] = useState('Todos os Segmentos');

  // Filtros Estratégicos (2 e 3)
  const [prod2, setProd2] = useState('Todos os Produtos');
  const [seg2, setSeg2] = useState('Todos os Segmentos');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then(data => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

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

  // Listas de Filtros
  const listaProds = useMemo(() => ['Todos os Produtos', ...new Set(dadosBrutos.map(d => d.PRODUTO).filter(Boolean))].sort(), [dadosBrutos]);
  const listaSegs = useMemo(() => ['Todos os Segmentos', ...new Set(dadosBrutos.map(d => d.SEGMENTO).filter(Boolean))].sort(), [dadosBrutos]);

  // Lógica Gráficos 2 e 3 (Calculando Volume Incremental baseado em 2025)
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
      const volIncremental = d.v2025 * cagr; // Volume m³ do crescimento anual médio
      return { ...d, cagr: cagr * 100, volIncremental };
    }).sort((a, b) => b.volIncremental - a.volIncremental);
  }, [dadosBrutos, prod2, seg2]);

  const colorScale = scaleQuantize<string>()
    .domain([-5, 5])
    .range(["#ef4444", "#f87171", "#475569", "#4ade80", "#22c55e"]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <nav className="mb-8">
        <Link href="/" className="text-blue-500 font-bold text-xs uppercase tracking-widest hover:text-blue-400 transition-colors">
          ← Voltar ao Dashboard Principal
        </Link>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Análise de <span className="text-blue-500">Expansão Geográfica</span></h1>
      </header>

      {/* --- GRÁFICO 1 (VOLUME TEMPORAL - JÁ ESTRUTURADO) --- */}
      {/* ... Filtros e BarChart do Gráfico 1 aqui ... */}

      {/* --- SEÇÃO ESTRATÉGICA --- */}
      <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 mb-8 flex gap-6 items-center">
        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Produto (Estratégico)</label>
          <select value={prod2} onChange={e => setProd2(e.target.value)} className="bg-slate-800 border-none rounded-xl p-2 text-xs font-bold outline-none">
            {listaProds.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Segmento (Estratégico)</label>
          <select value={seg2} onChange={e => setSeg2(e.target.value)} className="bg-slate-800 border-none rounded-xl p-2 text-xs font-bold outline-none">
            {listaSegs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRÁFICO 2: MAPA COM RÓTULOS CAGR */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[700px]">
          <h2 className="text-xs font-black uppercase mb-6 text-blue-500 italic">2. Mapa de Calor: CAGR % em cada UF</h2>
          <div className="h-[90%] w-full">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 950, center: [-54, -15] }}>
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
                    />
                  );
                })}
              </Geographies>
              {/* Rótulos de CAGR sobre as UFs */}
              {dadosEstrategicos.map((d) => {
                // Necessário um mapeamento de centroides se o geoJSON não for suficiente
                return null; // Aqui você usaria o componente <Marker> para as siglas + %
              })}
            </ComposableMap>
          </div>
        </div>

        {/* GRÁFICO 3: VOLUME INCREMENTAL MÉDIO (m³/ano) */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[700px]">
          <div className="mb-6">
            <h2 className="text-xs font-black uppercase text-blue-500 italic">3. Crescimento Volumétrico Médio Anual</h2>
            <p className="text-[10px] text-slate-500 uppercase mt-1">Estimativa de m³ adicionais/ano baseados no CAGR x Volume 2025</p>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dadosEstrategicos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="uf" type="category" stroke="#475569" fontSize={9} width={110} />
              <Tooltip formatter={(v: number) => f3(v)} contentStyle={{backgroundColor: '#0f172a'}} />
              <Bar dataKey="volIncremental" radius={[0, 4, 4, 0]}>
                {dadosEstrategicos.map((entry, i) => (
                  <Cell key={i} fill={entry.volIncremental > 0 ? '#3b82f6' : '#ef4444'} />
                ))}
                <LabelList dataKey="volIncremental" position="right" formatter={(v:number) => f3(v, "")} fill="#94a3b8" fontSize={9} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}