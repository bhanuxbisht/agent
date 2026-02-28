import httpx, json, time

url = "http://localhost:8001/api/create/stream?prompt=30s+cinematic+reel+about+monsoon+in+Jaipur&content_type=reel&duration=30&platform=instagram"
print("Testing SSE stream on /api/create/stream ...")
start = time.time()
try:
    with httpx.stream("GET", url, timeout=180) as r:
        print(f"HTTP {r.status_code}")
        for line in r.iter_lines():
            elapsed = round(time.time() - start, 1)
            if line.startswith("event:"):
                print(f"[{elapsed}s] {line}")
            elif line.startswith("data:"):
                try:
                    d = json.loads(line[5:].strip())
                    node = d.get("node", "")
                    ev = d.get("event", "")
                    if ev == "start":
                        print(f"[{elapsed}s]   START: {d.get('message')}")
                    elif node:
                        keys = list(d.get("patch", {}).keys()) if d.get("patch") else []
                        print(f"[{elapsed}s]   node={node} patch_keys={keys}")
                    elif ev == "done":
                        st = d.get("state", {})
                        bp_len = len(st.get("final_blueprint", ""))
                        print(f"[{elapsed}s]   DONE! score={st.get('score')} iters={st.get('iteration_count')} blueprint_len={bp_len}")
                    elif ev == "error":
                        print(f"[{elapsed}s]   ERROR: {d.get('message')}")
                    else:
                        print(f"[{elapsed}s]   {line[:100]}")
                except Exception:
                    print(f"[{elapsed}s]   {line[:100]}")
    print(f"Stream ended after {round(time.time()-start,1)}s")
except Exception as e:
    print(f"FAILED: {e}")
