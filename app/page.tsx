'use client';

import { useEffect, useState } from 'react';
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

// Definimos uma interface para o TypeScript não reclamar do formato dos dados
interface DadosEstado {
  name: string;
  valor: number;
}

export default function DashboardANP() {
  const [dadosVendasPorUF, setDadosVendasPorUF] = useState<DadosEstado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDadosANP() {
      try {
        setCarregando(true);
        setErro(null);

        const urlCsv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCa0e2T5iCog18x2-7k_1m5FTE1r40fzTJXSC6adnMji8jV6GYyRHs3pVJL8D7zsEQvq6utBXQ7UH1/pub?gid=1320084496&single=true&output=csv';
        
        const res = await fetch(urlCsv);
        if (!res.ok) throw new Error("Falha ao carregar o CSV da planilha.");
        
        const textoCsv = await res.text();
        const linhas = textoCsv.split('\n');
        
        // Limpamos o cabeçalho para evitar espaços em branco ou caracteres especiais
        const cabecalho = linhas[0].split(',').map(item => item.trim().toUpperCase());
        
        const idxEstado = cabecalho.indexOf('ESTADO');
        const idxVendas = cabecalho.indexOf('VENDAS');
        
        if (idxEstado === -1 || idxVendas === -1) {
            throw new Error("Colunas 'ESTADO' ou 'VENDAS' não encontradas.");
        }

        const vendasPorUF: Record<string, number> = {};

        for (let i = 1; i < linhas.length; i++) {
          const colunas = linhas[i].split(',');
          if (colunas.length < 2) continue; // Pula linhas vazias

          const estado = colunas[idxEstado]?.trim();
          // Tratamento para números: remove aspas, troca vírgula por ponto
          const vendasRaw = colunas[idxVendas]?.replace(/"/g, '').replace(',', '.') || '0';
          const vendas = parseFloat(vendasRaw);

          if (estado && estado !== 'Região' && !isNaN(vendas)) {
            vendasPorUF[estado] = (vendasPorUF[estado] || 0) + vendas;
          }
        }

        const formatado: DadosEstado[] = Object.keys(vendasPorUF).map(estado => ({
          name: estado,
          valor: vendasPorUF[estado]
        })).sort((a, b) => b.valor - a.valor);

        setDadosVendasPorUF(formatado);

      } catch (err: any) {
        setErro(err.message);
        console.error("Erro ANP:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregarDadosANP();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="p-8 border-b border-slate-100">
          <h1 className="text-2xl font-black text-blue-900 mb-2">Vendas Totais de Combustíveis por UF</h1>
          <p className="text-sm text-slate-500 uppercase tracking-wider">Volume acumulado em metros cúbicos (m³)</p>
        </div>

        <div className="p-8">
          {carregando ? (
            <div className="h-[600px] flex items-center justify-center animate-pulse text-blue-600 font-bold uppercase tracking-tighter">
              Processando base de dados ANP...
            </div>
          ) : erro ? (
            <div className="h-[600px] flex items-center justify-center text-red-500 font-medium">
              ⚠️ Erro: {erro}
            </div>
          ) : (
            <div className="h-[800px] w-full"> 
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={dadosVendasPorUF} 
                  layout="vertical" 
                  margin={{ top: 5, right: 50, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} 
                    tick={{fontSize: 10, fill: '#94a3b8'}}
                    axisLine={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{fontSize: 11, fill: '#475569', fontWeight: 600}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value: number) => [
                      `${value.toLocaleString('pt-BR', {maximumFractionDigits: 0})} m³`, 
                      'Volume Total'
                    ]}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20}>
                    {dadosVendasPorUF.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index < 3 ? '#1e3a8a' : '#3b82f6'} 
                        fillOpacity={1 - (index * 0.02)} // Efeito visual de gradiente no ranking
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 p-4 text-center">
            <p className="text-[10px] text-slate-400 font-medium italic">
                Fonte: Agência Nacional do Petróleo, Gás Natural e Biocombustíveis (ANP)
            </p>
        </div>
      </div>
    </main>
  );
}