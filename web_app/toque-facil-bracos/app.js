if (!window.Tone) {
  (() => {
    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let audioCtx = null;

    function ctx() {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      if (!audioCtx) audioCtx = new Ctor();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      return audioCtx;
    }

    function midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function noteToMidi(note) {
      const match = String(note || "").match(/^([A-G])(#?)(-?\d+)$/);
      if (!match) return 60;
      const pc = NOTE_NAMES.indexOf(`${match[1]}${match[2]}`);
      return (Number(match[3]) + 1) * 12 + Math.max(0, pc);
    }

    function timeValue(time) {
      if (typeof time === "number" && Number.isFinite(time)) return time;
      const context = ctx();
      return context ? context.currentTime : 0;
    }

    class NativeInstrument {
      constructor(kind = "synth") {
        this.kind = kind;
        this.volume = { value: 0 };
      }

      toDestination() {
        return this;
      }

      triggerAttackRelease(noteName, duration = 0.25, time = undefined, velocity = 0.75) {
        const context = ctx();
        if (!context) return;
        const midi = typeof noteName === "number" ? noteName : noteToMidi(noteName);
        const start = Math.max(context.currentTime, timeValue(time));
        const dur = Math.max(Number(duration) || 0.25, 0.08);
        const gainValue = Math.min(0.34, Math.max(0.04, velocity || 0.75) * Math.pow(10, (this.volume.value || 0) / 20) * 0.22);
        const end = start + Math.min(dur, this.kind === "piano" ? 1.2 : 0.95);

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        gain.connect(context.destination);

        const osc = context.createOscillator();
        osc.type = this.kind === "piano" ? "triangle" : "sawtooth";
        osc.frequency.setValueAtTime(midiToFreq(midi), start);
        osc.connect(gain);
        osc.start(start);
        osc.stop(end + 0.04);
      }

      releaseAll() {}
      triggerRelease() {}
      dispose() {}
    }

    const Transport = {
      state: "stopped",
      seconds: 0,
      bpm: { value: 120 },
      _parts: new Set(),
      _timers: [],
      start() {
        this.stop();
        this.state = "started";
        const startClock = Date.now();
        this._parts.forEach(part => part._schedule(startClock));
      },
      stop() {
        this._timers.forEach(id => window.clearTimeout(id));
        this._timers = [];
        this.state = "stopped";
        this.seconds = 0;
      },
      pause() {
        this._timers.forEach(id => window.clearTimeout(id));
        this._timers = [];
        this.state = "paused";
      },
      cancel() {
        this.stop();
      },
      on() {}
    };

    class NativePart {
      constructor(callback, events = []) {
        this.callback = callback;
        this.events = events;
      }

      start() {
        Transport._parts.add(this);
        return this;
      }

      _schedule(startClock) {
        const context = ctx();
        const now = context ? context.currentTime : 0;
        this.events.forEach(([offset, value]) => {
          const delay = Math.max(0, offset * 1000);
          const audioTime = now + Math.max(0, offset);
          const timer = window.setTimeout(() => {
            Transport.seconds = (Date.now() - startClock) / 1000;
            this.callback(audioTime, value);
          }, delay);
          Transport._timers.push(timer);
        });
      }

      dispose() {
        Transport._parts.delete(this);
      }
    }

    window.Tone = {
      Sampler: NativeInstrument,
      PolySynth: class extends NativeInstrument {
        constructor(type, options) {
          super(options?.oscillator?.type?.includes("triangle") ? "piano" : "strings");
        }
      },
      Synth: NativeInstrument,
      PluckSynth: NativeInstrument,
      Part: NativePart,
      Transport,
      Draw: {
        schedule(callback) {
          callback();
        },
        cancel() {}
      },
      Frequency(value, type) {
        const midi = type === "midi" ? Number(value) : noteToMidi(value);
        return {
          toNote() {
            const pc = ((midi % 12) + 12) % 12;
            const octave = Math.floor(midi / 12) - 1;
            return `${NOTE_NAMES[pc]}${octave}`;
          }
        };
      },
      start: async () => {
        const context = ctx();
        if (context?.state === "suspended") await context.resume();
      }
    };
  })();
}

const els = {
  app: document.getElementById("app"),
  pdfSavedNotice: document.getElementById("pdfSavedNotice"),
  subtitle: document.getElementById("subtitle"),
  stateBadge: document.getElementById("stateBadge"),
  midiFile: document.getElementById("midiFile"),
  pianoFacilSelect: document.getElementById("pianoFacilSelect"),
  hymnMenuBtn: document.getElementById("hymnMenuBtn"),
  hymnMenuBackdrop: document.getElementById("hymnMenuBackdrop"),
  hymnMenuDrawer: document.getElementById("hymnMenuDrawer"),
  hymnMenuClose: document.getElementById("hymnMenuClose"),
  hymnMenuSearch: document.getElementById("hymnMenuSearch"),
  hymnMenuList: document.getElementById("hymnMenuList"),
  instrumentSelect: document.getElementById("instrumentSelect"),
  layoutSelect: document.getElementById("layoutSelect"),
  soundSelect: document.getElementById("soundSelect"),
  bpmDownBtn: document.getElementById("bpmDownBtn"),
  bpmValue: document.getElementById("bpmValue"),
  bpmUpBtn: document.getElementById("bpmUpBtn"),
  entryBpmDownBtn: document.getElementById("entryBpmDownBtn"),
  entryBpmValue: document.getElementById("entryBpmValue"),
  entryBpmUpBtn: document.getElementById("entryBpmUpBtn"),
  entryKeyValue: document.getElementById("entryKeyValue"),
  volumeRange: document.getElementById("volumeRange"),
  loopToggle: document.getElementById("loopToggle"),
  baseToggle: document.getElementById("baseToggle"),
  extrasToggle: document.getElementById("extrasToggle"),
  playBtn: document.getElementById("playBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  stopBtn: document.getElementById("stopBtn"),
  homeBtn: document.getElementById("homeBtn"),
  nextBtn: document.getElementById("nextBtn"),
  pdfBtn: document.getElementById("pdfBtn"),
  miniLoopBtn: document.getElementById("miniLoopBtn"),
  miniBaseBtn: document.getElementById("miniBaseBtn"),
  miniBpmDownBtn: document.getElementById("miniBpmDownBtn"),
  miniBpmValue: document.getElementById("miniBpmValue"),
  miniBpmUpBtn: document.getElementById("miniBpmUpBtn"),
  chordVolDownBtn: document.getElementById("chordVolDownBtn"),
  chordVolValue: document.getElementById("chordVolValue"),
  chordVolUpBtn: document.getElementById("chordVolUpBtn"),
  fretboard: document.getElementById("fretboard"),
  scorePanel: document.getElementById("scorePanel"),
  scoreCanvas: document.getElementById("scoreCanvas"),
  scoreCursor: document.getElementById("scoreCursor"),
  lyricLine: document.getElementById("lyricLine"),
  fingeringLine: document.getElementById("fingeringLine"),
  chordName: document.getElementById("chordName"),
  chordShape: document.getElementById("chordShape"),
  sequence: document.getElementById("sequence"),
  progressBar: document.getElementById("progressBar"),
  status: document.getElementById("status")
};

const CONFIG = {
  boardWidth: 390,
  boardHeight: 245,
  nutOffset: 70,
  fretSpace: 52,
  totalFrets: 5,
  stringY: [35, 70, 105, 140, 175, 210],
  tuning: [40, 45, 50, 55, 59, 64],
  stringNumbers: [6, 5, 4, 3, 2, 1],
  stringNames: ["6 E", "5 A", "4 D", "3 G", "2 B", "1 e"]
};

const FREE_HYMN_TWO_MODE = new URLSearchParams(window.location.search).get("access") === "free";
let freePreviewTimer = null;

function startFreePreviewGuard() {
  if(!FREE_HYMN_TWO_MODE)return;
  stop();
  try{window.parent.HinarioAccess?.showPaywall('premium','O Toque Fácil está disponível para assinantes Premium e VIP.');}catch(e){}
}

const INSTRUMENT_PROFILES = {
  violao: {
    title: "Aula de Violao",
    subtitle: "Violao - primeira regiao",
    layout: "instagram",
    sound: "acoustic",
    totalFrets: 7,
    tuning: [40, 45, 50, 55, 59, 64],
    stringNumbers: [6, 5, 4, 3, 2, 1],
    stringNames: ["6 E", "5 A", "4 D", "3 G", "2 B", "1 e"]
  },
  ukulele: {
    title: "Aula de Ukulele",
    subtitle: "Ukulele - afinacao G C E A",
    layout: "instagram",
    sound: "ukulele",
    totalFrets: 7,
    tuning: [67, 60, 64, 69],
    stringNumbers: [4, 3, 2, 1],
    stringNames: ["4 G", "3 C", "2 E", "1 A"]
  },
  viola: {
    title: "Aula de Viola",
    subtitle: "Viola caipira - cebolao em E",
    layout: "instagram",
    sound: "acoustic",
    totalFrets: 7,
    tuning: [47, 52, 56, 59, 64],
    stringNumbers: [5, 4, 3, 2, 1],
    stringNames: ["5 B", "4 E", "3 G#", "2 B", "1 E"]
  },
  piano1: {
    title: "Aula de Piano",
    subtitle: "Piano 1 mao - melodia limpa",
    layout: "piano-instagram",
    sound: "clean",
    totalFrets: 5,
    tuning: [40, 45, 50, 55, 59, 64],
    stringNumbers: [6, 5, 4, 3, 2, 1],
    stringNames: ["6 E", "5 A", "4 D", "3 G", "2 B", "1 e"]
  },
  clarinete: {
    title: "Aula de Clarinete",
    subtitle: "Clarinete Si bemol - soprano transposto",
    layout: "instagram",
    sound: "clarinete",
    totalFrets: 0,
    tuning: [60],
    stringNumbers: [1],
    stringNames: ["Cl"]
  },
  flautaDoce: {
    title: "Aula de Flauta Doce",
    subtitle: "Flauta doce soprano em Do",
    layout: "instagram",
    sound: "flautaDoce",
    totalFrets: 0,
    tuning: [60],
    stringNumbers: [1],
    stringNames: ["Fl"]
  },
  flautaTransversal: {
    title: "Aula de Flauta Transversal",
    subtitle: "Flauta transversal em Do",
    layout: "instagram",
    sound: "flautaTransversal",
    totalFrets: 0,
    tuning: [60],
    stringNumbers: [1],
    stringNames: ["Ft"]
  }
};

const NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_LABELS_PT = ["Do", "Do#", "Re", "Mib", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "Sib", "Si"];
const HYMN_TRANSPOSE_SEMITONES = -12;
const CLARINET_REFERENCE_TRANSPOSE_SEMITONES = -14;
const CLARINET_REFERENCE_DIR = "hinos_sib";
const RECORDER_REFERENCE_TRANSPOSE_SEMITONES = -14;
const RECORDER_WRITTEN_OCTAVE_SHIFT = 12;
const TRANSVERSE_FLUTE_REFERENCE_TRANSPOSE_SEMITONES = -14;
const TRANSVERSE_FLUTE_WRITTEN_OCTAVE_SHIFT = 12;

const CLARINET_WRITTEN_OFFSET = 2;
const CLARINET_WRITTEN_OCTAVE_SHIFT = 12;
const CLARINET_KEY_FIFTHS_OFFSET = 2;
const CLARINET_IMAGE_BASE_MIDI = 53;
const CLARINET_IMAGE_COUNT = 37;

const HYMN_KEY_FIFTHS = (() => {
  const map = new Map();
  const add = (fifths, values) => {
    values.split(",").map(item => item.trim()).filter(Boolean).forEach(item => {
      const normalized = item.toLowerCase().replace(/\s+/g, "");
      map.set(normalized, fifths);
      const number = normalized.match(/^\d+$/)?.[0];
      if (number) map.set(`hino-${number}`, fifths);
    });
  };
  add(0, "6,28,33,45,50,52,55,71,73,76,81,94,103,116,130,155,158,170,171,175,201,211,215,220,224,233,264,282,302,303,313,322,324,333,342,343,348,351,358,364,372,375,386,388,390,401,403,415,431,434,457,459,461,471,472");
  add(-1, "14,20,30,39,42,44,47,49,54,59,60,64,104,107,125,133,135,140,142,197,208,223,235,239,241,244,254,257,261,268,281,284,326,345,357,366,383,399,402,412,413,424,428,430,440,453,460,468");
  add(-2, "8,10,11,15,51,63,77,89,93,100,105,109,114,123,128,129,132,153,165,168,173,178,182,190,196,219,222,249,255,258,265,266,267,272,292,296,298,299,310,316,318,320,323,328,332,337,338,378,382,389,393,396,398,433,439,443,445,448,451,465,474,476,477,479,480,c5");
  add(2, "31,37,58,68,74,127,143,146,187,198,202,203,226,229,234,248,250,262,263,286,300,312,336,341,350,356,359,367,380,384,385,394,414,417,418,436,441,444,470");
  add(3, "22,41,138,188,200,242,275,285,c1");
  add(4, "289,429");
  return map;
})();

const CLARINET_WRITTEN_KEY_FIFTHS = (() => {
  const map = new Map();
  const add = (fifths, values) => {
    values.split(",").map(item => item.trim()).filter(Boolean).forEach(item => {
      const normalized = item.toLowerCase().replace(/\s+/g, "");
      map.set(normalized, fifths);
      const number = normalized.match(/^\d+$/)?.[0];
      if (number) map.set(`hino-${number}`, fifths);
    });
  };
  add(-3, "118,145,194,204,216,217,238,340,361,381,387,425,455,57,65,67,69,91");
  add(-2, "c4,117,122,126,13,147,148,150,151,152,157,161,169,171,174,189,19,191,192,195,205,218,240,246,247,26,273,279,29,290,305,308,309,311,317,32,321,330,331,339,344,346,347,362,365,373,377,379,391,392,397,4,40,404,405,408,423,432,442,449,450,452,46,463,469,5,62,72,75,80,82,85,90,95,97,98");
  add(-1, "1,102,110,111,112,113,119,12,120,121,134,141,144,154,156,160,163,164,167,176,177,179,181,183,186,193,2,206,21,210,212,213,221,225,236,237,252,260,27,270,274,276,280,293,294,301,304,307,314,335,34,349,35,355,360,369,370,371,374,376,38,395,400,411,416,421,422,426,427,43,435,438,447,456,458,462,464,467,473,475,478,48,53,56,61,7,79,83,84,86,87,92");
  add(0, "c5,10,100,105,109,11,114,123,128,129,132,15,153,165,168,173,178,182,190,196,219,222,249,255,258,265,266,267,272,292,296,298,299,310,316,318,320,323,328,332,337,338,378,382,389,393,396,398,433,439,443,445,448,451,465,474,476,477,479,480,51,63,77,8,89,93");
  add(1, "104,107,125,133,135,14,140,142,197,20,208,223,235,239,241,244,254,257,261,268,281,284,30,326,345,357,366,383,39,399,402,412,413,42,424,428,430,44,440,453,460,468,47,49,54,59,60,64");
  add(2, "103,116,130,155,158,170,172,175,201,211,215,220,224,233,264,28,282,302,303,313,322,324,33,333,342,343,348,351,358,364,372,375,386,388,390,401,403,415,431,434,45,457,459,461,471,472,50,52,55,6,71,73,76,81,94");
  add(3, "c2,c3,c6,101,106,108,115,124,131,137,139,149,159,16,162,166,17,18,180,184,185,199,207,209,214,227,228,23,230,231,232,24,243,245,25,251,253,256,259,269,271,277,278,283,287,288,291,295,297,3,306,315,319,325,327,329,334,352,353,354,36,363,368,406,407,409,410,419,420,437,446,454,466,66,70,78,88,9,96,99");
  add(4, "127,136,143,146,187,198,202,203,226,229,234,248,250,262,263,286,300,31,312,336,341,350,356,359,367,37,380,384,385,394,414,417,418,436,441,444,470,58,68,74");
  add(5, "c1,138,188,200,22,242,275,285,41");
  add(6, "289,429");
  return map;
})();
const CLARINET_SPRITE = {
  src: "clarinete-dicionario.png",
  width: 6372,
  height: 3636,
  cropWidth: 330,
  cropHeight: 900,
  scale: 0.5,
  map: {
    4: { x: 245, y: 110 },
    5: { x: 565, y: 110 },
    6: { x: 885, y: 110 },
    7: { x: 1205, y: 110 },
    8: { x: 1525, y: 110 },
    9: { x: 1845, y: 110 },
    10: { x: 2165, y: 110 },
    11: { x: 245, y: 925 },
    0: { x: 565, y: 925 },
    1: { x: 885, y: 925 },
    2: { x: 1205, y: 925 },
    3: { x: 1525, y: 925 }
  },
  highMap: {
    4: { x: 3440, y: 110 },
    5: { x: 3760, y: 110 },
    6: { x: 4080, y: 110 },
    7: { x: 4400, y: 110 },
    8: { x: 4720, y: 110 },
    9: { x: 5040, y: 110 },
    10: { x: 5360, y: 110 },
    11: { x: 3440, y: 985 },
    0: { x: 3760, y: 985 },
    1: { x: 4080, y: 985 },
    2: { x: 4400, y: 985 },
    3: { x: 4720, y: 985 }
  }
};

const RECORDER_FINGERINGS = (() => {
  const map = new Map();
  const add = (pc, name, holes, options = {}) => {
    map.set(pc, { name, holes, ...options });
  };

  add(0, "Do", ["closed", "closed", "closed", "closed", "closed", "closed", "closed", "closed"]);
  add(1, "Do# / Reb", ["closed", "closed", "closed", "closed", "closed", "closed", "closed", "half"]);
  add(2, "Re", ["closed", "closed", "closed", "closed", "closed", "closed", "closed", "open"]);
  add(3, "Re# / Mib", ["closed", "closed", "closed", "closed", "closed", "closed", "half", "open"]);
  add(4, "Mi", ["closed", "closed", "closed", "closed", "closed", "closed", "open", "open"]);
  add(5, "Fa", ["closed", "closed", "closed", "closed", "closed", "open", "closed", "closed"]);
  add(6, "Fa# / Solb", ["closed", "closed", "closed", "closed", "closed", "half", "half", "open"]);
  add(7, "Sol", ["closed", "closed", "closed", "closed", "open", "open", "open", "open"]);
  add(8, "Sol# / Lab", ["closed", "closed", "closed", "half", "closed", "closed", "closed", "open"]);
  add(9, "La", ["closed", "closed", "closed", "open", "open", "open", "open", "open"]);
  add(10, "La# / Sib", ["closed", "closed", "half", "closed", "closed", "open", "open", "open"]);
  add(11, "Si", ["closed", "closed", "open", "open", "open", "open", "open", "open"]);
  return map;
})();

const TRANSVERSE_FLUTE_IMAGES = [
  "01-do",
  "02-do-sharp",
  "03-re",
  "04-mib",
  "05-mi",
  "06-fa",
  "07-fa-sharp",
  "08-sol",
  "09-sol-sharp",
  "10-la",
  "11-sib",
  "12-si"
];

const VIOLA_E_CHORD_BANK = {
  C: "5x 4x 3-1 2-1 1-0",
  D: "5x 4-0 3-1 2-3 1-2",
  E: "5-0 4-0 3-0 2-0 1-0",
  F: "5-1 4-1 3-1 2-1 1-1",
  G: "5-3 4-2 3-1 2-0 1-3",
  A: "5x 4-2 3-1 2-2 1-0",
  B: "5-2 4-2 3-1 2-2 1-2",
  Em: "5-0 4-0 3-0 2-0 1-3",
  Am: "5x 4-2 3-1 2-1 1-0",
  B7: "5-2 4-0 3-1 2-0 1-2",
  E7: "5-0 4-0 3-0 2-3 1-0",
  A7: "5x 4-2 3-1 2-0 1-0"
};

const PIANO_FACIL_HINOS = [
  {
    numero: 1,
    titulo: "Cristo, meu mestre",
    arquivo: "hinos/hino-1.musicxml"
  },
  {
    numero: 2,
    titulo: "De Deus tu és eleita",
    arquivo: "hinos/hino-2.musicxml"
  },
  {
    numero: 3,
    titulo: "Faz-nos ouvir Tua voz",
    arquivo: "hinos/hino-3.musicxml"
  },
  {
    numero: 4,
    titulo: "Ouve a nossa oração",
    arquivo: "hinos/hino-4.musicxml"
  },
  {
    numero: 5,
    titulo: "A Rocha Celestial",
    arquivo: "hinos/hino-5.musicxml"
  },
  {
    numero: 6,
    titulo: "Glória ao Justo, Fiel Cordeiro!",
    arquivo: "hinos/hino-6.musicxml"
  },
  {
    numero: 7,
    titulo: "Granjeai, granjeiai os talentos",
    arquivo: "hinos/hino-7.musicxml"
  },
  {
    numero: 8,
    titulo: "Oh! Vem, sim, vem",
    arquivo: "hinos/hino-8.musicxml"
  },
  {
    numero: 9,
    titulo: "Luminosa é a Senda",
    arquivo: "hinos/hino-9.musicxml"
  },
  {
    numero: 10,
    titulo: "Prossegui vitorioso em Cristo",
    arquivo: "hinos/hino-10.musicxml"
  },
  {
    numero: 11,
    titulo: "Ó Igreja de Deus, Resplandece",
    arquivo: "hinos/hino-11.musicxml"
  },
  {
    numero: 12,
    titulo: "Sempre em Jesus confiarei",
    arquivo: "hinos/hino-12.musicxml"
  },
  {
    numero: 13,
    titulo: "Confiemos em Deus_4",
    arquivo: "hinos/hino-13.musicxml"
  },
  {
    numero: 14,
    titulo: "Manda os Teus dons celestes",
    arquivo: "hinos/hino-14.musicxml"
  },
  {
    numero: 15,
    titulo: "Ó alma que choras",
    arquivo: "hinos/hino-15.musicxml"
  },
  {
    numero: 16,
    titulo: "Promessas excelente_10",
    arquivo: "hinos/hino-16.musicxml"
  },
  {
    numero: 17,
    titulo: "Ó Senhor, vem visitar-me",
    arquivo: "hinos/hino-17.musicxml"
  },
  {
    numero: 18,
    titulo: "É Jesus meu Refúgio_6",
    arquivo: "hinos/hino-18.musicxml"
  },
  {
    numero: 19,
    titulo: "Manda-nos Teu Poder_5",
    arquivo: "hinos/hino-19.musicxml"
  },
  {
    numero: 20,
    titulo: "Teu Espírito derrama_4",
    arquivo: "hinos/hino-20.musicxml"
  },
  {
    numero: 21,
    titulo: "Não mais oprimidos seremos",
    arquivo: "hinos/hino-21.musicxml"
  },
  {
    numero: 22,
    titulo: "Guia-me, ó Senhor",
    arquivo: "hinos/hino-22.musicxml"
  },
  {
    numero: 23,
    titulo: "O Senhor é o meu Pastor",
    arquivo: "hinos/hino-23.musicxml"
  },
  {
    numero: 24,
    titulo: "Dá- me graça, Senhor",
    arquivo: "hinos/hino-24.musicxml"
  },
  {
    numero: 25,
    titulo: "Um grande bem, precioso bem",
    arquivo: "hinos/hino-25.musicxml"
  },
  {
    numero: 26,
    titulo: "Julga me Senhor",
    arquivo: "hinos/hino-26.musicxml"
  },
  {
    numero: 27,
    titulo: "O Senhor é minha luz",
    arquivo: "hinos/hino-27.musicxml"
  },
  {
    numero: 28,
    titulo: "Para o céu marchemos",
    arquivo: "hinos/hino-28.musicxml"
  },
  {
    numero: 29,
    titulo: "Senhor Jesus,Tu és o meu rochedo_5",
    arquivo: "hinos/hino-29.musicxml"
  },
  {
    numero: 30,
    titulo: "Confiarei sempre no Senhor_3",
    arquivo: "hinos/hino-30.musicxml"
  },
  {
    numero: 31,
    titulo: "Forte Rocha_4",
    arquivo: "hinos/hino-31.musicxml"
  },
  {
    numero: 32,
    titulo: "Eu me escondo em Ti, Senhor",
    arquivo: "hinos/hino-32.musicxml"
  },
  {
    numero: 33,
    titulo: "Jesus é o nosso Guia",
    arquivo: "hinos/hino-33.musicxml"
  },
  {
    numero: 34,
    titulo: "O Mestre que desceu dos céus",
    arquivo: "hinos/hino-34.musicxml"
  },
  {
    numero: 35,
    titulo: "Eis que multidão mui grande",
    arquivo: "hinos/hino-35.musicxml"
  },
  {
    numero: 36,
    titulo: "A fiel proteção_3",
    arquivo: "hinos/hino-36.musicxml"
  },
  {
    numero: 37,
    titulo: "Se a nossa vida entregarmos a Jesus_4",
    arquivo: "hinos/hino-37.musicxml"
  },
  {
    numero: 38,
    titulo: "Ó Senhor,és minha Vida_5",
    arquivo: "hinos/hino-38.musicxml"
  },
  {
    numero: 39,
    titulo: "Eu desejo, Senhor_4",
    arquivo: "hinos/hino-39.musicxml"
  },
  {
    numero: 40,
    titulo: "Quanto em mi tu operaste",
    arquivo: "hinos/hino-40.musicxml"
  },
  {
    numero: 41,
    titulo: "O Teu coração vem a Cristo entregar",
    arquivo: "hinos/hino-41.musicxml"
  },
  {
    numero: 42,
    titulo: "Ó minha alma por que te abates",
    arquivo: "hinos/hino-42.musicxml"
  },
  {
    numero: 43,
    titulo: "Trema o céu, a terra, o mar",
    arquivo: "hinos/hino-43.musicxml"
  },
  {
    numero: 44,
    titulo: "Sol da justiça",
    arquivo: "hinos/hino-44.musicxml"
  },
  {
    numero: 45,
    titulo: "Oh! Quanto nos amaste!",
    arquivo: "hinos/hino-45.musicxml"
  },
  {
    numero: 46,
    titulo: "Grandioso é o nosso Deus",
    arquivo: "hinos/hino-46.musicxml"
  },
  {
    numero: 47,
    titulo: "Sublime é o perdão!",
    arquivo: "hinos/hino-47.musicxml"
  },
  {
    numero: 48,
    titulo: "Creio no Senhor",
    arquivo: "hinos/hino-48.musicxml"
  },
  {
    numero: 49,
    titulo: "Venho adorar-Te Santo Criador",
    arquivo: "hinos/hino-49.musicxml"
  },
  {
    numero: 50,
    titulo: "Glória a Jesus! Aleluia!",
    arquivo: "hinos/hino-50.musicxml"
  },
  {
    numero: 51,
    titulo: "A Palavra do Senhor é o Pão celestial",
    arquivo: "hinos/hino-51.musicxml"
  },
  {
    numero: 52,
    titulo: "Luz eternal é Jesus",
    arquivo: "hinos/hino-52.musicxml"
  },
  {
    numero: 53,
    titulo: "Nós somos Luz do mundo",
    arquivo: "hinos/hino-53.musicxml"
  },
  {
    numero: 54,
    titulo: "Um Tesouro glorioso achei",
    arquivo: "hinos/hino-54.musicxml"
  },
  {
    numero: 55,
    titulo: "Paz seja em vós",
    arquivo: "hinos/hino-55.musicxml"
  },
  {
    numero: 56,
    titulo: "Põe em Deus a confiança",
    arquivo: "hinos/hino-56.musicxml"
  },
  {
    numero: 57,
    titulo: "É estreita a porta para a Salvação",
    arquivo: "hinos/hino-57.musicxml"
  },
  {
    numero: 58,
    titulo: "Sou Crente em Jesus",
    arquivo: "hinos/hino-58.musicxml"
  },
  {
    numero: 59,
    titulo: "Faz-me mais perseverante",
    arquivo: "hinos/hino-59.musicxml"
  },
  {
    numero: 60,
    titulo: "Oh! Vem a Jesus",
    arquivo: "hinos/hino-60.musicxml"
  },
  {
    numero: 61,
    titulo: "A minha alma deseja ver-Te",
    arquivo: "hinos/hino-61.musicxml"
  },
  {
    numero: 62,
    titulo: "Ó Criador, forte Rocha",
    arquivo: "hinos/hino-62.musicxml"
  },
  {
    numero: 63,
    titulo: "Se vós baterdes, Ele vos abre",
    arquivo: "hinos/hino-63.musicxml"
  },
  {
    numero: 64,
    titulo: "Tu, Que vives sem destino",
    arquivo: "hinos/hino-64.musicxml"
  },
  {
    numero: 65,
    titulo: "Igual ao Mestre",
    arquivo: "hinos/hino-65.musicxml"
  },
  {
    numero: 66,
    titulo: "Cansado estás Vem a Jesus",
    arquivo: "hinos/hino-66.musicxml"
  },
  {
    numero: 67,
    titulo: "Vinde a Mim!",
    arquivo: "hinos/hino-67.musicxml"
  },
  {
    numero: 68,
    titulo: "Sem Tardar, vai a Cristo",
    arquivo: "hinos/hino-68.musicxml"
  },
  {
    numero: 69,
    titulo: "A Família de Jesus",
    arquivo: "hinos/hino-69.musicxml"
  },
  {
    numero: 70,
    titulo: "Senhor, Tu és a minha Esperança",
    arquivo: "hinos/hino-70.musicxml"
  },
  {
    numero: 71,
    titulo: "Ó Senhor Jesus, eu recorro a Ti",
    arquivo: "hinos/hino-71.musicxml"
  },
  {
    numero: 72,
    titulo: "Nome glorioso, o de Jesus!",
    arquivo: "hinos/hino-72.musicxml"
  },
  {
    numero: 73,
    titulo: "Semearei, semearei",
    arquivo: "hinos/hino-73.musicxml"
  },
  {
    numero: 74,
    titulo: "Vamos produzir frutos de louvor",
    arquivo: "hinos/hino-74.musicxml"
  },
  {
    numero: 75,
    titulo: "Vem a Jesus, ó alma errante",
    arquivo: "hinos/hino-75.musicxml"
  },
  {
    numero: 76,
    titulo: "Cristo Jesus Sua mão me dá",
    arquivo: "hinos/hino-76.musicxml"
  },
  {
    numero: 77,
    titulo: "Vamos lançar a semente",
    arquivo: "hinos/hino-77.musicxml"
  },
  {
    numero: 78,
    titulo: "Glória a Jesus! Glória a Jesus!",
    arquivo: "hinos/hino-78.musicxml"
  },
  {
    numero: 79,
    titulo: "Bom é estarmos nós aqui",
    arquivo: "hinos/hino-79.musicxml"
  },
  {
    numero: 80,
    titulo: "Por Cristo, resgatado",
    arquivo: "hinos/hino-80.musicxml"
  },
  {
    numero: 81,
    titulo: "A Vida deu por ti",
    arquivo: "hinos/hino-81.musicxml"
  },
  {
    numero: 82,
    titulo: "Oh! Que grande amor!",
    arquivo: "hinos/hino-82.musicxml"
  },
  {
    numero: 83,
    titulo: "Vindes às bodas",
    arquivo: "hinos/hino-83.musicxml"
  },
  {
    numero: 84,
    titulo: "Quão amável é a Tua casa",
    arquivo: "hinos/hino-84.musicxml"
  },
  {
    numero: 85,
    titulo: "Anunciai i santo Evangelho",
    arquivo: "hinos/hino-85.musicxml"
  },
  {
    numero: 86,
    titulo: "Grande Tu és, ó Pai",
    arquivo: "hinos/hino-86.musicxml"
  },
  {
    numero: 87,
    titulo: "Eis que vem Jesus",
    arquivo: "hinos/hino-87.musicxml"
  },
  {
    numero: 88,
    titulo: "Minha oração",
    arquivo: "hinos/hino-88.musicxml"
  },
  {
    numero: 89,
    titulo: "Oh! Grande Deus",
    arquivo: "hinos/hino-89.musicxml"
  },
  {
    numero: 90,
    titulo: "Teu destino é a glória",
    arquivo: "hinos/hino-90.musicxml"
  },
  {
    numero: 91,
    titulo: "No esconderijo do Onipotente",
    arquivo: "hinos/hino-91.musicxml"
  },
  {
    numero: 92,
    titulo: "O santo Evangelho",
    arquivo: "hinos/hino-92.musicxml"
  },
  {
    numero: 93,
    titulo: "Aceitando ao Senhor",
    arquivo: "hinos/hino-93.musicxml"
  },
  {
    numero: 94,
    titulo: "Quem sustenta a nossa vida",
    arquivo: "hinos/hino-94.musicxml"
  },
  {
    numero: 95,
    titulo: "Vinde, ó bendito de Meu Pai",
    arquivo: "hinos/hino-95.musicxml"
  },
  {
    numero: 96,
    titulo: "Vinde, adoremos a Deus",
    arquivo: "hinos/hino-96.musicxml"
  },
  {
    numero: 97,
    titulo: "Cristo Jesus, nosso bom Pastor",
    arquivo: "hinos/hino-97.musicxml"
  },
  {
    numero: 98,
    titulo: "Cristo Jesus tudo pode",
    arquivo: "hinos/hino-98.musicxml"
  },
  {
    numero: 99,
    titulo: "Jesus Cristo é o Amigo celestial",
    arquivo: "hinos/hino-99.musicxml"
  },
  {
    numero: 100,
    titulo: "Todos juntos, jubilemos",
    arquivo: "hinos/hino-100.musicxml"
  },
  {
    numero: 101,
    titulo: "Cantemos, Juntos, Louvores a Deus",
    arquivo: "hinos/hino-101.musicxml"
  },
  {
    numero: 102,
    titulo: "Sinto a voz divina do meu fiel Pastor",
    arquivo: "hinos/hino-102.musicxml"
  },
  {
    numero: 103,
    titulo: "Bendize, ó minha alma",
    arquivo: "hinos/hino-103.musicxml"
  },
  {
    numero: 104,
    titulo: "Santo, Santo és, Senhor",
    arquivo: "hinos/hino-104.musicxml"
  },
  {
    numero: 105,
    titulo: "Volta ao teu lar Paternal",
    arquivo: "hinos/hino-105.musicxml"
  },
  {
    numero: 106,
    titulo: "Em nome do nosso redentor",
    arquivo: "hinos/hino-106.musicxml"
  },
  {
    numero: 107,
    titulo: "O Fim de tudo chegara",
    arquivo: "hinos/hino-107.musicxml"
  },
  {
    numero: 108,
    titulo: "É Jesus a fonte de Riqueza",
    arquivo: "hinos/hino-108.musicxml"
  },
  {
    numero: 109,
    titulo: "Vem, ó Senhor, ajudar-me",
    arquivo: "hinos/hino-109.musicxml"
  },
  {
    numero: 110,
    titulo: "Vigiai, irmãos",
    arquivo: "hinos/hino-110.musicxml"
  },
  {
    numero: 111,
    titulo: "Do seulcro ressurgiu triufante",
    arquivo: "hinos/hino-111.musicxml"
  },
  {
    numero: 112,
    titulo: "Sigamos sempre ao Senhor",
    arquivo: "hinos/hino-112.musicxml"
  },
  {
    numero: 113,
    titulo: "O Senhor seja louvado",
    arquivo: "hinos/hino-113.musicxml"
  },
  {
    numero: 114,
    titulo: "Clama ao Mestre, Cristo Jesus",
    arquivo: "hinos/hino-114.musicxml"
  },
  {
    numero: 115,
    titulo: "Minha alma engrandece",
    arquivo: "hinos/hino-115.musicxml"
  },
  {
    numero: 116,
    titulo: "Amo ao Senhor",
    arquivo: "hinos/hino-116.musicxml"
  },
  {
    numero: 117,
    titulo: "Jesus habita em meu coração",
    arquivo: "hinos/hino-117.musicxml"
  },
  {
    numero: 118,
    titulo: "Fiel Salvador é Jesus",
    arquivo: "hinos/hino-118.musicxml"
  },
  {
    numero: 119,
    titulo: "Luz aos meus pés é a Tua Palavra",
    arquivo: "hinos/hino-119.musicxml"
  },
  {
    numero: 120,
    titulo: "Nossa cruz tomemos",
    arquivo: "hinos/hino-120.musicxml"
  },
  {
    numero: 121,
    titulo: "O meu socorro vem do Senhor",
    arquivo: "hinos/hino-121.musicxml"
  },
  {
    numero: 122,
    titulo: "Alegrei-me quando me disseram",
    arquivo: "hinos/hino-122.musicxml"
  },
  {
    numero: 123,
    titulo: "Ó Jesus, és meu Guardião",
    arquivo: "hinos/hino-123.musicxml"
  },
  {
    numero: 124,
    titulo: "Vivo na graça",
    arquivo: "hinos/hino-124.musicxml"
  },
  {
    numero: 125,
    titulo: "Mais grato a Ti",
    arquivo: "hinos/hino-125.musicxml"
  },
  {
    numero: 126,
    titulo: "Levemos a mensagem de amor",
    arquivo: "hinos/hino-126.musicxml"
  },
  {
    numero: 127,
    titulo: "Meu bom Jesus, Contigo almejo estar",
    arquivo: "hinos/hino-127.musicxml"
  },
  {
    numero: 128,
    titulo: "Teu filho sou, ó Criador",
    arquivo: "hinos/hino-128.musicxml"
  },
  {
    numero: 129,
    titulo: "Salvo estou por Jesus",
    arquivo: "hinos/hino-129.musicxml"
  },
  {
    numero: 130,
    titulo: "A Minha Alma",
    arquivo: "hinos/hino-130.musicxml"
  },
  {
    numero: 131,
    titulo: "Ó Senhor glorioso, Deus da perfeição",
    arquivo: "hinos/hino-131.musicxml"
  },
  {
    numero: 132,
    titulo: "Eis-me, Senhor, aos Teus pés",
    arquivo: "hinos/hino-132.musicxml"
  },
  {
    numero: 133,
    titulo: "Quão bom e quão suave é",
    arquivo: "hinos/hino-133.musicxml"
  },
  {
    numero: 134,
    titulo: "Teu amor, ó Cordeiro divinal",
    arquivo: "hinos/hino-134.musicxml"
  },
  {
    numero: 135,
    titulo: "Bendito o Rei que veio do céu!",
    arquivo: "hinos/hino-135.musicxml"
  },
  {
    numero: 136,
    titulo: "Benignidade eterna é a de Deus",
    arquivo: "hinos/hino-136.musicxml"
  },
  {
    numero: 137,
    titulo: "Senhor, vem selar-nos",
    arquivo: "hinos/hino-137.musicxml"
  },
  {
    numero: 138,
    titulo: "Louvemos ao bom Jesus",
    arquivo: "hinos/hino-138.musicxml"
  },
  {
    numero: 139,
    titulo: "Ó Senhor, tu me conheces",
    arquivo: "hinos/hino-139.musicxml"
  },
  {
    numero: 140,
    titulo: "Sou Feliz",
    arquivo: "hinos/hino-140.musicxml"
  },
  {
    numero: 141,
    titulo: "Cristo, o Verbo",
    arquivo: "hinos/hino-141.musicxml"
  },
  {
    numero: 142,
    titulo: "Ó Pai celestial",
    arquivo: "hinos/hino-142.musicxml"
  },
  {
    numero: 143,
    titulo: "Porfiemos, irmãos, por entrar nos céus",
    arquivo: "hinos/hino-143.musicxml"
  },
  {
    numero: 144,
    titulo: "A vida eterna",
    arquivo: "hinos/hino-144.musicxml"
  },
  {
    numero: 145,
    titulo: "Pródigo filho, vai!",
    arquivo: "hinos/hino-145.musicxml"
  },
  {
    numero: 146,
    titulo: "De Deus veio a Luz",
    arquivo: "hinos/hino-146.musicxml"
  },
  {
    numero: 147,
    titulo: "É bom louvar ao Criador",
    arquivo: "hinos/hino-147.musicxml"
  },
  {
    numero: 148,
    titulo: "Louvor a Deus o Criador",
    arquivo: "hinos/hino-148.musicxml"
  },
  {
    numero: 149,
    titulo: "Ó irmãos, por fé, louvemos a Jesus",
    arquivo: "hinos/hino-149.musicxml"
  },
  {
    numero: 150,
    titulo: "Jesus Cristo, meu Senhor",
    arquivo: "hinos/hino-150.musicxml"
  },
  {
    numero: 151,
    titulo: "Se, de Cristo, o Nome amares",
    arquivo: "hinos/hino-151.musicxml"
  },
  {
    numero: 152,
    titulo: "Venho à casa do Senhor",
    arquivo: "hinos/hino-152.musicxml"
  },
  {
    numero: 153,
    titulo: "O Divinal Cordeiro",
    arquivo: "hinos/hino-153.musicxml"
  },
  {
    numero: 154,
    titulo: "Terá que renascer",
    arquivo: "hinos/hino-154.musicxml"
  },
  {
    numero: 155,
    titulo: "Olha a Cristo, o Rendentor",
    arquivo: "hinos/hino-155.musicxml"
  },
  {
    numero: 156,
    titulo: "Cristo entrou nos céus primeiro",
    arquivo: "hinos/hino-156.musicxml"
  },
  {
    numero: 157,
    titulo: "Ouve a voz que te convida",
    arquivo: "hinos/hino-157.musicxml"
  },
  {
    numero: 158,
    titulo: "Meu lar está no céu",
    arquivo: "hinos/hino-158.musicxml"
  },
  {
    numero: 159,
    titulo: "Deus amou ao mundo",
    arquivo: "hinos/hino-159.musicxml"
  },
  {
    numero: 160,
    titulo: "Sou o Caminho, a Verdade e a Vida",
    arquivo: "hinos/hino-160.musicxml"
  },
  {
    numero: 161,
    titulo: "Cristo quer salvar",
    arquivo: "hinos/hino-161.musicxml"
  },
  {
    numero: 162,
    titulo: "Cristo salvou-me",
    arquivo: "hinos/hino-162.musicxml"
  },
  {
    numero: 163,
    titulo: "Neste mundo de elusão",
    arquivo: "hinos/hino-163.musicxml"
  },
  {
    numero: 164,
    titulo: "Louvemos sempre alegres",
    arquivo: "hinos/hino-164.musicxml"
  },
  {
    numero: 165,
    titulo: "Foi o Senhor Jesus",
    arquivo: "hinos/hino-165.musicxml"
  },
  {
    numero: 166,
    titulo: "A graça inefável de Deus",
    arquivo: "hinos/hino-166.musicxml"
  },
  {
    numero: 167,
    titulo: "Água viva",
    arquivo: "hinos/hino-167.musicxml"
  },
  {
    numero: 168,
    titulo: "A Palavra do Senhor",
    arquivo: "hinos/hino-168.musicxml"
  },
  {
    numero: 169,
    titulo: "Aos pés de Deus estamos",
    arquivo: "hinos/hino-169.musicxml"
  },
  {
    numero: 170,
    titulo: "Pai eternal, envia dos céus",
    arquivo: "hinos/hino-170.musicxml"
  },
  {
    numero: 171,
    titulo: "Vida eternal! Vida eternal",
    arquivo: "hinos/hino-171.musicxml"
  },
  {
    numero: 172,
    titulo: "Um culto ao Senhor (Encerramento)",
    arquivo: "hinos/hino-172.musicxml"
  },
  {
    numero: 173,
    titulo: "Para ouvir aqui estamos",
    arquivo: "hinos/hino-173.musicxml"
  },
  {
    numero: 174,
    titulo: "Vem atender ao Seu chamado",
    arquivo: "hinos/hino-174.musicxml"
  },
  {
    numero: 175,
    titulo: "O Senhor Jesus te chama",
    arquivo: "hinos/hino-175.musicxml"
  },
  {
    numero: 176,
    titulo: "Por Ti vivo, ó Deus potente",
    arquivo: "hinos/hino-176.musicxml"
  },
  {
    numero: 177,
    titulo: "Eu necessito achegar-me",
    arquivo: "hinos/hino-177.musicxml"
  },
  {
    numero: 178,
    titulo: "A Palavra preciosa",
    arquivo: "hinos/hino-178.musicxml"
  },
  {
    numero: 179,
    titulo: "Trabalhai! Trabalhai!",
    arquivo: "hinos/hino-179.musicxml"
  },
  {
    numero: 180,
    titulo: "Jesus é a Luz que veio ao mundo",
    arquivo: "hinos/hino-180.musicxml"
  },
  {
    numero: 181,
    titulo: "Só em Cristo, só em Cristo",
    arquivo: "hinos/hino-181.musicxml"
  },
  {
    numero: 182,
    titulo: "Brevemente retornará Jesus Cristo",
    arquivo: "hinos/hino-182.musicxml"
  },
  {
    numero: 183,
    titulo: "Cristo Jesus é a Porta dos céus",
    arquivo: "hinos/hino-183.musicxml"
  },
  {
    numero: 184,
    titulo: "Nós te louvamos, por fé, grande Deus",
    arquivo: "hinos/hino-184.musicxml"
  },
  {
    numero: 185,
    titulo: "Deus mandou Sua Luz",
    arquivo: "hinos/hino-185.musicxml"
  },
  {
    numero: 186,
    titulo: "Cristo, Luz do mundo",
    arquivo: "hinos/hino-186.musicxml"
  },
  {
    numero: 187,
    titulo: "Jesus Cristo habita em nós",
    arquivo: "hinos/hino-187.musicxml"
  },
  {
    numero: 188,
    titulo: "O Mestre habita em mim",
    arquivo: "hinos/hino-188.musicxml"
  },
  {
    numero: 189,
    titulo: "Oh! Que preciosa paz",
    arquivo: "hinos/hino-189.musicxml"
  },
  {
    numero: 190,
    titulo: "Amados, não temamos",
    arquivo: "hinos/hino-190.musicxml"
  },
  {
    numero: 191,
    titulo: "Vem, vem consolar-me",
    arquivo: "hinos/hino-191.musicxml"
  },
  {
    numero: 192,
    titulo: "Quão fiel promessa Jesus nos fez",
    arquivo: "hinos/hino-192.musicxml"
  },
  {
    numero: 193,
    titulo: "Nada jamais me faltará",
    arquivo: "hinos/hino-193.musicxml"
  },
  {
    numero: 194,
    titulo: "Vós chorareis e vos lamentareis",
    arquivo: "hinos/hino-194.musicxml"
  },
  {
    numero: 195,
    titulo: "Senhor, estou disposto",
    arquivo: "hinos/hino-195.musicxml"
  },
  {
    numero: 196,
    titulo: "Sem Deus Pai",
    arquivo: "hinos/hino-196.musicxml"
  },
  {
    numero: 197,
    titulo: "Senhor, por Teu poder",
    arquivo: "hinos/hino-197.musicxml"
  },
  {
    numero: 198,
    titulo: "Nosso Pai celeste sabe e provê",
    arquivo: "hinos/hino-198.musicxml"
  },
  {
    numero: 199,
    titulo: "Senhor, Tu és a minha Porção",
    arquivo: "hinos/hino-199.musicxml"
  },
  {
    numero: 200,
    titulo: "Não se turbe o vosso coração",
    arquivo: "hinos/hino-200.musicxml"
  },
  {
    numero: 201,
    titulo: "Deus nos guarde",
    arquivo: "hinos/hino-201.musicxml"
  },
  {
    numero: 202,
    titulo: "Em Ti me alegro, Senhor",
    arquivo: "hinos/hino-202.musicxml"
  },
  {
    numero: 203,
    titulo: "O meu vero Amigo é Jesus",
    arquivo: "hinos/hino-203.musicxml"
  },
  {
    numero: 204,
    titulo: "Só Jesus é Amigo verdadeiro",
    arquivo: "hinos/hino-204.musicxml"
  },
  {
    numero: 205,
    titulo: "Salvo por Seu poder",
    arquivo: "hinos/hino-205.musicxml"
  },
  {
    numero: 206,
    titulo: "Tu és o Amigo",
    arquivo: "hinos/hino-206.musicxml"
  },
  {
    numero: 207,
    titulo: "Cristo é fiel",
    arquivo: "hinos/hino-207.musicxml"
  },
  {
    numero: 208,
    titulo: "Conserva a paz, ó minha alma",
    arquivo: "hinos/hino-208.musicxml"
  },
  {
    numero: 209,
    titulo: "Oh! Marchai, soldados",
    arquivo: "hinos/hino-209.musicxml"
  },
  {
    numero: 210,
    titulo: "Grandes promessas",
    arquivo: "hinos/hino-210.musicxml"
  },
  {
    numero: 211,
    titulo: "O Senhor Jesus passava",
    arquivo: "hinos/hino-211.musicxml"
  },
  {
    numero: 212,
    titulo: "Testemunhas verazes nós somos",
    arquivo: "hinos/hino-212.musicxml"
  },
  {
    numero: 213,
    titulo: "Quando vier do céu",
    arquivo: "hinos/hino-213.musicxml"
  },
  {
    numero: 214,
    titulo: "Como foi para os céus, assim virá",
    arquivo: "hinos/hino-214.musicxml"
  },
  {
    numero: 215,
    titulo: "Em Breve ao céi irei",
    arquivo: "hinos/hino-215.musicxml"
  },
  {
    numero: 216,
    titulo: "Irmãos, amemos ao Senhor",
    arquivo: "hinos/hino-216.musicxml"
  },
  {
    numero: 217,
    titulo: "Vamos, unidos, a Deus louvar",
    arquivo: "hinos/hino-217.musicxml"
  },
  {
    numero: 218,
    titulo: "Oh! Jubilemos, devotos de Cristo",
    arquivo: "hinos/hino-218.musicxml"
  },
  {
    numero: 219,
    titulo: "Novos céus nós aguardamos",
    arquivo: "hinos/hino-219.musicxml"
  },
  {
    numero: 220,
    titulo: "Cristo voltará",
    arquivo: "hinos/hino-220.musicxml"
  },
  {
    numero: 221,
    titulo: "A Descida do Espírito Santo",
    arquivo: "hinos/hino-221.musicxml"
  },
  {
    numero: 222,
    titulo: "Brevemente virá o Senhor Jesus",
    arquivo: "hinos/hino-222.musicxml"
  },
  {
    numero: 223,
    titulo: "Muitos, por fé, aceitaram Jesus",
    arquivo: "hinos/hino-223.musicxml"
  },
  {
    numero: 224,
    titulo: "Só Jesus concede paz e Salvação",
    arquivo: "hinos/hino-224.musicxml"
  },
  {
    numero: 225,
    titulo: "Senhor, com Tua voz me chamas",
    arquivo: "hinos/hino-225.musicxml"
  },
  {
    numero: 226,
    titulo: "A história do Evangelho",
    arquivo: "hinos/hino-226.musicxml"
  },
  {
    numero: 227,
    titulo: "Procuras tu ao Salvador",
    arquivo: "hinos/hino-227.musicxml"
  },
  {
    numero: 228,
    titulo: "Salvação! Salvação!",
    arquivo: "hinos/hino-228.musicxml"
  },
  {
    numero: 229,
    titulo: "Eu vivia no pecado",
    arquivo: "hinos/hino-229.musicxml"
  },
  {
    numero: 230,
    titulo: "A Ti rendemos graças",
    arquivo: "hinos/hino-230.musicxml"
  },
  {
    numero: 231,
    titulo: "Provemos, irmãos, do amor do Senhor",
    arquivo: "hinos/hino-231.musicxml"
  },
  {
    numero: 232,
    titulo: "Seguro estou..",
    arquivo: "hinos/hino-232.musicxml"
  },
  {
    numero: 233,
    titulo: "Avante, santos e fiéis de Deus",
    arquivo: "hinos/hino-233.musicxml"
  },
  {
    numero: 234,
    titulo: "O meu ser entrego a Cristo",
    arquivo: "hinos/hino-234.musicxml"
  },
  {
    numero: 235,
    titulo: "Um amor imenso",
    arquivo: "hinos/hino-235.musicxml"
  },
  {
    numero: 236,
    titulo: "Há um lugar de eterna paz",
    arquivo: "hinos/hino-236.musicxml"
  },
  {
    numero: 237,
    titulo: "Deus é por mim",
    arquivo: "hinos/hino-237.musicxml"
  },
  {
    numero: 238,
    titulo: "Teu servo ouve; fala, Senhor",
    arquivo: "hinos/hino-238.musicxml"
  },
  {
    numero: 239,
    titulo: "Eis que a noite é passada",
    arquivo: "hinos/hino-239.musicxml"
  },
  {
    numero: 240,
    titulo: "Não me cansarei de cantar",
    arquivo: "hinos/hino-240.musicxml"
  },
  {
    numero: 241,
    titulo: "A Justiça Divina",
    arquivo: "hinos/hino-241.musicxml"
  },
  {
    numero: 242,
    titulo: "Profundo é o saber de Deus, Criador",
    arquivo: "hinos/hino-242.musicxml"
  },
  {
    numero: 243,
    titulo: "É Jesus o nosso Intercessor",
    arquivo: "hinos/hino-243.musicxml"
  },
  {
    numero: 244,
    titulo: "Cristo intercede por ti",
    arquivo: "hinos/hino-244.musicxml"
  },
  {
    numero: 245,
    titulo: "Não pode entender o mundo",
    arquivo: "hinos/hino-245.musicxml"
  },
  {
    numero: 246,
    titulo: "Irmãos, ja resgatados",
    arquivo: "hinos/hino-246.musicxml"
  },
  {
    numero: 247,
    titulo: "Se fores tentado",
    arquivo: "hinos/hino-247.musicxml"
  },
  {
    numero: 248,
    titulo: "Glória! Aleluia! Sinto Jesus",
    arquivo: "hinos/hino-248.musicxml"
  },
  {
    numero: 249,
    titulo: "A Caridade",
    arquivo: "hinos/hino-249.musicxml"
  },
  {
    numero: 250,
    titulo: "Com meu Redentor viverei nos céus",
    arquivo: "hinos/hino-250.musicxml"
  },
  {
    numero: 251,
    titulo: "Firme nas mãos de Cristo",
    arquivo: "hinos/hino-251.musicxml"
  },
  {
    numero: 252,
    titulo: "Exaltação ao Deus Onipotente",
    arquivo: "hinos/hino-252.musicxml"
  },
  {
    numero: 253,
    titulo: "Foi alegre, ditoso o dia",
    arquivo: "hinos/hino-253.musicxml"
  },
  {
    numero: 254,
    titulo: "De Jesus a graça divina",
    arquivo: "hinos/hino-254.musicxml"
  },
  {
    numero: 255,
    titulo: "Jesus é a nossa Rocha",
    arquivo: "hinos/hino-255.musicxml"
  },
  {
    numero: 256,
    titulo: "Sem Deus Pai, vivi no mundo",
    arquivo: "hinos/hino-256.musicxml"
  },
  {
    numero: 257,
    titulo: "Remiu-nos por graça",
    arquivo: "hinos/hino-257.musicxml"
  },
  {
    numero: 258,
    titulo: "Louvemos ao nosso Senhor",
    arquivo: "hinos/hino-258.musicxml"
  },
  {
    numero: 259,
    titulo: "Só triunfará o de sincero coração",
    arquivo: "hinos/hino-259.musicxml"
  },
  {
    numero: 260,
    titulo: "Sou servo inutil, ó Deus piedoso",
    arquivo: "hinos/hino-260.musicxml"
  },
  {
    numero: 261,
    titulo: "Vivo por Cristo",
    arquivo: "hinos/hino-261.musicxml"
  },
  {
    numero: 262,
    titulo: "Senhor, a Tua igreja",
    arquivo: "hinos/hino-262.musicxml"
  },
  {
    numero: 263,
    titulo: "Cristo é Luz resplandecente",
    arquivo: "hinos/hino-263.musicxml"
  },
  {
    numero: 264,
    titulo: "Redentor celeste e santo",
    arquivo: "hinos/hino-264.musicxml"
  },
  {
    numero: 265,
    titulo: "Bençãos dos céus prometidas",
    arquivo: "hinos/hino-265.musicxml"
  },
  {
    numero: 266,
    titulo: "Vinde às fileiras",
    arquivo: "hinos/hino-266.musicxml"
  },
  {
    numero: 267,
    titulo: "Graça maravilhosa",
    arquivo: "hinos/hino-267.musicxml"
  },
  {
    numero: 268,
    titulo: "Ó Deus bendito",
    arquivo: "hinos/hino-268.musicxml"
  },
  {
    numero: 269,
    titulo: "Ressucitados, por graça, fomos",
    arquivo: "hinos/hino-269.musicxml"
  },
  {
    numero: 270,
    titulo: "Deste mundo mais nada esperarei",
    arquivo: "hinos/hino-270.musicxml"
  },
  {
    numero: 271,
    titulo: "Graças dou a Ti, ó bom Deus",
    arquivo: "hinos/hino-271.musicxml"
  },
  {
    numero: 272,
    titulo: "Louvarei ao bom Jesus",
    arquivo: "hinos/hino-272.musicxml"
  },
  {
    numero: 273,
    titulo: "Jesus me deu celeste hino",
    arquivo: "hinos/hino-273.musicxml"
  },
  {
    numero: 274,
    titulo: "Na Plenitude estarei",
    arquivo: "hinos/hino-274.musicxml"
  },
  {
    numero: 275,
    titulo: "Avante eu vou",
    arquivo: "hinos/hino-275.musicxml"
  },
  {
    numero: 276,
    titulo: "Ó Senhor da glória",
    arquivo: "hinos/hino-276.musicxml"
  },
  {
    numero: 277,
    titulo: "Oh! Quanto é bom louvarmos",
    arquivo: "hinos/hino-277.musicxml"
  },
  {
    numero: 278,
    titulo: "Éramos mortos nas obras más",
    arquivo: "hinos/hino-278.musicxml"
  },
  {
    numero: 279,
    titulo: "Oh! Não temas, igreja de Jesus",
    arquivo: "hinos/hino-279.musicxml"
  },
  {
    numero: 280,
    titulo: "De Deus a armadura",
    arquivo: "hinos/hino-280.musicxml"
  },
  {
    numero: 281,
    titulo: "Soldaddos valorosos nós somos",
    arquivo: "hinos/hino-281.musicxml"
  },
  {
    numero: 282,
    titulo: "Constantemente oremos a Deus",
    arquivo: "hinos/hino-282.musicxml"
  },
  {
    numero: 283,
    titulo: "Quero, ó Senhor, ir Contigo ao céu",
    arquivo: "hinos/hino-283.musicxml"
  },
  {
    numero: 284,
    titulo: "Louvor nos céus altíssimos",
    arquivo: "hinos/hino-284.musicxml"
  },
  {
    numero: 285,
    titulo: "Glória e louvor a Jesus darei",
    arquivo: "hinos/hino-285.musicxml"
  },
  {
    numero: 286,
    titulo: "Nome precioso para mim",
    arquivo: "hinos/hino-286.musicxml"
  },
  {
    numero: 287,
    titulo: "Irmãos amados, sempre avante",
    arquivo: "hinos/hino-287.musicxml"
  },
  {
    numero: 288,
    titulo: "Ó Irmãos, com Cristo avante",
    arquivo: "hinos/hino-288.musicxml"
  },
  {
    numero: 289,
    titulo: "Avante, sempre avante",
    arquivo: "hinos/hino-289.musicxml"
  },
  {
    numero: 290,
    titulo: "Sempre avante!",
    arquivo: "hinos/hino-290.musicxml"
  },
  {
    numero: 291,
    titulo: "Irmãos, avante, avante!",
    arquivo: "hinos/hino-291.musicxml"
  },
  {
    numero: 292,
    titulo: "Oh! Quanto é bom o Redentor!",
    arquivo: "hinos/hino-292.musicxml"
  },
  {
    numero: 293,
    titulo: "Tu és Oleiro",
    arquivo: "hinos/hino-293.musicxml"
  },
  {
    numero: 294,
    titulo: "Avante! Coragem! Marchemos",
    arquivo: "hinos/hino-294.musicxml"
  },
  {
    numero: 295,
    titulo: "Fui, Senhor, por Ti remido",
    arquivo: "hinos/hino-295.musicxml"
  },
  {
    numero: 296,
    titulo: "Teu Nome é soberano, ó Redentor",
    arquivo: "hinos/hino-296.musicxml"
  },
  {
    numero: 297,
    titulo: "Senhor, conforta meu coração",
    arquivo: "hinos/hino-297.musicxml"
  },
  {
    numero: 298,
    titulo: "Avante sempre, sem temer!",
    arquivo: "hinos/hino-298.musicxml"
  },
  {
    numero: 299,
    titulo: "Em Nome de Jesus",
    arquivo: "hinos/hino-299.musicxml"
  },
  {
    numero: 300,
    titulo: "Tudo que nos falta",
    arquivo: "hinos/hino-300.musicxml"
  },
  {
    numero: 301,
    titulo: "Nossa esperança é Jesus",
    arquivo: "hinos/hino-301.musicxml"
  },
  {
    numero: 302,
    titulo: "Que gloriosa Esperança é Jesus",
    arquivo: "hinos/hino-302.musicxml"
  },
  {
    numero: 303,
    titulo: "O Senhor não mudará",
    arquivo: "hinos/hino-303.musicxml"
  },
  {
    numero: 304,
    titulo: "Cristo é a Esperaça",
    arquivo: "hinos/hino-304.musicxml"
  },
  {
    numero: 305,
    titulo: "Oh! Que fundamento",
    arquivo: "hinos/hino-305.musicxml"
  },
  {
    numero: 306,
    titulo: "Bendizei ao Altíssimo Deus",
    arquivo: "hinos/hino-306.musicxml"
  },
  {
    numero: 307,
    titulo: "Cristo nos dará da Sua plenitude",
    arquivo: "hinos/hino-307.musicxml"
  },
  {
    numero: 308,
    titulo: "Soa a trombeta",
    arquivo: "hinos/hino-308.musicxml"
  },
  {
    numero: 309,
    titulo: "Galardão nos espera",
    arquivo: "hinos/hino-309.musicxml"
  },
  {
    numero: 310,
    titulo: "Nós te louvamos, ó Rei dos reis",
    arquivo: "hinos/hino-310.musicxml"
  },
  {
    numero: 311,
    titulo: "Teus Tesouros revelaste",
    arquivo: "hinos/hino-311.musicxml"
  },
  {
    numero: 312,
    titulo: "Tributos de louvor",
    arquivo: "hinos/hino-312.musicxml"
  },
  {
    numero: 313,
    titulo: "Arrebatado aos céus",
    arquivo: "hinos/hino-313.musicxml"
  },
  {
    numero: 314,
    titulo: "O  Teu poder supremo",
    arquivo: "hinos/hino-314.musicxml"
  },
  {
    numero: 315,
    titulo: "Contempla do céu",
    arquivo: "hinos/hino-315.musicxml"
  },
  {
    numero: 316,
    titulo: "Tua vida é triste",
    arquivo: "hinos/hino-316.musicxml"
  },
  {
    numero: 317,
    titulo: "Sinto Senhor, por fé, em mim",
    arquivo: "hinos/hino-317.musicxml"
  },
  {
    numero: 318,
    titulo: "Ó Salvador, vem converter o pecador",
    arquivo: "hinos/hino-318.musicxml"
  },
  {
    numero: 319,
    titulo: "Foi Jesus Quem me salvou",
    arquivo: "hinos/hino-319.musicxml"
  },
  {
    numero: 320,
    titulo: "Que prazer é andar com Cristo",
    arquivo: "hinos/hino-320.musicxml"
  },
  {
    numero: 321,
    titulo: "Bendito seja o Deus vivente",
    arquivo: "hinos/hino-321.musicxml"
  },
  {
    numero: 322,
    titulo: "Vem, rei eterno",
    arquivo: "hinos/hino-322.musicxml"
  },
  {
    numero: 323,
    titulo: "Oh! não busque, ansioso",
    arquivo: "hinos/hino-323.musicxml"
  },
  {
    numero: 324,
    titulo: "Do mal o Salvador veio me tirar",
    arquivo: "hinos/hino-324.musicxml"
  },
  {
    numero: 325,
    titulo: "Louvemos ao Rei dos reis",
    arquivo: "hinos/hino-325.musicxml"
  },
  {
    numero: 326,
    titulo: "Sempre a Cristo fiéis",
    arquivo: "hinos/hino-326.musicxml"
  },
  {
    numero: 327,
    titulo: "Soldados somos do Senhor",
    arquivo: "hinos/hino-327.musicxml"
  },
  {
    numero: 328,
    titulo: "Soldados somos do Senhor",
    arquivo: "hinos/hino-328.musicxml"
  },
  {
    numero: 329,
    titulo: "Com fé combate",
    arquivo: "hinos/hino-329.musicxml"
  },
  {
    numero: 330,
    titulo: "Ao findar a jornada",
    arquivo: "hinos/hino-330.musicxml"
  },
  {
    numero: 331,
    titulo: "Vem a Cristo sem tardar",
    arquivo: "hinos/hino-331.musicxml"
  },
  {
    numero: 332,
    titulo: "É Cristo Quem cuida de ti",
    arquivo: "hinos/hino-332.musicxml"
  },
  {
    numero: 333,
    titulo: "Peregrino sou no mundo",
    arquivo: "hinos/hino-333.musicxml"
  },
  {
    numero: 334,
    titulo: "Há uma pátria perfeita..",
    arquivo: "hinos/hino-334.musicxml"
  },
  {
    numero: 335,
    titulo: "Eu almejo nessa patria entrar",
    arquivo: "hinos/hino-335.musicxml"
  },
  {
    numero: 336,
    titulo: "Sempre brilhar devemos",
    arquivo: "hinos/hino-336.musicxml"
  },
  {
    numero: 337,
    titulo: "Por fé seguimos ao Senhor",
    arquivo: "hinos/hino-337.musicxml"
  },
  {
    numero: 338,
    titulo: "O Senhor é sempiterno",
    arquivo: "hinos/hino-338.musicxml"
  },
  {
    numero: 339,
    titulo: "Glória se, par",
    arquivo: "hinos/hino-339.musicxml"
  },
  {
    numero: 340,
    titulo: "No mundo sou peregrino",
    arquivo: "hinos/hino-340.musicxml"
  },
  {
    numero: 341,
    titulo: "Com fé espera no Senhor",
    arquivo: "hinos/hino-341.musicxml"
  },
  {
    numero: 342,
    titulo: "Sião celestial",
    arquivo: "hinos/hino-342.musicxml"
  },
  {
    numero: 343,
    titulo: "Lá no céu cantaremos",
    arquivo: "hinos/hino-343.musicxml"
  },
  {
    numero: 344,
    titulo: "Vou encontrar meu Deus",
    arquivo: "hinos/hino-344.musicxml"
  },
  {
    numero: 345,
    titulo: "Regozijo-me em falar do Salvador",
    arquivo: "hinos/hino-345.musicxml"
  },
  {
    numero: 346,
    titulo: "Longe do mal e perto de Ti",
    arquivo: "hinos/hino-346.musicxml"
  },
  {
    numero: 347,
    titulo: "Ontem, hoje e eternamente",
    arquivo: "hinos/hino-347.musicxml"
  },
  {
    numero: 348,
    titulo: "Em Cristo espera, sem vacilar",
    arquivo: "hinos/hino-348.musicxml"
  },
  {
    numero: 349,
    titulo: "Irmãos amados",
    arquivo: "hinos/hino-349.musicxml"
  },
  {
    numero: 350,
    titulo: "A jornada farei",
    arquivo: "hinos/hino-350.musicxml"
  },
  {
    numero: 351,
    titulo: "Senhor, a Tua presença",
    arquivo: "hinos/hino-351.musicxml"
  },
  {
    numero: 352,
    titulo: "Sinto viva esperança",
    arquivo: "hinos/hino-352.musicxml"
  },
  {
    numero: 353,
    titulo: "Eleitos nós somos",
    arquivo: "hinos/hino-353.musicxml"
  },
  {
    numero: 354,
    titulo: "Jerusalém celestial",
    arquivo: "hinos/hino-354.musicxml"
  },
  {
    numero: 355,
    titulo: "A Ti, Deus, eu consagrei-me",
    arquivo: "hinos/hino-355.musicxml"
  },
  {
    numero: 356,
    titulo: "Por preço elevado Jesus me resgatou",
    arquivo: "hinos/hino-356.musicxml"
  },
  {
    numero: 357,
    titulo: "Face a faze O verei",
    arquivo: "hinos/hino-357.musicxml"
  },
  {
    numero: 358,
    titulo: "Teu precioso sangue",
    arquivo: "hinos/hino-358.musicxml"
  },
  {
    numero: 359,
    titulo: "Ó irmãos, de Deus deleitos",
    arquivo: "hinos/hino-359.musicxml"
  },
  {
    numero: 360,
    titulo: "Do mal apartados devemos estar",
    arquivo: "hinos/hino-360.musicxml"
  },
  {
    numero: 361,
    titulo: "Tudo entende o Salvador",
    arquivo: "hinos/hino-361.musicxml"
  },
  {
    numero: 362,
    titulo: "Que bela herança!",
    arquivo: "hinos/hino-362.musicxml"
  },
  {
    numero: 363,
    titulo: "Aos Teus pés estou, Senhor",
    arquivo: "hinos/hino-363.musicxml"
  },
  {
    numero: 364,
    titulo: "Os Tempos já chegados são..",
    arquivo: "hinos/hino-364.musicxml"
  },
  {
    numero: 365,
    titulo: "Contrito, venho a Ti",
    arquivo: "hinos/hino-365.musicxml"
  },
  {
    numero: 366,
    titulo: "Pela fé tereis vitória",
    arquivo: "hinos/hino-366.musicxml"
  },
  {
    numero: 367,
    titulo: "Ao que vive para sempre..",
    arquivo: "hinos/hino-367.musicxml"
  },
  {
    numero: 368,
    titulo: "Deus nos elegeu para Si",
    arquivo: "hinos/hino-368.musicxml"
  },
  {
    numero: 369,
    titulo: "Sentes bater em teu coração",
    arquivo: "hinos/hino-369.musicxml"
  },
  {
    numero: 370,
    titulo: "Têm os santos do Senhor",
    arquivo: "hinos/hino-370.musicxml"
  },
  {
    numero: 371,
    titulo: "Aos pés me apresento",
    arquivo: "hinos/hino-371.musicxml"
  },
  {
    numero: 372,
    titulo: "Da igreja, fiel Fundamento é Jesus",
    arquivo: "hinos/hino-372.musicxml"
  },
  {
    numero: 373,
    titulo: "Cristo Jesus, o Redentor",
    arquivo: "hinos/hino-373.musicxml"
  },
  {
    numero: 374,
    titulo: "Santo! Santo! Santo!",
    arquivo: "hinos/hino-374.musicxml"
  },
  {
    numero: 375,
    titulo: "A paz eu vos deixo",
    arquivo: "hinos/hino-375.musicxml"
  },
  {
    numero: 376,
    titulo: "Senhor, preciso mais..",
    arquivo: "hinos/hino-376.musicxml"
  },
  {
    numero: 377,
    titulo: "No céu, Senhor, no céu",
    arquivo: "hinos/hino-377.musicxml"
  },
  {
    numero: 378,
    titulo: "Gradioso és Tu",
    arquivo: "hinos/hino-378.musicxml"
  },
  {
    numero: 379,
    titulo: "Grande festa haverá nos céus",
    arquivo: "hinos/hino-379.musicxml"
  },
  {
    numero: 380,
    titulo: "Com Jesus, eternamente viverei",
    arquivo: "hinos/hino-380.musicxml"
  },
  {
    numero: 381,
    titulo: "Mu breve virá, mui breve virá",
    arquivo: "hinos/hino-381.musicxml"
  },
  {
    numero: 382,
    titulo: "Creio nas fiéis promessas do meu Deus",
    arquivo: "hinos/hino-382.musicxml"
  },
  {
    numero: 383,
    titulo: "Cristo é a Estrela",
    arquivo: "hinos/hino-383.musicxml"
  },
  {
    numero: 384,
    titulo: "Nos resgatou e nos lavou",
    arquivo: "hinos/hino-384.musicxml"
  },
  {
    numero: 385,
    titulo: "Vinde após Mim",
    arquivo: "hinos/hino-385.musicxml"
  },
  {
    numero: 386,
    titulo: "Pela morte de Jesus",
    arquivo: "hinos/hino-386.musicxml"
  },
  {
    numero: 387,
    titulo: "Ó Salvador, que recebeste poder",
    arquivo: "hinos/hino-387.musicxml"
  },
  {
    numero: 388,
    titulo: "Na cidade santa",
    arquivo: "hinos/hino-388.musicxml"
  },
  {
    numero: 389,
    titulo: "Cristo Jesus chama os Seus",
    arquivo: "hinos/hino-389.musicxml"
  },
  {
    numero: 390,
    titulo: "Eis que vem o Verdadeiro",
    arquivo: "hinos/hino-390.musicxml"
  },
  {
    numero: 391,
    titulo: "Um Peregrino sou aqui",
    arquivo: "hinos/hino-391.musicxml"
  },
  {
    numero: 392,
    titulo: "Com Jesus, a Esperança",
    arquivo: "hinos/hino-392.musicxml"
  },
  {
    numero: 393,
    titulo: "Ó bom Jesus, meu caro Jesus",
    arquivo: "hinos/hino-393.musicxml"
  },
  {
    numero: 394,
    titulo: "Nas moradas do Senhor",
    arquivo: "hinos/hino-394.musicxml"
  },
  {
    numero: 395,
    titulo: "Eis-Me aqui, dirá o Criador",
    arquivo: "hinos/hino-395.musicxml"
  },
  {
    numero: 396,
    titulo: "Vamos, ó irmãos, marchar",
    arquivo: "hinos/hino-396.musicxml"
  },
  {
    numero: 397,
    titulo: "Paz, sublime paz",
    arquivo: "hinos/hino-397.musicxml"
  },
  {
    numero: 398,
    titulo: "Não tardará a volta do Senhor",
    arquivo: "hinos/hino-398.musicxml"
  },
  {
    numero: 399,
    titulo: "Sou a Videira",
    arquivo: "hinos/hino-399.musicxml"
  },
  {
    numero: 400,
    titulo: "Divina fonte é Jesus",
    arquivo: "hinos/hino-400.musicxml"
  },
  {
    numero: 401,
    titulo: "Revela Teu querer",
    arquivo: "hinos/hino-401.musicxml"
  },
  {
    numero: 402,
    titulo: "Ó irmãos, a Deus devemos..",
    arquivo: "hinos/hino-402.musicxml"
  },
  {
    numero: 403,
    titulo: "Pela fé uma vez..",
    arquivo: "hinos/hino-403.musicxml"
  },
  {
    numero: 404,
    titulo: "Por fé, recebe o grande Mestre",
    arquivo: "hinos/hino-404.musicxml"
  },
  {
    numero: 405,
    titulo: "Só por Cristo temos Salvação",
    arquivo: "hinos/hino-405.musicxml"
  },
  {
    numero: 406,
    titulo: "A voz de Cristo te convida Vem",
    arquivo: "hinos/hino-406.musicxml"
  },
  {
    numero: 407,
    titulo: "És bendito eternamente!",
    arquivo: "hinos/hino-407.musicxml"
  },
  {
    numero: 408,
    titulo: "Jesus Cristo é o Pão celeste",
    arquivo: "hinos/hino-408.musicxml"
  },
  {
    numero: 409,
    titulo: "Breve voltará Jesus Cristo",
    arquivo: "hinos/hino-409.musicxml"
  },
  {
    numero: 410,
    titulo: "O sangue precioso",
    arquivo: "hinos/hino-410.musicxml"
  },
  {
    numero: 411,
    titulo: "Ó vitupério de Jesus",
    arquivo: "hinos/hino-411.musicxml"
  },
  {
    numero: 412,
    titulo: "Senhor, recordamos aqui..",
    arquivo: "hinos/hino-412.musicxml"
  },
  {
    numero: 413,
    titulo: "Foi por mim que morreste",
    arquivo: "hinos/hino-413.musicxml"
  },
  {
    numero: 414,
    titulo: "Teu sangue imaculado",
    arquivo: "hinos/hino-414.musicxml"
  },
  {
    numero: 415,
    titulo: "Na cruz morreu o Cordeiro",
    arquivo: "hinos/hino-415.musicxml"
  },
  {
    numero: 416,
    titulo: "No Calvário..",
    arquivo: "hinos/hino-416.musicxml"
  },
  {
    numero: 417,
    titulo: "Recordemo-nos sempre do Mestre",
    arquivo: "hinos/hino-417.musicxml"
  },
  {
    numero: 418,
    titulo: "Só Jesus Cristo, santo Cordeiro",
    arquivo: "hinos/hino-418.musicxml"
  },
  {
    numero: 419,
    titulo: "Fazei isto em memória de Mim",
    arquivo: "hinos/hino-419.musicxml"
  },
  {
    numero: 420,
    titulo: "Foi no Calvário..",
    arquivo: "hinos/hino-420.musicxml"
  },
  {
    numero: 421,
    titulo: "Recorda, por fé, minha alma",
    arquivo: "hinos/hino-421.musicxml"
  },
  {
    numero: 422,
    titulo: "Jesus Cristo, fiel Cordeiro",
    arquivo: "hinos/hino-422.musicxml"
  },
  {
    numero: 423,
    titulo: "Só o sangue precioso e expirador",
    arquivo: "hinos/hino-423.musicxml"
  },
  {
    numero: 424,
    titulo: "Ó Jesus, por nós morreste",
    arquivo: "hinos/hino-424.musicxml"
  },
  {
    numero: 425,
    titulo: "Cristo Supremo",
    arquivo: "hinos/hino-425.musicxml"
  },
  {
    numero: 426,
    titulo: "Lá no céu, o lar de amor",
    arquivo: "hinos/hino-426.musicxml"
  },
  {
    numero: 427,
    titulo: "Os que no Senhor dormiram",
    arquivo: "hinos/hino-427.musicxml"
  },
  {
    numero: 428,
    titulo: "O dia de Cristo bem perto está",
    arquivo: "hinos/hino-428.musicxml"
  },
  {
    numero: 429,
    titulo: "A trombeta soará",
    arquivo: "hinos/hino-429.musicxml"
  },
  {
    numero: 430,
    titulo: "Preciosa é, aos olhos do Criador",
    arquivo: "hinos/hino-430.musicxml"
  },
  {
    numero: 431,
    titulo: "Ó meninos, estamos reunidos",
    arquivo: "hinos/hino-431.musicxml"
  },
  {
    numero: 432,
    titulo: "Vem, ó divino Mestre",
    arquivo: "hinos/hino-432.musicxml"
  },
  {
    numero: 433,
    titulo: "Na santa escola",
    arquivo: "hinos/hino-433.musicxml"
  },
  {
    numero: 434,
    titulo: "A minha alma sente paz no Senhor",
    arquivo: "hinos/hino-434.musicxml"
  },
  {
    numero: 435,
    titulo: "Ó Jesus, quanto és piedoso!",
    arquivo: "hinos/hino-435.musicxml"
  },
  {
    numero: 436,
    titulo: "Alegria sinto em servir Jesus",
    arquivo: "hinos/hino-436.musicxml"
  },
  {
    numero: 437,
    titulo: "Os meninos viram Jesus passar",
    arquivo: "hinos/hino-437.musicxml"
  },
  {
    numero: 438,
    titulo: "Oh! Que amor celeste!",
    arquivo: "hinos/hino-438.musicxml"
  },
  {
    numero: 439,
    titulo: "Somos jovens",
    arquivo: "hinos/hino-439.musicxml"
  },
  {
    numero: 440,
    titulo: "Lembra-te do teu Criador!",
    arquivo: "hinos/hino-440.musicxml"
  },
  {
    numero: 441,
    titulo: "Eu sou um cordeirinho",
    arquivo: "hinos/hino-441.musicxml"
  },
  {
    numero: 442,
    titulo: "Bênçãos, bênçãos Deus derramará",
    arquivo: "hinos/hino-442.musicxml"
  },
  {
    numero: 443,
    titulo: "Ó meninos, Deus vos convida",
    arquivo: "hinos/hino-443.musicxml"
  },
  {
    numero: 444,
    titulo: "Ó meninos, exaltemos",
    arquivo: "hinos/hino-444.musicxml"
  },
  {
    numero: 445,
    titulo: "Ajuntemos um tesouro eterno",
    arquivo: "hinos/hino-445.musicxml"
  },
  {
    numero: 446,
    titulo: "Vós, ó jovens do Senhor",
    arquivo: "hinos/hino-446.musicxml"
  },
  {
    numero: 447,
    titulo: "Brilha mais e mais",
    arquivo: "hinos/hino-447.musicxml"
  },
  {
    numero: 448,
    titulo: "Sou criança, Senhor",
    arquivo: "hinos/hino-448.musicxml"
  },
  {
    numero: 449,
    titulo: "O meu nome no céu escreveste, Senhor",
    arquivo: "hinos/hino-449.musicxml"
  },
  {
    numero: 450,
    titulo: "Vamos, queridos, escolher a boa parte",
    arquivo: "hinos/hino-450.musicxml"
  },
  {
    numero: 451,
    titulo: "Jamais esquecerei Tua mercê",
    arquivo: "hinos/hino-451.musicxml"
  },
  {
    numero: 452,
    titulo: "Jesus, ó divinal Pastor",
    arquivo: "hinos/hino-452.musicxml"
  },
  {
    numero: 453,
    titulo: "Consagrados sejamos a Deus",
    arquivo: "hinos/hino-453.musicxml"
  },
  {
    numero: 454,
    titulo: "Cidadão dos céus",
    arquivo: "hinos/hino-454.musicxml"
  },
  {
    numero: 455,
    titulo: "Quão ditoso é caminhar com Jesus!",
    arquivo: "hinos/hino-455.musicxml"
  },
  {
    numero: 456,
    titulo: "Somos joias preciosas",
    arquivo: "hinos/hino-456.musicxml"
  },
  {
    numero: 457,
    titulo: "Comigo está Jesus",
    arquivo: "hinos/hino-457.musicxml"
  },
  {
    numero: 458,
    titulo: "Cristo me ama",
    arquivo: "hinos/hino-458.musicxml"
  },
  {
    numero: 459,
    titulo: "Vamos nos preparar!",
    arquivo: "hinos/hino-459.musicxml"
  },
  {
    numero: 460,
    titulo: "Vamos todos juntos cantar",
    arquivo: "hinos/hino-460.musicxml"
  },
  {
    numero: 461,
    titulo: "Abrigado em Jesus",
    arquivo: "hinos/hino-461.musicxml"
  },
  {
    numero: 462,
    titulo: "Gloriosa é a história",
    arquivo: "hinos/hino-462.musicxml"
  },
  {
    numero: 463,
    titulo: "Mocidade! Vamos combater!",
    arquivo: "hinos/hino-463.musicxml"
  },
  {
    numero: 464,
    titulo: "Reunidos nós estamos",
    arquivo: "hinos/hino-464.musicxml"
  },
  {
    numero: 465,
    titulo: "Deus tem por nós imenso amor",
    arquivo: "hinos/hino-465.musicxml"
  },
  {
    numero: 466,
    titulo: "A criança consagrada",
    arquivo: "hinos/hino-466.musicxml"
  },
  {
    numero: 467,
    titulo: "Vamos com Jesus",
    arquivo: "hinos/hino-467.musicxml"
  },
  {
    numero: 468,
    titulo: "Toda a criança..",
    arquivo: "hinos/hino-468.musicxml"
  },
  {
    numero: 469,
    titulo: "Pai nosso, que estás nos céus",
    arquivo: "hinos/hino-469.musicxml"
  },
  {
    numero: 470,
    titulo: "Jesus Cristo, Seus fiéis, ensina",
    arquivo: "hinos/hino-470.musicxml"
  },
  {
    numero: 471,
    titulo: "Que grande bem é andar com Cristo!",
    arquivo: "hinos/hino-471.musicxml"
  },
  {
    numero: 472,
    titulo: "Glorificarei, glorificarei",
    arquivo: "hinos/hino-472.musicxml"
  },
  {
    numero: 473,
    titulo: "Forasteiro sou no mundo",
    arquivo: "hinos/hino-473.musicxml"
  },
  {
    numero: 474,
    titulo: "Oh! Glória! Bendito é o Senhor!",
    arquivo: "hinos/hino-474.musicxml"
  },
  {
    numero: 475,
    titulo: "Se eu for aqui provado",
    arquivo: "hinos/hino-475.musicxml"
  },
  {
    numero: 476,
    titulo: "Deixai a Mim vir os pequeninos..",
    arquivo: "hinos/hino-476.musicxml"
  },
  {
    numero: 477,
    titulo: "Vinde, crianças",
    arquivo: "hinos/hino-477.musicxml"
  },
  {
    numero: 478,
    titulo: "Cedo retorna o Senhor",
    arquivo: "hinos/hino-478.musicxml"
  },
  {
    numero: 479,
    titulo: "Somos jovens consagrados",
    arquivo: "hinos/hino-479.musicxml"
  },
  {
    numero: 480,
    titulo: "Jovens, amai o conselho",
    arquivo: "hinos/hino-480.musicxml"
  }
];

const state = {
  midiData: null,
  fileName: "musica_digitada",
  rawNotes: [],
  chordEvents: [],
  lyricEvents: [],
  skippedNotes: 0,
  playableNotes: [],
  pianoEvents: [],
  sequence: [],
  selectedIndex: 0,
  activeIndex: -1,
  activePianoEventIndex: -1,
  status: "idle",
  instrument: null,
  instrumentKind: null,
  instrumentReady: Promise.resolve(),
  part: null,
  guitarAudioPart: null,
  basePart: null,
  nativeAudioCtx: null,
  noteMarker: null,
  nextMarker: null,
  noteTimer: null,
  currentXmlText: "",
  uploadedXmlText: "",
  uploadedFileName: "",
  osmd: null,
  scoreCursorStep: -1,
  scoreCursorSteps: [],
  scoreMarkerTimer: null,
  playbackToken: 0,
  detectedBpm: 120,
  currentBpm: 120,
  sourceKeyFifths: 0,
  chordVolume: 0
};

const REAL_GUITAR_SAMPLES = {
  acoustic: {
    label: "violÃ£o real aÃ§o",
    baseUrl: "https://cdn.jsdelivr.net/npm/tonejs-instrument-guitar-acoustic-mp3@1.1.2/",
    volumeBase: 2,
    release: 0.38,
    urls: {
      E2: "E2.mp3",
      F2: "F2.mp3",
      "F#2": "Fs2.mp3",
      G2: "G2.mp3",
      A2: "A2.mp3",
      B2: "B2.mp3",
      C3: "C3.mp3",
      D3: "D3.mp3",
      E3: "E3.mp3",
      G3: "G3.mp3",
      A3: "A3.mp3",
      B3: "B3.mp3",
      C4: "C4.mp3",
      D4: "D4.mp3",
      E4: "E4.mp3",
      G4: "G4.mp3",
      A4: "A4.mp3",
      B4: "B4.mp3",
      C5: "C5.mp3"
    }
  },
  nylon: {
    label: "violÃ£o real nylon",
    baseUrl: "https://cdn.jsdelivr.net/npm/tonejs-instrument-guitar-nylon-mp3@1.1.1/",
    volumeBase: -7,
    release: 0.88,
    urls: {
      B1: "B1.mp3",
      E2: "E2.mp3",
      "F#2": "Fs2.mp3",
      A2: "A2.mp3",
      B2: "B2.mp3",
      "C#3": "Cs3.mp3",
      D3: "D3.mp3",
      E3: "E3.mp3",
      "F#3": "Fs3.mp3",
      G3: "G3.mp3",
      A3: "A3.mp3",
      B3: "B3.mp3",
      "C#4": "Cs4.mp3",
      "D#4": "Ds4.mp3",
      E4: "E4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      B4: "B4.mp3",
      "C#5": "Cs5.mp3",
      D5: "D5.mp3",
      E5: "E5.mp3"
    }
  }
};

const REAL_PIANO_SAMPLE = {
  label: "piano real",
  baseUrl: "https://cdn.jsdelivr.net/npm/tonejs-instrument-piano-mp3@1.1.2/",
  volumeBase: -6,
  release: 1.4,
  urls: {
    A1: "A1.mp3", C2: "C2.mp3", E2: "E2.mp3", G2: "G2.mp3",
    A2: "A2.mp3", C3: "C3.mp3", E3: "E3.mp3", G3: "G3.mp3",
    A3: "A3.mp3", C4: "C4.mp3", E4: "E4.mp3", G4: "G4.mp3",
    A4: "A4.mp3", C5: "C5.mp3", E5: "E5.mp3", G5: "G5.mp3",
    A5: "A5.mp3", C6: "C6.mp3", E6: "E6.mp3", G6: "G6.mp3",
    C7: "C7.mp3"
  }
};

const REAL_RECORDER_SAMPLE = {
  label: "flauta doce real",
  baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/recorder-mp3/",
  volumeBase: -8,
  release: 0.42,
  urls: {
    C5: "C5.mp3",
    D5: "D5.mp3",
    E5: "E5.mp3",
    F5: "F5.mp3",
    G5: "G5.mp3",
    A5: "A5.mp3",
    B5: "B5.mp3",
    C6: "C6.mp3",
    D6: "D6.mp3",
    E6: "E6.mp3",
    F6: "F6.mp3",
    G6: "G6.mp3",
    A6: "A6.mp3",
    B6: "B6.mp3",
    C7: "C7.mp3"
  }
};

const PITCH_CLASS = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

const XML_SHARP_SPELLINGS = [
  { step: "C", alter: 0, pt: "Do" },
  { step: "C", alter: 1, pt: "Do#" },
  { step: "D", alter: 0, pt: "Re" },
  { step: "D", alter: 1, pt: "Re#" },
  { step: "E", alter: 0, pt: "Mi" },
  { step: "F", alter: 0, pt: "Fa" },
  { step: "F", alter: 1, pt: "Fa#" },
  { step: "G", alter: 0, pt: "Sol" },
  { step: "G", alter: 1, pt: "Sol#" },
  { step: "A", alter: 0, pt: "La" },
  { step: "A", alter: 1, pt: "La#" },
  { step: "B", alter: 0, pt: "Si" }
];

const XML_FLAT_SPELLINGS = [
  { step: "C", alter: 0, pt: "Do" },
  { step: "D", alter: -1, pt: "Reb" },
  { step: "D", alter: 0, pt: "Re" },
  { step: "E", alter: -1, pt: "Mib" },
  { step: "E", alter: 0, pt: "Mi" },
  { step: "F", alter: 0, pt: "Fa" },
  { step: "G", alter: -1, pt: "Solb" },
  { step: "G", alter: 0, pt: "Sol" },
  { step: "A", alter: -1, pt: "Lab" },
  { step: "A", alter: 0, pt: "La" },
  { step: "B", alter: -1, pt: "Sib" },
  { step: "B", alter: 0, pt: "Si" }
];

const XML_STEP_NAMES = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si"
};

const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  dominant: [0, 4, 7, 10],
  "major-seventh": [0, 4, 7, 11],
  "minor-seventh": [0, 3, 7, 10],
  "diminished-seventh": [0, 3, 6, 9],
  "half-diminished": [0, 3, 6, 10],
  "suspended-fourth": [0, 5, 7],
  "suspended-second": [0, 2, 7],
  power: [0, 7]
};

const KIND_LABELS = {
  major: "",
  minor: "m",
  diminished: "dim",
  augmented: "aug",
  dominant: "7",
  "major-seventh": "maj7",
  "minor-seventh": "m7",
  "diminished-seventh": "dim7",
  "half-diminished": "m7b5",
  "suspended-fourth": "sus4",
  "suspended-second": "sus2",
  power: "5"
};

const PIANO_NOTE_NAMES = ["D\u00f3", "D\u00f3#", "R\u00e9", "R\u00e9#", "Mi", "F\u00e1", "F\u00e1#", "Sol", "Sol#", "L\u00e1", "L\u00e1#", "Si"];
const PIANO_WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const PIANO_FINGERS = {
  0: 1,
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 4,
  6: 4,
  7: 5,
  8: 5,
  9: 3,
  10: 3,
  11: 4
};

const PIANO_BLACK_OFFSETS = {
  1: 0.68,
  3: 1.68,
  6: 3.68,
  8: 4.68,
  10: 5.68
};

function currentLayout() {
  return els.layoutSelect.value;
}

function currentInstrument() {
  return els.instrumentSelect?.value || "violao";
}

function activeProfile() {
  return INSTRUMENT_PROFILES[currentInstrument()] || INSTRUMENT_PROFILES.violao;
}

function applyInstrumentProfile(updateLayout = true) {
  const profile = activeProfile();
  CONFIG.totalFrets = profile.totalFrets;
  CONFIG.fretSpace = Math.min(52, Math.floor((CONFIG.boardWidth - CONFIG.nutOffset - 18) / Math.max(1, profile.totalFrets)));
  CONFIG.tuning = profile.tuning.slice();
  CONFIG.stringNumbers = profile.stringNumbers.slice();
  CONFIG.stringNames = profile.stringNames.slice();
  CONFIG.stringY = profile.tuning.map((_, index, array) => {
    if (array.length === 1) return CONFIG.boardHeight / 2;
    const top = 36;
    const bottom = CONFIG.boardHeight - 35;
    return top + ((bottom - top) * index) / (array.length - 1);
  });

  if (updateLayout) {
    els.layoutSelect.value = profile.layout;
    if (els.soundSelect.value !== profile.sound) {
      els.soundSelect.value = profile.sound;
      disposeInstrument();
    }
  }
}

function isPianoMode() {
  return currentLayout().startsWith("piano");
}

function isClarinetMode() {
  return currentInstrument() === "clarinete";
}

function isRecorderMode() {
  return currentInstrument() === "flautaDoce";
}

function isTransverseFluteMode() {
  return currentInstrument() === "flautaTransversal";
}

function isWindScoreMode() {
  return isClarinetMode() || isRecorderMode() || isTransverseFluteMode();
}

function isPianoTwoHandsMode() {
  return currentLayout().startsWith("piano2");
}

function noteNamePtFromMidi(midi, includeOctave = true, keyFifths = null) {
  if (!Number.isFinite(midi)) return "";
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  const spellings = Number.isFinite(keyFifths)
    ? (keyFifths < 0 ? XML_FLAT_SPELLINGS : XML_SHARP_SPELLINGS)
    : null;
  const name = spellings?.[pc]?.pt || NOTE_LABELS_PT[pc];
  return `${name}${includeOctave ? octave : ""}`;
}

function clampKeyFifths(value) {
  return Math.max(-7, Math.min(7, Math.round(Number.isFinite(value) ? value : 0)));
}

function keyFromNameMap(fileName, map) {
  const normalized = String(fileName || "").toLowerCase().replace(/\\/g, "/");
  const coro = normalized.match(/(?:^|\/|-)coro-?(\d+)|(?:^|\/|-)c(\d+)(?=[_.-]|$)/);
  if (coro) {
    const key = `c${coro[1] || coro[2]}`;
    if (map.has(key)) return map.get(key);
  }
  const hino = normalized.match(/hino[-_ ]?(\d+)|(?:^|\/)(\d+)(?=[_. -])/);
  if (hino) {
    const number = hino[1] || hino[2];
    if (map.has(`hino-${number}`)) return map.get(`hino-${number}`);
    if (map.has(number)) return map.get(number);
  }
  return null;
}

function hymnKeyFromName(fileName) {
  return keyFromNameMap(fileName, HYMN_KEY_FIFTHS);
}

function clarinetKeyFifths() {
  const directKey = keyFromNameMap(state.fileName, CLARINET_WRITTEN_KEY_FIFTHS);
  if (directKey !== null) return clampKeyFifths(directKey);
  return clampKeyFifths((state.sourceKeyFifths || 0) + CLARINET_KEY_FIFTHS_OFFSET);
}

function clarinetInfo(note) {
  const writtenMidi = note.midi + CLARINET_WRITTEN_OFFSET + CLARINET_WRITTEN_OCTAVE_SHIFT;
  const keyFifths = clarinetKeyFifths();
  const pc = ((Math.round(writtenMidi) % 12) + 12) % 12;
  const map = writtenMidi >= 72 ? CLARINET_SPRITE.highMap : CLARINET_SPRITE.map;
  const sprite = map[pc] || CLARINET_SPRITE.map[pc] || CLARINET_SPRITE.map[4];
  const imageIndex = Math.max(1, Math.min(CLARINET_IMAGE_COUNT, Math.round(writtenMidi) - CLARINET_IMAGE_BASE_MIDI + 1));
  return {
    writtenMidi,
    writtenName: noteNamePtFromMidi(writtenMidi, false, keyFifths),
    soundingName: noteNamePtFromMidi(note.midi, false, state.sourceKeyFifths),
    keyFifths,
    imageUrl: `clarinete_limpas/image${imageIndex}.png`,
    imageIndex,
    sprite,
    pc
  };
}

function recorderKeyFifths() {
  const clarinetWrittenKey = keyFromNameMap(state.fileName, CLARINET_WRITTEN_KEY_FIFTHS);
  if (clarinetWrittenKey !== null) return clampKeyFifths(clarinetWrittenKey - CLARINET_KEY_FIFTHS_OFFSET);
  return clampKeyFifths(state.sourceKeyFifths || 0);
}

function recorderInfo(note) {
  const writtenMidi = note.midi + RECORDER_WRITTEN_OCTAVE_SHIFT;
  const keyFifths = recorderKeyFifths();
  const pc = ((Math.round(writtenMidi) % 12) + 12) % 12;
  const base = RECORDER_FINGERINGS.get(pc);
  const writtenName = noteNamePtFromMidi(writtenMidi, false, keyFifths);
  return {
    writtenMidi,
    writtenName,
    keyFifths,
    holes: base?.holes || ["open", "open", "open", "open", "open", "open", "open", "open"],
    inRange: writtenMidi >= 60 && writtenMidi <= 84,
    pc
  };
}

function transverseFluteInfo(note) {
  const writtenMidi = note.midi + TRANSVERSE_FLUTE_WRITTEN_OCTAVE_SHIFT;
  const keyFifths = recorderKeyFifths();
  const pc = ((Math.round(writtenMidi) % 12) + 12) % 12;
  const writtenName = noteNamePtFromMidi(writtenMidi, false, keyFifths);
  const range = writtenMidi >= 72 ? "alto" : "baixo";
  const imageStem = TRANSVERSE_FLUTE_IMAGES[pc] || TRANSVERSE_FLUTE_IMAGES[0];
  return {
    writtenMidi,
    writtenName,
    keyFifths,
    imageUrl: `flauta_transversal_notas/${imageStem}-${range}.png`,
    inRange: writtenMidi >= 60 && writtenMidi <= 96,
    pc
  };
}

function recorderHoleSvg(state, x, y, r, split = false) {
  const klass = state === "closed" ? "closed" : state === "half" ? "half" : "open";
  if (!split) return `<circle class="rec-hole ${klass}" cx="${x}" cy="${y}" r="${r}"></circle>`;
  return `
    <circle class="rec-hole ${klass}" cx="${x - r - 2}" cy="${y}" r="${Math.max(5, r - 3)}"></circle>
    <circle class="rec-hole ${klass}" cx="${x + r + 2}" cy="${y}" r="${Math.max(5, r - 3)}"></circle>
  `;
}

function recorderDiagramSvg(info) {
  const holes = info?.holes || [];
  const y = [58, 94, 130, 166, 202, 238, 274];
  return `
    <svg class="recorder-svg" viewBox="0 0 150 330" role="img" aria-label="Digitacao da flauta doce">
      <defs>
        <linearGradient id="recHalf" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#020617"></stop>
          <stop offset="50%" stop-color="#020617"></stop>
          <stop offset="51%" stop-color="#ffffff"></stop>
          <stop offset="100%" stop-color="#ffffff"></stop>
        </linearGradient>
      </defs>
      <rect class="rec-mouth" x="55" y="10" width="40" height="28" rx="10"></rect>
      <rect class="rec-body" x="60" y="38" width="30" height="270" rx="15"></rect>
      <text class="rec-thumb-label" x="20" y="48">T</text>
      ${recorderHoleSvg(holes[0], 20, 68, 12)}
      ${y.map((yy, index) => `
        <text class="rec-hole-label" x="120" y="${yy + 4}">${index + 1}</text>
        ${recorderHoleSvg(holes[index + 1], 75, yy, index >= 5 ? 9 : 11, index >= 5)}
      `).join("")}
    </svg>
  `;
}

function transverseFluteDiagramSvg(info) {
  return `
    <img class="transverse-flute-note-img" src="${info?.imageUrl || ""}" alt="${info?.writtenName || "Flauta transversal"}">
  `;
}

function isYoutubeLayout() {
  return currentLayout() === "youtube" || currentLayout() === "piano-youtube" || currentLayout() === "piano2-youtube";
}

function pianoInfo(midi, handOverride = null, fingerOverride = null, noteNameOverride = null) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNameOverride || PIANO_NOTE_NAMES[pc];
  const finger = fingerOverride || PIANO_FINGERS[pc] || 3;
  const hand = handOverride || (isPianoTwoHandsMode() && midi < 60 ? "left" : "right");
  const handLabel = hand === "left" ? "ME" : "MD";
  return {
    noteName,
    octave,
    finger,
    hand,
    handLabel,
    label: `${noteName} ${finger}`,
    fullLabel: `${isPianoTwoHandsMode() ? `${handLabel} ` : ""}Tecla ${noteName}${octave} - dedo ${finger}`,
    pc
  };
}


function melodicPianoFinger(midi, previousMidi, previousFinger) {
  if (!Number.isFinite(previousMidi) || !Number.isFinite(previousFinger)) {
    return PIANO_FINGERS[((midi % 12) + 12) % 12] || 3;
  }

  const interval = midi - previousMidi;
  if (interval === 0) return previousFinger;
  if (Math.abs(interval) > 5) {
    return PIANO_FINGERS[((midi % 12) + 12) % 12] || 3;
  }

  if (interval > 0) return Math.max(1, Math.min(5, previousFinger + 1));
  return Math.max(1, Math.min(5, previousFinger - 1));
}

function nearestLowerC(midi) {
  const octave = Math.floor((midi - 12) / 12);
  return Math.max(24, (octave + 1) * 12);
}

function setStatus(message, status = state.status) {
  state.status = status;
  els.status.textContent = message;
  els.stateBadge.textContent = statusLabel(status);
}

function statusLabel(status) {
  const labels = {
    idle: "sem MIDI",
    ready: "pronto",
    intro: "intro",
    playing: "tocando",
    paused: "pausado",
    stopped: "parado"
  };
  return labels[status] || status;
}

function playbackSpeed() {
  return state.currentBpm / state.detectedBpm;
}

function isTransportPlaying() {
  return Tone.Transport.state === "started" || state.status === "playing";
}

function updateBpmDisplay() {
  const value = String(Math.round(state.currentBpm));
  els.bpmValue.textContent = value;
  els.miniBpmValue.textContent = value;
  if (els.entryBpmValue) els.entryBpmValue.textContent = value;
  if (els.entryKeyValue) {
    const keyNames = {"-7":"Cb","-6":"Gb","-5":"Db","-4":"Ab","-3":"Eb","-2":"Bb","-1":"F","0":"C","1":"G","2":"D","3":"A","4":"E","5":"B","6":"F#","7":"C#"};
    els.entryKeyValue.textContent = keyNames[String(clampKeyFifths(state.sourceKeyFifths || 0))] || "C";
  }
}

function updateChordVolumeDisplay() {
  if (els.chordVolValue) els.chordVolValue.textContent = String(Math.round(state.chordVolume));
}

function changeChordVolume(delta) {
  state.chordVolume = Math.max(0, Math.min(100, state.chordVolume + delta));
  updateChordVolumeDisplay();
  setStatus(`Volume das cifras: ${state.chordVolume}.`, state.playableNotes.length ? "ready" : "idle");
}

function detectMidiBpm() {
  const tempo = state.midiData?.header?.tempos?.find(item => Number.isFinite(item.bpm) && item.bpm > 0);
  return tempo ? Math.round(tempo.bpm) : 120;
}

function setDetectedBpm(bpm) {
  const validBpm = Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm) : 120;
  state.detectedBpm = validBpm;
  state.currentBpm = validBpm;
  updateBpmDisplay();
}

function changeBpm(delta) {
  state.currentBpm = Math.max(30, Math.min(240, state.currentBpm + delta));
  updateBpmDisplay();

  if (isTransportPlaying()) {
    const activeEvent = isPianoTwoHandsMode() ? pianoEventForNoteIndex(state.activeIndex) : null;
    const resumeFrom = activeEvent ? activeEvent.startIndex : Math.max(0, state.activeIndex);
    const playbackToken = ++state.playbackToken;
    Tone.Transport.stop();
    clearPart();
    silenceInstrument();
    prepareTransport(resumeFrom, playbackToken).then(prepared => {
      if (!prepared || playbackToken !== state.playbackToken) return;
      Tone.Transport.start();
      setStatus(`Tocando em ${state.currentBpm} BPM.`, "playing");
    }).catch(() => {});
  } else {
    setStatus(`BPM ajustado para ${state.currentBpm}.`, state.playableNotes.length ? "ready" : "idle");
  }
}

function boardScaleX() {
  return els.fretboard.clientWidth / CONFIG.boardWidth;
}

function boardScaleY() {
  return els.fretboard.clientHeight / CONFIG.boardHeight;
}

function boardXForPosition(position) {
  const scale = boardScaleX();
  const nutX = CONFIG.boardWidth - CONFIG.nutOffset;
  if (position.fret === 0) return (nutX + 24) * scale;
  return (nutX - position.fret * CONFIG.fretSpace + CONFIG.fretSpace / 2) * scale;
}

function boardYForString(stringIndex) {
  return CONFIG.stringY[stringIndex] * boardScaleY();
}

function setupFretboard() {

  if (isWindScoreMode()) {
    if (isRecorderMode()) {
      setupRecorderPanel();
      return;
    }
    if (isTransverseFluteMode()) {
      setupRecorderPanel();
      return;
    }
    setupClarinetPanel();
    return;
  }

  if (isPianoMode()) {
    setupPianoKeyboard();
    return;
  }

  els.fretboard.classList.remove("piano-board", "clarinet-board", "recorder-board", "transverse-flute-board");
  els.fretboard.classList.toggle("viola-board", currentInstrument() === "viola");
  const scaleX = boardScaleX();
  const scaleY = boardScaleY();
  const nutX = CONFIG.boardWidth - CONFIG.nutOffset;

  els.fretboard.querySelectorAll(".string,.paired-string,.string-name,.fret,.fret-name,.note-marker,.next-marker,.piano-stage,.piano-key,.falling-note,.clarinet-card,.recorder-card,.transverse-flute-card").forEach(el => el.remove());
  els.fretboard.querySelector(".nut").style.display = "block";
  els.fretboard.querySelector(".nut").style.right = `${CONFIG.nutOffset * scaleX}px`;

  CONFIG.stringY.forEach((y, i) => {
    const string = document.createElement("div");
    string.className = "string";
    string.style.top = `${y * scaleY}px`;
    string.style.height = `${Math.max(2, (6 - i) * 0.7)}px`;
    els.fretboard.appendChild(string);

    if (currentInstrument() === "viola") {
      const pair = document.createElement("div");
      pair.className = "paired-string";
      pair.style.top = `${(y * scaleY) - 5}px`;
      pair.style.height = `${Math.max(1, (6 - i) * 0.42)}px`;
      els.fretboard.appendChild(pair);
    }

    const name = document.createElement("div");
    name.className = "string-name";
    name.style.top = `${y * scaleY}px`;
    name.textContent = CONFIG.stringNames[i];
    els.fretboard.appendChild(name);
  });

  for (let fret = 0; fret <= CONFIG.totalFrets; fret += 1) {
    const x = (nutX - fret * CONFIG.fretSpace) * scaleX;
    const fretEl = document.createElement("div");
    fretEl.className = "fret";
    fretEl.style.left = `${x}px`;
    els.fretboard.appendChild(fretEl);

    if (fret > 0) {
      const previous = nutX - (fret - 1) * CONFIG.fretSpace;
      const mid = ((nutX - fret * CONFIG.fretSpace) + previous) / 2;
      const label = document.createElement("div");
      label.className = "fret-name";
      label.style.left = `${mid * scaleX}px`;
      label.textContent = fret;
      els.fretboard.appendChild(label);
    }
  }
}

function pianoRangeStart() {
  const notes = state.playableNotes.length ? state.playableNotes : state.rawNotes;
  const minMidi = notes.length ? Math.min(...notes.map(note => note.midi)) : 60;
  return nearestLowerC(minMidi);
}

function pianoRange() {
  const notes = state.playableNotes.length ? state.playableNotes : state.rawNotes;
  if (!notes.length) return { startMidi: 60, whiteCount: 14 };

  const minMidi = Math.min(...notes.map(note => note.midi));
  const maxMidi = Math.max(...notes.map(note => note.midi));
  const startMidi = nearestLowerC(minMidi);
  const desiredEnd = Math.max(startMidi + 23, maxMidi + 2);
  let whiteCount = 0;

  for (let midi = startMidi; midi <= desiredEnd; midi += 1) {
    if (PIANO_WHITE_PCS.includes(midi % 12)) whiteCount += 1;
  }

  return { startMidi, whiteCount: Math.max(14, Math.min(28, whiteCount)) };
}

function pianoWhiteKeys(startMidi, count = 14) {
  const keys = [];
  let midi = startMidi;
  while (keys.length < count) {
    if (PIANO_WHITE_PCS.includes(midi % 12)) keys.push(midi);
    midi += 1;
  }
  return keys;
}

function pianoKeyGeometry(midi) {
  const startMidi = Number(els.fretboard.dataset.pianoStart || pianoRangeStart());
  const whiteCount = Number(els.fretboard.dataset.pianoWhiteCount || 14);
  const whites = pianoWhiteKeys(startMidi, whiteCount);
  const pc = ((midi % 12) + 12) % 12;
  const whiteWidth = els.fretboard.clientWidth / whites.length;

  if (PIANO_WHITE_PCS.includes(pc)) {
    const index = whites.indexOf(midi);
    if (index >= 0) return { left: index * whiteWidth, width: whiteWidth, whiteIndex: index, black: false };
  }

  const octaveShift = Math.floor((midi - startMidi) / 12);
  const octaveStartWhite = octaveShift * 7;
  const offset = PIANO_BLACK_OFFSETS[pc];
  if (offset === undefined) return null;
  const left = (octaveStartWhite + offset) * whiteWidth - whiteWidth * 0.32;
  return { left, width: whiteWidth * 0.64, whiteIndex: octaveStartWhite + offset, black: true };
}

function setupPianoKeyboard() {
  els.fretboard.classList.add("piano-board");
  els.fretboard.classList.remove("viola-board", "clarinet-board", "recorder-board", "transverse-flute-board");
  state.activePianoEventIndex = -1;
  els.fretboard.querySelectorAll(".string,.paired-string,.string-name,.fret,.fret-name,.note-marker,.next-marker,.piano-stage,.piano-key,.falling-note,.clarinet-card,.recorder-card,.transverse-flute-card").forEach(el => el.remove());
  els.fretboard.querySelector(".nut").style.display = "none";

  const { startMidi, whiteCount } = pianoRange();
  els.fretboard.dataset.pianoStart = String(startMidi);
  els.fretboard.dataset.pianoWhiteCount = String(whiteCount);
  const whites = pianoWhiteKeys(startMidi, whiteCount);

  const stage = document.createElement("div");
  stage.className = "piano-stage";
  els.fretboard.appendChild(stage);

  whites.forEach((midi, index) => {
    const key = document.createElement("div");
    key.className = "piano-key white-key";
    key.dataset.midi = String(midi);
    key.style.left = `${(index / whites.length) * 100}%`;
    key.style.width = `${100 / whites.length}%`;
    key.textContent = index % 7 === 0 ? `C${Math.floor(midi / 12) - 1}` : "";
    els.fretboard.appendChild(key);
  });

  for (let midi = startMidi; midi <= whites[whites.length - 1]; midi += 1) {
    const pc = ((midi % 12) + 12) % 12;
    if (!PIANO_BLACK_OFFSETS[pc]) continue;
    const geom = pianoKeyGeometry(midi);
    if (!geom || geom.left < 0 || geom.left > els.fretboard.clientWidth) continue;

    const key = document.createElement("div");
    key.className = "piano-key black-key";
    key.dataset.midi = String(midi);
    key.style.left = `${geom.left}px`;
    key.style.width = `${geom.width}px`;
    els.fretboard.appendChild(key);
  }
}

function possiblePositions(midi) {
  const positions = [];
  CONFIG.tuning.forEach((openMidi, stringIndex) => {
    const fret = midi - openMidi;
    if (fret >= 0 && fret <= CONFIG.totalFrets) {
      positions.push({ stringIndex, fret });
    }
  });
  return positions;
}

function choosePosition(midi, previousPosition) {
  const positions = possiblePositions(midi);
  if (!positions.length) return null;

  const openPosition = positions.find(position => position.fret === 0);
  if (openPosition) return openPosition;

  positions.sort((a, b) => {
    const score = position => {
      const openBonus = position.fret === 0 ? -20 : 0;
      const fretCost = position.fret * 2.4;
      const movementCost = previousPosition
        ? Math.abs(position.fret - previousPosition.fret) * 0.28 + Math.abs(position.stringIndex - previousPosition.stringIndex) * 0.18
        : 0;
      return openBonus + fretCost + movementCost;
    };
    return score(a) - score(b);
  });

  return positions[0];
}


function choosePlayableStringNote(note, previousPosition) {
  const current = currentInstrument();
  const candidates = current === "ukulele"
    ? [note.midi + 12, note.midi, note.midi - 12]
    : [note.midi];

  for (const midi of candidates) {
    const position = choosePosition(midi, previousPosition);
    if (position) {
      return {
        note: {
          ...note,
          midi,
          name: Tone.Frequency(midi, "midi").toNote(),
          displayName: noteNameFromMidi(midi) || note.displayName,
          transposedForInstrument: midi !== note.midi
        },
        position
      };
    }
  }

  return null;
}

function suggestedStringFinger(position) {
  if (!position || position.fret <= 0) return 0;
  return Math.max(1, Math.min(4, position.fret));
}

function stringFingeringLabel(position) {
  const corda = CONFIG.stringNumbers[position.stringIndex];
  const dedo = suggestedStringFinger(position);
  return dedo
    ? `Corda ${corda} - casa ${position.fret} - dedo ${dedo}`
    : `Corda ${corda} - solta`;
}

function tabForPosition(position) {
  return stringFingeringLabel(position);
}

function markerForPosition(position) {
  return `${CONFIG.stringNumbers[position.stringIndex]}-${position.fret}`;
}

function noteLabelFromPc(pc) {
  return NOTE_LABELS[((pc % 12) + 12) % 12];
}

function normalizeChordLabel(label) {
  return String(label || "")
    .replace("maj", "M")
    .replace("major", "")
    .replace("minor", "m")
    .replace(/\s+/g, "")
    .trim();
}

function generatedChordShape(chord) {
  if (!chord) return "Sem cifra neste ponto.";
  const label = normalizeChordLabel(chord.label);
  if (currentInstrument() === "viola" && VIOLA_E_CHORD_BANK[label]) {
    return `PDF viola E: ${VIOLA_E_CHORD_BANK[label]}`;
  }

  const tones = [chord.bassPc, ...chord.intervals.map(interval => (chord.rootPc + interval) % 12)];
  const used = new Set();
  const positions = [];

  CONFIG.tuning.forEach((openMidi, stringIndex) => {
    let best = null;
    for (let fret = 0; fret <= CONFIG.totalFrets; fret += 1) {
      const pc = (openMidi + fret) % 12;
      if (!tones.includes(pc)) continue;
      const score = fret + (used.has(pc) ? 2.5 : 0) + (fret === 0 ? -0.8 : 0);
      if (!best || score < best.score) best = { stringIndex, fret, pc, score };
    }
    if (best) {
      used.add(best.pc);
      positions.push(`${CONFIG.stringNumbers[stringIndex]}-${best.fret}`);
    }
  });

  return positions.length
    ? `${activeProfile().subtitle}: ${positions.join("  ")}`
    : "Sem forma facil nesta regiao.";
}

function lyricTextNear(time) {
  if (!state.lyricEvents.length) return "Letra do hino aparece aqui.";
  const active = state.lyricEvents.filter(item => item.time <= time + 0.02).slice(-10);
  return active.map(item => item.text).join(" ").replace(/\s+([,.;:!?])/g, "$1") || "Letra do hino aparece aqui.";
}

function chordAtTime(time) {
  const chords = alignedChordEvents();
  if (!chords.length) return null;
  return chords.filter(chord => chord.time <= time + 0.02).slice(-1)[0] || null;
}

function sopranoAlignedChordTime(chordTime) {
  if (!state.playableNotes.length) return chordTime;
  const forward = state.playableNotes.find(note => note.time >= chordTime - 0.015);
  if (forward && forward.time - chordTime <= 1.35) return forward.time;
  const nearest = state.playableNotes.reduce((best, note) => {
    const distance = Math.abs(note.time - chordTime);
    return !best || distance < best.distance ? { note, distance } : best;
  }, null);
  return nearest && nearest.distance <= 0.32 ? nearest.note.time : chordTime;
}

function alignedChordEvents() {
  if (!state.chordEvents.length) return [];
  return state.chordEvents
    .map(chord => ({ ...chord, time: sopranoAlignedChordTime(chord.time) }))
    .filter((chord, index, array) => {
      const previous = array[index - 1];
      return !previous || Math.abs(previous.time - chord.time) > 0.001 || previous.label !== chord.label;
    });
}

function updateStudyPanel(note = null) {
  const currentTime = note?.time ?? 0;
  const chord = chordAtTime(currentTime);
  if (els.lyricLine) {
    els.lyricLine.textContent = isClarinetMode()
      ? "Partitura do soprano para clarinete."
      : isRecorderMode()
        ? "Partitura do soprano para flauta doce."
        : isTransverseFluteMode()
          ? "Partitura do soprano para flauta transversal."
        : lyricTextNear(currentTime);
  }
  if (els.fingeringLine) {
    const label = note?.clarinet
      ? `${note.clarinet.writtenName} - soa ${note.clarinet.soundingName}`
      : note?.recorder
        ? note.recorder.writtenName
      : note?.transverseFlute
        ? note.transverseFlute.writtenName
      : note?.piano
        ? pianoShortLabel(note)
        : (note?.tab || "A digitacao aparece aqui.");
    const noteName = note?.displayName || note?.name || "";
    els.fingeringLine.textContent = note ? `${noteName} - ${label}` : label;
  }
  if (els.chordName) els.chordName.textContent = "";
  if (els.chordShape) els.chordShape.textContent = "";
}

function getAllMidiNotes() {
  const notes = [];
  if (!state.midiData) return notes;

  state.midiData.tracks.forEach((track, trackIndex) => {
    track.notes.forEach(note => {
      notes.push({
        midi: note.midi,
        name: note.name,
        time: note.time,
        duration: note.duration || 0.35,
        velocity: note.velocity || 0.8,
        trackIndex
      });
    });
  });

  return notes.sort((a, b) => {
    if (Math.abs(a.time - b.time) > 0.0001) return a.time - b.time;
    return b.midi - a.midi;
  });
}

function midiFromXmlPitch(pitchEl) {
  const step = pitchEl.querySelector("step")?.textContent?.trim();
  const octave = Number.parseInt(pitchEl.querySelector("octave")?.textContent || "", 10);
  const alter = Number.parseInt(pitchEl.querySelector("alter")?.textContent || "0", 10);

  if (!step || !Number.isFinite(octave) || !(step in PITCH_CLASS)) return null;
  return (octave + 1) * 12 + PITCH_CLASS[step] + alter;
}

function noteNameFromXmlPitch(pitchEl) {
  const step = pitchEl.querySelector("step")?.textContent?.trim();
  const alter = Number.parseInt(pitchEl.querySelector("alter")?.textContent || "0", 10);
  if (!step || !(step in XML_STEP_NAMES)) return "";
  const accidental = alter === -2 ? "bb" : alter === -1 ? "b" : alter === 1 ? "#" : alter === 2 ? "##" : "";
  return `${XML_STEP_NAMES[step]}${accidental}`;
}

function noteNameFromMidi(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return PIANO_NOTE_NAMES[pc] || "";
}

function pitchClassFromHarmony(parent, prefix) {
  const step = parent.querySelector(`${prefix}-step`)?.textContent?.trim();
  const alter = Number.parseInt(parent.querySelector(`${prefix}-alter`)?.textContent || "0", 10);
  if (!step || !(step in PITCH_CLASS)) return null;
  return (PITCH_CLASS[step] + alter + 12) % 12;
}

function midiForPitchClass(pc, minMidi, maxMidi) {
  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    if (midi % 12 === pc) return midi;
  }
  return minMidi;
}

function parseHarmony(harmonyEl, time) {
  const rootEl = harmonyEl.querySelector("root");
  if (!rootEl) return null;

  const rootPc = pitchClassFromHarmony(rootEl, "root");
  if (rootPc === null) return null;

  const kindEl = harmonyEl.querySelector("kind");
  const rawKind = kindEl?.getAttribute("text") || kindEl?.textContent || "major";
  const kind = (kindEl?.textContent || "major").trim() || "major";
  const bassEl = harmonyEl.querySelector("bass");
  const bassPc = bassEl ? pitchClassFromHarmony(bassEl, "bass") : rootPc;
  const rootName = rootEl.querySelector("root-step")?.textContent?.trim() || "";
  const alter = Number.parseInt(rootEl.querySelector("root-alter")?.textContent || "0", 10);
  const accidental = alter === 1 ? "#" : alter === -1 ? "b" : "";
  const label = `${rootName}${accidental}${KIND_LABELS[kind] ?? rawKind}`;

  return {
    time,
    rootPc,
    bassPc: bassPc ?? rootPc,
    kind,
    intervals: CHORD_INTERVALS[kind] || CHORD_INTERVALS.major,
    label
  };
}

function tempoFromDirection(directionEl) {
  const soundTempo = Number.parseFloat(directionEl.querySelector("sound[tempo]")?.getAttribute("tempo") || "");
  if (Number.isFinite(soundTempo) && soundTempo > 0) return soundTempo;

  const perMinute = Number.parseFloat(directionEl.querySelector("metronome per-minute")?.textContent || "");
  if (!Number.isFinite(perMinute) || perMinute <= 0) return null;

  const beatUnit = directionEl.querySelector("metronome beat-unit")?.textContent?.trim();
  const multipliers = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    "16th": 0.25
  };
  return perMinute * (multipliers[beatUnit] || 1);
}

function readMusicXmlNotes(xmlText, transposeSemitones = HYMN_TRANSPOSE_SEMITONES) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const parserError = xml.querySelector("parsererror");
  if (parserError) {
    throw new Error("MusicXML invÃ¡lido.");
  }

  const parts = Array.from(xml.querySelectorAll("score-partwise > part, part"));
  if (!parts.length) {
    throw new Error("MusicXML sem parte musical.");
  }

  const notes = [];
  const chords = [];
  const lyrics = [];
  let detectedTempo = 120;
  let foundTempo = false;
  let keyFifths = 0;
  let foundKey = false;

  parts.forEach((part, partIndex) => {
    let divisions = 1;
    let tempo = 120;
    let currentTime = 0;
    const lastNoteStartByVoice = new Map();

    Array.from(part.querySelectorAll("measure")).forEach(measure => {
      const divisionsEl = measure.querySelector("attributes > divisions");
      if (divisionsEl) {
        const nextDivisions = Number.parseFloat(divisionsEl.textContent);
        if (Number.isFinite(nextDivisions) && nextDivisions > 0) divisions = nextDivisions;
      }

      const keyEl = measure.querySelector("attributes > key > fifths");
      if (!foundKey && keyEl) {
        const nextKey = Number.parseInt(keyEl.textContent || "0", 10);
        if (Number.isFinite(nextKey)) {
          keyFifths = nextKey;
          foundKey = true;
        }
      }

      const soundTempo = Number.parseFloat(measure.querySelector("sound[tempo]")?.getAttribute("tempo") || "");
      if (Number.isFinite(soundTempo) && soundTempo > 0) {
        tempo = soundTempo;
        if (!foundTempo) {
          detectedTempo = soundTempo;
          foundTempo = true;
        }
      }

      Array.from(measure.children).forEach(node => {
        const tag = node.tagName;
        const durationDivisions = Number.parseFloat(node.querySelector("duration")?.textContent || "0");
        const seconds = durationDivisions > 0 ? (durationDivisions / divisions) * (60 / tempo) : 0;

        if (tag === "direction") {
          const directionTempo = tempoFromDirection(node);
          if (directionTempo) {
            tempo = directionTempo;
            if (!foundTempo) {
              detectedTempo = directionTempo;
              foundTempo = true;
            }
          }
          return;
        }

        if (tag === "backup") {
          currentTime = Math.max(0, currentTime - seconds);
          return;
        }

        if (tag === "forward") {
          currentTime += seconds;
          return;
        }

        if (tag === "harmony") {
          const harmony = parseHarmony(node, currentTime);
          if (harmony && partIndex === 0) chords.push(harmony);
          return;
        }

        if (tag !== "note") return;

        const isChord = Boolean(node.querySelector("chord"));
        const pitch = node.querySelector("pitch");
        const isGrace = Boolean(node.querySelector("grace"));
        const noteSeconds = seconds || 0.18;
        const staff = Number.parseInt(node.querySelector("staff")?.textContent || "1", 10) || 1;
        const voice = node.querySelector("voice")?.textContent?.trim() || "1";
        const voiceKey = `${staff}:${voice}`;
        const noteTime = isChord ? (lastNoteStartByVoice.get(voiceKey) ?? currentTime) : currentTime;
        const fingering = Number.parseInt(node.querySelector("notations technical fingering, fingering")?.textContent || "", 10);

        if (pitch && !node.querySelector("rest")) {
          const sourceMidi = midiFromXmlPitch(pitch);
          if (sourceMidi !== null) {
            const midi = sourceMidi + transposeSemitones;
            const displayName = noteNameFromMidi(midi) || noteNameFromXmlPitch(pitch);
            const lyricText = Array.from(node.querySelectorAll("lyric text"))
              .map(item => item.textContent.trim())
              .filter(Boolean)
              .join("");
            const isMainMelodySource = partIndex === 0 && staff === 1;
            if (lyricText && isMainMelodySource) {
              lyrics.push({ time: noteTime, text: lyricText });
            }
            if (!isMainMelodySource) return;
            notes.push({
              midi,
              name: Tone.Frequency(midi, "midi").toNote(),
              displayName,
              time: noteTime,
              duration: Math.max(noteSeconds, 0.08),
              velocity: 0.82,
              trackIndex: partIndex,
              staff,
              voice: "1",
              hand: staff === 2 ? "left" : "right",
              finger: Number.isFinite(fingering) && fingering >= 1 && fingering <= 5 ? fingering : null
            });
          }
        }

        if (!isChord && !isGrace) {
          lastNoteStartByVoice.set(voiceKey, currentTime);
          currentTime += Math.max(seconds, 0);
        }
      });
    });
  });

  notes.sort((a, b) => {
    if (Math.abs(a.time - b.time) > 0.0001) return a.time - b.time;
    if (a.trackIndex !== b.trackIndex) return a.trackIndex - b.trackIndex;
    return b.midi - a.midi;
  });

  chords.sort((a, b) => a.time - b.time);
  lyrics.sort((a, b) => a.time - b.time);
  return { notes, chords, lyrics, tempo: detectedTempo, keyFifths };
}

async function readMxlText(file) {
  if (!window.JSZip) {
    throw new Error("Leitor MXL nÃ£o carregou.");
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerFile = zip.file("META-INF/container.xml");

  if (containerFile) {
    const containerXml = new DOMParser().parseFromString(await containerFile.async("text"), "application/xml");
    const fullPath = containerXml.querySelector("rootfile")?.getAttribute("full-path");
    const mainFile = fullPath ? zip.file(fullPath) : null;
    if (mainFile) return mainFile.async("text");
  }

  const fallback = Object.values(zip.files).find(entry =>
    !entry.dir && /\.(xml|musicxml)$/i.test(entry.name) && !entry.name.includes("META-INF/")
  );

  if (!fallback) {
    throw new Error("MXL sem MusicXML principal.");
  }

  return fallback.async("text");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlPitchFromMidi(midi, keyFifths = 0) {
  const rounded = Math.round(midi);
  const pc = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const spellings = keyFifths < 0 ? XML_FLAT_SPELLINGS : XML_SHARP_SPELLINGS;
  return { ...spellings[pc], octave };
}

function noteTypeFromDivisions(durationDivisions, divisions) {
  const quarterRatio = durationDivisions / divisions;
  if (quarterRatio >= 3.5) return "whole";
  if (quarterRatio >= 1.75) return "half";
  if (quarterRatio >= 0.75) return "quarter";
  if (quarterRatio >= 0.375) return "eighth";
  return "16th";
}

function musicXmlNote(midi, durationDivisions, divisions, rest = false, keyFifths = 0) {
  const duration = Math.max(1, Math.round(durationDivisions));
  const type = noteTypeFromDivisions(duration, divisions);
  if (rest) {
    return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>${type}</type><staff>1</staff></note>`;
  }
  const pitch = xmlPitchFromMidi(midi, keyFifths);
  const alter = pitch.alter ? `<alter>${pitch.alter}</alter>` : "";
  return `<note><pitch><step>${pitch.step}</step>${alter}<octave>${pitch.octave}</octave></pitch><duration>${duration}</duration><voice>1</voice><type>${type}</type><staff>1</staff></note>`;
}

function buildWindScoreXml() {
  const divisions = 480;
  const bpm = Math.max(30, state.detectedBpm || state.currentBpm || 80);
  const keyFifths = isRecorderMode() || isTransverseFluteMode() ? recorderKeyFifths() : clarinetKeyFifths();
  const partName = isRecorderMode()
    ? "Flauta doce soprano"
    : isTransverseFluteMode()
      ? "Flauta transversal"
      : "Clarinete Si bemol";
  const quarterSeconds = 60 / bpm;
  const beatsPerMeasure = 4;
  const measureDivisions = divisions * beatsPerMeasure;
  let cursor = 0;
  let measureNumber = 1;
  let measureRemaining = measureDivisions;
  const measures = [];
  let current = [];
  let scoreStep = 0;
  const cursorSteps = [];

  const pushMeasure = () => {
    if (!current.length) return;
    measures.push(`<measure number="${measureNumber}">${measureNumber === 1 ? `<attributes><divisions>${divisions}</divisions><key><fifths>${keyFifths}</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(bpm)}"/></direction>` : ""}${current.join("")}</measure>`);
    current = [];
    measureNumber += 1;
    measureRemaining = measureDivisions;
  };

  const pushTimedNote = (midi, durationDivisions, rest = false, noteIndex = null) => {
    let remaining = Math.max(1, Math.round(durationDivisions));
    let firstSlice = true;
    while (remaining > 0) {
      const slice = Math.min(remaining, measureRemaining);
      if (!rest && firstSlice && noteIndex !== null) {
        cursorSteps[noteIndex] = scoreStep;
      }
      current.push(musicXmlNote(midi, slice, divisions, rest, keyFifths));
      scoreStep += 1;
      firstSlice = false;
      remaining -= slice;
      measureRemaining -= slice;
      if (measureRemaining <= 0) pushMeasure();
    }
  };

  state.playableNotes.forEach((note, noteIndex) => {
    const start = Math.max(0, Math.round((note.time / quarterSeconds) * divisions));
    if (start > cursor) {
      pushTimedNote(60, start - cursor, true);
      cursor = start;
    }
    const writtenMidi = note.transverseFlute?.writtenMidi
      ?? note.recorder?.writtenMidi
      ?? note.clarinet?.writtenMidi
      ?? note.midi + CLARINET_WRITTEN_OFFSET;
    const duration = Math.max(60, Math.round(((note.duration || 0.35) / quarterSeconds) * divisions));
    pushTimedNote(writtenMidi, duration, false, noteIndex);
    cursor += duration;
  });

  pushMeasure();
  state.scoreCursorSteps = cursorSteps;

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>${partName}</part-name></score-part>
  </part-list>
  <part id="P1">
    ${measures.join("\n    ")}
  </part>
</score-partwise>`;
}

function finishLoadedFile(tipo) {
  buildCleanMelody();
  renderSequence();
  stop();
  const cifras = !isWindScoreMode() && state.chordEvents.length ? ` - ${state.chordEvents.length} cifras para base` : "";
  const ignoradas = state.skippedNotes ? ` - ${state.skippedNotes} fora da regiao` : "";
  const eventos = isPianoTwoHandsMode() ? ` - ${state.pianoEvents.length} eventos` : "";
  updateStudyPanel(state.playableNotes[0] || null);
  setStatus(`${tipo} carregado: ${state.rawNotes.length} lidas - ${state.playableNotes.length} tocaveis${eventos} - ${state.detectedBpm} BPM${ignoradas}${cifras}.`, "ready");
}

function enterHymnView() {
  els.app.classList.add("hymn-open");
  els.app.classList.add("extras-minimized");
  document.querySelector("h1").textContent = "Toque Fácil";
  updateMiniToggles();
  window.requestAnimationFrame(() => {
    setupFretboard();
    if (state.activeIndex >= 0) showActiveNote(state.playableNotes[state.activeIndex]);
  });
}

function goHome() {
  stop();
  els.app.classList.remove("hymn-open");
  els.app.classList.remove("track-playing");
  document.querySelector("h1").textContent = "Toque Fácil";
  setStatus("Escolha o instrumento e o hino.", "idle");
}

async function renderMusicXmlScore(xmlText) {
  state.currentXmlText = xmlText;
  if (!isWindScoreMode()) state.scoreCursorSteps = [];
  if (!els.scoreCanvas) return;

  els.scoreCanvas.innerHTML = "";
  if (els.scoreCursor) els.scoreCursor.style.display = "none";

  const osmdGlobal = window.opensheetmusicdisplay;
  const OSMD = osmdGlobal?.OpenSheetMusicDisplay;
  if (!OSMD) {
    els.scoreCanvas.innerHTML = '<div class="score-message">Partitura carregada. Renderizador online indisponivel.</div>';
    return;
  }

  try {
    state.osmd = new OSMD(els.scoreCanvas, {
      backend: "svg",
      drawTitle: false,
      autoResize: true,
      drawingParameters: "compacttight",
      pageFormat: "Endless",
      followCursor: true
    });
    await state.osmd.load(xmlText);
    state.osmd.zoom = 1.22;
    await state.osmd.render();
    state.scoreCursorStep = -1;
    if (state.osmd.cursor) {
      state.osmd.cursor.show();
      state.osmd.cursor.reset();
    }
  } catch (error) {
    console.error(error);
    els.scoreCanvas.innerHTML = '<div class="score-message">Nao consegui desenhar esta partitura, mas o piano pode tocar.</div>';
  }
}

function setupClarinetPanel() {
  els.fretboard.classList.remove("piano-board", "viola-board", "recorder-board", "transverse-flute-board");
  els.fretboard.classList.add("clarinet-board");
  els.fretboard.querySelectorAll(".string,.paired-string,.string-name,.fret,.fret-name,.note-marker,.next-marker,.piano-stage,.piano-key,.falling-note,.clarinet-card").forEach(el => el.remove());
  const nut = els.fretboard.querySelector(".nut");
  if (nut) nut.style.display = "none";

  const card = document.createElement("div");
  card.className = "clarinet-card";
  card.innerHTML = `
    <div class="clarinet-note-name">Clarinete</div>
    <div class="clarinet-crop" aria-label="Digitacao do clarinete"></div>
    <div class="clarinet-note-help">Escolha um hino e toque.</div>
  `;
  els.fretboard.appendChild(card);
}

function applyClarinetCropStyle(element, info, scale = 0.22) {
  if (!element || !info?.sprite) return;
  element.style.setProperty("--cw", `${CLARINET_SPRITE.cropWidth * scale}px`);
  element.style.setProperty("--ch", `${CLARINET_SPRITE.cropHeight * scale}px`);
  element.style.backgroundImage = `url("${CLARINET_SPRITE.src}")`;
  element.style.backgroundSize = `${CLARINET_SPRITE.width * scale}px ${CLARINET_SPRITE.height * scale}px`;
  element.style.backgroundPosition = `-${info.sprite.x * scale}px -${info.sprite.y * scale}px`;
}

function updateClarinetPanel(note) {
  if (!isClarinetMode()) return;
  if (!els.fretboard.querySelector(".clarinet-card")) setupClarinetPanel();
  const info = note?.clarinet || (note ? clarinetInfo(note) : null);
  const crop = els.fretboard.querySelector(".clarinet-crop");
  const title = els.fretboard.querySelector(".clarinet-note-name");
  const help = els.fretboard.querySelector(".clarinet-note-help");
  if (!crop || !title || !help) return;

  if (!info) {
    crop.style.backgroundImage = `url("${CLARINET_SPRITE.src}")`;
    crop.style.backgroundSize = "contain";
    crop.style.backgroundPosition = "center";
    crop.classList.add("full-sheet");
    title.textContent = "Clarinete Si bemol";
    help.textContent = "A digitacao aparece conforme a melodia.";
    return;
  }

  crop.classList.remove("full-sheet");
  applyClarinetCropStyle(crop, info, 0.22);
  title.textContent = info.writtenName;
  help.textContent = `Escrita do clarinete - soa ${info.soundingName}`;
}

function setupRecorderPanel() {
  els.fretboard.classList.remove("piano-board", "viola-board", "clarinet-board", "recorder-board", "transverse-flute-board");
  els.fretboard.classList.add(isTransverseFluteMode() ? "transverse-flute-board" : "recorder-board");
  els.fretboard.querySelectorAll(".string,.paired-string,.string-name,.fret,.fret-name,.note-marker,.next-marker,.piano-stage,.piano-key,.falling-note,.clarinet-card,.recorder-card,.transverse-flute-card").forEach(el => el.remove());
  const nut = els.fretboard.querySelector(".nut");
  if (nut) nut.style.display = "none";
}

function updateScoreFollow(note) {
  if (!els.scorePanel || !els.scoreCanvas || !note || !state.playableNotes.length) return;

  const ratio = Math.max(0, Math.min(1, note.time / Math.max(songDuration(), 0.1)));
  const maxScroll = Math.max(0, els.scorePanel.scrollHeight - els.scorePanel.clientHeight);
  els.scorePanel.scrollTop = maxScroll * ratio;

  const mappedClarinetStep = isWindScoreMode() ? state.scoreCursorSteps?.[state.activeIndex] : null;
  const cursorStep = Number.isFinite(mappedClarinetStep)
    ? mappedClarinetStep
    : isPianoTwoHandsMode()
      ? (pianoEventForNoteIndex(state.activeIndex)?.index ?? state.activeIndex)
      : state.activeIndex;
  if (state.osmd?.cursor && cursorStep >= 0 && cursorStep !== state.scoreCursorStep) {
    try {
      state.osmd.cursor.reset();
      for (let index = 0; index < cursorStep; index += 1) {
        state.osmd.cursor.next();
      }
      state.osmd.cursor.show();
      state.scoreCursorStep = cursorStep;
    } catch (error) {
      state.scoreCursorStep = cursorStep;
    }
  }

  if (els.scoreCursor) {
    els.scoreCursor.style.display = "block";
    els.scoreCursor.style.top = `${Math.max(12, Math.min(els.scorePanel.clientHeight - 12, els.scorePanel.clientHeight * 0.32))}px`;
  }
}

function loadMusicXmlText(xmlText, fileName = "piano_facil", options = {}) {
  state.midiData = null;
  state.fileName = fileName.replace(/\.[^.]+$/, "") || "piano_facil";
  const parsedXml = readMusicXmlNotes(xmlText, options.transposeSemitones);
  state.rawNotes = parsedXml.notes;
  state.chordEvents = parsedXml.chords;
  state.lyricEvents = parsedXml.lyrics || [];
  const fallbackKey = options.sourceKeyFifths ?? hymnKeyFromName(fileName) ?? parsedXml.keyFifths ?? 0;
  state.sourceKeyFifths = clampKeyFifths(fallbackKey);
  setDetectedBpm(parsedXml.tempo);
  finishLoadedFile("MusicXML");
  renderMusicXmlScore(isWindScoreMode() ? buildWindScoreXml() : xmlText);
  if (options.hymnView) enterHymnView();
}

function clarinetReferencePath(filePath) {
  const fileName = String(filePath || "").split("/").pop();
  return fileName ? `${CLARINET_REFERENCE_DIR}/${fileName}` : filePath;
}

async function loadPianoFacilFromSelect() {
  const item = PIANO_FACIL_HINOS.find(hino => hino.arquivo === els.pianoFacilSelect.value);
  if (!item) return;

  try {
    stop();
    applyInstrumentProfile(true);
    setLayout();
    setStatus(`Carregando hino ${item.numero}...`, "idle");

    const wind = isWindScoreMode();
    const clarinet = isClarinetMode();
    const recorder = isRecorderMode();
    const transverseFlute = isTransverseFluteMode();
    const loadPath = wind ? clarinetReferencePath(item.arquivo) : item.arquivo;
    let response = await fetch(loadPath, { cache: "no-store" });
    if (wind && !response.ok) {
      response = await fetch(item.arquivo, { cache: "no-store" });
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const fileLabel = wind ? `hino-${item.numero}_sib.musicxml` : `hino-${item.numero}_piano_facil.musicxml`;
    const clarinetWrittenKey = keyFromNameMap(fileLabel, CLARINET_WRITTEN_KEY_FIFTHS);
    loadMusicXmlText(await response.text(), fileLabel, {
      hymnView: true,
      transposeSemitones: clarinet
        ? CLARINET_REFERENCE_TRANSPOSE_SEMITONES
        : recorder
          ? RECORDER_REFERENCE_TRANSPOSE_SEMITONES
          : transverseFlute
            ? TRANSVERSE_FLUTE_REFERENCE_TRANSPOSE_SEMITONES
          : HYMN_TRANSPOSE_SEMITONES,
      sourceKeyFifths: wind && clarinetWrittenKey !== null
        ? clampKeyFifths(clarinetWrittenKey - CLARINET_KEY_FIFTHS_OFFSET)
        : undefined
    });
  } catch (error) {
    console.error(error);
    setStatus("Nao consegui carregar esse Piano Facil. Se abriu por arquivo local, use um servidor local ou carregue pelo seletor de arquivo.", "idle");
  }
}

function applyChordFingering(notes, hand) {
  const sorted = notes.slice().sort((a, b) => a.midi - b.midi);
  const suggested = hand === "left" ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];

  sorted.forEach((note, index) => {
    if (note.finger) return;
    const finger = suggested[Math.min(index, suggested.length - 1)];
    note.finger = finger;
    note.piano = pianoInfo(note.midi, hand, finger, note.displayName);
    note.tab = note.piano.fullLabel;
  });
}

function buildPianoEvents() {
  state.pianoEvents = [];
  if (!isPianoMode()) return;

  const tolerance = 0.018;
  state.playableNotes.forEach((note, noteIndex) => {
    const previous = state.pianoEvents[state.pianoEvents.length - 1];
    if (previous && Math.abs(previous.time - note.time) <= tolerance) {
      previous.notes.push(note);
      previous.noteIndexes.push(noteIndex);
      previous.endIndex = noteIndex;
    } else {
      state.pianoEvents.push({
        time: note.time,
        notes: [note],
        noteIndexes: [noteIndex],
        startIndex: noteIndex,
        endIndex: noteIndex
      });
    }
  });

  state.pianoEvents.forEach((event, eventIndex) => {
    event.index = eventIndex;
    event.leftNotes = event.notes.filter(note => note.piano?.hand === "left");
    event.rightNotes = event.notes.filter(note => note.piano?.hand !== "left");
    if (event.leftNotes.length > 1) applyChordFingering(event.leftNotes, "left");
    if (event.rightNotes.length > 1) applyChordFingering(event.rightNotes, "right");
    event.isChord = event.notes.length > 1;
    event.chordName = detectPianoChordName(event.notes);
    event.notes.forEach(note => {
      note.pianoEventIndex = eventIndex;
    });
  });

  state.sequence = state.playableNotes.map(note => note.tab);
}

function pianoEventForNoteIndex(noteIndex) {
  const note = state.playableNotes[noteIndex];
  return note?.pianoEventIndex !== undefined ? state.pianoEvents[note.pianoEventIndex] : null;
}

function pianoEventLabel(notes) {
  return notes.map(note => pianoShortLabel(note)).join("  ");
}

function pianoShortLabel(note) {
  if (!note?.piano) return "";
  return `${note.piano.noteName}${note.piano.octave} / ${note.piano.finger}`;
}

function detectPianoChordName(notes) {
  const pcs = [...new Set(notes.map(note => ((note.midi % 12) + 12) % 12))].sort((a, b) => a - b);
  if (pcs.length < 3) return "";

  const patterns = [
    { intervals: [0, 4, 7, 11], suffix: "maj7" },
    { intervals: [0, 4, 7, 10], suffix: "7" },
    { intervals: [0, 3, 7, 10], suffix: "m7" },
    { intervals: [0, 4, 7], suffix: "" },
    { intervals: [0, 3, 7], suffix: "m" },
    { intervals: [0, 3, 6], suffix: "dim" },
    { intervals: [0, 4, 8], suffix: "aug" }
  ];

  for (const root of pcs) {
    const normalized = pcs.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);
    const match = patterns.find(pattern =>
      pattern.intervals.length === normalized.length
      && pattern.intervals.every((interval, index) => interval === normalized[index])
    );
    if (match) return `${PIANO_NOTE_NAMES[root]}${match.suffix}`;
  }

  return "";
}

function buildCleanMelody() {
  const groups = [];
  const tolerance = 0.018;
  let skipped = 0;

  state.rawNotes.forEach(note => {
    const previous = groups[groups.length - 1];
    if (previous && Math.abs(previous.time - note.time) <= tolerance) {
      previous.notes.push(note);
    } else {
      groups.push({ time: note.time, notes: [note] });
    }
  });

  let previousPosition = null;
  let previousPianoMidi = null;
  let previousPianoFinger = null;
  state.playableNotes = [];
  state.pianoEvents = [];
  state.sequence = [];

  groups.forEach(group => {

    if (isClarinetMode()) {
      const chosen = group.notes.slice().sort((a, b) => b.midi - a.midi)[0];
      if (!chosen) return;
      const clarinetNote = {
        ...chosen,
        name: Tone.Frequency(chosen.midi, "midi").toNote(),
        displayName: noteNamePtFromMidi(chosen.midi)
      };
      const info = clarinetInfo(clarinetNote);
      const enriched = {
        ...clarinetNote,
        clarinet: info,
        tab: info.writtenName
      };
      state.playableNotes.push(enriched);
      state.sequence.push(enriched.tab);
      return;
    }

    if (isRecorderMode()) {
      const chosen = group.notes.slice().sort((a, b) => b.midi - a.midi)[0];
      if (!chosen) return;
      const recorderNote = {
        ...chosen,
        name: Tone.Frequency(chosen.midi, "midi").toNote(),
        displayName: noteNamePtFromMidi(chosen.midi)
      };
      const info = recorderInfo(recorderNote);
      const enriched = {
        ...recorderNote,
        recorder: info,
        tab: info.writtenName
      };
      state.playableNotes.push(enriched);
      state.sequence.push(enriched.tab);
      return;
    }

    if (isTransverseFluteMode()) {
      const chosen = group.notes.slice().sort((a, b) => b.midi - a.midi)[0];
      if (!chosen) return;
      const fluteNote = {
        ...chosen,
        name: Tone.Frequency(chosen.midi, "midi").toNote(),
        displayName: noteNamePtFromMidi(chosen.midi)
      };
      const info = transverseFluteInfo(fluteNote);
      const enriched = {
        ...fluteNote,
        transverseFlute: info,
        tab: info.writtenName
      };
      state.playableNotes.push(enriched);
      state.sequence.push(enriched.tab);
      return;
    }

    if (isPianoMode()) {
      const notesForPiano = isPianoTwoHandsMode()
        ? group.notes.slice().sort((a, b) => {
            if (a.hand !== b.hand) return a.hand === "left" ? -1 : 1;
            return a.midi - b.midi;
          })
        : [group.notes.slice().sort((a, b) => b.midi - a.midi)[0]];

      notesForPiano.forEach(chosen => {
        const handOverride = isPianoTwoHandsMode() ? chosen.hand : null;
        const finger = isPianoTwoHandsMode()
          ? chosen.finger
          : (chosen.finger || melodicPianoFinger(chosen.midi, previousPianoMidi, previousPianoFinger));
        const info = pianoInfo(chosen.midi, handOverride, finger, chosen.displayName);
        const enriched = {
          ...chosen,
          time: chosen.time,
          finger,
          piano: info,
          tab: info.fullLabel
        };

        state.playableNotes.push(enriched);
        state.sequence.push(enriched.tab);
        if (!isPianoTwoHandsMode()) {
          previousPianoMidi = chosen.midi;
          previousPianoFinger = finger;
        }
      });
      return;
    }

    const playable = group.notes
      .map(note => choosePlayableStringNote(note, previousPosition))
      .filter(item => item.position);

    if (!playable.length) {
      skipped += group.notes.length;
      return;
    }

    playable.sort((a, b) => b.note.midi - a.note.midi);
    const chosen = playable[0];
    previousPosition = chosen.position;

    const enriched = {
      ...chosen.note,
      position: chosen.position,
      stringMidi: CONFIG.tuning[chosen.position.stringIndex] + chosen.position.fret,
      tab: tabForPosition(chosen.position)
    };

    state.playableNotes.push(enriched);
    state.sequence.push(enriched.tab);
  });

  buildPianoEvents();
  state.skippedNotes = skipped;
}

function renderSequence() {
  els.sequence.innerHTML = "";
  els.sequence.classList.toggle("piano-events", isPianoTwoHandsMode());
  els.sequence.classList.toggle("clarinet-events", isClarinetMode());
  els.sequence.classList.toggle("recorder-events", isRecorderMode());
  els.sequence.classList.toggle("transverse-flute-events", isTransverseFluteMode());

  if (isPianoTwoHandsMode()) {
    state.pianoEvents.forEach((event, eventIndex) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `seq-btn piano-event-card${event.isChord ? " chord-event" : ""}`;
      item.id = `event-${eventIndex}`;
      item.innerHTML = `
        <span class="event-number">${eventIndex + 1}</span>
        ${event.chordName ? `<span class="event-chord">${event.chordName}</span>` : ""}
        ${event.rightNotes.length ? `<span class="event-hand right-hand"><b>MD</b>${pianoEventLabel(event.rightNotes)}</span>` : ""}
        ${event.leftNotes.length ? `<span class="event-hand left-hand"><b>ME</b>${pianoEventLabel(event.leftNotes)}</span>` : ""}
      `;
      item.title = event.isChord ? `Acorde com ${event.notes.length} notas` : "Nota";
      item.addEventListener("click", () => previewNote(event.startIndex));
      els.sequence.appendChild(item);
    });
    highlightSequence();
    return;
  }

  if (isClarinetMode()) {
    state.playableNotes.forEach((note, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "seq-btn clarinet-diagram-card";
      item.id = `seq-${index}`;
      item.title = `Nota ${index + 1}: ${note.clarinet?.writtenName || note.name || ""}`;
      item.innerHTML = `
        <strong>${note.clarinet?.writtenName || note.tab}</strong>
        <span class="clarinet-img-window">
          <img class="clarinet-note-img" src="${note.clarinet?.imageUrl || ""}" alt="${note.clarinet?.writtenName || note.tab}">
        </span>
      `;
      item.addEventListener("click", () => previewNote(index));
      els.sequence.appendChild(item);
    });
    highlightSequence();
    return;
  }

  if (isRecorderMode()) {
    state.playableNotes.forEach((note, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "seq-btn recorder-diagram-card";
      item.id = `seq-${index}`;
      item.title = `Nota ${index + 1}: ${note.recorder?.writtenName || note.name || ""}`;
      item.innerHTML = `
        <strong>${note.recorder?.writtenName || note.tab}</strong>
        <span class="recorder-img-window">
          ${recorderDiagramSvg(note.recorder)}
        </span>
      `;
      item.addEventListener("click", () => previewNote(index));
      els.sequence.appendChild(item);
    });
    highlightSequence();
    return;
  }

  if (isTransverseFluteMode()) {
    state.playableNotes.forEach((note, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "seq-btn transverse-flute-diagram-card";
      item.id = `seq-${index}`;
      item.title = `Nota ${index + 1}: ${note.transverseFlute?.writtenName || note.name || ""}`;
      item.innerHTML = `
        <strong>${note.transverseFlute?.writtenName || note.tab}</strong>
        <span class="transverse-flute-img-window">
          ${transverseFluteDiagramSvg(note.transverseFlute)}
        </span>
      `;
      item.addEventListener("click", () => previewNote(index));
      els.sequence.appendChild(item);
    });
    highlightSequence();
    return;
  }

  state.sequence.forEach((tab, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "seq-btn";
    if (state.playableNotes[index]?.piano?.hand) {
      item.classList.add(state.playableNotes[index].piano.hand === "left" ? "left-hand" : "right-hand");
    }
    item.id = `seq-${index}`;
    const note = state.playableNotes[index];
    item.textContent = isClarinetMode() && note?.clarinet
      ? note.clarinet.writtenName
      : isRecorderMode() && note?.recorder
      ? note.recorder.writtenName
      : isTransverseFluteMode() && note?.transverseFlute
      ? note.transverseFlute.writtenName
      : !isPianoMode() && note?.position
      ? markerForPosition(note.position)
      : note?.piano
        ? pianoShortLabel(note)
        : tab;
    item.title = `Nota ${index + 1}: ${state.playableNotes[index].name || ""}`;
    item.addEventListener("click", () => previewNote(index));
    els.sequence.appendChild(item);
  });
  highlightSequence();
}

function highlightSequence() {
  if (isPianoTwoHandsMode()) {
    const activeEventIndex = pianoEventForNoteIndex(state.activeIndex)?.index ?? -1;
    const nextEventIndex = pianoEventForNoteIndex(state.selectedIndex)?.index ?? -1;
    els.sequence.querySelectorAll(".piano-event-card").forEach((item, index) => {
      item.classList.toggle("active", index === activeEventIndex);
      item.classList.toggle("next", index === nextEventIndex && index !== activeEventIndex);
    });
    return;
  }

  els.sequence.querySelectorAll(".seq-btn").forEach((item, index) => {
    item.classList.toggle("active", index === state.activeIndex);
    item.classList.toggle("next", index === state.selectedIndex && index !== state.activeIndex);
  });
}

function isRepeatedActiveNote(note) {
  const previous = state.playableNotes[state.activeIndex - 1];
  if (!previous) return false;
  if (isPianoMode()) return previous.midi === note.midi;
  return previous.tab === note.tab;
}

function clearMarkers() {
  window.clearTimeout(state.noteTimer);
  state.noteTimer = null;

  if (state.noteMarker) state.noteMarker.remove();
  if (state.nextMarker) state.nextMarker.remove();
  els.fretboard.querySelectorAll(".piano-key.active,.piano-key.repeat-pulse,.falling-note,.upcoming-note").forEach(el => {
    el.classList.remove("active");
    el.classList.remove("repeat-pulse");
    if (el.classList.contains("falling-note")) el.remove();
    if (el.classList.contains("upcoming-note")) el.remove();
  });
  state.noteMarker = null;
  state.nextMarker = null;
  state.activePianoEventIndex = -1;
}

function showMarker(note, className = "note-marker") {
  const marker = document.createElement("div");
  marker.className = className;
  marker.style.left = `${boardXForPosition(note.position)}px`;
  marker.style.top = `${boardYForString(note.position.stringIndex)}px`;
  marker.textContent = markerForPosition(note.position);
  els.fretboard.appendChild(marker);
  return marker;
}

function showActiveNote(note) {
  updateStudyPanel(note);
  if (isClarinetMode()) {
    clearMarkers();
    updateClarinetPanel(note);
    return;
  }
  if (isRecorderMode()) {
    clearMarkers();
    return;
  }
  if (isTransverseFluteMode()) {
    clearMarkers();
    return;
  }
  if (isPianoMode()) {
    if (isPianoTwoHandsMode()) {
      const event = pianoEventForNoteIndex(state.activeIndex);
      if (event) showPianoEvent(event);
      return;
    }
    showPianoNote(note);
    return;
  }

  clearMarkers();
  state.noteMarker = showMarker(note, "note-marker");
  if (isRepeatedActiveNote(note)) state.noteMarker.classList.add("repeat-pulse");
  state.noteTimer = window.setTimeout(clearMarkers, Math.max(note.duration * 1000, 320));
}

function showPianoNote(note) {
  clearMarkers();
  state.activePianoEventIndex = -1;
  const key = els.fretboard.querySelector(`.piano-key[data-midi="${note.midi}"]`);
  if (key) {
    key.classList.add("active");
    if (isRepeatedActiveNote(note)) key.classList.add("repeat-pulse");
  }

  state.noteMarker = createPianoVisualNote(note, "falling-note", 8);

  showUpcomingPianoNotes();
  state.noteTimer = window.setTimeout(clearMarkers, Math.max(note.duration * 1000, 360));
}

function createPianoVisualNote(note, className, top) {
  const info = note.piano || pianoInfo(note.midi, note.hand, note.finger, note.displayName);
  const geom = pianoKeyGeometry(note.midi);
  if (!geom) return null;

  const marker = document.createElement("div");
  marker.className = `${className} ${info.hand === "left" ? "left-hand" : "right-hand"}`;
  const youtubeMinimum = className === "falling-note" ? 62 : 54;
  const instagramMinimum = className === "falling-note" ? 38 : 34;
  const minimumWidth = isYoutubeLayout() ? youtubeMinimum : instagramMinimum;
  const widthRatio = isYoutubeLayout() ? 0.92 : 0.74;
  const markerWidth = Math.max(minimumWidth, geom.width * widthRatio);
  const centeredLeft = geom.left + geom.width / 2 - markerWidth / 2;
  const clampedLeft = Math.max(2, Math.min(els.fretboard.clientWidth - markerWidth - 2, centeredLeft));
  marker.style.left = `${clampedLeft}px`;
  marker.style.width = `${markerWidth}px`;
  marker.style.top = `${top}px`;
  marker.style.opacity = "1";
  marker.innerHTML = `<small>${info.handLabel}</small><strong>${info.noteName}</strong><span>${info.finger}</span>`;
  els.fretboard.appendChild(marker);

  if (className === "falling-note") {
    const key = els.fretboard.querySelector(`.piano-key[data-midi="${note.midi}"]`);
    if (key) {
      const fallDistance = Math.max(0, key.offsetTop - top - marker.offsetHeight);
      const fallDuration = Math.max(0.72, Math.min(1.8, fallDistance / 138));
      marker.style.setProperty("--piano-fall-distance", `${fallDistance}px`);
      marker.style.setProperty("--piano-fall-duration", `${fallDuration}s`);
    }
  }

  return marker;
}

function showPianoEvent(event) {
  if (state.activePianoEventIndex === event.index) return;
  clearMarkers();
  state.activePianoEventIndex = event.index;

  const previousEvent = state.pianoEvents[event.index - 1];
  const previousMidis = new Set(previousEvent?.notes.map(note => note.midi) || []);

  event.notes.forEach(note => {
    const key = els.fretboard.querySelector(`.piano-key[data-midi="${note.midi}"]`);
    if (key) {
      key.classList.add("active");
      if (previousMidis.has(note.midi)) key.classList.add("repeat-pulse");
    }
    createPianoVisualNote(note, "falling-note", 8);
  });

  showUpcomingPianoEvent(event.index + 1);
  const longestDuration = Math.max(...event.notes.map(note => note.duration), 0.36);
  state.noteTimer = window.setTimeout(clearMarkers, Math.max(longestDuration * 1000, 360));
}

function showUpcomingPianoEvent(eventIndex) {
  const event = state.pianoEvents[eventIndex];
  if (!event) return;
  event.notes.forEach(note => createPianoVisualNote(note, "upcoming-note", 48));
}

function showUpcomingPianoNotes() {
  const startIndex = Math.max(0, state.activeIndex + 1);
  const upcoming = state.playableNotes.slice(startIndex, startIndex + 1);

  upcoming.forEach((note, offset) => {
    const info = note.piano || pianoInfo(note.midi, note.hand, note.finger, note.displayName);
    const geom = pianoKeyGeometry(note.midi);
    if (!geom) return;

    const preview = document.createElement("div");
    preview.className = `upcoming-note ${info.hand === "left" ? "left-hand" : "right-hand"}`;
    preview.style.left = `${geom.left + geom.width * 0.12}px`;
    preview.style.width = `${geom.width * 0.76}px`;
    preview.style.top = `${10 + offset * 38}px`;
    preview.style.opacity = String(0.92 - offset * 0.14);
    preview.innerHTML = `<small>${info.handLabel}</small><strong>${info.noteName}</strong><span>${info.finger}</span>`;
    els.fretboard.appendChild(preview);
  });
}

function updateProgress(note) {
  const duration = songDuration();
  const progress = duration ? Math.min(100, (note.time / duration) * 100) : 0;
  els.progressBar.style.width = `${progress}%`;
  updateScoreFollow(note);
}

function songDuration() {
  if (!isPianoMode() && state.rawNotes.length) {
    return state.rawNotes.reduce((max, note) => Math.max(max, note.time + note.duration), 0);
  }
  const last = state.playableNotes[state.playableNotes.length - 1];
  return last ? last.time + last.duration : 0;
}

function disposeInstrument() {
  if (state.instrument) {
    try {
      state.instrument.dispose();
    } catch (error) {
      console.warn("Falha ao liberar instrumento", error);
    }
  }
  state.instrument = null;
  state.instrumentKind = null;
  state.instrumentReady = Promise.resolve();
}

function userVolume() {
  const value = Number.parseFloat(els.volumeRange.value);
  return Number.isFinite(value) ? value : 0;
}

function nativeAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!state.nativeAudioCtx) state.nativeAudioCtx = new AudioContextCtor();
  if (state.nativeAudioCtx.state === "suspended") {
    state.nativeAudioCtx.resume().catch(() => {});
  }
  return state.nativeAudioCtx;
}

function nativeFrequencyFromMidi(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playChordPiano(chord, duration = 0.8, scheduledTime = undefined) {
  const ctx = nativeAudioContext();
  if (!ctx || !chord || state.chordVolume <= 0) return;

  const now = ctx.currentTime;
  const start = Number.isFinite(scheduledTime) ? Math.max(now, scheduledTime) : now;
  const safeDuration = Math.max(0.22, Math.min(duration || 0.8, 1.8));
  const stopAt = start + safeDuration;
  const volume = state.chordVolume / 100;
  const outGain = Math.min(0.18, volume * 0.16);
  const tones = [
    midiForPitchClass(chord.bassPc ?? chord.rootPc, 43, 55),
    ...chord.intervals.slice(0, 4).map(interval => midiForPitchClass((chord.rootPc + interval) % 12, 55, 72))
  ].filter((midi, index, array) => Number.isFinite(midi) && array.indexOf(midi) === index);

  tones.forEach((midi, index) => {
    const noteStart = start + index * 0.018;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(outGain * (index === 0 ? 0.72 : 1), noteStart + 0.012);
    gain.gain.setTargetAtTime(0.0001, noteStart + 0.12, 0.48);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(nativeFrequencyFromMidi(midi), noteStart);
    osc.connect(gain);
    osc.start(noteStart);
    osc.stop(stopAt + 0.08);
  });
}

function playNativeTone(note, scheduledTime = undefined) {
  const ctx = nativeAudioContext();
  if (!ctx || !note) return;

  const instrument = currentInstrument();
  const isPiano = isPianoMode();
  const now = ctx.currentTime;
  const start = Number.isFinite(scheduledTime) ? Math.max(now, scheduledTime) : now;
  const duration = Math.max(note.playDuration || note.duration || 0.25, 0.12);
  const stopAt = start + Math.min(duration, isPiano ? 1.25 : 0.95);
  const velocity = Math.max(0.08, Math.min(note.velocity || 0.75, 1));
  const volumeDb = userVolume();
  const volumeGain = Math.pow(10, volumeDb / 20);
  const mainGainValue = Math.min(0.32, velocity * 0.22 * volumeGain);

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, start);
  out.gain.exponentialRampToValueAtTime(mainGainValue, start + (isPiano ? 0.012 : 0.006));
  out.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  out.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = isPiano ? "triangle" : "sawtooth";
  osc.frequency.setValueAtTime(nativeFrequencyFromMidi(note.midi), start);
  osc.connect(out);
  osc.start(start);
  osc.stop(stopAt + 0.05);

  if (!isPiano) {
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = instrument === "ukulele" ? "triangle" : "square";
    body.frequency.setValueAtTime(nativeFrequencyFromMidi(note.midi) * 2, start);
    bodyGain.gain.setValueAtTime(mainGainValue * 0.18, start);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, stopAt * 0.82 + start * 0.18);
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(start);
    body.stop(stopAt + 0.03);
  }
}

function playStringTone(note) {
  const ctx = nativeAudioContext();
  if (!ctx || !note) return;

  const midi = Number.isFinite(note.stringMidi) ? note.stringMidi : note.midi;
  const instrument = currentInstrument();
  const now = ctx.currentTime;
  const isUkulele = instrument === "ukulele";
  const isViola = instrument === "viola";
  const duration = Math.max(note.playDuration || note.duration || 0.26, 0.12);
  const stopAt = now + Math.min(duration, isUkulele ? 0.72 : 1.05);
  const velocity = Math.max(0.08, Math.min(note.velocity || 0.7, 1));
  const volumeGain = Math.pow(10, userVolume() / 20);
  const gainValue = Math.min(0.34, velocity * volumeGain * (isUkulele ? 0.28 : 0.2));
  const frequency = nativeFrequencyFromMidi(midi);

  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(gainValue, now + 0.012);
  output.gain.setTargetAtTime(0.0001, now + (isUkulele ? 0.08 : 0.12), isUkulele ? 0.18 : 0.28);

  const toneFilter = ctx.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(isUkulele ? 5200 : isViola ? 3900 : 4300, now);
  toneFilter.Q.setValueAtTime(isUkulele ? 0.58 : 0.72, now);
  toneFilter.connect(output);
  output.connect(ctx.destination);

  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(frequency, now);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(gainValue * (isUkulele ? 0.95 : 0.86), now);
  bodyGain.gain.setTargetAtTime(0.0001, now + 0.05, isUkulele ? 0.22 : 0.34);
  body.connect(bodyGain);
  bodyGain.connect(toneFilter);
  body.start(now);
  body.stop(stopAt + 0.05);

  const air = ctx.createOscillator();
  air.type = "sine";
  air.frequency.setValueAtTime(frequency * (isUkulele ? 2 : 1.5), now);
  const airGain = ctx.createGain();
  airGain.gain.setValueAtTime(gainValue * (isUkulele ? 0.24 : 0.1), now);
  airGain.gain.setTargetAtTime(0.0001, now + 0.025, isUkulele ? 0.12 : 0.16);
  air.connect(airGain);
  airGain.connect(toneFilter);
  air.start(now);
  air.stop(stopAt + 0.03);

  const click = ctx.createOscillator();
  click.type = "triangle";
  click.frequency.setValueAtTime(frequency * (isUkulele ? 3 : 2.4), now);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(gainValue * (isUkulele ? 0.1 : 0.08), now);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
  click.connect(clickGain);
  clickGain.connect(toneFilter);
  click.start(now);
  click.stop(now + 0.05);
}

function createInstrument() {
  const kind = els.soundSelect.value;
  if (state.instrument && state.instrumentKind === kind) {
    updateVolume();
    return state.instrument;
  }

  disposeInstrument();
  state.instrumentKind = kind;

  if (kind === "acoustic" || kind === "nylon") {
    const sampleSet = REAL_GUITAR_SAMPLES[kind];
    setStatus(`Carregando ${sampleSet.label}...`, state.playableNotes.length ? "ready" : "idle");
    let resolveReady;
    state.instrumentReady = new Promise(resolve => {
      resolveReady = resolve;
    });
    state.instrument = new Tone.Sampler({
      urls: sampleSet.urls,
      baseUrl: sampleSet.baseUrl,
      release: sampleSet.release,
      onload: () => {
        setStatus(`${sampleSet.label} carregado.`, state.playableNotes.length ? "ready" : "idle");
        resolveReady();
      }
    }).toDestination();
    state.instrument.volume.value = userVolume() + sampleSet.volumeBase;
    return state.instrument;
  }

  if (kind === "pluck") {
    state.instrument = new Tone.PolySynth(Tone.PluckSynth, {
      attackNoise: 1,
      dampening: 4200,
      resonance: 0.82
    }).toDestination();
    state.instrument.volume.value = userVolume() + 1;
    state.instrumentReady = Promise.resolve();
    return state.instrument;
  }

  if (kind === "ukulele") {
    state.instrument = new Tone.PolySynth(Tone.PluckSynth, {
      attackNoise: 0.72,
      dampening: 5200,
      resonance: 0.62
    }).toDestination();
    state.instrument.volume.value = userVolume() - 1;
    state.instrumentReady = Promise.resolve();
    return state.instrument;
  }

  if (kind === "violaCaipira") {
    const sampleSet = REAL_GUITAR_SAMPLES.acoustic;
    setStatus("Carregando viola caipira real...", state.playableNotes.length ? "ready" : "idle");
    let resolveReady;
    state.instrumentReady = new Promise(resolve => {
      resolveReady = resolve;
    });
    state.instrument = new Tone.Sampler({
      urls: sampleSet.urls,
      baseUrl: sampleSet.baseUrl,
      release: 0.72,
      onload: () => {
        setStatus("Viola caipira real carregada.", state.playableNotes.length ? "ready" : "idle");
        resolveReady();
      }
    }).toDestination();
    state.instrument.volume.value = userVolume() - 7;
    return state.instrument;
  }

  if (kind === "clarinete") {
    state.instrument = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.035, decay: 0.18, sustain: 0.72, release: 0.28 }
    }).toDestination();
    state.instrument.volume.value = userVolume() - 1;
    state.instrumentReady = Promise.resolve();
    return state.instrument;
  }

  if (kind === "flautaDoce") {
    setStatus(`Carregando ${REAL_RECORDER_SAMPLE.label}...`, state.playableNotes.length ? "ready" : "idle");
    let resolveReady;
    state.instrumentReady = new Promise(resolve => {
      resolveReady = resolve;
    });
    state.instrument = new Tone.Sampler({
      urls: REAL_RECORDER_SAMPLE.urls,
      baseUrl: REAL_RECORDER_SAMPLE.baseUrl,
      release: REAL_RECORDER_SAMPLE.release,
      onload: () => {
        setStatus(`${REAL_RECORDER_SAMPLE.label} carregada.`, state.playableNotes.length ? "ready" : "idle");
        resolveReady();
      }
    }).toDestination();
    state.instrument.volume.value = userVolume() + REAL_RECORDER_SAMPLE.volumeBase;
    return state.instrument;
  }

  if (kind === "flautaTransversal") {
    state.instrument = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.018, decay: 0.07, sustain: 0.82, release: 0.22 }
    }).toDestination();
    state.instrumentKind = kind;
    updateVolume();
    return state.instrument;
  }

  if (kind === "piano") {
    setStatus(`Carregando ${REAL_PIANO_SAMPLE.label}...`, state.playableNotes.length ? "ready" : "idle");
    let resolveReady;
    state.instrumentReady = new Promise(resolve => {
      resolveReady = resolve;
    });
    state.instrument = new Tone.Sampler({
      urls: REAL_PIANO_SAMPLE.urls,
      baseUrl: REAL_PIANO_SAMPLE.baseUrl,
      release: REAL_PIANO_SAMPLE.release,
      onload: () => {
        setStatus(`${REAL_PIANO_SAMPLE.label} carregado.`, state.playableNotes.length ? "ready" : "idle");
        resolveReady();
      }
    }).toDestination();
    state.instrument.volume.value = userVolume() + REAL_PIANO_SAMPLE.volumeBase;
    return state.instrument;
  }

  state.instrument = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.006, decay: 0.16, sustain: 0.2, release: 0.45 }
  }).toDestination();
  state.instrument.volume.value = userVolume() - 2;
  state.instrumentReady = Promise.resolve();
  return state.instrument;
}

function createFallbackInstrument(kind) {
  disposeInstrument();
  state.instrumentKind = kind;

  if (kind === "piano") {
    state.instrument = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.004, decay: 0.28, sustain: 0.18, release: 0.9 }
    }).toDestination();
    state.instrument.volume.value = userVolume() - 5;
  } else if (kind === "flautaDoce" || kind === "flautaTransversal" || kind === "clarinete") {
    state.instrument = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: kind === "clarinete" ? "triangle8" : "sine" },
      envelope: { attack: 0.02, decay: 0.08, sustain: 0.76, release: 0.28 }
    }).toDestination();
    state.instrument.volume.value = userVolume() - (kind === "flautaDoce" ? 5 : 2);
  } else {
    const bright = kind === "violaCaipira" || kind === "acoustic";
    state.instrument = new Tone.PolySynth(Tone.PluckSynth, {
      attackNoise: bright ? 0.92 : 0.72,
      dampening: bright ? 4800 : 5200,
      resonance: bright ? 0.72 : 0.62
    }).toDestination();
    state.instrument.volume.value = userVolume() + (bright ? 0 : -1);
  }

  state.instrumentReady = Promise.resolve();
  setStatus("Som alternativo carregado. Pode tocar.", state.playableNotes.length ? "ready" : "idle");
  return state.instrument;
}

async function waitForInstrumentReady() {
  createInstrument();
  const kind = els.soundSelect.value;
  if (!(kind in REAL_GUITAR_SAMPLES) && kind !== "piano" && kind !== "violaCaipira" && kind !== "flautaDoce") return;

  try {
    await Promise.race([
      state.instrumentReady,
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 4500))
    ]);
  } catch (error) {
    console.warn("Sample demorou ou falhou.", error);
    createFallbackInstrument(kind);
  }
}

function playTone(note, time = undefined) {
  const instrument = currentInstrument();
  if (instrument === "ukulele") {
    playStringTone(note);
    return;
  }

  if (!state.instrument) createInstrument();
  const midi = !isPianoMode() && Number.isFinite(note.stringMidi) ? note.stringMidi : note.midi;
  const noteName = Tone.Frequency(midi, "midi").toNote();
  const octaveNoteName = Tone.Frequency(midi + 12, "midi").toNote();
  const duration = note.playDuration || note.duration;
  try {
    if (!isPianoMode() && typeof state.instrument.releaseAll === "function") {
      state.instrument.releaseAll();
    }
    state.instrument.triggerAttackRelease(noteName, Math.max(duration, 0.1), time, note.velocity);
    if (instrument === "viola") {
      state.instrument.triggerAttackRelease(octaveNoteName, Math.max(duration, 0.1), time, Math.min((note.velocity || 0.82) * 0.72, 0.72));
    }
  } catch (error) {
    console.warn("Falha no som selecionado; usando MIDI limpo.", error);
    els.soundSelect.value = "clean";
    createInstrument();
    state.instrument.triggerAttackRelease(noteName, Math.max(duration, 0.1), time, note.velocity);
    setStatus("Sample nÃ£o tocou. Voltei para MIDI limpo.", state.status);
  }
}

function silenceInstrument() {
  if (!state.instrument) return;
  try {
    if (typeof state.instrument.releaseAll === "function") {
      state.instrument.releaseAll();
    } else if (typeof state.instrument.triggerRelease === "function") {
      state.instrument.triggerRelease();
    }
  } catch (error) {
    console.warn("NÃ£o consegui silenciar o instrumento.", error);
  }
}

function clearPart() {
  if (state.part) {
    state.part.dispose();
    state.part = null;
  }
  if (state.guitarAudioPart) {
    state.guitarAudioPart.dispose();
    state.guitarAudioPart = null;
  }
  if (state.basePart) {
    state.basePart.dispose();
    state.basePart = null;
  }
  Tone.Transport.cancel();
  if (Tone.Draw && typeof Tone.Draw.cancel === "function") Tone.Draw.cancel(0);
}

function buildGuitarAudioEvents(startTime, speed) {
  const notes = state.rawNotes
    .filter(note => note.time >= startTime - 0.001)
    .sort((a, b) => a.time - b.time || a.midi - b.midi);
  const groupedNotes = [];

  notes.forEach(note => {
    const group = groupedNotes[groupedNotes.length - 1];
    if (group && Math.abs(group.time - note.time) <= 0.002) {
      if (!group.notes.some(item => item.midi === note.midi)) group.notes.push(note);
    } else {
      groupedNotes.push({ time: note.time, notes: [note] });
    }
  });

  const uniqueNotes = groupedNotes.flatMap(group =>
    group.notes
      .sort((a, b) => a.midi - b.midi)
      .slice(0, 6)
  );

  const nextSameMidiTime = new Map();
  const nextSameMidiTimes = new Array(uniqueNotes.length).fill(null);
  for (let index = uniqueNotes.length - 1; index >= 0; index -= 1) {
    const note = uniqueNotes[index];
    nextSameMidiTimes[index] = nextSameMidiTime.get(note.midi) ?? null;
    nextSameMidiTime.set(note.midi, note.time);
  }

  return uniqueNotes.map((note, index) => {
    let duration = Math.max(0.12, Math.min(note.duration / speed, 1.8));
    const nextTime = nextSameMidiTimes[index];
    if (nextTime !== null) {
      const repeatGap = Math.max(0.1, (nextTime - note.time) / speed);
      duration = Math.min(duration, repeatGap * 0.92);
    }

    return [
      (note.time - startTime) / speed,
      { ...note, playDuration: duration }
    ];
  });
}

function buildBaseArpeggio(startTime, speed) {
  return [];

  const duration = songDuration();
  const events = [];
  const chords = alignedChordEvents();
  if (!chords.length || state.chordVolume <= 0) return [];

  chords.forEach((chord, index) => {
    const nextChord = chords[index + 1];
    const chordStart = Math.max(chord.time, startTime);
    const chordEnd = Math.min(nextChord?.time ?? duration, duration);
    if (chordEnd <= startTime || chordStart >= duration) return;

    events.push([
      (chordStart - startTime) / speed,
      {
        chord,
        duration: Math.min(1.8, Math.max(0.35, (chordEnd - chordStart) / speed))
      }
    ]);
  });

  return events;
}

async function prepareTransport(startIndex = 0, playbackToken = state.playbackToken) {
  clearPart();
  await waitForInstrumentReady();
  if (playbackToken !== state.playbackToken) return false;

  state.activeIndex = startIndex - 1;
  state.selectedIndex = startIndex;

  const speed = playbackSpeed();
  Tone.Transport.bpm.value = state.currentBpm;

  const startTime = state.playableNotes[startIndex]?.time || 0;
  const transportNotes = state.playableNotes.slice(startIndex);
  const events = transportNotes.map((note, offset) => [
    (note.time - startTime) / speed,
    { ...note, playDuration: note.duration / speed, index: startIndex + offset, playbackToken }
  ]);

  state.part = new Tone.Part((time, note) => {
    if (note.playbackToken !== state.playbackToken) return;
    if (!note.visualOnly && !note.silentDuplicate) playTone(note, time);
    Tone.Draw.schedule(() => {
      if (note.playbackToken !== state.playbackToken) return;
      state.activeIndex = note.index;
      const pianoEvent = isPianoTwoHandsMode() ? pianoEventForNoteIndex(note.index) : null;
      state.selectedIndex = pianoEvent ? pianoEvent.endIndex + 1 : note.index + 1;
      showActiveNote(note);
      updateProgress(note);
      highlightSequence();
      const active = pianoEvent
        ? document.getElementById(`event-${pianoEvent.index}`)
        : document.getElementById(`seq-${note.index}`);
      if (active) {
        if (isWindScoreMode()) {
          const targetLeft = active.offsetLeft - 8;
          els.sequence.scrollLeft = Math.max(0, targetLeft);
        } else {
          const targetTop = active.offsetTop - (els.sequence.clientHeight - active.offsetHeight) / 2;
          els.sequence.scrollTop = Math.max(0, targetTop);
        }
      }
    }, time);
  }, events);

  state.part.start(0);

  const chordEvents = buildBaseArpeggio(startTime, speed);
  if (chordEvents.length) {
    state.basePart = new Tone.Part((time, event) => {
      if (playbackToken !== state.playbackToken) return;
      playChordPiano(event.chord, event.duration, time);
    }, chordEvents);
    state.basePart.start(0);
  }

  Tone.Transport.seconds = 0;
  return true;
}

async function play() {
  if(FREE_HYMN_TWO_MODE){startFreePreviewGuard();return;}
  if (!state.playableNotes.length) {
    setStatus("Abra um MIDI primeiro para tocar.", "idle");
    return;
  }

  if (!els.app.classList.contains("hymn-open")) {
    enterHymnView();
  }

  const playbackToken = state.status === "paused"
    ? state.playbackToken
    : ++state.playbackToken;

  els.app.classList.add("track-playing");
  await Tone.start();
  if (playbackToken !== state.playbackToken) return;

  if (state.status === "paused") {
    Tone.Transport.start();
    startFreePreviewGuard();
    setStatus(`Continuando em ${state.currentBpm} BPM.`, "playing");
    return;
  }

  Tone.Transport.stop();
  clearPart();
  clearMarkers();

  try {
    const prepared = await prepareTransport(0, playbackToken);
    if (!prepared) return;
  } catch (error) {
    els.app.classList.remove("track-playing");
    return;
  }
  if (playbackToken !== state.playbackToken) return;
  Tone.Transport.start();
  startFreePreviewGuard();
  setStatus(`Tocando ${state.playableNotes.length} notas em ${state.currentBpm} BPM.`, "playing");
}

function pause() {
  if (Tone.Transport.state !== "started" && state.status !== "playing") return;
  Tone.Transport.pause();
  silenceInstrument();
  clearMarkers();
  setStatus("Pausado. Aperte play para continuar.", "paused");
}

function stop() {
  clearInterval(freePreviewTimer);
  els.app.classList.remove("track-playing");
  state.playbackToken += 1;
  Tone.Transport.stop();
  clearPart();
  silenceInstrument();
  clearMarkers();
  state.activeIndex = -1;
  state.selectedIndex = 0;
  els.progressBar.style.width = "0%";
  highlightSequence();
  setStatus(state.playableNotes.length ? "Parado. Pronto para tocar novamente." : "Abra um arquivo MIDI para comeÃ§ar.", state.playableNotes.length ? "stopped" : "idle");
  updateStudyPanel(state.playableNotes[0] || null);
}

async function jumpToNote(index) {
  if (FREE_HYMN_TWO_MODE) {
    stop();
    try { window.parent.HinarioAccess?.showPaywall("premium", "O Toque Fácil está disponível para assinantes Premium e VIP."); } catch (error) {}
    return;
  }
  const note = state.playableNotes[index];
  if (!note) return;
  const pianoEvent = isPianoTwoHandsMode() ? pianoEventForNoteIndex(index) : null;
  const startIndex = pianoEvent ? pianoEvent.startIndex : index;

  const playbackToken = ++state.playbackToken;
  Tone.Transport.stop();
  clearPart();
  silenceInstrument();
  clearMarkers();

  try {
    const prepared = await prepareTransport(startIndex, playbackToken);
    if (!prepared) return;
  } catch (error) {
    return;
  }
  if (playbackToken !== state.playbackToken) return;

  state.activeIndex = startIndex;
  state.selectedIndex = pianoEvent ? pianoEvent.endIndex + 1 : startIndex + 1;
  showActiveNote(state.playableNotes[startIndex]);
  updateProgress(state.playableNotes[startIndex]);
  highlightSequence();
  Tone.Transport.start();
  setStatus(`Tocando a partir ${pianoEvent ? `do evento ${pianoEvent.index + 1}` : `da nota ${index + 1}`}.`, "playing");
}

async function previewNote(index) {
  const note = state.playableNotes[index];
  if (!note) return;

  if (isTransportPlaying()) {
    await jumpToNote(index);
    return;
  }

  state.activeIndex = index;
  const pianoEvent = isPianoTwoHandsMode() ? pianoEventForNoteIndex(index) : null;
  state.selectedIndex = pianoEvent ? pianoEvent.endIndex + 1 : index + 1;
  try {
    await waitForInstrumentReady();
  } catch (error) {
    return;
  }
  if (!note.visualOnly) playTone(note);
  showActiveNote(note);
  updateProgress(note);
  highlightSequence();
  setStatus(`PrÃ©via: ${note.name || "nota"} â€¢ ${note.tab}`, "ready");
}

function nextNote() {
  if (!state.playableNotes.length) return;
  const selectedEvent = isPianoTwoHandsMode() ? pianoEventForNoteIndex(state.selectedIndex) : null;
  const index = Math.min(selectedEvent ? selectedEvent.startIndex : state.selectedIndex, state.playableNotes.length - 1);
  if (isTransportPlaying()) {
    jumpToNote(index);
  } else {
    previewNote(index);
  }
}

async function loadMidi(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    state.fileName = file.name.replace(/\.[^.]+$/, "") || "musica_digitada";

    if (extension === "xml" || extension === "musicxml" || extension === "mxl") {
      const xmlText = extension === "mxl" ? await readMxlText(file) : await file.text();
      state.uploadedXmlText = xmlText;
      state.uploadedFileName = file.name;
      if (els.pianoFacilSelect) els.pianoFacilSelect.value = "";
      loadMusicXmlText(xmlText, file.name, { hymnView: false });
      setStatus("XML carregado. Escolha o instrumento e aperte Play.", "ready");
    } else {
      const buffer = await file.arrayBuffer();
      state.uploadedXmlText = "";
      state.uploadedFileName = "";
      if (els.pianoFacilSelect) els.pianoFacilSelect.value = "";
      state.midiData = new Midi(buffer);
      state.rawNotes = getAllMidiNotes();
      state.chordEvents = [];
      state.lyricEvents = [];
      setDetectedBpm(detectMidiBpm());
      finishLoadedFile("MIDI");
      enterHymnView();
    }
  } catch (error) {
    console.error(error);
    setStatus("NÃ£o consegui ler esse arquivo. Tente .mid, .midi, .xml, .musicxml ou .mxl.", "idle");
  }
}

function setLayout() {
  applyInstrumentProfile(false);
  const layout = currentLayout();
  const piano = isPianoMode();
  const clarinet = isClarinetMode();
  const recorder = isRecorderMode();
  const transverseFlute = isTransverseFluteMode();
  els.app.classList.toggle("layout-youtube", isYoutubeLayout());
  els.app.classList.toggle("layout-instagram", !isYoutubeLayout());
  els.app.classList.toggle("piano-mode", piano);
  els.app.classList.toggle("clarinet-mode", clarinet);
  els.app.classList.toggle("recorder-mode", recorder);
  els.app.classList.toggle("transverse-flute-mode", transverseFlute);
  els.app.classList.toggle("guitar-mode", !piano && !clarinet && !recorder && !transverseFlute);
  const profile = activeProfile();
  if (els.soundSelect.value !== profile.sound) {
    els.soundSelect.value = profile.sound;
    disposeInstrument();
  }
  document.querySelector("h1").textContent = "Toque Fácil";
  els.subtitle.textContent = profile.subtitle;
  if (state.rawNotes.length) {
    buildCleanMelody();
    renderSequence();
    updateStudyPanel(state.playableNotes[0] || null);
  }

  window.requestAnimationFrame(() => {
    setupFretboard();
    if (state.activeIndex >= 0) showActiveNote(state.playableNotes[state.activeIndex]);
  });
}

function setInstrument() {
  stop();
  applyInstrumentProfile(true);
  setLayout();
  setStatus(`Instrumento: ${activeProfile().subtitle}.`, state.playableNotes.length ? "ready" : "idle");
  if (!els.app.classList.contains("hymn-open") && state.uploadedXmlText) {
    loadMusicXmlText(state.uploadedXmlText, state.uploadedFileName || "arquivo.musicxml", { hymnView: true });
    return;
  }
  if (!els.app.classList.contains("hymn-open") && els.pianoFacilSelect?.value) {
    loadPianoFacilFromSelect();
  }
}

function toggleExtras() {
  const minimized = els.app.classList.toggle("extras-minimized");
  els.extrasToggle.textContent = minimized ? "â–¼" : "â–²";
  els.extrasToggle.title = minimized ? "Mostrar controles extras" : "Minimizar controles extras";
  updateMiniToggles();
  window.requestAnimationFrame(() => {
    setupFretboard();
    if (state.activeIndex >= 0) showActiveNote(state.playableNotes[state.activeIndex]);
  });
}

function updateMiniToggles() {
  els.miniLoopBtn.classList.toggle("active", els.loopToggle.checked);
  els.miniBaseBtn.classList.toggle("active", els.baseToggle.checked);
}

function toggleLoop() {
  els.loopToggle.checked = !els.loopToggle.checked;
  updateMiniToggles();
}

function toggleBase() {
  els.baseToggle.checked = !els.baseToggle.checked;
  updateMiniToggles();
}

function setupFloatingActionsDrag() {
  let startY = 0;
  let startTop = 258;
  let dragging = false;
  let moved = false;

  const currentTop = () => {
    const value = Number.parseFloat(getComputedStyle(els.app).getPropertyValue("--floating-actions-top"));
    return Number.isFinite(value) ? value : 206;
  };

  els.actions = document.querySelector(".actions");

  els.actions.addEventListener("pointerdown", event => {
    if (!els.app.classList.contains("extras-minimized")) return;
    if (event.target.closest("button, .mini-bpm-control, .chord-volume-control")) return;
    dragging = true;
    moved = false;
    startY = event.clientY;
    startTop = currentTop();
    els.actions.classList.add("dragging");
    els.actions.setPointerCapture(event.pointerId);
  });

  els.actions.addEventListener("pointermove", event => {
    if (!dragging) return;
    const delta = event.clientY - startY;
    if (Math.abs(delta) > 4) moved = true;
    const nextTop = Math.max(190, Math.min(354, startTop + delta));
    els.app.style.setProperty("--floating-actions-top", `${nextTop}px`);
  });

  els.actions.addEventListener("pointerup", event => {
    if (!dragging) return;
    dragging = false;
    els.actions.classList.remove("dragging");
    try {
      els.actions.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already be released by the browser.
    }
    window.setTimeout(() => {
      moved = false;
    }, 0);
  });

  els.actions.addEventListener("click", event => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

function updateVolume() {
  if (state.instrument?.volume) {
    const sampleSet = REAL_GUITAR_SAMPLES[els.soundSelect.value]
      || (els.soundSelect.value === "flautaDoce" ? REAL_RECORDER_SAMPLE : null);
    const bases = {
      pluck: 1,
      ukulele: -1,
      violaCaipira: -7,
      piano: REAL_PIANO_SAMPLE.volumeBase,
      flautaDoce: REAL_RECORDER_SAMPLE.volumeBase
    };
    const base = sampleSet ? sampleSet.volumeBase : (bases[els.soundSelect.value] ?? -2);
    state.instrument.volume.value = userVolume() + base;
  }
}

const PDF_IMAGE_CACHE = new Map();

function windPdfInstrumentTitle() {
  if (isClarinetMode()) return "Clarinete Si bemol";
  if (isRecorderMode()) return "Flauta doce soprano";
  if (isTransverseFluteMode()) return "Flauta transversal";
  return "Instrumento de sopro";
}

function windPdfFileSuffix() {
  if (isClarinetMode()) return "clarinete_diagrama_partitura";
  if (isRecorderMode()) return "flauta_doce_diagrama_partitura";
  if (isTransverseFluteMode()) return "flauta_transversal_diagrama_partitura";
  return "sopro_diagrama_partitura";
}

function windPdfNoteInfo(note) {
  if (isClarinetMode()) return note.clarinet || clarinetInfo(note);
  if (isRecorderMode()) return note.recorder || recorderInfo(note);
  if (isTransverseFluteMode()) return note.transverseFlute || transverseFluteInfo(note);
  return null;
}

function windPdfDurationKind(note) {
  const bpm = Math.max(30, state.detectedBpm || state.currentBpm || 80);
  const quarterSeconds = 60 / bpm;
  const q = Math.max(0.125, (note.duration || quarterSeconds) / quarterSeconds);
  if (q >= 3.5) return { type: "whole", dots: 0 };
  if (q >= 2.75) return { type: "half", dots: 1 };
  if (q >= 1.75) return { type: "half", dots: 0 };
  if (q >= 1.3) return { type: "quarter", dots: 1 };
  if (q >= 0.75) return { type: "quarter", dots: 0 };
  if (q >= 0.37) return { type: "eighth", dots: 0 };
  return { type: "16th", dots: 0 };
}

function windPdfDiatonicIndex(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const stepMap = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 6, 11: 6 };
  return octave * 7 + stepMap[pc];
}

function windPdfStaffY(midi, bottomLineY, lineGap) {
  const stepsAboveE4 = windPdfDiatonicIndex(midi) - windPdfDiatonicIndex(64);
  return bottomLineY - stepsAboveE4 * (lineGap / 2);
}

function drawWindPdfStaff(pdf, x0, x1, top, lineGap) {
  pdf.setDrawColor(20, 31, 49);
  pdf.setLineWidth(0.35);
  for (let i = 0; i < 5; i += 1) {
    const y = top + i * lineGap;
    pdf.line(x0, y, x1, y);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(20, 31, 49);
  pdf.text("G", x0 + 2, top + lineGap * 3.2);
}

function drawWindPdfNote(pdf, x, y, note, staffTop, lineGap) {
  const kind = windPdfDurationKind(note);
  const openHead = kind.type === "whole" || kind.type === "half";
  const hasStem = kind.type !== "whole";
  const flagCount = kind.type === "eighth" ? 1 : kind.type === "16th" ? 2 : 0;
  const noteW = 3.9;
  const noteH = 2.7;
  const color = [15, 23, 42];

  pdf.setDrawColor(...color);
  pdf.setFillColor(...color);
  pdf.setLineWidth(0.55);
  pdf.ellipse(x, y, noteW, noteH, openHead ? "S" : "F");

  const stemUp = y > staffTop + lineGap * 2;
  const stemX = stemUp ? x + noteW : x - noteW;
  const stemEndY = stemUp ? y - 20 : y + 20;
  if (hasStem) {
    pdf.line(stemX, y, stemX, stemEndY);
    for (let i = 0; i < flagCount; i += 1) {
      const fy = stemUp ? stemEndY + i * 4.2 : stemEndY - i * 4.2;
      if (stemUp) pdf.line(stemX, fy, stemX + 5.5, fy + 5);
      else pdf.line(stemX, fy, stemX - 5.5, fy - 5);
    }
  }

  for (let i = 0; i < kind.dots; i += 1) {
    pdf.circle(x + noteW + 3 + i * 3, y, 0.85, "F");
  }

  const bottomLine = staffTop + lineGap * 4;
  let ledgerY = bottomLine + lineGap;
  while (y > ledgerY - lineGap / 2) {
    pdf.line(x - 6, ledgerY, x + 6, ledgerY);
    ledgerY += lineGap;
  }
  ledgerY = staffTop - lineGap;
  while (y < ledgerY + lineGap / 2) {
    pdf.line(x - 6, ledgerY, x + 6, ledgerY);
    ledgerY -= lineGap;
  }
}

function drawRecorderPdfDiagram(pdf, info, x, y, w, h) {
  const holes = info?.holes || [];
  const cx = x + w / 2;
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(cx - w * 0.13, y + h * 0.1, w * 0.26, h * 0.82, 2, 2, "S");
  pdf.roundedRect(cx - w * 0.2, y, w * 0.4, h * 0.1, 1.6, 1.6, "S");
  const drawHole = (state, hx, hy, r) => {
    if (state === "closed") {
      pdf.setFillColor(15, 23, 42);
      pdf.circle(hx, hy, r, "F");
    } else if (state === "half") {
      pdf.setFillColor(15, 23, 42);
      pdf.circle(hx, hy, r, "S");
      pdf.rect(hx - r, hy - r, r, r * 2, "F");
    } else {
      pdf.setFillColor(255, 255, 255);
      pdf.circle(hx, hy, r, "S");
    }
  };
  drawHole(holes[0], x + w * 0.18, y + h * 0.2, 1.5);
  for (let i = 1; i < 8; i += 1) {
    drawHole(holes[i], cx, y + h * (0.18 + i * 0.09), i >= 6 ? 1.25 : 1.55);
  }
}

async function windPdfImageData(url) {
  if (PDF_IMAGE_CACHE.has(url)) return PDF_IMAGE_CACHE.get(url);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Imagem nao encontrada: ${url}`);
  const blob = await response.blob();
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 4;
      const alpha = pixels.data[i + 3];
      const value = pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2];
      if (alpha > 20 && value < 735) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const pad = 4;
  const hasContent = maxX >= minX && maxY >= minY;
  const sx = hasContent ? Math.max(0, minX - pad) : 0;
  const sy = hasContent ? Math.max(0, minY - pad) : 0;
  const sw = hasContent ? Math.min(canvas.width - sx, maxX - minX + pad * 2) : canvas.width;
  const sh = hasContent ? Math.min(canvas.height - sy, maxY - minY + pad * 2) : canvas.height;
  const crop = document.createElement("canvas");
  crop.width = Math.max(1, sw);
  crop.height = Math.max(1, sh);
  crop.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
  const data = { url: crop.toDataURL("image/png"), ratio: crop.width / crop.height };
  PDF_IMAGE_CACHE.set(url, data);
  return data;
}

async function drawWindPdfDiagram(pdf, note, info, x, y, maxW, maxH) {
  if (isRecorderMode()) {
    drawRecorderPdfDiagram(pdf, info, x - maxW / 2, y, maxW, maxH);
    return;
  }
  if (!info?.imageUrl) return;
  const data = await windPdfImageData(info.imageUrl);
  let w = maxW;
  let h = w / data.ratio;
  if (h > maxH) {
    h = maxH;
    w = h * data.ratio;
  }
  pdf.addImage(data.url, "PNG", x - w / 2, y, w, h);
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function svgToPdfImage(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const box = svg.viewBox?.baseVal;
  const width = box?.width || svg.getBoundingClientRect().width || Number(svg.getAttribute("width")) || 1200;
  const height = box?.height || svg.getBoundingClientRect().height || Number(svg.getAttribute("height")) || 1600;
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  const svgText = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const scale = Math.min(2, 1800 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { url: canvas.toDataURL("image/png"), ratio: canvas.width / canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function currentWindScoreImages() {
  if (!els.scoreCanvas?.querySelector("svg") && window.opensheetmusicdisplay?.OpenSheetMusicDisplay) {
    await renderMusicXmlScore(buildWindScoreXml());
    await wait(250);
  }
  const svgs = Array.from(els.scoreCanvas?.querySelectorAll("svg") || []);
  const images = [];
  for (const svg of svgs) {
    images.push(await svgToPdfImage(svg));
  }
  return images;
}

async function downloadWindPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const marginX = 10;
  const title = `${windPdfInstrumentTitle()} - diagrama com partitura`;
  const notes = state.playableNotes;
  const notesPerPage = isRecorderMode() ? 20 : 15;
  const scoreImages = await currentWindScoreImages();
  const diagramPageCount = Math.max(1, Math.ceil(notes.length / notesPerPage));
  const pageCount = Math.max(scoreImages.length || 1, diagramPageCount);

  const header = (pageIndex) => {
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(title, marginX, 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(35, 91, 128);
    pdf.text(`${state.fileName || "hino"} | BPM ${Math.round(state.currentBpm || state.detectedBpm || 80)}`, marginX, 18);
    pdf.setTextColor(71, 85, 105);
    pdf.text("Diagramas acima de cada nota. Tempos preservados pela duracao do MusicXML.", marginX, 23);
    pdf.text(`Pagina ${pageIndex + 1}/${pageCount}`, pageW - marginX, pageH - 7, { align: "right" });
  };

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage();
    header(pageIndex);

    const score = scoreImages[pageIndex];
    if (score) {
      let scoreW = pageW - marginX * 2;
      let scoreH = scoreW / score.ratio;
      if (scoreH > 84) {
        scoreH = 84;
        scoreW = scoreH * score.ratio;
      }
      pdf.addImage(score.url, "PNG", marginX + ((pageW - marginX * 2) - scoreW) / 2, 28, scoreW, scoreH);
    }

    const startY = score ? 118 : 32;
    const pageNotes = notes.slice(pageIndex * notesPerPage, (pageIndex + 1) * notesPerPage);
    const cols = isRecorderMode() ? 10 : 5;
    const colW = (pageW - marginX * 2) / cols;
    const rowH = isRecorderMode() ? 37 : 28;
    for (let i = 0; i < pageNotes.length; i += 1) {
      const note = pageNotes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = marginX + colW * col + colW / 2;
      const y = startY + row * rowH;
      const info = windPdfNoteInfo(note);
      await drawWindPdfDiagram(pdf, note, info, x, y, isRecorderMode() ? 13 : 34, isRecorderMode() ? 27 : 13);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(12, 92, 132);
      pdf.text(info?.writtenName || note.tab || note.name || "", x, y + rowH - 3, { align: "center" });
    }
  }

  saveGeneratedPdf(pdf, `${state.fileName || "hino"}_${windPdfFileSuffix()}.pdf`);
}

async function exclusiveLogoData() {
  try {
    const response = await fetch("../logo-hinario-codex.png");
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Logo indisponivel para o PDF", error);
    return "";
  }
}

async function downloadPdf() {
  if (!state.sequence.length) {
    setStatus("Abra um MIDI primeiro para gerar o PDF.", "idle");
    return;
  }

  if (isWindScoreMode()) {
    await downloadWindPdf();
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoData = await exclusiveLogoData();
  const requestedForExport = new URLSearchParams(window.location.search).get("instrument");
  const instrument = ["violao", "ukulele", "viola", "piano1"].includes(requestedForExport)
    ? requestedForExport
    : currentInstrument();
  const piano = instrument === "piano1";
  const twoHands = isPianoTwoHandsMode();
  const titleByInstrument = {violao:"Digitação para Violão",ukulele:"Digitação para Ukulele",viola:"Digitação para Viola Caipira",piano1:"Digitação para Piano - 1 Mão"};
  const suffixByInstrument = {violao:"digitacao_violao",ukulele:"digitacao_ukulele",viola:"digitacao_viola_caipira",piano1:"digitacao_piano_1_mao"};
  const title = titleByInstrument[instrument] || "Digitação musical";
  const fileSuffix = suffixByInstrument[instrument] || "digitacao";
  const instructions = piano
    ? (twoHands
      ? [
          "ME indica mÃ£o esquerda e MD indica mÃ£o direita.",
          "Cada indicaÃ§Ã£o mostra o nome da nota e o dedo sugerido.",
          "Dedos: 1 polegar, 2 indicador, 3 mÃ©dio, 4 anelar e 5 mÃ­nimo.",
          "Pratique cada mÃ£o separadamente e depois toque as duas juntas lentamente."
        ]
      : [
          "Cada indicaÃ§Ã£o mostra o nome da nota e o dedo sugerido.",
          "Dedos: 1 polegar, 2 indicador, 3 mÃ©dio, 4 anelar e 5 mÃ­nimo.",
          "Toque da esquerda para a direita, mantendo a mÃ£o relaxada.",
          "Pratique lentamente antes de aumentar a velocidade."
        ])
    : instrument === "ukulele" ? [
        "Leia cada indicação no formato corda-casa.",
        "Cordas: 4-Sol, 3-Dó, 2-Mi e 1-Lá.",
        "Exemplo: 2-3 significa segunda corda pressionada na casa 3.",
        "Pratique lentamente, mantendo os dedos próximos às casas."
      ] : instrument === "viola" ? [
        "Leia cada indicação no formato ordem-casa.",
        "A viola usa cinco ordens de cordas pareadas, em cebolão em Mi.",
        "Pressione juntas as duas cordas da ordem indicada.",
        "Pratique devagar antes de aumentar o andamento."
      ] : [
        "Leia cada indicação no formato corda-casa.",
        "Exemplos: 6-0 é a sexta corda solta; 3-2 é a terceira corda na casa 2.",
        "Mantenha os dedos próximos ao braço e toque da esquerda para a direita.",
        "Pratique lentamente antes de aumentar o andamento."
      ];
  const guideLines = piano ? [
    "Este método mostra a nota e o dedo sugerido para tocar a melodia com uma mão.",
    "1 = polegar; 2 = indicador; 3 = médio; 4 = anelar; 5 = mínimo.",
    "Exemplo: Dó4 / dedo 1 significa tocar a tecla Dó da quarta oitava com o polegar.",
    "Mantenha a mão relaxada e os dedos próximos às teclas.",
    "Pratique lentamente e aumente o BPM somente depois de tocar com segurança."
  ] : instrument === "ukulele" ? [
    "Este método usa uma numeração simples para indicar a corda e a casa.",
    "O primeiro número indica a corda: 1=Lá, 2=Mi, 3=Dó e 4=Sol.",
    "O segundo número indica a casa; zero significa corda solta.",
    "Exemplos: 1-2 = primeira corda, segunda casa; 3-0 = terceira corda solta.",
    "Em casas com dois algarismos, como 2-12, o número 12 representa a casa completa."
  ] : instrument === "viola" ? [
    "Este método usa uma numeração simples para indicar a ordem e a casa da viola.",
    "O primeiro número indica uma das cinco ordens de cordas pareadas.",
    "O segundo número indica a casa; zero significa a ordem tocada solta.",
    "Exemplos: 1-2 = primeira ordem, segunda casa; 3-0 = terceira ordem solta.",
    "Pressione juntas as duas cordas da ordem indicada. Afinação usada: cebolão em Mi."
  ] : [
    "Este método utiliza uma numeração simples para indicar a corda e a casa onde a nota deve ser tocada.",
    "O primeiro número indica a corda: 1 = mizinha (mais fina), seguindo até 6 = mizão (mais grossa).",
    "O segundo número indica a casa onde a corda deve ser pressionada; zero significa corda solta.",
    "Exemplos: 1-2 = primeira corda, segunda casa; 3-5 = terceira corda, quinta casa; 6-0 = sexta corda solta.",
    "Quando aparecer 1-10, 2-11 ou 3-12, o número após o traço representa a casa completa."
  ];
  const firstNoteY = 54;
  const rowsPerPage = 14;
  const notesPerPage = rowsPerPage * 5;

  function pageHeader(showGuide = false) {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 297, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    if (logoData) pdf.addImage(logoData, "PNG", 10, 7, showGuide ? 42 : 28, showGuide ? 42 : 28);
    pdf.setFontSize(19);
    pdf.text(title, 126, 17, { align: "center" });
    pdf.setFontSize(11);
    pdf.setTextColor(187, 247, 208);
    pdf.text(state.fileName, 126, 26, { align: "center" });
    pdf.setTextColor(250, 204, 21);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text("MATERIAL EXCLUSIVO - HINÁRIO TOCADO", 126, 34, { align: "center" });

    if (showGuide) {
      pdf.setFillColor(30, 41, 59);
      pdf.roundedRect(16, 54, 178, 210, 4, 4, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Como ler a numeração", 22, 68);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(226, 232, 240);
      pdf.setFontSize(11);
      let guideY = 84;
      guideLines.forEach((line, index) => {
        if (index === 3) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(250, 204, 21);
          pdf.text("Exemplos e observações", 22, guideY);
          guideY += 9;
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(226, 232, 240);
        }
        const wrapped = pdf.splitTextToSize(line, 164);
        pdf.text(wrapped, 22, guideY);
        guideY += wrapped.length * 6 + 8;
      });
    }
  }

  pageHeader(true);
  pdf.addPage();
  pageHeader(false);

  if (piano && twoHands) {
    const eventsPerPage = 20;
    state.pianoEvents.forEach((event, index) => {
      const pageIndex = index % eventsPerPage;
      const col = pageIndex % 2;
      const row = Math.floor(pageIndex / 2);
      const x = 18 + col * 88;
      const y = 54 + row * 20;

      if (index > 0 && index % eventsPerPage === 0) {
        pdf.addPage();
        pageHeader(false);
      }

      pdf.setFillColor(30, 41, 59);
      pdf.roundedRect(x, y, 84, 16, 2.5, 2.5, "F");
      pdf.setTextColor(148, 163, 184);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.text(String(index + 1), x + 3, y + 3.5);
      if (event.chordName) {
        pdf.setTextColor(253, 230, 138);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(event.chordName, x + 72, y + 3.5, { align: "right" });
      }

      if (event.rightNotes.length) {
        pdf.setTextColor(134, 239, 172);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(`MD  ${pianoEventLabel(event.rightNotes)}`, x + 8, y + 6.2);
      }
      if (event.leftNotes.length) {
        pdf.setTextColor(147, 197, 253);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(`ME  ${pianoEventLabel(event.leftNotes)}`, x + 8, y + 12.3);
      }
    });

    saveGeneratedPdf(pdf, `${state.fileName}_${fileSuffix}.pdf`);
    return;
  }

  state.sequence.forEach((tab, index) => {
    const pageIndex = index % notesPerPage;
    const col = pageIndex % 5;
    const row = Math.floor(pageIndex / 5);
    const x = 20 + col * 36;
    const y = firstNoteY + row * 17;
    const note = state.playableNotes[index];
    const displayTab = !piano && note?.position
      ? markerForPosition(note.position)
      : (piano && twoHands && note?.piano?.hand
        ? `${note.piano.hand === "left" ? "ME" : "MD"} ${tab}`
        : tab);

    if (index > 0 && index % notesPerPage === 0) {
      pdf.addPage();
      pageHeader(false);
    }

    if (piano && twoHands && note?.piano?.hand === "left") {
      pdf.setFillColor(59, 130, 246);
    } else {
      pdf.setFillColor(34, 197, 94);
    }
    pdf.roundedRect(x, y, 31, 13, 3, 3, "F");
    if (piano && twoHands && note?.piano?.hand === "left") {
      pdf.setTextColor(239, 246, 255);
    } else {
      pdf.setTextColor(5, 46, 22);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(String(index + 1), x + 2.5, y + 3.2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(displayTab.length > 11 ? 9 : 11);
    pdf.text(displayTab, x + 15.5, y + 8.8, { align: "center" });
  });

  saveGeneratedPdf(pdf, `${state.fileName}_${fileSuffix}.pdf`);
}

function handleTransportEnd() {
  if (!isTransportPlaying()) return;
  if (els.loopToggle.checked) {
      const playbackToken = ++state.playbackToken;
      prepareTransport(0, playbackToken).then(prepared => {
        if (!prepared || playbackToken !== state.playbackToken) return;
        Tone.Transport.start();
      }).catch(() => {});
    } else {
    els.app.classList.remove("track-playing");
    state.playbackToken += 1;
    Tone.Transport.stop();
    clearPart();
    silenceInstrument();
    clearMarkers();
    state.activeIndex = -1;
    state.selectedIndex = 0;
    els.progressBar.style.width = "0%";
    highlightSequence();
    setStatus("MÃºsica finalizada. Aperte play para tocar de novo.", "ready");
  }
}

function populatePianoFacilSelect() {
  if (!els.pianoFacilSelect) return;
  PIANO_FACIL_HINOS.filter(hino => hino.numero !== 1).forEach(hino => {
    const option = document.createElement("option");
    option.value = hino.arquivo;
    option.textContent = `${hino.numero}. ${hino.titulo}`;
    els.pianoFacilSelect.appendChild(option);
  });
}

function openHymnMenu() {
  els.hymnMenuDrawer?.classList.add("open");
  els.hymnMenuBackdrop?.classList.add("open");
  els.hymnMenuDrawer?.setAttribute("aria-hidden", "false");
  setTimeout(() => els.hymnMenuSearch?.focus(), 120);
}

function closeHymnMenu() {
  els.hymnMenuDrawer?.classList.remove("open");
  els.hymnMenuBackdrop?.classList.remove("open");
  els.hymnMenuDrawer?.setAttribute("aria-hidden", "true");
}

function buildHymnMenu() {
  if (!els.hymnMenuList) return;
  els.hymnMenuList.innerHTML = "";
  PIANO_FACIL_HINOS.filter(hino => hino.numero !== 1).forEach(hino => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hymn-menu-item";
    button.dataset.search = `${hino.numero} ${hino.titulo}`.toLowerCase();
    button.innerHTML = `<b>${String(hino.numero).padStart(3,"0")}</b><span>${hino.titulo}</span>`;
    button.addEventListener("click", () => {
      els.pianoFacilSelect.value = hino.arquivo;
      els.pianoFacilSelect.dispatchEvent(new Event("change", {bubbles:true}));
      closeHymnMenu();
    });
    els.hymnMenuList.appendChild(button);
  });
}

function filterHymnMenu(value) {
  const query = String(value || "").trim().toLowerCase();
  els.hymnMenuList?.querySelectorAll(".hymn-menu-item").forEach(button => {
    button.classList.toggle("hidden", !!query && !button.dataset.search.includes(query));
  });
}

function bindEvents() {
  els.midiFile.addEventListener("change", loadMidi);
  els.pianoFacilSelect.addEventListener("change", loadPianoFacilFromSelect);
  els.hymnMenuBtn?.addEventListener("click", openHymnMenu);
  els.hymnMenuClose?.addEventListener("click", closeHymnMenu);
  els.hymnMenuBackdrop?.addEventListener("click", closeHymnMenu);
  els.hymnMenuSearch?.addEventListener("input", event => filterHymnMenu(event.target.value));
  els.instrumentSelect.addEventListener("change", setInstrument);
  els.layoutSelect.addEventListener("change", setLayout);
  els.soundSelect.addEventListener("change", async () => {
    try {
      await waitForInstrumentReady();
      if (!(els.soundSelect.value in REAL_GUITAR_SAMPLES) && els.soundSelect.value !== "flautaDoce") {
        setStatus("Som alterado.", state.playableNotes.length ? "ready" : "idle");
      }
    } catch (error) {
      // Status already explains the loading problem.
    }
  });
  els.bpmDownBtn.addEventListener("click", () => changeBpm(-5));
  els.bpmUpBtn.addEventListener("click", () => changeBpm(5));
  els.miniBpmDownBtn.addEventListener("click", () => changeBpm(-5));
  els.miniBpmUpBtn.addEventListener("click", () => changeBpm(5));
  els.entryBpmDownBtn?.addEventListener("click", () => changeBpm(-5));
  els.entryBpmUpBtn?.addEventListener("click", () => changeBpm(5));
  els.chordVolDownBtn.addEventListener("click", () => changeChordVolume(-5));
  els.chordVolUpBtn.addEventListener("click", () => changeChordVolume(5));
  els.volumeRange.addEventListener("input", updateVolume);
  els.playBtn.addEventListener("click", play);
  els.pauseBtn.addEventListener("click", pause);
  els.stopBtn.addEventListener("click", stop);
  els.homeBtn.addEventListener("click", () => {
    // O primeiro Voltar dentro de uma partitura retorna à página inicial do
    // instrumento escolhido. Só o próximo Voltar sai para a seleção geral do
    // Toque Fácil. Assim este módulo nunca cai no Abrir Hinário.
    if (els.app.classList.contains("hymn-open")) {
      goHome();
      return;
    }
    try {
      if (window.parent && typeof window.parent.fecharModuloDigitacaoFacil === "function") {
        stop();
        window.parent.fecharModuloDigitacaoFacil();
        window.parent.abrirInstrumentosFaceis?.();
        return;
      }
    } catch (error) {}
    goHome();
  });
  els.nextBtn.addEventListener("click", nextNote);
  els.pdfBtn.addEventListener("click", downloadPdf);
  els.extrasToggle.addEventListener("click", toggleExtras);
  els.miniLoopBtn.addEventListener("click", toggleLoop);
  els.miniBaseBtn.addEventListener("click", toggleBase);
  els.loopToggle.addEventListener("change", updateMiniToggles);
  els.baseToggle.addEventListener("change", updateMiniToggles);
  Tone.Transport.on("stop", () => {});
  window.setInterval(() => {
    const speed = playbackSpeed();
    if (Tone.Transport.state === "started" && songDuration() > 0 && Tone.Transport.seconds >= songDuration() / speed) {
      handleTransportEnd();
    }
  }, 300);

  window.addEventListener("resize", () => {
    setupFretboard();
    if (state.activeIndex >= 0) showActiveNote(state.playableNotes[state.activeIndex]);
  });

  setupFloatingActionsDrag();
  updateMiniToggles();
  updateBpmDisplay();
  updateChordVolumeDisplay();
}

function saveGeneratedPdf(pdf, fileName) {
  try {
    const dataUri = pdf.output("datauristring");
    const base64 = dataUri.substring(dataUri.indexOf(",") + 1);
    const bridge = window.AndroidHymnal || window.parent?.AndroidHymnal;
    if (bridge && typeof bridge.savePdf === "function") {
      const saved = bridge.savePdf(base64, fileName);
      if (saved === false) throw new Error("Android recusou o salvamento do PDF");
      setStatus(`PDF salvo em Downloads: ${fileName}`, "ready");
      if (els.pdfSavedNotice) {
        els.pdfSavedNotice.textContent = `✓ PDF SALVO EM DOWNLOADS\n${fileName}`;
        els.pdfSavedNotice.classList.add("show");
        setTimeout(() => els.pdfSavedNotice?.classList.remove("show"), 4200);
      }
      return;
    }
  } catch (error) {
    console.warn("Falha ao enviar PDF ao Android", error);
  }
  pdf.save(fileName);
}

populatePianoFacilSelect();
buildHymnMenu();
const requestedInstrument = new URLSearchParams(window.location.search).get("instrument");
els.instrumentSelect.value = ["violao", "ukulele", "viola", "piano1", "flautaDoce"].includes(requestedInstrument)
  ? requestedInstrument
  : "violao";
applyInstrumentProfile(true);
bindEvents();
setLayout();
document.querySelector("h1").textContent = "Toque Fácil";
setStatus("Escolha um hino ou abra um MusicXML.", "idle");
