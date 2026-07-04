import React, { useState, useEffect } from 'react';

// Efeito máquina de escrever — digita e apaga cada palavra em loop.
// Usado no hero da landing e na tela de login.
interface TypewriterProps {
  words: string[];
  color?: string;
  className?: string;
  typingSpeed?: number;   // ms por caractere ao digitar
  deletingSpeed?: number; // ms por caractere ao apagar
  pause?: number;         // ms de pausa com a palavra completa
}

const Typewriter: React.FC<TypewriterProps> = ({
  words,
  color = '#A855F7',
  className = 'font-bold',
  typingSpeed = 90,
  deletingSpeed = 45,
  pause = 1400,
}) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (!words.length) return;
    // terminou de digitar → pausa e começa a apagar
    if (!deleting && subIndex === words[index].length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    // terminou de apagar → próxima palavra
    if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex(prev => (prev + 1) % words.length);
      return;
    }
    const t = setTimeout(() => {
      setSubIndex(prev => prev + (deleting ? -1 : 1));
    }, deleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(t);
  }, [subIndex, index, deleting, words, typingSpeed, deletingSpeed, pause]);

  // piscar do cursor
  useEffect(() => {
    const t = setInterval(() => setBlink(v => !v), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <span className={className} style={{ color }}>
      {words[index]?.substring(0, subIndex)}
      <span
        aria-hidden
        className="inline-block w-[2px] rounded-full align-[-0.12em] ml-0.5"
        style={{ height: '1.05em', background: color, opacity: blink ? 1 : 0 }}
      />
    </span>
  );
};

export default Typewriter;
