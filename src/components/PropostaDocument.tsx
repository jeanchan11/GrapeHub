import React from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Importa as 15 imagens da proposta (vite hasheia → URLs mesmo-origem, confiável no rasterize)
const modules = import.meta.glob('../assets/proposta/*.png', { eager: true, import: 'default' });
const IMGS: Record<number, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const m = path.match(/(\d+)\.png$/);
  if (m) IMGS[parseInt(m[1], 10)] = url as string;
}

// Slide em pixels (16:9 paisagem) e a página PDF correspondente em pontos
const PAGE_W = 1122.5;
const PAGE_H = 631.4;
const PDF_W = 841.875;
const PDF_H = 473.55;
const TOTAL = 15;

export interface PropostaData {
  clientName: string;
}

// Exporta os 15 slides como PDF paisagem, rasterizando slide a slide.
export async function exportPropostaPdf(container: HTMLElement, fileName: string) {
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-proposta-page]'));
  if (pages.length === 0) return;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [PDF_W, PDF_H] });
  let added = 0;
  for (let i = 0; i < pages.length; i++) {
    const dataUrl = await toJpeg(pages[i], {
      pixelRatio: 2, quality: 0.95, backgroundColor: '#000000', width: PAGE_W, height: PAGE_H, cacheBust: true,
    });
    if (added > 0) pdf.addPage([PDF_W, PDF_H], 'landscape');
    pdf.addImage(dataUrl, 'JPEG', 0, 0, PDF_W, PDF_H);
    added++;
  }
  pdf.save(fileName);
}

const PropostaDocument = React.forwardRef<HTMLDivElement, { data: PropostaData }>(({ data }, ref) => {
  const nome = data.clientName?.trim() || 'Nome do Cliente';

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 0, width: PAGE_W, background: '#000' }}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const n = i + 1;
        return (
          <div
            key={n}
            data-proposta-page
            style={{ position: 'relative', width: PAGE_W, height: PAGE_H, background: '#000', overflow: 'hidden' }}
          >
            <img
              src={IMGS[n]}
              alt={`Slide ${n}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
            />
            {/* Nome do cliente na capa (slide 1) */}
            {n === 1 && (
              <div style={{ position: 'absolute', top: '72%', left: 0, width: '100%', textAlign: 'center' }}>
                <p style={{
                  margin: 0, color: '#ffffff', fontSize: 26, fontWeight: 300, letterSpacing: '0.2em',
                  fontFamily: "'Montserrat', 'Segoe UI', Arial, sans-serif", lineHeight: '32px',
                }}>
                  {nome}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

PropostaDocument.displayName = 'PropostaDocument';
export default PropostaDocument;
