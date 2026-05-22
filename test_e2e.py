import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"
HEADERS = {"Authorization": "Bearer test-token"}

async def test_intelligence():
    print("\n--- Testing Feature 3: Intelligence Dashboard ---")
    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(f"{BASE_URL}/intelligence/alerts", headers=HEADERS)
        print(f"Status: {response.status_code}")
        try:
            data = response.json()
            print("Alerts generated:", len(data.get("data", [])))
            print(json.dumps(data.get("data", [])[:1], indent=2))
        except Exception as e:
            print("Failed to parse JSON:", e, response.text)

async def test_chat_prescribe():
    print("\n--- Testing Feature 1: Chat Prescribe ---")
    payload = {
        "messages": [
            {"role": "user", "content": "I have a small 2x2m balcony spot that gets afternoon sun."}
        ],
        "coordinates": {"latitude": 12.9716, "longitude": 77.5946},
        "ward_name": "Koramangala"
    }
    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(f"{BASE_URL}/prescribe/chat", json=payload, headers=HEADERS)
        print(f"Status: {response.status_code}")
        try:
            data = response.json()
            print("AI Reply:", data.get("reply", "")[:150] + "...")
            print("Is Complete:", data.get("is_complete"))
            if data.get("prescription"):
                print("Primary Rec:", data["prescription"]["primary_recommendation"]["common_name"])
        except Exception as e:
            print("Failed to parse JSON:", e, response.text)

async def test_carbon_gamification():
    print("\n--- Testing Feature 4: Carbon Gamification ---")
    payload = {
        "species_common_name": "Neem",
        "tree_age_years": 5,
        "num_trees": 1,
        "property_value_inr": 1000000
    }
    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(f"{BASE_URL}/carbon/simulate", json=payload, headers=HEADERS)
        print(f"Status: {response.status_code}")
        try:
            data = response.json()
            print("Gamification Output:")
            print("CO2 Total:", data.get("total_annual_co2_kg"), "kg")
            print("Narrative:", data.get("gemini_narrative", "")[:100] + "...")
        except Exception as e:
            print("Failed to parse JSON:", e, response.text)

async def test_vision_verification():
    print("\n--- Testing Feature 2: Vision Verification ---")
    # For a real test, we would upload an image, but we can just check if the old verify endpoint accepts standard mock files or if we just test the schema structure by mocking the vision call. 
    # Since we can't easily send a multipart image here without a real file, we'll skip the file upload via script or create a dummy image.
    with open("dummy.png", "wb") as f:
        f.write(b"fake png data")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        with open("dummy.png", "rb") as f:
            files = {"image": ("dummy.png", f, "image/png")}
            data = {
                "spot_id": "test-spot-123"
            }
            response = await client.post(f"{BASE_URL}/verify-growth", data=data, files=files, headers=HEADERS)
            print(f"Status: {response.status_code}")
            try:
                res_data = response.json()
                print("Vision Status:", res_data.get("status"))
                print("Vision Message:", res_data.get("message"))
            except Exception as e:
                print("Failed to parse JSON:", e, response.text)

async def main():
    await test_intelligence()
    await test_chat_prescribe()
    await test_carbon_gamification()
    await test_vision_verification()

if __name__ == "__main__":
    asyncio.run(main())
