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
  initiateDialerCall: (phone: string, leadName: string, leadId: string, userId: string) => void;
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

// Load JsSIP (embedded in libwebphone, but we use jssip.min.js directly since libwebphone is CommonJS)
let jssipLoadPromise: Promise<any> | null = null;
function loadJsSIP(): Promise<any> {
  if (jssipLoadPromise) return jssipLoadPromise;
  jssipLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).JsSIP) { resolve((window as any).JsSIP); return; }
    const script = document.createElement('script');
    script.src = '/jssip.min.js';
    script.onload = () => {
      const J = (window as any).JsSIP;
      if (J) { console.log('[Softphone] JsSIP loaded ✓ v', J.version); resolve(J); }
      else reject(new Error('JsSIP not found after load'));
    };
    script.onerror = () => reject(new Error('Failed to load /jssip.min.js'));
    document.head.appendChild(script);
  });
  return jssipLoadPromise;
}

export function useSoftphone(): UseSoftphoneReturn {
  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const configRef = useRef<SipConfig | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCallRef = useRef<{ phone: string; leadName: string } | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringbackNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  const [sipStatus, setSipStatus] = useState<SipStatus>('idle');
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [currentCall, setCurrentCall] = useState<SoftphoneCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callElapsed, setCallElapsed] = useState(0);

  // ── Remote audio element ──
  useEffect(() => {
    const audio = document.createElement('audio');
    audio.id = 'softphone-remote-audio';
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    return () => { audio.remove(); };
  }, []);

  // ── Elapsed timer ──
  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }, []);
  const startElapsedTimer = useCallback((startedAt: number) => {
    stopElapsedTimer();
    setCallElapsed(0);
    elapsedTimerRef.current = setInterval(() => setCallElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
  }, [stopElapsedTimer]);

  // ── Ringback tone (425 Hz, 1s ON / 4s OFF) ──
  const stopRingback = useCallback(() => {
    if (ringbackTimerRef.current) { clearTimeout(ringbackTimerRef.current); ringbackTimerRef.current = null; }
    if (ringbackNodesRef.current) {
      try { ringbackNodesRef.current.gain.gain.setTargetAtTime(0, audioCtxRef.current!.currentTime, 0.01); setTimeout(() => { try { ringbackNodesRef.current?.osc.stop(); } catch {} ringbackNodesRef.current = null; }, 60); } catch {}
    }
  }, []);
  const startRingback = useCallback(() => {
    stopRingback();
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const playBurst = () => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 425; gain.gain.value = 0.15;
        osc.connect(gain); gain.connect(ctx.destination); osc.start();
        ringbackNodesRef.current = { osc, gain };
        ringbackTimerRef.current = setTimeout(() => {
          try { gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01); setTimeout(() => { try { osc.stop(); } catch {} }, 60); } catch {}
          ringbackNodesRef.current = null;
          ringbackTimerRef.current = setTimeout(playBurst, 4000);
        }, 1000);
      };
      playBurst();
    } catch (e) { console.warn('[Softphone] Ringback error:', e); }
  }, [stopRingback]);

  // ── Register with JsSIP using Api4Com libwebphone-compatible settings ──
  const register = useCallback(async (config: SipConfig) => {
    if (!config.extension || !config.password || !config.domain) {
      setSipStatus('error');
      setRegistrationError('Preencha ramal, senha e domínio');
      return;
    }
    configRef.current = config;
    if (uaRef.current) { try { uaRef.current.stop(); } catch {} uaRef.current = null; }
    setSipStatus('connecting');
    setRegistrationError(null);

    let JsSIP: any;
    try { JsSIP = await loadJsSIP(); }
    catch (e: any) { setSipStatus('error'); setRegistrationError('Falha ao carregar JsSIP: ' + e?.message); return; }

    // Enable JsSIP debug — helps diagnose if incoming INVITE arrives
    JsSIP.debug.enable('JsSIP:*');
    console.log('[Softphone] JsSIP debug enabled — check console for SIP messages');


    try {
      // Api4Com requires port 6443 for WSS
      let wssServer = config.sipServer || `wss://${config.domain}:6443`;
      if (!wssServer.startsWith('wss://') && !wssServer.startsWith('ws://')) wssServer = `wss://${wssServer}`;
      // Check if port already present (parse host part only, after removing protocol)
      const hostPart = wssServer.replace(/^wss?:\/\//, '').split('/')[0];
      const hasPort = /:\d+$/.test(hostPart);
      if (!hasPort) wssServer = wssServer.replace(/\/?$/, '') + ':6443';

      console.log(`[Softphone] Registering: sip:${config.extension}@${config.domain} via ${wssServer}`);

      const socket = new JsSIP.WebSocketInterface(wssServer);

      // IMPORTANT: Use the FIXED instance_id from Api4Com docs — this ensures SINGLETON behavior.
      // Using the same UUID as the Api4Com webphone means our registration REPLACES theirs,
      // so Api4Com only routes calls to ONE endpoint (our browser). Different UUIDs = 2 contacts = fork = failure.
      const INSTANCE_ID = 'd73b96ea-5473-44e3-a50d-d0361311b570';

      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${config.extension}@${config.domain}`,
        password: config.password,
        authorization_user: config.extension,
        instance_id: INSTANCE_ID,
        register: true,
        register_expires: 600,
        session_timers: false,
        user_agent: 'yourcompany-libwebphone', // Match Api4Com docs exactly
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 30,
        // NAT traversal hacks
        hack_via_tcp: true,
        hack_ip_in_contact: true,
        hack_wss_in_transport: true,
        no_answer_timeout: 30,
      });

      let wsConnected = false;
      const connTimeout = setTimeout(() => {
        if (!wsConnected) {
          setSipStatus('error');
          setRegistrationError(`Timeout conectando em ${wssServer}`);
          try { ua.stop(); } catch {}
        }
      }, 15000);

      ua.on('connected', () => { wsConnected = true; clearTimeout(connTimeout); });
      ua.on('registered', () => {
        wsConnected = true; clearTimeout(connTimeout);
        console.log('[Softphone] ✓ SIP Registered!');
        setSipStatus('registered'); setRegistrationError(null);
      });
      ua.on('unregistered', () => setSipStatus('unregistered'));
      ua.on('registrationFailed', (e: any) => {
        clearTimeout(connTimeout);
        const code = e?.response?.status_code;
        const cause = e?.cause || '';
        setSipStatus('error');
        setRegistrationError(
          (code === 401 || code === 403) ? `Credenciais inválidas (${code}) — verifique ramal e senha`
          : code === 408 ? 'Servidor SIP não respondeu (timeout)'
          : code === 503 ? 'Serviço SIP indisponível'
          : `Falha no registro: ${cause}${code ? ` (${code})` : ''}`
        );
      });
      ua.on('disconnected', (e: any) => {
        clearTimeout(connTimeout);
        if (!wsConnected) { setSipStatus('error'); setRegistrationError(`Não conectou ao WSS: ${wssServer}`); }
        else setSipStatus('unregistered');
      });

      // ── INCOMING CALL from Api4Com Dialer ──
      ua.on('newRTCSession', (e: any) => {
        const session = e.session;
        if (session.direction !== 'incoming') return;

        const req = e.request; // ← CORRECT: e.request (not session.request which is undefined in JsSIP)
        // Log ALL headers for diagnosis
        const fromHeader = req?.getHeader?.('from') || req?.from?.toString() || '';
        const hasApi4ComHeader =
          req?.hasHeader?.('x-api4comintegratedcall') ||
          req?.hasHeader?.('X-Api4comintegratedcall') || false;
        const headerValue = req?.getHeader?.('x-api4comintegratedcall') || req?.getHeader?.('X-Api4comintegratedcall') || '';

        console.log('[Softphone] ✅ INCOMING CALL received!', {
          from: fromHeader,
          hasApi4ComHeader,
          headerValue,
          allHeaders: req?.headers ? Object.keys(req.headers).join(', ') : 'N/A'
        });

        sessionRef.current = session;
        const pending = pendingCallRef.current;
        stopRingback();

        const startedAt = Date.now();
        setCurrentCall({ phone: pending?.phone || '', leadName: pending?.leadName || 'Cliente', status: 'active', startedAt });
        startElapsedTimer(startedAt);

        // Auto-answer — Api4Com Dialer calls our extension
        console.log('[Softphone] Auto-answering incoming call...');
        session.answer({
          mediaConstraints: { audio: true, video: false },
          pcConfig: {
            iceServers: [
              { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
              { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
              { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
              { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            ],
            iceTransportPolicy: 'all',
          }
        });

        // Route remote audio to the audio element
        const handleTrack = (ev: RTCTrackEvent) => {
          if (remoteAudioRef.current && ev.streams[0]) {
            console.log('[Softphone] Remote audio stream connected ✓');
            remoteAudioRef.current.srcObject = ev.streams[0];
          }
        };
        if (session.connection) {
          session.connection.addEventListener('track', handleTrack);
        } else {
          session.on('peerconnection', (pcEvent: any) => {
            pcEvent.peerconnection.addEventListener('track', handleTrack);
          });
        }

        session.on('ended', (ev: any) => {
          console.log('[Softphone] Call ended:', ev?.cause);
          stopElapsedTimer(); pendingCallRef.current = null;
          setCurrentCall(p => p ? { ...p, status: 'ended' } : null);
          setTimeout(() => setCurrentCall(null), 3000);
        });
        session.on('failed', (ev: any) => {
          console.log('[Softphone] Call failed:', ev?.cause);
          stopElapsedTimer(); pendingCallRef.current = null;
          setCurrentCall(p => p ? { ...p, status: 'failed', errorMsg: ev?.cause || 'Chamada falhou' } : null);
        });
      });

      uaRef.current = ua;
      ua.start();
    } catch (e: any) {
      setSipStatus('error');
      setRegistrationError(e?.message || 'Erro ao inicializar softphone');
    }
  }, [stopRingback, startElapsedTimer, stopElapsedTimer]);

  const unregister = useCallback(() => {
    if (uaRef.current) { try { uaRef.current.stop(); } catch {} uaRef.current = null; }
    setSipStatus('idle'); setRegistrationError(null);
  }, []);

  // ── Initiate call via Api4Com Dialer API ──
  const initiateDialerCall = useCallback(async (
    phone: string, leadName: string, leadId: string, userId: string
  ) => {
    if (sipStatus !== 'registered') {
      setCurrentCall({
        phone, leadName, status: 'failed',
        errorMsg: sipStatus === 'connecting' ? 'Softphone ainda conectando, aguarde...'
          : sipStatus === 'error' ? `SIP não conectado: ${registrationError || 'verifique as configurações'}`
          : 'Softphone não conectado. Salve as configurações de telefonia.'
      });
      return;
    }

    pendingCallRef.current = { phone, leadName };
    setCurrentCall({ phone, leadName, status: 'calling' });
    startRingback();

    try {
      const res = await fetch('/api/api4com/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, phone, lead_id: leadId })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        stopRingback(); pendingCallRef.current = null;
        const msg = typeof data.message === 'string' ? data.message : data.message?.message || data.error || 'Falha ao iniciar chamada';
        setCurrentCall({ phone, leadName, status: 'failed', errorMsg: msg });
        return;
      }
      console.log('[Softphone] Dialer API call initiated ✓ call_id:', data.call_id);
      // Api4Com will call our extension → newRTCSession will auto-answer
    } catch (err) {
      stopRingback(); pendingCallRef.current = null;
      setCurrentCall({ phone, leadName, status: 'failed', errorMsg: 'Erro de conexão com o servidor' });
    }
  }, [sipStatus, registrationError, startRingback, stopRingback]);

  // ── Hang up ──
  const hangUp = useCallback(() => {
    stopRingback(); stopElapsedTimer(); pendingCallRef.current = null;
    if (sessionRef.current) { try { if (!sessionRef.current.isEnded()) sessionRef.current.terminate(); } catch {} }
    setCurrentCall(p => p ? { ...p, status: 'ended' } : null);
    setTimeout(() => setCurrentCall(null), 1500);
  }, [stopRingback, stopElapsedTimer]);

  // ── Toggle mute ──
  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return;
    if (isMuted) sessionRef.current.unmute({ audio: true });
    else sessionRef.current.mute({ audio: true });
    setIsMuted(m => !m);
  }, [isMuted]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      stopElapsedTimer(); stopRingback();
      if (uaRef.current) { try { uaRef.current.stop(); } catch {} }
    };
  }, [stopElapsedTimer, stopRingback]);

  return { sipStatus, registrationError, currentCall, isMuted, callElapsed, initiateDialerCall, hangUp, toggleMute, register, unregister };
}
