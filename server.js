// Servidor do "Croqui de Colisão".
// Serve o front-end estático e expõe /api/suggest, que chama a API da
// Anthropic usando a chave guardada em variável de ambiente (nunca exposta
// ao navegador). Se a chave não estiver configurada, ou a chamada falhar,
// o front-end cai automaticamente para o gerador local por palavras-chave.

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "1mb" }));
// index.html is served through the templated route below (key injection),
// so static serving skips it and only handles other static assets.
app.use(express.static(path.join(__dirname, "public"), { index: false }));

var indexTemplate = null;
function getIndexHtml() {
  if (indexTemplate === null) {
    indexTemplate = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  }
  var mapsKey = process.env.GOOGLE_MAPS_API_KEY || "";
  return indexTemplate.replace("__GOOGLE_MAPS_API_KEY__", mapsKey);
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const SCHEMA_HINT =
  'Responda APENAS com um JSON válido (sem markdown, sem comentários, sem texto fora do JSON), no formato:\n' +
  '{"via":{"tipo":"reta_h|reta_v|cruzamento|rotatoria|curva","faixas":1|2|3|4,"sentido":"unico|duplo"},' +
  '"elementos":[{"tipo":"carro|moto|caminhao|onibus|bicicleta|pedestre|semaforo|placa_pare|faixa_pedestre|radar|ponto_colisao|seta|texto","x":0-1000,"y":0-650,"rot":0-359,"label":"string curta","length":80-300 (somente se tipo=seta)}],' +
  '"ctb":[{"artigo":"Art. XX","descricao":"frase curta"}]}\n' +
  'Regras: até 8 elementos. Posicione coerentemente com a via escolhida (via reta horizontal ocupa a faixa central do canvas 1000x650; cruzamento tem eixos em x=500 e y=325; rotatória é centrada em 500,325). ' +
  'Use "seta" para indicar trajetórias/sentido de deslocamento dos veículos antes da colisão, com rot apontando a direção do movimento (0=direita/leste, 90=baixo/sul, 180=esquerda/oeste, 270=cima/norte). ' +
  'Inclua no máximo 1 "ponto_colisao". Em "ctb", cite no máximo 3 artigos do Código de Trânsito Brasileiro (Lei 9.503/1997) plausivelmente relacionados à dinâmica descrita, só se tiver razoável confiança do número do artigo; caso contrário devolva uma lista vazia. Não invente números de artigo.';

const SYSTEM_PROMPT =
  "Você é um assistente que converte a descrição textual de uma colisão de trânsito no Brasil em um layout " +
  "estruturado de croqui (vista de cima), consultando seu conhecimento geral do Código de Trânsito Brasileiro " +
  "apenas como referência de apoio. Quando uma imagem de satélite/mapa do local for fornecida junto com o texto, " +
  "use-a como referência visual da geometria real da via (se é reta, cruzamento, rotatória, curva, quantas faixas " +
  "aproximadamente, orientação das ruas) para tornar o croqui mais fiel ao local real — mas nunca invente detalhes " +
  "que não sejam claramente visíveis na imagem nem descritos no texto. " + SCHEMA_HINT;

// Monta a URL do Google Static Maps para o local buscado. Usa uma chave dedicada
// (GOOGLE_STATIC_MAPS_API_KEY) porque chamadas feitas pelo servidor não têm
// cabeçalho "Referer", então uma chave restrita por referenciador HTTP (a mesma
// usada no navegador para o Maps JavaScript API) não funcionaria aqui.
function buildStaticMapUrl(lat, lng) {
  const key = process.env.GOOGLE_STATIC_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({
    center: lat + "," + lng,
    zoom: "19",
    size: "640x400",
    scale: "2",
    maptype: "hybrid",
    markers: "color:red|" + lat + "," + lng,
    key: key
  });
  return "https://maps.googleapis.com/maps/api/staticmap?" + params.toString();
}

async function fetchStaticMapAsBase64(lat, lng) {
  const url = buildStaticMapUrl(lat, lng);
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Static Maps error:", resp.status, await resp.text());
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    return buf.toString("base64");
  } catch (err) {
    console.error("Falha ao buscar imagem do mapa:", err);
    return null;
  }
}

app.post("/api/suggest", async (req, res) => {
  try {
    const text = (req.body && typeof req.body.text === "string" ? req.body.text : "").slice(0, 4000).trim();
    if (!text) {
      return res.status(400).json({ error: { message: "Texto da dinâmica vazio." } });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY não configurada no servidor." } });
    }

    const location = req.body && req.body.location;
    const hasCoords = location && typeof location.lat === "number" && typeof location.lng === "number";

    let userContent;
    let usedMapImage = false;

    if (hasCoords) {
      const imageBase64 = await fetchStaticMapAsBase64(location.lat, location.lng);
      if (imageBase64) {
        usedMapImage = true;
        const addressLine = location.address ? ("Endereço buscado: " + location.address + "\n\n") : "";
        userContent = [
          { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64 } },
          { type: "text", text: addressLine + "Dinâmica da colisão:\n" + text }
        ];
      }
    }
    if (!userContent) {
      userContent = text;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Anthropic API error:", data);
      return res.status(upstream.status).json(data);
    }
    data._usedMapImage = usedMapImage;
    res.json(data);
  } catch (err) {
    console.error("Erro em /api/suggest:", err);
    res.status(500).json({ error: { message: err && err.message ? err.message : "Erro interno do servidor." } });
  }
});

app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.get("/", (req, res) => {
  res.type("html").send(getIndexHtml());
});

// Fallback: qualquer outra rota GET serve o front-end (SPA simples).
app.get("*", (req, res) => {
  res.type("html").send(getIndexHtml());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Croqui de Colisão rodando na porta " + PORT);
});
