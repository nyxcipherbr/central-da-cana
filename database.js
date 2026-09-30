const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'central_da_cana_db.json');

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Dados iniciais (Seed)
const INITIAL_DATA = {
  settings: {
    businessName: "Central da Cana",
    ownerName: "Josué",
    address: "Av. Goiânia, 346 - Jardim Santa Marta",
    city: "Rondonópolis - MT",
    phone: "66999536712",
    phoneFormatted: "(66) 99953-6712",
    pixKey: "66996833628",
    pixType: "Telefone",
    adminUser: "josue",
    adminPass: "cana123", // Senha inicial padrão
    isOpen: true,
    openingHours: "Terça a Domingo das 09:00 às 20:00",
    attendants: {
      day: {
        id: "alexa",
        name: "Alexa",
        role: "Pedir com Alexa",
        phone: "66999536712",
        phoneFormatted: "(66) 99953-6712",
        startHour: 9,
        endHour: 17,
        scheduleLabel: "09h às 17h"
      },
      evening: {
        id: "josue",
        name: "Josué",
        role: "Pedir com Josué",
        phone: "66996833628",
        phoneFormatted: "(66) 99683-3628",
        startHour: 17,
        endHour: 20,
        scheduleLabel: "17h às 20h"
      }
    },
    developer: {
      brand: "NyxCipher",
      creator: "Alexa",
      phone: "66996128149",
      phoneFormatted: "(66) 99612-8149",
      tagline: "Desenvolvimento de Software & Sistemas Inteligentes"
    },
    bairros: [
      { id: "b1", name: "Jardim Santa Marta (Local)", fee: 4.00, time: "15-25 min" },
      { id: "b2", name: "Vila Aurora I e II", fee: 7.00, time: "20-35 min" },
      { id: "b3", name: "Centro", fee: 6.00, time: "20-30 min" },
      { id: "b4", name: "Sagrada Família", fee: 7.00, time: "25-35 min" },
      { id: "b5", name: "Coophalis", fee: 6.00, time: "20-30 min" },
      { id: "b6", name: "Vila Operária", fee: 8.00, time: "25-40 min" },
      { id: "b7", name: "Jardim Guanabara", fee: 7.00, time: "20-35 min" },
      { id: "b8", name: "Monte Líbano", fee: 6.00, time: "20-30 min" },
      { id: "b9", name: "Parque Real", fee: 5.00, time: "15-25 min" },
      { id: "b10", name: "Cidade Salmen", fee: 9.00, time: "30-45 min" },
      { id: "b0", name: "Retirar no Balcão (Av. Goiânia, 346)", fee: 0.00, time: "Pronto em 10 min" }
    ],
    deliveryKmPricing: {
      originAddress: "Av. Goiânia, 346 - Jardim Santa Marta, Rondonópolis - MT",
      originLat: -16.4552,
      originLng: -54.6295,
      baseKm: 2,
      baseFee: 8.00,
      feePerKm: 1.00,
      maxTableKm: 16,
      maxTableFee: 22.00,
      feeAfterMaxPerKm: 1.00,
      condominioFee: 5.00
    }
  },
  products: [
    // Caldos Tradicionais (B2C)
    {
      id: "prod-1",
      name: "Caldo de Cana Gelado - 500ml",
      category: "caldo_puro",
      price: 8.00,
      costPrice: 2.20,
      unit: "Garrafa 500ml",
      description: "Moído na hora e extremamente gelado. 100% puro e filtrado.",
      icon: "🥤",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-2",
      name: "Caldo de Cana Gelado - 1 Litro",
      category: "caldo_puro",
      price: 15.00,
      costPrice: 4.00,
      unit: "Garrafa 1L",
      description: "Tamanho família, fresquinho e super refrescante para o calor de Rondonópolis.",
      icon: "🧃",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-3",
      name: "Caldo de Cana Gelado - 2 Litros (Super Família)",
      category: "caldo_puro",
      price: 27.00,
      costPrice: 7.50,
      unit: "Garrafa 2L",
      description: "A melhor opção para o almoço de domingo ou churrasco.",
      icon: "🍶",
      inStock: true,
      isB2B: false
    },
    // Combinações Especiais (B2C)
    {
      id: "prod-4",
      name: "Caldo de Cana c/ Limão Galego (1L)",
      category: "caldo_sabores",
      price: 17.00,
      costPrice: 4.80,
      unit: "Garrafa 1L",
      description: "Cana pura com toque cítrico de limão espremido na hora. Campeão de vendas!",
      icon: "🍋",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-5",
      name: "Caldo de Cana c/ Abacaxi (1L)",
      category: "caldo_sabores",
      price: 18.00,
      costPrice: 5.20,
      unit: "Garrafa 1L",
      description: "Moído junto com abacaxi maduro geladinho. Sabor tropical inconfundível.",
      icon: "🍍",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-6",
      name: "Caldo de Cana c/ Maracujá (1L)",
      category: "caldo_sabores",
      price: 19.00,
      costPrice: 5.50,
      unit: "Garrafa 1L",
      description: "O azedinho perfeito do maracujá com a doçura natural da cana.",
      icon: "🥭",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-7",
      name: "Caldo de Cana c/ Gengibre & Limão (1L)",
      category: "caldo_sabores",
      price: 18.00,
      costPrice: 5.00,
      unit: "Garrafa 1L",
      description: "Ultra refrescante, revigorante e energizante com limão e gengibre fresco.",
      icon: "🫚",
      inStock: true,
      isB2B: false
    },
    // Cana in natura & Lanches (B2C)
    {
      id: "prod-8",
      name: "Toletes de Cana Descascada (Pacote 1kg)",
      category: "lanches",
      price: 10.00,
      costPrice: 3.00,
      unit: "Pacote 1kg",
      description: "Toletes selecionados, macios e doces, prontos para mastigar.",
      icon: "🎋",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-9",
      name: "Pastel Frito na Hora - Carne com Queijo",
      category: "lanches",
      price: 12.00,
      costPrice: 4.50,
      unit: "Unidade",
      description: "Massa crocante artesanal, carne moída bem temperada e queijo mussarela derretido.",
      icon: "🥟",
      inStock: true,
      isB2B: false
    },
    {
      id: "prod-10",
      name: "Pastel Frito na Hora - Queijo Especial",
      category: "lanches",
      price: 11.00,
      costPrice: 4.00,
      unit: "Unidade",
      description: "Muito queijo com orégano e tomate fresco. A combinação perfeita com garapa!",
      icon: "🧀",
      inStock: true,
      isB2B: false
    },
    // Atacado / Fornecimento (B2B)
    {
      id: "prod-b2b-1",
      name: "Feixe de Cana Selecionada (15 Varas)",
      category: "b2b_atacado",
      price: 45.00,
      costPrice: 22.00,
      unit: "Feixe (~25kg)",
      description: "Cana de alta qualidade, grossa, rica em sacarose e lavada. Ideal para garapeiros e pastelarias.",
      icon: "🌾",
      inStock: true,
      isB2B: true
    },
    {
      id: "prod-b2b-2",
      name: "Feixe de Cana Raspada / Descascada",
      category: "b2b_atacado",
      price: 60.00,
      costPrice: 28.00,
      unit: "Feixe Pronto (15 varas)",
      description: "Economize tempo e mão de obra. Feixe já raspado e higienizado para moer direto.",
      icon: "✨",
      inStock: true,
      isB2B: true
    },
    {
      id: "prod-b2b-3",
      name: "Bombona de Caldo Cru Refrigerado - 20 Litros",
      category: "b2b_atacado",
      price: 140.00,
      costPrice: 70.00,
      unit: "Bombona 20L",
      description: "Caldo moído em moenda inox profissional, duplamente filtrado e mantido em câmara fria.",
      icon: "🛢️",
      inStock: true,
      isB2B: true
    },
    {
      id: "prod-b2b-4",
      name: "Fardo de Garrafas PET 1L c/ Tampas Lacráveis (100 un)",
      category: "b2b_atacado",
      price: 85.00,
      costPrice: 55.00,
      unit: "Fardo 100 un",
      description: "Garrafas transparentes virgens padrão alimentício para envase profissional.",
      icon: "📦",
      inStock: true,
      isB2B: true
    }
  ],
  b2bClients: [
    {
      id: "cli-1",
      name: "Pastelaria e Garapa da Praça",
      responsible: "Seu Vanderlei",
      phone: "66997123344",
      document: "12.345.678/0001-90",
      address: "Av. Marechal Rondon, 1020",
      bairro: "Centro",
      deliveryDays: "Terça e Sexta",
      priceTier: "Tabela Parceiro Ouro",
      creditLimit: 1500.00,
      currentDebt: 0.00,
      status: "ativo",
      notes: "Recebe 10 feixes toda semana às 07:00 da manhã.",
      createdAt: "2026-09-10T10:00:00Z"
    },
    {
      id: "cli-2",
      name: "Trailer Caldo Gelado Gaúcho",
      responsible: "Rogério Antunes",
      phone: "66998445566",
      document: "456.789.012-34",
      address: "Praça dos Carreiros, Box 04",
      bairro: "Centro",
      deliveryDays: "Segunda, Quarta e Sábado",
      priceTier: "Tabela Padrão",
      creditLimit: 800.00,
      currentDebt: 120.00,
      status: "ativo",
      notes: "Paga semanalmente todo sábado no Pix.",
      createdAt: "2026-09-15T14:30:00Z"
    },
    {
      id: "cli-3",
      name: "Lanchonete e Pastel Sabor Tropical",
      responsible: "Dona Neide",
      phone: "66996332211",
      document: "98.765.432/0001-11",
      address: "Rua Fernando Corrêa da Costa, 850",
      bairro: "Vila Operária",
      deliveryDays: "Quinta-feira",
      priceTier: "Tabela Especial Feirante",
      creditLimit: 600.00,
      currentDebt: 0.00,
      status: "ativo",
      notes: "Prefere cana raspada pronta para moagem.",
      createdAt: "2026-09-20T09:15:00Z"
    }
  ],
  orders: [
    {
      id: "ord-1001",
      code: "PED-1001",
      type: "b2c_delivery",
      customerName: "Carlos Eduardo Silva",
      customerPhone: "66999887766",
      address: "Rua Arnaldo Estevão de Figueiredo, 420",
      bairro: "Centro",
      deliveryFee: 6.00,
      items: [
        { id: "prod-2", name: "Caldo de Cana Gelado - 1 Litro", quantity: 2, price: 15.00, total: 30.00 },
        { id: "prod-4", name: "Caldo de Cana c/ Limão Galego (1L)", quantity: 1, price: 17.00, total: 17.00 },
        { id: "prod-9", name: "Pastel Frito na Hora - Carne com Queijo", quantity: 2, price: 12.00, total: 24.00 }
      ],
      subtotal: 71.00,
      total: 77.00,
      paymentMethod: "pix",
      paymentStatus: "pago",
      status: "entregue",
      changeFor: null,
      notes: "Favor mandar o caldo bem geladinho e guardanapos.",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "ord-1002",
      code: "PED-1002",
      type: "b2c_delivery",
      customerName: "Mariana Costa",
      customerPhone: "66996554433",
      address: "Rua Otávio Pitaluga, 1150 - Apto 302",
      bairro: "Vila Aurora I e II",
      deliveryFee: 7.00,
      items: [
        { id: "prod-5", name: "Caldo de Cana c/ Abacaxi (1L)", quantity: 2, price: 18.00, total: 36.00 },
        { id: "prod-8", name: "Toletes de Cana Descascada (Pacote 1kg)", quantity: 1, price: 10.00, total: 10.00 }
      ],
      subtotal: 46.00,
      total: 53.00,
      paymentMethod: "cartao_entrega",
      paymentStatus: "pendente",
      status: "preparando",
      changeFor: null,
      notes: "Interfone 302. Levar maquininha de cartão.",
      createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "ord-1003",
      code: "ATAC-501",
      type: "b2b_supply",
      customerName: "Pastelaria e Garapa da Praça",
      customerPhone: "66997123344",
      b2bClientId: "cli-1",
      address: "Av. Marechal Rondon, 1020",
      bairro: "Centro",
      deliveryFee: 0.00,
      items: [
        { id: "prod-b2b-1", name: "Feixe de Cana Selecionada (15 Varas)", quantity: 10, price: 45.00, total: 450.00 },
        { id: "prod-b2b-4", name: "Fardo de Garrafas PET 1L (100 un)", quantity: 1, price: 85.00, total: 85.00 }
      ],
      subtotal: 535.00,
      total: 535.00,
      paymentMethod: "faturado_semanal",
      paymentStatus: "pendente",
      status: "novo",
      notes: "Entrega agendada matinal. Descarregar na entrada dos fundos.",
      createdAt: new Date(Date.now() - 900000).toISOString()
    }
  ],
  financial: [
    {
      id: "fin-1",
      type: "receita",
      category: "venda_delivery",
      description: "Venda Delivery - Pedido #PED-1001",
      amount: 77.00,
      paymentMethod: "pix",
      relatedOrderId: "ord-1001",
      date: new Date(Date.now() - 3600000 * 3).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "fin-2",
      type: "despesa",
      category: "compra_cana_bruta",
      description: "Carga de Cana Bruta - Produtor Rural Sítio Alvorada (50 feixes)",
      amount: 900.00,
      paymentMethod: "pix",
      relatedOrderId: null,
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "fin-3",
      type: "despesa",
      category: "embalagens_pet",
      description: "Compra de 500 garrafas PET 1L + 300 garrafas 500ml",
      amount: 420.00,
      paymentMethod: "pix",
      relatedOrderId: null,
      date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: "fin-4",
      type: "despesa",
      category: "combustivel_entrega",
      description: "Gasolina para moto de entrega de pedidos",
      amount: 70.00,
      paymentMethod: "dinheiro",
      relatedOrderId: null,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }
  ],
  inventory: [
    { id: "inv-1", name: "Feixes de Cana Bruta (Estoque Pátio)", unit: "Feixes", currentQty: 42, minQty: 15 },
    { id: "inv-2", name: "Cana Raspada Pronta para Moagem", unit: "Feixes", currentQty: 8, minQty: 5 },
    { id: "inv-3", name: "Garrafas PET 1 Litro com Tampa", unit: "Unidades", currentQty: 380, minQty: 100 },
    { id: "inv-4", name: "Garrafas PET 500ml com Tampa", unit: "Unidades", currentQty: 240, minQty: 80 },
    { id: "inv-5", name: "Garrafas PET 2 Litros com Tampa", unit: "Unidades", currentQty: 95, minQty: 40 },
    { id: "inv-6", name: "Copos Descartáveis 500ml", unit: "Unidades", currentQty: 500, minQty: 150 },
    { id: "inv-7", name: "Limão Galego Fresco", unit: "kg", currentQty: 25, minQty: 8 },
    { id: "inv-8", name: "Abacaxi Pérola Selecionado", unit: "Unidades", currentQty: 18, minQty: 6 }
  ],
  motoboys: [
    {
      id: "moto-1",
      name: "Tiago Silva (Motoboy)",
      phone: "66998112233",
      vehicle: "Honda Fan 160 (Preta) - Placa RND-4021",
      feePerDelivery: 5.00,
      active: true,
      createdAt: "2026-09-20T10:00:00Z"
    },
    {
      id: "moto-2",
      name: "Lucas Ferreira (Entrega)",
      phone: "66997445566",
      vehicle: "Yamaha Factor 150 (Vermelha) - Placa RND-8890",
      feePerDelivery: 5.00,
      active: true,
      createdAt: "2026-09-22T14:00:00Z"
    }
  ]
};

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.saveData(INITIAL_DATA);
    } else {
      const data = this.readData();
      let changed = false;
      if (!data.b2bClients || data.b2bClients.length === 0) {
        data.b2bClients = INITIAL_DATA.b2bClients;
        changed = true;
      }
      if (!data.motoboys || data.motoboys.length === 0) {
        data.motoboys = INITIAL_DATA.motoboys;
        changed = true;
      }
      if (!data.financial || data.financial.length === 0 || !data.financial.some(f => f.type === 'despesa')) {
        data.financial = INITIAL_DATA.financial;
        changed = true;
      }
      if (!data.settings || !data.settings.deliveryKmPricing) {
        if (!data.settings) data.settings = INITIAL_DATA.settings;
        data.settings.deliveryKmPricing = INITIAL_DATA.settings.deliveryKmPricing;
        changed = true;
      }
      if (changed) {
        this.saveData(data);
      }
    }
  }

  readData() {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao ler banco de dados, recuperando...", err);
      return INITIAL_DATA;
    }
  }

  saveData(data) {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  // --- SETTINGS & AUTH ---
  getSettings() {
    const db = this.readData();
    // Não expõe a senha diretamente nas configurações públicas
    const { adminPass, ...safeSettings } = db.settings;
    return safeSettings;
  }

  updateSettings(newSettings) {
    const db = this.readData();
    db.settings = { ...db.settings, ...newSettings };
    this.saveData(db);
    return this.getSettings();
  }

  verifyAdmin(username, password) {
    const db = this.readData();
    return db.settings.adminUser === username && db.settings.adminPass === password;
  }

  changeAdminPassword(newPassword) {
    const db = this.readData();
    db.settings.adminPass = newPassword;
    this.saveData(db);
    return true;
  }

  // --- DELIVERY KM PRICING ---
  getDeliveryKmPricing() {
    const db = this.readData();
    if (!db.settings.deliveryKmPricing) {
      db.settings.deliveryKmPricing = INITIAL_DATA.settings.deliveryKmPricing;
      this.saveData(db);
    }
    return db.settings.deliveryKmPricing;
  }

  updateDeliveryKmPricing(newPricing) {
    const db = this.readData();
    db.settings.deliveryKmPricing = {
      ...(db.settings.deliveryKmPricing || INITIAL_DATA.settings.deliveryKmPricing),
      ...newPricing
    };
    this.saveData(db);
    return db.settings.deliveryKmPricing;
  }

  calculateDeliveryFee(distanceKm, isCondominio = false) {
    const dist = parseFloat(distanceKm) || 0;
    if (dist <= 0) return 0.00;

    const pricing = this.getDeliveryKmPricing();
    let fee = 0;

    const baseKm = parseFloat(pricing.baseKm) || 2;
    const baseFee = parseFloat(pricing.baseFee) || 8.00;
    const feePerKm = parseFloat(pricing.feePerKm) || 1.00;
    const maxTableKm = parseFloat(pricing.maxTableKm) || 16;
    const maxTableFee = parseFloat(pricing.maxTableFee) || 22.00;
    const feeAfterMaxPerKm = parseFloat(pricing.feeAfterMaxPerKm) || 1.00;

    if (dist <= baseKm) {
      fee = baseFee;
    } else if (dist <= maxTableKm) {
      const extraKm = Math.ceil(dist) - baseKm;
      fee = baseFee + (extraKm * feePerKm);
    } else {
      const extraKm = Math.ceil(dist) - maxTableKm;
      fee = maxTableFee + (extraKm * feeAfterMaxPerKm);
    }

    if (isCondominio) {
      fee += (parseFloat(pricing.condominioFee) || 0);
    }

    return parseFloat(fee.toFixed(2));
  }

  // --- PRODUCTS (CRUD) ---
  getProducts(includeB2B = true) {
    const db = this.readData();
    if (includeB2B) return db.products;
    return db.products.filter(p => !p.isB2B);
  }

  getProductById(id) {
    const db = this.readData();
    return db.products.find(p => p.id === id);
  }

  createProduct(product) {
    const db = this.readData();
    const newProduct = {
      id: `prod-${Date.now()}`,
      name: product.name,
      category: product.category || 'caldo_puro',
      price: parseFloat(product.price) || 0,
      costPrice: parseFloat(product.costPrice) || 0,
      unit: product.unit || 'Unidade',
      description: product.description || '',
      icon: product.icon || '🥤',
      inStock: product.inStock !== false,
      isB2B: !!product.isB2B
    };
    db.products.push(newProduct);
    this.saveData(db);
    return newProduct;
  }

  updateProduct(id, updates) {
    const db = this.readData();
    const index = db.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    db.products[index] = {
      ...db.products[index],
      ...updates,
      price: updates.price !== undefined ? parseFloat(updates.price) : db.products[index].price,
      costPrice: updates.costPrice !== undefined ? parseFloat(updates.costPrice) : db.products[index].costPrice
    };
    this.saveData(db);
    return db.products[index];
  }

  deleteProduct(id) {
    const db = this.readData();
    const initialLen = db.products.length;
    db.products = db.products.filter(p => p.id !== id);
    if (db.products.length !== initialLen) {
      this.saveData(db);
      return true;
    }
    return false;
  }

  // --- B2B CLIENTS (CRUD com Exclusão como solicitado) ---
  getB2BClients() {
    const db = this.readData();
    return db.b2bClients;
  }

  getB2BClientById(id) {
    const db = this.readData();
    return db.b2bClients.find(c => c.id === id);
  }

  createB2BClient(clientData) {
    const db = this.readData();
    const newClient = {
      id: `cli-${Date.now()}`,
      name: clientData.name,
      responsible: clientData.responsible || '',
      phone: clientData.phone.replace(/\D/g, ''),
      document: clientData.document || '',
      address: clientData.address || '',
      bairro: clientData.bairro || 'Centro',
      deliveryDays: clientData.deliveryDays || 'Sob Demanda',
      priceTier: clientData.priceTier || 'Tabela Padrão',
      creditLimit: parseFloat(clientData.creditLimit) || 1000.00,
      currentDebt: 0.00,
      status: clientData.status || 'ativo',
      notes: clientData.notes || '',
      createdAt: new Date().toISOString()
    };
    db.b2bClients.push(newClient);
    this.saveData(db);
    return newClient;
  }

  updateB2BClient(id, updates) {
    const db = this.readData();
    const index = db.b2bClients.findIndex(c => c.id === id);
    if (index === -1) return null;

    db.b2bClients[index] = {
      ...db.b2bClients[index],
      ...updates
    };
    this.saveData(db);
    return db.b2bClients[index];
  }

  deleteB2BClient(id) {
    const db = this.readData();
    const initialLen = db.b2bClients.length;
    db.b2bClients = db.b2bClients.filter(c => c.id !== id);
    if (db.b2bClients.length !== initialLen) {
      this.saveData(db);
      return true;
    }
    return false;
  }

  // --- ORDERS ---
  getOrders(filterStatus = null) {
    const db = this.readData();
    let list = db.orders;
    if (filterStatus) {
      list = list.filter(o => o.status === filterStatus);
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrderById(id) {
    const db = this.readData();
    return db.orders.find(o => o.id === id || o.code === id);
  }

  createOrder(orderData) {
    const db = this.readData();
    const nextNum = 1000 + db.orders.length + 1;
    const prefix = orderData.type === 'b2b_supply' ? 'ATAC' : 'PED';
    const code = `${prefix}-${nextNum}`;

    const newOrder = {
      id: `ord-${Date.now()}`,
      code: code,
      type: orderData.type || 'b2c_delivery',
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      b2bClientId: orderData.b2bClientId || null,
      address: orderData.address || '',
      bairro: orderData.bairro || 'Jardim Santa Marta',
      distanceKm: orderData.distanceKm !== undefined && orderData.distanceKm !== null ? parseFloat(orderData.distanceKm) : null,
      isCondominio: !!orderData.isCondominio,
      deliveryFee: parseFloat(orderData.deliveryFee) || 0,
      items: orderData.items || [],
      subtotal: parseFloat(orderData.subtotal) || 0,
      total: parseFloat(orderData.total) || 0,
      paymentMethod: orderData.paymentMethod || 'pix',
      paymentStatus: orderData.paymentStatus || 'pendente',
      status: orderData.status || 'novo',
      changeFor: orderData.changeFor ? parseFloat(orderData.changeFor) : null,
      notes: orderData.notes || '',
      createdAt: new Date().toISOString()
    };

    db.orders.unshift(newOrder);

    // Se já estiver pago ou for à vista, podemos opcionalmente registrar receita
    if (newOrder.paymentStatus === 'pago') {
      db.financial.push({
        id: `fin-${Date.now()}`,
        type: 'receita',
        category: newOrder.type === 'b2b_supply' ? 'venda_atacado' : 'venda_delivery',
        description: `Receita Venda - Pedido #${newOrder.code} (${newOrder.customerName})`,
        amount: newOrder.total,
        paymentMethod: newOrder.paymentMethod,
        relatedOrderId: newOrder.id,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
    }

    this.saveData(db);
    return newOrder;
  }

  deleteOrder(id) {
    const db = this.readData();
    const index = db.orders.findIndex(o => o.id === id);
    if (index === -1) return false;
    db.orders.splice(index, 1);
    this.saveData(db);
    return true;
  }

  updateOrderStatus(id, newStatus, paymentStatus = null, motoboyId = null) {
    const db = this.readData();
    const order = db.orders.find(o => o.id === id);
    if (!order) return null;

    const oldStatus = order.status;
    order.status = newStatus;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    if (motoboyId) {
      order.motoboyId = motoboyId;
      const mb = (db.motoboys || []).find(m => m.id === motoboyId);
      if (mb) order.motoboyName = mb.name;
    }
    if (newStatus === 'saiu_entrega' && !order.dispatchedAt) {
      order.dispatchedAt = new Date().toISOString();
    }
    if (newStatus === 'entregue' && order.motoboyId && order.motoboySettled === undefined) {
      order.motoboySettled = false;
    }

    // Se virou "entregue" e o pagamento foi confirmado, registra no financeiro se não registrado ainda
    if (newStatus === 'entregue' && order.paymentStatus === 'pago') {
      const alreadyLogged = db.financial.some(f => f.relatedOrderId === order.id);
      if (!alreadyLogged) {
        db.financial.push({
          id: `fin-${Date.now()}`,
          type: 'receita',
          category: order.type === 'b2b_supply' ? 'venda_atacado' : 'venda_delivery',
          description: `Venda Concluída - Pedido #${order.code} (${order.customerName})`,
          amount: order.total,
          paymentMethod: order.paymentMethod,
          relatedOrderId: order.id,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
      }
    }

    this.saveData(db);
    return order;
  }

  // --- FINANCIAL ---
  getFinancialReport() {
    const db = this.readData();
    const transactions = db.financial;

    let totalReceitas = 0;
    let totalDespesas = 0;
    let receitasDelivery = 0;
    let receitasAtacado = 0;

    transactions.forEach(t => {
      const val = parseFloat(t.amount) || 0;
      if (t.type === 'receita') {
        totalReceitas += val;
        if (t.category === 'venda_atacado') receitasAtacado += val;
        else receitasDelivery += val;
      } else if (t.type === 'despesa') {
        totalDespesas += val;
      }
    });

    const lucroLiquido = totalReceitas - totalDespesas;

    // Contas a receber B2B (pedidos faturados que ainda não foram marcados como pagos)
    const contasAReceber = db.orders
      .filter(o => o.type === 'b2b_supply' && o.paymentStatus !== 'pago' && o.status !== 'cancelado')
      .map(o => ({
        orderId: o.id,
        code: o.code,
        client: o.customerName,
        phone: o.customerPhone,
        total: o.total,
        date: o.createdAt
      }));

    const totalAReceber = contasAReceber.reduce((acc, cur) => acc + cur.total, 0);

    return {
      totalReceitas,
      totalDespesas,
      lucroLiquido,
      receitasDelivery,
      receitasAtacado,
      totalAReceber,
      contasAReceber,
      transactions: transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
  }

  addFinancialTransaction(txData) {
    const db = this.readData();
    const newTx = {
      id: `fin-${Date.now()}`,
      type: txData.type, // 'receita' ou 'despesa'
      category: txData.category || 'outros',
      description: txData.description,
      amount: parseFloat(txData.amount) || 0,
      paymentMethod: txData.paymentMethod || 'pix',
      relatedOrderId: txData.relatedOrderId || null,
      date: txData.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    db.financial.push(newTx);
    this.saveData(db);
    return newTx;
  }

  deleteFinancialTransaction(id) {
    const db = this.readData();
    const initLen = db.financial.length;
    db.financial = db.financial.filter(f => f.id !== id);
    if (db.financial.length !== initLen) {
      this.saveData(db);
      return true;
    }
    return false;
  }

  // --- INVENTORY ---
  getInventory() {
    const db = this.readData();
    return db.inventory;
  }

  updateInventory(id, currentQty) {
    const db = this.readData();
    const item = db.inventory.find(i => i.id === id);
    if (!item) return null;
    item.currentQty = parseInt(currentQty, 10);
    this.saveData(db);
    return item;
  }

  // --- BAIRROS & TAXAS (CRUD) ---
  getBairros() {
    const db = this.readData();
    return (db.settings && db.settings.bairros) ? db.settings.bairros : [];
  }

  createBairro(bairroData) {
    const db = this.readData();
    if (!db.settings.bairros) db.settings.bairros = [];
    const newBairro = {
      id: `b-${Date.now()}`,
      name: bairroData.name.trim(),
      fee: parseFloat(bairroData.fee) || 0,
      time: bairroData.time ? bairroData.time.trim() : '20-35 min'
    };
    db.settings.bairros.push(newBairro);
    this.saveData(db);
    return newBairro;
  }

  updateBairro(id, updates) {
    const db = this.readData();
    if (!db.settings.bairros) return null;
    const index = db.settings.bairros.findIndex(b => b.id === id);
    if (index === -1) return null;

    db.settings.bairros[index] = {
      ...db.settings.bairros[index],
      name: updates.name ? updates.name.trim() : db.settings.bairros[index].name,
      fee: updates.fee !== undefined ? parseFloat(updates.fee) : db.settings.bairros[index].fee,
      time: updates.time ? updates.time.trim() : db.settings.bairros[index].time
    };
    this.saveData(db);
    return db.settings.bairros[index];
  }

  deleteBairro(id) {
    const db = this.readData();
    if (!db.settings.bairros) return false;
    if (id === 'b0') return false; // Bloqueia remoção da Retirada no Balcão

    const initialLen = db.settings.bairros.length;
    db.settings.bairros = db.settings.bairros.filter(b => b.id !== id);
    if (db.settings.bairros.length !== initialLen) {
      this.saveData(db);
      return true;
    }
    return false;
  }

  // --- MOTOBOYS & ENTREGADORES (CRUD + ACERTO) ---
  getMotoboys() {
    const db = this.readData();
    return db.motoboys || [];
  }

  getMotoboyById(id) {
    const db = this.readData();
    return (db.motoboys || []).find(m => m.id === id);
  }

  createMotoboy(motoData) {
    const db = this.readData();
    if (!db.motoboys) db.motoboys = [];

    const newMoto = {
      id: `moto-${Date.now()}`,
      name: motoData.name.trim(),
      phone: (motoData.phone || '').replace(/\D/g, ''),
      vehicle: motoData.vehicle ? motoData.vehicle.trim() : '',
      feePerDelivery: parseFloat(motoData.feePerDelivery) || 5.00,
      active: motoData.active !== false,
      createdAt: new Date().toISOString()
    };

    db.motoboys.push(newMoto);
    this.saveData(db);
    return newMoto;
  }

  updateMotoboy(id, updates) {
    const db = this.readData();
    if (!db.motoboys) return null;
    const index = db.motoboys.findIndex(m => m.id === id);
    if (index === -1) return null;

    db.motoboys[index] = {
      ...db.motoboys[index],
      ...updates,
      phone: updates.phone ? updates.phone.replace(/\D/g, '') : db.motoboys[index].phone,
      feePerDelivery: updates.feePerDelivery !== undefined ? parseFloat(updates.feePerDelivery) : db.motoboys[index].feePerDelivery
    };
    this.saveData(db);
    return db.motoboys[index];
  }

  deleteMotoboy(id) {
    const db = this.readData();
    if (!db.motoboys) return false;

    const initialLen = db.motoboys.length;
    db.motoboys = db.motoboys.filter(m => m.id !== id);
    if (db.motoboys.length !== initialLen) {
      this.saveData(db);
      return true;
    }
    return false;
  }

  getMotoboysReport() {
    const db = this.readData();
    const motoboys = db.motoboys || [];
    const orders = db.orders || [];

    return motoboys.map(m => {
      const assignedOrders = orders.filter(o => o.motoboyId === m.id && o.status !== 'cancelado');
      const deliveredOrders = assignedOrders.filter(o => o.status === 'entregue');
      const pendingSettlementOrders = deliveredOrders.filter(o => o.motoboySettled !== true);
      const settledOrders = deliveredOrders.filter(o => o.motoboySettled === true);

      const fee = m.feePerDelivery || 5.00;
      const pendingAmount = pendingSettlementOrders.length * fee;
      const totalEarned = deliveredOrders.length * fee;

      return {
        ...m,
        totalDeliveries: deliveredOrders.length,
        pendingDeliveriesCount: pendingSettlementOrders.length,
        pendingAmount: pendingAmount,
        settledDeliveriesCount: settledOrders.length,
        totalEarned: totalEarned,
        pendingOrders: pendingSettlementOrders.map(o => ({
          orderId: o.id,
          code: o.code,
          customer: o.customerName,
          bairro: o.bairro,
          date: o.createdAt
        }))
      };
    });
  }

  settleMotoboyDeliveries(motoboyId) {
    const db = this.readData();
    const motoboy = (db.motoboys || []).find(m => m.id === motoboyId);
    if (!motoboy) return { success: false, error: 'Motoboy não encontrado.' };

    const orders = db.orders || [];
    const fee = motoboy.feePerDelivery || 5.00;
    let settledCount = 0;

    orders.forEach(o => {
      if (o.motoboyId === motoboyId && o.status === 'entregue' && o.motoboySettled !== true) {
        o.motoboySettled = true;
        o.motoboySettledAt = new Date().toISOString();
        settledCount++;
      }
    });

    if (settledCount === 0) {
      return { success: false, error: 'Nenhuma entrega pendente de acerto para este motoboy.' };
    }

    const totalPaid = settledCount * fee;

    // Registra despesa automática no financeiro
    db.financial.push({
      id: `fin-${Date.now()}`,
      type: 'despesa',
      category: 'combustivel_entrega',
      description: `Acerto Corridas Motoboy: ${motoboy.name} (${settledCount} entregas x R$ ${fee.toFixed(2)})`,
      amount: totalPaid,
      paymentMethod: 'pix',
      relatedOrderId: null,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });

    this.saveData(db);

    return {
      success: true,
      motoboyName: motoboy.name,
      settledCount,
      totalPaid
    };
  }
}

module.exports = new Database();
