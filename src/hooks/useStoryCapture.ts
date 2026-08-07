/**
 * useStoryCapture Hook
 *
 * Manages state for the AI-powered family story capture experience.
 * Handles speech recognition, narrative accumulation, manual parse triggering,
 * AI clarification questions, entity management, and tree materialization.
 *
 * Key design: User has full control — record/stop/edit/process cycle.
 * No auto-parse. No nudge timers. Parsing only on explicit "Process" click.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  parseNarrative,
  materializeTree,
  mapAIResponse,
  type StoryEntity,
  type StoryRelationship,
  type StoryParseResponse,
} from '@/services/storyParseService';
import { aiApiCalls } from '@/api/apicalls';
import { AI_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InputMode = 'idle' | 'mic' | 'type';
export type CapturePhase = 'priming' | 'input' | 'review' | 'materializing' | 'done';
export type InputSubState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'CLARIFYING' | 'NO_MEMBERS';

export interface UseStoryCaptureReturn {
  // Phase
  phase: CapturePhase;
  setPhase: (p: CapturePhase) => void;

  // Input
  inputMode: InputMode;
  setInputMode: (m: InputMode) => void;
  narrativeText: string;
  setNarrativeText: (t: string | ((prev: string) => string)) => void;
  isListening: boolean;
  interimTranscript: string;
  inputSubState: InputSubState;
  audioLevel: number;
  isSpeaking: boolean;

  // Speech controls
  startListening: () => void;
  stopListening: () => void;
  speechSupported: boolean;

  // Parsing
  isParsing: boolean;
  parseError: string | null;
  triggerParse: () => void;

  // Entities
  entities: StoryEntity[];
  relationships: StoryRelationship[];
  followUpQuestions: string[];
  suggestedTreeName: string;
  updateEntity: (tempId: string, updates: Partial<StoryEntity>) => void;
  removeEntity: (tempId: string) => void;

  // Clarification
  clarificationQuestion: string | null;
  answerClarification: (answer: string) => void;
  dismissClarification: () => void;

  // No members
  noMembersDetected: boolean;
  clearNoMembers: () => void;

  // Materialization
  isMaterializing: boolean;
  materializeError: string | null;
  handleMaterialize: (treeName: string) => Promise<string | null>;
  resetCapture: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStoryCapture(): UseStoryCaptureReturn {
  // Phase state
  const [phase, setPhase] = useState<CapturePhase>('priming');
  const [inputMode, setInputMode] = useState<InputMode>('idle');
  const [inputSubState, setInputSubState] = useState<InputSubState>('IDLE');

  // Narrative text
  const [narrativeText, _setNarrativeText] = useState('');

  const setNarrativeText = useCallback((text: string | ((prev: string) => string)) => {
    _setNarrativeText(prev => {
      const nextText = typeof text === 'function' ? text(prev) : text;
      if (nextText.trim() !== prev.trim()) {
        setEntities([]);
        setRelationships([]);
        setFollowUpQuestions([]);
        setSummary(null);
      }
      return nextText;
    });
  }, []);

  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // WebSocket and audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Check if speech recording is supported
  const speechSupported = typeof window !== 'undefined' && !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    (window.AudioContext || (window as any).webkitAudioContext)
  );

  // Parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Entities from AI
  const [entities, setEntities] = useState<StoryEntity[]>([]);
  const [relationships, setRelationships] = useState<StoryRelationship[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [suggestedTreeName, setSuggestedTreeName] = useState('My Family Tree');
  const [summary, setSummary] = useState<string | null>(null);
  const [rawExtraction, setRawExtraction] = useState<any>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

  // Clarification system
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [clarificationContext, setClarificationContext] = useState('');
  const clarificationQueueRef = useRef<string[]>([]);

  // No members detection
  const [noMembersDetected, setNoMembersDetected] = useState(false);

  // Materialization
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [materializeError, setMaterializeError] = useState<string | null>(null);

  // ── Speech Recording/WebSocket ─────────────────────────────────────────────

  const cleanupAudioAndWebSocket = useCallback(() => {
    setIsListening(false);
    setAudioLevel(0);
    setIsSpeaking(false);
    lastSpeechTimeRef.current = 0;
    
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    setParseError(null);
    setInterimTranscript('');
    setNoMembersDetected(false);
    setClarificationQuestion(null);
    
    // Hide previous preview immediately upon starting a new recording
    setEntities([]);
    setRelationships([]);
    setFollowUpQuestions([]);
    setSummary(null);

    const token = getAuthToken();
    if (!token) {
      setParseError('User authorization token is missing. Please log in again.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const wsProtocol = AI_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
      const wsHost = AI_BASE_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/ai/tree-builder/stt?token=${encodeURIComponent(token)}`;
      
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        const configMessage = {
          type: 'config',
          sampleRateHz: 16000,
          interimResults: true,
          context: 'family',
          clean: true,
          translateToEnglish: true,
        };
        ws.send(JSON.stringify(configMessage));

        try {
          const source = audioContext.createMediaStreamSource(stream);
          sourceRef.current = source;

          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // Calculate RMS volume for microphone activity visualization
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            const now = Date.now();

            // Threshold for speech detection
            if (rms > 0.012) {
              lastSpeechTimeRef.current = now;
              setIsSpeaking(true);
            } else if (now - lastSpeechTimeRef.current > 800) {
              setIsSpeaking(false);
            }

            // Normalize level (0-100 scale) for visualizer
            const level = Math.min(100, Math.max(0, Math.round(rms * 400)));
            setAudioLevel(level);

            const pcmBuffer = convertFloat32ToInt16(inputData);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(pcmBuffer.buffer);
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);
        } catch (err) {
          console.error('Audio node setup failed:', err);
          setParseError('Failed to initialize audio capture nodes.');
          cleanupAudioAndWebSocket();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'interim' || msg.type === 'final') {
            setInterimTranscript(msg.display || '');
          } else if (msg.type === 'transcript') {
            if (msg.text) {
              const newText = msg.text.trim();
              if (newText) {
                setNarrativeText(prev => {
                  const baseText = prev.trim();
                  if (baseText) {
                    const needsPeriod = !/[.!?]$/.test(baseText);
                    return `${baseText}${needsPeriod ? '.' : ''} ${newText}`;
                  }
                  return newText;
                });
              }
            }
            setInputSubState('IDLE');
            setIsParsing(false);
            cleanupAudioAndWebSocket();
          } else if (msg.type === 'error') {
            console.error('STT WS error message:', msg);
            setParseError(msg.message || 'Speech processing error.');
            setInputSubState('IDLE');
            setIsParsing(false);
            cleanupAudioAndWebSocket();
          }
        } catch (e) {
          console.error('Failed to parse WS text message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('STT WS error:', err);
        setParseError('Failed to connect to the speech-to-text service.');
        setInputSubState('IDLE');
        setIsParsing(false);
        cleanupAudioAndWebSocket();
      };

      ws.onclose = (event) => {
        console.log('STT WS closed:', event.code, event.reason);
        if (event.code === 1008) {
          setParseError('Unauthorized: missing or invalid token.');
        } else if (event.code !== 1000 && event.code !== 1001 && wsRef.current) {
          setParseError('Speech-to-text connection closed unexpectedly.');
        }
        setInputSubState('IDLE');
        setIsParsing(false);
      };

      setIsListening(true);
      setInputMode('mic');
      setInputSubState('RECORDING');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setParseError('Microphone access denied or audio recording failed to initialize.');
      cleanupAudioAndWebSocket();
    }
  }, [cleanupAudioAndWebSocket]);

  const stopListening = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end' }));
      } catch (err) {
        console.error('Failed to send end message:', err);
      }
      setInputSubState('PROCESSING');

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        audioContextRef.current = null;
      }
    } else {
      cleanupAudioAndWebSocket();
    }
    setIsListening(false);
  }, [cleanupAudioAndWebSocket]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ── Manual Parse (triggered by Process button only) ───────────────────────

  const triggerParse = useCallback(async () => {
    const text = narrativeText.trim();
    if (text.length < 5) return;

    setInputSubState('PROCESSING');
    setIsParsing(true);
    setParseError(null);
    setNoMembersDetected(false);

    try {
      // Combine narrative + any clarification context for richer AI understanding
      const fullContext = clarificationContext
        ? `${text}\n\nAdditional context from user:\n${clarificationContext}`
        : text;

      const cappedText = fullContext.slice(0, 5000);
      const result: StoryParseResponse = await parseNarrative(cappedText);

      setEntities(result.entities);
      setRelationships(result.relationships);
      setFollowUpQuestions(result.followUpQuestions);
      if (result.suggestedTreeName) {
        setSuggestedTreeName(result.suggestedTreeName);
      }
      if (result.summary) {
        setSummary(result.summary);
      }
      setRawExtraction(result.rawExtraction);
      setFollowUpAnswers({});

      if (result.entities.length === 0) {
        setNoMembersDetected(true);
        setInputSubState('NO_MEMBERS');
      } else if (result.clarificationQuestions && result.clarificationQuestions.length > 0) {
        // Queue all clarifications, show first one
        clarificationQueueRef.current = result.clarificationQuestions.slice(1);
        setClarificationQuestion(result.clarificationQuestions[0]);
        setInputSubState('CLARIFYING');
      } else {
        setInputSubState('IDLE');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse';
      setParseError(msg);
      setInputSubState('IDLE');
      // Don't clear existing entities on parse failure — preserve previous extraction
    } finally {
      setIsParsing(false);
    }
  }, [narrativeText, clarificationContext]);

  // ── Clarification System ──────────────────────────────────────────────────

  const handleClarificationStep = useCallback(async (answer?: string) => {
    let updatedAnswers = { ...followUpAnswers };

    if (clarificationQuestion) {
      if (answer && answer.trim()) {
        const trimmed = answer.trim();
        setClarificationContext(prev => {
          const qa = `Q: ${clarificationQuestion}\nA: ${trimmed}`;
          return prev ? `${prev}\n${qa}` : qa;
        });
        updatedAnswers = { ...updatedAnswers, [clarificationQuestion]: trimmed };
      } else {
        updatedAnswers = { ...updatedAnswers, [clarificationQuestion]: '' };
      }
      setFollowUpAnswers(updatedAnswers);
    }

    // Show next queued clarification or go back to IDLE
    if (clarificationQueueRef.current.length > 0) {
      const next = clarificationQueueRef.current.shift()!;
      setClarificationQuestion(next);
    } else {
      // All questions answered or skipped, call resolve API
      if (rawExtraction) {
        setInputSubState('PROCESSING');
        setIsParsing(true);
        try {
          const payload = {
            narrative: narrativeText.trim(),
            previousExtraction: rawExtraction,
            answers: updatedAnswers,
            questionHistory: rawExtraction.extracted?.questionHistory || [],
          };
          const rawResult = await aiApiCalls.resolveFollowup(payload);
          const result = mapAIResponse(rawResult);
          
          setEntities(result.entities);
          setRelationships(result.relationships);
          setFollowUpQuestions(result.followUpQuestions);
          if (result.suggestedTreeName) {
            setSuggestedTreeName(result.suggestedTreeName);
          }
          if (result.summary) {
            setSummary(result.summary);
          }
          setRawExtraction(result.rawExtraction);
          setFollowUpAnswers({});
          setClarificationContext('');
          
          if (result.clarificationQuestions && result.clarificationQuestions.length > 0) {
            // New questions from resolve API - queue them
            clarificationQueueRef.current = result.clarificationQuestions.slice(1);
            setClarificationQuestion(result.clarificationQuestions[0]);
            setInputSubState('CLARIFYING');
          } else {
            setClarificationQuestion(null);
            setInputSubState('IDLE');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to resolve answers';
          setParseError(msg);
          setInputSubState('IDLE');
        } finally {
          setIsParsing(false);
        }
      } else {
        setClarificationQuestion(null);
        setInputSubState('IDLE');
      }
    }
  }, [clarificationQuestion, narrativeText, rawExtraction, followUpAnswers]);

  const answerClarification = useCallback((answer: string) => {
    handleClarificationStep(answer);
  }, [handleClarificationStep]);

  const dismissClarification = useCallback(() => {
    handleClarificationStep();
  }, [handleClarificationStep]);

  // ── No Members ────────────────────────────────────────────────────────────

  const clearNoMembers = useCallback(() => {
    setNoMembersDetected(false);
    setInputSubState('IDLE');
  }, []);

  // ── Entity Management ─────────────────────────────────────────────────────

  const updateEntity = useCallback((tempId: string, updates: Partial<StoryEntity>) => {
    setEntities(prev => prev.map(e => e.tempId === tempId ? { ...e, ...updates } : e));
  }, []);

  const removeEntity = useCallback((tempId: string) => {
    setEntities(prev => prev.filter(e => e.tempId !== tempId));
    setRelationships(prev => prev.filter(r => r.fromTempId !== tempId && r.toTempId !== tempId));
  }, []);

  // ── Materialization ───────────────────────────────────────────────────────

  const handleMaterialize = useCallback(async (treeName: string): Promise<string | null> => {
    setIsMaterializing(true);
    setMaterializeError(null);
    setPhase('materializing');

    try {
      const result = await materializeTree(treeName, entities, relationships, summary);
      setPhase('done');
      return result.treeId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create tree';
      setMaterializeError(msg);
      setPhase('review'); // Go back to review on error
      return null;
    } finally {
      setIsMaterializing(false);
    }
  }, [entities, relationships]);

  const resetCapture = useCallback(() => {
    cleanupAudioAndWebSocket();
    setPhase('input');
    setInputSubState('IDLE');
    setNarrativeText('');
    setInterimTranscript('');
    setIsParsing(false);
    setParseError(null);
    setEntities([]);
    setRelationships([]);
    setFollowUpQuestions([]);
    setSuggestedTreeName('My Family Tree');
    setSummary(null);
    setRawExtraction(null);
    setFollowUpAnswers({});
    setClarificationQuestion(null);
    setClarificationContext('');
    clarificationQueueRef.current = [];
    setNoMembersDetected(false);
    setIsMaterializing(false);
    setMaterializeError(null);
  }, [cleanupAudioAndWebSocket]);

  return {
    phase,
    setPhase,
    inputMode,
    setInputMode,
    narrativeText,
    setNarrativeText,
    isListening,
    interimTranscript,
    inputSubState,
    audioLevel,
    isSpeaking,
    startListening,
    stopListening,
    speechSupported,
    isParsing,
    parseError,
    triggerParse,
    entities,
    relationships,
    followUpQuestions,
    suggestedTreeName,
    summary,
    updateEntity,
    removeEntity,
    clarificationQuestion,
    answerClarification,
    dismissClarification,
    noMembersDetected,
    clearNoMembers,
    isMaterializing,
    materializeError,
    handleMaterialize,
    resetCapture,
  };
}

function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    let s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buf;
}
