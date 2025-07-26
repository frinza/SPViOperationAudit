#!/bin/bash

# Script to add permission checking to all tool files
# Maps tool files to their permission names

TOOLS_DIR="/Users/kankitpumcharern/Downloads/SPViOperationAudit/tools"

echo "Adding permission checks to tool files..."

# Process each tool file individually
tools=("audit-calendar.html:auditCalendar" "cash-control.html:cashControl" "checklist.html:checklist" "issue-tracker.html:issueTracker" "report-comparison.html:reportComparison" "risk-analyzer.html:riskAnalyzer" "stock-count.html:stockCount")

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool_file permission_name <<< "$tool_info"
    full_path="${TOOLS_DIR}/${tool_file}"
    
    if [[ -f "$full_path" ]]; then
        echo "Processing $tool_file (permission: $permission_name)..."
        
        # Check if permission check already exists
        if grep -q "checkToolAccess" "$full_path"; then
            echo "  ✓ Permission check already exists in $tool_file"
            continue
        fi
        
        # Find the location of "SPViAuth.setupDevToolsProtection();" and add permission check after it
        if grep -q "SPViAuth.setupDevToolsProtection();" "$full_path"; then
            # Create temporary file with permission check
            temp_file="${full_path}.tmp"
            
            awk -v perm="$permission_name" '
            /SPViAuth\.setupDevToolsProtection\(\);/ {
                print $0
                print ""
                print "        // Check tool access permission"
                print "        document.addEventListener('\''DOMContentLoaded'\'', function() {"
                print "            // Check if user has permission to access " perm " tool"
                print "            if (window.SPViSessionManager && window.SPViSessionManager.checkToolAccess) {"
                print "                const hasAccess = window.SPViSessionManager.checkToolAccess('\''" perm "'\'');"
                print "                if (!hasAccess) {"
                print "                    // Access denied - modal will be shown by checkToolAccess function"
                print "                    // Optionally hide main content"
                print "                    document.querySelector('\''main'\'')?.style.setProperty('\''display'\'', '\''none'\'');"
                print "                }"
                print "            }"
                print "        });"
                next
            }
            { print }
            ' "$full_path" > "$temp_file"
            
            # Replace original file with modified version
            mv "$temp_file" "$full_path"
            echo "  ✓ Added permission check to $tool_file"
        else
            echo "  ⚠ Could not find setupDevToolsProtection() in $tool_file"
        fi
    else
        echo "  ✗ File not found: $full_path"
    fi
done

echo ""
echo "Permission checks added to all tool files!"
echo ""
echo "Tool permission mappings:"
for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool_file permission_name <<< "$tool_info"
    echo "  $tool_file -> $permission_name"
done
