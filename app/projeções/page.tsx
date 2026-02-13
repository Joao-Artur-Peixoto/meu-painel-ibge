'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecaoEscalaCorrigida() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Brasil Inteiro');
  const [ufSelecionada, setUfSelecionada] = useState<string>('Todas as UFs');
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('Todos os Produtos');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado.");
        return res.json();
      })
      .then((data) => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // --- FUNÇÃO DE FORMATAÇÃO ADAPTATIVA ---
  const formatadorDinamico = (valor: number) => {
    if (valor === 0) return "0";
    const absValor = Math.abs(valor);
    
    if (absValor >= 1_000_000_000) return (valor / 1_000_000_000).toFixed(2) + 'B';
    if (absValor >= 1_000_000) return (valor / 1_000_000).toFixed(2) + 'M';
    if (absValor >= 1_000) return (valor / 1_000).toFixed(1) + 'K';
    
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  // --- LÓGICA DE FILTROS ---
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

  useEffect(() => { setUfSelecionada('Todas as UFs'); }, [regiaoSelecionada]);
  useEffect(() => { setProdutoSelecionado('Todos os Produtos'); }, [ufSelecionada]);

  const dadosFiltradosAgrupados = useMemo(() => {
    let filtrados = [...dadosBrutos];
    if (regiaoSelecionada !== 'Brasil Inteiro') filtrados = filtrados.filter(d => d['Região Geográfica'] === regiaoSelecionada);
    if (ufSelecionada !== 'Todas as UFs') filtrados = filtrados.filter(d => d['UNIDADE DA FEDERAÇÃO'] === ufSelecionada);
    if (produtoSelecionado !== 'Todos os Produtos') filtrados = filtrados.filter(d => d['PRODUTO'] === produtoSelecionado);

    const mapa = filtrados.reduce((acc: any, curr) => {
      const ano = curr.DATA.substring(0, 4);
      if (!acc[ano]) acc[ano] = { ano, total: 0, tipo: curr.TIPO };
      acc[ano].total += parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      return acc;
    }, {});

    return Object.values(mapa).sort((a: any, b: any) => parseInt(a.ano) - parseInt(b.ano));
  }, [dadosBrutos, regiaoSelecionada, ufSelecionada, produtoSelecionado]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen">ERRO: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-6 flex justify-between items-end">
          <div>
            <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-2 block">← Voltar</Link>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Projeções <span className="text-blue-500">Inteligentes</span></h1>
          </div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
            Escala Automática Ativa
          </div>
        </header>

        {/* FILTROS */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] font-black text-slate-500 mb-3 uppercase italic">1. Região</p>
              <div className="flex flex-wrap gap-2">
                {listaRegioes.map(r => (
                  <button key={r} onClick={() => setRegiaoSelecionada(r)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border ${regiaoSelecionada === r ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 mb-3 uppercase italic">2. UF</p>
              <select value={ufSelecionada} onChange={(e) => setUfSelecionada(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-3 font-bold outline-none">
                {listaUFs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-500 mb-3 uppercase italic">3. Produto</p>
              <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-3 font-bold outline-none">
                {listaProdutos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* GRÁFICO COM CORREÇÃO DE ESCALA */}
        <section className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 h-[600px]">
          <div className="mb-10">
            <h3 className="text-2xl font-black italic uppercase text-blue-500">{produtoSelecionado}</h3>
            <p className="text-slate-500 font-bold text-xs uppercase italic">{ufSelecionada !== 'Todas as UFs' ? ufSelecionada : regiaoSelecionada}</p>
          </div>

          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosFiltradosAgrupados} margin={{ top: 30, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ano" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={15} />
                
                {/* EIXO Y ADAPTATIVO */}
                <YAxis 
                  stroke="#475569" 
                  fontSize={11} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={formatadorDinamico}
                  width={80}
                />
                
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px' }}
                  formatter={(val: number) => [val.toLocaleString('pt-BR') + ' m³', 'Volume Total']}
                />

                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {dadosFiltradosAgrupados.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} />
                  ))}
                  
                  {/* LABELS ADAPTATIVAS ACIMA DAS BARRAS */}
                  <LabelList 
                    dataKey="total" 
                    position="top" 
                    fill="#94a3b8" 
                    fontSize={11} 
                    fontWeight="bold"
                    formatter={formatadorDinamico}
                    offset={10}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}