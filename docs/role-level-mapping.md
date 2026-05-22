# AML Static Role Level Mapping

Bot memakai mapping role statis untuk Level 1-100+. Admin tidak perlu menjalankan `/leveling roles add` lagi. Role reward selalu memakai mode highest-only: member hanya memegang satu role leveling tertinggi yang sesuai dengan levelnya. User boleh naik di atas level 100, tetapi role reward tertinggi tetap `Level 91-100+`.

## Mapping

| Required Level | Nama Role | Role ID | Warna | Berlaku Untuk |
|---:|---|---|---|---|
| 1 | Level 1-2 | `1507285713882976317` | `#6F7F86` | Level 1-2 |
| 3 | Level 3-5 | `1507285712418898020` | `#78908C` | Level 3-5 |
| 6 | Level 6-10 | `1507285710736986214` | `#719B7B` | Level 6-10 |
| 11 | Level 11-15 | `1507285709101203486` | `#65A66D` | Level 11-15 |
| 16 | Level 16-20 | `1507285707465429104` | `#4FA77E` | Level 16-20 |
| 21 | Level 21-25 | `1507285705829646336` | `#3FA2A5` | Level 21-25 |
| 26 | Level 26-30 | `1507285704273563718` | `#3F8EC2` | Level 26-30 |
| 31 | Level 31-35 | `1507285702641975388` | `#4B75D1` | Level 31-35 |
| 36 | Level 36-40 | `1507285700418998285` | `#5F63D6` | Level 36-40 |
| 41 | Level 41-45 | `1507285698926088263` | `#7755D4` | Level 41-45 |
| 46 | Level 46-50 | `1507424080150659244` | `#8C4BCD` | Level 46-50 |
| 51 | Level 51-55 | `1507424078422741165` | `#A343BE` | Level 51-55 |
| 56 | Level 56-60 | `1507424076749340693` | `#B83F9A` | Level 56-60 |
| 61 | Level 61-65 | `1507424075201642729` | `#C64777` | Level 61-65 |
| 66 | Level 66-70 | `1507424073737830410` | `#CF535D` | Level 66-70 |
| 71 | Level 71-75 | `1507424071392952332` | `#D56542` | Level 71-75 |
| 76 | Level 76-80 | `1507424070130470933` | `#C9822E` | Level 76-80 |
| 81 | Level 81-85 | `1507424067693838466` | `#C19A2E` | Level 81-85 |
| 86 | Level 86-90 | `1507424065667989554` | `#B88A1F` | Level 86-90 |
| 91 | Level 91-100+ | `1507424064136937482` | `#A4282F` | Level 91+ |

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

Atau dari terminal:

```bash
npm run roles:sync-all
```

## Role Management Scripts

`roles:create` sudah retired karena mapping memakai ID role tetap:

```bash
npm run roles:create
```

Terapkan nama dan warna soft glass ke 20 role mapping berdasarkan ID:

```bash
npm run roles:apply
```

`roles:delete` sudah retired karena semua role ID lama sekarang dipakai lagi:

```bash
npm run roles:delete
```

Cek role dan hierarchy guild:

```bash
npm run roles:list
```

## Notes

- Role dibuat atau diupdate dengan warna soft glass, `hoist: false`, dan `mentionable: false`.
- Script create membuat role dari Level 91-100+ turun ke Level 1-2 agar hierarchy lebih rapi.
- Script apply tidak membuat role pengganti jika ID hilang; script akan gagal dan menampilkan ID yang perlu dicek.
- Bot role harus berada di atas semua role leveling agar bisa assign/remove role.
- Tabel lama `role_rewards` dibiarkan untuk kompatibilitas schema, tapi tidak dipakai oleh role sync.
