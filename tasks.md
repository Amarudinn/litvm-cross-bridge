# Tasks: Unify Prediction Market Theme with Main App

## Goal
Menyamakan tema prediction pages (`/predict/*`) dengan tema utama litvm (`/`, `/swap`, `/history`, dll) sehingga terasa seperti satu aplikasi.

## Current State
- Main app: dark navy background (`hsl(224 25% 5%)` ≈ `#0b0c10`), blue primary, purple secondary, emerald green CTA
- Prediction pages: pure black background (`#09090b`), emerald green accent, custom header terpisah

## Tasks

### 1. Background & Base Colors
- [ ] Ubah prediction wrapper dari `bg-[#09090b]` ke `bg-background` (pakai CSS var litvm)
- [ ] Hapus inline style override CSS variables di `App.tsx` prediction section
- [ ] Prediction pages gunakan dark mode CSS vars yang sama dengan main app

### 2. Header
- [ ] Hapus prediction-layout header terpisah
- [ ] Gunakan header utama litvm (yang sudah punya menu Prediction)
- [ ] Prediction pages render di dalam layout utama (dengan Header + ShapeGrid)

### 3. Buttons
- [ ] Prediction buttons pakai variant yang sama dengan main app:
  - Primary CTA: `bg-accent text-[#09090b]` (hijau) → sudah sama
  - Secondary: `bg-surface-hover text-text-primary` → sesuaikan ke litvm style `bg-muted text-foreground`
  - Outline: border style sama dengan main app

### 4. Cards
- [ ] Prediction market cards pakai style yang konsisten:
  - Background: `bg-card` (dari CSS var) bukan hardcoded `bg-surface`
  - Border: `border-border` (dari CSS var)
  - Rounded: `rounded-2xl` (sama seperti BridgeCard)
  - Optional: animated gradient border untuk featured markets

### 5. Text Colors
- [ ] Ganti `text-text-primary` → `text-foreground`
- [ ] Ganti `text-text-secondary` → `text-muted-foreground`
- [ ] Ganti `text-accent` → tetap `text-accent` (sudah emerald green)

### 6. Inputs/Forms
- [ ] Prediction form inputs pakai style yang sama dengan main app forms
- [ ] Background: `bg-input` atau `bg-muted`
- [ ] Border: `border-border`
- [ ] Focus: `focus:ring-ring`

### 7. Layout Structure
- [ ] Prediction pages masuk ke dalam `<main>` yang sama dengan pages lain
- [ ] Pakai `pt-14` (padding untuk fixed header)
- [ ] Max-width dan padding konsisten

### 8. Cleanup
- [ ] Hapus file `components/prediction-layout/header.tsx` (tidak dipakai lagi)
- [ ] Hapus file `components/prediction-layout/page-layout.tsx` (tidak dipakai lagi)
- [ ] Hapus inline CSS variables di prediction wrapper
- [ ] Hapus `components/prediction-layout/PredictionLayout.tsx`
- [ ] Update `App.tsx` — prediction routes masuk ke layout utama
