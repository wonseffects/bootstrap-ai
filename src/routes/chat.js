const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const router = express.Router();

// Inicializa clientes
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Rota para enviar e receber mensagens
router.post('/', async (req, res) => {
    const { message } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Verificar o usuário e obter o ID
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido.' });
        }

        // 2. Salvar a mensagem do usuário no banco
        await supabase.from('messages').insert({
            user_id: user.id,
            content: message,
            role: 'user'
        });

        // 3. Buscar o histórico de conversas para dar contexto à IA
        const { data: history } = await supabase
            .from('messages')
            .select('content, role')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(20); // Limitar o contexto para não exceder o token da IA

        // 4. Preparar a conversa para a Groq
        const systemPrompt = {
            role: "system",
            content: `Você é um assistente especialista em programação, com foco total em Bootstrap 5. Sua missão é ajudar os desenvolvedores a criar interfaces responsivas e modernas usando Bootstrap. Forneça exemplos de código claros, explique as classes do Bootstrap e sugira melhores práticas de design. Formate suas respostas usando Markdown para que os blocos de código fiquem bem destacados e legíveis.`
        };

        const conversationForGroq = [systemPrompt, ...(history || [])];

        // 5. Chamar a API do Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: conversationForGroq,
            model: "llama3-8b-8192", // Modelo Llama 3 do Groq
            temperature: 0.7,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "Desculpe, não consegui entender.";

        // 6. Salvar a resposta da IA no banco
        await supabase.from('messages').insert({
            user_id: user.id,
            content: aiResponse,
            role: 'assistant'
        });

        // 7. Enviar a resposta para o frontend
        res.json({ reply: aiResponse });

    } catch (error) {
        console.error("Erro na rota /api/chat:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;