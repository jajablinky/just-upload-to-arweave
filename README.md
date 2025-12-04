# Just Upload to Arweave

A simple Node.js script to upload files or entire folders to Arweave.

## Features

- Upload a single file or entire directory (recursively)
- Auto-detects MIME types for common file extensions
- Preserves directory structure when uploading folders
- Shows upload progress for each file
- Uses Arweave's turbo upload endpoint for faster uploads

## Prerequisites

- Node.js installed
- An Arweave wallet file (`wallet.json`) in the project root
- `arweave` npm package installed

## Installation

```bash
npm install arweave
```

## Usage

```bash
# Upload a single file
node upload-arweave.js ./myfile.png

# Upload a folder (all files recursively)
node upload-arweave.js ./my-folder

# Upload with absolute path
node upload-arweave.js /path/to/file.txt
```

## Setup

1. Place your Arweave wallet JSON file as `wallet.json` in the project root
2. Make sure `wallet.json` is in `.gitignore` (it already is)
3. Run the script with your file or folder path

## Output

The script will:
- Show progress for each file upload
- Display transaction IDs and Arweave URLs
- Provide a summary of all uploaded files at the end

## Supported File Types

The script auto-detects MIME types for:
- Images: SVG, PNG, JPG, GIF, WebP
- Text: JSON, TXT, HTML, CSS, JS, TS
- Media: MP4, MP3
- Archives: ZIP
- Documents: PDF
- And more (defaults to `application/octet-stream`)

