#!/usr/bin/env node

/**
 * Script para verificar que las variables de entorno estén configuradas correctamente
 * Uso: node scripts/check-env.js [local|production]
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2] || 'local';
const envFile = env === 'production' ? '.env.production' : '.env.local';
const envExampleFile = env === 'production' ? 'env.production.template' : 'env.local.template';

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, envFile);
const examplePath = path.join(rootDir, envExampleFile);

console.log(`\n🔍 Verificando configuración para entorno: ${env.toUpperCase()}\n`);

// Verificar si existe el archivo de ejemplo
if (!fs.existsSync(examplePath)) {
  console.error(`❌ No se encontró el archivo de ejemplo: ${envExampleFile}`);
  process.exit(1);
}

// Verificar si existe el archivo de entorno
if (!fs.existsSync(envPath)) {
  console.log(`⚠️  No se encontró el archivo: ${envFile}`);
  console.log(`📝 Crea el archivo copiando desde el ejemplo:`);
  console.log(`   cp ${envExampleFile} ${envFile}`);
  console.log(`\n💡 Luego edita ${envFile} y completa con tus valores.\n`);
  process.exit(1);
}

// Leer el archivo de ejemplo para obtener las variables requeridas
const exampleContent = fs.readFileSync(examplePath, 'utf-8');
const requiredVars = exampleContent
  .split('\n')
  .filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('='))
  .map(line => line.split('=')[0].trim())
  .filter(varName => varName && !varName.startsWith('#'));

// Leer el archivo de entorno actual
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

// Verificar variables requeridas
let allValid = true;
const missingVars = [];
const emptyVars = [];

requiredVars.forEach(varName => {
  if (!envVars[varName]) {
    missingVars.push(varName);
    allValid = false;
  } else if (!envVars[varName] || envVars[varName] === '') {
    emptyVars.push(varName);
    allValid = false;
  }
});

// Mostrar resultados
if (missingVars.length > 0) {
  console.log(`❌ Variables faltantes:`);
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log();
}

if (emptyVars.length > 0) {
  console.log(`⚠️  Variables vacías:`);
  emptyVars.forEach(varName => console.log(`   - ${varName}`));
  console.log();
}

if (allValid) {
  console.log(`✅ Todas las variables de entorno están configuradas correctamente!\n`);
  
  // Mostrar un resumen (sin valores sensibles)
  console.log(`📋 Variables configuradas:`);
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PASSWORD')) {
      console.log(`   ${varName}=${value.substring(0, 10)}...`);
    } else {
      console.log(`   ${varName}=${value}`);
    }
  });
  console.log();
  process.exit(0);
} else {
  console.log(`\n💡 Edita ${envFile} y completa las variables faltantes o vacías.\n`);
  process.exit(1);
}

