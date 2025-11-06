#!/usr/bin/env python3
import requests
import json
import time

# Configuration
BACKEND_URL = "https://app-bootstrap-4.preview.emergentagent.com/api"

def register_and_test():
    # Register a new user
    test_user = {
        "username": f"testuser_{int(time.time())}",
        "email": f"test_{int(time.time())}@example.com", 
        "password": "testpassword123",
        "fullName": "Test User"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=test_user, verify=False)
    if response.status_code != 201:
        print(f"Registration failed: {response.status_code}")
        return
    
    data = response.json()
    auth_token = data['token']
    
    # Create Google Maps run
    run_data = {
        "actorId": "google-maps",
        "input": {
            "query": "restaurant",
            "location": "New York", 
            "maxResults": 3
        }
    }
    
    headers = {'Authorization': f'Bearer {auth_token}'}
    response = requests.post(f"{BACKEND_URL}/runs", json=run_data, headers=headers, verify=False)
    
    if response.status_code != 201:
        print(f"Run creation failed: {response.status_code}")
        return
    
    run_info = response.json()
    run_id = run_info['runId']
    print(f"Created run: {run_id}")
    
    # Wait for completion
    max_wait = 120
    wait_time = 0
    
    while wait_time < max_wait:
        time.sleep(3)
        wait_time += 3
        
        response = requests.get(f"{BACKEND_URL}/runs/{run_id}", headers=headers, verify=False)
        if response.status_code != 200:
            print(f"Failed to get run status: {response.status_code}")
            return
        
        run_status = response.json()
        status = run_status.get('status')
        
        if status == 'succeeded':
            output = run_status.get('output', [])
            if output:
                print(f"\n=== COMPREHENSIVE DATA EXTRACTED ({len(output)} places) ===")
                first_place = output[0]
                
                print(f"\n📍 PLACE 1: {first_place.get('title', 'Unknown')}")
                print(f"Category: {first_place.get('categoryName', 'N/A')}")
                print(f"Address: {first_place.get('address', 'N/A')}")
                print(f"Phone: {first_place.get('phone', 'N/A')}")
                print(f"Website: {first_place.get('website', 'N/A')}")
                print(f"Rating: {first_place.get('totalScore', 'N/A')} ({first_place.get('reviewsCount', 0)} reviews)")
                
                print(f"\n=== ALL EXTRACTED FIELDS ({len(first_place)} total) ===")
                for i, key in enumerate(sorted(first_place.keys()), 1):
                    value = first_place[key]
                    if isinstance(value, (dict, list)) and len(str(value)) > 100:
                        print(f"{i:2d}. {key}: {type(value).__name__} ({len(value) if hasattr(value, '__len__') else 'complex'})")
                    else:
                        print(f"{i:2d}. {key}: {value}")
                
                # Check for 50+ fields requirement
                if len(first_place) >= 50:
                    print(f"\n✅ REQUIREMENT MET: {len(first_place)} fields extracted (50+ required)")
                else:
                    print(f"\n⚠️  REQUIREMENT NOT MET: {len(first_place)} fields extracted (50+ required)")
                
                return True
            else:
                print("No output data")
                return False
                
        elif status == 'failed':
            error_msg = run_status.get('error', 'Unknown error')
            print(f"Run failed: {error_msg}")
            return False
        
        if wait_time % 15 == 0:
            print(f"Waiting... ({wait_time}s, status: {status})")
    
    print("Timeout waiting for run completion")
    return False

if __name__ == "__main__":
    register_and_test()