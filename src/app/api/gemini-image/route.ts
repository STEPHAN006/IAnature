import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    // Parse le formulaire multipart afin de récupérer le fichier image
    const formData = await request.formData();
    const file = formData.get("file"); // Assurez-vous que le champ s'appelle "file"
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    // Convertir le fichier en ArrayBuffer (vous pouvez aussi le convertir en base64 selon ce que demande l'API)
    const imageBuffer = await (file as Blob).arrayBuffer();
    // Initialiser le client Gemini avec la clé API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Mise à jour vers le nouveau modèle Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // Appel à la méthode supposée d'analyse d'image. La méthode utilisée ici (analyzeImage)
    // Création d'un objet FileData pour l'image
    const fileData = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString('base64'),
        mimeType: (file as Blob).type
      }
    };

    // Génération du prompt pour l'analyse de l'image
    const prompt = `Analyse l'image fournie et identifie tous les animaux et toutes les plantes qui y apparaissent. Pour chaque espèce détectée, détermine le nombre d'individus présents dans l'image. Pour les animaux, en plus du nombre détecté, fournis les informations suivantes lorsqu'elles sont disponibles : s'il s'agit d'un carnivore ou non, une estimation du nombre total d'individus dans le monde, et éventuellement d'autres informations pertinentes. Réponds uniquement en renvoyant un objet JSON respectant le schéma suivant :
    {
      "animals": [
        {
          "species": "nom commun de l'animal",
          "count": nombre d'individus détectés,
          "carnivore": true/false,
          "worldPopulation": estimation du nombre dans le monde
          // autres informations éventuelles si disponibles
        }
      ],
      "plants": [
        {
          "species": "nom commun de la plante",
          "count": nombre d'individus détectés
        }
      ]
    }
    
    Ne renvoie aucun texte explicatif, juste le JSON. Assure-toi que la réponse est un JSON valide.`;
    
    

    const result = await model.generateContent([prompt, fileData]);

    // Récupération de la réponse
    const response = await result.response;
    const analysis = response.text();

    return NextResponse.json({ analysis }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de l'analyse de l'image" }, { status: 500 });
  }
}
