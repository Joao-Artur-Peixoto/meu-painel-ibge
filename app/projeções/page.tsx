'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecaoFiltrosHierarquicos() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados para os Filtros
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [ufSelecionada, setUfSelecionada] = useState<string>('Todas as UFs');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado.");
        return res.json();
      })
      .then((data) => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // 1. Extrair lista de regiões únicas
  const listaRegioes = useMemo(() => {
    const regioes = dadosBrutos.map(d => d['Região Geográfica']).filter(Boolean);
    return ['Brasil Inteiro', ...new Set(regioes)].sort();
  }, [dadosBrutos]);

  // 2. Extrair lista de UFs baseada na Região selecionada
  const listaUFs = useMemo(() => {
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = dadosBrutos.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    const ufs = filtrados.map(d => d['UNIDADE DA FEDERAÇÃO']).filter(Boolean);
    return ['Todas as UFs', ...new Set(ufs)].sort();
  }, [dadosBrutos, regiaoSelecionada]);

  // Resetar a UF quando a região mudar
  useEffect(() => {
    setUfSelecionada('Todas as UFs');
  }, [regiaoSelecionada]);

  // 3. Filtragem final e Agrupamento por Ano
  const dadosFiltradosAgrupados = useMemo(() => {
    let filtrados = [...dadosBrutos];

    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    
    if (ufSelecionada !== 'Todas as UFs') {
      filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    }

    const mapa = filtrados.reduce((acc: any, curr) => {
      const ano = curr.DATA.substring(0, 4);
      if (!acc[ano]) {
        acc[ano] = { ano, total: 0, tipo: curr.TIPO };
      }
      const valor = parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      acc[ano].total += valor;
      return acc;
    }, {});

    return Object.values(mapa).sort((a: any, b: any) => parseInt(a.ano) - parseInt(b.ano));
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen font-bold">ERRO: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-8">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-blue-400 mb-4 block italic">
            ← Voltar ao Dashboard
          </Link>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Análise Geográfica <span className="text-blue-500">Detelhada</span>
          </h1>
        </header>

        {/* ÁREA DE FILTROS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          
          {/* Filtro 1: Região (Botões) */}
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">1. Região Geográfica:</p>
            <div className="flex flex-wrap gap-2">
              {listaRegioes.map(regiao => (
                <button
                  key={regiao}
                  onClick={() => setRegiaoSelecionada(regiao)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    regiaoSelecionada === regiao 
                    ? 'bg-blue-600 border-blue-400 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {regiao}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro 2: UF (Select) */}
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] backdrop-blur-md flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">2. Unidade da Federação:</p>
            <select 
              value={ufSelecionada}
              onChange={(e) => setUfSelecionada(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-3 font-bold appearance-none cursor-pointer outline-none hover:border-slate-500 transition-all"
            >
              {listaUFs.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

        </section>

        {/* GRÁFICO */}
        <section className="bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-800 shadow-2xl h-[550px] relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h3 className="text-xl font-black italic uppercase">
                Resultados: <span className="text-blue-500">{ufSelecionada !== 'Todas as UFs' ? ufSelecionada : regiaoSelecionada}</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest italic">Volume Total Anual (m³)</p>
            </div>
            
            <div className="flex gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                 <span className="text-[9px] font-black uppercase text-slate-400">Histórico</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                 <span className="text-[9px] font-black uppercase text-slate-400">Projeção</span>
               </div>
            </div>
          </div>

          <div className="h-[380px] w-full">
            {dadosFiltradosAgrupados.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosFiltradosAgrupados} margin={{ top: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="ano" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={15} />
                  <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => (val / 1000000).toFixed(1) + 'M'} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px' }}
                    formatter={(val: number) => [new Intl.NumberFormat('pt-BR').format(Math.floor(val)) + ' m³', 'Volume']}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {dadosFiltradosAgrupados.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />
                    ))}
                    <LabelList 
                      dataKey="total" 
                      position="top" 
                      fill="#64748b" 
                      fontSize={10} 
                      fontWeight="bold"
                      formatter={(val: number) => (val / 1000000).toFixed(1) + 'M'}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-xs tracking-[0.5em] italic">
                Nenhum dado encontrado para esta seleção.
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 flex justify-between items-center text-slate-600">
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">Registros Atuais: {dadosFiltradosAgrupados.length} Anos Processados</span>
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">Fonte: ANP / Inteligência Preditiva</span>
        </footer>
      </div>
    </main>
  );
}