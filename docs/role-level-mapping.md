# AML Static Role Level Mapping

Bot memakai mapping role statis untuk Level 1-50. Admin tidak perlu menjalankan `/leveling roles add` lagi. Role reward selalu memakai mode highest-only: member hanya memegang satu role leveling tertinggi yang sesuai dengan levelnya.

## Mapping

| Required Level | Nama Role | Role ID | Berlaku Untuk |
|---:|---|---|---|
| 1 | Level 1 | `1507285713882976317` | Level 1 |
| 2 | Level 2-3 | `1507285712418898020` | Level 2-3 |
| 4 | Level 4-5 | `1507285710736986214` | Level 4-5 |
| 6 | Level 6-7 | `1507285709101203486` | Level 6-7 |
| 8 | Level 8-10 | `1507285707465429104` | Level 8-10 |
| 11 | Level 11-13 | `1507285705829646336` | Level 11-13 |
| 14 | Level 14-16 | `1507285704273563718` | Level 14-16 |
| 17 | Level 17-19 | `1507285702641975388` | Level 17-19 |
| 20 | Level 20-22 | `1507285700418998285` | Level 20-22 |
| 23 | Level 23-25 | `1507285698926088263` | Level 23-25 |
| 26 | Level 26-28 | `1507285696979931196` | Level 26-28 |
| 29 | Level 29-31 | `1507285694890905732` | Level 29-31 |
| 32 | Level 32-34 | `1507285693309779969` | Level 32-34 |
| 35 | Level 35-37 | `1507285692282179614` | Level 35-37 |
| 38 | Level 38-40 | `1507285690503663706` | Level 38-40 |
| 41 | Level 41-43 | `1507285688351981689` | Level 41-43 |
| 44 | Level 44-46 | `1507285686347104346` | Level 44-46 |
| 47 | Level 47-48 | `1507285684757598218` | Level 47-48 |
| 49 | Level 49 | `1507285682782081054` | Level 49 |
| 50 | Level 50 | `1507285681074868264` | Level 50+ |

## Commands

Lihat mapping yang dipakai bot:

```text
/leveling roles list
/rewards
```

Sync satu user:

```text
/leveling roles sync user:@member
```

Sync semua user yang sudah punya data leveling:

```text
/leveling roles sync-all
```

## Role Management Scripts

Buat 20 role jika belum ada:

```bash
npm run roles:create
```

Hapus role leveling dari mapping:

```bash
npm run roles:delete
```

Cek role dan hierarchy guild:

```bash
npm run roles:list
```

## Notes

- Role dibuat tanpa warna custom, `hoist: false`, dan `mentionable: false`.
- Script create membuat role dari Level 50 turun ke Level 1 agar hierarchy lebih rapi.
- Bot role harus berada di atas semua role leveling agar bisa assign/remove role.
- Tabel lama `role_rewards` dibiarkan untuk kompatibilitas schema, tapi tidak dipakai oleh role sync.
