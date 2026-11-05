# InjScan local bank chatbot demo

This package contains:

- `frontend/`: the Aegis Trust bank website with the AI chatbot.
- `backend/`: FastAPI bank bot using Ollama locally.
- `django_backend/`: telemetry API and browser dashboard.
- `scanner/`: local attacker/prompt-injection test harness.

## Requirements

- Linux with Python 3.10 or newer
- Ollama installed and running
- A local model available, for example:

```bash
ollama pull llama3.2:3b
```

## Start everything

```bash
chmod +x start_linux.sh run_scan_linux.sh
./start_linux.sh
```

Open the bank website at http://127.0.0.1:3001.

- Bank API docs: http://127.0.0.1:9000/docs
- Telemetry dashboard: http://127.0.0.1:8001

The startup script creates `.venv`, installs `requirements.txt`, applies Django
migrations, and starts the three local services. It does not expose services
outside the local machine.

## Run the local attacker/scanner

Keep `start_linux.sh` running, then use another terminal:

```bash
./run_scan_linux.sh
```

The scanner sends only the example attacks in
`scanner/targets/bank_demo.json` to the local demo bank bot and reports results
to the local dashboard API.
