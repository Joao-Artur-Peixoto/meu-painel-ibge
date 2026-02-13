'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecaoCompleta() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados para os Filtros
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [ufSelecionada, setUfSelecionada] = useState<string>('Todas as UFs');
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('Todos os Produtos');
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<string>('Todos os Segmentos');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado.");
        return res.json();
      })
      .then((data) => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // --- FUNÇÃO DE FORMATAÇÃO ADAPTATIVA COM m³ ---
  const formatadorDinamico = (valor: number) => {
    if (valor === 0) return "0 m³";
    const absValor = Math.abs(valor);
    let resultado = "";
    
    if (absValor >= 1_000_000_000) resultado = (valor / 1_000_000_000).toFixed(2) + 'B';
    else if (absValor >= 1_000_000) resultado = (valor / 1_000_000).toFixed(2) + 'M';
    else if (absValor >= 1_000) resultado = (valor / 1_000).toFixed(1) + 'K';
    else resultado = valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

    return `${resultado} m³`;
  };

  // --- LÓGICA DE LISTAS PARA FILTROS (CASCATA) ---
  const listaRegioes = useMemo(() => {
    const regioes = dadosBrutos.map(d => d['Região Geográfica']).filter(Boolean);
    return ['Brasil Inteiro', ...new Set(regioes)].sort();
  }, [dadosBrutos]);

  const listaUFs = useMemo(() => {
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') {
      filtrados = dadosBrutos.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    }
    const ufs = filtrados.map(d => d['UNIDADE DA FEDERAÇÃO']).filter(Boolean);
    return ['Todas as UFs', ...new Set(ufs)].sort();
  }, [dadosBrutos, regiaoSelecionada]);

  const listaProdutos = useMemo(() => {
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (ufSelecionada !== 'Todas as UFs') filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    const produtos = filtrados.map(d => d['PRODUTO']).filter(Boolean);
    return ['Todos os Produtos', ...new Set(produtos)].sort();
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada]);

  const listaSegmentos = useMemo(() => {
    let filtrados = dadosBrutos;
    if (regiaoSelecionada !== 'Brasil Inteiro') filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (ufSelecionada !== 'Todas as UFs') filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    if (produtoSelecionado !== 'Todos os Produtos') filtrados = filtrados.filter(d => d['PRODUTO'] === produtoSelecionado);
    
    const segmentos = filtrados.map(d => d['SEGMENTO']).filter(Boolean);
    return ['Todos os Segmentos', ...new Set(segmentos)].sort();
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada, produtoSelecionado]);

  // Resets automáticos ao mudar o filtro pai
  useEffect(() => { setUfSelecionada('Todas as UFs'); }, [regiaoSelecionada]);
  useEffect(() => { setProdutoSelecionado('Todos os Produtos'); }, [ufSelecionada]);
  useEffect(() => { setSegmentoSelecionado('Todos os Segmentos'); }, [produtoSelecionado]);

  // --- FILTRAGEM FINAL ---
  const dadosFiltradosAgrupados = useMemo(() => {
    let filtrados = [...dadosBrutos];
    if (regiaoSelecionada !== 'Brasil Inteiro') filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (ufSelecionada !== 'Todas as UFs') filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    if (produtoSelecionado !== 'Todos os Produtos') filtrados = filtrados.filter(d => d['PRODUTO'] === produtoSelecionado);
    if (segmentoSelecionado !== 'Todos os Segmentos') filtrados = filtrados.filter(d => d['SEGMENTO'] === segmentoSelecionado);

    const mapa = filtrados.reduce((acc: any, curr) => {
      const ano = curr.DATA.substring(0, 4);
      if (!acc[ano]) acc[ano] = { ano, total: 0, tipo: curr.TIPO };
      acc[ano].total += parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      return acc;
    }, {});

    return Object.values(mapa).sort((a: any, b: any) => parseInt(a.ano) - parseInt(b.ano));
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada, produtoSelecionado, segmentoSelecionado]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen">ERRO: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-2 block">← Voltar</Link>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Análise <span className="text-blue-500">Multidimensional</span>
          </h1>
        </header>

        {/* PAINEL DE FILTROS */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 mb-8 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-500 mb-2 uppercase">1. Região</p>
              <div className="flex flex-wrap gap-1.5">
                {listaRegioes.map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border transition-all ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 mb-2 uppercase">2. Unidade Federativa</p>
              <select value={ufSelecionada} onChange={(e) => setUfSelecionada(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2.5 font-bold outline-none cursor-pointer">
                {listaUFs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 mb-2 uppercase">3. Produto</p>
              <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2.5 font-bold outline-none cursor-pointer">
                {listaProdutos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 mb-2 uppercase">4. Segmento</p>
              <select value={segmentoSelecionado} onChange={(e) => setSegmentoSelecionado(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2.5 font-bold outline-none cursor-pointer">
                {listaSegmentos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* GRÁFICO */}
        <section className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[580px] shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-black italic uppercase text-blue-500 leading-none">
                {segmentoSelecionado === 'Todos os Segmentos' ? 'Volume Consolidado' : segmentoSelecionado}
              </h3>
              <p className="text-slate-400 font-bold text-xs uppercase mt-2">
                {produtoSelecionado} | {ufSelecionada !== 'Todas as UFs' ? ufSelecionada : regiaoSelecionada}
              </p>
            </div>
            <div className="flex gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                 <span className="text-[9px] font-black uppercase text-slate-400">Histórico</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_8px_#eab308]"></div>
                 <span className="text-[9px] font-black uppercase text-slate-400">Projeção</span>
               </div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosFiltradosAgrupados} margin={{ top: 30, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ano" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={15} />
                <YAxis 
                  stroke="#475569" 
                  fontSize={11} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={formatadorDinamico}
                  width={90}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px' }}
                  formatter={(val: number) => [val.toLocaleString('pt-BR') + ' m³', 'Volume']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} animationDuration={800}>
                  {dadosFiltradosAgrupados.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />
                  ))}
                  <LabelList 
                    dataKey="total" 
                    position="top" 
                    fill="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    formatter={formatadorDinamico}
                    offset={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <footer className="mt-8 text-center">
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 italic">
             Unidade de Medida: Metros Cúbicos (m³) | Base ANP Processada
           </p>
        </footer>
      </div>
    </main>
  );
}