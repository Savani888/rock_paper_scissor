#!/usr/bin/env python
"""Merge app dataset JSON files and optionally normalize labels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


LABEL_NORMALIZATION = {
    "scissor": "scissors",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge gesture dataset JSON files.")
    parser.add_argument("--output", required=True, type=Path, help="Merged dataset output path.")
    parser.add_argument("inputs", nargs="+", type=Path, help="Input dataset JSON files.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    samples = []
    seen_ids = set()

    for input_path in args.inputs:
        with input_path.open("r", encoding="utf-8") as file:
            dataset = json.load(file)

        for sample in dataset.get("samples", []):
            sample_id = sample.get("id")
            if sample_id in seen_ids:
                continue
            seen_ids.add(sample_id)
            sample["label"] = LABEL_NORMALIZATION.get(sample.get("label"), sample.get("label"))
            samples.append(sample)

    summary: dict[str, int] = {}
    for sample in samples:
        label = sample.get("label", "unknown")
        summary[label] = summary.get(label, 0) + 1

    merged = {
        "version": 1,
        "source": "merged",
        "samples": samples,
        "summary": summary,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as file:
        json.dump(merged, file, indent=2)

    print(f"Wrote {len(samples)} samples to {args.output}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
