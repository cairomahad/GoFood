# 🎯 About

GoFoods is a modern, community-driven food sharing platform that empowers individuals to monetize homemade food, share surplus meals, and build a sustainable local food economy. Built with cutting-edge technologies, GoFoods provides a seamless experience for discovering and sharing food in your neighborhood.

## Why GoFoods?

- 🌱 **Sustainable** - Reduce food waste through donation and sharing
- 🤝 **Community-Driven** - Connect with neighbors and local food providers
- 💰 **Monetize** - Turn your cooking skills into income
- 🔒 **Safe & Secure** - User verification and real-time tracking
- 📱 **Mobile-First** - Fully responsive design for all devices

## ✨ Features

### 🔐 Authentication & Security

- Email/password authentication with verification
- Protected routes and role-based access
- Secure session management

### 👤 User Profiles

- Customizable profiles with avatar upload
- Location-based user discovery
- Bio, phone, and contact information

### 📍 Location Services

- **Mapbox Standard Integration** - Uber-like maps
- Interactive map view of food offerings
- Real-time location tracking
- Route planning and directions
- Distance calculation

### 🍽️ Food Marketplace

- Browse local food offerings in feed view
- Create and manage food posts with images
- Categorize items (homemade, restaurant, bakery, etc.)
- Set pricing or mark as donation/free
- Track post status (available/sold/donated)

### 💬 Real-time Communication

- Live messaging between users
- Request system for food items
- Notifications for messages and updates
- User-to-user interactions

### 🛡️ Safety Features

- **Live Trip Sharing** - Share real-time location with trusted contacts
- **Route Replay** - Review completed trips with animated playback
- **Delivery History** - Track all past deliveries
- Emergency contact integration

### 🎨 Modern UI/UX

- Tailwind CSS for beautiful, responsive design
- Framer Motion for smooth animations
- Lucide React icons
- Dark mode support
- Mobile-optimized interface

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI Framework |
| React Router DOM | 7.11.0 | Client-side routing |
| TanStack Query | 5.90.12 | Server state management |
| Tailwind CSS | 3.4.19 | Styling framework |
| Framer Motion | 12.23.26 | Animations |
| React Hook Form | 7.69.0 | Form management |
| Zod | 4.2.1 | Schema validation |

### Backend & Services

| Service | Version | Purpose |
|---------|---------|---------|
| Appwrite | 21.5.0 | Backend-as-a-Service |
| Mapbox GL | 3.17.0 | Maps & Location |
| React Map GL | 8.1.0 | React Mapbox wrapper |

### UI Components

- **Icons:** Lucide React 0.562.0
- **Notifications:** React Toastify 11.0.5
- **Date Handling:** date-fns 4.1.0
- **Testing:** React Testing Library

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- Appwrite account ([Sign up](https://cloud.appwrite.io))
- Mapbox account ([Sign up](https://www.mapbox.com))

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/gofoods.git
cd gofoods
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update with your credentials:

```env
REACT_APP_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
REACT_APP_APPWRITE_PROJECT_ID=your_project_id
REACT_APP_APPWRITE_DATABASE_ID=your_database_id
REACT_APP_APPWRITE_USERS_COLLECTION_ID=users
REACT_APP_APPWRITE_POSTS_COLLECTION_ID=fooditems
REACT_APP_APPWRITE_FOODS_COLLECTION_ID=fooditems
REACT_APP_APPWRITE_REQUESTS_COLLECTION_ID=requests
REACT_APP_APPWRITE_MESSAGES_COLLECTION_ID=messages
REACT_APP_APPWRITE_BOOKMARKS_COLLECTION_ID=bookmarks
REACT_APP_APPWRITE_NOTIFICATIONS_COLLECTION_ID=notifications
REACT_APP_APPWRITE_STORAGE_BUCKET_ID=your_bucket_id
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
```

4. **Set up Appwrite**

Create the following collections in your Appwrite database:

- Users Collection
- Food Items Collection
- Requests Collection

**Create Storage Bucket**

- Create a bucket for avatars and food images
- Set appropriate permissions (read/write)

5. **Run the application**

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
gofoods/
├── public/                      # Static assets
│   ├── index.html              # HTML template
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/             # Reusable components
│   │   ├── bookmarks/          # Bookmark components
│   │   ├── common/             # Shared UI components
│   │   ├── layout/             # Layout (Sidebar, Topbar)
│   │   ├── map/                # Map components
│   │   ├── notifications/      # Notification components
│   │   ├── posts/              # Food post components
│   │   ├── profile/            # Profile components
│   │   └── requests/           # Request components
│   ├── config/                 # Configuration files
│   │   ├── appwrite.js         # Appwrite setup
│   │   └── mapbox.js           # Mapbox configuration
│   ├── context/                # React Context
│   │   └── AuthContext.js      # Authentication context
│   ├── lib/                    # API functions
│   │   ├── bookmarks.js        # Bookmark operations
│   │   ├── foodItems.js        # Food item operations
│   │   ├── messages.js         # Messaging functions
│   │   ├── notifications.js    # Notification functions
│   │   ├── requests.js         # Request operations
│   │   └── users.js            # User operations
│   ├── pages/                  # Page components
│   │   ├── auth/               # Authentication pages
│   │   ├── bookmarks/          # Bookmarks page
│   │   ├── feed/               # Main feed
│   │   ├── history/            # Delivery history
│   │   ├── map/                # Map view
│   │   ├── messages/           # Messaging
│   │   ├── posts/              # Food detail pages
│   │   ├── profile/            # User profiles
│   │   ├── requests/           # Request management
│   │   └── shared/             # Shared trip view
│   ├── utils/                  # Utility functions
│   ├── App.js                  # Main app component
│   └── index.js                # Entry point
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
├── tailwind.config.js          # Tailwind configuration
└── README.md                   # This file
```

## 🗺️ Roadmap

### ✅ Completed

- Authentication & Email Verification
- User Profile Management
- Food Posts Creation & Management
- Location Services with Mapbox
- Real-time Messaging
- Bookmarks System
- Request Management
- [x] Recipe Sharing
- Live Location Tracking
- Safety Share (Trip Sharing)
- Delivery History & Route Replay

### 🚧 In Progress

- Admin Panel
- Rating & Review System
- Payment Integration

### 📅 Planned

- Push Notifications
- Advanced Search & Filters
- Social Features (Follow, Like, Comment)
- Meal Planning
- Dietary Preferences & Filters
- Multi-language Support
- Dark Mode

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

- **Project Link** - [https://github.com/BotCoder254/gofoods](https://github.com/BotCoder254/gofoods)
- **Email** - telvivaztelvin@gmail.com

## 🙏 Acknowledgments

- React
- Appwrite
- Tailwind CSS
- Mapbox
- Lucide Icons
- Framer Motion
- Unsplash for images
