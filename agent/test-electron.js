// Explore available Electron internals
console.log('process.type:', process.type)
console.log('process.versions.electron:', process.versions.electron)

// Check process properties
console.log('--- process keys ---')
console.log(Object.keys(process).filter(k => k.startsWith('_') || k.includes('electron') || k.includes('binding')))

// Try linkedBinding
if (process._linkedBinding) {
  console.log('--- _linkedBinding ---')
  try {
    const binding = process._linkedBinding('electron_browser_app')
    console.log('electron_browser_app:', binding)
    console.log('keys:', Object.keys(binding || {}))
  } catch(e) {
    console.log('electron_browser_app error:', e.message)
  }
}

// Check builtinModules or internal module resolution
try {
  const Module = require('module')
  console.log('--- Module properties ---')
  console.log('Module._cache keys (filtered):', Object.keys(Module._cache).filter(k => k.includes('electron')).slice(0, 10))
  console.log('Module.builtinModules (filtered):', (Module.builtinModules || []).filter(m => m.includes('electron')))
} catch(e) {
  console.log('module error:', e.message)
}

// Check process.resourcesPath
console.log('process.resourcesPath:', process.resourcesPath)
console.log('process.execPath:', process.execPath)
