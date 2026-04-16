import { useEffect, useRef, useState, useCallback } from 'react';

export type SipStatus = 'idle' | 'connecting' | 'registered' | 'unregistered' | 'error';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active' | 'ended' | 'failed';

export interface SoftphoneCall {
  phone: string;
  leadName: string;
  status: CallStatus;
  startedAt?: number;
  errorMsg?: string;
}

export interface UseSoftphoneReturn {
  sipStatus: SipStatus;
  registrationError: string | null;
  currentCall: SoftphoneCall | null;
  isMuted: boolean;
  callElapsed: number;
  makeCall: (phone: string, leadName: string) => void;
  hangUp: () => void;
  toggleMute: () => void;
  register: (config: SipConfig) => void;
  unregister: () => void;
}

export interface SipConfig {
  extension: string;
  password: string;
  domain: string;
  sipServer: string;
}

export const formatCallTime = (secs: number): string => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Load JsSIP from local public file (no CDN dependency)
let jssipLoadPromise: Promise<any> | null = null;

function loadJsSIP(): Promise<any> {
  if (jssipLoadPromise) return jssipLoadPromise;
  jssipLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).JsSIP) { resolve((window as any).JsSIP); return; }
    const script = document.createElement('script');
    script.src = '/jssip.min.js';  // served from /public by Vite
    script.onload = () => {
      const J = (window as any).JsSIP;
      if (J) {
        console.log('[Softphone] JsSIP loaded locally ✓ version:', J.version);
        resolve(J);
      } else {
        reject(new Error('JsSIP not found on window after local load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load /jssip.min.js — file missing in public/'));
    document.head.appendChild(script);
  });
  return jssipLoadPromise;
}

export function useSoftphone(): UseSoftphoneReturn {
  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<SipConfig | null>(null);

  const [sipStatus, setSipStatus] = useState<SipStatus>('idle');
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [currentCall, setCurrentCall] = useState<SoftphoneCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callElapsed, setCallElapsed] = useState(0);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.id = 'softphone-remote-audio';
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    return () => { audio.remove(); };
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }, []);

  const startElapsedTimer = useCallback((startedAt: number) => {
    stopElapsedTimer();
    setCallElapsed(0);
    elapsedTimerRef.current = setInterval(() => {
      setCallElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }, [stopElapsedTimer]);

  const cleanupSession = useCallback(() => {
    stopElapsedTimer();
    sessionRef.current = null;
    setIsMuted(false);
    setCallElapsed(0);
  }, [stopElapsedTimer]);

  const register = useCallback(async (config: SipConfig) => {
    if (!config.extension || !config.password || !config.domain || !config.sipServer) {
      console.warn('[Softphone] Missing required SIP config fields', config);
      setRegistrationError('Preencha todos os campos SIP antes de conectar');
      setSipStatus('error');
      return;
    }

    configRef.current = config;

    if (uaRef.current) {
      try { uaRef.current.stop(); } catch {}
      uaRef.current = null;
    }

    setSipStatus('connecting');
    setRegistrationError(null);

    console.log('[Softphone] Loading JsSIP...');
    let JsSIP: any;
    try {
      JsSIP = await loadJsSIP();
      console.log('[Softphone] JsSIP loaded ✓ version:', JsSIP?.version);
    } catch (e: any) {
      console.error('[Softphone] Load failed:', e);
      setSipStatus('error');
      setRegistrationError('Falha ao carregar JsSIP: ' + e?.message);
      return;
    }

    JsSIP.debug.enable('JsSIP:*');

    try {
      // Normalize WSS URL
      const wsServer = config.sipServer.startsWith('wss://') || config.sipServer.startsWith('ws://')
        ? config.sipServer
        : `wss://${config.sipServer}`;

      console.log(`[Softphone] Connecting → WSS: ${wsServer}`);
      console.log(`[Softphone] SIP URI: sip:${config.extension}@${config.domain}`);

      const socket = new JsSIP.WebSocketInterface(wsServer);

      let wsConnected = false;
      let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;

      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${config.extension}@${config.domain}`,
        password: config.password,
        display_name: `Ramal ${config.extension}`,
        register: true,
        register_expires: 300,
        session_timers: false,
        user_agent: 'GrapeHub/1.0',
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 8,
      });

      // Connection timeout: 12s
      connectionTimeoutId = setTimeout(() => {
        if (!wsConnected) {
          console.error('[Softphone] WSS connection timeout (12s)');
          setSipStatus('error');
          setRegistrationError(`Timeout ao conectar em ${wsServer} — verifique o Servidor WSS`);
          try { ua.stop(); } catch {}
        }
      }, 12000);

      ua.on('connecting', () => {
        console.log('[Softphone] → Connecting to WSS...');
        setSipStatus('connecting');
      });

      ua.on('connected', () => {
        wsConnected = true;
        if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
        console.log('[Softphone] ✓ WSS connected, sending REGISTER...');
      });

      ua.on('registered', () => {
        wsConnected = true;
        if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
        console.log('[Softphone] ✓ SIP Registered!');
        setSipStatus('registered');
        setRegistrationError(null);
      });

      ua.on('unregistered', (e: any) => {
        console.warn('[Softphone] Unregistered:', e?.cause);
        setSipStatus('unregistered');
      });

      ua.on('registrationFailed', (e: any) => {
        const cause = e?.cause || 'Unknown';
        const code = e?.response?.status_code;
        console.error(`[Softphone] ✗ Registration failed: ${cause} (${code})`);
        if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
        setSipStatus('error');
        setRegistrationError(
          code === 401 || code === 403 ? `Credenciais inválidas (${code}) — verifique ramal e senha` :
          code === 407 ? 'Autenticação de proxy necessária (407)' :
          code === 408 ? 'Servidor SIP não respondeu (408 timeout)' :
          code === 503 ? 'Servidor SIP indisponível (503)' :
          `Falha no registro: ${cause}${code ? ` (${code})` : ''}`
        );
      });

      ua.on('disconnected', (e: any) => {
        const cause = e?.cause || '';
        const code = e?.code;
        console.warn(`[Softphone] WSS disconnected: ${cause} code=${code}`);
        if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
        if (!wsConnected) {
          // Never connected — wrong URL, port, or server is down
          setSipStatus('error');
          setRegistrationError(
            `Não foi possível conectar ao servidor WSS (${wsServer}). ` +
            `Verifique se o endereço e porta estão corretos. Tente: wss://${config.domain}:8089/ws`
          );
        } else {
          setSipStatus('unregistered');
        }
      });

      uaRef.current = ua;
      ua.start();
    } catch (e: any) {
      console.error('[Softphone] UA init error:', e);
      setSipStatus('error');
      setRegistrationError(e?.message || 'Erro ao inicializar ramal');
    }
  }, []);

  const unregister = useCallback(() => {
    if (uaRef.current) { try { uaRef.current.stop(); } catch {} uaRef.current = null; }
    setSipStatus('idle');
    setRegistrationError(null);
  }, []);

  const makeCall = useCallback((phone: string, leadName: string) => {
    if (!uaRef.current || sipStatus !== 'registered') {
      console.warn('[Softphone] Cannot call: not registered. Status:', sipStatus);
      return;
    }

    const normalized = phone.replace(/[^\d+]/g, '');
    const domain = configRef.current?.domain || uaRef.current._configuration?.uri?.host || '';
    const target = `sip:${normalized}@${domain}`;

    console.log(`[Softphone] Calling ${target}`);
    setCurrentCall({ phone: normalized, leadName, status: 'calling' });
    setIsMuted(false);
    setCallElapsed(0);

    let session: any;
    try {
      session = uaRef.current.call(target, {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });
    } catch (e: any) {
      console.error('[Softphone] Call initiation error:', e);
      setCurrentCall({ phone: normalized, leadName, status: 'failed', errorMsg: e?.message || 'Erro ao discar' });
      return;
    }

    sessionRef.current = session;

    session.on('progress', (e: any) => {
      console.log('[Softphone] Call progress:', e?.response?.status_code);
      setCurrentCall(prev => prev ? { ...prev, status: 'ringing' } : null);
    });

    session.on('confirmed', () => {
      console.log('[Softphone] Call confirmed ✓');
      const startedAt = Date.now();
      setCurrentCall(prev => prev ? { ...prev, status: 'active', startedAt } : null);
      startElapsedTimer(startedAt);
      if (session.connection) {
        session.connection.ontrack = (ev: RTCTrackEvent) => {
          if (remoteAudioRef.current && ev.streams[0]) {
            remoteAudioRef.current.srcObject = ev.streams[0];
          }
        };
      }
    });

    session.on('ended', (e: any) => {
      console.log('[Softphone] Call ended:', e?.cause);
      cleanupSession();
      setCurrentCall(prev => prev ? { ...prev, status: 'ended' } : null);
      setTimeout(() => setCurrentCall(null), 3000);
    });

    session.on('failed', (e: any) => {
      const cause = e?.cause || 'Falha';
      const code = e?.response?.status_code;
      console.error(`[Softphone] Call failed: ${cause} (${code})`);
      cleanupSession();
      setCurrentCall(prev => prev ? {
        ...prev,
        status: 'failed',
        errorMsg: code === 486 ? 'Ocupado' : code === 404 ? 'Número não encontrado' : cause
      } : null);
    });
  }, [sipStatus, startElapsedTimer, cleanupSession]);

  const hangUp = useCallback(() => {
    if (sessionRef.current) {
      try { if (!sessionRef.current.isEnded()) sessionRef.current.terminate(); } catch {}
    }
    cleanupSession();
    setCurrentCall(prev => prev ? { ...prev, status: 'ended' } : null);
    setTimeout(() => setCurrentCall(null), 1500);
  }, [cleanupSession]);

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return;
    if (isMuted) { sessionRef.current.unmute({ audio: true }); }
    else { sessionRef.current.mute({ audio: true }); }
    setIsMuted(m => !m);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      stopElapsedTimer();
      if (uaRef.current) { try { uaRef.current.stop(); } catch {} }
    };
  }, [stopElapsedTimer]);

  return { sipStatus, registrationError, currentCall, isMuted, callElapsed, makeCall, hangUp, toggleMute, register, unregister };
}
