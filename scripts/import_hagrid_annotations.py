#!/usr/bin/env python
"""Convert HaGRID/HaGRIDv2 landmark annotations into this app's JSON dataset.

The browser app stores normalized 21-point hand landmark vectors. HaGRIDv2
annotations already include MediaPipe-style hand landmarks, so this script can
build a useful training JSON without downloading the 1.5 TB image archive.
"""

from __future__ import annotations

import argparse
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_LABEL_MAP = {
    "fist": "rock",
    "palm": "paper",
    "peace": "scissors",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert HaGRID landmark annotations to app dataset JSON."
    )
    parser.add_argument(
        "--annotations-dir",
        required=True,
        type=Path,
        help="Path containing train/val/test annotation folders.",
    )
    parser.add_argument(
        "--output",
        default=Path("hagrid-gesture-dataset.json"),
        type=Path,
        help="Output JSON path.",
    )
    parser.add_argument(
        "--labels",
        nargs="*",
        default=["fist", "palm", "peace"],
        help="HaGRID labels to include. Use no_gesture, like, stop, ok, etc.",
    )
    parser.add_argument(
        "--splits",
        nargs="*",
        default=["train", "val"],
        help="Annotation splits to read.",
    )
    parser.add_argument(
        "--max-per-label",
        type=int,
        default=500,
        help="Maximum samples per output label.",
    )
    parser.add_argument(
        "--keep-hagrid-labels",
        action="store_true",
        help="Do not map fist/palm/peace to rock/paper/scissors.",
    )
    return parser.parse_args()


def normalize_landmarks(landmarks: list[list[float]]) -> list[float]:
    wrist = landmarks[0]
    middle_base = landmarks[9]
    wrist_z = wrist[2] if len(wrist) > 2 else 0.0
    middle_z = middle_base[2] if len(middle_base) > 2 else 0.0
    scale = math.dist(
        [wrist[0], wrist[1], wrist_z],
        [middle_base[0], middle_base[1], middle_z],
    ) or 1.0

    vector: list[float] = []
    for point in landmarks:
        z = point[2] if len(point) > 2 else 0.0
        vector.extend(
            [
                round((point[0] - wrist[0]) / scale, 5),
                round((point[1] - wrist[1]) / scale, 5),
                round((z - wrist_z) / scale, 5),
            ]
        )
    return vector


def iter_annotation_files(root: Path, splits: list[str], labels: list[str]):
    for split in splits:
        split_dir = root / split
        if not split_dir.exists():
            continue
        for label in labels:
            path = split_dir / f"{label}.json"
            if path.exists():
                yield split, label, path


def convert_annotations(args: argparse.Namespace) -> dict:
    selected = set(args.labels)
    label_map = {} if args.keep_hagrid_labels else DEFAULT_LABEL_MAP
    counts: dict[str, int] = {}
    samples: list[dict] = []
    created_at = datetime.now(timezone.utc).isoformat()

    for split, source_label, path in iter_annotation_files(args.annotations_dir, args.splits, args.labels):
        with path.open("r", encoding="utf-8") as file:
            annotations = json.load(file)

        for image_id, item in annotations.items():
            labels = item.get("labels") or []
            hand_landmarks = item.get("hand_landmarks") or []
            for index, hand in enumerate(hand_landmarks):
                hand_label = labels[index] if index < len(labels) else source_label
                if hand_label not in selected or len(hand) != 21:
                    continue

                output_label = label_map.get(hand_label, hand_label)
                if counts.get(output_label, 0) >= args.max_per_label:
                    continue

                samples.append(
                    {
                        "id": str(uuid.uuid4()),
                        "type": "pose",
                        "label": output_label,
                        "vector": normalize_landmarks(hand),
                        "createdAt": created_at,
                        "metadata": {
                            "source": "hagrid_v2",
                            "sourceLabel": hand_label,
                            "split": split,
                            "imageId": image_id,
                            "userId": item.get("user_id"),
                        },
                    }
                )
                counts[output_label] = counts.get(output_label, 0) + 1

            if all(counts.get(label_map.get(label, label), 0) >= args.max_per_label for label in selected):
                break

    return {
        "version": 1,
        "source": "hagrid_v2_annotations",
        "samples": samples,
        "summary": counts,
    }


def main() -> None:
    args = parse_args()
    dataset = convert_annotations(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as file:
        json.dump(dataset, file, indent=2)
    print(f"Wrote {len(dataset['samples'])} samples to {args.output}")
    print(json.dumps(dataset["summary"], indent=2))


if __name__ == "__main__":
    main()
