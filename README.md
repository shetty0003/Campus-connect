# Campus Connect

A React Native mobile application built with Expo that connects campus communities, allowing students and lecturers to interact, share content, and access campus resources.

## Features

- **Authentication System**: Secure login and registration for students and lecturers
- **User Profiles**: Customizable profiles with department, year, and bio information
- **Feed System**: Share and view posts within the campus community
- **E-Library**: Access digital resources and documents
- **Campus Map**: Interactive map for navigation
- **Real-time Updates**: Stay connected with campus activities

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Authentication, Database, Storage)
- **Navigation**: React Navigation
- **UI Components**: React Native Vector Icons, Picker
- **Maps**: React Native Maps
- **Language**: TypeScript

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/campus-connect.git
cd campus-connect
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Supabase configuration

4. Start the development server:
```bash
npm start
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Project Structure

```
src/
├── context/          # React Context providers
├── hooks/           # Custom React hooks
├── lib/             # External library configurations
├── navigation/      # Navigation setup
├── screens/         # App screens/pages
├── services/        # API services
└── types/           # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact [shettima123abba@gmail.com]
