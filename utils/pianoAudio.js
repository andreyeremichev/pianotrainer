// Chromatic order for semitone math
const NOTES = [
  'A', 'A#', 'B', 'C', 'C#', 'D',
  'D#', 'E', 'F', 'F#', 'G', 'G#'
];

// Flats to sharps
const ENHARMONIC_EQUIVALENTS = {
  'Bb': 'A#',
  'Cb': 'B',
  'Db': 'C#',
  'Eb': 'D#',
  'Fb': 'E',
  'Gb': 'F#',
  'Ab': 'G#'
};

// Normalize flats to sharps
export function normalizeNoteName(note) {
  return ENHARMONIC_EQUIVALENTS[note] || note;
}

// Preload all notes A0–C8
export const audioCache = {};

export function preloadNotes() {
  for (let octave = 0; octave <= 8; octave++) {
    for (const note of NOTES) {
      // Skip notes outside real piano range
      if ((octave === 0 && note < 'A') || (octave === 8 && note > 'C')) continue;

      const noteName = `${note}${octave}`;
      audioCache[noteName] = new Audio(`/audio/notes/${noteName}.wav`);
    }
  }
}

// Play single note
export function playNote(noteName) {
  const normalized = normalizeNoteName(noteName);
  const audio = audioCache[normalized];
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  } else {
    console.error(`Note ${noteName} not found`);
  }
}

// Play multiple notes (chord/interval)
export function playChord(notesArray) {
  notesArray.forEach(note => playNote(note));
}