# Product Requirements Document (PRD)
# AML Leveling — Discord Bot Leveling System

**Nama Produk:** AML Leveling  
**Platform:** Discord  
**Target Komunitas:** AML single Discord server  
**Library Utama:** Node.js + discord.js  
**Database Utama:** SQLite file via Prisma  
**Mode Produk:** Single-server / single-guild bot  
**Versi Dokumen:** 1.1  
**Status:** Siap diberikan ke developer  
**Bahasa:** Indonesia  
**Catatan versi teknis:** Rekomendasi implementasi menggunakan `discord.js` v14.x, Prisma, dan SQLite file. Validasi ulang versi final dependency sebelum implementasi produksi.

---

## 1. Ringkasan Produk

AML Leveling adalah bot Discord untuk komunitas AML yang memberikan sistem EXP dan level berdasarkan aktivitas chat yang valid. Bot ini dirancang untuk meningkatkan engagement komunitas tanpa mendorong spam atau farming EXP.

Bot akan:
- Memberikan EXP untuk pesan chat yang lolos validasi.
- Menghitung level user berdasarkan total EXP.
- Menampilkan rank dan progress user.
- Menampilkan leaderboard otomatis di channel yang ditentukan admin.
- Memperbarui leaderboard setiap 1 menit dengan mengedit pesan yang sama, bukan mengirim pesan baru.
- Memberikan role reward otomatis saat user mencapai milestone level tertentu.
- Menyediakan command user dan admin.
- Menyimpan konfigurasi, data user, log EXP, role reward, dan status leaderboard di database.
- Dioptimalkan untuk satu server Discord AML. Bot tidak dirancang sebagai bot publik multi-server pada versi awal.

Catatan arsitektur single-server:
- Bot hanya akan diundang dan dioperasikan di satu Discord guild/server AML.
- `guild_id` tetap boleh disimpan di database sebagai identitas teknis Discord dan guard agar data tidak tercampur jika bot tidak sengaja masuk server lain.
- Tidak perlu konfigurasi multi-tenant, sharding, Redis, atau database server eksternal untuk versi awal.

Fokus versi awal hanya aktivitas chat. EXP dari voice channel, reaction, event eksternal, website, atau integrasi lain tidak termasuk dalam scope awal.

---

## 2. Latar Belakang dan Masalah

Server Discord komunitas biasanya membutuhkan sistem motivasi agar member aktif berdiskusi. Sistem leveling dapat membantu karena member merasa memiliki progres, ranking, dan reward.

Namun, sistem leveling berbasis chat sering disalahgunakan. Jika EXP diberikan hanya berdasarkan jumlah pesan, member dapat farming EXP dengan:
- Mengirim pesan pendek berulang.
- Mengirim karakter acak.
- Mengulang pesan yang sama.
- Mengirim spam cepat.
- Mengirim command atau konten tidak bermakna.

AML Leveling harus menyeimbangkan dua hal:
1. Memberikan penghargaan kepada member yang aktif secara natural.
2. Mencegah sistem leveling berubah menjadi alasan untuk spam.

---

## 3. Tujuan Produk

Tujuan utama AML Leveling:

1. Memberikan sistem leveling otomatis berbasis chat valid.
2. Memberikan EXP hanya untuk pesan yang memenuhi aturan validasi.
3. Mencegah spam, pesan duplikat, pesan asal-asalan, dan farming EXP.
4. Menyediakan leaderboard otomatis yang diperbarui secara berkala.
5. Leaderboard harus diperbarui dengan edit pesan lama, bukan mengirim pesan baru.
6. Memberikan role reward otomatis berdasarkan milestone level.
7. Memberikan command untuk member melihat rank, level, EXP, progress, dan leaderboard.
8. Memberikan command admin untuk mengatur sistem leveling.
9. Menyimpan semua data penting di database agar tahan restart bot.
10. Mendukung konfigurasi untuk satu server AML.
11. Menyediakan logging dan audit trail untuk perubahan penting.
12. Menyediakan sistem yang stabil, aman, mudah dirawat, dan mudah dikembangkan.

---

## 4. Non-Goals / Di Luar Scope Versi Awal

Fitur berikut tidak termasuk versi awal:

- EXP dari voice channel.
- EXP dari reaction.
- EXP dari event manual kompleks.
- Web dashboard.
- Sistem economy, coin, shop, atau inventory.
- Moderation bot lengkap.
- AI semantic analysis untuk menilai makna chat secara mendalam.
- Integrasi Roblox.
- Integrasi website eksternal.
- Bot publik multi-server.
- Konfigurasi multi-tenant untuk banyak komunitas.
- Cross-server global leaderboard.
- Sistem seasonal leaderboard.
- Sistem achievement kompleks.
- Sistem quest atau mission harian.

Catatan penting: validasi pesan tidak boleh bergantung pada AI. Validasi harus menggunakan pendekatan teknis yang realistis seperti cooldown, duplicate detection, repeated character detection, blacklist pattern, sanity check, dan history pesan user.

---

## 5. Target User

### 5.1 Member Biasa

Member biasa adalah pengguna server AML yang berinteraksi di chat.

Kebutuhan member:
- Mendapat EXP dari chat valid.
- Naik level berdasarkan aktivitas.
- Melihat rank sendiri.
- Melihat progress menuju level berikutnya.
- Melihat leaderboard.
- Mendapat role reward otomatis.
- Mengetahui kenapa pesan tertentu tidak memberi EXP secara umum, tanpa harus melihat detail teknis internal.

### 5.2 Admin / Moderator

Admin atau moderator bertanggung jawab mengatur sistem leveling.

Kebutuhan admin:
- Mengaktifkan atau menonaktifkan sistem leveling.
- Mengatur channel leaderboard.
- Mengatur channel yang boleh atau tidak boleh memberi EXP.
- Mengatur nilai EXP minimum dan maksimum per pesan.
- Mengatur cooldown EXP.
- Mengatur daily EXP cap.
- Mengatur timezone reset harian.
- Mengatur role reward.
- Menambah, mengurangi, atau set EXP user secara manual.
- Reset data user jika diperlukan.
- Melihat log EXP dan audit command.
- Memastikan bot tidak mengganggu server.

### 5.3 Bot Owner / Developer

Bot owner atau developer bertanggung jawab terhadap deployment dan maintenance.

Kebutuhan developer:
- Mengelola token bot dengan aman.
- Mengelola database.
- Memantau error log.
- Memastikan scheduler leaderboard berjalan.
- Menangani migration database.
- Memastikan bot pulih setelah restart.
- Memastikan permission bot benar.

---

## 6. User Stories

### 6.1 User Stories Member

| ID | User Story | Prioritas |
|---|---|---|
| US-M-001 | Sebagai member, saya ingin mendapat EXP saat mengirim chat valid agar aktivitas saya dihargai. | Must Have |
| US-M-002 | Sebagai member, saya ingin melihat level dan rank saya agar tahu progres saya. | Must Have |
| US-M-003 | Sebagai member, saya ingin melihat progress menuju level berikutnya agar termotivasi aktif. | Must Have |
| US-M-004 | Sebagai member, saya ingin melihat leaderboard agar tahu posisi saya di komunitas. | Must Have |
| US-M-005 | Sebagai member, saya ingin mendapat role otomatis saat mencapai level tertentu agar level memiliki reward. | Must Have |
| US-M-006 | Sebagai member, saya ingin mendapat notifikasi saat naik level agar momen progression terasa menyenangkan. | Should Have |

### 6.2 User Stories Admin

| ID | User Story | Prioritas |
|---|---|---|
| US-A-001 | Sebagai admin, saya ingin mengatur EXP minimum dan maksimum agar balance bisa disesuaikan. | Must Have |
| US-A-002 | Sebagai admin, saya ingin mengatur cooldown agar sistem tidak mudah di-farm. | Must Have |
| US-A-003 | Sebagai admin, saya ingin mengatur daily EXP cap agar user tidak bisa grinding berlebihan. | Must Have |
| US-A-004 | Sebagai admin, saya ingin menentukan channel leaderboard agar informasi rank terlihat rapi. | Must Have |
| US-A-005 | Sebagai admin, saya ingin mengatur ignored/allowed channel agar EXP hanya berlaku di channel tertentu. | Must Have |
| US-A-006 | Sebagai admin, saya ingin mengatur role reward agar level memberi nilai nyata. | Must Have |
| US-A-007 | Sebagai admin, saya ingin menambah/mengurangi EXP manual untuk koreksi data. | Should Have |
| US-A-008 | Sebagai admin, saya ingin melihat log perubahan EXP agar transparan. | Should Have |

### 6.3 User Stories Developer

| ID | User Story | Prioritas |
|---|---|---|
| US-D-001 | Sebagai developer, saya ingin konfigurasi server AML tersimpan di database agar bot tahan restart dan mudah dirawat. | Must Have |
| US-D-002 | Sebagai developer, saya ingin ada error logging agar masalah produksi mudah dianalisis. | Must Have |
| US-D-003 | Sebagai developer, saya ingin scheduler leaderboard recovery setelah restart agar bot konsisten. | Must Have |
| US-D-004 | Sebagai developer, saya ingin struktur command modular agar fitur mudah dikembangkan. | Should Have |

---

## 7. Scope Fitur

### 7.1 Termasuk Scope

- Chat EXP System.
- Leveling System.
- Message Validation System.
- Anti-Spam dan Anti-Farming System.
- Leaderboard System.
- Role Reward System.
- Level Up Notification.
- Rank/Profile Command.
- User Commands.
- Admin Configuration Commands.
- Manual EXP Adjustment.
- Database Persistence.
- Cache Layer.
- Audit Log.
- Error Handling.
- Single-Server Configuration.
- Rate Limit Handling.
- Bot Restart Recovery.

### 7.2 Di Luar Scope

- Voice EXP.
- Reaction EXP.
- AI-based message scoring.
- Web dashboard.
- Economy/shop.
- Full moderation.
- External API integration.
- Multi-server/public bot mode.
- Multi-community public SaaS management dashboard.

---

## 8. Fitur Utama

### 8.1 Chat EXP System

Sistem memberi EXP ke user saat user mengirim pesan valid. EXP diberikan secara random antara nilai minimum dan maksimum yang dikonfigurasi.

Default:
- Minimum EXP: 5
- Maximum EXP: 10
- Cooldown EXP: 60 detik per user di server AML
- Daily chat EXP cap: 500 EXP per user per hari
- Timezone reset: Asia/Jakarta

### 8.2 Leveling System

Total EXP menentukan level user. Bot tidak boleh hanya menambah level secara naive. Level harus dihitung ulang berdasarkan total EXP agar:
- Data tetap konsisten.
- Admin dapat memberi EXP besar dan user bisa naik beberapa level sekaligus.
- Koreksi EXP bisa menurunkan atau menaikkan level secara benar.

### 8.3 Message Validation System

Pesan harus divalidasi sebelum memberi EXP. Validasi mencakup:
- Pesan bukan dari bot.
- Pesan bukan command.
- Pesan bukan di ignored channel.
- Pesan tidak melanggar cooldown.
- Pesan tidak terlalu pendek atau tidak bermakna secara teknis.
- Pesan bukan duplikat dari pesan user sebelumnya.
- Pesan tidak didominasi karakter berulang.
- Pesan bukan spam mention, link, emoji, atau attachment-only sesuai konfigurasi.

### 8.4 Anti-Spam dan Anti-Farming

Sistem harus mendeteksi pola farming EXP, termasuk:
- Burst message dalam waktu singkat.
- Pesan duplikat.
- Pesan sangat pendek berulang.
- Karakter acak atau repeated character.
- Pesan hanya mention/emoji/link.
- User yang mencoba melewati cooldown.

### 8.5 Leaderboard System

Leaderboard menampilkan user dengan level dan total EXP tertinggi. Leaderboard harus:
- Dikirim ke channel yang ditentukan admin.
- Diperbarui setiap 1 menit.
- Mengedit pesan leaderboard yang sama.
- Tidak mengirim pesan baru setiap update.
- Tetap pulih setelah restart bot.
- Menampilkan top user dengan format rapi.

### 8.6 Role Reward System

Bot memberikan role otomatis saat user mencapai level tertentu. Contoh:
- Level 5: AML Active
- Level 10: AML Regular
- Level 20: AML Veteran
- Level 30: AML Elite
- Level 50: AML Legend

Role reward harus bisa dikonfigurasi admin.

### 8.7 Level Up Notification

Saat user naik level, bot mengirim notifikasi sesuai konfigurasi. Notifikasi dapat dikirim:
- Di channel tempat user mengirim pesan.
- Di channel khusus level-up.
- Dalam bentuk ephemeral response tidak tersedia untuk message event, sehingga notifikasi message biasa dipakai untuk chat level-up.

### 8.8 User Commands

Member dapat menggunakan command untuk melihat:
- Rank sendiri.
- Rank user lain.
- Leaderboard.
- Daftar role reward.
- Profile leveling.

### 8.9 Admin Commands

Admin dapat mengatur:
- Status sistem.
- EXP min/max.
- Cooldown.
- Daily cap.
- Timezone.
- Channel leaderboard.
- Channel allowed/ignored.
- Role reward.
- EXP manual.
- Reset data.
- Log.

---

## 9. Sistem EXP

### 9.1 Konsep Data EXP

Setiap user memiliki data leveling untuk server AML:

| Field | Deskripsi |
|---|---|
| `guild_id` | ID server Discord AML. Tetap disimpan sebagai identitas teknis dan guard single-server |
| `user_id` | ID user Discord |
| `total_exp` | Total EXP lifetime user |
| `current_level` | Level saat ini |
| `current_level_exp` | EXP yang sudah terkumpul pada level saat ini |
| `required_exp_to_next_level` | EXP yang dibutuhkan untuk naik level berikutnya |
| `valid_message_count` | Jumlah pesan valid yang pernah memberi EXP |
| `invalid_message_count` | Jumlah pesan invalid yang terdeteksi |
| `daily_exp` | EXP chat yang diperoleh hari ini |
| `daily_exp_date` | Tanggal daily cap berlaku |
| `last_exp_gain_at` | Waktu terakhir user mendapat EXP |
| `last_message_at` | Waktu pesan terakhir user |
| `last_level_up_at` | Waktu terakhir naik level |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

### 9.2 Aturan Umum EXP

- User mendapat EXP hanya jika pesan valid.
- Pesan dari bot tidak dihitung.
- Pesan dari webhook tidak dihitung secara default.
- Pesan di ignored channel tidak dihitung.
- Jika allowed channel dikonfigurasi, hanya channel tersebut yang memberi EXP.
- Pesan command tidak dihitung.
- Pesan saat cooldown masih aktif tidak memberi EXP.
- Pesan spam, duplikat, atau karakter acak tidak memberi EXP.
- EXP chat tunduk pada daily EXP cap.
- EXP manual dari admin tidak harus tunduk pada daily EXP cap.
- Jika bot restart, data EXP tidak boleh hilang.
- Jika database gagal, bot tidak boleh crash tanpa handling.

### 9.3 EXP per Chat

Default:
```txt
min_exp = 5
max_exp = 10
cooldown_seconds = 60
daily_exp_cap = 500
timezone = Asia/Jakarta
```

Rumus:
```txt
valid_message_exp = random_integer(min_exp, max_exp)
```

Aturan daily cap:
- Jika `daily_exp >= daily_exp_cap`, user tidak mendapat EXP dari chat.
- Jika random EXP melebihi sisa cap, EXP yang diberikan hanya sebesar sisa cap.
- Reset daily cap dilakukan berdasarkan tanggal di timezone server AML.

Contoh:
```txt
daily_exp_cap = 500
daily_exp_user = 496
random_exp = 8
remaining_cap = 4
final_exp_given = 4
daily_exp_user_after = 500
```

---

## 10. Formula Level

### 10.1 Formula Required EXP

Gunakan formula hybrid progression:

```txt
required_exp_for_next_level = 100 + ((level - 1) * 75) + ((level - 1)^2 * 20)
```

Keterangan:
- `level` adalah current level user.
- Untuk naik dari Level 1 ke Level 2, `level = 1`.
- Formula membuat level awal mudah dicapai, tetapi level tinggi semakin sulit.

### 10.2 Contoh Required EXP

| Dari Level | Ke Level | Required EXP |
|---:|---:|---:|
| 1 | 2 | 100 |
| 2 | 3 | 195 |
| 3 | 4 | 330 |
| 4 | 5 | 505 |
| 5 | 6 | 720 |
| 6 | 7 | 975 |
| 7 | 8 | 1.270 |
| 8 | 9 | 1.605 |
| 9 | 10 | 1.980 |
| 10 | 11 | 2.395 |

### 10.3 Pseudocode

```js
function getRequiredExpForNextLevel(level) {
  return 100 + ((level - 1) * 75) + ((level - 1) ** 2 * 20);
}

function calculateLevel(totalExp) {
  let level = 1;
  let remainingExp = totalExp;

  while (remainingExp >= getRequiredExpForNextLevel(level)) {
    remainingExp -= getRequiredExpForNextLevel(level);
    level++;
  }

  return {
    level,
    currentLevelExp: remainingExp,
    requiredExpToNextLevel: getRequiredExpForNextLevel(level),
  };
}
```

### 10.4 Aturan Recalculation

Setiap kali total EXP berubah:
1. Ambil `old_level`.
2. Hitung ulang level dari `total_exp`.
3. Simpan:
   - `current_level`
   - `current_level_exp`
   - `required_exp_to_next_level`
4. Jika `new_level > old_level`, trigger:
   - Level-up notification.
   - Role reward check.
   - Audit log level-up.
5. Jika EXP dikurangi admin dan level turun, role reward harus disesuaikan berdasarkan konfigurasi `role_reward_mode`.

---

## 11. Level Milestone dan Role Reward Default

Role reward default bersifat contoh. Admin harus bisa mengubahnya.

| Level | Reward Role | Deskripsi |
|---:|---|---|
| 5 | AML Active | Member mulai aktif |
| 10 | AML Regular | Member reguler |
| 20 | AML Veteran | Member lama dan aktif |
| 30 | AML Elite | Member sangat aktif |
| 50 | AML Legend | Member top contributor |

Konfigurasi role reward harus menyimpan `role_id`, bukan nama role. Nama role dapat berubah di Discord.

---

## 12. Message Validation System

### 12.1 Tujuan Validasi

Message validation memastikan hanya chat yang layak yang memberi EXP. Sistem tidak perlu memahami makna chat seperti manusia, tetapi harus cukup kuat untuk menolak pola spam dan farming yang jelas.

### 12.2 Alur Validasi

Saat event `messageCreate` diterima:

1. Abaikan jika message berasal dari bot.
2. Abaikan jika message berasal dari webhook.
3. Abaikan jika guild tidak tersedia.
4. Abaikan jika `message.guildId` tidak sama dengan `DISCORD_GUILD_ID`.
5. Ambil konfigurasi server AML.
6. Jika leveling disabled, stop.
7. Cek channel eligibility.
8. Cek apakah message adalah command.
9. Normalize content.
10. Cek minimum content sanity.
11. Cek duplicate/repeated content.
12. Cek burst spam.
13. Cek cooldown.
14. Cek daily EXP cap.
15. Jika valid, hitung EXP.
16. Update database.
17. Update cache.
18. Trigger level-up jika ada.
19. Tambahkan log EXP.

### 12.3 Normalisasi Pesan

Normalisasi digunakan untuk duplicate detection dan repeated pattern detection.

Contoh proses:
```txt
- trim whitespace
- lowercase
- collapse multiple spaces into one
- remove markdown formatting ringan
- replace URL with <url>
- replace mentions with <mention>
- replace custom emoji with <emoji>
```

Contoh:
```txt
Input: "Halo     semua!!!"
Normalized: "halo semua!!!"
```

### 12.4 Struktur Hasil Validasi

```ts
type MessageValidationResult = {
  isValid: boolean;
  reasonCode?: string;
  normalizedContent?: string;
  metadata?: {
    contentLength: number;
    wordCount: number;
    duplicateScore?: number;
    repeatedCharRatio?: number;
    burstCount?: number;
  };
};
```

---

## 13. Message Validation Rules

### 13.1 Rule: Bot Message

Pesan dari bot tidak valid.

```txt
reasonCode = BOT_MESSAGE
```

### 13.2 Rule: Webhook Message

Pesan dari webhook tidak valid secara default.

```txt
reasonCode = WEBHOOK_MESSAGE
```

### 13.3 Rule: Guild Only

Pesan DM tidak valid.

```txt
reasonCode = NON_GUILD_MESSAGE
```

### 13.4 Rule: Target Guild Only

Karena bot hanya untuk satu server AML, pesan dari guild selain `DISCORD_GUILD_ID` tidak diproses.

```txt
reasonCode = NON_TARGET_GUILD
```

### 13.5 Rule: Channel Eligibility

Jika `allowed_channels` kosong:
- Semua channel memberi EXP kecuali ada di `ignored_channels`.

Jika `allowed_channels` tidak kosong:
- Hanya channel di `allowed_channels` yang memberi EXP.

```txt
reasonCode = CHANNEL_NOT_ELIGIBLE
```

### 13.6 Rule: Command Message

Pesan command tidak memberi EXP. Command yang perlu dideteksi:
- Prefix command lama, misalnya `!rank`, `?rank`, atau prefix yang dikonfigurasi.
- Bot mention command.
- Slash command tidak masuk `messageCreate`, tetapi tetap tidak boleh memberi EXP dari interaction.

```txt
reasonCode = COMMAND_MESSAGE
```

### 13.7 Rule: Minimum Length

Default:
```txt
min_message_length = 5
```

Pesan setelah trim harus memiliki panjang minimal 5 karakter.

```txt
reasonCode = TOO_SHORT
```

### 13.8 Rule: Minimum Word / Content Sanity

Default:
```txt
min_word_count = 2
```

Pesan dengan 1 kata masih bisa valid jika panjangnya cukup dan tidak termasuk blacklist pattern.

Contoh valid:
```txt
"mantap banget"
"aku setuju"
"bagus juga idenya"
```

Contoh invalid:
```txt
"ok"
"wkwk"
"iya"
"."
```

```txt
reasonCode = LOW_CONTENT_SANITY
```

### 13.9 Rule: Repeated Character

Pesan tidak valid jika karakter yang sama mendominasi isi pesan.

Default:
```txt
max_repeated_char_ratio = 0.7
```

Contoh invalid:
```txt
"aaaaaaa"
"!!!!!!!!!!!!"
"wkwkwkwkwkwkwk" jika terdeteksi sebagai pola berulang ekstrem
```

```txt
reasonCode = REPEATED_CHARACTER
```

### 13.10 Rule: Duplicate Message

Pesan tidak valid jika sama atau sangat mirip dengan pesan user sebelumnya dalam window tertentu.

Default:
```txt
duplicate_history_size = 5
duplicate_window_seconds = 300
```

Cek:
- Exact normalized duplicate.
- Similarity sederhana seperti Jaccard token similarity atau Levenshtein ratio.

Default threshold:
```txt
duplicate_similarity_threshold = 0.9
```

```txt
reasonCode = DUPLICATE_MESSAGE
```

### 13.11 Rule: Link Only

Pesan yang hanya berisi link tidak valid secara default.

```txt
reasonCode = LINK_ONLY
```

Konfigurasi:
```txt
allow_link_only_exp = false
```

### 13.12 Rule: Emoji Only

Pesan yang hanya berisi emoji tidak valid secara default.

```txt
reasonCode = EMOJI_ONLY
```

Konfigurasi:
```txt
allow_emoji_only_exp = false
```

### 13.13 Rule: Mention Only

Pesan yang hanya berisi mention tidak valid.

```txt
reasonCode = MENTION_ONLY
```

### 13.14 Rule: Attachment Only

Pesan yang hanya berisi attachment tanpa teks tidak valid secara default.

```txt
reasonCode = ATTACHMENT_ONLY
```

Konfigurasi:
```txt
allow_attachment_only_exp = false
```

### 13.15 Rule: Cooldown

User hanya bisa mendapat EXP sekali dalam interval cooldown.

Default:
```txt
cooldown_seconds = 60
```

```txt
reasonCode = COOLDOWN_ACTIVE
```

### 13.16 Rule: Daily Cap

Jika user sudah mencapai daily EXP cap, pesan tidak memberi EXP.

```txt
reasonCode = DAILY_CAP_REACHED
```

### 13.17 Rule: Blacklisted Pattern

Sistem memiliki daftar pattern yang tidak memberi EXP.

Default blacklist:
```txt
["test", "tes", "asdf", "qwerty", "12345", "aaaa", "....", "????"]
```

Rule ini harus hati-hati agar tidak terlalu agresif.

```txt
reasonCode = BLACKLIST_PATTERN
```

---

## 14. Anti-Spam dan Anti-Farming System

### 14.1 Tujuan

Sistem anti-spam mencegah user farming EXP tanpa membuat pengalaman chat terasa terlalu ketat.

### 14.2 Mekanisme Deteksi

#### A. Cooldown EXP

Cooldown hanya membatasi pemberian EXP, bukan membatasi user mengirim pesan.

Default:
```txt
1 EXP event per 60 detik per user di server AML
```

#### B. Burst Detection

Sistem mencatat jumlah pesan user dalam window pendek.

Default:
```txt
burst_window_seconds = 15
max_messages_per_burst_window = 5
```

Jika user mengirim lebih dari 5 pesan dalam 15 detik, pesan berikutnya tidak memberi EXP untuk sementara.

```txt
reasonCode = BURST_SPAM
```

#### C. Duplicate History

Cache menyimpan 5 normalized message terakhir per user di server AML.

Jika pesan sama atau sangat mirip, tidak memberi EXP.

#### D. Short Message Streak

Jika user mengirim banyak pesan pendek berturut-turut, EXP tidak diberikan.

Default:
```txt
short_message_length = 8
max_short_message_streak = 3
```

#### E. Random Character / Low Signal

Deteksi heuristic:
- Rasio unique character terlalu rendah.
- Terlalu banyak simbol.
- Tidak ada huruf/angka yang cukup.
- Banyak karakter berulang.

#### F. Suspicious User Cooldown Extension

Opsional:
Jika user terdeteksi farming beberapa kali dalam window tertentu, cooldown EXP dapat diperpanjang sementara.

Default awal:
```txt
enable_suspicious_cooldown_extension = false
```

### 14.3 Anti-Farming Tidak Boleh

- Menghapus pesan user.
- Memberikan punishment moderation otomatis.
- Ban/kick/mute user.
- Mengekspos detail heuristik ke public channel.

AML Leveling bukan moderation bot. Sistem hanya menentukan apakah pesan mendapat EXP atau tidak.

---

## 15. Leaderboard System

### 15.1 Tujuan

Leaderboard memperlihatkan ranking member berdasarkan level dan total EXP agar member termotivasi.

### 15.2 Sorting Leaderboard

Urutan leaderboard:
1. `current_level` tertinggi.
2. `total_exp` tertinggi.
3. `updated_at` lebih lama sebagai tie breaker opsional agar user yang mencapai lebih dulu berada di atas.
4. `user_id` sebagai deterministic fallback.

SQL order:
```sql
ORDER BY current_level DESC, total_exp DESC, updated_at ASC, user_id ASC
```

### 15.3 Format Leaderboard

Default embed:
```txt
🏆 AML Leveling Leaderboard

#1 @UserA — Level 25 • 14,520 EXP
#2 @UserB — Level 23 • 12,880 EXP
#3 @UserC — Level 20 • 10,110 EXP

Updated: 22 Mei 2026, 20:15 WIB
Next update: ±1 menit
```

Jumlah default:
```txt
leaderboard_top_limit = 10
```

Admin dapat mengubah top limit dengan batas maksimal:
```txt
max_leaderboard_top_limit = 25
```

### 15.4 Auto Update

Leaderboard harus diperbarui setiap 1 menit.

Aturan:
- Bot menyimpan `leaderboard_message_id`.
- Jika message ID ada, bot edit message tersebut.
- Jika message hilang, bot membuat message baru dan menyimpan ID baru.
- Bot tidak boleh spam channel dengan message baru setiap menit.
- Scheduler harus memiliki lock untuk server AML agar tidak terjadi update paralel.
- Jika rate limited, bot retry dengan backoff.

### 15.5 Recovery Setelah Restart

Saat bot ready:
1. Validasi bot berada di server AML yang dikonfigurasi.
2. Ambil channel dan message ID leaderboard dari database.
3. Validasi channel masih ada.
4. Validasi bot punya permission.
5. Start scheduler.
6. Lakukan update awal setelah startup delay pendek.
7. Jika message tidak ditemukan, buat message baru.

### 15.6 Permission Leaderboard

Bot membutuhkan permission:
- View Channel
- Send Messages
- Embed Links
- Read Message History
- Manage Messages tidak wajib jika hanya edit message bot sendiri, tetapi berguna untuk maintenance

---

## 16. Role Reward System

### 16.1 Tujuan

Member mendapat role otomatis saat mencapai milestone level.

### 16.2 Aturan Umum

- Role reward dikonfigurasi untuk server AML.
- Setiap reward memiliki `required_level` dan `role_id`.
- Saat user mencapai level reward, bot memberi role.
- Bot harus cek hierarchy role. Bot hanya bisa memberi role yang posisinya lebih rendah dari role tertinggi bot.
- Jika role sudah dimiliki user, jangan error.
- Jika role hilang, log error dan tandai reward invalid.
- Role reward tidak boleh diberikan ke bot user.

### 16.3 Mode Role Reward

Sediakan dua mode:

#### A. Cumulative Mode

User menyimpan semua role reward yang sudah dicapai.

Contoh:
- Level 5: AML Active
- Level 10: AML Regular

User Level 10 punya:
- AML Active
- AML Regular

Default:
```txt
role_reward_mode = cumulative
```

#### B. Highest Only Mode

User hanya menyimpan role reward tertinggi.

User Level 10 hanya punya:
- AML Regular

Role level lebih rendah dilepas otomatis.

```txt
role_reward_mode = highest_only
```

### 16.4 Role Sync

Command admin:
```txt
/leveling roles sync user:@member
/leveling roles sync-all
```

Tujuan:
- Memperbaiki role jika bot sempat offline.
- Menyesuaikan role setelah admin mengubah reward.
- Menyesuaikan role setelah EXP manual.

### 16.5 Edge Case Role

| Kondisi | Expected Behavior |
|---|---|
| Bot tidak punya Manage Roles | Simpan log error, beri respon ke admin |
| Role reward lebih tinggi dari role bot | Jangan assign, tampilkan warning |
| User keluar server | Data tetap ada, role tidak diproses |
| User join lagi | Role dapat disync saat activity berikutnya atau command sync |
| Admin menghapus role | Reward ditandai invalid saat dicek |

---

## 17. Level Up Notification

### 17.1 Tujuan

Member mendapat feedback saat naik level.

### 17.2 Default Behavior

Saat user naik level:
- Bot mengirim embed ke channel tempat EXP didapat.
- Jika `level_up_channel_id` dikonfigurasi, kirim ke channel tersebut.
- Jika user naik beberapa level sekaligus, kirim satu notifikasi ringkas.

Contoh:
```txt
🎉 Selamat @User!
Kamu naik dari Level 8 ke Level 10.
Total EXP: 2,800
Reward baru: AML Regular
```

### 17.3 Template

Default template:
```txt
🎉 Selamat {user}! Kamu naik ke Level {new_level}!
```

Variabel:
- `{user}`
- `{username}`
- `{old_level}`
- `{new_level}`
- `{total_exp}`
- `{reward_roles}`

### 17.4 Anti-Spam Notification

Jika user naik beberapa level dalam satu transaksi:
- Kirim 1 message saja.
- Jangan kirim 1 message per level.

Jika level-up dari manual EXP admin:
- Opsional kirim notifikasi public.
- Default: tidak kirim public notification, hanya command response dan audit log.

---

## 18. User Commands

Semua command disarankan menggunakan slash command Discord.

### 18.1 `/rank`

Melihat rank user.

Signature:
```txt
/rank [user]
```

Parameter:
| Parameter | Tipe | Required | Deskripsi |
|---|---|---:|---|
| `user` | User | Tidak | User yang ingin dilihat. Default diri sendiri. |

Output:
- Username.
- Current level.
- Total EXP.
- Current level EXP.
- Required EXP to next level.
- Progress bar.
- Rank leaderboard.
- Valid message count.
- Reward role terakhir.

Contoh:
```txt
AML Leveling Profile — @User
Rank: #12
Level: 9
EXP: 1,420 / 1,980
Total EXP: 5,600
Progress: ███████░░░ 72%
```

### 18.2 `/level`

Alias atau versi ringkas dari `/rank`.

Signature:
```txt
/level [user]
```

### 18.3 `/leaderboard`

Melihat leaderboard.

Signature:
```txt
/leaderboard [page]
```

Parameter:
| Parameter | Tipe | Required | Deskripsi |
|---|---|---:|---|
| `page` | Integer | Tidak | Halaman leaderboard. Default 1. |

Aturan:
- 10 user per halaman.
- Maksimal page dihitung dari total user.
- Jika page out of range, beri pesan error user-friendly.

### 18.4 `/rewards`

Melihat daftar role reward.

Signature:
```txt
/rewards
```

Output:
```txt
Level 5  → AML Active
Level 10 → AML Regular
Level 20 → AML Veteran
```

### 18.5 `/profile`

Profile leveling lebih detail.

Signature:
```txt
/profile [user]
```

Bisa dibuat sama dengan `/rank` jika ingin sederhana.

---

## 19. Admin Commands

Semua admin command membutuhkan permission minimal:
- Manage Guild, atau
- Administrator, atau
- Role admin khusus yang dikonfigurasi.

### 19.1 `/leveling config view`

Melihat konfigurasi aktif.

Output:
- Enabled/disabled.
- EXP min/max.
- Cooldown.
- Daily cap.
- Timezone.
- Leaderboard channel.
- Level-up channel.
- Allowed channels.
- Ignored channels.
- Role reward mode.

### 19.2 `/leveling enable`

Mengaktifkan leveling di server AML.

### 19.3 `/leveling disable`

Menonaktifkan leveling di server AML.

Catatan:
- Data user tidak dihapus.
- Leaderboard scheduler dihentikan sementara jika sistem disabled.

### 19.4 `/leveling set-exp`

Signature:
```txt
/leveling set-exp min:<number> max:<number>
```

Validasi:
- `min >= 0`
- `max >= min`
- `max <= 1000` default safety limit

### 19.5 `/leveling set-cooldown`

Signature:
```txt
/leveling set-cooldown seconds:<number>
```

Validasi:
- Minimal 5 detik.
- Maksimal 3600 detik.

### 19.6 `/leveling set-daily-cap`

Signature:
```txt
/leveling set-daily-cap amount:<number>
```

Validasi:
- Minimal 0.
- Maksimal 1.000.000.
- Jika 0, berarti chat EXP disabled via cap.

### 19.7 `/leveling set-timezone`

Signature:
```txt
/leveling set-timezone timezone:<string>
```

Default:
```txt
Asia/Jakarta
```

Validasi:
- Harus timezone IANA valid.

### 19.8 `/leveling leaderboard set-channel`

Signature:
```txt
/leveling leaderboard set-channel channel:<text-channel>
```

Behavior:
- Simpan channel ID.
- Kirim atau buat leaderboard message baru.
- Simpan message ID.
- Start scheduler jika belum berjalan.

### 19.9 `/leveling leaderboard refresh`

Memaksa update leaderboard saat itu juga.

### 19.10 `/leveling leaderboard disable`

Menonaktifkan auto leaderboard.

### 19.11 `/leveling channels allow-add`

Signature:
```txt
/leveling channels allow-add channel:<text-channel>
```

Menambahkan channel ke allowed list.

### 19.12 `/leveling channels allow-remove`

Menghapus channel dari allowed list.

### 19.13 `/leveling channels ignore-add`

Menambahkan channel ke ignored list.

### 19.14 `/leveling channels ignore-remove`

Menghapus channel dari ignored list.

### 19.15 `/leveling roles add`

Signature:
```txt
/leveling roles add level:<number> role:<role>
```

Validasi:
- Level minimal 1.
- Role harus lebih rendah dari role bot.
- Tidak boleh duplicate level-role yang sama.

### 19.16 `/leveling roles remove`

Signature:
```txt
/leveling roles remove level:<number>
```

Menghapus reward berdasarkan level.

### 19.17 `/leveling roles list`

Menampilkan daftar role reward.

### 19.18 `/leveling roles mode`

Signature:
```txt
/leveling roles mode mode:<cumulative|highest_only>
```

### 19.19 `/leveling exp add`

Signature:
```txt
/leveling exp add user:<user> amount:<number> reason:<string>
```

Behavior:
- Tambah total EXP.
- Recalculate level.
- Trigger role sync.
- Simpan audit log.
- Default tidak menambah daily EXP.

### 19.20 `/leveling exp remove`

Signature:
```txt
/leveling exp remove user:<user> amount:<number> reason:<string>
```

Behavior:
- Kurangi total EXP.
- Total EXP tidak boleh negatif.
- Recalculate level.
- Sync role reward sesuai mode.
- Simpan audit log.

### 19.21 `/leveling exp set`

Signature:
```txt
/leveling exp set user:<user> amount:<number> reason:<string>
```

Behavior:
- Set total EXP langsung.
- Recalculate level.
- Sync role reward.
- Simpan audit log.

### 19.22 `/leveling reset user`

Signature:
```txt
/leveling reset user:<user> confirm:<true>
```

Reset data leveling user.

### 19.23 `/leveling reset all`

Signature:
```txt
/leveling reset all confirm_text:"RESET AML LEVELING"
```

Safety:
- Harus menggunakan confirm text.
- Hanya Administrator atau Bot Owner.
- Simpan audit log.
- Pertimbangkan backup sebelum eksekusi.

### 19.24 `/leveling logs`

Signature:
```txt
/leveling logs [user] [limit]
```

Menampilkan log EXP dan admin action terbaru.

---

## 20. Database Design

### 20.1 Rekomendasi Database

Rekomendasi utama:
- SQLite file

Alasan:
- Tidak membutuhkan Docker, PostgreSQL, MySQL, atau database server eksternal.
- Cukup memakai file lokal, misalnya `prisma/dev.db`.
- Cocok untuk bot single-server dan single-process.
- Mendukung transaksi dan index yang cukup untuk kebutuhan leaderboard AML.
- Mudah di-backup dengan menyalin file database saat bot berhenti atau saat proses backup aman.

ORM opsional:
- Prisma
- Drizzle

Keputusan versi awal:
- Gunakan Prisma + SQLite.
- `DATABASE_URL` default: `file:./dev.db`.
- PostgreSQL dapat menjadi future migration jika bot berubah menjadi multi-server, multi-instance, atau memiliki traffic tinggi.

### 20.2 Tabel `guild_settings`

Menyimpan konfigurasi server AML. Nama tabel tetap `guild_settings` karena Discord menyebut server sebagai guild.

| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| `guild_id` | text | PK | Discord guild ID server AML |
| `enabled` | boolean | default true | Status leveling |
| `min_exp` | integer | default 5 | EXP minimum |
| `max_exp` | integer | default 10 | EXP maksimum |
| `cooldown_seconds` | integer | default 60 | Cooldown EXP |
| `daily_exp_cap` | integer | default 500 | Daily cap |
| `timezone` | text | default Asia/Jakarta | Timezone reset |
| `leaderboard_enabled` | boolean | default false | Status leaderboard |
| `leaderboard_channel_id` | text | nullable | Channel leaderboard |
| `leaderboard_message_id` | text | nullable | Message leaderboard |
| `leaderboard_top_limit` | integer | default 10 | Jumlah top user |
| `level_up_channel_id` | text | nullable | Channel level-up |
| `level_up_template` | text | nullable | Template notifikasi |
| `role_reward_mode` | text | default cumulative | Mode role reward |
| `allow_link_only_exp` | boolean | default false | Link only valid/tidak |
| `allow_emoji_only_exp` | boolean | default false | Emoji only valid/tidak |
| `allow_attachment_only_exp` | boolean | default false | Attachment only valid/tidak |
| `created_at` | timestamp | not null | Waktu dibuat |
| `updated_at` | timestamp | not null | Waktu update |

### 20.3 Tabel `guild_exp_channels`

Menyimpan allowed/ignored channel.

| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| `id` | text | PK | ID row UUID string |
| `guild_id` | text | index | Guild ID server AML |
| `channel_id` | text | index | Channel ID |
| `mode` | text | allow/ignore | Jenis rule |
| `created_by` | text | nullable | Admin pembuat |
| `created_at` | timestamp | not null | Waktu dibuat |

Unique:
```txt
(guild_id, channel_id, mode)
```

### 20.4 Tabel `user_level_stats`

Menyimpan data leveling user.

| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| `guild_id` | text | PK composite | Guild ID server AML |
| `user_id` | text | PK composite | User ID |
| `total_exp` | bigint | default 0 | Total EXP |
| `current_level` | integer | default 1 | Level saat ini |
| `current_level_exp` | bigint | default 0 | EXP di level saat ini |
| `required_exp_to_next_level` | bigint | default 100 | EXP ke level berikutnya |
| `valid_message_count` | bigint | default 0 | Pesan valid |
| `invalid_message_count` | bigint | default 0 | Pesan invalid |
| `daily_exp` | integer | default 0 | EXP hari ini |
| `daily_exp_date` | timestamp/date string | nullable | Tanggal daily EXP |
| `last_exp_gain_at` | timestamp | nullable | EXP terakhir |
| `last_message_at` | timestamp | nullable | Pesan terakhir |
| `last_level_up_at` | timestamp | nullable | Level-up terakhir |
| `created_at` | timestamp | not null | Waktu dibuat |
| `updated_at` | timestamp | not null | Waktu update |

Index:
```sql
CREATE INDEX idx_user_level_stats_leaderboard
ON user_level_stats (guild_id, current_level DESC, total_exp DESC);

CREATE INDEX idx_user_level_stats_user
ON user_level_stats (guild_id, user_id);
```

### 20.5 Tabel `role_rewards`

Menyimpan reward role.

| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| `id` | text | PK | ID reward UUID string |
| `guild_id` | text | index | Guild ID server AML |
| `required_level` | integer | not null | Level milestone |
| `role_id` | text | not null | Role Discord |
| `is_active` | boolean | default true | Status reward |
| `created_by` | text | nullable | Admin pembuat |
| `created_at` | timestamp | not null | Waktu dibuat |
| `updated_at` | timestamp | not null | Waktu update |

Unique:
```txt
(guild_id, required_level, role_id)
```

### 20.6 Tabel `exp_events`

Menyimpan log EXP.

| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| `id` | text | PK | ID event UUID string |
| `guild_id` | text | index | Guild ID server AML |
| `user_id` | text | index | User ID |
| `source` | text | chat/manual/system | Sumber EXP |
| `amount` | integer | not null | Jumlah EXP, bisa negatif |
| `old_total_exp` | bigint | not null | EXP sebelum |
| `new_total_exp` | bigint | not null | EXP sesudah |
| `old_level` | integer | not null | Level sebelum |
| `new_level` | integer | not null | Level sesudah |
| `reason_code` | text | nullable | Alasan |
| `message_id` | text | nullable | Message sumber |
| `channel_id` | text | nullable | Channel sumber |
| `actor_user_id` | text | nullable | Admin actor |
| `metadata` | text | nullable | JSON serialized metadata untuk SQLite |
| `created_at` | timestamp | not null | Waktu event |

Index:
```sql
CREATE INDEX idx_exp_events_guild_user_created
ON exp_events (guild_id, user_id, created_at DESC);
```

### 20.7 Tabel `invalid_message_events` Opsional

Untuk debugging anti-spam. Dapat dinonaktifkan agar tidak menyimpan terlalu banyak data.

| Column | Type | Deskripsi |
|---|---|---|
| `id` | text | ID event UUID string |
| `guild_id` | text | Guild ID server AML |
| `user_id` | text | User ID |
| `message_id` | text | Message ID |
| `channel_id` | text | Channel ID |
| `reason_code` | text | Alasan invalid |
| `metadata` | text | JSON serialized data validasi |
| `created_at` | timestamp | Waktu event |

Retention default:
```txt
7 hari
```

### 20.8 Tabel `audit_logs`

Menyimpan aksi admin dan sistem penting.

| Column | Type | Deskripsi |
|---|---|---|
| `id` | text | ID log UUID string |
| `guild_id` | text | Guild ID server AML |
| `actor_user_id` | text | Admin atau system |
| `action` | text | Jenis action |
| `target_user_id` | text | Target user jika ada |
| `before` | text | JSON serialized data sebelum |
| `after` | text | JSON serialized data sesudah |
| `reason` | text | Alasan |
| `created_at` | timestamp | Waktu log |

---

## 21. Cache Design

### 21.1 Tujuan Cache

Cache digunakan agar bot tidak melakukan query database terlalu sering untuk setiap message.

### 21.2 Data yang Dicache

| Cache Key | Isi | TTL |
|---|---|---|
| `guild_settings:{guild_id}` | Konfigurasi server AML | 5 menit atau invalidasi saat update |
| `user_cooldown:{guild_id}:{user_id}` | Last EXP gain | Berdasarkan cooldown |
| `message_history:{guild_id}:{user_id}` | 5 normalized message terakhir | 5 menit |
| `burst_counter:{guild_id}:{user_id}` | Jumlah pesan window pendek | 15 detik |
| `leaderboard_lock:{guild_id}` | Lock update leaderboard | 1 menit |
| `rank_cache:{guild_id}:{user_id}` | Rank user | 1 menit |

### 21.3 Cache Storage

MVP:
- In-memory Map.

Catatan:
- Karena cache in-memory hilang saat restart, data penting tetap harus di database.
- Cooldown hilang saat restart masih dapat diterima untuk MVP, tetapi `last_exp_gain_at` di database tetap bisa digunakan untuk validasi awal setelah restart.
- Redis tidak diperlukan untuk versi single-server single-process.

---

## 22. Event Flow

### 22.1 Flow Message EXP

```txt
messageCreate
  ↓
Ignore bot/webhook/DM
  ↓
Ignore if guildId != DISCORD_GUILD_ID
  ↓
Load server settings
  ↓
Check leveling enabled
  ↓
Check channel eligibility
  ↓
Normalize message
  ↓
Run validation rules
  ↓
If invalid:
  - increment invalid counter optional
  - write invalid event optional
  - stop
  ↓
Check cooldown
  ↓
Check daily cap
  ↓
Generate random EXP
  ↓
Clamp EXP by remaining daily cap
  ↓
Transaction:
  - get/create user_level_stats
  - add EXP
  - recalculate level
  - update counters
  - insert exp_event
  ↓
If level up:
  - sync role reward
  - send notification
  ↓
Update cache
```

### 22.2 Flow Manual EXP

```txt
Admin slash command
  ↓
Validate permission
  ↓
Validate amount and target user
  ↓
Transaction:
  - get/create user_level_stats
  - add/remove/set total_exp
  - recalculate level
  - insert exp_event
  - insert audit_log
  ↓
Sync role reward
  ↓
Reply to admin
```

### 22.3 Flow Leaderboard Scheduler

```txt
Scheduler tick every 60 seconds
  ↓
If server AML has leaderboard_enabled = true
  ↓
Acquire server leaderboard lock
  ↓
Fetch leaderboard top users
  ↓
Build embed
  ↓
Fetch channel/message
  ↓
Edit existing message
  ↓
If message missing:
  - send new message
  - save message ID
  ↓
Release lock
```

---

## 23. Leaderboard Update Scheduler

### 23.1 Requirements

- Interval update default: 60 detik.
- Scheduler berjalan setelah bot ready.
- Scheduler tidak boleh membuat update paralel untuk server AML.
- Jika update gagal, log error dan retry pada tick berikutnya.
- Jika Discord rate limit terjadi, hormati retry delay.
- Jika channel tidak ditemukan, disable leaderboard sementara dan log audit.
- Jika permission kurang, disable leaderboard sementara dan log audit.

### 23.2 Konfigurasi

```txt
leaderboard_update_interval_seconds = 60
leaderboard_top_limit = 10
max_leaderboard_top_limit = 25
```

### 23.3 Locking

In-memory lock:
```js
const leaderboardLocks = new Set();

async function updateLeaderboard(guildId) {
  if (leaderboardLocks.has(guildId)) return;
  leaderboardLocks.add(guildId);

  try {
    // update
  } finally {
    leaderboardLocks.delete(guildId);
  }
}
```

Production:
- MVP single-instance cukup in-memory lock.
- Redis lock atau DB advisory lock tidak diperlukan selama bot hanya berjalan satu process.

---

## 24. Ranking Logic

### 24.1 Leaderboard Rank

Rank dihitung berdasarkan urutan:
```sql
current_level DESC, total_exp DESC, updated_at ASC, user_id ASC
```

### 24.2 Rank User Tertentu

Untuk mendapatkan rank user:
- Query window function SQLite atau query ORM yang setara.

Contoh:
```sql
SELECT rank_position
FROM (
  SELECT
    user_id,
    ROW_NUMBER() OVER (
      ORDER BY current_level DESC, total_exp DESC, updated_at ASC, user_id ASC
    ) AS rank_position
  FROM user_level_stats
  WHERE guild_id = $1
) ranked
WHERE user_id = $2;
```

### 24.3 User Tanpa Data

Jika user belum punya data:
- Level: 1
- Total EXP: 0
- Rank: belum masuk leaderboard atau rank terakhir + 1
- Progress: 0/100

---

## 25. Progress Bar Logic

### 25.1 Formula Persentase

```txt
progress_percent = current_level_exp / required_exp_to_next_level
```

Clamp:
```txt
0 <= progress_percent <= 1
```

### 25.2 Text Progress Bar

Default panjang bar:
```txt
progress_bar_length = 10
```

Pseudocode:
```js
function buildProgressBar(current, required, size = 10) {
  const ratio = Math.max(0, Math.min(1, current / required));
  const filled = Math.round(ratio * size);
  const empty = size - filled;

  return "█".repeat(filled) + "░".repeat(empty);
}
```

Contoh:
```txt
current = 720
required = 1000
bar = ███████░░░
percent = 72%
```

---

## 26. Discord.js Technical Requirements

### 26.1 Runtime

Rekomendasi:
- Node.js 20 LTS atau versi LTS stabil yang dipilih tim.
- TypeScript direkomendasikan.
- discord.js v14.x atau versi stabil final yang divalidasi saat development.

### 26.2 Required Gateway Intents

Bot membutuhkan intent:
- `Guilds`
- `GuildMessages`
- `MessageContent`
- `GuildMembers`

Catatan:
- `MessageContent` adalah privileged intent. Developer perlu mengaktifkannya di Discord Developer Portal jika diwajibkan.
- `GuildMembers` dibutuhkan untuk assign role dan fetch member.

### 26.3 Required Bot Permissions

Minimal:
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Roles
- Use Slash Commands

Opsional:
- Manage Messages untuk maintenance leaderboard jika diperlukan.

### 26.4 Struktur Folder Rekomendasi

```txt
src/
  index.ts
  config/
    env.ts
  discord/
    client.ts
    intents.ts
    commands/
      user/
        rank.command.ts
        leaderboard.command.ts
        rewards.command.ts
      admin/
        leveling-config.command.ts
        leveling-exp.command.ts
        leveling-roles.command.ts
    events/
      ready.event.ts
      messageCreate.event.ts
      interactionCreate.event.ts
  modules/
    leveling/
      leveling.service.ts
      exp.service.ts
      level-formula.ts
      rank.service.ts
      leaderboard.service.ts
      role-reward.service.ts
      validation.service.ts
      anti-spam.service.ts
      notification.service.ts
      leveling.types.ts
    guild-settings/
      guild-settings.service.ts
    audit/
      audit.service.ts
  database/
    prisma.ts
    migrations/
  cache/
    cache.ts
  utils/
    logger.ts
    time.ts
    discord-format.ts
```

### 26.5 Environment Variables

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DATABASE_URL="file:./dev.db"
NODE_ENV=production
LOG_LEVEL=info
DEFAULT_TIMEZONE=Asia/Jakarta
LEADERBOARD_UPDATE_INTERVAL_SECONDS=60
```

Catatan:
- `DISCORD_GUILD_ID` wajib untuk mode single-server agar bot dapat memvalidasi bahwa event hanya diproses dari server AML.
- Jika bot menerima event dari guild lain, event harus diabaikan dan log warning dibuat.

---

## 27. Command Structure

### 27.1 User Command List

```txt
/rank [user]
/level [user]
/leaderboard [page]
/rewards
/profile [user]
```

### 27.2 Admin Command List

```txt
/leveling config view
/leveling enable
/leveling disable
/leveling set-exp min max
/leveling set-cooldown seconds
/leveling set-daily-cap amount
/leveling set-timezone timezone

/leveling leaderboard set-channel channel
/leveling leaderboard refresh
/leveling leaderboard disable

/leveling channels allow-add channel
/leveling channels allow-remove channel
/leveling channels ignore-add channel
/leveling channels ignore-remove channel

/leveling roles add level role
/leveling roles remove level
/leveling roles list
/leveling roles mode mode
/leveling roles sync user
/leveling roles sync-all

/leveling exp add user amount reason
/leveling exp remove user amount reason
/leveling exp set user amount reason

/leveling reset user confirm
/leveling reset all confirm_text
/leveling logs user limit
```

### 27.3 Command Response Rules

- Admin command sukses: ephemeral response.
- Error admin permission: ephemeral response.
- User `/rank`: public by default, kecuali dikonfigurasi ephemeral.
- User `/leaderboard`: public by default.
- Error user input: ephemeral jika interaction mendukung.

---

## 28. Error Handling

### 28.1 Kategori Error

| Kategori | Contoh | Handling |
|---|---|---|
| Discord API Error | Missing permission, unknown message | Log, user-friendly response |
| Database Error | Connection timeout | Retry terbatas, log critical |
| Validation Error | Input command invalid | Balas ephemeral |
| Rate Limit | Terkena Discord rate limit | Respect retry-after |
| Missing Resource | Channel/role/message hilang | Disable fitur terkait jika perlu |
| Logic Error | Calculation mismatch | Log error, trigger recalculation |

### 28.2 Prinsip Error Handling

- Bot tidak boleh crash karena satu event message gagal.
- Semua async handler harus punya try/catch.
- Error command harus dibalas dengan pesan aman.
- Error detail internal tidak boleh ditampilkan ke user biasa.
- Error penting harus masuk logger.
- Untuk production, gunakan log aggregation atau monitoring.

### 28.3 Contoh Pesan Error User-Friendly

```txt
Bot belum punya permission untuk memberikan role tersebut. Pastikan role bot berada di atas role reward.
```

```txt
Leaderboard belum dikonfigurasi. Admin dapat menjalankan /leveling leaderboard set-channel.
```

```txt
Terjadi kesalahan saat memproses command. Silakan coba lagi atau hubungi admin.
```

---

## 29. Edge Cases

| Edge Case | Expected Behavior |
|---|---|
| User mengirim pesan valid tapi cooldown aktif | Tidak mendapat EXP |
| User mencapai daily cap | Tidak mendapat EXP sampai reset harian |
| Random EXP melebihi sisa cap | EXP dipotong sesuai sisa cap |
| Admin memberi EXP besar | User bisa naik beberapa level sekaligus |
| Admin mengurangi EXP | Level recalculated, role disync sesuai mode |
| Leaderboard message dihapus | Bot membuat message baru dan menyimpan ID |
| Channel leaderboard dihapus | Disable leaderboard dan log error |
| Role reward dihapus | Log error, reward ditandai invalid |
| Bot tidak punya Manage Roles | Role tidak diberikan, log error |
| User keluar server | Data tetap tersimpan |
| User join kembali | Data lama masih berlaku |
| Database down | Event gagal aman, bot tidak crash |
| Bot restart | Scheduler dan cache dipulihkan dari database |
| Allowed dan ignored channel conflict | Allowed list lebih prioritas; ignored tetap dapat override sesuai rule di bawah |

### 29.1 Rule Konflik Channel

Rekomendasi:
- Jika `allowed_channels` tidak kosong, hanya channel di allowed list yang eligible.
- Jika channel juga ada di ignored list, ignored menang.
- Jadi final:
```txt
eligible = allowed_channels kosong atau channel ada di allowed_channels
eligible = eligible dan channel tidak ada di ignored_channels
```

---

## 30. Security dan Privacy

### 30.1 Token dan Secrets

- Token bot tidak boleh hardcoded.
- Gunakan environment variables.
- Jangan commit `.env`.
- Gunakan secret manager jika deploy production.

### 30.2 Permission

- Bot hanya meminta permission yang dibutuhkan.
- Admin command harus dicek permission-nya.
- EXP manual dan reset all harus dibatasi ke admin tepercaya.
- Role bot harus berada di atas role reward.

### 30.3 Data Privacy

Data yang disimpan:
- Guild ID.
- User ID.
- Channel ID.
- Message ID untuk event tertentu.
- Statistik EXP.
- Log action admin.

Data yang tidak perlu disimpan:
- Isi pesan mentah secara permanen.
- DM user.
- Data sensitif user.

Untuk duplicate detection:
- Simpan normalized content di cache sementara saja.
- Jika invalid log menyimpan metadata, hindari menyimpan full content mentah.

### 30.4 Abuse Prevention

- Rate limit command admin jika diperlukan.
- Reset all membutuhkan confirm text.
- Audit log semua perubahan penting.
- Hindari menampilkan reason anti-spam terlalu detail ke publik agar user tidak mudah bypass.

---

## 31. Non-Functional Requirements

### 31.1 Performance

- Message validation target selesai di bawah 100ms untuk cache hit.
- Database write untuk EXP harus efisien.
- Leaderboard query harus memakai index.
- Bot harus mampu menangani ratusan pesan per menit untuk satu server AML kecil-menengah.

### 31.2 Reliability

- Bot tidak boleh kehilangan data EXP setelah restart.
- Scheduler leaderboard harus pulih otomatis.
- Database transaction harus menjaga konsistensi EXP dan level.
- Jika role assignment gagal, EXP tetap tersimpan.

### 31.3 Scalability

- Desain single-server.
- Database index untuk leaderboard.
- Cache untuk server settings dan anti-spam.
- Tidak ada kebutuhan multi-instance pada versi awal.
- Jika bot nanti dibuka untuk banyak server, pertimbangkan migrasi ke PostgreSQL dan desain multi-tenant.

### 31.4 Maintainability

- Kode modular.
- Formula level dipisah dari service.
- Validation rules dibuat terpisah agar mudah diubah.
- Command dipisah user/admin.
- Migration database terdokumentasi.

### 31.5 Observability

Log minimal:
- Bot startup/shutdown.
- Guild settings update.
- Leaderboard update failure.
- Role assignment failure.
- Database error.
- Admin EXP adjustment.
- Reset user/all.
- Unexpected exception.

Metric opsional:
- EXP events per hour.
- Invalid message rate.
- Leaderboard update latency.
- Command error rate.

---

## 32. Acceptance Criteria

### 32.1 Chat EXP

- [ ] Pesan valid memberi EXP random antara min dan max.
- [ ] Pesan dari bot tidak memberi EXP.
- [ ] Pesan dari guild selain `DISCORD_GUILD_ID` tidak diproses.
- [ ] Pesan command tidak memberi EXP.
- [ ] Pesan di ignored channel tidak memberi EXP.
- [ ] Cooldown mencegah EXP berulang terlalu cepat.
- [ ] Daily cap membatasi EXP chat per hari.
- [ ] Jika sisa daily cap lebih kecil dari random EXP, EXP dipotong.
- [ ] Data EXP tersimpan di database.

### 32.2 Leveling

- [ ] Level dihitung dari total EXP.
- [ ] Formula required EXP sesuai spesifikasi.
- [ ] User bisa naik beberapa level dari satu transaksi EXP.
- [ ] Pengurangan EXP admin dapat menurunkan level jika total EXP tidak cukup.
- [ ] `current_level_exp` dan `required_exp_to_next_level` selalu konsisten.

### 32.3 Validation dan Anti-Spam

- [ ] Pesan terlalu pendek tidak memberi EXP.
- [ ] Pesan duplicate tidak memberi EXP.
- [ ] Pesan repeated character tidak memberi EXP.
- [ ] Pesan link-only tidak memberi EXP secara default.
- [ ] Pesan emoji-only tidak memberi EXP secara default.
- [ ] Burst spam tidak memberi EXP.
- [ ] Invalid message tidak menyebabkan bot crash.

### 32.4 Leaderboard

- [ ] Admin dapat set channel leaderboard.
- [ ] Bot membuat pesan leaderboard pertama.
- [ ] Bot menyimpan message ID leaderboard.
- [ ] Bot update leaderboard setiap 1 menit.
- [ ] Bot mengedit pesan yang sama, bukan membuat pesan baru.
- [ ] Jika pesan leaderboard hilang, bot membuat ulang.
- [ ] Leaderboard sorting sesuai level dan total EXP.
- [ ] Scheduler pulih setelah restart.

### 32.5 Role Reward

- [ ] Admin dapat menambahkan role reward.
- [ ] Bot memberi role saat user mencapai milestone.
- [ ] Bot tidak error jika user sudah punya role.
- [ ] Bot menolak role reward yang lebih tinggi dari role bot.
- [ ] Mode cumulative berjalan.
- [ ] Mode highest_only berjalan.
- [ ] Role sync dapat memperbaiki role user.

### 32.6 Commands

- [ ] `/rank` menampilkan rank dan progress user.
- [ ] `/leaderboard` menampilkan leaderboard paginated.
- [ ] `/rewards` menampilkan role rewards.
- [ ] Admin command membutuhkan permission.
- [ ] EXP manual membuat audit log.
- [ ] Reset all membutuhkan confirm text.

### 32.7 Error Handling

- [ ] Missing permission menghasilkan error user-friendly.
- [ ] Database error tidak membuat bot crash.
- [ ] Discord rate limit ditangani.
- [ ] Error penting masuk logger.

---

## 33. Test Cases

### 33.1 EXP Chat Valid

**Given** user mengirim pesan `"halo semua, apa kabar?"` di channel eligible  
**When** user tidak cooldown dan belum daily cap  
**Then** user mendapat 5–10 EXP  
**And** valid_message_count bertambah 1  
**And** exp_event tercatat

### 33.2 Cooldown Aktif

**Given** user baru mendapat EXP 10 detik lalu  
**When** cooldown adalah 60 detik  
**Then** pesan baru tidak memberi EXP  
**And** reason invalid adalah `COOLDOWN_ACTIVE`

### 33.3 Daily Cap Terpotong

**Given** daily cap 500 dan user sudah mendapat 496 EXP hari ini  
**When** random EXP adalah 8  
**Then** user hanya mendapat 4 EXP  
**And** daily_exp menjadi 500

### 33.4 Pesan Duplikat

**Given** user mengirim `"halo semua"`  
**When** user mengirim `"halo semua"` lagi dalam 5 menit  
**Then** pesan kedua tidak memberi EXP  
**And** reason invalid adalah `DUPLICATE_MESSAGE`

### 33.5 Repeated Character

**Given** user mengirim `"aaaaaaaaaaaa"`  
**When** validation berjalan  
**Then** pesan tidak memberi EXP  
**And** reason invalid adalah `REPEATED_CHARACTER`

### 33.6 Level Up Normal

**Given** user Level 1 dengan 95 EXP  
**When** user mendapat 10 EXP  
**Then** total EXP menjadi 105  
**And** user naik ke Level 2  
**And** current_level_exp menjadi 5  
**And** notification dikirim

### 33.7 Multi-Level Up Manual

**Given** user Level 1 dengan 0 EXP  
**When** admin memberi 1000 EXP  
**Then** sistem menghitung level berdasarkan total EXP  
**And** user dapat naik beberapa level sekaligus  
**And** role reward yang memenuhi syarat diberikan

### 33.8 Leaderboard Edit Message

**Given** leaderboard channel sudah diset  
**When** scheduler berjalan setiap 60 detik  
**Then** bot mengedit message ID yang sama  
**And** tidak mengirim message baru

### 33.9 Leaderboard Message Hilang

**Given** leaderboard_message_id tersimpan tetapi message sudah dihapus  
**When** scheduler update  
**Then** bot mengirim leaderboard baru  
**And** menyimpan message ID baru

### 33.10 Role Reward Permission Kurang

**Given** reward role lebih tinggi dari role bot  
**When** user mencapai level reward  
**Then** bot tidak memberi role  
**And** error dicatat  
**And** bot tidak crash

### 33.11 Reset User

**Given** user memiliki EXP dan level  
**When** admin menjalankan reset user dengan confirm true  
**Then** data user kembali ke default  
**And** audit log dibuat

### 33.12 Reset All Safety

**Given** admin menjalankan reset all tanpa confirm text benar  
**When** command diproses  
**Then** reset dibatalkan  
**And** bot memberi pesan error aman

---

## 34. API/Internal Service Contract

Catatan single-server: beberapa internal service tetap menerima `guildId` agar eksplisit terhadap Discord guild yang sedang diproses dan mencegah data tercampur jika bot tidak sengaja berada di server lain. Implementasi production harus memvalidasi `guildId` terhadap `DISCORD_GUILD_ID`.

### 34.1 `LevelFormulaService`

```ts
interface LevelFormulaResult {
  level: number;
  currentLevelExp: number;
  requiredExpToNextLevel: number;
}

interface LevelFormulaService {
  getRequiredExpForNextLevel(level: number): number;
  calculateLevel(totalExp: number): LevelFormulaResult;
}
```

### 34.2 `MessageValidationService`

```ts
interface MessageValidationService {
  validateMessage(input: ValidateMessageInput): Promise<MessageValidationResult>;
}
```

### 34.3 `ExpService`

```ts
interface ExpService {
  grantChatExp(input: GrantChatExpInput): Promise<GrantExpResult>;
  addManualExp(input: ManualExpInput): Promise<GrantExpResult>;
  removeManualExp(input: ManualExpInput): Promise<GrantExpResult>;
  setManualExp(input: SetExpInput): Promise<GrantExpResult>;
}
```

### 34.4 `LeaderboardService`

```ts
interface LeaderboardService {
  updateGuildLeaderboard(guildId: string): Promise<void>;
  getLeaderboardPage(guildId: string, page: number): Promise<LeaderboardPage>;
  getUserRank(guildId: string, userId: string): Promise<number | null>;
}
```

### 34.5 `RoleRewardService`

```ts
interface RoleRewardService {
  syncUserRewards(guildId: string, userId: string): Promise<RoleSyncResult>;
  getRewardsForLevel(guildId: string, level: number): Promise<RoleReward[]>;
}
```

---

## 35. Data Consistency Rules

1. `total_exp` tidak boleh negatif.
2. `current_level` minimal 1.
3. `current_level_exp` tidak boleh negatif.
4. `required_exp_to_next_level` harus sesuai formula level saat ini.
5. `daily_exp` tidak boleh melebihi `daily_exp_cap` untuk EXP chat.
6. Manual EXP tidak wajib mematuhi daily cap.
7. Setiap perubahan EXP harus membuat `exp_events`.
8. Setiap command admin penting harus membuat `audit_logs`.
9. Leaderboard harus bersumber dari database, bukan cache saja.
10. Role reward harus berdasarkan level setelah recalculation.

---

## 36. Deployment Requirements

### 36.1 Development

- Node.js LTS.
- SQLite file database via Prisma.
- `.env` lokal.
- Slash command registration script.
- Seed default settings saat bot pertama kali dijalankan di server AML atau command pertama.

### 36.2 Production

- Process manager seperti PM2 atau platform hosting Node.js yang sesuai.
- SQLite file disimpan di storage persisten.
- Log persistency.
- Backup file SQLite secara berkala.
- Health check.
- Restart policy.
- Secret environment variable.

### 36.3 SQLite Storage

Default lokal:
```env
DATABASE_URL="file:./dev.db"
```

Rekomendasi production:
```env
DATABASE_URL="file:./data/aml-leveling.db"
```

Catatan:
- Pastikan folder database berada di storage persisten.
- Jangan commit file `.db`.
- Backup file database saat bot berhenti atau gunakan strategi backup aman agar file tidak disalin saat transaksi aktif.

---

## 37. Migration dan Seed

### 37.1 Migration

Developer harus membuat migration untuk:
- `guild_settings`
- `guild_exp_channels`
- `user_level_stats`
- `role_rewards`
- `exp_events`
- `invalid_message_events`
- `audit_logs`

### 37.2 Seed Default Settings

Saat bot pertama kali berjalan di server AML atau command pertama dijalankan:

```json
{
  "enabled": true,
  "min_exp": 5,
  "max_exp": 10,
  "cooldown_seconds": 60,
  "daily_exp_cap": 500,
  "timezone": "Asia/Jakarta",
  "leaderboard_enabled": false,
  "leaderboard_top_limit": 10,
  "role_reward_mode": "cumulative"
}
```

---

## 38. Logging Requirements

### 38.1 Log Level

- `debug`: detail validation untuk development.
- `info`: startup, command sukses penting, leaderboard update.
- `warn`: missing permission, resource missing, invalid config.
- `error`: database error, Discord API failure, unexpected exception.
- `fatal`: bot tidak bisa startup.

### 38.2 Contoh Log

```json
{
  "level": "info",
  "event": "EXP_GRANTED",
  "guildId": "123",
  "userId": "456",
  "amount": 8,
  "oldLevel": 2,
  "newLevel": 2
}
```

```json
{
  "level": "warn",
  "event": "ROLE_ASSIGN_FAILED",
  "guildId": "123",
  "userId": "456",
  "roleId": "789",
  "reason": "ROLE_HIERARCHY_TOO_LOW"
}
```

---

## 39. Rollout Plan

### Phase 1 — MVP Core

- Setup bot discord.js.
- Slash command registration.
- Database schema.
- Chat EXP basic.
- Level formula.
- `/rank`.
- Basic validation.
- Cooldown.
- Daily cap.

### Phase 2 — Leaderboard dan Admin Config

- Leaderboard channel setup.
- Scheduler update 1 menit.
- Admin config commands.
- Allowed/ignored channels.
- `/leaderboard`.

### Phase 3 — Role Reward dan Notification

- Role reward commands.
- Auto assign role.
- Level-up notification.
- Role sync command.
- `/rewards`.

### Phase 4 — Hardening

- Anti-spam improvements.
- Audit log.
- Error handling.
- Restart recovery.
- Performance optimization.
- Test suite.

---

## 40. Future Improvements

Fitur yang bisa dikembangkan setelah MVP:

- Web dashboard untuk admin.
- Seasonal leaderboard.
- Weekly/monthly leaderboard.
- Achievement badges.
- Quest harian/mingguan.
- EXP bonus event.
- Import/export leaderboard.
- Multi-language support.
- Migrasi ke PostgreSQL jika bot berubah menjadi multi-server atau traffic tinggi.
- Multi-server/public bot support.
- Redis cache dan sharding jika skala multi-instance dibutuhkan.
- Public API.
- User card image generator.
- Configurable formula level.
- Admin analytics dashboard.

---

## 41. Open Questions

Beberapa keputusan yang perlu dikonfirmasi sebelum development final:

1. Apakah role reward default AML sudah memiliki nama role final?
2. Apakah leaderboard ingin menampilkan top 10 atau top 20?
3. Apakah level-up notification dikirim di channel chat atau channel khusus?
4. Apakah admin ingin `/rank` public atau ephemeral?
5. Apakah mode role reward yang dipakai default tetap cumulative?
6. Apakah channel tertentu seperti bot-command harus otomatis ignored?
7. Apakah invalid message events perlu disimpan di database atau cukup log development?

Keputusan final:
- Bot digunakan hanya untuk satu server Discord AML pada versi awal.
- Database menggunakan SQLite file via Prisma.
- Mode multi-server/public bot berada di luar scope.

---

## 42. Definition of Done

Produk dianggap selesai untuk versi awal jika:

- Bot bisa online dan menerima event message.
- User mendapat EXP dari pesan valid.
- User tidak mendapat EXP dari pesan invalid, cooldown, atau daily cap.
- Level dihitung akurat berdasarkan formula.
- User dapat melihat `/rank`.
- Leaderboard dapat dikonfigurasi dan auto-update setiap 1 menit.
- Leaderboard mengedit pesan yang sama.
- Role reward dapat dikonfigurasi dan diberikan otomatis.
- Admin dapat mengatur konfigurasi utama.
- Data tersimpan di database dan tidak hilang setelah restart.
- Bot memiliki error handling dasar.
- Test case utama lulus.
- Dokumentasi setup tersedia untuk developer.

---

## 43. Ringkasan Default Configuration

```json
{
  "product_name": "AML Leveling",
  "platform": "Discord",
  "library": "discord.js",
  "deployment_mode": "single_server",
  "database": "sqlite_file",
  "discord_guild_id_required": true,
  "leveling_enabled": true,
  "min_exp": 5,
  "max_exp": 10,
  "cooldown_seconds": 60,
  "daily_exp_cap": 500,
  "timezone": "Asia/Jakarta",
  "leaderboard_update_interval_seconds": 60,
  "leaderboard_top_limit": 10,
  "role_reward_mode": "cumulative",
  "min_message_length": 5,
  "min_word_count": 2,
  "duplicate_history_size": 5,
  "duplicate_window_seconds": 300,
  "duplicate_similarity_threshold": 0.9,
  "burst_window_seconds": 15,
  "max_messages_per_burst_window": 5,
  "allow_link_only_exp": false,
  "allow_emoji_only_exp": false,
  "allow_attachment_only_exp": false
}
```

---

## 44. Developer Handoff Checklist

- [ ] Buat Discord application dan bot.
- [ ] Aktifkan intent yang diperlukan.
- [ ] Siapkan invite URL dengan permission sesuai kebutuhan.
- [ ] Set `DISCORD_GUILD_ID` ke server AML.
- [ ] Setup Node.js project.
- [ ] Setup TypeScript.
- [ ] Install discord.js dan dependency database.
- [ ] Setup SQLite via Prisma.
- [ ] Buat migration.
- [ ] Buat service formula level.
- [ ] Buat service validation.
- [ ] Buat service EXP.
- [ ] Buat command user.
- [ ] Buat command admin.
- [ ] Buat leaderboard scheduler.
- [ ] Buat role reward sync.
- [ ] Buat logger.
- [ ] Buat error handler global.
- [ ] Buat test unit formula dan validation.
- [ ] Buat test integration EXP.
- [ ] Deploy staging.
- [ ] Test di server Discord AML.
- [ ] Deploy production.
