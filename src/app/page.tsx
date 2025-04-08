"use client";

import { useState, ChangeEvent, FormEvent, useRef, useEffect } from "react";

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
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
        setResult(data.analysis);
      } else {
        setResult(`Erreur: ${data.error}`);
      }
    } catch (error) {
      setResult("Erreur lors de la connexion à l'API");
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
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
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
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Résultat de l'analyse :</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}
