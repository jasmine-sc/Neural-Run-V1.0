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
  AlertCircle,
} from "lucide-react";

interface TMControllerProps {
  onActionTriggered: (action: "jump" | "crouch" | "idle") => void;
}

// Default simulation class labels
const INITIAL_CLASSES = ["Idle Background", "Arms Up (Jump)", "Ducking (Crouch)"];

export const TMController: React.FC<TMControllerProps> = ({ onActionTriggered }) => {
  const [modelUrl, setModelUrl] = useState<string>(() => {
    const saved = localStorage.getItem("tm_model_url");
    if (!saved) {
      return "/model/";
    }
    const oldUrls = [
      "https://teachablemachine.withgoogle.com/models/m3b4l0u4r/",
      "https://teachablemachine.withgoogle.com/models/p_CDW2Zrr/",
      "https://teachablemachine.withgoogle.com/models/ysnpud50xC/"
    ];
    if (oldUrls.includes(saved)) {
      return "/model/";
    }
    return saved;
  });
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const predictionLoopRef = useRef<number | null>(null);
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

  // Dynamically inject TF.js + TM Image scripts from CDN (avoids npm peer dep conflicts)
  const loadTeachableMachineScripts = async (): Promise<boolean> => {
    if ((window as any).tmImage && (window as any).tf) return true;
    try {
      await injectScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js");
      await injectScript("https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js");
      return true;
    } catch (e: any) {
      setErrorMessage("Failed to load TF.js from CDN. Check your internet connection.");
      console.error(e);
      return false;
    }
  };

  const injectScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(s);
    });

  // Handle Model Loading
  const handleLoadModel = async () => {
    console.log("🔍 Starting model load...");

    let resolvedUrl = modelUrl.trim();
    if (resolvedUrl.startsWith("/")) {
      resolvedUrl = `${window.location.origin}${resolvedUrl}`;
    }
    const cleanUrl = resolvedUrl.endsWith("/") ? resolvedUrl : `${resolvedUrl}/`;
    console.log("🔍 Loading from:", cleanUrl);

    setIsLoadingModel(true);
    setErrorMessage(null);

    try {
      // 1. Load CDN scripts
      const ok = await loadTeachableMachineScripts();
      if (!ok) { setIsLoadingModel(false); return; }

      // 2. Verify model files exist
      const modelRes = await fetch(`${cleanUrl}model.json`);
      if (!modelRes.ok) throw new Error(`model.json not found at ${cleanUrl} (${modelRes.status})`);
      const metaRes = await fetch(`${cleanUrl}metadata.json`);
      if (!metaRes.ok) throw new Error(`metadata.json not found at ${cleanUrl} (${metaRes.status})`);

      // 3. Stop any running webcam
      stopWebcam();

      // 4. Load model via tmImage global
      const tmImageLib = (window as any).tmImage;
      if (!tmImageLib) throw new Error("Teachable Machine library not available.");

      const model = await tmImageLib.load(`${cleanUrl}model.json`, `${cleanUrl}metadata.json`);
      modelInstanceRef.current = model;

      const labels: string[] = model.getClassLabels();
      console.log("📊 Model labels:", labels);
      setAvailableClasses(labels);

      // Auto-map labels
      const jumpMatch = labels.find((l) => {
        const low = l.toLowerCase();
        return low.includes("jump") || low.includes("up") || low.includes("happy") || low.includes("arms");
      }) ?? labels[1] ?? labels[0];

      const crouchMatch = labels.find((l) => {
        const low = l.toLowerCase();
        return low.includes("crouch") || low.includes("down") || low.includes("duck") || low.includes("sad");
      }) ?? labels[2] ?? labels[0];

      const idleMatch = labels.find((l) =>
        l !== jumpMatch && l !== crouchMatch
      ) ?? labels[0];

      saveMappings({ ...mappings, jumpClass: jumpMatch, crouchClass: crouchMatch, idleClass: idleMatch });

      setModelLoaded(true);
      setIsSimulatorActive(false);
      localStorage.setItem("tm_model_url", modelUrl);
      console.log("✅ Model loaded! Labels:", labels);

    } catch (e: any) {
      console.error("❌ Model load error:", e);
      setErrorMessage(`Could not load model: ${e.message || "Unknown error"}`);
      setModelLoaded(false);
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Auto-load model on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLoadModel();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Retry loading
  const retryLoadModel = () => {
    handleLoadModel();
  };

  // Start Webcam using getUserMedia directly
  const startWebcam = async () => {
    if (!modelLoaded || !modelInstanceRef.current) {
      setErrorMessage("Please load a Teachable Machine model first!");
      return;
    }

    setErrorMessage(null);

    try {
      // Create video element
      const video = document.createElement('video');
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      video.srcObject = stream;
      await video.play();

      videoRef.current = video;

      // Create canvas for predictions
      const canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      canvas.style.display = 'none';
      canvasRef.current = canvas;

      // Add video to container
      if (webcamContainerRef.current) {
        webcamContainerRef.current.innerHTML = '';
        webcamContainerRef.current.appendChild(video);
      }

      setIsCamStarted(true);
      console.log("📷 Camera started successfully!");

      // Start prediction loop
      runPredictionLoop();

    } catch (e: any) {
      console.error("❌ Camera error:", e);

      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMessage("Camera access denied. Please allow camera access in your browser settings.");
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setErrorMessage("No camera found. Please connect a webcam.");
      } else {
        setErrorMessage(`Could not start webcam: ${e.message || "Unknown error"}`);
      }

      setIsCamStarted(false);
    }
  };

  // Main prediction loop — draws video frame to canvas then predicts
  const runPredictionLoop = () => {
    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const model = modelInstanceRef.current;

      if (video && canvas && model) {
        try {
          const ctx = canvas.getContext("2d");
          if (ctx && video.readyState >= video.HAVE_CURRENT_DATA) {
            ctx.drawImage(video, 0, 0, 224, 224);
            const preds: TMPrediction[] = await model.predict(canvas);
            setPredictions(preds);
            evaluatePredictions(preds);
          }
        } catch (e) {
          console.error("Prediction error:", e);
        }
        predictionLoopRef.current = requestAnimationFrame(loop);
      }
    };
    predictionLoopRef.current = requestAnimationFrame(loop);
  };

  // Map probabilities to runner states
  const evaluatePredictions = (preds: TMPrediction[]) => {
    if (preds.length === 0) return;

    const jumpPred = preds.find(p => p.className === mappings.jumpClass);
    const crouchPred = preds.find(p => p.className === mappings.crouchClass);

    const jumpProb = jumpPred ? jumpPred.probability : 0;
    const crouchProb = crouchPred ? crouchPred.probability : 0;

    let targetAction: "jump" | "crouch" | "idle" = "idle";

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

    // Stop all tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
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

  // Keyboard binding
  useEffect(() => {
    if (!isSimulatorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
          <span className={`text-[9px] uppercase font-bold py-1 px-2.5 border border-black flex items-center gap-1.5 ${isSimulatorActive
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
              <button
                onClick={retryLoadModel}
                className="mt-2 px-3 py-1 bg-black text-white text-[9px] font-mono uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                Retry Loading
              </button>
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
              type="text"
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
              placeholder="/model/ or https://teachablemachine.withgoogle.com/models/..."
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
            <Info className="w-3 h-3 text-gray-700" />
            Model URL must contain TensorFlowJS classifications. For local models use: <span className="bg-gray-200 px-1 py-0.5 font-bold">/model/</span>
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
                {availableClasses.map((lbl) => (
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
                {availableClasses.map((lbl) => (
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
                {availableClasses.map((lbl) => (
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
        <div className="relative w-[160px] h-[160px] border-2 border-black bg-black flex items-center justify-center shrink-0 overflow-hidden">
          {/* Webcam dynamic mount point */}
          <div
            ref={webcamContainerRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Webcam activation switches representation */}
          {!isCamStarted ? (
            <button
              onClick={startWebcam}
              disabled={!modelLoaded && !isSimulatorActive}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group bg-black/80 text-white z-10"
              id="start_cam_btn"
            >
              <Camera className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-center px-2 font-mono font-bold tracking-wider uppercase">Start Camera</span>
            </button>
          ) : (
            <button
              onClick={stopWebcam}
              className="absolute bottom-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none cursor-pointer transition-colors z-10 border-2 border-white"
              title="Stop Webcam"
              id="stop_cam_btn"
            >
              <CameraOff className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Realtime Classification Progress Bars */}
        <div className="flex-1 w-full space-y-2.5">
          <div className="text-[9px] font-mono uppercase font-black text-gray-900 tracking-wider">GESTURE PREDICT INDICES:</div>

          {availableClasses.map((className) => {
            const pred = predictions.find((p) => p.className === className);
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
                  <span className={prob >= mappings.confidenceThreshold ? "text-black font-black" : "text-gray-500 font-mono"}>
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

      {/* Manual Virtual Emulator controls */}
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