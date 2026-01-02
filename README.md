# Unveil

FFXIV Gear Recognition Frontend Service

## Features

- 🖼️ Image upload
- ✂️ Gear part segmentation
- 🔍 Gear recognition
- 🖱️ Image cropping

## Development

### Requirements

- Node.js 18+
- npm / yarn / pnpm

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create `.env.local` file:

```env
# Dissector API address (gear segmentation service, default port 8000)
# Note: This is a server-side variable and will not be exposed to the frontend
DISSECTOR_API=http://localhost:8000

# Revelation API address (gear recognition service, default port 5000)
# Note: This is a server-side variable and will not be exposed to the frontend
REVELATION_API=http://localhost:5000
```

### Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Build Production Version

```bash
npm run build
npm start
```

## Deployment

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Project Structure

```
.
├── app/              # Next.js App Router
│   ├── page.tsx      # Main page
│   ├── layout.tsx    # Layout
│   ├── globals.css   # Global styles
│   └── api/          # API routes
│       ├── segment/  # Segmentation proxy
│       ├── predict/  # Prediction proxy
│       └── health/   # Health check
├── components/       # React components
│   ├── ImageUpload.tsx              # Image upload component
│   ├── ImageWithCrop.tsx            # Image cropping component
│   ├── SegmentResults.tsx           # Segmentation results display
│   ├── PredictionResults.tsx        # Recognition results display
│   ├── PredictionResultsSkeleton.tsx # Skeleton loader
│   └── LoadingSpinner.tsx          # Loading spinner
└── lib/              # Utilities
    ├── api.ts        # API client
    └── types.ts      # Type definitions
```

## License

MIT
