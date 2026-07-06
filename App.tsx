/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Mic, Square, ArrowRight, Volume2, CheckCircle2, AlertCircle, TreePine, RotateCcw } from 'lucide-react';

type AnalysisResult = {
  diff: { word: string; missing: boolean }[];
  feedback: string;
};

// 1. Mock Database
const formulas = [
  {
    id: 1,
    formula: "I need to extract [Data] from the [System]",
    variables: { Data: "Q3 sales metrics", System: "ERP" },
    feedback: "Чудова структура! Зверни увагу на звук [r] у слові 'extract'.",
  },
  {
    id: 2,
    formula: "Could we drill down into the [Metric] for [Timeframe]?",
    variables: { Metric: "user retention rate", Timeframe: "Q2" },
    feedback: "Ідеальна інтонація. 'Drill down' прозвучало дуже природно та впевнено.",
  },
  {
    id: 3,
    formula: "There seems to be an anomaly in the [Dataset] regarding [Issue].",
    variables: { Dataset: "customer churn report", Issue: "duplicate entries" },
    feedback: "Чітка вимова. Пам'ятай робити легку паузу після слова 'anomaly'.",
  }
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Phase 0: Listen, Phase 1: Code (Record), Phase 2: Debug (Feedback)
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [treesPlanted, setTreesPlanted] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Speech Recognition States
  const recognitionRef = useRef<any>(null);
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const currentData = formulas[currentIndex];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'not-allowed') {
             setSpeechError("Немає доступу до мікрофона. Будь ласка, надайте дозвіл у браузері.");
          } else {
             setSpeechError(`Помилка мікрофона: ${event.error}`);
          }
          setIsRecording(false);
        };
        
        recognitionRef.current.onend = () => {
          // If it ends unexpectedly and we were still recording, we can reset the state
          setIsRecording((prev) => {
            if (prev && recognitionRef.current) {
                // sometimes it stops automatically after a pause, we could restart or just stop
                // for this prototype, we'll just let the user see it stopped
            }
            return false;
          });
        };
      } else {
        setSpeechError("Ваш браузер не підтримує Web Speech API. Спробуйте Chrome або Edge.");
      }
    }
  }, []);

  // Helper to construct full target formula string
  const getFullTargetFormula = (formula: string, variables: Record<string, string>) => {
    let result = formula;
    for (const [key, val] of Object.entries(variables)) {
      result = result.replace(`[${key}]`, val);
    }
    return result;
  };

  const analyzeSpeech = async (spokenText: string, targetFormula: string) => {
    // TODO: Replace with Gemini API call for advanced semantic analysis and pronunciation feedback.
    
    const cleanSpokenWords = spokenText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const targetWords = targetFormula.split(/\s+/);
    
    const diff = targetWords.map((origWord) => {
      const cleanWord = origWord.toLowerCase().replace(/[^\w\s]/g, '');
      const missing = cleanWord.length > 0 && !cleanSpokenWords.includes(cleanWord);
      return { word: origWord, missing };
    });

    const missingCount = diff.filter(d => d.missing).length;
    let feedback = "Чудова робота! Звучить ідеально.";
    
    if (spokenText.trim() === '') {
       feedback = "Не вдалося розпізнати текст. Спробуй ще раз, говорячи ближче до мікрофона.";
    } else if (missingCount > 0 && missingCount <= 2) {
       feedback = "Майже ідеально. Зверни увагу на виділені слова.";
    } else if (missingCount > 2) {
       feedback = "Варто ще попрактикуватись. Деякі слова пропущені або вимовлені нечітко.";
    }

    setAnalysisResult({ diff, feedback });
  };

  // Helper to highlight variables in the formula
  const renderFormula = (formula: string) => {
    // Splits by [Variable] keeping the brackets for matching
    const parts = formula.split(/(\[[^\]]+\])/);
    
    return parts.map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const varName = part.slice(1, -1);
        // Replace with actual variable value if it exists
        const value = currentData.variables[varName as keyof typeof currentData.variables] || part;
        return (
          <span key={index} className="text-sage font-medium px-1 bg-sage/10 rounded-md mx-1 transition-colors duration-500">
            {value}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handlePlayAudio = () => {
    if (isPlaying) return;
    
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const textToSpeak = getFullTargetFormula(currentData.formula, currentData.variables);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for better comprehension

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (e) => {
        console.error("Speech synthesis error", e);
        setIsPlaying(false);
      };

      window.speechSynthesis.cancel(); // Clear any ongoing speech
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback if not supported
      setIsPlaying(true);
      setTimeout(() => {
        setIsPlaying(false);
      }, 2500);
    }
  };

  const handleToggleRecord = () => {
    setSpeechError(null);
    if (!isRecording) {
      if (!recognitionRef.current) {
         setSpeechError("Ваш браузер не підтримує розпізнавання голосу.");
         return;
      }
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
        setSpeechError("Не вдалося запустити мікрофон. Можливо, він вже використовується.");
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      analyzeSpeech(transcript, getFullTargetFormula(currentData.formula, currentData.variables));
      setPhase(2); // Move to Debug phase
    }
  };

  const handleNextCycle = () => {
    setTreesPlanted((prev) => prev + 1);

    if (currentIndex === formulas.length - 1) {
      setIsFinished(true);
      return;
    }

    setPhase(0);
    setTranscript('');
    setSpeechError(null);
    setAnalysisResult(null);
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 selection:bg-sage/20 font-sans transition-colors duration-700">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-10 flex flex-col items-center space-y-2"
      >
        <h1 className="text-xl font-display font-medium text-slate-muted tracking-wide">
          ZenSprint <span className="text-sage">v2.0</span>
        </h1>
        <div className="flex space-x-2">
          {formulas.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                isFinished ? 'w-8 bg-sage' : idx === currentIndex ? 'w-8 bg-sage' : idx < currentIndex ? 'w-2 bg-sage/50' : 'w-2 bg-sand'
              }`} 
            />
          ))}
        </div>
      </motion.div>

      {/* Top Right Counter */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-8 right-8 flex items-center space-x-2 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-sand shadow-sm"
      >
        <TreePine className="w-5 h-5 text-sage" />
        <span className="font-medium text-slate-dark">{treesPlanted}</span>
      </motion.div>

      {/* Main Card */}
      <div className="w-full max-w-2xl relative">
        
        {/* Calming background blob behind the card */}
        <motion.div 
          animate={{ 
            scale: isRecording ? [1, 1.1, 1] : 1,
            opacity: isRecording ? [0.4, 0.6, 0.4] : 0
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute -inset-10 bg-sage/20 rounded-full blur-3xl -z-10"
        />

        <div className="bg-white/80 backdrop-blur-xl border border-sand shadow-sm rounded-3xl p-10 md:p-14 text-center min-h-[400px] flex flex-col justify-center relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* Finished Screen */}
            {isFinished && (
              <motion.div
                key="finished"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center justify-center space-y-6"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-24 h-24 bg-sage/20 rounded-full flex items-center justify-center mb-4"
                >
                  <TreePine className="w-12 h-12 text-sage" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-display text-slate-dark tracking-wide">Сад розширюється</h2>
                <p className="text-lg text-slate-muted max-w-md mx-auto leading-relaxed">
                  Ви успішно завершили усі мікро-цикли! Ваш фокус та спокій допомогли виростити нове дерево.
                </p>
                <button
                  onClick={() => {
                    setIsFinished(false);
                    setCurrentIndex(0);
                    setPhase(0);
                    setTranscript('');
                    setAnalysisResult(null);
                  }}
                  className="mt-8 flex items-center space-x-3 px-8 py-4 border border-sand hover:bg-sand/30 rounded-full transition-colors duration-300 text-slate-dark font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Почати новий спринт</span>
                </button>
              </motion.div>
            )}

            {/* Phase 0 & 1: Listen / Record */}
            {!isFinished && (phase === 0 || phase === 1) && (
              <motion.div 
                key="listen-record"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center space-y-12"
              >
                
                {/* Formula Text */}
                <div className={`text-2xl md:text-4xl font-display font-light leading-relaxed transition-opacity duration-700 ${phase === 1 ? 'opacity-50' : 'opacity-100'}`}>
                  "{renderFormula(currentData.formula)}"
                </div>

                {/* Phase 0 Controls (Play / Go to Record) */}
                {phase === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center space-y-6"
                  >
                    <button 
                      onClick={handlePlayAudio}
                      className={`flex items-center space-x-3 px-6 py-3 rounded-full transition-all duration-300 ${
                        isPlaying 
                          ? 'bg-sage text-white shadow-md shadow-sage/30 scale-95' 
                          : 'bg-sand/50 text-slate-dark hover:bg-sand'
                      }`}
                    >
                      {isPlaying ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 ml-1" />}
                      <span className="font-medium">{isPlaying ? 'Слухаємо...' : 'Прослухати'}</span>
                    </button>

                    <button 
                      onClick={() => setPhase(1)}
                      className="text-slate-muted hover:text-sage flex items-center space-x-2 transition-colors duration-300 text-sm font-medium tracking-wide"
                    >
                      <span>Перейти до вимови</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {/* Phase 1 Controls (Record) */}
                {phase === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center space-y-6 relative"
                  >
                    <button 
                      onClick={handleToggleRecord}
                      className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 z-10 ${
                        isRecording 
                          ? 'bg-red-50 text-red-400 hover:bg-red-100' 
                          : 'bg-sage text-white shadow-lg shadow-sage/40 hover:scale-105'
                      }`}
                    >
                      {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                    </button>
                    
                    <p className={`text-sm font-medium transition-opacity duration-500 ${isRecording ? 'text-sage animate-pulse' : 'text-slate-muted'}`}>
                      {isRecording ? 'Глибокий вдих. Вимовляй спокійно...' : 'Натисни, щоб почати'}
                    </p>

                    {transcript && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-sand/30 rounded-2xl text-slate-dark text-lg font-medium w-full max-w-sm text-center min-h-[60px] flex items-center justify-center border border-sand/50"
                      >
                        {transcript}
                      </motion.div>
                    )}

                    {speechError && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex flex-col items-center space-y-2 text-red-500 text-sm max-w-sm text-center"
                      >
                        <AlertCircle className="w-5 h-5 opacity-80" />
                        <span>{speechError}</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Phase 2: Debug (Feedback) */}
            {!isFinished && phase === 2 && (
              <motion.div 
                key="debug"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center space-y-10 w-full"
              >
                <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-sage" />
                </div>
                
                <div className="space-y-6 w-full">
                  <h3 className="text-lg font-medium text-slate-muted tracking-wide uppercase text-xs">AI Дебаггінг</h3>
                  
                  {/* Analysis Diff */}
                  {analysisResult ? (
                    <div className="text-2xl md:text-3xl font-display font-light leading-relaxed max-w-lg mx-auto text-slate-dark">
                      {analysisResult.diff.map((item, idx) => (
                        <span 
                          key={idx} 
                          className={`mx-1 transition-colors duration-500 ${item.missing ? 'text-red-400 font-medium bg-red-50/50 px-1 rounded' : ''}`}
                        >
                          {item.word}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xl font-display font-light leading-relaxed max-w-lg mx-auto text-slate-dark">
                      Аналізуємо...
                    </p>
                  )}

                  <p className="text-lg max-w-lg mx-auto text-slate-muted">
                    {analysisResult ? analysisResult.feedback : currentData.feedback}
                  </p>
                </div>

                <button 
                  onClick={handleNextCycle}
                  className="mt-8 flex items-center space-x-3 px-8 py-4 bg-slate-dark text-ivory rounded-full hover:bg-slate-muted transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span className="font-medium tracking-wide">Наступний мікро-цикл</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-10 text-slate-muted/50 text-sm font-medium">
        Focus Mode • No Timers
      </div>
    </div>
  );
}
