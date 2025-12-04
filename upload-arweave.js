const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');

// Helper function to get MIME type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Helper function to get all files from a directory (recursively)
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

async function uploadToArweave() {
  try {
    // Get file/folder path from command line arguments
    const inputPath = process.argv[2];
    
    if (!inputPath) {
      console.error('Error: Please provide a file or folder path');
      console.log('Usage: node upload-arweave.js <file-or-folder-path>');
      process.exit(1);
    }

    // Resolve the path (supports relative and absolute paths)
    const resolvedPath = path.resolve(inputPath);
    
    // Check if path exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Path does not exist: ${resolvedPath}`);
      process.exit(1);
    }

    // Load wallet
    const walletPath = path.join(__dirname, 'wallet.json');
    if (!fs.existsSync(walletPath)) {
      console.error('Error: wallet.json not found in project root');
      process.exit(1);
    }
    const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    // Initialize Arweave
    const arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
    
    // Determine if it's a file or directory
    const stats = fs.statSync(resolvedPath);
    let filesToUpload = [];
    
    if (stats.isFile()) {
      // Single file
      filesToUpload = [resolvedPath];
      console.log(`Uploading single file: ${path.basename(resolvedPath)}\n`);
    } else if (stats.isDirectory()) {
      // Directory - get all files recursively
      filesToUpload = getAllFiles(resolvedPath);
      console.log(`Found ${filesToUpload.length} files in directory:\n`);
      filesToUpload.forEach(file => {
        console.log(`  - ${path.relative(resolvedPath, file)}`);
      });
      console.log('');
    }
    
    if (filesToUpload.length === 0) {
      console.error('Error: No files found to upload');
      process.exit(1);
    }
    
    const uploadResults = [];
    
    for (const filePath of filesToUpload) {
      const fileName = path.basename(filePath);
      const relativePath = path.relative(resolvedPath, filePath);
      const fileData = fs.readFileSync(filePath);
      const contentType = getContentType(filePath);
      
      console.log(`Uploading ${relativePath || fileName}...`);
      
      // Create transaction
      const transaction = await arweave.createTransaction({
        data: fileData
      }, wallet);
      
      // Add tags
      transaction.addTag('Content-Type', contentType);
      transaction.addTag('App-Name', 'hb-explorer');
      transaction.addTag('File-Name', fileName);
      if (relativePath && relativePath !== fileName) {
        transaction.addTag('File-Path', relativePath);
      }
      
      // Sign transaction
      await arweave.transactions.sign(transaction, wallet);
      
      // Upload via turbo upload endpoint
      const uploader = await arweave.transactions.getUploader(transaction);
      
      // Track progress with a visual progress bar
      const totalChunks = uploader.totalChunks || 1;
      let uploadedChunks = 0;
      
      // Use turbo endpoint for faster uploads
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        
        // Track chunks manually (increment after each chunk upload)
        uploadedChunks++;
        
        // Calculate progress - ensure we don't exceed 100%
        const progressPercent = totalChunks > 0 
          ? Math.min(100, Math.round((uploadedChunks / totalChunks) * 100))
          : Math.min(100, uploadedChunks > 0 ? 99 : 0);
        
        // Create visual progress bar
        const barLength = 30;
        const filledLength = Math.round((barLength * progressPercent) / 100);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r  [${bar}] ${progressPercent}% (${uploadedChunks}/${totalChunks} chunks)`);
      }
      
      // Clear progress bar and show completion
      process.stdout.write(`\r  [${'█'.repeat(30)}] 100% (${totalChunks}/${totalChunks} chunks)\n`);
      
      const txId = transaction.id;
      console.log(`\n✓ Successfully uploaded ${relativePath || fileName}`);
      console.log(`  Transaction ID: ${txId}`);
      console.log(`  URL: https://arweave.net/${txId}\n`);
      
      uploadResults.push({
        file: relativePath || fileName,
        txId,
        url: `https://arweave.net/${txId}`
      });
    }
    
    console.log('=== Upload Summary ===');
    uploadResults.forEach(result => {
      console.log(`${result.file}: ${result.url}`);
    });
    
  } catch (error) {
    console.error('\nError uploading files:', error);
    process.exit(1);
  }
}

uploadToArweave();

