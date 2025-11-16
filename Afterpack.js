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
    
    // Copy each backend dependency from root node_modules
    let copiedCount = 0;
    let missingCount = 0;
    
    for (const dep of Object.keys(backendDeps)) {
        const srcDep = path.join(rootNodeModules, dep);
        const destDep = path.join(backendNodeModules, dep);
        
        if (await fs.pathExists(srcDep)) {
            await fs.copy(srcDep, destDep);
            copiedCount++;
        } else {
            console.warn(`   ⚠️  Missing dependency: ${dep}`);
            missingCount++;
        }
    }
    
    // Also copy all dependencies of dependencies (nested)
    console.log('📦 Copying nested dependencies...');
    const allPackages = await fs.readdir(rootNodeModules);
    
    for (const pkg of allPackages) {
        if (pkg.startsWith('.') || pkg.startsWith('@')) continue;
        
        const srcPkg = path.join(rootNodeModules, pkg);
        const destPkg = path.join(backendNodeModules, pkg);
        
        // Only copy if not already copied and exists
        if (!await fs.pathExists(destPkg) && await fs.pathExists(srcPkg)) {
            const stat = await fs.stat(srcPkg);
            if (stat.isDirectory()) {
                await fs.copy(srcPkg, destPkg);
                copiedCount++;
            }
        }
    }
    
    // Handle @scoped packages
    const scopedDirs = allPackages.filter(p => p.startsWith('@'));
    for (const scopedDir of scopedDirs) {
        const srcScoped = path.join(rootNodeModules, scopedDir);
        const destScoped = path.join(backendNodeModules, scopedDir);
        
        if (await fs.pathExists(srcScoped)) {
            await fs.copy(srcScoped, destScoped);
        }
    }
    
    console.log('✅ Backend copy complete!');
    console.log('   Copied:', copiedCount, 'packages');
    console.log('   Missing:', missingCount, 'packages');
    
    if (copiedCount === 0) {
        throw new Error('Failed to copy any packages!');
    }
    
    console.log(`✅ Successfully packaged backend with dependencies`);
};