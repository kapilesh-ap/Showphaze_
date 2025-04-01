from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from agent import query_agent
from db_agent import run_agents as db_query_agent
from fastapi import UploadFile, File
from fastapi.responses import JSONResponse
import whisper
import os
import shutil
from agent import query_voice_command  # this is your autogen function


app = FastAPI()

# CORS (For frontend communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



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

@app.post("/voice-command")
async def handle_voice_upload(file: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Transcribe audio using Whisper
        model = whisper.load_model("base")
        result = model.transcribe(temp_filename)
        transcription = result["text"]
        print(f"📝 Transcription: {transcription}")

        # Send transcription to AutoGen pipeline
        response = await query_voice_command(transcription)

        # Clean up
        os.remove(temp_filename)

        return JSONResponse(content={"transcription": transcription, "response": response})
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
