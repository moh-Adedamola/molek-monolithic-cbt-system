const fs = require('fs-extra');
const path = require('path');

exports.default = async function(context) {
    console.log('\n🔧 Running afterPack hook...');
    
    const appOutDir = context.appOutDir;
    const electronPlatformName = context.electronPlatformName;
    const arch = context.arch;
    
    console.log('Platform:', electronPlatformName);
    console.log('Architecture:', arch);
    console.log('App output dir:', appOutDir);
    
    // Project dir is the parent of node_modules (where this script is)
    const projectDir = path.join(__dirname);
    
    // ========== COPY FRONTEND ==========
    const frontendSource = path.join(projectDir, 'frontend', 'dist');
    const frontendDest = path.join(appOutDir, 'resources', 'frontend', 'dist');
    
    console.log('📦 Copying frontend dist...');
    console.log('   From:', frontendSource);
    console.log('   To:', frontendDest);
    
    await fs.copy(frontendSource, frontendDest);
    console.log('✅ Frontend copied!');
    
    // ========== COPY BACKEND ==========
    const backendSource = path.join(projectDir, 'backend');
    const backendDest = path.join(appOutDir, 'resources', 'backend');
    const rootNodeModules = path.join(projectDir, 'node_modules');
    const backendNodeModules = path.join(backendDest, 'node_modules');
    
    console.log('📦 Copying backend folder...');
    console.log('   From:', backendSource);
    console.log('   To:', backendDest);
    
    // Ensure resources directory exists
    await fs.ensureDir(path.join(appOutDir, 'resources'));
    
    // Copy backend folder (without node_modules)
    await fs.copy(backendSource, backendDest, {
        filter: (src) => {
            return !src.includes('node_modules');
        }
    });
    
    // Read backend package.json to get dependencies
    const backendPkgPath = path.join(backendSource, 'package.json');
    const backendPkg = await fs.readJSON(backendPkgPath);
    const backendDeps = {
        ...backendPkg.dependencies,
        ...backendPkg.devDependencies // Include dev deps like nodemon for safety
    };
    
    console.log('📦 Copying backend dependencies from workspace root...');
    console.log('   Backend has', Object.keys(backendDeps).length, 'dependencies');
    
    // Create backend node_modules
    await fs.ensureDir(backendNodeModules);
    
    // ✅ CRITICAL FIX: Filter function to skip symlinks and workspace references
    const isValidPackage = async (srcPath) => {
        try {
            // Check if path exists
            if (!await fs.pathExists(srcPath)) {
                return false;
            }
            
            // Get stats, following symlinks
            const stats = await fs.lstat(srcPath);
            
            // Skip symlinks (workspace links)
            if (stats.isSymbolicLink()) {
                return false;
            }
            
            // Must be a directory
            if (!stats.isDirectory()) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn(`   ⚠️  Error checking ${path.basename(srcPath)}:`, error.message);
            return false;
        }
    };
    
    // Copy each backend dependency from root node_modules
    let copiedCount = 0;
    let skippedCount = 0;
    let missingCount = 0;
    
    for (const dep of Object.keys(backendDeps)) {
        const srcDep = path.join(rootNodeModules, dep);
        const destDep = path.join(backendNodeModules, dep);
        
        if (await isValidPackage(srcDep)) {
            try {
                await fs.copy(srcDep, destDep, {
                    // Additional filter to skip symlinks inside packages
                    filter: async (src) => {
                        try {
                            const stats = await fs.lstat(src);
                            return !stats.isSymbolicLink();
                        } catch (error) {
                            return true; // If we can't check, try to copy
                        }
                    }
                });
                copiedCount++;
            } catch (error) {
                console.warn(`   ⚠️  Failed to copy ${dep}:`, error.message);
                skippedCount++;
            }
        } else {
            const stats = await fs.lstat(srcDep).catch(() => null);
            if (stats && stats.isSymbolicLink()) {
                console.log(`   ⏭️  Skipping symlink: ${dep}`);
                skippedCount++;
            } else {
                console.warn(`   ⚠️  Missing dependency: ${dep}`);
                missingCount++;
            }
        }
    }
    
    // Also copy all dependencies of dependencies (nested) - but skip workspace links
    console.log('📦 Copying nested dependencies...');
    const allPackages = await fs.readdir(rootNodeModules);
    
    for (const pkg of allPackages) {
        // Skip hidden files, already copied packages, and workspace names
        if (pkg.startsWith('.') || 
            pkg === 'frontend' || 
            pkg === 'backend' || 
            pkg === 'electron') {
            continue;
        }
        
        const srcPkg = path.join(rootNodeModules, pkg);
        const destPkg = path.join(backendNodeModules, pkg);
        
        // Only copy if not already copied, is valid, and not a symlink
        if (!await fs.pathExists(destPkg) && await isValidPackage(srcPkg)) {
            try {
                await fs.copy(srcPkg, destPkg, {
                    filter: async (src) => {
                        try {
                            const stats = await fs.lstat(src);
                            return !stats.isSymbolicLink();
                        } catch (error) {
                            return true;
                        }
                    }
                });
                copiedCount++;
            } catch (error) {
                console.warn(`   ⚠️  Failed to copy ${pkg}:`, error.message);
                skippedCount++;
            }
        }
    }
    
    // Handle @scoped packages - but skip symlinks
    const scopedDirs = allPackages.filter(p => p.startsWith('@'));
    for (const scopedDir of scopedDirs) {
        const srcScoped = path.join(rootNodeModules, scopedDir);
        const destScoped = path.join(backendNodeModules, scopedDir);
        
        if (await isValidPackage(srcScoped)) {
            try {
                // Ensure scoped directory exists
                await fs.ensureDir(destScoped);
                
                // Copy each package in the scoped directory
                const scopedPackages = await fs.readdir(srcScoped);
                for (const scopedPkg of scopedPackages) {
                    const srcPkg = path.join(srcScoped, scopedPkg);
                    const destPkg = path.join(destScoped, scopedPkg);
                    
                    if (await isValidPackage(srcPkg)) {
                        try {
                            await fs.copy(srcPkg, destPkg, {
                                filter: async (src) => {
                                    try {
                                        const stats = await fs.lstat(src);
                                        return !stats.isSymbolicLink();
                                    } catch (error) {
                                        return true;
                                    }
                                }
                            });
                            copiedCount++;
                        } catch (error) {
                            console.warn(`   ⚠️  Failed to copy ${scopedDir}/${scopedPkg}:`, error.message);
                            skippedCount++;
                        }
                    }
                }
            } catch (error) {
                console.warn(`   ⚠️  Failed to process scoped directory ${scopedDir}:`, error.message);
            }
        }
    }
    
    console.log('✅ Backend copy complete!');
    console.log('   Copied:', copiedCount, 'packages');
    console.log('   Skipped:', skippedCount, 'packages (symlinks/workspace links)');
    console.log('   Missing:', missingCount, 'packages');
    
    if (copiedCount === 0) {
        throw new Error('Failed to copy any packages! Check if node_modules exists.');
    }
    
    console.log(`✅ Successfully packaged backend with dependencies`);
};