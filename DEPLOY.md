# 🚀 Guia de Implantação e Publicação Online - Central da Cana

Este guia ensina como colocar o sistema da **Central da Cana** no ar de forma profissional, segura e rápida.

---

## 🌟 Opção 1: Render.com (Recomendada - 100% Gratuita)

O **Render** é o melhor serviço gratuito para rodar aplicações Node.js completas com banco de dados JSON, HTTPS automático e suporte total a PWA (instalação no celular).

### Passo a Passo:
1. **Crie uma conta gratuita:** Acesse [render.com](https://render.com) e faça login (pode entrar com sua conta do GitHub ou e-mail).
2. **Suba o código no seu GitHub:**
   - Crie um repositório no seu GitHub (ex: `central-da-cana`).
   - Execute no terminal:
     ```bash
     git remote add origin https://github.com/SEU_USUARIO/central-da-cana.git
     git push -u origin main
     ```
3. **Criar o Serviço no Render:**
   - No painel do Render, clique em **"New +"** ➔ **"Web Service"**.
   - Conecte seu repositório `central-da-cana`.
   - As configurações já estão prontas no arquivo `render.yaml`:
     - **Runtime:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Instance Type:** `Free`
4. **Pronto!**
   - Em cerca de 2 minutos seu link estará no ar:
     `https://central-da-cana.onrender.com`
   - O cadeado HTTPS já vem ativado, o PWA permite baixar o app no celular do Josué e da Alexa, e o alarme sonoro funciona perfeitamente!

---

## 🚂 Opção 2: Railway.app

O **Railway** é ultra veloz para deploy direto do GitHub.
1. Acesse [railway.app](https://railway.app).
2. Clique em **"New Project"** ➔ **"Deploy from GitHub repo"**.
3. Selecione o repositório `central-da-cana`.
4. Em "Settings" ➔ "Networking", clique em **"Generate Domain"**.
5. O sistema gera uma URL pública imediatamente.

---

## 🌐 Opção 3: Domínio Próprio (.com.br)

Se o Josué quiser um link com o nome exato da empresa (ex: `centraldacana.com.br` ou `pedidos.centraldacana.com.br`):
1. **Registre o domínio:** Acesse [registro.br](https://registro.br) e compre por **R$ 40,00 ao ano**.
2. **Conecte no Render ou Railway:**
   - Nas configurações do Render, vá em **"Custom Domains"**;
   - Adicione `centraldacana.com.br`;
   - Aponte os registros DNS (CNAME ou A) indicados pelo Render no painel do Registro.br.
   - O certificado SSL / HTTPS é gerado automaticamente e sem custo adicional!

---

## 🐳 Opção 4: Docker / Servidor VPS (DigitalOcean, Hostinger, Oracle)

O projeto já inclui um `Dockerfile` otimizado:
```bash
# Construir a imagem Docker
docker build -t central-da-cana .

# Executar o container
docker run -d -p 80:3333 --name central-da-cana --restart always central-da-cana
```
