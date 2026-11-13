# Doctor Leave @ LINE (ระบบแจ้งลาแพทย์ผ่าน LINE OA)
### โรงพยาบาลกรุงเทพสิริโรจน์ (Bangkok Hospital Siriroj - BSI)

ระบบยื่นใบลาและอนุมัติการลาสำหรับแพทย์ผ่าน **LINE Official Account (LIFF)** และ **Web Admin Portal** ที่ออกแบบตามข้อกำหนด **[PRD v1.0](docs/PRD.md)** และ **Database Schema (PostgreSQL / Supabase)** เพื่อแก้ปัญหาความยุ่งยากของระบบเดิม ยึดหลัก **PDPA 100% (แจ้งเตือนแบบ 1-on-1 ส่วนตัว ยกเลิกกลุ่มรวมเด็ดขาด)** ป้องกันตารางตรวจหลุดจากการลาฉุกเฉิน และลดภาระงานของฝ่ายการแพทย์

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. ฝั่งแพทย์ (Doctor Experience — LIFF Mobile UI)
* **First-Time Doctor Onboarding (ค้นหาด้วยชื่อ):** แพทย์เข้าใช้งานครั้งแรก ค้นหาด้วยชื่อ-นามสกุล หรือเบอร์โทรศัพท์ พร้อมการ์ดยืนยันตัวตนผูกบัญชี LINE ทันที ไม่ต้องจำรหัสพนักงาน
* **Doctor-Friendly UX (< 60 วินาที):** ยื่นใบลาได้รวดเร็ว กรอกข้อมูลน้อยที่สุด
* **Smart Profile:** ดึงข้อมูลแพทย์, แผนก, และสถานะแพทย์ประจำ (FT) หรือแพทย์พาร์ทไทม์ (PT) อัตโนมัติ
* **Real-time Quota Balance:** แสดงยอดวันลาคงเหลือประจำปีทันที (พักร้อน, ลาป่วย, ลากิจ, ลาฝึกอบรม, ลาไม่รับค่าตอบแทน)
* **Department Quota Status Indicator:** แสดงสถานะโควตาแผนกบนวันที่เลือก (เขียว = ว่าง, ส้ม = ใกล้เต็ม, แดง = โควตาเต็ม)
* **คำขอข้อยกเว้นพิเศษ (Exception Request):** หากโควตาวันนั้นเต็มแล้ว แต่แพทย์มีความจำเป็นยิ่งยวด ระบบจะเปิดให้ยื่นพร้อมแจ้งเตือน Flag พิเศษ
* **ระบบจัดการลาฉุกเฉิน (Same-Day Emergency Leave):** หากยื่นลาในวันปัจจุบัน ระบบจะแสดงแถบเตือนสีแดงทันที พร้อมปุ่ม **One-Tap Call โทรแจ้งฝ่ายการแพทย์** และยิง Push Alert ด่วนเข้า LINE
* **Doctor-Friendly Attachment UX:** รองรับการแนบไฟล์ (PDF/JPG/PNG) หรือเลือกติ๊ก **"แนบเอกสารตามหลังภายใน 3 วัน"** ได้เพื่อไม่ให้ติดขัดขณะยื่นบนมือถือ

### 2. ฝั่งผู้อนุมัติ (Approver Flow — หัวหน้าศูนย์/หน่วยงาน)
* **LINE Flex Message 1-on-1:** ส่งข้อความแจ้งเตือนหาหัวหน้าแผนกรายบุคคล (ไม่เข้ากลุ่มรวม)
* **1-Click Approve:** ปุ่มกดอนุมัติทันทีใน LINE ผ่าน Postback Action
* **ระบุเหตุผลเมื่อไม่อนุมัติ:** ลิงก์เปิดฟอร์มระบุเหตุผล
* **Approver Portal Web UI:** ตรวจสอบรายการรออนุมัติและประวัติย้อนหลัง

### 3. ฝั่งแอดมินฝ่ายการแพทย์ (Medical Admin Portal)
* **Emergency Leave Queue:** แจ้งเตือนการลาฉุกเฉินประจำวัน พร้อมปุ่มโทรหาแพทย์ทันที
* **บันทึกการลาแทนแพทย์:** บันทึกใบลาให้แพทย์กรณีโทรแจ้งด้วยปากเปล่า/ฉุกเฉิน
* **Override อนุมัติแทน:** กดอนุมัติแทนกรณีหัวหน้าแผนกติดผ่าตัด/ฉุกเฉิน
* **จัดการข้อมูลติดต่อฝ่ายการแพทย์ (Dynamic Contact Settings):** กำหนดชื่อผู้ประสานงาน, เบอร์โทรฉุกเฉิน, เบอร์ต่อ และสายด่วน ได้เองผ่านหน้าเว็บ
* **จัดการสถานะผูก LINE ของแพทย์:** ตรวจสอบแพทย์ที่ผูก LINE แล้ว และปลดการผูก (Unlink) เมื่อแพทย์เปลี่ยนเครื่อง
* **ตั้งค่าโควตาแผนก (Department Criteria):** กำหนด `min_staff_required` (แพทย์ขั้นต่ำ) และ `max_leave_per_day` (โควตาลาสูงสุด)
* **ตั้งค่าเกณฑ์อายุงาน & สิทธิ์วันลา (Tenure Policy):** คำนวณและประมวลผลโควตาวันลาพักร้อนประจำปีตามช่วงอายุงานและนโยบายยกยอด
* **Audit Trail & PDPA:** เก็บบันทึกประวัติการกระทำทั้งหมด (ใครทำ, วันเวลา, ข้อมูลก่อน-หลัง, IP)

### 4. LIVE LINE Simulator & Flex Message Inspector
* มีตัวจำลองการส่ง LINE Flex Message แบบเรียลไทม์ในหน้าเว็บ เพื่อให้ทดสอบข้อความ 1-on-1, ปุ่มกดอนุมัติ และ Push Alert ได้ทันทีโดยไม่ต้องต่อ Webhook จริง

---

## 🛠️ โครงสร้างสถาปัตยกรรม (Tech Stack)

* **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, React Router
* **Backend:** Node.js, Express 5, Multer (File Uploads)
* **Database & Persistence:**
  * `pg` สำหรับเชื่อมต่อ PostgreSQL (เก็บข้อมูลเป็น JSONB ในตาราง `app_state`)
  * มีระบบ **High-Fidelity Embedded Database Engine** ในตัวที่โหลดข้อมูลเริ่มต้น (Seed Data) ตาม `supabase_schema.sql` พร้อมใช้งานได้ทันทีโดยไม่ต้องติดตั้งฐานข้อมูลภายนอก
* **Notification Engine:** LINE Messaging API (Flex Messages 2.0) + In-App Live Simulator

---

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Getting Started)

### 1. การรันระบบในโหมดพัฒนา (Development Mode)

```bash
# ติดตั้ง Dependency
npm install

# รันทั้ง Backend Server (Port 5000) และ Frontend Vite (Port 5173) พร้อมกัน
npm run dev:all
```

* **Frontend App:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)

### 2. การรันแบบ Production Build

```bash
# คอมไพล์ Frontend
npm run build

# รัน Express Server เดี่ยว (ให้บริการทั้ง API และหน้าเว็บที่พอร์ต 5000)
npm run server
```

### 3. การรันชุดทดสอบอัตโนมัติ (Automated Workflow Test Suite)

ระบบมีไฟล์ทดสอบครอบคลุมทั้ง 12 ขั้นตอนการทำงาน (Health, Seed, Quotas, Submission, 1-Click Approve, Same-day Emergency, Admin Override, Balances, LINE Simulator, Audit Logs):

```bash
node test_workflow.js
```

---

## ⚙️ การตั้งค่า Environment Variables (.env)

ไฟล์ `.env` อยู่ที่ root ของโปรเจกต์:

```env
# พอร์ตของเซิร์ฟเวอร์
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5173

# ข้อมูลติดต่อฝ่ายการแพทย์ฉุกเฉิน (สามารถปรับเปลี่ยนได้ผ่านหน้า Master Data Portal)
MEDICAL_ADMIN_PHONE=076-361888
MEDICAL_ADMIN_NAME=ฝ่ายการแพทย์ (คุณสิริมาศ)

# PostgreSQL (ระบุเมื่อต้องการเก็บข้อมูลบน Postgres ในระบบ Production)
DATABASE_URL=

# LINE Official Account (ระบุเมื่อต้องการส่ง Push Message เข้า LINE จริง)
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LIFF_ID=
```

> **หมายเหตุ:** หากเว้นว่างค่า DATABASE_URL และ LINE ไว้ ระบบจะเปิดใช้งาน **Embedded Engine + LINE Simulator** อัตโนมัติ ทำให้สามารถทดสอบและพรีเซนต์ระบบได้ครบทุกฟังก์ชัน 100% ทันที

---

## 👥 บัญชีผู้ใช้งานจำลอง (Demo Personas)

สามารถสลับบทบาทได้ทันทีผ่านแถบ **Persona Switcher** ด้านบนของหน้าจอ:
1. **นพ.ชาติชาย วิสัยทัศน์ (DOC-002):** แพทย์ประจำ (Full-Time) แผนกอายุรกรรม — ทดสอบยื่นลาพักร้อน, ดูสิทธิ์คงเหลือ, ลาฉุกเฉิน
2. **พญ.กันต์ธีรา พิทักษ์ชีพ (DOC-003):** แพทย์พาร์ทไทม์ (Part-Time) แผนกอายุรกรรม — ทดสอบกฎยื่นเฉพาะลาไม่รับค่าตอบแทน (ไม่มีโควตาพักร้อน)
3. **นพ.ปารวี ชาญวิทย์ (DOC-001):** หัวหน้าแผนกอายุรกรรม (Approver) — ทดสอบกดอนุมัติ/ไม่อนุมัติ 1-Click
4. **คุณสิริมาศ (ฝ่ายการแพทย์):** แอดมินฝ่ายการแพทย์ (EMP-KOONG) — ทดสอบ Dashboard, จัดการข้อมูลติดต่อ, ปลดการผูก LINE, Override อนุมัติแทน, ปรับเกณฑ์โควตาแผนก & เกณฑ์อายุงาน

---

## 📖 เอกสารคู่มือเพิ่มเติม (Documentation)

* 📄 **[docs/PRD.md](docs/PRD.md)** — เอกสารข้อกำหนดความต้องการระบบฉบับสมบูรณ์ (Product Requirements Document v1.0)
* 🚀 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — คู่มือการนำระบบขึ้น Production (Render, Docker, Nginx, SSL, Supabase Cloud)

---

## 📁 โครงสร้างโฟลเดอร์

```
D:\doctor-leave-line/
├── docs/                      # เอกสารคู่มือและข้อกำหนดระบบ
│   ├── PRD.md                 # ข้อกำหนดระบบ (PRD v1.0) ฉบับอนุมัติของโรงพยาบาลกรุงเทพศิริโรจน์
│   └── DEPLOYMENT.md          # คู่มือการ Deploy (Render, Docker, Nginx, SSL)
├── supabase_schema.sql        # โค้ดสร้างฐานข้อมูล PostgreSQL / Supabase Schema
├── package.json               # ค่าคอนฟิกและ Dependency
├── vite.config.js             # ค่าคอนฟิก Vite และ Proxy
├── tailwind.config.js         # ดีไซน์ระบบสี BSI Medical Blue & Teal
├── server/
│   ├── index.js               # เซิร์ฟเวอร์ Express 5
│   ├── db.js                  # ระบบจัดการฐานข้อมูล Persistence & Contact Settings
│   ├── line.js                # ตัวสร้าง Flex Message และ LINE API
│   ├── cron.js                # Cron Jobs ระบบคำนวณสิทธิ์ & ส่งการแจ้งเตือน
│   ├── routes/
│   │   └── api.js             # REST API Endpoint ทั้งหมด
│   └── data/
│       └── store.json         # ฐานข้อมูลจำลองสำหรับ Local Development
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Router & App Shell
│   ├── index.css              # Custom Styling & Tailwind CSS
│   ├── context/
│   │   └── AuthContext.jsx    # ระบบจัดการ Persona & Session
│   ├── components/
│   │   ├── Navbar.jsx         # แถบเมนูนำทาง (Responsive ไม่ล้นจอ)
│   │   ├── PersonaSwitcher.jsx# ตัวสลับผู้ใช้งานจำลอง 1-Click
│   │   └── LineSimulatorModal.jsx # เครื่องจำลองแชท LINE 1-on-1 Flex Message
│   └── pages/
│       ├── DoctorLiffPage.jsx     # หน้าจอ LIFF ยื่นใบลาแพทย์
│       ├── DoctorHistoryPage.jsx  # หน้าจอประวัติการลาของฉัน
│       ├── ApproverPage.jsx       # หน้าจอศูนย์อนุมัติสำหรับหัวหน้าแผนก
│       ├── OnboardingPage.jsx     # หน้าจอลงทะเบียนครั้งแรก (ค้นหาชื่อแพทย์ & ผูก LINE)
│       ├── AdminDashboardPage.jsx # แดชบอร์ดภาพรวมฝ่ายการแพทย์
│       ├── AdminCriteriaPage.jsx  # หน้าตั้งค่าเกณฑ์โควตาแผนก
│       ├── AdminMasterDataPage.jsx# จัดการสายอนุมัติ, ประเภทการลา, ผูก LINE & ข้อมูลติดต่อ
│       ├── AdminTenurePage.jsx    # หน้าคำนวณอายุงาน & สิทธิ์วันลาพักผ่อน
│       ├── AdminShiftsPage.jsx    # หน้าจัดการตารางเวรแพทย์ (Shift Schedule)
│       ├── AdminHolidaysPage.jsx  # หน้าจัดการปฏิทินวันหยุดนักขัตฤกษ์
│       └── AdminAuditPage.jsx     # หน้าตรวจสอบประวัติ Audit Log & PDPA
└── uploads/                   # โฟลเดอร์เก็บเอกสารแนบใบรับรองแพทย์
```
