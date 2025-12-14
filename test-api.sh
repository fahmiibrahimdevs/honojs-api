#!/bin/bash

BASE_URL="http://localhost:3000"

echo "================================"
echo "Testing Hono.js REST API"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Health Check
echo -e "${BLUE}1. Health Check${NC}"
curl -s "$BASE_URL" | jq
echo ""

# 2. Register User
echo -e "${BLUE}2. Register User${NC}"
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "passwordConfirmation": "password123",
    "name": "John Doe",
    "phone": "08123456789"
  }')
echo "$USER_RESPONSE" | jq
echo ""

# 3. Register Admin
echo -e "${BLUE}3. Register Admin${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "passwordConfirmation": "admin123",
    "name": "Admin User"
  }')
echo "$ADMIN_RESPONSE" | jq
echo ""

# 4. Login User
echo -e "${BLUE}4. Login User${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }')
echo "$LOGIN_RESPONSE" | jq

USER_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
USER_REFRESH=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken')
echo -e "${GREEN}User Access Token: $USER_TOKEN${NC}"
echo ""

# 5. Login Admin
echo -e "${BLUE}5. Login Admin${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')
echo "$ADMIN_LOGIN" | jq

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.accessToken')
ADMIN_ID=$(echo "$ADMIN_LOGIN" | jq -r '.data.user.id')
echo -e "${GREEN}Admin Access Token: $ADMIN_TOKEN${NC}"
echo -e "${GREEN}Admin ID: $ADMIN_ID${NC}"
echo ""

# 6. Get Profile
echo -e "${BLUE}6. Get User Profile${NC}"
curl -s "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
echo ""

# 7. Update Profile
echo -e "${BLUE}7. Update Profile${NC}"
curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "phone": "08987654321"
  }' | jq
echo ""

# Need to manually change admin role in database
echo -e "${RED}⚠️  PENTING: Admin perlu diubah role-nya di database dulu!${NC}"
echo -e "${RED}Jalankan: bun run db:studio${NC}"
echo -e "${RED}Atau: mysql -u nexaryn -p honojs_api${NC}"
echo -e "${RED}UPDATE users SET role='ADMIN' WHERE id='$ADMIN_ID';${NC}"
echo ""
echo -e "${BLUE}Tekan Enter setelah mengubah role admin...${NC}"
read

# 8. Create Todo (Admin Only)
echo -e "${BLUE}8. Create Todo (Admin Only)${NC}"
TODO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/todos" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project",
    "description": "Finish the API documentation",
    "completed": false
  }')
echo "$TODO_RESPONSE" | jq

TODO_ID=$(echo "$TODO_RESPONSE" | jq -r '.data.id')
echo -e "${GREEN}Todo ID: $TODO_ID${NC}"
echo ""

# 9. Get All Todos
echo -e "${BLUE}9. Get All Todos${NC}"
curl -s "$BASE_URL/api/todos?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
echo ""

# 10. Get Todo by ID
echo -e "${BLUE}10. Get Todo by ID${NC}"
curl -s "$BASE_URL/api/todos/$TODO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
echo ""

# 11. Update Todo
echo -e "${BLUE}11. Update Todo${NC}"
curl -s -X PUT "$BASE_URL/api/todos/$TODO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project - Updated",
    "completed": true
  }' | jq
echo ""

# 12. Refresh Token
echo -e "${BLUE}12. Refresh Token${NC}"
curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$USER_REFRESH\"
  }" | jq
echo ""

# 13. Delete Todo
echo -e "${BLUE}13. Delete Todo${NC}"
curl -s -X DELETE "$BASE_URL/api/todos/$TODO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
echo ""

# 14. Logout
echo -e "${BLUE}14. Logout${NC}"
curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Testing Selesai!${NC}"
echo -e "${GREEN}================================${NC}"
