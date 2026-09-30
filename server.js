const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de verificação de autenticação de admin simples por token/header
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login como administrador.' });
  }
  const token = authHeader.split(' ')[1];
  // Decodifica token base64 simples "username:timestamp"
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [user] = decoded.split(':');
    if (user === 'josue') {
      return next();
    }
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  } catch (e) {
    return res.status(401).json({ error: 'Token de autenticação inválido.' });
  }
};

// ==========================================
// 1. CONFIGURAÇÕES & AUTENTICAÇÃO
// ==========================================
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Informe o usuário e a senha.' });
  }

  const isValid = db.verifyAdmin(username.trim(), password.trim());
  if (!isValid) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  // Gera token de sessão
  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
  res.json({
    success: true,
    token,
    user: {
      username,
      name: 'Josué - Central da Cana'
    }
  });
});

app.post('/api/admin/change-password', requireAdminAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
  }

  const isValid = db.verifyAdmin('josue', currentPassword);
  if (!isValid) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }

  db.changeAdminPassword(newPassword);
  res.json({ success: true, message: 'Senha alterada com sucesso!' });
});

// ==========================================
// 2. PRODUTOS (CRUD COMPLETO)
// ==========================================
app.get('/api/products', (req, res) => {
  const includeB2B = req.query.b2b !== 'false';
  res.json(db.getProducts(includeB2B));
});

app.post('/api/products', requireAdminAuth, (req, res) => {
  const { name, price, category, unit, description, icon, isB2B } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Nome e preço do produto são obrigatórios.' });
  }
  const created = db.createProduct(req.body);
  res.status(201).json(created);
});

app.put('/api/products/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateProduct(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }
  res.json(updated);
});

app.delete('/api/products/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteProduct(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
  }
  res.json({ success: true, message: 'Produto excluído com sucesso!' });
});

// ==========================================
// 3. CLIENTES B2B / FORNECIMENTO (CRUD + EXCLUSÃO)
// ==========================================
app.get('/api/b2b-clients', (req, res) => {
  res.json(db.getB2BClients());
});

app.post('/api/b2b-clients', requireAdminAuth, (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nome do estabelecimento e WhatsApp são obrigatórios.' });
  }
  const created = db.createB2BClient(req.body);
  res.status(201).json(created);
});

app.put('/api/b2b-clients/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateB2BClient(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Cliente parceiro não encontrado.' });
  }
  res.json(updated);
});

app.delete('/api/b2b-clients/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteB2BClient(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Cliente B2B não encontrado para exclusão.' });
  }
  res.json({ success: true, message: 'Cliente parceiro excluído com sucesso!' });
});

// ==========================================
// 4. PEDIDOS (DELIVERY E FORNECIMENTO)
// ==========================================
app.get('/api/orders', (req, res) => {
  const { status } = req.query;
  res.json(db.getOrders(status));
});

app.post('/api/orders', (req, res) => {
  const { customerName, customerPhone, items } = req.body;
  if (!customerName || !customerPhone || !items || !items.length) {
    return res.status(400).json({ error: 'Preencha seu nome, telefone e selecione os itens do pedido.' });
  }
  const newOrder = db.createOrder(req.body);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id/status', requireAdminAuth, (req, res) => {
  const { status, paymentStatus, motoboyId } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório.' });
  }
  const updated = db.updateOrderStatus(req.params.id, status, paymentStatus, motoboyId);
  if (!updated) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }
  res.json(updated);
});

app.delete('/api/orders/:id', requireAdminAuth, (req, res) => {
  const success = db.deleteOrder(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Pedido não encontrado para exclusão.' });
  }
  res.json({ success: true, message: 'Pedido excluído com sucesso!' });
});

// ==========================================
// 5. FINANCEIRO (FLUXO DE CAIXA & DRE)
// ==========================================
app.get('/api/financial', requireAdminAuth, (req, res) => {
  res.json(db.getFinancialReport());
});

app.post('/api/financial/transaction', requireAdminAuth, (req, res) => {
  const { type, description, amount } = req.body;
  if (!type || !description || !amount) {
    return res.status(400).json({ error: 'Tipo, descrição e valor são obrigatórios.' });
  }
  const newTx = db.addFinancialTransaction(req.body);
  res.status(201).json(newTx);
});

app.delete('/api/financial/transaction/:id', requireAdminAuth, (req, res) => {
  const ok = db.deleteFinancialTransaction(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Transação não encontrada.' });
  res.json({ success: true });
});

// ==========================================
// 6. ESTOQUE & INSUMOS
// ==========================================
app.get('/api/inventory', requireAdminAuth, (req, res) => {
  res.json(db.getInventory());
});

app.put('/api/inventory/:id', requireAdminAuth, (req, res) => {
  const { currentQty } = req.body;
  if (currentQty === undefined) {
    return res.status(400).json({ error: 'Quantidade é obrigatória.' });
  }
  const item = db.updateInventory(req.params.id, currentQty);
  if (!item) return res.status(404).json({ error: 'Item de estoque não encontrado.' });
  res.json(item);
});

// ==========================================
// 7. BAIRROS & TAXAS DE ENTREGA (CRUD)
// ==========================================
app.get('/api/bairros', (req, res) => {
  res.json(db.getBairros());
});

app.post('/api/bairros', requireAdminAuth, (req, res) => {
  const { name, fee } = req.body;
  if (!name || fee === undefined) {
    return res.status(400).json({ error: 'Nome do bairro e valor da taxa são obrigatórios.' });
  }
  const created = db.createBairro(req.body);
  res.status(201).json(created);
});

app.put('/api/bairros/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateBairro(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Bairro não encontrado.' });
  res.json(updated);
});

app.delete('/api/bairros/:id', requireAdminAuth, (req, res) => {
  if (req.params.id === 'b0') {
    return res.status(400).json({ error: 'Não é permitido excluir a opção de Retirada no Balcão.' });
  }
  const ok = db.deleteBairro(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Bairro não encontrado.' });
  res.json({ success: true, message: 'Bairro excluído com sucesso!' });
});

// ==========================================
// 7.1 TAXAS POR KM & DISTÂNCIA (TABELA OFICIAL MOTOBOYS)
// ==========================================
const RONDONOPOLIS_DISTANCE_REF = [
  { match: ['balcão', 'balcao', 'retirar', 'retirada'], km: 0 },
  { match: ['santa marta', 'goiânia', 'goiania', 'jd santa marta', 'jardim santa marta'], km: 1.2 },
  { match: ['parque real', 'pq real'], km: 2.0 },
  { match: ['monte líbano', 'monte libano'], km: 2.8 },
  { match: ['coophalis'], km: 3.2 },
  { match: ['centro', 'cuiabá', 'cuiaba', 'amazonas', 'marechal rondon', 'arnaldo estevão', 'arnaldo estevao'], km: 3.5 },
  { match: ['vila birigui', 'birigui'], km: 3.8 },
  { match: ['primavera', 'jardim primavera'], km: 4.0 },
  { match: ['vila aurora', 'aurora', 'otávio pitaluga', 'otavio pitaluga'], km: 4.2 },
  { match: ['guanabara', 'jardim guanabara'], km: 4.5 },
  { match: ['sagrada família', 'sagrada familia', 'lions internacional', 'lions'], km: 4.8 },
  { match: ['vila operária', 'vila operaria', 'operária', 'bandeirantes', 'médici', 'medici'], km: 5.5 },
  { match: ['belo horizonte', 'cidade alta'], km: 5.8 },
  { match: ['iguassu', 'jardim iguassu'], km: 6.2 },
  { match: ['atlântico', 'atlantico', 'jardim atlântico'], km: 7.5 },
  { match: ['cidade salmen', 'salmen'], km: 7.8 },
  { match: ['parque universitário', 'parque universitario', 'universitário', 'ufmt', 'ufr'], km: 8.5 },
  { match: ['pedra 90', 'pedra noventa'], km: 10.0 },
  { match: ['distrito industrial', 'anel viário', 'anel viario'], km: 11.5 },
  { match: ['gleba', 'zona rural'], km: 14.0 }
];

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightKm = R * c;
  // Fator de rota urbana em malha viária (cerca de 25% a mais que linha reta)
  return Math.round(straightKm * 1.25 * 10) / 10;
}

app.get('/api/delivery-km', (req, res) => {
  res.json(db.getDeliveryKmPricing());
});

app.put('/api/delivery-km', requireAdminAuth, (req, res) => {
  const updated = db.updateDeliveryKmPricing(req.body);
  res.json(updated);
});

app.post('/api/delivery/calculate-km', (req, res) => {
  const { address, lat, lng, isCondominio, distanceKm: customKm } = req.body;
  const pricing = db.getDeliveryKmPricing();

  let finalDistanceKm = 3.0; // fallback padrão urbano
  let calculationSource = 'default';

  if (customKm !== undefined && customKm !== null && parseFloat(customKm) >= 0) {
    finalDistanceKm = parseFloat(customKm);
    calculationSource = 'custom';
  } else if (lat && lng) {
    const originLat = pricing.originLat || -16.4552;
    const originLng = pricing.originLng || -54.6295;
    finalDistanceKm = calculateHaversineKm(originLat, originLng, parseFloat(lat), parseFloat(lng));
    calculationSource = 'gps';
  } else if (address) {
    const norm = address.toLowerCase();
    const matched = RONDONOPOLIS_DISTANCE_REF.find(ref => 
      ref.match.some(m => norm.includes(m))
    );
    if (matched) {
      finalDistanceKm = matched.km;
      calculationSource = 'neighborhood_match';
    } else {
      finalDistanceKm = 4.0;
      calculationSource = 'estimated_average';
    }
  }

  const deliveryFee = db.calculateDeliveryFee(finalDistanceKm, isCondominio);

  res.json({
    originAddress: pricing.originAddress,
    destinationAddress: address || '',
    distanceKm: finalDistanceKm,
    deliveryFee: deliveryFee,
    isCondominio: !!isCondominio,
    pricingTable: pricing,
    calculationSource
  });
});

// ==========================================
// 8. MOTOBOYS & ENTREGADORES (CRUD + ACERTO)
// ==========================================
app.get('/api/motoboys', (req, res) => {
  res.json(db.getMotoboys());
});

app.get('/api/motoboys/report', requireAdminAuth, (req, res) => {
  res.json(db.getMotoboysReport());
});

app.post('/api/motoboys', requireAdminAuth, (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nome do motoboy e WhatsApp são obrigatórios.' });
  }
  const created = db.createMotoboy(req.body);
  res.status(201).json(created);
});

app.put('/api/motoboys/:id', requireAdminAuth, (req, res) => {
  const updated = db.updateMotoboy(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Motoboy não encontrado.' });
  res.json(updated);
});

app.delete('/api/motoboys/:id', requireAdminAuth, (req, res) => {
  const ok = db.deleteMotoboy(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Motoboy não encontrado.' });
  res.json({ success: true, message: 'Motoboy excluído com sucesso!' });
});

app.post('/api/motoboys/:id/settle', requireAdminAuth, (req, res) => {
  const result = db.settleMotoboyDeliveries(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let serverInstance = null;
if (require.main === module) {
  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🌾 Central da Cana - Distribuição & Delivery`);
    console.log(`📍 Av. Goiânia, 346 - Jardim Santa Marta, Rondonópolis/MT`);
    console.log(`📱 Contato Josué: (66) 99683-3628`);
    console.log(`🚀 Sistema rodando em http://localhost:${PORT}`);
    console.log(`⚡ Desenvolvido por NyxCipher (Alexa) - (66) 99612-8149`);
    console.log(`====================================================`);
  });
}

module.exports = { app, serverInstance };
