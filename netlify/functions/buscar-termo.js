// Este código é para ser executado no servidor (Netlify Functions), não no navegador.
// Ele usa a sintaxe de Node.js.

// Importa a biblioteca para fazer chamadas de rede (HTTP requests).
const fetch = require('node-fetch');

// A função principal que será executada pela Netlify.
exports.handler = async function(event) {
  
  // Verifica se o método da requisição é POST. Se não for, retorna um erro.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Pega o termo de busca que foi enviado pelo frontend (index.html).
    const { termo } = JSON.parse(event.body);

    // Pega a chave da API de uma variável de ambiente segura, configurada no painel do Netlify.
    // A chave NUNCA fica exposta no código do frontend.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("A chave da API do Gemini não está configurada no servidor.");
    }

    // O mesmo prompt detalhado que usávamos antes.
    const prompt = `Para o termo teológico "${termo}", forneça as seguintes informações em formato JSON, seguindo o esquema especificado.
    1.  **portugues**: Uma definição clara e abrangente do termo no contexto teológico cristão.
    2.  **hebraico**: Um objeto contendo o 'termo' original, seu 'significado', a representação 'silabico' transliterada (ex: 'che-sed'), e o número da Concordância de 'strong' (ex: 'H2617'). Se não houver equivalente, retorne null.
    3.  **grego**: Um objeto contendo o 'termo' original, seu 'significado', e o número da Concordância de 'strong' (ex: 'G5485'). Se não houver equivalente, retorne null.
    4.  **latim**: Um objeto contendo o 'termo' da Vulgata Latina (ex: 'gratia') e seu 'significado'. Se não houver equivalente, retorne null.
    5.  **comentarios**: Um array de pelo menos 4 objetos, cada um com 'autor' e 'texto'. Para cada comentário, forneça uma análise aprofundada e substancial em um parágrafo completo. Priorize teólogos cristãos de referência (William Barclay, Matthew Henry, João Calvino, etc.). Sempre que o termo tiver uma raiz hebraica relevante, inclua também comentários do Rabino Rashi (para a perspectiva judaica clássica) e de fontes ou rabinos messiânicos (para a perspectiva judaica messiânica). O objetivo é oferecer uma visão rica e multifacetada.`;

    // A mesma estrutura de payload que usávamos antes.
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
              type: "OBJECT",
              properties: {
                  "portugues": { "type": "STRING" },
                  "hebraico": { "type": "OBJECT", properties: { "termo": { "type": "STRING" }, "significado": { "type": "STRING" }, "silabico": { "type": "STRING" }, "strong": { "type": "STRING" } }, nullable: true },
                  "grego": { "type": "OBJECT", properties: { "termo": { "type": "STRING" }, "significado": { "type": "STRING" }, "strong": { "type": "STRING" } }, nullable: true },
                  "latim": { "type": "OBJECT", properties: { "termo": { "type": "STRING" }, "significado": { "type": "STRING" } }, nullable: true },
                  "comentarios": { "type": "ARRAY", items: { "type": "OBJECT", properties: { "autor": { "type": "STRING" }, "texto": { "type": "STRING" } } } }
              },
              required: ["portugues", "hebraico", "grego", "latim", "comentarios"]
          }
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // Faz a chamada para a API do Google a partir do servidor.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Retorna a resposta do Google de volta para o frontend.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    // Se algo der errado, retorna uma mensagem de erro.
    console.error("Erro na função de backend:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
