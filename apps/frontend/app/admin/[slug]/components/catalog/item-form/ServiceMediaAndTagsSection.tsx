'use client';

import React, { useRef, useState, useEffect } from 'react';
import { SERVICE_TAG_CATEGORIES } from '@/app/constants/itemCategories';

interface UploadingFile {
  id: string;
  name: string;
  url: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
}
// ============================================================
// 🔥 COMPONENTE: ServiceTagAccordion (acordeón contraído)
// ============================================================
const ServiceTagAccordion = ({
  categoryKey,
  category,
  selectedTags,
  onToggleTag,
  textColor,
  primary,
  borderColor,
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedCount = selectedTags.filter((tag: string) => category.tags.includes(tag)).length;

  return (
    <div className="space-y-2">
      {/* HEADER DEL ACORDEÓN */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 cursor-pointer" style={{ color: textColor }}>
          {category.label}
          <span className="ml-1.5 text-[9px] opacity-40">
            ({selectedCount}/{category.tags.length})
          </span>
        </label>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 opacity-40 group-hover:opacity-80 ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: textColor }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* CONTENIDO DEL ACORDEÓN */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          {category.tags.map((tag: string) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(categoryKey, tag)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSelected ? primary : undefined,
                  borderColor: isSelected ? 'transparent' : borderColor,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ServiceMediaAndTagsSectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  textColor: string;
  inputBgClass: string;
  primary: string;
  isDarkBg: boolean;
  secondary?: string;
  style?: React.CSSProperties;
}

export default function ServiceMediaAndTagsSection({
  newItem = {},
  setNewItem,
  textColor,
  inputBgClass,
  primary,
  isDarkBg,
  secondary = '#ffffff',
  style,
}: ServiceMediaAndTagsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<UploadingFile[]>([]);
  const isInitializedRef = useRef<boolean>(false);

  // ✅ ESTILOS DINÁMICOS (igual que en producto)
  const borderDynamic = style?.borderColor || (isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');
  const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';

  // Autoajuste de altura
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [newItem?.description]);

  // 🔥 Cargar imágenes desde newItem (fuente de verdad) - IGUAL QUE PRODUCTO
  useEffect(() => {
    if (isInitializedRef.current) return;

    const existingImages = newItem?.existingImages || newItem?.mediaUrls || [];
    const currentFiles = newItem?.files || [];

    if (existingImages.length === 0 && currentFiles.length === 0) {
      isInitializedRef.current = true;
      return;
    }

    const loadedImages: UploadingFile[] = [];

    // 1. Imágenes del servidor (URLs http)
    const serverImages = existingImages.filter((url: string) => 
      typeof url === 'string' && url.startsWith('http') && !url.startsWith('blob:')
    );

    serverImages.forEach((url: string, index: number) => {
      loadedImages.push({
        id: `server-${index}-${Date.now()}`,
        name: `Imagen ${index + 1}`,
        url: url,
        file: new File([], `imagen-${index + 1}.jpg`),
        status: 'success'
      });
    });

    // 2. Archivos locales (File objects)
    const fileObjects = currentFiles.filter((f: any) => f instanceof File);
    fileObjects.forEach((file: File, index: number) => {
      const url = URL.createObjectURL(file);
      loadedImages.push({
        id: `file-${index}-${Date.now()}`,
        name: file.name,
        url: url,
        file: file,
        status: 'success'
      });
    });

    // 3. URLs de blob que no están en el servidor
    const blobUrls = existingImages.filter((url: string) => 
      typeof url === 'string' && url.startsWith('blob:')
    );

    blobUrls.forEach((url: string, index: number) => {
      const exists = loadedImages.some(img => img.url === url);
      if (!exists) {
        loadedImages.push({
          id: `blob-${index}-${Date.now()}`,
          name: `Imagen ${index + 1}`,
          url: url,
          file: new File([], `imagen-${index + 1}.jpg`),
          status: 'success'
        });
      }
    });

    if (loadedImages.length > 0) {
      setImages(loadedImages);
    }

    isInitializedRef.current = true;
  }, [newItem?.existingImages, newItem?.mediaUrls, newItem?.files]);

  // 🔥 processFiles - SIN duplicados (IGUAL QUE PRODUCTO)
  const processFiles = (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    const newImages: UploadingFile[] = [];

    filesArray.forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;

      // Verificar si ya existe en images (por nombre y tamaño)
      const existsInImages = images.some(img => 
        img.name === file.name && img.file?.size === file.size
      );

      if (existsInImages) return;

      // Verificar si ya existe en newItem.files
      const existingFiles = newItem?.files || [];
      const existsInFiles = existingFiles.some((f: any) => {
        if (f instanceof File) {
          return f.name === file.name && f.size === file.size;
        }
        return false;
      });

      if (existsInFiles) return;

      const id = `img-${Date.now()}-${index}`;
      const url = URL.createObjectURL(file);

      newImages.push({
        id,
        name: file.name,
        url,
        file,
        status: 'success'
      });

      // Actualizar newItem SOLO si es necesario
      setNewItem((prev: any) => {
        const currentFiles = prev?.files || [];
        const currentMediaUrls = prev?.mediaUrls || [];

        const filteredFiles = currentFiles.filter((f: any) => {
          if (f instanceof File) {
            return f.name !== file.name || f.size !== file.size;
          }
          return true;
        });

        const filteredMediaUrls = currentMediaUrls.filter((u: string) => u !== url);

        return {
          ...prev,
          files: [...filteredFiles, file],
          mediaUrls: [...filteredMediaUrls, url],
          existingImages: [...filteredMediaUrls, url]
        };
      });
    });

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  };

  // 🔥 removeImage - limpia correctamente (IGUAL QUE PRODUCTO)
  const removeImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (!imageToRemove) return;

    if (imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    setImages(prev => prev.filter(img => img.id !== id));

    setNewItem((prev: any) => {
      const currentFiles = prev?.files || [];
      const currentMediaUrls = prev?.mediaUrls || [];
      const currentExistingImages = prev?.existingImages || [];

      const updatedFiles = currentFiles.filter((f: any) => {
        if (f instanceof File) {
          return f.name !== imageToRemove.name || f.size !== imageToRemove.file?.size;
        }
        return true;
      });

      const updatedMediaUrls = currentMediaUrls.filter((url: string) => url !== imageToRemove.url);
      const updatedExistingImages = currentExistingImages.filter(
        (img: string) => img !== imageToRemove.url
      );

      return {
        ...prev,
        files: updatedFiles,
        mediaUrls: updatedMediaUrls,
        existingImages: updatedExistingImages.length > 0 ? updatedExistingImages : updatedMediaUrls
      };
    });
  };

  // 🔥 toggleTag - SIN sincronización de IVA (servicios no tienen IVA en tags)
  const toggleTag = (category: string, tag: string) => {
    setNewItem((prev: any) => {
      const currentFeatures = prev?.features || [];
      const catConfig = SERVICE_TAG_CATEGORIES[category as keyof typeof SERVICE_TAG_CATEGORIES];
      if (!catConfig) return prev;
      
      const catTags = catConfig.tags;
      const isMulti = catConfig.multi;
      
      let nextFeatures = [...currentFeatures];

      if (!isMulti) {
        nextFeatures = nextFeatures.filter(t => !catTags.includes(t));
        nextFeatures.push(tag);
      } else {
        nextFeatures = nextFeatures.includes(tag) 
          ? nextFeatures.filter(t => t !== tag) 
          : [...nextFeatures, tag];
      }
      
      return { ...prev, features: nextFeatures };
    });
  };

  const cleanInputBg = inputBgClass.replace(/text-\w+-\d+/g, '').replace(/text-white/g, '');

  return (
    <div className="space-y-6 pt-2">
      {/* DESCRIPCION */}
      <div className="space-y-1">
        <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Descripción del Servicio
        </label>
        <textarea
          ref={textareaRef}
          rows={3}
          placeholder="Detalles de la sesión, lo que incluye..."
          value={newItem?.description || ''}
          onChange={(e) => setNewItem((prev: any) => ({ ...prev, description: e.target.value }))}
          className={`w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition overflow-hidden bg-transparent ${cleanInputBg}`}
          style={{ borderColor: borderDynamic, color: textColor }}
        />
      </div>

      {/* ETIQUETAS DE SERVICIO - CON ACORDEÓN (CONTRAÍDO POR DEFECTO) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: borderDynamic }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Características del Servicio
          </label>
          <span className="text-[9px] opacity-40" style={{ color: textColor }}>
            {newItem?.features?.length || 0} seleccionadas
          </span>
        </div>
        {Object.entries(SERVICE_TAG_CATEGORIES).map(([key, cat]) => (
          <ServiceTagAccordion
            key={key}
            categoryKey={key}
            category={cat}
            selectedTags={newItem?.features || []}
            onToggleTag={toggleTag}
            textColor={textColor}
            primary={primary}
            borderColor={borderDynamic}
          />
        ))}
      </div>

      {/* GALERIA */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Galería ({images.length}/7)
          </label>
          <span className="text-[10px] opacity-60" style={{ color: mutedText }}>Max. 5MB</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        <div
          onClick={() => images.length < 7 && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              processFiles(e.dataTransfer.files);
            }
          }}
          className="border border-dashed rounded-2xl p-5 text-center cursor-pointer hover:opacity-100 transition flex flex-col items-center justify-center gap-2 bg-transparent"
          style={{ borderColor: borderDynamic }}
        >
          <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: textColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <p className="text-xs opacity-70" style={{ color: textColor }}>
            {images.length >= 7 ? 'Límite alcanzado' : 'Arrastra fotos o haz clic para cargar'}
          </p>
        </div>

        {images.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {images.map((img) => (
              <div key={img.id} className="flex items-center gap-3.5 p-3 rounded-xl border text-xs bg-transparent" style={{ borderColor: borderDynamic }}>
                <img src={img.url} alt={img.name} className="w-12 h-12 object-cover rounded-lg shrink-0 bg-white/10" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="truncate font-medium text-xs" style={{ color: textColor }}>{img.name}</span>
                    <span className={`text-[10px] font-bold ${img.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {img.status === 'success' ? 'Lista' : 'Error'}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${img.status === 'error' ? 'bg-red-500 w-full' : 'bg-emerald-500 w-full'}`} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}