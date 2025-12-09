// @ts-nocheck
import React, { useMemo, useState, useEffect, useRef } from "react";
// ===== AI Music Utils =====
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

type KeyRoot = typeof NOTE_NAMES[number];
type Mode =
  | "major" | "minor"
  | "dorian" | "mixolydian" | "lydian" | "phrygian" | "locrian";

const MODE_INTERVALS = {
  major:[0,2,4,5,7,9,11],
  minor:[0,2,3,5,7,8,10],
  dorian:[0,2,3,5,7,9,10],
  mixolydian:[0,2,4,5,7,9,10],
  lydian:[0,2,4,6,7,9,11],
  phrygian:[0,1,3,5,7,8,10],
  locrian:[0,1,3,5,6,8,10],
};

const DEGREE_TO_ROMAN = ["I","II","III","IV","V","VI","VII"];
const PROG_PRESETS = [
  "I–V–vi–IV",
  "i–VI–III–VII",
  "I–vi–IV–V",
  "ii–V–I–I",
  "i–iv–VII–III",
];
// ===== AI GENRE PRESETS =====
type GenreKey =
  | "Trap" | "Drill" | "HipHop" | "LoFi" | "House" | "Techno" | "EDM" | "Pop";

const GENRE_PRESETS: Record<GenreKey, {
  bpm: number | [number, number];     // fixed or range
  key: KeyRoot;
  mode: Mode;
  chordPresets: string[];              // uses roman-numeral parser
  drums: { style: string; hatRate?: "16th"|"8th"|"32nd"; density?: number; };
  melody: { contour: "random"|"up"|"down"; followChords: boolean; density: number; };
  bass: { pattern: "quarters"|"half"|"8ths"; walk: number; octaveShift: number; };
  mixer: {
    drum: number; synth: number; master: number;
    pan: { drum: number; synth: number; };
    send: { drum: number; synth: number; };
    fx: { enabled: boolean; reverbMix: number; delayTime: number; delayFeedback: number; returnLevel: number; };
    limiterOn: boolean;
  };
}> = {
  Trap: {
    bpm: [132, 150],
    key: "D",
    mode: "minor",
    chordPresets: ["i–VI–III–VII", "i–iv–VII–III"],
    drums: { style: "Trap", hatRate: "16th", density: 0.7 },
    melody: { contour: "random", followChords: true, density: 0.55 },
    bass:   { pattern: "quarters", walk: 0.25, octaveShift: -12 },
    mixer: {
      drum: 0.85, synth: 0.8, master: 0.8,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.2, synth: 0.3 },
      fx: { enabled: true, reverbMix: 0.28, delayTime: 0.29, delayFeedback: 0.32, returnLevel: 0.6 },
      limiterOn: true,
    },
  },
  Drill: {
    bpm: [138, 146],
    key: "F#",
    mode: "minor",
    chordPresets: ["i–VI–III–VII"],
    drums: { style: "Trap", hatRate: "16th", density: 0.75 },
    melody: { contour: "down", followChords: true, density: 0.5 },
    bass:   { pattern: "quarters", walk: 0.2, octaveShift: -12 },
    mixer: {
      drum: 0.9, synth: 0.75, master: 0.8,
      pan: { drum: 0, synth: 0.05 },
      send: { drum: 0.15, synth: 0.25 },
      fx: { enabled: true, reverbMix: 0.22, delayTime: 0.26, delayFeedback: 0.28, returnLevel: 0.55 },
      limiterOn: true,
    },
  },
  HipHop: {
    bpm: [86, 96],
    key: "C",
    mode: "minor",
    chordPresets: ["i–VI–III–VII", "i–iv–VII–III"],
    drums: { style: "BoomBap", hatRate: "8th", density: 0.55 },
    melody: { contour: "random", followChords: true, density: 0.45 },
    bass:   { pattern: "quarters", walk: 0.3, octaveShift: -12 },
    mixer: {
      drum: 0.85, synth: 0.7, master: 0.82,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.18, synth: 0.22 },
      fx: { enabled: true, reverbMix: 0.18, delayTime: 0.28, delayFeedback: 0.24, returnLevel: 0.5 },
      limiterOn: true,
    },
  },
  LoFi: {
    bpm: [70, 84],
    key: "A",
    mode: "minor",
    chordPresets: ["i–VI–III–VII", "i–iv–VII–III", "ii–V–I–I"], // jazzy option too
    drums: { style: "LoFi", hatRate: "8th", density: 0.4 },
    melody: { contour: "down", followChords: true, density: 0.35 },
    bass:   { pattern: "half", walk: 0.15, octaveShift: -12 },
    mixer: {
      drum: 0.75, synth: 0.78, master: 0.8,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.25, synth: 0.35 },
      fx: { enabled: true, reverbMix: 0.38, delayTime: 0.32, delayFeedback: 0.22, returnLevel: 0.65 },
      limiterOn: false,
    },
  },
  House: {
    bpm: [120, 128],
    key: "F",
    mode: "major",
    chordPresets: ["I–vi–IV–V", "I–V–vi–IV"],
    drums: { style: "House", hatRate: "16th", density: 0.8 },
    melody: { contour: "up", followChords: true, density: 0.6 },
    bass:   { pattern: "8ths", walk: 0.2, octaveShift: -12 },
    mixer: {
      drum: 0.88, synth: 0.85, master: 0.82,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.22, synth: 0.38 },
      fx: { enabled: true, reverbMix: 0.32, delayTime: 0.27, delayFeedback: 0.3, returnLevel: 0.62 },
      limiterOn: true,
    },
  },
  Techno: {
    bpm: [128, 136],
    key: "D#",
    mode: "minor",
    chordPresets: ["i–VI–III–VII"],
    drums: { style: "Techno", hatRate: "16th", density: 0.9 },
    melody: { contour: "up", followChords: false, density: 0.35 },
    bass:   { pattern: "8ths", walk: 0.1, octaveShift: -12 },
    mixer: {
      drum: 0.92, synth: 0.8, master: 0.82,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.18, synth: 0.28 },
      fx: { enabled: true, reverbMix: 0.22, delayTime: 0.24, delayFeedback: 0.26, returnLevel: 0.5 },
      limiterOn: true,
    },
  },
  EDM: {
    bpm: [124, 132],
    key: "G",
    mode: "major",
    chordPresets: ["I–V–vi–IV", "I–vi–IV–V"],
    drums: { style: "EDM", hatRate: "16th", density: 0.85 },
    melody: { contour: "up", followChords: true, density: 0.6 },
    bass:   { pattern: "8ths", walk: 0.25, octaveShift: -12 },
    mixer: {
      drum: 0.9, synth: 0.88, master: 0.85,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.24, synth: 0.42 },
      fx: { enabled: true, reverbMix: 0.36, delayTime: 0.3, delayFeedback: 0.34, returnLevel: 0.7 },
      limiterOn: true,
    },
  },
  Pop: {
    bpm: [96, 116],
    key: "C",
    mode: "major",
    chordPresets: ["I–V–vi–IV", "I–vi–IV–V", "ii–V–I–I"],
    drums: { style: "Pop", hatRate: "8th", density: 0.65 },
    melody: { contour: "random", followChords: true, density: 0.55 },
    bass:   { pattern: "quarters", walk: 0.2, octaveShift: -12 },
    mixer: {
      drum: 0.85, synth: 0.8, master: 0.83,
      pan: { drum: 0, synth: 0 },
      send: { drum: 0.2, synth: 0.3 },
      fx: { enabled: true, reverbMix: 0.28, delayTime: 0.29, delayFeedback: 0.28, returnLevel: 0.6 },
      limiterOn: true,
    },
  },
};
// ===== Project Save/Load=====
type ProjectClipLite = {
  name: string;
  startCol: number;
  spanCols: number;
  gain: number;
  audioWavB64?: string;
};

type ProjectV1 = {
  version: 1;
  title: string;                     // NEW
  createdAtIso?: string;             // NEW
  thumbnailPngB64?: string;          // NEW
  bpm: number;
  pattern: boolean[][];
  piano: {
    rows: number;
    cols: number;
    grid: boolean[][];
    velocity: number[];
  };
  mixer: {
    drum: number; synth: number; master: number; limiterOn: boolean;
    pan: { drum: number; synth: number; };
    send: { drum: number; synth: number; };
    fx: { enabled: boolean; reverbMix: number; delayTime: number; delayFeedback: number; returnLevel: number; };
    mute: { drum: boolean; synth: boolean; };
    solo: { drum: boolean; synth: boolean; };
  };
  automation: {
    master: number[];
    drumSend: number[];
    synthSend: number[];
  };
  audioClips: ProjectClipLite[];
};

// tiny: dataURL -> base64 stripper
function stripDataUrlPrefix(dataUrl: string) {
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}
// generate a thumbnail PNG of current project state
async function generateProjectThumbnailPng(): Promise<string> {
  // duration = your whole 32-col grid, but cap to ~10s for safety
  const stepSec = 60 / store.bpm / 4;
  const totalCols = store.piano.cols;      // 32
  const duration = Math.min(10, totalCols * stepSec + 0.25);

  const sr = 22050; // low sample rate == faster
  const offline = new OfflineAudioContext(2, Math.ceil(duration * sr), sr);

  // --- minimal mixer (dry+fx a bit, limiter mild) ---
  const drumGain = offline.createGain();  drumGain.gain.value = store.mixer.drum;
  const synthGain= offline.createGain();  synthGain.gain.value = store.mixer.synth;
  const master   = offline.createGain();  master.gain.value   = store.mixer.master;

  // simple send reverb for vibe
  const sendDrum = offline.createGain(); sendDrum.gain.value = store.mixer.send.drum * 0.6;
  const sendSyn  = offline.createGain(); sendSyn.gain.value  = store.mixer.send.synth * 0.6;
  const fxRet    = offline.createGain(); fxRet.gain.value    = 0.5;
  const conv     = offline.createConvolver(); conv.buffer = createImpulseResponse(offline as any, 0.9, 2.0);

  drumGain.connect(master); synthGain.connect(master);
  drumGain.connect(sendDrum); synthGain.connect(sendSyn);
  sendDrum.connect(conv); sendSyn.connect(conv);
  conv.connect(fxRet); fxRet.connect(master);

  const limiter = offline.createDynamicsCompressor();
  limiter.threshold.value = -12; limiter.ratio.value = 8; limiter.attack.value = 0.005; limiter.release.value = 0.2;
  master.connect(limiter); limiter.connect(offline.destination);

  // --- scheduling helpers ---
  const scheduleKick = (t:number)=>{ const osc=offline.createOscillator(), g=offline.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(120,t); osc.frequency.exponentialRampToValueAtTime(40,t+0.12);
    g.gain.setValueAtTime(0.8,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.15); osc.connect(g).connect(drumGain); osc.start(t); osc.stop(t+0.16); };
  const scheduleSnare=(t:number)=>{ const b=offline.createBuffer(1,Math.floor(sr*0.2),sr),d=b.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1 - i/d.length,2);
    const src=offline.createBufferSource(); src.buffer=b; const hp=offline.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=900;
    const g=offline.createGain(); g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
    src.connect(hp).connect(g).connect(drumGain); src.start(t); src.stop(t+0.2); };
  const scheduleHat  =(t:number)=>{ const b=offline.createBuffer(1,Math.floor(sr*0.08),sr),d=b.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
    const src=offline.createBufferSource(); src.buffer=b; const hp=offline.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=8000;
    const g=offline.createGain(); g.gain.setValueAtTime(0.35,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
    src.connect(hp).connect(g).connect(drumGain); src.start(t); src.stop(t+0.08); };
  const midiToFreq = (m:number)=> 440 * Math.pow(2,(m-69)/12);
  const scheduleNote=(f:number,t:number,dur:number,vel:number)=>{ const o=offline.createOscillator(), g=offline.createGain();
    o.type="triangle"; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.001,t);
    g.gain.linearRampToValueAtTime(vel,t+0.01); g.gain.setTargetAtTime(0.0001,t+Math.max(0.05,dur*0.8),0.06); o.connect(g).connect(synthGain); o.start(t); o.stop(t+dur+0.2); };

  // drums across duration
  for (let s=0;s<16;s++){
    const step= s*stepSec;
    for (let t=step; t<duration; t+=16*stepSec){
      if (store.pattern[0][s]) scheduleKick(t);
      if (store.pattern[1][s]) scheduleSnare(t);
      if (store.pattern[2][s]) scheduleHat(t);
    }
  }
  // piano grid (single pass)
  for (let c=0;c<store.piano.cols;c++){
    const t=c*stepSec, dur=stepSec*0.95, vel=store.piano.velocity[c];
    for (let r=0;r<store.piano.rows;r++){
      if (store.piano.grid[r][c]){
        const m=72-r; scheduleNote(midiToFreq(m), t, dur, vel);
      }
    }
  }

  const buf = await offline.startRendering();

  // draw waveform thumbnail
  const W=320, H=120;
  const cnv = document.createElement("canvas");
  cnv.width=W; cnv.height=H;
  const ctx = cnv.getContext("2d")!;
  ctx.fillStyle = "#0b0f16"; ctx.fillRect(0,0,W,H);

  // grid
  ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1;
  for (let x=0;x<W;x+=32){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0;y<H;y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels>1 ? buf.getChannelData(1) : L;
  const samplesPerPx = Math.max(1, Math.floor(L.length / W));
  const mid = H*0.5, amp = H*0.35;

  // L (upper)
  ctx.strokeStyle="rgba(124,58,237,0.9)";
  ctx.beginPath();
  for (let x=0;x<W;x++){
    let min=1,max=-1; const start=x*samplesPerPx;
    for (let i=0;i<samplesPerPx && start+i<L.length;i++){ const v=L[start+i]; if (v<min) min=v; if (v>max) max=v; }
    ctx.moveTo(x, mid-amp + min*amp);
    ctx.lineTo(x, mid-amp + max*amp);
  }
  ctx.stroke();

  // R (lower)
  ctx.strokeStyle="rgba(34,211,238,0.9)";
  ctx.beginPath();
  for (let x=0;x<W;x++){
    let min=1,max=-1; const start=x*samplesPerPx;
    for (let i=0;i<samplesPerPx && start+i<R.length;i++){ const v=R[start+i]; if (v<min) min=v; if (v>max) max=v; }
    ctx.moveTo(x, mid+10 + min*amp*0.8);
    ctx.lineTo(x, mid+10 + max*amp*0.8);
  }
  ctx.stroke();

  // title text
  ctx.fillStyle="rgba(255,255,255,0.9)";
  ctx.font="600 12px ui-sans-serif,system-ui,Segoe UI,Roboto";
  ctx.fillText(store.projectTitle || "DAWn Project", 10, 16);
  ctx.fillStyle="rgba(255,255,255,0.6)";
  ctx.fillText(`${Math.round(store.bpm)} BPM`, 10, H-10);

  return cnv.toDataURL("image/png"); // data:image/png;base64,...
}

// util: blob -> base64
async function blobToBase64(b: Blob): Promise<string> {
  const buf = await b.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return buf;
}

async function saveProject(includeAudio = false) {
  // generate quick PNG thumbnail
  let thumbDataUrl = "";
  try { thumbDataUrl = await generateProjectThumbnailPng(); } catch {}

  const proj: ProjectV1 = {
    version: 1,
    title: store.projectTitle || "Untitled Project",
    createdAtIso: new Date().toISOString(),
    thumbnailPngB64: thumbDataUrl ? stripDataUrlPrefix(thumbDataUrl) : undefined,
    bpm: store.bpm,
    pattern: store.pattern.map(r => r.slice()),
    piano: {
      rows: store.piano.rows,
      cols: store.piano.cols,
      grid: store.piano.grid.map(r => r.slice()),
      velocity: store.piano.velocity.slice(),
    },
    mixer: JSON.parse(JSON.stringify(store.mixer)),
    automation: {
      master: store.automation.master.slice(),
      drumSend: store.automation.drumSend.slice(),
      synthSend: store.automation.synthSend.slice(),
    },
    audioClips: [],
  };

  for (const clip of store.audio.clips) {
    const entry: ProjectClipLite = {
      name: clip.name,
      startCol: clip.startCol,
      spanCols: clip.spanCols,
      gain: clip.gain,
    };
    if (includeAudio && clip.buffer) {
      entry.audioWavB64 = await audioBufferToBase64Wav(clip.buffer);
    }
    proj.audioClips.push(entry);
  }

  const blob = new Blob([JSON.stringify(proj)], { type: "application/json" });
  const safeTitle = (store.projectTitle || "DAWn_Project").replace(/[^\w\-]+/g, "_");
  downloadBlob(`${safeTitle}_${Date.now()}.dawnproject`, blob);
}

async function audioBufferToBase64Wav(buf: AudioBuffer): Promise<string> {
  const wavBlob = encodeWAVFromAudioBuffer(buf);
  return await blobToBase64(wavBlob);
}

// tiny helper
function pick<T>(arr: T[]|T): T {
  if (Array.isArray(arr)) return arr[Math.floor(Math.random()*arr.length)];
  return arr;
}

function noteIndex(name){ return NOTE_NAMES.indexOf(name) }

function degreeToMidi(degree,key,mode,oct=4){
  const sc = MODE_INTERVALS[mode];
  const octAdd = Math.floor((degree - 1)/7);
  const idx = (degree - 1) % 7;
  const root = 12 * (oct + 1) + noteIndex(key);
  return root + sc[idx] + 12*octAdd;
}

function chordFromDegree(deg,key,mode,vo="triad",oct=4){
  const third = deg + 2, fifth = deg + 4, seventh = deg + 6;
  const ns = [
    degreeToMidi(deg,key,mode,oct),
    degreeToMidi(third,key,mode,oct),
    degreeToMidi(fifth,key,mode,oct)
  ];
  if(vo==="7th") ns.push(degreeToMidi(seventh,key,mode,oct));
  return ns.sort((a,b)=>a-b);
}

function midiToRow(midi){ return 72 - midi } // fits your grid mapping

function generateAIChords(opts={}){
  const {
    key="C", mode="major", preset="I–V–vi–IV",
    voicing="triad", octave=4, density=.6, strum=true
  } = opts;

  // Clear piano
  for(let r=0;r<store.piano.rows;r++)
    for(let c=0;c<store.piano.cols;c++)
      store.piano.grid[r][c]=false;

  // Parse progression
  const degs = preset.split("–").map(tok=>{
    const t = tok.replace(/[^ivIV]+/g,"");
    const up = t.toUpperCase();
    return DEGREE_TO_ROMAN.indexOf(up)+1 || 1;
  });

  const span = Math.floor(store.piano.cols / degs.length);

  // Velocities
  for(let c=0;c<store.piano.velocity.length;c++){
    store.piano.velocity[c] = 0.7 + (Math.random()*0.2-0.1);
  }

  degs.forEach((deg,i)=>{
    const chord = chordFromDegree(deg,key,mode,voicing,octave);
    const start=i*span, end=start+span;

    for(let c=start; c<end; c++){
      if(Math.random() < density){
        chord.forEach((m,idx)=>{
          let row=midiToRow(m);
          if(row>=0 && row<store.piano.rows){
            let col = c + (strum?idx*1:0);
            if(col<end) store.piano.grid[row][col]=true;
          }
        });
      }
    }
  });

  store.notify();
}
async function loadProjectFromFile(file: File) {
  const text = await file.text();
  const data: ProjectV1 = JSON.parse(text);

  if (!data || data.version !== 1) {
    alert("Unsupported or corrupted project file.");
    return;
  }
store.projectTitle = data.title || "Untitled Project";
  store.projectThumbPngB64 = data.thumbnailPngB64 ? `data:image/png;base64,${data.thumbnailPngB64}` : undefined;

  // Core
  store.bpm = data.bpm;
  store.pattern = data.pattern.map(r => r.slice());
  store.piano.rows = data.piano.rows;
  store.piano.cols = data.piano.cols;
  store.piano.grid = data.piano.grid.map(r => r.slice());
  store.piano.velocity = data.piano.velocity.slice();

  // Mixer
  store.mixer = JSON.parse(JSON.stringify(data.mixer));
  // push to live graph
  engine.ensureCtx(); synth.ensureCtx();
  mixer.setLevel('drum',  store.mixer.drum);
  mixer.setLevel('synth', store.mixer.synth);
  mixer.setLevel('master',store.mixer.master);
  mixer.setPan('drum',  store.mixer.pan.drum);
  mixer.setPan('synth', store.mixer.pan.synth);
  mixer.setSend('drum',  store.mixer.send.drum);
  mixer.setSend('synth', store.mixer.send.synth);
  mixer.setFxEnabled(store.mixer.fx.enabled);
  mixer.setFxParams({
    reverbMix: store.mixer.fx.reverbMix,
    delayTime: store.mixer.fx.delayTime,
    delayFeedback: store.mixer.fx.delayFeedback,
    returnLevel: store.mixer.fx.returnLevel,
  });
  mixer.setLimiterEnabled(store.mixer.limiterOn);
  mixer.applyMuteSolo();

  // Automation
  store.automation.master    = data.automation.master.slice();
  store.automation.drumSend  = data.automation.drumSend.slice();
  store.automation.synthSend = data.automation.synthSend.slice();

  // Audio clips
  store.audio.clips.length = 0; // clear
  engine.ensureCtx();
  const ctx = (window as any).__dawnAudioCtx as AudioContext | undefined;

  for (const c of data.audioClips) {
    let buffer: AudioBuffer | undefined = undefined;
    if (c.audioWavB64 && ctx) {
      try {
        const arr = base64ToArrayBuffer(c.audioWavB64);
        // @ts-ignore safari types
        buffer = await ctx.decodeAudioData(arr);
      } catch (e) {
        console.warn("Failed to decode embedded audio, keeping placeholder:", e);
      }
    }

    store.audio.clips.push({
      id: __audioClipId++,
      name: c.name,
      buffer: buffer!,                  
      startCol: c.startCol,
      spanCols: c.spanCols,
      gain: c.gain,
    } as any);
  }

  store.notify();
}

// ===== AI Melody Generator =====
function generateAIMelody(opts: {
  key?: KeyRoot;
  mode?: Mode;
  contour?: "random" | "up" | "down";
  followChords?: boolean;
  density?: number;      
  spanRows?: number;    
} = {}) {
  const {
    key = "C",
    mode = "major",
    contour = "random",
    followChords = true,
    density = 0.55,
    spanRows = 6,       
  } = opts;

  const rows = store.piano.rows;
  const cols = store.piano.cols;

  // Clear only the top melody range (keep chords lower)
  for (let r = 0; r < Math.min(spanRows, rows); r++) {
    for (let c = 0; c < cols; c++) {
      store.piano.grid[r][c] = false;
    }
  }

  // Scale degrees (1..7) map to midi intervals
  const scale = MODE_INTERVALS[mode];
  if (!scale) return;

  // pick a starting degree
  let degree = 1 + Math.floor(Math.random() * 7); // 1..7
  // melodic octave for melody
  const MELO_OCT = 5;

  const stepDir = () => {
    if (contour === "up") return +1;
    if (contour === "down") return -1;
    // random walk
    return Math.random() < 0.5 ? +1 : -1;
  };

  const clampDegree = (d: number) => {
    while (d < 1) d += 7;
    while (d > 7) d -= 7;
    return d;
  };

  for (let c = 0; c < cols; c++) {
    if (Math.random() > density) continue;
    let preferChord = false;
    if (followChords) {
      // scan below melody lanes for chord notes at this column
      for (let r = spanRows; r < rows; r++) {
        if (store.piano.grid[r][c]) { preferChord = true; break; }
      }
    }

    if (preferChord) {
      // pick from chord-ish degrees
      const chordish = [1, 3, 5, 7];
      degree = chordish[Math.floor(Math.random() * chordish.length)];
    } else {
      // small random walk
      degree = clampDegree(degree + stepDir());
    }

    // make note
    const midi = degreeToMidi(degree, key, mode, MELO_OCT);
    const row = midiToRow(midi);

    // only top spanRows are melody lane
    if (row >= 0 && row < spanRows) {
      store.piano.grid[row][c] = true;

      // light humanized velocity
      const v = 0.6 + Math.random() * 0.35;
      if (c >= 0 && c < store.piano.velocity.length) {
        store.piano.velocity[c] = Math.min(1, Math.max(0.1, v));
      }
    }
  }

  store.notify();
}
// ===== AI Bassline from Chords =====
function generateAIBassline(opts: {
  key?: KeyRoot;
  mode?: Mode;
  useChords?: boolean;     
  pattern?: "quarters" | "half" | "8ths";
  density?: number;        
  octaveShift?: number;    
  walk?: number;           
  melodyRowsTop?: number;  
} = {}) {
  const {
    key = "C",
    mode = "major",
    useChords = true,
    pattern = "quarters",
    density = 1.0,
    octaveShift = -12,   
    walk = 0.25,       
    melodyRowsTop = 6,  
  } = opts;

  const rows = store.piano.rows;     // e.g. 12
  const cols = store.piano.cols;     // e.g. 32

  // Bass lanes: bottom 2 rows
  const BASS_ROWS = [rows - 2, rows - 1].filter(r => r >= 0);

  // Clear bass lanes only
  BASS_ROWS.forEach(r => {
    for (let c = 0; c < cols; c++) store.piano.grid[r][c] = false;
  });
// ===== Audio Clip Types + Helpers =====
type AudioClip = {
  id: string;
  name: string;
  buffer: AudioBuffer;
  startCol: number; // 0..31
  spanCols: number; // duration in 16ths
  gain: number;     // 0..1
};

function drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer) {
  const ch = buffer.getChannelData(0);
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(103,232,249,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();

  const step = Math.ceil(ch.length / w);
  const amp = h * 0.45;
  for (let x = 0; x < w; x++) {
    const i = x * step;
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const v = ch[i + j] || 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(x, h * 0.5 + min * amp);
    ctx.lineTo(x, h * 0.5 + max * amp);
  }
  ctx.stroke();
}

function colsToSeconds(cols: number, bpm: number) {
  // 1 column = 1/16 note = 60/bpm/4 seconds
  return cols * (60 / bpm / 4);
}

  // Helper: find a chord "root-ish" midi at a column by scanning grid
  function chordRootMidiAt(col: number): number | null {
    let found: number[] = [];
    for (let r = melodyRowsTop; r < rows; r++) {
      if (store.piano.grid[r][col]) {
        const midi = 72 - r; // inverse of midiToRow
        found.push(midi);
      }
    }
    if (found.length === 0) return null;
    return Math.min(...found);
  }

  // Fallback root (tonic)
  const tonic = degreeToMidi(1, key, mode, 4); 

  // Pattern placement logic
  const shouldPlaceAt = (c: number) => {
    if (pattern === "quarters") return (c % 4) === 0;
    if (pattern === "half")     return (c % 8) === 0;
    if (pattern === "8ths")     return (c % 2) === 0;
    return false;
  };

  // Determine bass placement row
  const placeRow = BASS_ROWS.length ? BASS_ROWS[BASS_ROWS.length - 1] : rows - 1;

  for (let c = 0; c < cols; c++) {
    if (!shouldPlaceAt(c)) continue;
    if (Math.random() > density) continue;
    // Determine root midi to base bass note on
    const rootMidi = (useChords ? chordRootMidiAt(c) : null) ?? tonic;
    let targetMidi = rootMidi + octaveShift;
    let row = midiToRow(targetMidi);

    if (row < 0 || row >= rows) {
      // out of bounds -> force into bass
      row = placeRow;
    } else if (row < BASS_ROWS[0]) {
      // too high -> push to lowest bass row
      row = placeRow;
    }

    // Place bass note
    store.piano.grid[row][c] = true;
    store.piano.velocity[c] = Math.min(1, Math.max(0.2, 0.8 + (Math.random() * 0.2 - 0.05)));

    // Walk / approach note?
    if (Math.random() < walk) {
      const next = (pattern === "8ths") ? c + 1 : c + 2; // small lead-in
      if (next < cols) {
        // Nudge a semitone up/down (within grid)
        const dir = Math.random() < 0.5 ? -1 : +1;
        const walkRow = Math.max(0, Math.min(rows - 1, row + dir));
        const useRow = BASS_ROWS.includes(walkRow) ? walkRow : row;
        store.piano.grid[useRow][next] = true;
        store.piano.velocity[next] = Math.min(1, Math.max(0.2, 0.6 + (Math.random() * 0.2 - 0.05)));
      }
    }
  }

  store.notify();
}

function generateAIDrums(opts={}){
  const { style="Trap", density=.6, humanize=.2, hatRate="16th" } = opts;
  const K=0,S=1,H=2,B=3;

  for(let r=0;r<4;r++)
    for(let c=0;c<16;c++)
      store.pattern[r][c]=false;

  const rnd=p=>Math.random()<p;

  // Hats
  for(let i=0;i<16;i++){
    if(rnd(0.9)) store.pattern[H][i]=true;
  }

  // Snare
  store.pattern[S][4]=true;
  store.pattern[S][12]=true;

  // Kick (simple version)
  store.pattern[K][0]=true;
  if(rnd(0.8)) store.pattern[K][8]=true;
  [3,5,7,10,11,13,15].forEach(i=>rnd(density)&& (store.pattern[K][i]=true));
  
  store.notify();
}

// ------------------------- Theme Helpers -------------------------
const panel =
  "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 " +
  "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_20px_60px_-20px_rgba(0,0,0,0.6)] " +
  "dawn-hover-lift dawn-appear";

const card  =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md " +
  "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_30px_-10px_rgba(0,0,0,0.6)] " +
  "dawn-sheen dawn-hover-lift dawn-appear";

// ------------------------- Types -------------------------
type TabKey = "channel" | "pianoroll" | "playlist" | "mixer";

type Unsub = () => void;

type Store = {
  playing: boolean;
  bpm: number;
  step: number; // current 16th step (0..15)
  pattern: boolean[][]; // 4 x 16 (Kick/Snare/Hat/808)
  piano: {
    rows: number; // 12
    cols: number; // 32
    grid: boolean[][]; // rows x cols
    velocity: number[]; // per col (0..1)
  };
  subscribe: (fn: () => void) => Unsub;
  notify: () => void;
};

// ------------------------- Audio Engines -------------------------
class DrumEngine {
  ctx: AudioContext | null = null;
  gain: GainNode | null = null;

  ensureCtx() {
    if (!this.ctx) {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!(window as any).__dawnAudioCtx) (window as any).__dawnAudioCtx = new AC();
      this.ctx = (window as any).__dawnAudioCtx as AudioContext;
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.9;
      mixer.ensureCtx(this.ctx);
      this.gain.connect(mixer.drumGain!);
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  trigger(name: "kick" | "snare" | "hat", when?: number) {
    if (!this.ctx || !this.gain) return;
    const t = when ?? this.ctx.currentTime;
    if (name === "kick") this.kick(t);
    else if (name === "snare") this.snare(t);
    else this.hat(t);
  }

  kick(t: number) {
    const ctx = this.ctx!; const out = this.gain!;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(out);
    osc.start(t); osc.stop(t + 0.16);
  }

  snare(t: number) {
    const ctx = this.ctx!; const out = this.gain!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.6, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    noise.connect(hp).connect(gain).connect(out);
    noise.start(t); noise.stop(t + 0.2);
  }

  hat(t: number) {
    const ctx = this.ctx!; const out = this.gain!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    noise.connect(hp).connect(gain).connect(out);
    noise.start(t); noise.stop(t + 0.08);
  }
}

// Mixer with faders, post-fader mute/solo gates, stereo pan, post-fader send bus (reverb+delay), limiter, and analysers
class MixerBus {
  ctx: AudioContext | null = null;

  // faders
  drumGain: GainNode | null = null;
  synthGain: GainNode | null = null;
  masterGain: GainNode | null = null;

  // stereo pan (per strip)
  drumPan: StereoPannerNode | null = null;
  synthPan: StereoPannerNode | null = null;

  // post-fader/post-pan gates for mute/solo
  drumPost: GainNode | null = null;
  synthPost: GainNode | null = null;

  // post-fader sends (per strip) -> FX bus
  drumSend: GainNode | null = null;
  synthSend: GainNode | null = null;

  // FX bus: simple reverb + delay in parallel, summed to fxReturn
  fxReverb: ConvolverNode | null = null;
  fxVerbMix: GainNode | null = null;    // reverb return level
  fxDelay: DelayNode | null = null;
  fxDelayFB: GainNode | null = null;    // delay feedback
  fxDelayMix: GainNode | null = null;   // delay return level
  fxReturn: GainNode | null = null;     // overall FX return level

  // Limiter & analysers
  limiter: DynamicsCompressorNode | null = null;
  drumAnalyser: AnalyserNode | null = null;
  synthAnalyser: AnalyserNode | null = null;
  masterPreAnalyser: AnalyserNode | null = null;   // before limiter
  masterAnalyser: AnalyserNode | null = null;      // after limiter

  ensureCtx(ctx: AudioContext) {
    if (this.ctx) return;
    this.ctx = ctx;

    // faders
    this.drumGain = ctx.createGain();
    this.synthGain = ctx.createGain();
    this.masterGain = ctx.createGain();

    // pan
    this.drumPan = ctx.createStereoPanner();
    this.synthPan = ctx.createStereoPanner();

    // post gates
    this.drumPost = ctx.createGain();
    this.synthPost = ctx.createGain();

    // sends
    this.drumSend = ctx.createGain();
    this.synthSend = ctx.createGain();

    // FX graph
    this.fxReturn  = ctx.createGain();
    // Reverb path
    this.fxReverb  = ctx.createConvolver();
    this.fxVerbMix = ctx.createGain();
    // Delay path
    this.fxDelay    = ctx.createDelay(2.0);
    this.fxDelayFB  = ctx.createGain();
    this.fxDelayMix = ctx.createGain();

    // Limiter
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-10, ctx.currentTime);
    this.limiter.knee.setValueAtTime(0, ctx.currentTime);
    this.limiter.ratio.setValueAtTime(20, ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    this.limiter.release.setValueAtTime(0.25, ctx.currentTime);

    // Analysers
    this.drumAnalyser = ctx.createAnalyser();
    this.synthAnalyser = ctx.createAnalyser();
    this.masterPreAnalyser = ctx.createAnalyser();
    this.masterAnalyser = ctx.createAnalyser();
    [this.drumAnalyser, this.synthAnalyser, this.masterPreAnalyser, this.masterAnalyser].forEach(a => {
      if (!a) return;
      a.fftSize = 512;
      a.smoothingTimeConstant = 0.5;
    });

    // Defaults from store
    this.drumGain.gain.value = store.mixer.drum;
    this.synthGain.gain.value = store.mixer.synth;
    this.masterGain.gain.value = store.mixer.master;

    this.drumPan.pan.value = store.mixer.pan.drum;
    this.synthPan.pan.value = store.mixer.pan.synth;

    this.drumSend.gain.value = store.mixer.send.drum;
    this.synthSend.gain.value = store.mixer.send.synth;

    // FX defaults
    this.fxReturn.gain.value = store.mixer.fx.returnLevel;
    this.fxVerbMix.gain.value = store.mixer.fx.reverbMix;
    this.fxDelay.delayTime.value = store.mixer.fx.delayTime;
    this.fxDelayFB.gain.value = store.mixer.fx.delayFeedback;
    this.fxDelayMix.gain.value = 0.7; // internal balance; overall is fxReturn
    // build a quick impulse for the convolver
    if (this.fxReverb) this.fxReverb.buffer = createImpulseResponse(ctx, 1.4, 2.5);

    // --- Channel routing ---
    // Dry path: fader -> pan -> postGate -> analyser -> master
    this.drumGain.connect(this.drumPan);
    this.drumPan.connect(this.drumPost);
    this.drumPost.connect(this.drumAnalyser!);
    this.drumAnalyser!.connect(this.masterGain);

    this.synthGain.connect(this.synthPan);
    this.synthPan.connect(this.synthPost);
    this.synthPost.connect(this.synthAnalyser!);
    this.synthAnalyser!.connect(this.masterGain);

    // Send taps (post-fader, post-pan, post-gate so Mute/Solo also mute sends)
    this.drumPost.connect(this.drumSend);
    this.synthPost.connect(this.synthSend);

    // Send -> FX
    // Reverb: send -> convolver -> mix -> fxReturn
    this.drumSend.connect(this.fxReverb!);
    this.synthSend.connect(this.fxReverb!);
    this.fxReverb!.connect(this.fxVerbMix);
    this.fxVerbMix.connect(this.fxReturn);

    // Delay: send -> delay -> feedback -> delay ; delay -> mix -> fxReturn
    this.drumSend.connect(this.fxDelay!);
    this.synthSend.connect(this.fxDelay!);
    this.fxDelay!.connect(this.fxDelayFB);
    this.fxDelayFB.connect(this.fxDelay!);      // feedback loop
    this.fxDelay!.connect(this.fxDelayMix);
    this.fxDelayMix.connect(this.fxReturn);

    // FX return into master path
    this.fxReturn.connect(this.masterGain);

    // Master path w/ limiter toggle
    this.setLimiterEnabled(store.mixer.limiterOn);

    // Apply initial mute/solo (sets post gates)
    this.applyMuteSolo();

    // Start metering loop if available
    startMetering && startMetering();

    // Enable/disable FX bus
    this.setFxEnabled(store.mixer.fx.enabled);
  }

  // Limiter toggle keeps pre/post analysers correct
  setLimiterEnabled(on: boolean) {
    if (!this.ctx || !this.masterGain || !this.masterAnalyser || !this.masterPreAnalyser || !this.limiter) return;
    try { this.masterGain.disconnect(); } catch {}

    if (on) {
      this.masterGain.connect(this.masterPreAnalyser!);
      this.masterPreAnalyser!.connect(this.limiter);
      this.limiter.connect(this.masterAnalyser!);
      this.masterAnalyser!.connect(this.ctx.destination);
    } else {
      this.masterGain.connect(this.masterPreAnalyser!);
      this.masterPreAnalyser!.connect(this.masterAnalyser!);
      this.masterAnalyser!.connect(this.ctx.destination);
      try { this.limiter.disconnect(); } catch {}
    }
  }
  // Apply automation levels at given column (16th step)
applyAutomationAtColumn(col: number) {
  if (!this.ctx) return;

  const baseMaster   = store.mixer.master;
  const baseDrumSend = store.mixer.send.drum;
  const baseSynthSend = store.mixer.send.synth;

  const a = store.automation;

  const m  = Math.min(1, Math.max(0, a.master[col]    ?? 1));
  const ds = Math.min(1, Math.max(0, a.drumSend[col]  ?? 0));
  const ss = Math.min(1, Math.max(0, a.synthSend[col] ?? 0));

  this.setLevel('master', baseMaster * m);
  this.setSend('drum',    baseDrumSend  * ds);
  this.setSend('synth',   baseSynthSend * ss);
}

  // Post-fader mute/solo
  applyMuteSolo() {
    if (!this.drumPost || !this.synthPost) return;
    const { mute, solo } = store.mixer;
    const anySolo = !!(solo?.drum || solo?.synth);

    const drumOn  = !mute?.drum  && (!anySolo || solo?.drum);
    const synthOn = !mute?.synth && (!anySolo || solo?.synth);

    this.drumPost.gain.value  = drumOn  ? 1 : 0;
    this.synthPost.gain.value = synthOn ? 1 : 0;
  }

  // Set fader levels
  setLevel(which: 'drum'|'synth'|'master', v: number) {
    if (which === 'drum'  && this.drumGain)   this.drumGain.gain.value = v;
    if (which === 'synth' && this.synthGain)  this.synthGain.gain.value = v;
    if (which === 'master'&& this.masterGain) this.masterGain.gain.value = v;
  }

  // NEW: Pan per channel (-1..1)
  setPan(which: 'drum'|'synth', v: number) {
    if (which === 'drum'  && this.drumPan)  this.drumPan.pan.value = v;
    if (which === 'synth' && this.synthPan) this.synthPan.pan.value = v;
  }

  // NEW: Send amount per channel (0..1)
  setSend(which: 'drum'|'synth', v: number) {
    if (which === 'drum'  && this.drumSend)  this.drumSend.gain.value = v;
    if (which === 'synth' && this.synthSend) this.synthSend.gain.value = v;
  }

  // NEW: FX bus on/off
  setFxEnabled(on: boolean) {
    if (!this.ctx || !this.masterGain || !this.fxReturn) return;
    try { this.fxReturn.disconnect(); } catch {}
    if (on) {
      this.fxReturn.connect(this.masterGain);
    }
  }
  // set FX params
  setFxParams(p: { reverbMix?: number; returnLevel?: number; delayTime?: number; delayFeedback?: number; }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (p.reverbMix != null && this.fxVerbMix) this.fxVerbMix.gain.setValueAtTime(p.reverbMix, t);
    if (p.returnLevel != null && this.fxReturn) this.fxReturn.gain.setValueAtTime(p.returnLevel, t);
    if (p.delayTime != null && this.fxDelay) this.fxDelay.delayTime.setValueAtTime(p.delayTime, t);
    if (p.delayFeedback != null && this.fxDelayFB) this.fxDelayFB.gain.setValueAtTime(Math.min(0.95, Math.max(0, p.delayFeedback)), t);
  }
}
function createImpulseResponse(ctx: AudioContext, seconds = 1.2, decay = 2.0) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // pinkyish noise with exponential decay
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buffer;
}

const mixer = new MixerBus();

// --- instrument selector for the synth ---
type SynthInstrumentId = "piano" | "guitar";

let currentInstrument: SynthInstrumentId = "piano";

export function setSynthInstrument(id: SynthInstrumentId) {
  currentInstrument = id;
  (window as any).dawnInstrument = id;
}

class SynthEngine {
  
  ctx: AudioContext | null = null;
  out: GainNode | null = null;
  ensureCtx() {
    if (!this.ctx) {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!(window as any).__dawnAudioCtx) (window as any).__dawnAudioCtx = new AC();
      this.ctx = (window as any).__dawnAudioCtx as AudioContext;
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.4;
      mixer.ensureCtx(this.ctx);
      this.out.connect(mixer.synthGain!);
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }
    note(freq: number, when: number, dur: number, vel: number) {
    if (!this.ctx || !this.out) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // --- basic waveform per instrument ---
    if (currentInstrument === "guitar") {
      osc.type = "sawtooth";        // brighter & buzzy
    } else {
      osc.type = "triangle";        // smoother = piano-ish
    }
    osc.frequency.setValueAtTime(freq, when);

    // --- tone-shaping filter ---
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      currentInstrument === "guitar" ? 6000 : 9000,
      when
    );
    filter.Q.setValueAtTime(
      currentInstrument === "guitar" ? 2.0 : 0.7,
      when
    );

    // --- envelope (ADSR) per instrument ---
    const g = gain.gain;
    const max = vel;

    const attack  = currentInstrument === "guitar" ? 0.005 : 0.008;
    const decay   = currentInstrument === "guitar" ? 0.18  : 0.22;
    const sustain = currentInstrument === "guitar" ? 0.55  : 0.65;
    const release = currentInstrument === "guitar" ? 0.25  : 0.30;

    g.setValueAtTime(0.0001, when);
    g.linearRampToValueAtTime(max, when + attack);
    g.linearRampToValueAtTime(max * sustain, when + attack + decay);
    g.setTargetAtTime(0.0001, when + dur, release);

    osc.connect(filter).connect(gain).connect(this.out);
    osc.start(when);
    osc.stop(when + dur + release + 0.1);
  }
}
function metronomeClick(ctx: AudioContext, when: number, accent = false) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(accent ? 2000 : 1400, when);
  g.gain.setValueAtTime(accent ? 0.15 : 0.09, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
  osc.connect(g).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.05);
}

const engine = new DrumEngine();
const synth  = new SynthEngine();

function midiToFreq(m: number) { return 440 * Math.pow(2, (m - 69) / 12); }
// ===== Collaboration Engine (BroadcastChannel + Chat Dock) =====
type CollabWireMessage =
  | { type: "hello"; sessionId: string; peerId: string; displayName: string }
  | { type: "bye";   sessionId: string; peerId: string }
  | { type: "chat";  sessionId: string; peerId: string; displayName: string; text: string; ts: number }
  | { type: "project"; sessionId: string; peerId: string; snapshot: any };

type CollabChatMsg = {
  peerId: string;
  displayName: string;
  text: string;
  ts: number;
};

type CollabPeer = {
  peerId: string;
  displayName: string;
  lastSeen: number;
};

const collabCore = {
  bc: null as BroadcastChannel | null,
  sessionId: "",
  peerId: "",
  displayName: "",
  peers: new Map<string, CollabPeer>(),
  chat: [] as CollabChatMsg[],
  listeners: new Set<() => void>(),

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  emit() {
    this.listeners.forEach(fn => fn());
  },

  ensure(sessionId: string, displayName: string) {
    if (this.bc && this.sessionId === sessionId) {
      // just update display name if changed
      if (this.displayName !== displayName) {
        this.displayName = displayName;
        this.send({
          type: "hello",
          sessionId: this.sessionId,
          peerId: this.peerId,
          displayName: this.displayName,
        });
      }
      return;
    }

    // new session or first time
    this.sessionId = sessionId;
    this.displayName = displayName || "Guest";
    this.peerId = this.peerId || `peer-${Math.random().toString(36).slice(2, 8)}`;

    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }

    if (typeof BroadcastChannel === "undefined") {
      console.warn("[DAWn Collab] BroadcastChannel not supported in this environment.");
      return;
    }

    this.bc = new BroadcastChannel("dawn-collab");
    this.bc.onmessage = (ev: MessageEvent<CollabWireMessage>) => {
      const msg = ev.data;
      if (!msg || msg.sessionId !== this.sessionId) return;

      if (msg.type === "hello") {
        this.peers.set(msg.peerId, {
          peerId: msg.peerId,
          displayName: msg.displayName || "Guest",
          lastSeen: Date.now(),
        });
        this.emit();
        return;
      }

      if (msg.type === "bye") {
        this.peers.delete(msg.peerId);
        this.emit();
        return;
      }

      if (msg.type === "chat") {
        this.peers.set(msg.peerId, {
          peerId: msg.peerId,
          displayName: msg.displayName || "Guest",
          lastSeen: Date.now(),
        });
        this.chat.push({
          peerId: msg.peerId,
          displayName: msg.displayName || "Guest",
          text: msg.text,
          ts: msg.ts,
        });
        if (this.chat.length > 100) this.chat = this.chat.slice(-100);
        this.emit();
        return;
      }

      if (msg.type === "project") {
        // placeholder for future "sync project" messages
        this.emit();
        return;
      }
    };

    // announce ourselves
    this.send({
      type: "hello",
      sessionId: this.sessionId,
      peerId: this.peerId,
      displayName: this.displayName,
    });
  },

  send(msg: CollabWireMessage) {
    if (!this.bc) return;
    this.bc.postMessage(msg);
  },

  sendChat(text: string) {
    if (!text.trim()) return;
    const ts = Date.now();
    const msg: CollabWireMessage = {
      type: "chat",
      sessionId: this.sessionId,
      peerId: this.peerId,
      displayName: this.displayName,
      text,
      ts,
    };
    this.send(msg);
    this.chat.push({
      peerId: this.peerId,
      displayName: this.displayName,
      text,
      ts,
    });
    if (this.chat.length > 100) this.chat = this.chat.slice(-100);
    this.emit();
  },

  leave() {
    if (this.bc) {
      this.send({
        type: "bye",
        sessionId: this.sessionId,
        peerId: this.peerId,
      } as any);
      this.bc.close();
      this.bc = null;
    }
    this.peers.clear();
    this.chat = [];
    this.emit();
  },
};

// Hook to read collab state from React
function useCollab(sessionId: string, displayName: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    collabCore.ensure(sessionId, displayName);
    const unsub = collabCore.subscribe(() => setTick(t => t + 1));

    return () => {
      unsub();
    };
  }, [sessionId, displayName]);

  const peers = Array.from(collabCore.peers.values()).sort(
    (a, b) => a.displayName.localeCompare(b.displayName)
  );

  const chat = [...collabCore.chat].sort((a, b) => a.ts - b.ts);

  return {
    peers,
    chat,
    meId: collabCore.peerId,
    sendChat: (text: string) => collabCore.sendChat(text),
  };
}

// Floating Collab dock (bottom-right)
function CollabDock() {
  const sessionId = store.projectTitle || "DAWn Session";
  const [name, setName] = useState("Producer");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const { peers, chat, meId, sendChat } = useCollab(sessionId, name);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendChat(draft.trim());
    setDraft("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 text-xs">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="mb-2 px-3 py-1.5 rounded-full border border-cyan-300/60 bg-black/60
                   hover:border-cyan-200/80 shadow-[0_0_16px_rgba(34,211,238,0.45)]
                   flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Collab</span>
        <span className="opacity-70">
          ({peers.length + 1} online)
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="w-80 max-h-[360px] rounded-2xl border border-white/10 bg-black/80
                     backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)]
                     flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-textLo">Session</div>
              <div className="text-[11px] font-semibold truncate max-w-[180px]">
                {sessionId}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] px-2 py-0.5 rounded-md border border-white/10 bg-black/40 hover:border-white/30"
            >
              Close
            </button>
          </div>

          {/* Name + peers */}
          <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Your name"
              className="flex-1 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[11px]"
            />
            <div className="text-[11px] text-textLo">
              Peers: {peers.length}
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {chat.length === 0 && (
              <div className="text-[11px] text-textLo/80">
                No messages yet. Say hi 👋
              </div>
            )}
            {chat.map((m) => {
              const isMe = m.peerId === meId;
              return (
                <div
                  key={m.ts + "-" + m.peerId}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-2 py-1 rounded-lg text-[11px]
                      ${isMe
                        ? "bg-cyan-400/20 border border-cyan-300/60"
                        : "bg-white/8 border border-white/15"
                      }`}
                  >
                    {!isMe && (
                      <div className="text-[10px] font-semibold opacity-80 mb-0.5">
                        {m.displayName}
                      </div>
                    )}
                    <div>{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-white/10 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[11px]"
            />
            <button
              onClick={handleSend}
              className="px-2 py-1 rounded-md border border-cyan-300/60 bg-cyan-400/20 text-[11px] hover:border-cyan-200"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ------------------------- Global Store -------------------------
let _subs: (() => void)[] = [];
const store = {
  playing: false,
  bpm: 120,
  step: 0,
  pattern: [Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false)],
  piano: {
    rows: 24,
    cols: 32,
    grid: Array.from({ length: 24 }, () => Array(32).fill(false)),
    velocity: Array(32).fill(0.8),
    // in store = { ... } 
projectTitle: "My First Beat",
projectThumbPngB64: undefined as string | undefined,
  collab: {
    enabled: false,
    sessionId: "",
    peerId: "", 
    displayName: "Producer-" + Math.floor(Math.random() * 9999),
    clients: [] as any[], // {id, name, color, lastSeen}
    chat: [] as any[],    // {from, name, text, at}
  },
  },

  mixer: {
  drum: 0.8, synth: 0.8, master: 0.8, limiterOn: true,
  pan:  { drum: 0,   synth: 0 },
  send: { drum: 0.25, synth: 0.25 },
  fx:   { enabled: true, reverbMix: 0.35, delayTime: 0.28, delayFeedback: 0.35, returnLevel: 0.7 },
  mute: { drum: false, synth: false },
  solo: { drum: false, synth: false },
},
// --- Automation lanes: 0..1 per column (32 cols) ---
automation: {
  master:    Array(32).fill(1.0),
  drumSend:  Array(32).fill(0.25),
  synthSend: Array(32).fill(0.25),
},
  // NEW: meter levels (0..1)
  meters: { drum: 0, synth: 0, master: 0, gainReductionDb: 0 },
 
  audio: {
    clips: [] as AudioClip[], // playlist audio clips
  },
  metronome: true,
  subscribe(fn: () => void) { _subs.push(fn); return () => { _subs = _subs.filter(f => f !== fn); }; },
  notify() { _subs.forEach(f => f()); },
};

// Seed patterns
store.pattern[0] = [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false];
store.pattern[1] = [false,false,false,false, true,false,false,false, false,false,true,false, false,false,false,false];
store.pattern[2] = Array(16).fill(true);
// Seed piano (C major arpeggio over 2 bars)
store.piano.grid[0][0]  = true; // C5
store.piano.grid[4][4]  = true; // E4
store.piano.grid[7][8]  = true; // G4
store.piano.grid[0][12] = true; // C5

// ------------------------- Scheduler -------------------------
let _timer: number | null = null;
let _nextNoteTime = 0; // seconds on AudioContext clock
let _currentStep = 0;  // 0..15
const lookaheadMs = 25; // setInterval period
const scheduleHorizon = 0.1; // seconds ahead
// ===== Audio loading / clip creation =====
async function importAudioFile(file: File) {
  engine.ensureCtx(); // ensure shared AudioContext
  const ctx = (window as any).__dawnAudioCtx as AudioContext;
  const arr = await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arr);
// ===== Audio Clip Types + Helpers (place near top, after imports) =====
type AudioClip = {
  id: number;
  name: string;
  buffer: AudioBuffer;
  startCol: number;   // 0..31 in your 2-bar grid
  spanCols: number;   // width in columns
};

let __audioClipId = 1;

function colsToSeconds(cols: number, bpm: number) {
  // each column = a 16th note = 60/bpm/4 seconds
  return cols * (60 / bpm / 4);
}
function secondsToCols(sec: number, bpm: number) {
  return Math.max(1, Math.round(sec / (60 / bpm / 4)));
}

// Draw a compact waveform into a <canvas>
function drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return;

  // mono mixdown (simple)
  const ch0 = buffer.getChannelData(0);
  const tmp = new Float32Array(ch0.length);
  tmp.set(ch0);
  if (buffer.numberOfChannels > 1) {
    const ch1 = buffer.getChannelData(1);
    for (let i = 0; i < tmp.length; i++) tmp[i] = 0.5 * (ch0[i] + ch1[i]);
  }

  // find peaks per vertical stripe
  const samplesPerPx = Math.max(1, Math.floor(tmp.length / width));
  const halfH = height / 2;

  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "rgba(103, 232, 249, 0.25)";
  ctx2d.strokeStyle = "rgba(103, 232, 249, 0.7)";
  ctx2d.lineWidth = 1;

  // baseline
  ctx2d.beginPath();
  ctx2d.moveTo(0, halfH);
  ctx2d.lineTo(width, halfH);
  ctx2d.stroke();

  // bars
  for (let x = 0; x < width; x++) {
    const start = x * samplesPerPx;
    let min = 1, max = -1;
    for (let i = 0; i < samplesPerPx && (start + i) < tmp.length; i++) {
      const v = tmp[start + i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = halfH - min * halfH;
    const y2 = halfH - max * halfH;
    ctx2d.fillRect(x, Math.min(y1, y2), 1, Math.max(1, Math.abs(y2 - y1)));
  }
}

// Decode a File -> AudioBuffer
async function decodeFileToBuffer(file: File): Promise<AudioBuffer> {
  engine.ensureCtx(); // make sure shared AudioContext exists
  if (!engine.ctx) throw new Error("No AudioContext");
  const arr = await file.arrayBuffer();
  // @ts-ignore safari types
  return await engine.ctx.decodeAudioData(arr);
}

// Import file -> create clip -> push into store.audio.clips
async function importAudioFile(file: File) {
  const buf = await decodeFileToBuffer(file);
  // initial width: map duration to columns (clamped to grid)
  const cols = Math.min(32, secondsToCols(buf.duration, store.bpm));

  store.audio.clips.push({
    id: __audioClipId++,
    name: file.name,
    buffer: buf,
    startCol: 0,
    spanCols: cols,
  });
  store.notify();
}

// Schedule audio start when playhead reaches its startCol
function scheduleAudioAtStep(step16: number, whenSec: number) {
  if (!mixer.ctx) return;
  const s32a = step16;       // 0..15
  const s32b = (step16 + 16) % 32; // 16..31

  for (const clip of store.audio.clips) {
    if (clip.startCol !== s32a && clip.startCol !== s32b) continue;

    // route: source -> master gain
    const src = mixer.ctx.createBufferSource();
    src.buffer = clip.buffer;
    const g = mixer.ctx.createGain();
    g.gain.value = 1.0;

    src.connect(g).connect(mixer.masterGain!);
    src.start(whenSec);
  }
}

  // default clip: at column 0, 16 columns long (1 bar)
  store.audio.clips.push({
    id: crypto.randomUUID(),
    name: file.name,
    buffer,
    startCol: 0,
    spanCols: 16,
    gain: 0.9,
  });
  store.notify();
}

function scheduleAudioAtStep(step16: number, whenSec: number) {
  const cols = store.piano.cols; // 32
  const s32a = step16;               // first bar col
  const s32b = (step16 + 16) % cols; // second bar mirrored col

  const ctx = (window as any).__dawnAudioCtx as AudioContext;
  if (!ctx) return;

  for (const clip of store.audio.clips) {
    const hits = (clip.startCol === s32a) || (clip.startCol === s32b);
    if (!hits) continue;

    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    src.buffer = clip.buffer;
    g.gain.value = clip.gain;

    // loop to the clip's declared length (spanCols)
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd   = Math.min(clip.buffer.duration, colsToSeconds(clip.spanCols, store.bpm));

    // route to mixer master
    mixer.ensureCtx(ctx);
    src.connect(g).connect(mixer.masterGain!);

    src.start(whenSec);
  }
}

function nextStepTime(bpm: number) { return 60 / bpm / 4; } // 16th

function schedulerTick() {
  if (!engine.ctx) return;
  const ctxTime = engine.ctx.currentTime;
  while (_nextNoteTime < ctxTime + scheduleHorizon) {
    const s = _currentStep % 16; 
    // right after: const s = _currentStep % 16;
scheduleAudioAtStep(s, _nextNoteTime);
// current 16th step
// metronome (accent on step 0)
if (store.metronome) {
  const isAccent = (s % 4 === 0);
  metronomeClick(engine.ctx as AudioContext, _nextNoteTime, isAccent && (_currentStep % 16 === 0));
}
// ===== Offline mixdown (WAV/MP3) =====
async function exportMixdown(format: "wav"|"mp3" = "wav") {
  // Duration = whole piano grid (32 cols) in 16th notes
  const stepSec = 60 / store.bpm / 4;
  const totalCols = store.piano.cols;  // 32
  const duration = totalCols * stepSec + 0.25; // tail

  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);

  // --- Build a mini mixer graph (mirrors current store.mixer)
  const drumGain = offline.createGain();  drumGain.gain.value = store.mixer.drum;
  const synthGain = offline.createGain(); synthGain.gain.value = store.mixer.synth;
  const masterGain = offline.createGain(); masterGain.gain.value = store.mixer.master;

  const drumPan = offline.createStereoPanner();  drumPan.pan.value = store.mixer.pan.drum;
  const synthPan = offline.createStereoPanner(); synthPan.pan.value = store.mixer.pan.synth;

  const drumPost = offline.createGain();  drumPost.gain.value = (store.mixer.mute.drum  ? 0 : 1) * (!store.mixer.solo.synth || store.mixer.solo.drum ? 1 : 0);
  const synthPost= offline.createGain();  synthPost.gain.value= (store.mixer.mute.synth ? 0 : 1) * (!store.mixer.solo.drum  || store.mixer.solo.synth ? 1 : 0);

  const drumSend = offline.createGain();  drumSend.gain.value = store.mixer.send.drum;
  const synthSend= offline.createGain();  synthSend.gain.value= store.mixer.send.synth;

  const fxReturn = offline.createGain();  fxReturn.gain.value = store.mixer.fx.returnLevel;

  // Reverb (simple IR like live)
  const fxReverb  = offline.createConvolver();
  const fxVerbMix = offline.createGain(); fxVerbMix.gain.value = store.mixer.fx.reverbMix;
  // build IR
  fxReverb.buffer = createImpulseResponse(offline as unknown as AudioContext, 1.4, 2.5);

  // Delay
  const fxDelay    = offline.createDelay(2.0); fxDelay.delayTime.value = store.mixer.fx.delayTime;
  const fxDelayFB  = offline.createGain();     fxDelayFB.gain.value    = Math.min(0.95, Math.max(0, store.mixer.fx.delayFeedback));
  const fxDelayMix = offline.createGain();     fxDelayMix.gain.value   = 0.7;

  // Limiter
  const limiter = offline.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;

  // Channel dry paths
  drumGain.connect(drumPan);   drumPan.connect(drumPost);   drumPost.connect(masterGain);
  synthGain.connect(synthPan); synthPan.connect(synthPost); synthPost.connect(masterGain);

  // Sends => FX
  drumPost.connect(drumSend);
  synthPost.connect(synthSend);

  drumSend.connect(fxReverb);  synthSend.connect(fxReverb);
  fxReverb.connect(fxVerbMix); fxVerbMix.connect(fxReturn);

  drumSend.connect(fxDelay);
  synthSend.connect(fxDelay);
  fxDelay.connect(fxDelayFB); fxDelayFB.connect(fxDelay);
  fxDelay.connect(fxDelayMix); fxDelayMix.connect(fxReturn);

  if (store.mixer.fx.enabled) fxReturn.connect(masterGain);

  // Master to destination 
  if (store.mixer.limiterOn) {
    masterGain.connect(limiter);
    limiter.connect(offline.destination);
  } else {
    masterGain.connect(offline.destination);
  }

  // --- lightweight drum synthesizers 
  function scheduleKick(t: number) {
    const osc = offline.createOscillator();
    const g = offline.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g).connect(drumGain);
    osc.start(t); osc.stop(t + 0.16);
  }
  function scheduleSnare(t: number) {
    const buffer = offline.createBuffer(1, Math.floor(sampleRate * 0.2), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2);
    const src = offline.createBufferSource(); src.buffer = buffer;
    const hp = offline.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
    const g = offline.createGain(); g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(hp).connect(g).connect(drumGain);
    src.start(t); src.stop(t + 0.2);
  }
  function scheduleHat(t: number) {
    const buffer = offline.createBuffer(1, Math.floor(sampleRate * 0.08), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random()*2-1);
    const src = offline.createBufferSource(); src.buffer = buffer;
    const hp = offline.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
    const g = offline.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(hp).connect(g).connect(drumGain);
    src.start(t); src.stop(t + 0.08);
  }

  // --- lightweight synth (triangle)
  function scheduleNote(freq: number, t: number, dur: number, vel: number) {
    const osc = offline.createOscillator();
    osc.type = "triangle";
    const g = offline.createGain();
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.01);
    g.gain.setTargetAtTime(0.0001, t + Math.max(0.05, dur*0.8), 0.06);
    osc.connect(g).connect(synthGain);
    osc.start(t); osc.stop(t + dur + 0.2);
  }

  const midiToFreq = (m:number)=> 440 * Math.pow(2, (m - 69) / 12);

  // --- schedule DRUMS
  for (let s = 0; s < 16; s++) {
    for (let repT = s*stepSec; repT < duration; repT += 16*stepSec) {
      if (store.pattern[0][s]) scheduleKick(repT);
      if (store.pattern[1][s]) scheduleSnare(repT);
      if (store.pattern[2][s]) scheduleHat(repT);
    }
  }

  // --- schedule PIANO ROLL (32 columns, single pass)
  for (let c = 0; c < store.piano.cols; c++) {
    const t = c * stepSec;
    const dur = stepSec * 0.95;
    const vel = store.piano.velocity[c];
    for (let r = 0; r < store.piano.rows; r++) {
      if (store.piano.grid[r][c]) {
        const midi = 72 - r;
        scheduleNote(midiToFreq(midi), t, dur, vel);
      }
    }
  }

  // --- Render
  const rendered = await offline.startRendering();

  if (format === "wav") {
    const blob = encodeWAVFromAudioBuffer(rendered);
    downloadBlob(`DAWn_${Math.round(store.bpm)}bpm.wav`, blob);
    return;
  }

  // Add <script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js"></script> in index.html to enable.
  // @ts-ignore
  if (window.lamejs) {
    // @ts-ignore
    const lame = window.lamejs;
    const mp3enc = new lame.Mp3Encoder(2, sampleRate, 192);
    const left = rendered.getChannelData(0);
    const right = rendered.numberOfChannels>1 ? rendered.getChannelData(1) : left;
    // convert to Int16
    function f32ToI16(f: Float32Array) {
      const out = new Int16Array(f.length);
      for (let i=0;i<f.length;i++) {
        const s = Math.max(-1, Math.min(1, f[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return out;
    }
    const mp3: Uint8Array[] = [];
    const block = 1152;
    const L = f32ToI16(left), R = f32ToI16(right);
    for (let i=0; i < L.length; i += block) {
      const chunkL = L.subarray(i, i+block);
      const chunkR = R.subarray(i, i+block);
      const buf = mp3enc.encodeBuffer(chunkL, chunkR);
      if (buf.length) mp3.push(buf);
    }
    const end = mp3enc.flush();
    if (end.length) mp3.push(end);
    const blob = new Blob(mp3, { type: "audio/mpeg" });
    downloadBlob(`DAWn_${Math.round(store.bpm)}bpm.mp3`, blob);
  } else {
    alert("MP3 export needs lamejs. Falling back to WAV.");
    const blob = encodeWAVFromAudioBuffer(rendered);
    downloadBlob(`DAWn_${Math.round(store.bpm)}bpm.wav`, blob);
  }
}

    // drums
    if (store.pattern[0][s]) engine.trigger("kick", _nextNoteTime);
    if (store.pattern[1][s]) engine.trigger("snare", _nextNoteTime);
    if (store.pattern[2][s]) engine.trigger("hat", _nextNoteTime);

    // piano — mirror to 32‑step grid
    synth.ensureCtx();
    const cols = store.piano.cols; const rows = store.piano.rows;
    const s32a = s; const s32b = (s + 16) % cols;
    // === Apply automation each step ===
mixer.applyAutomationAtColumn(s32a);
    const dur = nextStepTime(store.bpm);
    const velA = store.piano.velocity[s32a];
    const velB = store.piano.velocity[s32b];
    for (let r = 0; r < rows; r++) {
      if (store.piano.grid[r][s32a]) {
        const midi = 72 - r; // C5 downward
        synth.note(midiToFreq(midi), _nextNoteTime, dur * 0.95, velA);
      }
      if (store.piano.grid[r][s32b]) {
        const midi = 72 - r;
        synth.note(midiToFreq(midi), _nextNoteTime, dur * 0.95, velB);
      }
    }

    _currentStep = (_currentStep + 1) % 16;
    _nextNoteTime += nextStepTime(store.bpm);
  }
  store.step = (_currentStep + 15) % 16; // show last scheduled
  store.notify();
}

function startTransport() {
  engine.ensureCtx(); synth.ensureCtx();
  if (!engine.ctx) return;
  _currentStep = 0;
  _nextNoteTime = engine.ctx.currentTime + 0.05;
  if (_timer) window.clearInterval(_timer);
  _timer = window.setInterval(schedulerTick, lookaheadMs);
  store.playing = true; store.notify();
}

function stopTransport() {
  if (_timer) window.clearInterval(_timer);
  _timer = null;
  store.playing = false; store.step = 0; store.notify();
}
// --- Metering loop: reads analysers and updates store.meters (0..1) ---
let _meterRAF: number | null = null;

function startMetering() {
  if (_meterRAF != null) return;

  const rms = (an: AnalyserNode | null) => {
    if (!an) return 0;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  };

  const sample = () => {
    if (!mixer.ctx) { _meterRAF = null; return; }

    // Levels
    store.meters.drum   = rms(mixer.drumAnalyser);
    store.meters.synth  = rms(mixer.synthAnalyser);
    store.meters.master = rms(mixer.masterAnalyser);

    // Gain reduction estimate (pre vs post)
    const pre  = rms(mixer.masterPreAnalyser);
    const post = rms(mixer.masterAnalyser);
    let gr = 0;
    if (pre > 1e-5 && post > 1e-5) {
      const ratio = Math.min(1, post / pre);       // 0..1
      const db = -20 * Math.log10(1 / ratio);      // negative number
      gr = Math.max(0, -db);                       // positive dB reduction
    }
    store.meters.gainReductionDb = Math.min(24, gr); // clamp 0..24 dB

    store.notify();
    _meterRAF = requestAnimationFrame(sample);
  };

  _meterRAF = requestAnimationFrame(sample);
}

// ------------------------- App Root -------------------------
export default function App() {
  const [active, setActive] = useState<TabKey>("channel");
  const [sidebarOpen, setSidebarOpen] = useState(true);
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    if (tag === "input" || tag === "textarea" || target.isContentEditable) return;

    const k = e.key.toLowerCase();

    // --- Transport & UI hotkeys ---
    if (e.code === "Space") {
      e.preventDefault();
      store.playing ? stopTransport() : startTransport();
      return;
    }
    if (k === "h") {
      setSidebarOpen(v => !v);
      return;
    }

    // --- Typing keyboard piano (global) ---
    const midi = typingKeyToMidi(k);
    if (midi != null) {
      e.preventDefault();
      playPreview(midi, 220);
    }
  };

  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);


  return (
    <div className="h-full w-full flex flex-col select-none relative">
      <BackgroundFX />
      <TransportBar />
      <TabBar active={active} onChange={setActive} />
{/* === Project Save/Load === */}
<div className="flex items-center gap-2 text-xs border border-white/10 bg-black/20 rounded-md p-1 ml-2">
  <span className="text-textLo px-2">Project:</span>

  <select id="saveMode" className="bg-black/30 border border-white/10 rounded px-2 py-1" title="Choose save mode">
    <option value="lite">Save (Lite)</option>
    <option value="full">Save (With Audio)</option>
  </select>

  <button
    onClick={async ()=>{
      const mode = (document.getElementById("saveMode") as HTMLSelectElement)?.value || "lite";
      await saveProject(mode === "full");
    }}
    className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06]"
  >
    Save
  </button>

  <label className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06] cursor-pointer">
    Load
    <input
      type="file"
      accept=".dawnproject,application/json"
      className="hidden"
      onChange={async (e)=>{
        const el = e.currentTarget;
        const f = el.files?.[0];
        if (f) await loadProjectFromFile(f);
        el.value = "";
      }}
    />
  </label>
</div>

      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: sidebarOpen ? "280px 1fr" : "0px 1fr" }}>
        {/* Sidebar */}
        <aside className={`overflow-hidden border-r border-white/5 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Panel */}
        <main className="min-w-0 p-4">
          <div className="mb-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="px-3 py-1 text-sm rounded-md border border-white/10 hover:border-white/20 bg-black/20"
              aria-pressed={!sidebarOpen}
            >{sidebarOpen ? "Hide" : "Show"} Browser</button>
          </div>

          <MainPanel active={active} />
        </main>
      </div>
 <CollabDock />
      <StatusBar />
    </div>
  );
useEffect(() => {
  ensureCollabChannel();
  if (!store.collab.peerId) store.collab.peerId = makePeerId();
}, []);
}

// ------------------------- Top Transport -------------------------
function TransportBar() {
  const master = (store as any).meters?.master ?? 0;
  const pulse = Math.min(1, Math.max(0, master * 1.8));
  const glow = `0 0 ${Math.round(24 + pulse*26)}px rgba(120,180,255,${0.08 + pulse*0.25})`;
   const isOn = store.metronome;
  return (
    <header
      className="sticky top-0 z-20 border-b border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl"
      style={{ boxShadow: glow }}>
      <div className="mx-auto max-w-[1600px] px-4 py-2 flex items-center gap-3">
        <span className="text-base font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#c084fc] via-[#67e8f9] to-[#fda4af] drop-shadow-[0_0_16px_rgba(103,232,249,0.15)]">
  DAWn
</span>
        <div className="flex items-center gap-2">
          {/* Gradient brand strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#7c3aed] via-[#22d3ee] to-[#fb7185] opacity-50" />
      <div className="mx-auto max-w-[1600px] px-4 py-2 flex items-center gap-3"></div>
          <TransportButton label="Play"  symbol="▶" onClick={startTransport}/>
          <TransportButton label="Stop"  symbol="■" onClick={stopTransport}/>
          <TransportButton label="Rec"   symbol="●" onClick={() => console.log('Record (not implemented)')} className="text-red-400"/>
        </div>

        <div className="h-6 w-px bg-white/10 mx-1" />

        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-white/10 bg-black/20">
  <span className="text-textLo">BPM:</span>
  <button
    onClick={() => { store.bpm = Math.max(40, store.bpm - 1); store.notify(); }}
    className="px-2 py-0.5 rounded border border-white/10 hover:border-white/20"
  >−</button>
  <input
    type="number"
    value={store.bpm}
    min={40}
    max={240}
    onChange={(e) => { store.bpm = Math.max(40, Math.min(240, Number(e.currentTarget.value || 120))); store.notify(); }}
    className="w-16 bg-black/40 border border-white/10 rounded px-2 py-0.5 text-sm"
  />
  <button
    onClick={() => { store.bpm = Math.min(240, store.bpm + 1); store.notify(); }}
    className="px-2 py-0.5 rounded border border-white/10 hover:border-white/20"
  >+</button>
</div>
{/* === Export === */}
<div className="flex items-center gap-2 text-xs border border-white/10 bg-black/20 rounded-md p-1">
  <span className="text-textLo px-2">Export:</span>
  <select id="exportFmt" className="bg-black/30 border border-white/10 rounded px-2 py-1">
    <option>WAV</option>
    <option>MP3</option>
  </select>
  <button
    onClick={()=>{
      const fmt = ((document.getElementById("exportFmt") as HTMLSelectElement).value || "WAV").toLowerCase() as "wav"|"mp3";
      exportMixdown(fmt);
    }}
    className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06]"
  >
    Render
  </button>
</div>

        <KnobLike label="Time" value="01:02:441"/>
        <KnobLike label="CPU" value="3%"/>
        <KnobLike label="Snap" value="1/4"/>

        <div className="ml-auto flex items-center gap-2">
          <button
  onClick={() => { store.metronome = !store.metronome; store.notify(); }}
  className={`px-2 py-1 text-xs rounded-md border ${
  isOn ? 'border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_16px_rgba(103,232,249,0.25)]'
       : 'border-white/10 bg-black/20 hover:border-white/20'
}`}
>
  
  Metronome {store.metronome ? 'On' : 'Off'}
</button>
          <button className="px-2 py-1 text-xs rounded-md border border-white/10 hover:border-white/20 bg-black/20">Undo</button>
          <button className="px-2 py-1 text-xs rounded-md border border-white/10 hover:border-white/20 bg-black/20">Redo</button>
          <ProjectTitle />
        </div>
      </div>
    </header>
  );
}

function TransportButton({ label, symbol, className = "", onClick }: { label: string; symbol: string; className?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`px-3 py-1 text-sm rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] 
                  transition-all duration-200 dawn-sheen dawn-hover-lift ${className}`}
    >
      <span className="font-semibold mr-1" aria-hidden>{symbol}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function KnobLike({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs px-2 py-1 rounded-md border border-white/10 bg-black/20">
      <span className="text-textLo">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ProjectTitle() {
  const hasThumb = !!store.projectThumbPngB64;
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs rounded-md border border-white/10 bg-black/20">
      {hasThumb && (
        <img
          src={store.projectThumbPngB64}
          alt="Project thumbnail"
          className="w-10 h-8 rounded object-cover border border-white/10"
        />
      )}
      <input
        type="text"
        value={store.projectTitle}
        onChange={(e)=>{ store.projectTitle = e.currentTarget.value; store.notify(); }}
        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-40"
        placeholder="Project title"
        aria-label="Project title"
      />
    </div>
  );
}


// ------------------------- Tab Bar -------------------------
function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "channel",   label: "Channel Rack" },
    { key: "pianoroll", label: "Piano Roll" },
    { key: "playlist",  label: "Playlist" },
    { key: "mixer",     label: "Mixer" },
  ];

  return (
    <nav className="border-b border-white/10 bg-white/[0.04] backdrop-blur-xl">
  <div className="mx-auto max-w-[1600px] px-2">
    <ul className="flex items-stretch gap-1 py-1">
      {tabs.map(t => (
        <li key={t.key}>
          <button
            onClick={() => onChange(t.key)}
            className={`px-4 py-2 text-sm rounded-md border dawn-sheen dawn-hover-lift transition-all ${
  active === t.key
    ? 'bg-white/[0.09] border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]'
    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
}`}
            aria-current={active === t.key ? "page" : undefined}
          >
            {t.label}
          </button>
        </li>
      ))}
    </ul>
  </div>
</nav>
  );
}

// ------------------------- Sidebar -------------------------
function Sidebar({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/20">
        <span className="text-sm font-semibold">Browser</span>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:border-white/20 bg-black/20">Hide</button>
      </div>

            <div className="p-3 space-y-3 overflow-auto">
        <SearchBox />

        {/* === Lyric AI panel === */}
        <LyricAI />

<PacksSection />
        <SidebarSection title="Current Project" items={["Patterns", "Audio", "Automation"]} />
        <SidebarSection title="Plugin Database" items={["Generators", "Effects", "VST", "Instruments"]} />
        <SidebarSection title="Projects" items={["Demo Project", "Templates", "Examples"]} />
      </div>

    </div>
  );
}
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* slow drifting nebula gradient */}
      <div className="absolute -inset-1 opacity-[.35] blur-3xl"
           style={{
             background:
               "radial-gradient(60% 40% at 20% 10%, rgba(124,58,237,.18), transparent 60%)," +
               "radial-gradient(50% 40% at 80% 30%, rgba(34,211,238,.12), transparent 60%)," +
               "radial-gradient(40% 30% at 50% 90%, rgba(251,113,133,.12), transparent 60%)",
             animation: "drift 60s linear infinite",
             transform: "translate3d(0,0,0)"
           }} />
    </div>
  );
}

function SearchBox() {
  return (
    <div className={card}>
      <label className="text-xs text-textLo">Search</label>
      <input
        placeholder="Type to search samples, presets..."
        className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
      />
    </div>
  );
}

function SidebarSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className={panel}>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ul className="space-y-1 text-sm">
        {items.map((it) => (
          <li key={it}>
            <button className="w-full text-left px-2 py-1 rounded-md hover:bg-white/5">
              {it}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
// ------------------------- Packs Section with drag sources -------------------------
function PacksSection() {
  type BrowserSample = {
    id: string;      // local browser ID
    name: string;
    clipId: string;  // id of the AudioClip in store.audio.clips
    pack: string;
  };

  const [activePack, setActivePack] = useState<string | null>(null);
  const [samples, setSamples] = useState<BrowserSample[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const packs = ["Drums", "Bass", "Synth", "FX", "Vocals"];

  const handlePackClick = (pack: string) => {
    setActivePack(pack);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []);
    if (!files.length) return;
    e.currentTarget.value = ""; 

    const newSamples: BrowserSample[] = [];

    for (const file of files) {
      const beforeLen = store.audio.clips.length;
      await importAudioFile(file);         
      const newClip = store.audio.clips[store.audio.clips.length - 1];

      if (newClip && store.audio.clips.length > beforeLen) {
        newSamples.push({
          id: crypto.randomUUID(),
          name: newClip.name,
          clipId: newClip.id as any,        // ts-nocheck so it's fine
          pack: activePack || "Packs",
        });
      }
    }

    setSamples((prev) => [...newSamples, ...prev].slice(0, 64));
  };

  const handleDragStart = (sample: BrowserSample, e: React.DragEvent<HTMLButtonElement>) => {
    (window as any).__dawnDragClipId = sample.clipId; 
    e.dataTransfer.setData("text/x-dawn-clip", sample.clipId);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <section className={panel}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Packs</h3>
        <span className="text-[10px] text-textLo/80">Drag into Playlist</span>
      </div>

      {/* Pack buttons (open file picker) */}
      <ul className="space-y-1 text-sm mb-3">
        {packs.map((pack) => (
          <li key={pack}>
            <button
              onClick={() => handlePackClick(pack)}
              className={
                "w-full text-left px-2 py-1 rounded-md hover:bg-white/5 " +
                (activePack === pack ? "bg-white/[0.06]" : "")
              }
            >
              {pack}
            </button>
          </li>
        ))}
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFilesChosen}
      />

      {/* Loaded samples – drag from here into Playlist */}
      {samples.length > 0 ? (
        <>
          <div className="text-[11px] text-textLo mb-1">Loaded samples</div>
          <ul className="space-y-1 text-[11px] max-h-40 overflow-auto pr-1">
            {samples.map((s) => (
              <li key={s.id}>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(s, e)}
                  className="w-full text-left px-2 py-1 rounded-md bg-black/30 border border-white/10 hover:bg-white/5 truncate"
                  title="Drag into Playlist to create an Audio Clip"
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[11px] text-textLo/70">
          Click a pack to load audio files from your PC, then drag them into the Playlist.
        </p>
      )}
    </section>
  );
}


// ------------------------- Lyric AI (Sidebar) -------------------------
function LyricAI() {
  const [genre, setGenre] = useState<GenreKey | "Any">("Any");
  const [mood, setMood] = useState<"Chill" | "Sad" | "Hype" | "Love">("Chill");
  const [topic, setTopic] = useState("");
  const [lines, setLines] = useState(8);
  const [output, setOutput] = useState("");

  const [busy, setBusy] = useState(false);

  const handleGenerate = () => {
    setBusy(true);
    const txt = generateLyrics({
      genre: genre === "Any" ? undefined : genre,
      mood,
      topic: topic.trim(),
      lines,
    });
    setOutput(txt);
    setBusy(false);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      // optional: tiny toast – for now just console
      console.log("[DAWn] Lyrics copied to clipboard");
    } catch (e) {
      console.warn("Clipboard failed", e);
    }
  };

  return (
    <section className={panel}>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <span>Lyric AI</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-200/90 border border-cyan-400/40">
          beta
        </span>
      </h3>

      <div className="space-y-2 text-xs">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-textLo mb-1">Genre</label>
            <select
              value={genre}
              onChange={(e)=>setGenre(e.currentTarget.value as any)}
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-1"
            >
              <option value="Any">Match beat</option>
              <option value="Trap">Trap</option>
              <option value="Drill">Drill</option>
              <option value="HipHop">HipHop</option>
              <option value="LoFi">LoFi</option>
              <option value="House">House</option>
              <option value="Techno">Techno</option>
              <option value="EDM">EDM</option>
              <option value="Pop">Pop</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-textLo mb-1">Mood</label>
            <select
              value={mood}
              onChange={(e)=>setMood(e.currentTarget.value as any)}
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-1"
            >
              <option value="Chill">Chill</option>
              <option value="Sad">Emotional</option>
              <option value="Hype">Hype</option>
              <option value="Love">Love</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-textLo mb-1">Theme / prompt</label>
          <input
            value={topic}
            onChange={(e)=>setTopic(e.currentTarget.value)}
            placeholder="night drive, heartbreak, victory..."
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-textLo">Lines</label>
          <input
            type="range"
            min={4}
            max={16}
            step={2}
            value={lines}
            onChange={(e)=>setLines(Number(e.currentTarget.value))}
            className="flex-1"
          />
          <span className="w-6 text-right">{lines}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={busy}
            className={`flex-1 px-2 py-1 rounded-md border border-white/10 bg-white/[0.07] text-[11px] 
                        hover:border-white/20 ${busy ? "opacity-60 cursor-wait" : ""}`}
          >
            {busy ? "Generating..." : "Generate lyrics"}
          </button>
          <button
            onClick={handleCopy}
            disabled={!output}
            className="px-2 py-1 rounded-md border border-white/10 bg-black/30 text-[11px] hover:border-white/20 disabled:opacity-40"
          >
            Copy
          </button>
        </div>

        <div className="mt-2 h-40 rounded-md border border-white/10 bg-black/40 p-2 overflow-auto text-[11px] whitespace-pre-wrap">
          {output || <span className="text-textLo/70">Your lyrics will appear here…</span>}
        </div>
      </div>
    </section>
  );
}
type LyricOpts = {
  genre?: GenreKey;
  mood: "Chill" | "Sad" | "Hype" | "Love";
  topic: string;
  lines: number;
};

function generateLyrics(opts: LyricOpts): string {
  const { genre, mood, topic, lines } = opts;
  const cleanTopic = topic || "this feeling";

  const moodWords = {
    Chill: ["late night", "city lights", "slow vibe", "fading noise", "soft echo"],
    Sad:   ["heartbreak", "empty room", "broken glass", "rainy window", "lost calls"],
    Hype:  ["bass hits", "stage lights", "crowd wild", "we go up", "hands high"],
    Love:  ["your eyes", "your heartbeat", "stay with me", "soft touch", "holding on"],
  }[mood];

  const genreAdlibs: string[] =
    genre === "Trap" || genre === "Drill"
      ? ["yeah", "uh", "skrrt", "okay", "no cap"]
      : genre === "LoFi"
      ? ["breathe", "slow down", "blank page", "rewind"]
      : genre === "House" || genre === "EDM" || genre === "Techno"
      ? ["hands up", "one more drop", "lose control", "all night"]
      : genre === "HipHop"
      ? ["no sleep", "real ones", "from the basement", "write the truth"]
      : genre === "Pop"
      ? ["we shine", "sing it loud", "won’t let go", "right now"]
      : ["in the moment", "right here", "no regrets", "close your eyes"];

  const fillers = [
    "in my head", "in this room", "on this road", "through the night",
    "I can’t hide", "I still feel", "we’re alive", "let it go",
  ];

  const hookPatterns = [
    "{TOPIC}, {MOOD} in my chest",
    "All these {MOODWORD} I can’t forget",
    "Still chasing {TOPIC} with every breath",
    "Tell me this {MOODWORD} won’t fade yet",
  ];

  const versePatterns = [
    "We move slow with the {MOODWORD}",
    "{TOPIC} plays back like a tape",
    "City cold but my heart still aches",
    "Another line ‘bout {TOPIC} on the page",
    "I hear echoes of {MOODWORD} again",
    "No sleep, just {MOODWORD} in my veins",
    "Every beat pulls me back to {TOPIC}",
  ];

  const allLines: string[] = [];
  const total = Math.max(4, Math.min(32, lines));

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const normalisedMoodWord = (w: string) =>
    w.replace(/_/g, " ");

  for (let i = 0; i < total; i++) {
    let pattern: string;
    if (i === 0 || i === total - 2) {
      pattern = pick(hookPatterns);
    } else {
      pattern = pick(versePatterns);
    }

    let line = pattern
      .replace("{TOPIC}", cleanTopic.toLowerCase())
      .replace("{MOODWORD}", normalisedMoodWord(pick(moodWords)))
      .replace("{MOOD}", mood.toLowerCase());

    if (Math.random() < 0.35) {
      line += ", " + pick(fillers);
    }
    if (Math.random() < 0.25) {
      line += " (" + pick(genreAdlibs) + ")";
    }

    // Capitalise first letter
    line = line.charAt(0).toUpperCase() + line.slice(1);
    allLines.push(line);
  }

  return allLines.join("\n");
}
// ------------------------- AI Synthesis Panel (Channel tab) -------------------------
function AISynthesisPanel() {
  const [preset, setPreset] = useState("Warm Pad");
  const [engine, setEngine] = useState<"Hybrid" | "Analog" | "FM">("Hybrid");
  const [texture, setTexture] = useState(0.5);
  const [movement, setMovement] = useState(0.35);
  const [brightness, setBrightness] = useState(0.6);
  const [space, setSpace] = useState(0.4);

  const [key, setKey] = useState<KeyRoot>("C");
  const [mode, setMode] = useState<Mode>("major");

  const [status, setStatus] = useState<string>("Idle");

  const handleApply = () => {
    const patch = {
      preset,
      engine,
      macro: {
        texture,
        movement,
        brightness,
        space,
      },
      musicalContext: {
        key,
        mode,
      },
      updatedAt: Date.now(),
    };

    // Placeholder hook 
    (window as any).__dawnAISynthPatch = patch;
    console.log("[DAWn] AI Synth patch updated", patch);
    setStatus(`Patch sent (${preset}, ${key} ${mode})`);
  };

  const handleRandom = () => {
    const presets = ["Warm Pad", "Glass Keys", "Noisy Pluck", "Dark Bass", "Airy Lead"];
    const engines: ("Hybrid" | "Analog" | "FM")[] = ["Hybrid", "Analog", "FM"];

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    setPreset(pick(presets));
    setEngine(pick(engines));
    setTexture(Math.random());
    setMovement(Math.random());
    setBrightness(Math.random());
    setSpace(Math.random());
    setStatus("Randomised patch – click Apply to send");
  };

  return (
    <section className={panel}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            AI Synthesis
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-200/90 border border-purple-400/40">
              JUCE-ready
            </span>
          </h2>
          <p className="text-[11px] text-textLo">
            Design a patch in the browser now, let the JUCE engine read it later.
          </p>
        </div>

        <div className="text-[10px] text-textLo/80 text-right max-w-[180px]">
          <div className="truncate">{status}</div>
        </div>
      </div>

      {/* Top row: preset + key/mode */}
      <div className="grid gap-2 md:grid-cols-3 mb-3 text-xs">
        <div className="flex flex-col">
          <label className="text-textLo mb-1">Preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.currentTarget.value)}
            className="bg-black/40 border border-white/10 rounded px-2 py-1"
          >
            <option>Warm Pad</option>
            <option>Glass Keys</option>
            <option>Noisy Pluck</option>
            <option>Dark Bass</option>
            <option>Airy Lead</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-textLo mb-1">Key</label>
          <select
            value={key}
            onChange={(e) => setKey(e.currentTarget.value as KeyRoot)}
            className="bg-black/40 border border-white/10 rounded px-2 py-1"
          >
            {NOTE_NAMES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-textLo mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.currentTarget.value as Mode)}
            className="bg-black/40 border border-white/10 rounded px-2 py-1"
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="dorian">Dorian</option>
            <option value="mixolydian">Mixolydian</option>
            <option value="lydian">Lydian</option>
            <option value="phrygian">Phrygian</option>
            <option value="locrian">Locrian</option>
          </select>
        </div>
      </div>

      {/* Engine + Macros */}
      <div className="grid gap-3 md:grid-cols-2 text-xs">
        <div className="space-y-2">
          <label className="block text-textLo mb-1">Engine</label>
          <div className="flex gap-1">
            {(["Hybrid", "Analog", "FM"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEngine(e)}
                className={`flex-1 px-2 py-1 rounded-md border text-xs ${
                  engine === e
                    ? "bg-white/[0.12] border-white/20"
                    : "bg-black/30 border-white/10 hover:bg-white/[0.06]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-textLo/80 mt-1">
            Hybrid = wavetable + analog; FM = sharper digital tones, great for bells and plucks.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { label: "Texture (harmonics)", value: texture, setter: setTexture },
            { label: "Movement (LFO)", value: movement, setter: setMovement },
            { label: "Brightness (filter)", value: brightness, setter: setBrightness },
            { label: "Space (reverb)", value: space, setter: setSpace },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-28 text-[11px] text-textLo">{row.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={row.value}
                onChange={(e) => row.setter(parseFloat(e.currentTarget.value))}
                className="flex-1"
              />
              <span className="w-10 text-right text-[10px] text-textLo">
                {Math.round(row.value * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={handleApply}
          className="px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.10] hover:bg-white/[0.16]"
        >
          Apply to AI Synth
        </button>
        <button
          onClick={handleRandom}
          className="px-3 py-1.5 rounded-md border border-white/10 bg-black/30 hover:border-white/20"
        >
          Randomise
        </button>
        <span className="text-[10px] text-textLo/80">
        <code>window.__dawnAISynthPatch</code> and map it to real
          parameters.
        </span>
      </div>
    </section>
  );
}

// ------------------------- Main Panel -------------------------
function MainPanel({ active }: { active: TabKey }) {
  return (
     <div className="min-w-0 space-y-4">
      {active === "channel" && (
        <>
          {/* Classic FL-style Channel Rack */}
          <ChannelRack />

          {/* AI Synthesis lives under the rack, as its own panel */}
          <AISynthesisPanel />
        </>
      )}

      {active === "pianoroll" && <PianoRoll />}
       {active === "playlist"  && (
        <>
          {/* New AI Genre panel, separate from the Playlist */}
          <AIGenreStarterPanel />
          <Playlist />
        </>
      )}
       {active === "mixer" && (
        <>
          <AIPresetRecommenderPanel />
          <Mixer />
        </>
      )}
    </div>
  );
}


// Tiny FL-style knob used in the Channel Rack
function MiniKnob({
  label,
  value,
  bipolar = false,
}: {
  label: string;
  value: number;     // 0–1
  bipolar?: boolean; // if true, 0–1 maps to -range..+range visually
}) {
  const range = 260; // total sweep in degrees
  const angle = bipolar
    ? (value - 0.5) * range
    : value * range - range / 2;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-6 h-6 rounded-full border border-white/20 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),rgba(0,0,0,0.9))] shadow-inner">
        <div
          className="absolute left-1/2 top-1/2 w-[1.5px] h-2 rounded-full bg-white/80 origin-bottom"
          style={{ transform: `translate(-50%, -85%) rotate(${angle}deg)` }}
        />
      </div>
      <span className="text-[9px] tracking-wide uppercase text-textLo">
        {label}
      </span>
    </div>
  );
}

// === FL-style Channel Rack ===
function ChannelRack() {
  const [, force] = React.useState(0);
  const [pattern, setPattern] = useState<number>(1);
  React.useEffect(() => store.subscribe(() => force(t => t + 1)), []);

  const steps = store.pattern[0]?.length ?? 16;

  const channels = [
    { id: 0, name: "Kick",  color: "#ff9f43" },
    { id: 1, name: "Snare", color: "#ff6b81" },
    { id: 2, name: "Hat",   color: "#1dd1a1" },
    { id: 3, name: "Clap",  color: "#54a0ff" },
  ];

  const toggleStep = (row: number, col: number) => {
    const current = !!store.pattern[row][col];
    store.pattern[row][col] = !current;
    store.notify();
  };

  const clearAll = () => {
    for (let r = 0; r < store.pattern.length; r++) {
      for (let c = 0; c < steps; c++) {
        store.pattern[r][c] = false;
      }
    }
    store.notify();
  };

  const randomFill = () => {
    for (let r = 0; r < store.pattern.length; r++) {
      for (let c = 0; c < steps; c++) {
        store.pattern[r][c] = Math.random() < 0.25;
      }
    }
    store.notify();
  };

  return (
    <section className={panel}>
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Channel Rack</h2>
          <span className="text-[10px] uppercase tracking-[0.16em] text-textLo">
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={clearAll}
            className="px-2 py-1 rounded-md border border-white/10 bg-black/30 hover:border-accent/60 hover:bg-accent/10"
          >
            Clear
          </button>
          <button
            onClick={randomFill}
            className="px-2 py-1 rounded-md border border-accent/60 bg-accent/20 hover:bg-accent/40"
          >
            Random Fill
          </button>
        </div>
      </div>
      
  {/* === AI Drums (restored) === */}
  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs border border-white/10 rounded-md bg-black/20 p-2">
    <span className="text-textLo">AI Drums:</span>

    <select
      id="drStyle"
      className="bg-black/30 border border-white/10 rounded px-2 py-1"
      defaultValue="Trap"
    >
      <option value="Trap">Trap</option>
      <option value="House">House</option>
      <option value="BoomBap">Boom bap</option>
    </select>

    <button
      onClick={() => {
        const sel = document.getElementById("drStyle") as HTMLSelectElement | null;
        const style = sel?.value || "Trap";
        generateAIDrums({ style });
      }}
      className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] dawn-smooth"
    >
      Generate
    </button>
  </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3">

  {/*  unified grid */}
  <div
  className="grid"
  style={{
    gridTemplateColumns: `150px 50px 50px repeat(${steps}, minmax(32px, 1fr))`,
    rowGap: "10px",
    columnGap: "6px",
    alignItems: "center",
  }}
>


    {channels.map((ch, row) => (
      <React.Fragment key={row}>

        {/* === LEFT: LED + Color + Name === */}
        <div className="flex items-center gap-2">

          {/* LED */}
          <div
            className="w-3 h-3 rounded-full bg-lime-400/70 shadow-[0_0_6px_rgba(190,242,100,0.9)] border border-black/70"
          />

          {/* Color bar */}
          <div
            className="w-1.5 h-6 rounded-full"
            style={{ backgroundColor: ch.color }}
          />

          {/* Name */}
          <span className="text-xs font-medium">{ch.name}</span>
        </div>

        {/* === VOL knob === */}
        <MiniKnob label="VOL" value={0.75} />

        {/* === PAN knob === */}
        <MiniKnob label="PAN" value={0.5} bipolar />

        {/* === STEPS === */}
        {Array.from({ length: steps }).map((_, col) => {
          const active = store.pattern[row][col];
          const isPlay = col === store.step;

          return (
            <button
              key={col}
              onClick={() => toggleStep(row, col)}
              className={`
                w-5 h-5 rounded-sm border transition
                ${active
                  ? "bg-accent/70 border-accent/80"
                  : "bg-black/40 border-white/10 hover:bg-accent/10 hover:border-accent/60"
                }
                ${isPlay ? "outline outline-2 outline-accent/70" : ""}
              `}
            />
          );
        })}

      </React.Fragment>
    ))}

  </div>
</div>

    </section>
  );
}
// ===== Mixer preset applier  =====
function applyMixerPreset(p: typeof GENRE_PRESETS[GenreKey]["mixer"]) {
  // set store levels
  store.mixer.drum   = p.drum;
  store.mixer.synth  = p.synth;
  store.mixer.master = p.master;

  store.mixer.pan.drum  = p.pan.drum;
  store.mixer.pan.synth = p.pan.synth;

  store.mixer.send.drum  = p.send.drum;
  store.mixer.send.synth = p.send.synth;

  store.mixer.fx.enabled        = p.fx.enabled;
  store.mixer.fx.reverbMix      = p.fx.reverbMix;
  store.mixer.fx.delayTime      = p.fx.delayTime;
  store.mixer.fx.delayFeedback  = p.fx.delayFeedback;
  store.mixer.fx.returnLevel    = p.fx.returnLevel;

  store.mixer.limiterOn = p.limiterOn;

  // push to live graph
  mixer.setLevel('drum',   p.drum);
  mixer.setLevel('synth',  p.synth);
  mixer.setLevel('master', p.master);

  mixer.setPan('drum',  p.pan.drum);
  mixer.setPan('synth', p.pan.synth);

  mixer.setSend('drum',  p.send.drum);
  mixer.setSend('synth', p.send.synth);

  mixer.setFxEnabled(p.fx.enabled);
  mixer.setFxParams({
    reverbMix: p.fx.reverbMix,
    delayTime: p.fx.delayTime,
    delayFeedback: p.fx.delayFeedback,
    returnLevel: p.fx.returnLevel,
  });

  mixer.setLimiterEnabled(p.limiterOn);
  store.notify();
}

// ===== Main AI Genre generator =====
function generateGenre(genreKey: GenreKey) {
  const preset = GENRE_PRESETS[genreKey];

  // 1) BPM
  const bpm = Array.isArray(preset.bpm)
    ? Math.floor(preset.bpm[0] + Math.random()*(preset.bpm[1]-preset.bpm[0]))
    : preset.bpm;
  store.bpm = bpm;

  // 2) Chords
  const chordProg = pick(preset.chordPresets);
  generateAIChords({
    key: preset.key,
    mode: preset.mode,
    preset: chordProg,
    voicing: Math.random() < 0.5 ? "triad" : "7th",
    octave: preset.mode === "minor" ? 4 : 4,
    density: 0.6,
    strum: true
  });

  // 3) Drums
  generateAIDrums({
    style: preset.drums.style,
    density: preset.drums.density ?? 0.7,
    hatRate: preset.drums.hatRate ?? "16th",
    humanize: 0.2
  });

  // 4) Melody
  generateAIMelody({
    key: preset.key,
    mode: preset.mode,
    contour: preset.melody.contour,
    followChords: preset.melody.followChords,
    density: preset.melody.density,
    spanRows: 6
  });

  // 5) Bassline
  generateAIBassline({
    key: preset.key,
    mode: preset.mode,
    useChords: true,
    pattern: preset.bass.pattern,
    density: 1.0,
    octaveShift: preset.bass.octaveShift,
    walk: preset.bass.walk,
    melodyRowsTop: 6
  });

  // 6) Mixer / FX vibe
  applyMixerPreset(preset.mixer);

  console.log(`[DAWn] Generated genre: ${genreKey} @ ${bpm} BPM with ${chordProg}`);
}
// ===== Export helpers (WAV/MP3) =====
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Interleave & WAV encode
function interleaveFloat32(l: Float32Array, r: Float32Array) {
  const len = l.length + r.length;
  const out = new Float32Array(len);
  let i = 0, j = 0;
  while (i < len) { out[i++] = l[j]; out[i++] = r[j++]; }
  return out;
}

function floatTo16BitPCM(float32: Float32Array) {
  const out = new DataView(new ArrayBuffer(float32.length * 2));
  let offset = 0;
  for (let i = 0; i < float32.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    out.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return out;
}

function encodeWAVFromAudioBuffer(buf: AudioBuffer) : Blob {
  const numChannels = Math.min(2, buf.numberOfChannels);
  const sampleRate = buf.sampleRate;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    interleaved = interleaveFloat32(buf.getChannelData(0), buf.getChannelData(1));
  } else {
    const mono = buf.getChannelData(0);
    interleaved = interleaveFloat32(mono, mono);
  }

  const pcm16 = floatTo16BitPCM(interleaved);
  const wavBuffer = new ArrayBuffer(44 + pcm16.byteLength);
  const view = new DataView(wavBuffer);

  // RIFF header
  function writeStr(off: number, s: string) { for (let i=0;i<s.length;i++) view.setUint8(off+i, s.charCodeAt(i)); }
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm16.byteLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);               // fmt chunk size
  view.setUint16(20, 1, true);                // PCM
  view.setUint16(22, 2, true);                // channels (we write stereo)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2 * 2, true);// byte rate
  view.setUint16(32, 2 * 2, true);            // block align
  view.setUint16(34, 16, true);               // bits per sample
  writeStr(36, "data");
  view.setUint32(40, pcm16.byteLength, true);

  // PCM payload
  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcm16.buffer));
  return new Blob([wavBuffer], { type: "audio/wav" });
}

// ---------------- Types & helpers for Piano Roll Pro ----------------
type Tool = "paint" | "erase" | "select";

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function copyGrid(grid: boolean[][]): boolean[][] {
  return grid.map(row => [...row]);
}

function quantizeGridToStep(step: number) {
  const rows = store.piano.rows;
  const cols = store.piano.cols;
  const old = store.piano.grid;
  const next: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!old[r][c]) continue;
      const nc = clamp(Math.round(c / step) * step, 0, cols - 1);
      next[r][nc] = true;
    }
  }

  store.piano.grid = next;
}

function playPreview(midi: number, durMs = 260, vel = 0.9) {
  // 1) Try native hook (for future JUCE bridge)
  try {
    const hook = (window as any)?.dawnPlayPreview;
    if (typeof hook === "function") {
      hook(midi);
      return;
    }
  } catch {
    // ignore and fall back
  }

  // 2) Fallback: use internal WebAudio synth through the mixer
  synth.ensureCtx();
  if (!synth.ctx) return;

  const ctx = synth.ctx;
  const freq = midiToFreq(midi);
  const when = ctx.currentTime;
  const durSec = durMs / 1000;

  synth.note(freq, when, durSec, vel);
}

// --- Typing keyboard → MIDI helper (FL-style-ish) ---
const TYPING_KEYS = "zxcvbnm,./asdfghjkl;'qwertyuiop[]";

function typingKeyToMidi(k: string): number | null {
  k = k.toLowerCase();
  const idx = TYPING_KEYS.indexOf(k);
  if (idx === -1) return null;
  const BASE = 48; // C3
  return BASE + idx;
}

// ------------------------- Piano Roll (Pro + AI + Automation) -------------------------
function PianoRoll() {
    const [instrument, setInstrument] = React.useState<"piano" | "guitar">("piano");
  const rows = store.piano.rows;
  const cols = store.piano.cols;
  const [, tick] = React.useState(0);
  React.useEffect(() => store.subscribe(() => tick(t => t + 1)), []);

  // Pro tools
  const [tool, setTool] = React.useState<Tool>("paint");
  const [snap, setSnap] = React.useState<1 | 2 | 4>(1);
  const [zoom, setZoom] = React.useState(1);
  const [ghostOn, setGhostOn] = React.useState(true);
  const [audition, setAudition] = React.useState(true);
  const [pressedKey, setPressedKey] = useState<number | null>(null);
  // QWERTY layout → 12 notes (C5..B4)
 

   useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (target && target.isContentEditable)
      ) return;

      const k = e.key.toLowerCase();
      const midi = typingKeyToMidi(k);
      if (midi == null) return;

      const idx = midiToRow(midi);
      if (idx < 0 || idx >= rows) return;

      if (pressedKey === idx) return;

      e.preventDefault();
      setPressedKey(idx);
      playPreview(midi, 220);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const midi = typingKeyToMidi(e.key.toLowerCase());
      if (midi == null) return;
      const idx = midiToRow(midi);
      if (idx === pressedKey) setPressedKey(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [pressedKey, rows]);


  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const selRef = React.useRef(sel);
  selRef.current = sel;

  const drag = React.useRef<null | {
    mode: "paint" | "erase" | "marquee" | "move" | "resize-left" | "resize-right";
    row: number;
    startCol: number;
    lastCol: number;
    baseGrid?: boolean[][];
    selOrigin?: { row: number; col: number }[];
  }>(null);

  const gridW = 24 * zoom;
  const gridH = 24;

  const keyOf = (r: number, c: number) => `${r}-${c}`;
  const isOn = (r: number, c: number) => !!store.piano.grid[r][c];

  const setVel = (c: number, v: number) => {
    store.piano.velocity[c] = Math.max(0.05, Math.min(1, v));
    store.notify();
  };

  const clearSel = () => setSel(new Set());
  const setRectSel = (r1: number, c1: number, r2: number, c2: number) => {
    const s = new Set<string>();
    const rr1 = Math.min(r1, r2),
      rr2 = Math.max(r1, r2);
    const cc1 = Math.min(c1, c2),
      cc2 = Math.max(c1, c2);
    for (let r = rr1; r <= rr2; r++) {
      for (let c = cc1; c <= cc2; c++) {
        if (isOn(r, c)) s.add(keyOf(r, c));
      }
    }
    setSel(s);
  };
  const selCells = () => {
    const out: { row: number; col: number }[] = [];
    sel.forEach(k => {
      const [r, c] = k.split("-").map(Number);
      out.push({ row: r, col: c });
    });
    return out;
  };

  function fillRun(row: number, from: number, to: number, on: boolean) {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    for (let c = start; c <= end; c++) {
      store.piano.grid[row][c] = on;
    }
  }

  function onCellDown(r: number, c: number, e: React.MouseEvent) {
    const snapped = Math.floor(c / snap) * snap;
    if (tool === "paint") {
      drag.current = { mode: "paint", row: r, startCol: snapped, lastCol: snapped };
      fillRun(r, snapped, snapped, true);
      if (audition) playPreview(72 - r);
      store.notify();
      clearSel();
      return;
    }
    if (tool === "erase") {
      drag.current = { mode: "erase", row: r, startCol: snapped, lastCol: snapped };
      fillRun(r, snapped, snapped, false);
      store.notify();
      clearSel();
      return;
    }
    drag.current = { mode: "marquee", row: r, startCol: snapped, lastCol: snapped };
    setRectSel(r, snapped, r, snapped);
  }

  function onCellEnter(r: number, c: number) {
    if (!drag.current) return;
    const snapped = Math.floor(c / snap) * snap;
    const d = drag.current;
    d.lastCol = snapped;

    if (d.mode === "paint") {
      fillRun(d.row, d.startCol, snapped, true);
      store.notify();
    } else if (d.mode === "erase") {
      fillRun(d.row, d.startCol, snapped, false);
      store.notify();
    } else if (d.mode === "marquee") {
      setRectSel(d.row, d.startCol, r, snapped);
    } else if (d.mode === "move") {
      if (!d.baseGrid || !d.selOrigin) return;
      const dc = snapped - d.startCol;
      const dr = r - d.row;
      store.piano.grid = copyGrid(d.baseGrid);
      for (const cell of d.selOrigin) {
        const nr = clamp(cell.row + dr, 0, rows - 1);
        const nc = clamp(cell.col + dc, 0, cols - 1);
        store.piano.grid[nr][nc] = true;
      }
      store.notify();
    } else if (d.mode === "resize-left" || d.mode === "resize-right") {
      if (!d.baseGrid || !d.selOrigin) return;
      store.piano.grid = copyGrid(d.baseGrid);
      const delta = snapped - d.startCol;
      const cellsByRow: Record<number, number[]> = {};
      d.selOrigin.forEach(cell => {
        (cellsByRow[cell.row] ||= []).push(cell.col);
      });
      for (const rrStr in cellsByRow) {
        const rr = Number(rrStr);
        const colsOn = cellsByRow[rr].sort((a, b) => a - b);
        const minC = colsOn[0],
          maxC = colsOn[colsOn.length - 1];
        if (d.mode === "resize-left") {
          const newMin = clamp(minC + delta, 0, maxC);
          for (let c = 0; c < cols; c++) if (store.piano.grid[rr][c]) store.piano.grid[rr][c] = false;
          for (let c = newMin; c <= maxC; c++) store.piano.grid[rr][c] = true;
        } else {
          const newMax = clamp(maxC + delta, minC, cols - 1);
          for (let c = 0; c < cols; c++) if (store.piano.grid[rr][c]) store.piano.grid[rr][c] = false;
          for (let c = minC; c <= newMax; c++) store.piano.grid[rr][c] = true;
        }
      }
      store.notify();
    }
  }

  function onMouseUp() {
    drag.current = null;
  }

  function beginMove(e: React.MouseEvent) {
    e.stopPropagation();
    const cells = selCells();
    if (cells.length === 0) return;
    drag.current = {
      mode: "move",
      row: cells[0].row,
      startCol: cells[0].col,
      lastCol: cells[0].col,
      baseGrid: copyGrid(store.piano.grid),
      selOrigin: cells,
    };
  }

  function beginResize(which: "left" | "right", e: React.MouseEvent) {
    e.stopPropagation();
    const cells = selCells();
    if (cells.length === 0) return;
    drag.current = {
      mode: which === "left" ? "resize-left" : "resize-right",
      row: cells[0].row,
      startCol:
        which === "left" ? Math.min(...cells.map(c => c.col)) : Math.max(...cells.map(c => c.col)),
      lastCol: 0,
      baseGrid: copyGrid(store.piano.grid),
      selOrigin: cells,
    };
  }

  const doQuantize = () => {
    quantizeGridToStep(snap);
    store.notify();
  };

  return (
    <div className="space-y-4">
      {/* === Toolbar + Pro Controls === */}
      <section className={panel}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold mr-2">Piano Roll</h2>

          {/* Tools */}
          <div className="flex items-center gap-1 text-xs border border-white/10 rounded-md bg-black/20 p-1">
            {(["paint", "erase", "select"] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`px-2 py-1 rounded-md border ${
                  tool === t
                    ? "bg-white/[0.10] border-white/20"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                }`}
                title={t}
              >
                {t === "paint" ? "✍" : t === "erase" ? "⌫" : "▭"} {t}
              </button>
            ))}
          </div>

          {/* Snap + Quantize */}
          <div className="flex items-center gap-1 text-xs border border-white/10 rounded-md bg-black/20 p-1">
            <span className="text-textLo px-2">Snap</span>
            <select
              value={snap}
              onChange={e => setSnap(Number(e.currentTarget.value) as any)}
              className="bg-black/30 border border-white/10 rounded px-2 py-1"
            >
              <option value={1}>1/16</option>
              <option value={2}>1/8</option>
              <option value={4}>1/4</option>
            </select>
            <button
              onClick={doQuantize}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06]"
            >
              Quantize
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 text-xs border border-white/10 rounded-md bg-black/20 p-1">
            <span className="text-textLo px-2">Zoom</span>
            <input
              type="range"
              min={0.75}
              max={2}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(parseFloat(e.currentTarget.value))}
            />
          </div>

          {/* Ghost / Audition */}
          <label className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 bg-black/20">
            <input
              type="checkbox"
              checked={ghostOn}
              onChange={e => setGhostOn(e.currentTarget.checked)}
              className="accent-cyan-300"
            />
            Ghost notes
          </label>
          <label className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 bg-black/20">
            <input
              type="checkbox"
              checked={audition}
              onChange={e => setAudition(e.currentTarget.checked)}
              className="accent-cyan-300"
            />
            Audition
          </label>

          {/* Quick bass */}
          <button
            onClick={() => {
              const key: KeyRoot = "C";
              const mode: Mode = "major";
              generateAIBassline({
                key,
                mode,
                useChords: true,
                pattern: "quarters",
                density: 1,
                octaveShift: -12,
                walk: 0.25,
                melodyRowsTop: 6,
              });
            }}
            className="ml-auto px-2 py-1 text-xs rounded-md border border-white/10 bg-black/20 hover:border-white/20"
          >
                      {/* Instrument selector */}
          <div className="flex items-center gap-1 text-xs border border-white/10 rounded-md bg-black/20 p-1">
            <span className="text-textLo px-2">Instrument</span>
            <select
              value={instrument}
              onChange={e => {
                const value = e.currentTarget.value as "piano" | "guitar";
                setInstrument(value);
                setSynthInstrument(value);
              }}
              className="bg-black/30 border border-white/10 rounded px-2 py-1"
            >
              <option value="piano">Grand Piano</option>
              <option value="guitar">Guitar</option>
            </select>
          </div>

            🎸 Quick Bass
          </button>
        </div>

        {/* === AI CHORDS / MELODY / BASS macro controls === */}
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {/* AI Chords */}
          <div className="flex items-center gap-2 text-xs border border-white/10 rounded-md bg-black/20 p-2">
            <span className="text-textLo">AI Chords:</span>

            <select id="aiKey" className="bg-black/30 border border-white/10 rounded px-2 py-1">
              {NOTE_NAMES.map(k => (
                <option key={k}>{k}</option>
              ))}
            </select>

            <select id="aiPreset" className="bg-black/30 border border-white/10 rounded px-2 py-1">
              <option>I–V–vi–IV</option>
              <option>i–VI–III–VII</option>
              <option>I–vi–IV–V</option>
              <option>ii–V–I–I</option>
            </select>

            <button
              onClick={() => {
                const key = (document.getElementById("aiKey") as HTMLSelectElement).value as KeyRoot;
                const preset = (document.getElementById("aiPreset") as HTMLSelectElement).value;
                generateAIChords({ key, preset });
              }}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06]"
            >
              Generate
            </button>
          </div>

          {/* AI Melody */}
          <div className="flex items-center gap-2 text-xs border border-white/10 rounded-md bg-black/20 p-2">
            <span className="text-textLo">AI Melody:</span>

            <select id="melKey" className="bg-black/30 border border-white/10 rounded px-2 py-1">
              {NOTE_NAMES.map(k => (
                <option key={k}>{k}</option>
              ))}
            </select>

            <select id="melMode" className="bg-black/30 border border-white/10 rounded px-2 py-1">
              <option>major</option>
              <option>minor</option>
              <option>dorian</option>
              <option>mixolydian</option>
              <option>lydian</option>
              <option>phrygian</option>
              <option>locrian</option>
            </select>

            <select id="melContour" className="bg-black/30 border border-white/10 rounded px-2 py-1">
              <option value="random">random</option>
              <option value="up">ascending</option>
              <option value="down">descending</option>
            </select>

            <label className="inline-flex items-center gap-1">
              <input id="melFollow" type="checkbox" defaultChecked className="accent-cyan-300" />
              Follow chords
            </label>

            <button
              onClick={() => {
                const key = (document.getElementById("melKey") as HTMLSelectElement)
                  .value as KeyRoot;
                const mode = (document.getElementById("melMode") as HTMLSelectElement).value as Mode;
                const contour = (document.getElementById("melContour") as HTMLSelectElement)
                  .value as "up" | "down" | "random";
                const followChords = (document.getElementById("melFollow") as HTMLInputElement)
                  .checked;

                generateAIMelody({
                  key,
                  mode,
                  contour,
                  followChords,
                  density: 0.65,
                  spanRows: 6,
                });
              }}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.06]"
            >
              Generate
            </button>
          </div>

          {/* AI Bass + Clear Bass */}
          <div className="flex flex-wrap items-center gap-2 text-xs border border-white/10 rounded-md bg-black/20 p-2">
            <span className="text-textLo">AI Bass:</span>

            <button
              onClick={() => {
                const key =
                  ((document.getElementById("melKey") as HTMLSelectElement)?.value as KeyRoot) ||
                  "C";
                const mode =
                  ((document.getElementById("melMode") as HTMLSelectElement)?.value as Mode) ||
                  "major";
                generateAIBassline({
                  key,
                  mode,
                  useChords: true,
                  pattern: "quarters",
                  density: 1.0,
                  octaveShift: -12,
                  walk: 0.25,
                  melodyRowsTop: 6,
                });
              }}
              className="px-2 py-1 rounded-md border border-white/10 bg-black/20 hover:border-white/20"
            >
              🎸 Generate Bass
            </button>

            <button
              onClick={() => {
                const rows = store.piano.rows,
                  cols = store.piano.cols;
                const bassRows = [rows - 2, rows - 1].filter(r => r >= 0);
                bassRows.forEach(r => {
                  for (let c = 0; c < cols; c++) store.piano.grid[r][c] = false;
                });
                store.notify();
              }}
              className="px-2 py-1 text-xs rounded-md border border-white/10 bg-black/20 hover:border-white/20"
            >
              🧼 Clear Bass
            </button>
          </div>
        </div>
      </section>

      {/* === Keys + Grid === */}
      <section className={panel}>
        <div className="grid" style={{ gridTemplateColumns: `120px 1fr` }}>
     {/* Piano keys column */}
    <div
      className="pr-0 select-none border-r border-black/70 bg-black"
      onMouseLeave={() => setPressedKey(null)}
    >
      {Array.from({ length: rows }).map((_, r) => {
        const label = labelForRow(r);
        const isBlack = isBlackKeyRow(r);
        const isDown = pressedKey === r;
        const midi = 72 - r;

        const handleMouseDown = () => {
          setPressedKey(r);
          playPreview(midi, 220);
        };

        const handleMouseUp = () => {
          setPressedKey(null);
        };

        return (
          <div
            key={r}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
                   className={`
          h-6 flex items-center justify-end text-[10px] pr-2
          border-b border-black/60 cursor-pointer select-none
          ${isBlack
            ? "bg-[#111318] text-gray-50"
            : "bg-[#f7f7fb] text-gray-900"}
          ${isDown ? "brightness-110 shadow-[inset_0_0_6px_rgba(0,0,0,0.35)]" : ""}
        `}
      >
        <div
          className={`
            mr-1 h-5 w-3 rounded-l
            ${isBlack ? "bg-[#05070b]" : "bg-[#e5e7eb]"}
            shadow-[inset_1px_0_0_rgba(0,0,0,0.3)]
          `}
        />
            <span className="tabular-nums">{label}</span>
          </div>
        );
      })}
    </div>



          {/* Grid */}
          <div
            className="rounded-xl overflow-hidden border border-white/5 p-1 relative"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)," +
                "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
                  backgroundSize: `calc(100% / ${cols}) 1px, 1px ${gridH}px`,
            }}
            onMouseUp={onMouseUp}
          >
           {/* Playhead + bar lines (every 4th step stronger) */}
<div
  className="absolute inset-0 pointer-events-none grid"
  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
>

  {Array.from({ length: cols }).map((_, c) => {
    const isBarLine = c % 4 === 0; // every beat (4 x 16th = 1/4 note)
    const isPlayhead = store.step === c;

    return (
      <div
        key={c}
        className={`
          h-full
          ${isBarLine ? 'border-l border-white/10 bg-white/[0.02]' : ''}
          ${isPlayhead ? 'bg-accent/10 border-l border-accent/70 dawn-smooth' : ''}
        `}
      />
    );
  })}
</div>

  {/* Octave dividers – thicker line on every C row */}
  <div className="absolute inset-0 pointer-events-none">
    {Array.from({ length: rows }).map((_, r) => {
      if (!isCRow(r)) return null;
      return (
        <div
          key={r}
          style={{
            position: "absolute",
            top: r * gridH,
            left: 0,
            right: 0,
            height: 2,
            background: "rgba(255,255,255,0.16)",
            boxShadow: "0 1px 0 rgba(0,0,0,0.9)",
          }}
        />
      );
    })}
  </div>

            {/* Ghost notes */}
            {ghostOn && (
              <div
  className="absolute inset-0 pointer-events-none grid"
  style={{
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, ${gridH}px)`,
  }}
>

                {Array.from({ length: rows }).map((_, r) =>
                  Array.from({ length: cols }).map((_, c) => {
                    const on = store.piano.grid[r][c];
                    return on ? (
                      <div
                        key={`${r}-g-${c}`}
                        className="m-[2px] rounded-sm bg-white/10"
                        style={{ width: "100%", height: gridH - 4, opacity: 0.35 }}
                      />
                    ) : null;
                  })
                )}
              </div>
            )}

            {/* Editable notes */}
                  {/* Editable notes */}
      <div
  className="grid relative"
  style={{
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, ${gridH}px)`,
  }}
  onMouseLeave={() => (drag.current = null)}
>

        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const on = store.piano.grid[r][c];
            const selected = sel.has(keyOf(r, c));
            const hot = c % (4 * snap) === 0;
            const rowIsBlack = isBlackKeyRow(r);

            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={e => onCellDown(r, c, e)}
                onMouseEnter={() => onCellEnter(r, c)}
                className={`m-0.5 rounded-sm border transition-transform duration-100
                  ${
                    on
                      ? selected
                        ? "bg-cyan-400/80 border-cyan-300"
                        : "bg-accent/70 border-accent/80"
                      : hot
                      ? "border-accent/60 bg-accent/10"
                      : rowIsBlack
                        ? "border-white/5 bg-slate-900/80"
                        : "border-white/5 bg-slate-800/80"
                  }
                  ${store.step === c ? "outline outline-2 outline-accent/70" : ""}`}
                style={{
                  width: "100%",
                  height: gridH - 2,
                  cursor: tool === "select" ? "crosshair" : "default",
                }}
                title={`${labelForRow(r)} @ ${c + 1}`}
              />
            );
          })
        )}
      </div>


            {/* Selection overlay */}
            {sel.size > 0 && (
              <SelectionOverlay
                sel={selCells()}
                gridW={gridW}
                gridH={gridH}
                onBeginMove={beginMove}
                onBeginResizeLeft={e => beginResize("left", e)}
                onBeginResizeRight={e => beginResize("right", e)}
              />
            )}
          </div>
        </div>

        {/* Velocity */}
        <div className="mt-3">
          <h4 className="text-xs font-semibold mb-1">Velocity</h4>
          <div className="h-24 rounded-xl overflow-hidden border border-white/5 bg-black/30 flex items-end gap-1 p-2">
            {Array.from({ length: cols }).map((_, c) => (
              <VelBar key={c} col={c} onChange={setVel} />
            ))}
          </div>
        </div>
      </section>

      {/* === Automation lanes (master / sends) === */}
      <section className={`${panel} mt-4`}>
        <h3 className="text-sm font-semibold mb-2">Automation</h3>
        <AutomationLane label="Master Volume" laneKey="master" />
        <AutomationLane label="Drum FX Send" laneKey="drumSend" />
        <AutomationLane label="Synth FX Send" laneKey="synthSend" />
      </section>
    </div>
  );
}

// ---------------- Selection overlay for moving / resizing notes ----------------
function SelectionOverlay({
  sel,
  gridW,
  gridH,
  onBeginMove,
  onBeginResizeLeft,
  onBeginResizeRight,
}: {
  sel: { row: number; col: number }[];
  gridW: number;
  gridH: number;
  onBeginMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onBeginResizeLeft: (e: React.MouseEvent<HTMLDivElement>) => void;
  onBeginResizeRight: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  if (sel.length === 0) return null;
  const rows = sel.map(s => s.row);
  const cols = sel.map(s => s.col);
  const minR = Math.min(...rows);
  const maxR = Math.max(...rows);
  const minC = Math.min(...cols);
  const maxC = Math.max(...cols);

  const top = minR * gridH;
  const left = minC * gridW;
  const width = (maxC - minC + 1) * gridW;
  const height = (maxR - minR + 1) * gridH;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top,
        left,
        width,
        height,
      }}
    >
      <div className="relative w-full h-full border border-cyan-400/80 bg-cyan-400/10 pointer-events-auto">
        {/* Move handle */}
        <div
          onMouseDown={onBeginMove}
          className="absolute inset-x-4 top-0 h-2 cursor-move bg-cyan-300/60"
        />
        {/* Left resize */}
        <div
          onMouseDown={onBeginResizeLeft}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-300/70"
        />
        {/* Right resize */}
        <div
          onMouseDown={onBeginResizeRight}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-300/70"
        />
      </div>
    </div>
  );
}

// ---------------- Automation lanes ----------------
function AutomationLane({
  label,
  laneKey,
}: {
  label: string;
  laneKey: "master" | "drumSend" | "synthSend";
}) {
  const cols = store.piano.cols;
  const [, setTick] = React.useState(0);
  React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);

  const setVal = (c: number, v: number) => {
    store.automation[laneKey][c] = Math.min(1, Math.max(0, v));
    store.notify();
  };

  return (
    <div className="mb-3">
      <h4 className="text-xs font-semibold mb-1">{label}</h4>
      <div className="h-24 rounded-xl overflow-hidden border border-white/5 bg-black/30 flex items-end gap-1 p-2">
        {Array.from({ length: cols }).map((_, c) => (
          <AutoBar key={c} col={c} laneKey={laneKey} onChange={setVal} />
        ))}
      </div>
    </div>
  );
}

function AutoBar({
  col,
  laneKey,
  onChange,
}: {
  col: number;
  laneKey: "master" | "drumSend" | "synthSend";
  onChange: (c: number, v: number) => void;
}) {
  const [drag, setDrag] = React.useState(false);
  const v = store.automation[laneKey][col];
  const h = 10 + v * 80;

  const update = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const rel = 1 - (e.clientY - r.top) / r.height;
    onChange(col, rel);
  };

  return (
    <div
      onMouseDown={e => {
        setDrag(true);
        update(e);
      }}
      onMouseUp={() => setDrag(false)}
      onMouseLeave={() => setDrag(false)}
      onMouseMove={e => {
        if (drag) update(e);
      }}
      className="flex-1 bg-white/10 hover:bg-white/20 cursor-ns-resize rounded-sm"
      style={{ height: `${h}px` }}
      title={`${laneKey} @ ${Math.round(v * 100)}%`}
    />
  );
}

// ---------------- Velocity bars & labels ----------------
function VelBar({
  col,
  onChange,
}: {
  col: number;
  onChange: (c: number, v: number) => void;
}) {
  const [drag, setDrag] = React.useState(false);
  const vel = store.piano.velocity[col];
  const h = 20 + vel * 60;

  function clampVel(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const rel = 1 - (e.clientY - rect.top) / rect.height;
    return Math.max(0.05, Math.min(1, rel));
  }

  return (
    <div
      onMouseDown={e => {
        setDrag(true);
        onChange(col, clampVel(e));
      }}
      onMouseUp={() => setDrag(false)}
      onMouseLeave={() => setDrag(false)}
      onMouseMove={e => {
        if (drag) onChange(col, clampVel(e));
      }}
      className="flex-1 bg-white/10 hover:bg-white/20 cursor-ns-resize"
      style={{ height: `${h}px` }}
      title={`Velocity ${Math.round(vel * 127)}`}
    />
  );
}

function labelForRow(r: number) {
  const midi = 72 - r;
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const name = names[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}
function isBlackKeyRow(r: number) {
  // Row 0 = C5, then descending chromatically for 12 rows
  const midi = 72 - r;
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const n = names[midi % 12];
  return n.includes('#'); // C#, D#, F#, G#, A#
}
function isCRow(r: number) {
  // Row 0 = C5, descending chromatically
  const midi = 72 - r;
  return (midi % 12) === 0; // C notes only
}

// ------------------------- AI Genre Starter (Playlist helper) -------------------------
function AIGenreStarterPanel() {
  const [genre, setGenre] = useState<GenreKey>("LoFi");
  const [status, setStatus] = useState<string>(
    "Pick a genre and DAWn will generate BPM, chords, drums, melody, bass and mix."
  );

  const GENRES: GenreKey[] = ["Trap", "Drill", "HipHop", "LoFi", "House", "Techno", "EDM", "Pop"];

  const handleGenerate = () => {
    generateGenre(genre);
    setStatus(`Generated a ${genre} idea at ${store.bpm} BPM.`);
  };

  const handleSurprise = () => {
    const g = GENRES[Math.floor(Math.random() * GENRES.length)];
    setGenre(g);
    generateGenre(g);
    setStatus(`Surprise: ${g} sketch at ${store.bpm} BPM.`);
  };

  return (
    <section className={panel}>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <h2 className="text-sm font-semibold">AI Genre Starter</h2>
          <p className="text-[11px] text-textLo">
            One click to block out a full idea: chords, drums, melody, bass and mixer.
          </p>
        </div>
        <div className="text-[10px] text-textLo/80 max-w-[200px] text-right">
          {status}
        </div>
      </div>

      {/* Genre selector */}
      <div className="flex flex-wrap gap-1 mb-3 text-xs">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={
              "px-2 py-1 rounded-md border " +
              (genre === g
                ? "bg-accent/20 border-accent/60 text-accent-foreground"
                : "bg-black/30 border-white/10 hover:border-accent/40 hover:bg-accent/10")
            }
          >
            {g}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 text-xs items-center">
        <button
          onClick={handleGenerate}
          className="px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.10] hover:bg-white/[0.16]"
        >
          🌌 Generate {genre} Sketch
        </button>
        <button
          onClick={handleSurprise}
          className="px-3 py-1.5 rounded-md border border-white/10 bg-black/30 hover:border-accent/60 hover:bg-accent/10"
        >
          🎲 Surprise Me
        </button>
        <span className="text-[10px] text-textLo/80">
          Uses your <code>GENRE_PRESETS</code> + <code>generateGenre()</code> under the hood.
        </span>
      </div>
    </section>
  );
}

// ------------------------- Playlist -------------------------

function Playlist() {
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((x) => x + 1)), []);
  const cols = store.piano.cols;

  const audioLaneRef = useRef<HTMLDivElement | null>(null);

  const handleLaneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if ((window as any).__dawnDragClipId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleLaneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clipId = (window as any).__dawnDragClipId as string | undefined;
    if (!clipId || !audioLaneRef.current) return;

    const srcClip = store.audio.clips.find((c: any) => c.id === clipId);
    if (!srcClip) return;

    const rect = audioLaneRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const totalCols = cols;

    const col = Math.max(
      0,
      Math.min(totalCols - 1, Math.floor((relX / rect.width) * totalCols))
    );

    const newClip = {
      ...srcClip,
      id: crypto.randomUUID(),
      startCol: col,
    };

    store.audio.clips.push(newClip as any);
    store.notify();
  };



  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Playlist</h2>
        {store.projectThumbPngB64 && (
  <img
    src={store.projectThumbPngB64}
    alt="thumb"
    className="ml-2 w-10 h-8 rounded border border-white/10 object-cover"
  />
)}

        <div className="flex items-center gap-2 text-xs">
          <KnobLike label="Snap" value="1/4" />
          <KnobLike label="Grid" value="On" />
          <label className="px-2 py-1 rounded-md border border-white/10 bg-black/20 cursor-pointer">
            + Import Audio
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
  const inputEl = e.currentTarget;          // cache before await
  const f = inputEl.files?.[0];
  if (f) await importAudioFile(f);
  inputEl.value = "";                      // reset to allow re-importing same file
}}

            />
          </label>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "160px 1fr" }}>
        <div className="space-y-2">
          {["Audio", "Track 2", "Track 3", "Track 4"].map(t => (
            <div key={t} className="h-10 flex items-center px-3 rounded-md border border-white/10 bg-black/25 text-sm">{t}</div>
          ))}
        </div>

        <div className="min-h-[280px] rounded-xl border border-white/5 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:24px_1px,1px_48px] p-2">
          {/* === Audio Lane (row 1) – drop target for Browser samples === */}
          <div
            ref={audioLaneRef}
            className="relative h-16 mb-2"
            onDragOver={handleLaneDragOver}
            onDrop={handleLaneDrop}
          >
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${cols}, 24px)` }}
            >
              {store.audio.clips.map((clip) => (
                <AudioClipBox key={clip.id} clip={clip} />
              ))}
            </div>
          </div>


          <div className="grid grid-cols-12 gap-2 mt-2">
            <Clip label="PATTERN 1" tone="violet" span={3} />
            <Clip label="AUDIO CLIP" tone="emerald" span={4} />
            <Clip label="AUTOMATION" tone="orange" span={2} />
          </div>
        </div>
      </div>
    </section>
  );
}

function AudioClipBox({ clip }: { clip: AudioClip }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawWaveform(ref.current, clip.buffer);
  }, [clip.buffer, ref]);

  const onDrag = (dxCols: number) => {
    clip.startCol = Math.max(0, Math.min(31, clip.startCol + dxCols));
    store.notify();
  };
  const onResize = (dxCols: number) => {
    clip.spanCols = Math.max(1, Math.min(32 - clip.startCol, clip.spanCols + dxCols));
    store.notify();
  };

  return (
    <DraggableCols
      startCol={clip.startCol}
      spanCols={clip.spanCols}
      onDrag={onDrag}
      onResize={onResize}
    >
      <div className="h-full rounded-md border border-cyan-300/40 bg-cyan-300/10 dawn-sheen overflow-hidden flex">
        <canvas
          ref={ref}
          width={clip.spanCols * 24}
          height={64}
          className="opacity-90"
          style={{ display: 'block' }}
        />
      </div>
    </DraggableCols>
  );
}

function DraggableCols({
  startCol, spanCols, onDrag, onResize, children
}: {
  startCol: number; spanCols: number;
  onDrag: (dxCols:number)=>void;
  onResize: (dxCols:number)=>void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<null | { type:'move'|'resize'; startX:number; startCol:number; spanCols:number }>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !ref.current) return;
      const dx = e.clientX - dragging.current.startX;
      const dxCols = Math.round(dx / 24);
      if (dragging.current.type === 'move') onDrag(dxCols);
      else onResize(dxCols);
    };
    const onUp = () => dragging.current = null;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onDrag, onResize]);

  return (
    <div
      ref={ref}
      className="absolute top-0 h-16"
      style={{
        left: startCol * 24,
        width: spanCols * 24,
      }}
    >
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { dragging.current = { type:'move', startX: e.clientX, startCol, spanCols }; }}
      >
        {children}
      </div>
      <div
        className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-white/5"
        onMouseDown={(e) => { e.stopPropagation(); dragging.current = { type:'resize', startX: e.clientX, startCol, spanCols }; }}
        title="Drag to resize"
      />
    </div>
  );
}
function Clip(
  { label, tone = "violet", span = 3 }:
  { label: string; tone?: "violet" | "emerald" | "orange"; span?: number }
) {
  // Using inline style for grid span so Tailwind doesn’t purge dynamic classes
  const toneClass =
    tone === "emerald" ? "bg-emerald-500/20 border-emerald-400/50" :
    tone === "orange"  ? "bg-orange-500/20 border-orange-400/50"  :
                         "bg-violet-500/20 border-violet-400/50";

  return (
    <div
      className={`h-16 ${toneClass} rounded-lg border flex items-center px-3 text-sm font-medium`}
      style={{ gridColumn: `span ${span} / span ${span}` }}
    >
      {label}
    </div>
  );
}
// ------------------------- AI Preset Recommender (Mixer helper) -------------------------
function AIPresetRecommenderPanel() {
  const [detectedGenre, setDetectedGenre] = useState(null);
  const [status, setStatus] = useState(
    "Click Analyse to let DAWn guess a genre and mix for this project."
  );
  const [suggestions, setSuggestions] = useState(null);

  const ALL_GENRES = ["Trap", "Drill", "HipHop", "LoFi", "House", "Techno", "EDM", "Pop"];

  function guessGenreFromBpm(bpm: number) {
    let best = "LoFi";
    let bestScore = Infinity;

    ALL_GENRES.forEach((g) => {
      const preset = GENRE_PRESETS[g as GenreKey];
      const gbpm = preset.bpm;
      const center = Array.isArray(gbpm) ? (gbpm[0] + gbpm[1]) / 2 : gbpm;
      const score = Math.abs(center - bpm);
      if (score < bestScore) {
        bestScore = score;
        best = g;
      }
    });

    return best as GenreKey;
  }

  function buildSuggestionsForGenre(g: GenreKey) {
    switch (g) {
      case "Trap":
        return {
          drumKit: "808 Trap Kit – short kick, bright clap, skippy 16th hats",
          synthPreset: "Pluck Bell Lead – short decay, slight delay",
          bassPreset: "Glide 808 Mono – long tail, soft distortion",
          mixPreset: "Tight low-end, sidechained synth, wide hats, medium reverb",
        };
      case "Drill":
        return {
          drumKit: "UK Drill Kit – sliding 808s, offset snares, triplet hats",
          synthPreset: "Dark string / choir textures",
          bassPreset: "Sharp 808 with fast glide and saturation",
          mixPreset: "Snare pushed forward, mono 808, narrow instruments",
        };
      case "HipHop":
        return {
          drumKit: "Boom-bap Kit – punchy kick, snare with tail, loose hats",
          synthPreset: "Dusty keys / Rhodes-style preset",
          bassPreset: "Sub + mid-bass layered with gentle saturation",
          mixPreset: "Drums upfront, warm highs, light bus compression",
        };
      case "LoFi":
        return {
          drumKit: "LoFi Kit – soft kick, vinyl snare, noisy hats",
          synthPreset: "Warm pad / Rhodes with low-pass filter",
          bassPreset: "Rounded sub with slow attack and low-pass",
          mixPreset: "High-cut on master, light wow/flutter, big room reverb tail",
        };
      case "House":
        return {
          drumKit: "House Kit – 4x4 kick, clap on 2 & 4, shuffled hats",
          synthPreset: "Bright stab chords / house piano",
          bassPreset: "Short plucky bass locking with the kick",
          mixPreset: "Sidechain bass to kick, wide synths, bright top-end",
        };
      case "Techno":
        return {
          drumKit: "Techno Kit – hard kick, metallic percussion, rolling hats",
          synthPreset: "Hypnotic sequence / acid line",
          bassPreset: "Sub layered with distorted mid-bass",
          mixPreset: "Kick dominates, everything else subtle and controlled",
        };
      case "EDM":
        return {
          drumKit: "EDM Kit – big festival kick, snappy clap, aggressive fills",
          synthPreset: "SuperSaw lead with wide stereo and sidechain",
          bassPreset: "Layered bass (sub + mid growl)",
          mixPreset: "Heavy sidechain, bright highs, wide reverbs & delays",
        };
      case "Pop":
      default:
        return {
          drumKit: "Pop Kit – clean kick, crisp clap/snare, simple hats",
          synthPreset: "Polished keys / pluck lead with subtle chorus",
          bassPreset: "Tight low-end bass following root notes",
          mixPreset: "Balanced spectrum, vocal space in 2–5 kHz, gentle master glue",
        };
    }
  }

  function handleAnalyse() {
    const bpm = store.bpm;
    const g = guessGenreFromBpm(bpm);
    const preset = GENRE_PRESETS[g];
    const s = buildSuggestionsForGenre(g);

    setDetectedGenre(g);
    setSuggestions(s);
    setStatus(
      "Detected ~" + bpm + " BPM, closest to " + g + " in " + preset.key + " " + preset.mode + "."
    );
  }

  function handleApplyMix() {
    const g: GenreKey = detectedGenre || guessGenreFromBpm(store.bpm);
    const mixerPreset = GENRE_PRESETS[g].mixer;
    applyMixerPreset(mixerPreset);
    setStatus("Applied " + g + " mix preset to the live mixer.");
  }

  return (
    <section className={panel}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">AI Preset Recommender</h2>
          <p className="text-[11px] text-textLo">
            DAWn inspects BPM & genre curves to suggest drum kit, synth, bass and mix starting
            points.
          </p>
        </div>
        <div className="text-[10px] text-right text-textLo/80 max-w-[220px]">{status}</div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs mb-3">
        <button
          onClick={handleAnalyse}
          className="px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.06] hover:bg-white/[0.12]"
        >
          🔍 Analyse Project
        </button>
        <button
          onClick={handleApplyMix}
          className="px-3 py-1.5 rounded-md border border-accent/60 bg-accent/20 hover:bg-accent/30"
        >
          🎚 Apply Mix Suggestion
        </button>
      </div>

      {detectedGenre && suggestions && (
        <div className="grid gap-3 md:grid-cols-2 text-xs">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-textLo">Detected context</div>
            <div className="text-sm">
              <span className="font-semibold">{detectedGenre}</span>{" "}
              <span className="text-textLo">
                ({GENRE_PRESETS[detectedGenre].key} {GENRE_PRESETS[detectedGenre].mode})
              </span>
            </div>
            <div className="text-[11px] text-textLo/80">
              Based mainly on BPM ~{store.bpm}. You can still override by changing genre presets
              manually.
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-textLo">Suggested presets</div>
            <ul className="space-y-0.5">
              <li>
                <span className="text-textLo/70">Drums:</span> {suggestions.drumKit}
              </li>
              <li>
                <span className="text-textLo/70">Synth:</span> {suggestions.synthPreset}
              </li>
              <li>
                <span className="text-textLo/70">Bass:</span> {suggestions.bassPreset}
              </li>
              <li>
                <span className="text-textLo/70">Mix:</span> {suggestions.mixPreset}
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}


// ------------------------- Mixer -------------------------

function Mixer() {
function applyMixer() {
  engine.ensureCtx(); synth.ensureCtx();
  
  // faders
  mixer.setLevel('drum', store.mixer.drum);
  mixer.setLevel('synth', store.mixer.synth);
  mixer.setLevel('master', store.mixer.master);
  // pan
  mixer.setPan('drum', store.mixer.pan.drum);
  mixer.setPan('synth', store.mixer.pan.synth);
  // sends
  mixer.setSend('drum', store.mixer.send.drum);
  mixer.setSend('synth', store.mixer.send.synth);
  // gates (mute/solo)
  mixer.applyMuteSolo();
  // fx bus
  mixer.setFxEnabled(store.mixer.fx.enabled);
  mixer.setFxParams({
    reverbMix: store.mixer.fx.reverbMix,
    returnLevel: store.mixer.fx.returnLevel,
    delayTime: store.mixer.fx.delayTime,
    delayFeedback: store.mixer.fx.delayFeedback,
  });
  store.notify();
}
const isOn = store.mixer.limiterOn;

  const setLevel = (key: 'drum'|'synth'|'master', v: number) => {
    store.mixer[key] = v;
    mixer.setLevel(key, v);
    store.notify();
  };

  const toggleLimiter = () => {
    store.mixer.limiterOn = !store.mixer.limiterOn;
    mixer.setLimiterEnabled(store.mixer.limiterOn);
    store.notify();
  };
  return (
    <section className={panel}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Mixer</h2>
        <button
          onClick={toggleLimiter}
          className={`px-2 py-1 text-xs rounded-md border ${
  isOn ? 'border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_16px_rgba(103,232,249,0.25)]'
       : 'border-white/10 bg-black/20 hover:border-white/20'
}`}
          title="Master Limiter"
        >
          Limiter: {store.mixer.limiterOn ? 'On' : 'Off'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MixerStrip name="Insert 1 (Drums)" level={store.mixer.drum} onChange={(v)=>setLevel('drum', v)} />
        <MixerStrip name="Insert 2 (Synth)" level={store.mixer.synth} onChange={(v)=>setLevel('synth', v)} />
        <MixerStrip name="Insert 3" level={0.7} onChange={()=>{}} muted />
        <MixerStrip name="Master" level={store.mixer.master} onChange={(v)=>setLevel('master', v)} isMaster />
      </div>
    </section>
  );
}

function MixerStrip({ name, level = 0.8, onChange, isMaster, muted }: {
  name: string; level?: number; onChange?: (v:number)=>void; isMaster?: boolean; muted?: boolean
}) {
  const val = Math.max(0, Math.min(1, level));

  // meters if present
  let meter = 0;
  if (name.includes('Drum')) meter = store.meters?.drum ?? 0;
  else if (name.includes('Synth')) meter = store.meters?.synth ?? 0;
  else if (name.includes('Master')) meter = store.meters?.master ?? 0;

  const barHeight = `${(muted ? 0 : Math.max(0.08, meter) * 90) + 5}%`;

  const isDrum  = name.includes('Drum');
  const isSynth = name.includes('Synth');

  const panVal  = isMaster ? 0 : (isDrum ? store.mixer.pan.drum : isSynth ? store.mixer.pan.synth : 0);
  const sendVal = isMaster ? 0 : (isDrum ? store.mixer.send.drum : isSynth ? store.mixer.send.synth : 0);

  const mState = isDrum ? store.mixer.mute.drum : isSynth ? store.mixer.mute.synth : false;
  const sState = isDrum ? store.mixer.solo.drum : isSynth ? store.mixer.solo.synth : false;

  return (
    <div className={`${card} flex flex-col items-center gap-3`}>
      <div className="text-sm font-semibold">{name}</div>

      {/* Meter */}
     <div className="w-8 h-40 rounded bg-black/40 border border-white/10 overflow-hidden flex flex-col-reverse">
  <div className={`w-full ${isMaster ? 'bg-emerald-400/70' : 'bg-violet-400/70'} dawn-smooth`} style={{ height: barHeight }} />
</div>

      {/* Channel-only controls */}
      {!isMaster && (
        <>
          {/* Mute / Solo */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isDrum)  store.mixer.mute.drum  = !store.mixer.mute.drum;
                if (isSynth) store.mixer.mute.synth = !store.mixer.mute.synth;
                applyMixer();
              }}
              className={`px-2 py-1 text-xs rounded-md border ${mState ? 'border-red-400/60 bg-red-400/10' : 'border-white/10 bg-black/20'} hover:border-white/20`}
              title="Mute (post-fader)"
            >Mute</button>

            <button
              onClick={() => {
                if (isDrum)  store.mixer.solo.drum  = !store.mixer.solo.drum;
                if (isSynth) store.mixer.solo.synth = !store.mixer.solo.synth;
                applyMixer();
              }}
              className={`px-2 py-1 text-xs rounded-md border ${sState ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10 bg-black/20'} hover:border-white/20`}
              title="Solo (post-fader)"
            >Solo</button>
          </div>

          {/* Pan */}
          <div className="w-28 text-[10px] text-textLo">Pan ({panVal.toFixed(2)})</div>
          <input
            type="range" min={-1} max={1} step={0.01}
            value={panVal}
            onChange={(e) => {
              const v = parseFloat(e.currentTarget.value);
              if (isDrum)  store.mixer.pan.drum  = v;
              if (isSynth) store.mixer.pan.synth = v;
              applyMixer();
            }}
            className="w-28"
            aria-label={`Pan ${name}`}
          />

          {/* Send */}
          <div className="w-28 text-[10px] text-textLo">Send ({(sendVal*100|0)}%)</div>
          <input
            type="range" min={0} max={1} step={0.01}
            value={sendVal}
            onChange={(e) => {
              const v = parseFloat(e.currentTarget.value);
              if (isDrum)  store.mixer.send.drum  = v;
              if (isSynth) store.mixer.send.synth = v;
              applyMixer();
            }}
            className="w-28"
            aria-label={`FX Send ${name}`}
          />
        </>
      )}

      {/* Fader */}
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={val}
        onChange={(e)=> onChange && onChange(parseFloat(e.currentTarget.value))}
        className="w-24"
        aria-label={`Fader ${name}`}
      />
    </div>
  );
}

// ------------------------- Status Bar -------------------------
function StatusBar() {
  return (
    <footer className="h-8 border-t border-white/5 bg-black/30 px-3 text-xs flex items-center justify-between">
      <span className="text-textLo">Ready.</span>
      <span className="text-textLo">Tip: Press H to toggle Browser.</span>
    </footer>
  );
}
