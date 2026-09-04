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
5. Clique em **Create Web Service**. O Render publica automaticamente e te
   dá uma URL pública (`https://seu-app.onrender.com`).

Depois disso, todo `git push` no repositório redeploya o site
automaticamente.

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
