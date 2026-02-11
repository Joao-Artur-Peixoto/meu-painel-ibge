'use client'; 
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function DashboardIBGE() {
  const [dados, setDados] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        // Usamos uma URL que força o JSON e evita bloqueios comuns
        const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N2[all]');
        if (!res.ok) throw new Error("Erro ao conectar com IBGE");
        
        const json = await res.json();
        const series = json[0]?.resultados[0]?.series || [];
        
        const dadosFormatados = series.map((item: any) => {
          // Pegamos o valor de 2022 e garantimos que ele vire um número real
          const valorBruto = item.serie['2022'];
          const valorNumerico = valorBruto ? parseInt(valorBruto, 10) : 0;

          return {
            name: item.localidade.nome,
            valor: valorNumerico
          };
        });

        if (dadosFormatados.length === 0) throw new Error("API retornou vazia");
        setDados(dadosFormatados);
      } catch (err: any) {
        console.error("Erro detectado:", err.message);
        setErro(err.message);
      }
    }
    carregarDados();
  }, []);

  if (erro) return <div className="p-20 text-center text-red-500 font-bold">Erro: {erro}</div>;
  if (dados.length === 0) return <div className="p-20 text-center font-bold text-blue-900 animate-pulse">Buscando dados oficiais do IBGE...</div>;

  return (
    <div className="p-4 md:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl p-6 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold mb-8 text-blue-900 border-b pb-4">
          População Residente por Região (Censo 2022)
        </h1>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                tick={{fill: '#64748b', fontSize: 12}}
              />
              <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="valor" fill="#0284c7" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-[10px] text-gray-400 mt-8 text-right italic font-medium">Fonte: API de Dados Agregados do IBGE</p>
      </div>
    </div>
  );
}