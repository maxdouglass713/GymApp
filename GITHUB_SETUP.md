# GitHub Setup Instructions

Your repository is now ready to be connected to GitHub! Follow these steps:

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name your repository (e.g., "gym-genius-ai-app" or "gym-genius")
5. Choose whether it should be **Public** or **Private**
6. **DO NOT** initialize with a README, .gitignore, or license (we already have these)
7. Click "Create repository"

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

```powershell
# Add the remote repository (replace YOUR_USERNAME and REPO_NAME with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git push -u origin main
```

## Step 3: Update Git User Information (Optional)

If you want to use your actual name and email for commits, run:

```powershell
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

Or set it globally for all repositories:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Quick Reference Commands

- **Check remote**: `git remote -v`
- **Push changes**: `git push`
- **Pull changes**: `git pull`
- **Check status**: `git status`
- **View commits**: `git log`

## Next Steps

Once connected, you can:
- Push future changes with `git push`
- Pull changes from GitHub with `git pull`
- Collaborate with others
- Use GitHub Actions for CI/CD
- Create branches and pull requests

---

**Note**: If you need to change the remote URL later, use:
```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

