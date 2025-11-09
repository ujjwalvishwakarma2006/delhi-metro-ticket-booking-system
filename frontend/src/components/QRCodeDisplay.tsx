import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  className?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ data, size = 200, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(
        canvasRef.current,
        data,
        {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) {
            console.error('Error generating QR code:', error);
          }
        }
      );
    }
  }, [data, size]);

  if (!data) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ width: size, height: size }}>
        <p className="text-gray-500 text-sm">No QR data</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas ref={canvasRef} className="rounded-lg shadow-md" />
      <p className="text-xs text-gray-500 mt-2 font-mono break-all text-center max-w-full px-2">
        {data}
      </p>
    </div>
  );
};

export default QRCodeDisplay;
