import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';

import { Input } from '@/components/ui/input';

interface ImagePickerProps {
  onImageChange: (file: File | null) => void;
  url?: string | null;
  className?: string;
}

export function ImagePicker({
  onImageChange,
  url,
  className,
}: ImagePickerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
      onImageChange(selectedFile);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Imagen
      </label>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview && !url ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={handleUploadAreaClick}
        >
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Haga click para subir imagen</p>
            <p className="text-sm text-gray-400">
              SVG, PNG, JPG or GIF (MAX. 800×400px)
            </p>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer relative group"
          onClick={handleImageClick}
        >
          <div className="relative">
            <Image
              src={preview || url || ''}
              width={500}
              height={300}
              alt="Product image"
              className="rounded-md mx-auto object-cover max-h-[300px] w-auto"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
              <div className="text-white text-center">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Click para cambiar imagen</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
