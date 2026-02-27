"""Quick end-to-end SSE stream test for the multi-agent workflow."""
import json
import time

import httpx

url = "http://localhost:8000/api/report/stream?topic=How+AI+is+transforming+fintech+in+2026"
print("Starting SSE stream test...")
start = time.time()

with httpx.stream("GET", url, timeout=180) as r:
    for line in r.iter_lines():
        elapsed = round(time.time() - start, 1)
        if line.startswith("event:"):
            print(f"[{elapsed}s] {line}")
        elif line.startswith("data:"):
            try:
                d = json.loads(line[5:].strip())
                evt = d.get("event", "?")
                if evt == "node":
                    node = d.get("node", "?")
                    keys = list(d.get("patch", {}).keys()) if d.get("patch") else []
                    print(f"[{elapsed}s]   node={node}  patch_keys={keys}")
                elif evt == "done":
                    st = d.get("state", {})
                    score = st.get("score", "?")
                    iters = st.get("iteration_count", "?")
                    rlen = len(st.get("final_report", ""))
                    print(f"[{elapsed}s]   DONE! score={score} iterations={iters} report_len={rlen}")
                elif evt == "error":
                    print(f"[{elapsed}s]   ERROR: {d.get('message')}")
                elif evt == "start":
                    print(f"[{elapsed}s]   Workflow started for: {d.get('topic')}")
                else:
                    print(f"[{elapsed}s]   {line[:120]}")
            except json.JSONDecodeError:
                print(f"[{elapsed}s]   raw: {line[:120]}")

print(f"\nStream ended after {round(time.time()-start, 1)}s")
