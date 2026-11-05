# FashionAI Frontend - Production-Grade React Vite Application

## 🚀 Overview

This is a complete, production-ready React + Vite frontend for the **FashionAI Virtual Try-On Platform**. The application is built with:

- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Premium animations
- **Axios** - HTTP client with interceptors
- **React Router** - Client-side routing
- **Context API** - State management
- **JSX/JavaScript** - No TypeScript required

## 📁 Project Structure

```
Frontend/
├── src/
│   ├── App.jsx                          # Root component with routing
│   ├── main.jsx                         # Entry point
│   ├── services/
│   │   ├── axios.js                     # Axios instance with interceptors
│   │   └── api/
│   │       ├── auth.js                  # Authentication endpoints
│   │       ├── user.js                  # User profile endpoints
│   │       ├── wardrobe.js              # Wardrobe management
│   │       ├── tryon.js                 # Try-on with polling
│   │       ├── recommendation.js        # Recommendations engine
│   │       ├── payment.js               # Subscription & payments
│   │       └── admin.js                 # Admin dashboard
│   ├── contexts/
│   │   ├── AuthContext.jsx              # Auth state & methods
│   │   ├── UserContext.jsx              # User profile state
│   │   ├── WardrobeContext.jsx          # Wardrobe items state
│   │   ├── TryOnContext.jsx             # Try-on jobs & polling
│   │   ├── RecommendationContext.jsx    # Recommendations state
│   │   ├── SubscriptionContext.jsx      # Subscription plans
│   │   ├── AdminContext.jsx             # Admin state
│   │   └── NotificationContext.jsx      # Toast notifications
│   ├── hooks/
│   │   └── index.js                     # Custom hooks exports
│   ├── components/
│   │   ├── ProtectedRoute.jsx           # Auth protection
│   │   └── NotificationContainer.jsx    # Toast UI
│   ├── pages/
│   │   ├── Auth/                        # Authentication pages
│   │   ├── Dashboard/                   # Main dashboard
│   │   ├── Wardrobe/                    # Wardrobe management
│   │   ├── TryOn/                       # Try-on feature
│   │   ├── Recommendations/             # AI recommendations
│   │   ├── Subscription/                # Plans & payment
│   │   ├── Settings/                    # User settings
│   │   └── Admin/                       # Admin dashboard
│   ├── styles/
│   │   └── globals.css                  # Global Tailwind styles
│   ├── utils/
│   │   └── validators.js                # Validation utilities
│   └── assets/                          # Images, icons
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env                                 # Environment variables
├── .env.example                         # Environment template
└── index.html                           # HTML template
```

## 🔧 Setup & Installation

### 1. Install Dependencies

```bash
cd Frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

### 3. Start Development Server

```bash
npm run dev
```

The app will run at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder

## 🏗️ Architecture

### API Service Layer

Each API endpoint module is in `services/api/`:

```javascript
// services/api/auth.js
export const sendOTP = (email) => API.post('/auth/send-otp', { email });
export const login = (email, password) => API.post('/auth/login', { email, password });
```

**Key Features:**
- ✅ Centralized Axios instance with interceptors
- ✅ Automatic token injection from localStorage
- ✅ 401 error handling with auto-logout
- ✅ File upload support with progress tracking
- ✅ Request/response error handling

### State Management (Contexts)

State is managed using React Context API, not Redux:

```javascript
// Usage in components
const { user, token, isAuthenticated, login, logout } = useAuth();
const { profile, fetchProfile, updateProfile } = useUser();
const { items, fetchItems, uploadItem } = useWardrobe();
```

**Benefits:**
- ✅ No external dependency
- ✅ Modular context providers
- ✅ Easy to understand
- ✅ Built-in React patterns

### Authentication Flow

1. **Login Page** → Submit email/password
2. **Auth Service** → Call `/auth/login` API
3. **AuthContext** → Store token + user in localStorage + state
4. **Axios Interceptor** → Inject token in all requests
5. **Protected Routes** → Check `isAuthenticated` before rendering
6. **401 Response** → Auto-logout + redirect to login

### Try-On Polling

The Try-On feature uses polling for AI processing:

```javascript
const { createTryOn, pollForCompletion } = useTryOn();

// 1. Create job (may return processing status)
const job = await createTryOn(topItemId, overridePhoto);

// 2. If processing, poll for completion
if (job.status === 'processing') {
  const result = await pollForCompletion(job.id);
}
```

**Polling Logic:**
- Checks every 2 seconds (configurable)
- Times out after 5 minutes
- Updates progress UI
- Returns completed job or throws error

## 🎨 UI & Styling

### Tailwind CSS

Global styles in `styles/globals.css`:

- **Dark theme** by default (`@apply bg-dark-bg`)
- **Glass effect** components (`.glass`, `.card-glass`)
- **Gradient utilities** (`.text-gradient`, `.gradient-mesh`)
- **Neon glow** effects (`.neon-glow`, `.shadow-glow`)
- **Smooth animations** (`.transition-all-smooth`)

### Custom Classes

```html
<!-- Buttons -->
<button class="btn-primary">Primary Button</button>
<button class="btn-secondary">Secondary Button</button>
<button class="btn-ghost">Ghost Button</button>

<!-- Cards -->
<div class="card">Regular Card</div>
<div class="card-glass">Glass Card</div>

<!-- Inputs -->
<input class="input-field" type="text" />

<!-- Text -->
<h1 class="text-gradient">Gradient Text</h1>
```

### Framer Motion Animations

Built-in animations for all pages:

```javascript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Animated Content
</motion.div>
```

## 📝 Usage Examples

### Fetching User Profile

```javascript
import { useUser } from '@/hooks';

function MyComponent() {
  const { profile, fetchProfile, isLoading } = useUser();

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div>
      {isLoading ? 'Loading...' : <p>Welcome, {profile?.name}</p>}
    </div>
  );
}
```

### Uploading Wardrobe Item

```javascript
import { useWardrobe, useNotification } from '@/hooks';

function UploadItem() {
  const { uploadItem, isLoading } = useWardrobe();
  const { showSuccess, showError } = useNotification();

  const handleUpload = async (file, type) => {
    try {
      await uploadItem(type, file);
      showSuccess('Item uploaded!');
    } catch (err) {
      showError('Upload failed');
    }
  };

  return (
    <input
      type="file"
      onChange={(e) => handleUpload(e.target.files[0], 'top')}
    />
  );
}
```

### Creating Try-On Job

```javascript
import { useTryOn, useNotification } from '@/hooks';

function TryOnFeature() {
  const { createTryOn, isProcessing, processingProgress } = useTryOn();
  const { showSuccess } = useNotification();

  const handleTryOn = async (topItemId) => {
    const job = await createTryOn(topItemId);
    showSuccess('Try-on created!');
  };

  return (
    <div>
      {isProcessing && <p>Processing: {processingProgress}%</p>}
      <button onClick={() => handleTryOn('item-id')}>
        Start Try-On
      </button>
    </div>
  );
}
```

## 🔐 Authentication

### Login Flow

```javascript
const { login } = useAuth();

await login('user@example.com', 'password123');
// Token is automatically stored in localStorage
// Axios interceptor adds token to all requests
```

### Logout Flow

```javascript
const { logout } = useAuth();

logout();
// Clears localStorage
// Clears all state
// Redirects to login
```

### Protected Routes

```javascript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Register new account with OTP flow
- [ ] Upload wardrobe item
- [ ] Create try-on job
- [ ] Get recommendations
- [ ] View subscription plans
- [ ] Process payment (Razorpay)
- [ ] Update profile
- [ ] Change password
- [ ] Logout

### API Testing

Use Postman or cURL to test backend endpoints:

```bash
# Get current user
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/me

# Upload wardrobe item
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -F "type=top" \
  -F "file=@image.jpg" \
  http://localhost:8000/wardrobe/items
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel (Recommended)

```bash
npx vercel
```

### Deploy to Netlify

```bash
npm run build
# Drag dist/ folder to Netlify
```

### Deploy to Custom Server

```bash
npm run build
# Copy dist/ to server web root
# Configure reverse proxy for /api routes
```

## 📊 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_API_TIMEOUT` | Request timeout (ms) | `30000` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key | `rzp_live_xxxxx` |
| `VITE_ENABLE_TRY_ON` | Enable try-on feature | `true` |
| `VITE_TRYON_POLLING_INTERVAL` | Polling interval (ms) | `2000` |
| `VITE_TRYON_MAX_POLLING_TIME` | Max polling time (ms) | `300000` |
| `VITE_MAX_IMAGE_SIZE` | Max file size (bytes) | `10485760` |

## 🐛 Common Issues

### 401 Unauthorized

**Problem:** Getting 401 on API requests
**Solution:** Ensure token is stored in localStorage after login

```javascript
localStorage.setItem('access_token', token);
```

### CORS Errors

**Problem:** "Access to XMLHttpRequest blocked by CORS"
**Solution:** Backend must have CORS enabled. Check backend `settings.py` or equivalent.

### Images Not Loading

**Problem:** Media files showing 404
**Solution:** Ensure `VITE_MEDIA_BASE_URL` matches backend media server

```env
VITE_MEDIA_BASE_URL=http://localhost:8000/media
```

### Polling Timeout

**Problem:** Try-on results taking too long
**Solution:** Increase `VITE_TRYON_MAX_POLLING_TIME` or check backend processing

## 📚 Documentation Links

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Router Docs](https://reactrouter.com/)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Commit: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Create Pull Request

## 📄 License

Proprietary - FashionAI Inc.

## 📞 Support

For issues or questions, contact the development team.

---

**Status:** Production Ready ✅
**Last Updated:** May 2026
**Version:** 1.0.0
