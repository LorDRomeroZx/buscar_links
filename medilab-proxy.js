// ARQUIVO: proxy-scripts.js (Rodando no Node.js)

const express = require('express');
// 💡 MUDANÇA CRÍTICA: Usando axios (mais robusto)
const axios = require('axios'); 

const app = express();
const PORT = 3000;
const BASE_URL_SCRIPTS = 'http://medilab.tecnologia.ws/scriptsbd';

// Middleware para CORS (permite que o frontend acesse este servidor)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Middleware para entender JSON
app.use(express.json()); 

app.post('/api/buscar-scripts', async (req, res) => {
    const { sistema, sgbd, inicio, fim } = req.body;

    if (!sistema || !sgbd || isNaN(inicio) || isNaN(fim) || inicio > fim) {
        return res.status(400).json({ error: 'Parâmetros de busca inválidos.' });
    }

    const resultados = [];

    for (let i = inicio; i <= fim; i++) {
        const numeroFormatado = i.toString().padStart(3, '0');
        const url = `${BASE_URL_SCRIPTS}/${sistema}/${sgbd}/script${numeroFormatado}.txt`;

        try {
            // 💡 REQUISIÇÃO COM AXIOS
            const response = await axios.get(url);

            // AXIOS retorna status 200/2XX no objeto 'response'
            if (response.status === 200) { 
                resultados.push({
                    numero: numeroFormatado,
                    url: url,
                    status: 'Disponível',
                    conteudo: response.data // Axios usa response.data para o conteúdo
                });
            } else {
                 resultados.push({
                    numero: numeroFormatado,
                    status: `Erro HTTP ${response.status}`,
                });
            }

        } catch (error) {
            // Tratamento de erros do Axios (rede, 404, etc.)
            let status = 'Erro de rede';
            let erroDetalhado = error.message;

            if (error.response) {
                // Erro de resposta (ex: 404, 500)
                status = `Erro HTTP ${error.response.status}`;
                if (error.response.status === 404) {
                    status = 'Não encontrado';
                }
            } else if (error.code) {
                // Erro de rede (ex: ECONNRESET, ETIMEDOUT)
                status = `Erro de rede: ${error.code}`;
            }

            console.error(`🔴 ERRO CRÍTICO no Node.js ao buscar ${url}:`, erroDetalhado);
            
            resultados.push({
                numero: numeroFormatado,
                status: status, 
            });
        }
    }

    res.json({
        sucesso: true,
        data: resultados
    });
});

app.listen(PORT, () => {
    console.log(`Servidor proxy rodando em http://localhost:${PORT}`);
    console.log(`Aguardando requisições do frontend...`);
});