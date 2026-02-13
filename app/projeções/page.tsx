'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ComposedChart, Line
} from 'recharts';
import Link from 'next/link';

export default function PainelProjecaoAvancado() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // Filtros Gráfico 1 (Histórico/Projeção)
  const [regiao1, setRegiao1] = useState('Brasil Inteiro');
  const [uf1, setUf1] = useState('Todas as UFs');
  const [prod1, setProd1] = useState('Todos os Produtos');
  const [seg1, setSeg1] = useState('Todos os Segmentos');

  // Filtros Gráfico 2 (Análise de Crescimento CAGR)
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

  // --- LÓGICA CAGR POR UF ---
  const analiseCAGR = useMemo(() => {
    // Filtra pelo Produto e Segmento específicos do Gráfico 2
    const filtrados = dadosBrutos.filter(d => d.PRODUTO === prod2 && d.SEGMENTO === seg2);
    
    const ufsMap = filtrados.reduce((acc: any, curr) => {
      const uf = curr['UNIDADE DA FEDERAÇÃO'];
      const ano = curr.DATA.substring(0, 4);
      if (!acc[uf]) acc[uf] = { uf, v2025: 0, v2028: 0 };
      
      const valor = parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      if (ano === '2025') acc[uf].v2025 += valor;
      if (ano === '2028') acc[uf].v2028 += valor;
      return acc;
    }, {});

    return Object.values(ufsMap).map((d: any) => {
      // Cálculo CAGR: ((Final/Base)^(1/3)) - 1
      const cagr = d.v2025 > 0 ? (Math.pow(d.v2028 / d.v2025, 1/3) - 1) * 100 : 0;
      // Crescimento médio anual em volume
      const volMedio = (d.v2028 - d.v2025) / 3;
      return { ...d, cagr, volMedio };
    }).sort((a, b) => b.cagr - a.cagr); // Ordena pelos que mais crescem %
  }, [dadosBrutos, prod2, seg2]);

  // Listas de filtros (únicas)
  const listaProd = useMemo(() => [...new Set(dadosBrutos.map(d => d.PRODUTO))].sort(), [dadosBrutos]);
  const listaSeg = useMemo(() => [...new Set(dadosBrutos.map(d => d.SEGMENTO))].sort(), [dadosBrutos]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <h1 className="text-4xl font-black italic uppercase mb-12 tracking-tighter">
        Intelligence <span className="text-blue-500">Center</span> ANP
      </h1>

      {/* GRÁFICO 1 - VOLUME ANUAL (OMITIDO AQUI PARA FOCO NO NOVO) */}
      <section className="mb-20 opacity-50 italic text-xs">... Gráfico 1 de Volume Anual Acima ...</section>

      {/* SEÇÃO GRÁFICO 2 - ANÁLISE ESTRATÉGICA CAGR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 bg-slate-900/80 p-6 rounded-[2rem] border border-blue-500/20 shadow-xl">
          <h2 className="text-lg font-black italic mb-6 text-blue-400 uppercase">Filtros de Estratégia</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Produto Analisado</label>
              <select value={prod2} onChange={e => setProd2(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold outline-none">
                {listaProd.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Segmento de Mercado</label>
              <select value={seg2} onChange={e => setSeg2(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold outline-none">
                {listaSeg.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* MAPA ANALÍTICO (Simulado com Tabela Heatmap) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Gráfico de Crescimento Percentual (CAGR) */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 h-[500px]">
            <h3 className="text-sm font-black uppercase mb-6 flex justify-between">
              Crescimento CAGR (26-28) <span>% Anual</span>
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={analiseCAGR.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="uf" type="category" stroke="#475569" fontSize={10} width={100} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'CAGR']}
                />
                <Bar dataKey="cagr" radius={[0, 4, 4, 0]}>
                  {analiseCAGR.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cagr > 0 ? '#10b981' : '#ef4444'} />
                  ))}
                  <LabelList dataKey="cagr" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} fill="#94a3b8" fontSize={9} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Volume Médio Adicional (m³) */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 h-[500px]">
            <h3 className="text-sm font-black uppercase mb-6 flex justify-between">
              Volume Médio Incremental <span>m³/Ano</span>
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={analiseCAGR.slice(0, 10)}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="uf" stroke="#475569" fontSize={9} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#475569" fontSize={9} tickFormatter={v => f3(v, "")} />
                <Tooltip formatter={(v: number) => [f3(v), 'Incr. Médio']} contentStyle={{backgroundColor: '#0f172a'}} />
                <Bar dataKey="volMedio" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="volMedio" position="top" formatter={(v: number) => f3(v, "")} fill="#64748b" fontSize={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </main>
  );
}