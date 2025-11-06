#!/usr/bin/env python3
"""
Backend Testing Suite for Auto-Discovery Architecture and User-Specific Data
Tests authentication, actor registry auto-sync, user-specific data, and access control
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://app-bootstrap-4.preview.emergentagent.com/api"

class BackendTester:
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
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=60, verify=False)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, json=data, headers=req_headers, timeout=60, verify=False)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=60, verify=False)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"Response status: {response.status_code}")
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error for {method} {url}: {e}")
            return None
    
    def test_1_authentication_setup(self):
        """Test 1: Register a test user and get auth token"""
        print("\n=== TEST 1: AUTHENTICATION SETUP ===")
        
        # Test user data
        test_user = {
            "username": f"testuser_{int(time.time())}",
            "email": f"test_{int(time.time())}@example.com",
            "password": "testpassword123",
            "fullName": "Test User"
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
    
    def test_2_actor_registry_auto_sync(self):
        """Test 2: Verify actor registry auto-sync (8 actors from startup)"""
        print("\n=== TEST 2: ACTOR REGISTRY AUTO-SYNC ===")
        
        if not self.auth_token:
            self.log_test("Actor Registry Auto-Sync", False, "No auth token available")
            return False
        
        # Get public actors (default behavior)
        response = self.make_request('GET', '/actors')
        
        if not response:
            self.log_test("Actor Registry Auto-Sync", False, "Failed to connect to actors endpoint")
            return False
        
        if response.status_code == 200:
            actors = response.json()
            
            # Check if we have 8 actors
            if len(actors) == 8:
                self.log_test("Actor Count", True, f"Found {len(actors)} actors as expected")
            else:
                self.log_test("Actor Count", False, f"Expected 8 actors, found {len(actors)}")
            
            # Verify actors have correct properties for public actors
            public_actors = [a for a in actors if a.get('isPublic') == True and a.get('userId') is None]
            
            if len(public_actors) == len(actors):
                self.log_test("Public Actor Properties", True, "All actors are public with userId=null")
            else:
                self.log_test("Public Actor Properties", False, f"Only {len(public_actors)} out of {len(actors)} are properly configured as public")
            
            # Check for expected actor IDs from registry
            expected_actors = ['google-maps', 'amazon', 'instagram', 'website', 'tiktok', 'twitter', 'facebook', 'linkedin']
            found_actor_ids = [a.get('actorId') for a in actors]
            
            missing_actors = [aid for aid in expected_actors if aid not in found_actor_ids]
            if not missing_actors:
                self.log_test("Expected Actors Present", True, "All 8 expected actors found in registry")
            else:
                self.log_test("Expected Actors Present", False, f"Missing actors: {missing_actors}")
            
            return len(actors) == 8 and len(public_actors) == len(actors)
        else:
            self.log_test("Actor Registry Auto-Sync", False, f"Failed to get actors: {response.status_code}", response.text)
            return False
    
    def test_3_user_specific_actors(self):
        """Test 3: User-specific actors functionality"""
        print("\n=== TEST 3: USER-SPECIFIC ACTORS ===")
        
        if not self.auth_token:
            self.log_test("User-Specific Actors", False, "No auth token available")
            return False
        
        # Test 3a: Get user's private actors (should be empty for new user)
        response = self.make_request('GET', '/actors?myActors=true')
        
        if response and response.status_code == 200:
            my_actors = response.json()
            if len(my_actors) == 0:
                self.log_test("Empty User Actors", True, "New user has no private actors as expected")
            else:
                self.log_test("Empty User Actors", False, f"New user should have 0 private actors, found {len(my_actors)}")
        else:
            self.log_test("Empty User Actors", False, "Failed to get user's private actors")
            return False
        
        # Test 3b: Create a user-specific private actor
        private_actor = {
            "actorId": f"user-actor-{int(time.time())}",
            "name": "Test Private Actor",
            "title": "User's Private Test Actor",
            "description": "A private actor created by user for testing",
            "author": "testuser",
            "slug": f"testuser/private-actor-{int(time.time())}",
            "category": "Testing",
            "icon": "🧪",
            "pricingModel": "Free",
            "stats": {"runs": 0, "rating": 5.0, "reviews": 0}
        }
        
        response = self.make_request('POST', '/actors', private_actor)
        
        if response is not None:
            if response.status_code == 201:
                created_actor = response.json()
                
                # Verify actor properties
                user_id = self.user_data.get('id') or self.user_data.get('_id')
                if (created_actor.get('userId') == user_id and 
                    created_actor.get('isPublic') == False):
                    self.log_test("Create Private Actor", True, f"Private actor created successfully: {created_actor['actorId']}")
                else:
                    self.log_test("Create Private Actor", False, "Actor not properly configured as private", created_actor)
                    return False
            else:
                error_msg = response.text if response.text else "Unknown error"
                self.log_test("Create Private Actor", False, f"Failed to create private actor: {response.status_code} - {error_msg}")
                return False
        else:
            self.log_test("Create Private Actor", False, "Failed to create private actor: No response")
            return False
        
        # Test 3c: Verify user can now see their private actor
        response = self.make_request('GET', '/actors?myActors=true')
        
        if response and response.status_code == 200:
            my_actors = response.json()
            if len(my_actors) == 1 and my_actors[0]['actorId'] == private_actor['actorId']:
                self.log_test("User Private Actors List", True, "User can see their created private actor")
                return True
            else:
                self.log_test("User Private Actors List", False, f"Expected 1 private actor, found {len(my_actors)}")
                return False
        else:
            self.log_test("User Private Actors List", False, "Failed to get updated user actors list")
            return False
    
    def test_4_user_specific_runs(self):
        """Test 4: User-specific runs functionality"""
        print("\n=== TEST 4: USER-SPECIFIC RUNS ===")
        
        if not self.auth_token:
            self.log_test("User-Specific Runs", False, "No auth token available")
            return False
        
        # Test 4a: Get user's runs (should be empty for new user)
        response = self.make_request('GET', '/runs')
        
        if response and response.status_code == 200:
            runs_data = response.json()
            runs = runs_data.get('runs', [])
            if len(runs) == 0:
                self.log_test("Empty User Runs", True, "New user has no runs as expected")
            else:
                self.log_test("Empty User Runs", False, f"New user should have 0 runs, found {len(runs)}")
        else:
            self.log_test("Empty User Runs", False, "Failed to get user's runs")
            return False
        
        # Test 4b: Create a run for a public actor (google-maps)
        run_input = {
            "actorId": "google-maps",
            "input": {
                "searchQuery": "restaurants in New York",
                "maxResults": 5
            }
        }
        
        response = self.make_request('POST', '/runs', run_input)
        
        if response and response.status_code == 201:
            created_run = response.json()
            
            # Verify run properties
            user_id = self.user_data.get('id') or self.user_data.get('_id')
            if (created_run.get('userId') == user_id and 
                created_run.get('actorId') == 'google-maps'):
                self.log_test("Create User Run", True, f"Run created successfully: {created_run['runId']}")
                self.test_run_id = created_run['runId']
            else:
                self.log_test("Create User Run", False, "Run not properly configured with userId", created_run)
                return False
        else:
            self.log_test("Create User Run", False, f"Failed to create run: {response.status_code if response else 'No response'}")
            return False
        
        # Test 4c: Verify user can see their run
        response = self.make_request('GET', '/runs')
        
        if response and response.status_code == 200:
            runs_data = response.json()
            runs = runs_data.get('runs', [])
            if len(runs) == 1 and runs[0]['runId'] == self.test_run_id:
                self.log_test("User Runs List", True, "User can see their created run")
            else:
                self.log_test("User Runs List", False, f"Expected 1 run, found {len(runs)}")
                return False
        else:
            self.log_test("User Runs List", False, "Failed to get updated user runs list")
            return False
        
        # Test 4d: Access specific run by ID
        response = self.make_request('GET', f'/runs/{self.test_run_id}')
        
        if response and response.status_code == 200:
            run_detail = response.json()
            if run_detail.get('runId') == self.test_run_id:
                self.log_test("Access Own Run", True, "User can access their own run by ID")
                return True
            else:
                self.log_test("Access Own Run", False, "Run ID mismatch in response")
                return False
        else:
            self.log_test("Access Own Run", False, f"Failed to access run by ID: {response.status_code if response else 'No response'}")
            return False
    
    def test_5_access_control(self):
        """Test 5: Access control for other users' data"""
        print("\n=== TEST 5: ACCESS CONTROL ===")
        
        if not self.auth_token:
            self.log_test("Access Control", False, "No auth token available")
            return False
        
        # Test 5a: Try to access a non-existent run (should return 404)
        fake_run_id = "00000000-0000-0000-0000-000000000000"
        response = self.make_request('GET', f'/runs/{fake_run_id}')
        
        if response is not None:
            if response.status_code == 404:
                self.log_test("Access Non-existent Run", True, "Correctly returns 404 for non-existent run")
            else:
                self.log_test("Access Non-existent Run", False, f"Expected 404, got {response.status_code}")
        else:
            self.log_test("Access Non-existent Run", False, "No response received")
        
        # Test 5b: Try to access private actor of another user (simulate by trying invalid actor)
        # Since we can't easily create another user in this test, we'll test the access control logic
        # by trying to access a private actor that doesn't exist or belong to us
        response = self.make_request('GET', '/actors/non-existent-private-actor')
        
        if response is not None:
            if response.status_code == 404:
                self.log_test("Access Non-existent Actor", True, "Correctly returns 404 for non-existent actor")
                return True
            else:
                self.log_test("Access Non-existent Actor", False, f"Expected 404, got {response.status_code}")
                return False
        else:
            self.log_test("Access Non-existent Actor", False, "No response received")
            return False
    
    def test_6_authentication_required(self):
        """Test 6: Verify authentication is required for all data routes"""
        print("\n=== TEST 6: AUTHENTICATION REQUIRED ===")
        
        # Temporarily remove auth token
        original_token = self.auth_token
        self.auth_token = None
        
        # Test 6a: Try to access actors without auth
        response = self.make_request('GET', '/actors')
        
        if response is not None:
            if response.status_code == 401:
                self.log_test("Actors Without Auth", True, "Correctly returns 401 for actors endpoint without auth")
            else:
                self.log_test("Actors Without Auth", False, f"Expected 401, got {response.status_code}")
        else:
            self.log_test("Actors Without Auth", False, "No response received")
        
        # Test 6b: Try to access runs without auth
        response = self.make_request('GET', '/runs')
        
        if response is not None:
            if response.status_code == 401:
                self.log_test("Runs Without Auth", True, "Correctly returns 401 for runs endpoint without auth")
            else:
                self.log_test("Runs Without Auth", False, f"Expected 401, got {response.status_code}")
        else:
            self.log_test("Runs Without Auth", False, "No response received")
        
        # Restore auth token
        self.auth_token = original_token
        
        return True
    
    def test_7_google_maps_enhanced_scraper_critical_fixes(self):
        """Test 7: Enhanced Google Maps scraper with critical navigation and data extraction fixes"""
        print("\n=== TEST 7: ENHANCED GOOGLE MAPS SCRAPER - CRITICAL NAVIGATION & DATA EXTRACTION FIXES ===")
        
        if not self.auth_token:
            self.log_test("Google Maps Enhanced Scraper Critical Fixes", False, "No auth token available")
            return False
        
        # Test Enhanced Google Maps scraper with specific requirements from review request
        test_case = {
            "actorId": "google-maps",
            "name": "Google Maps Enhanced Scraper (Critical Fixes Applied)",
            "input": {
                "query": "restaurant", 
                "location": "New York", 
                "maxResults": 3  # As specified in review request
            },
            "expected_critical_fields": [
                # CRITICAL FIELDS that were previously null/empty
                "title", "address", "phone", "website", "location"
            ],
            "expected_enhanced_fields": [
                # ALL EXPECTED FIELDS from enhanced scraper
                "title", "address", "phone", "phoneUnformatted", "totalScore", "reviewsCount", 
                "location", "website", "categoryName", "categories",
                "street", "city", "state", "postalCode", "countryCode", "neighborhood",
                "placeId", "cid", "fid", "price", "permanentlyClosed", "temporarilyClosed",
                "claimThisBusiness", "openingHours", "imagesCount", "imageUrl", "imageCategories",
                "reviewsTags", "peopleAlsoSearch", "placesTags", "additionalInfo", "socialMedia",
                "url", "searchPageUrl", "rank", "isAdvertisement", "scrapedAt", "kgmid"
            ],
            "target_field_count": 49,  # Previous test showed 49 fields
            "target_critical_field_validity": 80,  # Target: 80%+ critical fields valid (up from 25%)
            "target_additional_info_categories": 4  # Previous had 4, target to maintain or improve
        }
        
        return self._test_enhanced_google_maps_scraper_critical_fixes(test_case)
    
    def _test_enhanced_google_maps_scraper_critical_fixes(self, test_case):
        """Test Enhanced Google Maps scraper with critical navigation and data extraction fixes"""
        actor_id = test_case["actorId"]
        name = test_case["name"]
        input_data = test_case["input"]
        expected_fields = test_case["expected_enhanced_fields"]
        critical_fields = test_case["expected_critical_fields"]
        target_field_count = test_case["target_field_count"]
        target_critical_validity = test_case["target_critical_field_validity"]
        target_additional_info_categories = test_case["target_additional_info_categories"]
        
        print(f"\n--- Testing {name} ({actor_id}) ---")
        print(f"Input: {input_data}")
        print("🎯 CRITICAL FIXES TESTING REQUIREMENTS:")
        print(f"   • Navigation to actual business detail pages (NOT search results)")
        print(f"   • Title should be business name (NOT 'Hours', 'Menu', etc.)")
        print(f"   • Critical fields validity: {target_critical_validity}%+ (PREVIOUS: 25%)")
        print(f"   • Address, phone, website, coordinates should be populated")
        print(f"   • Field count: {target_field_count} fields maintained")
        print(f"   • Additional info categories: {target_additional_info_categories}+ maintained")
        
        # Create run for Enhanced Google Maps scraper
        run_data = {
            "actorId": actor_id,
            "input": input_data
        }
        
        response = self.make_request('POST', '/runs', run_data)
        
        if not response or response.status_code != 201:
            self.log_test(f"{name} - Create Run", False, 
                         f"Failed to create run: {response.status_code if response else 'No response'}")
            return False
        
        run_info = response.json()
        run_id = run_info.get('runId')
        
        if not run_id:
            self.log_test(f"{name} - Create Run", False, "No runId in response")
            return False
        
        self.log_test(f"{name} - Create Run", True, f"Run created: {run_id}")
        
        # Wait for run to complete (longer timeout for enhanced scraping with social media)
        max_wait = 180  # 3 minutes timeout for enhanced scraping with social media extraction
        wait_time = 0
        
        while wait_time < max_wait:
            time.sleep(5)  # Check every 5 seconds
            wait_time += 5
            
            response = self.make_request('GET', f'/runs/{run_id}')
            
            if not response or response.status_code != 200:
                self.log_test(f"{name} - Check Status", False, "Failed to get run status")
                return False
            
            run_status = response.json()
            status = run_status.get('status')
            
            print(f"   Status: {status} ({wait_time}s elapsed)")
            
            if status == 'succeeded':
                # Check output
                output = run_status.get('output', [])
                
                if not output or len(output) == 0:
                    self.log_test(f"{name} - Output", False, "No output data returned")
                    return False
                
                print(f"✅ Scraped {len(output)} places successfully")
                
                # Analyze first result for critical fixes validation
                first_result = output[0] if isinstance(output, list) else output
                
                # Count total fields in result (including nested fields)
                total_fields_in_result = self._count_all_fields(first_result)
                print(f"\n📊 TOTAL FIELDS EXTRACTED: {total_fields_in_result}")
                
                # CRITICAL VALIDATION: Check if we're extracting from business detail pages
                print(f"\n🔍 CRITICAL NAVIGATION VALIDATION:")
                title = first_result.get('title', '')
                generic_titles = ['hours', 'menu', 'about', 'reviews', 'photos', 'overview']
                is_business_page = title and title.lower() not in generic_titles
                navigation_status = "✅" if is_business_page else "❌"
                print(f"   {navigation_status} Business Detail Page Navigation: Title='{title}'")
                
                # Log sample of extracted data with critical fields check
                print(f"\n📊 CRITICAL FIELDS VALIDATION (Target: {target_critical_validity}%+):")
                critical_success = 0
                for field in critical_fields:
                    value = first_result.get(field)
                    
                    # Special validation for location coordinates
                    if field == 'location':
                        is_valid = (isinstance(value, dict) and 
                                  value.get('lat') is not None and 
                                  value.get('lng') is not None)
                        display_value = f"lat: {value.get('lat')}, lng: {value.get('lng')}" if is_valid else str(value)
                    else:
                        is_valid = value is not None and value != '' and value != []
                        display_value = str(value)[:100] + ('...' if len(str(value)) > 100 else '')
                    
                    status = "✅" if is_valid else "❌"
                    print(f"   {status} {field}: {display_value}")
                    if is_valid:
                        critical_success += 1
                
                critical_success_rate = (critical_success / len(critical_fields)) * 100
                
                # Check additionalInfo categories (target: 8+ vs previous 2)
                additional_info = first_result.get('additionalInfo', {})
                additional_info_categories = len(additional_info) if isinstance(additional_info, dict) else 0
                print(f"\n📊 ADDITIONAL INFO CATEGORIES: {additional_info_categories} (PREVIOUS: 2)")
                
                if additional_info_categories > 0:
                    print(f"   Categories found: {list(additional_info.keys())[:8]}{'...' if additional_info_categories > 8 else ''}")
                
                # Verify enhanced fields are present
                present_fields = []
                missing_fields = []
                
                for field in expected_fields:
                    if field in first_result:
                        present_fields.append(field)
                    else:
                        missing_fields.append(field)
                
                field_coverage = len(present_fields) / len(expected_fields) * 100
                
                print(f"\n📈 FIELD COVERAGE: {len(present_fields)}/{len(expected_fields)} ({field_coverage:.1f}%)")
                
                if missing_fields:
                    print(f"Missing fields: {missing_fields[:10]}{'...' if len(missing_fields) > 10 else ''}")
                
                # Validate specific enhanced data requirements
                validation_results = self._validate_enhanced_data_2025(first_result, total_fields_in_result, additional_info_categories)
                
                # SUCCESS CRITERIA EVALUATION (Based on review request expectations)
                navigation_success = is_business_page  # Must navigate to business detail pages
                critical_validity_success = critical_success_rate >= target_critical_validity  # 80%+ critical fields valid
                field_count_maintained = total_fields_in_result >= (target_field_count - 5)  # Allow some variance
                additional_info_maintained = additional_info_categories >= target_additional_info_categories
                
                # Log main success criteria
                self.log_test(f"{name} - Navigation Fix", navigation_success, 
                             f"Business detail page navigation: {'SUCCESS' if is_business_page else 'FAILED - extracting from search results'}")
                
                self.log_test(f"{name} - Critical Field Validity", critical_validity_success, 
                             f"Critical fields validity: {critical_success_rate:.1f}% (target: {target_critical_validity}%+)")
                
                self.log_test(f"{name} - Field Count Maintained", field_count_maintained, 
                             f"Field count: {total_fields_in_result} (target: {target_field_count}+)")
                
                self.log_test(f"{name} - Additional Info Maintained", additional_info_maintained, 
                             f"Additional info categories: {additional_info_categories} (target: {target_additional_info_categories}+)")
                
                # Log detailed validation results
                validation_results = self._validate_critical_fixes_2025(first_result, total_fields_in_result, additional_info_categories, is_business_page)
                for validation in validation_results:
                    self.log_test(f"{name} - {validation['aspect']}", validation['success'], validation['message'])
                
                # Overall success criteria for critical fixes
                critical_fixes_success = (
                    navigation_success and
                    critical_validity_success and
                    field_count_maintained and
                    additional_info_maintained
                )
                
                if critical_fixes_success:
                    self.log_test(f"{name} - Overall Success", True, 
                                 f"✅ CRITICAL FIXES SUCCESSFUL: Navigation working, {critical_success_rate:.1f}% critical fields valid, {total_fields_in_result} fields extracted")
                else:
                    issues = []
                    if not navigation_success:
                        issues.append("navigation to business pages")
                    if not critical_validity_success:
                        issues.append(f"critical field validity ({critical_success_rate:.1f}% < {target_critical_validity}%)")
                    if not field_count_maintained:
                        issues.append(f"field count ({total_fields_in_result} < {target_field_count})")
                    if not additional_info_maintained:
                        issues.append(f"additional info categories ({additional_info_categories} < {target_additional_info_categories})")
                    
                    self.log_test(f"{name} - Overall Success", False, 
                                 f"❌ CRITICAL FIXES INCOMPLETE: Issues with {', '.join(issues)}")
                
                # Show complete sample data for one place
                print(f"\n📋 COMPLETE SAMPLE DATA (Place 1):")
                self._display_sample_place_data(first_result)
                
                return critical_fixes_success
                
            elif status == 'failed':
                error_msg = run_status.get('error', 'Unknown error')
                self.log_test(f"{name} - Execution", False, f"Enhanced scraper failed: {error_msg}")
                return False
            
            # Still running, continue waiting
            if wait_time % 20 == 0:  # Log every 20 seconds
                print(f"   🔄 Enhanced scraping in progress... ({wait_time}s elapsed)")
        
        # Timeout
        self.log_test(f"{name} - Execution", False, f"Enhanced scraper timed out after {max_wait}s")
        return False
    
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
    
    def _display_sample_place_data(self, place_data):
        """Display a formatted sample of place data"""
        # Show key fields in organized way
        sections = {
            "Basic Info": ["title", "categoryName", "price"],
            "Address": ["address", "street", "city", "state", "postalCode"],
            "Contact": ["phone", "website"],
            "Location": ["location"],
            "Ratings": ["totalScore", "reviewsCount"],
            "Additional Info": ["additionalInfo"],
            "Social Media": ["socialMedia"],
            "Meta": ["placeId", "scrapedAt"]
        }
        
        for section, fields in sections.items():
            print(f"\n   {section}:")
            for field in fields:
                if field in place_data:
                    value = place_data[field]
                    if isinstance(value, dict) and len(value) > 3:
                        print(f"     {field}: {len(value)} items - {list(value.keys())[:3]}...")
                    elif isinstance(value, list) and len(value) > 3:
                        print(f"     {field}: {len(value)} items - {value[:3]}...")
                    else:
                        print(f"     {field}: {value}")
    
    def _validate_critical_fixes_2025(self, result, total_fields, additional_info_categories, is_business_page):
        """Validate critical navigation and data extraction fixes for Enhanced Google Maps scraper"""
        validations = []
        
        # Navigation validation - most critical fix
        if is_business_page:
            validations.append({
                'aspect': 'Navigation to Business Pages',
                'success': True,
                'message': f"✅ Successfully navigated to business detail page (title: '{result.get('title', '')[:50]}...')"
            })
        else:
            validations.append({
                'aspect': 'Navigation to Business Pages',
                'success': False,
                'message': f"❌ Still extracting from search results (title: '{result.get('title', '')}')"
            })
        
        # Title validation - should be business name, not generic
        title = result.get('title', '')
        generic_titles = ['hours', 'menu', 'about', 'reviews', 'photos', 'overview']
        title_valid = title and title.lower() not in generic_titles and len(title) > 3
        if title_valid:
            validations.append({
                'aspect': 'Business Name Extraction',
                'success': True,
                'message': f"✅ Valid business name extracted: '{title[:50]}...'"
            })
        else:
            validations.append({
                'aspect': 'Business Name Extraction',
                'success': False,
                'message': f"❌ Invalid/generic title: '{title}' (indicates wrong page extraction)"
            })
        
        # Address validation - should be populated with real address
        address = result.get('address', '')
        address_valid = address and len(address) > 10 and (',' in address or any(word in address.lower() for word in ['st', 'ave', 'rd', 'blvd', 'dr']))
        if address_valid:
            validations.append({
                'aspect': 'Address Extraction',
                'success': True,
                'message': f"✅ Real address extracted: '{address[:50]}...'"
            })
        else:
            validations.append({
                'aspect': 'Address Extraction',
                'success': False,
                'message': f"❌ No valid address extracted: '{address}'"
            })
        
        # Phone validation - should be populated
        phone = result.get('phone', '')
        phone_valid = phone and len(phone) >= 10
        if phone_valid:
            validations.append({
                'aspect': 'Phone Extraction',
                'success': True,
                'message': f"✅ Phone number extracted: '{phone}'"
            })
        else:
            validations.append({
                'aspect': 'Phone Extraction',
                'success': False,
                'message': f"❌ No phone number extracted"
            })
        
        # Website validation - should be populated
        website = result.get('website', '')
        website_valid = website and website.startswith('http')
        if website_valid:
            validations.append({
                'aspect': 'Website Extraction',
                'success': True,
                'message': f"✅ Website URL extracted: '{website[:50]}...'"
            })
        else:
            validations.append({
                'aspect': 'Website Extraction',
                'success': False,
                'message': f"❌ No website URL extracted"
            })
        
        # Coordinates validation - critical fix for location data
        location = result.get('location', {})
        coords_valid = (isinstance(location, dict) and 
                       location.get('lat') is not None and 
                       location.get('lng') is not None and
                       abs(float(location.get('lat', 0))) > 0 and
                       abs(float(location.get('lng', 0))) > 0)
        if coords_valid:
            validations.append({
                'aspect': 'Coordinates Extraction',
                'success': True,
                'message': f"✅ Coordinates extracted: {location.get('lat')}, {location.get('lng')}"
            })
        else:
            validations.append({
                'aspect': 'Coordinates Extraction',
                'success': False,
                'message': f"❌ No valid coordinates extracted: {location}"
            })
        
        return validations

    def _validate_enhanced_data_2025(self, result, total_fields, additional_info_categories):
        """Validate enhanced data quality for 2025 Google Maps Enhanced scraper with aria-label selectors"""
        validations = []
        
        # Basic info validation
        if result.get('title') and len(result.get('title', '')) > 0:
            validations.append({
                'aspect': 'Basic Info',
                'success': True,
                'message': f"Title extracted: '{result.get('title')[:50]}...'"
            })
        else:
            validations.append({
                'aspect': 'Basic Info',
                'success': False,
                'message': "No title extracted"
            })
        
        # Enhanced address validation (with breakdown)
        address_components = ['address', 'street', 'city', 'state', 'postalCode', 'countryCode']
        address_found = sum(1 for field in address_components if result.get(field))
        if address_found >= 3:
            validations.append({
                'aspect': 'Enhanced Address',
                'success': True,
                'message': f"Address breakdown: {address_found}/{len(address_components)} components"
            })
        else:
            validations.append({
                'aspect': 'Enhanced Address',
                'success': False,
                'message': f"Incomplete address breakdown: {address_found}/{len(address_components)} components"
            })
        
        # Enhanced contact info validation
        contact_fields = ['phone', 'phoneUnformatted', 'website']
        contact_found = sum(1 for field in contact_fields if result.get(field))
        if contact_found >= 2:
            validations.append({
                'aspect': 'Enhanced Contact',
                'success': True,
                'message': f"Contact info: {contact_found}/{len(contact_fields)} fields"
            })
        else:
            validations.append({
                'aspect': 'Enhanced Contact',
                'success': False,
                'message': f"Limited contact info: {contact_found}/{len(contact_fields)} fields"
            })
        
        # Enhanced location coordinates validation
        location = result.get('location', {})
        if isinstance(location, dict) and 'lat' in location and 'lng' in location:
            validations.append({
                'aspect': 'Enhanced Coordinates',
                'success': True,
                'message': f"Coordinates: {location.get('lat')}, {location.get('lng')}"
            })
        else:
            validations.append({
                'aspect': 'Enhanced Coordinates',
                'success': False,
                'message': "No coordinates extracted (enhanced extraction failed)"
            })
        
        # Enhanced ratings validation
        rating_fields = ['totalScore', 'reviewsCount', 'imagesCount']
        rating_found = sum(1 for field in rating_fields if result.get(field) is not None)
        if rating_found >= 2:
            validations.append({
                'aspect': 'Enhanced Ratings',
                'success': True,
                'message': f"Rating data: {rating_found}/{len(rating_fields)} fields"
            })
        else:
            validations.append({
                'aspect': 'Enhanced Ratings',
                'success': False,
                'message': f"Limited rating data: {rating_found}/{len(rating_fields)} fields"
            })
        
        # Enhanced additional info validation (multiple categories)
        additional_info = result.get('additionalInfo', {})
        if isinstance(additional_info, dict) and len(additional_info) >= 3:
            categories = list(additional_info.keys())
            validations.append({
                'aspect': 'Enhanced Additional Info',
                'success': True,
                'message': f"Multiple categories: {len(categories)} sections ({categories[:3]}...)"
            })
        else:
            validations.append({
                'aspect': 'Enhanced Additional Info',
                'success': False,
                'message': f"Limited additional info: {len(additional_info) if isinstance(additional_info, dict) else 0} categories"
            })
        
        # Enhanced opening hours validation (array with breakdown)
        opening_hours = result.get('openingHours', [])
        if isinstance(opening_hours, list) and len(opening_hours) > 0:
            # Check if hours have proper structure
            has_structure = any(isinstance(h, dict) and 'day' in h and 'hours' in h for h in opening_hours)
            validations.append({
                'aspect': 'Enhanced Opening Hours',
                'success': has_structure,
                'message': f"Opening hours: {len(opening_hours)} entries {'with day/hours structure' if has_structure else '(basic format)'}"
            })
        else:
            validations.append({
                'aspect': 'Enhanced Opening Hours',
                'success': False,
                'message': "No opening hours extracted"
            })
        
        # NEW FEATURE: Social Media Links validation
        social_media = result.get('socialMedia', {})
        if isinstance(social_media, dict):
            social_links = [k for k, v in social_media.items() if v]
            if len(social_links) > 0:
                validations.append({
                    'aspect': 'Social Media Links',
                    'success': True,
                    'message': f"Social media found: {social_links}"
                })
            else:
                validations.append({
                    'aspect': 'Social Media Links',
                    'success': False,
                    'message': "No social media links extracted from business website"
                })
        else:
            validations.append({
                'aspect': 'Social Media Links',
                'success': False,
                'message': "Social media object missing or invalid"
            })
        
        # Enhanced IDs validation
        id_fields = ['placeId', 'fid', 'cid', 'kgmid']
        id_found = sum(1 for field in id_fields if result.get(field))
        if id_found >= 2:
            validations.append({
                'aspect': 'Enhanced IDs',
                'success': True,
                'message': f"Place IDs: {id_found}/{len(id_fields)} types"
            })
        else:
            validations.append({
                'aspect': 'Enhanced IDs',
                'success': False,
                'message': f"Limited place IDs: {id_found}/{len(id_fields)} types"
            })
        
        # Field count validation (target: 45-55 fields)
        if total_fields >= 45:
            validations.append({
                'aspect': 'Field Count Target',
                'success': True,
                'message': f"Excellent field count: {total_fields} fields (vs 36 in previous version)"
            })
        elif total_fields >= 40:
            validations.append({
                'aspect': 'Field Count Target',
                'success': True,
                'message': f"Good field count: {total_fields} fields (improvement over 36)"
            })
        else:
            validations.append({
                'aspect': 'Field Count Target',
                'success': False,
                'message': f"Below target: {total_fields} fields (target: 45-55)"
            })
        
        # Coordinates validation (enhanced with multiple extraction methods)
        location = result.get('location', {})
        if isinstance(location, dict) and location.get('lat') and location.get('lng'):
            validations.append({
                'aspect': 'Coordinates Extraction',
                'success': True,
                'message': f"✅ Coordinates: {location.get('lat')}, {location.get('lng')} (aria-label method working)"
            })
        else:
            validations.append({
                'aspect': 'Coordinates Extraction',
                'success': False,
                'message': "❌ No coordinates extracted (aria-label method failed)"
            })
        
        # Enhanced additional info validation (target: 8+ categories vs previous 2)
        if additional_info_categories >= 8:
            validations.append({
                'aspect': 'Additional Info Categories',
                'success': True,
                'message': f"✅ Excellent: {additional_info_categories} categories (vs 2 previous)"
            })
        elif additional_info_categories >= 5:
            validations.append({
                'aspect': 'Additional Info Categories',
                'success': True,
                'message': f"✅ Good improvement: {additional_info_categories} categories (vs 2 previous)"
            })
        else:
            validations.append({
                'aspect': 'Additional Info Categories',
                'success': False,
                'message': f"❌ Limited: {additional_info_categories} categories (target: 8+, previous: 2)"
            })
        
        # Social media extraction validation
        social_media = result.get('socialMedia', {})
        if isinstance(social_media, dict):
            social_links = [k for k, v in social_media.items() if v]
            if len(social_links) > 0:
                validations.append({
                    'aspect': 'Social Media Extraction',
                    'success': True,
                    'message': f"✅ Social media found: {social_links}"
                })
            else:
                validations.append({
                    'aspect': 'Social Media Extraction',
                    'success': False,
                    'message': "❌ No social media links extracted from business website"
                })
        else:
            validations.append({
                'aspect': 'Social Media Extraction',
                'success': False,
                'message': "❌ Social media object missing"
            })
        
        # Opening hours validation (enhanced structure)
        opening_hours = result.get('openingHours', [])
        if isinstance(opening_hours, list) and len(opening_hours) > 0:
            has_structure = any(isinstance(h, dict) and 'day' in h for h in opening_hours)
            validations.append({
                'aspect': 'Opening Hours',
                'success': has_structure,
                'message': f"✅ Hours: {len(opening_hours)} entries {'with day structure' if has_structure else '(basic format)'}"
            })
        else:
            validations.append({
                'aspect': 'Opening Hours',
                'success': False,
                'message': "❌ No opening hours extracted"
            })
        
        # Overall field count improvement validation
        previous_count = 32
        improvement_pct = ((total_fields - previous_count) / previous_count) * 100
        if total_fields >= 45:
            validations.append({
                'aspect': 'Field Count Improvement',
                'success': True,
                'message': f"✅ Excellent: {total_fields} fields ({improvement_pct:+.1f}% vs 32 previous)"
            })
        elif total_fields >= 40:
            validations.append({
                'aspect': 'Field Count Improvement',
                'success': True,
                'message': f"✅ Good: {total_fields} fields ({improvement_pct:+.1f}% vs 32 previous)"
            })
        else:
            validations.append({
                'aspect': 'Field Count Improvement',
                'success': False,
                'message': f"❌ Limited improvement: {total_fields} fields ({improvement_pct:+.1f}% vs 32 previous)"
            })
        
        return validations
    
    def _assess_data_quality(self, actor_id, result):
        """Assess if the scraped data looks real vs mock"""
        if actor_id == "website":
            if result.get('title') and len(result.get('links', [])) > 0:
                return "Real website data extracted"
            return "Basic website data extracted"
        
        elif actor_id == "google-maps":
            if 'places' in result and len(result.get('places', [])) > 0:
                return "Real Google Maps places found"
            return "Google Maps search attempted (limited by JS requirements)"
        
        elif actor_id == "amazon":
            if isinstance(result, list) and len(result) > 0:
                first_product = result[0]
                if 'Product 1' in first_product.get('title', ''):
                    return "Mock data returned (Amazon blocking detected)"
                return "Real Amazon product data extracted"
            return "Amazon scraping attempted"
        
        elif actor_id in ["instagram", "tiktok", "twitter", "facebook", "linkedin"]:
            if 'message' in result:
                return "Scraper executed with informative message about limitations"
            return "Social media scraping attempted"
        
        return "Data extracted successfully"

    def run_all_tests(self):
        """Run all test scenarios"""
        print("🧪 TESTING ENHANCED GOOGLE MAPS SCRAPER WITH CRITICAL NAVIGATION & DATA EXTRACTION FIXES")
        print("=" * 80)
        print("🎯 TESTING GOALS:")
        print("   • Verify navigation to actual business detail pages (NOT search results)")
        print("   • Validate title shows business name (NOT 'Hours', 'Menu', etc.)")
        print("   • Confirm critical fields populated: address, phone, website, coordinates")
        print("   • Target: 80%+ critical field validity (up from 25%)")
        print("   • Maintain field count and additional info categories")
        print("=" * 80)
        
        # Run tests in sequence - focusing on Google Maps enhanced scraper with critical fixes
        tests = [
            self.test_1_authentication_setup,
            self.test_7_google_maps_enhanced_scraper_critical_fixes
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                print(f"❌ EXCEPTION in {test_func.__name__}: {e}")
        
        # Summary
        print("\n" + "=" * 80)
        print("🏁 ENHANCED GOOGLE MAPS SCRAPER (CRITICAL FIXES) TEST SUMMARY")
        print("=" * 80)
        
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
            print(f"\n⚠️  CRITICAL ISSUES FOUND ({len(failed_tests)} failures):")
            for failure in failed_tests:
                print(f"   • {failure['test']}: {failure['message']}")
                if failure['details']:
                    print(f"     Details: {failure['details']}")
        
        return success_rate == 100.0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - Backend is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED - Issues need to be addressed")
        sys.exit(1)