'use client';

import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, ZAxis 
} from 'recharts';
import Link from 'next/link';

export default function PaginaProjecao() {
  const [dados, setDados] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Agora o fetch funcionará pois o arquivo estará na pasta public
    fetch('/previsao_detalhada_anp.json')
      .then(res => {
        if (!res.ok) throw new Error("Arquivo não encontrado na pasta public/. Verifique a exportação do Jupyter.");
        return res.json();
      })
      .then((data: any[]) => {
        const processados = data.map(d => ({
          timestamp: new Date(d.DATA).getTime(),
          valor: parseFloat(d.VENDAS || d.PREVISAO || 0),
          tipo: d.TIPO, 
          dataOriginal: d.DATA
        })).filter(d => !isNaN(d.timestamp));
        
        setDados(processados);
      })
      .catch(err => setErro(err.message));
  }, []);

  if (erro) return (
    <div className="p-20 text-red-500 font-bold bg-slate-950 min-h-screen">
      <h2 className="text-2xl mb-4">❌ Erro de Carregamento</h2>
      <p>{erro}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-10">
          <Link href="/" className="text-blue-500 font-bold text-[10px] uppercase tracking-widest hover:underline mb-4 block">
            ← Voltar ao Painel
          </Link>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Diagnóstico de Dados: <span className="text-blue-500">Pontos de Venda</span>
          </h1>
        </header>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl h-[600px] relative">
          {dados.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  type="number" 
                  domain={['auto', 'auto']}
                  tickFormatter={(ts) => new Date(ts).toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })}
                  stroke="#475569" fontSize={11} tickMargin={15}
                />
                <YAxis 
                  dataKey="valor" 
                  type="number" 
                  domain={['auto', 'auto']} 
                  stroke="#475569" fontSize={11}
                  tickFormatter={(val) => val.toLocaleString('pt-BR')}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  labelFormatter={(ts) => `Data: ${new Date(ts).toLocaleDateString('pt-BR')}`}
                />
                <Scatter data={dados}>
                  {dados.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      // Corrigido para os nomes exatos do seu DataFrame
                      fill={entry.tipo === 'Histórico' ? '#3b82f6' : '#eab308'} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-black uppercase text-xs tracking-[0.3em]">Lendo previsões...</p>
            </div>
          )}
        </div>

        {/* INFO BOX */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Total de Registros</p>
            <p className="text-3xl font-bold text-white">{dados.length}</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Histórico</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Projeção</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}