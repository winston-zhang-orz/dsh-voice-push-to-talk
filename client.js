window.__ModuleLoader__.load({
  id: 'dsh-voice-push-to-talk',
  factory() {
    // ------------------------------------------------------------------
    // Hold-to-talk hotkey for the DSH voice input plugin.
    //
    // HOTKEY_CODE is a KeyboardEvent.code (layout independent):
    //   'AltRight'     Right Option (macOS) / Right Alt (Windows) — default
    //   'ShiftRight'   Right Shift
    //   'ControlRight' Right Control
    //   'Backquote'    the ` key (character keys also work; repeats are
    //                  ignored and the keystroke is swallowed while held)
    // A modifier key is recommended: holding it never types into the editor.
    // ------------------------------------------------------------------
    const HOTKEY_CODE = 'AltRight';

    // aria-labels used by @deepseek-ai/dsh-experimental-client-ui-voice-input.
    // All shipped UI locales as of 0.2.2-rc.5: en, zh, es, fr, de, ru, pt
    // (ja.json ships meta only, so Japanese falls back to English).
    const START_LABELS = [
      'Start recording', '开始录音', 'Empezar a grabar', "Commencer l'enregistrement",
      'Starten Sie die Aufnahme', 'Начать запись', 'Comece a gravar',
    ];
    const STOP_LABELS = [
      'Stop and transcribe', '停止并识别', 'Detener y transcribir', 'Arrêtez et transcrivez',
      'Stoppen Sie und transkribieren Sie', 'Остановись и перепиши', 'Pare e transcreva',
    ];
    // The capture row's dismiss button: "Discard transcript" while a pending
    // transcript exists, otherwise "Cancel".
    const DISMISS_LABELS = [
      'Discard transcript', '丢弃识别文字', 'Descartar transcripción', 'Supprimer la transcription',
      'Transkript verwerfen', 'Удалить расшифровку', 'Descartar transcrição',
      'Cancel', '取消', 'Cancelar', 'Annuler', 'Abbrechen', 'Отмена',
    ];

    const RETRY_MS = 100;
    // The capture toolbar mounts asynchronously after the start click, so a
    // fast key release can arrive before any phase exists: retry briefly.
    const STOP_RETRY_LIMIT = 30; // ~3 seconds
    // While held, keep working toward an open capture: dismiss stale feedback
    // and wait out an in-flight transcription (can take several seconds).
    const START_RETRY_LIMIT = 100; // ~10 seconds

    function findButton(labels) {
      for (const label of labels) {
        const button = document.querySelector(`button[aria-label="${label}"]`);
        if (button && !button.disabled) return button;
      }
      return null;
    }

    // The voice toolbar exposes its phase as data-voice-activity:
    // 'requesting' | 'recording' | 'transcribing' | 'feedback'.
    // 'feedback' is terminal until dismissed (no upstream auto-hide): empty
    // results, failures and draft conflicts all park there.
    function activityPhase() {
      const row = document.querySelector('[data-voice-activity]');
      return row ? row.getAttribute('data-voice-activity') : null;
    }

    return {
      apply(ctx) {
        ctx.effect(() => {
          let held = false;
          let disposed = false;

          function onKeyDown(event) {
            if (event.code !== HOTKEY_CODE || event.repeat) return;
            const phase = activityPhase();
            if (held) {
              // A keyup can be lost (e.g. released while Command is held on
              // macOS). Heal when nothing is actively capturing; otherwise the
              // held key is already driving the visible capture.
              if (phase === null || phase === 'feedback') held = false;
              else return;
            }
            const start = findButton(START_LABELS);
            if (!start && phase === null) return; // voice input unavailable
            event.preventDefault();
            held = true;
            if (phase !== 'recording') ensureCapture(0); // else: adopt, keyup stops it
          }

          // Work toward an open capture while the key is held: click Start,
          // dismiss stale feedback, or wait out a running transcription.
          function ensureCapture(attempt) {
            if (disposed || !held) return;
            const phase = activityPhase();
            if (phase === 'recording' || phase === 'requesting') return; // open
            if (attempt >= START_RETRY_LIMIT) return;
            if (phase === null) {
              const start = findButton(START_LABELS);
              if (start) start.click();
            } else if (phase === 'feedback') {
              const dismiss = findButton(DISMISS_LABELS);
              if (dismiss) dismiss.click();
            }
            // 'transcribing': wait for the previous result to settle.
            setTimeout(() => ensureCapture(attempt + 1), RETRY_MS);
          }

          function onKeyUp(event) {
            if (event.code !== HOTKEY_CODE || !held) return;
            held = false;
            event.preventDefault();
            stopCapture(0);
          }

          function stopCapture(attempt) {
            if (disposed) return;
            const phase = activityPhase();
            if (phase === 'recording') {
              const stop = findButton(STOP_LABELS);
              if (stop) stop.click(); // stop -> transcribe into the draft
              return;
            }
            if (phase === 'requesting') {
              // Released before capture really started: abandon it instead of
              // leaving the microphone open.
              const dismiss = findButton(DISMISS_LABELS);
              if (dismiss) dismiss.click();
              return;
            }
            if (phase !== null) return; // transcribing/feedback: already finished
            if (attempt >= STOP_RETRY_LIMIT) return; // capture never opened
            setTimeout(() => stopCapture(attempt + 1), RETRY_MS);
          }

          function onBlur() {
            // The voice plugin cancels capture on blur — except while the
            // mic-permission prompt is up, where capture survives. Resetting
            // here is safe either way: the next key press adopts a surviving
            // recording through the phase === 'recording' branch above.
            held = false;
          }

          window.addEventListener('keydown', onKeyDown, true);
          window.addEventListener('keyup', onKeyUp, true);
          window.addEventListener('blur', onBlur);
          return () => {
            disposed = true;
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            window.removeEventListener('blur', onBlur);
          };
        });
      },
    };
  },
});
