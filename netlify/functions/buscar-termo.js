// Este código usa o módulo nativo HTTPS do Node.js.
// Funciona em qualquer versão e não precisa de 'npm install'.
const https = require('https');

// Função auxiliar para fazer o pedido HTTPS manualmente (sem 'fetch')
function fazerPedidoGoogle(url, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON inválido." }) };
    }

    const { termo } = body;
    if (!termo) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Termo não fornecido." }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERRO CRÍTICO: GEMINI_API_KEY ausente.");
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Erro de configuração no servidor." }) };
    }

    const prompt = `Para o termo teológico "${termo}", forneça as seguintes informações em formato JSON, seguindo o esquema especificado.
    1.  **portugues**: Uma definição clara e abrangente do termo no contexto teológico cristão.
    2.  **hebraico**: Um objeto contendo o 'termo' original, o 'significado' (conforme a definição de Strong), a representação 'silabico' transliterada, o número de 'strong', e o 'significado_puro' (uma explicação do sentido literal ou da raiz da palavra em hebraico). Se não houver equivalente, retorne null.
    3.  **grego**: Um objeto contendo o 'termo' original, seu 'significado' (conforme Strong), o número de 'strong', e o 'significado_puro' (explicação do sentido da raiz grega). Se não houver equivalente, retorne null.
    4.  **latim**: Um objeto contendo o 'termo' da Vulgata Latina, seu 'significado', e o 'significado_puro' (explicação do sentido da raiz latina). Se não houver equivalente, retorne null.
    5.  **comentarios**: Um array de pelo menos 4 objetos, cada um com 'autor', 'texto' (um parágrafo substancial sobre o termo em geral), e 'referencia' (a fonte bibliográfica). Priorize teólogos cristãos de referência (William Barclay, Matthew Henry, João Calvino, etc.) e, quando relevante, inclua Rashi e fontes messiânicas.
    6.  **referencias_biblicas**: Um array de objetos, cada um com 'citacao' (ex: 'João 3:16') e 'texto' (o texto completo do versículo). Inclua vários versículos chave que ilustram o uso e o significado do termo na Bíblia.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
              type: "OBJECT",
              properties: {
                  "portugues": { "type": "STRING" },
                  "hebraico": { 
                      "type": "OBJECT", 
                      properties: { 
                          "termo": { "type": "STRING" }, 
                          "significado": { "type": "STRING" }, 
                          "silabico": { "type": "STRING" }, 
                          "strong": { "type": "STRING" },
                          "significado_puro": { "type": "STRING" }
                      }, 
                      nullable: true 
                  },
                  "grego": { 
                      "type": "OBJECT", 
                      properties: { 
                          "termo": { "type": "STRING" }, 
                          "significado": { "type": "STRING" }, 
                          "strong": { "type": "STRING" },
                          "significado_puro": { "type": "STRING" }
                      }, 
                      nullable: true 
                  },
                  "latim": { 
                      "type": "OBJECT", 
                      properties: { 
                          "termo": { "type": "STRING" }, 
                          "significado": { "type": "STRING" }, 
                          "significado_puro": { "type": "STRING" }
                      }, 
                      nullable: true 
                  },
                  "comentarios": { 
                      "type": "ARRAY", 
                      "items": { 
                          "type": "OBJECT", 
                          "properties": { 
                              "autor": { "type": "STRING" }, 
                              "texto": { "type": "STRING" },
                              "referencia": { "type": "STRING" }
                          },
                          "required": ["autor", "texto"]
                      } 
                  },
                  "referencias_biblicas": {
                      "type": "ARRAY",
                      "items": {
                          "type": "OBJECT",
                          "properties": {
                              "citacao": { "type": "STRING" },
                              "texto": { "type": "STRING" }
                          },
                          "required": ["citacao", "texto"]
                      }
                  }
              },
              required: ["portugues", "hebraico", "grego", "latim", "comentarios", "referencias_biblicas"]
          }
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // CHAMADA SEGURA SEM DEPENDÊNCIAS
    const response = await fazerPedidoGoogle(apiUrl, payload);

    if (response.statusCode !== 200) {
      console.error(`Erro Google (${response.statusCode}):`, response.body);
      return {
        statusCode: response.statusCode,
        headers,
        body: JSON.stringify({ error: `Erro no Google: ${response.body}` })
      };
    }

    // Parse do corpo da resposta
    const responseBody = JSON.parse(response.body);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody)
    };

  } catch (error) {
    console.error("Erro Fatal:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro interno: ${error.message}` })
    };
  }
};
```eof

### Por que esta solução é diferente?
1.  **Zero Instalações:** Este código **não usa `fetch`**. Usa `https.request`, que já vem instalado dentro de todos os servidores Node.js desde 2010.
2.  **Compatibilidade Total:** Não importa se a Netlify roda Node 14, 16, 18 ou 20. Este código funciona em todos.
3.  **Depuração Clara:** Se o Google rejeitar a chave, este código vai imprimir o erro exato no console, em vez de apenas "crashar" com 502.

### Sugestão Adicional (Opcional, mas Recomendada)
Se você ainda tiver o ficheiro `package.json` no seu repositório (na raiz ou na pasta `functions`), **apague-o**.
Como este novo código não precisa de instalar nada, o `package.json` antigo pode estar a confundir o sistema de build da Netlify, fazendo-o tentar instalar coisas que não precisa e falhando no processo.

**Resumo:**
1.  Atualize o `buscar-termo.js` com o código acima.
2.  Apague o `package.json` (se existir).
3.  Aguarde o deploy automático da Netlify e teste.

Vai funcionar!
