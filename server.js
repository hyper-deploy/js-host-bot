const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// আপলোড ফোল্ডার সেটআপ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

let botProcess = null;

// ==========================================
// HTML প্যানেল ডিজাইন
// ==========================================
const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart JS Bot Hosting Panel</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { background: #1e293b; padding: 40px 30px; border-radius: 12px; width: 90%; max-width: 600px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h2 { color: #3b82f6; margin-bottom: 10px; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 25px; }
        input[type="file"] { display: none; }
        .file-label { display: block; padding: 20px; background: #0f172a; color: #3b82f6; border-radius: 8px; cursor: pointer; margin: 15px 0; border: 2px dashed #3b82f6; font-weight: bold; transition: 0.3s; }
        .file-label:hover { background: #1e293b; border-color: #60a5fa; }
        button { padding: 14px 20px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; transition: 0.3s; }
        button:hover { background: #059669; }
        .status-box { margin-top: 25px; padding: 15px; border-radius: 8px; background: #0f172a; text-align: left; display: none; }
        .status-box h3 { color: #10b981; margin-top: 0; font-size: 16px; }
        pre { background: black; padding: 15px; border-radius: 8px; max-height: 250px; overflow-y: auto; font-size: 13px; color: #10b981; white-space: pre-wrap; word-wrap: break-word; }
        .loading { display: none; color: #f59e0b; font-weight: bold; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>🤖 Smart JS Bot Panel</h2>
        <p>Upload your bot's <b>.js</b> file. The panel will auto-detect required packages, install them, and run your bot.</p>
        
        <form id="uploadForm" action="/upload" method="post" enctype="multipart/form-data">
            <label for="botFile" class="file-label" id="fileLabel">📁 Click to Choose .js File</label>
            <input type="file" name="botFile" id="botFile" accept=".js" required onchange="updateLabel(this)">
            <button type="submit" id="submitBtn">🚀 Deploy & Run Bot</button>
        </form>

        <div id="loading" class="loading">⏳ Installing packages and starting bot... Please wait...</div>

        <div id="statusBox" class="status-box">
            <h3>✅ Bot Started Successfully!</h3>
            <p><b>Detected Packages:</b> <span id="pkgList"></span></p>
            <p><b>Server Logs:</b></p>
            <pre id="logOutput"></pre>
        </div>
    </div>

    <script>
        function updateLabel(input) {
            if (input.files && input.files[0]) {
                document.getElementById('fileLabel').innerText = '📄 ' + input.files[0].name;
            }
        }

        document.getElementById('uploadForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(document.getElementById('uploadForm'));
            const btn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const statusBox = document.getElementById('statusBox');
            
            btn.disabled = true;
            btn.innerText = 'Deploying...';
            loading.style.display = 'block';
            statusBox.style.display = 'none';

            try {
                const response = await fetch('/upload', { method: 'POST', body: formData });
                const data = await response.json();

                loading.style.display = 'none';
                btn.disabled = false;
                btn.innerText = '🚀 Deploy & Run Bot';

                if (data.success) {
                    statusBox.style.display = 'block';
                    document.getElementById('pkgList').innerText = data.packages.join(', ') || 'None';
                    document.getElementById('logOutput').innerText = data.logs;
                } else {
                    alert('❌ Error: ' + data.error);
                }
            } catch (err) {
                alert('❌ Upload failed! Check connection.');
                loading.style.display = 'none';
                btn.disabled = false;
            }
        };
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlPage));

// ==========================================
// ফাইল আপলোড এবং অটো-ইনস্টল লজিক
// ==========================================
app.post('/upload', upload.single('botFile'), (req, res) => {
    if (!req.file) return res.json({ success: false, error: 'No file uploaded.' });

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    
    // আগের চলমান বট বন্ধ করা
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
    }

    // ফাইল রিড করা এবং require() খোঁজা
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    let packages = new Set();
    
    // লোকাল ফাইল ইমপোর্ট (./xyz) বাদ দিয়ে বাকি সব প্যাকেজ খোঁজা
    while ((match = requireRegex.exec(fileContent)) !== null) {
        const pkgName = match[1];
        if (!pkgName.startsWith('.') && !pkgName.startsWith('/')) {
            // যদি প্যাকেজের সাব-মডিউল থাকে (যেমন: discord.js/src), তবে শুধু মূল নামটা নেওয়া
            const basePkg = pkgName.startsWith('@') ? pkgName.split('/').slice(0, 2).join('/') : pkgName.split('/')[0];
            packages.add(basePkg);
        }
    }

    const pkgArray = Array.from(packages);
    
    // যদি কোনো প্যাকেজ না থাকে, তবে ইনস্টলেশন স্কিপ করা
    if (pkgArray.length === 0) {
        startBot(filePath, res, [], 'No external packages detected.');
        return;
    }

    const installCmd = `npm install ${pkgArray.join(' ')}`;
    console.log(`Installing: ${installCmd}`);

    // প্যাকেজ ইনস্টল করা
    exec(installCmd, (err, stdout, stderr) => {
        if (err) {
            return res.json({ success: false, error: `Package install failed: ${err.message}` });
        }
        
        // ইনস্টল সফল হলে বট রান করা
        startBot(filePath, res, pkgArray, `Packages installed: ${pkgArray.join(', ')}`);
    });
});

function startBot(filePath, res, packages, initLog) {
    // বট রান করা
    botProcess = exec(`node "${filePath}"`);
    let logData = initLog + '\n\n';

    botProcess.stdout.on('data', (data) => {
        logData += data.toString();
    });

    botProcess.stderr.on('data', (data) => {
        logData += `<span style="color: #ef4444">${data.toString()}</span>`; // এরর লাল রঙে দেখাবে
    });

    botProcess.on('close', (code) => {
        logData += `\n[!] Bot process exited with code ${code}`;
        botProcess = null;
    });

    // কয়েক সেকেন্ড অপেক্ষা করে লগ রেসপন্স পাঠানো
    setTimeout(() => {
        res.json({
            success: true,
            packages: packages,
            logs: logData || 'Bot is starting... No output yet.'
        });
    }, 4000); // ৪ সেকেন্ড সময় দেওয়া হলো বট স্টার্ট হতে
}

app.listen(PORT, () => console.log(`Panel running on port ${PORT}`));