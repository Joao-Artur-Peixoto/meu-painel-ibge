'use client'; // Define que o gráfico será interativo no navegador
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function DashboardIBGE() {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Busca a população de todas as Grandes Regiões (N2) no Censo 2022
    fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N2[all]')
      .then(res => res.json())
      .then(json => {
        // Tratamento dos dados para o formato que o gráfico entende
        const formatado = json[0].resultados[0].series.map((item: any) => ({
          regiao: item.localidade.nome,
          populacao: parseInt(item.serie['2022'])
        }));
        setDados(formatado);
        setCarregando(false);
      })
      .catch(err => console.error("Erro ao buscar IBGE:", err));
  }, []);

  if (carregando) return <div className="p-20 text-center text-blue-900 font-bold">Carregando dados oficiais...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Cabeçalho estilo IBGE */}
        <div className="bg-blue-900 p-6 text-white">
          <h1 className="text-xl md:text-3xl font-light">Panorama <span className="font-bold">Censo 2022</span></h1>
          <p className="text-blue-200 text-sm">População Residente por Região</p>
        </div>

        <div className="p-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="regiao" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
                <Tooltip 
                  cursor={{fill: '#f0f4f8'}}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="populacao" radius={[5, 5, 0, 0]}>
                  {dados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#004a80' : '#2b78ad'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-xs text-gray-500 uppercase font-bold">Fonte</p>
                <p className="text-sm">SIDRA - API de Dados Agregados</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-xs text-gray-500 uppercase font-bold">Atualização</p>
                <p className="text-sm">Censo Demográfico 2022</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                <p className="text-sm">Dados Oficiais</p>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}