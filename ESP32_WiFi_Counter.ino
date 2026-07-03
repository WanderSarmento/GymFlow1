/**
 * GymFlow - ESP32 Real-Time Occupancy Sensor (Single-Tenant / Wi-Fi Direto)
 *
 * Este sketch monitora dois pinos (sensores ou botões) conectados ao ESP32.
 * Ao detectar uma entrada ou saída, dispara uma requisição HTTP POST
 * contendo apenas a ação realizada: {"action": "in"} ou {"action": "out"}.
 * Não utiliza chaves de API — comunicação direta e limpa via Wi-Fi local.
 */

#include <HTTPClient.h>
#include <WiFi.h>

// =========================================================================
// CONFIGURAÇÃO DE MODO DE TRANSMISSÃO
// =========================================================================
// Defina como 'true' para enviar os dados dos botões via porta USB (Serial).
// Nesse modo, o ESP32 não precisa se conectar ao Wi-Fi. Certifique-se de
// rodar o comando 'npm run serial' na pasta do backend para escutar a porta.
// Defina como 'false' para enviar os dados via Wi-Fi (requisições HTTP POST).
const bool MODO_USB = false;

// Configurações de Wi-Fi (Utilizado apenas se MODO_USB for false)
const char *ssid = "NOME_DA_SUA_REDE_WIFI";
const char *password = "SENHA_DO_SEU_WIFI";

// Configurações do GymFlow API (Utilizado apenas se MODO_USB for false)
// Importante: Substitua pelo IP local da sua máquina rodando o backend Express
const char *serverUrl = "http://192.168.1.100:5000/api/v1/iot/update";

// Definições de Pinos
const int PIN_SENSOR_ENTRADA =
    12; // Pino do botão/sensor de entrada (ex: IR Barrier)
const int PIN_SENSOR_SAIDA =
    14; // Pino do botão/sensor de saída (ex: IR Barrier)
const int PIN_LED_INDICADOR =
    2; // LED interno do ESP32 (Pisca ao transmitir dados)

// Variáveis de Controle de Estado e Debounce
int ultimoEstadoEntrada = HIGH;
int ultimoEstadoSaida = HIGH;
unsigned long ultimoDebounceEntrada = 0;
unsigned long ultimoDebounceSaida = 0;
const unsigned long TEMPO_DEBOUNCE =
    150; // milissegundos para evitar dupla leitura

void setup() {
  Serial.begin(115200);

  // Configuração dos pinos (usando INPUT_PULLUP para simplificar conexões físicas)
  pinMode(PIN_SENSOR_ENTRADA, INPUT_PULLUP);
  pinMode(PIN_SENSOR_SAIDA, INPUT_PULLUP);
  pinMode(PIN_LED_INDICADOR, OUTPUT);
  digitalWrite(PIN_LED_INDICADOR, LOW);

  if (MODO_USB) {
    Serial.println("=========================================");
    Serial.println(" GYMFLOW ESP32 - Modo USB (Serial) Ativo ");
    Serial.println("=========================================");
    return;
  }

  Serial.println("=========================================");
  Serial.println(" GYMFLOW ESP32 - Modo Wi-Fi (HTTP) Ativo ");
  Serial.println(" Comunicação direta sem API Key          ");
  Serial.println("=========================================");

  // Inicializa conexão Wi-Fi
  Serial.println("Conectando ao Wi-Fi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("Wi-Fi Conectado!");
  Serial.print("Endereço IP do ESP32: ");
  Serial.println(WiFi.localIP());
}

// Função auxiliar para disparar requisição HTTP para o servidor GymFlow ou enviar por USB
void enviarAtualizacaoIoT(String acao) {
  if (MODO_USB) {
    // No modo USB, enviamos o comando diretamente via Serial.
    // O backend ouvinte (serialListener.js) interpreta "in" e "out".
    digitalWrite(PIN_LED_INDICADOR, HIGH);
    Serial.println(acao);
    delay(100); // Rápida piscada
    digitalWrite(PIN_LED_INDICADOR, LOW);
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Erro: Wi-Fi desconectado!");
    return;
  }

  digitalWrite(PIN_LED_INDICADOR, HIGH); // Liga o LED durante a transmissão

  HTTPClient http;

  // Configura a URL de destino
  http.begin(serverUrl);

  // Adiciona apenas o header de Content-Type (sem API Key)
  http.addHeader("Content-Type", "application/json");

  // Monta o payload JSON simples contendo apenas a ação
  String payload = "{\"action\":\"" + acao + "\"}";

  Serial.print("Enviando POST para a API... Ação: ");
  Serial.println(acao);

  // Envia a requisição POST
  int codigoRespostaHttp = http.POST(payload);

  // Trata o retorno
  if (codigoRespostaHttp > 0) {
    String resposta = http.getString();
    Serial.print("HTTP Status Code: ");
    Serial.println(codigoRespostaHttp);
    Serial.print("Resposta do Servidor: ");
    Serial.println(resposta);
  } else {
    Serial.print("Erro ao enviar POST HTTP: ");
    Serial.println(http.errorToString(codigoRespostaHttp).c_str());
  }

  http.end(); // Fecha a conexão

  digitalWrite(PIN_LED_INDICADOR, LOW); // Desliga o LED indicador
}

void loop() {
  int leituraEntrada = digitalRead(PIN_SENSOR_ENTRADA);
  int leituraSaida = digitalRead(PIN_SENSOR_SAIDA);

  // --- LOGICA DO SENSOR DE ENTRADA (Detecção de borda de descida) ---
  if (leituraEntrada != ultimoEstadoEntrada) {
    ultimoDebounceEntrada = millis();
  }

  if ((millis() - ultimoDebounceEntrada) > TEMPO_DEBOUNCE) {
    if (leituraEntrada == LOW && ultimoEstadoEntrada == HIGH) {
      if (!MODO_USB) {
        Serial.println("[ESP32] Movimento de ENTRADA detectado!");
      }
      enviarAtualizacaoIoT("in");
    }
  }
  ultimoEstadoEntrada = leituraEntrada;

  // --- LOGICA DO SENSOR DE SAIDA (Detecção de borda de descida) ---
  if (leituraSaida != ultimoEstadoSaida) {
    ultimoDebounceSaida = millis();
  }

  if ((millis() - ultimoDebounceSaida) > TEMPO_DEBOUNCE) {
    if (leituraSaida == LOW && ultimoEstadoSaida == HIGH) {
      if (!MODO_USB) {
        Serial.println("[ESP32] Movimento de SAÍDA detectado!");
      }
      enviarAtualizacaoIoT("out");
    }
  }
  ultimoEstadoSaida = leituraSaida;
}
