#!/bin/bash

echo "🔍 Expo Network Troubleshooting Script"
echo "======================================"

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "📱 Your laptop's IP address: $LOCAL_IP"

# Check if port 8081 is open (Metro bundler default)
echo "🔌 Checking if port 8081 is accessible..."
nc -z localhost 8081
if [ $? -eq 0 ]; then
    echo "✅ Port 8081 is open on localhost"
else
    echo "❌ Port 8081 is not accessible on localhost"
fi

# Check if port 8081 is accessible from network
echo "🌐 Checking if port 8081 is accessible from network..."
nc -z $LOCAL_IP 8081
if [ $? -eq 0 ]; then
    echo "✅ Port 8081 is accessible from network at $LOCAL_IP"
else
    echo "❌ Port 8081 is not accessible from network"
fi

# Check firewall status
echo "🛡️  Checking firewall status..."
FIREWALL_STATUS=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "Firewall status: $FIREWALL_STATUS"
else
    echo "Could not check firewall status (requires sudo)"
fi

echo ""
echo "🚀 Starting Expo with different configurations..."
echo ""

echo "1️⃣  Starting with LAN mode (default):"
echo "   npx expo start"
echo ""

echo "2️⃣  Starting with specific host:"
echo "   npx expo start --host $LOCAL_IP"
echo ""

echo "3️⃣  Starting with tunnel mode (recommended for network issues):"
echo "   npx expo start --tunnel"
echo ""

echo "4️⃣  Starting with localhost only:"
echo "   npx expo start --localhost"
echo ""

echo "📋 Troubleshooting steps:"
echo "1. Try tunnel mode first (option 3)"
echo "2. Make sure your phone and laptop are on the same WiFi network"
echo "3. Check if your router has client isolation enabled"
echo "4. Try disabling your laptop's firewall temporarily"
echo "5. Check if your antivirus is blocking the connection"
echo ""

echo "🔧 If tunnel mode works, you can make it permanent by adding to package.json:"
echo '   "start": "expo start --tunnel"'
