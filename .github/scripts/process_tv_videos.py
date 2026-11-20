#!/usr/bin/env python3
"""
TV VIDEO INBOX for the Rocco's menu boards (boards/v2c).

HOW TO ADD A VIDEO (all in the GitHub website, nothing to install):
  1. Rename the clip like this:   tv2 Hoagies - Stacked High.mp4
       tv1 or tv2      which TV it plays on (required)
       Hoagies         small red line over the title (the menu section)
       Stacked High    the big title (optional; leave off for "Rocco's Pizza")
  2. Drag it into boards/v2c/video/inbox on GitHub and press Commit.
  3. Within a few minutes it is cropped for the TV, gets a still picture,
     and joins that TV's rotation. The original upload is deleted.

HOW TO REMOVE ONE: delete its .mp4 in boards/v2c/video. Its still and
its place in the rotation are cleaned up automatically.

Every clip runs as an unpriced brand spot (no item name, no price),
because stock footage is not Rocco's own food.

Files without "tv1" or "tv2" at the start are moved to
inbox/needs-tv1-or-tv2/ and left alone.
"""
import json, os, re, subprocess, sys, unicodedata
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "boards", "v2c", "video")
ROOT = os.path.normpath(ROOT)
INBOX = os.path.join(ROOT, "inbox")
PARKED = os.path.join(INBOX, "needs-tv1-or-tv2")
MANIFEST = os.path.join(ROOT, "videos.json")
VIDEO_EXT = (".mp4", ".mov", ".m4v", ".webm")
MAX_SECONDS = 10          # longer clips are trimmed to this
HOLD_SECONDS = 1.5        # time on the still after the clip plays once

NAME = re.compile(r"^\s*tv\s*([12])\b[\s_.-]*(.*)$", re.I)


def run(*cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def probe(path):
    out = json.loads(run("ffprobe", "-v", "error", "-select_streams", "v:0",
                         "-show_entries", "stream=width,height:format=duration",
                         "-of", "json", path))
    s = out["streams"][0]
    return int(s["width"]), int(s["height"]), float(out["format"]["duration"])


def nice(text):
    text = re.sub(r"[_]+", " ", text).strip()
    text = text.replace("'", "’")
    return re.sub(r"\s+", " ", text)


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "clip"


def load_manifest():
    try:
        with open(MANIFEST) as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []


def process(path, used_ids):
    stem = os.path.splitext(os.path.basename(path))[0]
    m = NAME.match(stem)
    if not m:
        os.makedirs(PARKED, exist_ok=True)
        os.rename(path, os.path.join(PARKED, os.path.basename(path)))
        print("PARKED (name must start with tv1 or tv2):", os.path.basename(path))
        return None

    tv = int(m.group(1))
    words = m.group(2)
    parts = [nice(p) for p in re.split(r"\s+-\s+", words, maxsplit=1) if nice(p)]
    eyebrow = parts[0] if parts else "Rocco’s Pizza"
    title = parts[1] if len(parts) > 1 else "Rocco’s Pizza"

    base = "tv%d-%s" % (tv, slug(eyebrow + " " + title))
    vid, n = base, 2
    while vid in used_ids:
        vid, n = "%s-%d" % (base, n), n + 1
    used_ids.add(vid)

    w, h, dur = probe(path)
    keep = min(dur, MAX_SECONDS)
    if w > h:
        # Wide clip: keep a 3:4 slice from the middle (the hero window is tall).
        vf = "crop=trunc(ih*3/4/2)*2:ih,scale=720:960"
    else:
        vf = "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280"
    out_mp4 = os.path.join(ROOT, vid + ".mp4")
    out_jpg = os.path.join(ROOT, vid + ".jpg")
    run("ffmpeg", "-loglevel", "error", "-y", "-i", path, "-t", "%.2f" % keep,
        "-map", "0:v:0", "-an", "-dn", "-sn", "-map_metadata", "-1", "-write_tmcd", "0",
        "-vf", vf + ",fps=30,format=yuv420p",
        "-c:v", "libx264", "-profile:v", "main", "-level", "4.0", "-preset", "slow", "-crf", "23",
        "-movflags", "+faststart", out_mp4)
    run("ffmpeg", "-loglevel", "error", "-y", "-ss", "%.2f" % (keep * 0.4), "-i", out_mp4,
        "-frames:v", "1", "-q:v", "3", out_jpg)
    os.remove(path)

    entry = {
        "id": vid, "tv": tv, "eyebrow": eyebrow, "title": title,
        "video": vid + ".mp4", "poster": vid + ".jpg",
        "seconds": round(max(6.0, keep + HOLD_SECONDS), 1),
        "source": os.path.basename(path),
        "added": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }
    print("ADDED", entry["id"], "| tv%d | %s / %s | %.1fs" % (tv, eyebrow, title, keep))
    return entry


def main():
    entries = load_manifest()
    used = {e.get("id") for e in entries}
    os.makedirs(INBOX, exist_ok=True)

    for name in sorted(os.listdir(INBOX)):
        path = os.path.join(INBOX, name)
        if os.path.isfile(path) and name.lower().endswith(VIDEO_EXT):
            try:
                entry = process(path, used)
                if entry:
                    entries.append(entry)
            except subprocess.CalledProcessError as err:
                print("FAILED", name, err.stderr[-500:], file=sys.stderr)

    # Drop entries whose video was deleted, and their stills.
    kept = []
    for e in entries:
        if os.path.exists(os.path.join(ROOT, e.get("video", ""))):
            kept.append(e)
        else:
            still = os.path.join(ROOT, e.get("poster", ""))
            if e.get("poster") and os.path.exists(still):
                os.remove(still)
            print("REMOVED", e.get("id"))

    with open(MANIFEST, "w") as f:
        json.dump(kept, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(len(kept), "videos in videos.json")


if __name__ == "__main__":
    main()
