import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Check,
  Radio,
  Send,
  Maximize2,
  Minimize2,
  Bot,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  processVoiceTurn,
  VoiceAction,
  VoiceConversationMemory,
  cleanSpeechText,
  buildVoiceAcademicSnapshot
} from '../../../services/voiceAssistantService';
import { createBlock, blocksToHtml } from '../../../services/noteBlockService';

interface VoiceTurnLog {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionBadge?: string;
}

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export const VoiceAssistantOverlay: React.FC = () => {
  const {
    user,
    courses,
    assignments,
    exams,
    tasks,
    notes,
    quizzes,
    academicConfig,
    activeAcademicMode,
    isClassSuspendedOnDate,
    setActiveView,
    setNotesNavTarget,
    addTask,
    addNote,
    addEvent,
    toggleTaskComplete,
    isVoiceAssistantOpen,
    setIsVoiceAssistantOpen
  } = useApp();

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [interimText, setInterimText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [turns, setTurns] = useState<VoiceTurnLog[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! Tap the orb or start speaking. Ask about today’s classes, upcoming deadlines, notes, or tell me to create a task.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [pendingAction, setPendingAction] = useState<VoiceAction | null>(null);
  const [continuousMode, setContinuousMode] = useState(true);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [compactHud, setCompactHud] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<'standard' | 'webrtc_connecting' | 'webrtc_live'>('standard');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const memoryRef = useRef<VoiceConversationMemory>({});
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const isOpenRef = useRef(isVoiceAssistantOpen);
  const continuousRef = useRef(continuousMode);
  const pendingActionRef = useRef(pendingAction);
  const turnsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isOpenRef.current = isVoiceAssistantOpen;
  }, [isVoiceAssistantOpen]);

  useEffect(() => {
    continuousRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, interimText, pendingAction]);

  const stopAudioMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const disconnectWebRtc = useCallback(() => {
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    setRealtimeStatus('standard');
  }, []);

  // Keyboard shortcut Ctrl+Shift+V
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setIsVoiceAssistantOpen(!isOpenRef.current);
      }
      if (e.key === 'Escape' && isOpenRef.current) {
        setIsVoiceAssistantOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setIsVoiceAssistantOpen]);

  // Clean shutdown when overlay closes
  useEffect(() => {
    if (!isVoiceAssistantOpen) {
      stopRecognition();
      stopSpeech();
      stopAudioMeter();
      disconnectWebRtc();
      setOrbState('idle');
      setInterimText('');
    }
  }, [isVoiceAssistantOpen, stopRecognition, stopSpeech, stopAudioMeter, disconnectWebRtc]);

  // Start Web Audio level visualization
  const startAudioMeter = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!streamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / Math.max(1, dataArray.length);
        setAudioLevel(Math.min(1, avg / 90));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setErrorBanner('Microphone permission was denied. Allow mic access in your browser or use text input below.');
      }
    }
  }, []);

  const executeVoiceAction = useCallback(
    (action: VoiceAction): string | undefined => {
      const p = action.payload || {};
      switch (action.type) {
        case 'navigate':
          if (p.view) {
            setActiveView(p.view);
            return `Opened ${p.view}`;
          }
          return undefined;
        case 'open_note':
          setActiveView('notes');
          setNotesNavTarget({ noteId: p.noteId, searchQuery: p.searchQuery });
          return 'Opened Notes';
        case 'create_task':
          addTask({
            title: p.title || 'Voice Study Task',
            courseId: p.courseId || courses[0]?.id || '',
            dueDate: p.dueDate || new Date().toISOString().slice(0, 10),
            priority: p.priority || 'medium',
            tags: ['voice-ai'],
            completed: false,
            source: 'user'
          });
          return `Created task "${p.title || 'Voice Study Task'}"`;
        case 'create_note': {
          const starter = [createBlock('paragraph', p.summary || 'Notes started with Nook Voice AI.')];
          const created = addNote({
            title: p.title || 'Voice Study Note',
            courseId: p.courseId || courses[0]?.id || '',
            tags: ['voice-ai'],
            blocks: starter,
            content: blocksToHtml(starter),
            icon: '🎙️',
            pinned: false,
            highlightedTerms: [],
            isFavorite: false,
            isArchived: false
          });
          setActiveView('notes');
          setNotesNavTarget({ noteId: created.id });
          return `Created note "${created.title}"`;
        }
        case 'create_reminder': {
          const datePart = p.date || new Date().toISOString().slice(0, 10);
          const startTime = p.startTime || '17:00';
          const endTime = p.endTime || '17:30';
          addEvent({
            title: p.title || 'Study Reminder',
            start: `${datePart}T${startTime}`,
            end: `${datePart}T${endTime}`,
            allDay: false,
            type: 'event',
            provider: 'local'
          });
          return `Scheduled "${p.title || 'Study Reminder'}"`;
        }
        case 'complete_task':
          if (p.taskId) {
            toggleTaskComplete(p.taskId);
            return `Updated task "${p.title || p.taskId}"`;
          }
          return undefined;
        default:
          return undefined;
      }
    },
    [addTask, addNote, addEvent, toggleTaskComplete, courses, setActiveView, setNotesNavTarget]
  );

  const speakResponse = useCallback(
    (text: string, onDone?: () => void) => {
      if (speechMuted || !('speechSynthesis' in window)) {
        setOrbState('idle');
        onDone?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanSpeechText(text));
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => /natural|neural|samantha|google us english|aria|daniel/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.03;
      utterance.pitch = 1.0;

      utterance.onstart = () => setOrbState('speaking');
      utterance.onend = () => {
        setOrbState('idle');
        onDone?.();
      };
      utterance.onerror = () => {
        setOrbState('idle');
        onDone?.();
      };
      setOrbState('speaking');
      window.speechSynthesis.speak(utterance);
    },
    [speechMuted]
  );

  const startListening = useCallback(() => {
    setErrorBanner(null);
    stopSpeech();
    stopRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorBanner('Live browser Speech Recognition requires Chrome, Edge, or Safari. You can still type below!');
      return;
    }

    startAudioMeter();
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    recognitionRef.current = rec;

    let finalTranscript = '';

    rec.onstart = () => {
      setOrbState('listening');
      setInterimText('');
    };

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += piece + ' ';
        } else {
          interim += piece;
        }
      }
      setInterimText((finalTranscript + interim).trim());
    };

    rec.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setErrorBanner('Microphone access blocked. Enable microphone permission in your browser settings.');
      }
      setOrbState('idle');
    };

    rec.onend = () => {
      const committed = finalTranscript.trim();
      setInterimText('');
      if (committed && isOpenRef.current) {
        handleTranscriptSubmit(committed);
      } else {
        setOrbState('idle');
      }
    };

    try {
      rec.start();
    } catch {
      setOrbState('idle');
    }
  }, [startAudioMeter, stopRecognition, stopSpeech]);

  const handleTranscriptSubmit = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;

      stopRecognition();
      setOrbState('thinking');

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTurns(prev => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', text: trimmed, timestamp: nowStr }
      ]);

      // Check voice confirmation for pending action
      if (pendingActionRef.current) {
        const low = trimmed.toLowerCase();
        if (/\b(yes|confirm|sure|do it|go ahead|save it|okay|ok)\b/.test(low)) {
          const act = pendingActionRef.current;
          setPendingAction(null);
          const badge = executeVoiceAction(act);
          const reply = `Done! ${badge || 'Action completed.'}`;
          setTurns(prev => [
            ...prev,
            { id: `a_${Date.now()}`, role: 'assistant', text: reply, timestamp: nowStr, actionBadge: badge }
          ]);
          speakResponse(reply, () => {
            if (isOpenRef.current && continuousRef.current) startListening();
          });
          return;
        }
        if (/\b(no|cancel|stop|never mind|abort)\b/.test(low)) {
          setPendingAction(null);
          const reply = 'Cancelled. Nothing was modified.';
          setTurns(prev => [
            ...prev,
            { id: `a_${Date.now()}`, role: 'assistant', text: reply, timestamp: nowStr }
          ]);
          speakResponse(reply, () => {
            if (isOpenRef.current && continuousRef.current) startListening();
          });
          return;
        }
      }

      const historyPayload = turns.slice(-6).map(t => ({ role: t.role, text: t.text }));
      const response = await processVoiceTurn(
        trimmed,
        {
          studentName: user?.name || 'Student',
          courses,
          assignments,
          exams,
          tasks,
          notes,
          quizzes,
          academicConfig,
          activeAcademicMode,
          isClassSuspendedOnDate
        },
        historyPayload,
        memoryRef.current
      );

      memoryRef.current = response.updatedMemory;

      let badge: string | undefined;
      if (response.action && response.action.type !== 'none') {
        if (response.action.requiresConfirmation) {
          setPendingAction(response.action);
        } else {
          badge = executeVoiceAction(response.action);
        }
      }

      setTurns(prev => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: response.spokenReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionBadge: badge
        }
      ]);

      speakResponse(response.spokenReply, () => {
        if (isOpenRef.current && continuousRef.current && !response.action?.requiresConfirmation) {
          startListening();
        }
      });
    },
    [
      turns,
      user?.name,
      courses,
      assignments,
      exams,
      tasks,
      notes,
      quizzes,
      academicConfig,
      activeAcademicMode,
      isClassSuspendedOnDate,
      stopRecognition,
      executeVoiceAction,
      speakResponse,
      startListening
    ]
  );

  // Optional OpenAI Realtime WebRTC mode (if OPENAI_API_KEY is configured on server)
  const handleConnectRealtimeWebRtc = async () => {
    if (realtimeStatus === 'webrtc_live') {
      disconnectWebRtc();
      return;
    }
    setRealtimeStatus('webrtc_connecting');
    setErrorBanner(null);
    try {
      const snapshot = buildVoiceAcademicSnapshot({
        studentName: user?.name || 'Student',
        courses,
        assignments,
        exams,
        tasks,
        notes,
        quizzes,
        academicConfig,
        activeAcademicMode,
        isClassSuspendedOnDate
      });
      const tokenRes = await fetch('/api/ai/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: 'verse',
          instructions: `You are Nook, real-time Siri-style academic assistant. Keep responses brief and natural. Student context: ${JSON.stringify(snapshot).slice(0, 6000)}`
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData?.available || !tokenData?.clientSecret) {
        setRealtimeStatus('standard');
        setErrorBanner(tokenData?.reason || 'OpenAI Realtime API not enabled; using Standard Voice AI mode.');
        return;
      }

      const pc = new RTCPeerConnection();
      peerConnRef.current = pc;
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      pc.ontrack = e => {
        audioEl.srcObject = e.streams[0];
      };
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.getTracks().forEach(track => pc.addTrack(track, mic));
      pc.createDataChannel('oai-events');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(tokenData.model)}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${tokenData.clientSecret}`,
            'Content-Type': 'application/sdp'
          }
        }
      );
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      setRealtimeStatus('webrtc_live');
      setOrbState('listening');
    } catch (err: any) {
      setRealtimeStatus('standard');
      setErrorBanner(err?.message || 'Could not establish WebRTC voice link; continuing in Standard Voice mode.');
    }
  };

  const handleOrbClick = () => {
    if (orbState === 'listening') {
      stopRecognition();
      setOrbState('idle');
    } else if (orbState === 'speaking') {
      // Barge-in interrupt!
      stopSpeech();
      startListening();
    } else {
      startListening();
    }
  };

  // Floating Siri-Style Launcher Button when closed
  if (!isVoiceAssistantOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsVoiceAssistantOpen(true)}
        title="Launch Voice AI Assistant (Ctrl+Shift+V)"
        className="fixed bottom-20 md:bottom-6 right-5 z-40 group flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full bg-slate-900/90 dark:bg-indigo-950/90 backdrop-blur-md text-white shadow-2xl border border-indigo-400/30 hover:scale-105 transition-all"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 shadow-inner">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-30" />
          <Mic className="w-4 h-4 text-white relative z-10" />
        </span>
        <span className="text-xs font-semibold tracking-tight hidden sm:inline">Voice AI</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all ${compactHud
          ? 'bottom-5 right-5 w-96 max-w-[calc(100vw-2rem)] h-[540px] rounded-3xl shadow-2xl border border-indigo-400/30 overflow-hidden'
          : 'inset-0'
        }`}
    >
      <div className="w-full h-full bg-slate-950/95 backdrop-blur-xl text-white flex flex-col overflow-hidden relative">
        {/* Top Bar */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                Nook Voice Assistant
                {realtimeStatus === 'webrtc_live' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    WebRTC Live
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                {orbState === 'listening'
                  ? 'Listening... speak naturally'
                  : orbState === 'thinking'
                    ? 'Thinking with your academic context...'
                    : orbState === 'speaking'
                      ? 'Speaking (tap orb to interrupt)'
                      : 'Tap the glowing orb to speak (Ctrl+Shift+V)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleConnectRealtimeWebRtc}
              title="Use OpenAI Realtime Speech-to-Speech (if configured on server)"
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition ${realtimeStatus === 'webrtc_live'
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {realtimeStatus === 'webrtc_connecting'
                  ? 'Connecting...'
                  : realtimeStatus === 'webrtc_live'
                    ? 'Live Audio On'
                    : 'HD Realtime'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setContinuousMode(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition ${continuousMode
                  ? 'bg-indigo-500/25 border-indigo-400/40 text-indigo-200'
                  : 'bg-white/5 border-white/10 text-slate-400'
                }`}
            >
              Hands-Free: {continuousMode ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!speechMuted) stopSpeech();
                setSpeechMuted(prev => !prev);
              }}
              title={speechMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
            >
              {speechMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setCompactHud(prev => !prev)}
              title={compactHud ? 'Full-Screen Voice Mode' : 'Compact HUD Mode'}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
            >
              {compactHud ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsVoiceAssistantOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorBanner && (
          <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorBanner}
            </span>
            <button type="button" onClick={() => setErrorBanner(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Center Orb + Waveform Stage */}
        <div className="flex-1 flex flex-col items-center justify-between p-5 min-h-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-4 shrink-0">
            {/* Animated Glowing Siri-Style Orb */}
            <button
              type="button"
              onClick={handleOrbClick}
              style={{
                transform: `scale(${orbState === 'listening'
                    ? 1 + audioLevel * 0.28
                    : orbState === 'speaking'
                      ? 1.08
                      : 1
                  })`
              }}
              className="relative w-32 h-32 rounded-full flex items-center justify-center focus:outline-none transition-transform duration-100 cursor-pointer"
            >
              <span
                className={`absolute inset-0 rounded-full blur-2xl opacity-70 transition-all duration-300 ${orbState === 'listening'
                    ? 'bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 animate-pulse'
                    : orbState === 'speaking'
                      ? 'bg-gradient-to-tr from-emerald-400 via-cyan-400 to-indigo-500 animate-pulse'
                      : orbState === 'thinking'
                        ? 'bg-gradient-to-tr from-amber-400 via-violet-500 to-indigo-600 animate-spin'
                        : 'bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-500 opacity-45'
                  }`}
              />
              <span className="relative w-24 h-24 rounded-full bg-slate-900/80 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-2xl">
                {orbState === 'listening' ? (
                  <Mic className="w-9 h-9 text-cyan-300" />
                ) : orbState === 'speaking' ? (
                  <Volume2 className="w-9 h-9 text-emerald-300" />
                ) : orbState === 'thinking' ? (
                  <Sparkles className="w-9 h-9 text-violet-300 animate-pulse" />
                ) : (
                  <MicOff className="w-8 h-8 text-slate-300" />
                )}
              </span>
            </button>

            {/* Real-Time Waveform Bars */}
            <div className="flex items-center justify-center gap-1.5 h-8 mt-4">
              {Array.from({ length: 14 }).map((_, idx) => {
                const factor = Math.sin((idx + 1) * 0.6) * 0.4 + 0.6;
                const h =
                  orbState === 'listening'
                    ? Math.max(6, Math.round(8 + audioLevel * 28 * factor))
                    : orbState === 'speaking'
                      ? Math.max(8, Math.round(12 + ((idx % 3) + 1) * 5))
                      : orbState === 'thinking'
                        ? 10
                        : 4;
                return (
                  <span
                    key={idx}
                    style={{ height: `${h}px` }}
                    className={`w-1 rounded-full transition-all duration-100 ${orbState === 'listening'
                        ? 'bg-cyan-400'
                        : orbState === 'speaking'
                          ? 'bg-emerald-400'
                          : 'bg-indigo-400/50'
                      }`}
                  />
                );
              })}
            </div>

            {interimText && (
              <p className="mt-2 text-sm text-cyan-200 font-medium text-center max-w-xl animate-pulse">
                “{interimText}”
              </p>
            )}
          </div>

          {/* Pending Confirmation Card */}
          {pendingAction && (
            <div className="w-full max-w-xl mb-3 p-3.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs font-medium text-indigo-100">
                <strong className="block text-white">Confirm Action</strong>
                {pendingAction.confirmationPrompt || 'Proceed with this action?'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const act = pendingAction;
                    setPendingAction(null);
                    const badge = executeVoiceAction(act);
                    const msg = `Done! ${badge || 'Saved.'}`;
                    setTurns(prev => [
                      ...prev,
                      {
                        id: `a_${Date.now()}`,
                        role: 'assistant',
                        text: msg,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        actionBadge: badge
                      }
                    ]);
                    speakResponse(msg);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Conversation Transcript */}
          <div className="w-full max-w-2xl flex-1 overflow-y-auto space-y-2.5 pr-1">
            {turns.map(t => (
              <div
                key={t.id}
                className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${t.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white/10 border border-white/10 text-slate-100 rounded-bl-sm'
                    }`}
                >
                  {t.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-semibold mb-1">
                      <Bot className="w-3 h-3" /> Nook Voice AI • {t.timestamp}
                    </div>
                  )}
                  <p>{t.text}</p>
                  {t.actionBadge && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                      ✓ {t.actionBadge}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={turnsEndRef} />
          </div>

          {/* Suggested Voice Commands + Text Input Fallback */}
          <div className="w-full max-w-2xl pt-3 space-y-2 shrink-0">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {[
                'What is my next class?',
                'What assignments are due soon?',
                'Open my notes',
                'Add a task to revise lecture 3',
                'What should I do now?'
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleTranscriptSubmit(prompt)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 transition"
                >
                  “{prompt}”
                </button>
              ))}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!textInput.trim()) return;
                const q = textInput.trim();
                setTextInput('');
                handleTranscriptSubmit(q);
              }}
              className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-2xl px-3 py-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Speak to the orb above, or type a question/command here..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
