// CONFIGURAÇÃO - Troque pela URL do seu backend no Railway
const BACKEND_URL = 'http://localhost:3000'; // Mude para a URL do Railway após o deploy

// CONFIGURAÇÃO DO SUPABASE (Frontend)
const { createClient } = window.supabase;
const supabase = createClient(
    'postgresql://postgres.eanvcvxvckalashwccru:R27Ik7BgoguRkkZg@aws-1-us-east-1.pooler.supabase.com:5432/postgres', // Cole aqui a URL do seu projeto Supabase
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbnZjdnh2Y2thbGFzaHdjY3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2ODUwMzEsImV4cCI6MjA4NjI2MTAzMX0.I22_XFboomVmDuqJnA1giXUThApfQ5C-DW4CldUwaIg' // Cole aqui a chave ANON do seu projeto Supabase
);

// Elementos do DOM
const loginView = document.getElementById('login-view');
const chatView = document.getElementById('chat-view');
const authForm = document.getElementById('auth-form');
const authBtn = document.getElementById('auth-btn');
const toggleSignupBtn = document.getElementById('toggle-signup');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const logoutBtn = document.getElementById('logout-btn');

let isSigningUp = false;
let currentUser = null;

// Função para alternar entre as telas
function showView(view) {
    if (view === 'login') {
        loginView.style.display = 'flex';
        chatView.style.display = 'none';
    } else {
        loginView.style.display = 'none';
        chatView.style.display = 'flex';
    }
}

// Função para formatar a mensagem da IA (adiciona <pre><code> nos blocos de código)
function formatMessage(text) {
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });
}

// Função para adicionar mensagem ao chat
function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    // Se for uma mensagem da IA, formata o Markdown
    if (role === 'assistant') {
        messageDiv.innerHTML = formatMessage(content);
    } else {
        messageDiv.textContent = content;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Rolagem automática
}

// AUTENTICAÇÃO
toggleSignupBtn.addEventListener('click', () => {
    isSigningUp = !isSigningUp;
    authBtn.textContent = isSigningUp ? 'Cadastrar' : 'Entrar';
    toggleSignupBtn.textContent = isSigningUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authBtn.disabled = true;
    authBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Carregando...';

    let authResult;
    if (isSigningUp) {
        authResult = await supabase.auth.signUp({ email, password });
    } else {
        authResult = await supabase.auth.signInWithPassword({ email, password });
    }

    authBtn.disabled = false;
    authBtn.textContent = isSigningUp ? 'Cadastrar' : 'Entrar';

    if (authResult.error) {
        alert('Erro: ' + authResult.error.message);
    } else {
        currentUser = authResult.data.user;
        showView('chat');
    }
});

// LÓGICA DO CHAT
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    // Pega o token de sessão do usuário
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert("Sessão expirada. Faça login novamente.");
        showView('login');
        return;
    }

    // Adiciona a mensagem do usuário na UI
    addMessage(message, 'user');
    messageInput.value = '';
    messageInput.disabled = true;
    document.getElementById('send-btn').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        if (response.ok) {
            addMessage(data.reply, 'assistant');
        } else {
            addMessage(`Erro: ${data.error}`, 'assistant');
        }
    } catch (error) {
        addMessage('Erro ao conectar com o servidor.', 'assistant');
        console.error(error);
    } finally {
        messageInput.disabled = false;
        document.getElementById('send-btn').innerHTML = '<i class="bi bi-send-fill"></i>';
        messageInput.focus();
    }
});

// LOGOUT
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    showView('login');
});

// VERIFICAR SE O USUÁRIO JÁ ESTÁ LOGADO AO CARREGAR A PÁGINA
window.addEventListener('load', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showView('chat');
    }
});