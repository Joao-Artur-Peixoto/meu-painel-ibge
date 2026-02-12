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

// 1. Definição do Tipo de Dado (Interface) para evitar erros de compilação
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

  // 2. Carregar dados do arquivo JSON na pasta /public
  useEffect(() => {
    fetch('/dados_vendas.json')
      .then((res) => res.json())
      .then((data: DadoVenda[]) => {
        setDados(data);
        
        // Encontrar o ano mais recente disponível nos dados
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

  // 3. Gerar lista dos últimos 10 anos para o filtro
  const listaAnos = useMemo(() => {
    const anosUnicos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return anosUnicos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  // 4. Filtrar e Agrupar dados para o gráfico de barras
  const dadosFormatadosParaGrafico = useMemo(() => {
    if (!anoSelecionado) return [];

    // Filtrar pelo ano clicado
    const filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    
    // Somar vendas por Estado
    const somaPorEstado = filtrados.reduce((acc: { [key: string]: number }, curr) => {
      const estado = curr['UNIDADE DA FEDERAÇÃO'];
      acc[estado] = (acc[estado] || 0) + curr.VENDAS;
      return acc;
    }, {});

    // Converter para o formato que o Recharts entende e ordenar
    return Object.keys(somaPorEstado)
      .map(estado => ({
        nome: estado,
        vendas: somaPorEstado[estado]
      }))
      .sort((a, b) => b.vendas - a.vendas);
  }, [dados, anoSelecionado]);

  if (loading) return <div className="p-10 text-center">Carregando dados da ANP...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">📊 Vendas de Combustíveis</h1>
          <p className="text-gray-600">Análise por Unidade da Federação (m³)</p>
        </header>

        {/* Filtro de Anos */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3 tracking-wider">Selecionar Ano</h2>
          <div className="flex flex-wrap gap-2">
            {listaAnos.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  anoSelecionado === ano
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* Área do Gráfico */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-700">Total de Vendas em {anoSelecionado}</h3>
          </div>
          
          <div className="h-[700px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dadosFormatadosParaGrafico}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="nome" 
                  type="category" 
                  width={150} 
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  formatter={(value: number) => [
                    new Intl.NumberFormat('pt-BR').format(value) + " m³", 
                    "Total de Vendas"
                  ]}
                />
                <Bar 
                  dataKey="vendas" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {dadosFormatadosParaGrafico.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index < 3 ? '#1e3a8a' : '#3b82f6'} // Destaque para o Top 3
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