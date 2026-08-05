# HaGRID / HaGRIDv2 Integration

HaGRIDv2 is the right base dataset for this project, but the full image dataset is not small. The official repository says HaGRIDv2 is about 1.5 TB with 1,086,158 FullHD images across 33 gesture classes plus `no_gesture`.

For our app, we do not need to download the full image archive first. The official annotations include hand landmarks, and this project already learns from landmark vectors. That means the practical path is:

1. Download HaGRIDv2 annotations with landmarks.
2. Convert selected labels into this app's JSON dataset format.
3. Import the generated JSON in the browser app.
4. Mix HaGRID samples with your own webcam samples.

## Recommended RPS Mapping

Use these HaGRID labels for rock paper scissors:

```text
fist  -> rock
palm  -> paper
peace -> scissors
```

## Download Annotations

Use the official HaGRID repository:

```powershell
git clone https://github.com/hukenovs/hagrid.git external/hagrid
cd external/hagrid
pip install -r requirements.txt
python download.py --save_path ../../data/hagrid --annotations
```

The annotation archive should unpack into a structure like:

```text
data/hagrid/hagrid_annotations/
  train/
    fist.json
    palm.json
    peace.json
  val/
  test/
```

Do not run `--dataset` unless you really want the image files too. The image dataset is enormous.

## Convert To This App Format

From the project root:

```powershell
python scripts/import_hagrid_annotations.py `
  --annotations-dir data/hagrid/hagrid_annotations `
  --labels fist palm peace `
  --max-per-label 500 `
  --output data/hagrid-rps-dataset.json
```

Then open the app and use **Import JSON** to import:

```text
data/hagrid-rps-dataset.json
```

The browser app now merges imported samples with your current local samples instead of replacing them.

## Generated Local Files

After running the integration, this project has:

```text
data/hagrid/ann.zip
data/hagrid/annotations/
data/hagrid-rps-dataset.json
data/combined-rps-dataset.json
```

`data/hagrid-rps-dataset.json` contains 1,500 HaGRID samples:

```text
rock: 500
paper: 500
scissors: 500
```

`data/combined-rps-dataset.json` contains the HaGRID samples plus the local webcam samples:

```text
rock: 522
paper: 526
scissors: 522
```

Import `data/combined-rps-dataset.json` in the browser app when you want the best current dataset.

## Bigger Gesture Set

Later you can include more HaGRID labels:

```powershell
python scripts/import_hagrid_annotations.py `
  --annotations-dir data/hagrid/hagrid_annotations `
  --labels fist palm peace like dislike ok stop call mute one two_up three four point `
  --max-per-label 500 `
  --keep-hagrid-labels `
  --output data/hagrid-general-gestures.json
```

## Why Still Keep Your Own Dataset?

HaGRID gives breadth: many people, scenes, distances, and lighting conditions.

Your webcam data gives fit: your camera, your lighting, your real user behavior.

The strongest model should use both.
