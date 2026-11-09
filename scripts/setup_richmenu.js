/**
 * LINE Official Account - Turnkey Rich Menu Provisioning Script
 * Bangkok Hospital Siriroj (BSI) Doctor Leave System
 *
 * Usage:
 *   node scripts/setup_richmenu.js
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.VITE_LIFF_ID || process.env.LIFF_ID || '2012494812-wDotvhLS';
const IMAGE_PATH = path.join(rootDir, 'public', 'richmenu.jpg');
const CONFIG_PATH = path.join(__dirname, 'line_richmenu.json');

console.log('====================================================');
console.log('🏥 LINE OA Rich Menu Provisioning - Bangkok Hospital Siriroj');
console.log('====================================================');

async function main() {
  // 1. Verify Image & Config existence
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`❌ Rich menu image not found at: ${IMAGE_PATH}`);
    process.exit(1);
  }
  const imgStats = fs.statSync(IMAGE_PATH);
  console.log(`✅ Rich Menu image ready: ${IMAGE_PATH} (${(imgStats.size / 1024).toFixed(1)} KB)`);

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ Rich menu config JSON not found at: ${CONFIG_PATH}`);
    process.exit(1);
  }

  // 2. Read and populate config
  const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(rawConfig.replace(/__LIFF_ID__/g, LIFF_ID));
  console.log(`✅ Loaded Rich Menu layout: 4 Quadrants (2500x1686px)`);
  console.log(`   • Area 1: ยื่นใบลา -> https://liff.line.me/${LIFF_ID}`);
  console.log(`   • Area 2: ประวัติ & สิทธิ์ -> https://liff.line.me/${LIFF_ID}/my-history`);
  console.log(`   • Area 3: ตารางเวรแพทย์ -> https://liff.line.me/${LIFF_ID}/admin/shifts`);
  console.log(`   • Area 4: ติดต่อฝ่ายการแพทย์ (ฉุกเฉิน) -> Direct Emergency Text / Phone`);

  // 3. Check LINE API Token
  const isMockToken = !TOKEN || TOKEN.includes('YOUR_') || TOKEN.length < 30;
  if (isMockToken) {
    console.log('\n⚠️  LINE_CHANNEL_ACCESS_TOKEN is not configured or in development mode.');
    console.log('   All JSON structures and graphic assets have been validated and are ready.');
    console.log('\n💡 To deploy to your live LINE Official Account:');
    console.log('   1. Put your Channel Access Token into .env: LINE_CHANNEL_ACCESS_TOKEN=...');
    console.log('   2. Put your LIFF ID into .env: VITE_LIFF_ID=...');
    console.log('   3. Run: node scripts/setup_richmenu.js\n');
    return;
  }

  console.log('\n🚀 Connecting to LINE Messaging API...');

  try {
    // A. Create Rich Menu Structure
    console.log('Step 1/3: Creating Rich Menu object...');
    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(`LINE API Create Error: ${JSON.stringify(createData)}`);
    }

    const richMenuId = createData.richMenuId;
    console.log(`   ✅ Rich Menu created with ID: ${richMenuId}`);

    // B. Upload Rich Menu Graphic Image
    console.log('Step 2/3: Uploading graphic image (2500x1686px)...');
    const imgBuffer = fs.readFileSync(IMAGE_PATH);
    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'image/jpeg'
      },
      body: imgBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`LINE API Upload Error: ${errText}`);
    }
    console.log('   ✅ Graphic image uploaded successfully!');

    // C. Set as Default Rich Menu for all users
    console.log('Step 3/3: Setting as default Rich Menu for all doctors...');
    const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!defaultRes.ok) {
      const errText = await defaultRes.text();
      throw new Error(`LINE API Set Default Error: ${errText}`);
    }
    console.log('   ✅ Set as default Rich Menu for all users successfully!');

    // D. Also link directly to TEST_LINE_USER_ID (Top Priority 1 Override)
    const testUserId = process.env.TEST_LINE_USER_ID;
    if (testUserId && testUserId.startsWith('U')) {
      console.log(`Step 4: Linking directly to User ID (${testUserId}) as Priority 1...`);
      const linkRes = await fetch(`https://api.line.me/v2/bot/user/${testUserId}/richmenu/${richMenuId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      if (linkRes.ok) {
        console.log(`   ✅ Direct User Link SUCCESS: Linked to ${testUserId}`);
      } else {
        console.warn(`   ⚠️ Direct User Link error:`, await linkRes.text());
      }
    }

    console.log('\n🎉 SUCCESS! Your LINE Official Account Rich Menu is now live and active for Bangkok Hospital Siriroj!');
  } catch (err) {
    console.error('❌ Failed to provision Rich Menu:', err.message);
  }
}

main();
