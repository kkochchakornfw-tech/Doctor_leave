# 🏥 คู่มือการติดตั้งระบบขึ้น Production (Hospital IT Deployment Guide)
### ระบบยื่นและอนุมัติใบลาแพทย์ผ่าน LINE (Doctor Leave @ LINE)
**โรงพยาบาลกรุงเทพสิริโรจน์ (Bangkok Hospital Siriroj - BSI)**

---

## 1. 🏗️ สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบด้วยสถาปัตยกรรม **High-Availability Hybrid Dual-Mode**:
* **Frontend:** React 19 + Tailwind CSS + Vite (Single-Page Application บน LINE LIFF)
* **Backend:** Node.js 20 (Express.js) ให้บริการทั้ง REST APIs, Webhook, Cron Scheduler และ static web hosting
* **Database:**
  * **PostgreSQL** (เช่น Railway Postgres) ผ่านตัวแปร `DATABASE_URL` — ระบบเก็บข้อมูลเป็น JSONB ในตาราง `app_state` (สร้างให้อัตโนมัติ)
  * **Local JSON Store** (`server/data/store.json`) ใช้เมื่อไม่ได้ตั้ง `DATABASE_URL` (สำหรับพัฒนา/ทดสอบ)
* **Security & Compliance:** ตรวจสอบ LINE Signature (HMAC-SHA256) และบันทึก Audit Log ตามมาตรฐาน PDPA ทุก Transaction

---

## 2. 📋 ความต้องการของระบบ (Prerequisites)

* **Server OS:** Ubuntu 22.04 LTS / Debian 12 / Red Hat Enterprise Linux 9
* **Hardware Requirements:**
  * CPU: 2 Cores ขึ้นไป
  * RAM: 4 GB ขึ้นไป
  * Storage: SSD 20 GB ขึ้นไป
* **Software:**
  * Docker Engine 24.0+ & Docker Compose v2+
  * หรือ Node.js 20.x LTS (กรณีไม่ใช้ Docker)
* **Network & Domain:**
  * Domain Name ชี้มายัง IP เครื่องเซิร์ฟเวอร์ (เช่น `doctorleave.phuket-hospital.com`)
  * เปิดพอร์ต 80 (HTTP) และ 443 (HTTPS)
  * ใบรับรอง SSL Certificate (Let's Encrypt หรือ Hospital Wildcard CA)

---

## 3. ⚙️ การตั้งค่า Environment Variables (`.env`)

คัดลอกไฟล์ตัวอย่างและแก้ไขค่าคอนฟิก:
```bash
cp .env.example .env
nano .env
```

| ตัวแปร | ความหมาย | ตัวอย่าง |
|---|---|---|
| `PORT` | พอร์ตที่ Express รันภายใน Container | `5000` |
| `APP_URL` | URL จริงของระบบที่เข้าถึงผ่านอินเทอร์เน็ต | `https://doctorleave.phuket-hospital.com` |
| `VITE_APP_URL` | URL เดียวกันสำหรับฝั่ง Frontend | `https://doctorleave.phuket-hospital.com` |
| `VITE_LIFF_ID` | LIFF ID จาก LINE Developers Console | `2000000000-XXXXXXXX` |
| `LINE_CHANNEL_ACCESS_TOKEN` | Long-lived Token จาก Messaging API | `eyJhbGciOiJIUz...` |
| `LINE_CHANNEL_SECRET` | Channel Secret สำหรับยืนยัน Webhook Signature | `a1b2c3d4e5f6...` |
| `DATABASE_URL` | Connection string ของ PostgreSQL | `postgresql://user:pass@host:5432/railway` |

---

## 4. 🚀 ขั้นตอนการติดตั้งด้วย Docker Compose (แนะนำ)

### ขั้นตอนที่ 1: Clone และเตรียมไดเรกทอรี
```bash
cd /opt
git clone https://github.com/trpxmac/doctor-leave-line.git
cd doctor-leave-line
mkdir -p uploads server/data
```

### ขั้นตอนที่ 2: สั่ง Build และ Start Container
```bash
docker compose up -d --build
```

### ขั้นตอนที่ 3: ตรวจสอบสถานะการทำงาน
```bash
# ตรวจสอบว่า Container รันอยู่และผ่าน Healthcheck
docker compose ps

# ดู Live Log การทำงาน
docker compose logs -f app
```

เมื่อ Container เริ่มทำงาน คุณสามารถทดสอบ Healthcheck API:
```bash
curl http://localhost:5000/api/health
# Response: {"status":"ok","system":"Doctor Leave @ LINE - Bangkok Hospital Siriroj", ...}
```

---

## 5. 🌐 การตั้งค่า Nginx Reverse Proxy & SSL

1. คัดลอกคอนฟิก Nginx:
```bash
sudo cp nginx/bsi-doctor-leave.conf /etc/nginx/sites-available/doctorleave.conf
sudo ln -s /etc/nginx/sites-available/doctorleave.conf /etc/nginx/sites-enabled/
```
2. แก้ไขชื่อโดเมนและ Path ใบรับรอง SSL ในไฟล์คอนฟิก
3. ทดสอบและรีโหลด Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. 📱 การตั้งค่า LINE Official Account & Messaging API

### 6.1 Webhook URL
1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Messaging API Channel ของโรงพยาบาล
3. ในส่วน **Webhook settings**:
   * Webhook URL: `https://doctorleave.phuket-hospital.com/api/line/webhook`
   * เปิด **Use webhook**: `ON`
   * กดปุ่ม **Verify** (ต้องได้ผลลัพธ์เป็น Success 200 OK)

### 6.2 Turnkey Rich Menu Provisioning (ติดตั้งเมนูอัตโนมัติ)
ระบบมีสคริปต์อัตโนมัติสำหรับสร้าง Rich Menu, อัปโหลดภาพ 2500x1686px สไตล์ BSI และตั้งเป็นเมนูหลักของแพทย์ทุกคน:
```bash
node scripts/setup_richmenu.js
```
*ผลลัพธ์:*
```
Step 1/3: Creating Rich Menu object...
   ✅ Rich Menu created with ID: richmenu-xxxxxxxxxxxx
Step 2/3: Uploading graphic image (2500x1686px)...
   ✅ Graphic image uploaded successfully!
Step 3/3: Setting as default Rich Menu for all doctors...
   ✅ Set as default Rich Menu for all users successfully!
🎉 SUCCESS! Your LINE Official Account Rich Menu is now live and active!
```

---

## 7. 💾 แผนการสำรองข้อมูลและกู้คืน (Backup & Disaster Recovery)

### ข้อมูลสำคัญที่ต้องสำรอง:
1. `server/data/store.json`: ฐานข้อมูลสถานะใบลา, โควตา, วันหยุด และตารางเวร
2. `uploads/`: ไฟล์เอกสารแนบใบรับรองแพทย์ทั้งหมด

### สคริปต์สำรองข้อมูลประจำวัน (Cron Job):
```bash
# เพิ่มใน crontab: ทุกวันเวลา 02:00 น.
0 2 * * * tar -czf /backup/bsi-doctor-leave-$(date +\%Y\%m\%d).tar.gz /opt/doctor-leave-line/server/data /opt/doctor-leave-line/uploads
```

---

## 8. 🛡️ การตรวจสอบมาตรฐาน PDPA & Audit Logs

* เจ้าหน้าที่ฝ่ายการแพทย์ (พี่กุ้ง) และ Admin สามารถตรวจสอบประวัติการทำรายการย้อนหลังทั้งหมดได้ที่ URL:
  `https://doctorleave.phuket-hospital.com/admin/audit`
* บันทึก Audit Log ครอบคลุม:
  * การอนุมัติ / ไม่อนุมัติ / ยกเลิกใบลา
  * IP Address, วันที่, เวลา และ Actor ID ของผู้ดำเนินการ
  * การแก้ไขประเภทการลา, วันหยุดโรงพยาบาล, สายอนุมัติ และการแลกเวรแพทย์
