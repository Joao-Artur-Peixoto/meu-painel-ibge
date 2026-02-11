'use client'; 
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardIBGE() {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        // A "chamada" para o prédio do IBGE
        const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N2[all]');
        const json = await res.json();
        
        // AQUI É O AJUSTE DO CAMINHO:
        // Entramos em: Primeira Gaveta [0] -> Pasta 'resultados' [0] -> Pasta 'series'
        const listaDeRegioes = json[0]?.resultados[0]?.series || [];
        
        // Aqui limpamos os dados para o gráfico entender
        const dadosFormatados = listaDeRegioes.map((item: any) => ({
          name: item.localidade.nome,             // Pega o nome da Região
          valor: parseInt(item.serie['2022'])     // Pega o número da população de 2022
        }));

        setDados(dadosFormatados);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  if (carregando) return <div className="p-20 text-center">Carregando dados do IBGE...</div>;

  return (
    <div className="p-10 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-8 text-blue-900 border-b pb-4">
          População Residente por Região (Censo 2022)
        </h1>
        
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="valor" fill="#004a80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-xs text-gray-400 mt-6 italic">Fonte: API de Dados Agregados do IBGE</p>
      </div>
    </div>
  );
}