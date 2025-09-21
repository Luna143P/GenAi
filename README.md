# Generative AI-powered Startup Helper

A comprehensive platform that guides entrepreneurs through planning, validation, strategy, funding, branding, and marketing using intelligent recommendations and AI-generated content.

## Features

### Planning & Validation
- **Idea Check**: AI evaluation of startup feasibility, uniqueness, and market fit
- **Roadmap**: Step-by-step plan generation from idea to launch
- **Skill Guide**: Analysis of required skills and gaps
- **SWOT Analysis**: AI-generated strengths, weaknesses, opportunities, threats

### Pitch & Mentorship
- **Pitch Deck Generator**: Auto-generates professional pitch deck content
- **Mentor Q&A Simulation**: AI-powered pitch practice and feedback

### Market & Strategy
- **Market Analysis**: AI-generated market insights and trends
- **Competitor Analysis**: Detailed competitor strengths and weaknesses
- **Strategy Recommendations**: Customized go-to-market strategies

### Funding
- **Funding Guidance**: Personalized funding options and recommendations
- **Investor Matching**: AI-powered investor recommendations
- **Funding Readiness**: Assessment and preparation checklist

### Branding & Marketing
- **Brand Development**: AI-generated brand names and taglines
- **Logo Generation**: AI-powered logo design suggestions
- **Marketing Content**: Auto-generated social media and ad content

## Tech Stack

### Frontend
- HTML/CSS with Tailwind CSS
- Vanilla JavaScript
- Firebase Authentication

### Backend
- Node.js with Express
- Google Cloud Platform
  - Vertex AI for AI/ML processing
  - Firebase/Firestore for data storage
  - BigQuery for market analysis
  - Cloud Functions/Cloud Run for serverless deployment

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Google Cloud credentials:

a. Create a Google Cloud Project:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Note down your Project ID

b. Enable Required APIs:
   - Vertex AI API
   - Cloud Storage API
   - Cloud Tasks API
   - Cloud Pub/Sub API
   - Workflows API
   - Google Slides API
   - BigQuery API

c. Create Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name it "genai-service-account"
   - Grant required roles:
     - Vertex AI User
     - Storage Admin
     - Cloud Tasks Admin
     - Pub/Sub Publisher
     - Workflows Admin
     - Slides Creator
     - BigQuery User

d. Generate and Configure Service Account Key:
   - Select your service account
   - Go to Keys tab
   - Add Key > Create new key
   - Choose JSON format
   - Download and rename the key file to `serviceAccountKey.json`
   - Place it in the project root directory
   - Add `serviceAccountKey.json` to your `.gitignore`

e. Set Environment Variables:
   - Create a `.env` file in the project root
   - Add the following variables:
   ```env
   GOOGLE_CLOUD_PROJECT=your-project-id
   CLOUD_FUNCTIONS_BASE_URL=your-cloud-functions-url
   ```

3. Configure Firebase:
- Create a Firebase project
- Add your Firebase config to startup.html
- Set up Firestore database

4. Start the server:
```bash
npm start
```

## API Endpoints

### Planning
- POST `/api/planning/idea-check`
- POST `/api/planning/roadmap`
- POST `/api/planning/swot`
- POST `/api/planning/skill-assessment`

### Pitch
- POST `/api/pitch/generate-deck`
- POST `/api/pitch/mentor-qa`
- POST `/api/pitch/pitch-feedback`

### Market
- POST `/api/market/analysis`
- POST `/api/market/competitors`
- POST `/api/market/strategy`

### Funding
- POST `/api/funding/guidance`
- POST `/api/funding/investor-match`
- POST `/api/funding/readiness`
- POST `/api/funding/projections`

### Authentication
- POST `/api/auth/register`
- GET `/api/auth/profile`
- PUT `/api/auth/profile`
- POST `/api/auth/startup`
- GET `/api/auth/startups`

## Security

- Firebase Authentication for user management
- JWT token validation for API requests
- Secure storage of API keys and credentials
- Rate limiting and request validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License