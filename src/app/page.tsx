"use client";

import { useState, ChangeEvent, FormEvent, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Animal {
  species: string;
  count: number;
}

interface AnalysisResult {
  animals: Animal[];
}

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraError("");
    } catch (err) {
      setCameraError("Erreur lors de l'accès à la caméra. Veuillez vérifier les permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const analyzeImage = async (imageFile: File) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("file", imageFile);
    
    try {
      const response = await fetch("/api/gemini-image", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok) {
        try {
          // Essayer d'abord d'extraire le JSON avec extraireJson
          let jsonResult = extraireJson(data.analysis);
          
          // Si extraireJson retourne null, essayer de parser directement
          if (!jsonResult) {
            try {
              jsonResult = JSON.parse(data.analysis);
            } catch (directParseError) {
              console.error("Erreur lors du parsing direct:", directParseError);
            }
          }
          
          if (jsonResult) {
            setResult(jsonResult);
          } else {
            setResult(null);
            console.error("Impossible d'extraire le JSON de la réponse");
          }
        } catch (parseError) {
          setResult(null);
          console.error("Erreur lors de l'analyse du JSON:", parseError);
        }
      } else {
        setResult(null);
        console.error(`Erreur: ${data.error}`);
      }
    } catch (error) {
      setResult(null);
      console.error("Erreur lors de la connexion à l'API");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            setFile(file);
            stopCamera();
            // Analyser automatiquement l'image capturée
            analyzeImage(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Analyser automatiquement l'image sélectionnée
      analyzeImage(selectedFile);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Veuillez sélectionner une image ou prendre une photo.");
      return;
    }
    analyzeImage(file);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Analyse d'images avec Gemini</h1>
      
      {showCamera ? (
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={captureImage}
                disabled={isAnalyzing}
                className="bg-green-600 text-white py-3 px-6 rounded-full hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="w-3 h-3 bg-white rounded-full"></span>
                Capturer
              </button>
              <button
                onClick={stopCamera}
                disabled={isAnalyzing}
                className="bg-red-600 text-white py-3 px-6 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Utiliser la caméra
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isAnalyzing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? "Analyse en cours..." : "Analyser l'image"}
          </button>
        </form>
      )}

      {cameraError && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {cameraError}
        </div>
      )}

      {isAnalyzing && (
        <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded-lg text-center">
          <p>Analyse de l'image en cours...</p>
        </div>
      )}

{result && (
  <div className="mt-10 px-4 py-6 bg-gray-50 rounded-lg shadow-lg">
    <h2 className="text-3xl font-bold text-center mb-6">Résultat de l'analyse</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {result.animals.map((animal, index) => (
        <Card
          key={index}
          className="overflow-hidden rounded-xl hover:shadow-2xl transition-shadow duration-300"
        >
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-700 p-4 text-white">
            <CardTitle className="flex items-center justify-between text-xl font-semibold">
              <span className="capitalize">{animal.species}</span>
              <Badge
                variant="outline"
                className="bg-white/20 text-white border-white/40 px-2 py-1 rounded-full"
              >
                {animal.count} {animal.count > 1 ? 'individus' : 'individu'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-28 bg-gray-100 rounded-full">
              <span className="text-5xl">
                {getAnimalEmoji(animal.species)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)}

    </div>
  );
}

// Fonction pour obtenir l'emoji correspondant à l'animal
function getAnimalEmoji(species: string): string {
  const emojiMap: Record<string, string> = {
    'girafe': '🦒',
    'zèbre': '🦓',
    'éléphant': '🐘',
    'lion': '🦁',
    'tigre': '🐯',
    'rhinocéros': '🦏',
    'chat': '🐱',
    'chien': '🐕',
    'oiseau': '🐦',
    'poisson': '🐠',
    'serpent': '🐍',
    'singe': '🐒',
    'panda': '🐼',
    'koala': '🐨',
    'kangourou': '🦘',
    'hippopotame': '🦛',
    'crocodile': '🐊',
    'pingouin': '🐧',
    'dauphin': '🐬',
    'baleine': '🐋',
    'requin': '🦈',
    'tortue': '🐢',
    'grenouille': '🐸',
    'souris': '🐭',
    'hamster': '🐹',
    'lapin': '🐰',
    'renard': '🦊',
    'ours': '🐻',
    'loup': '🐺',
    'vache': '🐮',
    'mouton': '🐑',
    'chèvre': '🐐',
    'cochon': '🐷',
    'poule': '🐔',
    'canard': '🦆',
    'dinde': '🦃',
    'perroquet': '🦜',
    'hibou': '🦉',
    'aigle': '🦅',
    'faucon': '🦅',
    'colombe': '🕊️',
    'paon': '🦚',
    'flamant': '🦩',
    'autruche': '🦙',
    'chameau': '🐪',
    'llama': '🦙',
    'alpaga': '🦙',
    'écureuil': '🐿️',
    'castor': '🦫',
    'tatou': '🦔',
    'hérisson': '🦔',
    'porc-épic': '🦔',
    'morse': '🦭',
    'otarie': '🦭',
    'phoque': '🦭',
    'loutre': '🦦',
    'belette': '🦦',
    'furet': '🦦',
    'blaireau': '🦦',
    'raton laveur': '🦝',
    'mouffette': '🦨',
    'bison': '🦬',
    'buffle': '🦬',
    'antilope': '🦌',
    'cerf': '🦌',
    'chevreuil': '🦌',
    'daim': '🦌',
    'élan': '🦌',
    'renne': '🦌',
    'chacal': '🦊',
    'coyote': '🦊',
    'dingo': '🦊',
    'fennec': '🦊',
    // Animaux supplémentaires
    'hippocampe': '🐠',
    'scorpion': '🦂',
    'araignée': '🕷️',
    'papillon': '🦋',
    'abeille': '🐝',
    'fourmi': '🐜',
    'crabe': '🦀',
    'ours polaire': '🐻‍❄️',
    'loup arctique': '🐺'
  };

  // Convertir la chaîne en minuscules pour simplifier la comparaison
  const speciesLower = species.toLowerCase();

  // 1. Correspondance exacte
  if (emojiMap[speciesLower]) {
    return emojiMap[speciesLower];
  }

  // 2. Recherche par inclusion : par exemple, "lion blanc" inclura "lion"
  for (const key in emojiMap) {
    if (speciesLower.includes(key)) {
      return emojiMap[key];
    }
  }

  // 3. Retour par défaut si aucune correspondance n'a été trouvée
  return '🐾';
}

// Fonction pour extraire le JSON d'une chaîne
function extraireJson(chaine: string): any {
  // Vérifier si la chaîne contient des délimiteurs de code Markdown
  if (chaine.includes('```json')) {
    // Expression régulière pour extraire le contenu JSON entre ```json et ```
    const regex = /```json\s*([\s\S]*?)\s*```/;
    const match = chaine.match(regex);
    if (match) {
      try {
        // Conversion de la chaîne JSON en objet JavaScript
        return JSON.parse(match[1].trim());
      } catch (e) {
        console.error("Erreur lors de l'analyse du JSON :", e);
      }
    }
  } else if (chaine.includes('```')) {
    // Expression régulière pour extraire le contenu entre ``` et ```
    const regex = /```\s*([\s\S]*?)\s*```/;
    const match = chaine.match(regex);
    if (match) {
      try {
        // Conversion de la chaîne JSON en objet JavaScript
        return JSON.parse(match[1].trim());
      } catch (e) {
        console.error("Erreur lors de l'analyse du JSON :", e);
      }
    }
  } else {
    // Essayer de parser directement la chaîne
    try {
      return JSON.parse(chaine.trim());
    } catch (e) {
      console.error("La chaîne n'est pas un JSON valide :", e);
    }
  }
  
  console.error("Aucun JSON valide trouvé dans la chaîne.");
  return null;
}
