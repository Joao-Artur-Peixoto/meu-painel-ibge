'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecaoBarras() {
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado.");
        return res.json();
      })
      .then((data) => setDadosBrutos(data))
      .catch(err => setErro(err.message));
  }, []);

  // Agrupamento de dados por ANO
  const dadosAgrupados = useMemo(() => {
    const mapa = dadosBrutos.reduce((acc: any, curr) => {
      // Extrai o ano da string de data (formato ISO: YYYY-MM-DD)
      const ano = curr.DATA.substring(0, 4);
      
      if (!acc[ano]) {
        acc[ano] = { 
          ano, 
          total: 0, 
          tipo: curr.TIPO // Assume o tipo do primeiro registro do ano encontrado
        };
      }
      
      // Soma VENDAS ou PREVISAO
      const valor = parseFloat(curr.VENDAS || curr.PREVISAO || 0);
      acc[ano].total += valor;
      
      return acc;
    }, {});

    // Converte o objeto em array e ordena por ano
    return Object.values(mapa).sort((a: any, b: any) => parseInt(a.ano) - parseInt(b.ano));
  }, [dadosBrutos]);

  if (erro) return <div className="p-20 text-red-500 bg-slate-950 min-h-screen font-bold">ERRO: {erro}</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-10">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-widest hover:underline mb-4 block">
            ← Voltar ao Painel
          </Link>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Total de Vendas <span className="text-blue-500">por Ano</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
            Consolidado anual de mercado (Histórico vs Projeção)
          </p>
        </header>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl h-[600px]">
          {dadosAgrupados.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAgrupados} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="ano" 
                  stroke="#475569" 
                  fontSize={12} 
                  tickMargin={15}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={12} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => (val / 1000000).toFixed(1) + 'M'} 
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  formatter={(value: number) => [new Intl.NumberFormat('pt-BR').format(Math.floor(value)) + ' m³', 'Total Anual']}
                />
                
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {/* Cores baseadas no Tipo (Histórico vs Projeção) */}
                  {dadosAgrupados.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} 
                    />
                  ))}
                  {/* Valor mostrado acima da barra */}
                  <LabelList 
                    dataKey="total" 
                    position="top" 
                    fill="#94a3b8" 
                    fontSize={10} 
                    formatter={(val: number) => (val / 1000000).toFixed(2) + 'M'}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-xs tracking-[0.5em]">
              Processando registros...
            </div>
          )}
        </div>

        {/* LEGENDA E INFO */}
        <div className="mt-8 flex gap-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dados Históricos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projeção IA</span>
          </div>
          <div className="ml-auto bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <span className="text-[10px] font-black text-slate-500">REGISTROS PROCESSADOS: {dadosBrutos.length.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </main>
  );
}