import sounddevice as sd
import whisper
import scipy.io.wavfile as wavfile
import os
import asyncio
from agent import query_voice_command  # This uses your AutoGen function from agent.py

# File paths
VOICE_FILE = "voice_input.wav"
def record_voice(duration=7, fs=16000):  # 👈 Change sample rate here
    import sounddevice as sd
    import scipy.io.wavfile as wavfile

    sd.default.device = [3, 3]  # 👈 Both input and output set to device 3
    print(f"🎙️ Recording for {duration} seconds on device {sd.default.device}...")

    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    wavfile.write("voice_input.wav", fs, audio)
    print("✅ Recording saved!")

def transcribe_voice():
    print("🧠 Transcribing...")
    model = whisper.load_model("base")  # Use 'tiny', 'base', 'small', 'medium', 'large'
    result = model.transcribe(VOICE_FILE)
    print(f"📝 You said: {result['text']}")
    return result["text"]

async def main_pipeline():
    record_voice(duration=7)  # Adjust duration as needed
    transcription = transcribe_voice()

    # Send to AutoGen (which calls OpenAI to extract JSON)
    structured_response = await query_voice_command(transcription)
    print("\n📦 Structured JSON Output:")
    print(structured_response)

if __name__ == "__main__":
    asyncio.run(main_pipeline())
