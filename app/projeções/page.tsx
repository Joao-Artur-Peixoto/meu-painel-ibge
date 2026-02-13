'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecaoFiltrosCompletos() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados para os Filtros
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [ufSelecionada, setUfSelecionada] = useState<string>('Todas as UFs');
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('Todos os Produtos');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado na pasta public.");
        return res.json();
      })
      .then((data) => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // 1. Lista de Regiões
  const listaRegioes = useMemo(() => {
    const regioes = dadosBrutos.map(d => d['Região Geográfica']).filter(Boolean);
    return ['Brasil Inteiro', ...new Set(regioes)].sort();
  }, [dadosBrutos]);

  // 2. Lista de UFs (Filtra baseado na Região)
  const listaUFs = useMemo(() => {
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = dadosBrutos.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    const ufs = filtrados.map(d => d['UNIDADE DA FEDERAÇÃO']).filter(Boolean);
    return ['Todas as UFs', ...new Set(ufs)].sort();
  }, [dadosBrutos, regiaoSelecionada]);

  // 3. Lista de Produtos (Filtra baseado na Região e UF para garantir que o produto exista nessa localidade)
  const listaProdutos = useMemo(() => {
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    if (ufSelecionada !== 'Todas as UFs') {
      filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    }
    const produtos = filtrados.map(d => d['PRODUTO']).filter(Boolean);
    return ['Todos os Produtos', ...new Set(produtos)].sort();
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada]);

  // Resets automáticos para manter a integridade dos dados
  useEffect(() => { setUfSelecionada('Todas as UFs'); }, [regiaoSelecionada]);
  useEffect(() => { setProdutoSelecionado('Todos os Produtos'); }, [ufSelecionada]);

  // 4. Filtragem Final e Agrupamento
  const dadosFiltradosAgrupados = useMemo(() => {
    let filtrados = [...dadosBrutos];

    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    if (ufSelecionada !== 'Todas as UFs') {
      filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    }
    if (produtoSelecionado !== 'Todos os Produtos') {
      filtrados = filtrados.filter(d => d['PRODUTO'] === produtoSelecionado);
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
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada, produtoSelecionado]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen font-black">ERRO: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="max-w-[1500px] mx-auto">
        
        <header className="mb-6">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-blue-400 mb-2 block italic">
            ← Voltar ao Dashboard
          </Link>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Projeções <span className="text-blue-500">Multifiltro</span>
          </h1>
        </header>

        {/* PAINEL DE CONTROLE (FILTROS) */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 mb-8 backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 1. Região */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">1. Região Geográfica</p>
              <div className="flex flex-wrap gap-2">
                {listaRegioes.map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                      regiaoSelecionada === r ? 'bg-blue-600 border-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}>{r}</button>
                ))}
              </div>
            </div>

            {/* 2. UF */}
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">2. Unidade da Federação</p>
              <select value={ufSelecionada} onChange={(e) => setUfSelecionada(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-3 font-bold outline-none hover:border-slate-500 transition-all cursor-pointer">
                {listaUFs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>

            {/* 3. Produto */}
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">3. Seleção de Produto</p>
              <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-3 font-bold outline-none hover:border-slate-500 transition-all cursor-pointer">
                {listaProdutos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

          </div>
        </section>

        {/* GRÁFICO */}
        <section className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl h-[580px] relative overflow-hidden">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-2xl font-black italic uppercase leading-none">
                {produtoSelecionado === 'Todos os Produtos' ? 'Mercado Total' : produtoSelecionado}
              </h3>
              <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-2 italic">
                {ufSelecionada !== 'Todas as UFs' ? ufSelecionada : regiaoSelecionada}
              </p>
            </div>
            <div className="flex gap-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                <span className="text-[9px] font-black uppercase text-slate-400">Histórico</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_8px_#eab308]"></div>
                <span className="text-[9px] font-black uppercase text-slate-400">Projeção</span>
              </div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            {dadosFiltradosAgrupados.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosFiltradosAgrupados} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="ano" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={15} />
                  <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => (val / 1000000).toFixed(1) + 'M'} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px' }}
                    formatter={(val: number) => [new Intl.NumberFormat('pt-BR').format(Math.floor(val)) + ' m³', 'Total']}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} animationDuration={1000}>
                    {dadosFiltradosAgrupados.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />
                    ))}
                    <LabelList 
                      dataKey="total" position="top" fill="#64748b" fontSize={10} fontWeight="bold"
                      formatter={(val: number) => (val / 1000000).toFixed(2) + 'M'}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 font-black uppercase text-xs gap-4 italic animate-pulse">
                <div className="w-8 h-8 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
                Cruzando dados...
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 flex justify-between items-center text-slate-600">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Análise Preditiva ANP | Prophet Model</span>
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">{dadosBrutos.length.toLocaleString('pt-BR')} registros na base</span>
        </footer>
      </div>
    </main>
  );
}