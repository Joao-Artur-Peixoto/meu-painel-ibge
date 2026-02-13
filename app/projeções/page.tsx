'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecaoFiltros() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estado para o Filtro de Região
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado.");
        return res.json();
      })
      .then((data) => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // Extrair lista de regiões únicas para os botões
  const listaRegioes = useMemo(() => {
    const regioes = dadosBrutos
      .map(d => d['Região Geográfica'])
      .filter(Boolean);
    return ['Brasil Inteiro', ...new Set(regioes)].sort();
  }, [dadosBrutos]);

  // Agrupamento de dados filtrados por região e depois por ano
  const dadosFiltradosAgrupados = useMemo(() => {
    // 1. Filtrar por região se não for "Brasil Inteiro"
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = dadosBrutos.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }

    // 2. Agrupar por ano
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
  }, [dadosBrutos, regiaoSelecionada]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen font-bold italic">ERRO: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-8">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-blue-400 mb-4 block">
            ← Voltar ao Dashboard
          </Link>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Análise por <span className="text-blue-500">Região Geográfica</span>
          </h1>
        </header>

        {/* SEÇÃO DE FILTROS - BOTÕES DE REGIÃO */}
        <section className="mb-10 p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-2 italic">
            Selecione o Recorte Geográfico:
          </p>
          <div className="flex flex-wrap gap-3">
            {listaRegioes.map(regiao => (
              <button
                key={regiao}
                onClick={() => setRegiaoSelecionada(regiao)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                  regiaoSelecionada === regiao 
                  ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-105' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                {regiao}
              </button>
            ))}
          </div>
        </section>

        {/* GRÁFICO PRINCIPAL */}
        <section className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl h-[550px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-2xl font-black italic uppercase">Vendas: <span className="text-blue-500">{regiaoSelecionada}</span></h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest italic">Consolidado Anual em m³</p>
            </div>
            
            <div className="flex gap-6 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Histórico</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Projeção</span>
               </div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            {dadosFiltradosAgrupados.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosFiltradosAgrupados}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="ano" 
                    stroke="#475569" 
                    fontSize={11} 
                    axisLine={false} 
                    tickLine={false} 
                    tickMargin={15}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={11} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => (val / 1000000).toFixed(0) + 'M'} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px' }}
                    formatter={(val: number) => [new Intl.NumberFormat('pt-BR').format(Math.floor(val)) + ' m³', 'Volume Total']}
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
              <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-xs tracking-widest italic animate-pulse">
                Filtrando registros geográficos...
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 flex justify-between items-center text-slate-600">
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">Base de Dados ANP | {dadosBrutos.length.toLocaleString('pt-BR')} registros</span>
           <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 italic">Modelo Facebook Prophet</span>
        </footer>
      </div>
    </main>
  );
}