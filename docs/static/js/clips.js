// Demo content. Edit this file only; the player builds itself from it.
//
// TRACKS: the systems that can appear on a clip. Buttons are shown in this order.
// Only tracks a clip provides a file for get a button on that clip.
//   id        key used in each clip's `audio` map
//   label     button text
//   ours      highlight this button
//   note      optional one-line note shown under the buttons when the track is active
//
// CLIPS[set]: one array per carousel (matches data-set="..." in index.html).
//   video     path to the video. Its own audio is only heard through the "video" track below.
//   poster    optional still frame shown before playback
//   title     short name shown above the player
//   blurb     optional one-line description shown under the title
//   caption   optional text under the player
//   sentences optional transcript: [{ text, start, end }] in seconds; click a line to jump to it
//   metrics   optional { trackId: { f0_corr, en_corr, d_span, d_med } } similarity to the original broadcast
//   plot      optional per-sentence F0 contour image
//   audio     { trackId: "path/to/file.wav" }, or "video" to use the video's own soundtrack
//   default   optional track id selected when the clip is first shown

window.TRACKS = [
  { id: "original", label: "Original broadcast", note: "Real commentator, as aired." },
  { id: "ours",     label: "ProsodyMLM (ours)",  ours: true, note: "Prosody from video + environmental sound." },
  { id: "prosodylm", label: "ProsodyLM", note: "Text-only prosody; no video or audio context." },
  { id: "qwen3tts",  label: "Qwen3-TTS", note: "TTS from the ground-truth transcript with a commentary prompt." },
];

window.CLIPS = {
  samples: [
    {
      title: "World Cup 2006: free kick to goal",
      blurb: "A calm set-piece description builds to the goal call as the stadium erupts.",
      video: "static/videos/sample_01.mp4",
      poster: "static/images/sample_01_poster.jpg",
      default: "ours",
      audio: {
        original: "video",
        ours: "static/audio/sample_01/ours.m4a",
        prosodylm: "static/audio/sample_01/prosodylm.m4a",
        qwen3tts: "static/audio/sample_01/qwen3tts.m4a"
      },
      sentences: [
        { text: "And he will take a free kick here for the French", start: 0.4, end: 2.5 },
        { text: "And the tall man Vieira is up there", start: 2.5, end: 5.0 },
        { text: "So is Chiram", start: 5.0, end: 6.0 },
        { text: "So will be Gallas", start: 6.0, end: 7.1 },
        { text: "Danger now", start: 7.1, end: 7.9 },
        { text: "Here is a big big chap", start: 7.9, end: 9.7 },
        { text: "France have the lead", start: 9.7, end: 12.2 },
        { text: "Thierry Henri has stooped for the glory", start: 12.2, end: 18.0 },
        { text: "France won", start: 18.0, end: 20.8 }
      ],
      metrics: {
        ours: { f0_corr: 0.632, en_corr: 0.914, d_span: 1.364, d_med: 1.856 },
        prosodylm: { f0_corr: 0.546, en_corr: 0.912, d_span: 3.797, d_med: 4.794 },
        qwen3tts: { f0_corr: 0.426, en_corr: 0.905, d_span: 1.47, d_med: 7.244 }
      },
      plot: "static/images/f0/sample_01.png"
    },
    {
      title: "World Cup 2006: celebration and replay",
      blurb: "Right after the goal: an animated description of the celebration, then calmer analysis of the replay.",
      video: "static/videos/sample_02.mp4",
      poster: "static/images/sample_02_poster.jpg",
      default: "ours",
      audio: {
        original: "video",
        ours: "static/audio/sample_02/ours.m4a",
        prosodylm: "static/audio/sample_02/prosodylm.m4a",
        qwen3tts: "static/audio/sample_02/qwen3tts.m4a"
      },
      sentences: [
        { text: "They call him terrific Thierry in France and in London", start: 0.4, end: 4.3 },
        { text: "And Thierry Henri has brought the contest to light", start: 4.3, end: 7.8 },
        { text: "He's brought Raymond Dominic to his feet", start: 7.8, end: 10.6 },
        { text: "He's got every French arm and the whole of the country and the whole of the stadium in Frankfurt waving in salute", start: 10.6, end: 17.2 },
        { text: "No question of oxide", start: 17.2, end: 18.9 },
        { text: "He's stolen away", start: 18.9, end: 20.2 },
        { text: "But where were the markers", start: 20.2, end: 22.0 },
        { text: "They were all preoccupied with others", start: 22.0, end: 24.8 },
        { text: "And Henri took full advantage to prod it home", start: 24.8, end: 30.05 }
      ],
      metrics: {
        ours: { f0_corr: 0.641, en_corr: 0.925, d_span: 1.229, d_med: 0.522 },
        prosodylm: { f0_corr: 0.477, en_corr: 0.913, d_span: 2.601, d_med: 2.028 },
        qwen3tts: { f0_corr: 0.521, en_corr: 0.91, d_span: 1.66, d_med: 9.417 }
      },
      plot: "static/images/f0/sample_02.png"
    },
    {
      title: "NBA: Lakers half-court offense",
      blurb: "Fast half-court possessions with made threes and quick calls between plays.",
      video: "static/videos/sample_03.mp4",
      poster: "static/images/sample_03_poster.jpg",
      default: "ours",
      audio: {
        original: "video",
        ours: "static/audio/sample_03/ours.m4a",
        prosodylm: "static/audio/sample_03/prosodylm.m4a",
        qwen3tts: "static/audio/sample_03/qwen3tts.m4a"
      },
      sentences: [
        { text: "Corner three for Walton", start: 0.4, end: 1.6 },
        { text: "Same thing here", start: 1.6, end: 3.0 },
        { text: "Another pick and roll", start: 3.0, end: 4.4 },
        { text: "Get Bryant attack in the basket", start: 4.4, end: 6.6 },
        { text: "Great play passes on time on target", start: 6.6, end: 9.7 },
        { text: "Now it's up to the shooter", start: 9.7, end: 11.0 },
        { text: "Knock it in", start: 11.0, end: 12.4 },
        { text: "And here Bryant with all the defense again loaded up to him", start: 12.4, end: 15.8 },
        { text: "Good movement off the ball by Bujacic", start: 15.8, end: 18.4 },
        { text: "Knocks it down", start: 18.4, end: 19.8 },
        { text: "The other Lakers tonight are slips first from three", start: 19.8, end: 24.65 }
      ],
      metrics: {
        ours: { f0_corr: 0.664, en_corr: 0.903, d_span: 2.998, d_med: 0.886 },
        prosodylm: { f0_corr: 0.479, en_corr: 0.913, d_span: 2.66, d_med: 2.323 },
        qwen3tts: { f0_corr: 0.537, en_corr: 0.902, d_span: 2.379, d_med: 9.614 }
      },
      plot: "static/images/f0/sample_03.png"
    }
  ],
};
