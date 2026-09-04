# Croqui de Colisão

Editor visual de croqui de colisões de trânsito, com sugestão automática de
layout por IA (a partir da descrição da dinâmica) e referências de apoio ao
Código de Trânsito Brasileiro (CTB).

## Como funciona

- **Front-end** (`public/index.html`): editor de croqui (arrastar veículos,
  sinalização, ponto de colisão), tudo em um único arquivo HTML/CSS/JS.
- **Back-end** (`server.js`): servidor Node/Express minúsculo que serve o
  front-end e expõe `POST /api/suggest`, que chama a API da Anthropic usando
  a chave guardada em variável de ambiente. A chave nunca é exposta ao
  navegador.
- Se a IA online não responder (chave não configurada, erro de rede, etc.),
  o front-end usa automaticamente um **gerador local por palavras-chave**,
  que roda 100% no navegador sem custo.

## Rodando localmente

```bash
npm install
export ANTHROPIC_API_KEY="sua-chave-aqui"   # opcional, veja abaixo
npm start
```

Depois abra http://localhost:3000

Sem a variável `ANTHROPIC_API_KEY`, o site funciona normalmente, só que a
sugestão por IA cai direto no modo local por palavras-chave.

## Publicando no GitHub

1. Crie um repositório novo e **vazio** em https://github.com/new (não marque
   "Add a README").
2. Na pasta deste projeto, rode:
   ```bash
   git init
   git add .
   git commit -m "Croqui de colisão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git
   git push -u origin main
   ```
   (Troque `SEU-USUARIO/NOME-DO-REPO` pelo caminho do seu repositório.)

   Alternativa sem usar a linha de comando: no GitHub, clique em
   "uploading an existing file" na página do repositório vazio e arraste
   todos os arquivos desta pasta.

## Publicando no Render

1. Em https://dashboard.render.com, clique em **New > Web Service**.
2. Conecte o repositório do GitHub que você acabou de criar.
3. Configure:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Em **Environment**, adicione a variável:
   - `ANTHROPIC_API_KEY` = sua chave, criada em https://console.anthropic.com/settings/keys
   - (opcional) `ANTHROPIC_MODEL` = `claude-sonnet-5` (padrão) ou
     `claude-haiku-4-5-20251001` para respostas mais baratas/rápidas.
   - `GOOGLE_MAPS_API_KEY` = sua chave do Google Maps (veja abaixo), para habilitar
     a busca de endereço/CEP e o mapa de referência real.
5. Clique em **Create Web Service**. O Render publica automaticamente e te
   dá uma URL pública (`https://seu-app.onrender.com`).

Depois disso, todo `git push` no repositório redeploya o site
automaticamente.

## Configurando o Google Maps (busca por CEP/endereço)

1. Acesse https://console.cloud.google.com e crie um projeto (ou use um existente).
2. Em **APIs e Serviços > Biblioteca**, ative:
   - **Maps JavaScript API**
   - **Geocoding API**
3. Em **APIs e Serviços > Credenciais**, clique em **Criar credenciais > Chave de API**.
4. **Restrinja a chave** (importante, ela fica visível no código-fonte da página):
   - Em "Restrições de aplicativo", escolha **Referenciadores HTTP (sites)** e
     adicione `https://seu-app.onrender.com/*` (e `http://localhost:3000/*` se for
     testar localmente).
   - Em "Restrições de API", limite a chave às duas APIs ativadas acima.
5. Copie a chave e configure como `GOOGLE_MAPS_API_KEY` no Render (ou no seu `.env` local).
6. É necessário ter uma conta de faturamento (billing) vinculada ao projeto do
   Google Cloud, mesmo usando a franquia gratuita mensal — sem isso as APIs não
   funcionam, mesmo com a chave certa.

Sem essa variável configurada, o restante do site funciona normalmente — só o
botão "Mostrar mapa" avisa que o mapa não está configurado.

## Custos

- Hospedagem no Render: o plano **Free** funciona para testar, mas "dorme"
  após um tempo sem uso (o primeiro acesso depois de um tempo demora alguns
  segundos a mais). Planos pagos mantêm o site sempre ativo.
- Chamadas à API da Anthropic: cobradas por uso (tokens), conforme sua conta
  em console.anthropic.com. Cada clique em "Sugerir croqui com IA" gera uma
  chamada pequena (poucos tokens de entrada e saída).

## Aviso importante

Este é um editor de apoio. O croqui gerado (por IA ou pelo modo local) e as
referências a artigos do CTB são sugestões e podem estar incompletas ou
incorretas — sempre revise manualmente antes de usar em laudo pericial,
boletim de ocorrência ou regulação de sinistro.
