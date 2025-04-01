import os
from openai import OpenAI
import json
import autogen
import asyncio
from pathlib import Path
import chromadb
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from autogen.agentchat.contrib.retrieve_assistant_agent import RetrieveAssistantAgent
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
import re

# Load environment variables
load_dotenv()

# Configuration for the OpenAI modelF
config_list = [
    {
        'model': os.getenv('LLM_MODEL'),
        'api_key': "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"
    }
]

llm_config = {
    "config_list": config_list,
    "temperature": int(os.getenv('LLM_TEMPERATURE')),
}


async def extract_json_response(agent):
    """Extracts JSON response from agent's chat history."""
    json_response = None
    for msg in agent.chat_messages.values():
        for m in msg:
            content = m.get("content", "")
            try:
                # Check for JSON inside triple backticks (markdown)
                code_blocks = re.findall(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", content, re.DOTALL)
                for block in code_blocks:
                    try:
                        json_response = json.loads(block)
                        return json_response
                    except json.JSONDecodeError:
                        continue

                # Fallback: check for raw JSON array or object
                if content.startswith("[") or content.startswith("{"):
                    json_response = json.loads(content)
                    return json_response

            except Exception:
                continue
    return None


# Main function to handle user queries
async def query_agent(task):

    # Step 2: Pass the Perplexity output to the agent to extract tickers
    assistant = autogen.AssistantAgent(
        name="assistant",
        system_message="""
        Your main goal is to identify which fields are mentioned in the context shared to you. Mention it properly in conversable way.
        EXAMPLE Fields to look for in context    {
                                                    "positionId": ,
                                                    "positionName": ,
                                                    "startDate": ,
                                                    "timeIn": ,
                                                    "timeOut": ,
                                                    "tbd": ,
                                                    "numberOfHours": ,
                                                    "quantity": ,
                                                    "overNightShift": ,
                                                    "selectOption": ,
                                                    "additionalComments": "",
                                                    "attire": 
                                                }

        Give your response in json format.
        
        EXAMPLE Response:
        {"position_name":["waiter","chef","florist"],"quantity":[1,2,1],"start_date":["2023-11-25","2023-11-25","2023-11-25"]}
        
        """,
        llm_config=llm_config
    )

    user_proxy = autogen.UserProxyAgent(
        name="user_proxy",
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=1,
    )

    # Start chat to extract tickers
    await user_proxy.a_initiate_chat(assistant, message=task, max_turns=1)
        # Get the JSON data
    json_data = await extract_json_response(user_proxy)
 
    if json_data:
        print("\nExtracted JSON Response:")
        return json_data
    else:
        print("No JSON response found")
 


async def query_voice_command(voice_text: str):
    """
    Processes voice commands and extracts structured information.
    This can be used to convert natural voice instructions into structured JSON.
    """
    assistant = autogen.AssistantAgent(
        name="voice_command_agent",
        system_message="""
        You are a helpful assistant that processes voice-based commands related to job bookings and extracts structured data.
        Your goal is to extract job booking intent from the input and return a JSON with:
        - position_name (array)
        - quantity (array)
        - start_date (array)
        - timeIn (optional)
        - timeOut (optional)
        - tbd, overnight_shift, number_of_hours, etc. if mentioned.

        Format your response **only** as a JSON object. No text or explanations.

        Example input: "Book 4 servers and 1 bartender for April 1st from 6pm to midnight"
        Example output:
        {
          "position_name": ["server", "bartender"],
          "quantity": [4, 1],
          "start_date": ["2024-04-01", "2024-04-01"],
          "timeIn": ["2024-04-01T18:00:00", "2024-04-01T18:00:00"],
          "timeOut": ["2024-04-02T00:00:00", "2024-04-02T00:00:00"]
        }
        """,
        llm_config=llm_config
    )

    user_proxy = autogen.UserProxyAgent(
        name="user_proxy",
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=1,
    )

    await user_proxy.a_initiate_chat(assistant, message=voice_text, max_turns=1)
    json_data = await extract_json_response(user_proxy)

    if json_data:
        print("Extracted JSON from voice:", json_data)
        return json_data
    else:
        print("No JSON found for voice input.")
        return {"error": "Could not extract structured data from voice command."}



    
   
