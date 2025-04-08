// app/api/gemini/route.js

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  try {
    // Extraire le payload de la requête (ici par exemple, un prompt ou autre contenu)
    const { prompt } = await request.json();

    // Initialise l'API Gemini en utilisant la clé API stockée dans l'environnement.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Sélection du modèle (veuillez adapter selon la documentation de Gemini)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Génération du contenu avec le prompt envoyé
    const result = await model.generateContent(prompt);

    // Supposons que le résultat possède une méthode response.text() pour obtenir le texte généré
    const text = result.response.text();

    // Retourner la réponse en format JSON
    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    // Gestion des erreurs
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'appel à l'API Gemini" },
      { status: 500 }
    );
  }
}
