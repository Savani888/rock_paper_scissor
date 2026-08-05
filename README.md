# AIML Rock Paper Scissors Machine

A browser-based camera game that recognizes a player's hand pose or motion and plays rock, paper, scissors with the machine.

## Features

- Live hand gesture recognition using MediaPipe Tasks Vision in the browser.
- Maps built-in gestures to RPS moves:
  - `Closed_Fist` → rock
  - `Open_Palm` → paper
  - `Victory` → scissors
- Two gameplay modes:
  - `Counter` mode: machine reacts to the final detected hand just before shoot.
  - `Predict` mode: machine uses early countdown samples to anticipate your move.
- Self-learning dataset trainer for static poses and motion gestures.
- Gesture label input for naming custom captures.
- Capture and record UI controls:
  - `Capture Pose`
  - `Record Motion`
  - `Export JSON`
  - `Import JSON`
- Dataset stored in browser local storage and visible sample counts.

## Controls

- `Start Camera`: open webcam access and enable game controls.
- `Play Round`: start a game round, count down, lock the machine move, and score.
- `Counter`: use the final detected move to choose the winning response.
- `Predict`: use early gesture samples to predict and lock the machine's answer.
- `gesture label`: type the name of the pose or motion before saving.
- `Capture Pose`: store the current static hand pose as a labeled sample.
- `Record Motion`: start recording motion frames; click again to stop and save the motion sample.
- `Export JSON`: download the stored dataset to a local file.
- `Import JSON`: load a backed-up or shared dataset file.
- `Custom Prediction`: shows the nearest dataset match for the current pose or motion.

## How to use

1. Run a local HTTP server:

```powershell
python -m http.server 8000
```

2. Open the app in your browser:

```text
http://localhost:8000
```

3. Click `Start Camera` and allow webcam access.
4. Select a mode: `Counter` or `Predict`.
5. Click `Play Round` to begin a round.
6. Show rock, paper, or scissors to the camera.
7. The machine will lock its move, then show the round result.

## Self-learning dataset workflow

1. Enter a label in the `gesture label` field.
2. Hold the gesture and click `Capture Pose` to add a static pose.
3. For movement gestures, click `Record Motion`, perform the motion, then click `Record Motion` again to stop.
4. Add multiple examples for better recognition.
5. Track sample counts in the trainer section.
6. Use `Export JSON` to save the dataset.
7. Use `Import JSON` to load a saved dataset.

## Import / Export Dataset

- `Export JSON` downloads a file like `hand-gesture-dataset-<timestamp>.json`.
- `Import JSON` merges valid samples from a previously exported dataset.
- Dataset labels are normalized during import.

## Notes

- The app loads MediaPipe and the gesture model from CDN on first use, so internet access is required initially.
- The dataset is persisted in local storage and remains available between sessions on the same browser.
- Capture diverse examples across lighting, angles, subjects, and motion speed for better results.

## Run

```powershell
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Test

```powershell
node .\tests\game_logic.test.mjs
```

## Architecture docs

- `docs/SAAS_BLUEPRINT.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/API_DESIGN.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/SECURITY_AND_OPERATIONS.md`
- `docs/BUILD_ROADMAP.md`
- `docs/HAGRID_INTEGRATION.md`
