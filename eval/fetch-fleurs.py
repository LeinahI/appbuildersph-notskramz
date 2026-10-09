# Fetches a few Google FLEURS clips (CC-BY-4.0, read speech with the correct text) to score speech writing.
# Usage: python -I eval/fetch-fleurs.py <out dir> <config> <bytes of the archive to read>
#   python -I eval/fetch-fleurs.py eval/voice-clips fil_ph 25000000   (Filipino, Tagalog)
#   python -I eval/fetch-fleurs.py eval/voice-clips ceb_ph 25000000   (Cebuano)
# Reads only the first bytes of the dev archive (the full ones are 366 MB and 162 MB), writes only the .wav files
# inside it (by file name, never by the archive's own paths), and saves the dev.tsv text. Then: pnpm eval:voice
import sys, os, io, gzip, tarfile, urllib.request, zlib
out_root, cfg, nbytes = sys.argv[1], sys.argv[2], int(sys.argv[3])
base = f"https://huggingface.co/datasets/google/fleurs/resolve/main/data/{cfg}"
out = os.path.join(out_root, cfg)
os.makedirs(out, exist_ok=True)
# transcripts
open(os.path.join(out, "dev.tsv"), "wb").write(urllib.request.urlopen(f"{base}/dev.tsv", timeout=60).read())
# first nbytes of the archive, decompressed as a stream
req = urllib.request.Request(f"{base}/audio/dev.tar.gz", headers={"Range": f"bytes=0-{nbytes-1}"})
raw = urllib.request.urlopen(req, timeout=120).read()
print(cfg, "downloaded bytes:", len(raw))
dec = zlib.decompressobj(16 + zlib.MAX_WBITS)
data = dec.decompress(raw)
count = 0
try:
    with tarfile.open(fileobj=io.BytesIO(data), mode="r|") as tf:
        for m in tf:
            if not m.isfile() or not m.name.lower().endswith(".wav"):
                continue
            name = os.path.basename(m.name)          # never trust paths inside the archive
            f = tf.extractfile(m)
            blob = f.read()
            if len(blob) != m.size:                   # truncated at the end of the range
                break
            open(os.path.join(out, name), "wb").write(blob)
            count += 1
except (tarfile.ReadError, EOFError, zlib.error) as e:
    print("stream ended:", type(e).__name__)
print(cfg, "wav clips written:", count)
