#!/bin/bash
set -e

# Configuration
BASE_DIR="$(pwd)/base"
TENANTS_DIR="$(pwd)/tenants"
BUILD_DIR="$(pwd)/build"
YAML_MERGE_TOOL="yq"

if ! command -v "$YAML_MERGE_TOOL" &> /dev/null; then
    echo "Error: $YAML_MERGE_TOOL is required but not installed."
    echo "Please install Mike Farah yq (for example: brew install yq)"
    exit 1
fi

if [ ! -d "$BASE_DIR" ]; then
    echo "Error: Base directory $BASE_DIR not found!"
    echo "Please make sure your project structure is correct."
    exit 1
fi

merge_yaml() {
    local source_file="$1"
    local target_file="$2"
    local output_file="$3"

    if [ -f "$source_file" ] && [ -f "$target_file" ]; then
        $YAML_MERGE_TOOL eval-all 'select(fileIndex == 0) * select(fileIndex == 1)' "$target_file" "$source_file" > "$output_file"
    elif [ -f "$source_file" ]; then
        cp "$source_file" "$output_file"
    elif [ -f "$target_file" ]; then
        cp "$target_file" "$output_file"
    fi
}

copy_with_merge() {
    local source_dir="$1"
    local target_dir="$2"

    mkdir -p "$target_dir"

    for file in "$source_dir"/*; do
        if [ -d "$file" ]; then
            dir_name=$(basename "$file")
            copy_with_merge "$file" "$target_dir/$dir_name"
        elif [ -f "$file" ]; then
            file_name=$(basename "$file")
            file_ext="${file_name##*.}"

            if [ "$file_ext" = "yaml" ] || [ "$file_ext" = "yml" ]; then
                if [ -f "$target_dir/$file_name" ]; then
                    merge_yaml "$file" "$target_dir/$file_name" "$target_dir/$file_name.tmp"
                    mv "$target_dir/$file_name.tmp" "$target_dir/$file_name"
                else
                    cp "$file" "$target_dir/$file_name"
                fi
            else
                cp "$file" "$target_dir/$file_name"
            fi
        fi
    done
}

build_tenant() {
    local tenant="$1"
    echo "Building metadata for tenant: $tenant"

    if [ ! -d "$TENANTS_DIR/$tenant" ]; then
        echo "Error: Tenant directory $TENANTS_DIR/$tenant not found!"
        return 1
    fi

    rm -rf "$BUILD_DIR/$tenant"
    mkdir -p "$BUILD_DIR/$tenant/metadata"

    cat > "$BUILD_DIR/$tenant/config.yaml" << EOL
version: 3
endpoint: http://localhost:8080
admin_secret: youradminsecretkey
metadata_directory: metadata
EOL

    echo "Copying base metadata..."
    cp -r "$BASE_DIR"/* "$BUILD_DIR/$tenant/metadata/"

    echo "Applying tenant-specific metadata..."
    copy_with_merge "$TENANTS_DIR/$tenant" "$BUILD_DIR/$tenant/metadata/"

    if [ -f "$TENANTS_DIR/$tenant/tenant_overrides.yaml" ]; then
        echo "Applying tenant overrides..."
        find "$BUILD_DIR/$tenant/metadata" -name "*.yaml" -type f | while read -r yaml_file; do
            relative_path="${yaml_file#$BUILD_DIR/$tenant/metadata/}"
            yaml_path=$(dirname "$relative_path")
            if $YAML_MERGE_TOOL eval ".\"$yaml_path\"" "$TENANTS_DIR/$tenant/tenant_overrides.yaml" > /dev/null 2>&1; then
                $YAML_MERGE_TOOL eval-all 'select(fileIndex == 0) * select(fileIndex == 1).'"\"$yaml_path\"" "$yaml_file" "$TENANTS_DIR/$tenant/tenant_overrides.yaml" > "$yaml_file.tmp"
                mv "$yaml_file.tmp" "$yaml_file"
            fi
        done
    fi

    echo "Build complete for $tenant"
    return 0
}

TENANT="$1"

if [ ! -z "$TENANT" ]; then
    if ! build_tenant "$TENANT"; then
        exit 1
    fi
else
    echo "Building metadata for all tenants..."

    if [ ! -d "$TENANTS_DIR" ]; then
        echo "Error: Tenants directory $TENANTS_DIR not found!"
        exit 1
    fi

    tenant_dirs=$(find "$TENANTS_DIR" -maxdepth 1 -mindepth 1 -type d)

    if [ -z "$tenant_dirs" ]; then
        echo "No tenant directories found in $TENANTS_DIR"
        exit 1
    fi

    for tenant_dir in $tenant_dirs; do
        tenant=$(basename "$tenant_dir")
        if ! build_tenant "$tenant"; then
            echo "Failed to build tenant: $tenant"
            exit 1
        fi
    done
fi

echo "Metadata build process completed successfully!"
