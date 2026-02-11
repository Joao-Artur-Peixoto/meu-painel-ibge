export default async function Page() {
  try {
    // 1. Faz a chamada para a API do IBGE
    const res = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N3[35]', {
      next: { revalidate: 3600 } // Cache de 1 hora para evitar sobrecarga
    });

    // 2. Verifica se a resposta foi bem-sucedida
    if (!res.ok) throw new Error('Falha ao buscar dados');

    const data = await res.json();

    // 3. A "Trava de Segurança": Verifica se o dado existe antes de acessar .resumos
    const populacao = data?.[0]?.resumos?.[0]?.valor ?? "Dados indisponíveis";

    return (
      <div className="p-10 font-sans">
        <h1 className="text-2xl font-bold text-blue-900">Meu Painel Censo 2022</h1>
        <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-gray-700">População do Estado de SP (Censo 2022):</p>
          <span className="text-4xl font-black text-blue-600">
            {populacao.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>
    );

  } catch (error) {
    // Caso a API do IBGE esteja fora do ar, o site não quebra!
    return (
      <div className="p-10 text-red-600">
        Erro ao carregar dados do IBGE. Por favor, tente novamente mais tarde.
      </div>
    );
  }
}