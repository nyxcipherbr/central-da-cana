/**
 * Script de Verificação Automatizada - Central da Cana
 * Testa o banco de dados, regras de negócio e rotas da API em processo.
 */
const db = require('./database');

async function runTests() {
  console.log('🧪 INICIANDO TESTES DO SISTEMA CENTRAL DA CANA...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Teste de Configurações e Branding
  const settings = db.getSettings();
  assert(settings.businessName === "Central da Cana", "Nome do estabelecimento configurado corretamente");
  assert(settings.ownerName === "Josué", "Dono do estabelecimento é o Josué");
  assert(settings.attendants && settings.attendants.day.phone === "66999536712", "Turno Alexa configurado: 09h às 17h (66 99953-6712)");
  assert(settings.attendants && settings.attendants.evening.phone === "66996833628", "Turno Josué configurado: 17h às 20h (66 99683-3628)");
  assert(settings.developer.brand === "NyxCipher", "Marca da criadora é NyxCipher");
  assert(settings.developer.creator === "Alexa", "Criadora é a Alexa");
  assert(settings.developer.phone === "66996128149", "WhatsApp da Alexa configurado (66 99612-8149)");
  assert(settings.bairros.length >= 10, "Bairros de Rondonópolis carregados com taxas de entrega");

  // 2. Teste de Autenticação do Josué
  const authOk = db.verifyAdmin("josue", "cana123");
  assert(authOk === true, "Autenticação do Josué válida com senha inicial");

  const authFail = db.verifyAdmin("josue", "senha_errada");
  assert(authFail === false, "Bloqueio de acesso com senha incorreta");

  // 3. Teste do Cardápio / Produtos (B2C e B2B)
  const products = db.getProducts();
  assert(products.length >= 10, `Cardápio carregado com ${products.length} produtos`);
  
  const caldos = products.filter(p => p.category === 'caldo_puro');
  assert(caldos.length >= 3, "Caldos de 500ml, 1L e 2L presentes no cardápio");

  // 4. Teste de CRUD de Produtos (Criar, Atualizar e Excluir)
  const newProd = db.createProduct({
    name: "Caldo de Cana c/ Acerola (1L)",
    category: "caldo_sabores",
    price: 18.50,
    costPrice: 5.00,
    unit: "Garrafa 1L",
    description: "Sabor cítrico especial",
    icon: "🍒",
    isB2B: false
  });
  assert(newProd.id && newProd.name.includes("Acerola"), "Novo produto cadastrado com sucesso");

  const updatedProd = db.updateProduct(newProd.id, { price: 19.00 });
  assert(updatedProd.price === 19.00, "Preço do produto atualizado com sucesso");

  const deletedProd = db.deleteProduct(newProd.id);
  assert(deletedProd === true, "Produto excluído do cardápio com sucesso (Requisito atendido)");

  // 5. Teste de CRUD de Clientes B2B / Fornecimento (Cadastrar e Excluir)
  const initialClients = db.getB2BClients();
  assert(initialClients.length >= 3, `Clientes parceiros B2B iniciais carregados (${initialClients.length})`);

  const testClient = db.createB2BClient({
    name: "Pastelaria Teste Vila Aurora",
    responsible: "Marcos",
    phone: "66998881122",
    document: "11.222.333/0001-44",
    address: "Av. Lions Internacional, 500",
    bairro: "Vila Aurora",
    deliveryDays: "Segunda e Quinta",
    priceTier: "Tabela Parceiro",
    creditLimit: 1200.00,
    notes: "Cliente teste"
  });
  assert(testClient.id && testClient.name.includes("Pastelaria Teste"), "Novo cliente B2B parceiro cadastrado com sucesso");

  // Excluir cliente B2B (requisito explícito)
  const deletedClient = db.deleteB2BClient(testClient.id);
  assert(deletedClient === true, "Cliente B2B excluído com sucesso do painel do Josué (Requisito atendido)");

  const clientNotFound = db.getB2BClientById(testClient.id);
  assert(!clientNotFound, "Cliente B2B removido definitivamente do cadastro");

  // 6. Teste de Criação de Pedido Delivery
  const newOrder = db.createOrder({
    type: "b2c_delivery",
    customerName: "Ana Paula Silva",
    customerPhone: "66999112233",
    address: "Rua Rio Branco, 250",
    bairro: "Jardim Santa Marta",
    deliveryFee: 4.00,
    subtotal: 30.00,
    total: 34.00,
    paymentMethod: "pix",
    items: [
      { id: "prod-2", name: "Caldo de Cana Gelado - 1 Litro", quantity: 2, price: 15.00, total: 30.00 }
    ]
  });
  assert(newOrder.code && newOrder.code.startsWith("PED-"), `Pedido Delivery #${newOrder.code} criado com sucesso`);

  // Avançar status do pedido (Kanban)
  const updatedStatus = db.updateOrderStatus(newOrder.id, "saiu_entrega");
  assert(updatedStatus.status === "saiu_entrega", "Status do pedido alterado para 'saiu_entrega'");

  const finalStatus = db.updateOrderStatus(newOrder.id, "entregue", "pago");
  assert(finalStatus.status === "entregue" && finalStatus.paymentStatus === "pago", "Pedido concluído e marcado como pago");

  // 7. Teste do Relatório Financeiro
  const financial = db.getFinancialReport();
  assert(financial.totalReceitas > 0, `Total de receitas calculado: R$ ${financial.totalReceitas.toFixed(2)}`);
  assert(financial.totalDespesas > 0, `Total de despesas calculado: R$ ${financial.totalDespesas.toFixed(2)}`);
  assert(financial.lucroLiquido !== undefined, `Lucro líquido real calculado: R$ ${financial.lucroLiquido.toFixed(2)}`);

  // 8. Teste de Lançamento de Despesa
  const newExpense = db.addFinancialTransaction({
    type: "despesa",
    category: "compra_cana_bruta",
    description: "Carga de Cana Sítio Recanto Verde (30 feixes)",
    amount: 540.00,
    paymentMethod: "pix"
  });
  assert(newExpense.id && newExpense.amount === 540.00, "Despesa operacional registrada com sucesso");
  db.deleteFinancialTransaction(newExpense.id);
  db.deleteOrder(newOrder.id);

  // 9. Teste de Bairros & Taxas (CRUD)
  const initialBairros = db.getBairros();
  assert(initialBairros.length >= 10, `Bairros carregados (${initialBairros.length} bairros)`);

  const newBairro = db.createBairro({
    name: "Parque São Jorge Teste",
    fee: 8.50,
    time: "25-35 min"
  });
  assert(newBairro.id && newBairro.fee === 8.50, "Novo bairro cadastrado com taxa de entrega");

  const updatedBairro = db.updateBairro(newBairro.id, { fee: 9.00 });
  assert(updatedBairro.fee === 9.00, "Taxa do bairro atualizada com sucesso");

  const cantDeleteBalcao = db.deleteBairro('b0');
  assert(cantDeleteBalcao === false, "Bloqueio de segurança: Retirada no Balcão não pode ser excluída");

  const deletedBairro = db.deleteBairro(newBairro.id);
  assert(deletedBairro === true, "Bairro teste excluído com sucesso");

  // 10. Teste de Motoboys & Acerto de Entregas
  const initialMotoboys = db.getMotoboys();
  assert(initialMotoboys.length >= 2, `Motoboys cadastrados (${initialMotoboys.length})`);

  const newMotoboy = db.createMotoboy({
    name: "Carlos Motoboy Teste",
    phone: "66999001122",
    vehicle: "CG 160 Fan",
    feePerDelivery: 6.00
  });
  assert(newMotoboy.id && newMotoboy.feePerDelivery === 6.00, "Novo motoboy cadastrado com taxa por corrida");

  // Simula entrega atribuída ao motoboy
  const motoOrder = db.createOrder({
    type: "b2c_delivery",
    customerName: "Cliente Motoboy Teste",
    customerPhone: "66999443322",
    address: "Rua 13 de Maio, 80",
    bairro: "Vila Aurora",
    deliveryFee: 7.00,
    subtotal: 30.00,
    total: 37.00,
    paymentMethod: "dinheiro",
    items: [{ id: "prod-2", name: "Caldo de Cana 1L", quantity: 2, price: 15.00, total: 30.00 }]
  });

  // Despacha e entrega com o motoboy
  db.updateOrderStatus(motoOrder.id, "saiu_entrega", null, newMotoboy.id);
  db.updateOrderStatus(motoOrder.id, "entregue", "pago");

  // Verifica relatório de acertos
  const report = db.getMotoboysReport();
  const motoRep = report.find(m => m.id === newMotoboy.id);
  assert(motoRep && motoRep.pendingDeliveriesCount === 1, "Relatório acusa 1 entrega pendente de acerto para o motoboy");
  assert(motoRep && motoRep.pendingAmount === 6.00, "Valor do acerto calculado corretamente (R$ 6,00)");

  // Realiza acerto / pagamento do motoboy
  const settleResult = db.settleMotoboyDeliveries(newMotoboy.id);
  assert(settleResult.success === true && settleResult.totalPaid === 6.00, "Acerto financeiro com motoboy realizado e quitado");

  // Verifica se zerou o pendente após o acerto
  const reportAfter = db.getMotoboysReport();
  const motoRepAfter = reportAfter.find(m => m.id === newMotoboy.id);
  assert(motoRepAfter && motoRepAfter.pendingDeliveriesCount === 0, "Entregas pendentes zeradas após realização do acerto");

  // Exclui motoboy teste
  const deletedMoto = db.deleteMotoboy(newMotoboy.id);
  assert(deletedMoto === true, "Motoboy teste excluído com sucesso");
  db.deleteOrder(motoOrder.id);

  // 10. Teste de Suporte PWA (Manifest, Service Worker e Ícones)
  const fs = require('fs');
  const path = require('path');
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), "Manifesto PWA (manifest.json) presente");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifest.name && manifest.name.includes("Central da Cana"), "Manifesto PWA possui nome da Central da Cana");
  assert(manifest.display === "standalone", "Modo de exibição configurado para standalone (App nativo)");
  assert(manifest.icons && manifest.icons.length >= 2, "Ícones de aplicativo configurados no manifesto");

  const swPath = path.join(__dirname, 'public', 'service-worker.js');
  assert(fs.existsSync(swPath), "Service Worker (service-worker.js) presente para suporte offline e instalação");

  const icon192Path = path.join(__dirname, 'public', 'icon-192.png');
  const iconSvgPath = path.join(__dirname, 'public', 'icon.svg');
  assert(fs.existsSync(icon192Path) && fs.existsSync(iconSvgPath), "Ícones PNG e SVG presentes para tela inicial do celular");

  // 11. Teste de Integridade Completa de Pedido & Gatilho de Alarme Sonoro
  const alarmOrder = db.createOrder({
    type: "b2c_delivery",
    customerName: "Carlos Alerta Teste",
    customerPhone: "66998889988",
    address: "Av. Goiânia, 1000 - Esquina com Rua 3",
    bairro: "Vila Operária",
    deliveryFee: 6.00,
    subtotal: 24.00,
    total: 30.00,
    paymentMethod: "pix",
    changeFor: null,
    items: [
      { id: "prod-1", name: "Caldo de Cana Puro Gelado (1L)", quantity: 2, price: 12.00, total: 24.00 }
    ]
  });

  assert(alarmOrder.id && alarmOrder.code.startsWith("PED-"), "Pedido completo com código único gerado");
  assert(alarmOrder.status === "novo", "Pedido criado com status 'novo' para acionar o alarme sonoro no ADM");
  assert(alarmOrder.customerName === "Carlos Alerta Teste", "Nome do cliente salvo com integridade");
  assert(alarmOrder.customerPhone === "66998889988", "WhatsApp do cliente salvo com integridade");
  assert(alarmOrder.address.includes("Av. Goiânia"), "Endereço completo com ponto de referência registrado");
  assert(alarmOrder.total === 30.00, "Valor total com frete salvo com precisão para o alerta de WhatsApp");
  db.deleteOrder(alarmOrder.id);

  // 12. Teste de Criação Manual no ADM e Exclusão de Pedidos (Kanban)
  const manualAdmOrder = db.createOrder({
    type: "balcao",
    customerName: "Cliente Balcão Josué",
    customerPhone: "66999887766",
    address: "Retirada no Balcão",
    bairro: "Balcão",
    deliveryFee: 0.00,
    subtotal: 18.00,
    total: 18.00,
    paymentMethod: "cartao_credito",
    status: "preparando",
    notes: "Sem gelo, caprichar no limão",
    items: [
      { id: "prod-1", name: "Caldo de Cana com Limão (1L)", quantity: 1, price: 18.00, total: 18.00 }
    ]
  });

  assert(manualAdmOrder.id && manualAdmOrder.code.startsWith("PED-"), "Pedido manual ADM criado com código único");
  assert(manualAdmOrder.status === "preparando", "Pedido manual ADM criado com status personalizado ('preparando')");
  assert(manualAdmOrder.notes === "Sem gelo, caprichar no limão", "Observações do pedido manual gravadas corretamente");

  // Exclusão do pedido
  const deleteSuccess = db.deleteOrder(manualAdmOrder.id);
  assert(deleteSuccess === true, "Pedido manual excluído com sucesso via db.deleteOrder()");

  const orderCheck = db.getOrderById(manualAdmOrder.id);
  assert(!orderCheck, "Pedido não é mais encontrado no banco de dados após exclusão");

  // 13. Teste de Cálculo de Taxa de Entrega por KM e Taxa de Condomínio (Tabela Oficial)
  const kmPricing = db.getDeliveryKmPricing();
  assert(kmPricing.originAddress.includes("Av. Goiânia, 346"), "Endereço de partida configurado: Av. Goiânia, 346 - Jd. Santa Marta");
  assert(kmPricing.baseKm === 2 && kmPricing.baseFee === 8.00, "Taxa base até 2 km: R$ 8,00");
  assert(kmPricing.maxTableKm === 16 && kmPricing.maxTableFee === 22.00, "Teto da tabela até 16 km: R$ 22,00");
  assert(kmPricing.condominioFee === 5.00, "Taxa adicional de condomínio configurada: R$ 5,00");

  // Testes de faixas de distância
  assert(db.calculateDeliveryFee(0) === 0.00, "Retirada no balcão (0 km) é Grátis (R$ 0,00)");
  assert(db.calculateDeliveryFee(1.0) === 8.00, "Entrega a 1.0 km custa R$ 8,00 (faixa até 2 km)");
  assert(db.calculateDeliveryFee(2.0) === 8.00, "Entrega a 2.0 km custa R$ 8,00 (limite da faixa base)");
  assert(db.calculateDeliveryFee(2.3) === 9.00, "Entrega a 2.3 km arredonda para 3 km: R$ 9,00");
  assert(db.calculateDeliveryFee(3.0) === 9.00, "Entrega a 3.0 km custa R$ 9,00");
  assert(db.calculateDeliveryFee(6.0) === 12.00, "Entrega a 6.0 km custa R$ 12,00");
  assert(db.calculateDeliveryFee(10.0) === 16.00, "Entrega a 10.0 km custa R$ 16,00");
  assert(db.calculateDeliveryFee(16.0) === 22.00, "Entrega a 16.0 km custa R$ 22,00 (limite da tabela)");
  assert(db.calculateDeliveryFee(18.0) === 24.00, "Entrega a 18.0 km (>16km) custa R$ 24,00 (+ R$ 1,00/km)");
  
  // Testes com taxa de condomínio (+ R$ 5,00)
  assert(db.calculateDeliveryFee(1.5, true) === 13.00, "Entrega a 1.5 km em condomínio: R$ 8,00 + R$ 5,00 = R$ 13,00");
  assert(db.calculateDeliveryFee(4.0, true) === 15.00, "Entrega a 4.0 km em condomínio: R$ 10,00 + R$ 5,00 = R$ 15,00");
  assert(db.calculateDeliveryFee(16.0, true) === 27.00, "Entrega a 16.0 km em condomínio: R$ 22,00 + R$ 5,00 = R$ 27,00");

  // Teste de Pedido persistindo distância em KM e Flag de Condomínio
  const kmOrder = db.createOrder({
    type: "b2c_delivery",
    customerName: "Condomínio Residencial Teste",
    customerPhone: "66999221100",
    address: "Av. Poguba, Condomínio Parque das Águas, Apto 102",
    bairro: "Vila Aurora",
    distanceKm: 5.5,
    isCondominio: true,
    deliveryFee: db.calculateDeliveryFee(5.5, true), // 12 + 5 = 17
    subtotal: 30.00,
    total: 47.00,
    paymentMethod: "pix",
    items: [
      { id: "prod-2", name: "Caldo de Cana 1L", quantity: 2, price: 15.00, total: 30.00 }
    ]
  });
  assert(kmOrder.distanceKm === 5.5, "Pedido registra distância calculada em KM (5.5 km)");
  assert(kmOrder.isCondominio === true, "Pedido registra taxa de condomínio ativada (true)");
  assert(kmOrder.deliveryFee === 17.00, "Taxa de entrega com condomínio calculada e salva corretamente (R$ 17,00)");

  // Limpeza do pedido teste
  db.deleteOrder(kmOrder.id);

  // 14. Teste das Rotas de API HTTP em Processo (Express)
  const { app } = require('./server');
  function testRoute(method, url, body = {}) {
    return new Promise((resolve) => {
      let statusCode = 200;
      let responseData = null;
      const req = {
        method,
        url,
        headers: { 'content-type': 'application/json' },
        body
      };
      const res = {
        status: function(code) { statusCode = code; return this; },
        json: function(data) { responseData = data; resolve({ status: statusCode, body: data }); },
        send: function(data) { responseData = data; resolve({ status: statusCode, body: data }); },
        setHeader: function() {},
        getHeader: function() {}
      };
      app.handle(req, res);
    });
  }

  const apiPricing = await testRoute('GET', '/api/delivery-km');
  assert(apiPricing.status === 200 && apiPricing.body.baseFee === 8.00, "API GET /api/delivery-km retorna tabela oficial com baseFee R$ 8,00");

  const apiCalcAddress = await testRoute('POST', '/api/delivery/calculate-km', {
    address: "Avenida Marechal Rondon, Centro",
    isCondominio: true
  });
  assert(apiCalcAddress.status === 200 && apiCalcAddress.body.distanceKm === 3.5, "API POST /api/delivery/calculate-km calcula Centro (3.5 km)");
  assert(apiCalcAddress.body.deliveryFee === 15.00, "API POST /api/delivery/calculate-km aplica R$ 10,00 + R$ 5,00 condomínio = R$ 15,00");

  const apiCalcGps = await testRoute('POST', '/api/delivery/calculate-km', {
    lat: -16.465,
    lng: -54.635,
    isCondominio: false
  });
  assert(apiCalcGps.status === 200 && apiCalcGps.body.calculationSource === 'gps', "API POST /api/delivery/calculate-km calcula via coordenadas GPS");
  assert(apiCalcGps.body.distanceKm === 1.5 && apiCalcGps.body.deliveryFee === 8.00, "API GPS a 1.5 km retorna taxa base R$ 8,00");

  const apiCalcCustom = await testRoute('POST', '/api/delivery/calculate-km', {
    distanceKm: 10,
    isCondominio: false
  });
  assert(apiCalcCustom.body.distanceKm === 10 && apiCalcCustom.body.deliveryFee === 16.00, "API KM personalizado (10 km) retorna taxa exata da tabela R$ 16,00");


  console.log(`\n========================================`);
  console.log(`TOTAL DE TESTES: ${passed + failed}`);
  console.log(`PASSARAM: ${passed}`);
  console.log(`FALHARAM: ${failed}`);
  console.log(`========================================\n`);

  if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Erro durante execução dos testes:", err);
  process.exit(1);
});
