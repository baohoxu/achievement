# Achievement Box API

## Setup

1. Create the MySQL schema:

```bash
mysql -u root -p < server/schema.sql
```

2. Create the backend Conda environment and install dependencies:

```bash
/opt/anaconda3/bin/conda create -p server/.conda python=3.11 pip -y
server/.conda/bin/pip install -r server/requirements.txt
```

3. Activate the Conda environment, export environment variables from `server/.env`, then start the API:

```bash
source /opt/anaconda3/etc/profile.d/conda.sh
conda activate /Users/yanjinbin/Desktop/deeplearning/achievement/server/.conda
set -a
source server/.env
set +a
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

Serve the frontend separately, for example:

```bash
python3 -m http.server 5173 -d product
```

Then open `http://127.0.0.1:5173`.

Use the same hostname for the frontend and API during local development. For example, if you open
`http://127.0.0.1:5173`, the frontend calls `http://127.0.0.1:8000`; if you open
`http://localhost:5173`, it calls `http://localhost:8000`. This keeps the login cookie available
for later API requests.
