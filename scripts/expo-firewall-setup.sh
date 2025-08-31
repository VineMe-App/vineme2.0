#!/bin/bash

echo "🔧 Expo Firewall Configuration Script"
echo "===================================="

# Function to enable firewall with Expo exceptions
enable_firewall_with_expo() {
    echo "🛡️  Re-enabling firewall with Expo exceptions..."
    
    # Re-enable firewall
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
    
    # Add Expo CLI to firewall exceptions
    EXPO_PATH=$(which expo)
    if [ -n "$EXPO_PATH" ]; then
        echo "✅ Adding Expo CLI to firewall exceptions..."
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$EXPO_PATH"
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock "$EXPO_PATH"
    fi
    
    # Add Node.js to firewall exceptions (for Metro bundler)
    NODE_PATH=$(which node)
    if [ -n "$NODE_PATH" ]; then
        echo "✅ Adding Node.js to firewall exceptions..."
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$NODE_PATH"
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock "$NODE_PATH"
    fi
    
    echo "✅ Firewall enabled with Expo exceptions!"
}

# Function to temporarily disable firewall
disable_firewall() {
    echo "🛡️  Temporarily disabling firewall..."
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
    echo "✅ Firewall disabled!"
}

# Function to check current status
check_status() {
    echo "📊 Current Firewall Status:"
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
    
    echo ""
    echo "📋 Firewall Applications:"
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps | grep -E "(expo|node)" || echo "No Expo/Node.js apps found in firewall list"
}

# Main script logic
case "${1:-}" in
    "enable")
        enable_firewall_with_expo
        ;;
    "disable")
        disable_firewall
        ;;
    "status")
        check_status
        ;;
    *)
        echo "Usage: $0 {enable|disable|status}"
        echo ""
        echo "Commands:"
        echo "  enable  - Enable firewall with Expo exceptions"
        echo "  disable - Temporarily disable firewall"
        echo "  status  - Check current firewall status"
        echo ""
        echo "Recommended workflow:"
        echo "1. Use 'enable' for secure development"
        echo "2. Use 'disable' only if you have network issues"
        echo "3. Use 'status' to check current configuration"
        ;;
esac
