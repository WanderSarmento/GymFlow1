# Guia de Deploy - GymFlow

Este documento descreve como realizar o deploy da plataforma GymFlow em ambientes de produção. 

Como o sistema é composto por duas partes principais com necessidades diferentes, elas devem ser hospedadas em plataformas correspondentes:
1. **Frontend (React + Vite)**: Hospedado na **Vercel**.
2. **Backend (Node.js + WebSockets + SQLite/Prisma)**: Hospedado em um servidor persistente (como **Railway**, **Render** ou **Fly.io**).

---

## 1. Deploy do Backend (Express + WebSockets)

**ATENÇÃO**: O backend possui servidores de WebSocket (Socket.io) e processos contínuos que **não** podem rodar em servidores Serverless como a Vercel. Recomendamos plataformas como **Railway** ou **Render**.

### Passos para Deploy (Exemplo: Railway)
1. Crie uma conta em [railway.app](https://railway.app/).
2. Clique em **New Project** > **Deploy from GitHub repo** e selecione o repositório do GymFlow.
3. Nas configurações do projeto no Railway:
   * Defina a pasta raiz do deploy (Root Directory) como: `backend`
   * A porta da aplicação (`PORT`) será exposta automaticamente pelo Railway.
4. Adicione as seguintes **Variáveis de Ambiente (Variables)** no painel do Railway:
   * `PORT` = `5000`
   * `JWT_SECRET` = `sua_chave_secreta_jwt_segura`
   * `API_KEY` = `sua_chave_de_api_iot` (usada pelo ESP32)
   * `SUPABASE_URL` = `https://ahyxwftezscpocjubkuy.supabase.co`
   * `SUPABASE_KEY` = `sua_chave_anon_jwt`
   * `SUPABASE_ANON_KEY` = `sua_chave_anon_jwt`
   * `DATABASE_URL` = `sua_string_de_conexao_pooler_supabase`
   * `DIRECT_URL` = `sua_string_de_conexao_direta_supabase`
5. Uma vez concluído, o Railway gerará uma URL de produção para o seu backend (ex: `https://gymflow-backend.up.railway.app`).

---

## 2. Deploy do Frontend (React + Vite) na Vercel

O frontend é estático e ideal para ser hospedado na **Vercel**.

### Passo 1: Configurar o proxy de API
Abra o arquivo [frontend/vercel.json](file:///c:/Users/Mara%20Rubia/Documents/GymFlow/frontend/vercel.json) e substitua a URL placeholder pela URL gerada para o seu backend de produção:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://SUA-URL-DO-BACKEND.com/api/:path*"
    },
    {
      "source": "/((?!assets/|favicon.ico|index.html).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Passo 2: Configurar o Projeto na Vercel
1. Acesse [vercel.com](https://vercel.com/) e faça login.
2. Clique em **Add New...** > **Project** e selecione o seu repositório do GitHub.
3. Na seção **Configure Project**:
   * **Framework Preset**: Selecione **Vite** (geralmente detectado automaticamente).
   * **Root Directory**: **Importante!** Clique em **Edit** e selecione a pasta `frontend`.
4. Expanda a seção **Environment Variables** e adicione as seguintes variáveis:
   * `VITE_SUPABASE_URL` = `https://ahyxwftezscpocjubkuy.supabase.co`
   * `VITE_SUPABASE_ANON_KEY` = `sua_chave_anon_jwt`
   * `VITE_BACKEND_URL` = `https://SUA-URL-DO-BACKEND.com` (sem a barra `/` no final)
5. Clique em **Deploy**.

---

## 3. Dispositivo ESP32 (Físico)

Como o sensor de contagem está conectado fisicamente via USB ao computador local da academia, a escuta da porta serial deve continuar rodando localmente.

No computador onde o ESP32 está conectado via USB:
1. Certifique-se de que a porta correta está configurada no `.env` do backend (ex: `PORTA_USB_ESP32="COM6"`).
2. Configure o `API_URL` para apontar para o seu backend na nuvem:
   * `API_URL` = `https://SUA-URL-DO-BACKEND.com/api/v1/iot/update`
3. Execute o escutador de eventos serial localmente:
   ```bash
   npm run serial
   ```
