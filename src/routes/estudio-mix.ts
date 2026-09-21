// ── Mixagem de som ambiente (ffmpeg) ─────────────────────────────────────────
// A MiniMax não gera ambiência: o /v1/t2a_v2 só tem `voice_modify.sound_effects`
// (spacious_echo, auditorium_echo, lofi_telephone, robotic), que é efeito NA VOZ
// — não trânsito, pássaro ou gente ao fundo, e sem controle de volume. Então a
// cama de som entra aqui, por mixagem nossa, depois da síntese.
import { spawn } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

// Ordem de resolução do binário: variável de ambiente (produção com ffmpeg do
// sistema), pacote com binário embutido, e por último o PATH.
//
// O caminho do pacote é montado à mão em vez de `require('ffmpeg-static')`: o
// servidor é empacotado pelo esbuild e um `require` solto some ou quebra
// conforme o formato de saída. Conferir o arquivo no disco funciona nos dois.
function binarioFfmpeg(): string {
  const doEnv = (process.env.FFMPEG_PATH || '').trim();
  if (doEnv) return doEnv;
  const nome = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const embutido = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', nome);
  if (existsSync(embutido)) return embutido;
  return 'ffmpeg';   // último recurso: o do sistema, pelo PATH
}

function rodar(args: string[]): Promise<void> {
  return new Promise((ok, erro) => {
    const p = spawn(binarioFfmpeg(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let log = '';
    p.stderr.on('data', d => { log += d.toString(); });
    p.on('error', e => erro(new Error(`ffmpeg não pôde ser executado: ${e.message}`)));
    p.on('close', code => {
      if (code === 0) return ok();
      // O ffmpeg escreve tudo no stderr; só a última linha interessa.
      const ultima = log.trim().split('\n').slice(-1)[0] || `código ${code}`;
      erro(new Error(`ffmpeg falhou: ${ultima}`));
    });
  });
}

// Pasta temporária própria por chamada: duas mixagens simultâneas não podem
// disputar o mesmo nome de arquivo.
async function comPastaTemp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = path.join(os.tmpdir(), `estudio-mix-${crypto.randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Monta o filtro da ambiência.
 *
 * `-stream_loop -1` repete a cama até cobrir a locução (arquivo de 10 s embaixo
 * de um vídeo de 40 s ficaria em silêncio no resto). `duration=first` corta pelo
 * primeiro input — a voz —, e `normalize=0` é obrigatório: sem ele o amix divide
 * o ganho pelo número de entradas e a voz sai pela metade do volume.
 */
function filtro(volume: number, duracaoSeg: number | null): string {
  const vol = Math.min(1, Math.max(0, volume));
  // Fade de saída: cama cortada a seco no fim do vídeo soa como falha de edição.
  const fade = duracaoSeg && duracaoSeg > 1.5
    ? `,afade=t=out:st=${Math.max(0, duracaoSeg - 0.8).toFixed(2)}:d=0.8`
    : '';
  return `[1:a]volume=${vol.toFixed(3)}${fade}[amb];` +
         `[0:a][amb]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]`;
}

/** Locução + ambiência → mp3. É o áudio que a pessoa ouve na prévia. */
export async function mixarAudio(
  voz: Buffer, ambiencia: Buffer, volume: number, duracaoMs: number | null,
): Promise<Buffer> {
  return comPastaTemp(async dir => {
    const aVoz = path.join(dir, 'voz.mp3');
    const aAmb = path.join(dir, 'amb.mp3');
    const aOut = path.join(dir, 'out.mp3');
    await fs.writeFile(aVoz, voz);
    await fs.writeFile(aAmb, ambiencia);
    await rodar([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', aVoz,
      '-stream_loop', '-1', '-i', aAmb,
      '-filter_complex', filtro(volume, duracaoMs ? duracaoMs / 1000 : null),
      '-map', '[mix]', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '32000', '-ac', '1',
      aOut,
    ]);
    return fs.readFile(aOut);
  });
}

/**
 * Ambiência por cima do mp4 pronto do HeyGen.
 *
 * A mixagem acontece DEPOIS da renderização de propósito: o HeyGen tira o lip
 * sync do áudio que recebe, e ruído por baixo da voz põe a sincronia em risco.
 * Mixando aqui, o vídeo é renderizado com a voz limpa e mudar a ambiência não
 * custa crédito nenhum. `-c:v copy` não reprocessa a imagem.
 */
export async function mixarVideo(
  mp4: Buffer, ambiencia: Buffer, volume: number, duracaoMs: number | null,
): Promise<Buffer> {
  return comPastaTemp(async dir => {
    const aVid = path.join(dir, 'in.mp4');
    const aAmb = path.join(dir, 'amb.mp3');
    const aOut = path.join(dir, 'out.mp4');
    await fs.writeFile(aVid, mp4);
    await fs.writeFile(aAmb, ambiencia);
    await rodar([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', aVid,
      '-stream_loop', '-1', '-i', aAmb,
      '-filter_complex', filtro(volume, duracaoMs ? duracaoMs / 1000 : null),
      '-map', '0:v', '-map', '[mix]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      aOut,
    ]);
    return fs.readFile(aOut);
  });
}
