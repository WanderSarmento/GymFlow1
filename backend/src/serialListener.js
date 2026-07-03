const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');

// Carrega as variáveis de ambiente do arquivo .env localizado na pasta backend
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const PORTA_USB_ESP32 = process.env.PORTA_USB_ESP32 || 'COM3';
const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1/iot/update';

console.log(`===================================================`);
console.log(` 🔌 GYMFLOW - MONITOR DE CONEXÃO USB/SERIAL ESP32`);
console.log(`---------------------------------------------------`);
console.log(` 👉 Porta Serial:   ${PORTA_USB_ESP32}`);
console.log(` 👉 Endpoint API:   ${API_URL}`);
console.log(` 👉 Modo:           Single-Tenant (sem API Key)`);
console.log(`===================================================`);

let port = null;
let isReconnecting = false;

function connectSerial() {
  isReconnecting = false;
  console.log(`[USB] Tentando abrir conexão na porta ${PORTA_USB_ESP32}...`);

  port = new SerialPort({
    path: PORTA_USB_ESP32,
    baudRate: 115200,
    autoOpen: false
  });

  // Abre a porta serial de forma assíncrona
  port.open((err) => {
    if (err) {
      console.error(`❌ Erro ao abrir a porta serial ${PORTA_USB_ESP32}:`, err.message);
      triggerReconnect();
      return;
    }

    console.log(`✅ Conectado com sucesso à porta serial ${PORTA_USB_ESP32}!`);
    
    // Configura o leitor para processar linha a linha (\r\n)
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    parser.on('data', (dadosRecebidos) => {
      handleSerialData(dadosRecebidos);
    });
  });

  // Ouve evento de fechamento da porta (cabo desplugado)
  port.on('close', () => {
    console.warn(`⚠️ Porta serial ${PORTA_USB_ESP32} foi fechada.`);
    triggerReconnect();
  });

  // Tratamento de erros inesperados
  port.on('error', (err) => {
    console.error(`❌ Erro inesperado na porta USB/Serial:`, err.message);
  });
}

// Dispara a rotina de reconexão segura a cada 5 segundos
function triggerReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;

  if (port) {
    port.removeAllListeners();
    port = null;
  }

  console.log(`[USB] Tentando reconectar em 5 segundos...`);
  setTimeout(() => {
    connectSerial();
  }, 5000);
}

// Processa as mensagens enviadas pelo ESP32 via Serial
async function handleSerialData(rawMsg) {
  const msg = rawMsg.trim();
  if (!msg) return;

  console.log(`[USB] Dado recebido do ESP32: "${msg}"`);

  let action = null;
  
  // Mapeia tanto o formato direto ('in'/'out') quanto logs gerados pela Arduino IDE
  if (msg === 'in' || msg.toUpperCase().includes('ENTRADA')) {
    action = 'in';
  } else if (msg === 'out' || msg.toUpperCase().includes('SAIDA') || msg.toUpperCase().includes('SAÍDA')) {
    action = 'out';
  }

  if (!action) {
    // Ignora outras mensagens informativas/de depuração do ESP32
    return;
  }

  console.log(
    action === 'in'
      ? "➡️ Aluno entrando detectado! Somando na fila virtual..."
      : "⬅️ Aluno saindo detectado! Subtraindo da fila virtual..."
  );

  // Envia a requisição POST para a API do GymFlow (sem X-API-KEY)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Sincronizado! Ocupação Atual: ${data.currentOccupancy}/${data.capacity} (Academia ${data.isOpen ? 'Aberta' : 'Fechada'})`);
    } else {
      console.error(`❌ Erro retornado pela API:`, data.error || response.statusText);
    }
  } catch (error) {
    console.error(`❌ Erro de rede ao conectar com a API do GymFlow:`, error.message);
  }
}

// Inicializa a primeira tentativa de conexão
connectSerial();
