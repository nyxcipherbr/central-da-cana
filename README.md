# 🎋 Central da Cana - Distribuição & Delivery (Rondonópolis - MT)

Sistema completo de **Centro de Distribuição de Cana (B2B)** e **Plataforma de Delivery (B2C)** desenvolvido sob medida para o espaço do **Josué** na **Av. Goiânia, 346 - Jardim Santa Marta, Rondonópolis / MT**.

---

## ⚡ Assinatura da Criadora
- **Desenvolvido por:** NyxCipher (Alexa)
- **WhatsApp Oficial:** [(66) 99612-8149](https://wa.me/5566996128149)
- **Especialidade:** Sistemas Web Comerciais, Plataformas de Delivery & Engenharia de Software

---

## ⏰ Escala de Atendimento dos Pedidos no WhatsApp
- **Das 09:00 às 17:00:** Pedidos com **Alexa** 📱 **(66) 99953-6712**
- **Das 17:00 às 20:00:** Pedidos com **Josué** 📱 **(66) 99683-3628**
- *O sistema detecta o horário automaticamente e direciona o pedido para o WhatsApp do atendente de plantão.*

---

## 🚀 Como Iniciar o Sistema

### 1. Iniciar o Servidor
No diretório do projeto:
```bash
npm start
# ou
node server.js
```
O sistema estará disponível em:
👉 **`http://localhost:3333`** (ou no IP da rede local para acessar pelo celular/tablet do Josué).

---

## 🔑 Acesso Administrativo do Josué
Para acessar o Painel de Gestão:
1. No menu superior, clique em **"Painel Josué (ADM)"**.
2. Insira as credenciais:
   - **Usuário:** `josue`
   - **Senha Padrão:** `cana123`
3. A senha pode ser alterada a qualquer momento na aba **"Senha & Ajustes"**.

---

## 📋 Funcionalidades Principais

### 1. Delivery & Cardápio B2C (Para o Cliente Final)
- **Catálogo de Caldos:** 500ml, 1 Litro e 2 Litros (puro e com frutas: limão galego, abacaxi, maracujá, gengibre).
- **Acompanhamentos:** Toletes de cana descascada e pastéis fritos na hora.
- **Taxa de Entrega por Bairro em Rondonópolis:**
  - Jardim Santa Marta: R$ 4,00
  - Centro: R$ 6,00
  - Vila Aurora I e II: R$ 7,00
  - Sagrada Família: R$ 7,00
  - Vila Operária: R$ 8,00
  - Coophalis, Guanabara, Monte Líbano, Parque Real, Cidade Salmen.
  - Retirada no Balcão (Av. Goiânia, 346): Grátis.
- **Formas de Pagamento:**
  - **Pix:** Chave do Josué `66996833628` com botão de cópia com 1 toque.
  - **Dinheiro:** Com cálculo e solicitação de troco.
  - **Cartão na Entrega:** Solicita máquina de cartão móvel.
- **Integração WhatsApp:** O pedido é registrado no sistema e encaminhado formatado com 1 clique para o WhatsApp do Josué `(66) 99683-3628`.

### 2. Fornecimento & Atacado B2B (Para Terceiros)
- Feixes de cana selecionada (15 varas - aprox. 25kg).
- Feixes de cana raspada/descascada pronta para moagem.
- Bombonas de 20L e 50L de caldo cru refrigerado.
- Fardos de garrafas PET 1L virgens com tampas lacráveis.
- Formulário direto de cotação e solicitação de fornecimento.

### 3. Painel Administrativo Completo
- **Kanban KDS de Pedidos:** Acompanhe em 4 colunas (`Novos`, `Moendo/Preparando`, `Em Rota`, `Entregues`) com botão de notificação via WhatsApp para o cliente.
- **Gestão de Clientes B2B (CRUD com Exclusão):**
  - Cadastre nome, responsável, WhatsApp, endereço, dias de entrega e limite de crédito fiado.
  - **Exclua ou inative clientes a qualquer momento** com confirmação de segurança.
- **Gestão de Produtos (CRUD com Exclusão):**
  - Adicione novos sabores, altere preços de venda e custo, pause produtos esgotados ou **exclua itens** do cardápio.
- **Gestão de Motoboys & Acertos de Corridas:**
  - Cadastre os entregadores com nome, WhatsApp, veículo/placa e taxa por entrega (R$).
  - Atribuição de motoboy ao despachar pedidos no Kanban.
  - Relatório de corridas realizadas e corridas pendentes de acerto.
  - **Botão "Fazer Acerto":** Quita os valores devidos aos motoboys e lança automaticamente a despesa de transporte no financeiro.
- **Cadastro de Bairros & Taxas de Entrega (CRUD):**
  - Cadastre novos bairros de Rondonópolis, altere taxas de frete e tempo estimado.
  - Exclua bairros desativados (com proteção da Retirada no Balcão).
  - Atualização automática em tempo real no carrinho do cliente.
- **Controle Financeiro & Caixa:**
  - Lucro Líquido Real (Entradas - Saídas).
  - Separação de receita: Delivery B2C vs Fornecimento Atacado B2B.
  - Lançamento de despesas (compra de cana bruta, garrafas PET, acerto de motoboy, luz).
  - Controle de **Contas a Receber** de clientes fiados/faturados do atacado.
- **Controle de Estoque:** Monitoramento de feixes de cana e embalagens com alerta de reposição.

### 4. Rodapé Promocional NyxCipher
Em todas as telas (cliente e painel), há o selo oficial:
> *"Desenvolvido com excelência por **NyxCipher** (Alexa) • Soluções em Software & Sistemas"*
> Com link inteligente para o WhatsApp `(66) 99612-8149` para captação de novos clientes empresariais na cidade.
