'use client';

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { PRODUCT_TAG_CATEGORIES } from '@/app/constants/itemCategories';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface UploadingFile {
  id: string;
  name: string;
  url: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
}

interface MediaAndTagsSectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  textColor: string;
  inputBgClass: string;
  primary: string;
  isDarkBg: boolean;
  style?: React.CSSProperties;
  onReset?: () => void;
}

export interface MediaAndTagsSectionRef {
  resetMedia: () => void;
}

// ✅ COMPONENTE DE SECCIÓN DE ETIQUETAS CON ACORDEÓN
const TagCategorySection = forwardRef<{ toggle: () => void }, {
  categoryKey: string;
  category: any;
  selectedTags: string[];
  onToggleTag: (key: string, tag: string) => void;
  textColor: string;
  primary: string;
  borderColor: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}>(({
  categoryKey,
  category,
  selectedTags,
  onToggleTag,
  textColor,
  primary,
  borderColor,
  isExpanded,
  onToggleExpand,
}, ref) => {
  // ✅ SOLO RENDERIZAR CUANDO ESTÁ EXPANDIDO
  const shouldRender = isExpanded;

  return (
    <div className="space-y-2">
      {/* HEADER DEL ACORDEÓN */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 cursor-pointer" style={{ color: textColor }}>
          {category.label} 
          <span className="ml-1.5 text-[9px] opacity-40">
            ({selectedTags.filter(tag => category.tags.includes(tag)).length}/{category.tags.length})
          </span>
        </label>
        <ChevronDown 
          className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 opacity-40 group-hover:opacity-80 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          style={{ color: textColor }}
        />
      </button>

      {/* CONTENIDO DEL ACORDEÓN */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          {shouldRender && category.tags.map((tag: string) => {
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
                  borderColor: isSelected ? 'transparent' : borderColor
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
});

TagCategorySection.displayName = 'TagCategorySection';

const MediaAndTagsSection = forwardRef<MediaAndTagsSectionRef, MediaAndTagsSectionProps>(({
  newItem = {},
  setNewItem,
  textColor,
  inputBgClass,
  primary,
  isDarkBg,
  style,
  onReset,
}: MediaAndTagsSectionProps, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<UploadingFile[]>([]);
  const isInitializedRef = useRef<boolean>(false);
  
  // ✅ ESTADO PARA SECCIONES EXPANDIDAS
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Inicializar todas las secciones como contraídas (false)
    const initial: Record<string, boolean> = {};
    Object.keys(PRODUCT_TAG_CATEGORIES).forEach(key => {
      initial[key] = false;
    });
    return initial;
  });

  // ✅ TOGGLE DE SECCIÓN
  const toggleSection = useCallback((categoryKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  }, []);

  // 🔥 EXPONER FUNCIÓN resetMedia AL PADRE
  useImperativeHandle(ref, () => ({
    resetMedia: () => {
      // Revocar todas las URLs de blob
      images.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
      
      // Limpiar estado de imágenes
      setImages([]);
      
      // Limpiar input de archivos
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Limpiar newItem
      setNewItem((prev: any) => ({
        ...prev,
        files: [],
        mediaUrls: [],
        existingImages: [],
        images: [],
        coverImage: null,
      }));
      
      console.log('🔄 [MediaAndTagsSection] Reset completo de imágenes');
    }
  }));

  // Autoajuste de altura
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [newItem?.description]);

  // 🔥 Cargar imágenes desde newItem (fuente de verdad)
  useEffect(() => {
    // Solo cargar una vez
    if (isInitializedRef.current) return;

    // Obtener imágenes de newItem (fuente de verdad)
    const existingImages = newItem?.existingImages || newItem?.mediaUrls || [];
    const currentFiles = newItem?.files || [];

    // Si no hay imágenes, marcar como inicializado
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
      // Verificar si ya existe en loadedImages
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

  // 🔥 processFiles - SIN duplicados
  const processFiles = useCallback((fileList: FileList) => {
    const filesArray = Array.from(fileList);
    const newImages: UploadingFile[] = [];

    filesArray.forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;

      // 🔥 Verificar si ya existe en images (por nombre y tamaño)
      const existsInImages = images.some(img => 
        img.name === file.name && img.file?.size === file.size
      );

      if (existsInImages) return;

      // 🔥 Verificar si ya existe en newItem.files
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

      // 🔥 Actualizar newItem SOLO si es necesario
      setNewItem((prev: any) => {
        const currentFiles = prev?.files || [];
        const currentMediaUrls = prev?.mediaUrls || [];

        // Filtrar para evitar duplicados
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
  }, [images, newItem?.files, setNewItem]);

  // 🔥 removeImage - limpia correctamente
  const removeImage = useCallback((id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (!imageToRemove) return;

    // Revocar URL de blob si existe
    if (imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    setImages(prev => prev.filter(img => img.id !== id));

    setNewItem((prev: any) => {
      const currentFiles = prev?.files || [];
      const currentMediaUrls = prev?.mediaUrls || [];
      const currentExistingImages = prev?.existingImages || [];

      // Filtrar archivos
      const updatedFiles = currentFiles.filter((f: any) => {
        if (f instanceof File) {
          return f.name !== imageToRemove.name || f.size !== imageToRemove.file?.size;
        }
        return true;
      });

      // Filtrar URLs
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
  }, [images, setNewItem]);

  // 🔥 toggleTag - CORREGIDO CON SINCRONIZACIÓN DE IVA
  const toggleTag = useCallback((category: string, tag: string) => {
    setNewItem((prev: any) => {
      const currentFeatures = prev?.features || [];
      const catConfig = PRODUCT_TAG_CATEGORIES[category as keyof typeof PRODUCT_TAG_CATEGORIES];
      if (!catConfig) return prev;

      const catTags = catConfig.tags;
      const isMulti = catConfig.multi;

      let nextFeatures = [...currentFeatures];

      if (!isMulti) {
        // Single selection: remove all tags from this category, then add the selected one
        nextFeatures = nextFeatures.filter(t => !catTags.includes(t));
        nextFeatures.push(tag);
      } else {
        // Multi selection: toggle the tag
        nextFeatures = nextFeatures.includes(tag)
          ? nextFeatures.filter(t => t !== tag)
          : [...nextFeatures, tag];
      }

      let updatedItem = { ...prev, features: nextFeatures };

      // 🔥🔥🔥 SINCRONIZAR IVA CON EL TAG SELECCIONADO 🔥🔥🔥
      // Solo aplicar si la categoría es 'iva'
      if (category === 'iva') {
        // Buscar tag de IVA en los features actualizados
        const ivaTag = nextFeatures.find((f: string) => 
          f.includes('IVA') || f.includes('Exento') || f.includes('0%')
        );

        if (ivaTag) {
          if (ivaTag.includes('Incluido')) {
            const match = ivaTag.match(/\((\d+)%\)/);
            const rate = match ? parseInt(match[1]) : 16;
            updatedItem.ivaType = 'included';
            updatedItem.ivaRate = rate;
          } else if (ivaTag.includes('Excluido') || ivaTag.includes('No Incluido')) {
            const match = ivaTag.match(/\((\d+)%\)/);
            const rate = match ? parseInt(match[1]) : 16;
            updatedItem.ivaType = 'excluded';
            updatedItem.ivaRate = rate;
          } else if (ivaTag.includes('Exento') || ivaTag.includes('0%')) {
            updatedItem.ivaType = 'exempt';
            updatedItem.ivaRate = 0;
          }
        } else {
          // Si no hay tag de IVA, usar valores por defecto
          updatedItem.ivaType = 'excluded';
          updatedItem.ivaRate = 16;
        }
      }

      return updatedItem;
    });
  }, [setNewItem]);

  const cleanInputBg = inputBgClass.replace(/text-\w+-\d+/g, '').replace(/text-white/g, '');

  // ✅ MEMOIZAR LAS SECCIONES DE ETIQUETAS
  const tagSections = useMemo(() => {
    return Object.entries(PRODUCT_TAG_CATEGORIES).map(([key, cat]) => (
      <TagCategorySection
        key={key}
        categoryKey={key}
        category={cat}
        selectedTags={newItem?.features || []}
        onToggleTag={toggleTag}
        textColor={textColor}
        primary={primary}
        borderColor={style?.borderColor || 'rgba(255,255,255,0.1)'}
        isExpanded={expandedSections[key] || false}
        onToggleExpand={() => toggleSection(key)}
      />
    ));
  }, [newItem?.features, textColor, primary, style?.borderColor, expandedSections, toggleTag, toggleSection]);

  return (
    <div className="space-y-6 pt-2">
      {/* DESCRIPCION */}
      <div className="space-y-1">
        <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Descripcion del Producto
        </label>
        <textarea
          ref={textareaRef}
          rows={3}
          placeholder="Materiales, especificaciones, estado..."
          value={newItem?.description || ''}
          onChange={(e) => setNewItem((prev: any) => ({ ...prev, description: e.target.value }))}
          className={`w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition overflow-hidden ${cleanInputBg}`}
          style={{ borderColor: style?.borderColor, color: textColor }}
        />
      </div>

      {/* ETIQUETAS DE PRODUCTO - CON ACORDEÓN Y CARGA PERZOSA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Características del Producto
          </label>
          <span className="text-[9px] opacity-40" style={{ color: textColor }}>
            {newItem?.features?.length || 0} seleccionadas
          </span>
        </div>
        {tagSections}
      </div>

      {/* GALERIA */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Galeria ({images.length}/7)
          </label>
          <span className="text-[10px] opacity-60" style={{ color: textColor }}>Max. 5MB</span>
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
          className="border border-dashed rounded-2xl p-5 text-center cursor-pointer bg-white/5 hover:opacity-100 transition flex flex-col items-center justify-center gap-2"
          style={{ borderColor: style?.borderColor }}
        >
          <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: textColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <p className="text-xs opacity-70" style={{ color: textColor }}>
            {images.length >= 7 ? 'Limite alcanzado' : 'Arrastra fotos o haz clic para cargar'}
          </p>
        </div>

        {images.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {images.map((img) => (
              <div key={img.id} className="flex items-center gap-3.5 p-3 rounded-xl border text-xs" style={{ borderColor: style?.borderColor }}>
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
});

MediaAndTagsSection.displayName = 'MediaAndTagsSection';

export default MediaAndTagsSection;