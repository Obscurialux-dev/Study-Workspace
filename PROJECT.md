# Study Workspace

## 1. Product

Study Workspace adalah personal academic workspace untuk mengelola
seluruh aktivitas kuliah dalam satu aplikasi.

Target pengguna: 1 user.

Tujuan utama: - Melihat seluruh jadwal Tuton dan deadline. - Memantau
progress setiap mata kuliah. - Menyimpan materi kuliah secara manual. -
Menyimpan catatan, diskusi, dan tugas. - Menyiapkan ujian. - Menggunakan
AI sebagai tutor yang hanya memakai konteks materi milik user jika
relevan. - Menjalankan simulasi ujian dan melihat kelemahan belajar.

Aplikasi tidak menggantikan website Tuton atau Microsoft Word. Aplikasi
menjadi command center dan knowledge base.

## 2. Prinsip Produk

1.  Local-first thinking, cloud deployment.
2.  Single-user first. Jangan membangun fitur multi-user yang tidak
    diperlukan.
3.  Data akademik harus tetap berguna tanpa AI.
4.  AI adalah layer tambahan, bukan fondasi aplikasi.
5.  Semua fitur harus sederhana untuk dioperasikan.
6.  Jangan membuat abstraksi atau library internal yang tidak
    diperlukan.
7.  Jangan over-engineer.
8.  Jangan menambah dependency tanpa alasan.
9.  Mobile responsive wajib.
10. Semua data user harus terisolasi berdasarkan authenticated user.

## 3. Core Features

### Dashboard

-   Overall progress.
-   Daftar mata kuliah.
-   Tuton progress.
-   Upcoming deadlines.
-   Aktivitas terbaru.
-   Quick actions.

### Mata Kuliah

Setiap course memiliki: - Overview. - Tuton. - Materials. - Notes. -
Assignments. - Discussions. - Exam Prep. - Exam Simulation.

### Tuton

Setiap course dapat memiliki 8 session atau jumlah session yang dapat
dikonfigurasi.

Setiap session: - nomor sesi - tanggal mulai - tanggal selesai - tipe
aktivitas: discussion atau assignment - material/inisiasi terkait -
status

Status aktivitas: - not_started - in_progress - completed

Jangan menghitung tanggal secara otomatis. Simpan tanggal resmi yang
dimasukkan user.

### Materials

User dapat memasukkan: - judul - modul - topik - session - tipe -
sumber - isi text - file jika diperlukan

V1 fokus pada text dan file upload dasar. Jangan membuat document parser
kompleks sebelum core app stabil.

### Notes

-   Global notes.
-   Course notes.
-   Related material optional.
-   Markdown/text sederhana.
-   Search.

### Assignments

-   Judul.
-   Course.
-   Session.
-   Deadline.
-   Status.
-   Deskripsi.
-   Link eksternal.
-   File attachment optional.
-   Catatan.

Workflow tetap: Workspace -\> buka Tuton -\> kerjakan -\> copy/link
hasil -\> tandai selesai.

### Discussions

-   Judul.
-   Course.
-   Session.
-   Deadline.
-   Link Tuton.
-   Draft/response text optional.
-   Status.

### Exam Prep

-   Daftar topik.
-   Review status.
-   Quiz.
-   Practice exam.
-   Weak topics.
-   Exam readiness.

## 4. AI

AI harus context-aware.

Use cases: - Explain material. - Summarize material. - Generate
flashcards. - Generate quiz. - Generate practice exam. - Explain wrong
answers. - Identify weak topics. - Create study recommendations.

AI tidak boleh mengarang sumber materi. Jika jawaban berasal dari
material yang tersimpan, sistem harus menyimpan referensi material/chunk
yang digunakan jika memungkinkan.

AI provider harus configurable melalui environment variable.

Contoh: AI_PROVIDER=gemini AI_MODEL=`<configured-model>`{=html}

Jangan hard-code provider di seluruh aplikasi.

## 5. RAG Strategy

V1: - Simpan material dalam database. - Gunakan PostgreSQL text
search/filter untuk retrieval sederhana. - Kirim hanya context yang
relevan ke AI.

Jangan mengirim seluruh database atau seluruh PDF setiap request.

V2: - Tambahkan chunking dan pgvector jika benar-benar dibutuhkan. -
Embedding provider juga harus configurable. - Jangan menambah biaya
hanya untuk membuat arsitektur terlihat canggih.

## 6. Non-Goals V1

Jangan membuat: - Social features. - Multi-user collaboration. - Public
profiles. - Payment. - Subscription. - Mobile native app. - Complex
calendar sync. - Automatic Tuton scraping. - Automatic Word editing. -
Advanced analytics. - Complex notification infrastructure.

## 7. UI Direction

Style: - Clean academic productivity dashboard. - Desktop-first tetapi
mobile responsive. - Sidebar persistent di desktop. - Bottom navigation
atau collapsible sidebar di mobile. - Card digunakan seperlunya. -
Hindari dashboard yang terlalu ramai. - Gunakan typography dan spacing
konsisten. - Dark mode boleh disiapkan jika murah, tetapi bukan
prioritas V1.

## 8. Quality Rules

-   TypeScript strict.
-   Validasi input di server.
-   Loading state.
-   Empty state.
-   Error state.
-   Confirmation untuk destructive action.
-   Jangan expose API key ke client.
-   Gunakan server-side AI calls.
-   Jangan menyimpan secret di repository.
