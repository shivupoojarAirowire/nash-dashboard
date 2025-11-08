# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/123e0542-ac50-40a9-a26f-5097065dd82e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/123e0542-ac50-40a9-a26f-5097065dd82e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/123e0542-ac50-40a9-a26f-5097065dd82e) and click on Share -> Publish.

## Deploying to GitHub Pages (recommended quick automated option)

This repository is a Vite React app and can be published as a static site to GitHub Pages. A GitHub Action is included to build the site and deploy the generated `dist/` folder to the `gh-pages` branch when you push to the `main` branch.

What I added:

- `.github/workflows/deploy.yml` — builds the app and deploys `dist/` to GitHub Pages using `peaceiris/actions-gh-pages`.

How to use:

1. Ensure your default branch is named `main`. If it's `master` or another name, edit `.github/workflows/deploy.yml` to match.
2. Commit and push this repository to GitHub.
3. On push to `main`, the workflow will run, build the site, and publish it to the `gh-pages` branch.
4. In your repository Settings → Pages, set the site source to the `gh-pages` branch and the root folder (if not set automatically).

Notes and alternatives:

- If you'd rather use Vercel or Netlify (one-click deploy, previews, easy custom domains), you can connect the GitHub repo to those services instead; they will detect the Vite app and run `npm run build`.
- If you prefer containerized deployment, I can add a `Dockerfile` and a GitHub Action to push to a container registry.

If you want, I can also add an action for Netlify or a `Dockerfile`. Tell me which provider you prefer.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
