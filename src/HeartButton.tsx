import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { generateRandomInt } from "./randomInt";

const particleCount = 50; // Each click produce 50 particles
const particleSpeed = 0.4; // 0.4 pixels per millisecond
const cleanupTime = 6500; // In millisecond

export const HeartButton: React.FC = () => {
  // All the canvas information stuff
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D>(null);
  const canvasSizeRef = useRef({
    width: 0,
    height: 0,
  });

  // This is for all particles starting at the center (relatively speaking because I didn't subtract half the size of the particle :P)
  const particleStartPosition = useRef({
    x: 0,
    y: 0,
  });

  // Particles
  type Particle = {
    createdAt: number;
    size: number;
    hue: number;
    cosAngle: number;
    sinAngle: number;
    distance: number;
    twinkleFrequency: number;
    twinkleStartTime: number; // Time when particle start to twinkle
    drag: number;
  };

  const particlesRef = useRef<Particle[]>([]);

  const addParticles = useCallback(() => {
    const now = performance.now();

    for (let i = 0; i < particleCount; i++) {
      const randomInt = generateRandomInt();
      particlesRef.current.push({
        createdAt: now,
        size: 4 + (randomInt & 3), // 4 + Math.round(Math.random() * 3)
        hue: randomInt % 360, // Math.round(Math.random()) % 360
        cosAngle: Math.cos(randomInt), // Math.cos(angle) (pre-calculate this to avoid calculate over and over again in the requestAnimationFrame)
        sinAngle: Math.sin(randomInt), // Math.cos(angle)
        distance: 0,
        twinkleFrequency: 8 + ((randomInt >> 3) & 3), // 8 + Math.round(Math.random() * 3)
        twinkleStartTime: now + 500 + (randomInt & 1023), // now + 500 + Math.round(Math.random() * 1023)
        drag: -0.00012 * (50 + (randomInt & 31)), // -0.00012 * (50 + Math.round(Math.random() * 31))
      });
    }
  }, []);

  // Draw
  const endAngle = Math.PI * 2; // Put it out there to only calculate once

  const lastTimestampRef = useRef<number>(performance.now());

  const _draw = useEffectEvent(() => {
    if (!canvasRef.current || !ctxRef.current) {
      setIsDrawing(false);
      return;
    }

    if (particlesRef.current.length === 0) {
      setIsDrawing(false);
      ctxRef.current.clearRect(
        0,
        0,
        canvasSizeRef.current.width,
        canvasSizeRef.current.height,
      );
      return;
    }

    const now = performance.now();
    const deltaTime = now - lastTimestampRef.current; // In millisecond
    lastTimestampRef.current = now;

    const deltaDistance = particleSpeed * deltaTime;

    ctxRef.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
    for (let i = 0; i < particlesRef.current.length; i++) {
      const particle = particlesRef.current[i];

      // Set distance
      const drag = Math.exp(particle.drag * deltaTime);
      particle.distance = (particle.distance + deltaDistance) * drag;

      // Convert angle and distance into (x, y) coordinate
      const x = particle.cosAngle * particle.distance;
      const y = particle.sinAngle * particle.distance;

      // Opacity
      let opacity = 1;
      const twinkleTime = (now - particle.twinkleStartTime) / 1000;
      if (twinkleTime > 0) {
        // Here's the twinkle function f(t) = (-1/4 * t + 1) * (cos(7 * t) / 2 + 0.5)
        // -1/4 * t as the "base" function to move downward toward 0
        // In order to for it to fluctuate, I go with the cosine function cos(7 * t) / 2 + 0.5
        // The / 2 + 0.5 is to make the cosine function to go between 0 and 1 instead of the -1 to 1 of the cosine function
        opacity =
          (-0.25 * twinkleTime + 1) *
          (Math.cos(particle.twinkleFrequency * twinkleTime) / 2 + 0.5);
      }

      console.log(opacity);

      ctxRef.current.beginPath();
      ctxRef.current.arc(
        particleStartPosition.current.x + x,
        particleStartPosition.current.y + y,
        particle.size,
        0,
        endAngle,
      );
      ctxRef.current.fillStyle = `hsl(${particle.hue}deg 55% 50% / ${opacity})`;
      ctxRef.current.fill();
    }

    window.requestAnimationFrame(_draw);
  });

  // Make sure only call draw one time
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const draw = useCallback(() => {
    if (isDrawing) return;
    if (particlesRef.current.length === 0) return;
    if (!ctxRef.current) return;

    setIsDrawing(true);
    _draw();
  }, [isDrawing]);

  // Cleanup particles
  useEffect(
    function periodicallyCleanParticles() {
      if (isDrawing) {
        const intervalId = window.setInterval(() => {
          particlesRef.current = particlesRef.current.filter(
            (particle) => performance.now() - particle.createdAt < cleanupTime,
          );
        }, cleanupTime);

        return () => clearInterval(intervalId);
      }
    },
    [isDrawing],
  );

  // Setup canvas
  useEffect(function setupCanvas() {
    if (!canvasRef.current) return;

    const dpr = window.devicePixelRatio;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    canvasRef.current.width = width * dpr;
    canvasRef.current.height = height * dpr;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    context.scale(dpr, dpr);

    ctxRef.current = context;
    canvasSizeRef.current = {
      width,
      height,
    };
    particleStartPosition.current = {
      x: width / 2,
      y: height / 2,
    };
  }, []);

  return (
    <div className="relative size-max flex flex-wrap items-center justify-center">
      <button
        type="button"
        className="relative z-10 group bg-white/5 hover:bg-white/10 backdrop-blur-xs rounded-full p-4 cursor-pointer duration-200"
        onClick={() => {
          addParticles();
          draw();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="#ff0000"
          stroke="#ff0000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="translate-y-0.5 group-hover:scale-115 group-active:scale-95 ease-in-out duration-200"
        >
          <title>Heart</title>
          <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
        </svg>
      </button>

      <canvas
        ref={canvasRef}
        className="absolute z-0 w-96 h-96 bg-transparent"
      />
    </div>
  );
};
