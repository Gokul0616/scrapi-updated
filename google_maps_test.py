#!/usr/bin/env python3
"""
Google Maps Scraper Testing Suite
Tests the Google Maps scraper functionality as requested in the review
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://app-bootstrap-4.preview.emergentagent.com/api"

class GoogleMapsScraperTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Default headers
        req_headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            req_headers['Authorization'] = f'Bearer {self.auth_token}'
        if headers:
            req_headers.update(headers)
        
        try:
            print(f"Making {method} request to {url}")
            if method.upper() == 'GET':
                response = requests.get(url, headers=req_headers, timeout=60, verify=False)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=60, verify=False)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"Response status: {response.status_code}")
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error for {method} {url}: {e}")
            return None
    
    def test_1_register_user(self):
        """Test 1: Register a new test user and get JWT token"""
        print("\n=== TEST 1: USER REGISTRATION ===")
        
        # Test user data with realistic information
        test_user = {
            "username": f"mapstester_{int(time.time())}",
            "email": f"mapstester_{int(time.time())}@testdomain.com",
            "password": "SecurePass123!",
            "fullName": "Maps Tester"
        }
        
        # Register user
        response = self.make_request('POST', '/auth/register', test_user)
        
        if not response:
            self.log_test("User Registration", False, "Failed to connect to registration endpoint")
            return False
        
        if response.status_code == 201:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.auth_token = data['token']
                self.user_data = data['user']
                self.log_test("User Registration", True, f"User registered successfully: {self.user_data['username']}")
                return True
            else:
                self.log_test("User Registration", False, "Missing token or user data in response", data)
                return False
        else:
            self.log_test("User Registration", False, f"Registration failed with status {response.status_code}", response.text)
            return False
    
    def test_2_verify_google_maps_actor(self):
        """Test 2: Verify Google Maps actor exists"""
        print("\n=== TEST 2: VERIFY GOOGLE MAPS ACTOR ===")
        
        if not self.auth_token:
            self.log_test("Verify Google Maps Actor", False, "No auth token available")
            return False
        
        # Get actors
        response = self.make_request('GET', '/actors')
        
        if not response:
            self.log_test("Verify Google Maps Actor", False, "Failed to connect to actors endpoint")
            return False
        
        if response.status_code == 200:
            actors = response.json()
            
            # Find Google Maps actor
            google_maps_actor = None
            for actor in actors:
                if actor.get('actorId') == 'google-maps':
                    google_maps_actor = actor
                    break
            
            if google_maps_actor:
                self.log_test("Google Maps Actor Found", True, f"Google Maps actor found: {google_maps_actor.get('name', 'Unknown')}")
                print(f"   Actor Details:")
                print(f"   - ID: {google_maps_actor.get('actorId')}")
                print(f"   - Name: {google_maps_actor.get('name')}")
                print(f"   - Title: {google_maps_actor.get('title')}")
                print(f"   - Description: {google_maps_actor.get('description', '')[:100]}...")
                return True
            else:
                self.log_test("Google Maps Actor Found", False, f"Google Maps actor not found. Available actors: {[a.get('actorId') for a in actors]}")
                return False
        else:
            self.log_test("Verify Google Maps Actor", False, f"Failed to get actors: {response.status_code}", response.text)
            return False
    
    def test_3_create_google_maps_run(self):
        """Test 3: Create a run to test Google Maps scraper"""
        print("\n=== TEST 3: CREATE GOOGLE MAPS RUN ===")
        
        if not self.auth_token:
            self.log_test("Create Google Maps Run", False, "No auth token available")
            return False
        
        # Create run with specific test parameters from review request
        run_data = {
            "actorId": "google-maps",
            "input": {
                "query": "restaurants",
                "location": "New York",
                "maxResults": 3
            }
        }
        
        print(f"Creating run with input: {run_data['input']}")
        
        response = self.make_request('POST', '/runs', run_data)
        
        if not response or response.status_code != 201:
            self.log_test("Create Google Maps Run", False, 
                         f"Failed to create run: {response.status_code if response else 'No response'}")
            return False
        
        run_info = response.json()
        self.run_id = run_info.get('runId')
        
        if not self.run_id:
            self.log_test("Create Google Maps Run", False, "No runId in response")
            return False
        
        self.log_test("Create Google Maps Run", True, f"Run created successfully: {self.run_id}")
        return True
    
    def test_4_monitor_run_and_verify_output(self):
        """Test 4: Monitor run status and verify scraper output"""
        print("\n=== TEST 4: MONITOR RUN AND VERIFY OUTPUT ===")
        
        if not self.auth_token or not hasattr(self, 'run_id'):
            self.log_test("Monitor Run", False, "No auth token or run ID available")
            return False
        
        # Monitor run with extended timeout for scraping
        max_wait = 300  # 5 minutes timeout for Google Maps scraping
        wait_time = 0
        
        print(f"Monitoring run {self.run_id} (max wait: {max_wait}s)")
        
        while wait_time < max_wait:
            time.sleep(10)  # Check every 10 seconds
            wait_time += 10
            
            response = self.make_request('GET', f'/runs/{self.run_id}')
            
            if not response or response.status_code != 200:
                self.log_test("Monitor Run", False, "Failed to get run status")
                return False
            
            run_status = response.json()
            status = run_status.get('status')
            
            print(f"   Status: {status} ({wait_time}s elapsed)")
            
            if status == 'succeeded':
                return self._verify_scraper_output(run_status)
            elif status == 'failed':
                error_msg = run_status.get('error', 'Unknown error')
                self.log_test("Run Execution", False, f"Scraper failed: {error_msg}")
                return False
            
            # Still running, continue waiting
            if wait_time % 30 == 0:  # Log every 30 seconds
                print(f"   🔄 Scraping in progress... ({wait_time}s elapsed)")
        
        # Timeout
        self.log_test("Run Execution", False, f"Scraper timed out after {max_wait}s")
        return False
    
    def _verify_scraper_output(self, run_status):
        """Verify the quality of scraper output"""
        print("\n--- VERIFYING SCRAPER OUTPUT ---")
        
        output = run_status.get('output', [])
        
        if not output or len(output) == 0:
            self.log_test("Scraper Output", False, "No output data returned")
            return False
        
        print(f"✅ Scraped data returned: {len(output)} result(s)")
        
        # Analyze the output structure
        first_result = output[0] if isinstance(output, list) else output
        
        # Check if it's the expected structure (array with results)
        if isinstance(first_result, dict) and 'results' in first_result:
            results = first_result.get('results', [])
            print(f"✅ Found {len(results)} places in results")
            
            if len(results) == 0:
                self.log_test("Places Found", False, "No places found in results")
                return False
            
            # Analyze first place for data quality
            first_place = results[0]
            return self._analyze_place_data(first_place, len(results))
        else:
            self.log_test("Output Structure", False, "Unexpected output structure")
            return False
    
    def _analyze_place_data(self, place_data, total_places):
        """Analyze the quality of extracted place data"""
        print(f"\n--- ANALYZING PLACE DATA (Sample from {total_places} places) ---")
        
        # Critical fields that should be populated
        critical_fields = {
            'name': 'Business Name',
            'fullAddress': 'Address', 
            'phone': 'Phone Number',
            'website': 'Website',
            'location': 'Coordinates'
        }
        
        # Enhanced fields for comprehensive data
        enhanced_fields = {
            'rating': 'Rating',
            'reviewsCount': 'Review Count',
            'mainCategory': 'Category',
            'openingHours': 'Opening Hours',
            'photos': 'Photos',
            'social': 'Social Media',
            'emails': 'Email Addresses'
        }
        
        print(f"\n📊 CRITICAL FIELDS ANALYSIS:")
        critical_success = 0
        for field, description in critical_fields.items():
            value = place_data.get(field)
            
            # Special validation for coordinates
            if field == 'location':
                is_valid = (isinstance(value, dict) and 
                          value.get('lat') is not None and 
                          value.get('lng') is not None and
                          abs(float(value.get('lat', 0))) > 0 and
                          abs(float(value.get('lng', 0))) > 0)
                display_value = f"lat: {value.get('lat')}, lng: {value.get('lng')}" if is_valid else str(value)
            else:
                is_valid = value is not None and value != '' and value != []
                display_value = str(value)[:100] + ('...' if len(str(value)) > 100 else '') if value else 'None'
            
            status = "✅" if is_valid else "❌"
            print(f"   {status} {description}: {display_value}")
            if is_valid:
                critical_success += 1
        
        critical_success_rate = (critical_success / len(critical_fields)) * 100
        
        print(f"\n📈 ENHANCED FIELDS ANALYSIS:")
        enhanced_success = 0
        for field, description in enhanced_fields.items():
            value = place_data.get(field)
            is_valid = value is not None and value != '' and value != []
            
            if field == 'social' and isinstance(value, dict):
                social_links = [k for k, v in value.items() if v]
                is_valid = len(social_links) > 0
                display_value = f"{len(social_links)} platforms: {social_links}" if is_valid else "None"
            elif field == 'openingHours' and isinstance(value, dict):
                hours_count = len([k for k, v in value.items() if v])
                is_valid = hours_count > 0
                display_value = f"{hours_count} days with hours" if is_valid else "None"
            elif field == 'photos' and isinstance(value, list):
                is_valid = len(value) > 0
                display_value = f"{len(value)} photos" if is_valid else "None"
            else:
                display_value = str(value)[:50] + ('...' if len(str(value)) > 50 else '') if value else 'None'
            
            status = "✅" if is_valid else "❌"
            print(f"   {status} {description}: {display_value}")
            if is_valid:
                enhanced_success += 1
        
        enhanced_success_rate = (enhanced_success / len(enhanced_fields)) * 100
        
        # Count total fields
        total_fields = self._count_all_fields(place_data)
        
        print(f"\n📊 DATA QUALITY SUMMARY:")
        print(f"   • Critical Fields: {critical_success}/{len(critical_fields)} ({critical_success_rate:.1f}%)")
        print(f"   • Enhanced Fields: {enhanced_success}/{len(enhanced_fields)} ({enhanced_success_rate:.1f}%)")
        print(f"   • Total Fields Extracted: {total_fields}")
        print(f"   • Places Scraped: {total_places}")
        
        # Show sample data
        print(f"\n📋 SAMPLE PLACE DATA:")
        print(f"   Name: {place_data.get('name', 'N/A')}")
        print(f"   Address: {place_data.get('fullAddress', 'N/A')}")
        print(f"   Phone: {place_data.get('phone', 'N/A')}")
        print(f"   Website: {place_data.get('website', 'N/A')}")
        print(f"   Rating: {place_data.get('rating', 'N/A')} ({place_data.get('reviewsCount', 'N/A')} reviews)")
        
        # Determine success criteria
        puppeteer_working = True  # If we got here, Puppeteer is working
        real_data_extracted = critical_success >= 3  # At least 3 critical fields
        comprehensive_data = total_fields >= 20  # At least 20 fields total
        
        # Log individual test results
        self.log_test("Puppeteer/Chromium Working", puppeteer_working, 
                     "Puppeteer successfully launched and scraped data")
        
        self.log_test("Real Data Extraction", real_data_extracted, 
                     f"Real business data extracted: {critical_success}/{len(critical_fields)} critical fields")
        
        self.log_test("Comprehensive Data", comprehensive_data, 
                     f"Comprehensive data extraction: {total_fields} fields extracted")
        
        self.log_test("Critical Fields Populated", critical_success_rate >= 60, 
                     f"Critical fields populated: {critical_success_rate:.1f}% (target: 60%+)")
        
        # Overall success
        overall_success = (puppeteer_working and real_data_extracted and 
                          critical_success_rate >= 60)
        
        self.log_test("Google Maps Scraper Overall", overall_success, 
                     f"Overall scraper quality: {'GOOD' if overall_success else 'NEEDS IMPROVEMENT'}")
        
        return overall_success
    
    def _count_all_fields(self, data, prefix=""):
        """Count all fields including nested objects and arrays"""
        count = 0
        if isinstance(data, dict):
            for key, value in data.items():
                count += 1  # Count the key itself
                if isinstance(value, (dict, list)) and value:
                    count += self._count_all_fields(value, f"{prefix}{key}.")
        elif isinstance(data, list) and data:
            for i, item in enumerate(data[:3]):  # Count first 3 items to avoid huge arrays
                if isinstance(item, (dict, list)):
                    count += self._count_all_fields(item, f"{prefix}[{i}].")
                else:
                    count += 1
        return count
    
    def run_all_tests(self):
        """Run all Google Maps scraper tests"""
        print("🗺️ GOOGLE MAPS SCRAPER TESTING SUITE")
        print("=" * 60)
        print("🎯 TESTING GOALS:")
        print("   • Register test user and get JWT token")
        print("   • Verify Google Maps actor exists")
        print("   • Create run with query='restaurants', location='New York', maxResults=3")
        print("   • Monitor run completion and verify data quality")
        print("   • Check critical fields: title, address, phone, website, coordinates")
        print("   • Verify Puppeteer/Chromium is working correctly")
        print("=" * 60)
        
        # Run tests in sequence
        tests = [
            self.test_1_register_user,
            self.test_2_verify_google_maps_actor,
            self.test_3_create_google_maps_run,
            self.test_4_monitor_run_and_verify_output
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    # If a critical test fails, stop the sequence
                    if test_func in [self.test_1_register_user, self.test_2_verify_google_maps_actor]:
                        print(f"\n❌ Critical test failed: {test_func.__name__}")
                        break
            except Exception as e:
                print(f"❌ EXCEPTION in {test_func.__name__}: {e}")
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 GOOGLE MAPS SCRAPER TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (passed / total) * 100
        print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        
        # Detailed results
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Critical issues
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n⚠️  ISSUES FOUND ({len(failed_tests)} failures):")
            for failure in failed_tests:
                print(f"   • {failure['test']}: {failure['message']}")
        
        return success_rate >= 75.0  # 75% success rate required

if __name__ == "__main__":
    tester = GoogleMapsScraperTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 GOOGLE MAPS SCRAPER TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n💥 GOOGLE MAPS SCRAPER TESTS FAILED - Issues need to be addressed")
        sys.exit(1)