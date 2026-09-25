#!/usr/bin/env python3
"""Render Tranquila scripts with Kokoro while preserving [[slnc N]] pauses."""

import argparse
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


SAMPLE_RATE = 24_000
SILENCE_MARKER = re.compile(r"\[\[slnc\s+(\d+)\]\]")


def render_script(pipeline: KPipeline, source: Path, output: Path, speed: float) -> None:
    pieces = SILENCE_MARKER.split(source.read_text(encoding="utf-8"))
    audio_parts: list[np.ndarray] = []

    for index, piece in enumerate(pieces):
        if index % 2:
            milliseconds = int(piece)
            audio_parts.append(np.zeros(round(SAMPLE_RATE * milliseconds / 1000), dtype=np.float32))
            continue

        text = re.sub(r"\s+", " ", piece).strip()
        if not text:
            continue

        rendered_chunks = []
        for _, _, audio in pipeline(text, voice="af_heart", speed=speed):
            rendered_chunks.append(np.asarray(audio, dtype=np.float32))

        for chunk_index, chunk in enumerate(rendered_chunks):
            if chunk_index:
                audio_parts.append(np.zeros(round(SAMPLE_RATE * 0.35), dtype=np.float32))
            audio_parts.append(chunk)

    full_audio = np.concatenate(audio_parts)
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="tranquila-kokoro-") as temp_dir:
        wav_path = Path(temp_dir) / f"{output.stem}.wav"
        mp3_path = Path(temp_dir) / output.name
        sf.write(wav_path, full_audio, SAMPLE_RATE, subtype="PCM_16")
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "128k",
                str(mp3_path),
            ],
            check=True,
        )
        mp3_path.replace(output)

    print(f"Rendered {source.name} -> {output.name} ({len(full_audio) / SAMPLE_RATE:.1f}s)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--speed", type=float, default=0.65)
    parser.add_argument("sources", nargs="+", type=Path)
    args = parser.parse_args()

    pipeline = KPipeline(lang_code="a")
    for source in args.sources:
        render_script(pipeline, source, source.parent.parent / f"{source.stem}.mp3", args.speed)


if __name__ == "__main__":
    main()
