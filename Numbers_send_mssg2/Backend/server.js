// const express = require('express');
// const multer = require('multer');
// const xlsx = require('xlsx');
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const cors = require('cors');
// const path = require('path');

// const app = express();
// const upload = multer({ dest: 'uploads/' });
// const crypto = require('crypto');

// function generateUserId() {
//   return crypto.randomBytes(8).toString('hex'); // Ex: '9a8b7c6d5e4f3a2b'
// }

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')));

// function delay(time) {
//   return new Promise(resolve => setTimeout(resolve, time));
// }

// app.post('/send-messages', upload.single('file'), async (req, res) => {
//   const message = req.body.message;
//   const filePath = req.file.path;

//   try {
//     const workbook = xlsx.readFile(filePath);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const data = xlsx.utils.sheet_to_json(sheet);
// const userId = req.body.userId || generateUserId();
// const sessionPath = `./sessions/${userId}`;

//     // Extraction des numéros en supprimant tout ce qui n'est pas chiffre
//     const numbers = data
//       .map(row => String(row.Numero).replace(/\D/g, ''))
//       .filter(n => n.length > 0);

//     fs.unlinkSync(filePath); // supprimer le fichier uploadé

//     const browser = await puppeteer.launch({
//       headless: false,
//       userDataDir:sessionPath,
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });
//     const page = await browser.newPage();
//     await page.goto('https://web.whatsapp.com');

//     console.log("🟡 Scan le QR Code, tu as 50 secondes...");
//     await delay(50000); // pause 50s pour scanner

//     for (const number of numbers) {
//       // Correction ici : URL entre backticks (``) pour utiliser l'interpolation
//       const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;

//       try {
//         await page.goto(url, { waitUntil: 'networkidle2' });

//         // Sélecteur pour la zone de texte d'écriture
//         await page.waitForSelector('div[contenteditable="true"][data-tab="10"]', { timeout: 40000 });

//         const messageBox = await page.$('div[contenteditable="true"][data-tab="10"]');
//         if (!messageBox) {
//           console.log(`⚠️ Pas de boîte de message pour ${number}`);
//           continue;
//         }

//         await messageBox.focus();
//         await page.evaluate(el => el.innerHTML = '', messageBox);
//         await page.keyboard.type(message);
//         await page.keyboard.press('Enter');

//         console.log(`✅ Message envoyé à ${number}`);

//         await delay(8000); // pause 8s avant prochain numéro
//       } catch (e) {
//         console.error(`❌ Erreur avec ${number}: ${e.message}`);
//       }
//     }

//     await delay(4000);
//     await browser.close();

//     res.json({ status: 'success', message: 'Messages envoyés avec succès !' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Erreur lors de l’envoi des messages' });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
// backend.js
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
app.use(express.static(path.join(__dirname, '../public')))
const clients = new Map(); // userId => client info { client, numbers, message, qrSent }

function generateUserId() {
  return Math.random().toString(36).substring(2, 12);
}

app.post('/start-session', upload.single('file'), async (req, res) => {
  try {
    
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    if (!req.file) return res.status(400).json({ error: 'Fichier Excel requis' });

    // Lire Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Extraire les numéros (suppression non chiffre)
    const numbers = data
      .map(row => String(row.Numero || row.number || row.Phone || row.Téléphone || '').replace(/\D/g, ''))
      .filter(n => n.length > 0);

    if (numbers.length === 0) return res.status(400).json({ error: 'Aucun numéro valide dans le fichier' });

    // Supprimer fichier uploadé
    fs.unlinkSync(req.file.path);

    // Générer userId
    const userId = generateUserId();

    // Créer client WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId, dataPath: './sessions' }),
      puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });

    clients.set(userId, { client, numbers, message, qrSent: false });

    client.on('qr', qr => {
      if (!clients.get(userId).qrSent) {
        clients.get(userId).qrSent = true;
        res.json({ status: 'qr', qr, userId });
      }
    });

   client.on('ready', async () => {
  console.log(`Client ${userId} prêt, envoi messages...`);
  const cInfo = clients.get(userId);
 
  for (const number of cInfo.numbers) {
    try {
      const chatId = `${number}@c.us`;
      await client.sendMessage(chatId, cInfo.message);
      console.log(`Message envoyé à ${number}`);
     
    } catch (e) {
      console.log(`Erreur en envoyant à ${number}: ${e.message}`);
    

    }
   
  }
 

  });


    client.initialize();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port http://localhost:${PORT}`);
});

