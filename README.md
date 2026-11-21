# dsh-voice-push-to-talk

Hold-to-talk hotkey for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI voice input.

**Hold Right Option (⌥, macOS) / Right Alt (Windows)** to start recording; **release** to stop and transcribe into the message draft. The transcript still gets the usual review before sending — nothing is submitted automatically.

## Requirements

- The experimental **Voice input** bundle (`@deepseek-ai/dsh-experimental-voice-input-bundle`) must be enabled and its recognition model prepared (Plugins → Voice input).
- The browser must have microphone permission for the Harness origin (HTTPS or loopback).

## Changing the hotkey

Edit `HOTKEY_CODE` at the top of `client.js`. It takes a [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) such as `'AltRight'` (default), `'ShiftRight'`, `'ControlRight'`, or `'Backquote'`. A modifier key is recommended: holding it never types into the editor, and auto-repeat is never an issue. Reload the Harness Web page after editing.

## Compatibility and stability caveat

**This plugin is experimental and coupled to internal implementation details of
`@deepseek-ai/dsh-experimental-client-ui-voice-input`** (tested against `0.2.2-rc.5`).
It locates the microphone controls through their `aria-label` text (all shipped
UI locales: en, zh, es, fr, de, ru, pt; Japanese falls back to English) and reads
the recording phase from its `data-voice-activity` DOM attribute. Neither is a
public API: an upstream release that renames these will silently disable the hotkey.

The failure mode is benign — the hotkey simply stops working and the mouse-driven
UI is unaffected; no input is recorded or sent unexpectedly.

## How it behaves

- Hold the key: recording starts (or resumes once a previous transcription settles).
- Release: stops and transcribes. Released before capture actually started (very short tap): the pending recording is cancelled cleanly.
- A stale "No speech recognized" / error message in the voice toolbar is dismissed automatically on the next hold.
- If a recording is already running when the key is pressed (e.g. started by mouse), releasing the key stops it.
- The key does nothing when voice input is not ready (model not prepared), so the hotkey never opens setup dialogs or interferes with normal typing.

## Uninstall

Disable or remove the bundle from Plugins in the Harness Web UI, then reload the page.
