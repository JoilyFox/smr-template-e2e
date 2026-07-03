import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const DOCS_DIR = path.resolve(process.cwd(), 'docs');

interface ControllerInfo {
  name: string;
  filePath: string;
  prefix: string;
  endpoints: {
    method: string;
    path: string;
    handler: string;
  }[];
}

interface ModuleInfo {
  name: string;
  filePath: string;
  controllers: string[];
  providers: string[];
}

interface ServiceInfo {
  name: string;
  filePath: string;
}

// Find all files matching a glob/extension recursively
function getFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else if (filePath.endsWith('.ts') && !filePath.endsWith('.spec.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

// Parse a single controller file using robust line-by-line analysis
function parseController(filePath: string, content: string): ControllerInfo | null {
  const classNameRegex = /export\s+class\s+(\w+Controller)/;
  const classNameMatch = content.match(classNameRegex);
  if (!classNameMatch) return null;
  const name = classNameMatch[1];

  const controllerRegex = /@Controller\s*\(\s*(?:['"`](.*?)['"`])?\s*\)/;
  const controllerMatch = content.match(controllerRegex);
  const prefix = controllerMatch ? (controllerMatch[1] || '') : '';

  const endpoints: ControllerInfo['endpoints'] = [];
  const lines = content.split(/\r?\n/);
  
  let currentDecorator: { method: string; path: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue; // skip comments
    }

    // Check for HTTP method decorator (e.g., @Get('path'))
    const decoratorRegex = /^@(Get|Post|Put|Delete|Patch|Options|Head|All)\s*\(\s*(?:['"`](.*?)['"`])?\s*\)/;
    const decMatch = line.match(decoratorRegex);
    if (decMatch) {
      currentDecorator = {
        method: decMatch[1].toUpperCase(),
        path: decMatch[2] || '',
      };
      continue;
    }

    // If we have a pending decorator, look for the next method handler declaration
    if (currentDecorator) {
      if (line.startsWith('@')) {
        continue; // skip other decorators (e.g. @UseGuards) and keep looking
      }

      const methodSigRegex = /^(?:async\s+)?(\w+)\s*\(/;
      const methodMatch = line.match(methodSigRegex);
      if (methodMatch) {
        endpoints.push({
          method: currentDecorator.method,
          path: currentDecorator.path,
          handler: methodMatch[1],
        });
        currentDecorator = null; // reset
      }
    }
  }

  return { name, filePath, prefix, endpoints };
}

// Parse a single module file, ignoring block and inline comments
function parseModule(filePath: string, content: string): ModuleInfo | null {
  const moduleRegex = /@Module\s*\(/;
  if (!moduleRegex.test(content)) return null;

  const classNameRegex = /export\s+class\s+(\w+Module)/;
  const classNameMatch = content.match(classNameRegex);
  if (!classNameMatch) return null;

  const name = classNameMatch[1];

  // Strip all comments to avoid parsing commented-out elements
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .replace(/\/\/.*$/gm, '');        // remove line comments

  const controllers: string[] = [];
  const providers: string[] = [];

  const extractArray = (field: string): string[] => {
    const regex = new RegExp(`${field}\\s*:\\s*\\[([\\s\\S]*?)\\]`);
    const match = cleanContent.match(regex);
    if (!match) return [];
    return match[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  controllers.push(...extractArray('controllers'));
  providers.push(...extractArray('providers'));

  return { name, filePath, controllers, providers };
}

// Parse a service/injectable file
function parseService(filePath: string, content: string): ServiceInfo | null {
  const injectableRegex = /@Injectable\s*\(\s*\)/;
  if (!injectableRegex.test(content)) return null;

  const classNameRegex = /export\s+class\s+(\w+(?:Service|Provider|Guard|Strategy|Interceptor))/;
  const classNameMatch = content.match(classNameRegex);
  if (!classNameMatch) return null;

  return { name: classNameMatch[1], filePath };
}

function syncDocs() {
  console.log('🔍 Scanning source directory for NestJS components...');
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory not found at: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = getFiles(SRC_DIR);
  const controllers: ControllerInfo[] = [];
  const modules: ModuleInfo[] = [];
  const services: ServiceInfo[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const controller = parseController(file, content);
    if (controller) {
      controllers.push(controller);
      continue;
    }
    const mod = parseModule(file, content);
    if (mod) {
      modules.push(mod);
      continue;
    }
    const service = parseService(file, content);
    if (service) {
      services.push(service);
    }
  }

  console.log(`📝 Rebuilding atomic wiki in ${DOCS_DIR}...`);
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
  const archDir = path.join(DOCS_DIR, 'architecture');
  const apiDir = path.join(DOCS_DIR, 'api');
  if (!fs.existsSync(archDir)) fs.mkdirSync(archDir);
  if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir);

  // Generate Module-specific map files
  let moduleMapContent = '# Architecture: Modules Map\n\nThis document maps the NestJS modules and their controllers/providers.\n\n';
  for (const mod of modules) {
    const relPath = path.relative(process.cwd(), mod.filePath);
    moduleMapContent += `### 📦 [[${mod.name}]]\n`;
    moduleMapContent += `* **Source Path:** [${relPath}](file:///${relPath})\n`;
    
    if (mod.controllers.length) {
      moduleMapContent += `* **Controllers:**\n`;
      for (const ctrl of mod.controllers) {
        moduleMapContent += `  - [[api/endpoints#${ctrl.toLowerCase()}]]\n`;
      }
    }
    if (mod.providers.length) {
      moduleMapContent += `* **Providers/Services:**\n`;
      for (const prov of mod.providers) {
        const foundSrv = services.find((s) => s.name === prov);
        if (foundSrv) {
          const srvRel = path.relative(process.cwd(), foundSrv.filePath);
          moduleMapContent += `  - [${prov}](file:///${srvRel})\n`;
        } else {
          moduleMapContent += `  - \`${prov}\`\n`;
        }
      }
    }
    moduleMapContent += '\n';
  }
  fs.writeFileSync(path.join(archDir, 'modules-map.md'), moduleMapContent, 'utf8');

  // Generate API Endpoint documentation
  let apiContent = '# API Endpoints Map\n\nThis document registers all HTTP routes and handlers grouped by Controller.\n\n';
  for (const ctrl of controllers) {
    const relPath = path.relative(process.cwd(), ctrl.filePath);
    apiContent += `### 🎮 ${ctrl.name}\n`;
    apiContent += `* **Controller Prefix:** \`/${ctrl.prefix}\`\n`;
    apiContent += `* **Source Code:** [${ctrl.name}](file:///${relPath})\n`;
    
    if (ctrl.endpoints.length) {
      apiContent += `* **Routes:**\n`;
      for (const ep of ctrl.endpoints) {
        const fullPath = `/${ctrl.prefix}${ep.path ? '/' + ep.path : ''}`.replace(/\/+/g, '/');
        apiContent += `  - **\`${ep.method}\`** \`${fullPath}\` → handler: \`${ep.handler}()\`\n`;
      }
    } else {
      apiContent += `* *No endpoints declared in this controller.*\n`;
    }
    apiContent += '\n';
  }
  fs.writeFileSync(path.join(apiDir, 'endpoints.md'), apiContent, 'utf8');

  // Update docs/_MAP.md with auto-generated references
  const mapPath = path.join(DOCS_DIR, '_MAP.md');
  if (fs.existsSync(mapPath)) {
    let mapContent = fs.readFileSync(mapPath, 'utf8');

    // Update Architecture block
    const archStartMarker = '<!-- START_AUTO_GENERATED_ARCHITECTURE -->';
    const archEndMarker = '<!-- END_AUTO_GENERATED_ARCHITECTURE -->';
    const archStartIdx = mapContent.indexOf(archStartMarker);
    const archEndIdx = mapContent.indexOf(archEndMarker);

    if (archStartIdx !== -1 && archEndIdx !== -1) {
      let replacement = `${archStartMarker}\n`;
      replacement += `* **Modules Map:** [[architecture/modules-map]]\n`;
      for (const mod of modules) {
        replacement += `  - [[architecture/modules-map#-${mod.name.toLowerCase()}|${mod.name}]]\n`;
      }
      replacement += archEndMarker;
      mapContent = mapContent.substring(0, archStartIdx) + replacement + mapContent.substring(archEndIdx + archEndMarker.length);
    }

    // Update API block
    const apiStartMarker = '<!-- START_AUTO_GENERATED_API -->';
    const apiEndMarker = '<!-- END_AUTO_GENERATED_API -->';
    const apiStartIdx = mapContent.indexOf(apiStartMarker);
    const apiEndIdx = mapContent.indexOf(apiEndMarker);

    if (apiStartIdx !== -1 && apiEndIdx !== -1) {
      let replacement = `${apiStartMarker}\n`;
      replacement += `* **API Endpoint Mapping:** [[api/endpoints]]\n`;
      for (const ctrl of controllers) {
        replacement += `  - [[api/endpoints#-${ctrl.name.toLowerCase()}|${ctrl.name}]] (Prefix: \`/${ctrl.prefix}\`)\n`;
      }
      replacement += apiEndMarker;
      mapContent = mapContent.substring(0, apiStartIdx) + replacement + mapContent.substring(apiEndIdx + apiEndMarker.length);
    }

    fs.writeFileSync(mapPath, mapContent, 'utf8');
  }

  console.log('✅ Documentation synchronization complete.');
}

syncDocs();
