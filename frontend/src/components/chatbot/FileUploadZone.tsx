// ── SafeSpeak — File Upload Zone Component ──────────────────────────
import { useState, useRef, useCallback } from 'react';
import { Upload, ImagePlus, X, FileImage } from 'lucide-react';

interface FileUploadZoneProps {
    onFileSelect: (file: File) => void;
    isUploading: boolean;
}

export function FileUploadZone({ onFileSelect, isUploading }: FileUploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file && validTypes.includes(file.type)) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && validTypes.includes(file.type)) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const clearFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div
            className={`
        relative border-2 border-dashed rounded-2xl p-6 text-center
        transition-all duration-300 cursor-pointer
        ${isDragOver
                    ? 'border-accent-teal bg-accent-teal/5 scale-[1.02]'
                    : 'border-surface-border hover:border-accent-teal/30 hover:bg-white/[0.01]'
                }
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileInput}
            />

            {selectedFile ? (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-teal/10 flex items-center justify-center">
                        <FileImage className="w-5 h-5 text-accent-teal" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-white/30 text-xs">
                            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                    </div>
                    {!isUploading && (
                        <button
                            onClick={(e) => { e.stopPropagation(); clearFile(); }}
                            className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="py-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent-teal/10 flex items-center justify-center mx-auto mb-3">
                        {isDragOver ? (
                            <ImagePlus className="w-6 h-6 text-accent-teal" />
                        ) : (
                            <Upload className="w-6 h-6 text-accent-teal/50" />
                        )}
                    </div>
                    <p className="text-white/50 text-sm mb-1">
                        {isDragOver ? 'Drop your screenshot here' : 'Drag & drop a screenshot'}
                    </p>
                    <p className="text-white/25 text-xs">
                        or click to browse · JPEG, PNG, WEBP · Max 10MB
                    </p>
                </div>
            )}
        </div>
    );
}
