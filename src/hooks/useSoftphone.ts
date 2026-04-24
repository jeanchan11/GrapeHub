import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';

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
  extension: string; // active extension number (from cache or current config)
  initiateDialerCall: (phone: string, leadName: string, leadId: string, userId: string) => void;
  hangUp: () => void;
  toggleMute: () => void;
  sendDTMF: (digit: string) => void;
  setSpeakerVolume: (v: number) => void;
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

// Load JsSIP once
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

// DTMF frequencies
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

// ── LocalStorage cache for instant reconnection on page reload ──
const SIP_CACHE_KEY = 'grapehub_sip_config';
function saveSipConfigToCache(config: SipConfig) {
  try { localStorage.setItem(SIP_CACHE_KEY, JSON.stringify(config)); } catch {}
}
function loadSipConfigFromCache(): SipConfig | null {
  try {
    const raw = localStorage.getItem(SIP_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c?.extension && c?.password && c?.domain) return c as SipConfig;
    return null;
  } catch { return null; }
}
export function clearSipConfigCache() {
  try { localStorage.removeItem(SIP_CACHE_KEY); } catch {}
}
export { loadSipConfigFromCache };

// ══════════════════════════════════════════════════════════════════
// SINGLETON SOFTPHONE STORE
// A single SIP UA instance shared by all consumers (CRM, Settings, etc.)
// This prevents the UA from being destroyed/created on every page navigation.
// ══════════════════════════════════════════════════════════════════

interface SoftphoneState {
  sipStatus: SipStatus;
  registrationError: string | null;
  currentCall: SoftphoneCall | null;
  isMuted: boolean;
  callElapsed: number;
}

type Listener = () => void;

const hasCachedConfig = !!loadSipConfigFromCache();

// Global mutable state
let _state: SoftphoneState = {
  sipStatus: hasCachedConfig ? 'connecting' : 'idle',
  registrationError: null,
  currentCall: null,
  isMuted: false,
  callElapsed: 0,
};

// UA and session refs (module-level singletons)
let _ua: any = null;
let _session: any = null;
let _config: SipConfig | null = null;
let _pendingCall: { phone: string; leadName: string } | null = null;
let _everRegistered = false;
let _autoConnected = false;
let _remoteAudio: HTMLAudioElement | null = null;
let _audioCtx: AudioContext | null = null;
let _elapsedTimer: ReturnType<typeof setInterval> | null = null;
let _ringbackTimer: ReturnType<typeof setTimeout> | null = null;
let _ringbackNodes: { osc: OscillatorNode; gain: GainNode } | null = null;

// Subscriber list for useSyncExternalStore
const _listeners = new Set<Listener>();

function _notify() {
  // Create a NEW object reference so React detects the change
  _state = { ..._state };
  _listeners.forEach(l => l());
}

function _subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

function _getSnapshot(): SoftphoneState {
  return _state;
}

// ── Ensure remote audio element exists ──
function ensureRemoteAudio() {
  if (_remoteAudio) return;
  const audio = document.createElement('audio');
  audio.id = 'softphone-remote-audio';
  audio.autoplay = true;
  audio.style.display = 'none';
  document.body.appendChild(audio);
  _remoteAudio = audio;
}

// ── Elapsed timer ──
function stopElapsedTimer() {
  if (_elapsedTimer) { clearInterval(_elapsedTimer); _elapsedTimer = null; }
}
function startElapsedTimer(startedAt: number) {
  stopElapsedTimer();
  _state.callElapsed = 0;
  _notify();
  _elapsedTimer = setInterval(() => {
    _state.callElapsed = Math.floor((Date.now() - startedAt) / 1000);
    _notify();
  }, 1000);
}

// ── Ringback tone (425 Hz, 1s ON / 4s OFF) ──
function stopRingback() {
  if (_ringbackTimer) { clearTimeout(_ringbackTimer); _ringbackTimer = null; }
  if (_ringbackNodes) {
    try {
      _ringbackNodes.gain.gain.setTargetAtTime(0, _audioCtx!.currentTime, 0.01);
      setTimeout(() => { try { _ringbackNodes?.osc.stop(); } catch {} _ringbackNodes = null; }, 60);
    } catch {}
  }
}
function startRingback() {
  stopRingback();
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new AudioContext();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const playBurst = () => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 425; gain.gain.value = 0.15;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      _ringbackNodes = { osc, gain };
      _ringbackTimer = setTimeout(() => {
        try { gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01); setTimeout(() => { try { osc.stop(); } catch {} }, 60); } catch {}
        _ringbackNodes = null;
        _ringbackTimer = setTimeout(playBurst, 4000);
      }, 1000);
    };
    playBurst();
  } catch (e) { console.warn('[Softphone] Ringback error:', e); }
}

// ── Register with JsSIP (singleton) ──
async function singletonRegister(config: SipConfig) {
  if (!config.extension || !config.password || !config.domain) {
    _state.sipStatus = 'error';
    _state.registrationError = 'Preencha ramal, senha e domínio';
    _notify();
    return;
  }
  _config = config;

  // Stop existing UA cleanly
  if (_ua) {
    const oldUa = _ua;
    _ua = null;
    try { oldUa.stop(); } catch {}
  }

  _everRegistered = false;
  _state.sipStatus = 'connecting';
  _state.registrationError = null;
  _notify();

  let JsSIP: any;
  try { JsSIP = await loadJsSIP(); }
  catch (e: any) {
    _state.sipStatus = 'error';
    _state.registrationError = 'Falha ao carregar JsSIP: ' + e?.message;
    _notify();
    return;
  }

  // Build WSS URL: wss://DOMAIN:6443
  let wssServer = config.sipServer || `wss://${config.domain}`;
  if (!wssServer.startsWith('wss://') && !wssServer.startsWith('ws://')) wssServer = `wss://${wssServer}`;
  const hostPart = wssServer.replace(/^wss?:\/\//, '').split('/')[0];
  if (!/:\d+$/.test(hostPart)) wssServer = wssServer.replace(/\/?$/, '') + ':6443';

  console.log(`[Softphone] Registering sip:${config.extension}@${config.domain} via ${wssServer}`);

  try {
    ensureRemoteAudio();
    const socket = new JsSIP.WebSocketInterface(wssServer);

    // Exact config matching Api4Com libwebphone docs
    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${config.extension}@${config.domain}`,
      password: config.password,
      authorization_user: config.extension,
      instance_id: 'd73b96ea-5473-44e3-a50d-d0361311b570',
      register: true,
      register_expires: 600,
      session_timers: false,
      user_agent: 'yourcompany-libwebphone',
      // JsSIP auto-reconnection: will retry WSS on its own
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      no_answer_timeout: 30,
      // NAT traversal
      hack_via_tcp: true,
      hack_ip_in_contact: true,
    });

    _ua = ua;

    // ── Events ──
    ua.on('connected', () => {
      if (_ua !== ua) return;
      console.log('[Softphone] WSS connected ✓');
    });

    ua.on('registered', () => {
      if (_ua !== ua) return;
      console.log('[Softphone] ✓ SIP Registered!');
      _everRegistered = true;
      _state.sipStatus = 'registered';
      _state.registrationError = null;
      _notify();
      saveSipConfigToCache(config);
    });

    ua.on('unregistered', () => {
      if (_ua !== ua) return;
      console.log('[Softphone] SIP Unregistered');
      if (_everRegistered) {
        _state.sipStatus = 'connecting';
        _state.registrationError = 'Reconectando...';
        _notify();
      }
    });

    ua.on('registrationFailed', (e: any) => {
      if (_ua !== ua) return;
      const code = e?.response?.status_code;
      const cause = e?.cause || '';
      console.error('[Softphone] Registration failed:', code, cause);

      if (code === 401 || code === 403) {
        _state.sipStatus = 'error';
        _state.registrationError = `Credenciais inválidas (${code}) — verifique ramal e senha`;
      } else if (code === 503) {
        _state.sipStatus = 'connecting';
        _state.registrationError = 'Servidor indisponível, reconectando...';
      } else {
        _state.sipStatus = 'connecting';
        _state.registrationError = `Tentando conectar... (${cause || 'aguarde'})`;
      }
      _notify();
    });

    ua.on('disconnected', (e: any) => {
      if (_ua !== ua) return;
      console.warn('[Softphone] WSS disconnected:', e?.cause || e?.code);
      if (_everRegistered) {
        _state.sipStatus = 'connecting';
        _state.registrationError = 'Reconectando ao servidor SIP...';
      } else {
        _state.sipStatus = 'connecting';
        _state.registrationError = 'Conectando ao servidor SIP...';
      }
      _notify();
    });

    // ── Incoming call from Api4Com Dialer ──
    ua.on('newRTCSession', (e: any) => {
      if (_ua !== ua) return;
      const session = e.session;
      if (session.direction !== 'incoming') return;

      const req = e.request;
      const fromHeader = req?.getHeader?.('from') || '';
      console.log('[Softphone] ✅ INCOMING CALL from:', fromHeader);

      _session = session;
      const pending = _pendingCall;
      stopRingback();

      const startedAt = Date.now();
      _state.currentCall = { phone: pending?.phone || '', leadName: pending?.leadName || 'Cliente', status: 'active', startedAt };
      _notify();
      startElapsedTimer(startedAt);

      // Auto-answer
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
        },
      });

      // Remote audio
      const handleTrack = (ev: RTCTrackEvent) => {
        if (_remoteAudio && ev.streams[0]) {
          console.log('[Softphone] Remote audio ✓');
          _remoteAudio.srcObject = ev.streams[0];
        }
      };
      if (session.connection) {
        session.connection.addEventListener('track', handleTrack);
      } else {
        session.on('peerconnection', (pcEvent: any) => pcEvent.peerconnection.addEventListener('track', handleTrack));
      }

      session.on('ended', () => {
        stopElapsedTimer(); _pendingCall = null; _session = null;
        _state.currentCall = _state.currentCall ? { ..._state.currentCall, status: 'ended' } : null;
        _notify();
        setTimeout(() => { _state.currentCall = null; _notify(); }, 3000);
      });
      session.on('failed', (ev: any) => {
        stopElapsedTimer(); _pendingCall = null; _session = null;
        _state.currentCall = _state.currentCall ? { ..._state.currentCall, status: 'failed', errorMsg: ev?.cause || 'Chamada falhou' } : null;
        _notify();
      });
    });

    ua.start();
    console.log('[Softphone] UA started — JsSIP will auto-reconnect on disconnect');

  } catch (e: any) {
    _state.sipStatus = 'error';
    _state.registrationError = e?.message || 'Erro ao inicializar softphone';
    _notify();
  }
}

function singletonUnregister() {
  if (_ua) {
    const ua = _ua;
    _ua = null;
    try { ua.stop(); } catch {}
  }
  clearSipConfigCache();
  _state.sipStatus = 'idle';
  _state.registrationError = null;
  _notify();
}

async function singletonInitiateDialerCall(phone: string, leadName: string, leadId: string, userId: string) {
  if (_state.sipStatus !== 'registered') {
    _state.currentCall = {
      phone, leadName, status: 'failed',
      errorMsg: _state.sipStatus === 'connecting' ? 'Softphone conectando, aguarde...'
        : `SIP não conectado. ${_state.registrationError || 'Verifique as configurações.'}`,
    };
    _notify();
    return;
  }
  _pendingCall = { phone, leadName };
  _state.currentCall = { phone, leadName, status: 'calling' };
  _notify();
  startRingback();

  try {
    const res = await fetch('/api/api4com/call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, phone, lead_id: leadId }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      stopRingback(); _pendingCall = null;
      const msg = typeof data.message === 'string' ? data.message : data.message?.message || data.error || 'Falha ao iniciar chamada';
      _state.currentCall = { phone, leadName, status: 'failed', errorMsg: msg };
      _notify();
      return;
    }
    console.log('[Softphone] Dialer API ✓ call_id:', data.call_id);
  } catch (err) {
    stopRingback(); _pendingCall = null;
    _state.currentCall = { phone, leadName, status: 'failed', errorMsg: 'Erro de conexão com o servidor' };
    _notify();
  }
}

function singletonHangUp() {
  stopRingback(); stopElapsedTimer(); _pendingCall = null;
  if (_session) {
    try { if (!_session.isEnded()) _session.terminate(); } catch {}
    _session = null;
  }
  _state.currentCall = _state.currentCall ? { ..._state.currentCall, status: 'ended' } : null;
  _notify();
  setTimeout(() => { _state.currentCall = null; _notify(); }, 1500);
}

function singletonToggleMute() {
  if (!_session) return;
  if (_state.isMuted) _session.unmute({ audio: true });
  else _session.mute({ audio: true });
  _state.isMuted = !_state.isMuted;
  _notify();
}

function singletonSendDTMF(digit: string) {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new AudioContext();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const freqs = DTMF_FREQS[digit];
    if (freqs) {
      const [f1, f2] = freqs;
      const gain = ctx.createGain(); gain.gain.value = 0.12; gain.connect(ctx.destination);
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f1; o1.connect(gain); o1.start();
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f2; o2.connect(gain); o2.start();
      setTimeout(() => { try { gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01); o1.stop(ctx.currentTime + 0.1); o2.stop(ctx.currentTime + 0.1); } catch {} }, 100);
    }
  } catch (e) { console.warn('[Softphone] DTMF tone error:', e); }

  if (!_session) return;
  try {
    const pc = _session.connection as RTCPeerConnection | null;
    if (pc) {
      const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'audio');
      if (sender?.dtmf) { sender.dtmf.insertDTMF(digit, 100, 70); return; }
    }
  } catch (e) { console.warn('[Softphone] RTCDTMFSender error:', e); }
  try { _session.sendDTMF(digit, { duration: 100, interToneGap: 70 }); } catch {}
}

function singletonSetSpeakerVolume(v: number) {
  if (_remoteAudio) _remoteAudio.volume = Math.max(0, Math.min(1, v));
}

// ── Auto-connect from cached config (runs once globally) ──
function autoConnectFromCache() {
  if (_autoConnected) return;
  const cached = loadSipConfigFromCache();
  if (cached) {
    _autoConnected = true;
    console.log('[Softphone] Auto-connecting from cache:', cached.extension + '@' + cached.domain);
    singletonRegister(cached);
  }
}

// ══════════════════════════════════════════════════════════════════
// REACT HOOK — thin wrapper over the singleton store
// Multiple components can call useSoftphone() simultaneously
// without creating duplicate UA instances.
// ══════════════════════════════════════════════════════════════════

export function useSoftphone(): UseSoftphoneReturn {
  // useSyncExternalStore ensures React re-renders when singleton state changes
  const state = useSyncExternalStore(_subscribe, _getSnapshot);

  // Auto-connect on first hook mount (any component)
  useEffect(() => {
    autoConnectFromCache();
  }, []);

  // Active extension number
  const extension = _config?.extension || loadSipConfigFromCache()?.extension || '';

  return {
    sipStatus: state.sipStatus,
    registrationError: state.registrationError,
    currentCall: state.currentCall,
    isMuted: state.isMuted,
    callElapsed: state.callElapsed,
    extension,
    initiateDialerCall: singletonInitiateDialerCall,
    hangUp: singletonHangUp,
    toggleMute: singletonToggleMute,
    sendDTMF: singletonSendDTMF,
    setSpeakerVolume: singletonSetSpeakerVolume,
    register: singletonRegister,
    unregister: singletonUnregister,
  };
}
