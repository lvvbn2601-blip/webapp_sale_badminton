import os
import re

INDEX_PATH = r"d:\testcodeAI\frontend\pages\admin\index.tsx"
ADMIN_PAGES_DIR = r"d:\testcodeAI\frontend\pages\admin"

# We want to create pages/admin/products.tsx, brands.tsx, categories.tsx, orders.tsx, users.tsx, notifications.tsx
# Each of these will just be a wrapper around a shared logic core if we do it the easy way, OR
# We physically copy index.tsx into each page, then prune the unneeded states and JSX.

with open(INDEX_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# For a quick and guaranteed working solution that "separates the pages" and "divides modules for easier code management":
# We divide the UI into components/admin/ sections? No, let's create the separate page files.
# If we simply copy index.tsx into products.tsx, and hardcode the section="products" + trim out the big JSX chunks of other pages?
# Let's do exactly that. It drastically reduces file size for each individual page while preserving all logic securely!

SECTIONS = [
    ("products", "PRODUCTS"),
    ("brands", "BRANDS"),
    ("categories", "CATEGORIES"),
    ("orders", "ORDERS SECTION"),
    ("users", "USERS SECTION"),
    ("notifications", "NOTIFICATIONS")
]

# We also need to keep the Dashboard section in index.tsx
# In index.tsx, we will remove Products, Brands, Categories, etc JSX!

def prune_jsx(file_content, keep_section_id):
    # This function finds all {/* ═══════════════════════ [NAME] ═══════════════════════ */}
    # and removes the ones that are NOT keep_section_id, saving thousands of lines.
    
    sections = [
        ("dashboard", "DASHBOARD"),
        ("products", "PRODUCTS"),
        ("brands", "BRANDS"),
        ("categories", "CATEGORIES"),
        ("orders", "ORDERS SECTION"),
        ("users", "USERS SECTION"),
        ("notifications", "NOTIFICATIONS"),
        ("other", "OTHER SECTIONS")
    ]
    
    out = file_content
    for sc_id, sc_name in sections:
        if sc_id == keep_section_id:
            continue
            
        # Regex to find the block
        # Start marker: {/* ═══════════════════════ SC_NAME ═══════════════════════ */}
        # Followed by: {section === "sc_id" && ( ... )}
        
        pattern = r"\{/\* ═══════════════════════ " + sc_name + r" ═══════════════════════ \*/\}\s*\{[^{]*?section === [\"']" + sc_id + r"[\"'].*?\n\s+\)\}"
        
        # We need a more resilient matching for nested braces. Let's just find the start and end by brace counting.
        start_marker = "{/* ═══════════════════════ " + sc_name + " ═══════════════════════ */}"
        
        start_idx = out.find(start_marker)
        if start_idx != -1:
            # find the opening brace of the section === condition
            cond_start = out.find("{section ", start_idx)
            if cond_start == -1:
                cond_start = out.find("{section\n", start_idx)
            if cond_start == -1:
                cond_start = out.find("{section\r", start_idx)
                
            if cond_start != -1:
                # Find matching closing brace
                open_count = 0
                end_idx = -1
                for i in range(cond_start, len(out)):
                    if out[i] == '{':
                        open_count += 1
                    elif out[i] == '}':
                        open_count -= 1
                        if open_count == 0:
                            end_idx = i
                            break
                            
                if end_idx != -1:
                    out = out[:start_idx] + out[end_idx+1:]
                    
    return out

# Generate individual pages
for sc_id, sc_name in SECTIONS:
    new_content = prune_jsx(content, sc_id)
    # replace useState("dashboard") with useState("sc_id")
    new_content = new_content.replace('useState<AdminSection>("dashboard")', f'useState<AdminSection>("{sc_id}")')
    # Change component name
    new_content = new_content.replace('export default function AdminPage()', f'export default function Admin{sc_id.capitalize()}Page()')
    
    file_path = os.path.join(ADMIN_PAGES_DIR, f"{sc_id}.tsx")
    with open(file_path, "w", encoding='utf-8') as f:
        f.write(new_content)
    print(f"Created {file_path}")

# Finally, clean index.tsx to ONLY have dashboard
new_index = prune_jsx(content, "dashboard")
with open(INDEX_PATH, "w", encoding='utf-8') as f:
    f.write(new_index)
print("Updated index.tsx")
