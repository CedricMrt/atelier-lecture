// Synthèse vocale du système (Web Speech API de la WebView Android).
// Si elle se révèle peu fiable sur certains appareils, on la remplacera par le
// module natif Capacitor « text-to-speech » sans changer les appelants.

const LANG = "fr-FR";

function isSupported(): boolean {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSupported()) return Promise.resolve([]);

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();

  if (voices.length > 0) return Promise.resolve(voices);

  // Sur Android, la liste des voix arrive parfois après le démarrage.
  return new Promise((resolve) => {
    const finish = () => {
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };

    synth.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, 1500);
  });
}

function pickFrenchVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return (
    voices.find((v) => v.lang.toLowerCase() === "fr-fr" && v.localService) ??
    voices.find((v) => v.lang.toLowerCase() === "fr-fr") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("fr"))
  );
}

export async function hasFrenchVoice(): Promise<boolean> {
  return pickFrenchVoice(await loadVoices()) !== undefined;
}

let generation = 0;

export function cancelSpeech() {
  generation += 1;

  if (isSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Dit un texte à voix haute. La promesse se termine à la fin de la phrase,
 * ou après un délai de sécurité (certains appareils n'envoient jamais « fin »).
 * Un nouvel appel, ou cancelSpeech(), interrompt la parole précédente.
 */
export async function speak(text: string, rate = 0.85): Promise<void> {
  if (!isSupported()) return;

  const myGeneration = ++generation;
  const synth = window.speechSynthesis;

  synth.cancel();

  const voice = pickFrenchVoice(await loadVoices());

  if (myGeneration !== generation) return;

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = LANG;
    utterance.rate = rate;

    if (voice) utterance.voice = voice;

    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(safety);
      resolve();
    };

    const safety = window.setTimeout(finish, 1500 + text.length * 220);

    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      synth.speak(utterance);
    } catch {
      finish();
    }
  });
}
