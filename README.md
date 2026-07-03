# GymFlow SaaS ⚡

GymFlow é uma plataforma SaaS Multi-tenant altamente escalável para monitoramento de lotação de academias em tempo real. O sistema utiliza WebSockets (Socket.io) para atualizações instantâneas sem F5, e expõe um endpoint único e seguro para conexão de dispositivos IoT (como microcontroladores ESP32).

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para iniciar o backend e o frontend no seu computador.

### Passo 1: Executar o Servidor Backend (Node.js)

1. Entre no diretório do backend:
   ```bash
   cd backend
   ```
2. Inicialize o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O backend estará rodando na porta `5000`.*
   *O banco de dados SQLite local (`dev.db`) já foi criado e semeado com dados históricos automaticamente durante a instalação.*

### Passo 2: Executar o Cliente Frontend (React + Vite)

1. Abra outro terminal na raiz do projeto e entre no diretório do frontend:
   ```bash
   cd frontend
   ```
2. Inicie o servidor de desenvolvimento do Vite:
   ```bash
   npm run dev
   ```
   *O frontend estará rodando em [http://localhost:3000](http://localhost:3000).*

---

## 🔑 Credenciais Prontas de Demonstração (Seed)

O banco de dados já possui dois perfis configurados para teste imediato:

1. **Super Administrador (SaaS Global)**
   - **E-mail:** `admin@gymflow.com`
   - **Senha:** `adminpassword123`
   - *Acesso a:* Métricas financeiras globais (MRR), conexões IoT de todas as unidades, lista de academias, ativação/suspensão instantânea de contas e cadastro de novas academias.

2. **Dono de Academia (Tenant "Centro")**
   - **E-mail:** `owner@gymflow.com`
   - **Senha:** `ownerpassword123`
   - *Acesso a:* Controle de status operacional (Aberta/Fechada), ajuste dinâmico de capacidade máxima, chave API Key de hardware, **Dashboard de Horários de Pico** (gráficos) e o **Simulador Físico do ESP32**.

---

## 🧪 Como Testar a Plataforma em Tempo Real (Sem Hardware Físico)

Desenvolvemos um **Simulador de ESP32 integrado** diretamente no painel do Dono da Academia para que você consiga visualizar todo o fluxo em tempo real de forma extremamente simples:

1. Acesse o sistema como Dono da Academia usando o login `owner@gymflow.com`.
2. No cabeçalho superior direito, clique em **"Ver Tela Pública"**. Isso abrirá a tela do aluno em uma nova aba `/gym/gymflow-centro`.
3. Arrume suas janelas do navegador lado a lado:
   - **Esquerda:** Painel Administrativo do Gestor.
   - **Direita:** Tela Pública de visualização de lotação.
4. No Painel Administrativo, procure o card cinza escuro intitulado **`ESP32_DEV_KIT_V1`** (o microchip simulado).
5. Clique em **"Entrada (PIN_12)"** ou **"Saída (PIN_14)"**:
   - O chip enviará um `POST /api/v1/iot/update` real contendo o header de autenticação `X-API-KEY`.
   - O servidor receberá o sinal, registrará os dados de log, atualizará a contagem no banco e propagará o sinal instantaneamente para as duas abas.
   - Você verá os números mudarem e a barra de progresso pulsar sem precisar recarregar a página!

---

## 🔌 Conectando um ESP32 Físico

O firmware do ESP32 suporta dois modos de comunicação. Abra o arquivo [ESP32_WiFi_Counter.ino](file:///c:/Users/Wander%20Sarmento/Documents/GYMFLUXO/ESP32_WiFi_Counter.ino) na Arduino IDE e defina a constante `MODO_USB` conforme o desejado:

### 📶 Opção A: Modo Wi-Fi (MODO_USB = false)
1. No arquivo `.ino`, defina `const bool MODO_USB = false;`.
2. Insira o nome e a senha do seu Wi-Fi nas constantes `ssid` e `password`.
3. Substitua o `serverUrl` pelo endereço IP local da sua máquina em que o backend está rodando (ex: `http://192.168.1.100:5000/api/v1/iot/update`).
4. Copie a **API Key** do painel do gestor e insira na variável `apiKey`.
5. Carregue o código no ESP32.
6. Conecte botões de pressão ou sensores ópticos reflexivos nos pinos `GPIO 12` e `GPIO 14` fechando com o `GND`.

### 💻 Opção B: Conexão Local Direta via USB (MODO_USB = true)

Caso não queira configurar o Wi-Fi do ESP32 ou prefira uma conexão cabeada serial estável:

1. No arquivo `.ino`, defina `const bool MODO_USB = true;` (não é necessário configurar SSID, Senha ou API Key no firmware).
2. Carregue o código no ESP32.
3. Conecte o ESP32 ao computador via cabo USB.
4. Identifique a porta COM exata em que o microcontrolador está conectado (ex: `COM6` no Windows).
5. Configure essa porta no arquivo [backend/.env](file:///c:/Users/Wander%20Sarmento/Documents/GYMFLUXO/backend/.env) (variável `PORTA_USB_ESP32`).
6. Garanta que a `API_KEY` no arquivo `backend/.env` corresponda à API Key da academia mostrada no painel.npm 
7. No diretório do backend, inicie o ouvinte serial com o comando:
   ```bash
   npm run serial
   ```
   *O script começará a ler os dados gerados pelo ESP32 via USB e redirecionará a ação para a API local em tempo real, disparando as atualizações no banco de dados e nos WebSockets do painel.*


---

## 🛡️ Arquitetura de Segurança e Multi-tenant
- **Rotas de APIs Restritas:** Protegidas por tokens JWT, decodificados no middleware `auth.middleware.js` com validações de papéis (RBAC).
- **Endpoint do Hardware Único:** `POST /api/v1/iot/update` utiliza o middleware `iot.middleware.js` que decodifica o header `X-API-KEY` para isolar a gravação lógica por `gym_id`.
- **Isolamento de WebSockets:** Utiliza salas (`socket.join('gym:gym_id')` e `socket.join('gym:slug')`) para garantir que os navegadores recebam apenas os pacotes de lotação relativos à respectiva academia.
- **Relatório de Picos:** Consulta dinâmica agregada por hora com média matemática real sobre as tabelas de log `OccupancyLog`.
