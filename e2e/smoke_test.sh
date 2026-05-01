#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "🔍 Running E2E Smoke Tests..."
echo ""

echo "1. Testing health endpoint..."
curl -sf "$BASE_URL/health" && echo "✅ Health OK" || { echo "❌ Health failed"; exit 1; }

echo "2. Testing metrics endpoint..."
curl -sf "$BASE_URL/metrics" > /dev/null && echo "✅ Metrics OK" || { echo "❌ Metrics failed"; exit 1; }

echo "3. Testing teacher dashboard summary..."
curl -sf -H "X-Teacher-ID: 1" "$BASE_URL/teacher/dashboard/summary" && echo "✅ Dashboard summary OK" || { echo "❌ Dashboard failed"; exit 1; }

echo "4. Testing students list..."
curl -sf -H "X-Teacher-ID: 1" "$BASE_URL/teacher/students" && echo "✅ Students OK" || { echo "❌ Students failed"; exit 1; }

echo "5. Testing courses list..."
curl -sf -H "X-Teacher-ID: 1" "$BASE_URL/teacher/courses" && echo "✅ Courses OK" || { echo "❌ Courses failed"; exit 1; }

echo ""
echo "✅ All smoke tests passed!"
