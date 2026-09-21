import React, { useEffect, useRef } from 'react';

export type EstadoDaEsfera = 'anel' | 'esfera';

/**
 * Nuvem de partículas em anel — o mesmo desenho do Alfred (Grape CRM) quando
 * ele está pensando, e do placeholder de geração do HeyGen.
 *
 * Duas formas, e é a troca entre elas que dá a leitura:
 *   anel   → as partículas se juntam num círculo, com o miolo vazio;
 *   esfera → elas voltam a preencher o volume da bola.
 *
 * Detalhes que parecem enfeite e não são: o raio de cada partícula é sorteado
 * com viés para a superfície (a borda precisa aparecer, mas o miolo não pode
 * ficar oco), e tamanho e opacidade são sorteados por partícula. Uma nuvem com
 * pontos todos iguais parece textura impressa, não poeira em movimento.
 *
 * A cor vem do CSS — o elemento herda `color`, então a nuvem acompanha o tema
 * claro/escuro sem ninguém passar hex.
 */
export default function EsferaDeParticulas({
  estado = 'anel',
  quantidade = 1100,
  className = '',
}: {
  estado?: EstadoDaEsfera;
  quantidade?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const phi = Math.PI * (3 - Math.sqrt(5)); // ângulo áureo
    const particulas = Array.from({ length: quantidade }, (_, i) => {
      // Direção uniforme na esfera (espiral de Fibonacci): sorteio aleatório
      // embola nos polos e deixa buraco no equador.
      const y = 1 - (i / (quantidade - 1)) * 2;
      const anel = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      // Viés forte para fora: é a borda que dá a silhueta. Distribuição
      // uniforme no volume adensa o CENTRO na projeção e vira borrão.
      const raio = 0.5 + 0.5 * Math.pow(Math.random(), 0.28);
      return {
        x: Math.cos(theta) * anel,
        y,
        z: Math.sin(theta) * anel,
        raio,
        anguloAnel: (i / quantidade) * Math.PI * 2 + Math.random() * 0.25,
        raioAnel: 1.04 + Math.random() * 0.14,
        tamanho: 0.4 + Math.pow(Math.random(), 2) * 1.7,
        alfa: 0.3 + Math.random() * 0.7,
      };
    });

    let largura = 0;
    let altura = 0;
    const ajustar = () => {
      const escala = window.devicePixelRatio || 1;
      largura = canvas.clientWidth || 200;
      altura = canvas.clientHeight || 200;
      canvas.width = Math.floor(largura * escala);
      canvas.height = Math.floor(altura * escala);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
    };
    ajustar();
    // ResizeObserver e não `resize` da janela: o card muda de tamanho pelo
    // grid, sem a janela mexer.
    const observador = new ResizeObserver(ajustar);
    observador.observe(canvas);

    let raf = 0;
    let giro = 0;
    let misturaAnel = estadoRef.current === 'anel' ? 1 : 0;
    const corAtual = () => getComputedStyle(canvas).color || '#7c3aed';

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura);
      misturaAnel += ((estadoRef.current === 'anel' ? 1 : 0) - misturaAnel) * 0.11;

      // Respiração lenta: sem ela o anel fica parado girando e parece GIF.
      const respiro = Math.sin(performance.now() / 1400) * 0.5 + 0.5;
      giro += 0.004 + respiro * 0.003;

      const cx = largura / 2;
      const cy = altura / 2;
      const base = Math.min(largura, altura) * 0.34;
      const cos = Math.cos(giro);
      const sen = Math.sin(giro);
      const expansao = 1 + respiro * 0.06;
      const cor = corAtual();

      for (const p of particulas) {
        // Posição como esfera…
        const ex = (p.x * cos - p.z * sen) * p.raio;
        const ey = p.y * p.raio;
        const ez = (p.x * sen + p.z * cos) * p.raio;
        // …e como anel plano, girando no mesmo ritmo.
        const a = p.anguloAnel + giro;
        const ax = Math.cos(a) * p.raioAnel;
        const ay = Math.sin(a) * p.raioAnel;

        const m = misturaAnel;
        const px = cx + (ex * (1 - m) + ax * m) * base * expansao;
        const py = cy + (ey * (1 - m) + ay * m) * base * expansao;

        // Profundidade só vale na esfera; no anel tudo está no mesmo plano.
        const profundidade = ((ez + 1) / 2) * (1 - m) + 0.55 * m;
        const tam = p.tamanho * (0.6 + profundidade * 0.7);
        ctx.globalAlpha = Math.min(1, p.alfa * (0.4 + profundidade * 0.6) * (0.75 + respiro * 0.3));
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, tam), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);

    return () => {
      cancelAnimationFrame(raf);
      observador.disconnect();
    };
  }, [quantidade]);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
}
