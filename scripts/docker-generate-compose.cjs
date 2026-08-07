const fs = require('node:fs');
const path = require('node:path');

const GENERATED_DIR = path.join('docker', '.generated');
const NGINX_CONFIG_PATH = path.join(GENERATED_DIR, 'nginx', 'default.conf');
const NGINX_DOCKERFILE_PATH = path.join(GENERATED_DIR, 'nginx', 'Dockerfile');
const COMPOSE_PATH = path.join(GENERATED_DIR, 'docker-compose.yml');
const MANIFEST_PATH = path.join('docker', 'deployment.config.json');
const INFRA_SERVICES = new Set(['mysql', 'redis']);
const RESERVED_SERVICES = new Set(['nginx', 'mysql', 'redis']);
const RUNTIME_DIR_EXPR = '${DOCKER_RUNTIME_DIR:-D:/super-pro_pro}';

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRoute(route) {
  if (!route.startsWith('/')) {
    throw new Error(`Route must start with "/": ${route}`);
  }
  return route.endsWith('/') ? route : `${route}/`;
}

function routeWithoutTrailingSlash(route) {
  return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
}

function loadProjectManifest(repoRoot = process.cwd()) {
  const manifestPath = path.join(repoRoot, MANIFEST_PATH);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read deployment manifest ${manifestPath}: ${error.message}`);
  }

  if (!Array.isArray(raw.projects) || raw.projects.length === 0) {
    throw new Error(`${MANIFEST_PATH} must contain a non-empty "projects" array`);
  }

  const seen = new Set();
  return raw.projects.map((entry) => {
    const service = entry.service;
    const dir = entry.dir || service;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(service)) {
      throw new Error(`Invalid service name: ${service}`);
    }
    if (RESERVED_SERVICES.has(service)) {
      throw new Error(`Service name is reserved: ${service}`);
    }
    if (seen.has(service)) {
      throw new Error(`Duplicate service: ${service}`);
    }
    seen.add(service);
    if (!['frontend', 'api'].includes(entry.kind)) {
      throw new Error(`Unsupported kind for ${service}: ${entry.kind}`);
    }
    const port = Number(entry.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port for ${service}: ${entry.port}`);
    }
    const routes = (entry.routes || []).map(normalizeRoute);
    if (routes.length === 0) {
      throw new Error(`${service}: routes is required`);
    }
    const dockerfile = path.join(repoRoot, dir, 'Dockerfile');
    if (!fs.existsSync(dockerfile)) {
      throw new Error(`${service}: Dockerfile not found at ${toPosixPath(dockerfile)}`);
    }
    const packageJsonPath = path.join(repoRoot, dir, 'package.json');
    const packageName = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name
      : '';
    const kind = entry.kind;
    const runtimeVolumes = (entry.runtimeVolumes || []).map((volume) => {
      const separator = volume.indexOf(':');
      if (separator === -1) {
        throw new Error(`Invalid runtime volume "${volume}" in ${service}`);
      }
      return {
        name: volume.slice(0, separator),
        target: volume.slice(separator + 1),
      };
    });

    return {
      service,
      dir,
      dockerfile: `${dir}/Dockerfile`,
      packageName,
      kind,
      port,
      routes,
      rootRedirect: entry.rootRedirect ? normalizeRoute(entry.rootRedirect) : '',
      health: entry.health || '',
      depends: splitList(entry.depends),
      runtimeVolumes,
    };
  });
}

function validateProjects(projects) {
  const seenRoutes = new Set();
  const rootRedirects = projects.map((project) => project.rootRedirect).filter(Boolean);
  if (rootRedirects.length > 1) {
    throw new Error(`Only one rootRedirect is allowed, found: ${rootRedirects.join(', ')}`);
  }
  for (const project of projects) {
    for (const route of project.routes) {
      if (seenRoutes.has(route)) {
        throw new Error(`Duplicate route "${route}" across services`);
      }
      seenRoutes.add(route);
    }
    if (project.kind === 'frontend' && project.routes.length > 1) {
      console.warn(
        `[WARN] ${project.service} has multiple routes (${project.routes.join(', ')}) but only ${project.routes[0]} matches its build base path`,
      );
    }
  }
}

function indent(lines, spaces) {
  const prefix = ' '.repeat(spaces);
  return lines.map((line) => (line ? `${prefix}${line}` : line));
}

function renderDependsOn(depends, projectsByService) {
  if (depends.length === 0) {
    return [];
  }

  const lines = ['depends_on:'];
  for (const dependency of depends) {
    const project = projectsByService.get(dependency);
    const condition =
      INFRA_SERVICES.has(dependency) || (project && project.health)
        ? 'service_healthy'
        : 'service_started';
    lines.push(`  ${dependency}:`);
    lines.push(`    condition: ${condition}`);
  }
  return lines;
}

function renderHealthcheck(project) {
  if (!project.health) {
    return [];
  }

  const healthUrl = `http://127.0.0.1:${project.port}${project.health}`;
  return [
    'healthcheck:',
    '  test:',
    '    [',
    '      "CMD-SHELL",',
    `      "node -e \\"require('http').get('${healthUrl}', (res) => process.exit(res.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))\\"",`,
    '    ]',
    '  interval: 15s',
    '  timeout: 5s',
    '  retries: 10',
    '  start_period: 20s',
  ];
}

function renderFrontendHealthcheck() {
  return [
    'healthcheck:',
    '  test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1/"]',
    '  interval: 30s',
    '  timeout: 5s',
    '  retries: 3',
    '  start_period: 5s',
  ];
}

function renderProjectService(project, repoRoot) {
  const lines = [
    `${project.service}:`,
    '  build:',
    '    context: ../..',
    `    dockerfile: ${project.dockerfile}`,
  ];

  if (project.kind === 'api') {
    const envFile = path.join(repoRoot, 'docker', 'env', `${project.service}.env`);
    if (fs.existsSync(envFile)) {
      lines.push('  env_file:');
      lines.push(`    - ../env/${project.service}.env`);
    }
    lines.push('  environment:');
    lines.push('    NODE_ENV: ${APP_NODE_ENV:-production}');

    const volumes = [];
    const configFile = path.join(repoRoot, 'docker', 'config', `${project.service}.config.json`);
    if (fs.existsSync(configFile)) {
      volumes.push(`../config/${project.service}.config.json:/app/${project.service}/config.json:ro`);
    }
    for (const volume of project.runtimeVolumes) {
      volumes.push(`${RUNTIME_DIR_EXPR}/${project.service}/${volume.name}:${volume.target}`);
    }
    if (volumes.length > 0) {
      lines.push('  volumes:');
      for (const volume of volumes) {
        lines.push(`    - ${volume}`);
      }
    }

    const projectServices = new Map([[project.service, project]]);
    lines.push(...indent(renderDependsOn(project.depends, projectServices), 2));
  }

  lines.push('  expose:');
  lines.push(`    - "${project.port}"`);
  if (project.kind === 'frontend') {
    lines.push(...indent(renderFrontendHealthcheck(), 2));
  } else {
    lines.push(...indent(renderHealthcheck(project), 2));
  }
  lines.push('  restart: unless-stopped');
  lines.push('  networks:');
  lines.push('    - super-pro');

  return lines;
}

function renderNginxService(projects) {
  const lines = [
    'nginx:',
    '  build:',
    '    context: ../..',
    '    dockerfile: docker/.generated/nginx/Dockerfile',
  ];

  lines.push('  depends_on:');
  for (const project of projects) {
    lines.push(`    ${project.service}:`);
    const healthy = project.kind === 'frontend' || Boolean(project.health);
    lines.push(`      condition: ${healthy ? 'service_healthy' : 'service_started'}`);
  }

  lines.push(
    '  ports:',
    '    - "${PUBLIC_HTTP_PORT:-9999}:80"',
    '  volumes:',
    `    - ${RUNTIME_DIR_EXPR}/nginx/logs:/var/log/nginx`,
    '  restart: unless-stopped',
    '  networks:',
    '    - super-pro',
  );

  return lines;
}

function renderRedisService() {
  return [
    'redis:',
    '  image: redis:7-alpine',
    '  command: ["redis-server", "--appendonly", "yes"]',
    '  volumes:',
    `    - ${RUNTIME_DIR_EXPR}/redis:/data`,
    '  restart: unless-stopped',
    '  healthcheck:',
    '    test: ["CMD", "redis-cli", "ping"]',
    '    interval: 10s',
    '    timeout: 3s',
    '    retries: 10',
    '  ports:',
    '    - "127.0.0.1:${REDIS_HOST_PORT:-16379}:6379"',
    '  networks:',
    '    - super-pro',
  ];
}

function renderMysqlService() {
  return [
    'mysql:',
    '  image: mysql:8.4',
    '  environment:',
    '    MYSQL_ROOT_PASSWORD: "${MYSQL_ROOT_PASSWORD:-zxc123654}"',
    '    MYSQL_DATABASE: "${MYSQL_DATABASE:-wxbot}"',
    '    MYSQL_USER: "${MYSQL_USER:-super_pro}"',
    '    MYSQL_PASSWORD: "${MYSQL_PASSWORD:-zxc123654}"',
    '    TZ: "${TZ:-Asia/Shanghai}"',
    '  command:',
    '    - --character-set-server=utf8mb4',
    '    - --collation-server=utf8mb4_unicode_ci',
    '  volumes:',
    `    - ${RUNTIME_DIR_EXPR}/mysql:/var/lib/mysql`,
    '  restart: unless-stopped',
    '  healthcheck:',
    '    test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$${MYSQL_ROOT_PASSWORD} --silent"]',
    '    interval: 10s',
    '    timeout: 5s',
    '    retries: 20',
    '    start_period: 30s',
    '  ports:',
    '    - "127.0.0.1:${MYSQL_HOST_PORT:-13306}:3306"',
    '  networks:',
    '    - super-pro',
  ];
}

function renderCompose(projects, repoRoot) {
  const neededInfra = new Set(projects.flatMap((project) => project.depends).filter((dep) => INFRA_SERVICES.has(dep)));
  const lines = ['name: ${COMPOSE_PROJECT_NAME:-super-pro-prod}', '', 'services:'];
  lines.push(...indent(renderNginxService(projects), 2));

  for (const project of projects) {
    lines.push('');
    lines.push(...indent(renderProjectService(project, repoRoot), 2));
  }

  if (neededInfra.has('redis')) {
    lines.push('');
    lines.push(...indent(renderRedisService(), 2));
  }
  if (neededInfra.has('mysql')) {
    lines.push('');
    lines.push(...indent(renderMysqlService(), 2));
  }

  lines.push('');
  lines.push('networks:');
  lines.push('  super-pro:');
  lines.push('    driver: bridge');
  return `${lines.join('\n')}\n`;
}

function renderNginxLocation(project, route) {
  const exactRoute = routeWithoutTrailingSlash(route);
  const lines = [];

  if (exactRoute !== '/') {
    lines.push(
      `    location = ${exactRoute} {`,
      `        return 301 ${route};`,
      '    }',
      '',
    );
  }

  lines.push(`    location ${route} {`);

  if (project.kind === 'frontend') {
    lines.push(
      `        proxy_pass http://${project.service}:${project.port}/;`,
      '        proxy_http_version 1.1;',
      '        proxy_set_header Host $host;',
      '        proxy_set_header X-Real-IP $remote_addr;',
      '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      '        proxy_set_header X-Forwarded-Proto $scheme;',
      '    }',
    );
    return lines;
  }

  lines.push(
    `        proxy_pass http://${project.service}:${project.port}${route};`,
    '        proxy_http_version 1.1;',
    '        proxy_request_buffering off;',
    '        proxy_buffering off;',
    '        proxy_read_timeout 3600s;',
    '        proxy_send_timeout 3600s;',
    '',
    '        proxy_set_header Host $host;',
    '        proxy_set_header X-Real-IP $remote_addr;',
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto $scheme;',
    '    }',
  );

  return lines;
}

function renderNginx(projects) {
  const rootRedirects = projects.map((project) => project.rootRedirect).filter(Boolean);
  if (rootRedirects.length > 1) {
    throw new Error(`Only one rootRedirect is allowed, found: ${rootRedirects.join(', ')}`);
  }

  const lines = [
    'server {',
    '    listen 80;',
    '    server_name _;',
    '    absolute_redirect off;',
    '',
    '    client_max_body_size 512m;',
    '    client_body_timeout 3600s;',
    '    send_timeout 3600s;',
    '',
    '    gzip on;',
    '    gzip_min_length 1024;',
    '    gzip_comp_level 5;',
    '    gzip_proxied any;',
    '    gzip_vary on;',
    '    gzip_types',
    '        text/plain',
    '        text/css',
    '        text/javascript',
    '        application/javascript',
    '        application/json',
    '        application/xml',
    '        image/svg+xml;',
    '',
  ];

  if (rootRedirects[0]) {
    lines.push('    location = / {');
    lines.push(`        return 301 ${rootRedirects[0]};`);
    lines.push('    }');
    lines.push('');
  }

  const routes = projects.flatMap((project) =>
    project.routes.map((route) => ({
      project,
      route,
    })),
  );
  routes.sort((left, right) => left.route.localeCompare(right.route));

  for (const { project, route } of routes) {
    lines.push(...renderNginxLocation(project, route));
    lines.push('');
  }

  if (!rootRedirects[0]) {
    lines.push('    location / {');
    lines.push('        return 404;');
    lines.push('    }');
    lines.push('');
  }

  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function renderGatewayDockerfile() {
  return [
    '# syntax=docker/dockerfile:1.7',
    '',
    'FROM nginx:1.27-alpine',
    '',
    'COPY docker/.generated/nginx/default.conf /etc/nginx/conf.d/default.conf',
    '',
  ].join('\n');
}

function generateDockerDeployment(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const outputRoot = options.outputRoot || path.join(repoRoot, GENERATED_DIR);
  const projects = loadProjectManifest(repoRoot);
  validateProjects(projects);

  const compose = renderCompose(projects, repoRoot);
  const nginx = renderNginx(projects);
  const gatewayDockerfile = renderGatewayDockerfile();
  const composePath = path.join(outputRoot, 'docker-compose.yml');
  const nginxPath = path.join(outputRoot, 'nginx', 'default.conf');
  const gatewayDockerfilePath = path.join(outputRoot, 'nginx', 'Dockerfile');

  fs.mkdirSync(path.dirname(composePath), { recursive: true });
  fs.mkdirSync(path.dirname(nginxPath), { recursive: true });
  fs.mkdirSync(path.dirname(gatewayDockerfilePath), { recursive: true });
  fs.writeFileSync(composePath, compose);
  fs.writeFileSync(nginxPath, nginx);
  fs.writeFileSync(gatewayDockerfilePath, gatewayDockerfile);

  return {
    compose,
    composePath,
    gatewayDockerfile,
    gatewayDockerfilePath,
    nginx,
    nginxPath,
    projects,
  };
}

if (require.main === module) {
  const result = generateDockerDeployment();
  console.log(`Generated ${toPosixPath(path.relative(process.cwd(), result.composePath))}`);
  console.log(`Generated ${toPosixPath(path.relative(process.cwd(), result.nginxPath))}`);
  console.log(`Generated ${toPosixPath(path.relative(process.cwd(), result.gatewayDockerfilePath))}`);
  console.log(`Manifest projects: ${result.projects.map((project) => project.service).join(', ')}`);
}

module.exports = {
  loadProjectManifest,
  generateDockerDeployment,
  renderCompose,
  renderGatewayDockerfile,
  renderNginx,
  validateProjects,
};
