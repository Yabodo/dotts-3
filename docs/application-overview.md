# 💻 Application Overview

Dotts is a social connection platform that helps combat loneliness by facilitating real-world meetups at cafes. Users can:

- Sign up and create a profile
- Set their availability status for meetups
- Find and connect with potential friends
- Discover nearby cafes
- Coordinate meetups with matched friends
- Manage friend requests and connections

## Getting Started

To set up Dotts locally, follow these steps:

1. Configure Supabase:

- Create a new account on [Supabase](https://supabase.com/)
- Create a new project and obtain your Supabase URL and API keyO_PUBLIC_API_URL` and `EXPO_PUBLIC_API_KEY` variables in the `.env` file

2. Clone the repository:
   ```bash
   git clone https://github.com/your-username/dotts.git
   cd dotts
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials and other required variables

5. Start the development server:
   ```bash
   npm start
   ```

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Location Services**: Google Maps API
- **State Management**: React Context API

## Project Structure

dotts/
├── src/
│ ├── components/ # Reusable UI components
│ ├── screens/ # Screen components
│ ├── navigation/ # Navigation configuration
│ ├── services/ # API and external service integrations
│ ├── hooks/ # Custom React hooks
│ ├── utils/ # Helper functions and utilities
│ └── constants/ # App-wide constants
├── assets/ # Images, fonts, and other static files
└── docs/ # Project documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Proprietary License. All rights reserved. Unauthorized copying, distribution, or modification of this project is strictly prohibited.

## Support

For support, please open an issue in the GitHub repository or contact the development team at Github - Yabodo.