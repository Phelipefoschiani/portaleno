import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser with high size limit for PDF/Image base64 transmission
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Route to identify documents (PDF, Image) using Gemini
  app.post("/api/faturamento/upload-nf", async (req, res) => {
    try {
      const { fileBase64, filename, mimeType } = req.body;

      if (!fileBase64) {
        return res.status(400).json({ error: "Dados do arquivo ausentes (fileBase64 é obrigatório)." });
      }

      const client = getGeminiClient();

      if (!client) {
        console.warn("GEMINI_API_KEY não configurada no servidor. Usando simulador de OCR/DANFE inteligente...");
        // Fallback intelligent parser when API key is not present (for smooth experience)
        // Parse a random/mock dataset or match details from the filename/size
        const mockNfNumber = String(Math.floor(100000 + Math.random() * 900000));
        const mockAccessKey = `35260512345678000190550010000${mockNfNumber}100293841029`;
        
        return res.json({
          success: true,
          simulated: true,
          data: {
            nf_numero: mockNfNumber,
            chave_acesso: mockAccessKey,
            data_emissao: new Date().toISOString().split('T')[0],
            emitente_cnpj: "12.345.678/0001-90",
            destinatario_cnpj: "98.765.432/0001-10",
            valor_total: 1000.00,
            itens: [
              {
                codigo: "PRD-001",
                descricao: "Ensilagem Tradicional ENO",
                quantidade: 2,
                preco_unitario: 500.00,
                total: 1000.00
              }
            ]
          }
        });
      }

      // Convert pure data URI to standard simple base64 block if present
      let rawBase64 = fileBase64;
      let finalMimeType = mimeType || "application/pdf";

      if (fileBase64.includes(";base64,")) {
        const parts = fileBase64.split(";base64,");
        rawBase64 = parts[1];
        if (parts[0].includes("data:")) {
          finalMimeType = parts[0].replace("data:", "");
        }
      }

      console.log(`Enviando para processamento do Gemini a Nota Fiscal: ${filename} (${finalMimeType})`);

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: finalMimeType,
              data: rawBase64,
            }
          },
          "Analise este documento de faturamentos de cargas agrícolas (DANFE / Nota Fiscal brasileira). Extraia com absoluta precisão os campos da nota fiscal em formato JSON estruturado."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nf_numero: { type: Type.STRING, description: "Número da nota fiscal (limpo, somente números)" },
              chave_acesso: { type: Type.STRING, description: "Chave de acesso completa de 44 dígitos" },
              data_emissao: { type: Type.STRING, description: "Data de emissão (formato AAAA-MM-DD)" },
              emitente_cnpj: { type: Type.STRING, description: "CNPJ do emitente" },
              destinatario_cnpj: { type: Type.STRING, description: "CNPJ do destinatário" },
              valor_total: { type: Type.NUMBER, description: "Valor total dos produtos ou total da nota" },
              itens: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    codigo: { type: Type.STRING, description: "Código do produto ou NCM" },
                    descricao: { type: Type.STRING, description: "Descrição textual do item" },
                    quantidade: { type: Type.NUMBER, description: "Quantidade faturada" },
                    preco_unitario: { type: Type.NUMBER, description: "Preço unitário por kg ou tonelada" },
                    total: { type: Type.NUMBER, description: "Preço total do item" }
                  },
                  required: ["descricao", "quantidade", "total"]
                }
              }
            },
            required: ["nf_numero", "chave_acesso", "valor_total"]
          }
        }
      });

      const textResponse = response.text || "{}";
      const parsedData = JSON.parse(textResponse.trim());

      return res.json({
        success: true,
        simulated: false,
        data: parsedData
      });

    } catch (error: any) {
      console.error("Erro no processamento da Nota Fiscal pelo Gemini:", error);
      return res.status(500).json({ error: "Erro interno ao processar a nota fiscal.", details: error.message });
    }
  });

  // Serve static dist in Production or Vite in Dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
