/**
 * Central da Cana - Distribuição & Delivery (Rondonópolis - MT)
 * Engenharia de Software por NyxCipher (Alexa) - Contato: (66) 99612-8149
 */

const API_BASE = '/api';

// Estado global da aplicação
const state = {
  settings: null,
  products: [],
  cart: [],
  selectedCategory: 'todos',
  selectedBairroId: 'b1',
  alarmEnabled: localStorage.getItem('central_da_cana_alarm_enabled') !== 'false',
  knownOrderIds: new Set(),
  // ADM
  adminToken: localStorage.getItem('central_cana_admin_token') || null,
  adminData: {
    orders: [],
    b2bClients: [],
    products: [],
    financial: null,
    inventory: []
  },
  activeAdmSubtab: 'kanban'
};

// ==========================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO & SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.log('SW registration note:', err);
    });
  });
}

// Captura evento de instalação PWA (Android / Chrome)
let deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const btn = document.getElementById('btn-install-app-header');
  if (btn) btn.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadProducts();
  setupBairrosDropdown();
  renderProductsB2C();
  renderProductsB2B();
  updateCartBadge();
  updateAttendantUI();
  updateAlarmUI();

  // Verifica se o admin já está logado
  if (state.adminToken) {
    showAdminDashboard();
  }

  // Atualização periódica dos ícones Lucide
  refreshIcons();

  // Atualiza atendente e ícones a cada 60 segundos
  setInterval(() => {
    updateAttendantUI();
  }, 60000);

  // Polling rápido de pedidos (a cada 3.5 segundos) para despertar o alarme em tempo real no ADM
  setInterval(() => {
    if (state.adminToken && !document.getElementById('view-adm').classList.contains('hidden')) {
      loadAdminOrders(false);
    }
  }, 3500);
});

// ==========================================
// SINTETIZADOR DE ÁUDIO WEB AUDIO API (ALARME DE PEDIDOS)
// ==========================================
let audioCtx = null;
let alarmLoopInterval = null;
let isAlarmCurrentlyRinging = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Toca uma sequência sonora de campainha de delivery (três tons agradáveis e chamativos)
function playToneSequence() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, duration: 0.18, start: 0 },       // D5
      { freq: 880.00, duration: 0.22, start: 0.18 },    // A5
      { freq: 1174.66, duration: 0.45, start: 0.40 }    // D6
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      // Volume com ataque rápido e decaimento natural
      gain.gain.setValueAtTime(0.001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.4, now + n.start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.start);
      osc.stop(now + n.start + n.duration);
    });
  } catch (err) {
    console.warn('Erro ao sintetizar tom de áudio:', err);
  }
}

// Dispara o alarme sonoro em repetição e a faixa visual de alerta
function startOrderAlarmLoop(order) {
  if (state.alarmEnabled === false) return;

  isAlarmCurrentlyRinging = true;
  playToneSequence();

  // Exibe a faixa de alerta urgente no topo do ADM
  const banner = document.getElementById('adm-alarm-banner');
  if (banner && order) {
    const codeEl = document.getElementById('alarm-banner-order-code');
    const custEl = document.getElementById('alarm-banner-customer-name');
    const totEl = document.getElementById('alarm-banner-total');
    if (codeEl) codeEl.textContent = `#${order.code}`;
    if (custEl) custEl.textContent = order.customerName || 'Cliente';
    if (totEl) totEl.textContent = `R$ ${parseFloat(order.total || 0).toFixed(2)}`;
    banner.classList.remove('hidden');
  }

  // Dispara notificação nativa do navegador se autorizada
  triggerBrowserNotification(order);

  // Repete o alarme a cada 2.5 segundos
  if (alarmLoopInterval) clearInterval(alarmLoopInterval);
  alarmLoopInterval = setInterval(() => {
    if (isAlarmCurrentlyRinging && state.alarmEnabled) {
      playToneSequence();
    } else {
      clearInterval(alarmLoopInterval);
      alarmLoopInterval = null;
    }
  }, 2500);

  // Auto-pausa o som após 25 segundos para poupar bateria
  setTimeout(() => {
    if (isAlarmCurrentlyRinging) {
      stopOrderAlarmSoundOnly();
    }
  }, 25000);
}

function stopOrderAlarm() {
  isAlarmCurrentlyRinging = false;
  if (alarmLoopInterval) {
    clearInterval(alarmLoopInterval);
    alarmLoopInterval = null;
  }
  const banner = document.getElementById('adm-alarm-banner');
  if (banner) banner.classList.add('hidden');
}

function stopOrderAlarmSoundOnly() {
  isAlarmCurrentlyRinging = false;
  if (alarmLoopInterval) {
    clearInterval(alarmLoopInterval);
    alarmLoopInterval = null;
  }
}

function testOrderAlarm() {
  getAudioContext();
  playToneSequence();
  showToast('🔊 Som de teste do alarme emitido com sucesso!', 'info');
}

function toggleOrderAlarm() {
  state.alarmEnabled = !state.alarmEnabled;
  localStorage.setItem('central_da_cana_alarm_enabled', state.alarmEnabled);
  updateAlarmUI();
  if (state.alarmEnabled) {
    showToast('🔔 Alarme sonoro de novos pedidos ATIVADO!', 'success');
    testOrderAlarm();
  } else {
    stopOrderAlarm();
    showToast('🔕 Alarme sonoro DESATIVADO.', 'warning');
  }
}

function updateAlarmUI() {
  const statusEl = document.getElementById('adm-alarm-status');
  const indEl = document.getElementById('adm-alarm-indicator');
  if (statusEl) {
    statusEl.textContent = state.alarmEnabled ? 'ATIVADO' : 'DESLIGADO';
    statusEl.className = state.alarmEnabled ? 'text-emerald-700 font-extrabold' : 'text-stone-500 font-bold';
  }
  if (indEl) {
    indEl.className = state.alarmEnabled ? 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' : 'w-2 h-2 rounded-full bg-stone-400';
  }
}

function focusNewOrderInKanban() {
  stopOrderAlarm();
  switchAdmTab('kanban');
  const novoCol = document.getElementById('kanban-col-novo');
  if (novoCol) {
    novoCol.scrollIntoView({ behavior: 'smooth' });
    novoCol.classList.add('ring-4', 'ring-garapa-400');
    setTimeout(() => novoCol.classList.remove('ring-4', 'ring-garapa-400'), 3000);
  }
}

function triggerBrowserNotification(order) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(`🎋 Central da Cana: Novo Pedido #${order.code}!`, {
        body: `${order.customerName} - R$ ${parseFloat(order.total || 0).toFixed(2)} em ${order.bairro}`,
        icon: '/icon-192.png'
      });
    } catch (e) {
      console.warn('Erro ao disparar notificação:', e);
    }
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// ==========================================
// MODAL DE INSTALAÇÃO DO APP (PWA)
// ==========================================
function showInstallModal() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const iosBox = document.getElementById('pwa-install-action-ios');
  const androidBox = document.getElementById('pwa-install-action-android');

  if (isIOS) {
    if (iosBox) iosBox.classList.remove('hidden');
    if (androidBox) androidBox.classList.add('hidden');
  } else {
    if (iosBox) iosBox.classList.add('hidden');
    if (androidBox) androidBox.classList.remove('hidden');
  }

  document.getElementById('modal-install-app').classList.remove('hidden');
  refreshIcons();
}

function closeInstallModal() {
  document.getElementById('modal-install-app').classList.add('hidden');
}

function triggerPWAInstall() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    deferredPwaPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('Aplicativo instalado com sucesso!', 'success');
      }
      deferredPwaPrompt = null;
      closeInstallModal();
    });
  } else {
    showToast('Para instalar: toque no menu (⋮) do seu navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".', 'info');
  }
}

// ==========================================
// ESCALA DE ATENDIMENTO: ALEXA (9h-17h) & JOSUÉ (17h-20h)
// ==========================================
function getCurrentAttendant() {
  const now = new Date();
  const hour = now.getHours();

  // Das 09:00 até 17:00 (09h00 até 16h59) -> Alexa (66999536712)
  // Das 17:00 às 20:00 (17h00 até 19h59) -> Josué (66996833628)
  if (hour >= 9 && hour < 17) {
    return {
      id: "alexa",
      name: "Alexa",
      role: "Pedir com Alexa",
      phone: "66999536712",
      phoneFormatted: "(66) 99953-6712",
      schedule: "09h às 17h",
      badgeText: "09h às 17h: Alexa",
      greeting: "Olá Alexa, gostaria de fazer um pedido de caldo de cana!",
      avatar: "A"
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      id: "josue",
      name: "Josué",
      role: "Pedir com Josué",
      phone: "66996833628",
      phoneFormatted: "(66) 99683-3628",
      schedule: "17h às 20h",
      badgeText: "17h às 20h: Josué",
      greeting: "Olá Josué, gostaria de fazer um pedido de caldo de cana!",
      avatar: "J"
    };
  } else {
    // Fora do expediente principal: define de acordo com a proximidade do próximo turno
    const isMorning = hour < 9;
    return {
      id: isMorning ? "alexa" : "josue",
      name: isMorning ? "Alexa" : "Josué",
      role: isMorning ? "Pedir com Alexa (09h-17h)" : "Pedir com Josué (17h-20h)",
      phone: isMorning ? "66999536712" : "66996833628",
      phoneFormatted: isMorning ? "(66) 99953-6712" : "(66) 99683-3628",
      schedule: isMorning ? "09h às 17h" : "17h às 20h",
      badgeText: isMorning ? "Abertura às 09h: Alexa" : "Atendimento às 17h: Josué",
      greeting: `Olá ${isMorning ? 'Alexa' : 'Josué'}, gostaria de deixar meu pedido de caldo de cana agendado!`,
      avatar: isMorning ? "A" : "J",
      isOffHours: true
    };
  }
}

function updateAttendantUI() {
  const attendant = getCurrentAttendant();

  // 1. Atualiza botão do cabeçalho
  const headerBtn = document.getElementById('header-attendant-btn');
  const headerText = document.getElementById('header-attendant-text');
  if (headerBtn && headerText) {
    headerBtn.href = `https://wa.me/55${attendant.phone}?text=${encodeURIComponent(attendant.greeting)}`;
    headerText.textContent = `${attendant.role} (${attendant.schedule})`;
  }

  // 2. Atualiza badge do banner informativo
  const bannerBadge = document.getElementById('banner-active-attendant');
  if (bannerBadge) {
    bannerBadge.textContent = attendant.badgeText;
  }

  // 3. Atualiza indicador no carrinho
  const cartTimeBadge = document.getElementById('cart-attendant-time-badge');
  const cartName = document.getElementById('cart-attendant-name');
  const cartPhone = document.getElementById('cart-attendant-phone');
  const cartAvatar = document.getElementById('cart-attendant-avatar');
  const cartIndicator = document.getElementById('cart-attendant-indicator');

  if (cartTimeBadge) cartTimeBadge.textContent = attendant.schedule;
  if (cartName) cartName.textContent = attendant.role;
  if (cartPhone) cartPhone.textContent = attendant.phoneFormatted;
  if (cartAvatar) cartAvatar.textContent = attendant.avatar;
  if (cartIndicator) {
    cartIndicator.textContent = attendant.isOffHours ? 'Agendamento' : 'Turno Ativo';
  }
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Mostra toast visual
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-800 text-white';
  
  toast.className = `${bg} px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 pointer-events-auto animate-fade-in transition-all`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 2. REQUISIÇÕES BÁSICAS (SETTINGS & PRODUTOS)
// ==========================================
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    state.settings = await res.json();
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    state.products = await res.json();
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

function setupBairrosDropdown() {
  const select = document.getElementById('cart-bairro-select');
  const b2bSelect = document.getElementById('b2b-form-bairro');
  if (!state.settings || !state.settings.bairros) return;

  select.innerHTML = '';
  if (b2bSelect) b2bSelect.innerHTML = '';

  state.settings.bairros.forEach(b => {
    const feeText = b.fee === 0 ? 'Grátis' : `+ R$ ${b.fee.toFixed(2)}`;
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.name} (${feeText} • ${b.time})`;
    select.appendChild(opt);

    if (b2bSelect && b.id !== 'b0') {
      const optB2B = document.createElement('option');
      optB2B.value = b.name;
      optB2B.textContent = b.name;
      b2bSelect.appendChild(optB2B);
    }
  });

  // Default para Jd. Santa Marta
  select.value = 'b1';
  state.selectedBairroId = 'b1';
}

// ==========================================
// 3. NAVEGAÇÃO ENTRE TELAS PRINCIPAIS
// ==========================================
function switchTab(tabId) {
  // Esconde todas
  document.getElementById('view-delivery').classList.add('hidden');
  document.getElementById('view-atacado').classList.add('hidden');
  document.getElementById('view-adm').classList.add('hidden');

  // Remove classe ativa de todos os botões
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active-tab'));

  if (tabId === 'delivery') {
    document.getElementById('view-delivery').classList.remove('hidden');
    document.getElementById('nav-btn-delivery').classList.add('active-tab');
    const quickBar = document.getElementById('floating-quick-cart');
    if (quickBar && state.cart.length > 0) {
      quickBar.classList.remove('hidden');
    }
  } else if (tabId === 'atacado') {
    document.getElementById('view-atacado').classList.remove('hidden');
    document.getElementById('nav-btn-atacado').classList.add('active-tab');
    const quickBar = document.getElementById('floating-quick-cart');
    if (quickBar) quickBar.classList.add('hidden');
  } else if (tabId === 'adm') {
    document.getElementById('view-adm').classList.remove('hidden');
    document.getElementById('nav-btn-adm').classList.add('active-tab');
    const quickBar = document.getElementById('floating-quick-cart');
    if (quickBar) quickBar.classList.add('hidden');
    if (state.adminToken) {
      refreshAdminData();
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshIcons();
}

// ==========================================
// 4. CARDÁPIO B2C (DELIVERY)
// ==========================================
function filterCategory(cat) {
  state.selectedCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.remove('active-cat');
  });
  event.target.classList.add('active-cat');
  renderProductsB2C();
}

function renderProductsB2C() {
  const container = document.getElementById('products-grid-b2c');
  container.innerHTML = '';

  const b2cProducts = state.products.filter(p => !p.isB2B);
  const filtered = state.selectedCategory === 'todos'
    ? b2cProducts
    : b2cProducts.filter(p => p.category === state.selectedCategory);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-stone-400">
        <p class="text-sm">Nenhum item encontrado nesta categoria no momento.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = `bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col justify-between card-hover relative overflow-hidden ${!p.inStock ? 'opacity-60 grayscale' : ''}`;
    
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-12 h-12 bg-garapa-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
            ${p.icon || '🥤'}
          </div>
          <span class="bg-stone-100 text-stone-600 text-[11px] font-bold px-2.5 py-1 rounded-xl">
            ${p.unit || 'Unidade'}
          </span>
        </div>

        <h4 class="font-extrabold text-stone-900 text-base mb-1">${p.name}</h4>
        <p class="text-xs text-stone-500 leading-relaxed mb-4">${p.description || ''}</p>
      </div>

      <div class="pt-3 border-t border-stone-100 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-stone-400 uppercase font-bold block">Preço</span>
          <span class="text-lg font-black text-cana-800">R$ ${p.price.toFixed(2)}</span>
        </div>

        ${p.inStock ? `
          <button onclick="addToCart('${p.id}')" class="bg-cana-700 hover:bg-cana-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Pedir</span>
          </button>
        ` : `
          <span class="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">Esgotado</span>
        `}
      </div>
    `;

    container.appendChild(card);
  });

  refreshIcons();
}

// ==========================================
// 5. PRODUTOS DE ATACADO (B2B)
// ==========================================
function renderProductsB2B() {
  const container = document.getElementById('products-grid-b2b');
  container.innerHTML = '';

  const b2bProducts = state.products.filter(p => p.isB2B);

  b2bProducts.forEach(p => {
    const card = document.createElement('div');
    card.className = "bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="w-12 h-12 bg-cana-100 rounded-2xl flex items-center justify-center text-2xl">
            ${p.icon || '🌾'}
          </div>
          <span class="bg-cana-50 text-cana-800 text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-cana-200">
            ${p.unit}
          </span>
        </div>
        <h4 class="font-bold text-stone-900 text-sm mb-1">${p.name}</h4>
        <p class="text-xs text-stone-500 leading-relaxed mb-4">${p.description}</p>
      </div>

      <div class="pt-3 border-t border-stone-100 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-stone-400 font-bold uppercase">Preço Atacado</span>
          <span class="text-base font-black text-cana-900">R$ ${p.price.toFixed(2)}</span>
        </div>
        <button onclick="prefillB2BOrder('${p.name}')" class="bg-stone-900 hover:bg-stone-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition">
          Cotar
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  refreshIcons();
}

function prefillB2BOrder(productName) {
  const textarea = document.getElementById('b2b-form-items');
  textarea.value = `Gostaria de cotar o fornecimento de: ${productName}`;
  textarea.focus();
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function submitB2BOrder(e) {
  e.preventDefault();
  const name = document.getElementById('b2b-form-name').value.trim();
  const resp = document.getElementById('b2b-form-resp').value.trim();
  const phone = document.getElementById('b2b-form-phone').value.trim();
  const bairro = document.getElementById('b2b-form-bairro').value;
  const address = document.getElementById('b2b-form-address').value.trim();
  const items = document.getElementById('b2b-form-items').value.trim();

  const msg = 
`*SOLICITAÇÃO DE FORNECIMENTO / ATACADO DE CANA*
----------------------------------------
🏢 *Estabelecimento:* ${name}
👤 *Responsável:* ${resp}
📱 *WhatsApp:* ${phone}
📍 *Bairro:* ${bairro}
🏠 *Endereço:* ${address}
----------------------------------------
📦 *Itens Desejados:*
${items}
----------------------------------------
_Enviado através da plataforma Central da Cana (Rondonópolis)_`;

  const attendant = getCurrentAttendant();
  const encoded = encodeURIComponent(msg);
  const url = `https://wa.me/55${attendant.phone}?text=${encoded}`;
  window.open(url, '_blank');
  showToast(`Solicitação pronta! Enviando para o WhatsApp (${attendant.name})...`, 'success');
}

// ==========================================
// 6. CARRINHO & SACOLA DE DELIVERY
// ==========================================
function addToCart(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = state.cart.find(item => item.product.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      product: prod,
      quantity: 1,
      notes: ''
    });
  }

  updateCartBadge();
  renderCartItems();
  showToast(`${prod.name} adicionado à sacola!`, 'success');
}

function updateCartQty(productId, delta) {
  const item = state.cart.find(i => i.product.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.product.id !== productId);
  }

  updateCartBadge();
  renderCartItems();
}

function updateCartBadge() {
  const totalItems = state.cart.reduce((acc, cur) => acc + cur.quantity, 0);
  const badge = document.getElementById('cart-badge-count');
  badge.textContent = totalItems;
  if (totalItems > 0) {
    badge.classList.add('animate-bounce');
    setTimeout(() => badge.classList.remove('animate-bounce'), 800);
  }
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-drawer-backdrop');

  const isOpen = !drawer.classList.contains('translate-x-full');

  if (isOpen) {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('hidden');
  } else {
    renderCartItems();
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
  }
}

function updateCartDeliveryFee() {
  const select = document.getElementById('cart-bairro-select');
  state.selectedBairroId = select.value;

  const addrWrapper = document.getElementById('cart-address-wrapper');
  if (state.selectedBairroId === 'b0') {
    // Retirada no balcão
    addrWrapper.classList.add('hidden');
  } else {
    addrWrapper.classList.remove('hidden');
  }

  renderCartItems();
}

function toggleChangeInput() {
  const method = document.querySelector('input[name="payment_method"]:checked')?.value;
  const trocoWrapper = document.getElementById('cart-troco-wrapper');
  if (method === 'dinheiro') {
    trocoWrapper.classList.remove('hidden');
  } else {
    trocoWrapper.classList.add('hidden');
  }
}

function renderCartItems() {
  const container = document.getElementById('cart-items-container');
  container.innerHTML = '';

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center text-stone-400 py-12">
        <i data-lucide="shopping-bag" class="w-12 h-12 stroke-[1.5] text-stone-300 mb-2"></i>
        <p class="text-sm font-bold text-stone-600">Sua sacola está vazia</p>
        <p class="text-xs text-stone-400 mt-1 max-w-[200px]">Escolha seu caldo de cana geladinho ou toletes no cardápio.</p>
      </div>
    `;
    updateCartTotals(0, 0);
    refreshIcons();
    return;
  }

  let subtotal = 0;

  state.cart.forEach(item => {
    const itemTotal = item.product.price * item.quantity;
    subtotal += itemTotal;

    const row = document.createElement('div');
    row.className = "bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-3";
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-garapa-100 flex items-center justify-center text-lg">
          ${item.product.icon || '🥤'}
        </div>
        <div>
          <h5 class="font-bold text-stone-900 text-xs">${item.product.name}</h5>
          <span class="text-[11px] text-stone-400">R$ ${item.product.price.toFixed(2)} cada</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200">
          <button onclick="updateCartQty('${item.product.id}', -1)" class="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-900 font-extrabold text-sm">-</button>
          <span class="w-6 text-center text-xs font-black text-stone-800">${item.quantity}</span>
          <button onclick="updateCartQty('${item.product.id}', 1)" class="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-900 font-extrabold text-sm">+</button>
        </div>
        <span class="text-xs font-black text-cana-900 min-w-[55px] text-right">R$ ${itemTotal.toFixed(2)}</span>
      </div>
    `;
    container.appendChild(row);
  });

  // Calcula taxa de entrega
  let fee = 0;
  if (state.settings && state.settings.bairros) {
    const b = state.settings.bairros.find(b => b.id === state.selectedBairroId);
    if (b) fee = b.fee;
  }

  updateCartTotals(subtotal, fee);
  refreshIcons();
}

function updateCartTotals(subtotal, fee) {
  const total = subtotal + fee;
  const subtotalEl = document.getElementById('cart-subtotal-val');
  const feeEl = document.getElementById('cart-delivery-fee-val');
  const totalEl = document.getElementById('cart-total-val');
  const stickyTotalEl = document.getElementById('sticky-cart-total');

  if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  if (feeEl) feeEl.textContent = fee === 0 ? 'Grátis' : `R$ ${fee.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
  if (stickyTotalEl) stickyTotalEl.textContent = `R$ ${total.toFixed(2)}`;

  // Atualiza a barra flutuante de sacola rápida
  const quickBar = document.getElementById('floating-quick-cart');
  const quickCount = document.getElementById('quick-cart-items-count');
  const quickTotal = document.getElementById('quick-cart-total');

  const totalItemsCount = state.cart.reduce((acc, cur) => acc + cur.quantity, 0);
  if (quickCount) quickCount.textContent = totalItemsCount;
  if (quickTotal) quickTotal.textContent = `R$ ${total.toFixed(2)}`;

  if (quickBar) {
    const isDeliveryView = !document.getElementById('view-delivery').classList.contains('hidden');
    if (totalItemsCount > 0 && isDeliveryView) {
      quickBar.classList.remove('hidden');
    } else {
      quickBar.classList.add('hidden');
    }
  }
}

function clearCart() {
  state.cart = [];
  renderCartItems();
  updateCartBadge();
  showToast('Sacola esvaziada.', 'info');
}

// ==========================================
// 7. FINALIZAR PEDIDO (DELIVERY B2C)
// ==========================================
async function submitDeliveryOrder() {
  if (state.cart.length === 0) {
    showToast('Adicione pelo menos um item à sacola para salvar o pedido!', 'error');
    return;
  }

  const nameInput = document.getElementById('cart-customer-name');
  const phoneInput = document.getElementById('cart-customer-phone');
  const addressInput = document.getElementById('cart-customer-address');

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  let address = addressInput ? addressInput.value.trim() : '';
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'pix';
  const trocoVal = document.getElementById('cart-troco-val')?.value.trim();

  // Validação com destaque visual imediato no campo faltante
  if (!name) {
    nameInput.focus();
    nameInput.classList.add('ring-2', 'ring-red-500');
    setTimeout(() => nameInput.classList.remove('ring-2', 'ring-red-500'), 3000);
    showToast('Por favor, informe seu Nome antes de salvar o pedido!', 'error');
    return;
  }

  if (!phone) {
    phoneInput.focus();
    phoneInput.classList.add('ring-2', 'ring-red-500');
    setTimeout(() => phoneInput.classList.remove('ring-2', 'ring-red-500'), 3000);
    showToast('Por favor, informe seu WhatsApp!', 'error');
    return;
  }

  const bairroObj = state.settings.bairros.find(b => b.id === state.selectedBairroId);
  const bairroName = bairroObj ? bairroObj.name : 'Jardim Santa Marta';
  const fee = bairroObj ? bairroObj.fee : 0;

  if (state.selectedBairroId === 'b0') {
    address = 'Retirada no Balcão (Av. Goiânia, 346 - Jd. Santa Marta)';
  } else if (!address) {
    if (addressInput) {
      addressInput.focus();
      addressInput.classList.add('ring-2', 'ring-red-500');
      setTimeout(() => addressInput.classList.remove('ring-2', 'ring-red-500'), 3000);
    }
    showToast('Informe o endereço de entrega (Rua, Número e Referência)!', 'error');
    return;
  }

  const subtotal = state.cart.reduce((acc, cur) => acc + (cur.product.price * cur.quantity), 0);
  const total = subtotal + fee;

  const orderPayload = {
    type: state.selectedBairroId === 'b0' ? 'b2c_balcao' : 'b2c_delivery',
    customerName: name,
    customerPhone: phone,
    address: address,
    bairro: bairroName,
    deliveryFee: fee,
    subtotal: subtotal,
    total: total,
    paymentMethod: paymentMethod,
    paymentStatus: 'pendente',
    changeFor: paymentMethod === 'dinheiro' && trocoVal ? trocoVal : null,
    items: state.cart.map(i => ({
      id: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
      total: i.product.price * i.quantity
    }))
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      throw new Error('Falha ao registrar pedido.');
    }

    const createdOrder = await res.json();

    // Monta texto formatado completo para os alertas de WhatsApp
    const itemsFormatted = createdOrder.items
      .map(i => `• ${i.quantity}x ${i.name} (R$ ${i.total.toFixed(2)})`)
      .join('\n');

    const paymentText = 
      paymentMethod === 'pix' ? '💚 Pix (Enviar Comprovante)' :
      paymentMethod === 'dinheiro' ? (trocoVal ? `💵 Dinheiro (Troco para R$ ${trocoVal})` : '💵 Dinheiro (Sem troco)') :
      '💳 Cartão na Entrega (Levar Maquininha)';

    const attendant = getCurrentAttendant();
    const otherAttendant = attendant.id === 'alexa' ? {
      name: 'Josué',
      role: 'Pedir com Josué',
      phone: '66996833628',
      phoneFormatted: '(66) 99683-3628',
      schedule: '17h às 20h'
    } : {
      name: 'Alexa',
      role: 'Pedir com Alexa',
      phone: '66999536712',
      phoneFormatted: '(66) 99953-6712',
      schedule: '09h às 17h'
    };

    const whatsAppMessage = 
`*🎋 NOVO PEDIDO RECEBIDO - CENTRAL DA CANA*
*Pedido: #${createdOrder.code}*
----------------------------------------
👤 *Cliente:* ${name}
📱 *WhatsApp:* ${phone}
📍 *Bairro:* ${bairroName}
🏠 *Endereço:* ${address}
----------------------------------------
🛒 *ITENS DO PEDIDO:*
${itemsFormatted}
----------------------------------------
💵 Subtotal: R$ ${subtotal.toFixed(2)}
🛵 Taxa de Entrega: ${fee === 0 ? 'Grátis (Balcão)' : `R$ ${fee.toFixed(2)}`}
*💰 TOTAL A PAGAR: R$ ${total.toFixed(2)}*
💳 *Forma de Pagamento:* ${paymentText}
----------------------------------------
⏰ *Horário do Pedido:* ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
📞 *Atendimento:* ${attendant.role} (${attendant.schedule})
----------------------------------------
_Central da Cana - Av. Goiânia, 346, Jardim Santa Marta_`;

    const encoded = encodeURIComponent(whatsAppMessage);
    const primaryWhatsappUrl = `https://wa.me/55${attendant.phone}?text=${encoded}`;
    const secondaryWhatsappUrl = `https://wa.me/55${otherAttendant.phone}?text=${encoded}`;

    // Limpa carrinho e fecha sacola
    state.cart = [];
    updateCartBadge();
    toggleCartDrawer();

    // Abre o Modal de Sucesso com os botões de alerta imediato
    openOrderSuccessModal(createdOrder, primaryWhatsappUrl, secondaryWhatsappUrl, attendant, otherAttendant);

    // Dispara a conversa no WhatsApp do atendente ativo
    setTimeout(() => {
      window.open(primaryWhatsappUrl, '_blank');
    }, 600);

  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar pedido no sistema. Tente novamente!', 'error');
  }
}

function openOrderSuccessModal(order, primaryUrl, secondaryUrl, attendant, otherAttendant) {
  const modal = document.getElementById('modal-order-success');
  if (!modal) return;

  document.getElementById('success-modal-code').textContent = `#${order.code}`;
  document.getElementById('success-modal-customer').textContent = order.customerName;
  document.getElementById('success-modal-address').textContent = `${order.bairro} - ${order.address}`;
  document.getElementById('success-modal-payment').textContent = 
    order.paymentMethod === 'pix' ? '💚 Pix' : order.paymentMethod === 'dinheiro' ? '💵 Dinheiro' : '💳 Cartão';
  document.getElementById('success-modal-total').textContent = `R$ ${parseFloat(order.total).toFixed(2)}`;

  // Botões de alerta WhatsApp
  const btnPrimary = document.getElementById('btn-success-whatsapp-primary');
  const labelPrimary = document.getElementById('success-primary-attendant-label');
  if (btnPrimary) btnPrimary.href = primaryUrl;
  if (labelPrimary) labelPrimary.textContent = `Enviar para ${attendant.name} (${attendant.schedule})`;

  const btnSecondary = document.getElementById('btn-success-whatsapp-secondary');
  const labelSecondary = document.getElementById('success-secondary-attendant-label');
  if (btnSecondary) btnSecondary.href = secondaryUrl;
  if (labelSecondary) labelSecondary.textContent = `Enviar cópia para ${otherAttendant.name} (${otherAttendant.schedule})`;

  // Box do Pix
  const pixBox = document.getElementById('success-modal-pix-box');
  if (pixBox) {
    if (order.paymentMethod === 'pix') {
      pixBox.classList.remove('hidden');
    } else {
      pixBox.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
  refreshIcons();
}

function closeModalOrderSuccess() {
  const modal = document.getElementById('modal-order-success');
  if (modal) modal.classList.add('hidden');
}

function copyPixKeySuccess() {
  const pixKey = "66996833628";
  navigator.clipboard.writeText(pixKey).then(() => {
    const btn = document.getElementById('btn-copy-pix-success-text');
    if (btn) btn.textContent = 'Chave Copiada!';
    setTimeout(() => {
      if (btn) btn.textContent = 'Copiar Chave Pix';
    }, 2000);
    showToast('Chave Pix copiada com sucesso!', 'success');
  });
}

function openPixModal(total, whatsappUrl) {
  document.getElementById('pix-modal-total').textContent = `R$ ${total.toFixed(2)}`;
  document.getElementById('pix-whatsapp-dispatch-btn').href = whatsappUrl;
  document.getElementById('pix-modal').classList.remove('hidden');
  refreshIcons();
}

function closePixModal() {
  document.getElementById('pix-modal').classList.add('hidden');
}

function copyPixKey() {
  const pixKey = "66996833628";
  navigator.clipboard.writeText(pixKey).then(() => {
    const btn = document.getElementById('btn-copy-pix-text');
    if (btn) btn.textContent = 'Copiado com Sucesso!';
    setTimeout(() => {
      if (btn) btn.textContent = 'Copiar Chave Pix';
    }, 2000);
    showToast('Chave Pix copiada para a área de transferência!', 'success');
  });
}

// Compartilha alerta completo do pedido para Josué / Alexa / Motoboy
function shareOrderAlertWhatsApp(orderId) {
  const order = state.adminData.orders.find(o => o.id === orderId);
  if (!order) return;

  const itemsFormatted = (order.items || [])
    .map(i => `• ${i.quantity}x ${i.name} (R$ ${parseFloat(i.total || (i.price * i.quantity)).toFixed(2)})`)
    .join('\n');

  const paymentText = 
    order.paymentMethod === 'pix' ? 'Pix' :
    order.paymentMethod === 'dinheiro' ? (order.changeFor ? `Dinheiro (Troco p/ R$ ${order.changeFor})` : 'Dinheiro (Sem troco)') :
    'Cartão na entrega';

  const msg = 
`*🎋 ALERTA DE PEDIDO - CENTRAL DA CANA*
*Pedido: #${order.code}*
----------------------------------------
👤 *Cliente:* ${order.customerName}
📱 *WhatsApp:* ${order.customerPhone}
📍 *Bairro:* ${order.bairro}
🏠 *Endereço:* ${order.address}
----------------------------------------
🛒 *ITENS:*
${itemsFormatted}
----------------------------------------
Subtotal: R$ ${parseFloat(order.subtotal || 0).toFixed(2)}
Taxa Entrega: R$ ${parseFloat(order.deliveryFee || 0).toFixed(2)}
*TOTAL: R$ ${parseFloat(order.total || 0).toFixed(2)}*
💳 *Pagamento:* ${paymentText}
----------------------------------------
_Central da Cana Rondonópolis - Av. Goiânia, 346_`;

  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ==========================================
// 8. PAINEL ADM: AUTENTICAÇÃO COM SENHA
// ==========================================
async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adm-login-user').value.trim();
  const password = document.getElementById('adm-login-pass').value.trim();
  const errorBox = document.getElementById('adm-login-error');

  errorBox.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      errorBox.textContent = data.error || 'Credenciais inválidas.';
      errorBox.classList.remove('hidden');
      return;
    }

    state.adminToken = data.token;
    localStorage.setItem('central_cana_admin_token', data.token);

    showToast('Login realizado com sucesso! Bem-vindo Josué.', 'success');
    showAdminDashboard();
    refreshAdminData();

  } catch (err) {
    console.error(err);
    errorBox.textContent = 'Erro ao conectar ao servidor.';
    errorBox.classList.remove('hidden');
  }
}

function showAdminDashboard() {
  document.getElementById('adm-login-container').classList.add('hidden');
  document.getElementById('adm-dashboard-container').classList.remove('hidden');
  document.getElementById('admin-logged-tag').classList.remove('hidden');
}

function handleAdminLogout() {
  state.adminToken = null;
  localStorage.removeItem('central_cana_admin_token');
  document.getElementById('adm-login-container').classList.remove('hidden');
  document.getElementById('adm-dashboard-container').classList.add('hidden');
  document.getElementById('admin-logged-tag').classList.add('hidden');
  showToast('Sessão encerrada com sucesso.', 'info');
}

// ==========================================
// 9. PAINEL ADM: NAVEGAÇÃO DE SUB-TABS
// ==========================================
function switchAdmTab(subtabId) {
  state.activeAdmSubtab = subtabId;
  document.querySelectorAll('.adm-subtab').forEach(btn => btn.classList.remove('active-adm-subtab'));
  document.querySelectorAll('.adm-content').forEach(content => content.classList.add('hidden'));

  const activeBtn = document.getElementById(`adm-tab-${subtabId}`);
  if (activeBtn) activeBtn.classList.add('active-adm-subtab');

  const activeContent = document.getElementById(`adm-content-${subtabId}`);
  if (activeContent) activeContent.classList.remove('hidden');

  refreshIcons();
}

async function refreshAdminData() {
  if (!state.adminToken) return;
  await Promise.all([
    loadAdminOrders(),
    loadAdminB2BClients(),
    loadAdminProducts(),
    loadAdminFinancial(),
    loadAdminInventory(),
    loadAdminMotoboys(),
    loadAdminBairros()
  ]);
  refreshIcons();
}

// ==========================================
// 10. ADM: KANBAN DE PEDIDOS EM TEMPO REAL
// ==========================================
async function loadAdminOrders(showNotification = true) {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    const orders = await res.json();

    // Detecta se entraram novos pedidos para despertar o alarme sonoro
    const isFirstRun = state.knownOrderIds.size === 0;
    let newUnseenOrder = null;

    orders.forEach(ord => {
      if (!isFirstRun && ord.status === 'novo' && !state.knownOrderIds.has(ord.id)) {
        newUnseenOrder = ord;
      }
      state.knownOrderIds.add(ord.id);
    });

    if (newUnseenOrder) {
      startOrderAlarmLoop(newUnseenOrder);
      showToast(`🚨 Novo pedido #${newUnseenOrder.code} recebido de ${newUnseenOrder.customerName}!`, 'success');
    }

    state.adminData.orders = orders;
    renderKanban();
  } catch (err) {
    console.error('Erro ao buscar pedidos no ADM:', err);
  }
}

function renderKanban() {
  const cols = {
    novo: document.getElementById('kanban-col-novo'),
    preparando: document.getElementById('kanban-col-preparando'),
    saiu_entrega: document.getElementById('kanban-col-saiu_entrega'),
    entregue: document.getElementById('kanban-col-entregue')
  };

  Object.values(cols).forEach(col => col.innerHTML = '');

  const counts = { novo: 0, preparando: 0, saiu_entrega: 0, entregue: 0 };

  state.adminData.orders.forEach(order => {
    const status = order.status;
    if (counts[status] !== undefined) counts[status]++;

    const targetCol = cols[status] || cols.novo;

    const card = document.createElement('div');
    card.className = "bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm space-y-2.5 text-xs card-hover";

    const isB2B = order.type === 'b2b_supply';
    const tagType = isB2B
      ? `<span class="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">🏢 ATACADO</span>`
      : `<span class="bg-cana-100 text-cana-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">🛵 DELIVERY</span>`;

    const itemsList = (order.items || [])
      .map(i => `<div class="text-[11px] text-stone-700">• <strong>${i.quantity}x</strong> ${i.name}</div>`)
      .join('');

    // Ações de status
    let actionButtons = '';
    if (status === 'novo') {
      actionButtons = `
        <button onclick="updateOrderStatus('${order.id}', 'preparando')" class="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1">
          <i data-lucide="play" class="w-3.5 h-3.5"></i> Moer / Preparar
        </button>
      `;
    } else if (status === 'preparando') {
      actionButtons = `
        <button onclick="promptDispatchOrder('${order.id}', '${order.code}')" class="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1">
          <i data-lucide="bike" class="w-3.5 h-3.5"></i> Despachar Motoboy
        </button>
      `;
    } else if (status === 'saiu_entrega') {
      actionButtons = `
        <button onclick="updateOrderStatus('${order.id}', 'entregue', 'pago')" class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1">
          <i data-lucide="check" class="w-3.5 h-3.5"></i> Confirmar Entrega
        </button>
      `;
    }

    // Botão de notificação WhatsApp para o cliente
    const whatsappAlertMsg = encodeURIComponent(
      `Olá ${order.customerName}! 🎋 Aqui é da Central da Cana (Josué). Seu pedido #${order.code} está a caminho da sua entrega em ${order.bairro}!`
    );
    const whatsappLink = `https://wa.me/55${order.customerPhone.replace(/\D/g, '')}?text=${whatsappAlertMsg}`;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-extrabold text-stone-900">#${order.code}</span>
        ${tagType}
      </div>

      <div>
        <p class="font-bold text-stone-800 text-xs">${order.customerName}</p>
        <p class="text-[11px] text-stone-500 flex items-center gap-1">
          <i data-lucide="map-pin" class="w-3 h-3 text-stone-400"></i> ${order.bairro} - ${order.address}
        </p>
      </div>

      ${order.motoboyName ? `
        <div class="bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
          <i data-lucide="bike" class="w-3.5 h-3.5 text-purple-700"></i>
          <span>Motoboy: <strong>${order.motoboyName}</strong></span>
        </div>
      ` : ''}

      <div class="bg-stone-50 p-2 rounded-xl border border-stone-100 space-y-1">
        ${itemsList}
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
        <span class="text-stone-500 font-semibold">${order.paymentMethod === 'pix' ? 'Pix' : order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Cartão'}</span>
        <span class="font-black text-cana-900 text-xs">Total: R$ ${order.total.toFixed(2)}</span>
      </div>

      <div class="flex items-center gap-1.5 pt-1">
        ${actionButtons}
        <button onclick="shareOrderAlertWhatsApp('${order.id}')" class="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition border border-amber-200" title="Reenviar Alerta WhatsApp do Pedido (Dados Completos)">
          <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
        </button>
        <a href="${whatsappLink}" target="_blank" class="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition border border-emerald-200" title="Avisar cliente no WhatsApp">
          <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
        </a>
        <button onclick="confirmDeleteOrder('${order.id}', '${order.code}')" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-200" title="Excluir este pedido">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    targetCol.appendChild(card);
  });

  // Atualiza contadores
  document.getElementById('count-kanban-novo').textContent = counts.novo;
  document.getElementById('count-kanban-preparando').textContent = counts.preparando;
  document.getElementById('count-kanban-saiu_entrega').textContent = counts.saiu_entrega;
  document.getElementById('count-kanban-entregue').textContent = counts.entregue;
  document.getElementById('adm-pending-badge').textContent = counts.novo;
}

// ==========================================
// EXCLUSÃO DE PEDIDO PELO ADM
// ==========================================
async function confirmDeleteOrder(orderId, orderCode) {
  if (!confirm(`Tem certeza que deseja EXCLUIR o pedido #${orderCode} permanentemente?\nEsta ação não poderá ser desfeita.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.adminToken}`
      }
    });

    if (!res.ok) {
      throw new Error('Falha ao excluir pedido.');
    }

    showToast(`Pedido #${orderCode} excluído com sucesso!`, 'info');
    await loadAdminOrders(false);
  } catch (err) {
    console.error(err);
    showToast('Erro ao excluir pedido. Tente novamente!', 'error');
  }
}

// ==========================================
// CRIAÇÃO DE PEDIDO PELO PAINEL ADM (JOSUÉ)
// ==========================================
let adminTempOrderItems = [];

function openModalAdminCreateOrder() {
  const modal = document.getElementById('modal-admin-create-order');
  if (!modal) return;

  // Carrega opções de bairros de Rondonópolis
  const bairroSelect = document.getElementById('admin-order-bairro-select');
  bairroSelect.innerHTML = '';
  if (state.settings && state.settings.bairros) {
    state.settings.bairros.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.dataset.fee = b.fee;
      opt.dataset.id = b.id;
      opt.textContent = `${b.name} (${b.fee === 0 ? 'Grátis' : 'R$ ' + b.fee.toFixed(2)})`;
      bairroSelect.appendChild(opt);
    });
  }

  // Carrega opções de produtos do cardápio
  const prodSelect = document.getElementById('admin-order-product-select');
  prodSelect.innerHTML = '';
  (state.products || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} - R$ ${p.price.toFixed(2)}`;
    prodSelect.appendChild(opt);
  });

  // Limpa formulário e itens temporários
  adminTempOrderItems = [];
  document.getElementById('admin-order-customer-name').value = '';
  document.getElementById('admin-order-customer-phone').value = '';
  document.getElementById('admin-order-address').value = '';
  document.getElementById('admin-order-notes').value = '';
  document.getElementById('admin-order-product-qty').value = '1';

  // Seleciona Delivery como padrão
  const deliveryRadio = document.querySelector('input[name="admin_order_type"][value="b2c_delivery"]');
  if (deliveryRadio) deliveryRadio.checked = true;
  adminOrderTypeChanged();

  renderAdminOrderItems();
  adminUpdateOrderTotals();

  modal.classList.remove('hidden');
  refreshIcons();
}

function closeModalAdminCreateOrder() {
  const modal = document.getElementById('modal-admin-create-order');
  if (modal) modal.classList.add('hidden');
}

function adminOrderTypeChanged() {
  const type = document.querySelector('input[name="admin_order_type"]:checked')?.value || 'b2c_delivery';
  const addrBox = document.getElementById('admin-order-address-box');
  const feeInput = document.getElementById('admin-order-delivery-fee');

  if (type === 'b2c_balcao') {
    if (addrBox) addrBox.classList.add('hidden');
    if (feeInput) feeInput.value = '0.00';
  } else {
    if (addrBox) addrBox.classList.remove('hidden');
    adminBairroChanged();
  }

  adminUpdateOrderTotals();
}

function adminBairroChanged() {
  const select = document.getElementById('admin-order-bairro-select');
  const feeInput = document.getElementById('admin-order-delivery-fee');
  const selectedOpt = select.options[select.selectedIndex];
  if (selectedOpt && feeInput) {
    const fee = parseFloat(selectedOpt.dataset.fee) || 0;
    feeInput.value = fee.toFixed(2);
  }
  adminUpdateOrderTotals();
}

function adminAddOrderItem() {
  const select = document.getElementById('admin-order-product-select');
  const qtyInput = document.getElementById('admin-order-product-qty');
  const prodId = select.value;
  const qty = parseInt(qtyInput.value) || 1;

  if (!prodId) {
    showToast('Selecione um produto do cardápio!', 'error');
    return;
  }

  const product = (state.products || []).find(p => p.id === prodId);
  if (!product) return;

  const existing = adminTempOrderItems.find(i => i.product.id === prodId);
  if (existing) {
    existing.quantity += qty;
  } else {
    adminTempOrderItems.push({ product, quantity: qty });
  }

  qtyInput.value = '1';
  renderAdminOrderItems();
  adminUpdateOrderTotals();
}

function adminRemoveOrderItem(index) {
  adminTempOrderItems.splice(index, 1);
  renderAdminOrderItems();
  adminUpdateOrderTotals();
}

function renderAdminOrderItems() {
  const container = document.getElementById('admin-order-items-list');
  if (!container) return;

  container.innerHTML = '';
  if (adminTempOrderItems.length === 0) {
    container.innerHTML = '<p class="text-xs text-stone-400 italic">Nenhum item adicionado ainda.</p>';
    return;
  }

  adminTempOrderItems.forEach((item, index) => {
    const totalItem = item.product.price * item.quantity;
    const row = document.createElement('div');
    row.className = "flex items-center justify-between p-2 bg-white rounded-xl border border-stone-200 text-xs";
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-extrabold text-stone-800">${item.quantity}x</span>
        <span class="text-stone-700 font-semibold">${item.product.name}</span>
        <span class="text-stone-400 text-[11px]">(R$ ${item.product.price.toFixed(2)} cada)</span>
      </div>
      <div class="flex items-center gap-2">
        <strong class="text-cana-900 font-black">R$ ${totalItem.toFixed(2)}</strong>
        <button type="button" onclick="adminRemoveOrderItem(${index})" class="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50" title="Remover item">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  refreshIcons();
}

function adminUpdateOrderTotals() {
  const subtotal = adminTempOrderItems.reduce((acc, cur) => acc + (cur.product.price * cur.quantity), 0);
  const type = document.querySelector('input[name="admin_order_type"]:checked')?.value || 'b2c_delivery';
  let fee = 0;
  if (type !== 'b2c_balcao') {
    const feeInput = document.getElementById('admin-order-delivery-fee');
    fee = parseFloat(feeInput?.value) || 0;
  }

  const total = subtotal + fee;

  const subEl = document.getElementById('admin-order-subtotal');
  const feeEl = document.getElementById('admin-order-fee-display');
  const totEl = document.getElementById('admin-order-total');

  if (subEl) subEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  if (feeEl) feeEl.textContent = fee === 0 ? 'Grátis' : `R$ ${fee.toFixed(2)}`;
  if (totEl) totEl.textContent = `R$ ${total.toFixed(2)}`;
}

async function handleAdminCreateOrder(e) {
  e.preventDefault();

  if (adminTempOrderItems.length === 0) {
    showToast('Adicione pelo menos um item ao pedido!', 'error');
    return;
  }

  const type = document.querySelector('input[name="admin_order_type"]:checked')?.value || 'b2c_delivery';
  const name = document.getElementById('admin-order-customer-name').value.trim();
  const phone = document.getElementById('admin-order-customer-phone').value.trim();
  const bairro = type === 'b2c_balcao' ? 'Jardim Santa Marta' : document.getElementById('admin-order-bairro-select').value;
  const address = type === 'b2c_balcao' ? 'Retirada no Balcão (Av. Goiânia, 346)' : document.getElementById('admin-order-address').value.trim();
  const fee = type === 'b2c_balcao' ? 0 : (parseFloat(document.getElementById('admin-order-delivery-fee').value) || 0);
  const paymentMethod = document.getElementById('admin-order-payment-method').value;
  const status = document.getElementById('admin-order-status').value || 'novo';
  const notes = document.getElementById('admin-order-notes').value.trim();

  if (!name || !phone) {
    showToast('Informe o Nome e WhatsApp do cliente!', 'error');
    return;
  }

  const subtotal = adminTempOrderItems.reduce((acc, cur) => acc + (cur.product.price * cur.quantity), 0);
  const total = subtotal + fee;

  const payload = {
    type,
    customerName: name,
    customerPhone: phone,
    bairro,
    address,
    deliveryFee: fee,
    subtotal,
    total,
    paymentMethod,
    paymentStatus: paymentMethod === 'faturado_b2b' ? 'pendente' : 'pendente',
    status,
    notes,
    items: adminTempOrderItems.map(i => ({
      id: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
      total: i.product.price * i.quantity
    }))
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Falha ao criar pedido no ADM.');
    }

    const created = await res.json();
    showToast(`Pedido #${created.code} lançado com sucesso no ADM!`, 'success');

    closeModalAdminCreateOrder();
    await loadAdminOrders(false);

  } catch (err) {
    console.error(err);
    showToast('Erro ao registrar pedido. Tente novamente!', 'error');
  }
}

// Modal de Despacho de Pedido com Motoboy
async function promptDispatchOrder(orderId, orderCode) {
  document.getElementById('dispatch-order-id').value = orderId;
  document.getElementById('dispatch-order-code').textContent = '#' + orderCode;

  // Carrega lista de motoboys
  let motoboys = state.adminData.motoboys;
  if (!motoboys || motoboys.length === 0) {
    try {
      const res = await fetch(`${API_BASE}/motoboys`);
      motoboys = await res.json();
      state.adminData.motoboys = motoboys;
    } catch (e) {
      console.error(e);
    }
  }

  const select = document.getElementById('dispatch-motoboy-select');
  select.innerHTML = '';

  const activeMotoboys = (motoboys || []).filter(m => m.active !== false);
  if (activeMotoboys.length === 0) {
    select.innerHTML = '<option value="">Nenhum motoboy ativo cadastrado</option>';
  } else {
    activeMotoboys.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.vehicle || 'Moto'} • Taxa R$ ${m.feePerDelivery.toFixed(2)})`;
      select.appendChild(opt);
    });
  }

  document.getElementById('modal-dispatch-order').classList.remove('hidden');
  refreshIcons();
}

function closeModalDispatch() {
  document.getElementById('modal-dispatch-order').classList.add('hidden');
}

async function confirmDispatchWithMotoboy() {
  const orderId = document.getElementById('dispatch-order-id').value;
  const motoboyId = document.getElementById('dispatch-motoboy-select').value;

  closeModalDispatch();
  await updateOrderStatus(orderId, 'saiu_entrega', null, motoboyId);
}

async function updateOrderStatus(orderId, newStatus, paymentStatus = null, motoboyId = null) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify({ status: newStatus, paymentStatus, motoboyId })
    });

    if (!res.ok) throw new Error('Erro ao atualizar status');
    showToast(`Status do pedido atualizado para "${newStatus}"!`, 'success');
    await loadAdminOrders();
    await loadAdminFinancial();
    await loadAdminMotoboys();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao atualizar status.', 'error');
  }
}

// ==========================================
// 11. ADM: CLIENTES B2B (CADASTRO & EXCLUSÃO)
// ==========================================
async function loadAdminB2BClients() {
  try {
    const res = await fetch(`${API_BASE}/b2b-clients`);
    const clients = await res.json();
    state.adminData.b2bClients = clients;

    const tbody = document.getElementById('b2b-clients-table-body');
    tbody.innerHTML = '';

    if (clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-stone-400">Nenhum parceiro B2B cadastrado.</td></tr>`;
      return;
    }

    clients.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-stone-50 transition";
      tr.innerHTML = `
        <td class="p-3.5 font-bold text-stone-900">${c.name}</td>
        <td class="p-3.5">
          <div>${c.responsible || '-'}</div>
          <a href="https://wa.me/55${c.phone}" target="_blank" class="text-emerald-700 font-semibold hover:underline flex items-center gap-1 mt-0.5">
            <i data-lucide="phone" class="w-3 h-3"></i> ${c.phone}
          </a>
        </td>
        <td class="p-3.5">
          <span class="font-semibold text-stone-700">${c.bairro}</span>
          <div class="text-[11px] text-stone-400">${c.address || ''}</div>
        </td>
        <td class="p-3.5 font-semibold text-stone-600">${c.deliveryDays || 'Sob Demanda'}</td>
        <td class="p-3.5 font-bold text-stone-800">R$ ${(c.creditLimit || 0).toFixed(2)}</td>
        <td class="p-3.5">
          <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            ${c.status}
          </span>
        </td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button onclick="editB2BClient('${c.id}')" class="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition mr-1" title="Editar">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="confirmDeleteB2BClient('${c.id}', '${c.name.replace(/'/g, "\\'")}')" class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition" title="Excluir Cliente">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Erro ao buscar clientes B2B:', err);
  }
}

function openModalCreateB2BClient() {
  document.getElementById('modal-b2b-title').textContent = 'Cadastrar Cliente Parceiro B2B';
  document.getElementById('b2b-edit-id').value = '';
  document.getElementById('form-save-b2b-client').reset();
  document.getElementById('modal-b2b-client').classList.remove('hidden');
  refreshIcons();
}

function editB2BClient(id) {
  const c = state.adminData.b2bClients.find(item => item.id === id);
  if (!c) return;

  document.getElementById('modal-b2b-title').textContent = 'Editar Cliente Parceiro B2B';
  document.getElementById('b2b-edit-id').value = c.id;
  document.getElementById('b2b-edit-name').value = c.name || '';
  document.getElementById('b2b-edit-resp').value = c.responsible || '';
  document.getElementById('b2b-edit-phone').value = c.phone || '';
  document.getElementById('b2b-edit-doc').value = c.document || '';
  document.getElementById('b2b-edit-bairro').value = c.bairro || '';
  document.getElementById('b2b-edit-address').value = c.address || '';
  document.getElementById('b2b-edit-days').value = c.deliveryDays || '';
  document.getElementById('b2b-edit-credit').value = c.creditLimit || '';
  document.getElementById('b2b-edit-notes').value = c.notes || '';

  document.getElementById('modal-b2b-client').classList.remove('hidden');
  refreshIcons();
}

function closeModalB2BClient() {
  document.getElementById('modal-b2b-client').classList.add('hidden');
}

async function handleSaveB2BClient(e) {
  e.preventDefault();
  const id = document.getElementById('b2b-edit-id').value;
  const clientData = {
    name: document.getElementById('b2b-edit-name').value.trim(),
    responsible: document.getElementById('b2b-edit-resp').value.trim(),
    phone: document.getElementById('b2b-edit-phone').value.trim(),
    document: document.getElementById('b2b-edit-doc').value.trim(),
    bairro: document.getElementById('b2b-edit-bairro').value.trim(),
    address: document.getElementById('b2b-edit-address').value.trim(),
    deliveryDays: document.getElementById('b2b-edit-days').value.trim(),
    creditLimit: parseFloat(document.getElementById('b2b-edit-credit').value) || 0,
    notes: document.getElementById('b2b-edit-notes').value.trim()
  };

  const isEdit = !!id;
  const url = isEdit ? `${API_BASE}/b2b-clients/${id}` : `${API_BASE}/b2b-clients`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(clientData)
    });

    if (!res.ok) throw new Error('Erro ao salvar cliente parceiro');

    showToast(isEdit ? 'Cliente atualizado com sucesso!' : 'Novo parceiro cadastrado!', 'success');
    closeModalB2BClient();
    await loadAdminB2BClients();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao salvar cliente.', 'error');
  }
}

// EXCLUSÃO DE CLIENTE B2B (REQUISITO EXPLÍCITO DO USUÁRIO)
async function confirmDeleteB2BClient(id, clientName) {
  if (!confirm(`Tem certeza que deseja excluir o cliente parceiro "${clientName}"? Esta ação removerá o cadastro da lista do Josué.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/b2b-clients/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.adminToken}`
      }
    });

    if (!res.ok) throw new Error('Erro ao excluir cliente');

    showToast(`Cliente "${clientName}" excluído com sucesso!`, 'success');
    await loadAdminB2BClients();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao excluir cliente.', 'error');
  }
}

// ==========================================
// 12. ADM: CARDÁPIO & PRODUTOS (CRUD COM EXCLUSÃO)
// ==========================================
async function loadAdminProducts() {
  try {
    const res = await fetch(`${API_BASE}/products?b2b=true`);
    const prods = await res.json();
    state.adminData.products = prods;

    const tbody = document.getElementById('adm-products-table-body');
    tbody.innerHTML = '';

    prods.forEach(p => {
      const margin = p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : '-';
      const tr = document.createElement('tr');
      tr.className = "hover:bg-stone-50 transition";
      tr.innerHTML = `
        <td class="p-3.5">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${p.icon || '🥤'}</span>
            <div>
              <div class="font-bold text-stone-900">${p.name}</div>
              <div class="text-[11px] text-stone-400">${p.unit}</div>
            </div>
          </div>
        </td>
        <td class="p-3.5">
          ${p.isB2B 
            ? `<span class="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Atacado B2B</span>`
            : `<span class="bg-cana-100 text-cana-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Delivery B2C</span>`}
        </td>
        <td class="p-3.5 font-black text-cana-900">R$ ${p.price.toFixed(2)}</td>
        <td class="p-3.5 text-stone-500">R$ ${p.costPrice ? p.costPrice.toFixed(2) : '0,00'}</td>
        <td class="p-3.5 font-bold text-emerald-700">${margin !== '-' ? `${margin}%` : '-'}</td>
        <td class="p-3.5">
          <button onclick="toggleProductStock('${p.id}', ${!p.inStock})" class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase transition ${p.inStock ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}">
            ${p.inStock ? 'Disponível' : 'Pausado'}
          </button>
        </td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button onclick="editProduct('${p.id}')" class="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition mr-1" title="Editar">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="confirmDeleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition" title="Excluir Item">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Erro ao buscar produtos no ADM:', err);
  }
}

function openModalCreateProduct() {
  document.getElementById('modal-product-title').textContent = 'Cadastrar Item no Cardápio';
  document.getElementById('prod-edit-id').value = '';
  document.getElementById('form-save-product').reset();
  document.getElementById('modal-product').classList.remove('hidden');
  refreshIcons();
}

function editProduct(id) {
  const p = state.adminData.products.find(item => item.id === id);
  if (!p) return;

  document.getElementById('modal-product-title').textContent = 'Editar Item do Cardápio';
  document.getElementById('prod-edit-id').value = p.id;
  document.getElementById('prod-edit-name').value = p.name || '';
  document.getElementById('prod-edit-cat').value = p.category || 'caldo_puro';
  document.getElementById('prod-edit-icon').value = p.icon || '';
  document.getElementById('prod-edit-price').value = p.price || '';
  document.getElementById('prod-edit-cost').value = p.costPrice || '';
  document.getElementById('prod-edit-unit').value = p.unit || '';
  document.getElementById('prod-edit-desc').value = p.description || '';
  document.getElementById('prod-edit-stock').checked = p.inStock !== false;
  document.getElementById('prod-edit-isb2b').checked = !!p.isB2B;

  document.getElementById('modal-product').classList.remove('hidden');
  refreshIcons();
}

function closeModalProduct() {
  document.getElementById('modal-product').classList.add('hidden');
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prod-edit-id').value;
  const prodData = {
    name: document.getElementById('prod-edit-name').value.trim(),
    category: document.getElementById('prod-edit-cat').value,
    icon: document.getElementById('prod-edit-icon').value.trim() || '🥤',
    price: parseFloat(document.getElementById('prod-edit-price').value) || 0,
    costPrice: parseFloat(document.getElementById('prod-edit-cost').value) || 0,
    unit: document.getElementById('prod-edit-unit').value.trim() || 'Unidade',
    description: document.getElementById('prod-edit-desc').value.trim(),
    inStock: document.getElementById('prod-edit-stock').checked,
    isB2B: document.getElementById('prod-edit-isb2b').checked
  };

  const isEdit = !!id;
  const url = isEdit ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(prodData)
    });

    if (!res.ok) throw new Error('Erro ao salvar produto');

    showToast(isEdit ? 'Produto atualizado com sucesso!' : 'Novo item adicionado ao cardápio!', 'success');
    closeModalProduct();
    await loadProducts();
    await loadAdminProducts();
    renderProductsB2C();
    renderProductsB2B();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao salvar produto.', 'error');
  }
}

async function toggleProductStock(id, newStockStatus) {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify({ inStock: newStockStatus })
    });
    if (!res.ok) throw new Error('Erro ao alterar estoque');

    await loadProducts();
    await loadAdminProducts();
    renderProductsB2C();
    showToast('Disponibilidade do item atualizada!', 'info');
  } catch (err) {
    console.error(err);
  }
}

// EXCLUSÃO DE PRODUTO DO CARDÁPIO (REQUISITO EXPLÍCITO DO USUÁRIO)
async function confirmDeleteProduct(id, productName) {
  if (!confirm(`Tem certeza que deseja excluir o produto "${productName}" do cardápio?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.adminToken}`
      }
    });

    if (!res.ok) throw new Error('Erro ao excluir produto');

    showToast(`Produto "${productName}" excluído com sucesso!`, 'success');
    await loadProducts();
    await loadAdminProducts();
    renderProductsB2C();
    renderProductsB2B();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao excluir produto.', 'error');
  }
}

// ==========================================
// 13. ADM: CONTROLE FINANCEIRO & CAIXA
// ==========================================
async function loadAdminFinancial() {
  try {
    const res = await fetch(`${API_BASE}/financial`, {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    if (!res.ok) return;

    const data = await res.json();
    state.adminData.financial = data;

    document.getElementById('fin-card-receitas').textContent = `R$ ${data.totalReceitas.toFixed(2)}`;
    document.getElementById('fin-sub-delivery').textContent = `R$ ${data.receitasDelivery.toFixed(2)}`;
    document.getElementById('fin-sub-atacado').textContent = `R$ ${data.receitasAtacado.toFixed(2)}`;

    document.getElementById('fin-card-despesas').textContent = `R$ ${data.totalDespesas.toFixed(2)}`;
    document.getElementById('fin-card-lucro').textContent = `R$ ${data.lucroLiquido.toFixed(2)}`;
    document.getElementById('fin-card-a-receber').textContent = `R$ ${data.totalAReceber.toFixed(2)}`;

    const tbody = document.getElementById('fin-transactions-body');
    tbody.innerHTML = '';

    (data.transactions || []).forEach(t => {
      const isReceita = t.type === 'receita';
      const tr = document.createElement('tr');
      tr.className = "hover:bg-stone-50 transition";
      tr.innerHTML = `
        <td class="p-3 text-stone-500">${t.date}</td>
        <td class="p-3">
          <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${isReceita ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
            ${t.type}
          </span>
        </td>
        <td class="p-3 text-stone-600 font-semibold">${t.category.replace(/_/g, ' ')}</td>
        <td class="p-3 font-medium text-stone-800">${t.description}</td>
        <td class="p-3 uppercase text-[11px] text-stone-500">${t.paymentMethod || 'Pix'}</td>
        <td class="p-3 text-right font-black ${isReceita ? 'text-emerald-700' : 'text-red-600'}">
          ${isReceita ? '+' : '-'} R$ ${t.amount.toFixed(2)}
        </td>
        <td class="p-3 text-right">
          <button onclick="deleteFinancialTx('${t.id}')" class="p-1 text-stone-400 hover:text-red-600 transition" title="Excluir">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Erro ao buscar financeiro:', err);
  }
}

function openModalCreateExpense() {
  document.getElementById('form-save-expense').reset();
  document.getElementById('modal-expense').classList.remove('hidden');
  refreshIcons();
}

function closeModalExpense() {
  document.getElementById('modal-expense').classList.add('hidden');
}

async function handleSaveExpense(e) {
  e.preventDefault();
  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const category = document.getElementById('exp-cat').value;
  const paymentMethod = document.getElementById('exp-payment').value;

  try {
    const res = await fetch(`${API_BASE}/financial/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify({
        type: 'despesa',
        description: desc,
        amount,
        category,
        paymentMethod
      })
    });

    if (!res.ok) throw new Error('Erro ao salvar despesa');

    showToast('Despesa operacional registrada com sucesso!', 'success');
    closeModalExpense();
    await loadAdminFinancial();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao registrar despesa.', 'error');
  }
}

async function deleteFinancialTx(id) {
  if (!confirm('Deseja excluir este registro financeiro?')) return;
  try {
    const res = await fetch(`${API_BASE}/financial/transaction/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    if (!res.ok) throw new Error('Erro ao excluir transação');
    showToast('Registro financeiro removido!', 'info');
    await loadAdminFinancial();
    refreshIcons();
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// 14. ADM: CONTROLE DE ESTOQUE
// ==========================================
async function loadAdminInventory() {
  try {
    const res = await fetch(`${API_BASE}/inventory`, {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    if (!res.ok) return;

    const items = await res.json();
    state.adminData.inventory = items;

    const grid = document.getElementById('adm-inventory-grid');
    grid.innerHTML = '';

    items.forEach(item => {
      const isLow = item.currentQty <= item.minQty;
      const card = document.createElement('div');
      card.className = `bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${isLow ? 'border-amber-400 bg-amber-50/20' : 'border-stone-200'}`;
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-stone-400 uppercase">${item.unit}</span>
            ${isLow ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">Estoque Baixo</span>` : ''}
          </div>
          <h5 class="font-extrabold text-stone-900 text-sm mb-1">${item.name}</h5>
          <p class="text-xs text-stone-500">Mínimo sugerido: ${item.minQty} ${item.unit}</p>
        </div>

        <div class="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
          <span class="text-2xl font-black text-stone-900">${item.currentQty}</span>
          <button onclick="promptUpdateInventory('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.currentQty})" class="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Ajustar
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

  } catch (err) {
    console.error('Erro ao buscar estoque:', err);
  }
}

async function promptUpdateInventory(id, name, currentQty) {
  const newVal = prompt(`Informe a nova quantidade em estoque para "${name}":`, currentQty);
  if (newVal === null) return;
  const parsed = parseInt(newVal, 10);
  if (isNaN(parsed) || parsed < 0) {
    showToast('Quantidade inválida.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify({ currentQty: parsed })
    });
    if (!res.ok) throw new Error('Erro ao atualizar estoque');

    showToast(`Estoque de "${name}" atualizado para ${parsed}!`, 'success');
    await loadAdminInventory();
    refreshIcons();
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// 15. ADM: SEGURANÇA & ALTERAR SENHA
// ==========================================
async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('input-current-pass').value;
  const newPassword = document.getElementById('input-new-pass').value;

  try {
    const res = await fetch(`${API_BASE}/admin/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erro ao alterar senha', 'error');
      return;
    }

    showToast('Senha alterada com sucesso! Guarde-a com segurança.', 'success');
    document.getElementById('form-change-password').reset();
  } catch (err) {
    console.error(err);
    showToast('Falha na comunicação com o servidor.', 'error');
  }
}

// ==========================================
// 16. ADM: GESTÃO DE MOTOBOYS & ACERTOS
// ==========================================
async function loadAdminMotoboys() {
  try {
    const res = await fetch(`${API_BASE}/motoboys/report`, {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    if (!res.ok) return;

    const motoboys = await res.json();
    state.adminData.motoboys = motoboys;

    // Atualiza contadores dos cards
    const totalMotoboys = motoboys.length;
    let totalPendingDeliveries = 0;
    let totalPendingAmount = 0;

    motoboys.forEach(m => {
      totalPendingDeliveries += (m.pendingDeliveriesCount || 0);
      totalPendingAmount += (m.pendingAmount || 0);
    });

    const cardTotal = document.getElementById('moto-card-total');
    const cardDeliveries = document.getElementById('moto-card-pending-deliveries');
    const cardAmount = document.getElementById('moto-card-pending-amount');
    const badgeTab = document.getElementById('adm-motoboy-pending-badge');

    if (cardTotal) cardTotal.textContent = totalMotoboys;
    if (cardDeliveries) cardDeliveries.textContent = totalPendingDeliveries;
    if (cardAmount) cardAmount.textContent = `R$ ${totalPendingAmount.toFixed(2)}`;

    if (badgeTab) {
      if (totalPendingDeliveries > 0) {
        badgeTab.textContent = totalPendingDeliveries;
        badgeTab.classList.remove('hidden');
      } else {
        badgeTab.classList.add('hidden');
      }
    }

    // Renderiza tabela
    const tbody = document.getElementById('motoboys-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (motoboys.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-stone-400">Nenhum motoboy cadastrado. Clique em "+ Novo Motoboy" para adicionar.</td></tr>`;
      return;
    }

    motoboys.forEach(m => {
      const hasPending = (m.pendingDeliveriesCount || 0) > 0;
      const tr = document.createElement('tr');
      tr.className = "hover:bg-stone-50 transition";
      tr.innerHTML = `
        <td class="p-3.5">
          <div class="font-bold text-stone-900 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-stone-300'}"></span>
            <span>${m.name}</span>
          </div>
          <a href="https://wa.me/55${m.phone}" target="_blank" class="text-emerald-700 font-semibold hover:underline flex items-center gap-1 mt-0.5 text-[11px]">
            <i data-lucide="phone" class="w-3 h-3"></i> ${m.phone}
          </a>
        </td>
        <td class="p-3.5 text-stone-600 font-medium">${m.vehicle || '-'}</td>
        <td class="p-3.5 font-bold text-stone-800">R$ ${(m.feePerDelivery || 5).toFixed(2)}</td>
        <td class="p-3.5 font-semibold text-stone-600">${m.totalDeliveries || 0}</td>
        <td class="p-3.5">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${hasPending ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-500'}">
            ${m.pendingDeliveriesCount || 0} entregas
          </span>
        </td>
        <td class="p-3.5 font-black text-sm ${hasPending ? 'text-red-600' : 'text-stone-400'}">
          R$ ${(m.pendingAmount || 0).toFixed(2)}
        </td>
        <td class="p-3.5 text-right whitespace-nowrap">
          ${hasPending ? `
            <button onclick="settleMotoboy('${m.id}', '${m.name.replace(/'/g, "\\'")}', ${m.pendingDeliveriesCount}, ${m.pendingAmount})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition mr-2 shadow-sm inline-flex items-center gap-1">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Fazer Acerto
            </button>
          ` : `
            <span class="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl mr-2">Em dia</span>
          `}
          <button onclick="editMotoboy('${m.id}')" class="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition mr-1" title="Editar Motoboy">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="confirmDeleteMotoboy('${m.id}', '${m.name.replace(/'/g, "\\'")}')" class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition" title="Excluir Motoboy">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    refreshIcons();
  } catch (err) {
    console.error('Erro ao buscar motoboys:', err);
  }
}

function openModalCreateMotoboy() {
  document.getElementById('modal-motoboy-title').textContent = 'Cadastrar Entregador / Motoboy';
  document.getElementById('moto-edit-id').value = '';
  document.getElementById('form-save-motoboy').reset();
  document.getElementById('moto-edit-fee').value = '5.00';
  document.getElementById('modal-motoboy').classList.remove('hidden');
  refreshIcons();
}

function closeModalMotoboy() {
  document.getElementById('modal-motoboy').classList.add('hidden');
}

function editMotoboy(id) {
  const m = (state.adminData.motoboys || []).find(item => item.id === id);
  if (!m) return;

  document.getElementById('modal-motoboy-title').textContent = 'Editar Entregador / Motoboy';
  document.getElementById('moto-edit-id').value = m.id;
  document.getElementById('moto-edit-name').value = m.name || '';
  document.getElementById('moto-edit-phone').value = m.phone || '';
  document.getElementById('moto-edit-fee').value = m.feePerDelivery || '5.00';
  document.getElementById('moto-edit-vehicle').value = m.vehicle || '';
  document.getElementById('moto-edit-active').checked = m.active !== false;

  document.getElementById('modal-motoboy').classList.remove('hidden');
  refreshIcons();
}

async function handleSaveMotoboy(e) {
  e.preventDefault();
  const id = document.getElementById('moto-edit-id').value;
  const motoData = {
    name: document.getElementById('moto-edit-name').value.trim(),
    phone: document.getElementById('moto-edit-phone').value.trim(),
    feePerDelivery: parseFloat(document.getElementById('moto-edit-fee').value) || 5.00,
    vehicle: document.getElementById('moto-edit-vehicle').value.trim(),
    active: document.getElementById('moto-edit-active').checked
  };

  const isEdit = !!id;
  const url = isEdit ? `${API_BASE}/motoboys/${id}` : `${API_BASE}/motoboys`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(motoData)
    });

    if (!res.ok) throw new Error('Erro ao salvar motoboy');

    showToast(isEdit ? 'Entregador atualizado com sucesso!' : 'Novo motoboy cadastrado com sucesso!', 'success');
    closeModalMotoboy();
    await loadAdminMotoboys();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao salvar motoboy.', 'error');
  }
}

async function confirmDeleteMotoboy(id, name) {
  if (!confirm(`Tem certeza que deseja excluir o motoboy "${name}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/motoboys/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    if (!res.ok) throw new Error('Erro ao excluir motoboy');

    showToast(`Motoboy "${name}" excluído com sucesso!`, 'success');
    await loadAdminMotoboys();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao excluir motoboy.', 'error');
  }
}

// REALIZA O ACERTO FINANCEIRO DO MOTOBOY
async function settleMotoboy(id, name, count, amount) {
  const confirmMsg = `Confirma o acerto de R$ ${amount.toFixed(2)} (${count} entregas) para o motoboy ${name}?\n\nIsso registrará automaticamente a despesa de transporte no fluxo de caixa e zerará as entregas pendentes dele.`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`${API_BASE}/motoboys/${id}/settle`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao realizar acerto');

    showToast(`Acerto de R$ ${data.totalPaid.toFixed(2)} com ${data.motoboyName} concluído com sucesso!`, 'success');
    await loadAdminMotoboys();
    await loadAdminFinancial();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao processar acerto do motoboy.', 'error');
  }
}

// ==========================================
// 17. ADM: GESTÃO DE BAIRROS & TAXAS
// ==========================================
async function loadAdminBairros() {
  try {
    const res = await fetch(`${API_BASE}/bairros`);
    if (!res.ok) return;

    const bairros = await res.json();
    state.adminData.bairros = bairros;

    const tbody = document.getElementById('bairros-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    bairros.forEach(b => {
      const isBalcao = b.id === 'b0';
      const tr = document.createElement('tr');
      tr.className = "hover:bg-stone-50 transition";
      tr.innerHTML = `
        <td class="p-3.5 font-bold text-stone-900">
          <div class="flex items-center gap-2">
            <span class="text-stone-400">📍</span>
            <span>${b.name}</span>
            ${isBalcao ? '<span class="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Balcão</span>' : ''}
          </div>
        </td>
        <td class="p-3.5 font-black text-cana-900 text-sm">
          ${b.fee === 0 ? '<span class="text-emerald-700 font-bold">Grátis</span>' : `R$ ${b.fee.toFixed(2)}`}
        </td>
        <td class="p-3.5 font-semibold text-stone-600">${b.time || '-'}</td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button onclick="editBairro('${b.id}')" class="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition mr-1" title="Editar Bairro">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
          </button>
          ${!isBalcao ? `
            <button onclick="confirmDeleteBairro('${b.id}', '${b.name.replace(/'/g, "\\'")}')" class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition" title="Excluir Bairro">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    refreshIcons();
  } catch (err) {
    console.error('Erro ao buscar bairros:', err);
  }
}

function openModalCreateBairro() {
  document.getElementById('modal-bairro-title').textContent = 'Cadastrar Novo Bairro & Taxa';
  document.getElementById('bairro-edit-id').value = '';
  document.getElementById('form-save-bairro').reset();
  document.getElementById('bairro-edit-time').value = '20-35 min';
  document.getElementById('modal-bairro').classList.remove('hidden');
  refreshIcons();
}

function closeModalBairro() {
  document.getElementById('modal-bairro').classList.add('hidden');
}

function editBairro(id) {
  const b = (state.adminData.bairros || []).find(item => item.id === id);
  if (!b) return;

  document.getElementById('modal-bairro-title').textContent = 'Editar Bairro & Taxa de Entrega';
  document.getElementById('bairro-edit-id').value = b.id;
  document.getElementById('bairro-edit-name').value = b.name || '';
  document.getElementById('bairro-edit-fee').value = b.fee !== undefined ? b.fee : '0.00';
  document.getElementById('bairro-edit-time').value = b.time || '';

  document.getElementById('modal-bairro').classList.remove('hidden');
  refreshIcons();
}

async function handleSaveBairro(e) {
  e.preventDefault();
  const id = document.getElementById('bairro-edit-id').value;
  const bairroData = {
    name: document.getElementById('bairro-edit-name').value.trim(),
    fee: parseFloat(document.getElementById('bairro-edit-fee').value) || 0,
    time: document.getElementById('bairro-edit-time').value.trim()
  };

  const isEdit = !!id;
  const url = isEdit ? `${API_BASE}/bairros/${id}` : `${API_BASE}/bairros`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(bairroData)
    });

    if (!res.ok) throw new Error('Erro ao salvar bairro');

    showToast(isEdit ? 'Bairro atualizado com sucesso!' : 'Novo bairro cadastrado com sucesso!', 'success');
    closeModalBairro();
    await loadSettings();
    setupBairrosDropdown();
    await loadAdminBairros();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao salvar bairro.', 'error');
  }
}

async function confirmDeleteBairro(id, name) {
  if (!confirm(`Tem certeza que deseja excluir o bairro "${name}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/bairros/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    if (!res.ok) throw new Error('Erro ao excluir bairro');

    showToast(`Bairro "${name}" excluído com sucesso!`, 'success');
    await loadSettings();
    setupBairrosDropdown();
    await loadAdminBairros();
    refreshIcons();
  } catch (err) {
    console.error(err);
    showToast('Falha ao excluir bairro.', 'error');
  }
}
