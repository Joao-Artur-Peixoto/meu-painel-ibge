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

export default function DashboardVendas() {
  const [dados, setDados] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState(null);

  // 1. Carregar os dados do arquivo JSON local
  useEffect(() => {
    fetch('/dados_vendas.json')
      .then((res) => res.json())
      .then((data) => {
        setDados(data);
        // Define o ano mais recente automaticamente ao carregar
        const anosDisponiveis = [...new Set(data.map(d => new Date(d.DATA).getFullYear()))];
        setAnoSelecionado(Math.max(...anosDisponiveis));
      });
  }, []);

  // 2. Processar os últimos 10 anos para o filtro
  const filtrosAnos = useMemo(() => {
    const todosAnos = [...new Set(dados.map(d => new Date(d.DATA).getFullYear()))];
    return todosAnos.sort((a, b) => b - a).slice(0, 10);
  }, [dados]);

  // 3. Filtrar e Agrupar dados para o gráfico (Soma por UF no ano selecionado)
  const dadosGrafico = useMemo(() => {
    const filtrados = dados.filter(d => new Date(d.DATA).getFullYear() === anoSelecionado);
    
    const agrupado = filtrados.reduce((acc, curr) => {
      const uf = curr['UNIDADE DA FEDERAÇÃO'];
      acc[uf] = (acc[uf] || 0) + curr.VENDAS;
      return acc;
    }, {});

    return Object.keys(agrupado)
      .map(uf => ({ uf, vendas: agrupado[uf] }))
      .sort((a, b) => b.vendas - a.vendas); // Ordenar do maior para o menor
  }, [dados, anoSelecionado]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Vendas por Unidade da Federação</h1>

      {/* Filtro de Anos */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {filtrosAnos.map(ano => (
          <button
            key={ano}
            onClick={() => setAnoSelecionado(ano)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              anoSelecionado === ano 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            {ano}
          </button>
        ))}
      </div>

      {/* Container do Gráfico */}
      <div className="bg-white p-6 rounded-xl shadow-sm border h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={dadosGrafico}
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="uf" 
              type="category" 
              width={150} 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value) => new Intl.NumberFormat('pt-BR').format(value) + ' m³'}
              cursor={{ fill: '#f3f4f6' }}
            />
            <Bar dataKey="vendas" fill="#3b82f6" radius={[0, 4, 4, 0]}>
              {dadosGrafico.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index < 3 ? '#1d4ed8' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}