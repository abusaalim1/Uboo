import React, { useEffect, useRef } from 'react';
import { AssistantStatus } from '../types';

interface AudioVisualizerProps {
  status: AssistantStatus;
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  mode?: 'orb' | 'waves' | 'bars';
  onOrbClick?: () => void;
  isMicActive?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  status,
  inputAnalyser,
  outputAnalyser,
  mode = 'orb',
  onOrbClick,
  isMicActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);

    const inputDataArray = new Uint8Array(128);
    const outputDataArray = new Uint8Array(128);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      phaseRef.current += 0.04;
      const phase = phaseRef.current;

      // Get audio data
      let inputVolume = 0;
      let outputVolume = 0;

      if (inputAnalyser) {
        inputAnalyser.getByteFrequencyData(inputDataArray);
        const sum = inputDataArray.reduce((acc, val) => acc + val, 0);
        inputVolume = sum / inputDataArray.length / 255;
      }

      if (outputAnalyser) {
        outputAnalyser.getByteFrequencyData(outputDataArray);
        const sum = outputDataArray.reduce((acc, val) => acc + val, 0);
        outputVolume = sum / outputDataArray.length / 255;
      }

      const activeVolume = status === 'speaking' ? outputVolume : inputVolume;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.22;

      // Color Palette based on state
      let primaryColor = 'rgba(99, 102, 241, '; // Indigo
      let secondaryColor = 'rgba(168, 85, 247, '; // Purple
      let glowColor = 'rgba(129, 140, 248, 0.4)';

      if (status === 'listening') {
        primaryColor = 'rgba(6, 182, 212, '; // Cyan
        secondaryColor = 'rgba(59, 130, 246, '; // Blue
        glowColor = 'rgba(6, 182, 212, 0.5)';
      } else if (status === 'thinking') {
        primaryColor = 'rgba(234, 179, 8, '; // Amber
        secondaryColor = 'rgba(249, 115, 22, '; // Orange
        glowColor = 'rgba(234, 179, 8, 0.4)';
      } else if (status === 'speaking') {
        primaryColor = 'rgba(168, 85, 247, '; // Purple
        secondaryColor = 'rgba(236, 72, 153, '; // Pink
        glowColor = 'rgba(217, 70, 239, 0.5)';
      } else if (status === 'error') {
        primaryColor = 'rgba(239, 68, 68, '; // Red
        secondaryColor = 'rgba(244, 63, 94, '; // Rose
        glowColor = 'rgba(239, 68, 68, 0.4)';
      }

      // Draw background ambient halo
      const ambientRadius = baseRadius * (1.4 + activeVolume * 0.9);
      const ambientGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        ambientRadius
      );
      ambientGrad.addColorStop(0, primaryColor + '0.25)');
      ambientGrad.addColorStop(0.6, secondaryColor + '0.08)');
      ambientGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ambientRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw reactive concentric soundwave ripples
      const rippleCount = 3;
      for (let r = 1; r <= rippleCount; r++) {
        const rippleScale = 1 + (r * 0.28) + (activeVolume * 0.4 * r) + Math.sin(phase * 1.5 + r) * 0.05;
        const currentRadius = baseRadius * rippleScale;
        const alpha = Math.max(0, 0.35 - r * 0.09 + activeVolume * 0.2);

        ctx.strokeStyle = primaryColor + `${alpha})`;
        ctx.lineWidth = 1.5 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw frequency particles / waveforms surrounding the core
      const pointCount = 64;
      ctx.beginPath();
      for (let i = 0; i <= pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2;
        const dataIdx = i % (status === 'speaking' ? outputDataArray.length : inputDataArray.length);
        const freqVal = (status === 'speaking' ? outputDataArray[dataIdx] : inputDataArray[dataIdx]) || 0;
        const normalizedFreq = freqVal / 255;

        const wobble = Math.sin(angle * 5 + phase * 2) * (4 + activeVolume * 22);
        const freqOffset = normalizedFreq * baseRadius * 0.5;
        const currentR = baseRadius + wobble + freqOffset;

        const x = centerX + Math.cos(angle) * currentR;
        const y = centerY + Math.sin(angle) * currentR;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      const waveGrad = ctx.createLinearGradient(
        centerX - baseRadius,
        centerY - baseRadius,
        centerX + baseRadius,
        centerY + baseRadius
      );
      waveGrad.addColorStop(0, primaryColor + '0.85)');
      waveGrad.addColorStop(1, secondaryColor + '0.85)');

      ctx.fillStyle = waveGrad;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 24 * window.devicePixelRatio;
      ctx.fill();

      // Reset shadow for inner core
      ctx.shadowBlur = 0;

      // Draw inner core gradient sphere
      const innerRadius = baseRadius * (0.82 + Math.sin(phase * 3) * 0.03 + activeVolume * 0.15);
      const innerGrad = ctx.createRadialGradient(
        centerX - innerRadius * 0.3,
        centerY - innerRadius * 0.3,
        innerRadius * 0.1,
        centerX,
        centerY,
        innerRadius
      );
      innerGrad.addColorStop(0, '#ffffff');
      innerGrad.addColorStop(0.3, primaryColor + '0.9)');
      innerGrad.addColorStop(0.8, secondaryColor + '0.95)');
      innerGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw inner dynamic audio equalizer ring
      const numBars = 28;
      ctx.lineWidth = 2.5 * window.devicePixelRatio;
      for (let b = 0; b < numBars; b++) {
        const bAngle = (b / numBars) * Math.PI * 2 + phase * 0.5;
        const rawVal = (status === 'speaking' ? outputDataArray[b * 2] : inputDataArray[b * 2]) || 0;
        const barHeight = 4 + (rawVal / 255) * (baseRadius * 0.45);

        const x1 = centerX + Math.cos(bAngle) * (innerRadius * 0.5);
        const y1 = centerY + Math.sin(bAngle) * (innerRadius * 0.5);
        const x2 = centerX + Math.cos(bAngle) * (innerRadius * 0.5 + barHeight);
        const y2 = centerY + Math.sin(bAngle) * (innerRadius * 0.5 + barHeight);

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + (rawVal / 255) * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, inputAnalyser, outputAnalyser]);

  const getStatusLabel = () => {
    switch (status) {
      case 'listening':
        return 'Listening to you...';
      case 'thinking':
        return 'Gemini is thinking...';
      case 'speaking':
        return 'Gemini is speaking...';
      case 'connecting':
        return 'Connecting audio stream...';
      case 'error':
        return 'Audio connection issue';
      default:
        return isMicActive ? 'Ready (Listening)' : 'Click to start conversation';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'listening':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'thinking':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'speaking':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'connecting':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'error':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800/60 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <div id="visualizer-container" className="relative flex flex-col items-center justify-center w-full py-4 select-none">
      <div
        onClick={onOrbClick}
        className="relative w-64 h-64 sm:w-72 sm:h-72 cursor-pointer group transition-transform active:scale-95 duration-200"
        title={isMicActive ? 'Click to pause mic' : 'Click to start voice conversation'}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />

        {/* Center state overlay icon on hover or idle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-950/40 backdrop-blur-xs border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-semibold text-white tracking-wider">
              {isMicActive ? 'PAUSE' : 'START'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Status Indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge()} transition-colors duration-300`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'speaking'
                ? 'bg-purple-400 animate-ping'
                : status === 'listening'
                ? 'bg-cyan-400 animate-pulse'
                : status === 'thinking'
                ? 'bg-amber-400 animate-bounce'
                : status === 'error'
                ? 'bg-rose-400'
                : isMicActive
                ? 'bg-emerald-400'
                : 'bg-slate-500'
            }`}
          />
          <span>{getStatusLabel()}</span>
        </div>
      </div>
    </div>
  );
};
