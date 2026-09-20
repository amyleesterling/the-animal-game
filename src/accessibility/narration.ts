let volume = 0.8;
export function stopNarration(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
export function setNarrationVolume(value: number): void {
  volume = value;
}
export function narrate(text: string): boolean {
  if (!("speechSynthesis" in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  // Local device voices avoid sending children's gameplay text to a remote service.
  const voice = voices.find((v) => v.localService && v.lang.startsWith("en"));
  if (!voice) return false;
  stopNarration();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.88;
  utterance.volume = volume;
  window.speechSynthesis.speak(utterance);
  return true;
}
