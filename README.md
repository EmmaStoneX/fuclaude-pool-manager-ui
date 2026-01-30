# FuClaude Pool Manager UI

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-0.2.0-blue?style=for-the-badge)](https://github.com/EmmaStoneX/fuclaude-pool-manager-ui)

</div>

This is a frontend web application designed to interact with the [FuClaude Pool Manager](https://github.com/EmmaStoneX/fuclaude-pool-manager) Cloudflare Worker backend.

It provides a user-friendly interface for both end-users to log in to Claude instances and for administrators to manage the pool of accounts.

- **Backend Project**: [https://github.com/EmmaStoneX/fuclaude-pool-manager](https://github.com/EmmaStoneX/fuclaude-pool-manager)

This project is built with React and TypeScript, structured for use with [Vite](https://vitejs.dev/) as the build tool.

If you find this project helpful, please consider giving it a star on GitHub! ⭐

## ✨ Features

### User Features
*   **OAuth Login:** Supports login via **LinuxDO** and **GitHub** OAuth providers.
*   **Random Login:** Allows users to quickly get a login URL using a randomly selected account from the pool.
*   **Specific Account Login:** Lists available email accounts. Users can select an account and provide a unique session identifier to log in.
*   **Token Expiration:** Users can specify a desired token expiration time in seconds when logging in.
*   **Session Isolation:** Each user gets an isolated session with their own unique identifier.

### Admin Features (`/admin` path)
*   Password protected admin panel.
*   **Account Listing:** View all configured email accounts and previews of their session keys (SKs).
*   **Add Account:** Add new email-SK pairs to the pool.
*   **Update Account:** Modify existing email addresses or update their SKs.
*   **Delete Account:** Remove accounts from the pool.
*   **Batch Operations:** Perform bulk additions or deletions of accounts using a JSON input.
*   **User Management:** View and manage all registered users (LinuxDO and GitHub).
    *   View user details including login count, last login time, and trust level (LinuxDO).
    *   Ban/Unban users from either provider.
    *   Filter users by provider (LinuxDO/GitHub) and status (active/banned).
*   **Backend Configuration:** Configure the backend Worker URL directly from the admin panel.

### Other Features
*   **Responsive Design:** Adapts to various screen sizes.
*   **User Feedback:** Loading indicators and toast notifications for API interactions.
*   **Modern UI:** Clean, modern interface with Fluent 2.0 inspired design.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEmmaStoneX%2Ffuclaude-pool-manager-ui&env=VITE_WORKER_URL&envDescription=Enter%20your%20FuClaude%20Pool%20Manager%20Worker%20URL&project-name=fuclaude-pool-ui&repository-name=fuclaude-pool-manager-ui)

**Important:** When deploying with Vercel, you will be prompted to enter the `VITE_WORKER_URL` environment variable during the setup process.

Use the following template for the `VITE_WORKER_URL` value: `https://<your-worker-name>.<your-account-id>.workers.dev`

## Prerequisites

*   A modern web browser.
*   Node.js and npm/yarn (for development/building).
*   A deployed instance of the [FuClaude Pool Manager](https://github.com/EmmaStoneX/fuclaude-pool-manager) Cloudflare Worker.

## Getting Started (Development with Vite)

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/EmmaStoneX/fuclaude-pool-manager-ui.git
    cd fuclaude-pool-manager-ui
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Worker URL (Development):**
    *   Create a `.env.local` file in the project root:
        ```env
        VITE_WORKER_URL=http://localhost:8787
        ```
        Replace the URL with your actual development worker URL.

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server at `http://localhost:5173`.

## Building for Production

1.  **Ensure `VITE_WORKER_URL` is set** in your environment.
2.  **Run the Build Command:**
    ```bash
    npm run build
    ```
    This will generate optimized static assets in the `dist` folder.

## Deployment

Deploy the contents of the `dist` folder to any static web hosting service such as Cloudflare Pages, Vercel, Netlify, or Azure Static Web Apps.

## OAuth Configuration

To enable OAuth login (LinuxDO and GitHub), you need to configure the following environment variables in your backend Worker:

### LinuxDO OAuth
- `LINUXDO_CLIENT_ID` - Your LinuxDO OAuth client ID
- `LINUXDO_CLIENT_SECRET` - Your LinuxDO OAuth client secret (set as secret)
- `LINUXDO_REDIRECT_URI` - OAuth callback URL (e.g., `https://your-worker.workers.dev/api/auth/callback/linux-do`)

### GitHub OAuth
- `GITHUB_CLIENT_ID` - Your GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth client secret (set as secret)
- `GITHUB_REDIRECT_URI` - OAuth callback URL (e.g., `https://your-worker.workers.dev/api/auth/callback/github`)

### Common
- `FRONTEND_URL` - Your frontend application URL for redirects after login

## Usage

*   **User View (Default):**
    *   Access the application and login with LinuxDO or GitHub.
    *   Use the "Random Login" button or select a specific email account.
*   **Admin View:**
    *   Navigate to the `/admin` path.
    *   Enter your admin password to access management features.

## Project Structure

*   `src/main.tsx`: The main React/TypeScript application entry point.
*   `src/App.tsx`: The root application component.
*   `src/components/`: Reusable UI components.
*   `src/views/`: Page-level view components.
*   `src/hooks/`: Custom React hooks.
*   `src/contexts/`: React context for global state.
*   `src/types/`: TypeScript type definitions.
*   `index.css`: Global styles.

## Bonus: FuClaude Return Button (Tampermonkey Script)

A Tampermonkey script is included at `scripts/fuclaude-back-button.user.js` that adds a "Return to Pool Manager" button on your FuClaude mirror site for easy navigation back.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
Forked from [f14XuanLv/fuclaude-pool-manager-ui](https://github.com/f14XuanLv/fuclaude-pool-manager-ui)