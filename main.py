from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from agent import query_agent
from db_agent import run_agents as db_query_agent

app = FastAPI()

# CORS (For frontend communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/query")
async def query_agent_end(request: Request):
    data = await request.json()
    query = data.get('query')
    response = await query_agent(query)
    return {"data": response}

@app.post("/get_event_details")
async def get_event_details(request: Request):
    data = await request.json()
    query = data.get('query')
    response = await db_query_agent(query)
    return {"data": response}
