
import json
import os
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

class GeminiBudget:
    """Integrates with Google Gemini AI for intelligent budget estimation."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            print("Warning: No GEMINI_API_KEY found. Using mock responses.")
        else:
            genai.configure(api_key=self.api_key)
        self.last_call_time = 0

    def _respect_rate_limit(self):
        elapsed = time.time() - self.last_call_time
        if elapsed < 4:
            time.sleep(4 - elapsed)
        self.last_call_time = time.time()

    def create_budget_prompt(self, schedule_data: Dict[str, Any]) -> str:
        """Creates a prompt for Gemini to generate daily budget estimates."""
        scenes_by_date = {}
        for day_schedule in schedule_data.get('daily_schedules', []):
            date = day_schedule.get('date', 'TBD')
            if date == 'TBD': continue
            scenes_by_date[date] = day_schedule.get('scenes', [])

        prompt = """
        You are an expert film production budget estimator. Based on the following daily shooting schedule, generate a detailed daily budget estimation in JSON format.

        **Schedule:**
        """
        for date, scenes in scenes_by_date.items():
            prompt += f"\n**Date: {date}**\n"
            for scene in scenes:
                prompt += f"- Scene {scene.get('scene_number')}: {scene.get('scene_title')} at {scene.get('location')} ({scene.get('time_of_day')})\n"

        prompt += """
        **Instructions:**
        Generate a JSON object where each key is a date string (YYYY-MM-DD) from the schedule.
        For each date, provide estimates for the following fields:
        - junior_artist_wage: Estimated cost for junior artists between 10000 to 40000.
        - location_rent: Estimated rent for the location between 10000 to 75000.
        - travel_expense: Estimated travel costs between 7000 to 30000.
        - food_expense: Estimated food costs for cast and crew between 8000 to 15000.
        - art_costume_expense: Estimated costs for art department and costumes.

        Calculate the `total_estimated` for each day.

        **Output Format (JSON only):**
        ```json
        {
          "YYYY-MM-DD": {
            "junior_artist_wage": <amount>,
            "location_rent": <amount>,
            "travel_expense": <amount>,
            "food_expense": <amount>,
            "art_costume_expense": <amount>,
            "total_estimated": <total_amount>
          }
        }
        ```
        """
        return prompt

    def call_gemini_api(self, prompt: str) -> Dict[str, Any]:
        """Calls the Gemini API and returns the parsed JSON response."""
        if not self.api_key:
            return {"error": "Gemini API key not provided."}

        self._respect_rate_limit()
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            response = model.generate_content(prompt)

            if not response.text:
                return {"error": "Empty response from Gemini API"}

            text_response = response.text.strip()
            
            json_start = text_response.find('{')
            json_end = text_response.rfind('}') + 1

            if json_start == -1 or json_end == 0:
                return {"error": "No JSON object found in Gemini response", "raw_response": text_response}

            json_str = text_response[json_start:json_end]
            
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                return {"error": f"Failed to decode JSON: {e}", "raw_response": json_str}

        except Exception as e:
            return {"error": f"Error calling Gemini API: {e}"}

    def generate_budget(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generates the budget estimation."""
        prompt = self.create_budget_prompt(schedule_data)
        return self.call_gemini_api(prompt)
