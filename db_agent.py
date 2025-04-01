import os
import aiohttp
import asyncio
import urllib.parse
import json
from datetime import datetime, timedelta
from typing import Union, List
from dateutil import parser

import autogen
from fuzzywuzzy import process
from dotenv import load_dotenv
load_dotenv()
 
config_list = [
    {
        'model': os.getenv('LLM_MODEL'),
        'api_key': "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"
    }
]
 
llm_config = {
    "config_list": config_list,
    "temperature": float(os.getenv('LLM_TEMPERATURE', 0.7)),  # Default fallback temperature
    "functions": [
        {
            "name": "fetch_position_by_name",
            "description": "Fetches position data from the Showphaze API using a position name with fuzzy matching. Also use the closest description match between the professions not just names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "position_name": {
                        "type": "string",
                        "description": "The name of the position to fetch."
                    }
                },
                "required": ["position_name"]
            }
        },
        {
            "name": "create_formatted_position_jsons",
            "description": "Creates structured JSON responses for multiple position entries with fuzzy-matched job positions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "position_name": {"type": "array", "items": {"type": "string"}, "description": "List of position names."},
                    "start_date": {"type": "array", "items": {"type": "string"}, "description": "List of start dates."},
                    "quantity": {"type": "array", "items": {"type": "integer"}, "description": "List of quantities for each position."},
                    "tbd": {"type": "array", "items": {"type": "boolean"}, "description": "TBD status list."},
                    "overnight_shift": {"type": "array", "items": {"type": "boolean"}, "description": "Overnight shift list."},
                    "select_option": {"type": "array", "items": {"type": "string"}, "description": "Select options list."},
                    "complexity": {"type": "array", "items": {"type": "string"}, "description": "Complexity levels."},
                    "number_of_hours": {"type": "array", "items": {"type": "string"}, "description": "Number of hours list."},
                    "additional_comments": {"type": "array", "items": {"type": "string"}, "description": "Additional comments."},
                    "attire": {"type": "array", "items": {"type": "string"}, "description": "Attire list."},
                    "position_description": {"type": "string", "description": "A brief description of the position."},
                    "position_brief": {"type": "string", "description": "A short summary of the position."},
                    "equipment_required": {"type": "array", "items": {"type": "string"}, "description": "Equipment required for the job."},
                    "tag": {"type": "array", "items": {"type": "string"}, "description": "Tags associated with the position."},
                    "default_rate": {"type": "integer", "description": "Standard hourly rate for the position. Fill between 20-50"},
                    "contractor_rate": {"type": "integer", "description": "Hourly rate offered to contractors. Fill between 20-50, less than default rate"},
                            "timeIn": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Start time in ISO format (e.g., 2024-03-21T09:00:00) for each position"
        },
        "timeOut": {
            "type": "array",
            "items": { "type": "string" },
            "description": "End time in ISO format (e.g., 2024-03-21T22:00:00) for each position"
        }

                },
                "required": ["position_name", "start_date", "quantity","timeIn","timeOut"]
            }
        }
    ]
}


async def extract_json_response(agent):
    """Extracts and returns a cleaned JSON array from agent's chat history by removing items with empty 'positionId'."""
    json_response = None

    for msg_list in agent.chat_messages.values():
        for m in msg_list:
            content = m.get("content", "")
            try:
                # Look for JSON array in the message content
                if "[" in content and "]" in content:
                    start = content.find("[")
                    end = content.rfind("]") + 1
                    potential_json = content[start:end]
                    parsed_json = json.loads(potential_json)

                    # Ensure it's a list of dicts
                    if isinstance(parsed_json, list) and all(isinstance(item, dict) for item in parsed_json):
                        # Filter out items where positionId is an empty string
                        cleaned = [item for item in parsed_json if item.get("positionId") != ""]

                        # Only set response if the result is valid
                        if cleaned:
                            json_response = cleaned
            except Exception:
                continue

    return json_response

 
async def fetch_position_by_name(position_name: Union[str, List[str]]) -> str:
    """Fetches multiple positions from Showphaze API with fuzzy logic matching."""
    base_url = "https://devapi-app.showphaze.com/api/v1/fetchPositionByName"
 
    if isinstance(position_name, str):
        position_names = [position_name]
    else:
        position_names = position_name
 
    results = []
 
    async with aiohttp.ClientSession() as session:
        for name in position_names:
            encoded_name = urllib.parse.quote(name)
            url = f"{base_url}?name={encoded_name}"
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        best_match = fuzzy_match_position(name, data.get("data", []))
                        if best_match:
                            results.append(best_match)
                        else:
                            results.append({"error": f"No match found for {name}"})
                    else:
                        results.append({"error": f"API Error: {response.status} for {name}"})
            except Exception as e:
                results.append({"error": f"Exception: {str(e)} for {name}"})
 
    return json.dumps({"success": True, "data": results} if results else {"error": "No positions found."})
 
# Function to apply fuzzy logic for best position match
def fuzzy_match_position(position_name: str, positions: List[dict]) -> dict:
    """Finds the closest matching position using fuzzy logic."""
    if not positions:
        return None
 
    position_names = [pos["positionName"] for pos in positions if "positionName" in pos]
    best_match, score = process.extractOne(position_name, position_names)
   
    if score > 75:  # Threshold for good match
        for pos in positions:
            if pos["positionName"] == best_match:
                return pos
    return None
 


def normalize_time(t: str) -> str:
    try:
        return parser.parse(t).strftime("%H:%M:%S")
    except:
        return ""



# Main function
async def create_formatted_position_jsons(
    position_name: Union[str, List[str]],
    start_date: Union[str, List[str]],
    quantity: Union[int, List[int]],
    timeIn: Union[str, List[str]] = "",
    timeOut: Union[str, List[str]] = "",
    tbd: Union[bool, List[bool]] = False,
    overnight_shift: Union[bool, List[bool]] = False,
    select_option: Union[str, List[str]] = "NA",
    complexity: Union[str, List[str]] = "low",
    number_of_hours: Union[str, List[str]] = "",
    additional_comments: Union[str, List[str]] = "",
    attire: Union[str, List[str]] = "Show Blacks",
    default_rate: Union[int, List[int]] = 0,
    contractor_rate: Union[int, List[int]] = 0,
    position_description: str = "",
    position_brief: str = "",
    equipment_required: Union[str, List[str]] = "",
    tag: Union[str, List[str]] = ""
) -> str:
    
    # Normalize input
    position_names = [position_name] if isinstance(position_name, str) else position_name
    start_dates = [start_date] * len(position_names) if isinstance(start_date, str) else start_date
    quantities = [quantity] * len(position_names) if isinstance(quantity, int) else quantity
    total_entries = sum(quantities)
    # Ensure timeIn and timeOut have defaults if empty
    if not timeIn or len(timeIn) < len(position_names):
        timeIn = [""] * len(position_names)
    if not timeOut or len(timeOut) < len(position_names):
        timeOut = [""] * len(position_names)



    def expand(val, name):
        return val if isinstance(val, list) else [val] * total_entries

    # Expanded parameter list
    param_lists = {
        "tbd": expand(tbd, "tbd"),
        "overnight_shift": expand(overnight_shift, "overnight_shift"),
        "select_option": expand(select_option, "select_option"),
        "complexity": expand(complexity, "complexity"),
        "number_of_hours": expand(number_of_hours, "number_of_hours"),
        "additional_comments": expand(additional_comments, "additional_comments"),
        "attire": expand(attire, "attire"),
        "default_rate": expand(default_rate, "default_rate"),
        "contractor_rate": expand(contractor_rate, "contractor_rate"),
        "timeIn": expand(timeIn, "timeIn"),
        "timeOut": expand(timeOut, "timeOut")
    }

    for key, val in param_lists.items():
        if len(val) != total_entries:
            param_lists[key] = [val[min(i, len(val) - 1)] for i in range(total_entries)]


       # ⛏️ FIX: Expand timeIn and timeOut correctly per quantity
    expanded_timeIn = []
    expanded_timeOut = []

    for i, qty in enumerate(quantities):
        expanded_timeIn += [timeIn[i]] * qty
        expanded_timeOut += [timeOut[i]] * qty

    param_lists["timeIn"] = [parser.parse(t).strftime("%H:%M:%S") if t else "" for t in expanded_timeIn]
    param_lists["timeOut"] = [parser.parse(t).strftime("%H:%M:%S") if t else "" for t in expanded_timeOut]


    # Fetch metadata
    position_data_str = await fetch_position_by_name(position_names)
    position_data = json.loads(position_data_str)

    if not position_data.get("success") or not position_data.get("data"):
        return json.dumps({"error": "No position data found"})

    formatted_jsons = []
    entry_index = 0

    for pos_idx, position_info in enumerate(position_data["data"]):
        pos_quantity = quantities[pos_idx]
        pos_start_date = start_dates[pos_idx]

        for _ in range(pos_quantity):
            date_obj = datetime.strptime(pos_start_date, "%Y-%m-%d")
            current_tbd = param_lists["tbd"][entry_index]
            current_overnight = param_lists["overnight_shift"][entry_index]

            # Normalize time input
            user_time_in = normalize_time(param_lists["timeIn"][entry_index])
            user_time_out = normalize_time(param_lists["timeOut"][entry_index])
            api_time_in = position_info.get("timeIn", "")
            api_time_out = position_info.get("timeOut", "")

            time_in_val = (
                "TBD" if current_tbd else
                (f"{pos_start_date}T{user_time_in}" if user_time_in else
                api_time_in if api_time_in else f"{pos_start_date}T09:00:00")
            )

            time_out_val = (
                "TBD" if current_tbd else
                (f"{pos_start_date}T{user_time_out}" if user_time_out else
                api_time_out if api_time_out else f"{pos_start_date}T17:00:00")
            )


            # Adjust for overnight
            if current_overnight and not current_tbd:
                out_date = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
                time_out_val = f"{out_date}T06:00:00"

            # Build position entry
            formatted_jsons.append({
                "positionId": position_info.get("Id", ""),
                "positionName": position_info.get("positionName", ""),
                "startDate": pos_start_date,
                "timeIn": time_in_val,
                "timeOut": time_out_val,
                "tbd": current_tbd,
                "numberOfHours": param_lists["number_of_hours"][entry_index],
                "quantity": 1,
                "overNightShift": current_overnight,
                "selectOption": param_lists["select_option"][entry_index],
                "additionalComments": param_lists["additional_comments"][entry_index],
                "attire": param_lists["attire"][entry_index],
                "complexity": param_lists["complexity"][entry_index],
                "position_description": position_info.get("positionDescription", ""),
                "position_brief": position_info.get("positionBrief", ""),
                "equipment_required": position_info.get("equipmentRequired", []),
                "tag": position_info.get("tag", []),
                "default_rate": param_lists["default_rate"][entry_index] or position_info.get("defaultRate", 25),
                "contractor_rate": param_lists["contractor_rate"][entry_index] or position_info.get("contractorRate", 20)
            })

            entry_index += 1

    return json.dumps(formatted_jsons)

 
position_agent = autogen.AssistantAgent(
    name="position_agent",
    llm_config=llm_config,
    system_message="""
You are responsible for analyzing user job booking requests and generating structured input for the `create_formatted_position_jsons` function.

Follow these steps precisely:

1. **Extract all position names and their quantities.**
   - Handle multiple positions in the same sentence (e.g., “3 waiters and 2 chefs”).
   - If quantity is not specified, default to `1`.

2. **Extract other key parameters for each position:**
   - `start_date`: If not given, default to tomorrow’s date (format: YYYY-MM-DD).
   - `timeIn` and `timeOut`: If mentioned, extract and format to `YYYY-MM-DDTHH:mm:ss` using the corresponding date. Else, leave unspecified (they will be pulled from API or defaulted).
   - `tbd`, `overnight_shift`, `attire`, etc.: Include if the user specifies them. Otherwise, default appropriately.
   - `select_option`, `number_of_hours`, `additional_comments`, `complexity`: Default unless specified.

3. **Use API values first, then fall back to defaults:**
   - Do **not** include values like `position_description`, `position_brief`, `equipment_required`, or `tag` unless the user provides them explicitly. These will be fetched from the API.
   - Likewise, do not override `timeIn`, `timeOut`, `default_rate`, or `contractor_rate` unless provided by the user. The API will provide those when available.

4. **Rates:**
   - If the user mentions rate preferences, include them.
   - Otherwise, **use default_rate between 25–45**, and **contractor_rate between 20–40** (always less than default_rate) — but **only if the API doesn’t provide them**.

5. **Ensure correctness:**
   - Match position names exactly as stated by the user (e.g., “female bartender” or “senior chef”).
   - Convert all extracted values into proper types: string, boolean, integer, or array.
   - Handle natural language references to date ranges (e.g., “21st and 30th March”) as individual start dates.

6. **Function Output Handling:**
  After calling `create_formatted_position_jsons`, return its full response **exactly as it is** — do not summarize or reformat the output.
Do not truncate 
for example if my create_formatted_position_jsons response is :

[{"positionId": "66618f3c1aa7cc77fd983ed5", "positionName": "waiter ", "startDate": "2023-11-30", "timeIn": "2023-11-30T09:00:00", "timeOut": "2023-11-30T17:00:00", "tbd": false, "numberOfHours": "", "quantity": 1, "overNightShift": false, "selectOption": "NA", "additionalComments": "", "attire": "Show Blacks", "complexity": "low", "position_description": "Responsible to serve food to Guest", "position_brief": "Responsible to serve food to Guest", "equipment_required": ["Uniform", "utensils ", "tray", "catering"], "tag": ["Waiter", "waitress"], "default_rate": 22, "contractor_rate": 16}, {"positionId": "66618f3c1aa7cc77fd983ed5", "positionName": "waiter ", "startDate": "2023-11-30", "timeIn": "2023-11-30T09:00:00", "timeOut": "2023-11-30T17:00:00", "tbd": false, "numberOfHours": "", "quantity": 1, "overNightShift": false, "selectOption": "NA", "additionalComments": "", "attire": "Show Blacks", "complexity": "low", "position_description": "Responsible to serve food to Guest", "position_brief": "Responsible to serve food to Guest", "equipment_required": ["Uniform", "utensils ", "tray", "catering"], "tag": ["Waiter", "waitress"], "default_rate": 22, "contractor_rate": 16}, {"positionId": "66618f3c1aa7cc77fd983ed5", "positionName": "waiter ", "startDate": "2023-11-30", "timeIn": "2023-11-30T09:00:00", "timeOut": "2023-11-30T17:00:00", "tbd": false, "numberOfHours": "", "quantity": 1, "overNightShift": false, "selectOption": "NA", "additionalComments": "", "attire": "Show Blacks", "complexity": "low", "position_description": "Responsible to serve food to Guest", "position_brief": "Responsible to serve food to Guest", "equipment_required": ["Uniform", "utensils ", "tray", "catering"], "tag": ["Waiter", "waitress"], "default_rate": 22, "contractor_rate": 16}, {"positionId": "", "positionName": "", "startDate": "2023-11-30", "timeIn": "2023-11-30T09:00:00", "timeOut": "2023-11-30T17:00:00", "tbd": false, "numberOfHours": "", "quantity": 1, "overNightShift": false, "selectOption": "NA", "additionalComments": "", "attire": "Show Blacks", "complexity": "low", "position_description": "", "position_brief": "", "equipment_required": [], "tag": [], "default_rate": 25, "contractor_rate": 20}]

then the output should also be the above and not get truncated like this :
 [{'Id': '66618f3c1aa7cc77fd983ed5', 'positionName': 'waiter ', 'positionDescription': 'Responsible to serve food to Guest', 'positionBrief': 'Responsible to serve food to Guest', 'equipmentRequired': ['Uniform', 'utensils ', 'tray', 'catering'], 'tag': ['Waiter', 'waitress'], 'defaultRate': 22, 'contractorRate': 16}]

Do not rephrase or explain anything. Do not format in markdown.

Just return the raw JSON array that comes from the function call.

Immediately return TERMINATE after the response.

---

✅ **Example 1**:  
**Input:** “I need 3 waiters and 2 chefs on April 10th from 5pm to 10pm”  
**Output call:**  
```json
{
  "position_name": ["waiter", "chef"],
  "quantity": [3, 2],
  "start_date": ["2024-04-10", "2024-04-10"],
  "timeIn": "2024-04-10T17:00:00",
  "timeOut": "2024-04-10T22:00:00"
}


✅ **Example 2**:  
**Input:** “Get 10 models for April 10th, no specific time yet. It’s TBD”  
**Output call:**  
```json
{
  "position_name": ["model"],
  "quantity": [10],
  "start_date": ["2024-04-10"],
  "tbd": [true]
}

✅ **Example 3**:  
**Input:** “Please book 2 photographers and 1 videographer for March 26th from 9am to 5pm”
**Output call:**  
```json

{
  "position_name": ["photographer", "videographer"],
  "quantity": [2, 1],
  "start_date": ["2024-03-26", "2024-03-26"],
  "timeIn": "2024-03-26T09:00:00",
  "timeOut": "2024-03-26T17:00:00"
}

Give all the data from the function call even if the key are same.
Return TERMINATE when the function call is complete. Do not Give auto replies. After the function call is complete, return TERMINATE.

    """
)
 
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    code_execution_config={"work_dir": "coding"},
    is_termination_msg=lambda x: x is not None and isinstance(x, dict) and "TERMINATE" in str(x.get("content", "")),
    system_message="Execute functions and return TERMINATE when done."
)
 
user_proxy.register_function(
    function_map={
        "fetch_position_by_name": fetch_position_by_name,
        "create_formatted_position_jsons": create_formatted_position_jsons,
    }
)
 
async def run_agents(task):
    await user_proxy.a_initiate_chat(
        position_agent,
        message=task
    )
 
    # Get the JSON data
    json_data = await extract_json_response(user_proxy)
 
    if json_data:
        print("\nExtracted JSON Response:")
        print(json_data)
        return json_data
    else:
        print("No JSON response found")
 
 
 