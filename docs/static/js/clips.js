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
//   caption   optional text under the player (e.g. the commentary transcript)
//   audio     { trackId: "path/to/file.wav" }, or "video" to use the video's own soundtrack
//   default   optional track id selected when the clip is first shown

window.TRACKS = [
  { id: "original", label: "Original broadcast", note: "Real commentator, as aired." },
  { id: "ours",     label: "ProsodyMLM (ours)",  ours: true, note: "Prosody from video + environmental sound." },
  { id: "prosodylm", label: "ProsodyLM", note: "Text-only prosody; no video or audio context." },
  { id: "qwen3tts",  label: "Qwen3-TTS", note: "TTS from the ground-truth transcript with a commentary prompt." },
];

window.CLIPS = {
  highlight: [
    {
      title: "World Cup: stoppage-time goal",
      video: "static/videos/highlight_01.mp4",
      poster: "",
      caption: "“…he shoots, and it's in! What a finish!”",
      default: "ours",
      audio: {
        original: "video",
        ours: "static/audio/highlight_01/ours.wav",
        prosodylm: "static/audio/highlight_01/prosodylm.wav",
        qwen3tts: "static/audio/highlight_01/qwen3tts.wav",
      },
    },
    {
      title: "NBA: fast-break dunk",
      video: "static/videos/highlight_02.mp4",
      caption: "",
      default: "ours",
      audio: {
        original: "video",
        ours: "static/audio/highlight_02/ours.wav",
        prosodylm: "static/audio/highlight_02/prosodylm.wav",
        qwen3tts: "static/audio/highlight_02/qwen3tts.wav",
      },
    },
  ],

  calm: [
    {
      title: "World Cup: midfield build-up",
      video: "static/videos/calm_01.mp4",
      caption: "",
      default: "ours",
      audio: {
        original: "video",
        ours: "static/audio/calm_01/ours.wav",
        prosodylm: "static/audio/calm_01/prosodylm.wav",
        qwen3tts: "static/audio/calm_01/qwen3tts.wav",
      },
    },
  ],
};
