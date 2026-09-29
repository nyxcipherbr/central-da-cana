FROM node:20-alpine

WORKDIR /app

# Copia arquivos de definição de pacotes
COPY package*.json ./

# Instala dependências de produção
RUN npm install --omit=dev

# Copia o código-fonte da aplicação
COPY . .

# Expõe a porta configurável (padrão 3333)
EXPOSE 3333

ENV PORT=3333
ENV NODE_ENV=production

CMD ["npm", "start"]
