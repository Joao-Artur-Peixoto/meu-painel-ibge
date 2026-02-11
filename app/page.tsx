// Exemplo simplificado de como buscar a população de SP no Censo
export default async function Page() {
  // Chamada para a API do IBGE
  const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N3[35]');
  const data = await res.json();
  
  const populacao = data[0].resumos[0].valor;

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold text-blue-900">Meu Painel Censo 2022</h1>
      <p className="mt-4">População do Estado de SP: <span className="font-bold">{populacao}</span> habitantes.</p>
    </div>
  );
}