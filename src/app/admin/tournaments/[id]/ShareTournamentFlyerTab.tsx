"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CopyIcon } from "lucide-react";
import type { TournamentDTO } from "@/models/dto/tournament";
import { toast } from "sonner";

export default function ShareTournamentFlyerTab({
  tournament,
}: {
  tournament: Pick<TournamentDTO, "id" | "name" | "description">;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas ref no disponible");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("No se pudo obtener el contexto 2d del canvas");
      return;
    }

    // Resetear estado
    setImageLoaded(false);

    const img = new Image();
    
    img.onload = () => {
      console.log("Imagen cargada:", img.width, "x", img.height);
      try {
        // Establecer dimensiones del canvas iguales a la imagen
        canvas.width = img.width;
        canvas.height = img.height;

        // Dibujar la imagen de fondo
        ctx.drawImage(img, 0, 0);

        // Configurar fuente y estilo para el nombre del torneo
        // Basado en la descripción de la imagen, el texto "NOMBRE TORNEO" está en la parte superior media
        // Usar una fuente bold, sans-serif, color verde oscuro (similar a #1a5f2e o más oscuro)
        ctx.fillStyle = "#0d3d1f"; // Verde muy oscuro para mejor contraste
        ctx.font = "bold 250px Anton, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Posición para "NOMBRE TORNEO" - en la parte superior media según la descripción
        // Aproximadamente en el 20-25% de la altura
        const tournamentNameY = canvas.height * 0.38;
        const tournamentNameX = canvas.width / 2;

        // Agregar sombra sutil para mejor legibilidad
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 400;
        ctx.shadowOffsetX = 200;
        ctx.shadowOffsetY = 200;

        // Dibujar el nombre del torneo
        ctx.fillText(tournament.name.toUpperCase(), tournamentNameX, tournamentNameY);

        // Resetear sombra
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Configurar para "DIAS A JUGAR" (descripción)
        // Está en la parte inferior media según la descripción
        ctx.font = "bold 142px Poppins, sans-serif";
        const descriptionY = canvas.height * 0.77; // Aproximadamente 78% desde arriba
        const descriptionX = canvas.width / 2;

        // Usar la descripción del torneo, o una fecha formateada si no hay descripción
        const descriptionText = tournament.description 
          ? tournament.description.toUpperCase()
          : "INFORMACIÓN DEL TORNEO";

        // Si el texto es muy largo, dividirlo en múltiples líneas
        const maxWidth = canvas.width * 0.8;
        const words = descriptionText.split(" ");
        let line = "";
        let y = descriptionY;

        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;

          if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, descriptionX, y);
            line = words[i] + " ";
            y += 50; // Espaciado entre líneas
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, descriptionX, y);

        setImageLoaded(true);
        console.log("Canvas renderizado correctamente");
      } catch (error) {
        console.error("Error drawing on canvas:", error);
        toast.error("Error al renderizar la imagen");
      }
    };

    img.onerror = (error) => {
      console.error("Error loading image:", error, img.src);
      toast.error("Error al cargar la imagen de fondo. Verificá que la imagen existe en /public/PCP-tournament-inscription.jpg");
    };

    // Cargar la imagen desde el folder public
    // Intentar con diferentes rutas por si hay problemas de CORS
    const imagePath = "/PCP-tournament-inscription.jpg";
    console.log("Intentando cargar imagen desde:", imagePath);
    img.src = imagePath;
  }, [tournament.name, tournament.description]);

  const handleCopyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) {
      toast.error("La imagen aún no está lista");
      return;
    }

    setIsGenerating(true);
    try {
      // Convertir canvas a blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Error al generar la imagen");
          setIsGenerating(false);
          return;
        }

        try {
          // Copiar al portapapeles
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ]);

          toast.success("Flier copiado al portapapeles");
        } catch (error) {
          console.error("Error copying to clipboard:", error);
          toast.error("Error al copiar la imagen al portapapeles");
        } finally {
          setIsGenerating(false);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Error al generar la imagen");
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compartir flier de promoción</CardTitle>
            <CardDescription>
              Compartí el flier promocional del torneo en redes sociales
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pt-4">
        <div className="space-y-4">

          {/* Vista previa usando el canvas renderizado */}
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyImageToClipboard}
                disabled={!imageLoaded || isGenerating}
                className="h-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-3 w-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            {/* Vista previa del canvas */}
            <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto"
                  style={{ 
                    display: imageLoaded ? "block" : "none",
                    maxWidth: "100%",
                    height: "auto"
                  }}
                />
                {!imageLoaded && (
                  <div className="h-96 w-full flex items-center justify-center absolute inset-0">
                    <div className="text-center">
                      <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cargando imagen...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

