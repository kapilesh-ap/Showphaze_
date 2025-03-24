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


# Load environment variables
load_dotenv()

# Configuration for the OpenAI model
config_list = [
    {
        'model': os.getenv('LLM_MODEL'),
        'api_key': os.getenv('LLM_API_KEY')
    }
]

llm_config = {
    "config_list": config_list,
    "temperature": int(os.getenv('LLM_TEMPERATURE')),
}



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
    return user_proxy.last_message()["content"]
   
