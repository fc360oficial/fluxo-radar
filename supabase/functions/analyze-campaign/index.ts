const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { campaignName, summary } = await req.json()

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const prompt = `Você é um especialista em análise de viabilidade de supermercados no Brasil.

Analise os dados de uma pesquisa de mercado da campanha "${campaignName}" com ${summary.total} entrevistas coletadas.

**Dados coletados:**
- Supermercados mais frequentados: ${JSON.stringify(summary.supermercados)}
- Principais motivos de escolha (Q2): ${JSON.stringify(summary.motivos)}
- Reclamações mais comuns (Q3): ${JSON.stringify(summary.reclamacoes)}
- Meio de transporte usado (Q4): ${JSON.stringify(summary.transporte)}
- O que faria trocar de supermercado (Q5): ${JSON.stringify(summary.razoes_troca)}
- Frequência de visitas (Q6): ${JSON.stringify(summary.frequencia)}
- Intenção de comprar em nova loja (Q7): ${JSON.stringify(summary.intencao)}
- Diferenciais desejados em nova loja (Q8): ${JSON.stringify(summary.diferenciais)}

Forneça uma análise em português com:
1. **Síntese do perfil do consumidor** — quem é o comprador típico desta área
2. **Oportunidades identificadas** — o que os consumidores estão buscando e não encontrando
3. **Principais concorrentes** — quem domina a preferência e por quê
4. **Avaliação de viabilidade** — se a abertura de uma nova loja nessa área é viável com base nos dados
5. **Recomendações estratégicas** — 3 a 5 ações concretas para quem quer entrar nesse mercado

Seja objetivo, use os dados reais fornecidos e fale em português do Brasil.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(JSON.stringify({ error: err }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const data = await response.json()
  const analysis = data.content?.[0]?.text ?? 'Não foi possível gerar a análise.'

  return new Response(
    JSON.stringify({ analysis }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
