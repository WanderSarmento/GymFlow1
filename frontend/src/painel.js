// URL Real da API de produção/desenvolvimento
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api/v1'
  : '/api/v1';

// Função para mostrar notificações na interface sem usar alert()
function mostrarMensagem(texto) {
  const msgBox = document.getElementById('statusMsg');
  if (msgBox) {
    msgBox.innerText = texto;
    msgBox.classList.remove('hidden');
    setTimeout(() => {
      msgBox.classList.add('hidden');
    }, 2500);
  }
}

// Atualiza a tela inicialmente com os dados reais do banco
async function carregarOcupacao() {
  try {
    const res = await fetch(`${API_BASE}/web/ocupacao`);
    if (res.ok) {
      const dados = await res.json();
      const total = dados.currentOccupancy !== undefined ? dados.currentOccupancy : (dados.total_presentes || 0);
      const contadorEl = document.getElementById('contador');
      if (contadorEl) {
        contadorEl.innerText = total;
      }
    } else {
      mostrarMensagem('Erro ao carregar dados do servidor.');
    }
  } catch (err) {
    mostrarMensagem('Erro de rede ao carregar dados.');
  }
}

// Atualiza a ação enviando para a API real
async function enviarAcao(tipo) {
  try {
    const res = await fetch(`${API_BASE}/web/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: tipo })
    });
    const dados = await res.json();
    if (res.ok && dados.success) {
      const total = dados.total_presentes !== undefined ? dados.total_presentes : dados.currentOccupancy;
      const contadorEl = document.getElementById('contador');
      if (contadorEl) {
        contadorEl.innerText = total;
      }
      mostrarMensagem(`Ação registrada: ${tipo === 'in' ? 'Entrada' : 'Saída'}`);
    } else {
      mostrarMensagem(dados.error || 'Erro ao atualizar.');
    }
  } catch (err) { 
    mostrarMensagem('Erro ao atualizar banco.'); 
  }
}

// Define um valor fixo enviando para a API real
async function definirValor() {
  const input = document.getElementById('inputValor');
  if (!input) return;
  const valor = input.value;
  if (valor === "" || isNaN(valor)) {
    mostrarMensagem("Por favor, insira um número válido.");
    return;
  }
  
  try {
    const novoValor = parseInt(valor);
    if (novoValor < 0) {
      mostrarMensagem("O total de alunos não pode ser negativo.");
      return;
    }

    const res = await fetch(`${API_BASE}/web/set-value`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: novoValor })
    });
    const dados = await res.json();
    if (res.ok && dados.success) {
      const total = dados.total_presentes !== undefined ? dados.total_presentes : dados.currentOccupancy;
      const contadorEl = document.getElementById('contador');
      if (contadorEl) {
        contadorEl.innerText = total;
      }
      input.value = ""; // Limpa o input
      mostrarMensagem(`Fila redefinida para ${total}`);
    } else {
      mostrarMensagem(dados.error || 'Erro ao definir valor.');
    }
  } catch (err) { 
    mostrarMensagem('Erro ao definir valor.'); 
  }
}

// Configuração dos Listeners após o carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  carregarOcupacao();

  const btnOut = document.getElementById('btn-out');
  const btnIn = document.getElementById('btn-in');
  const btnSet = document.getElementById('btn-set');

  if (btnOut) btnOut.addEventListener('click', () => enviarAcao('out'));
  if (btnIn) btnIn.addEventListener('click', () => enviarAcao('in'));
  if (btnSet) btnSet.addEventListener('click', definirValor);
});
