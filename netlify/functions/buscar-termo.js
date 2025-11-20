// Solução de Emergência: HTTPS Nativo + Chave Direta
// Este código funciona em qualquer servidor Node.js sem instalações.

const https = require('https');

// Chave fornecida por si no chat. 
// Quando tudo funcionar, volte a usar process.env.GEMINI_API_KEY se desejar.
const API_KEY = "AIzaSyAmTwLwwBtIiS8mTnYQjQY2p-hJfcXfvdU"; 

function fazerPedidoGoogle(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: responseBody
        });
      });
    });

    req.on('error', (error) => {
      console.error("Erro de Rede:", error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

exports.handler = async function(event) {
  // Headers para permitir que qualquer site chame esta função (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Responder a "pings" do navegador
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    // Tentar ler o termo enviado
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON inválido enviado." }) };
    }

    const termo = body.termo;
    if (!termo) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Termo vazio." }) };
    }

    // Configuração do pedido para a IA
    const prompt = `Para o termo teológico "${termo}", aja como um dicionário teológico académico.
    Retorne APENAS um JSON válido seguindo rigorosamente esta estrutura, sem formatação Markdown:
    {
      "portugues": "Definição detalhada em português.",
      "hebraico": { "termo": "Palavra", "significado": "Definição", "silabico": "Transliteração", "strong": "Hxxxx", "significado_puro": "Raiz" },
      "grego": { "termo": "Palavra", "significado": "Definição", "strong": "Gxxxx", "significado_puro": "Raiz" },
      "latim": { "termo": "Palavra", "significado": "Definição", "significado_puro": "Raiz" },
      "comentarios": [ {"autor": "Nome", "texto": "Comentário", "referencia": "Obra"} ],
      "referencias_biblicas": [ {"citacao": "Livro X:Y", "texto": "Versículo"} ]
    }
    Se um campo não se aplicar, use null.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    // Fazer o pedido
    const respostaGoogle = await fazerPedidoGoogle(payload);

    if (respostaGoogle.statusCode !== 200) {
      console.log("Erro Google:", respostaGoogle.body);
      return {
        statusCode: respostaGoogle.statusCode,
        headers,
        body: JSON.stringify({ error: `O Google recusou o pedido. Código: ${respostaGoogle.statusCode}` })
      };
    }

    // Processar resposta
    const googleJson = JSON.parse(respostaGoogle.body);
    
    // Garantir que existe uma resposta válida
    if (!googleJson.candidates || !googleJson.candidates[0].content) {
       return { statusCode: 500, headers, body: JSON.stringify({ error: "A IA não retornou conteúdo." }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(googleJson)
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
```
