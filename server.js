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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🌾 Central da Cana - Distribuição & Delivery`);
  console.log(`📍 Av. Goiânia, 346 - Jardim Santa Marta, Rondonópolis/MT`);
  console.log(`📱 Contato Josué: (66) 99683-3628`);
  console.log(`🚀 Sistema rodando em http://localhost:${PORT}`);
  console.log(`⚡ Desenvolvido por NyxCipher (Alexa) - (66) 99612-8149`);
  console.log(`====================================================`);
});
