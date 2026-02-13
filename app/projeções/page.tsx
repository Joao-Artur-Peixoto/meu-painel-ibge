'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend 
} from 'recharts';
import Link from 'next/link';

export default function ProjecoesVendas() {
  const [dados, setDados] = useState([]);
  const [filtroUF, setFiltroUF] = useState('SÃO PAULO');
  const [filtroProduto, setFiltroProduto] = useState('GASOLINA C');

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then(data => setDados(data));
  }, []);

  const dadosFiltrados = useMemo(() => {
    return dados.filter(d => d.UF === filtroUF && d.PRODUTO === filtroProduto)
      .map(d => ({
        ...d,
        DATA_FORMATADA: new Date(d.DATA).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      }));
  }, [dados, filtroUF, filtroProduto]);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="max-w-[1400px] mx-auto">
        
        {/* VOLTAR */}
        <Link href="/" className="text-blue-400 font-bold mb-8 block hover:underline">
          ← Voltar ao Painel Principal
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-black italic tracking-tighter text-blue-400">PROJEÇÕES DE MERCADO</h1>
          <p className="text-slate-400 uppercase text-xs font-bold tracking-widest">Inteligência Artificial & Séries Temporais (Prophet)</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* PAINEL DE CONTROLE LATERAL */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-4">Selecione a UF</label>
                <select 
                  value={filtroUF} 
                  onChange={(e) => setFiltroUF(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold"
                >
                  {[...new Set(dados.map(d => d.UF))].sort().map(uf => <option key={uf}>{uf}</option>)}
                </select>

                <label className="block text-[10px] font-black text-slate-500 uppercase mt-6 mb-4">Produto</label>
                <select 
                  value={filtroProduto} 
                  onChange={(e) => setFiltroProduto(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold"
                >
                  {[...new Set(dados.map(d => d.PRODUTO))].sort().map(p => <option key={p}>{p}</option>)}
                </select>
             </div>
          </div>

          {/* GRÁFICO DE TENDÊNCIA */}
          <div className="lg:col-span-3 bg-slate-800 p-8 rounded-[3rem] border border-slate-700 min-h-[500px]">
            <h3 className="text-xl font-bold mb-8 italic">Tendência de Consumo: <span className="text-blue-400">{filtroProduto}</span> em <span className="text-blue-400">{filtroUF}</span></h3>
            
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={dadosFiltrados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="DATA_FORMATADA" stroke="#64748b" fontSize={10} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '15px' }}
                />
                <Legend />
                
                {/* Margem de Erro (Sombra) */}
                <Area 
                  type="monotone" 
                  dataKey="MAXIMO" 
                  stroke="none" 
                  fill="#3b82f6" 
                  fillOpacity={0.1} 
                  name="Margem de Incerteza"
                />
                <Area 
                  type="monotone" 
                  dataKey="MINIMO" 
                  stroke="none" 
                  fill="#3b82f6" 
                  fillOpacity={0.1} 
                />

                {/* Linha Histórica */}
                <Line 
                  type="monotone" 
                  dataKey="VENDAS" 
                  stroke="#60a5fa" 
                  strokeWidth={3} 
                  dot={false} 
                  name="Vendas Reais"
                />

                {/* Linha de Previsão (Tracejada) */}
                <Line 
                  type="monotone" 
                  dataKey="PREVISAO" 
                  stroke="#facc15" 
                  strokeWidth={3} 
                  strokeDasharray="5 5" 
                  dot={false} 
                  name="Projeção IA"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
              A linha tracejada amarela representa a estimativa estatística para os próximos 36 meses.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}