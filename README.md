# Crompton Trade Hub

Build 'Crompton Trade Hub' (B2B E-commerce & Wholesale Web App). 
Stack: React, Vite, Tailwind CSS, Lucide, SheetJS, DOMPurify, browser-image-compression, Supabase JS.

Core Requirements (Single-Shot Build):
1. UI/UX: Amazon/Flipkart style sticky search header, clean product grid cards, WebP image thumbnails, wholesale vs retail price display, and MOQ badges.
2. Guest Access: Unauthenticated visitors can freely browse products, categories, and banners. Force sign-up ONLY at checkout.
3. Smart Auth & Role Hiding: Roles: Admin, Dealer, Retailer. Query Supabase profiles on register; if an Admin exists, auto-hide the 'Admin' role option.
4. Admin Dashboard: 
   - Universal Bulk Import: Parse MS Excel (.xlsx, .xls) & LibreOffice Calc (.ods) via SheetJS.
   - Image Optimization: Client-side compression to WebP (80-85% quality) via browser-image-compression.
   - Dynamic Attributes: JSON spec-builder for custom product boxes.
   - Marketing: Banner/scheme toggles and third-party sponsored ad sections + User upgrade/degrade controls.
5. Secure B2B Cart & Checkout: MOQ validation, input sanitization via DOMPurify, and anti-tampering security (never send client prices; send product IDs and quantities to Supabase RPC function 'place_b2b_order').
6. Add-ons: Floating AI shopping assistant widget and configurable payment gateway toggle.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd47119b-cdc4-489b-80de-872ca15e46e0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
