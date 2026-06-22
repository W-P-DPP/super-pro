const fs = require('node:fs');
const path = require('node:path');

const GENERATED_DIR = path.join('docker', '.generated');
const NGINX_CONFIG_PATH = path.join(GENERATED_DIR, 'nginx', 'default.conf');
const NGINX_DOCKERFILE_PATH = path.join(GENERATED_DIR, 'nginx', 'Dockerfile');
const COMPOSE_PATH = path.join(GENERATED_DIR, 'docker-compose.yml');
const INFRA_SERVICES = new Set(['mysql', 'redis']);
const RUNTIME_DIR_EXPR = '${DOCKER_RUNTIME_DIR:-D:/super-pro_pro}';

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  }
  return trimmed;
}

function parseDockerfileLabels(contents) {
  const labels = {};
  const lines = contents.replace(/\r\n/g, '\n').split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('LABEL ')) {
      continue;
    }

    let statement = line.slice('LABEL '.length).trim();
    while (statement.endsWith('\\') && index + 1 < lines.length) {
      statement = `${statement.slice(0, -1).trim()} ${lines[index + 1].trim()}`;
      index += 1;
    }

    const matcher = /([A-Za-z0-9_.-]+)=("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s]+)/g;
    for (const match of statement.matchAll(matcher)) {
      labels[match[1]] = unquote(match[2]);
    }
  }

  return labels;
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

function staticMountPath(route) {
  return routeWithoutTrailingSlash(route).replace(/^\/+/, '') || 'root';
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function findDockerfiles(rootDir) {
  const dockerfiles = [];
  const ignoredDirs = new Set(['.git', '.turbo', '.generated', 'dist', 'node_modules']);

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        visit(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'Dockerfile') {
        dockerfiles.push(fullPath);
      }
    }
  }

  visit(rootDir);
  return dockerfiles;
}

function projectFromDockerfile(repoRoot, dockerfilePath) {
  const contents = fs.readFileSync(dockerfilePath, 'utf8');
  const labels = parseDockerfileLabels(contents);
  if (labels['super-pro.deploy'] !== 'true') {
    return null;
  }

  const dir = toPosixPath(path.relative(repoRoot, path.dirname(dockerfilePath)));
  const service = labels['super-pro.service'];
  const kind = labels['super-pro.kind'];
  const port = labels['super-pro.port'];
  const routes = splitList(labels['super-pro.routes']).map(normalizeRoute);
  const packageJsonPath = path.join(path.dirname(dockerfilePath), 'package.json');
  const packageName = fs.existsSync(packageJsonPath)
    ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name
    : '';

  if (!service || !kind || !port || routes.length === 0) {
    throw new Error(`Dockerfile ${dockerfilePath} is missing required super-pro labels`);
  }
  if (!['frontend', 'api'].includes(kind)) {
    throw new Error(`Dockerfile ${dockerfilePath} has unsupported super-pro.kind: ${kind}`);
  }

  return {
    dir,
    dockerfile: `${dir}/Dockerfile`,
    packageName,
    service,
    kind,
    port,
    routes,
    rootRedirect: labels['super-pro.rootRedirect']
      ? normalizeRoute(labels['super-pro.rootRedirect'])
      : '',
    health: labels['super-pro.health'] || '',
    depends: splitList(labels['super-pro.depends']),
    runtimeVolumes: splitList(labels['super-pro.runtimeVolumes']).map((entry) => {
      const separator = entry.indexOf(':');
      if (separator === -1) {
        throw new Error(`Invalid runtime volume "${entry}" in ${dockerfilePath}`);
      }
      return {
        name: entry.slice(0, separator),
        target: entry.slice(separator + 1),
      };
    }),
  };
}

function discoverDeployableProjects(repoRoot = process.cwd()) {
  return findDockerfiles(repoRoot)
    .map((dockerfilePath) => projectFromDockerfile(repoRoot, dockerfilePath))
    .filter(Boolean)
    .sort((left, right) => left.service.localeCompare(right.service));
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

function renderProjectService(project, repoRoot) {
  const lines = [
    `${project.service}:`,
    '  build:',
    '    context: ../..',
    `    dockerfile: ${project.dockerfile}`,
  ];

  const envFile = path.join(repoRoot, 'docker', 'env', `${project.service}.env`);
  if (fs.existsSync(envFile)) {
    lines.push('  env_file:');
    lines.push(`    - ../env/${project.service}.env`);
  }
  if (project.kind === 'api') {
    lines.push('  environment:');
    lines.push('    NODE_ENV: ${APP_NODE_ENV:-production}');
  }

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
  lines.push('  expose:');
  lines.push(`    - "${project.port}"`);
  lines.push('  restart: unless-stopped');
  lines.push(...indent(renderHealthcheck(project), 2));
  lines.push('  networks:');
  lines.push('    - super-pro');

  return lines;
}

function renderNginxService(projects) {
  const apiProjects = projects.filter((project) => project.kind === 'api');
  const lines = [
    'nginx:',
    '  build:',
    '    context: ../..',
    '    dockerfile: docker/.generated/nginx/Dockerfile',
  ];

  if (apiProjects.length > 0) {
    lines.push('  depends_on:');
    for (const project of apiProjects) {
      lines.push(`    ${project.service}:`);
      lines.push(`      condition: ${project.health ? 'service_healthy' : 'service_started'}`);
    }
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
  const apiProjects = projects.filter((project) => project.kind === 'api');
  const projectServices = new Map(apiProjects.map((project) => [project.service, project]));
  const neededInfra = new Set(projects.flatMap((project) => project.depends).filter((dep) => INFRA_SERVICES.has(dep)));
  const lines = ['name: ${COMPOSE_PROJECT_NAME:-super-pro-prod}', '', 'services:'];
  lines.push(...indent(renderNginxService(projects), 2));

  for (const project of apiProjects) {
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

function routeWithoutTrailingSlash(route) {
  return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
}

function renderNginxLocation(project, route) {
  const exactRoute = routeWithoutTrailingSlash(route);
  const lines = [
    `    location = ${exactRoute} {`,
    `        return 301 ${route};`,
    '    }',
    '',
    `    location ${route} {`,
  ];

  if (project.kind === 'frontend') {
    lines.push(`        try_files $uri $uri/ /${staticMountPath(route)}/index.html;`);
    lines.push('    }');
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
    throw new Error(`Only one super-pro.rootRedirect is allowed, found: ${rootRedirects.join(', ')}`);
  }

  const lines = [
    'server {',
    '    listen 80;',
    '    server_name _;',
    '    absolute_redirect off;',
    '    root /usr/share/nginx/html;',
    '    index index.html;',
    '',
    '    client_max_body_size 512m;',
    '    client_body_timeout 3600s;',
    '    send_timeout 3600s;',
    '',
    '    gzip on;',
    '    gzip_min_length 1024;',
    '    gzip_comp_level 5;',
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

  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function renderGatewayDockerfile(projects) {
  const frontendProjects = projects.filter((project) => project.kind === 'frontend');
  const lines = [
    '# syntax=docker/dockerfile:1.7',
    '',
  ];

  if (frontendProjects.length > 0) {
    lines.push(
      'FROM node:22-alpine AS frontend_builder',
      '',
      'ENV PNPM_HOME=/pnpm',
      'ENV PATH=${PNPM_HOME}:${PATH}',
      '',
      'RUN corepack enable',
      '',
      'WORKDIR /workspace',
      '',
      'COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./',
      'COPY packages ./packages',
    );
    for (const project of frontendProjects) {
      lines.push(`COPY ${project.dir} ./${project.dir}`);
    }
    lines.push('', 'RUN pnpm install --frozen-lockfile');
    for (const project of frontendProjects) {
      const filter = project.packageName || `@super-pro/${project.service}`;
      lines.push(
        `RUN VITE_APP_BASE_PATH=${shellSingleQuote(project.routes[0])} pnpm --filter ${filter} build`,
      );
    }
    lines.push('');
  }

  lines.push(
    'FROM nginx:1.27-alpine',
    '',
    'COPY docker/.generated/nginx/default.conf /etc/nginx/conf.d/default.conf',
  );

  for (const project of frontendProjects) {
    for (const route of project.routes) {
      lines.push(
        `COPY --from=frontend_builder /workspace/${project.dir}/dist /usr/share/nginx/html/${staticMountPath(route)}`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

function generateDockerDeployment(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const outputRoot = options.outputRoot || path.join(repoRoot, GENERATED_DIR);
  const projects = discoverDeployableProjects(repoRoot);
  if (projects.length === 0) {
    throw new Error('No deployable project Dockerfiles found');
  }

  const compose = renderCompose(projects, repoRoot);
  const nginx = renderNginx(projects);
  const gatewayDockerfile = renderGatewayDockerfile(projects);
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
  console.log(`Discovered services: ${result.projects.map((project) => project.service).join(', ')}`);
}

module.exports = {
  discoverDeployableProjects,
  generateDockerDeployment,
  parseDockerfileLabels,
  renderCompose,
  renderGatewayDockerfile,
  renderNginx,
};
