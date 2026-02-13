'use client';

import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell 
} from 'recharts';
import Link from 'next/link';

export default function DiagnosticoGrafico() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/previsao_detalhada_anp.json')
      .then(res => res.json())
      .then((data: any[]) => {
        // Formata os dados para garantir que data seja timestamp e valores sejam números
        const formatados = data.map(d => ({
          ...d,
          timestamp: new Date(d.DATA).getTime(),
          valor: parseFloat(d.VENDAS || d.PREVISAO || 0),
          isProjecao: d.TIPO === 'PROJECAO' // Ajuste o nome da coluna/valor se necessário
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setDados(formatados);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro no fetch:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-20 text-white font-black animate-pulse">TESTANDO PONTOS DE DADOS...</div>;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <Link href="/" className="text-blue-500 mb-4 block">← Voltar</Link>
      <h1 className="text-3xl font-black mb-8 uppercase italic">Diagnóstico: Gráfico de Pontos</h1>

      <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 h-[600px]">
        {dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="timestamp" 
                type="number" 
                domain={['auto', 'auto']} 
                tickFormatter={(ts) => new Date(ts).toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })}
                stroke="#475569"
                fontSize={10}
              />
              <YAxis 
                dataKey="valor" 
                type="number" 
                domain={['auto', 'auto']} 
                stroke="#475569" 
                fontSize={10}
                name="Volume"
              />
              <ZAxis range={[50, 50]} /> {/* Tamanho fixo dos pontos */}
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
              />
              
              <Scatter name="Dados ANP" data={dados}>
                {dados.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.TIPO === 'HISTORICO' ? '#3b82f6' : '#eab308'} 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-red-500 font-bold uppercase">
            Nenhum dado encontrado no arquivo JSON.
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-slate-800 rounded-xl">
        <h2 className="text-xs font-black uppercase text-slate-400 mb-2">Resumo da Carga:</h2>
        <p className="text-sm">Total de linhas: <strong>{dados.length}</strong></p>
        <p className="text-sm">Primeira data: <strong>{dados[0]?.DATA}</strong></p>
        <p className="text-sm">Legenda: <span className="text-blue-500">■</span> Histórico | <span className="text-yellow-500">■</span> Projeção</p>
      </div>
    </main>
  );
}