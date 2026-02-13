'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend
} from 'recharts';
import Link from 'next/link';

export default function PainelEstrategicoANP() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // --- ESTADOS FILTROS GRÁFICO 1 ---
  const [reg1, setReg1] = useState('Brasil Inteiro');
  const [uf1, setUf1] = useState('Todas as UFs');
  const [prod1, setProd1] = useState('Todos os Produtos');
  const [seg1, setSeg1] = useState('Todos os Segmentos');

  // --- ESTADOS FILTROS GRÁFICOS 2 E 3 (ESTRATÉGICOS) ---
  const [prod2, setProd2] = useState('GASOLINA C');
  const [seg2, setSeg2] = useState('POSTO REVENDEDOR');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then(data => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // Formatador de 3 Algarismos Significativos
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

  // --- LÓGICA GRÁFICO 1 (VOLUME ANUAL) ---
  const dadosG1 = useMemo(() => {
    let f = dadosBrutos;
    if (reg1 !== 'Brasil Inteiro') f = f.filter(d => d['Região Geográfica'] === reg1);
    if (uf1 !== 'Todas as UFs') f = f.filter(d => d['UNIDADE DA FEDERAÇÃO'] === uf1);
    if (prod1 !== 'Todos os Produtos') f = f.filter(d => d['PRODUTO'] === prod1);
    if (seg1 !== 'Todos os Segmentos') f = f.filter(d => d['SEGMENTO'] === seg1);

    const m = f.reduce((acc: any, curr) => {
      const ano = curr.DATA.substring(0, 4);
      if (!acc[ano]) acc[ano] = { ano, total: 0, tipo: curr.TIPO };
      acc[ano].total += parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      return acc;
    }, {});
    return Object.values(m).sort((a: any, b: any) => a.ano - b.ano);
  }, [dadosBrutos, reg1, uf1, prod1, seg1]);

  // --- LÓGICA GRÁFICOS 2 E 3 (CAGR E VOLUME POR UF) ---
  const dadosEstrategicos = useMemo(() => {
    const f = dadosBrutos.filter(d => d.PRODUTO === prod2 && d.SEGMENTO === seg2);
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
    })).sort((a, b) => b.vol2028 - a.vol2028); // Ordenado pelo volume de 2028
  }, [dadosBrutos, prod2, seg2]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen">Erro: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <header className="mb-12 border-b border-slate-800 pb-6">
        <h1 className="text-5xl font-black italic tracking-tighter uppercase">Market <span className="text-blue-500">Forecasting</span></h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Plataforma de Inteligência Preditiva de Combustíveis</p>
      </header>

      {/* --- GRÁFICO 1: VOLUME TEMPORAL --- */}
      <section className="mb-16">
        <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-slate-800">
          <h2 className="text-xl font-black italic mb-6 uppercase text-blue-500">1. Evolução Temporal de Mercado</h2>
          {/* Aqui entrariam os filtros do Gráfico 1 (omitidos para brevidade) */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosG1}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ano" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} tickFormatter={v => f3(v, "")} />
                <Tooltip contentStyle={{backgroundColor: '#0f172a'}} formatter={(v:any) => f3(v)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {dadosG1.map((entry: any, i) => <Cell key={i} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />)}
                  <LabelList dataKey="total" position="top" formatter={v => f3(v, "")} fill="#94a3b8" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <hr className="border-slate-800 mb-16" />

      {/* --- SEÇÃO ESTRATÉGICA (GRÁFICOS 2 E 3) --- */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-black italic uppercase">Análise de <span className="text-emerald-500">Oportunidades</span></h2>
          <div className="flex gap-4">
             <select value={prod2} onChange={e => setProd2(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none">
                {[...new Set(dadosBrutos.map(d => d.PRODUTO))].map(p => <option key={p} value={p}>{p}</option>)}
             </select>
             <select value={seg2} onChange={e => setSeg2(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none">
                {[...new Set(dadosBrutos.map(d => d.SEGMENTO))].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* GRÁFICO 2: RANKING CAGR (Mapeamento de Crescimento %) */}
          <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[600px]">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest italic italic">2. Mapa de Crescimento (CAGR % Anual 25-28)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={dadosEstrategicos} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="uf" type="category" stroke="#475569" fontSize={10} width={100} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}} />
                <Bar dataKey="cagr" radius={[0, 4, 4, 0]}>
                  {dadosEstrategicos.map((entry, i) => (
                    <Cell key={i} fill={entry.cagr > 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                  ))}
                  <LabelList dataKey="cagr" position="right" formatter={(v:number) => `${v.toFixed(2)}%`} fill="#94a3b8" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* GRÁFICO 3: VOLUME POR UF (Ordenado do Maior para Menor) */}
          <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[600px]">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest italic">3. Volume Projetado em 2028 (Ordenado por m³)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={dadosEstrategicos} margin={{ bottom: 50 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="uf" stroke="#475569" fontSize={9} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="#475569" fontSize={10} tickFormatter={v => f3(v, "")} />
                <Tooltip contentStyle={{backgroundColor: '#0f172a'}} formatter={(v:any) => f3(v)} />
                <Bar dataKey="vol2028" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="vol2028" position="top" formatter={v => f3(v, "")} fill="#64748b" fontSize={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </section>
    </main>
  );
}