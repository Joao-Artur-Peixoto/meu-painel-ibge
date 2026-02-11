'use client'; 

import { useEffect, useState } from 'react';
// Importamos os componentes necessários da biblioteca Recharts
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell 
} from 'recharts';

export default function DashboardIBGE() {
  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [origemDados, setOrigemDados] = useState('Buscando...');

  useEffect(() => {
    async function carregarDados() {
      try {
        // Tenta buscar os dados reais da API do IBGE
        const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N2[all]');
        
        if (!res.ok) throw new Error("Falha na rede");
        
        const json = await res.json();
        const series = json[0]?.resultados[0]?.series;

        if (series && series.length > 0) {
          // Se a API funcionou, formata os dados
          const formatado = series.map((item: any) => ({
            name: item.localidade.nome,
            valor: parseInt(item.serie['2022'], 10)
          }));
          setDados(formatado);
          setOrigemDados('Dados em tempo real via API IBGE');
        } else {
          throw new Error("Dados vazios");
        }
      } catch (err) {
        // SE A API FALHAR: Usa os dados oficiais de backup para o gráfico não ficar branco
        console.warn("Usando backup devido a erro na API");
        const backup = [
          { name: 'Norte', valor: 17349619 },
          { name: 'Nordeste', valor: 54644582 },
          { name: 'Sudeste', valor: 84847313 },
          { name: 'Sul', valor: 29933315 },
          { name: 'Centro-Oeste', valor: 16287809 }
        ];
        setDados(backup);
        setOrigemDados('Exibindo dados de backup (API offline)');
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-blue-900 animate-pulse">Carregando Panorama...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* Cabeçalho */}
        <div className="bg-blue-900 p-8 text-white">
          <h1 className="text-2xl md:text-4xl font-light italic">
            Panorama <span className="font-bold not-italic">Censo 2022</span>
          </h1>
          <p className="text-blue-200 text-sm mt-2 opacity-80 uppercase tracking-widest">
            População Residente por Grande Região
          </p>
        </div>

        <div className="p-6 md:p-10">
          {/* Container do Gráfico - Importante ter altura definida */}
          <div className="h-[450px] w-full bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 13}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  tick={{fill: '#475569', fontSize: 13}}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="valor" fill="#0369a1" radius={[8, 8, 0, 0]} barSize={60}>
                  {dados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0369a1' : '#32a041'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rodapé Informativo */}
          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Status do Sistema</p>
              <p className="text-sm text-gray-600">{origemDados}</p>
            </div>
            <p className="text-[11px] text-gray-400 italic">
              Fonte: SIDRA - Sistema IBGE de Recuperação Automática
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}