const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🔧 Running EAS build pre-install script...");

try {
  const buildDir = process.cwd();
  console.log(`📁 Build directory: ${buildDir}`);

  // Check if node_modules exists and try to remove it if it has wrong permissions
  const nodeModulesPath = path.join(buildDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    try {
      console.log("🗑️  Attempting to remove existing node_modules...");
      execSync(`rm -rf "${nodeModulesPath}"`, { stdio: "inherit" });
    } catch (error) {
      console.log("⚠️  Could not remove node_modules (may have wrong permissions)");
      // Try to fix permissions first
      try {
        execSync(`chmod -R 755 "${buildDir}"`, { stdio: "inherit" });
        execSync(`rm -rf "${nodeModulesPath}"`, { stdio: "inherit" });
      } catch (error2) {
        console.log("⚠️  Could not fix permissions, continuing anyway...");
      }
    }
  }

  // Try to ensure the build directory has correct permissions
  try {
    console.log("🔐 Ensuring build directory has correct permissions...");
    execSync(`chmod -R 755 "${buildDir}"`, { stdio: "inherit" });
  } catch (error) {
    console.log("⚠️  Could not set permissions (may not have sudo access)");
  }

  console.log("✅ Pre-install script completed successfully");
} catch (error) {
  console.log("⚠️  Pre-install script encountered an error, but continuing...");
  console.log(error.message);
}







