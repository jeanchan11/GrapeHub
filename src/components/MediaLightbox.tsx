// Lightbox reutilizável — abre imagem/vídeo/PDF/arquivo num popup com download.
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export interface LbFile { name?: string; url: string; type?: string; }

const dlHref = (f: LbFile) => `/api/file-download?url=${encodeURIComponent(f.url)}&name=${encodeURIComponent(f.name || 'arquivo')}`;

const MediaLightbox: React.FC<{ files: LbFile[]; index: number; onClose: () => void; onIndex: (i: number) => void }> = ({ files, index, onClose, onIndex }) => {
  const file = files[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      else if (e.key === 'ArrowRight' && index < files.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, files.length]);

  if (!file) return null;
  const t = String(file.type || '');
  const ext = String(file.name || file.url || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isImg = t.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext);
  const isVid = t.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(ext);
  const isPdf = t === 'application/pdf' || ext === 'pdf';

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-white/80 font-medium truncate max-w-[55%]">
          {file.name || 'arquivo'} <span className="text-white/40">· {index + 1}/{files.length}</span>
        </p>
        <div className="flex items-center gap-2">
          <a href={dlHref(file)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all">
            <Download size={16} /> Baixar
          </a>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-6 min-h-0 relative" onClick={e => e.stopPropagation()}>
        {files.length > 1 && index > 0 && (
          <button onClick={() => onIndex(index - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"><ChevronLeft size={22} /></button>
        )}

        {isImg ? (
          <img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain rounded-lg" referrerPolicy="no-referrer" />
        ) : isVid ? (
          <video src={file.url} controls autoPlay className="max-h-full max-w-full rounded-lg" />
        ) : isPdf ? (
          <iframe src={file.url} title={file.name} className="w-full h-full rounded-lg bg-white" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <FileText size={56} className="opacity-50" />
            <p className="text-sm">{file.name || 'arquivo'}</p>
            <a href={dlHref(file)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"><Download size={16} /> Baixar arquivo</a>
          </div>
        )}

        {files.length > 1 && index < files.length - 1 && (
          <button onClick={() => onIndex(index + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"><ChevronRight size={22} /></button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MediaLightbox;
