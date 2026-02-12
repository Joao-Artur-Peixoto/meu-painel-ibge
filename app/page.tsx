'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DadoVenda {
  DATA: string;
  UF: string;
  'UNIDADE DA FEDERAÇÃO': string;
  PRODUTO: string;
  SEGMENTO: string;
  VENDAS: number;
}

export default function DashboardVendas() {
  const [dados, setDados] = useState<DadoVenda[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/dados_vendas.json')
      .then((res) => res.json())
      .then((data: DadoVenda[]) => {
        setDados(data);
        if (data.length > 0) {
          const anos = data.map(d => new Date(d.DATA).getFullYear());
          setAnoSelecionado(Math.max(...anos));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar JSON:", err);
        setLoading(false);
      });
  }, []);

  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  const dadosFormatadosParaGrafico = useMemo(() => {
    if (!anoSelecionado) return [];
    const filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    const somaPorEstado = filtrados.reduce((acc: { [key: string]: number }, curr) => {
      const estado = curr['UNIDADE DA FEDERAÇÃO'];
      acc[estado] = (acc[estado] || 0) + curr.VENDAS;
      return acc;
    }, {});

    return Object.keys(somaPorEstado)
      .map(estado => ({
        nome: estado,
        vendas: somaPorEstado[estado]
      }))
      .sort((a, b) => b.vendas - a.vendas);
  }, [dados, anoSelecionado]);

  if (loading) return <div className="p-10 text-center">Carregando dados da ANP...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">📊 Vendas de Combustíveis</h1>
          <p className="text-gray-600 font-medium">Análise por Unidade da Federação (m³)</p>
        </header>

        <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-200">
          <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Selecionar Ano</h2>
          <div className="flex flex-wrap gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  anoSelecionado === ano
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800 underline decoration-blue-500 decoration-4 underline-offset-8">
              Ranking Nacional - {anoSelecionado}
            </h3>
          </div>
          
          <div className="h-[750px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dadosFormatadosParaGrafico}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="nome" 
                  type="category" 
                  width={160} 
                  tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: number | string | undefined) => {
                    if (value === undefined || value === null) return ["0 m³", "Vendas"];
                    const val = typeof value === 'string' ? parseFloat(value) : value;
                    return [new Intl.NumberFormat('pt-BR').format(val) + " m³", "Vendas Totais"];
                  }}
                />
                <Bar 
                  dataKey="vendas" 
                  fill="#3b82f6" 
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                >
                  {dadosFormatadosParaGrafico.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index < 3 ? '#1e3a8a' : '#60a5fa'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}