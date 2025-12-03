// ARQUIVO: medilab-proxy.js (Rodando no Node.js via Render)

const express = require('express');
const axios = require('axios'); 

const app = express();
const PORT = 3000;
const BASE_URL_SCRIPTS = 'http://medilab.tecnologia.ws/scriptsbd';

// Middleware para CORS (permite que o frontend acesse este servidor)
app.use((req, res, next) => {
    // Nota: O Render usa a porta 10000. O localhost:3000 é apenas um placeholder nos logs.
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Middleware para entender JSON
app.use(express.json()); 

/**
 * ROTA 1: Busca e consolida todos os scripts em um intervalo (Usado para o botão de download)
 */
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
            // Requisição com Axios (com tratamento de erro aprimorado)
            const response = await axios.get(url, { timeout: 15000 }); // Aumentamos o timeout para 15s

            if (response.status === 200) { 
                resultados.push({
                    numero: numeroFormatado,
                    url: url,
                    status: 'Disponível',
                    conteudo: response.data // Conteúdo para consolidação
                });
            } else {
                 resultados.push({
                    numero: numeroFormatado,
                    status: `Erro HTTP ${response.status}`,
                });
            }

        } catch (error) {
            let status = 'Erro de rede';
            let erroDetalhado = error.message;

            if (error.response) {
                status = `Erro HTTP ${error.response.status}`;
                if (error.response.status === 404) {
                    status = 'Não encontrado';
                }
            } else if (error.code) {
                status = `Erro de rede: ${error.code}`;
            } else if (erroDetalhado.includes('timeout')) {
                status = 'Erro de rede: Tempo limite (Timeout)';
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

/**
 * ROTA 2: Busca o conteúdo de um script específico (Usado para a pré-visualização)
 */
app.post('/api/fetch-script', async (req, res) => {
    const { url } = req.body; // A URL completa do script é enviada pelo frontend

    if (!url) {
        return res.status(400).json({ error: 'URL do script ausente.' });
    }

    try {
        // Axios busca o conteúdo do script externo
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.status === 200) {
            // Retorna apenas o conteúdo
            return res.json({ sucesso: true, content: response.data });
        } else {
            return res.status(404).json({ sucesso: false, error: 'Script não encontrado no destino.' });
        }
    } catch (error) {
        let erroDetalhado = (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) 
                            ? 'Tempo limite esgotado' 
                            : 'Falha de rede (Bloqueio)';
                            
        console.error("Erro no proxy ao buscar script específico:", error.message);
        return res.status(500).json({ sucesso: false, error: erroDetalhado });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor proxy rodando em http://localhost:${PORT}`);
    console.log(`Aguardando requisições do frontend...`);
});
