import React, { useState, useEffect, useRef } from "react";
import { TMMapping, TMPrediction } from "../types.ts";
import { 
  Camera, 
  CameraOff, 
  Link2, 
  Sliders, 
  Play, 
  Info, 
  Tv, 
  RefreshCcw, 
  HelpCircle,
  AlertCircle,
  CheckCircle,
  HelpCircle as QuestionIcon
} from "lucide-react";

interface TMControllerProps {
  onActionTriggered: (action: "jump" | "crouch" | "idle") => void;
}

// Default simulation class labels
const INITIAL_CLASSES = ["Idle Background", "Arms Up (Jump)", "Ducking (Crouch)"];

export const TMController: React.FC<TMControllerProps> = ({ onActionTriggered }) => {
  // Model Setup State
  const [modelUrl, setModelUrl] = useState<string>(
    localStorage.getItem("tm_model_url") || "https://teachablemachine.withgoogle.com/models/m3b4l0u4r/"
  );
  const [isScriptsLoaded, setIsScriptsLoaded] = useState<boolean>(false);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [modelType, setModelType] = useState<"image" | "pose">("image");
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Webcam & Loop State
  const [isCamStarted, setIsCamStarted] = useState<boolean>(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>(INITIAL_CLASSES);
  const [predictions, setPredictions] = useState<TMPrediction[]>([]);
  const [detectedAction, setDetectedAction] = useState<"jump" | "crouch" | "idle">("idle");
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(true);

  // Mappings
  const [mappings, setMappings] = useState<TMMapping>({
    jumpClass: INITIAL_CLASSES[1], 
    crouchClass: INITIAL_CLASSES[2],
    idleClass: INITIAL_CLASSES[0],
    confidenceThreshold: 0.82
  });

  // Dynamic Elements Refs
  const webcamContainerRef = useRef<HTMLDivElement>(null);
  const predictionLoopRef = useRef<number | null>(null);
  const webcamInstanceRef = useRef<any>(null);
  const modelInstanceRef = useRef<any>(null);

  // Load Saved parameters
  useEffect(() => {
    const savedJump = localStorage.getItem("tm_map_jump");
    const savedCrouch = localStorage.getItem("tm_map_crouch");
    const savedIdle = localStorage.getItem("tm_map_idle");
    const savedThresh = localStorage.getItem("tm_map_thresh");

    if (savedJump || savedCrouch || savedIdle || savedThresh) {
      setMappings({
        jumpClass: savedJump || INITIAL_CLASSES[1],
        crouchClass: savedCrouch || INITIAL_CLASSES[2],
        idleClass: savedIdle || INITIAL_CLASSES[0],
        confidenceThreshold: savedThresh ? parseFloat(savedThresh) : 0.82
      });
    }
  }, []);

  // Save changes locally
  const saveMappings = (updated: TMMapping) => {
    setMappings(updated);
    localStorage.setItem("tm_map_jump", updated.jumpClass);
    localStorage.setItem("tm_map_crouch", updated.crouchClass);
    localStorage.setItem("tm_map_idle", updated.idleClass);
    localStorage.setItem("tm_map_thresh", updated.confidenceThreshold.toString());
  };

  // Helper code to dynamically inject External Teachable Machine Scripts
  // This completely eliminates React 19 / Vite bundler compatibility conflicts.
  const loadTeachableMachineScripts = async (): Promise<boolean> => {
    if ((window as any).tmImage && (window as any).tf) {
      setIsScriptsLoaded(true);
      return true;
    }

    try {
      setErrorMessage(null);
      // Load TFJS first
      await injectScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js");
      // Load TM Image next
      await injectScript("https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.3/dist/teachablemachine-image.min.js");
      
      setIsScriptsLoaded(true);
      return true;
    } catch (e: any) {
      setErrorMessage("Network failed to retrieve TensorFlow CDN. Keep using manual simulator panels.");
      console.error(e);
      return false;
    }
  };

  const injectScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load dependency: ${src}`));
      document.head.appendChild(script);
    });
  };

  // Handle Model Loading
  const handleLoadModel = async () => {
    if (!modelUrl.trim()) {
      setErrorMessage("Please enter a valid Teachable Machine Model URL");
      return;
    }

    const cleanUrl = modelUrl.trim().endsWith("/") ? modelUrl.trim() : `${modelUrl.trim()}/`;
    setIsLoadingModel(true);
    setErrorMessage(null);

    try {
      // 1. Ensure scripts are fully loaded
      const ok = await loadTeachableMachineScripts();
      if (!ok) {
        setIsLoadingModel(false);
        return;
      }

      // 2. Clear old state
      stopWebcam();

      // 3. Request TM to load model
      const modelJsonURL = `${cleanUrl}model.json`;
      const metadataJsonURL = `${cleanUrl}metadata.json`;
      
      const tmImage = (window as any).tmImage;
      if (!tmImage) {
        throw new Error("Teachable Machine library not present in global namespace.");
      }

      const model = await tmImage.load(modelJsonURL, metadataJsonURL);
      modelInstanceRef.current = model;

      // 4. Retrieve categories
      const labels = model.getClassLabels();
      setAvailableClasses(labels);
      
      // Attempt smart auto-prediction matches!
      const jumpMatch = labels.find((l: string) => l.toLowerCase().includes("jump") || l.toLowerCase().includes("up")) || labels[1] || labels[0];
      const crouchMatch = labels.find((l: string) => l.toLowerCase().includes("crouch") || l.toLowerCase().includes("down") || l.toLowerCase().includes("duck")) || labels[2] || labels[0];
      const idleMatch = labels.find((l: string) => l.toLowerCase().includes("idle") || l.toLowerCase().includes("bac") || l.toLowerCase().includes("normal")) || labels[0];

      const newMaps = {
        ...mappings,
        jumpClass: jumpMatch,
        crouchClass: crouchMatch,
        idleClass: idleMatch
      };
      saveMappings(newMaps);

      setModelLoaded(true);
      setIsSimulatorActive(false); // prompt them with webcam since they have a real model
      localStorage.setItem("tm_model_url", modelUrl);
    } catch (e: any) {
      console.error(e);
      setErrorMessage("Could not load model files. Verify the URL is correct and public on Teachable Machine.");
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Start Webcam and classification loop
  const startWebcam = async () => {
    if (!modelLoaded || !modelInstanceRef.current) {
      setErrorMessage("Please load a Teachable Machine model first!");
      return;
    }

    setErrorMessage(null);
    setIsCamStarted(true);

    try {
      const tmImage = (window as any).tmImage;
      const size = 180;
      
      // Create new webcam wrapper instance
      const webcam = new tmImage.Webcam(size, size, true); // width, height, flip active
      await webcam.setup(); // prompt permissions
      await webcam.play();
      webcamInstanceRef.current = webcam;

      // Append standard canvas inside container
      if (webcamContainerRef.current) {
        webcamContainerRef.current.innerHTML = "";
        webcamContainerRef.current.appendChild(webcam.canvas);
      }

      // Enter classification update loop!
      runPredictionLoop();
    } catch (e: any) {
      console.error(e);
      setErrorMessage("Could not start webcam camera inside this iFrame. Check browser permission blocks, or use the Simulator below.");
      setIsCamStarted(false);
    }
  };

  // Main camera polling classification loop
  const runPredictionLoop = () => {
    const loop = async () => {
      const webcam = webcamInstanceRef.current;
      const model = modelInstanceRef.current;

      if (webcam && model && isCamStarted) {
        webcam.update(); // read latest video feed
        
        // Predict
        const list: TMPrediction[] = await model.predict(webcam.canvas);
        setPredictions(list);

        // Map confidence outputs to jump/crouch action triggers
        evaluatePredictions(list);

        predictionLoopRef.current = requestAnimationFrame(loop);
      }
    };
    predictionLoopRef.current = requestAnimationFrame(loop);
  };

  // Map probabilities to runner states
  const evaluatePredictions = (preds: TMPrediction[]) => {
    if (preds.length === 0) return;

    // Retrieve active scores
    const jumpPred = preds.find(p => p.className === mappings.jumpClass);
    const crouchPred = preds.find(p => p.className === mappings.crouchClass);
    const idlePred = preds.find(p => p.className === mappings.idleClass);

    const jumpProb = jumpPred ? jumpPred.probability : 0;
    const crouchProb = crouchPred ? crouchPred.probability : 0;
    const idleProb = idlePred ? idlePred.probability : 0;

    let targetAction: "jump" | "crouch" | "idle" = "idle";

    // Trigger action only if probability exceeds custom confidence threshold
    if (jumpProb >= mappings.confidenceThreshold && jumpProb > crouchProb) {
      targetAction = "jump";
    } else if (crouchProb >= mappings.confidenceThreshold && crouchProb > jumpProb) {
      targetAction = "crouch";
    }

    if (targetAction !== detectedAction) {
      setDetectedAction(targetAction);
      onActionTriggered(targetAction);
    }
  };

  const stopWebcam = () => {
    setIsCamStarted(false);
    
    if (predictionLoopRef.current) {
      cancelAnimationFrame(predictionLoopRef.current);
      predictionLoopRef.current = null;
    }

    if (webcamInstanceRef.current) {
      try {
        webcamInstanceRef.current.stop();
      } catch (e) {}
      webcamInstanceRef.current = null;
    }

    if (webcamContainerRef.current) {
      webcamContainerRef.current.innerHTML = "";
    }
    setDetectedAction("idle");
    onActionTriggered("idle");
  };

  // Toggle active Emulator Simulator manual state
  const handleSimulateAction = (action: "jump" | "crouch" | "idle") => {
    setDetectedAction(action);
    onActionTriggered(action);

    // generate fake predictions to feed visual confidence indicators
    const simulatedPreds = availableClasses.map((className) => {
      let probability = 0.05;
      if (action === "jump" && className === mappings.jumpClass) probability = 0.98;
      else if (action === "crouch" && className === mappings.crouchClass) probability = 0.98;
      else if (action === "idle" && className === mappings.idleClass) probability = 0.98;
      else if (action === "idle" && className !== mappings.jumpClass && className !== mappings.crouchClass) probability = 0.6;

      return { className, probability };
    });
    setPredictions(simulatedPreds);
  };

  // Keyboard binding inside App to allow developers to trigger actions easily
  useEffect(() => {
    if (!isSimulatorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Simulate triggers if they are typing inside mapping input blocks
      if (document.activeElement?.tagName === "INPUT") return;

      if (e.code === "KeyW" || e.code === "KeyI") {
        handleSimulateAction("jump");
      } else if (e.code === "KeyS" || e.code === "KeyK") {
        handleSimulateAction("crouch");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.code === "KeyS" || e.code === "KeyK") {
        handleSimulateAction("idle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSimulatorActive, availableClasses, mappings]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col justify-between text-[#111111]" id="tm_controller_panel">
      {/* Top Banner and title */}
      <div>
        <div className="flex items-center justify-between gap-3 border-b-2 border-black pb-3.5 mb-5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-black shrink-0" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-black">WEB MODEL FEED</h2>
          </div>
          <span className={`text-[9px] uppercase font-bold py-1 px-2.5 border border-black flex items-center gap-1.5 ${
            isSimulatorActive 
              ? "bg-gray-100 text-gray-900" 
              : "bg-black text-white"
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {isSimulatorActive ? "SIMULATOR MANUAL" : "AI CAMERA ACTIVE"}
          </span>
        </div>
 
        {/* Dynamic Warning Alert Messages */}
        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold uppercase text-[10px] font-mono mb-0.5 tracking-wider">Warning Advisory:</p>
              <p className="text-red-800 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}
 
        {/* Model Link Setup */}
        <div className="mb-5 bg-gray-50 border-2 border-black p-4">
          <label className="block text-gray-900 text-xs font-mono font-bold uppercase mb-2 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-black" />
            <span>Teachable Machine Link:</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
              placeholder="https://teachablemachine.withgoogle.com/models/..."
              className="flex-1 min-w-0 bg-white border border-gray-350 focus:border-black px-3 py-1.5 text-xs text-black placeholder-gray-400 outline-none transition-all font-mono"
              id="tm_url_input"
            />
            <button
              onClick={handleLoadModel}
              disabled={isLoadingModel}
              className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white font-mono text-xs font-bold uppercase transition-colors rounded-none disabled:opacity-45 flex items-center gap-1.5 cursor-pointer border border-black"
              id="tm_load_btn"
            >
              {isLoadingModel ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>LOAD...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>SYNC</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
            <Info className="w-3 h-3 text-gray-700" /> Model URL must contain TensorFlowJS classifications.
          </p>
        </div>
 
        {/* Controller Action Mapper Panel */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-black" />
              <span>Input Mapping Calibration</span>
            </h3>
            <button 
              onClick={() => setIsSimulatorActive(!isSimulatorActive)}
              className="text-[9px] uppercase font-bold tracking-widest text-gray-500 hover:text-black underline cursor-pointer font-mono"
            >
              Set {isSimulatorActive ? "Camera Control" : "Sim Emulator"}
            </button>
          </div>
 
          <div className="space-y-3 bg-gray-50 border-2 border-black p-4">
            {/* Dynamic Jump mapping selector */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase font-mono font-bold text-gray-900">↑ JUMP Trigger:</span>
              <select
                value={mappings.jumpClass}
                onChange={(e) => saveMappings({ ...mappings, jumpClass: e.target.value })}
                className="bg-white border border-gray-350 focus:border-black px-2 py-1 text-xs text-black outline-none font-semibold w-44 rounded-none cursor-pointer"
                id="map_jump_select"
              >
                {availableClasses.map(lbl => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            </div>
 
            {/* Dynamic Crouch mapping selector */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase font-mono font-bold text-gray-900">↓ CROUCH Trigger:</span>
              <select
                value={mappings.crouchClass}
                onChange={(e) => saveMappings({ ...mappings, crouchClass: e.target.value })}
                className="bg-white border border-gray-350 focus:border-black px-2 py-1 text-xs text-black outline-none font-semibold w-44 rounded-none cursor-pointer"
                id="map_crouch_select"
              >
                {availableClasses.map(lbl => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            </div>
 
            {/* Dynamic Idle mapping selector */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase font-mono font-bold text-gray-500">O IDLE Background:</span>
              <select
                value={mappings.idleClass}
                onChange={(e) => saveMappings({ ...mappings, idleClass: e.target.value })}
                className="bg-white border border-gray-350 focus:border-black px-2 py-1 text-xs text-black outline-none font-semibold w-46 rounded-none cursor-pointer"
                id="map_idle_select"
              >
                {availableClasses.map(lbl => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            </div>
 
            {/* Confidence Threshold Slider */}
            <div className="pt-3 border-t border-gray-250">
              <div className="flex justify-between text-xs font-mono font-bold mb-1 uppercase tracking-wider text-gray-700">
                <span>Confidence Check Gate:</span>
                <span>{(mappings.confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.98"
                step="0.02"
                value={mappings.confidenceThreshold}
                onChange={(e) => saveMappings({ ...mappings, confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-black cursor-pointer h-1 bg-gray-200"
                id="sensitivity_slider"
              />
            </div>
          </div>
        </div>
      </div>
 
      {/* Camera Live Feed & Signal predictions indicator */}
      <div className="bg-gray-50 p-4 border-2 border-black flex flex-col md:flex-row items-center gap-4">
        {/* Play Webcam feed container */}
        <div className="relative w-[110px] h-[110px] border-2 border-dashed border-gray-400 rounded-none flex items-center justify-center shrink-0 overflow-hidden bg-white">
          {/* Webcam dynamic mount point */}
          <div ref={webcamContainerRef} className="absolute inset-0 w-full h-full [&>canvas]:object-cover [&>canvas]:w-full [&>canvas]:h-full" />
 
          {/* Webcam activation switches representation */}
          {!isCamStarted ? (
            <button
              onClick={startWebcam}
              disabled={!modelLoaded && !isSimulatorActive}
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group text-gray-500 hover:text-black font-sans"
              id="start_cam_btn"
            >
              <Camera className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
              <span className="text-[8px] text-center px-1 font-mono font-bold tracking-wider">START CAMERA</span>
            </button>
          ) : (
            <button
              onClick={stopWebcam}
              className="absolute bottom-1 right-1 p-1 bg-black hover:bg-gray-800 text-white rounded-none cursor-pointer transition-colors z-10 border border-black"
              title="Stop Webcam"
              id="stop_cam_btn"
            >
              <CameraOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
 
        {/* Realtime Classification Progress Bars */}
        <div className="flex-1 w-full space-y-2.5">
          <div className="text-[9px] font-mono uppercase font-black text-gray-900 tracking-wider">GESTURE PREDICT INDICES:</div>
          
          {availableClasses.map((className) => {
            const pred = predictions.find(p => p.className === className);
            const prob = pred ? pred.probability : 0.05;
            const percentage = prob * 100;
 
            let barColor = "bg-gray-400";
            if (className === mappings.jumpClass) barColor = "bg-emerald-600";
            else if (className === mappings.crouchClass) barColor = "bg-rose-500";
            else if (className === mappings.idleClass) barColor = "bg-gray-850";
 
            return (
              <div key={className} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono select-none">
                  <span className="text-gray-900 truncate max-w-28 font-semibold">
                    {className === mappings.jumpClass && "↑ "}
                    {className === mappings.crouchClass && "↓ "}
                    {className}
                  </span>
                  <span className={prob >= mappings.confidenceThreshold ? "text-black font-black font-monoUnder" : "text-gray-500 font-mono"}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-white border border-gray-350 h-2.5 overflow-hidden rounded-none">
                  <div 
                    className={`h-full transition-all duration-75 ${barColor}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
 
      {/* Manual Virtual Emulator controls (always active for fallback/testing) */}
      {isSimulatorActive && (
        <div className="mt-4 pt-3.5 border-t-2 border-black">
          <div className="bg-black text-white p-3.5 rounded-none border-2 border-black">
            <h4 className="text-[10px] text-white font-mono uppercase tracking-widest font-black mb-2 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>VIRTUAL SIM KEY CONTROLLER</span>
            </h4>
            <div className="flex gap-2">
              <button
                onMouseDown={() => handleSimulateAction("jump")}
                onMouseUp={() => handleSimulateAction("idle")}
                onTouchStart={() => handleSimulateAction("jump")}
                onTouchEnd={() => handleSimulateAction("idle")}
                className="flex-1 bg-white text-black hover:bg-gray-100 font-mono text-[9.5px] font-bold tracking-wider py-2 transition-all cursor-pointer rounded-none border border-white uppercase"
              >
                SIMULATE JUMP
              </button>
              <button
                onMouseDown={() => handleSimulateAction("crouch")}
                onMouseUp={() => handleSimulateAction("idle")}
                onTouchStart={() => handleSimulateAction("crouch")}
                onTouchEnd={() => handleSimulateAction("idle")}
                className="flex-1 bg-white text-black hover:bg-gray-100 font-mono text-[9.5px] font-bold tracking-wider py-2 transition-all cursor-pointer rounded-none border border-white uppercase"
              >
                SIMULATE CROUCH
              </button>
            </div>
            <p className="mt-2 text-[9px] text-gray-300 text-center font-mono leading-relaxed uppercase">
              Or keys: <span className="text-white font-black bg-gray-800 px-1 py-0.5 font-sans">W</span> (Jump) | <span className="text-white font-black bg-gray-800 px-1 py-0.5 font-sans">S</span> (Crouch - hold)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
