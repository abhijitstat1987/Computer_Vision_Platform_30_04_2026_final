import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface LabelClass {
  id: string;
  name: string;
  color: string;
}

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: 'box' | 'polygon' | 'point';
  classId: string;
  coordinates: any;
}

interface InteractiveLabelingCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  selectedTool: 'box' | 'polygon' | 'point';
  selectedClass: string | null;
  classes: LabelClass[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
}

export function InteractiveLabelingCanvas({
  imageUrl,
  annotations,
  selectedTool,
  selectedClass,
  classes,
  onAnnotationsChange
}: InteractiveLabelingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      // If CORS fails, try without crossOrigin
      const img2 = new Image();
      img2.onload = () => {
        setImageElement(img2);
        setImageLoaded(true);
      };
      img2.src = imageUrl;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw on canvas
  useEffect(() => {
    if (!imageLoaded || !imageElement) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Calculate scale to fit image
    const scaleX = canvas.width / imageElement.width;
    const scaleY = canvas.height / imageElement.height;
    const scale = Math.min(scaleX, scaleY);

    const drawWidth = imageElement.width * scale;
    const drawHeight = imageElement.height * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);

    // Function to convert image coords to canvas coords
    const imageToCanvas = (point: Point): Point => ({
      x: point.x * scale + offsetX,
      y: point.y * scale + offsetY
    });

    // Draw existing annotations
    annotations.forEach(annotation => {
      const classInfo = classes.find(c => c.id === annotation.classId);
      const color = classInfo?.color || '#3b82f6';
      const isHovered = hoveredAnnotation === annotation.id;

      ctx.strokeStyle = color;
      ctx.fillStyle = color + '33';
      ctx.lineWidth = isHovered ? 3 : 2;

      if (annotation.type === 'box') {
        const { x, y, width, height } = annotation.coordinates;
        const canvasPos = imageToCanvas({ x, y });
        const canvasWidth = width * scale;
        const canvasHeight = height * scale;

        ctx.fillRect(canvasPos.x, canvasPos.y, canvasWidth, canvasHeight);
        ctx.strokeRect(canvasPos.x, canvasPos.y, canvasWidth, canvasHeight);

        // Draw label
        if (classInfo) {
          ctx.fillStyle = color;
          ctx.font = 'bold 14px sans-serif';
          const textWidth = ctx.measureText(classInfo.name).width;
          ctx.fillRect(canvasPos.x, canvasPos.y - 24, textWidth + 10, 24);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(classInfo.name, canvasPos.x + 5, canvasPos.y - 6);
        }
      } else if (annotation.type === 'polygon') {
        const points = annotation.coordinates as Point[];
        if (points.length > 0) {
          ctx.beginPath();
          const firstPoint = imageToCanvas(points[0]);
          ctx.moveTo(firstPoint.x, firstPoint.y);
          points.slice(1).forEach(point => {
            const canvasPoint = imageToCanvas(point);
            ctx.lineTo(canvasPoint.x, canvasPoint.y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw vertices
          points.forEach(point => {
            const canvasPoint = imageToCanvas(point);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      } else if (annotation.type === 'point') {
        const { x, y } = annotation.coordinates;
        const canvasPos = imageToCanvas({ x, y });

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw crosshair
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvasPos.x - 12, canvasPos.y);
        ctx.lineTo(canvasPos.x + 12, canvasPos.y);
        ctx.moveTo(canvasPos.x, canvasPos.y - 12);
        ctx.lineTo(canvasPos.x, canvasPos.y + 12);
        ctx.stroke();
      }
    });

    // Draw current drawing
    if (selectedClass) {
      const classInfo = classes.find(c => c.id === selectedClass);
      const color = classInfo?.color || '#3b82f6';

      if (selectedTool === 'box' && startPoint && currentPoint) {
        const x = Math.min(startPoint.x, currentPoint.x);
        const y = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);

        ctx.strokeStyle = color;
        ctx.fillStyle = color + '33';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
      } else if (selectedTool === 'polygon' && polygonPoints.length > 0) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color + '33';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
        polygonPoints.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        if (currentPoint) {
          ctx.lineTo(currentPoint.x, currentPoint.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vertices
        polygonPoints.forEach((point, index) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Highlight first point for closing
          if (index === 0 && polygonPoints.length > 2) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }
    }

    // Store scale and offset for coordinate conversion
    canvas.dataset.scale = scale.toString();
    canvas.dataset.offsetX = offsetX.toString();
    canvas.dataset.offsetY = offsetY.toString();
    canvas.dataset.imageWidth = imageElement.width.toString();
    canvas.dataset.imageHeight = imageElement.height.toString();
  }, [imageLoaded, imageElement, annotations, hoveredAnnotation, startPoint, currentPoint, polygonPoints, selectedTool, selectedClass, classes]);

  const canvasToImageCoords = (canvasPoint: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return canvasPoint;

    const scale = parseFloat(canvas.dataset.scale || '1');
    const offsetX = parseFloat(canvas.dataset.offsetX || '0');
    const offsetY = parseFloat(canvas.dataset.offsetY || '0');

    return {
      x: (canvasPoint.x - offsetX) / scale,
      y: (canvasPoint.y - offsetY) / scale
    };
  };

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClass) {
      alert('Please select a class first!');
      return;
    }

    const point = getCanvasPoint(e);

    if (selectedTool === 'box') {
      setIsDrawing(true);
      setStartPoint(point);
      setCurrentPoint(point);
    } else if (selectedTool === 'point') {
      const imagePoint = canvasToImageCoords(point);
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        type: 'point',
        classId: selectedClass,
        coordinates: imagePoint
      };
      onAnnotationsChange([...annotations, newAnnotation]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);

    if (selectedTool === 'box' && isDrawing) {
      setCurrentPoint(point);
    } else if (selectedTool === 'polygon' && polygonPoints.length > 0) {
      setCurrentPoint(point);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === 'box' && isDrawing && startPoint && currentPoint) {
      const imageStart = canvasToImageCoords(startPoint);
      const imageCurrent = canvasToImageCoords(currentPoint);

      const x = Math.min(imageStart.x, imageCurrent.x);
      const y = Math.min(imageStart.y, imageCurrent.y);
      const width = Math.abs(imageCurrent.x - imageStart.x);
      const height = Math.abs(imageCurrent.y - imageStart.y);

      if (width > 10 && height > 10) {
        const newAnnotation: Annotation = {
          id: `ann-${Date.now()}`,
          type: 'box',
          classId: selectedClass!,
          coordinates: { x, y, width, height }
        };
        onAnnotationsChange([...annotations, newAnnotation]);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool !== 'polygon' || !selectedClass) return;

    const point = getCanvasPoint(e);

    // Check if clicking near first point to close
    if (polygonPoints.length > 2) {
      const firstPoint = polygonPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );

      if (distance < 15) {
        // Close polygon
        const imagePoints = polygonPoints.map(p => canvasToImageCoords(p));
        const newAnnotation: Annotation = {
          id: `ann-${Date.now()}`,
          type: 'polygon',
          classId: selectedClass,
          coordinates: imagePoints
        };
        onAnnotationsChange([...annotations, newAnnotation]);
        setPolygonPoints([]);
        setCurrentPoint(null);
        return;
      }
    }

    setPolygonPoints([...polygonPoints, point]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedTool === 'polygon') {
      setPolygonPoints([]);
      setCurrentPoint(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTool, polygonPoints]);

  const handleDeleteAnnotation = (annotationId: string) => {
    onAnnotationsChange(annotations.filter(a => a.id !== annotationId));
  };

  return (
    <div className="space-y-4">
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="bg-gray-900 rounded-xl relative overflow-hidden"
        style={{ height: '500px' }}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p>Loading image...</p>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          className="cursor-crosshair w-full h-full"
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      </div>

      {/* Instructions */}
      {selectedTool === 'polygon' && polygonPoints.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-semibold">
            🔷 Polygon Mode: Click to add points ({polygonPoints.length} points). Click the first point (white circle) to close. Press ESC to cancel.
          </p>
        </div>
      )}

      {!selectedClass && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
          <p className="text-sm text-orange-800 font-semibold">
            ⚠️ Please select a class from the right sidebar before labeling!
          </p>
        </div>
      )}

      {/* Annotations List */}
      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-3">
          Current Image Annotations ({annotations.length})
        </h4>
        {annotations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No annotations yet. Select a tool and class, then draw on the image.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {annotations.map((annotation) => {
              const classInfo = classes.find(c => c.id === annotation.classId);
              return (
                <div
                  key={annotation.id}
                  onMouseEnter={() => setHoveredAnnotation(annotation.id)}
                  onMouseLeave={() => setHoveredAnnotation(null)}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    hoveredAnnotation === annotation.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-md border-2 border-white shadow-sm"
                      style={{ backgroundColor: classInfo?.color }}
                    ></div>
                    <div>
                      <span className="text-sm font-bold text-gray-800">
                        {classInfo?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({annotation.type})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-all group"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
