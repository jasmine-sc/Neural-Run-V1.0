import React, { useState } from "react";
import { RetroGame } from "./components/RetroGame.tsx";
import { TMController } from "./components/TMController.tsx";
import { GameStatus } from "./types.ts";
import { 
  Trophy, 
  ExternalLink, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Camera,
  Play
} from "lucide-react";

export default function App() {
  // Action state driven by Teachable Machine Output
  const [currentAction, setCurrentAction] = useState<"jump" | "crouch" | "idle">("idle");
  const [gameStatus, setGameStatus] = useState<GameStatus>("IDLE");
  
  // Scoring Sync
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem("retro_high_score") || "0", 10);
  });

  // Help Accordion State
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(true);

  const handleAction = (action: "jump" | "crouch" | "idle") => {
    setCurrentAction(action);
  };

  const handleStateUpdate = (scoreVal: number, coinsVal: number, gameOver: boolean) => {
    setScore(scoreVal);
    setCoins(coinsVal);
    
    if (scoreVal > highScore) {
      setHighScore(scoreVal);
    }
  };

  const handleStartGame = () => {
    setGameStatus("RUNNING");
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#111111] flex flex-col font-sans selection:bg-black selection:text-white pb-16">
      
      {/* Clean Minimalism Header - High Contrast Solid White */}
      <header className="h-16 px-6 md:px-8 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-retro text-xs select-none">
            8
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">NEURAL JUMPER</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h1 className="text-sm md:text-base font-bold tracking-tighter uppercase font-mono text-gray-900 leading-tight">
              NEURAL RUN v1.0
            </h1>
          </div>
        </div>

        {/* Header Right Segment - Flat scores trackers */}
        <div className="flex items-center gap-6 text-xs uppercase tracking-widest font-mono">
          <div className="hidden sm:block text-gray-500">
            HI <span className="font-bold text-gray-950">{String(highScore).padStart(5, "0")}</span>
          </div>
          <div className="text-gray-500">
            SCORE <span className="font-bold text-gray-950">{String(score).padStart(5, "0")}</span>
          </div>
          <a
            href="https://teachablemachine.withgoogle.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 bg-black text-white hover:bg-gray-800 text-[10px] font-bold px-3 py-1.5 uppercase transition-colors"
          >
            <span>TRAIN MODEL</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Retro Workspace Engine Container */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-start">
          <div className="bg-white border-2 border-black p-5 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between flex-1">
            
            {/* Context game settings & actions strip */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                  8-Bit Chrome Offline Platformer
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-lg">
                  Driven by real-time Teachable Machine outputs. Configure webcam controls on the right panel or use standard arrow keys.
                </p>
              </div>

              {gameStatus === "IDLE" && (
                <button
                  onClick={handleStartGame}
                  className="bg-black hover:bg-gray-800 text-white uppercase text-[10px] font-bold tracking-widest px-4 py-2 transition-colors flex items-center gap-2 cursor-pointer border border-black"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>START INSTANCE</span>
                </button>
              )}
            </div>

            {/* Canvas Core Segment Frame */}
            <div className="border-2 border-gray-300 p-1 bg-gray-50">
              <RetroGame 
                currentAction={currentAction}
                onStateUpdate={handleStateUpdate}
                gameStatus={gameStatus}
                setGameStatus={setGameStatus}
              />
            </div>

            {/* Interactive Instructions - Stark Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-gray-100 text-left">
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-900 uppercase font-black tracking-widest font-mono block">
                  01 // WEBCAM SYNC
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Toggle <strong>Start Camera</strong>. Model predictions capture user webcam frames asynchronously.
                </p>
              </div>
              <div className="space-y-1.5 border-t md:border-t-0 md:border-x border-gray-100 pt-4 md:pt-0 md:px-5">
                <span className="text-[10px] text-gray-900 uppercase font-black tracking-widest font-mono block">
                  02 // CALIBRATE OUTPUT
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Map target classifier names to game controls (Jump/Crouch) using dropdown selectors.
                </p>
              </div>
              <div className="space-y-1.5 border-t md:border-t-0 pt-4 md:pt-0">
                <span className="text-[10px] text-gray-900 uppercase font-black tracking-widest font-mono block">
                  03 // LEAP OBSTACLES
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Maintain the posture to avoid obstacles. Speed scales dynamically as your score runs high.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Simple TM Controllers */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-stretch">
          <TMController onActionTriggered={handleAction} />
        </div>

      </main>

      {/* Accordion Instructions Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 w-full">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden">
          <button 
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="w-full bg-white px-6 py-4.5 text-left flex items-center justify-between border-b-2 border-black cursor-pointer hover:bg-gray-50 transition-colors"
            id="help_guide_toggle_btn"
          >
            <div className="flex items-center gap-2 text-black font-mono text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>Training Manual: Google Teachable Machine Setup</span>
            </div>
            {isHelpOpen ? <ChevronUp className="w-4.5 h-4.5 text-black" /> : <ChevronDown className="w-4.5 h-4.5 text-black" />}
          </button>

          {isHelpOpen && (
            <div className="p-6 md:p-8 text-xs text-gray-650 space-y-6 leading-relaxed bg-white" id="help_guide_content">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Training Rules column */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-black uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>How to generate and import your custom model</span>
                  </h4>

                  <ol className="list-decimal pl-5 space-y-3.5 text-gray-650 text-xs">
                    <li>
                      Visit <a href="https://teachablemachine.withgoogle.com/" target="_blank" rel="noopener noreferrer" className="text-black font-semibold underline inline-flex items-center gap-0.5">Teachable Machine<ExternalLink className="w-3 h-3 inline ml-0.5 text-gray-400"/></a> and choose <strong>Pose Project</strong> (or Image Project).
                    </li>
                    <li>
                      Set up exactly three labels of gestures:
                      <ul className="list-disc pl-5 mt-1.5 space-y-1.5 text-gray-600 font-mono text-[11px]">
                        <li><span className="text-gray-900 font-bold">Idle State</span>: Sitting normal or backing away.</li>
                        <li><span className="text-emerald-600 font-bold">Jump Gesture</span>: Moving hands upwards.</li>
                        <li><span className="text-rose-600 font-bold">Crouch Gesture</span>: Ducks downwards/bending.</li>
                      </ul>
                    </li>
                    <li>
                      Train the model, choose <strong>Export Model</strong>, upload to Google's public host under <strong>TensorFlow.js (Upload model)</strong>.
                    </li>
                    <li>
                      Once the shareable URL is uploaded, copy and paste it into the <strong>SYNC URL</strong> input field on the right side!
                    </li>
                  </ol>
                </div>

                {/* Sandbox camera helper column */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-250 pt-6 md:pt-0 md:pl-8">
                  <h4 className="text-xs font-bold text-black uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-black" />
                    <span>Cross-Origin IFrame Camera Handling</span>
                  </h4>
                  
                  <div className="space-y-3.5 text-slate-650 text-xs leading-relaxed">
                    <p>
                      Web browsers frequently enforce strict sandboxing blockades inside embedded preview frames. If your camera throws an authorization error:
                    </p>
                    <div className="bg-gray-50 p-4 border border-gray-200 space-y-2.5">
                      <p className="font-bold text-gray-950 uppercase text-[10px] font-mono">troubleshooting steps:</p>
                      <ul className="list-disc pl-5 space-y-1.5 text-gray-600 text-[11px]">
                        <li>Click <strong>Open in New Tab</strong> on the header of AI Studio. Running on a direct domain instantly fixes all hardware permission blockers.</li>
                        <li>Toggle the <strong>Virtual Sim Key Controller</strong> switch options! Click the interactive simulation buttons or press <kbd className="bg-white border border-gray-300 text-gray-800 px-1 py-0.5 rounded font-mono font-bold">W</kbd> and <kbd className="bg-white border border-gray-300 text-gray-800 px-1 py-0.5 rounded font-mono font-bold">S</kbd> to simulate gestures without code.</li>
                      </ul>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                      All calibrated model links and local progress metrics are securely cached inside your local storage.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </section>

    </div>
  );
}

